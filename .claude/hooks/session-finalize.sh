#!/bin/bash
# PreCompact hook - finalize session summary before context wipe

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
TODAY=$(date +%Y%m%d)
SESSION_PATTERN="docs/context/session-${TODAY}-*-${BRANCH}.md"
SESSION_FILE=$(ls -t $SESSION_PATTERN 2>/dev/null | head -1)

if [ -n "$SESSION_FILE" ]; then
  echo "[IMPORTANT: Finalize session summary before compact: $SESSION_FILE"
  echo " - Update Status to 'Paused' or 'Complete'"
  echo " - Fill in Completed, Key Decisions, Files Modified"
  echo " - Add any Open Items for next session]"
else
  echo "[No session summary found. Consider creating one in docs/context/ before compacting.]"
fi

exit 0
