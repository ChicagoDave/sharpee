#!/bin/bash
# PostToolUse hook - incrementally log work for auto-compact resilience

WORK_LOG="docs/context/.work-log.txt"
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
TODAY=$(date +%Y%m%d)

# Ensure log directory exists
mkdir -p "$(dirname "$WORK_LOG")"

# Read hook input from stdin
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // {}')
TOOL_RESPONSE=$(echo "$INPUT" | jq -r '.tool_response // {}')

# Get timestamp for logging
TIMESTAMP=$(date +%H:%M:%S)

case "$TOOL_NAME" in
  Edit)
    FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // ""')
    SUCCESS=$(echo "$TOOL_RESPONSE" | jq -r '.success // false')
    if [ "$SUCCESS" = "true" ] && [ -n "$FILE_PATH" ]; then
      # Get relative path for cleaner logs
      REL_PATH="${FILE_PATH#$(pwd)/}"
      echo "[$TIMESTAMP] EDIT: $REL_PATH" >> "$WORK_LOG"
    fi
    ;;

  Write)
    FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // ""')
    SUCCESS=$(echo "$TOOL_RESPONSE" | jq -r '.success // false')
    if [ "$SUCCESS" = "true" ] && [ -n "$FILE_PATH" ]; then
      REL_PATH="${FILE_PATH#$(pwd)/}"
      echo "[$TIMESTAMP] WRITE: $REL_PATH" >> "$WORK_LOG"
    fi
    ;;

  Bash)
    COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // ""' | head -c 200)
    EXIT_CODE=$(echo "$TOOL_RESPONSE" | jq -r '.exitCode // -1')

    # Log significant commands: tests, builds, git operations
    if [[ "$COMMAND" =~ (pnpm|npm|yarn).*(test|build) ]]; then
      if [ "$EXIT_CODE" = "0" ]; then
        echo "[$TIMESTAMP] TEST/BUILD PASS: ${COMMAND:0:80}" >> "$WORK_LOG"
      else
        echo "[$TIMESTAMP] TEST/BUILD FAIL (exit $EXIT_CODE): ${COMMAND:0:80}" >> "$WORK_LOG"
      fi
    elif [[ "$COMMAND" =~ git.*(commit|push|merge) ]]; then
      echo "[$TIMESTAMP] GIT: ${COMMAND:0:80}" >> "$WORK_LOG"
    elif [[ "$COMMAND" =~ transcript-tester ]]; then
      if [ "$EXIT_CODE" = "0" ]; then
        echo "[$TIMESTAMP] TRANSCRIPT PASS: ${COMMAND:0:80}" >> "$WORK_LOG"
      else
        echo "[$TIMESTAMP] TRANSCRIPT FAIL: ${COMMAND:0:80}" >> "$WORK_LOG"
      fi
    fi
    ;;
esac

# Keep work log from growing too large - keep last 100 lines
if [ -f "$WORK_LOG" ]; then
  LINES=$(wc -l < "$WORK_LOG")
  if [ "$LINES" -gt 100 ]; then
    tail -50 "$WORK_LOG" > "${WORK_LOG}.tmp" && mv "${WORK_LOG}.tmp" "$WORK_LOG"
  fi
fi

exit 0
