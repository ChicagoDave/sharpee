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
BUILD_TEST=false
VERSION_OVERRIDE=""

# ============================================================================
# Story/Tutorial Directory Resolution
# ============================================================================
# Stories live in stories/ or tutorials/. These helpers find the right one.

resolve_story_dir() {
    local NAME="$1"
    if [ -d "stories/${NAME}" ]; then
        echo "stories/${NAME}"
    elif [ -d "tutorials/${NAME}" ]; then
        echo "tutorials/${NAME}"
    else
        echo ""
    fi
}

resolve_story_pkg() {
    local NAME="$1"
    local DIR=$(resolve_story_dir "$NAME")
    if [[ "$DIR" == tutorials/* ]]; then
        echo "@sharpee/tutorial-${NAME}"
    else
        echo "@sharpee/story-${NAME}"
    fi
}

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
  -c, --client TYPE    Build client (browser, shite, zifmia) - can specify multiple
                       browser = single-player static web client per story
                       shite   = the abandoned Phase-6 'Zifmia' build at
                                 tools/shite/ (parts bin pending ADR-177).
                                 Build it manually if you need it; the
                                 corrected design lives in @sharpee/zifmia.
                       zifmia  = the corrected multi-user server at
                                 tools/zifmia/ (ADR-177). Phase 2 ships
                                 identity + rooms + tier-gated governance;
                                 WS, saves, and full client UI land in
                                 later phases.
  -t, --theme NAME     Theme for the legacy --runner path (default: classic-light)
                       No effect with -c shite (the parts-bin product
                       handles its own theming in the web client).
      --skip PKG       Resume platform build from package
      --version VER    Set version explicitly (e.g., 0.9.90) for all outputs
      --no-version     Skip version updates
  -b, --story-bundle   Create .sharpee story bundle (requires -s)
      --test           Build fast test bundle (requires -s)
      --runner         Build the legacy interpreter runner (dormant; will
                       be renamed when redone). Loads .sharpee bundles in
                       a Tauri-wrappable React shell. NOT Zifmia anymore.
  -v, --verbose        Show build details
  -h, --help           Show this help

Available Themes (legacy --runner only):
  classic-light        Literata font, warm light tones (recommended)
  modern-dark          Inter font, Catppuccin Mocha colors
  retro-terminal       JetBrains Mono, green phosphor terminal
  paper                Crimson Text, high contrast paper

Examples:
  ./build.sh -s dungeo                       Build platform + dungeo story
  ./build.sh -s dungeo -c browser            Build single-player browser client
  ./build.sh -c shite                        Build the abandoned shite parts bin
  ./build.sh -s dungeo -c shite              Build shite + bundle dungeo for install
  ./build.sh -s dungeo -c browser -c shite   Build both clients
  ./build.sh -c zifmia                       Build the corrected multi-user server (ADR-177)
  ./build.sh -s dungeo -b                    Create .sharpee story bundle
  ./build.sh -s dungeo --test                Build fast test bundle
  ./build.sh --runner -t modern-dark         Build legacy interpreter runner
  ./build.sh --skip stdlib -s dungeo         Resume from stdlib package

Output:
  dist/cli/sharpee.js          Platform bundle (CLI, testing)
  dist/cli/{story}-test.js     Fast test bundle (with --test)
  dist/stories/{story}.sharpee  Story bundle (with -b or with -s -c shite)
  tools/shite/dist/             Abandoned shite parts bin (with -c shite)
  tools/zifmia/dist/            Corrected multi-user server (with -c zifmia)
  dist/runner/                  Legacy interpreter runner (with --runner)
  dist/web/{story}/             Single-player browser client (with -c browser)

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
        --test)
            BUILD_TEST=true
            shift
            ;;
        --runner)
            BUILD_RUNNER=true
            shift
            ;;
        --version)
            VERSION_OVERRIDE="$2"
            shift 2
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

# Validate: test bundle requires story
if [ "$BUILD_TEST" = true ] && [ -z "$STORY" ]; then
    echo -e "${RED}Error: --test requires --story${NC}"
    echo "Example: ./build.sh -s dungeo --test"
    exit 1
fi

# Validate: -c browser requires -s (the single-player browser client
# bakes a specific story bundle in). -c shite and -c zifmia do NOT
# require -s — both load stories at runtime via the directory scan.
STORY_REQUIRED_CLIENTS=()
for CLIENT in "${CLIENTS[@]}"; do
    if [ "$CLIENT" != "shite" ] && [ "$CLIENT" != "zifmia" ]; then
        STORY_REQUIRED_CLIENTS+=("$CLIENT")
    fi
done
if [ ${#STORY_REQUIRED_CLIENTS[@]} -gt 0 ] && [ -z "$STORY" ]; then
    echo -e "${RED}Error: --client ${STORY_REQUIRED_CLIENTS[*]} requires --story${NC}"
    echo "Example: ./build.sh -s dungeo -c browser"
    echo "(--client shite and --client zifmia do NOT require --story — they scan stories at runtime)"
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

    # Generate build date for version.ts files.
    # BUILD_DATE_OVERRIDE lets the devkit parity harness (ADR-180 Phase 3) freeze the
    # timestamp so build.sh and `devkit build` produce byte-identical version.ts.
    BUILD_DATE="${BUILD_DATE_OVERRIDE:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

    # Determine version: --version flag takes priority, else read from package.json
    if [ -n "$VERSION_OVERRIDE" ]; then
        SHARPEE_VERSION="$VERSION_OVERRIDE"
    else
        local SHARPEE_PKG="packages/sharpee/package.json"
        if [ -f "$SHARPEE_PKG" ]; then
            SHARPEE_VERSION=$(node -p "require('./$SHARPEE_PKG').version")
        fi
    fi

    # Update sharpee package.json
    local SHARPEE_PKG="packages/sharpee/package.json"
    if [ -f "$SHARPEE_PKG" ]; then
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
            # Read story version from its own package.json (story versions are independent)
            local STORY_VER=$(node -p "require('./$STORY_PKG').version")

            mkdir -p "$(dirname "$VERSION_FILE")"
            cat > "$VERSION_FILE" << EOF
/**
 * Version information for ${STORY}
 * Auto-generated by build.sh - DO NOT EDIT
 */
export const STORY_VERSION = '${STORY_VER}';
export const BUILD_DATE = '${BUILD_DATE}';
export const ENGINE_VERSION = '${SHARPEE_VERSION}';
export const VERSION_INFO = { version: STORY_VERSION, buildDate: BUILD_DATE, engineVersion: ENGINE_VERSION } as const;
EOF
            log_ok "$STORY $STORY_VER"
        fi
    fi

    # `-c shite` (the renamed Phase-6 parts bin): web app at tools/shite.
    # Updates tools/shite/package.json version so the built bundle
    # carries the platform's SHARPEE_VERSION.
    local UPDATE_SHITE_WEB=false
    for CLIENT in "${CLIENTS[@]}"; do
        if [ "$CLIENT" = "shite" ]; then
            UPDATE_SHITE_WEB=true
        fi
    done
    if [ "$UPDATE_SHITE_WEB" = true ]; then
        local SHITE_WEB_PKG="tools/shite/package.json"
        if [ -f "$SHITE_WEB_PKG" ]; then
            node -e "
              const fs = require('fs');
              const pkg = require('./$SHITE_WEB_PKG');
              pkg.version = '$SHARPEE_VERSION';
              fs.writeFileSync('$SHITE_WEB_PKG', JSON.stringify(pkg, null, 2) + '\n');
            "
            log_ok "@sharpee/shite $SHARPEE_VERSION"
        fi
    fi

    # `-c zifmia` (the corrected multi-user server per ADR-177): package
    # at tools/zifmia/. Updates tools/zifmia/package.json version so the
    # built server carries the platform's SHARPEE_VERSION.
    local UPDATE_ZIFMIA=false
    for CLIENT in "${CLIENTS[@]}"; do
        if [ "$CLIENT" = "zifmia" ]; then
            UPDATE_ZIFMIA=true
        fi
    done
    if [ "$UPDATE_ZIFMIA" = true ]; then
        local ZIFMIA_PKG="tools/zifmia/package.json"
        if [ -f "$ZIFMIA_PKG" ]; then
            node -e "
              const fs = require('fs');
              const pkg = require('./$ZIFMIA_PKG');
              pkg.version = '$SHARPEE_VERSION';
              fs.writeFileSync('$ZIFMIA_PKG', JSON.stringify(pkg, null, 2) + '\n');
            "
            log_ok "@sharpee/zifmia $SHARPEE_VERSION"
        fi
    fi

    # `--runner` (legacy, dormant): the packages/interpreter Tauri runner.
    # Will be renamed to "interpreter" when redone; until then the flag
    # stays available for any existing tooling.
    if [ "$BUILD_RUNNER" = true ]; then
        local RUNNER_PKG="packages/interpreter/package.json"
        local RUNNER_VERSION_TS="packages/interpreter/src/version.ts"
        local RUNNER_TAURI_CONF="packages/interpreter/src-tauri/tauri.conf.json"
        local RUNNER_CARGO="packages/interpreter/src-tauri/Cargo.toml"
        # Strip pre-release suffix for native manifests (Cargo.toml, tauri.conf.json)
        local NATIVE_VER=$(echo "$SHARPEE_VERSION" | sed 's/-.*//')

        if [ -f "$RUNNER_PKG" ]; then
            node -e "
              const fs = require('fs');
              const pkg = require('./$RUNNER_PKG');
              pkg.version = '$SHARPEE_VERSION';
              fs.writeFileSync('$RUNNER_PKG', JSON.stringify(pkg, null, 2) + '\n');
            "
        fi

        mkdir -p "$(dirname "$RUNNER_VERSION_TS")"
        cat > "$RUNNER_VERSION_TS" << EOF
/**
 * Version information for interpreter runner (legacy; pre-Phase-6 Zifmia)
 * Auto-generated by build.sh - DO NOT EDIT
 */
export const CLIENT_VERSION = '${SHARPEE_VERSION}';
export const BUILD_DATE = '${BUILD_DATE}';
export const ENGINE_VERSION = '${SHARPEE_VERSION}';
export const VERSION_INFO = { version: CLIENT_VERSION, buildDate: BUILD_DATE, engineVersion: ENGINE_VERSION } as const;
EOF

        # Update tauri.conf.json
        if [ -f "$RUNNER_TAURI_CONF" ]; then
            node -e "
              const fs = require('fs');
              const conf = JSON.parse(fs.readFileSync('$RUNNER_TAURI_CONF', 'utf8'));
              conf.version = '$NATIVE_VER';
              fs.writeFileSync('$RUNNER_TAURI_CONF', JSON.stringify(conf, null, 2) + '\n');
            "
        fi

        # Update Cargo.toml version line
        if [ -f "$RUNNER_CARGO" ]; then
            sed -i '' "s/^version = \".*\"/version = \"$NATIVE_VER\"/" "$RUNNER_CARGO"
        fi

        log_ok "runner $SHARPEE_VERSION (native: $NATIVE_VER)"
    fi

    # Update non-shite/non-zifmia client packages
    for CLIENT in "${CLIENTS[@]}"; do
        if [ "$CLIENT" = "shite" ] || [ "$CLIENT" = "zifmia" ]; then
            continue  # Already handled above
        fi

        local CLIENT_PKG="packages/platforms/${CLIENT}-en-us/package.json"
        local VERSION_FILE="packages/platforms/${CLIENT}-en-us/src/version.ts"

        if [ -f "$CLIENT_PKG" ]; then
            node -e "
              const fs = require('fs');
              const pkg = require('./$CLIENT_PKG');
              pkg.version = '$SHARPEE_VERSION';
              fs.writeFileSync('$CLIENT_PKG', JSON.stringify(pkg, null, 2) + '\n');
            "

            mkdir -p "$(dirname "$VERSION_FILE")"
            cat > "$VERSION_FILE" << EOF
/**
 * Version information for ${CLIENT} client
 * Auto-generated by build.sh - DO NOT EDIT
 */
export const CLIENT_VERSION = '${SHARPEE_VERSION}';
export const BUILD_DATE = '${BUILD_DATE}';
export const ENGINE_VERSION = '${SHARPEE_VERSION}';
export const VERSION_INFO = { version: CLIENT_VERSION, buildDate: BUILD_DATE, engineVersion: ENGINE_VERSION } as const;
EOF
            log_ok "$CLIENT client $SHARPEE_VERSION"
        fi
    done

    echo ""
}

# ============================================================================
# Platform Build
# ============================================================================

build_platform() {
    log_step "Building Platform"

    # Package build order (based on dependencies)
    local PACKAGES=(
        "@sharpee/core:core"
        "@sharpee/text-blocks:text-blocks"
        "@sharpee/if-domain:if-domain"
        "@sharpee/media:media"
        "@sharpee/world-model:world-model"
        "@sharpee/helpers:helpers"
        "@sharpee/queries:queries"
        "@sharpee/event-processor:event-processor"
        "@sharpee/lang-en-us:lang-en-us"
        "@sharpee/parser-en-us:parser-en-us"
        "@sharpee/if-services:if-services"
        "@sharpee/channel-service:channel-service"
        "@sharpee/stdlib:stdlib"
        "@sharpee/character:character"
        "@sharpee/ext-basic-combat:extensions/basic-combat"
        "@sharpee/plugins:plugins"
        "@sharpee/plugin-npc:plugin-npc"
        "@sharpee/plugin-scheduler:plugin-scheduler"
        "@sharpee/plugin-state-machine:plugin-state-machine"
        "@sharpee/story-runtime-baseline:story-runtime-baseline"
        "@sharpee/ext-testing:extensions/testing"
        "@sharpee/engine:engine"
        "@sharpee/bootstrap:bootstrap"
        "@sharpee/platform-browser:platform-browser"
        "@sharpee/sharpee:sharpee"
        "@sharpee/transcript-tester:transcript-tester"
        "@sharpee/devkit:devkit"
    )

    local SKIPPING=true
    if [ -z "$SKIP_TO" ]; then
        SKIPPING=false
    else
        echo "(resuming from: $SKIP_TO)"
    fi

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
                # tsf drives the esm target so esmExtensions post-processing
                # runs (appends .js to relative imports). Raw tsc here would
                # emit extensionless imports that native Node ESM rejects.
                run_build "$name (esm)" "tsf build --condition esm --filter '$pkg'"
            fi
        done
    fi

    echo ""
}

# ============================================================================
# GenAI API Reference
# ============================================================================

generate_genai_api() {
    log_step "Generating GenAI API Reference"
    node scripts/generate-genai-api.js
    echo ""
}

# ============================================================================
# Bundle
# ============================================================================

build_bundle() {
    log_step "Bundling"

    mkdir -p dist/cli

    # Use --alias to resolve @sharpee/* to dist/ (project-references output).
    run_build "sharpee.js" "npx esbuild scripts/bundle-entry.js --bundle --platform=node --target=node18 --outfile=dist/cli/sharpee.js --external:readline --format=cjs --sourcemap \
      --alias:@sharpee/core=./packages/core/dist/index.js \
      --alias:@sharpee/if-domain=./packages/if-domain/dist/index.js \
      --alias:@sharpee/world-model=./packages/world-model/dist/index.js \
      --alias:@sharpee/stdlib=./packages/stdlib/dist/index.js \
      --alias:@sharpee/engine=./packages/engine/dist/index.js \
      --alias:@sharpee/parser-en-us=./packages/parser-en-us/dist/index.js \
      --alias:@sharpee/lang-en-us=./packages/lang-en-us/dist/index.js \
      --alias:@sharpee/event-processor=./packages/event-processor/dist/index.js \
      --alias:@sharpee/text-blocks=./packages/text-blocks/dist/index.js \
      --alias:@sharpee/channel-service=./packages/channel-service/dist/index.js \
      --alias:@sharpee/if-services=./packages/if-services/dist/index.js \
      --alias:@sharpee/ext-basic-combat=./packages/extensions/basic-combat/dist/index.js \
      --alias:@sharpee/plugins=./packages/plugins/dist/index.js \
      --alias:@sharpee/plugin-npc=./packages/plugin-npc/dist/index.js \
      --alias:@sharpee/plugin-scheduler=./packages/plugin-scheduler/dist/index.js \
      --alias:@sharpee/plugin-state-machine=./packages/plugin-state-machine/dist/index.js \
      --alias:@sharpee/bootstrap=./packages/bootstrap/dist/index.js \
      --alias:@sharpee/transcript-tester=./packages/transcript-tester/dist/index.js"

    # Generate type declarations
    cat > dist/cli/sharpee.d.ts << 'EOF'
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
export * from '../packages/channel-service/dist/index';
EOF

    # Report size
    local BUNDLE_SIZE=$(ls -lh dist/cli/sharpee.js | awk '{print $5}')
    echo "Bundle size: $BUNDLE_SIZE"

    # Quick load test
    echo -n "Load test: "
    node -e "const s=Date.now();require('./dist/cli/sharpee.js');console.log((Date.now()-s)+'ms')"

    echo ""
}

# ============================================================================
# Test Bundle (platform + story + transcript-tester in one file)
# ============================================================================

build_test_bundle() {
    local STORY_NAME="$1"
    local STORY_DIR=$(resolve_story_dir "$STORY_NAME")
    local STORY_DIST="${STORY_DIR}/dist/index.js"

    log_step "Building Test Bundle: ${STORY_NAME}-test.js"

    if [ ! -f "$STORY_DIST" ]; then
        echo -e "${RED}Error: Story dist not found: $STORY_DIST (build the story first)${NC}"
        exit 1
    fi

    mkdir -p dist/cli

    # Generate entry from template with absolute paths baked in
    local TEST_ENTRY=$(mktemp /tmp/sharpee-test-entry-XXXXXX.js)
    sed -e "s|__REPO_ROOT__|${REPO_ROOT}|g" \
        -e "s|__STORY_DIST_PATH__|${REPO_ROOT}/${STORY_DIST}|g" \
        -e "s|__STORY_NAME__|${STORY_NAME}|g" \
        scripts/test-bundle-template.js > "$TEST_ENTRY"

    # Bundle everything into one file
    run_build "${STORY_NAME}-test.js" "npx esbuild '$TEST_ENTRY' --bundle --platform=node --target=node18 --outfile=dist/cli/${STORY_NAME}-test.js --external:readline --format=cjs --sourcemap \
      --alias:@sharpee/core=./packages/core/dist/index.js \
      --alias:@sharpee/if-domain=./packages/if-domain/dist/index.js \
      --alias:@sharpee/world-model=./packages/world-model/dist/index.js \
      --alias:@sharpee/stdlib=./packages/stdlib/dist/index.js \
      --alias:@sharpee/engine=./packages/engine/dist/index.js \
      --alias:@sharpee/parser-en-us=./packages/parser-en-us/dist/index.js \
      --alias:@sharpee/lang-en-us=./packages/lang-en-us/dist/index.js \
      --alias:@sharpee/event-processor=./packages/event-processor/dist/index.js \
      --alias:@sharpee/text-blocks=./packages/text-blocks/dist/index.js \
      --alias:@sharpee/channel-service=./packages/channel-service/dist/index.js \
      --alias:@sharpee/if-services=./packages/if-services/dist/index.js \
      --alias:@sharpee/ext-basic-combat=./packages/extensions/basic-combat/dist/index.js \
      --alias:@sharpee/plugins=./packages/plugins/dist/index.js \
      --alias:@sharpee/plugin-npc=./packages/plugin-npc/dist/index.js \
      --alias:@sharpee/plugin-scheduler=./packages/plugin-scheduler/dist/index.js \
      --alias:@sharpee/plugin-state-machine=./packages/plugin-state-machine/dist/index.js \
      --alias:@sharpee/bootstrap=./packages/bootstrap/dist/index.js \
      --alias:@sharpee/transcript-tester=./packages/transcript-tester/dist/index.js"

    rm -f "$TEST_ENTRY"

    # Report
    local BUNDLE_SIZE=$(ls -lh "dist/cli/${STORY_NAME}-test.js" | awk '{print $5}')
    echo "Test bundle: dist/cli/${STORY_NAME}-test.js ($BUNDLE_SIZE)"
    echo ""
}

# ============================================================================
# Run Walkthrough Tests
# ============================================================================

run_tests() {
    local STORY_NAME="$1"
    local STORY_DIR_RESOLVED=$(resolve_story_dir "$STORY_NAME")
    local WT_DIR="${STORY_DIR_RESOLVED}/walkthroughs"
    local UT_DIR="${STORY_DIR_RESOLVED}/tests/transcripts"

    log_step "Running Tests: ${STORY_NAME}"

    # Run walkthrough chain if walkthroughs exist
    if ls "${WT_DIR}"/wt-*.transcript 1>/dev/null 2>&1; then
        echo -n "[walkthrough chain] "
        local START_TIME=$(date +%s%N)
        local TEST_OUTPUT
        if TEST_OUTPUT=$(node dist/cli/sharpee.js --test --chain ${WT_DIR}/wt-*.transcript 2>&1); then
            local END_TIME=$(date +%s%N)
            local ELAPSED=$(( (END_TIME - START_TIME) / 1000000 ))

            # Extract summary line (last non-empty line with pass/fail counts)
            local SUMMARY=$(echo "$TEST_OUTPUT" | grep -E "^\d+ tests" | tail -1)
            if [ -z "$SUMMARY" ]; then
                SUMMARY=$(echo "$TEST_OUTPUT" | tail -3 | head -1)
            fi
            echo -e "${GREEN}✓${NC} ${SUMMARY} (${ELAPSED}ms)"
        else
            echo -e "${RED}✗ FAILED${NC}"
            echo ""
            echo "$TEST_OUTPUT" | grep -E "(FAIL|✗|Error)" | head -20
            echo ""
            echo "Full output:"
            echo "$TEST_OUTPUT"
            exit 1
        fi
    else
        echo "No walkthroughs found in ${WT_DIR}"
    fi

    # Run unit test transcripts if they exist
    if ls "${UT_DIR}"/*.transcript 1>/dev/null 2>&1; then
        echo -n "[unit transcripts] "
        local START_TIME=$(date +%s%N)
        local TEST_OUTPUT
        if TEST_OUTPUT=$(node dist/cli/sharpee.js --test ${UT_DIR}/*.transcript 2>&1); then
            local END_TIME=$(date +%s%N)
            local ELAPSED=$(( (END_TIME - START_TIME) / 1000000 ))

            local SUMMARY=$(echo "$TEST_OUTPUT" | grep -E "^\d+ tests" | tail -1)
            if [ -z "$SUMMARY" ]; then
                SUMMARY=$(echo "$TEST_OUTPUT" | tail -3 | head -1)
            fi
            echo -e "${GREEN}✓${NC} ${SUMMARY} (${ELAPSED}ms)"
        else
            echo -e "${RED}✗ FAILED${NC}"
            echo ""
            echo "$TEST_OUTPUT" | grep -E "(FAIL|✗|Error)" | head -20
            echo ""
            echo "Full output:"
            echo "$TEST_OUTPUT"
            exit 1
        fi
    fi

    echo ""
}

# ============================================================================
# Story Build
# ============================================================================

build_story() {
    local STORY_NAME="$1"
    local STORY_DIR=$(resolve_story_dir "$STORY_NAME")
    local STORY_PKG=$(resolve_story_pkg "$STORY_NAME")

    log_step "Building Story: ${STORY_NAME}"

    if [ -z "$STORY_DIR" ] || [ ! -d "$STORY_DIR" ]; then
        echo -e "${RED}Error: Story not found in stories/ or tutorials/: ${STORY_NAME}${NC}"
        exit 1
    fi

    run_build "$STORY_NAME" "pnpm --filter '$STORY_PKG' build"

    # ESM build for story (needed by .sharpee bundle and runner)
    if [ "$BUILD_RUNNER" = true ] || [ "$STORY_BUNDLE" = true ] || [ ${#CLIENTS[@]} -gt 0 ]; then
        if [ -f "$STORY_DIR/tsconfig.esm.json" ]; then
            # tsf drives the esm target so esmExtensions post-processing
            # runs (appends .js to relative imports).
            run_build "$STORY_NAME (esm)" "tsf build --condition esm --filter '$STORY_PKG'"
        fi
    fi

    echo ""
}

# ============================================================================
# Story Bundle (.sharpee)
# ============================================================================

build_story_bundle() {
    local STORY_NAME="$1"
    local STORY_DIR=$(resolve_story_dir "$STORY_NAME")
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
        id: '${STORY_NAME}',
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

    # 6. ADR-178 §AC-5: validate the bundle's external module references
    # against STORY_RUNTIME_BASELINE. Fails the build if the bundle pulls
    # in a package outside the platform's declared peer set.
    if ! node "$REPO_ROOT/scripts/validate-bundle-baseline.js" "$OUT_FILE" >/dev/null 2>"$STAGING/baseline-check.err"; then
        log_fail "baseline-check"
        cat "$STAGING/baseline-check.err" >&2
        rm -rf "$STAGING"
        exit 1
    fi
    log_ok "baseline-check"

    # 7. Report
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
    local STORY_DIR=$(resolve_story_dir "$STORY_NAME")
    local ENTRY="${STORY_DIR}/src/browser-entry.ts"
    local OUTDIR="dist/web/${STORY_NAME}"

    log_step "Building Browser Client: ${STORY_NAME}"

    if [ ! -f "$ENTRY" ]; then
        echo -e "${RED}Error: Browser entry not found: $ENTRY${NC}"
        exit 1
    fi

    mkdir -p "$OUTDIR"

    # Bundle
    run_build "bundle" "npx esbuild '$ENTRY' --bundle --platform=browser --target=es2020 --format=iife --global-name=SharpeeGame --outfile='$OUTDIR/game.js' --sourcemap --minify --conditions=require --define:process.env.PARSER_DEBUG=undefined --define:process.env.DEBUG_PRONOUNS=undefined --define:process.env.NODE_ENV=\\\"production\\\" --alias:@sharpee/platform-browser=$REPO_ROOT/packages/platform-browser/dist/index.js"

    # Copy HTML template (title set at runtime by BrowserClient from story config)
    if [ -f "templates/browser/index.html" ]; then
        cp templates/browser/index.html "$OUTDIR/"
        log_ok "html"
    fi

    # Copy CSS — base.css carries structural rules (ADR-170), decorations.css
    # carries the platform prose decoration vocabulary (ADR-174), infocom.css
    # carries themes; index.html links them in order: base, decorations, styles.
    if [[ -f "templates/browser/base.css" ]]; then
        cp templates/browser/base.css "$OUTDIR/base.css"
        log_ok "base.css"
    fi
    if [[ -f "templates/browser/decorations.css" ]]; then
        cp templates/browser/decorations.css "$OUTDIR/decorations.css"
        log_ok "decorations.css"
    fi
    if [[ -f "templates/browser/infocom.css" ]]; then
        cp templates/browser/infocom.css "$OUTDIR/styles.css"
        log_ok "css"
    fi

    # Copy theme assets (per-theme bundled webfonts, e.g. system-6).
    # CSS @font-face rules reference paths under themes/<theme-id>/fonts/.
    # rm -rf first because cp -r SRC DST nests SRC inside DST when DST exists,
    # which compounds nesting on every rebuild.
    if [ -d "templates/browser/themes" ]; then
        rm -rf "$OUTDIR/themes"
        cp -r templates/browser/themes "$OUTDIR/themes"
        log_ok "theme-assets"
    fi

    # Copy story assets (audio, images, etc.)
    local ASSETS_DIR="${STORY_DIR}/assets"
    if [ -d "$ASSETS_DIR" ]; then
        cp -r "$ASSETS_DIR"/* "$OUTDIR/" 2>/dev/null
        log_ok "assets"
    fi

    # Copy to website
    local WEBSITE_DIR="website/public/web/${STORY_NAME}"
    if [ -d "website/public" ]; then
        mkdir -p "$WEBSITE_DIR"
        cp "$OUTDIR/game.js" "$WEBSITE_DIR/"
        cp "$OUTDIR/index.html" "$WEBSITE_DIR/"
        cp "$OUTDIR/base.css" "$WEBSITE_DIR/" 2>/dev/null || true
        cp "$OUTDIR/styles.css" "$WEBSITE_DIR/"
        if [ -d "$OUTDIR/themes" ]; then
            rm -rf "$WEBSITE_DIR/themes"
            cp -r "$OUTDIR/themes" "$WEBSITE_DIR/themes"
        fi
        log_ok "website"
    fi

    local BUNDLE_SIZE=$(ls -lh "$OUTDIR/game.js" | awk '{print $5}')
    echo "Output: $OUTDIR/ ($BUNDLE_SIZE)"
    echo ""
}

# ============================================================================
# Shite (parts-bin web app) Build — abandoned Phase-6 'Zifmia' build
# at tools/shite/, renamed 2026-05-12. Corrected design lives in ADR-177.
# ============================================================================
#
# `-c shite` builds the parts-bin web app: Fastify server + browser
# client (vite-built static assets) at `tools/shite/`. Story bundle is
# NOT baked in. Kept for parts-reference only; do not extend this code.

build_shite_web() {
    log_step "Building shite (Phase-6 parts bin)"

    if [ ! -d "tools/shite" ]; then
        echo -e "${RED}Error: tools/shite not found${NC}" >&2
        return 1
    fi

    if ! pnpm --filter '@sharpee/shite' build 2>&1; then
        echo -e "${RED}Error: shite build failed${NC}" >&2
        return 1
    fi

    local WEB_BUNDLE="tools/shite/dist/web/assets"
    if [ -d "$WEB_BUNDLE" ]; then
        local JS_SIZE
        JS_SIZE=$(du -sh "$WEB_BUNDLE" | cut -f1)
        echo "Output: tools/shite/dist/   (web bundle ~$JS_SIZE)"
    else
        echo "Output: tools/shite/dist/"
    fi
    echo ""
}

# ============================================================================
# Zifmia (corrected multi-user server, ADR-177) Build
# ============================================================================
#
# `-c zifmia` builds the corrected multi-user server at tools/zifmia/.
# Phase 2 surface: identity + rooms + participants + tier-gated
# governance + story scanner. WS layer, saves/restore, full client UI,
# and Playwright E2E land in Phases 3-8.

build_zifmia_server() {
    log_step "Building zifmia (multi-user server, ADR-177)"

    if [ ! -d "tools/zifmia" ]; then
        echo -e "${RED}Error: tools/zifmia not found${NC}" >&2
        return 1
    fi

    if ! pnpm --filter '@sharpee/zifmia' build 2>&1; then
        echo -e "${RED}Error: zifmia build failed${NC}" >&2
        return 1
    fi

    # ADR-178 §AC-3: surface the Story Runtime Baseline version sourced
    # from the manifest, so operators running `docker build` can pass it
    # as `--build-arg BASELINE_VERSION=<n>`. Output only — Docker is
    # built by the operator per DEPLOYMENT.md, not by this script.
    local BASELINE_MOD="$REPO_ROOT/packages/story-runtime-baseline/dist/index.js"
    if [ -f "$BASELINE_MOD" ]; then
        local BASELINE_VER
        BASELINE_VER=$(node -p "require('$BASELINE_MOD').BASELINE_VERSION" 2>/dev/null)
        if [ -n "$BASELINE_VER" ]; then
            echo "Story Runtime Baseline: v${BASELINE_VER}"
            echo "  (docker build expects --build-arg BASELINE_VERSION=${BASELINE_VER}; docker-compose.yml does this automatically)"
        fi
    fi

    local SERVER_DIST="tools/zifmia/dist"
    if [ -d "$SERVER_DIST" ]; then
        local SIZE
        SIZE=$(du -sh "$SERVER_DIST" | cut -f1)
        echo "Output: $SERVER_DIST/   (~$SIZE)"
    else
        echo "Output: $SERVER_DIST/"
    fi
    echo ""
}

# ============================================================================
# Interpreter Runner (legacy; pre-Phase-6 single-player Tauri browser
# runner). Triggered by `--runner` only.
# ============================================================================

build_runner() {
    local OUTDIR="dist/runner"
    local MODULES_DIR="$OUTDIR/modules"
    local RUNNER_ENTRY="packages/interpreter/src/runner/runner-entry.tsx"
    local THEMES_FILE="packages/interpreter/src/styles/themes.css"

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
    local PLATFORM_ENTRY=$(mktemp /tmp/sharpee-platform-XXXXXX.js)
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
        --define:process.env.NODE_ENV=\\\"production\\\" \
        --alias:@sharpee/core=$REPO_ROOT/packages/core/dist-esm/index.js \
        --alias:@sharpee/if-domain=$REPO_ROOT/packages/if-domain/dist-esm/index.js \
        --alias:@sharpee/world-model=$REPO_ROOT/packages/world-model/dist-esm/index.js \
        --alias:@sharpee/stdlib=$REPO_ROOT/packages/stdlib/dist-esm/index.js \
        --alias:@sharpee/engine=$REPO_ROOT/packages/engine/dist-esm/index.js \
        --alias:@sharpee/parser-en-us=$REPO_ROOT/packages/parser-en-us/dist-esm/index.js \
        --alias:@sharpee/lang-en-us=$REPO_ROOT/packages/lang-en-us/dist-esm/index.js \
        --alias:@sharpee/event-processor=$REPO_ROOT/packages/event-processor/dist-esm/index.js \
        --alias:@sharpee/text-blocks=$REPO_ROOT/packages/text-blocks/dist-esm/index.js \
        --alias:@sharpee/if-services=$REPO_ROOT/packages/if-services/dist-esm/index.js \
        --alias:@sharpee/plugins=$REPO_ROOT/packages/plugins/dist-esm/index.js \
        --alias:@sharpee/plugin-npc=$REPO_ROOT/packages/plugin-npc/dist-esm/index.js \
        --alias:@sharpee/plugin-scheduler=$REPO_ROOT/packages/plugin-scheduler/dist-esm/index.js \
        --alias:@sharpee/plugin-state-machine=$REPO_ROOT/packages/plugin-state-machine/dist-esm/index.js"

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
        --define:process.env.NODE_ENV=\\\"production\\\" \
        --alias:@sharpee/core=$REPO_ROOT/packages/core/dist-esm/index.js \
        --alias:@sharpee/if-domain=$REPO_ROOT/packages/if-domain/dist-esm/index.js \
        --alias:@sharpee/world-model=$REPO_ROOT/packages/world-model/dist-esm/index.js \
        --alias:@sharpee/stdlib=$REPO_ROOT/packages/stdlib/dist-esm/index.js \
        --alias:@sharpee/engine=$REPO_ROOT/packages/engine/dist-esm/index.js \
        --alias:@sharpee/parser-en-us=$REPO_ROOT/packages/parser-en-us/dist-esm/index.js \
        --alias:@sharpee/lang-en-us=$REPO_ROOT/packages/lang-en-us/dist-esm/index.js \
        --alias:@sharpee/event-processor=$REPO_ROOT/packages/event-processor/dist-esm/index.js \
        --alias:@sharpee/text-blocks=$REPO_ROOT/packages/text-blocks/dist-esm/index.js \
        --alias:@sharpee/if-services=$REPO_ROOT/packages/if-services/dist-esm/index.js \
        --alias:@sharpee/plugins=$REPO_ROOT/packages/plugins/dist-esm/index.js \
        --alias:@sharpee/plugin-npc=$REPO_ROOT/packages/plugin-npc/dist-esm/index.js \
        --alias:@sharpee/plugin-scheduler=$REPO_ROOT/packages/plugin-scheduler/dist-esm/index.js \
        --alias:@sharpee/plugin-state-machine=$REPO_ROOT/packages/plugin-state-machine/dist-esm/index.js"

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

    # 4. Copy runner assets (logo, fonts)
    mkdir -p "$OUTDIR/assets/fonts"
    if [ -f "docs/design/sharpee-logo.png" ]; then
        cp "docs/design/sharpee-logo.png" "$OUTDIR/assets/sharpee-logo.png"
        log_ok "sharpee-logo.png"
    fi
    if [ -f "docs/design/fonts/Enchanted Land DS D.otf" ]; then
        cp "docs/design/fonts/Enchanted Land DS D.otf" "$OUTDIR/assets/fonts/enchanted-land.otf"
        log_ok "enchanted-land.otf"
    fi

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
if [ -n "$VERSION_OVERRIDE" ]; then
    echo "  Version: $VERSION_OVERRIDE"
fi
echo "  1. Update versions"
echo "  2. Build platform packages"
echo "  3. Generate GenAI API reference"
echo "  4. Bundle -> dist/cli/sharpee.js"
if [ -n "$STORY" ]; then
    echo "  4. Build story: $STORY"
fi
if [ "$BUILD_TEST" = true ]; then
    echo "  5. Test bundle: dist/cli/${STORY}-test.js"
fi
if [ "$STORY_BUNDLE" = true ]; then
    echo "  5. Bundle story: ${STORY}.sharpee"
fi
if [ "$BUILD_RUNNER" = true ]; then
    echo "  6. Build legacy interpreter runner"
fi
for CLIENT in "${CLIENTS[@]}"; do
    if [ "$CLIENT" = "shite" ]; then
        echo "  5. Build shite parts bin (tools/shite/)"
    elif [ "$CLIENT" = "zifmia" ]; then
        echo "  5. Build zifmia multi-user server (tools/zifmia/)"
    else
        echo "  5. Build $CLIENT client"
    fi
done
echo ""

# Execute build steps
update_versions
build_platform
generate_genai_api

if [ -n "$STORY" ]; then
    build_story "$STORY"
fi

build_bundle

if [ "$BUILD_TEST" = true ]; then
    build_test_bundle "$STORY"
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
        shite)
            # `-c shite` builds the Phase-6 parts-bin web app at
            # tools/shite/. The corrected multi-user product lives in
            # `-c zifmia` per ADR-177; this path is kept for
            # parts-reference only. Story bundle is optional.
            if [ -n "$STORY" ] && [ "$STORY_BUNDLE" != true ]; then
                build_story_bundle "$STORY"
            fi
            build_shite_web
            ;;
        zifmia)
            # `-c zifmia` builds the corrected multi-user server per
            # ADR-177 at tools/zifmia/. Story bundle is optional —
            # zifmia scans `stories/` at runtime.
            if [ -n "$STORY" ] && [ "$STORY_BUNDLE" != true ]; then
                build_story_bundle "$STORY"
            fi
            build_zifmia_server
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
echo "  dist/cli/sharpee.js - Platform bundle"
if [ "$BUILD_TEST" = true ]; then
    echo "  dist/cli/${STORY}-test.js - Fast test bundle"
fi

if [ "$STORY_BUNDLE" = true ]; then
    echo "  dist/stories/${STORY}.sharpee - Story bundle"
fi
if [ "$BUILD_RUNNER" = true ]; then
    echo "  dist/runner/ - Legacy interpreter runner"
fi
for CLIENT in "${CLIENTS[@]}"; do
    if [ "$CLIENT" = "shite" ]; then
        echo "  tools/shite/dist/ - shite parts-bin web app (Phase-6, abandoned)"
        if [ -n "$STORY" ]; then
            echo "  dist/stories/${STORY}.sharpee - Story bundle (install via POST /admin/stories)"
        fi
    elif [ "$CLIENT" = "zifmia" ]; then
        echo "  tools/zifmia/dist/ - zifmia multi-user server (ADR-177)"
        if [ -n "$STORY" ]; then
            echo "  dist/stories/${STORY}.sharpee - Story bundle (drop into stories/ to publish)"
        fi
    elif [ -n "$STORY" ]; then
        echo "  dist/web/${STORY}/ - Browser client"
    fi
done

echo ""
echo "Next steps:"
echo "  Test CLI:     node dist/cli/sharpee.js --play"
if [ "$BUILD_TEST" = true ]; then
    echo "  Fast tests:   node dist/cli/${STORY}-test.js --chain stories/${STORY}/walkthroughs/wt-*.transcript"
fi
for CLIENT in "${CLIENTS[@]}"; do
    if [ "$CLIENT" = "shite" ]; then
        echo "  Test shite:   node tools/shite/dist/index.js  (server on :3000)"
    elif [ -n "$STORY" ]; then
        echo "  Test Browser: npx serve dist/web/${STORY}"
    fi
done
echo ""
