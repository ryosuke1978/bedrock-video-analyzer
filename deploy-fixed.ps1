# 修正されたCloudFormationスタック作成スクリプト

# 環境変数設定
$env:AWS_ACCESS_KEY_ID = "YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"

Write-Host "=== 修正されたCloudFormationスタックを作成中 ==="

# 既存のスタックがあれば削除
Write-Host "既存のスタックを確認中..."
try {
    $existingStack = aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].StackStatus' --output text 2>$null
    if ($existingStack) {
        Write-Host "既存のスタックを削除中..."
        aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev
        Write-Host "スタック削除完了を待機中..."
        aws cloudformation wait stack-delete-complete --stack-name bedrock-video-analyzer-dev
        Write-Host "✅ 既存スタック削除完了"
    }
} catch {
    Write-Host "既存のスタックは見つかりませんでした"
}

# 新しいスタック作成
Write-Host "`n=== 新しいスタックを作成中 ==="
try {
    aws cloudformation create-stack `
        --stack-name bedrock-video-analyzer-dev `
        --template-body file://fixed-cloudformation.yaml `
        --capabilities CAPABILITY_NAMED_IAM `
        --parameters ParameterKey=Environment,ParameterValue=dev
    
    Write-Host "✅ スタック作成コマンドを実行しました"
    Write-Host "⏳ スタック作成の完了を待機中（数分かかります）..."
    
    # スタック作成完了を待機
    aws cloudformation wait stack-create-complete --stack-name bedrock-video-analyzer-dev
    
    Write-Host "`n✅ スタック作成が完了しました！"
    
    # API Gateway URLを取得
    Write-Host "`n=== デプロイ結果 ==="
    $apiUrl = aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text
    Write-Host "API Gateway URL: $apiUrl"
    
    # 出力情報を表示
    Write-Host "`nスタック出力情報:"
    aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].Outputs' --output table
    
    # APIテスト
    Write-Host "`n=== APIテスト ==="
    Write-Host "Limits APIをテスト中..."
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/limits" -Method GET
        Write-Host "✅ Limits API テスト成功:"
        Write-Host ($response | ConvertTo-Json -Depth 3)
    } catch {
        Write-Host "❌ Limits API テスト失敗: $($_.Exception.Message)"
    }
    
} catch {
    Write-Host "❌ スタック作成でエラーが発生しました"
    Write-Host "エラー詳細: $($_.Exception.Message)"
    
    # エラーイベントを確認
    Write-Host "`nスタックイベントを確認します..."
    aws cloudformation describe-stack-events --stack-name bedrock-video-analyzer-dev --max-items 10 --query 'StackEvents[*].[Timestamp,ResourceStatus,ResourceType,LogicalResourceId,ResourceStatusReason]' --output table
}