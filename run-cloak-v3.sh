#!/bin/bash
# Run Cloak of Darkness

echo -e "\033[35m=== Running Cloak of Darkness ===\033[0m"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if built
if [ ! -f "$SCRIPT_DIR/stories/cloak-of-darkness/dist/test-runner.js" ]; then
    echo -e "\033[31mError: Story not built! Run ./quick-build-v2.sh first.\033[0m"
    exit 1
fi

# Create a temporary runner script that sets up the environment
cat > "$SCRIPT_DIR/run-temp.js" << 'EOF'
// Set up module paths
const Module = require('module');
const path = require('path');

// Add packages directory to module paths
const packagesDir = path.join(__dirname, 'packages');
Module.globalPaths.push(packagesDir);

// Helper to register a package
function registerPackage(name, location) {
  const fullPath = path.join(__dirname, location);
  Module._cache[require.resolve(name)] = {
    exports: require(fullPath),
    filename: fullPath,
    loaded: true
  };
}

// Register all packages
const packages = [
  ['@sharpee/core', './packages/core'],
  ['@sharpee/world-model', './packages/world-model'],
  ['@sharpee/event-processor', './packages/event-processor'],
  ['@sharpee/stdlib', './packages/stdlib'],
  ['@sharpee/lang-en-us', './packages/lang-en-us'],
  ['@sharpee/engine', './packages/engine']
];

for (const [name, location] of packages) {
  try {
    require.cache[name] = require(location);
  } catch (e) {
    // Ignore errors
  }
}

// Now run the actual test runner
require('./stories/cloak-of-darkness/dist/test-runner.js');
EOF

# Run the temporary script
echo -e "\033[32mStarting game...\033[0m"
echo ""
node "$SCRIPT_DIR/run-temp.js"

# Clean up
rm -f "$SCRIPT_DIR/run-temp.js"
