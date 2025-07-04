#!/bin/bash
# Create import map configuration for stories

echo -e "\033[33mCreating import configuration for stories...\033[0m"

# Create a tsconfig for stories that maps to built packages
create_story_tsconfig() {
    local story_path="$1"
    local tsconfig_path="$story_path/tsconfig.json"
    
    cat > "$tsconfig_path" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "paths": {
      "@sharpee/core": ["../../packages/core/dist/index.js"],
      "@sharpee/world-model": ["../../packages/world-model/dist/index.js"],
      "@sharpee/event-processor": ["../../packages/event-processor/dist/index.js"],
      "@sharpee/stdlib": ["../../packages/stdlib/dist/index.js"],
      "@sharpee/lang-en-us": ["../../packages/lang-en-us/dist/index.js"],
      "@sharpee/engine": ["../../packages/engine/dist/index.js"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
    
    echo -e "  \033[32mCreated $tsconfig_path\033[0m"
}

# Create package.json for stories if missing
create_story_package_json() {
    local story_path="$1"
    local story_name=$(basename "$story_path")
    local package_json_path="$story_path/package.json"
    
    if [ ! -f "$package_json_path" ]; then
        cat > "$package_json_path" << EOF
{
  "name": "@sharpee-stories/$story_name",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@sharpee/engine": "file:../../packages/engine",
    "@sharpee/world-model": "file:../../packages/world-model",
    "@sharpee/stdlib": "file:../../packages/stdlib",
    "@sharpee/lang-en-us": "file:../../packages/lang-en-us"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
EOF
        echo -e "  \033[32mCreated $package_json_path\033[0m"
    fi
}

# Process all stories
if [ -d "stories" ]; then
    for story_dir in stories/*; do
        if [ -d "$story_dir" ]; then
            echo -e "\n\033[36mConfiguring $(basename $story_dir)...\033[0m"
            create_story_tsconfig "$story_dir"
            create_story_package_json "$story_dir"
        fi
    done
fi

echo -e "\n\033[32mStory import configuration complete!\033[0m"
