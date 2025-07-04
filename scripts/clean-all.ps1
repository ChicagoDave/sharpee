# Clean all build artifacts from packages
Write-Host "Cleaning all build artifacts..." -ForegroundColor Yellow

# Get all package directories
$packages = @(
    "client-core",
    "core", 
    "engine",
    "event-processor",
    "forge",
    "lang-en-us",
    "stdlib",
    "world-model"
)

# Extension packages
$extensionPackages = @(
    "extensions/conversation"
)

# Story packages
$stories = @(
    "../stories/cloak-of-darkness"
)

# Clean packages
foreach ($pkg in $packages) {
    $distPath = "packages/$pkg/dist"
    $libPath = "packages/$pkg/lib"
    
    if (Test-Path $distPath) {
        Write-Host "  Removing $distPath" -ForegroundColor Red
        Remove-Item -Path $distPath -Recurse -Force
    }
    
    if (Test-Path $libPath) {
        Write-Host "  Removing $libPath" -ForegroundColor Red
        Remove-Item -Path $libPath -Recurse -Force
    }
}

# Clean extension packages
foreach ($pkg in $extensionPackages) {
    $distPath = "packages/$pkg/dist"
    $libPath = "packages/$pkg/lib"
    
    if (Test-Path $distPath) {
        Write-Host "  Removing $distPath" -ForegroundColor Red
        Remove-Item -Path $distPath -Recurse -Force
    }
    
    if (Test-Path $libPath) {
        Write-Host "  Removing $libPath" -ForegroundColor Red
        Remove-Item -Path $libPath -Recurse -Force
    }
}

# Clean stories
foreach ($story in $stories) {
    $distPath = "stories/$($story -replace '\.\.\/', '')/dist"
    
    if (Test-Path $distPath) {
        Write-Host "  Removing $distPath" -ForegroundColor Red
        Remove-Item -Path $distPath -Recurse -Force
    }
}

Write-Host "Clean complete!" -ForegroundColor Green
