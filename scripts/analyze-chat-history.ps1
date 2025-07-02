# PowerShell script to analyze chat history files
param(
    [string]$StartDate = "2025-04-01",
    [string]$EndDate = "2025-07-01"
)

$chatPath = "C:\repotemp\sharpee\chat-history\claude"
$outputPath = "C:\repotemp\sharpee\decisions\chat-history-analysis.md"

# Initialize output
$output = @"
# Chat History Analysis Summary

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## File Count by Month
"@

# Get all JSON files
$files = Get-ChildItem -Path $chatPath -Filter "*.json" | 
    Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}' }

# Group by month
$monthGroups = $files | Group-Object { 
    $date = [datetime]::ParseExact($_.Name.Substring(0,10), "yyyy-MM-dd", $null)
    $date.ToString("yyyy-MM")
}

foreach ($group in $monthGroups | Sort-Object Name) {
    $output += "`n- $($group.Name): $($group.Count) files"
}

$output += "`n`n## Key Topics to Search For`n"

# Keywords to search for architectural decisions
$keywords = @(
    "architecture",
    "decision",
    "changed",
    "refactor",
    "migrate",
    "event",
    "parser",
    "world model",
    "state",
    "immutable",
    "trait",
    "behavior",
    "action",
    "command",
    "text service",
    "extension",
    "forge",
    "stdlib"
)

$output += "`nSearching for architectural keywords in file names and contents...`n"

# For each recent month, sample files
$recentMonths = $monthGroups | Where-Object { $_.Name -ge "2025-04" } | Sort-Object Name

foreach ($monthGroup in $recentMonths) {
    $output += "`n### $($monthGroup.Name) Key Files`n"
    
    # Sample first, middle, and last files from each month
    $monthFiles = $monthGroup.Group | Sort-Object Name
    $sampleIndices = @(0)
    if ($monthFiles.Count -gt 1) {
        $sampleIndices += [int]($monthFiles.Count / 2)
        $sampleIndices += $monthFiles.Count - 1
    }
    
    foreach ($index in $sampleIndices) {
        if ($index -lt $monthFiles.Count) {
            $file = $monthFiles[$index]
            $output += "- $($file.Name)`n"
            
            # Try to read file and extract title
            try {
                $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
                if ($content.name) {
                    $output += "  Title: $($content.name)`n"
                }
            } catch {
                $output += "  (Unable to read file)`n"
            }
        }
    }
}

# Write output
Set-Content -Path $outputPath -Value $output

Write-Host "Analysis complete. Results saved to $outputPath"
