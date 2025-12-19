#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VideoAnalyzerStack } from '../lib/video-analyzer-stack';
import { VideoAnalyzerDevStack } from '../lib/video-analyzer-dev-stack';
import { VideoAnalyzerProdStack } from '../lib/video-analyzer-prod-stack';
import { VideoAnalyzerNoIamStack } from '../lib/video-analyzer-no-iam-stack';

const app = new cdk.App();

// 環境設定
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
};

// 開発環境スタック
new VideoAnalyzerDevStack(app, 'VideoAnalyzerDevStack', {
  env,
  description: 'Bedrock Video Analyzer - Development Environment'
});

// 本番環境スタック（環境変数で制御）
if (process.env.DEPLOY_PROD === 'true') {
  new VideoAnalyzerProdStack(app, 'VideoAnalyzerProdStack', {
    env,
    description: 'Bedrock Video Analyzer - Production Environment',
    domainName: process.env.PROD_DOMAIN_NAME,
    certificateArn: process.env.PROD_CERTIFICATE_ARN,
    hostedZoneId: process.env.PROD_HOSTED_ZONE_ID,
    alertEmail: process.env.PROD_ALERT_EMAIL,
    budgetLimit: process.env.PROD_BUDGET_LIMIT ? parseFloat(process.env.PROD_BUDGET_LIMIT) : 100
  });
}

// ステージング環境スタック（オプション）
if (process.env.DEPLOY_STAGING === 'true') {
  new VideoAnalyzerProdStack(app, 'VideoAnalyzerStagingStack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
    },
    description: 'Bedrock Video Analyzer - Staging Environment',
    domainName: process.env.STAGING_DOMAIN_NAME,
    certificateArn: process.env.STAGING_CERTIFICATE_ARN,
    hostedZoneId: process.env.STAGING_HOSTED_ZONE_ID,
    alertEmail: process.env.STAGING_ALERT_EMAIL,
    budgetLimit: process.env.STAGING_BUDGET_LIMIT ? parseFloat(process.env.STAGING_BUDGET_LIMIT) : 50
  });
}

// IAM作成権限不要版スタック（環境変数で制御）
if (process.env.DEPLOY_NO_IAM === 'true') {
  const lambdaExecutionRoleArn = process.env.LAMBDA_EXECUTION_ROLE_ARN;
  
  if (!lambdaExecutionRoleArn) {
    throw new Error('LAMBDA_EXECUTION_ROLE_ARN environment variable is required when DEPLOY_NO_IAM=true');
  }

  new VideoAnalyzerNoIamStack(app, 'VideoAnalyzerNoIamStack', {
    lambdaExecutionRoleArn: lambdaExecutionRoleArn,
    env,
    description: 'Bedrock Video Analyzer - No IAM Creation Required'
  });
}