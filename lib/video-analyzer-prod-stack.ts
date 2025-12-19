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
import * as logs from 'aws-cdk-lib/aws-logs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

export interface VideoAnalyzerProdStackProps extends cdk.StackProps {
  domainName?: string;
  certificateArn?: string;
  hostedZoneId?: string;
  alertEmail?: string;
  budgetLimit?: number;
}

export class VideoAnalyzerProdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: VideoAnalyzerProdStackProps) {
    super(scope, id, props);

    // 本番環境用のタグ設定
    cdk.Tags.of(this).add('Environment', 'Production');
    cdk.Tags.of(this).add('Project', 'BedrockVideoAnalyzer');
    cdk.Tags.of(this).add('Owner', 'Production Team');
    cdk.Tags.of(this).add('CostCenter', 'AI-ML');
    cdk.Tags.of(this).add('Backup', 'Required');
    cdk.Tags.of(this).add('Monitoring', 'Critical');

    // S3バケット（本番環境用設定）
    const videoBucket = new s3.Bucket(this, 'VideoAnalyzerProdBucket', {
      bucketName: `video-analyzer-prod-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // 本番環境では削除保護
      autoDeleteObjects: false, // 本番環境では自動削除無効
      versioned: true, // バージョニング有効
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS_MANAGED, // KMS暗号化
      serverAccessLogsPrefix: 'access-logs/',
      intelligentTieringConfigurations: [
        {
          id: 'EntireBucket',
          optionalFields: [s3.IntelligentTieringOptionalFields.BUCKET_KEY_STATUS]
        }
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: props?.domainName ? [`https://${props.domainName}`] : ['https://your-domain.com'],
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
          expiration: cdk.Duration.days(30), // 本番環境では長期保持
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(7)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(90)
            }
          ],
          enabled: true
        },
        {
          id: 'processed-cleanup',
          prefix: 'processed/',
          expiration: cdk.Duration.days(365), // 1年保持
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90)
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(180)
            }
          ],
          enabled: true
        }
      ]
    });

    // DynamoDB テーブル（本番環境用設定）
    const videoAnalysisTable = new dynamodb.Table(this, 'VideoAnalysisProdTable', {
      tableName: `VideoAnalysis-Prod-${this.stackName}`,
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadTimestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.ON_DEMAND, // オンデマンド課金
      removalPolicy: cdk.RemovalPolicy.RETAIN, // 本番環境では削除保護
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED, // カスタマー管理キー
      backupPolicy: dynamodb.BackupPolicy.ENABLED, // 自動バックアップ有効
      deletionProtection: true, // 削除保護有効
      contributorInsightsEnabled: true, // パフォーマンス分析有効
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES // DynamoDB Streams有効
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
    const queryHistoryTable = new dynamodb.Table(this, 'QueryHistoryProdTable', {
      tableName: `QueryHistory-Prod-${this.stackName}`,
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'queryId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.ON_DEMAND,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      backupPolicy: dynamodb.BackupPolicy.ENABLED,
      deletionProtection: true,
      contributorInsightsEnabled: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    });

    // タイムスタンプ別検索用のGSI
    queryHistoryTable.addGlobalSecondaryIndex({
      indexName: 'TimestampIndex',
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
    });

    // CloudWatch ログ保持期間設定
    const logRetention = logs.RetentionDays.ONE_YEAR;

    // Lambda実行ロール（本番環境用）
    const lambdaExecutionRole = new iam.Role(this, 'LambdaProdExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        VideoAnalyzerProdPolicy: new iam.PolicyDocument({
          statements: [
            // S3 アクセス権限（最小権限の原則）
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject'
              ],
              resources: [`${videoBucket.bucketArn}/*`],
              conditions: {
                StringEquals: {
                  's3:x-amz-server-side-encryption': 'aws:kms'
                }
              }
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [videoBucket.bucketArn]
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
                `${videoAnalysisTable.tableArn}/index/*`,
                queryHistoryTable.tableArn,
                `${queryHistoryTable.tableArn}/index/*`
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
              resources: ['*'],
              conditions: {
                StringEquals: {
                  'cloudwatch:namespace': 'VideoAnalyzer/*'
                }
              }
            })
          ]
        })
      }
    });
    // Lambda関数（アップロード処理）- 本番環境用
    const uploadHandler = new lambda.Function(this, 'UploadProdHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'upload.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024, // 本番環境では大きめのメモリ
      reservedConcurrentExecutions: 50, // 同時実行数制限
      logRetention: logRetention,
      environment: {
        VIDEO_BUCKET_NAME: videoBucket.bucketName,
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        REGION: this.region,
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        MAX_FILE_SIZE_BYTES: '5368709120', // 5GB
        ENABLE_VIRUS_SCAN: 'true',
        ENABLE_DETAILED_LOGGING: 'true'
      }
    });

    // Lambda関数（解析処理）- 本番環境用
    const analysisHandler = new lambda.Function(this, 'AnalysisProdHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'analysis.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(15),
      memorySize: 2048, // 解析処理用に大きなメモリ
      reservedConcurrentExecutions: 10, // Bedrock制限を考慮
      logRetention: logRetention,
      environment: {
        VIDEO_BUCKET_NAME: videoBucket.bucketName,
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        REGION: this.region,
        PEGASUS_MODEL_ID: 'twelvelabs.pegasus-1-2',
        PEGASUS_MODEL_VERSION: '1.0',
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        ENABLE_MOCK: 'false',
        MAX_RETRY_ATTEMPTS: '3',
        RETRY_DELAY_MS: '1000',
        ENABLE_DETAILED_LOGGING: 'true',
        ANALYSIS_TIMEOUT_MS: '900000' // 15分
      }
    });

    // Lambda関数（問い合わせ処理）- 本番環境用
    const queryHandler = new lambda.Function(this, 'QueryProdHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'query.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      reservedConcurrentExecutions: 20,
      logRetention: logRetention,
      environment: {
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        QUERY_HISTORY_TABLE_NAME: queryHistoryTable.tableName,
        REGION: this.region,
        PEGASUS_MODEL_ID: 'twelvelabs.pegasus-1-2',
        PEGASUS_MODEL_VERSION: '1.0',
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        MAX_QUERY_LENGTH: '1000',
        ENABLE_CONTEXT_PRESERVATION: 'true',
        ENABLE_DETAILED_LOGGING: 'true'
      }
    });

    // Lambda関数（ステータス管理）- 本番環境用
    const statusHandler = new lambda.Function(this, 'StatusProdHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'status.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(1),
      memorySize: 512,
      reservedConcurrentExecutions: 100,
      logRetention: logRetention,
      environment: {
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        REGION: this.region,
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        ENABLE_CACHING: 'true',
        CACHE_TTL_SECONDS: '300'
      }
    });

    // Lambda関数（制限情報取得）- 本番環境用
    const limitsHandler = new lambda.Function(this, 'LimitsProdHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'limits.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      reservedConcurrentExecutions: 50,
      logRetention: logRetention,
      environment: {
        REGION: this.region,
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        MAX_FILE_SIZE_BYTES: '5368709120', // 5GB
        MAX_DURATION_SECONDS: '7200', // 2時間
        MAX_RESOLUTION_WIDTH: '3840',
        MAX_RESOLUTION_HEIGHT: '2160',
        BEDROCK_RATE_LIMIT: '100',
        CONCURRENT_ANALYSES_LIMIT: '10',
        ENABLE_DYNAMIC_LIMITS: 'true'
      }
    });

    // Lambda関数（クリーンアップ処理）- 本番環境用
    const cleanupHandler = new lambda.Function(this, 'CleanupProdHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cleanup.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      reservedConcurrentExecutions: 2, // クリーンアップは並列実行を制限
      logRetention: logRetention,
      environment: {
        VIDEO_BUCKET_NAME: videoBucket.bucketName,
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        QUERY_HISTORY_TABLE_NAME: queryHistoryTable.tableName,
        REGION: this.region,
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        TEMP_FILE_RETENTION_DAYS: '1',
        ANALYSIS_FILE_RETENTION_DAYS: '30',
        PROCESSED_FILE_RETENTION_DAYS: '365',
        QUERY_HISTORY_RETENTION_DAYS: '365',
        MAX_STORAGE_USAGE_BYTES: '107374182400', // 100GB
        ENABLE_STORAGE_OPTIMIZATION: 'true',
        ENABLE_CONSISTENCY_CHECK: 'true',
        BATCH_SIZE: '100'
      }
    });

    // Lambda関数（コスト監視処理）- 本番環境用
    const costMonitorHandler = new lambda.Function(this, 'CostMonitorProdHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cost-monitor.handler',
      code: lambda.Code.fromAsset('lambda/dist'),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.minutes(10),
      memorySize: 512,
      reservedConcurrentExecutions: 1,
      logRetention: logRetention,
      environment: {
        VIDEO_BUCKET_NAME: videoBucket.bucketName,
        VIDEO_ANALYSIS_TABLE_NAME: videoAnalysisTable.tableName,
        QUERY_HISTORY_TABLE_NAME: queryHistoryTable.tableName,
        REGION: this.region,
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        DAILY_BUDGET: (props?.budgetLimit || 100).toString(), // デフォルト$100/day
        WARNING_THRESHOLD: '0.8', // 80%で警告
        CRITICAL_THRESHOLD: '0.95', // 95%で緊急
        ENABLE_AUTO_SCALING: 'true',
        ENABLE_COST_OPTIMIZATION: 'true'
      }
    });

    // EventBridge ルール（本番環境用スケジュール）
    const cleanupRule = new events.Rule(this, 'CleanupProdScheduleRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*'
      }),
      description: 'Daily cleanup of old video files and data (Production)'
    });

    cleanupRule.addTarget(new targets.LambdaFunction(cleanupHandler));

    const costMonitorRule = new events.Rule(this, 'CostMonitorProdScheduleRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '6,12,18',
        day: '*',
        month: '*',
        year: '*'
      }),
      description: 'Cost monitoring and reporting (Production - 3 times daily)'
    });

    costMonitorRule.addTarget(new targets.LambdaFunction(costMonitorHandler));

    // SNS トピック（本番環境用アラート）
    const alertTopic = new sns.Topic(this, 'VideoAnalyzerProdAlerts', {
      topicName: `VideoAnalyzer-Prod-Alerts-${this.stackName}`,
      displayName: 'Video Analyzer Production System Alerts'
    });

    // メール通知設定
    if (props?.alertEmail) {
      alertTopic.addSubscription(new snsSubscriptions.EmailSubscription(props.alertEmail));
    }

    // WAF v2 Web ACL（本番環境用セキュリティ）
    const webAcl = new wafv2.CfnWebACL(this, 'VideoAnalyzerWebACL', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 2000, // 5分間で2000リクエスト
              aggregateKeyType: 'IP'
            }
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule'
          }
        },
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSetMetric'
          }
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsRuleSetMetric'
          }
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'VideoAnalyzerWebACL'
      }
    });

    // API Gateway（本番環境用設定）
    const api = new apigateway.RestApi(this, 'VideoAnalyzerProdApi', {
      restApiName: 'Video Analyzer Production API',
      description: 'Production API for Bedrock Video Analyzer',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        cachingEnabled: true,
        cacheClusterEnabled: true,
        cacheClusterSize: '0.5'
      },
      defaultCorsPreflightOptions: {
        allowOrigins: props?.domainName ? [`https://${props.domainName}`] : ['https://your-domain.com'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
        maxAge: cdk.Duration.hours(1)
      }
    });

    // WAF関連付け
    new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${api.restApiId}/stages/prod`,
      webAclArn: webAcl.attrArn
    });

    // API エンドポイント（本番環境用設定）
    const uploadIntegration = new apigateway.LambdaIntegration(uploadHandler, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' }
    });

    const analysisIntegration = new apigateway.LambdaIntegration(analysisHandler, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' }
    });

    const queryIntegration = new apigateway.LambdaIntegration(queryHandler, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' }
    });

    const statusIntegration = new apigateway.LambdaIntegration(statusHandler, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' }
    });

    const limitsIntegration = new apigateway.LambdaIntegration(limitsHandler, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' }
    });

    // APIリソースとメソッド
    const uploadResource = api.root.addResource('upload');
    uploadResource.addMethod('POST', uploadIntegration);

    const analysisResource = api.root.addResource('analysis');
    analysisResource.addMethod('POST', analysisIntegration);

    const queryResource = api.root.addResource('query');
    queryResource.addMethod('POST', queryIntegration);

    const statusResource = api.root.addResource('status');
    statusResource.addMethod('GET', statusIntegration);

    const limitsResource = api.root.addResource('limits');
    limitsResource.addMethod('GET', limitsIntegration);

    // 本番環境用のCloudWatch監視設定
    const dashboard = new cloudwatch.Dashboard(this, 'VideoAnalyzerProdDashboard', {
      dashboardName: `VideoAnalyzer-Production-${this.stackName}`,
      widgets: [
        [
          // API パフォーマンス
          new cloudwatch.GraphWidget({
            title: 'API Performance',
            left: [
              api.metricLatency({ period: cdk.Duration.minutes(5) }),
              api.metricCount({ period: cdk.Duration.minutes(5) })
            ],
            right: [
              api.metricClientError({ period: cdk.Duration.minutes(5) }),
              api.metricServerError({ period: cdk.Duration.minutes(5) })
            ],
            width: 12,
            height: 6
          })
        ],
        [
          // Lambda関数パフォーマンス
          new cloudwatch.GraphWidget({
            title: 'Lambda Performance',
            left: [
              uploadHandler.metricDuration({ period: cdk.Duration.minutes(5) }),
              analysisHandler.metricDuration({ period: cdk.Duration.minutes(5) }),
              queryHandler.metricDuration({ period: cdk.Duration.minutes(5) })
            ],
            right: [
              uploadHandler.metricErrors({ period: cdk.Duration.minutes(5) }),
              analysisHandler.metricErrors({ period: cdk.Duration.minutes(5) }),
              queryHandler.metricErrors({ period: cdk.Duration.minutes(5) })
            ],
            width: 12,
            height: 6
          })
        ],
        [
          // DynamoDB パフォーマンス
          new cloudwatch.GraphWidget({
            title: 'DynamoDB Performance',
            left: [
              videoAnalysisTable.metricConsumedReadCapacityUnits({ period: cdk.Duration.minutes(5) }),
              videoAnalysisTable.metricConsumedWriteCapacityUnits({ period: cdk.Duration.minutes(5) }),
              queryHistoryTable.metricConsumedReadCapacityUnits({ period: cdk.Duration.minutes(5) }),
              queryHistoryTable.metricConsumedWriteCapacityUnits({ period: cdk.Duration.minutes(5) })
            ],
            width: 12,
            height: 6
          })
        ]
      ]
    });

    // 本番環境用のアラーム設定
    
    // 1. API Gateway アラーム
    const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
      alarmName: `VideoAnalyzer-Prod-ApiErrors-${this.stackName}`,
      alarmDescription: 'High API error rate detected',
      metric: api.metricServerError({ period: cdk.Duration.minutes(5) }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 2. Lambda関数アラーム
    const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      alarmName: `VideoAnalyzer-Prod-LambdaErrors-${this.stackName}`,
      alarmDescription: 'High Lambda error rate detected',
      metric: new cloudwatch.MathExpression({
        expression: '(e1 + e2 + e3) / (i1 + i2 + i3) * 100',
        usingMetrics: {
          e1: uploadHandler.metricErrors({ period: cdk.Duration.minutes(5) }),
          e2: analysisHandler.metricErrors({ period: cdk.Duration.minutes(5) }),
          e3: queryHandler.metricErrors({ period: cdk.Duration.minutes(5) }),
          i1: uploadHandler.metricInvocations({ period: cdk.Duration.minutes(5) }),
          i2: analysisHandler.metricInvocations({ period: cdk.Duration.minutes(5) }),
          i3: queryHandler.metricInvocations({ period: cdk.Duration.minutes(5) })
        }
      }),
      threshold: 5, // 5% error rate
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 3. DynamoDB アラーム
    const dynamoThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoThrottleAlarm', {
      alarmName: `VideoAnalyzer-Prod-DynamoThrottle-${this.stackName}`,
      alarmDescription: 'DynamoDB throttling detected',
      metric: new cloudwatch.MathExpression({
        expression: 't1 + t2',
        usingMetrics: {
          t1: videoAnalysisTable.metricThrottledRequests({ period: cdk.Duration.minutes(5) }),
          t2: queryHistoryTable.metricThrottledRequests({ period: cdk.Duration.minutes(5) })
        }
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // アラームをSNSトピックに接続
    [apiErrorAlarm, lambdaErrorAlarm, dynamoThrottleAlarm].forEach(alarm => {
      alarm.addAlarmAction(new cloudwatch.SnsAction(alertTopic));
    });

    // 本番環境用の出力
    new cdk.CfnOutput(this, 'ProdApiUrl', {
      value: api.url,
      description: 'Production API Gateway URL',
      exportName: `${this.stackName}-ApiUrl`
    });

    new cdk.CfnOutput(this, 'ProdVideoBucketName', {
      value: videoBucket.bucketName,
      description: 'Production S3 Bucket for video files',
      exportName: `${this.stackName}-VideoBucket`
    });

    new cdk.CfnOutput(this, 'ProdVideoAnalysisTableName', {
      value: videoAnalysisTable.tableName,
      description: 'Production DynamoDB table for video analysis results',
      exportName: `${this.stackName}-VideoAnalysisTable`
    });

    new cdk.CfnOutput(this, 'ProdQueryHistoryTableName', {
      value: queryHistoryTable.tableName,
      description: 'Production DynamoDB table for query history',
      exportName: `${this.stackName}-QueryHistoryTable`
    });

    new cdk.CfnOutput(this, 'ProdDashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'Production CloudWatch Dashboard URL',
      exportName: `${this.stackName}-DashboardUrl`
    });

    new cdk.CfnOutput(this, 'ProdAlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'Production SNS Topic ARN for system alerts',
      exportName: `${this.stackName}-AlertTopic`
    });

    new cdk.CfnOutput(this, 'ProdWebACLArn', {
      value: webAcl.attrArn,
      description: 'Production WAF Web ACL ARN',
      exportName: `${this.stackName}-WebACL`
    });
  }
}