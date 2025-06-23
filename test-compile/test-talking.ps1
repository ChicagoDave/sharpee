# Test compilation of talking action
Set-Location -Path "C:\repotemp\sharpee"

Write-Host "Testing compilation of talking action..." -ForegroundColor Cyan

# Try to compile the action file
Write-Host "`nCompiling talking.ts..." -ForegroundColor Yellow
npx tsc --noEmit packages/stdlib/src/actions/talking.ts

Write-Host "`nDone!" -ForegroundColor Green
