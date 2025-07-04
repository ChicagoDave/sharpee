#!/bin/bash
# Verify all builds are working

echo -e "\033[33mVerifying builds...\033[0m"

# Function to check if dist folder exists and has files
verify_build() {
    local package_name="$1"
    local package_path="$2"
    local dist_path="$package_path/dist"
    
    echo -e "\n\033[36mVerifying $package_name build...\033[0m"
    
    if [ -d "$dist_path" ]; then
        # Check for index.js
        if [ -f "$dist_path/index.js" ]; then
            echo -e "  \033[32m✓ index.js found\033[0m"
        else
            echo -e "  \033[31m✗ index.js missing\033[0m"
            return 1
        fi
        
        # Check for index.d.ts
        if [ -f "$dist_path/index.d.ts" ]; then
            echo -e "  \033[32m✓ index.d.ts found\033[0m"
        else
            echo -e "  \033[31m✗ index.d.ts missing\033[0m"
            return 1
        fi
        
        # Count files
        local file_count=$(find "$dist_path" -type f -name "*.js" | wc -l)
        echo -e "  \033[90mFound $file_count JavaScript files\033[0m"
        
        return 0
    else
        echo -e "  \033[31m✗ dist folder missing\033[0m"
        return 1
    fi
}

# Verify all packages
failed=0

verify_build "core" "packages/core" || ((failed++))
verify_build "world-model" "packages/world-model" || ((failed++))
verify_build "event-processor" "packages/event-processor" || ((failed++))
verify_build "stdlib" "packages/stdlib" || ((failed++))
verify_build "lang-en-us" "packages/lang-en-us" || ((failed++))
verify_build "engine" "packages/engine" || ((failed++))

# Extensions
verify_build "conversation" "packages/extensions/conversation" || ((failed++))

# Client packages (if they exist and have builds)
if [ -d "packages/client-core/src" ]; then
    verify_build "client-core" "packages/client-core" || ((failed++))
fi

if [ -d "packages/forge/src" ]; then
    verify_build "forge" "packages/forge" || ((failed++))
fi

echo -e "\n============================================"
if [ $failed -eq 0 ]; then
    echo -e "\033[32mAll builds verified successfully!\033[0m"
else
    echo -e "\033[31m$failed builds failed verification!\033[0m"
    exit 1
fi
