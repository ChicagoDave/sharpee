# PowerShell script to move trait folders from stdlib to world-model

$sourcePath = "C:\repotemp\sharpee\packages\stdlib\src\world-model\traits"
$destPath = "C:\repotemp\sharpee\packages\world-model\src\traits"

# List of folders to move
$folders = @(
    "container",
    "edible", 
    "entry",
    "exit",
    "identity",
    "light-source",
    "lockable",
    "openable",
    "readable",
    "room",
    "scenery",
    "supporter",
    "switchable",
    "wearable",
    "advanced",
    "dialogue"
)

foreach ($folder in $folders) {
    $source = Join-Path $sourcePath $folder
    $dest = Join-Path $destPath $folder
    
    if (Test-Path $source) {
        Write-Host "Moving $folder..."
        Move-Item -Path $source -Destination $dest -Force
    } else {
        Write-Host "Folder $folder not found at $source"
    }
}

# Move individual files
$files = @(
    "implementations.ts",
    "register-all.ts"
)

foreach ($file in $files) {
    $source = Join-Path $sourcePath $file
    $dest = Join-Path $destPath $file
    
    if (Test-Path $source) {
        Write-Host "Moving $file..."
        Move-Item -Path $source -Destination $dest -Force
    } else {
        Write-Host "File $file not found at $source"
    }
}

Write-Host "Move complete!"
