# Upload API詳細テストスクリプト

$apiUrl = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev"

Write-Host "=== Upload API 詳細テスト ===" -ForegroundColor Cyan
Write-Host ""

# テストデータ
$testData = @{
    fileName = "test-video.mp4"
    fileSize = 1048576
    contentType = "video/mp4"
} | ConvertTo-Json

Write-Host "リクエストデータ:" -ForegroundColor Yellow
Write-Host $testData
Write-Host ""

try {
    Write-Host "Upload APIを呼び出し中..." -ForegroundColor Yellow
    $response = Invoke-WebRequest `
        -Uri "$apiUrl/upload" `
        -Method POST `
        -Body $testData `
        -Headers @{"Content-Type"="application/json"} `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✅ 成功!" -ForegroundColor Green
    Write-Host "ステータスコード: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "レスポンス:" -ForegroundColor Yellow
    Write-Host $response.Content
    
} catch {
    Write-Host "❌ エラー発生" -ForegroundColor Red
    Write-Host ""
    Write-Host "エラーメッセージ:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "レスポンスボディ:" -ForegroundColor Yellow
        Write-Host $responseBody
        Write-Host ""
        
        # JSONとしてパース
        try {
            $errorJson = $responseBody | ConvertFrom-Json
            Write-Host "エラー詳細:" -ForegroundColor Yellow
            Write-Host "  - エラーコード: $($errorJson.errorCode)" -ForegroundColor Red
            Write-Host "  - メッセージ: $($errorJson.message)" -ForegroundColor Red
            Write-Host "  - タイムスタンプ: $($errorJson.timestamp)" -ForegroundColor Red
        } catch {
            Write-Host "JSONパースエラー" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== テスト完了 ===" -ForegroundColor Cyan
