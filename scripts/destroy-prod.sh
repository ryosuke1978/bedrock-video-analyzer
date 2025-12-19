#!/bin/bash

# 本番環境削除スクリプト
# Usage: ./scripts/destroy-prod.sh [profile] [region]

set -e

# 設定
PROFILE=${1:-default}
REGION=${2:-ap-northeast-1}
STACK_NAME="VideoAnalyzerProdStack"

echo "⚠️  本番環境の削除を開始します..."
echo "Profile: $PROFILE"
echo "Region: $REGION"
echo "Stack: $STACK_NAME"

# 削除前の確認
echo "🚨 危険: 本番環境のすべてのリソースを削除しようとしています！"
echo "この操作は取り消すことができません。"
echo ""
echo "削除されるリソース:"
echo "  - S3バケット（動画ファイル含む）"
echo "  - DynamoDBテーブル（解析結果含む）"
echo "  - Lambda関数"
echo "  - API Gateway"
echo "  - CloudWatch ダッシュボード・アラーム"
echo "  - SNS トピック"
echo "  - WAF Web ACL"
echo ""
read -p "本当に削除しますか？ (DELETE と入力してください): " confirmation

if [ "$confirmation" != "DELETE" ]; then
    echo "❌ 削除をキャンセルしました"
    exit 1
fi

# 最終確認
echo ""
echo "最終確認: 本番環境を削除します"
read -p "続行しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 削除をキャンセルしました"
    exit 1
fi

# 本番環境フラグを設定
export DEPLOY_PROD=true

# 削除実行
echo "🗑️  本番環境を削除しています..."
npx cdk destroy $STACK_NAME \
    --profile $PROFILE \
    --region $REGION \
    --force

# 削除結果の確認
if [ $? -eq 0 ]; then
    echo "✅ 本番環境の削除が完了しました"
    echo ""
    echo "⚠️  注意: 以下のリソースは手動で削除が必要な場合があります:"
    echo "  - S3バケット（削除保護が有効な場合）"
    echo "  - DynamoDBテーブル（削除保護が有効な場合）"
    echo "  - CloudWatch ログ"
    echo "  - Route 53 レコード（カスタムドメイン使用時）"
else
    echo "❌ 削除に失敗しました"
    exit 1
fi