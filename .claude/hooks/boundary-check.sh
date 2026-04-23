#!/bin/bash
# ----------------------------------------------------------------------------
# boundary-check.sh — PreToolUse hook for Edit|Write
# ----------------------------------------------------------------------------
# Reminds the model to produce a "Boundary Statement" before modifying files
# that own cross-boundary state (reducers, state projections, store, domain
# modules, selectors). The smell this catches: lifting per-browser UI state
# into a server-projection reducer because the active phase happens to need
# it. The header comments on those modules typically document a contract
# (e.g., "no React types in state/") that quiet field additions can break.
#
# Advisory, not blocking. Exits 0 in all cases. Emits a NOTICE on stderr
# when a triggering path is matched; Claude Code surfaces stderr from
# PreToolUse hooks as additional context to the model.
#
# Match rules (any of):
#   - path contains /state/        (state projections)
#   - path contains /store/        (Redux/Pinia/Vuex-style stores)
#   - path contains /domain/       (DDD bounded-context modules)
#   - path contains /selectors     (selector layer next to state)
#   - basename matches *reducer*   (any reducer file)
#   - basename matches *projection* (any projection module)
#
# Skips test files (.test.ts, .spec.ts, /tests/, /__tests__/) — tests
# inspect boundaries; they don't define them.
#
# ----------------------------------------------------------------------------
# [DEVARCH-CANDIDATE] This hook is generic — no Sharpee-specific paths or
# vocabulary. Promote to ~/.claude/hooks/boundary-check.sh and register
# user-level when the pattern is validated across more projects.
# ----------------------------------------------------------------------------

INPUT=$(cat)

TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)
case "$TOOL_NAME" in
  Edit|Write) ;;
  *) exit 0 ;;
esac

FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
[ -z "$FILE_PATH" ] && exit 0

# Skip test files — boundary checks govern production modules.
case "$FILE_PATH" in
  *.test.ts|*.test.tsx|*.test.js|*.test.jsx) exit 0 ;;
  *.spec.ts|*.spec.tsx|*.spec.js|*.spec.jsx) exit 0 ;;
  */tests/*|*/__tests__/*) exit 0 ;;
esac

BASENAME=$(basename "$FILE_PATH")
BASENAME_LOWER=$(printf '%s' "$BASENAME" | tr '[:upper:]' '[:lower:]')

MATCH=""
case "$FILE_PATH" in
  */state/*)     MATCH="path contains /state/ — state projection module" ;;
  */store/*)     MATCH="path contains /store/ — central store module" ;;
  */domain/*)    MATCH="path contains /domain/ — DDD bounded-context module" ;;
  */selectors*)  MATCH="path contains /selectors — selector layer over state" ;;
esac

if [ -z "$MATCH" ]; then
  case "$BASENAME_LOWER" in
    *reducer*)    MATCH="filename matches *reducer* — reducer module" ;;
    *projection*) MATCH="filename matches *projection* — projection module" ;;
  esac
fi

[ -z "$MATCH" ] && exit 0

cat >&2 <<EOF
[Boundary check] $FILE_PATH
  Matched: $MATCH

  Before this Edit/Write, produce a Boundary Statement covering the field
  or behavior you are about to add or change:

    OWNER:        which layer owns this? (server, browser/per-render,
                  bounded context, etc.)
    SHARED?:      would two consumers in the same context legitimately
                  disagree on this value? (If yes, it is per-consumer
                  state and likely belongs OUT of this module.)
    PROMISE:      does the module's header doc or its existing types
                  make a promise this change would break? (Quote it.)
    ALTERNATIVES: what is the smallest place this could live instead,
                  and why is THIS module still the right home?

  If any answer is fuzzy, stop and discuss the design before editing.

  (To bypass for an obvious case — typo, comment, formatting only —
  proceed; the hook is advisory.)
EOF

exit 0
