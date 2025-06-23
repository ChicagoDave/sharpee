#!/usr/bin/env pwsh

# Test building all packages

Write-Host "Testing all package builds..." -ForegroundColor Yellow

$packages = @(
    "core",
    "world-model", 
    "stdlib",
    "forge",
    "lang-en-us"
)

$failed = $false

foreach ($package in $packages) {
    Write-Host "`nBuilding $package..." -ForegroundColor Cyan
    Set-Location "C:\repotemp\sharpee\packages\$package"
    
    # Run TypeScript compiler
    $output = npx tsc 2>&1 | Out-String
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED to build $package" -ForegroundColor Red
        Write-Host $output
        $failed = $true
    } else {
        Write-Host "Successfully built $package" -ForegroundColor Green
    }
}

if ($failed) {
    Write-Host "`nBuild FAILED - see errors above" -ForegroundColor Red
} else {
    Write-Host "`nAll builds completed successfully!" -ForegroundColor Green
}
