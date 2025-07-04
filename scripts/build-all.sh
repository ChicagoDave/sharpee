#!/bin/bash
# Build all packages in dependency order

echo -e "\033[33mBuilding all packages...\033[0m"

# Function to run npm build in a directory
build_package() {
    local package_name="$1"
    local package_path="$2"
    
    echo -e "\n\033[36mBuilding $package_name...\033[0m"
    
    if [ -d "$package_path" ]; then
        pushd "$package_path" > /dev/null
        
        # Run the build
        if npm run build; then
            echo -e "  \033[32m$package_name built successfully!\033[0m"
        else
            echo -e "  \033[31mERROR: $package_name build failed!\033[0m"
            popd > /dev/null
            exit 1
        fi
        
        popd > /dev/null
    else
        echo -e "  \033[33mWarning: $package_path does not exist, skipping...\033[0m"
    fi
}

# Build order (based on dependencies)
# Level 1: No dependencies
build_package "core" "packages/core"

# Level 2: Depends on core
build_package "world-model" "packages/world-model"
build_package "event-processor" "packages/event-processor"

# Level 3: Depends on core and others
build_package "stdlib" "packages/stdlib"
build_package "lang-en-us" "packages/lang-en-us"

# Level 4: Depends on multiple packages
build_package "engine" "packages/engine"

# Extensions
build_package "conversation" "packages/extensions/conversation"

# Client packages
build_package "client-core" "packages/client-core"
build_package "forge" "packages/forge"

echo -e "\n\033[32mAll packages built successfully!\033[0m"
