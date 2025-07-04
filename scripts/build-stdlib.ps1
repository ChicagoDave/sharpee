# Build stdlib package script for PowerShell 7
Set-Location "C:\repotemp\sharpee"

Write-Host "Building stdlib package..." -ForegroundColor Cyan

# Navigate to stdlib
Set-Location "packages\stdlib"

# Clean old build
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

# Build with TypeScript
Write-Host "Running TypeScript compiler..." -ForegroundColor Yellow
& npx tsc

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ stdlib built successfully!" -ForegroundColor Green
    
    # Count files
    $jsFiles = (Get-ChildItem -Path "dist" -Filter "*.js" -Recurse).Count
    $dtsFiles = (Get-ChildItem -Path "dist" -Filter "*.d.ts" -Recurse).Count
    Write-Host "  Files: $jsFiles JS, $dtsFiles TS declarations" -ForegroundColor Gray
} else {
    Write-Host "✗ stdlib build failed!" -ForegroundColor Red
    exit 1
}

# Return to root
Set-Location "..\..\"

Write-Host "Build complete!" -ForegroundColor Green
