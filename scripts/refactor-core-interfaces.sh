#!/bin/bash

# Script to add I-prefix to all interfaces in @sharpee/core package
# Phase 1 of the interface refactoring plan

echo "Starting Phase 1: Renaming interfaces in @sharpee/core package"

# Function to process a single file
process_file() {
    local file="$1"
    echo "Processing: $file"
    
    # Create a temporary file
    local temp_file="${file}.tmp"
    
    # Process the file line by line to handle complex replacements
    cp "$file" "$temp_file"
    
    # Step 1: Rename interface declarations
    # Match: export interface SomeName
    # Replace with: export interface ISomeName
    sed -i 's/export interface \([A-Z][a-zA-Z]*\)\b/export interface I\1/g' "$temp_file"
    
    # Step 2: Update extends clauses in interface declarations
    # Match: extends SomeName
    # Replace with: extends ISomeName
    sed -i 's/\bextends \([A-Z][a-zA-Z]*\)\b/extends I\1/g' "$temp_file"
    
    # Step 3: Update type references (this is trickier, need to be careful)
    # We'll handle common patterns
    
    # Pattern: : SomeName<
    sed -i 's/: \([A-Z][a-zA-Z]*\)</: I\1</g' "$temp_file"
    
    # Pattern: : SomeName[]
    sed -i 's/: \([A-Z][a-zA-Z]*\)\[\]/: I\1[]/g' "$temp_file"
    
    # Pattern: : SomeName;
    sed -i 's/: \([A-Z][a-zA-Z]*\);/: I\1;/g' "$temp_file"
    
    # Pattern: : SomeName | 
    sed -i 's/: \([A-Z][a-zA-Z]*\) |/: I\1 |/g' "$temp_file"
    
    # Pattern: | SomeName
    sed -i 's/| \([A-Z][a-zA-Z]*\)\b/| I\1/g' "$temp_file"
    
    # Pattern: & SomeName
    sed -i 's/\& \([A-Z][a-zA-Z]*\)\b/\& I\1/g' "$temp_file"
    
    # Pattern: <SomeName>
    sed -i 's/<\([A-Z][a-zA-Z]*\)>/<I\1>/g' "$temp_file"
    
    # Pattern: <SomeName,
    sed -i 's/<\([A-Z][a-zA-Z]*\),/<I\1,/g' "$temp_file"
    
    # Pattern: , SomeName>
    sed -i 's/, \([A-Z][a-zA-Z]*\)>/, I\1>/g' "$temp_file"
    
    # Pattern: , SomeName,
    sed -i 's/, \([A-Z][a-zA-Z]*\),/, I\1,/g' "$temp_file"
    
    # Pattern: implements SomeName
    sed -i 's/\bimplements \([A-Z][a-zA-Z]*\)\b/implements I\1/g' "$temp_file"
    
    # Pattern: as SomeName
    sed -i 's/\bas \([A-Z][a-zA-Z]*\)\b/as I\1/g' "$temp_file"
    
    # Pattern: (param: SomeName)
    sed -i 's/(\([a-zA-Z_][a-zA-Z0-9_]*\): \([A-Z][a-zA-Z]*\))/(\1: I\2)/g' "$temp_file"
    
    # Step 4: Fix any double I-prefixes (IISomething -> ISomething)
    sed -i 's/II\([A-Z]\)/I\1/g' "$temp_file"
    
    # Step 5: Fix specific known types that shouldn't be interfaces
    # These are classes or types that shouldn't have I prefix
    sed -i 's/IPromise/Promise/g' "$temp_file"
    sed -i 's/IMap/Map/g' "$temp_file"
    sed -i 's/ISet/Set/g' "$temp_file"
    sed -i 's/IArray/Array/g' "$temp_file"
    sed -i 's/IRecord/Record/g' "$temp_file"
    sed -i 's/IPartial/Partial/g' "$temp_file"
    sed -i 's/IOmit/Omit/g' "$temp_file"
    sed -i 's/IPick/Pick/g' "$temp_file"
    sed -i 's/IRequired/Required/g' "$temp_file"
    sed -i 's/IReadonly/Readonly/g' "$temp_file"
    sed -i 's/IWeakMap/WeakMap/g' "$temp_file"
    sed -i 's/IWeakSet/WeakSet/g' "$temp_file"
    
    # Move the temp file back
    mv "$temp_file" "$file"
}

# Find all TypeScript files in the core package
files=$(find packages/core/src -name "*.ts" -type f)

# Process each file
for file in $files; do
    process_file "$file"
done

echo "Phase 1 complete! All interfaces in @sharpee/core have been renamed with I-prefix"
echo ""
echo "Next steps:"
echo "1. Review the changes with 'git diff'"
echo "2. Build the core package to check for errors"
echo "3. Run tests to ensure nothing is broken"