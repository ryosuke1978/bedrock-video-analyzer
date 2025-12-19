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

export interface VideoAnalyzerNoIamStackProps extends cdk.StackProps {
  /**
   * 事前作成されたLambda実行ロールのARN
   * 必要な権限：
   * - AWSLambdaBasicExecutionRole
   * - S3: GetObject, PutObject, DeleteObject, ListBucket
   * - DynamoDB: GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan
   * - Bedrock: InvokeModel, InvokeModelWithResponseStream
   * - CloudWatch: PutMetricData
   */
  lambdaExecutionRoleArn: string;
}

export class VideoAnalyzerNoIamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: VideoAnalyzerNoIamStackProps) {
    super(scope, id, props);

    // 事前作成されたIAMロールを参照
    const lambdaExecutionRole = iam.Role.fromRoleArn(
      this, 
      'ExistingLambdaExecutionRole', 
      props.lambdaExecutionRoleArn
    );

    // S3バケット（動画ファイル保存用）
    const videoBucket = new s3.Bucket(this, 'VideoAnalyzerBucket', {
      bucketName: `video-analyzer-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
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
        }
      ]
    });

    // DynamoDB テーブル（動画解析結果保存用）
    const videoAnalysisTable = new dynamodb.Table(this, 'VideoAnalysisTable', {
      tableName: `VideoAnalysis-${this.stackName}`,
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadTimestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED
    });

    // タイムスタンプ別検索用のGSI
    queryHistoryTable.addGlobalSecondaryIndex({
      indexName: 'TimestampIndex',
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
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
        MAX_FILE_SIZE_BYTES: '5368709120',
        MAX_DURATION_SECONDS: '7200'
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
        MAX_STORAGE_USAGE_BYTES: '10737418240',
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
        DAILY_BUDGET: '10.0'
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

    costMonitorRule.addTarget(new targets.LambdaFunction(costMonitorHandler));

    // SNS トピック（アラート通知用）
    const alertTopic = new sns.Topic(this, 'VideoAnalyzerAlerts', {
      topicName: `VideoAnalyzer-Alerts-${this.stackName}`,
      displayName: 'Video Analyzer System Alerts'
    });

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

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS Topic ARN for system alerts'
    });
  }
}