# API テストスクリプト
$API_BASE_URL = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev"

Write-Host "🚀 Bedrock Video Analyzer API テスト開始" -ForegroundColor Green
Write-Host "ベースURL: $API_BASE_URL" -ForegroundColor Cyan

# 1. Limits API テスト
Write-Host "`n📊 1. Limits API テスト中..." -ForegroundColor Yellow
try {
    $limitsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/limits" -Method GET -ContentType "application/json"
    Write-Host "✅ Limits API 成功" -ForegroundColor Green
    Write-Host "レスポンス: $($limitsResponse | ConvertTo-Json -Depth 3)" -ForegroundColor White
} catch {
    Write-Host "❌ Limits API エラー: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Upload API テスト
Write-Host "`n📤 2. Upload API テスト中..." -ForegroundColor Yellow
try {
    $uploadBody = @{
        fileName = "test-video.mp4"
        fileSize = 1000000
        contentType = "video/mp4"
    } | ConvertTo-Json

    $uploadResponse = Invoke-RestMethod -Uri "$API_BASE_URL/upload" -Method POST -Body $uploadBody -ContentType "application/json"
    Write-Host "✅ Upload API 成功" -ForegroundColor Green
    Write-Host "VideoID: $($uploadResponse.videoId)" -ForegroundColor White
    
    # VideoIDを保存（後続テストで使用）
    $global:testVideoId = $uploadResponse.videoId
} catch {
    Write-Host "❌ Upload API エラー: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Status API テスト
if ($global:testVideoId) {
    Write-Host "`n📋 3. Status API テスト中..." -ForegroundColor Yellow
    try {
        $statusResponse = Invoke-RestMethod -Uri "$API_BASE_URL/status?videoId=$global:testVideoId" -Method GET -ContentType "application/json"
        Write-Host "✅ Status API 成功" -ForegroundColor Green
        Write-Host "ステータス: $($statusResponse.status)" -ForegroundColor White
    } catch {
        Write-Host "❌ Status API エラー: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 4. Analysis API テスト
if ($global:testVideoId) {
    Write-Host "`n🔍 4. Analysis API テスト中..." -ForegroundColor Yellow
    try {
        $analysisBody = @{
            videoId = $global:testVideoId
        } | ConvertTo-Json

        $analysisResponse = Invoke-RestMethod -Uri "$API_BASE_URL/analysis" -Method POST -Body $analysisBody -ContentType "application/json"
        Write-Host "✅ Analysis API 成功" -ForegroundColor Green
        Write-Host "解析ステータス: $($analysisResponse.status)" -ForegroundColor White
    } catch {
        Write-Host "❌ Analysis API エラー: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 5. Query API テスト
if ($global:testVideoId) {
    Write-Host "`n❓ 5. Query API テスト中..." -ForegroundColor Yellow
    try {
        $queryBody = @{
            videoId = $global:testVideoId
            question = "この動画の内容を教えてください"
        } | ConvertTo-Json

        $queryResponse = Invoke-RestMethod -Uri "$API_BASE_URL/query" -Method POST -Body $queryBody -ContentType "application/json"
        Write-Host "✅ Query API 成功" -ForegroundColor Green
        Write-Host "回答: $($queryResponse.answer)" -ForegroundColor White
    } catch {
        Write-Host "❌ Query API エラー: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 API テスト完了" -ForegroundColor Green