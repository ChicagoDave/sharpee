#!/bin/bash

# Script to carefully add I-prefix to interfaces in @sharpee/core package
# This version is more careful about what it changes

echo "Starting careful interface refactoring for @sharpee/core"

# Function to update a single file
update_file() {
    local file="$1"
    echo "Updating: $file"
    
    # Create backup
    cp "$file" "${file}.bak"
    
    # Update interface declarations
    sed -i 's/export interface \(SystemEvent\)\b/export interface I\1/g' "$file"
    sed -i 's/export interface \(GameEvent\)\b/export interface I\1/g' "$file"
    sed -i 's/export interface \(PlatformEvent\)\b/export interface I\1/g' "$file"
    sed -i 's/export interface \(SaveContext\)\b/export interface I\1/g' "$file"
    sed -i 's/export interface \(RestoreContext\)\b/export interface I\1/g' "$file"
    
    # Update type references that are clearly interfaces
    sed -i 's/: \(SemanticEvent\)\b/: I\1/g' "$file"
    sed -i 's/: \(SystemEvent\)\b/: I\1/g' "$file"
    sed -i 's/: \(GameEvent\)\b/: I\1/g' "$file"
    sed -i 's/: \(PlatformEvent\)\b/: I\1/g' "$file"
    sed -i 's/: \(SaveContext\)\b/: I\1/g' "$file"
    sed -i 's/: \(RestoreContext\)\b/: I\1/g' "$file"
    sed -i 's/: \(QuitContext\)\b/: I\1/g' "$file"
    sed -i 's/: \(RestartContext\)\b/: I\1/g' "$file"
    sed -i 's/: \(EventEmitter\)\b/: I\1/g' "$file"
    sed -i 's/: \(EventSystemOptions\)\b/: I\1/g' "$file"
    
    # Update extends clauses
    sed -i 's/extends \(SemanticEvent\)\b/extends I\1/g' "$file"
    sed -i 's/extends \(SystemEvent\)\b/extends I\1/g' "$file"
    sed -i 's/extends \(GameEvent\)\b/extends I\1/g' "$file"
    sed -i 's/extends \(PlatformEvent\)\b/extends I\1/g' "$file"
    sed -i 's/extends \(GenericEventSource\)\b/extends I\1/g' "$file"
    sed -i 's/extends \(SemanticEventSource\)\b/extends I\1/g' "$file"
    
    # Update implements clauses
    sed -i 's/implements \(EventEmitter\)\b/implements I\1/g' "$file"
    sed -i 's/implements \(GenericEventSource\)\b/implements I\1/g' "$file"
    sed -i 's/implements \(SemanticEventSource\)\b/implements I\1/g' "$file"
    
    # Update function parameters
    sed -i 's/(event: \(SemanticEvent\)\b/(event: I\1/g' "$file"
    sed -i 's/(event: \(SystemEvent\)\b/(event: I\1/g' "$file"
    sed -i 's/(event: \(GameEvent\)\b/(event: I\1/g' "$file"
    sed -i 's/(event: \(PlatformEvent\)\b/(event: I\1/g' "$file"
    sed -i 's/(context: \(SaveContext\)\b/(context: I\1/g' "$file"
    sed -i 's/(context: \(RestoreContext\)\b/(context: I\1/g' "$file"
    sed -i 's/(context: \(QuitContext\)\b/(context: I\1/g' "$file"
    sed -i 's/(context: \(RestartContext\)\b/(context: I\1/g' "$file"
    
    # Update array types
    sed -i 's/\(SemanticEvent\)\[\]/I\1[]/g' "$file"
    sed -i 's/\(SystemEvent\)\[\]/I\1[]/g' "$file"
    sed -i 's/\(GameEvent\)\[\]/I\1[]/g' "$file"
    sed -i 's/\(PlatformEvent\)\[\]/I\1[]/g' "$file"
    
    # Update generic type parameters
    sed -i 's/<\(SemanticEvent\)>/<I\1>/g' "$file"
    sed -i 's/<\(SystemEvent\)>/<I\1>/g' "$file"
    sed -i 's/<\(GameEvent\)>/<I\1>/g' "$file"
    sed -i 's/<\(PlatformEvent\)>/<I\1>/g' "$file"
    sed -i 's/<\(EventEmitter\)>/<I\1>/g' "$file"
    
    # Update import statements
    sed -i "s/import { \(SemanticEvent\)\b/import { I\1/g" "$file"
    sed -i "s/import { \(EventEmitter\)\b/import { I\1/g" "$file"
    sed -i "s/import { \(GenericEventSource\)\b/import { I\1/g" "$file"
    sed -i "s/import { \(SemanticEventSource\)\b/import { I\1/g" "$file"
    sed -i "s/import { \(SaveContext\), \(RestoreContext\)\b/import { I\1, I\2/g" "$file"
    sed -i "s/import { \(QuitContext\), \(RestartContext\)\b/import { I\1, I\2/g" "$file"
    
    # Fix double I-prefix
    sed -i 's/II\([A-Z]\)/I\1/g' "$file"
    
    # Remove backup if successful
    rm "${file}.bak"
}

# Update event files
update_file "packages/core/src/events/system-event.ts"
update_file "packages/core/src/events/game-events.ts"
update_file "packages/core/src/events/platform-events.ts"
update_file "packages/core/src/events/event-system.ts"

echo "Event files updated. Please review and test."