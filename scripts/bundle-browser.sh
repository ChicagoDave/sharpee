#!/bin/bash
# Bundle a Sharpee story for browser deployment
# Usage: ./scripts/bundle-browser.sh [story-name]
# Output: dist/web/{story-name}/

set -e

STORY=${1:-dungeo}
ENTRY="stories/$STORY/src/browser-entry.ts"
OUTDIR="dist/web/$STORY"

# Verify entry point exists
if [ ! -f "$ENTRY" ]; then
    echo "Error: Entry point not found: $ENTRY"
    echo "Create a browser-entry.ts for your story first."
    exit 1
fi

echo "Bundling $STORY for browser..."

# Create output directory
mkdir -p "$OUTDIR"

# Bundle with esbuild
# Define process.env to avoid "process is not defined" errors
npx esbuild "$ENTRY" \
  --bundle \
  --platform=browser \
  --target=es2020 \
  --format=iife \
  --global-name=SharpeeGame \
  --outfile="$OUTDIR/$STORY.js" \
  --sourcemap \
  --minify \
  --define:process.env.PARSER_DEBUG=undefined \
  --define:process.env.DEBUG_PRONOUNS=undefined \
  --define:process.env.NODE_ENV=\"production\"

# Copy and customize HTML template
cp templates/browser/index.html "$OUTDIR/"
sed -i "s/{{TITLE}}/$STORY/g" "$OUTDIR/index.html"

# Copy CSS
cp templates/browser/infocom.css "$OUTDIR/styles.css"

# Report bundle size
BUNDLE_SIZE=$(stat -c%s "$OUTDIR/$STORY.js" 2>/dev/null || stat -f%z "$OUTDIR/$STORY.js")
BUNDLE_KB=$((BUNDLE_SIZE / 1024))
echo ""
echo "Built: $OUTDIR/"
echo "  - $STORY.js ($BUNDLE_KB KB)"
echo "  - $STORY.js.map"
echo "  - index.html"
echo "  - styles.css"
echo ""
echo "To test: npx serve $OUTDIR"
