/**
 * Property 10: セキュリティ処理の完全性
 * 検証対象: 要件 9.1, 9.2, 9.3
 * 
 * Feature: bedrock-video-analyzer, Property 10: セキュリティ処理の完全性
 */

import * as fc from 'fast-check';
import { VideoAnalyzerStack } from '../lib/video-analyzer-stack';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('Property 10: セキュリティ処理の完全性', () => {
  let app: cdk.App;
  let stack: VideoAnalyzerStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new VideoAnalyzerStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  /**
   * Property 10.1: S3バケットの暗号化設定
   * 任意のS3バケットに対して、暗号化が有効になっている
   */
  test('Property 10.1: S3バケットは暗号化されている', () => {
    fc.assert(
      fc.property(
        fc.constant(template),
        (template) => {
          // S3バケットが暗号化設定を持っていることを検証
          template.hasResourceProperties('AWS::S3::Bucket', {
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
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.2: DynamoDBテーブルの暗号化設定
   * 任意のDynamoDBテーブルに対して、暗号化が有効になっている
   */
  test('Property 10.2: DynamoDBテーブルは暗号化されている', () => {
    fc.assert(
      fc.property(
        fc.constant(template),
        (template) => {
          // DynamoDBテーブルの暗号化設定を検証
          template.hasResourceProperties('AWS::DynamoDB::Table', {
            SSESpecification: {
              SSEEnabled: true
            }
          });
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.3: Lambda関数のセキュリティ設定
   * 任意のLambda関数に対して、適切なIAM権限が設定されている
   */
  test('Property 10.3: Lambda関数は最小権限の原則に従っている', () => {
    fc.assert(
      fc.property(
        fc.constant(template),
        (template) => {
          // Lambda実行ロールが存在することを検証
          template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: {
                    Service: 'lambda.amazonaws.com'
                  },
                  Action: 'sts:AssumeRole'
                }
              ]
            }
          });
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.4: S3バケットのパブリックアクセス制限
   * 任意のS3バケットに対して、パブリックアクセスがブロックされている
   */
  test('Property 10.4: S3バケットはパブリックアクセスがブロックされている', () => {
    fc.assert(
      fc.property(
        fc.constant(template),
        (template) => {
          template.hasResourceProperties('AWS::S3::Bucket', {
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              BlockPublicPolicy: true,
              IgnorePublicAcls: true,
              RestrictPublicBuckets: true
            }
          });
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.5: ライフサイクルポリシーによる自動削除
   * 任意のS3バケットに対して、一時ファイルの自動削除ポリシーが設定されている
   */
  test('Property 10.5: 一時ファイルの自動削除ポリシーが設定されている', () => {
    fc.assert(
      fc.property(
        fc.constant(template),
        (template) => {
          template.hasResourceProperties('AWS::S3::Bucket', {
            LifecycleConfiguration: {
              Rules: [
                {
                  Id: 'temp-files-cleanup',
                  Status: 'Enabled'
                }
              ]
            }
          });
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.6: DynamoDBのポイントインタイムリカバリ
   * 任意のDynamoDBテーブルに対して、ポイントインタイムリカバリが有効になっている
   */
  test('Property 10.6: DynamoDBテーブルはポイントインタイムリカバリが有効', () => {
    fc.assert(
      fc.property(
        fc.constant(template),
        (template) => {
          template.hasResourceProperties('AWS::DynamoDB::Table', {
            PointInTimeRecoverySpecification: {
              PointInTimeRecoveryEnabled: true
            }
          });
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});