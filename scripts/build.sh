#!/bin/bash
# Sharpee Build Controller
#
# Usage:
#   ./scripts/build.sh                                    # Platform only
#   ./scripts/build.sh -s dungeo                          # Platform + story
#   ./scripts/build.sh -s dungeo -c browser               # Platform + story + browser client
#   ./scripts/build.sh -s dungeo -c react                 # Platform + story + React client
#   ./scripts/build.sh -s reflections -c electron         # Platform + story + electron client
#   ./scripts/build.sh --skip stdlib -s dungeo            # Skip to stdlib, then story
#   ./scripts/build.sh --all dungeo browser               # Everything (shorthand)
#
# Options:
#   -s, --story <name>      Build a story (dungeo, reflections, etc.)
#   -c, --client <type>     Build a client (browser, react, electron)
#   --skip <package>        Skip to package in platform build
#   --all <story> <client>  Build everything for story/client combo
#   -h, --help              Show this help message
#
# Build order:
#   1. Update versions (generates version.ts files)
#   2. Build platform packages
#   3. Build story (if specified)
#   4. Build client (if specified)

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Default values
STORY=""
CLIENT=""
SKIP_TO=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--story)
            STORY="$2"
            shift 2
            ;;
        -c|--client)
            CLIENT="$2"
            shift 2
            ;;
        --skip)
            SKIP_TO="$2"
            shift 2
            ;;
        --all)
            STORY="$2"
            CLIENT="$3"
            if [ -z "$STORY" ] || [ -z "$CLIENT" ]; then
                echo "Error: --all requires story and client arguments"
                echo "Example: --all dungeo browser"
                echo "         --all dungeo react"
                exit 1
            fi
            shift 3
            ;;
        -h|--help)
            head -24 "$0" | tail -23
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage"
            exit 1
            ;;
    esac
done

# Validate: client requires story
if [ -n "$CLIENT" ] && [ -z "$STORY" ]; then
    echo "Error: --client requires --story"
    echo "Example: ./scripts/build.sh -s dungeo -c browser"
    echo "         ./scripts/build.sh -s dungeo -c react"
    exit 1
fi

# Show build plan
echo "========================================"
echo "Sharpee Build"
echo "========================================"
echo ""
echo "Build plan:"
echo "  1. Update versions"
echo "  2. Build platform"
if [ -n "$STORY" ]; then
    echo "  3. Build story: $STORY"
fi
if [ -n "$CLIENT" ]; then
    echo "  4. Build client: $CLIENT"
fi
echo ""

# Step 1: Update versions
VERSION_ARGS=""
if [ -n "$STORY" ]; then
    VERSION_ARGS="$VERSION_ARGS --story $STORY"
fi
if [ -n "$CLIENT" ]; then
    VERSION_ARGS="$VERSION_ARGS --client $CLIENT"
fi

"$REPO_ROOT/scripts/update-versions.sh" $VERSION_ARGS

# Step 2: Build platform
if [ -n "$SKIP_TO" ]; then
    "$REPO_ROOT/scripts/build-platform.sh" --skip "$SKIP_TO"
else
    "$REPO_ROOT/scripts/build-platform.sh"
fi

# Step 3: Build story (if specified)
if [ -n "$STORY" ]; then
    echo ""
    "$REPO_ROOT/scripts/build-story.sh" "$STORY"
fi

# Step 4: Build client (if specified)
if [ -n "$CLIENT" ]; then
    echo ""
    "$REPO_ROOT/scripts/build-client.sh" "$STORY" "$CLIENT"
fi

echo ""
echo "========================================"
echo "Build Complete"
echo "========================================"

# Show next steps
if [ -n "$CLIENT" ] && [ "$CLIENT" = "browser" ]; then
    echo ""
    echo "To test browser: npx serve dist/web/$STORY"
elif [ -n "$CLIENT" ] && [ "$CLIENT" = "react" ]; then
    echo ""
    echo "To test React client: npx serve dist/web/$STORY-react"
elif [ -n "$STORY" ]; then
    echo ""
    echo "To test CLI: node dist/sharpee.js --play"
fi
