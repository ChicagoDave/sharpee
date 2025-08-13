#!/bin/bash

# Fix isValid -> valid in all action files
echo "Fixing ValidationResult format across stdlib actions..."

# Files that need isValid -> valid conversion
files=(
  "entering/entering.ts"
  "exiting/exiting.ts"
  "giving/giving.ts"
  "going/going.ts"
  "looking/looking.ts"
  "searching/searching.ts"
  "talking/talking.ts"
  "throwing/throwing.ts"
)

for file in "${files[@]}"; do
  filepath="/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/$file"
  if [ -f "$filepath" ]; then
    echo "Processing $file..."
    
    # Fix the basic pattern: isValid -> valid
    sed -i 's/isValid:/valid:/g' "$filepath"
    
    # Fix the validation check pattern
    sed -i 's/!validation\.isValid/!validation.valid/g' "$filepath"
    sed -i 's/validation\.isValid/validation.valid/g' "$filepath"
    
    echo "  - Fixed isValid -> valid"
  else
    echo "Warning: $filepath not found"
  fi
done

echo "ValidationResult format fixes complete!"