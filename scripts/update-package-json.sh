#!/bin/bash
# Update all package.json files to remove workspace protocols

echo -e "\033[33mUpdating package.json files...\033[0m"

# Function to update package.json
update_package_json() {
    local package_path="$1"
    local json_path="$package_path/package.json"
    
    if [ -f "$json_path" ]; then
        # Check if jq is installed
        if ! command -v jq &> /dev/null; then
            echo -e "\033[31mError: jq is not installed. Please install it with: sudo apt-get install jq\033[0m"
            exit 1
        fi
        
        local modified=false
        local content=$(cat "$json_path")
        
        # Check for workspace:* dependencies
        if echo "$content" | jq -e '.dependencies | to_entries[] | select(.value == "workspace:*")' > /dev/null 2>&1; then
            echo -e "  \033[36mFound workspace dependencies in $package_path\033[0m"
            modified=true
        fi
        
        # Update main field to point to dist
        local main=$(echo "$content" | jq -r '.main // empty')
        if [[ -n "$main" && "$main" != "dist/index.js" && "$main" != "./dist/index.js" ]]; then
            echo -e "  \033[36mUpdating main field in $package_path\033[0m"
            content=$(echo "$content" | jq '.main = "dist/index.js"')
            modified=true
        fi
        
        # Update types field to point to dist
        local types=$(echo "$content" | jq -r '.types // empty')
        if [[ -n "$types" && "$types" != "dist/index.d.ts" && "$types" != "./dist/index.d.ts" ]]; then
            echo -e "  \033[36mUpdating types field in $package_path\033[0m"
            content=$(echo "$content" | jq '.types = "dist/index.d.ts"')
            modified=true
        fi
        
        # Save if modified
        if [ "$modified" = true ]; then
            echo "$content" | jq '.' > "$json_path"
            echo -e "  \033[32mUpdated $json_path\033[0m"
        fi
    fi
}

# Update all packages
for pkg_dir in packages/*; do
    if [ -d "$pkg_dir" ] && [[ ! "$pkg_dir" =~ (clients|extensions|sharpee)$ ]]; then
        update_package_json "$pkg_dir"
    fi
done

# Update extension packages
if [ -d "packages/extensions" ]; then
    for ext_dir in packages/extensions/*; do
        if [ -d "$ext_dir" ]; then
            update_package_json "$ext_dir"
        fi
    done
fi

echo -e "\033[32mPackage.json update complete!\033[0m"
