#!/bin/bash
#
# Sharpee Build System
# ====================
# Build platform, stories, and clients for interactive fiction.
#
# Run without arguments to see help.

set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
STORY=""
CLIENTS=()
THEME="classic-light"
SKIP_TO=""
NO_VERSION=false
VERBOSE=false
SHOW_HELP=false
STORY_BUNDLE=false
BUILD_RUNNER=false

# ============================================================================
# Help
# ============================================================================

show_help() {
    cat << 'EOF'

Sharpee Build System
====================

Build platform, stories, and clients for interactive fiction.

Usage: ./build.sh [options]

Options:
  -s, --story NAME     Build a story (dungeo, reflections, etc.)
  -c, --client TYPE    Build client (browser, react) - can specify multiple
  -t, --theme NAME     React theme (default: classic-light)
      --skip PKG       Resume platform build from package
      --no-version     Skip version updates
  -b, --story-bundle   Create .sharpee story bundle (requires -s)
      --runner         Build Zifmia runner (loads .sharpee bundles in browser)
  -v, --verbose        Show build details
  -h, --help           Show this help

Available Themes:
  classic-light        Literata font, warm light tones (recommended)
  modern-dark          Inter font, Catppuccin Mocha colors
  retro-terminal       JetBrains Mono, green phosphor terminal
  paper                Crimson Text, high contrast paper

Examples:
  ./build.sh -s dungeo                       Build platform + dungeo story
  ./build.sh -s dungeo -c browser            Build for web browser
  ./build.sh -s dungeo -c react              Build React client
  ./build.sh -s dungeo -c react -t modern-dark   React with dark theme
  ./build.sh -s dungeo -c browser -c react   Build both clients
  ./build.sh -s dungeo -b                    Create .sharpee story bundle
  ./build.sh --runner                        Build Zifmia runner
  ./build.sh --skip stdlib -s dungeo         Resume from stdlib package

Output:
  dist/sharpee.js          Platform bundle (CLI, testing)
  dist/stories/{story}.sharpee  Story bundle (with -b)
  dist/runner/                       Zifmia runner (with --runner)
  dist/web/{story}/             Browser client
  dist/web/{story}-react/       React client

For more information, see docs/reference/building.md

EOF
}

# ============================================================================
# Argument Parsing
# ============================================================================

# Show help if no arguments
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--story)
            STORY="$2"
            shift 2
            ;;
        -c|--client)
            CLIENTS+=("$2")
            shift 2
            ;;
        -t|--theme)
            THEME="$2"
            shift 2
            ;;
        --skip)
            SKIP_TO="$2"
            shift 2
            ;;
        -b|--story-bundle)
            STORY_BUNDLE=true
            shift
            ;;
        --runner)
            BUILD_RUNNER=true
            shift
            ;;
        --no-version)
            NO_VERSION=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Run ./build.sh --help for usage"
            exit 1
            ;;
    esac
done

# Validate: story-bundle requires story
if [ "$STORY_BUNDLE" = true ] && [ -z "$STORY" ]; then
    echo -e "${RED}Error: --story-bundle requires --story${NC}"
    echo "Example: ./build.sh -s dungeo --story-bundle"
    exit 1
fi

# Validate: client requires story
if [ ${#CLIENTS[@]} -gt 0 ] && [ -z "$STORY" ]; then
    echo -e "${RED}Error: --client requires --story${NC}"
    echo "Example: ./build.sh -s dungeo -c browser"
    exit 1
fi

# Validate theme
case "$THEME" in
    classic-light|modern-dark|retro-terminal|paper) ;;
    *)
        echo -e "${RED}Error: Unknown theme: $THEME${NC}"
        echo "Available: classic-light, modern-dark, retro-terminal, paper"
        exit 1
        ;;
esac

# ============================================================================
# Utility Functions
# ============================================================================

log_step() {
    echo -e "${BLUE}===${NC} $1 ${BLUE}===${NC}"
}

log_ok() {
    echo -e "[${GREEN}$1${NC}] ${GREEN}✓${NC}"
}

log_fail() {
    echo -e "[${RED}$1${NC}] ${RED}✗ FAILED${NC}"
}

log_skip() {
    echo -e "[${YELLOW}$1${NC}] skipped"
}

run_build() {
    local name="$1"
    local cmd="$2"

    if [ "$VERBOSE" = true ]; then
        echo -e "[${BLUE}$name${NC}] running..."
        if eval "$cmd"; then
            log_ok "$name"
        else
            log_fail "$name"
            exit 1
        fi
    else
        echo -n "[$name] "
        if eval "$cmd" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗ FAILED${NC}"
            eval "$cmd" 2>&1 | tail -20
            exit 1
        fi
    fi
}

# ============================================================================
# Version Updates
# ============================================================================

update_versions() {
    if [ "$NO_VERSION" = true ]; then
        echo "Skipping version updates (--no-version)"
        return
    fi

    log_step "Updating Versions"

    # Generate build date for version.ts files
    BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Update sharpee package.json
    local SHARPEE_PKG="packages/sharpee/package.json"
    if [ -f "$SHARPEE_PKG" ]; then
        local CURRENT=$(node -p "require('./$SHARPEE_PKG').version")
        local BASE=$(echo "$CURRENT" | sed 's/-.*//')
        SHARPEE_VERSION="${BASE}-beta"

        node -e "
          const fs = require('fs');
          const pkg = require('./$SHARPEE_PKG');
          pkg.version = '$SHARPEE_VERSION';
          fs.writeFileSync('$SHARPEE_PKG', JSON.stringify(pkg, null, 2) + '\n');
        "
        log_ok "sharpee $SHARPEE_VERSION"
    fi

    # Update story if specified
    if [ -n "$STORY" ]; then
        local STORY_PKG="stories/${STORY}/package.json"
        local VERSION_FILE="stories/${STORY}/src/version.ts"

        if [ -f "$STORY_PKG" ]; then
            local CURRENT=$(node -p "require('./$STORY_PKG').version")
            local BASE=$(echo "$CURRENT" | sed 's/-.*//')
            local NEW="${BASE}-beta"

            node -e "
              const fs = require('fs');
              const pkg = require('./$STORY_PKG');
              pkg.version = '$NEW';
              fs.writeFileSync('$STORY_PKG', JSON.stringify(pkg, null, 2) + '\n');
            "

            mkdir -p "$(dirname "$VERSION_FILE")"
            cat > "$VERSION_FILE" << EOF
/**
 * Version information for ${STORY}
 * Auto-generated by build.sh - DO NOT EDIT
 */
export const STORY_VERSION = '${NEW}';
export const BUILD_DATE = '${BUILD_DATE}';
export const ENGINE_VERSION = '${SHARPEE_VERSION}';
export const VERSION_INFO = { version: STORY_VERSION, buildDate: BUILD_DATE, engineVersion: ENGINE_VERSION } as const;
EOF
            log_ok "$STORY $NEW"
        fi
    fi

    # Update client packages
    for CLIENT in "${CLIENTS[@]}"; do
        local CLIENT_PKG=""
        local VERSION_FILE=""

        if [ "$CLIENT" = "react" ]; then
            CLIENT_PKG="packages/client-react/package.json"
            VERSION_FILE="packages/client-react/src/version.ts"
        else
            CLIENT_PKG="packages/platforms/${CLIENT}-en-us/package.json"
            VERSION_FILE="packages/platforms/${CLIENT}-en-us/src/version.ts"
        fi

        if [ -f "$CLIENT_PKG" ]; then
            local CURRENT=$(node -p "require('./$CLIENT_PKG').version")
            local BASE=$(echo "$CURRENT" | sed 's/-.*//')
            local NEW="${BASE}-beta"

            node -e "
              const fs = require('fs');
              const pkg = require('./$CLIENT_PKG');
              pkg.version = '$NEW';
              fs.writeFileSync('$CLIENT_PKG', JSON.stringify(pkg, null, 2) + '\n');
            "

            mkdir -p "$(dirname "$VERSION_FILE")"
            cat > "$VERSION_FILE" << EOF
/**
 * Version information for ${CLIENT} client
 * Auto-generated by build.sh - DO NOT EDIT
 */
export const CLIENT_VERSION = '${NEW}';
export const BUILD_DATE = '${BUILD_DATE}';
export const ENGINE_VERSION = '${SHARPEE_VERSION}';
export const VERSION_INFO = { version: CLIENT_VERSION, buildDate: BUILD_DATE, engineVersion: ENGINE_VERSION } as const;
EOF
            log_ok "$CLIENT client $NEW"
        fi
    done

    echo ""
}

# ============================================================================
# Platform Build
# ============================================================================

build_platform() {
    log_step "Building Platform"

    local SKIPPING=true
    if [ -z "$SKIP_TO" ]; then
        SKIPPING=false
    else
        echo "(resuming from: $SKIP_TO)"
    fi

    # Package build order (based on dependencies)
    local PACKAGES=(
        "@sharpee/core:core"
        "@sharpee/if-domain:if-domain"
        "@sharpee/world-model:world-model"
        "@sharpee/event-processor:event-processor"
        "@sharpee/lang-en-us:lang-en-us"
        "@sharpee/parser-en-us:parser-en-us"
        "@sharpee/if-services:if-services"
        "@sharpee/text-blocks:text-blocks"
        "@sharpee/text-service:text-service"
        "@sharpee/stdlib:stdlib"
        "@sharpee/engine:engine"
        "@sharpee/sharpee:sharpee"
        "@sharpee/transcript-tester:transcript-tester"
    )

    for entry in "${PACKAGES[@]}"; do
        local pkg="${entry%%:*}"
        local name="${entry##*:}"

        if [ "$SKIPPING" = true ]; then
            if [ "$name" = "$SKIP_TO" ]; then
                SKIPPING=false
            else
                log_skip "$name"
                continue
            fi
        fi

        run_build "$name" "pnpm --filter '$pkg' build"
    done

    # ESM build pass (only when browser/runner targets are requested)
    if [ "$BUILD_RUNNER" = true ] || [ ${#CLIENTS[@]} -gt 0 ] || [ "$STORY_BUNDLE" = true ]; then
        echo ""
        echo "Building ESM outputs..."
        SKIPPING=true
        if [ -z "$SKIP_TO" ]; then
            SKIPPING=false
        fi
        for entry in "${PACKAGES[@]}"; do
            local pkg="${entry%%:*}"
            local name="${entry##*:}"

            if [ "$SKIPPING" = true ]; then
                if [ "$name" = "$SKIP_TO" ]; then
                    SKIPPING=false
                else
                    log_skip "$name (esm)"
                    continue
                fi
            fi

            local pkg_dir="packages/$name"
            if [ -f "$pkg_dir/tsconfig.esm.json" ]; then
                run_build "$name (esm)" "pnpm --filter '$pkg' exec tsc -p tsconfig.esm.json"
            fi
        done

        # Also build plugin packages (not in main build order but needed for platform.js)
        local EXTRA_ESM_PACKAGES=(
            "@sharpee/plugins:plugins"
            "@sharpee/plugin-npc:plugin-npc"
            "@sharpee/plugin-scheduler:plugin-scheduler"
            "@sharpee/plugin-state-machine:plugin-state-machine"
        )
        for entry in "${EXTRA_ESM_PACKAGES[@]}"; do
            local pkg="${entry%%:*}"
            local name="${entry##*:}"
            local pkg_dir="packages/$name"
            if [ -f "$pkg_dir/tsconfig.esm.json" ]; then
                run_build "$name (esm)" "pnpm --filter '$pkg' exec tsc -p tsconfig.esm.json"
            fi
        done
    fi

    echo ""
}

# ============================================================================
# Bundle
# ============================================================================

build_bundle() {
    log_step "Bundling"

    mkdir -p dist

    run_build "sharpee.js" "npx esbuild scripts/bundle-entry.js --bundle --platform=node --target=node18 --outfile=dist/sharpee.js --external:readline --format=cjs --sourcemap"

    # Generate type declarations
    cat > dist/sharpee.d.ts << 'EOF'
// Auto-generated Sharpee type declarations
export * from '../packages/core/dist/index';
export * from '../packages/if-domain/dist/index';
export * from '../packages/world-model/dist/index';
export * from '../packages/stdlib/dist/index';
export * from '../packages/engine/dist/index';
export * from '../packages/parser-en-us/dist/index';
export * from '../packages/lang-en-us/dist/index';
export * from '../packages/event-processor/dist/index';
export * from '../packages/text-blocks/dist/index';
export * from '../packages/text-service/dist/index';
EOF

    # Report size
    local BUNDLE_SIZE=$(ls -lh dist/sharpee.js | awk '{print $5}')
    echo "Bundle size: $BUNDLE_SIZE"

    # Quick load test
    echo -n "Load test: "
    node -e "const s=Date.now();require('./dist/sharpee.js');console.log((Date.now()-s)+'ms')"

    echo ""
}

# ============================================================================
# Story Build
# ============================================================================

build_story() {
    local STORY_NAME="$1"
    local STORY_DIR="stories/${STORY_NAME}"
    local STORY_PKG="@sharpee/story-${STORY_NAME}"

    log_step "Building Story: ${STORY_NAME}"

    if [ ! -d "$STORY_DIR" ]; then
        echo -e "${RED}Error: Story not found: $STORY_DIR${NC}"
        exit 1
    fi

    run_build "$STORY_NAME" "pnpm --filter '$STORY_PKG' build"

    # ESM build for story (needed by .sharpee bundle and runner)
    if [ "$BUILD_RUNNER" = true ] || [ "$STORY_BUNDLE" = true ] || [ ${#CLIENTS[@]} -gt 0 ]; then
        if [ -f "$STORY_DIR/tsconfig.esm.json" ]; then
            run_build "$STORY_NAME (esm)" "pnpm --filter '$STORY_PKG' exec tsc -p tsconfig.esm.json"
        fi
    fi

    echo ""
}

# ============================================================================
# Story Bundle (.sharpee)
# ============================================================================

build_story_bundle() {
    local STORY_NAME="$1"
    local STORY_DIR="stories/${STORY_NAME}"
    local STORY_SRC="${STORY_DIR}/src/index.ts"
    local STORY_DIST="${STORY_DIR}/dist/index.js"
    local OUT_DIR="dist/stories"
    local OUT_FILE="${OUT_DIR}/${STORY_NAME}.sharpee"
    local STAGING=$(mktemp -d)

    log_step "Building Story Bundle: ${STORY_NAME}.sharpee"

    if [ ! -f "$STORY_SRC" ]; then
        echo -e "${RED}Error: Story source not found: $STORY_SRC${NC}"
        rm -rf "$STAGING"
        exit 1
    fi

    # 1. Bundle story code from TS source → ESM with @sharpee/* as external
    #    Using src/index.ts (not dist/) so esbuild emits true ES module imports
    #    for @sharpee/* externals, which the runner resolves via importmap.
    run_build "story.js" "npx esbuild '$STORY_SRC' --bundle --platform=browser --format=esm --target=es2020 --outfile='$STAGING/story.js' --external:@sharpee/* --tsconfig='${STORY_DIR}/tsconfig.json'"

    # 2. Generate meta.json from package.json
    node -e "
      const fs = require('fs');
      const pkg = require('./${STORY_DIR}/package.json');
      const s = pkg.sharpee || {};
      const meta = {
        format: 'sharpee-story',
        formatVersion: 1,
        title: s.title || pkg.name,
        author: s.author || 'Unknown',
        version: pkg.version,
        description: s.headline || pkg.description || '',
        sharpeeVersion: '>=' + require('./packages/sharpee/package.json').version,
        ifid: s.ifid || '',
        hasAssets: fs.existsSync('${STORY_DIR}/assets'),
        hasTheme: fs.existsSync('${STORY_DIR}/theme.css'),
        preferredTheme: s.preferredTheme || 'classic-light'
      };
      fs.writeFileSync('$STAGING/meta.json', JSON.stringify(meta, null, 2) + '\n');
    "
    log_ok "meta.json"

    # 3. Copy optional assets
    if [ -d "${STORY_DIR}/assets" ]; then
        cp -r "${STORY_DIR}/assets" "$STAGING/assets"
        log_ok "assets"
    fi

    # 4. Copy optional theme
    if [ -f "${STORY_DIR}/theme.css" ]; then
        cp "${STORY_DIR}/theme.css" "$STAGING/theme.css"
        log_ok "theme.css"
    fi

    # 5. Create .sharpee zip
    mkdir -p "$OUT_DIR"
    rm -f "$OUT_FILE"
    (cd "$STAGING" && zip -r "$REPO_ROOT/$OUT_FILE" . -q)
    log_ok "zip"

    # 6. Report
    local BUNDLE_SIZE=$(ls -lh "$OUT_FILE" | awk '{print $5}')
    echo "Output: $OUT_FILE ($BUNDLE_SIZE)"

    # Cleanup
    rm -rf "$STAGING"
    echo ""
}

# ============================================================================
# Browser Client Build
# ============================================================================

build_browser_client() {
    local STORY_NAME="$1"
    local ENTRY="stories/${STORY_NAME}/src/browser-entry.ts"
    local OUTDIR="dist/web/${STORY_NAME}"

    log_step "Building Browser Client: ${STORY_NAME}"

    if [ ! -f "$ENTRY" ]; then
        echo -e "${RED}Error: Browser entry not found: $ENTRY${NC}"
        exit 1
    fi

    mkdir -p "$OUTDIR"

    # Bundle
    run_build "bundle" "npx esbuild '$ENTRY' --bundle --platform=browser --target=es2020 --format=iife --global-name=SharpeeGame --outfile='$OUTDIR/${STORY_NAME}.js' --sourcemap --minify --define:process.env.PARSER_DEBUG=undefined --define:process.env.DEBUG_PRONOUNS=undefined --define:process.env.NODE_ENV=\\\"production\\\""

    # Copy HTML template
    if [ -f "templates/browser/index.html" ]; then
        cp templates/browser/index.html "$OUTDIR/"
        sed -i "s/{{TITLE}}/${STORY_NAME}/g" "$OUTDIR/index.html"
        log_ok "html"
    fi

    # Copy CSS
    if [ -f "templates/browser/infocom.css" ]; then
        cp templates/browser/infocom.css "$OUTDIR/styles.css"
        log_ok "css"
    fi

    # Copy to website
    local WEBSITE_DIR="website/public/games/${STORY_NAME}"
    if [ -d "website/public" ]; then
        mkdir -p "$WEBSITE_DIR"
        cp "$OUTDIR/${STORY_NAME}.js" "$WEBSITE_DIR/"
        cp "$OUTDIR/index.html" "$WEBSITE_DIR/"
        cp "$OUTDIR/styles.css" "$WEBSITE_DIR/"
        log_ok "website"
    fi

    local BUNDLE_SIZE=$(ls -lh "$OUTDIR/${STORY_NAME}.js" | awk '{print $5}')
    echo "Output: $OUTDIR/ ($BUNDLE_SIZE)"
    echo ""
}

# ============================================================================
# React Client Build
# ============================================================================

build_react_client() {
    local STORY_NAME="$1"
    local THEME_NAME="$2"
    local ENTRY="stories/${STORY_NAME}/src/react-entry.tsx"
    local OUTDIR="dist/web/${STORY_NAME}-react"
    local THEMES_FILE="packages/client-react/src/styles/themes.css"

    log_step "Building React Client: ${STORY_NAME} (default theme: ${THEME_NAME})"

    if [ ! -f "$ENTRY" ]; then
        echo -e "${RED}Error: React entry not found: $ENTRY${NC}"
        exit 1
    fi

    if [ ! -f "$THEMES_FILE" ]; then
        echo -e "${RED}Error: Combined themes file not found: $THEMES_FILE${NC}"
        exit 1
    fi

    # Build client-react package
    run_build "client-react" "pnpm --filter '@sharpee/client-react' build"

    mkdir -p "$OUTDIR"

    # Bundle
    run_build "bundle" "npx esbuild '$ENTRY' --bundle --platform=browser --target=es2020 --format=iife --global-name=SharpeeGame --outfile='$OUTDIR/${STORY_NAME}.js' --sourcemap --minify --loader:.tsx=tsx --jsx=automatic --define:process.env.PARSER_DEBUG=undefined --define:process.env.DEBUG_PRONOUNS=undefined --define:process.env.NODE_ENV=\\\"production\\\""

    # Generate HTML with combined themes CSS (supports runtime switching)
    local THEMES_CSS=$(cat "$THEMES_FILE")

    cat > "$OUTDIR/index.html" << EOF
<!DOCTYPE html>
<html lang="en" data-theme="${THEME_NAME}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${STORY_NAME}</title>
  <style>
${THEMES_CSS}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="${STORY_NAME}.js"></script>
</body>
</html>
EOF
    log_ok "html + themes (runtime switching enabled)"

    # Copy to website
    local WEBSITE_DIR="website/public/games/${STORY_NAME}-react"
    if [ -d "website/public" ]; then
        mkdir -p "$WEBSITE_DIR"
        cp "$OUTDIR/${STORY_NAME}.js" "$WEBSITE_DIR/"
        cp "$OUTDIR/index.html" "$WEBSITE_DIR/"
        log_ok "website"
    fi

    local BUNDLE_SIZE=$(ls -lh "$OUTDIR/${STORY_NAME}.js" | awk '{print $5}')
    echo "Output: $OUTDIR/ ($BUNDLE_SIZE)"
    echo ""
}

# ============================================================================
# Zifmia Runner Build
# ============================================================================

build_runner() {
    local OUTDIR="dist/runner"
    local MODULES_DIR="$OUTDIR/modules"
    local RUNNER_ENTRY="packages/zifmia/src/runner/runner-entry.tsx"
    local THEMES_FILE="packages/client-react/src/styles/themes.css"

    log_step "Building Zifmia Runner"

    if [ ! -f "$RUNNER_ENTRY" ]; then
        echo -e "${RED}Error: Runner entry not found: $RUNNER_ENTRY${NC}"
        exit 1
    fi

    mkdir -p "$MODULES_DIR"

    # 1. Build each @sharpee/* platform package as an individual ESM module.
    #    The story bundle imports from @sharpee/*; the importmap resolves these
    #    to the ESM files we produce here.
    #
    #    We build a single platform.js that re-exports everything, then point
    #    all importmap entries to it. This avoids cross-package import issues
    #    (e.g. @sharpee/stdlib importing from @sharpee/world-model).

    # Create a platform entry that re-exports all packages from dist-esm
    # Uses direct paths to dist-esm/ to bypass pnpm's .pnpm store (which
    # may not contain dist-esm/ if it was created after pnpm install).
    local PLATFORM_ENTRY=$(mktemp --suffix=.js)
    cat > "$PLATFORM_ENTRY" << ENTRY
export * from "$REPO_ROOT/packages/core/dist-esm/index.js";
export * from "$REPO_ROOT/packages/world-model/dist-esm/index.js";
export * from "$REPO_ROOT/packages/engine/dist-esm/index.js";
export * from "$REPO_ROOT/packages/stdlib/dist-esm/index.js";
export * from "$REPO_ROOT/packages/parser-en-us/dist-esm/index.js";
export * from "$REPO_ROOT/packages/lang-en-us/dist-esm/index.js";
export * from "$REPO_ROOT/packages/if-domain/dist-esm/index.js";
export * from "$REPO_ROOT/packages/if-services/dist-esm/index.js";
export * from "$REPO_ROOT/packages/plugin-npc/dist-esm/index.js";
export * from "$REPO_ROOT/packages/plugin-scheduler/dist-esm/index.js";
export * from "$REPO_ROOT/packages/plugin-state-machine/dist-esm/index.js";
ENTRY

    run_build "platform.js" "npx esbuild '$PLATFORM_ENTRY' \
        --bundle --platform=browser --format=esm --target=es2020 \
        --outfile='$MODULES_DIR/platform.js' \
        --sourcemap --minify \
        --define:process.env.PARSER_DEBUG=undefined \
        --define:process.env.DEBUG_PRONOUNS=undefined \
        --define:process.env.NODE_ENV=\\\"production\\\""

    rm -f "$PLATFORM_ENTRY"

    # 2. Build the runner shell (React app that loads bundles).
    #    The runner itself bundles all @sharpee/* packages inline (not external)
    #    because it needs them to bootstrap the engine.
    run_build "runner.js" "npx esbuild '$RUNNER_ENTRY' \
        --bundle --platform=browser --format=iife --target=es2020 \
        --global-name=ZifmiaRunner \
        --outfile='$OUTDIR/runner.js' \
        --sourcemap --minify \
        --loader:.tsx=tsx --jsx=automatic \
        --define:process.env.PARSER_DEBUG=undefined \
        --define:process.env.DEBUG_PRONOUNS=undefined \
        --define:process.env.NODE_ENV=\\\"production\\\""

    # 3. Generate index.html with importmap
    #    The importmap maps each @sharpee/* specifier to platform.js.
    #    When a story bundle does `import { X } from "@sharpee/world-model"`,
    #    the browser resolves it to platform.js which exports X.
    local THEMES_CSS=""
    if [ -f "$THEMES_FILE" ]; then
        THEMES_CSS=$(cat "$THEMES_FILE")
    fi

    cat > "$OUTDIR/index.html" << HTMLEOF
<!DOCTYPE html>
<html lang="en" data-theme="classic-light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zifmia Story Runner</title>
  <script type="importmap">
  {
    "imports": {
      "@sharpee/core": "./modules/platform.js",
      "@sharpee/world-model": "./modules/platform.js",
      "@sharpee/engine": "./modules/platform.js",
      "@sharpee/stdlib": "./modules/platform.js",
      "@sharpee/parser-en-us": "./modules/platform.js",
      "@sharpee/lang-en-us": "./modules/platform.js",
      "@sharpee/plugin-npc": "./modules/platform.js",
      "@sharpee/plugin-scheduler": "./modules/platform.js",
      "@sharpee/plugin-state-machine": "./modules/platform.js",
      "@sharpee/if-domain": "./modules/platform.js",
      "@sharpee/if-services": "./modules/platform.js"
    }
  }
  </script>
  <style>
${THEMES_CSS}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="runner.js"></script>
</body>
</html>
HTMLEOF
    log_ok "index.html (with importmap)"

    local RUNNER_SIZE=$(ls -lh "$OUTDIR/runner.js" | awk '{print $5}')
    local PLATFORM_SIZE=$(ls -lh "$MODULES_DIR/platform.js" | awk '{print $5}')
    echo "Output: $OUTDIR/"
    echo "  runner.js   ($RUNNER_SIZE)"
    echo "  platform.js ($PLATFORM_SIZE)"
    echo ""
}

# ============================================================================
# Main Build Flow
# ============================================================================

echo ""
echo -e "${BLUE}Sharpee Build${NC}"
echo "============="
echo ""
echo "Plan:"
echo "  1. Update versions"
echo "  2. Build platform packages"
echo "  3. Bundle -> dist/sharpee.js"
if [ -n "$STORY" ]; then
    echo "  4. Build story: $STORY"
fi
if [ "$STORY_BUNDLE" = true ]; then
    echo "  5. Bundle story: ${STORY}.sharpee"
fi
if [ "$BUILD_RUNNER" = true ]; then
    echo "  6. Build Zifmia runner"
fi
for CLIENT in "${CLIENTS[@]}"; do
    if [ "$CLIENT" = "react" ]; then
        echo "  5. Build $CLIENT client (theme: $THEME)"
    else
        echo "  5. Build $CLIENT client"
    fi
done
echo ""

# Execute build steps
update_versions
build_platform
build_bundle

if [ -n "$STORY" ]; then
    build_story "$STORY"
fi

if [ "$STORY_BUNDLE" = true ]; then
    build_story_bundle "$STORY"
fi

if [ "$BUILD_RUNNER" = true ]; then
    build_runner
fi

for CLIENT in "${CLIENTS[@]}"; do
    case "$CLIENT" in
        browser)
            build_browser_client "$STORY"
            ;;
        react)
            build_react_client "$STORY" "$THEME"
            ;;
        *)
            echo -e "${RED}Unknown client type: $CLIENT${NC}"
            exit 1
            ;;
    esac
done

# ============================================================================
# Summary
# ============================================================================

echo -e "${GREEN}Build Complete${NC}"
echo "=============="
echo ""
echo "Outputs:"
echo "  dist/sharpee.js - Platform bundle"

if [ "$STORY_BUNDLE" = true ]; then
    echo "  dist/stories/${STORY}.sharpee - Story bundle"
fi
if [ "$BUILD_RUNNER" = true ]; then
    echo "  dist/runner/ - Zifmia runner"
fi

if [ -n "$STORY" ]; then
    for CLIENT in "${CLIENTS[@]}"; do
        if [ "$CLIENT" = "react" ]; then
            echo "  dist/web/${STORY}-react/ - React client"
        else
            echo "  dist/web/${STORY}/ - Browser client"
        fi
    done
fi

echo ""
echo "Next steps:"
echo "  Test CLI:     node dist/sharpee.js --play"
if [ -n "$STORY" ]; then
    for CLIENT in "${CLIENTS[@]}"; do
        if [ "$CLIENT" = "react" ]; then
            echo "  Test React:   npx serve dist/web/${STORY}-react"
        else
            echo "  Test Browser: npx serve dist/web/${STORY}"
        fi
    done
fi
echo ""
