import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export class VideoAnalyzerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3バケット（動画ファイル保存用）
    const videoBucket = new s3.Bucket(this, 'VideoAnalyzerBucket', {
      bucketName: `video-analyzer-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 本番環境では RETAIN に変更
      autoDeleteObjects: true, // 本番環境では false に変更
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: ['*'], // 本番環境では特定のドメインに制限
          allowedHeaders: ['*'],
          maxAge: 3000
        }
      ],
      lifecycleRules: [
        {
          id: 'temp-files-cleanup',
          prefix: 'temp/',
          expiration: cdk.Duration.days(1),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
          enabled: true
        },
        {
          id: 'uploads-cleanup',
          prefix: 'uploads/',
          expiration: cdk.Duration.days(7),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(1)
            }
          ],
          enabled: true
        },
        {
          id: 'processed-cleanup',
          prefix: 'processed/',
          expiration: cdk.Duration.days(30),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(7)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(14)
            }
          ],
          enabled: true
        },
        {
          id: 'incomplete-multipart-cleanup',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
          enabled: true
        },
        {
          id: 'old-versions-cleanup',
          noncurrentVersionExpiration: cdk.Duration.days(1),
          enabled: true
        }
      ]
    });

    // DynamoDB テーブル（動画解析結果保存用）
    const videoAnalysisTable = new dynamodb.Table(this, 'VideoAnalysisTable', {
      tableName: `VideoAnalysis-${this.stackName}`,
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadTimestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 本番環境では RETAIN に変更
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED
    });

    // ステータス別検索用のGSI
    videoAnalysisTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadTimestamp', type: dynamodb.AttributeType.NUMBER }
    });

    // 作成日時別検索用のGSI
    videoAnalysisTable.addGlobalSecondaryIndex({
      indexName: 'CreatedAtIndex',
      partitionKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadTimestamp', type: dynamodb.AttributeType.NUMBER }
    });

    // DynamoDB テーブル（問い合わせ履歴保存用）
    const queryHistoryTable = new dynamodb.Table(this, 'QueryHistoryTable', {
      tableName: `QueryHistory-${this.stackName}`,
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'queryId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 本番環境では RETAIN に変更
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED
    });

    // タイムスタンプ別検索用のGSI
    queryHistoryTable.addGlobalSecondaryIndex({
      indexName: 'TimestampIndex',
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
    });

    // Lambda実行ロール
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        VideoAnalyzerPolicy: new iam.PolicyDocument({
          statements: [
            // S3 アクセス権限
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket'
              ],
              resources: [
                videoBucket.bucketArn,
                `${videoBucket.bucketArn}/*`
              ]
            }),
            // DynamoDB アクセス権限
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ],
              resources: [
                videoAnalysisTable.tableArn,
                queryHistoryTable.tableArn
              ]
            }),
            // Bedrock アクセス権限
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream'
              ],
              resources: [
                `arn:aws:bedrock:${this.region}::foundation-model/twelvelabs.pegasus-1-2*`
              ]
            }),
            // CloudWatch メトリクス権限
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudwatch:PutMetricData'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Lambda関数（アップロード処理）
    const uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'upload.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        VIDEO_BUCKET_NAME: videoBucket.bucketName,
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        REGION: this.region
      }
    });

    // Lambda関数（解析処理）
    const analysisHandler = new lambda.Function(this, 'AnalysisHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'analysis.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        VIDEO_BUCKET_NAME: videoBucket.bucketName,
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        REGION: this.region,
        PEGASUS_MODEL_ID: 'twelvelabs.pegasus-1-2',
        PEGASUS_MODEL_VERSION: '1.0',
        NODE_ENV: 'production',
        ENABLE_MOCK: 'false'
      }
    });

    // Lambda関数（問い合わせ処理）
    const queryHandler = new lambda.Function(this, 'QueryHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'query.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        QUERY_HISTORY_TABLE_NAME: queryHistoryTable.tableName,
        REGION: this.region,
        PEGASUS_MODEL_ID: 'twelvelabs.pegasus-1-2',
        PEGASUS_MODEL_VERSION: '1.0'
      }
    });

    // Lambda関数（ステータス管理）
    const statusHandler = new lambda.Function(this, 'StatusHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'status.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      environment: {
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        REGION: this.region
      }
    });

    // Lambda関数（制限情報取得）
    const limitsHandler = new lambda.Function(this, 'LimitsHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'limits.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        REGION: this.region,
        MAX_FILE_SIZE_BYTES: '5368709120', // 5GB
        MAX_DURATION_SECONDS: '7200' // 2時間
      }
    });

    // Lambda関数（クリーンアップ処理）
    const cleanupHandler = new lambda.Function(this, 'CleanupHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cleanup.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(10),
      memorySize: 512,
      environment: {
        VIDEO_BUCKET_NAME: videoBucket.bucketName,
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        QUERY_HISTORY_TABLE_NAME: queryHistoryTable.tableName,
        REGION: this.region,
        TEMP_FILE_RETENTION_DAYS: '1',
        ANALYSIS_FILE_RETENTION_DAYS: '7',
        PROCESSED_FILE_RETENTION_DAYS: '30',
        QUERY_HISTORY_RETENTION_DAYS: '90',
        MAX_STORAGE_USAGE_BYTES: '10737418240', // 10GB
        ENABLE_STORAGE_OPTIMIZATION: 'true'
      }
    });

    // EventBridge ルール（毎日午前2時にクリーンアップ実行）
    const cleanupRule = new events.Rule(this, 'CleanupScheduleRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*'
      }),
      description: 'Daily cleanup of old video files and data'
    });

    // EventBridge ターゲット設定
    cleanupRule.addTarget(new targets.LambdaFunction(cleanupHandler));

    // Lambda関数（コスト監視処理）
    const costMonitorHandler = new lambda.Function(this, 'CostMonitorHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cost-monitor.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        VIDEO_BUCKET_NAME: videoBucket.bucketName,
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        QUERY_HISTORY_TABLE_NAME: queryHistoryTable.tableName,
        REGION: this.region,
        DAILY_BUDGET: '10.0' // $10/day default budget
      }
    });

    // EventBridge ルール（毎日午前6時にコスト監視実行）
    const costMonitorRule = new events.Rule(this, 'CostMonitorScheduleRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '6',
        day: '*',
        month: '*',
        year: '*'
      }),
      description: 'Daily cost monitoring and reporting'
    });

    // EventBridge ターゲット設定
    costMonitorRule.addTarget(new targets.LambdaFunction(costMonitorHandler));

    // SNS トピック（アラート通知用）
    const alertTopic = new sns.Topic(this, 'VideoAnalyzerAlerts', {
      topicName: `VideoAnalyzer-Alerts-${this.stackName}`,
      displayName: 'Video Analyzer System Alerts'
    });

    // CloudWatch ダッシュボード
    const dashboard = new cloudwatch.Dashboard(this, 'VideoAnalyzerDashboard', {
      dashboardName: `VideoAnalyzer-${this.stackName}`,
      widgets: [
        [
          // ストレージ使用量ウィジェット
          new cloudwatch.GraphWidget({
            title: 'Storage Usage',
            left: [
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cleanup',
                metricName: 'TotalStorageUsage',
                statistic: 'Average',
                period: cdk.Duration.hours(1)
              })
            ],
            width: 12,
            height: 6
          })
        ],
        [
          // クリーンアップメトリクス
          new cloudwatch.GraphWidget({
            title: 'Cleanup Metrics',
            left: [
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cleanup',
                metricName: 'TempFilesDeleted',
                statistic: 'Sum',
                period: cdk.Duration.hours(24)
              }),
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cleanup',
                metricName: 'OldAnalysisFilesDeleted',
                statistic: 'Sum',
                period: cdk.Duration.hours(24)
              })
            ],
            width: 6,
            height: 6
          }),
          // エラーメトリクス
          new cloudwatch.GraphWidget({
            title: 'System Errors',
            left: [
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cleanup',
                metricName: 'CleanupErrors',
                statistic: 'Sum',
                period: cdk.Duration.hours(1)
              }),
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cleanup',
                metricName: 'InconsistenciesFound',
                statistic: 'Sum',
                period: cdk.Duration.hours(1)
              })
            ],
            width: 6,
            height: 6
          })
        ],
        [
          // Lambda関数メトリクス
          new cloudwatch.GraphWidget({
            title: 'Lambda Performance',
            left: [
              uploadHandler.metricDuration(),
              analysisHandler.metricDuration(),
              queryHandler.metricDuration(),
              cleanupHandler.metricDuration()
            ],
            right: [
              uploadHandler.metricErrors(),
              analysisHandler.metricErrors(),
              queryHandler.metricErrors(),
              cleanupHandler.metricErrors()
            ],
            width: 12,
            height: 6
          })
        ],
        [
          // DynamoDB メトリクス
          new cloudwatch.GraphWidget({
            title: 'DynamoDB Usage',
            left: [
              videoAnalysisTable.metricConsumedReadCapacityUnits(),
              videoAnalysisTable.metricConsumedWriteCapacityUnits(),
              queryHistoryTable.metricConsumedReadCapacityUnits(),
              queryHistoryTable.metricConsumedWriteCapacityUnits()
            ],
            width: 12,
            height: 6
          })
        ],
        [
          // コスト監視メトリクス
          new cloudwatch.GraphWidget({
            title: 'Daily Cost Breakdown',
            left: [
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cost',
                metricName: 'S3StorageCost',
                statistic: 'Average',
                period: cdk.Duration.hours(24)
              }),
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cost',
                metricName: 'DynamoDbCost',
                statistic: 'Average',
                period: cdk.Duration.hours(24)
              }),
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cost',
                metricName: 'LambdaCost',
                statistic: 'Average',
                period: cdk.Duration.hours(24)
              }),
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cost',
                metricName: 'BedrockCost',
                statistic: 'Average',
                period: cdk.Duration.hours(24)
              })
            ],
            width: 8,
            height: 6
          }),
          // 総コストとアラート
          new cloudwatch.GraphWidget({
            title: 'Total Daily Cost & Alerts',
            left: [
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cost',
                metricName: 'TotalDailyCost',
                statistic: 'Average',
                period: cdk.Duration.hours(24)
              })
            ],
            right: [
              new cloudwatch.Metric({
                namespace: 'VideoAnalyzer/Cost',
                metricName: 'CostAlert',
                statistic: 'Maximum',
                period: cdk.Duration.hours(1)
              })
            ],
            width: 4,
            height: 6
          })
        ]
      ]
    });

    // CloudWatch アラーム設定

    // 1. ストレージ使用量アラーム
    const storageAlarm = new cloudwatch.Alarm(this, 'StorageUsageAlarm', {
      alarmName: `VideoAnalyzer-StorageUsage-${this.stackName}`,
      alarmDescription: 'Storage usage exceeds 80% of limit',
      metric: new cloudwatch.Metric({
        namespace: 'VideoAnalyzer/Cleanup',
        metricName: 'TotalStorageUsage',
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 8589934592, // 8GB (80% of 10GB limit)
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 2. クリーンアップエラーアラーム
    const cleanupErrorAlarm = new cloudwatch.Alarm(this, 'CleanupErrorAlarm', {
      alarmName: `VideoAnalyzer-CleanupErrors-${this.stackName}`,
      alarmDescription: 'High number of cleanup errors detected',
      metric: new cloudwatch.Metric({
        namespace: 'VideoAnalyzer/Cleanup',
        metricName: 'CleanupErrors',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 5,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 3. データ整合性アラーム
    const consistencyAlarm = new cloudwatch.Alarm(this, 'DataConsistencyAlarm', {
      alarmName: `VideoAnalyzer-DataInconsistency-${this.stackName}`,
      alarmDescription: 'Data inconsistencies detected between S3 and DynamoDB',
      metric: new cloudwatch.Metric({
        namespace: 'VideoAnalyzer/Cleanup',
        metricName: 'InconsistenciesFound',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 10,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 4. Lambda関数エラーアラーム
    const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      alarmName: `VideoAnalyzer-LambdaErrors-${this.stackName}`,
      alarmDescription: 'High error rate in Lambda functions',
      metric: new cloudwatch.MathExpression({
        expression: '(e1 + e2 + e3 + e4) / (i1 + i2 + i3 + i4) * 100',
        usingMetrics: {
          e1: uploadHandler.metricErrors({ period: cdk.Duration.minutes(5) }),
          e2: analysisHandler.metricErrors({ period: cdk.Duration.minutes(5) }),
          e3: queryHandler.metricErrors({ period: cdk.Duration.minutes(5) }),
          e4: cleanupHandler.metricErrors({ period: cdk.Duration.minutes(5) }),
          i1: uploadHandler.metricInvocations({ period: cdk.Duration.minutes(5) }),
          i2: analysisHandler.metricInvocations({ period: cdk.Duration.minutes(5) }),
          i3: queryHandler.metricInvocations({ period: cdk.Duration.minutes(5) }),
          i4: cleanupHandler.metricInvocations({ period: cdk.Duration.minutes(5) })
        }
      }),
      threshold: 10, // 10% error rate
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 5. コスト監視アラーム
    const costWarningAlarm = new cloudwatch.Alarm(this, 'CostWarningAlarm', {
      alarmName: `VideoAnalyzer-CostWarning-${this.stackName}`,
      alarmDescription: 'Daily cost exceeds 80% of budget',
      metric: new cloudwatch.Metric({
        namespace: 'VideoAnalyzer/Cost',
        metricName: 'CostAlert',
        statistic: 'Maximum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 0.5, // Warning level (between 0 and 1)
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    const costCriticalAlarm = new cloudwatch.Alarm(this, 'CostCriticalAlarm', {
      alarmName: `VideoAnalyzer-CostCritical-${this.stackName}`,
      alarmDescription: 'Daily cost exceeds 95% of budget',
      metric: new cloudwatch.Metric({
        namespace: 'VideoAnalyzer/Cost',
        metricName: 'CostAlert',
        statistic: 'Maximum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1.5, // Critical level (between 1 and 2)
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // アラームをSNSトピックに接続
    storageAlarm.addAlarmAction(new cloudwatch.SnsAction(alertTopic));
    cleanupErrorAlarm.addAlarmAction(new cloudwatch.SnsAction(alertTopic));
    consistencyAlarm.addAlarmAction(new cloudwatch.SnsAction(alertTopic));
    lambdaErrorAlarm.addAlarmAction(new cloudwatch.SnsAction(alertTopic));
    costWarningAlarm.addAlarmAction(new cloudwatch.SnsAction(alertTopic));
    costCriticalAlarm.addAlarmAction(new cloudwatch.SnsAction(alertTopic));

    // API Gateway
    const api = new apigateway.RestApi(this, 'VideoAnalyzerApi', {
      restApiName: 'Video Analyzer API',
      description: 'API for Bedrock Video Analyzer',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key']
      }
    });

    // API エンドポイント
    const uploadIntegration = new apigateway.LambdaIntegration(uploadHandler);
    const analysisIntegration = new apigateway.LambdaIntegration(analysisHandler);
    const queryIntegration = new apigateway.LambdaIntegration(queryHandler);
    const statusIntegration = new apigateway.LambdaIntegration(statusHandler);
    const limitsIntegration = new apigateway.LambdaIntegration(limitsHandler);

    api.root.addResource('upload').addMethod('POST', uploadIntegration);
    api.root.addResource('analysis').addMethod('POST', analysisIntegration);
    api.root.addResource('query').addMethod('POST', queryIntegration);
    api.root.addResource('status').addMethod('GET', statusIntegration);
    api.root.addResource('limits').addMethod('GET', limitsIntegration);

    // 出力
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL'
    });

    new cdk.CfnOutput(this, 'VideoBucketName', {
      value: videoBucket.bucketName,
      description: 'S3 Bucket for video files'
    });

    new cdk.CfnOutput(this, 'VideoAnalysisTableName', {
      value: videoAnalysisTable.tableName,
      description: 'DynamoDB table for video analysis results'
    });

    new cdk.CfnOutput(this, 'QueryHistoryTableName', {
      value: queryHistoryTable.tableName,
      description: 'DynamoDB table for query history'
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL'
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS Topic ARN for system alerts'
    });
  }
}