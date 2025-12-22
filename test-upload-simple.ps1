# Simple Upload API Test

$apiUrl = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev"

Write-Host "Testing Upload API..."

$testData = @{
    fileName = "test-video.mp4"
    fileSize = 1048576
    contentType = "video/mp4"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$apiUrl/upload" -Method POST -Body $testData -Headers @{"Content-Type"="application/json"} -UseBasicParsing -ErrorAction Stop
    Write-Host "Success: $($response.StatusCode)"
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}