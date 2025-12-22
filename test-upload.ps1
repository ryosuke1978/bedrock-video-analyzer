Write-Host "Upload API Test"

$API_BASE_URL = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev"

try {
    $uploadBody = @{
        fileName = "test-video.mp4"
        fileSize = 5000000
        contentType = "video/mp4"
    } | ConvertTo-Json

    $uploadResponse = Invoke-RestMethod -Uri "$API_BASE_URL/upload" -Method POST -Body $uploadBody -ContentType "application/json"
    Write-Host "SUCCESS: Upload API"
    Write-Host "VideoID: $($uploadResponse.videoId)"
    Write-Host "Presigned URL generated"
    
    # Save VideoID for other tests
    $uploadResponse.videoId | Out-File -FilePath "video-id.txt" -Encoding UTF8
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}