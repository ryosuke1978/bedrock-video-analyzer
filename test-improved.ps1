Write-Host "Testing Improved APIs" -ForegroundColor Green

$API_BASE_URL = "https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev"

# Test 1: Limits API (should work)
Write-Host "`n1. Testing Limits API..." -ForegroundColor Yellow
try {
    $limitsResponse = Invoke-RestMethod -Uri "$API_BASE_URL/limits" -Method GET
    Write-Host "SUCCESS: Limits API" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Limits API - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Upload API (improved error handling)
Write-Host "`n2. Testing Upload API..." -ForegroundColor Yellow
try {
    $uploadBody = @{
        fileName = "test-video.mp4"
        fileSize = 5000000
        contentType = "video/mp4"
    } | ConvertTo-Json

    $uploadResponse = Invoke-RestMethod -Uri "$API_BASE_URL/upload" -Method POST -Body $uploadBody -ContentType "application/json"
    Write-Host "SUCCESS: Upload API" -ForegroundColor Green
    Write-Host "VideoID: $($uploadResponse.videoId)" -ForegroundColor White
    
    # Save for other tests
    $global:testVideoId = $uploadResponse.videoId
    
} catch {
    Write-Host "ERROR: Upload API - $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more details from the response
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}

# Test 3: Status API (improved 404 handling)
Write-Host "`n3. Testing Status API with non-existent video..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "$API_BASE_URL/status?videoId=test-12345" -Method GET
    Write-Host "Response: $($statusResponse.message)" -ForegroundColor White
} catch {
    Write-Host "Expected 404: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: Status API with real video ID (if upload succeeded)
if ($global:testVideoId) {
    Write-Host "`n4. Testing Status API with real video ID..." -ForegroundColor Yellow
    try {
        $statusResponse = Invoke-RestMethod -Uri "$API_BASE_URL/status?videoId=$global:testVideoId" -Method GET
        Write-Host "SUCCESS: Status API" -ForegroundColor Green
        Write-Host "Status: $($statusResponse.status)" -ForegroundColor White
    } catch {
        Write-Host "ERROR: Status API - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nTest completed!" -ForegroundColor Green