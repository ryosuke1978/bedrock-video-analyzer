Write-Host "Status API Test"

$API_BASE_URL = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev"

# Test with a dummy video ID
$testVideoId = "test-12345"

try {
    $statusResponse = Invoke-RestMethod -Uri "$API_BASE_URL/status?videoId=$testVideoId" -Method GET
    Write-Host "SUCCESS: Status API"
    Write-Host "Response:"
    $statusResponse | ConvertTo-Json
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "This is expected - video not found"
}