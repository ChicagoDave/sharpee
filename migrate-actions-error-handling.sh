#!/bin/bash

# Phase 3.5: Migrate all actions to handle their own error events
# This script updates the report() method signature for all migrated actions

echo "Phase 3.5: Migrating actions to handle their own error events"
echo "============================================================="

# List of actions to migrate (already have the three-phase pattern)
ACTIONS=(
  "looking"
  "examining"
  "going"
  "taking"
  "dropping"
  "opening"
  "closing"
  "putting"
  "inserting"
  "removing"
)

# Base path for actions
ACTION_PATH="packages/stdlib/src/actions/standard"

for action in "${ACTIONS[@]}"; do
  FILE="$ACTION_PATH/$action/$action.ts"
  
  if [ -f "$FILE" ]; then
    echo "Processing $action..."
    
    # Check if already has the new signature
    if grep -q "report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error)" "$FILE"; then
      echo "  ✓ Already migrated"
    else
      echo "  → Updating report() signature"
      
      # Update the report method signature
      # Note: We already did looking manually, so it will show as already migrated
      sed -i 's/report(context: ActionContext): ISemanticEvent\[\]/report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[]/' "$FILE"
      
      # Add error handling at the start of report method
      # This is more complex and needs to be done per action based on its specific needs
      echo "  → Manual error handling needed for $action"
    fi
  else
    echo "Warning: $FILE not found"
  fi
done

echo ""
echo "Migration complete! Next steps:"
echo "1. Manually add error handling logic to each action's report() method"
echo "2. Update tests to verify error event creation"
echo "3. Test with the refactored CommandExecutor"