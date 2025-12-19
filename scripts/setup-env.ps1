# 環境設定セットアップスクリプト（PowerShell版）

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production", "no-iam")]
    [string]$Environment
)

$ErrorActionPreference = "Stop"

Write-Host "🔧 Video Analyzer 環境設定セットアップ" -ForegroundColor Green
Write-Host "🌍 環境: $Environment" -ForegroundColor Cyan

# 環境に応じたファイル名の決定
$envFile = switch ($Environment) {
    "development" { ".env.dev" }
    "staging" { ".env.staging" }
    "production" { ".env.prod" }
    "no-iam" { ".env.no-iam" }
}

$exampleFile = switch ($Environment) {
    "development" { ".env.dev.example" }
    default { ".env.example" }
}

# 既存ファイルの確認
if (Test-Path $envFile) {
    Write-Host "⚠️  $envFile は既に存在します。" -ForegroundColor Yellow
    $overwrite = Read-Host "上書きしますか？ (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ セットアップをキャンセルしました。" -ForegroundColor Red
        exit 0
    }
}

# テンプレートファイルの確認
if (-not (Test-Path $exampleFile)) {
    Write-Host "❌ テンプレートファイル $exampleFile が見つかりません。" -ForegroundColor Red
    exit 1
}

# ファイルのコピー
Write-Host "📄 $exampleFile を $envFile にコピーしています..." -ForegroundColor Yellow
Copy-Item $exampleFile $envFile

Write-Host "✅ $envFile を作成しました！" -ForegroundColor Green
Write-Host ""
Write-Host "📝 次のステップ:" -ForegroundColor Cyan
Write-Host "1. $envFile を編集してAWS認証情報を設定" -ForegroundColor White
Write-Host "2. 必要に応じて他の設定値を調整" -ForegroundColor White
Write-Host "3. デプロイを実行: .\scripts\deploy-with-env.ps1 $Environment" -ForegroundColor White
Write-Host ""
Write-Host "🔑 設定が必要な主要項目:" -ForegroundColor Yellow
Write-Host "- AWS_ACCESS_KEY_ID" -ForegroundColor White
Write-Host "- AWS_SECRET_ACCESS_KEY" -ForegroundColor White
Write-Host "- CDK_DEFAULT_ACCOUNT" -ForegroundColor White

if ($Environment -eq "no-iam") {
    Write-Host "- LAMBDA_EXECUTION_ROLE_ARN" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 IAM作成権限不要版の詳細は IAM-SETUP.md を参照してください。" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📖 詳細な設定方法は ENV-SETUP.md を参照してください。" -ForegroundColor Cyan

# ファイルを開くかどうか確認
$openFile = Read-Host "$envFile を今すぐ編集しますか？ (y/N)"
if ($openFile -eq "y" -or $openFile -eq "Y") {
    if (Get-Command "code" -ErrorAction SilentlyContinue) {
        code $envFile
    } elseif (Get-Command "notepad" -ErrorAction SilentlyContinue) {
        notepad $envFile
    } else {
        Write-Host "エディタが見つかりません。手動で $envFile を編集してください。" -ForegroundColor Yellow
    }
}