#!/bin/bash
# Build a client bundle for a specific story
#
# Usage:
#   ./scripts/build-client.sh dungeo browser
#   ./scripts/build-client.sh dungeo react
#   ./scripts/build-client.sh reflections electron
#
# Supported clients:
#   - browser: Classic browser bundle (HTML + JS + CSS)
#   - react: Rich React client with side panels (map, notes, commentary, progress)
#   - electron: Electron desktop app (not yet implemented)
#
# Requires: Story must be built first (run build-story.sh or use build.sh)
# Note: Version updates are handled by update-versions.sh, called by build.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Require story and client type
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <story-name> <client-type>"
    echo "Example: $0 dungeo browser"
    echo "         $0 dungeo react"
    echo ""
    echo "Supported clients: browser, react, electron"
    exit 1
fi

STORY="$1"
CLIENT="$2"
STORY_DIR="stories/${STORY}"

# Verify story exists
if [ ! -d "$STORY_DIR" ]; then
    echo "Error: Story not found: $STORY_DIR"
    exit 1
fi

# Build browser client
build_browser() {
    local ENTRY="${STORY_DIR}/src/browser-entry.ts"
    local OUTDIR="dist/web/${STORY}"

    echo "=== Building Browser Client: ${STORY} ==="

    # Verify entry point exists
    if [ ! -f "$ENTRY" ]; then
        echo "Error: Browser entry point not found: $ENTRY"
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
      --outfile="$OUTDIR/${STORY}.js" \
      --sourcemap \
      --minify \
      --define:process.env.PARSER_DEBUG=undefined \
      --define:process.env.DEBUG_PRONOUNS=undefined \
      --define:process.env.NODE_ENV=\"production\" > /dev/null 2>&1; then
        echo "✓"
    else
        echo "✗ FAILED"
        npx esbuild "$ENTRY" --bundle --platform=browser --target=es2020 --format=iife --outfile="$OUTDIR/${STORY}.js" 2>&1 | tail -20
        exit 1
    fi

    # Copy and customize HTML template
    echo -n "[html] "
    if [ -f "templates/browser/index.html" ]; then
        cp templates/browser/index.html "$OUTDIR/"
        sed -i "s/{{TITLE}}/${STORY}/g" "$OUTDIR/index.html"
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
    BUNDLE_SIZE=$(ls -lh "$OUTDIR/${STORY}.js" | awk '{print $5}')

    # Copy to website public directory
    WEBSITE_GAMES="website/public/games/${STORY}"
    echo -n "[website] "
    if [ -d "website/public" ]; then
        mkdir -p "$WEBSITE_GAMES"
        cp "$OUTDIR/${STORY}.js" "$WEBSITE_GAMES/"
        cp "$OUTDIR/index.html" "$WEBSITE_GAMES/"
        cp "$OUTDIR/styles.css" "$WEBSITE_GAMES/"
        echo "✓ copied to $WEBSITE_GAMES"
    else
        echo "- skipped (no website/public directory)"
    fi

    echo ""
    echo "=== Browser Build Complete ==="
    echo "Output: $OUTDIR/"
    echo "  - ${STORY}.js ($BUNDLE_SIZE)"
    echo "  - ${STORY}.js.map"
    echo "  - index.html"
    echo "  - styles.css"
    if [ -d "website/public" ]; then
        echo ""
        echo "Website: $WEBSITE_GAMES/"
    fi
    echo ""
    echo "To test: npx serve $OUTDIR"
}

# Build React client
build_react() {
    local ENTRY="${STORY_DIR}/src/react-entry.tsx"
    local OUTDIR="dist/web/${STORY}-react"

    echo "=== Building React Client: ${STORY} ==="

    # Verify entry point exists
    if [ ! -f "$ENTRY" ]; then
        echo "Error: React entry point not found: $ENTRY"
        echo "Create a react-entry.tsx for your story first."
        exit 1
    fi

    # Build client-react package (TypeScript -> JS)
    echo -n "[client-react] "
    if pnpm --filter '@sharpee/client-react' build > /dev/null 2>&1; then
        echo "✓"
    else
        echo "✗ FAILED"
        pnpm --filter '@sharpee/client-react' build 2>&1 | tail -20
        exit 1
    fi

    # Create output directory
    mkdir -p "$OUTDIR"

    # Bundle with esbuild (React JSX transform)
    echo -n "[react bundle] "
    if npx esbuild "$ENTRY" \
      --bundle \
      --platform=browser \
      --target=es2020 \
      --format=iife \
      --global-name=SharpeeGame \
      --outfile="$OUTDIR/${STORY}.js" \
      --sourcemap \
      --minify \
      --loader:.tsx=tsx \
      --jsx=automatic \
      --define:process.env.PARSER_DEBUG=undefined \
      --define:process.env.DEBUG_PRONOUNS=undefined \
      --define:process.env.NODE_ENV=\"production\" > /dev/null 2>&1; then
        echo "✓"
    else
        echo "✗ FAILED"
        npx esbuild "$ENTRY" --bundle --platform=browser --target=es2020 --format=iife --loader:.tsx=tsx --jsx=automatic --outfile="$OUTDIR/${STORY}.js" 2>&1 | tail -30
        exit 1
    fi

    # Copy and customize HTML template
    echo -n "[html] "
    if [ -f "templates/react/index.html" ]; then
        cp templates/react/index.html "$OUTDIR/"
        sed -i "s/{{TITLE}}/${STORY}/g" "$OUTDIR/index.html"
        echo "✓"
    else
        echo "✗ template not found"
    fi

    # Report bundle size
    BUNDLE_SIZE=$(ls -lh "$OUTDIR/${STORY}.js" | awk '{print $5}')

    # Copy to website public directory
    WEBSITE_GAMES="website/public/games/${STORY}-react"
    echo -n "[website] "
    if [ -d "website/public" ]; then
        mkdir -p "$WEBSITE_GAMES"
        cp "$OUTDIR/${STORY}.js" "$WEBSITE_GAMES/"
        cp "$OUTDIR/index.html" "$WEBSITE_GAMES/"
        echo "✓ copied to $WEBSITE_GAMES"
    else
        echo "- skipped (no website/public directory)"
    fi

    echo ""
    echo "=== React Build Complete ==="
    echo "Output: $OUTDIR/"
    echo "  - ${STORY}.js ($BUNDLE_SIZE)"
    echo "  - ${STORY}.js.map"
    echo "  - index.html"
    if [ -d "website/public" ]; then
        echo ""
        echo "Website: $WEBSITE_GAMES/"
    fi
    echo ""
    echo "To test: npx serve $OUTDIR"
}

# Build electron client (placeholder)
build_electron() {
    echo "=== Building Electron Client: ${STORY} ==="
    echo ""
    echo "Error: Electron client not yet implemented"
    echo "TODO: Add electron-builder configuration"
    exit 1
}

# Dispatch to appropriate builder
case "$CLIENT" in
    browser)
        build_browser
        ;;
    react)
        build_react
        ;;
    electron)
        build_electron
        ;;
    *)
        echo "Error: Unknown client type: $CLIENT"
        echo "Supported clients: browser, react, electron"
        exit 1
        ;;
esac
