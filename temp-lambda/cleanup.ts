import { ScheduledEvent } from 'aws-lambda';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

// クリーンアップ統計情報
interface CleanupStats {
  tempFilesDeleted: number;
  oldAnalysisFilesDeleted: number;
  orphanedRecordsDeleted: number;
  storageFreed: number; // バイト単位
  inconsistenciesFound: number;
  errors: number;
  queryHistoryDeleted: number;
  totalStorageUsage: number;
}

// ファイルライフサイクル設定
interface LifecycleConfig {
  tempFileRetentionDays: number;
  analysisFileRetentionDays: number;
  processedFileRetentionDays: number;
  queryHistoryRetentionDays: number;
  maxStorageUsageBytes: number;
  enableStorageOptimization: boolean;
}

const s3Client = new S3Client({ region: process.env.REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cloudWatchClient = new CloudWatchClient({ region: process.env.REGION });

export const handler = async (event: ScheduledEvent): Promise<void> => {
  const stats: CleanupStats = {
    tempFilesDeleted: 0,
    oldAnalysisFilesDeleted: 0,
    orphanedRecordsDeleted: 0,
    storageFreed: 0,
    inconsistenciesFound: 0,
    errors: 0,
    queryHistoryDeleted: 0,
    totalStorageUsage: 0
  };

  try {
    console.log('Cleanup job started:', JSON.stringify(event, null, 2));

    const bucketName = process.env.VIDEO_BUCKET_NAME!;
    const tableName = process.env.VIDEO_ANALYSIS_TABLE_NAME!;
    const queryHistoryTableName = process.env.QUERY_HISTORY_TABLE_NAME!;

    // ライフサイクル設定の取得
    const lifecycleConfig = getLifecycleConfig();
    console.log('Lifecycle config:', lifecycleConfig);

    // 1. 古い一時ファイルの削除
    console.log('Starting temp files cleanup...');
    await cleanupTempFiles(bucketName, lifecycleConfig, stats);

    // 2. 完了した解析の古いファイル削除
    console.log('Starting old analysis files cleanup...');
    await cleanupOldAnalysisFiles(bucketName, tableName, lifecycleConfig, stats);

    // 3. 処理済みファイルの削除
    console.log('Starting processed files cleanup...');
    await cleanupProcessedFiles(bucketName, lifecycleConfig, stats);

    // 4. DynamoDBとS3の整合性チェック
    console.log('Starting data consistency check...');
    await checkDataConsistency(bucketName, tableName, stats);

    // 5. 古い問い合わせ履歴の削除
    console.log('Starting query history cleanup...');
    await cleanupQueryHistory(queryHistoryTableName, stats);

    // 6. ストレージ使用量監視
    console.log('Checking storage usage...');
    await monitorStorageUsage(bucketName, lifecycleConfig, stats);

    // 7. CloudWatchメトリクス送信
    await sendCleanupMetrics(stats);

    console.log('Cleanup job completed successfully:', stats);

  } catch (error) {
    console.error('Cleanup job error:', error);
    stats.errors++;
    
    // エラーメトリクスを送信
    await sendCleanupMetrics(stats);
    throw error;
  }
};

// ライフサイクル設定の取得
function getLifecycleConfig(): LifecycleConfig {
  return {
    tempFileRetentionDays: parseInt(process.env.TEMP_FILE_RETENTION_DAYS || '1'),
    analysisFileRetentionDays: parseInt(process.env.ANALYSIS_FILE_RETENTION_DAYS || '7'),
    processedFileRetentionDays: parseInt(process.env.PROCESSED_FILE_RETENTION_DAYS || '30'),
    queryHistoryRetentionDays: parseInt(process.env.QUERY_HISTORY_RETENTION_DAYS || '90'),
    maxStorageUsageBytes: parseInt(process.env.MAX_STORAGE_USAGE_BYTES || '10737418240'), // 10GB
    enableStorageOptimization: process.env.ENABLE_STORAGE_OPTIMIZATION === 'true'
  };
}

// 一時ファイルのクリーンアップ（要件9.3）
async function cleanupTempFiles(bucketName: string, config: LifecycleConfig, stats: CleanupStats): Promise<void> {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'temp/'
    });

    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];

    const cutoffTime = Date.now() - (config.tempFileRetentionDays * 24 * 60 * 60 * 1000);

    for (const object of objects) {
      if (object.Key && object.LastModified && object.Size) {
        const objectAge = object.LastModified.getTime();
        if (objectAge < cutoffTime) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: bucketName,
              Key: object.Key
            });
            await s3Client.send(deleteCommand);
            
            stats.tempFilesDeleted++;
            stats.storageFreed += object.Size;
            console.log(`Deleted temp file: ${object.Key} (${object.Size} bytes)`);
          } catch (deleteError) {
            console.error(`Failed to delete temp file ${object.Key}:`, deleteError);
            stats.errors++;
          }
        }
      }
    }

    console.log(`Temp files cleanup completed: ${stats.tempFilesDeleted} files deleted`);
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
    stats.errors++;
  }
}

// 古い解析ファイルのクリーンアップ（要件9.3）
async function cleanupOldAnalysisFiles(bucketName: string, tableName: string, config: LifecycleConfig, stats: CleanupStats): Promise<void> {
  try {
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'COMPLETED'
      }
    });

    const response = await docClient.send(scanCommand);
    const items = response.Items || [];

    const cutoffTime = Date.now() - (config.analysisFileRetentionDays * 24 * 60 * 60 * 1000);

    for (const item of items) {
      try {
        const updatedAt = new Date(item.updatedAt || item.createdAt).getTime();
        if (updatedAt < cutoffTime) {
          let fileSize = 0;

          // S3からファイル削除
          if (item.s3Key) {
            try {
              // ファイルサイズを取得
              const headCommand = new HeadObjectCommand({
                Bucket: bucketName,
                Key: item.s3Key
              });
              const headResponse = await s3Client.send(headCommand);
              fileSize = headResponse.ContentLength || 0;

              const deleteCommand = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: item.s3Key
              });
              await s3Client.send(deleteCommand);
              console.log(`Deleted old analysis file: ${item.s3Key} (${fileSize} bytes)`);
            } catch (s3Error) {
              console.error(`Failed to delete S3 file ${item.s3Key}:`, s3Error);
              stats.errors++;
            }
          }

          // DynamoDBからレコード削除
          const deleteItemCommand = new DeleteCommand({
            TableName: tableName,
            Key: {
              videoId: item.videoId,
              uploadTimestamp: item.uploadTimestamp
            }
          });
          await docClient.send(deleteItemCommand);
          
          stats.oldAnalysisFilesDeleted++;
          stats.storageFreed += fileSize;
          console.log(`Deleted old analysis record: ${item.videoId}`);
        }
      } catch (itemError) {
        console.error(`Failed to process item ${item.videoId}:`, itemError);
        stats.errors++;
      }
    }

    console.log(`Old analysis files cleanup completed: ${stats.oldAnalysisFilesDeleted} files deleted`);
  } catch (error) {
    console.error('Error cleaning up old analysis files:', error);
    stats.errors++;
  }
}

// 処理済みファイルのクリーンアップ
async function cleanupProcessedFiles(bucketName: string, config: LifecycleConfig, stats: CleanupStats): Promise<void> {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'processed/'
    });

    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];

    const cutoffTime = Date.now() - (config.processedFileRetentionDays * 24 * 60 * 60 * 1000);
    let processedFilesDeleted = 0;

    for (const object of objects) {
      if (object.Key && object.LastModified && object.Size) {
        const objectAge = object.LastModified.getTime();
        if (objectAge < cutoffTime) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: bucketName,
              Key: object.Key
            });
            await s3Client.send(deleteCommand);
            
            processedFilesDeleted++;
            stats.storageFreed += object.Size;
            console.log(`Deleted processed file: ${object.Key} (${object.Size} bytes)`);
          } catch (deleteError) {
            console.error(`Failed to delete processed file ${object.Key}:`, deleteError);
            stats.errors++;
          }
        }
      }
    }

    console.log(`Processed files cleanup completed: ${processedFilesDeleted} files deleted`);
  } catch (error) {
    console.error('Error cleaning up processed files:', error);
    stats.errors++;
  }
}

// DynamoDBとS3の整合性チェック（要件9.3）
async function checkDataConsistency(bucketName: string, tableName: string, stats: CleanupStats): Promise<void> {
  try {
    console.log('Starting data consistency check...');
    
    // DynamoDBの全レコードを取得
    const scanCommand = new ScanCommand({
      TableName: tableName
    });

    const response = await docClient.send(scanCommand);
    const items = response.Items || [];

    for (const item of items) {
      if (item.s3Key) {
        try {
          // S3にファイルが存在するかチェック
          const headCommand = new HeadObjectCommand({
            Bucket: bucketName,
            Key: item.s3Key
          });
          
          try {
            await s3Client.send(headCommand);
            // ファイルが存在する場合は何もしない
          } catch (s3Error: any) {
            if (s3Error.name === 'NotFound' || s3Error.$metadata?.httpStatusCode === 404) {
              // S3にファイルが存在しない場合、DynamoDBレコードを削除
              const deleteCommand = new DeleteCommand({
                TableName: tableName,
                Key: {
                  videoId: item.videoId,
                  uploadTimestamp: item.uploadTimestamp
                }
              });
              await docClient.send(deleteCommand);
              
              stats.orphanedRecordsDeleted++;
              stats.inconsistenciesFound++;
              console.log(`Deleted orphaned DynamoDB record: ${item.videoId}`);
            } else {
              throw s3Error;
            }
          }
        } catch (error) {
          console.error(`Error checking consistency for ${item.videoId}:`, error);
          stats.errors++;
        }
      }
    }

    console.log(`Data consistency check completed: ${stats.inconsistenciesFound} inconsistencies found`);
  } catch (error) {
    console.error('Error checking data consistency:', error);
    stats.errors++;
  }
}

// 古い問い合わせ履歴の削除
async function cleanupQueryHistory(queryHistoryTableName: string, stats: CleanupStats): Promise<void> {
  try {
    const config = getLifecycleConfig();
    const cutoffTime = Date.now() - (config.queryHistoryRetentionDays * 24 * 60 * 60 * 1000);

    const scanCommand = new ScanCommand({
      TableName: queryHistoryTableName
    });

    const response = await docClient.send(scanCommand);
    const items = response.Items || [];

    for (const item of items) {
      try {
        const timestamp = new Date(item.timestamp).getTime();
        if (timestamp < cutoffTime) {
          const deleteCommand = new DeleteCommand({
            TableName: queryHistoryTableName,
            Key: {
              videoId: item.videoId,
              queryId: item.queryId
            }
          });
          await docClient.send(deleteCommand);
          
          stats.queryHistoryDeleted++;
          console.log(`Deleted old query history: ${item.videoId}/${item.queryId}`);
        }
      } catch (itemError) {
        console.error(`Failed to process query history item ${item.videoId}/${item.queryId}:`, itemError);
        stats.errors++;
      }
    }

    console.log(`Query history cleanup completed: ${stats.queryHistoryDeleted} records deleted`);
  } catch (error) {
    console.error('Error cleaning up query history:', error);
    stats.errors++;
  }
}

// ストレージ使用量監視（要件9.3）
async function monitorStorageUsage(bucketName: string, config: LifecycleConfig, stats: CleanupStats): Promise<void> {
  try {
    console.log('Monitoring storage usage...');
    
    let totalSize = 0;
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken
      });

      const response = await s3Client.send(listCommand);
      const objects = response.Contents || [];

      for (const object of objects) {
        if (object.Size) {
          totalSize += object.Size;
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    stats.totalStorageUsage = totalSize;
    
    console.log(`Total storage usage: ${totalSize} bytes (${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB)`);
    console.log(`Storage limit: ${config.maxStorageUsageBytes} bytes (${(config.maxStorageUsageBytes / 1024 / 1024 / 1024).toFixed(2)} GB)`);

    // ストレージ制限チェック
    if (totalSize > config.maxStorageUsageBytes) {
      console.warn(`Storage usage exceeds limit: ${totalSize} > ${config.maxStorageUsageBytes}`);
      
      if (config.enableStorageOptimization) {
        await performEmergencyCleanup(bucketName, stats);
      }
    }

  } catch (error) {
    console.error('Error monitoring storage usage:', error);
    stats.errors++;
  }
}

// 緊急時のストレージクリーンアップ
async function performEmergencyCleanup(bucketName: string, stats: CleanupStats): Promise<void> {
  try {
    console.log('Performing emergency storage cleanup...');
    
    // 最も古いファイルから削除
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'uploads/'
    });

    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];

    // 最終更新日時でソート（古い順）
    objects.sort((a, b) => {
      const timeA = a.LastModified?.getTime() || 0;
      const timeB = b.LastModified?.getTime() || 0;
      return timeA - timeB;
    });

    // 古いファイルから順に削除（最大50%まで）
    const maxFilesToDelete = Math.floor(objects.length * 0.5);
    let deletedCount = 0;

    for (const object of objects) {
      if (deletedCount >= maxFilesToDelete) break;
      
      if (object.Key && object.Size) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: object.Key
          });
          await s3Client.send(deleteCommand);
          
          stats.storageFreed += object.Size;
          deletedCount++;
          console.log(`Emergency deleted: ${object.Key} (${object.Size} bytes)`);
        } catch (deleteError) {
          console.error(`Failed to emergency delete ${object.Key}:`, deleteError);
          stats.errors++;
        }
      }
    }

    console.log(`Emergency cleanup completed: ${deletedCount} files deleted`);
  } catch (error) {
    console.error('Error performing emergency cleanup:', error);
    stats.errors++;
  }
}

// CloudWatchメトリクス送信
async function sendCleanupMetrics(stats: CleanupStats): Promise<void> {
  try {
    const metricData = [
      {
        MetricName: 'TempFilesDeleted',
        Value: stats.tempFilesDeleted,
        Unit: 'Count' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'OldAnalysisFilesDeleted',
        Value: stats.oldAnalysisFilesDeleted,
        Unit: 'Count' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'OrphanedRecordsDeleted',
        Value: stats.orphanedRecordsDeleted,
        Unit: 'Count' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'StorageFreed',
        Value: stats.storageFreed,
        Unit: 'Bytes' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'InconsistenciesFound',
        Value: stats.inconsistenciesFound,
        Unit: 'Count' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'CleanupErrors',
        Value: stats.errors,
        Unit: 'Count' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'QueryHistoryDeleted',
        Value: stats.queryHistoryDeleted,
        Unit: 'Count' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'TotalStorageUsage',
        Value: stats.totalStorageUsage,
        Unit: 'Bytes' as const,
        Timestamp: new Date()
      }
    ];

    const putMetricCommand = new PutMetricDataCommand({
      Namespace: 'VideoAnalyzer/Cleanup',
      MetricData: metricData
    });

    await cloudWatchClient.send(putMetricCommand);
    console.log('CloudWatch metrics sent successfully');
  } catch (error) {
    console.error('Error sending CloudWatch metrics:', error);
  }
}