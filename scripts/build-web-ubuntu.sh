#!/bin/bash
# Build Sharpee platform + Dungeo story + browser bundle (Ubuntu version)
# Uses 'npx pnpm' instead of 'pnpm' for environments without global pnpm
#
# Usage:
#   bash scripts/build-web-ubuntu.sh                   # Build everything
#   bash scripts/build-web-ubuntu.sh --skip stdlib     # Skip to stdlib in platform build
#   bash scripts/build-web-ubuntu.sh --skip dungeo     # Only rebuild dungeo + browser bundle
#   bash scripts/build-web-ubuntu.sh --skip web        # Only rebuild browser bundle (dungeo already built)
#
# Output: dist/web/dungeo/ (HTML + JS + CSS for browser deployment)

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

STORY="dungeo"
ENTRY="stories/$STORY/src/browser-entry.ts"
OUTDIR="dist/web/$STORY"

# Parse arguments
SKIP_TO=""
if [ "$1" = "--skip" ] && [ -n "$2" ]; then
    SKIP_TO="$2"
fi

# Browser bundle function
bundle_browser() {
    echo "=== Building Browser Bundle ==="

    # Verify entry point exists
    if [ ! -f "$ENTRY" ]; then
        echo "Error: Entry point not found: $ENTRY"
        echo "Create a browser-entry.ts for your story first."
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
      --define:process.env.PARSER_DEBUG=undefined \
      --define:process.env.DEBUG_PRONOUNS=undefined \
      --define:process.env.NODE_ENV=\"production\" > /dev/null 2>&1; then
        echo "✓"
    else
        echo "✗ FAILED"
        npx esbuild "$ENTRY" --bundle --platform=browser --target=es2020 --format=iife --outfile="$OUTDIR/$STORY.js" 2>&1 | tail -20
        exit 1
    fi

    # Copy and customize HTML template
    echo -n "[html] "
    if [ -f "templates/browser/index.html" ]; then
        cp templates/browser/index.html "$OUTDIR/"
        sed -i "s/{{TITLE}}/$STORY/g" "$OUTDIR/index.html"
        echo "✓"
    else
        echo "✗ template not found"
    fi

    # Copy CSS
    echo -n "[css] "
    if [ -f "templates/browser/infocom.css" ]; then
        cp templates/browser/infocom.css "$OUTDIR/styles.css"
        echo "✓"
    else
        echo "✗ stylesheet not found"
    fi

    # Report bundle size
    BUNDLE_SIZE=$(ls -lh "$OUTDIR/$STORY.js" | awk '{print $5}')

    echo ""
    echo "=== Web Build Complete ==="
    echo "Output: $OUTDIR/"
    echo "  - $STORY.js ($BUNDLE_SIZE)"
    echo "  - $STORY.js.map"
    echo "  - index.html"
    echo "  - styles.css"
    echo ""
    echo "To test: npx serve $OUTDIR"
}

# If skipping to web, just do browser bundle
if [ "$SKIP_TO" = "web" ]; then
    bundle_browser
    exit 0
fi

# Build dungeo first (which builds platform)
if [ -n "$SKIP_TO" ]; then
    bash "$REPO_ROOT/scripts/build-dungeo-ubuntu.sh" --skip "$SKIP_TO"
else
    bash "$REPO_ROOT/scripts/build-dungeo-ubuntu.sh"
fi

echo ""
bundle_browser
