#!/bin/bash
# Link packages properly for development

echo -e "\033[33mLinking packages for development...\033[0m"

# Function to create symlinks for a package's dependencies
link_package_deps() {
    local package_name="$1"
    local package_path="$2"
    
    if [ -d "$package_path" ] && [ -f "$package_path/package.json" ]; then
        echo -e "\n\033[36mLinking dependencies for $package_name...\033[0m"
        
        pushd "$package_path" > /dev/null
        
        # Create node_modules/@sharpee if it doesn't exist
        mkdir -p node_modules/@sharpee
        
        # Read dependencies from package.json and create symlinks
        local deps=$(cat package.json | jq -r '.dependencies | to_entries[] | select(.key | startswith("@sharpee/")) | .key')
        
        for dep in $deps; do
            local dep_name=${dep#@sharpee/}
            local target_path="../../$dep_name"
            
            # Special case for extensions
            if [[ "$dep_name" == "conversation" ]]; then
                target_path="../../extensions/conversation"
            fi
            
            # Remove existing symlink if it exists
            if [ -L "node_modules/$dep" ] || [ -e "node_modules/$dep" ]; then
                rm -rf "node_modules/$dep"
            fi
            
            # Create symlink
            echo -e "  Linking $dep -> $target_path"
            ln -s "../$target_path" "node_modules/$dep"
        done
        
        popd > /dev/null
    fi
}

# Link all packages
for pkg_dir in packages/*; do
    if [ -d "$pkg_dir" ] && [[ ! "$pkg_dir" =~ (clients|extensions|sharpee)$ ]]; then
        link_package_deps "$(basename $pkg_dir)" "$pkg_dir"
    fi
done

# Link extension packages
if [ -d "packages/extensions" ]; then
    for ext_dir in packages/extensions/*; do
        if [ -d "$ext_dir" ]; then
            link_package_deps "$(basename $ext_dir)" "$ext_dir"
        fi
    done
fi

# Link story packages
if [ -d "stories" ]; then
    for story_dir in stories/*; do
        if [ -d "$story_dir" ] && [ -f "$story_dir/package.json" ]; then
            echo -e "\n\033[36mLinking dependencies for $(basename $story_dir)...\033[0m"
            
            pushd "$story_dir" > /dev/null
            
            # Create node_modules/@sharpee if it doesn't exist
            mkdir -p node_modules/@sharpee
            
            # Read dependencies and create symlinks
            local deps=$(cat package.json | jq -r '.dependencies | to_entries[] | select(.key | startswith("@sharpee/")) | .key')
            
            for dep in $deps; do
                local dep_name=${dep#@sharpee/}
                local target_path="../../../packages/$dep_name"
                
                # Remove existing symlink if it exists
                if [ -L "node_modules/$dep" ] || [ -e "node_modules/$dep" ]; then
                    rm -rf "node_modules/$dep"
                fi
                
                # Create symlink
                echo -e "  Linking $dep -> $target_path"
                ln -s "$target_path" "node_modules/$dep"
            done
            
            popd > /dev/null
        fi
    done
fi

echo -e "\n\033[32mPackage linking complete!\033[0m"
