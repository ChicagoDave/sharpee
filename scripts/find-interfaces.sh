#!/bin/bash
# Script to help identify and update interface names

echo "=== Phase 3.5: Interface Naming Update ==="
echo ""
echo "Interfaces to rename (removing I prefix):"
echo "- IEntity -> Entity"
echo "- IFEntity -> Entity or GameEntity"
echo "- IWorldModel -> WorldModel"
echo "- IEventSource -> EventSource"
echo "- IEventEmitter -> EventEmitter"
echo "- IAction -> Action"
echo "- ICommandValidator -> CommandValidator"
echo "- ICommandExecutor -> CommandExecutor"
echo "- IParser -> Parser"
echo "- ICommandProcessor -> CommandProcessor"
echo ""

echo "Files that need updating:"
echo ""

# Core package
echo "=== @sharpee/core ==="
find packages/core/src -name "*.ts" -type f | while read file; do
    if grep -q "IEntity\|IAction\|IParser\|ICommand" "$file" 2>/dev/null; then
        echo "  - $file"
    fi
done

echo ""
echo "=== @sharpee/world-model ==="
find packages/world-model/src -name "*.ts" -type f | while read file; do
    if grep -q "IWorldModel\|IFEntity" "$file" 2>/dev/null; then
        echo "  - $file"
    fi
done

echo ""
echo "=== @sharpee/stdlib ==="
find packages/stdlib/src -name "*.ts" -type f | while read file; do
    if grep -q "IEntity\|IAction\|ICommand" "$file" 2>/dev/null; then
        echo "  - $file"
    fi
done

echo ""
echo "=== @sharpee/actions ==="
find packages/actions/src -name "*.ts" -type f | while read file; do
    if grep -q "IEntity\|IAction" "$file" 2>/dev/null; then
        echo "  - $file"
    fi
done
