#!/bin/bash
# Test building and running a story

echo -e "\033[33mTesting story build and execution...\033[0m"

STORY_NAME="cloak-of-darkness"
STORY_PATH="stories/$STORY_NAME"

# Check if story exists
if [ ! -d "$STORY_PATH" ]; then
    echo -e "\033[31mError: Story $STORY_NAME not found!\033[0m"
    exit 1
fi

echo -e "\n\033[36mBuilding $STORY_NAME...\033[0m"
cd "$STORY_PATH"

# Check if dependencies are built
echo -e "Checking if dependencies are built..."
if [ ! -d "../../packages/engine/dist" ]; then
    echo -e "\033[31mError: Engine package not built! Run ./scripts/build-all.sh first.\033[0m"
    exit 1
fi

if [ ! -d "../../packages/world-model/dist" ]; then
    echo -e "\033[31mError: World-model package not built! Run ./scripts/build-all.sh first.\033[0m"
    exit 1
fi

# Build the story
echo -e "Building story..."
if npm run build; then
    echo -e "\033[32m✓ Story built successfully!\033[0m"
else
    echo -e "\033[31m✗ Story build failed!\033[0m"
    
    # Show what's in the node_modules to debug
    echo -e "\n\033[33mDebug info:\033[0m"
    echo "Checking node_modules/@sharpee:"
    ls -la node_modules/@sharpee/ 2>/dev/null || echo "  No @sharpee packages in node_modules"
    
    echo -e "\nChecking if packages have dist folders:"
    ls -la ../../packages/engine/dist/index.* 2>/dev/null || echo "  Engine dist files missing"
    ls -la ../../packages/world-model/dist/index.* 2>/dev/null || echo "  World-model dist files missing"
    
    exit 1
fi

# Check if the build produced output
if [ -f "dist/index.js" ]; then
    echo -e "\033[32m✓ Story output found at dist/index.js\033[0m"
    
    # Try to run it (but don't fail if it errors - we just want to see if it loads)
    echo -e "\n\033[36mAttempting to load story...\033[0m"
    node dist/index.js 2>&1 | head -20
    echo -e "\n\033[90m(Output truncated to first 20 lines)\033[0m"
else
    echo -e "\033[31m✗ No dist/index.js found!\033[0m"
    exit 1
fi

echo -e "\n\033[32mStory build test complete!\033[0m"
