#!/usr/bin/env pwsh
# Quick build test script

Set-Location $PSScriptRoot
Write-Host "Building @sharpee/engine..." -ForegroundColor Cyan

# Run the build and capture output
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "engine-build-$timestamp.log"

npm run build 2>&1 | Tee-Object -FilePath $logFile

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild succeeded!" -ForegroundColor Green
} else {
    Write-Host "`nBuild failed. Check $logFile for details." -ForegroundColor Red
}
