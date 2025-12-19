# Lambda関数パッケージ作成スクリプト

param(
    [string]$Environment = "dev"
)

Write-Host "Lambda関数のパッケージを作成しています..."

# 環境変数設定
$env:AWS_ACCESS_KEY_ID = "YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"

# S3バケット名
$bucketName = "bedrock-video-analyzer-$Environment-252689085095"

Write-Host "S3バケットを作成しています: $bucketName"

# S3バケット作成（既に存在する場合はスキップ）
try {
    aws s3 mb s3://$bucketName --region ap-northeast-1
    Write-Host "S3バケットを作成しました: $bucketName"
} catch {
    Write-Host "S3バケットは既に存在します: $bucketName"
}

# 一時ディレクトリ作成
$tempDir = "temp-lambda-packages"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir

# Lambda関数リスト
$functions = @("upload", "analysis", "status", "query", "limits")

foreach ($func in $functions) {
    Write-Host "パッケージを作成中: $func"
    
    # 関数用ディレクトリ作成
    $funcDir = "$tempDir/$func"
    New-Item -ItemType Directory -Path $funcDir
    
    # コンパイル済みJSファイルをコピー
    if (Test-Path "lambda/dist/$func.js") {
        Copy-Item "lambda/dist/$func.js" "$funcDir/$func.js"
        Copy-Item "lambda/dist/$func.js.map" "$funcDir/$func.js.map" -ErrorAction SilentlyContinue
    } else {
        Write-Error "コンパイル済みファイルが見つかりません: lambda/dist/$func.js"
        continue
    }
    
    # utilsディレクトリをコピー
    if (Test-Path "lambda/dist/utils") {
        Copy-Item -Recurse "lambda/dist/utils" "$funcDir/utils"
    }
    
    # package.jsonを作成
    $packageJson = @{
        name = "bedrock-video-analyzer-$func"
        version = "1.0.0"
        main = "$func.js"
        dependencies = @{
            "@aws-sdk/client-bedrock-runtime" = "^3.954.0"
            "@aws-sdk/client-dynamodb" = "^3.954.0"
            "@aws-sdk/client-s3" = "^3.954.0"
            "@aws-sdk/lib-dynamodb" = "^3.954.0"
            "@aws-sdk/s3-request-presigner" = "^3.954.0"
            "uuid" = "^9.0.0"
        }
    } | ConvertTo-Json -Depth 3
    
    $packageJson | Out-File -FilePath "$funcDir/package.json" -Encoding UTF8
    
    # ZIPファイル作成
    $zipPath = "$func.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath
    }
    
    # PowerShellでZIP作成
    Compress-Archive -Path "$funcDir/*" -DestinationPath $zipPath
    
    # S3にアップロード
    Write-Host "S3にアップロード中: $func.zip"
    aws s3 cp $zipPath s3://$bucketName/lambda/$zipPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func.zip をアップロードしました"
    } else {
        Write-Error "❌ $func.zip のアップロードに失敗しました"
    }
}

# 共通レイヤー作成
Write-Host "共通レイヤーを作成中..."
$layerDir = "$tempDir/layer/nodejs"
New-Item -ItemType Directory -Path $layerDir -Force

# package.jsonを作成
$layerPackageJson = @{
    name = "bedrock-video-analyzer-layer"
    version = "1.0.0"
    dependencies = @{
        "@aws-sdk/client-bedrock-runtime" = "^3.954.0"
        "@aws-sdk/client-dynamodb" = "^3.954.0"
        "@aws-sdk/client-s3" = "^3.954.0"
        "@aws-sdk/lib-dynamodb" = "^3.954.0"
        "@aws-sdk/s3-request-presigner" = "^3.954.0"
        "uuid" = "^9.0.0"
    }
} | ConvertTo-Json -Depth 3

$layerPackageJson | Out-File -FilePath "$layerDir/package.json" -Encoding UTF8

# レイヤーZIP作成
$layerZipPath = "common-layer.zip"
if (Test-Path $layerZipPath) {
    Remove-Item $layerZipPath
}

Compress-Archive -Path "$tempDir/layer/*" -DestinationPath $layerZipPath

# S3にアップロード
Write-Host "共通レイヤーをS3にアップロード中..."
aws s3 cp $layerZipPath s3://$bucketName/layers/$layerZipPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 共通レイヤーをアップロードしました"
} else {
    Write-Error "❌ 共通レイヤーのアップロードに失敗しました"
}

# 一時ディレクトリ削除
Remove-Item -Recurse -Force $tempDir
Remove-Item $layerZipPath
foreach ($func in $functions) {
    Remove-Item "$func.zip" -ErrorAction SilentlyContinue
}

Write-Host "Lambda関数パッケージの作成が完了しました！"