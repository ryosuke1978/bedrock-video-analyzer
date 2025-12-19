# IAM作成権限不要版のデプロイスクリプト（PowerShell版）
# 事前作成されたIAMロールを使用してデプロイします

param(
    [string]$LambdaExecutionRoleArn
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Video Analyzer (No IAM) デプロイを開始します..." -ForegroundColor Green

# 環境変数またはパラメータからIAMロールARNを取得
if (-not $LambdaExecutionRoleArn) {
    $LambdaExecutionRoleArn = $env:LAMBDA_EXECUTION_ROLE_ARN
}

if (-not $LambdaExecutionRoleArn) {
    Write-Host "❌ エラー: LAMBDA_EXECUTION_ROLE_ARN が設定されていません" -ForegroundColor Red
    Write-Host "事前作成されたLambda実行ロールのARNを設定してください：" -ForegroundColor Yellow
    Write-Host "`$env:LAMBDA_EXECUTION_ROLE_ARN = 'arn:aws:iam::ACCOUNT:role/VideoAnalyzerLambdaRole'" -ForegroundColor Yellow
    Write-Host "または、パラメータで指定してください：" -ForegroundColor Yellow
    Write-Host ".\scripts\deploy-no-iam.ps1 -LambdaExecutionRoleArn 'arn:aws:iam::ACCOUNT:role/VideoAnalyzerLambdaRole'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 使用するIAMロール: $LambdaExecutionRoleArn" -ForegroundColor Cyan

# Lambda関数のビルド
Write-Host "🔨 Lambda関数をビルドしています..." -ForegroundColor Yellow
Set-Location lambda
npm install
npm run build
Set-Location ..

# 環境変数を設定
$env:DEPLOY_NO_IAM = "true"
$env:LAMBDA_EXECUTION_ROLE_ARN = $LambdaExecutionRoleArn

# CDKデプロイ
Write-Host "☁️ CDKスタックをデプロイしています..." -ForegroundColor Yellow
npx cdk deploy VideoAnalyzerNoIamStack --require-approval never

Write-Host "✅ デプロイが完了しました！" -ForegroundColor Green
Write-Host ""
Write-Host "📊 次のステップ:" -ForegroundColor Cyan
Write-Host "1. API Gateway URLを確認してフロントエンドを設定" -ForegroundColor White
Write-Host "2. CloudWatchダッシュボードで監視を開始" -ForegroundColor White
Write-Host "3. 必要に応じてSNSトピックにメール通知を設定" -ForegroundColor White