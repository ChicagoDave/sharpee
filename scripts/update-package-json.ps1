# Update all package.json files to remove workspace protocols
Write-Host "Updating package.json files..." -ForegroundColor Yellow

# Function to update package.json
function Update-PackageJson {
    param(
        [string]$PackagePath
    )
    
    $jsonPath = Join-Path $PackagePath "package.json"
    if (Test-Path $jsonPath) {
        $content = Get-Content $jsonPath -Raw
        $json = $content | ConvertFrom-Json
        
        $modified = $false
        
        # Update dependencies
        if ($json.dependencies) {
            $deps = $json.dependencies | Get-Member -MemberType NoteProperty
            foreach ($dep in $deps) {
                $depName = $dep.Name
                $depValue = $json.dependencies.$depName
                if ($depValue -eq "workspace:*") {
                    Write-Host "  Fixing dependency: $depName in $PackagePath" -ForegroundColor Cyan
                    # For now, we'll comment this out - we'll handle it in pass 2
                    # $json.dependencies.$depName = "file:../../packages/$($depName -replace '@sharpee/', '')"
                    $modified = $true
                }
            }
        }
        
        # Ensure main and types point to dist
        if ($json.main -and $json.main -notlike "*/dist/*" -and $json.main -ne "dist/index.js" -and $json.main -ne "./dist/index.js") {
            Write-Host "  Updating main field in $PackagePath" -ForegroundColor Cyan
            $json.main = "dist/index.js"
            $modified = $true
        }
        
        if ($json.types -and $json.types -notlike "*/dist/*" -and $json.types -ne "dist/index.d.ts" -and $json.types -ne "./dist/index.d.ts") {
            Write-Host "  Updating types field in $PackagePath" -ForegroundColor Cyan
            $json.types = "dist/index.d.ts"
            $modified = $true
        }
        
        # Save if modified
        if ($modified) {
            $json | ConvertTo-Json -Depth 100 | Set-Content $jsonPath
            Write-Host "  Updated $jsonPath" -ForegroundColor Green
        }
    }
}

# Update all packages
$packages = Get-ChildItem -Path "packages" -Directory
foreach ($pkg in $packages) {
    if ($pkg.Name -ne "clients" -and $pkg.Name -ne "extensions" -and $pkg.Name -ne "sharpee") {
        Update-PackageJson -PackagePath $pkg.FullName
    }
}

# Update extension packages
$extPath = "packages/extensions"
if (Test-Path $extPath) {
    $extensions = Get-ChildItem -Path $extPath -Directory
    foreach ($ext in $extensions) {
        Update-PackageJson -PackagePath $ext.FullName
    }
}

Write-Host "Package.json update complete!" -ForegroundColor Green
