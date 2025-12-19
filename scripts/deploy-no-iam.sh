#!/bin/bash

# IAM作成権限不要版のデプロイスクリプト
# 事前作成されたIAMロールを使用してデプロイします

set -e

echo "🚀 Video Analyzer (No IAM) デプロイを開始します..."

# 必要な環境変数をチェック
if [ -z "$LAMBDA_EXECUTION_ROLE_ARN" ]; then
    echo "❌ エラー: LAMBDA_EXECUTION_ROLE_ARN 環境変数が設定されていません"
    echo "事前作成されたLambda実行ロールのARNを設定してください："
    echo "export LAMBDA_EXECUTION_ROLE_ARN=arn:aws:iam::ACCOUNT:role/VideoAnalyzerLambdaRole"
    exit 1
fi

echo "📋 使用するIAMロール: $LAMBDA_EXECUTION_ROLE_ARN"

# Lambda関数のビルド
echo "🔨 Lambda関数をビルドしています..."
cd lambda
npm install
npm run build
cd ..

# CDKデプロイ
echo "☁️ CDKスタックをデプロイしています..."
npx cdk deploy VideoAnalyzerNoIamStack \
    --parameters lambdaExecutionRoleArn=$LAMBDA_EXECUTION_ROLE_ARN \
    --require-approval never

echo "✅ デプロイが完了しました！"
echo ""
echo "📊 次のステップ:"
echo "1. API Gateway URLを確認してフロントエンドを設定"
echo "2. CloudWatchダッシュボードで監視を開始"
echo "3. 必要に応じてSNSトピックにメール通知を設定"