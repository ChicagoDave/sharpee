#!/bin/bash
# Update all tsconfig.json files to ensure proper configuration

echo -e "\033[33mUpdating tsconfig.json files...\033[0m"

# Function to update tsconfig.json
update_tsconfig() {
    local package_path="$1"
    local tsconfig_path="$package_path/tsconfig.json"
    
    if [ -f "$tsconfig_path" ]; then
        # Check if jq is installed
        if ! command -v jq &> /dev/null; then
            echo -e "\033[31mError: jq is not installed. Please install it with: sudo apt-get install jq\033[0m"
            exit 1
        fi
        
        local modified=false
        local content=$(cat "$tsconfig_path")
        
        # Update outDir to dist
        local outDir=$(echo "$content" | jq -r '.compilerOptions.outDir // empty')
        if [[ -n "$outDir" && "$outDir" != "dist" && "$outDir" != "./dist" ]]; then
            echo -e "  \033[36mUpdating outDir in $package_path\033[0m"
            content=$(echo "$content" | jq '.compilerOptions.outDir = "./dist"')
            modified=true
        fi
        
        # Update rootDir to src
        local rootDir=$(echo "$content" | jq -r '.compilerOptions.rootDir // empty')
        if [[ -n "$rootDir" && "$rootDir" != "src" && "$rootDir" != "./src" ]]; then
            echo -e "  \033[36mUpdating rootDir in $package_path\033[0m"
            content=$(echo "$content" | jq '.compilerOptions.rootDir = "./src"')
            modified=true
        fi
        
        # Remove composite mode for now (we'll do simple builds)
        if echo "$content" | jq -e '.compilerOptions.composite' > /dev/null 2>&1; then
            echo -e "  \033[36mRemoving composite mode in $package_path\033[0m"
            content=$(echo "$content" | jq 'del(.compilerOptions.composite)')
            modified=true
        fi
        
        # Remove references for now
        if echo "$content" | jq -e '.references' > /dev/null 2>&1; then
            echo -e "  \033[36mRemoving references in $package_path\033[0m"
            content=$(echo "$content" | jq 'del(.references)')
            modified=true
        fi
        
        # Ensure declaration is true
        local declaration=$(echo "$content" | jq -r '.compilerOptions.declaration // empty')
        if [[ "$declaration" != "true" ]]; then
            echo -e "  \033[36mEnabling declarations in $package_path\033[0m"
            content=$(echo "$content" | jq '.compilerOptions.declaration = true')
            modified=true
        fi
        
        # Save if modified
        if [ "$modified" = true ]; then
            echo "$content" | jq '.' > "$tsconfig_path"
            echo -e "  \033[32mUpdated $tsconfig_path\033[0m"
        fi
    fi
}

# Update all packages
for pkg_dir in packages/*; do
    if [ -d "$pkg_dir" ] && [[ ! "$pkg_dir" =~ (clients|extensions|sharpee)$ ]]; then
        update_tsconfig "$pkg_dir"
    fi
done

# Update extension packages
if [ -d "packages/extensions" ]; then
    for ext_dir in packages/extensions/*; do
        if [ -d "$ext_dir" ]; then
            update_tsconfig "$ext_dir"
        fi
    done
fi

echo -e "\033[32mtsconfig.json update complete!\033[0m"
