# PowerShell script to update all action tests to use vitest
$actionTestsPath = "C:\repotemp\sharpee\packages\stdlib\tests\unit\actions"
$files = Get-ChildItem -Path $actionTestsPath -Filter "*-golden.test.ts"

$updated = 0
$skipped = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "@jest/globals") {
        $newContent = $content -replace "import { describe, test, expect, beforeEach } from '@jest/globals';", "import { describe, test, expect, beforeEach } from 'vitest';"
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.Name)" -ForegroundColor Green
        $updated++
    } else {
        Write-Host "Skipped: $($file.Name) (already updated)" -ForegroundColor Yellow
        $skipped++
    }
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "Updated: $updated files" -ForegroundColor Green
Write-Host "Skipped: $skipped files" -ForegroundColor Yellow
