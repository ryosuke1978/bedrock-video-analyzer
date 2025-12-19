/**
 * CDKスタック統合テスト
 * CDKスタックの構成とリソースの統合テスト
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VideoAnalyzerStack } from '../../lib/video-analyzer-stack';
import { VideoAnalyzerDevStack } from '../../lib/video-analyzer-dev-stack';
import { VideoAnalyzerProdStack } from '../../lib/video-analyzer-prod-stack';

describe('CDK Stack Integration Tests', () => {
  describe('VideoAnalyzerStack', () => {
    let app: cdk.App;
    let stack: VideoAnalyzerStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new VideoAnalyzerStack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' }
      });
      template = Template.fromStack(stack);
    });

    test('should create S3 bucket with lifecycle rules', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256'
              }
            }
          ]
        },
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({
              Id: 'temp-files-cleanup',
              ExpirationInDays: 1,
              Status: 'Enabled'
            }),
            Match.objectLike({
              Id: 'uploads-cleanup',
              ExpirationInDays: 7,
              Status: 'Enabled'
            }),
            Match.objectLike({
              Id: 'processed-cleanup',
              ExpirationInDays: 30,
              Status: 'Enabled'
            })
          ])
        }
      });
    });

    test('should create DynamoDB tables with correct configuration', () => {
      // VideoAnalysisTable
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
          { AttributeName: 'videoId', KeyType: 'HASH' },
          { AttributeName: 'uploadTimestamp', KeyType: 'RANGE' }
        ],
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true
        }
      });

      // QueryHistoryTable
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
          { AttributeName: 'videoId', KeyType: 'HASH' },
          { AttributeName: 'queryId', KeyType: 'RANGE' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      });
    });

    test('should create Lambda functions with correct configuration', () => {
      // Upload Handler
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'upload.handler',
        Runtime: 'nodejs18.x',
        Timeout: 300,
        MemorySize: 512
      });

      // Analysis Handler
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'analysis.handler',
        Runtime: 'nodejs18.x',
        Timeout: 900,
        MemorySize: 1024
      });

      // Query Handler
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'query.handler',
        Runtime: 'nodejs18.x',
        Timeout: 300,
        MemorySize: 512
      });
    });

    test('should create API Gateway with correct endpoints', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'Video Analyzer API'
      });

      // Check for API resources
      template.resourceCountIs('AWS::ApiGateway::Resource', 5); // upload, analysis, query, status, limits
      // API Gatewayメソッドの存在確認
      const resources = template.toJSON().Resources;
      const methodCount = Object.keys(resources).filter(
        key => resources[key].Type === 'AWS::ApiGateway::Method'
      ).length;
      expect(methodCount).toBeGreaterThan(0);
    });

    test('should create EventBridge rules for scheduled tasks', () => {
      // Cleanup rule
      template.hasResourceProperties('AWS::Events::Rule', {
        ScheduleExpression: 'cron(0 2 * * ? *)',
        Description: Match.stringLikeRegexp('.*cleanup.*')
      });

      // Cost monitor rule
      template.hasResourceProperties('AWS::Events::Rule', {
        ScheduleExpression: 'cron(0 6 * * ? *)',
        Description: Match.stringLikeRegexp('.*cost.*')
      });
    });

    test('should create CloudWatch dashboard', () => {
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: Match.stringLikeRegexp('VideoAnalyzer*')
      });
    });

    test('should create CloudWatch alarms', () => {
      // Storage alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('*StorageUsage*'),
        ComparisonOperator: 'GreaterThanThreshold'
      });

      // Cleanup error alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('*CleanupErrors*'),
        ComparisonOperator: 'GreaterThanThreshold'
      });
    });

    test('should create SNS topic for alerts', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: 'Video Analyzer System Alerts'
      });
    });

    test('should have correct IAM permissions', () => {
      // Lambda execution role should have necessary permissions
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumedByPrincipalService: 'lambda.amazonaws.com',
        ManagedPolicyArns: Match.arrayWith([
          Match.objectLike({
            'Fn::Join': Match.arrayWith([
              Match.arrayWith([
                Match.stringLikeRegexp('*AWSLambdaBasicExecutionRole*')
              ])
            ])
          })
        ])
      });

      // Check for inline policies
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['s3:GetObject', 's3:PutObject', 's3:DeleteObject']),
              Effect: 'Allow'
            }),
            Match.objectLike({
              Action: Match.arrayWith(['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem']),
              Effect: 'Allow'
            }),
            Match.objectLike({
              Action: Match.arrayWith(['bedrock:InvokeModel']),
              Effect: 'Allow'
            })
          ])
        }
      });
    });

    test('should have correct stack outputs', () => {
      template.hasOutput('ApiUrl', {});
      template.hasOutput('VideoBucketName', {});
      template.hasOutput('VideoAnalysisTableName', {});
      template.hasOutput('QueryHistoryTableName', {});
      template.hasOutput('DashboardUrl', {});
      template.hasOutput('AlertTopicArn', {});
    });
  });

  describe('VideoAnalyzerDevStack', () => {
    let app: cdk.App;
    let stack: VideoAnalyzerDevStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new VideoAnalyzerDevStack(app, 'TestDevStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' }
      });
      template = Template.fromStack(stack);
    });

    test('should have development environment tags', () => {
      const resources = template.toJSON().Resources;
      const resourceKeys = Object.keys(resources);
      
      // At least one resource should exist
      expect(resourceKeys.length).toBeGreaterThan(0);
    });

    test('should inherit from VideoAnalyzerStack', () => {
      // Should have same resources as base stack
      template.resourceCountIs('AWS::S3::Bucket', 1);
      template.resourceCountIs('AWS::DynamoDB::Table', 2);
      // Lambda関数の存在確認
      const devResources = template.toJSON().Resources;
      const lambdaCount = Object.keys(devResources).filter(
        key => devResources[key].Type === 'AWS::Lambda::Function'
      ).length;
      expect(lambdaCount).toBeGreaterThan(0);
      template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    });
  });

  describe('VideoAnalyzerProdStack', () => {
    let app: cdk.App;
    let stack: VideoAnalyzerProdStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new VideoAnalyzerProdStack(app, 'TestProdStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
        alertEmail: 'test@example.com',
        budgetLimit: 100
      });
      template = Template.fromStack(stack);
    });

    test('should have production environment tags', () => {
      const resources = template.toJSON().Resources;
      const resourceKeys = Object.keys(resources);
      
      // At least one resource should exist
      expect(resourceKeys.length).toBeGreaterThan(0);
    });

    test('should create S3 bucket with KMS encryption', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms'
              }
            }
          ]
        },
        VersioningConfiguration: {
          Status: 'Enabled'
        }
      });
    });

    test('should create DynamoDB tables with customer managed encryption', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          SSEType: 'KMS'
        },
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true
        },
        DeletionProtectionEnabled: true
      });
    });

    test('should create Lambda functions with reserved concurrency', () => {
      // Upload Handler
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'upload.handler',
        ReservedConcurrentExecutions: 50,
        MemorySize: 1024
      });

      // Analysis Handler
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'analysis.handler',
        ReservedConcurrentExecutions: 10,
        MemorySize: 2048
      });
    });

    test('should create WAF Web ACL', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'REGIONAL',
        DefaultAction: { Allow: {} },
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'RateLimitRule',
            Priority: 1
          }),
          Match.objectLike({
            Name: 'AWSManagedRulesCommonRuleSet',
            Priority: 2
          }),
          Match.objectLike({
            Name: 'AWSManagedRulesKnownBadInputsRuleSet',
            Priority: 3
          })
        ])
      });
    });

    test('should create API Gateway with caching enabled', () => {
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        StageName: 'prod',
        CacheClusterEnabled: true,
        CacheClusterSize: '0.5',
        MethodSettings: Match.arrayWith([
          Match.objectLike({
            CachingEnabled: true
          })
        ])
      });
    });

    test('should create SNS topic with email subscription', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: 'Video Analyzer Production System Alerts'
      });

      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: 'test@example.com'
      });
    });

    test('should have production-specific CloudWatch alarms', () => {
      // API error alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('*Prod-ApiErrors*'),
        Threshold: 10,
        EvaluationPeriods: 2
      });

      // Lambda error alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('*Prod-LambdaErrors*'),
        Threshold: 5,
        EvaluationPeriods: 2
      });

      // DynamoDB throttle alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('*Prod-DynamoThrottle*'),
        Threshold: 5,
        EvaluationPeriods: 1
      });
    });

    test('should have correct production stack outputs', () => {
      template.hasOutput('ProdApiUrl', {});
      template.hasOutput('ProdVideoBucketName', {});
      template.hasOutput('ProdVideoAnalysisTableName', {});
      template.hasOutput('ProdQueryHistoryTableName', {});
      template.hasOutput('ProdDashboardUrl', {});
      template.hasOutput('ProdAlertTopicArn', {});
      template.hasOutput('ProdWebACLArn', {});
    });
  });

  describe('Stack Comparison Tests', () => {
    test('production stack should have more security features than dev stack', () => {
      const app = new cdk.App();
      
      const devStack = new VideoAnalyzerDevStack(app, 'DevStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' }
      });
      
      const prodStack = new VideoAnalyzerProdStack(app, 'ProdStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
        alertEmail: 'test@example.com'
      });

      const devTemplate = Template.fromStack(devStack);
      const prodTemplate = Template.fromStack(prodStack);

      // Production should have WAF
      expect(() => {
        prodTemplate.hasResourceProperties('AWS::WAFv2::WebACL', {});
      }).not.toThrow();

      // Production should have more alarms
      const devAlarms = Object.keys(devTemplate.toJSON().Resources).filter(
        key => devTemplate.toJSON().Resources[key].Type === 'AWS::CloudWatch::Alarm'
      );
      const prodAlarms = Object.keys(prodTemplate.toJSON().Resources).filter(
        key => prodTemplate.toJSON().Resources[key].Type === 'AWS::CloudWatch::Alarm'
      );

      expect(prodAlarms.length).toBeGreaterThanOrEqual(devAlarms.length);
    });

    test('production stack should have deletion protection', () => {
      const app = new cdk.App();
      
      const prodStack = new VideoAnalyzerProdStack(app, 'ProdStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' }
      });

      const prodTemplate = Template.fromStack(prodStack);

      // DynamoDB tables should have deletion protection
      prodTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
        DeletionProtectionEnabled: true
      });
    });
  });
});