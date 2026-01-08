#!/bin/bash
# SessionStart hook - create session summary for each new session

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
TODAY=$(date +%Y%m%d)
TIME=$(date +%H%M)
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
SESSION_DIR="docs/context"
SESSION_FILE="${SESSION_DIR}/session-${TODAY}-${TIME}-${BRANCH}.md"
TEMPLATE="${SESSION_DIR}/.session-template.md"

# Determine trigger type from stdin (SessionStart provides JSON input)
TRIGGER=$(cat | jq -r '.type // "startup"' 2>/dev/null || echo "startup")

case "$TRIGGER" in
  resume|continue)
    # After resume, find most recent session file to continue updating
    LATEST=$(ls -t ${SESSION_DIR}/session-${TODAY}-*-${BRANCH}.md 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
      echo "[Resuming session. Continue updating: $LATEST]"
    else
      echo "[Resumed but no session file found today. Consider creating one.]"
    fi
    ;;
  compact)
    # After compact, find most recent session file
    LATEST=$(ls -t ${SESSION_DIR}/session-${TODAY}-*-${BRANCH}.md 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
      echo "[Post-compact. Continue updating: $LATEST]"
    fi
    ;;
  startup|clear|*)
    # New session - always create a new file
    if [ -f "$TEMPLATE" ]; then
      sed -e "s/{{DATE}}/${TODAY}/g" \
          -e "s/{{BRANCH}}/${BRANCH}/g" \
          -e "s/{{TIMESTAMP}}/${TIMESTAMP}/g" \
          "$TEMPLATE" > "$SESSION_FILE"
      echo "[Created session summary: $SESSION_FILE]"
    else
      echo "[No session template found at $TEMPLATE]"
    fi
    ;;
esac

exit 0
