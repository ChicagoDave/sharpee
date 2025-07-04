#!/bin/bash
# Fix workspace:* dependencies in package.json files

echo -e "\033[33mFixing workspace dependencies...\033[0m"

# Function to fix workspace dependencies in a package.json
fix_workspace_deps() {
    local package_path="$1"
    local json_path="$package_path/package.json"
    
    if [ -f "$json_path" ]; then
        # Check if jq is installed
        if ! command -v jq &> /dev/null; then
            echo -e "\033[31mError: jq is not installed. Please install it with: sudo apt-get install jq\033[0m"
            exit 1
        fi
        
        local package_name=$(basename "$package_path")
        local temp_file=$(mktemp)
        
        # Read the current content
        local content=$(cat "$json_path")
        
        # Check if there are workspace dependencies
        if echo "$content" | jq -e '.dependencies | to_entries[] | select(.value == "workspace:*")' > /dev/null 2>&1; then
            echo -e "  \033[36mFixing workspace dependencies in $package_name\033[0m"
            
            # Process each dependency
            cp "$json_path" "$temp_file"
            
            # Get all dependencies that are workspace:*
            local deps=$(echo "$content" | jq -r '.dependencies | to_entries[] | select(.value == "workspace:*") | .key')
            
            for dep in $deps; do
                # Extract package name without @sharpee/ prefix
                local dep_name=${dep#@sharpee/}
                local relative_path="file:../$dep_name"
                
                # Special case for extensions
                if [[ "$dep_name" == "conversation" ]]; then
                    relative_path="file:../extensions/conversation"
                fi
                
                echo -e "    Updating $dep -> $relative_path"
                
                # Update the dependency
                jq --arg key "$dep" --arg value "$relative_path" \
                   '.dependencies[$key] = $value' "$temp_file" > "$temp_file.tmp" && mv "$temp_file.tmp" "$temp_file"
            done
            
            # Write back the updated content
            cat "$temp_file" > "$json_path"
            echo -e "  \033[32mFixed dependencies in $package_name\033[0m"
        fi
        
        # Clean up
        rm -f "$temp_file" "$temp_file.tmp"
    fi
}

# Fix all packages
for pkg_dir in packages/*; do
    if [ -d "$pkg_dir" ] && [[ ! "$pkg_dir" =~ (clients|extensions|sharpee)$ ]]; then
        fix_workspace_deps "$pkg_dir"
    fi
done

# Fix extension packages
if [ -d "packages/extensions" ]; then
    for ext_dir in packages/extensions/*; do
        if [ -d "$ext_dir" ]; then
            fix_workspace_deps "$ext_dir"
        fi
    done
fi

# Function to fix story dependencies
fix_story_deps() {
    local story_path="$1"
    local json_path="$story_path/package.json"
    
    if [ -f "$json_path" ]; then
        local story_name=$(basename "$story_path")
        local temp_file=$(mktemp)
        local content=$(cat "$json_path")
        
        if echo "$content" | jq -e '.dependencies | to_entries[] | select(.value == "workspace:*")' > /dev/null 2>&1; then
            echo -e "  \033[36mFixing workspace dependencies in $story_name\033[0m"
            
            cp "$json_path" "$temp_file"
            local deps=$(echo "$content" | jq -r '.dependencies | to_entries[] | select(.value == "workspace:*") | .key')
            
            for dep in $deps; do
                local dep_name=${dep#@sharpee/}
                local relative_path="file:../../packages/$dep_name"
                
                echo -e "    Updating $dep -> $relative_path"
                jq --arg key "$dep" --arg value "$relative_path" \
                   '.dependencies[$key] = $value' "$temp_file" > "$temp_file.tmp" && mv "$temp_file.tmp" "$temp_file"
            done
            
            cat "$temp_file" > "$json_path"
            echo -e "  \033[32mFixed dependencies in $story_name\033[0m"
        fi
        
        rm -f "$temp_file" "$temp_file.tmp"
    fi
}

# Fix story packages
if [ -d "stories" ]; then
    for story_dir in stories/*; do
        if [ -d "$story_dir" ]; then
            fix_story_deps "$story_dir"
        fi
    done
fi

echo -e "\033[32mWorkspace dependencies fixed!\033[0m"
