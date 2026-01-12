#!/bin/bash
# PreCompact hook - finalize session summary before context wipe

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
TODAY=$(date +%Y%m%d)
SESSION_PATTERN="docs/context/session-${TODAY}-*-${BRANCH}.md"
SESSION_FILE=$(ls -t $SESSION_PATTERN 2>/dev/null | head -1)
WORK_LOG="docs/context/.work-log.txt"

# If we have a work log, append it to the session summary
if [ -f "$WORK_LOG" ] && [ -s "$WORK_LOG" ]; then
  if [ -n "$SESSION_FILE" ]; then
    echo "" >> "$SESSION_FILE"
    echo "## Work Log (auto-captured)" >> "$SESSION_FILE"
    echo '```' >> "$SESSION_FILE"
    cat "$WORK_LOG" >> "$SESSION_FILE"
    echo '```' >> "$SESSION_FILE"
    echo "[Appended work log to session summary]"

    # Clear the work log after incorporating
    > "$WORK_LOG"
  else
    # No session file, just show the work log
    echo "[Work log captured (no session file to append to):]"
    cat "$WORK_LOG"
  fi
fi

if [ -n "$SESSION_FILE" ]; then
  echo "[Session summary updated: $SESSION_FILE]"
  echo "[Review and finalize before compact if needed]"
else
  echo "[No session summary found. Consider creating one in docs/context/ before compacting.]"
fi

exit 0
