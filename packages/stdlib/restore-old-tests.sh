#!/bin/bash

# Script to restore stdlib tests from git history to a temp directory for comparison

# Set the temp directory
TEMP_DIR="/tmp/stdlib-tests-old"

# Get to the repo root (assuming we're somewhere in the repo)
cd "$(git rev-parse --show-toplevel)"

# Create temp directory structure
echo "Creating temp directory: $TEMP_DIR"
mkdir -p "$TEMP_DIR/unit/actions"
mkdir -p "$TEMP_DIR/unit/scope"
mkdir -p "$TEMP_DIR/integration"

# Get commit hash from 3 days ago
echo "Finding commit from 3 days ago..."
COMMIT_HASH=$(git log --since="4 days ago" --until="3 days ago" --oneline -1 | cut -d' ' -f1)

if [ -z "$COMMIT_HASH" ]; then
    echo "Error: Could not find a commit from 3 days ago"
    echo "Here are the last 10 commits:"
    git log --oneline -10
    echo ""
    echo "Please specify a commit hash as an argument: $0 <commit-hash>"
    exit 1
fi

echo "Using commit: $COMMIT_HASH"
echo ""

# Function to restore a file
restore_file() {
    local file_path=$1
    local dest_path=$2
    
    if git show "$COMMIT_HASH:$file_path" > "$dest_path" 2>/dev/null; then
        echo "✓ Restored: $(basename "$file_path")"
    else
        echo "✗ Failed to restore: $file_path"
    fi
}

# Restore action tests
echo "Restoring action tests..."
for f in packages/stdlib/tests/unit/actions/*.test.ts; do
    if [ -f "$f" ]; then
        filename=$(basename "$f")
        restore_file "$f" "$TEMP_DIR/unit/actions/$filename"
    fi
done

# Restore scope tests
echo ""
echo "Restoring scope tests..."
for f in packages/stdlib/tests/unit/scope/*.test.ts; do
    if [ -f "$f" ]; then
        filename=$(basename "$f")
        restore_file "$f" "$TEMP_DIR/unit/scope/$filename"
    fi
done

# Restore integration tests
echo ""
echo "Restoring integration tests..."
for f in packages/stdlib/tests/integration/*.test.ts; do
    if [ -f "$f" ]; then
        filename=$(basename "$f")
        restore_file "$f" "$TEMP_DIR/integration/$filename"
    fi
done

echo ""
echo "Restoration complete!"
echo "Old tests are now in: $TEMP_DIR"
echo ""
echo "You can compare files using:"
echo "  diff $TEMP_DIR/unit/actions/eating-golden.test.ts packages/stdlib/tests/unit/actions/eating-golden.test.ts"
echo ""
echo "Or see a summary of differences:"
echo "  for f in $TEMP_DIR/unit/actions/*.test.ts; do"
echo "    echo \"Checking \$(basename \"\$f\")...\""
echo "    diff -q \"\$f\" \"packages/stdlib/tests/unit/actions/\$(basename \"\$f\")\" || echo \"  → Files differ\""
echo "  done"