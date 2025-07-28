#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "logs/build-stdlib-$timestamp.log"

Write-Host "Building stdlib package..." -ForegroundColor Blue
Set-Location packages/stdlib
pnpm run build 2>&1 | Tee-Object -FilePath "../../$logFile"
$exitCode = $LASTEXITCODE
Set-Location ../..

if ($exitCode -ne 0) {
    Write-Host "Build failed! See $logFile for details" -ForegroundColor Red
    exit $exitCode
} else {
    Write-Host "Build succeeded!" -ForegroundColor Green
}
