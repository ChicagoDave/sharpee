#!/bin/bash
# Install dependencies for all packages

echo -e "\033[33mInstalling dependencies for all packages...\033[0m"

# Function to install dependencies
install_deps() {
    local package_name="$1"
    local package_path="$2"
    
    if [ -d "$package_path" ]; then
        echo -e "\n\033[36mInstalling dependencies for $package_name...\033[0m"
        pushd "$package_path" > /dev/null
        
        # Check if package.json exists
        if [ ! -f "package.json" ]; then
            echo -e "  \033[33mNo package.json found, skipping...\033[0m"
            popd > /dev/null
            return
        fi
        
        # Remove package-lock.json to ensure clean install
        if [ -f "package-lock.json" ]; then
            echo -e "  Removing old package-lock.json..."
            rm -f package-lock.json
        fi
        
        # Install dependencies
        if npm install --no-package-lock; then
            echo -e "  \033[32mDependencies installed for $package_name!\033[0m"
        else
            echo -e "  \033[33mWarning: npm install had issues for $package_name, continuing...\033[0m"
        fi
        
        popd > /dev/null
    fi
}

# Install in dependency order
# Level 1: No dependencies
install_deps "core" "packages/core"

# Level 2: Depends on core
install_deps "world-model" "packages/world-model"
install_deps "event-processor" "packages/event-processor"

# Level 3: Depends on core and others
install_deps "stdlib" "packages/stdlib"
install_deps "lang-en-us" "packages/lang-en-us"

# Level 4: Depends on multiple packages
install_deps "engine" "packages/engine"

# Extensions
install_deps "conversation" "packages/extensions/conversation"

# Client packages
install_deps "client-core" "packages/client-core"
install_deps "forge" "packages/forge"

echo -e "\n\033[32mAll package dependencies installed!\033[0m"
