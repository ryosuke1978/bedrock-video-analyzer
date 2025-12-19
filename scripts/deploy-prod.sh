#!/bin/bash

# 本番環境デプロイスクリプト
# Usage: ./scripts/deploy-prod.sh [profile] [region]

set -e

# 設定
PROFILE=${1:-default}
REGION=${2:-ap-northeast-1}
STACK_NAME="VideoAnalyzerProdStack"

echo "🚀 本番環境デプロイを開始します..."
echo "Profile: $PROFILE"
echo "Region: $REGION"
echo "Stack: $STACK_NAME"

# 環境変数の確認
echo "📋 環境変数を確認しています..."
if [ -z "$PROD_ALERT_EMAIL" ]; then
    echo "⚠️  警告: PROD_ALERT_EMAIL が設定されていません"
    read -p "アラート通知用のメールアドレスを入力してください: " PROD_ALERT_EMAIL
    export PROD_ALERT_EMAIL
fi

if [ -z "$PROD_BUDGET_LIMIT" ]; then
    echo "💰 予算制限が設定されていません。デフォルト値 $100/day を使用します"
    export PROD_BUDGET_LIMIT=100
fi

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

# 本番環境フラグを設定
export DEPLOY_PROD=true

# デプロイ前の確認
echo "⚠️  本番環境にデプロイしようとしています。"
echo "以下の設定で続行しますか？"
echo "  - Profile: $PROFILE"
echo "  - Region: $REGION"
echo "  - Alert Email: $PROD_ALERT_EMAIL"
echo "  - Budget Limit: $PROD_BUDGET_LIMIT USD/day"
echo ""
read -p "続行しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ デプロイをキャンセルしました"
    exit 1
fi

# デプロイ実行
echo "🚀 本番環境にデプロイしています..."
npx cdk deploy $STACK_NAME \
    --profile $PROFILE \
    --region $REGION \
    --require-approval never \
    --outputs-file cdk-outputs-prod.json

# デプロイ結果の確認
if [ $? -eq 0 ]; then
    echo "✅ 本番環境のデプロイが完了しました！"
    echo ""
    echo "📊 CloudWatch Dashboard:"
    echo "https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:"
    echo ""
    echo "🔔 SNS アラート設定:"
    echo "メールアドレス $PROD_ALERT_EMAIL にアラート通知が送信されます"
    echo ""
    echo "💰 コスト監視:"
    echo "日次予算制限: $PROD_BUDGET_LIMIT USD"
    echo ""
    echo "📋 出力情報は cdk-outputs-prod.json に保存されました"
else
    echo "❌ デプロイに失敗しました"
    exit 1
fi