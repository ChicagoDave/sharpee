#!/bin/bash

# Update all actions with error handling in report() method

echo "Updating all actions with error handling..."

# List of actions to update (excluding looking and examining which are done)
ACTIONS=(
  "going"
  "taking"
  "dropping"
  "opening"
  "closing"
  "putting"
  "inserting"
  "removing"
)

for action in "${ACTIONS[@]}"; do
  FILE="packages/stdlib/src/actions/standard/$action/$action.ts"
  
  echo "Processing $action..."
  
  # First, update the report signature if needed
  sed -i 's/report(context: ActionContext): ISemanticEvent\[\]/report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[]/' "$FILE"
  
  # Add error handling at the start of report method
  # We need to find the first line after "report(" and insert our error handling
  
  # Create a temporary file with the error handling code
  cat > /tmp/error_handling.txt << 'EOF'
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: validationResult.params || {}
        })
      ];
    }
    
    // Handle execution errors
    if (executionError) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: 'execution_failed',
          messageId: 'action_failed',
          params: {
            error: executionError.message
          }
        })
      ];
    }
    
EOF

  # Use awk to insert the error handling after the report function signature
  awk '
    /report\(context: ActionContext, validationResult\?: ValidationResult, executionError\?: Error\): ISemanticEvent\[\] \{/ {
      print
      while ((getline line < "/tmp/error_handling.txt") > 0) {
        print line
      }
      close("/tmp/error_handling.txt")
      next
    }
    { print }
  ' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
  
  echo "  ✓ Updated $action"
done

# Clean up
rm -f /tmp/error_handling.txt

echo "All actions updated with error handling!"