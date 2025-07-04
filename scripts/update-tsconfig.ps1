# Update all tsconfig.json files to ensure proper configuration
Write-Host "Updating tsconfig.json files..." -ForegroundColor Yellow

# Function to update tsconfig.json
function Update-TsConfig {
    param(
        [string]$PackagePath
    )
    
    $tsconfigPath = Join-Path $PackagePath "tsconfig.json"
    if (Test-Path $tsconfigPath) {
        $content = Get-Content $tsconfigPath -Raw
        $json = $content | ConvertFrom-Json
        
        $modified = $false
        
        # Ensure compilerOptions exists
        if (-not $json.compilerOptions) {
            $json | Add-Member -MemberType NoteProperty -Name "compilerOptions" -Value @{} -Force
            $modified = $true
        }
        
        # Update outDir to dist
        if ($json.compilerOptions.outDir -ne "dist" -and $json.compilerOptions.outDir -ne "./dist") {
            Write-Host "  Updating outDir in $PackagePath" -ForegroundColor Cyan
            $json.compilerOptions.outDir = "./dist"
            $modified = $true
        }
        
        # Update rootDir to src
        if ($json.compilerOptions.rootDir -ne "src" -and $json.compilerOptions.rootDir -ne "./src") {
            Write-Host "  Updating rootDir in $PackagePath" -ForegroundColor Cyan
            $json.compilerOptions.rootDir = "./src"
            $modified = $true
        }
        
        # Remove composite mode for now (we'll do simple builds)
        if ($json.compilerOptions.composite) {
            Write-Host "  Removing composite mode in $PackagePath" -ForegroundColor Cyan
            $json.compilerOptions.PSObject.Properties.Remove("composite")
            $modified = $true
        }
        
        # Remove references for now
        if ($json.references) {
            Write-Host "  Removing references in $PackagePath" -ForegroundColor Cyan
            $json.PSObject.Properties.Remove("references")
            $modified = $true
        }
        
        # Ensure declaration is true
        if (-not $json.compilerOptions.declaration) {
            $json.compilerOptions | Add-Member -MemberType NoteProperty -Name "declaration" -Value $true -Force
            $modified = $true
        }
        
        # Save if modified
        if ($modified) {
            $json | ConvertTo-Json -Depth 100 | Set-Content $tsconfigPath
            Write-Host "  Updated $tsconfigPath" -ForegroundColor Green
        }
    }
}

# Update all packages
$packages = Get-ChildItem -Path "packages" -Directory
foreach ($pkg in $packages) {
    if ($pkg.Name -ne "clients" -and $pkg.Name -ne "extensions" -and $pkg.Name -ne "sharpee") {
        Update-TsConfig -PackagePath $pkg.FullName
    }
}

# Update extension packages
$extPath = "packages/extensions"
if (Test-Path $extPath) {
    $extensions = Get-ChildItem -Path $extPath -Directory
    foreach ($ext in $extensions) {
        Update-TsConfig -PackagePath $ext.FullName
    }
}

Write-Host "tsconfig.json update complete!" -ForegroundColor Green
