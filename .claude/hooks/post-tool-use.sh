#!/bin/bash
# PostToolUse hook - incrementally log work for auto-compact resilience

WORK_LOG="docs/context/.work-log.txt"
TODAY=$(date +%Y%m%d)
TIMESTAMP=$(date +%H:%M:%S)

# Ensure log directory exists
mkdir -p "$(dirname "$WORK_LOG")"

# Read hook input from stdin
INPUT=$(cat)

# Extract tool name directly
TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)
if [ -z "$TOOL_NAME" ]; then
  exit 0
fi

case "$TOOL_NAME" in
  Edit)
    FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
    if [ -n "$FILE_PATH" ]; then
      REL_PATH="${FILE_PATH#$(pwd)/}"
      echo "[$TIMESTAMP] EDIT: $REL_PATH" >> "$WORK_LOG"
    fi
    ;;

  Write)
    FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
    if [ -n "$FILE_PATH" ]; then
      REL_PATH="${FILE_PATH#$(pwd)/}"
      echo "[$TIMESTAMP] WRITE: $REL_PATH" >> "$WORK_LOG"
    fi
    ;;

  Bash)
    COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null | head -c 200)
    EXIT_CODE=$(printf '%s' "$INPUT" | jq -r '.tool_response.exitCode // -1' 2>/dev/null)

    # Log significant commands: tests, builds, git operations
    if [[ "$COMMAND" =~ (pnpm|npm|yarn).*(test|build) ]] || [[ "$COMMAND" =~ build\.sh ]]; then
      if [ "$EXIT_CODE" = "0" ]; then
        echo "[$TIMESTAMP] BUILD PASS: ${COMMAND:0:80}" >> "$WORK_LOG"
      else
        echo "[$TIMESTAMP] BUILD FAIL (exit $EXIT_CODE): ${COMMAND:0:80}" >> "$WORK_LOG"
      fi
    elif [[ "$COMMAND" =~ git.*(commit|push|merge) ]]; then
      echo "[$TIMESTAMP] GIT: ${COMMAND:0:80}" >> "$WORK_LOG"
    elif [[ "$COMMAND" =~ sharpee\.js.*--test ]] || [[ "$COMMAND" =~ transcript-tester ]]; then
      if [ "$EXIT_CODE" = "0" ]; then
        echo "[$TIMESTAMP] TEST PASS: ${COMMAND:0:80}" >> "$WORK_LOG"
      else
        echo "[$TIMESTAMP] TEST FAIL: ${COMMAND:0:80}" >> "$WORK_LOG"
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
