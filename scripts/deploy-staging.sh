#!/bin/bash

# ステージング環境デプロイスクリプト
# Usage: ./scripts/deploy-staging.sh [profile] [region]

set -e

# 設定
PROFILE=${1:-default}
REGION=${2:-ap-northeast-1}
STACK_NAME="VideoAnalyzerStagingStack"

echo "🚀 ステージング環境デプロイを開始します..."
echo "Profile: $PROFILE"
echo "Region: $REGION"
echo "Stack: $STACK_NAME"

# 環境変数の設定（ステージング用）
export DEPLOY_STAGING=true
export STAGING_ALERT_EMAIL=${STAGING_ALERT_EMAIL:-$PROD_ALERT_EMAIL}
export STAGING_BUDGET_LIMIT=${STAGING_BUDGET_LIMIT:-50}

# Lambda関数のビルド
echo "🔨 Lambda関数をビルドしています..."
cd lambda
npm ci --production
npm run build
cd ..

# CDKのビルド
echo "🔨 CDKプロジェクトをビルドしています..."
npm run build

# CDK Bootstrap（初回のみ必要）
echo "🏗️  CDK Bootstrapを実行しています..."
npx cdk bootstrap --profile $PROFILE --region $REGION

# デプロイ実行
echo "🚀 ステージング環境にデプロイしています..."
npx cdk deploy $STACK_NAME \
    --profile $PROFILE \
    --region $REGION \
    --require-approval never \
    --outputs-file cdk-outputs-staging.json

# デプロイ結果の確認
if [ $? -eq 0 ]; then
    echo "✅ ステージング環境のデプロイが完了しました！"
    echo ""
    echo "📋 出力情報は cdk-outputs-staging.json に保存されました"
else
    echo "❌ デプロイに失敗しました"
    exit 1
fi