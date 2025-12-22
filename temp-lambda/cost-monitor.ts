import { ScheduledEvent } from 'aws-lambda';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { S3Client, ListObjectsV2Command, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// コスト計算結果
interface CostReport {
  s3StorageCost: number;
  s3RequestsCost: number;
  dynamoDbCost: number;
  lambdaCost: number;
  bedrockCost: number;
  totalCost: number;
  timestamp: string;
}

// AWS料金設定（2024年1月時点の東京リージョン概算）
interface PricingConfig {
  s3StandardStoragePerGB: number;
  s3StandardIAStoragePerGB: number;
  s3GlacierStoragePerGB: number;
  s3RequestsPer1000: number;
  dynamoDbReadCapacityUnit: number;
  dynamoDbWriteCapacityUnit: number;
  dynamoDbStoragePerGB: number;
  lambdaRequestsPer1M: number;
  lambdaGBSecond: number;
  bedrockPegasusPerRequest: number;
}

const cloudWatchClient = new CloudWatchClient({ region: process.env.REGION });
const s3Client = new S3Client({ region: process.env.REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: ScheduledEvent): Promise<void> => {
  try {
    console.log('Cost monitoring job started:', JSON.stringify(event, null, 2));

    const bucketName = process.env.VIDEO_BUCKET_NAME!;
    const tableName = process.env.VIDEO_ANALYSIS_TABLE_NAME!;
    const queryHistoryTableName = process.env.QUERY_HISTORY_TABLE_NAME!;

    // 料金設定の取得
    const pricing = getPricingConfig();
    console.log('Pricing config:', pricing);

    // コストレポート生成
    const costReport = await generateCostReport(bucketName, tableName, queryHistoryTableName, pricing);
    console.log('Cost report generated:', costReport);

    // CloudWatchメトリクス送信
    await sendCostMetrics(costReport);

    // コストアラートチェック
    await checkCostAlerts(costReport);

    console.log('Cost monitoring job completed successfully');

  } catch (error) {
    console.error('Cost monitoring job error:', error);
    throw error;
  }
};

// 料金設定の取得
function getPricingConfig(): PricingConfig {
  return {
    s3StandardStoragePerGB: 0.025, // $0.025 per GB/month
    s3StandardIAStoragePerGB: 0.019, // $0.019 per GB/month
    s3GlacierStoragePerGB: 0.004, // $0.004 per GB/month
    s3RequestsPer1000: 0.0004, // $0.0004 per 1,000 requests
    dynamoDbReadCapacityUnit: 0.000128, // $0.000128 per RCU/hour
    dynamoDbWriteCapacityUnit: 0.000640, // $0.000640 per WCU/hour
    dynamoDbStoragePerGB: 0.285, // $0.285 per GB/month
    lambdaRequestsPer1M: 0.20, // $0.20 per 1M requests
    lambdaGBSecond: 0.0000166667, // $0.0000166667 per GB-second
    bedrockPegasusPerRequest: 0.10 // $0.10 per request (estimated)
  };
}

// コストレポート生成
async function generateCostReport(
  bucketName: string, 
  tableName: string, 
  queryHistoryTableName: string, 
  pricing: PricingConfig
): Promise<CostReport> {
  
  // S3ストレージコスト計算
  const s3StorageCost = await calculateS3StorageCost(bucketName, pricing);
  
  // S3リクエストコスト計算
  const s3RequestsCost = await calculateS3RequestsCost(pricing);
  
  // DynamoDBコスト計算
  const dynamoDbCost = await calculateDynamoDbCost(tableName, queryHistoryTableName, pricing);
  
  // Lambdaコスト計算
  const lambdaCost = await calculateLambdaCost(pricing);
  
  // Bedrockコスト計算
  const bedrockCost = await calculateBedrockCost(tableName, pricing);
  
  const totalCost = s3StorageCost + s3RequestsCost + dynamoDbCost + lambdaCost + bedrockCost;

  return {
    s3StorageCost,
    s3RequestsCost,
    dynamoDbCost,
    lambdaCost,
    bedrockCost,
    totalCost,
    timestamp: new Date().toISOString()
  };
}

// S3ストレージコスト計算
async function calculateS3StorageCost(bucketName: string, pricing: PricingConfig): Promise<number> {
  try {
    let totalCost = 0;
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken
      });

      const response = await s3Client.send(listCommand);
      const objects = response.Contents || [];

      for (const object of objects) {
        if (object.Size && object.Key) {
          const sizeGB = object.Size / (1024 * 1024 * 1024);
          const ageInDays = object.LastModified ? 
            (Date.now() - object.LastModified.getTime()) / (1000 * 60 * 60 * 24) : 0;

          // ストレージクラスに基づくコスト計算
          if (object.Key.startsWith('temp/')) {
            // 一時ファイル（Standard）
            totalCost += sizeGB * pricing.s3StandardStoragePerGB / 30; // 日割り
          } else if (ageInDays > 30) {
            // 30日以上古い（Glacier）
            totalCost += sizeGB * pricing.s3GlacierStoragePerGB / 30;
          } else if (ageInDays > 7) {
            // 7-30日（Standard-IA）
            totalCost += sizeGB * pricing.s3StandardIAStoragePerGB / 30;
          } else {
            // 7日以内（Standard）
            totalCost += sizeGB * pricing.s3StandardStoragePerGB / 30;
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`S3 storage cost calculated: $${totalCost.toFixed(4)}`);
    return totalCost;

  } catch (error) {
    console.error('Error calculating S3 storage cost:', error);
    return 0;
  }
}

// S3リクエストコスト計算（CloudWatchメトリクスから）
async function calculateS3RequestsCost(pricing: PricingConfig): Promise<number> {
  try {
    // 実際の実装では、CloudWatchからS3リクエスト数を取得
    // ここでは概算値を使用
    const estimatedRequestsPerDay = 1000;
    const dailyCost = (estimatedRequestsPerDay / 1000) * pricing.s3RequestsPer1000;
    
    console.log(`S3 requests cost calculated: $${dailyCost.toFixed(4)}`);
    return dailyCost;

  } catch (error) {
    console.error('Error calculating S3 requests cost:', error);
    return 0;
  }
}

// DynamoDBコスト計算
async function calculateDynamoDbCost(
  tableName: string, 
  queryHistoryTableName: string, 
  pricing: PricingConfig
): Promise<number> {
  try {
    let totalCost = 0;

    // テーブルサイズ計算（概算）
    const analysisTableScan = new ScanCommand({
      TableName: tableName,
      Select: 'COUNT'
    });
    
    const queryHistoryTableScan = new ScanCommand({
      TableName: queryHistoryTableName,
      Select: 'COUNT'
    });

    const [analysisResponse, queryResponse] = await Promise.all([
      docClient.send(analysisTableScan),
      docClient.send(queryHistoryTableScan)
    ]);

    // 概算ストレージサイズ（1レコード = 約10KB）
    const analysisRecords = analysisResponse.Count || 0;
    const queryRecords = queryResponse.Count || 0;
    const totalRecords = analysisRecords + queryRecords;
    const estimatedStorageGB = (totalRecords * 10 * 1024) / (1024 * 1024 * 1024);

    // ストレージコスト
    const storageCost = estimatedStorageGB * pricing.dynamoDbStoragePerGB / 30; // 日割り

    // オンデマンド課金の概算（実際の使用量に基づく）
    const estimatedReadUnits = totalRecords * 0.1; // 1日あたりの読み取り概算
    const estimatedWriteUnits = totalRecords * 0.05; // 1日あたりの書き込み概算

    const readCost = estimatedReadUnits * pricing.dynamoDbReadCapacityUnit / 24; // 時間割り
    const writeCost = estimatedWriteUnits * pricing.dynamoDbWriteCapacityUnit / 24;

    totalCost = storageCost + readCost + writeCost;

    console.log(`DynamoDB cost calculated: $${totalCost.toFixed(4)} (Storage: $${storageCost.toFixed(4)}, Read: $${readCost.toFixed(4)}, Write: $${writeCost.toFixed(4)})`);
    return totalCost;

  } catch (error) {
    console.error('Error calculating DynamoDB cost:', error);
    return 0;
  }
}

// Lambdaコスト計算
async function calculateLambdaCost(pricing: PricingConfig): Promise<number> {
  try {
    // 概算値（実際の実装ではCloudWatchメトリクスから取得）
    const estimatedInvocationsPerDay = 100;
    const estimatedDurationSeconds = 5; // 平均実行時間
    const estimatedMemoryGB = 0.512; // 512MB

    const requestsCost = (estimatedInvocationsPerDay / 1000000) * pricing.lambdaRequestsPer1M;
    const computeCost = estimatedInvocationsPerDay * estimatedDurationSeconds * estimatedMemoryGB * pricing.lambdaGBSecond;

    const totalCost = requestsCost + computeCost;

    console.log(`Lambda cost calculated: $${totalCost.toFixed(4)} (Requests: $${requestsCost.toFixed(4)}, Compute: $${computeCost.toFixed(4)})`);
    return totalCost;

  } catch (error) {
    console.error('Error calculating Lambda cost:', error);
    return 0;
  }
}

// Bedrockコスト計算
async function calculateBedrockCost(tableName: string, pricing: PricingConfig): Promise<number> {
  try {
    // 完了した解析の数を取得
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: '#status = :status AND begins_with(#createdAt, :today)',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#createdAt': 'createdAt'
      },
      ExpressionAttributeValues: {
        ':status': 'COMPLETED',
        ':today': new Date().toISOString().split('T')[0] // 今日の日付
      },
      Select: 'COUNT'
    });

    const response = await docClient.send(scanCommand);
    const completedAnalysesToday = response.Count || 0;

    // 1つの解析につき複数のBedrockリクエスト（基本解析、PR文章、あらすじ等）
    const requestsPerAnalysis = 5; // 概算
    const totalRequests = completedAnalysesToday * requestsPerAnalysis;
    const totalCost = totalRequests * pricing.bedrockPegasusPerRequest;

    console.log(`Bedrock cost calculated: $${totalCost.toFixed(4)} (${totalRequests} requests)`);
    return totalCost;

  } catch (error) {
    console.error('Error calculating Bedrock cost:', error);
    return 0;
  }
}

// CloudWatchメトリクス送信
async function sendCostMetrics(costReport: CostReport): Promise<void> {
  try {
    const metricData = [
      {
        MetricName: 'S3StorageCost',
        Value: costReport.s3StorageCost,
        Unit: 'None' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'S3RequestsCost',
        Value: costReport.s3RequestsCost,
        Unit: 'None' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'DynamoDbCost',
        Value: costReport.dynamoDbCost,
        Unit: 'None' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'LambdaCost',
        Value: costReport.lambdaCost,
        Unit: 'None' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'BedrockCost',
        Value: costReport.bedrockCost,
        Unit: 'None' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'TotalDailyCost',
        Value: costReport.totalCost,
        Unit: 'None' as const,
        Timestamp: new Date()
      }
    ];

    const putMetricCommand = new PutMetricDataCommand({
      Namespace: 'VideoAnalyzer/Cost',
      MetricData: metricData
    });

    await cloudWatchClient.send(putMetricCommand);
    console.log('Cost metrics sent successfully');

  } catch (error) {
    console.error('Error sending cost metrics:', error);
  }
}

// コストアラートチェック
async function checkCostAlerts(costReport: CostReport): Promise<void> {
  try {
    const dailyBudget = parseFloat(process.env.DAILY_BUDGET || '10.0'); // $10/day default
    const warningThreshold = dailyBudget * 0.8; // 80%で警告
    const criticalThreshold = dailyBudget * 0.95; // 95%で重要警告

    if (costReport.totalCost >= criticalThreshold) {
      console.warn(`CRITICAL: Daily cost $${costReport.totalCost.toFixed(2)} exceeds 95% of budget ($${dailyBudget})`);
      
      // 重要アラートメトリクス送信
      await cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: 'VideoAnalyzer/Cost',
        MetricData: [{
          MetricName: 'CostAlert',
          Value: 2, // Critical level
          Unit: 'None' as const,
          Timestamp: new Date()
        }]
      }));

    } else if (costReport.totalCost >= warningThreshold) {
      console.warn(`WARNING: Daily cost $${costReport.totalCost.toFixed(2)} exceeds 80% of budget ($${dailyBudget})`);
      
      // 警告アラートメトリクス送信
      await cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: 'VideoAnalyzer/Cost',
        MetricData: [{
          MetricName: 'CostAlert',
          Value: 1, // Warning level
          Unit: 'None' as const,
          Timestamp: new Date()
        }]
      }));

    } else {
      // 正常レベル
      await cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: 'VideoAnalyzer/Cost',
        MetricData: [{
          MetricName: 'CostAlert',
          Value: 0, // Normal level
          Unit: 'None' as const,
          Timestamp: new Date()
        }]
      }));
    }

  } catch (error) {
    console.error('Error checking cost alerts:', error);
  }
}