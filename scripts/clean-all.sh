#!/bin/bash
# Clean all build artifacts from packages

echo -e "\033[33mCleaning all build artifacts...\033[0m"

# Package directories
packages=(
    "client-core"
    "core"
    "engine"
    "event-processor"
    "forge"
    "lang-en-us"
    "stdlib"
    "world-model"
)

# Extension packages
extension_packages=(
    "extensions/conversation"
)

# Story packages
stories=(
    "../stories/cloak-of-darkness"
)

# Clean packages
for pkg in "${packages[@]}"; do
    dist_path="packages/$pkg/dist"
    lib_path="packages/$pkg/lib"
    
    if [ -d "$dist_path" ]; then
        echo -e "  \033[31mRemoving $dist_path\033[0m"
        rm -rf "$dist_path"
    fi
    
    if [ -d "$lib_path" ]; then
        echo -e "  \033[31mRemoving $lib_path\033[0m"
        rm -rf "$lib_path"
    fi
done

# Clean extension packages
for pkg in "${extension_packages[@]}"; do
    dist_path="packages/$pkg/dist"
    lib_path="packages/$pkg/lib"
    
    if [ -d "$dist_path" ]; then
        echo -e "  \033[31mRemoving $dist_path\033[0m"
        rm -rf "$dist_path"
    fi
    
    if [ -d "$lib_path" ]; then
        echo -e "  \033[31mRemoving $lib_path\033[0m"
        rm -rf "$lib_path"
    fi
done

# Clean stories
for story in "${stories[@]}"; do
    story_name=${story#../}
    dist_path="$story_name/dist"
    
    if [ -d "$dist_path" ]; then
        echo -e "  \033[31mRemoving $dist_path\033[0m"
        rm -rf "$dist_path"
    fi
done

echo -e "\033[32mClean complete!\033[0m"
