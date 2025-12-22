Write-Host "🚀 全APIエンドポイントテスト開始" -ForegroundColor Green

$API_BASE_URL = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev"
$global:testVideoId = $null

# 1. Limits API テスト
Write-Host "`n📊 1. Limits API テスト" -ForegroundColor Yellow
try {
    $limitsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/limits" -Method GET
    Write-Host "✅ Limits API 成功" -ForegroundColor Green
    Write-Host "対応形式: $($limitsResponse.limits.file.supportedFormats)" -ForegroundColor White
} catch {
    Write-Host "❌ Limits API エラー: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Upload API テスト
Write-Host "`n📤 2. Upload API テスト" -ForegroundColor Yellow
try {
    $uploadBody = @{
        fileName = "test-video.mp4"
        fileSize = 5000000
        contentType = "video/mp4"
    } | ConvertTo-Json

    $uploadResponse = Invoke-RestMethod -Uri "$API_BASE_URL/upload" -Method POST -Body $uploadBody -ContentType "application/json"
    Write-Host "✅ Upload API 成功" -ForegroundColor Green
    Write-Host "VideoID: $($uploadResponse.videoId)" -ForegroundColor White
    Write-Host "プリサインドURL生成済み" -ForegroundColor White
    
    $global:testVideoId = $uploadResponse.videoId
} catch {
    Write-Host "❌ Upload API エラー: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Status API テスト
if ($global:testVideoId) {
    Write-Host "`n📋 3. Status API テスト" -ForegroundColor Yellow
    try {
        $statusResponse = Invoke-RestMethod -Uri "$API_BASE_URL/status?videoId=$global:testVideoId" -Method GET
        Write-Host "✅ Status API 成功" -ForegroundColor Green
        Write-Host "ステータス: $($statusResponse.status)" -ForegroundColor White
        Write-Host "進捗: $($statusResponse.progress)%" -ForegroundColor White
    } catch {
        Write-Host "❌ Status API エラー: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 4. Analysis API テスト
if ($global:testVideoId) {
    Write-Host "`n🔍 4. Analysis API テスト" -ForegroundColor Yellow
    try {
        $analysisBody = @{
            videoId = $global:testVideoId
        } | ConvertTo-Json

        $analysisResponse = Invoke-RestMethod -Uri "$API_BASE_URL/analysis" -Method POST -Body $analysisBody -ContentType "application/json"
        Write-Host "✅ Analysis API 成功" -ForegroundColor Green
        Write-Host "解析ステータス: $($analysisResponse.status)" -ForegroundColor White
        
        if ($analysisResponse.analysisResult) {
            Write-Host "解析結果: $($analysisResponse.analysisResult.summary)" -ForegroundColor White
        }
    } catch {
        Write-Host "❌ Analysis API エラー: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 5. Query API テスト
if ($global:testVideoId) {
    Write-Host "`n❓ 5. Query API テスト" -ForegroundColor Yellow
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
        Write-Host "理由: 動画解析が完了していない可能性があります" -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 全APIテスト完了" -ForegroundColor Green
Write-Host "📝 結果サマリー:" -ForegroundColor Cyan
Write-Host "- Limits API: システム制限情報取得" -ForegroundColor White
Write-Host "- Upload API: プリサインドURL生成" -ForegroundColor White
Write-Host "- Status API: 動画ステータス確認" -ForegroundColor White
Write-Host "- Analysis API: 動画解析実行" -ForegroundColor White
Write-Host "- Query API: 質問応答機能" -ForegroundColor White