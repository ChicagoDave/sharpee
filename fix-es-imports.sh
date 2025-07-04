#!/bin/bash
# Fix ES module imports by adding .js extensions

echo -e "\033[33mFixing ES module imports...\033[0m"

# Function to fix imports in a directory
fix_imports() {
    local dir="$1"
    echo -e "  Fixing imports in $dir"
    
    # Find all .js files
    find "$dir" -name "*.js" -type f | while read -r file; do
        # Fix relative imports that don't have extensions
        # This handles: from './something' -> from './something.js'
        sed -i -E "s/from '(\.\\/[^']+)'/from '\\1.js'/g" "$file"
        sed -i -E 's/from "(.\/[^"]+)"/from "\1.js"/g' "$file"
        
        # Fix export statements
        sed -i -E "s/export \* from '(\.\\/[^']+)'/export * from '\\1.js'/g" "$file"
        sed -i -E 's/export \* from "(.\/[^"]+)"/export * from "\1.js"/g' "$file"
        
        # Remove .js.js if we accidentally doubled it
        sed -i 's/\.js\.js/.js/g' "$file"
    done
}

# Fix all package dist directories
for pkg in packages/*/dist; do
    if [ -d "$pkg" ]; then
        fix_imports "$pkg"
    fi
done

# Fix extension dist directories
for ext in packages/extensions/*/dist; do
    if [ -d "$ext" ]; then
        fix_imports "$ext"
    fi
done

# Fix story dist directories
for story in stories/*/dist; do
    if [ -d "$story" ]; then
        fix_imports "$story"
    fi
done

echo -e "\033[32mES module imports fixed!\033[0m"
