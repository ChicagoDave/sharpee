# Build all packages in dependency order
Write-Host "Building all packages..." -ForegroundColor Yellow

# Function to run npm build in a directory
function Build-Package {
    param(
        [string]$PackageName,
        [string]$PackagePath
    )
    
    Write-Host "`nBuilding $PackageName..." -ForegroundColor Cyan
    Push-Location $PackagePath
    
    try {
        # Check if npm is installed
        $npmCmd = if ($IsWindows) { "npm.cmd" } else { "npm" }
        
        # Run the build
        & $npmCmd run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  $PackageName built successfully!" -ForegroundColor Green
        } else {
            Write-Host "  ERROR: $PackageName build failed!" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

# Build order (based on dependencies)
# Level 1: No dependencies
Build-Package "core" "packages/core"

# Level 2: Depends on core
Build-Package "world-model" "packages/world-model"
Build-Package "event-processor" "packages/event-processor"

# Level 3: Depends on core and others
Build-Package "stdlib" "packages/stdlib"
Build-Package "lang-en-us" "packages/lang-en-us"

# Level 4: Depends on multiple packages
Build-Package "engine" "packages/engine"

# Extensions
if (Test-Path "packages/extensions/conversation") {
    Build-Package "conversation" "packages/extensions/conversation"
}

# Client packages
if (Test-Path "packages/client-core") {
    Build-Package "client-core" "packages/client-core"
}

if (Test-Path "packages/forge") {
    Build-Package "forge" "packages/forge"
}

Write-Host "`nAll packages built successfully!" -ForegroundColor Green
