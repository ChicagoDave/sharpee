#!/usr/bin/env pwsh

Write-Host "Building world-model package..." -ForegroundColor Cyan

# Change to world-model directory
Push-Location packages/world-model

try {
    # Clean previous build
    if (Test-Path dist) {
        Remove-Item -Path dist -Recurse -Force
    }
    
    # Run TypeScript compiler
    Write-Host "Running TypeScript compiler..." -ForegroundColor Yellow
    npx tsc
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Build failed with errors" -ForegroundColor Red
    }
} finally {
    Pop-Location
}
