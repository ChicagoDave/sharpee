#!/bin/bash
# build-release.sh - Build Sharpee packages for release
#
# Usage:
#   ./scripts/build-release.sh                    # Build only
#   ./scripts/build-release.sh --bump patch       # Bump patch version (0.9.0 -> 0.9.1)
#   ./scripts/build-release.sh --bump minor       # Bump minor version (0.9.0 -> 0.10.0)
#   ./scripts/build-release.sh --bump major       # Bump major version (0.9.0 -> 1.0.0)
#   ./scripts/build-release.sh --beta             # Add/keep beta tag
#   ./scripts/build-release.sh --release          # Remove beta tag (promote to release)
#   ./scripts/build-release.sh --publish          # Create GitHub release after build
#   ./scripts/build-release.sh --bump patch --beta --publish  # Full release workflow

set -e

# Packages to build (in dependency order)
PACKAGES=(
  "@sharpee/core"
  "@sharpee/if-domain"
  "@sharpee/world-model"
  "@sharpee/lang-en-us"
  "@sharpee/parser-en-us"
  "@sharpee/stdlib"
  "@sharpee/engine"
  "@sharpee/sharpee"
)

# Parse arguments
BUMP=""
MODE=""
PUBLISH=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --bump)
      BUMP="$2"
      shift 2
      ;;
    --beta)
      MODE="beta"
      shift
      ;;
    --release)
      MODE="release"
      shift
      ;;
    --publish)
      PUBLISH=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--bump patch|minor|major] [--beta|--release] [--publish]"
      echo ""
      echo "Options:"
      echo "  --bump patch    Increment patch version (0.9.0 -> 0.9.1)"
      echo "  --bump minor    Increment minor version (0.9.0 -> 0.10.0)"
      echo "  --bump major    Increment major version (0.9.0 -> 1.0.0)"
      echo "  --beta          Add or keep -beta.N suffix"
      echo "  --release       Remove beta suffix (promote to release)"
      echo "  --publish       Commit, tag, push, and create GitHub release"
      echo ""
      echo "Examples:"
      echo "  $0                                  # Just build"
      echo "  $0 --bump patch --beta              # 0.9.0-beta.1 -> 0.9.1-beta.1"
      echo "  $0 --release                        # 0.9.0-beta.1 -> 0.9.0"
      echo "  $0 --bump patch --beta --publish    # Bump, build, and release"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Get current version from core package
CURRENT_VERSION=$(node -p "require('./packages/core/package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version if bumping
if [[ -n "$BUMP" ]] || [[ -n "$MODE" ]]; then
  # Extract base version (strip -beta.N if present)
  BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/-beta\.[0-9]*//')

  # Extract beta number if present
  BETA_NUM=$(echo "$CURRENT_VERSION" | grep -oP 'beta\.\K[0-9]+' || echo "0")

  # Parse version components
  IFS='.' read -r MAJOR MINOR PATCH <<< "$BASE_VERSION"

  # Apply bump
  case $BUMP in
    major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      BETA_NUM=1
      ;;
    minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      BETA_NUM=1
      ;;
    patch)
      PATCH=$((PATCH + 1))
      BETA_NUM=1
      ;;
  esac

  # Build new version string
  NEW_BASE="${MAJOR}.${MINOR}.${PATCH}"

  if [[ "$MODE" == "beta" ]]; then
    # If no bump but beta mode, increment beta number
    if [[ -z "$BUMP" ]] && [[ "$CURRENT_VERSION" == *"-beta."* ]]; then
      BETA_NUM=$((BETA_NUM + 1))
    fi
    NEW_VERSION="${NEW_BASE}-beta.${BETA_NUM}"
  elif [[ "$MODE" == "release" ]]; then
    NEW_VERSION="$NEW_BASE"
  else
    # No mode specified, keep current format
    if [[ "$CURRENT_VERSION" == *"-beta."* ]]; then
      NEW_VERSION="${NEW_BASE}-beta.${BETA_NUM}"
    else
      NEW_VERSION="$NEW_BASE"
    fi
  fi

  echo "New version: $NEW_VERSION"
  echo ""

  # Update all package versions
  echo "Updating package versions..."
  for pkg in "${PACKAGES[@]}"; do
    PKG_DIR="packages/$(echo $pkg | sed 's/@sharpee\///')"
    if [[ -f "$PKG_DIR/package.json" ]]; then
      # Use node to update version (handles JSON properly)
      node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$PKG_DIR/package.json'));
        pkg.version = '$NEW_VERSION';
        fs.writeFileSync('$PKG_DIR/package.json', JSON.stringify(pkg, null, 2) + '\n');
      "
      echo "  Updated $pkg to $NEW_VERSION"
    fi
  done
  echo ""
fi

# Build packages
echo "Building packages..."
for pkg in "${PACKAGES[@]}"; do
  echo "  Building $pkg..."
  pnpm --filter "$pkg" build
done

echo ""
echo "Build complete!"

# Get final version
FINAL_VERSION=$(node -p "require('./packages/core/package.json').version")
echo "Version: $FINAL_VERSION"

# Handle publish
if [[ "$PUBLISH" == true ]]; then
  echo ""
  echo "Publishing release..."

  # Check for uncommitted changes
  if [[ -n $(git status --porcelain) ]]; then
    echo "  Committing changes..."
    git add -A
    git commit -m "chore: release v$FINAL_VERSION"
  fi

  # Create tag
  TAG="v$FINAL_VERSION"
  echo "  Creating tag $TAG..."
  git tag -a "$TAG" -m "Release $TAG"

  # Push
  echo "  Pushing to remote..."
  git push
  git push --tags

  # Determine if prerelease
  PRERELEASE_FLAG=""
  if [[ "$FINAL_VERSION" == *"-beta"* ]] || [[ "$FINAL_VERSION" == *"-alpha"* ]]; then
    PRERELEASE_FLAG="--prerelease"
  fi

  # Create GitHub release
  echo "  Creating GitHub release..."

  # Generate release notes
  RELEASE_NOTES=$(cat <<EOF
## Sharpee $FINAL_VERSION

### Packages
| Package | Version |
|---------|---------|
| @sharpee/core | $FINAL_VERSION |
| @sharpee/if-domain | $FINAL_VERSION |
| @sharpee/world-model | $FINAL_VERSION |
| @sharpee/engine | $FINAL_VERSION |
| @sharpee/stdlib | $FINAL_VERSION |
| @sharpee/parser-en-us | $FINAL_VERSION |
| @sharpee/lang-en-us | $FINAL_VERSION |
| @sharpee/sharpee | $FINAL_VERSION |

### Installation
\`\`\`bash
npm install @sharpee/sharpee@$FINAL_VERSION
\`\`\`

### CLI
\`\`\`bash
npx @sharpee/sharpee@$FINAL_VERSION --help
\`\`\`
EOF
)

  gh release create "$TAG" \
    --title "Sharpee $FINAL_VERSION" \
    --notes "$RELEASE_NOTES" \
    $PRERELEASE_FLAG

  echo ""
  echo "Release published!"
  echo "  GitHub: https://github.com/ChicagoDave/sharpee/releases/tag/$TAG"
else
  echo ""
  echo "Next steps:"
  echo "  1. Test the build"
  echo "  2. Run with --publish to create release:"
  echo "     ./scripts/build-release.sh --publish"
fi
