#!/bin/bash
# Create standard tsconfig.json files for all packages

echo -e "\033[33mCreating standard tsconfig.json files...\033[0m"

# Standard tsconfig content for packages
create_standard_tsconfig() {
    local package_path="$1"
    local tsconfig_path="$package_path/tsconfig.json"
    
    cat > "$tsconfig_path" << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
EOF
    
    echo -e "  \033[32mCreated $tsconfig_path\033[0m"
}

# Create for all packages
for pkg_dir in packages/*; do
    if [ -d "$pkg_dir" ] && [[ ! "$pkg_dir" =~ (clients|extensions|sharpee)$ ]]; then
        create_standard_tsconfig "$pkg_dir"
    fi
done

# Create for extension packages
if [ -d "packages/extensions" ]; then
    for ext_dir in packages/extensions/*; do
        if [ -d "$ext_dir" ]; then
            create_standard_tsconfig "$ext_dir"
        fi
    done
fi

echo -e "\033[32mStandard tsconfig.json files created!\033[0m"
