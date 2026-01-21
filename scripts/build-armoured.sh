#!/bin/bash
# Build Armoured sample story for browser
#
# Usage:
#   ./scripts/build-armoured.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

STORY="armoured"
ENTRY="stories/$STORY/src/browser-entry.ts"
OUTDIR="dist/web/$STORY"

echo "=== Building Armoured Web Client ==="

# Step 1: Build platform packages
echo ""
echo "--- Building Platform ---"
./scripts/build-platform.sh

# Step 2: Build the story TypeScript
echo ""
echo "--- Building Story ---"
echo -n "[armoured] "
if pnpm --filter "@sharpee/story-$STORY" build > /dev/null 2>&1; then
    echo "✓"
else
    echo "✗ FAILED"
    pnpm --filter "@sharpee/story-$STORY" build
    exit 1
fi

# Step 3: Bundle for browser
echo ""
echo "--- Building Browser Bundle ---"

# Verify entry point exists
if [ ! -f "$ENTRY" ]; then
    echo "Error: Entry point not found: $ENTRY"
    exit 1
fi

# Create output directory
mkdir -p "$OUTDIR"

# Bundle with esbuild
echo -n "[browser bundle] "
if npx esbuild "$ENTRY" \
  --bundle \
  --platform=browser \
  --target=es2020 \
  --format=iife \
  --global-name=SharpeeGame \
  --outfile="$OUTDIR/$STORY.js" \
  --sourcemap \
  --minify \
  --define:process.env.NODE_ENV=\"production\" > /dev/null 2>&1; then
    echo "✓"
else
    echo "✗ FAILED"
    npx esbuild "$ENTRY" --bundle --platform=browser --target=es2020 --format=iife --outfile="$OUTDIR/$STORY.js" 2>&1 | tail -20
    exit 1
fi

# Create HTML file
echo -n "[html] "
cat > "$OUTDIR/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Armoured</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="game-container">
    <div id="status-line">
      <span id="location-name"></span>
      <span id="score-turns">Turns: 0</span>
    </div>
    <div id="main-window">
      <div id="text-content"></div>
    </div>
    <div id="input-area">
      <span class="prompt">&gt;</span>
      <input id="command-input" type="text"
             autocomplete="off" autocapitalize="none"
             spellcheck="false" autofocus>
    </div>
  </div>
  <script src="armoured.js"></script>
</body>
</html>
HTMLEOF
echo "✓"

# Copy CSS from template or create simple one
echo -n "[css] "
if [ -f "templates/browser/infocom.css" ]; then
    cp templates/browser/infocom.css "$OUTDIR/styles.css"
else
    cat > "$OUTDIR/styles.css" << 'CSSEOF'
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: #1a1a2e;
  color: #c8d6e5;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  line-height: 1.5;
}

#game-container {
  max-width: 800px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

#status-line {
  background: #2d3436;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #636e72;
  font-weight: bold;
}

#main-window {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

#text-content p {
  margin: 0 0 1em 0;
}

#text-content .command-echo {
  color: #74b9ff;
  margin: 1em 0 0.5em 0;
}

#input-area {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #2d3436;
  border-top: 2px solid #636e72;
}

#input-area .prompt {
  color: #74b9ff;
  margin-right: 8px;
  font-weight: bold;
}

#command-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #c8d6e5;
  font-family: inherit;
  font-size: inherit;
  outline: none;
}

#command-input:focus {
  outline: none;
}
CSSEOF
fi
echo "✓"

# Report bundle size
BUNDLE_SIZE=$(ls -lh "$OUTDIR/$STORY.js" | awk '{print $5}')

echo ""
echo "=== Build Complete ==="
echo "Output: $OUTDIR/"
echo "  - $STORY.js ($BUNDLE_SIZE)"
echo "  - index.html"
echo "  - styles.css"
echo ""
echo "To test: npx serve $OUTDIR"
