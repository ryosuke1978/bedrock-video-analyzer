Write-Host "🚀 API テスト開始" -ForegroundColor Green

$url = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev/limits"
Write-Host "テスト URL: $url" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $url -Method GET
    Write-Host "✅ 成功!" -ForegroundColor Green
    Write-Host "レスポンス:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ エラー: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "詳細: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}