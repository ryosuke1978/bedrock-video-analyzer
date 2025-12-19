# PowerShell CloudFormation デプロイスクリプト

Write-Host "=== CloudFormation デプロイ開始 ===" -ForegroundColor Green

# 環境変数設定
$env:AWS_ACCESS_KEY_ID = "YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"

Write-Host "環境変数設定完了" -ForegroundColor Yellow
Write-Host "AWS Region: ap-northeast-1"
Write-Host "Stack Name: bedrock-video-analyzer-dev"
Write-Host ""

# CloudFormationスタック作成
Write-Host "CloudFormationスタックを作成中..." -ForegroundColor Yellow

try {
    # 既存スタック削除
    Write-Host "既存スタックを削除中..." -ForegroundColor Gray
    aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev 2>$null
    
    # 新しいスタック作成
    Write-Host "新しいスタックを作成中..." -ForegroundColor Yellow
    aws cloudformation create-stack --stack-name bedrock-video-analyzer-dev --template-body file://fixed-cloudformation.yaml --capabilities CAPABILITY_NAMED_IAM --parameters ParameterKey=Environment,ParameterValue=dev
    
    Write-Host "スタック作成コマンド実行完了" -ForegroundColor Green
    Write-Host ""
    Write-Host "AWSコンソールで進行状況を確認できます:" -ForegroundColor Blue
    Write-Host "https://console.aws.amazon.com/cloudformation/" -ForegroundColor Blue
    Write-Host ""
    Write-Host "完了まで5-10分程度かかります" -ForegroundColor Yellow
}
catch {
    Write-Host "エラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "スクリプト実行完了" -ForegroundColor Green