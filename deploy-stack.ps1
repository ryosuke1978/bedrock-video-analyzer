# CloudFormationスタック作成スクリプト

# 環境変数設定
$env:AWS_ACCESS_KEY_ID = "YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"

Write-Host "CloudFormationスタックを作成中..."

# スタック作成
try {
    aws cloudformation create-stack `
        --stack-name bedrock-video-analyzer-dev `
        --template-body file://simple-cloudformation.yaml `
        --capabilities CAPABILITY_NAMED_IAM `
        --parameters ParameterKey=Environment,ParameterValue=dev
    
    Write-Host "✅ スタック作成コマンドを実行しました"
    Write-Host "⏳ スタック作成の完了を待機中..."
    
    # スタック作成完了を待機
    aws cloudformation wait stack-create-complete --stack-name bedrock-video-analyzer-dev
    
    Write-Host "✅ スタック作成が完了しました！"
    
    # API Gateway URLを取得
    Write-Host "`nAPI Gateway URLを取得中..."
    $apiUrl = aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text
    Write-Host "API Gateway URL: $apiUrl"
    
    # 出力情報を表示
    Write-Host "`nスタック出力情報:"
    aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].Outputs' --output table
    
} catch {
    Write-Host "❌ スタック作成でエラーが発生しました"
    Write-Host "エラー詳細: $($_.Exception.Message)"
    
    # エラーイベントを確認
    Write-Host "`nスタックイベントを確認します..."
    aws cloudformation describe-stack-events --stack-name bedrock-video-analyzer-dev --max-items 10 --query 'StackEvents[*].[Timestamp,ResourceStatus,ResourceType,LogicalResourceId,ResourceStatusReason]' --output table
}