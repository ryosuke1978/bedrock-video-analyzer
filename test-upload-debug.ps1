# Upload API Debug Test

$apiUrl = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev"

Write-Host "Testing Upload API with detailed error handling..."

$testData = @{
    fileName = "test-video.mp4"
    fileSize = 1048576
    contentType = "video/mp4"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$apiUrl/upload" -Method POST -Body $testData -Headers @{"Content-Type"="application/json"} -ErrorAction Stop
    Write-Host "Success!"
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "Error occurred:"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)"
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
        
        try {
            $errorJson = $responseBody | ConvertFrom-Json
            Write-Host "Parsed Error:"
            Write-Host ($errorJson | ConvertTo-Json -Depth 5)
        } catch {
            Write-Host "Could not parse response as JSON"
        }
    }
}