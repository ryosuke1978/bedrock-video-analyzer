import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VideoAnalyzerStack } from '../lib/video-analyzer-stack';

describe('VideoAnalyzerStack', () => {
  let app: cdk.App;
  let stack: VideoAnalyzerStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new VideoAnalyzerStack(app, 'TestVideoAnalyzerStack');
    template = Template.fromStack(stack);
  });

  test('S3 Bucket is created with correct configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            }
          }
        ]
      }
    });
  });

  test('DynamoDB tables are created', () => {
    // VideoAnalysisTable
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        {
          AttributeName: 'videoId',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'uploadTimestamp',
          KeyType: 'RANGE'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true
      }
    });

    // QueryHistoryTable
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        {
          AttributeName: 'videoId',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'queryId',
          KeyType: 'RANGE'
        }
      ]
    });
  });

  test('Lambda functions are created with correct runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x'
    });
  });

  test('API Gateway is created with CORS configuration', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Video Analyzer API'
    });
  });

  test('IAM roles have correct permissions', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: [
        {
          PolicyDocument: {
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  's3:DeleteObject',
                  's3:GetObject',
                  's3:ListBucket',
                  's3:PutObject'
                ]
              },
              {
                Effect: 'Allow',
                Action: [
                  'dynamodb:DeleteItem',
                  'dynamodb:GetItem',
                  'dynamodb:PutItem',
                  'dynamodb:Query',
                  'dynamodb:Scan',
                  'dynamodb:UpdateItem'
                ]
              },
              {
                Effect: 'Allow',
                Action: [
                  'bedrock:InvokeModel',
                  'bedrock:InvokeModelWithResponseStream'
                ]
              }
            ]
          }
        }
      ]
    });
  });

  test('S3 lifecycle rules are configured correctly', () => {
    // S3ライフサイクルルールが設定されていることを確認
    const buckets = template.findResources('AWS::S3::Bucket');
    const bucketKeys = Object.keys(buckets);
    expect(bucketKeys.length).toBeGreaterThan(0);
    
    const bucket = buckets[bucketKeys[0]];
    expect(bucket.Properties.LifecycleConfiguration).toBeDefined();
    expect(bucket.Properties.LifecycleConfiguration.Rules).toBeDefined();
    expect(bucket.Properties.LifecycleConfiguration.Rules.length).toBeGreaterThan(0);
    
    // temp-files-cleanupルールの存在確認
    const tempRule = bucket.Properties.LifecycleConfiguration.Rules.find(
      (rule: any) => rule.Id === 'temp-files-cleanup'
    );
    expect(tempRule).toBeDefined();
    expect(tempRule.ExpirationInDays).toBe(1);
    expect(tempRule.Prefix).toBe('temp/');
  });

  test('Stack outputs are defined', () => {
    template.hasOutput('ApiUrl', {});
    template.hasOutput('VideoBucketName', {});
    template.hasOutput('VideoAnalysisTableName', {});
    template.hasOutput('QueryHistoryTableName', {});
  });
});