#!/usr/bin/env node

/**
 * 環境変数読み込みスクリプト
 * 指定された環境に応じて適切な.envファイルを読み込みます
 */

const fs = require('fs');
const path = require('path');

// 環境の決定
const environment = process.argv[2] || process.env.NODE_ENV || 'development';

// 環境に応じた.envファイルのパス
const envFiles = {
  'development': '.env.dev',
  'staging': '.env.staging',
  'production': '.env.prod',
  'no-iam': '.env.no-iam'
};

const envFile = envFiles[environment] || '.env';
const envPath = path.join(__dirname, '..', envFile);

// .envファイルの存在確認
if (!fs.existsSync(envPath)) {
  console.error(`❌ エラー: ${envFile} ファイルが見つかりません`);
  console.error(`📋 以下のファイルを作成してください:`);
  console.error(`   ${envFile}.example をコピーして ${envFile} として保存`);
  process.exit(1);
}

// dotenvを使用して環境変数を読み込み
require('dotenv').config({ path: envPath });

console.log(`✅ 環境変数を読み込みました: ${envFile}`);
console.log(`🌍 環境: ${environment}`);
console.log(`📍 リージョン: ${process.env.AWS_DEFAULT_REGION || 'ap-northeast-1'}`);

// 必須環境変数のチェック
const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'CDK_DEFAULT_ACCOUNT'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ 以下の必須環境変数が設定されていません:`);
  missingVars.forEach(varName => {
    console.error(`   ${varName}`);
  });
  process.exit(1);
}

// IAM作成権限不要版の場合の追加チェック
if (process.env.DEPLOY_NO_IAM === 'true' && !process.env.LAMBDA_EXECUTION_ROLE_ARN) {
  console.error(`❌ DEPLOY_NO_IAM=true の場合、LAMBDA_EXECUTION_ROLE_ARN が必要です`);
  process.exit(1);
}

console.log(`✅ 必須環境変数の確認完了`);