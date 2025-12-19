# 環境変数を使用したデプロイスクリプト（PowerShell版）

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production", "no-iam")]
    [string]$Environment,
    
    [string]$StackName,
    
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Video Analyzer デプロイを開始します..." -ForegroundColor Green
Write-Host "🌍 環境: $Environment" -ForegroundColor Cyan

# 環境変数の読み込み
Write-Host "📋 環境変数を読み込んでいます..." -ForegroundColor Yellow
node scripts/load-env.js $Environment

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 環境変数の読み込みに失敗しました" -ForegroundColor Red
    exit 1
}

# 環境に応じた.envファイルを読み込み
$envFile = switch ($Environment) {
    "development" { ".env.dev" }
    "staging" { ".env.staging" }
    "production" { ".env.prod" }
    "no-iam" { ".env.no-iam" }
    default { ".env" }
}

if (Test-Path $envFile) {
    Write-Host "📄 $envFile を読み込んでいます..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "⚠️  $envFile が見つかりません。$envFile.example をコピーして作成してください。" -ForegroundColor Yellow
}

# Lambda関数のビルド（スキップオプションがない場合）
if (-not $SkipBuild) {
    Write-Host "🔨 Lambda関数をビルドしています..." -ForegroundColor Yellow
    Set-Location lambda
    npm install
    npm run build
    Set-Location ..
}

# スタック名の決定
if (-not $StackName) {
    $StackName = switch ($Environment) {
        "development" { "VideoAnalyzerDevStack" }
        "staging" { "VideoAnalyzerStagingStack" }
        "production" { "VideoAnalyzerProdStack" }
        "no-iam" { "VideoAnalyzerNoIamStack" }
        default { "VideoAnalyzerStack" }
    }
}

# 環境に応じた環境変数設定
switch ($Environment) {
    "production" {
        $env:DEPLOY_PROD = "true"
        Write-Host "🏭 本番環境としてデプロイします" -ForegroundColor Red
    }
    "staging" {
        $env:DEPLOY_STAGING = "true"
        Write-Host "🧪 ステージング環境としてデプロイします" -ForegroundColor Yellow
    }
    "no-iam" {
        $env:DEPLOY_NO_IAM = "true"
        Write-Host "🔒 IAM作成権限不要版としてデプロイします" -ForegroundColor Magenta
        if (-not $env:LAMBDA_EXECUTION_ROLE_ARN) {
            Write-Host "❌ LAMBDA_EXECUTION_ROLE_ARN が設定されていません" -ForegroundColor Red
            exit 1
        }
        Write-Host "📋 使用するIAMロール: $env:LAMBDA_EXECUTION_ROLE_ARN" -ForegroundColor Cyan
    }
    "development" {
        Write-Host "🛠️  開発環境としてデプロイします" -ForegroundColor Green
    }
}

# AWS認証情報の確認
if (-not $env:AWS_ACCESS_KEY_ID -or -not $env:AWS_SECRET_ACCESS_KEY) {
    Write-Host "❌ AWS認証情報が設定されていません" -ForegroundColor Red
    Write-Host "AWS_ACCESS_KEY_ID と AWS_SECRET_ACCESS_KEY を設定してください" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔑 AWS認証情報: $($env:AWS_ACCESS_KEY_ID.Substring(0, 4))****" -ForegroundColor Cyan
Write-Host "📍 リージョン: $env:AWS_DEFAULT_REGION" -ForegroundColor Cyan
Write-Host "🏢 アカウント: $env:CDK_DEFAULT_ACCOUNT" -ForegroundColor Cyan

# CDKデプロイ
Write-Host "☁️ CDKスタック '$StackName' をデプロイしています..." -ForegroundColor Yellow
npx cdk deploy $StackName --require-approval never

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ デプロイが完了しました！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 次のステップ:" -ForegroundColor Cyan
    Write-Host "1. API Gateway URLを確認してフロントエンドを設定" -ForegroundColor White
    Write-Host "2. CloudWatchダッシュボードで監視を開始" -ForegroundColor White
    Write-Host "3. 必要に応じてSNSトピックにメール通知を設定" -ForegroundColor White
} else {
    Write-Host "❌ デプロイに失敗しました" -ForegroundColor Red
    exit 1
}