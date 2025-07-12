#!/bin/bash
echo "=== Validating Engine Dependencies ==="
echo ""

cd /mnt/c/repotemp/sharpee

# Function to check if a type/interface exists in exports
check_export() {
    local package=$1
    local type=$2
    local file=$3
    
    if grep -q "export.*$type" "$file" 2>/dev/null || grep -q "export.*{.*$type.*}" "$file" 2>/dev/null; then
        echo "  ✅ $type found in $package"
    else
        echo "  ❌ $type NOT FOUND in $package"
    fi
}

echo "Checking @sharpee/core exports used by engine:"
check_export "@sharpee/core" "SemanticEvent" "packages/core/src/index.ts"

echo ""
echo "Checking @sharpee/world-model exports used by engine:"
check_export "@sharpee/world-model" "ParsedCommand" "packages/world-model/src/index.ts"
check_export "@sharpee/world-model" "ValidatedCommand" "packages/world-model/src/index.ts"
check_export "@sharpee/world-model" "Parser" "packages/world-model/src/index.ts"
check_export "@sharpee/world-model" "ValidationError" "packages/world-model/src/index.ts"
check_export "@sharpee/world-model" "CommandValidator" "packages/world-model/src/index.ts"
check_export "@sharpee/world-model" "WorldModel" "packages/world-model/src/index.ts"
check_export "@sharpee/world-model" "IFEntity" "packages/world-model/src/index.ts"

echo ""
echo "Checking @sharpee/event-processor exports used by engine:"
check_export "@sharpee/event-processor" "EventProcessor" "packages/event-processor/src/index.ts"

echo ""
echo "Checking for potential issues:"
echo ""

# Check if Parser is in commands or interfaces
echo "Looking for Parser interface location:"
find packages/world-model/src -name "*.ts" -type f -exec grep -l "interface Parser" {} \; 2>/dev/null | head -5

echo ""
echo "Looking for CommandValidator location:"
find packages/world-model/src -name "*.ts" -type f -exec grep -l "interface CommandValidator" {} \; 2>/dev/null | head -5

echo ""
echo "=== Recommendations ==="
echo "1. Check if Parser and CommandValidator are exported from world-model"
echo "2. Verify SemanticEvent structure hasn't changed"
echo "3. Ensure all required methods exist on WorldModel"
