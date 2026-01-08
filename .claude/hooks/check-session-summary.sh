#!/bin/bash
# Check if session summary exists and show reminder if transcript is getting large

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
TODAY=$(date +%Y%m%d)
SESSION_PATTERN="docs/context/session-${TODAY}-*-${BRANCH}.md"

# Check transcript size (rough proxy for context usage)
if [ -n "$CLAUDE_TRANSCRIPT_PATH" ] && [ -f "$CLAUDE_TRANSCRIPT_PATH" ]; then
  TRANSCRIPT_SIZE=$(wc -c < "$CLAUDE_TRANSCRIPT_PATH" 2>/dev/null || echo 0)

  # If transcript > 400KB, remind about session summary
  if (( TRANSCRIPT_SIZE > 400000 )); then
    SESSION_FILE=$(ls -t $SESSION_PATTERN 2>/dev/null | head -1)
    if [ -n "$SESSION_FILE" ]; then
      echo "[Context growing - consider updating session summary: $SESSION_FILE]"
    else
      echo "[Context growing - no session summary found. Consider starting one in docs/context/]"
    fi
  fi
fi

exit 0
