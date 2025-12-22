Write-Host "API Test Start"

$url = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev/limits"
Write-Host "Testing URL: $url"

try {
    $response = Invoke-RestMethod -Uri $url -Method GET
    Write-Host "SUCCESS!"
    Write-Host "Response:"
    $response | ConvertTo-Json
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}