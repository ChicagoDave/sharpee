#!/bin/bash
# Remove "type": "module" from all package.json files to use CommonJS

echo -e "\033[33mConverting packages to CommonJS...\033[0m"

# Function to remove type: module from package.json
remove_type_module() {
    local package_path="$1"
    local json_path="$package_path/package.json"
    
    if [ -f "$json_path" ]; then
        # Check if jq is installed
        if ! command -v jq &> /dev/null; then
            # Use sed as fallback
            echo -e "  Updating $json_path (using sed)"
            sed -i '/"type": "module",/d' "$json_path"
            sed -i '/"type": "module"/d' "$json_path"
        else
            # Use jq for cleaner JSON manipulation
            echo -e "  Updating $json_path"
            local temp_file=$(mktemp)
            jq 'del(.type)' "$json_path" > "$temp_file" && mv "$temp_file" "$json_path"
        fi
    fi
}

# Remove from all packages
for pkg_dir in packages/*; do
    if [ -d "$pkg_dir" ] && [[ ! "$pkg_dir" =~ (clients|extensions|sharpee)$ ]]; then
        remove_type_module "$pkg_dir"
    fi
done

# Remove from extension packages
if [ -d "packages/extensions" ]; then
    for ext_dir in packages/extensions/*; do
        if [ -d "$ext_dir" ]; then
            remove_type_module "$ext_dir"
        fi
    done
fi

# Remove from story packages
if [ -d "stories" ]; then
    for story_dir in stories/*; do
        if [ -d "$story_dir" ]; then
            remove_type_module "$story_dir"
        fi
    done
fi

echo -e "\033[32mPackages converted to CommonJS!\033[0m"
echo -e "\033[33mYou'll need to rebuild all packages now.\033[0m"
