#!/bin/bash

echo "=== Bedrock Video Analyzer CloudFormation デプロイ ==="
echo

# 環境変数設定
export AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=ap-northeast-1

echo "環境変数を設定しました"
echo "AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"
echo "AWS_DEFAULT_REGION: $AWS_DEFAULT_REGION"
echo

# 既存のスタックを削除（エラーは無視）
echo "既存のスタックを確認・削除中..."
if aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev 2>/dev/null; then
    echo "既存スタックの削除を開始しました"
    echo "削除完了を待機中..."
    aws cloudformation wait stack-delete-complete --stack-name bedrock-video-analyzer-dev
    echo "既存スタック削除完了"
else
    echo "既存スタックは見つかりませんでした"
fi
echo

# 新しいスタックを作成
echo "新しいCloudFormationスタックを作成中..."
if aws cloudformation create-stack \
    --stack-name bedrock-video-analyzer-dev \
    --template-body file://fixed-cloudformation.yaml \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameters ParameterKey=Environment,ParameterValue=dev; then
    
    echo "スタック作成コマンドを実行しました"
    echo
    echo "スタック作成完了を待機中（5-10分程度かかります）..."
    echo "進行状況はAWSコンソールでも確認できます: https://console.aws.amazon.com/cloudformation/"
    echo
    
    if aws cloudformation wait stack-create-complete --stack-name bedrock-video-analyzer-dev; then
        echo
        echo "=== デプロイ完了 ==="
        echo "スタック作成が正常に完了しました！"
        echo
        
        # API Gateway URLを取得
        echo "API Gateway URLを取得中..."
        API_URL=$(aws cloudformation describe-stacks \
            --stack-name bedrock-video-analyzer-dev \
            --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
            --output text)
        
        if [ -n "$API_URL" ]; then
            echo "API Gateway URL: $API_URL"
        else
            echo "警告: API Gateway URLの取得に失敗しました"
        fi
        echo
        
        # スタック出力情報を表示
        echo "=== 作成されたリソース ==="
        aws cloudformation describe-stacks \
            --stack-name bedrock-video-analyzer-dev \
            --query "Stacks[0].Outputs" \
            --output table
        echo
        
        # APIテスト
        if [ -n "$API_URL" ]; then
            echo "=== APIテスト ==="
            echo "Limits APIをテスト中..."
            echo "URL: $API_URL/limits"
            curl -s "$API_URL/limits" | jq . 2>/dev/null || curl -s "$API_URL/limits"
            echo
            echo
            echo "Upload API（POST）のテスト:"
            echo "URL: $API_URL/upload"
            curl -X POST "$API_URL/upload" \
                -H "Content-Type: application/json" \
                -d '{"fileName":"test.mp4","fileSize":1000000}' | jq . 2>/dev/null || \
            curl -X POST "$API_URL/upload" \
                -H "Content-Type: application/json" \
                -d '{"fileName":"test.mp4","fileSize":1000000}'
            echo
        fi
        
        echo
        echo "=== デプロイ完了 ==="
        echo "以下のリソースが作成されました:"
        echo "- S3バケット: bedrock-video-analyzer-dev-252689085095"
        echo "- DynamoDBテーブル: VideoAnalysis-dev, QueryHistory-dev"
        echo "- Lambda関数: bedrock-video-analyzer-upload-dev, bedrock-video-analyzer-limits-dev"
        echo "- API Gateway: bedrock-video-analyzer-api-dev"
        echo "- IAMロール: BedrockVideoAnalyzer-Lambda-dev-252689085095"
        echo
        if [ -n "$API_URL" ]; then
            echo "API Gateway URL: $API_URL"
            echo
            echo "次のステップ:"
            echo "1. フロントエンドでAPI URLを設定"
            echo "2. Lambda関数の実装コードを更新"
            echo "3. 本格的なテストを実行"
        fi
        
    else
        echo
        echo "エラー: スタック作成が失敗またはタイムアウトしました"
        echo "詳細なエラー情報を確認します..."
        echo
        aws cloudformation describe-stack-events \
            --stack-name bedrock-video-analyzer-dev \
            --max-items 10 \
            --query "StackEvents[?ResourceStatus=='CREATE_FAILED'].[Timestamp,ResourceType,LogicalResourceId,ResourceStatusReason]" \
            --output table
        exit 1
    fi
    
else
    echo "エラー: スタック作成コマンドが失敗しました"
    echo "CloudFormationテンプレートを確認してください"
    exit 1
fi