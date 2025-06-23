#!/usr/bin/env pwsh

# Test building world-model package

Write-Host "Testing world-model build..." -ForegroundColor Yellow

Set-Location "C:\repotemp\sharpee\packages\world-model"

# Run TypeScript compiler in check mode
Write-Host "`nRunning TypeScript check..." -ForegroundColor Cyan
npx tsc --noEmit 2>&1 | Out-String

Write-Host "`nBuild test complete." -ForegroundColor Green
