"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoAnalyzerStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class VideoAnalyzerStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3バケット（動画ファイル保存用）
        const videoBucket = new s3.Bucket(this, 'VideoAnalyzerBucket', {
            bucketName: `video-analyzer-${this.account}-${this.region}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            versioned: false,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            lifecycleRules: [
                {
                    id: 'temp-files-cleanup',
                    prefix: 'temp/',
                    expiration: cdk.Duration.days(1),
                    enabled: true
                },
                {
                    id: 'uploads-cleanup',
                    prefix: 'uploads/',
                    expiration: cdk.Duration.days(7),
                    enabled: true
                },
                {
                    id: 'processed-cleanup',
                    prefix: 'processed/',
                    expiration: cdk.Duration.days(30),
                    enabled: true
                },
                {
                    id: 'storage-class-transition',
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
                            transitionAfter: cdk.Duration.days(365)
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
                REGION: this.region
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
                REGION: this.region
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
                REGION: this.region
            }
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
        api.root.addResource('upload').addMethod('POST', uploadIntegration);
        api.root.addResource('analysis').addMethod('POST', analysisIntegration);
        api.root.addResource('query').addMethod('POST', queryIntegration);
        api.root.addResource('status').addMethod('GET', statusIntegration);
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
    }
}
exports.VideoAnalyzerStack = VideoAnalyzerStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlkZW8tYW5hbHl6ZXItc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi92aWRlby1hbmFseXplci1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUVuQyx1REFBeUM7QUFDekMsbUVBQXFEO0FBQ3JELCtEQUFpRDtBQUNqRCx1RUFBeUQ7QUFDekQseURBQTJDO0FBRTNDLE1BQWEsa0JBQW1CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixvQkFBb0I7UUFDcEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3RCxVQUFVLEVBQUUsa0JBQWtCLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUMzRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsZ0JBQWdCLEVBQUUsS0FBSztZQUN2QixpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVU7WUFDMUMsY0FBYyxFQUFFO2dCQUNkO29CQUNFLEVBQUUsRUFBRSxvQkFBb0I7b0JBQ3hCLE1BQU0sRUFBRSxPQUFPO29CQUNmLFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2dCQUNEO29CQUNFLEVBQUUsRUFBRSxpQkFBaUI7b0JBQ3JCLE1BQU0sRUFBRSxVQUFVO29C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QUFDO1FBQ3BFLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUN4RSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDbEUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRW5FLEtBQUs7UUFDTCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUc7WUFDZCxXQUFXLEVBQUUsaUJBQWlCO1NBQy9CLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDekMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxVQUFVO1lBQzdCLFdBQVcsRUFBRSwyQkFBMkI7U0FDekMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNoRCxLQUFLLEVBQUUsa0JBQWtCLENBQUMsU0FBUztZQUNuQyxXQUFXLEVBQUUsMkNBQTJDO1NBQ3pELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0MsS0FBSyxFQUFFLGlCQUFpQixDQUFDLFNBQVM7WUFDbEMsV0FBVyxFQUFFLGtDQUFrQztTQUNoRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF2UEQsZ0RBdVBDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuXHJcbmV4cG9ydCBjbGFzcyBWaWRlb0FuYWx5emVyU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIFMz44OQ44Kx44OD44OI77yI5YuV55S744OV44Kh44Kk44Or5L+d5a2Y55So77yJXHJcbiAgICBjb25zdCB2aWRlb0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1ZpZGVvQW5hbHl6ZXJCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGB2aWRlby1hbmFseXplci0ke3RoaXMuYWNjb3VudH0tJHt0aGlzLnJlZ2lvbn1gLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyDmnKznlarnkrDlooPjgafjga8gUkVUQUlOIOOBq+WkieabtFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSwgLy8g5pys55Wq55Kw5aKD44Gn44GvIGZhbHNlIOOBq+WkieabtFxyXG4gICAgICB2ZXJzaW9uZWQ6IGZhbHNlLFxyXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiAndGVtcC1maWxlcy1jbGVhbnVwJyxcclxuICAgICAgICAgIHByZWZpeDogJ3RlbXAvJyxcclxuICAgICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDEpLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6ICd1cGxvYWRzLWNsZWFudXAnLFxyXG4gICAgICAgICAgcHJlZml4OiAndXBsb2Fkcy8nLFxyXG4gICAgICAgICAgZXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoNyksXHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ3Byb2Nlc3NlZC1jbGVhbnVwJyxcclxuICAgICAgICAgIHByZWZpeDogJ3Byb2Nlc3NlZC8nLFxyXG4gICAgICAgICAgZXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6ICdzdG9yYWdlLWNsYXNzLXRyYW5zaXRpb24nLFxyXG4gICAgICAgICAgdHJhbnNpdGlvbnM6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLklORlJFUVVFTlRfQUNDRVNTLFxyXG4gICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMzApXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5HTEFDSUVSLFxyXG4gICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoOTApXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5ERUVQX0FSQ0hJVkUsXHJcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzNjUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEeW5hbW9EQiDjg4bjg7zjg5bjg6vvvIjli5XnlLvop6PmnpDntZDmnpzkv53lrZjnlKjvvIlcclxuICAgIGNvbnN0IHZpZGVvQW5hbHlzaXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVmlkZW9BbmFseXNpc1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6IGBWaWRlb0FuYWx5c2lzLSR7dGhpcy5zdGFja05hbWV9YCxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd2aWRlb0lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndXBsb2FkVGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8g5pys55Wq55Kw5aKD44Gn44GvIFJFVEFJTiDjgavlpInmm7RcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VEXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEeW5hbW9EQiDjg4bjg7zjg5bjg6vvvIjllY/jgYTlkIjjgo/jgZvlsaXmrbTkv53lrZjnlKjvvIlcclxuICAgIGNvbnN0IHF1ZXJ5SGlzdG9yeVRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdRdWVyeUhpc3RvcnlUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgUXVlcnlIaXN0b3J5LSR7dGhpcy5zdGFja05hbWV9YCxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd2aWRlb0lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAncXVlcnlJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIOacrOeVqueSsOWig+OBp+OBryBSRVRBSU4g44Gr5aSJ5pu0XHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRh5a6f6KGM44Ot44O844OrXHJcbiAgICBjb25zdCBsYW1iZGFFeGVjdXRpb25Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXHJcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJylcclxuICAgICAgXSxcclxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcclxuICAgICAgICBWaWRlb0FuYWx5emVyUG9saWN5OiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcclxuICAgICAgICAgIHN0YXRlbWVudHM6IFtcclxuICAgICAgICAgICAgLy8gUzMg44Ki44Kv44K744K55qip6ZmQXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgICAgIHZpZGVvQnVja2V0LmJ1Y2tldEFybixcclxuICAgICAgICAgICAgICAgIGAke3ZpZGVvQnVja2V0LmJ1Y2tldEFybn0vKmBcclxuICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAvLyBEeW5hbW9EQiDjgqLjgq/jgrvjgrnmqKnpmZBcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgICAgIHZpZGVvQW5hbHlzaXNUYWJsZS50YWJsZUFybixcclxuICAgICAgICAgICAgICAgIHF1ZXJ5SGlzdG9yeVRhYmxlLnRhYmxlQXJuXHJcbiAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgLy8gQmVkcm9jayDjgqLjgq/jgrvjgrnmqKnpmZBcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXHJcbiAgICAgICAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbSdcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgYGFybjphd3M6YmVkcm9jazoke3RoaXMucmVnaW9ufTo6Zm91bmRhdGlvbi1tb2RlbC90d2VsdmVsYWJzLnBlZ2FzdXMtMS0yKmBcclxuICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICBdXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRh6Zai5pWw77yI44Ki44OD44OX44Ot44O844OJ5Yem55CG77yJXHJcbiAgICBjb25zdCB1cGxvYWRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBsb2FkSGFuZGxlcicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXHJcbiAgICAgIGhhbmRsZXI6ICd1cGxvYWQuaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2Rpc3QnKSxcclxuICAgICAgcm9sZTogbGFtYmRhRXhlY3V0aW9uUm9sZSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBWSURFT19CVUNLRVRfTkFNRTogdmlkZW9CdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBWSURFT19BTkFMWVNJU19UQUJMRV9OQU1FOiB2aWRlb0FuYWx5c2lzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFJFR0lPTjogdGhpcy5yZWdpb25cclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRh6Zai5pWw77yI6Kej5p6Q5Yem55CG77yJXHJcbiAgICBjb25zdCBhbmFseXNpc0hhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBbmFseXNpc0hhbmRsZXInLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBoYW5kbGVyOiAnYW5hbHlzaXMuaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2Rpc3QnKSxcclxuICAgICAgcm9sZTogbGFtYmRhRXhlY3V0aW9uUm9sZSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxyXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFZJREVPX0JVQ0tFVF9OQU1FOiB2aWRlb0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIFZJREVPX0FOQUxZU0lTX1RBQkxFX05BTUU6IHZpZGVvQW5hbHlzaXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgUkVHSU9OOiB0aGlzLnJlZ2lvblxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMYW1iZGHplqLmlbDvvIjllY/jgYTlkIjjgo/jgZvlh6bnkIbvvIlcclxuICAgIGNvbnN0IHF1ZXJ5SGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1F1ZXJ5SGFuZGxlcicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXHJcbiAgICAgIGhhbmRsZXI6ICdxdWVyeS5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvZGlzdCcpLFxyXG4gICAgICByb2xlOiBsYW1iZGFFeGVjdXRpb25Sb2xlLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFZJREVPX0FOQUxZU0lTX1RBQkxFX05BTUU6IHZpZGVvQW5hbHlzaXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgUVVFUllfSElTVE9SWV9UQUJMRV9OQU1FOiBxdWVyeUhpc3RvcnlUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgUkVHSU9OOiB0aGlzLnJlZ2lvblxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMYW1iZGHplqLmlbDvvIjjgrnjg4bjg7zjgr/jgrnnrqHnkIbvvIlcclxuICAgIGNvbnN0IHN0YXR1c0hhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTdGF0dXNIYW5kbGVyJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgaGFuZGxlcjogJ3N0YXR1cy5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvZGlzdCcpLFxyXG4gICAgICByb2xlOiBsYW1iZGFFeGVjdXRpb25Sb2xlLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFZJREVPX0FOQUxZU0lTX1RBQkxFX05BTUU6IHZpZGVvQW5hbHlzaXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgUkVHSU9OOiB0aGlzLnJlZ2lvblxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMYW1iZGHplqLmlbDvvIjjgq/jg6rjg7zjg7PjgqLjg4Pjg5flh6bnkIbvvIlcclxuICAgIGNvbnN0IGNsZWFudXBIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ2xlYW51cEhhbmRsZXInLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBoYW5kbGVyOiAnY2xlYW51cC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvZGlzdCcpLFxyXG4gICAgICByb2xlOiBsYW1iZGFFeGVjdXRpb25Sb2xlLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBWSURFT19CVUNLRVRfTkFNRTogdmlkZW9CdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBWSURFT19BTkFMWVNJU19UQUJMRV9OQU1FOiB2aWRlb0FuYWx5c2lzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFJFR0lPTjogdGhpcy5yZWdpb25cclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIEdhdGV3YXlcclxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1ZpZGVvQW5hbHl6ZXJBcGknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiAnVmlkZW8gQW5hbHl6ZXIgQVBJJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIEJlZHJvY2sgVmlkZW8gQW5hbHl6ZXInLFxyXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcclxuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ1gtQW16LURhdGUnLCAnQXV0aG9yaXphdGlvbicsICdYLUFwaS1LZXknXVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkg44Ko44Oz44OJ44Od44Kk44Oz44OIXHJcbiAgICBjb25zdCB1cGxvYWRJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVwbG9hZEhhbmRsZXIpO1xyXG4gICAgY29uc3QgYW5hbHlzaXNJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFuYWx5c2lzSGFuZGxlcik7XHJcbiAgICBjb25zdCBxdWVyeUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocXVlcnlIYW5kbGVyKTtcclxuICAgIGNvbnN0IHN0YXR1c0ludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc3RhdHVzSGFuZGxlcik7XHJcblxyXG4gICAgYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3VwbG9hZCcpLmFkZE1ldGhvZCgnUE9TVCcsIHVwbG9hZEludGVncmF0aW9uKTtcclxuICAgIGFwaS5yb290LmFkZFJlc291cmNlKCdhbmFseXNpcycpLmFkZE1ldGhvZCgnUE9TVCcsIGFuYWx5c2lzSW50ZWdyYXRpb24pO1xyXG4gICAgYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3F1ZXJ5JykuYWRkTWV0aG9kKCdQT1NUJywgcXVlcnlJbnRlZ3JhdGlvbik7XHJcbiAgICBhcGkucm9vdC5hZGRSZXNvdXJjZSgnc3RhdHVzJykuYWRkTWV0aG9kKCdHRVQnLCBzdGF0dXNJbnRlZ3JhdGlvbik7XHJcblxyXG4gICAgLy8g5Ye65YqbXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xyXG4gICAgICB2YWx1ZTogYXBpLnVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwnXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVmlkZW9CdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogdmlkZW9CdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgZm9yIHZpZGVvIGZpbGVzJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ZpZGVvQW5hbHlzaXNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB2aWRlb0FuYWx5c2lzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIGZvciB2aWRlbyBhbmFseXNpcyByZXN1bHRzJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1F1ZXJ5SGlzdG9yeVRhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHF1ZXJ5SGlzdG9yeVRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBmb3IgcXVlcnkgaGlzdG9yeSdcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==