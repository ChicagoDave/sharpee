#!/bin/bash
# Stop hook - remind to update session summary when context is growing

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
TODAY=$(date +%Y%m%d)
SESSION_PATTERN="docs/context/session-${TODAY}-*-${BRANCH}.md"

# Check transcript size
if [ -n "$CLAUDE_TRANSCRIPT_PATH" ] && [ -f "$CLAUDE_TRANSCRIPT_PATH" ]; then
  TRANSCRIPT_SIZE=$(wc -c < "$CLAUDE_TRANSCRIPT_PATH" 2>/dev/null || echo 0)

  # Only remind when transcript > 400KB
  if (( TRANSCRIPT_SIZE > 400000 )); then
    SESSION_FILE=$(ls -t $SESSION_PATTERN 2>/dev/null | head -1)
    if [ -n "$SESSION_FILE" ]; then
      echo "[Context is large ($(( TRANSCRIPT_SIZE / 1024 ))KB). Update session summary: $SESSION_FILE]"
    else
      echo "[Context is large. Create a session summary in docs/context/]"
    fi
  fi
fi

exit 0
