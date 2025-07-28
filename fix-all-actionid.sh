#!/bin/bash

# Fix all actions that use this.id instead of context.action.id
echo "Fixing all this.id references in stdlib actions..."

# List of files with this.id issues
files=(
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/again/again.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/attacking/attacking.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/drinking/drinking.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/dropping/dropping.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/eating/eating.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/entering/entering.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/exiting/exiting.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/inserting/inserting.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/inventory/inventory.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/listening/listening.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/looking/looking.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/pulling/pulling.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/pushing/pushing.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/putting/putting.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/quitting/quitting.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/removing/removing.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/restarting/restarting.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/restoring/restoring.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/saving/saving.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/scoring/scoring.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/showing/showing.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/sleeping/sleeping.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/smelling/smelling.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/switching_off/switching_off.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/switching_on/switching_on.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/taking_off/taking-off.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/talking/talking.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/throwing/throwing.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/touching/touching.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/turning/turning.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/waiting/waiting.ts"
    "/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/wearing/wearing.ts"
)

# Fix each file
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing: $file"
        # Count occurrences before
        before=$(grep -c "actionId: this\.id," "$file" 2>/dev/null || echo "0")
        
        # Perform replacement
        sed -i 's/actionId: this\.id,/actionId: context.action.id,/g' "$file"
        
        # Count occurrences after
        after=$(grep -c "actionId: context\.action\.id," "$file" 2>/dev/null || echo "0")
        
        echo "  Fixed $before instances -> $after instances"
    else
        echo "File not found: $file"
    fi
done

echo "All files processed!"