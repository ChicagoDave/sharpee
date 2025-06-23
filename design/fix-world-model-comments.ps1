# PowerShell script to fix package comments in world-model

$worldModelPath = "C:\repotemp\sharpee\packages\world-model\src"

# Find all .ts files
$files = Get-ChildItem -Path $worldModelPath -Recurse -Filter "*.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace old package references
    $newContent = $content -replace "// packages/stdlib/src/world-model/", "// packages/world-model/src/"
    
    # Also fix any core-imports references
    $newContent = $newContent -replace "from '\.\./\.\./\.\./core-imports'", "from '@sharpee/core'"
    $newContent = $newContent -replace 'from "\.\./\.\./\.\./core-imports"', 'from "@sharpee/core"'
    
    # Fix constants imports
    $newContent = $newContent -replace "from '\.\./\.\./\.\./constants/", "from '@sharpee/stdlib/constants/"
    
    # Save if changed
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "Package comment fixes complete!"
