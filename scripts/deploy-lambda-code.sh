#!/bin/bash

# Lambda関数コードデプロイスクリプト
set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-ap-northeast-1}

echo "🚀 Lambda関数コードのデプロイを開始します..."
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_ROOT/dist"

# パッケージファイルが存在するかチェック
if [ ! -d "$DIST_DIR" ]; then
    echo "❌ distディレクトリが見つかりません。まずpackage-lambda.shを実行してください。"
    exit 1
fi

# Lambda関数のリスト
FUNCTIONS=("upload" "analysis" "query" "status" "limits")

# 各Lambda関数のコードを更新
for FUNCTION in "${FUNCTIONS[@]}"; do
    FUNCTION_NAME="bedrock-video-analyzer-$FUNCTION-$ENVIRONMENT"
    ZIP_FILE="$DIST_DIR/$FUNCTION.zip"
    
    if [ ! -f "$ZIP_FILE" ]; then
        echo "❌ $ZIP_FILE が見つかりません。スキップします。"
        continue
    fi
    
    echo "📤 $FUNCTION_NAME のコードを更新中..."
    
    # Lambda関数が存在するかチェック
    if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
        # 関数コードを更新
        aws lambda update-function-code \
            --function-name "$FUNCTION_NAME" \
            --zip-file "fileb://$ZIP_FILE" \
            --region "$REGION" \
            --no-cli-pager
        
        echo "✅ $FUNCTION_NAME のコードを更新しました"
        
        # 関数の設定が更新されるまで少し待機
        sleep 2
        
    else
        echo "⚠️  $FUNCTION_NAME が見つかりません。CloudFormationで作成されているか確認してください。"
    fi
done

echo "🎉 Lambda関数コードのデプロイが完了しました！"

# デプロイされた関数の状態を確認
echo "📊 デプロイされた関数の状態:"
for FUNCTION in "${FUNCTIONS[@]}"; do
    FUNCTION_NAME="bedrock-video-analyzer-$FUNCTION-$ENVIRONMENT"
    
    if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
        LAST_MODIFIED=$(aws lambda get-function \
            --function-name "$FUNCTION_NAME" \
            --region "$REGION" \
            --query "Configuration.LastModified" \
            --output text)
        echo "  ✅ $FUNCTION_NAME - Last Modified: $LAST_MODIFIED"
    else
        echo "  ❌ $FUNCTION_NAME - Not Found"
    fi
done