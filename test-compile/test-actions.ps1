# Test compilation of switching actions
Set-Location -Path "C:\repotemp\sharpee"

Write-Host "Testing compilation of switching actions..." -ForegroundColor Cyan

# Try to compile just the action files
Write-Host "`nCompiling switching-on.ts..." -ForegroundColor Yellow
npx tsc --noEmit packages/stdlib/src/actions/switching-on.ts

Write-Host "`nCompiling switching-off.ts..." -ForegroundColor Yellow  
npx tsc --noEmit packages/stdlib/src/actions/switching-off.ts

Write-Host "`nDone!" -ForegroundColor Green
