#!/usr/bin/env bash
#
# prune-devarch-runtime.sh — apply a retention rule to DevArch's per-session
# runtime state in docs/context/.
#
# Purpose:
#   docs/context/ is the committed home of session summaries, ADR-adjacent
#   context, and the project profile. DevArch's hooks also write four families
#   of gitignored per-session runtime files there, and nothing in DevArch ever
#   removes them, so the directory grows monotonically until the summaries that
#   are its actual point are buried. This script bounds that growth.
#
# Public interface:
#   prune-devarch-runtime.sh [--apply] [--keep N] [--help]
#     --apply    Actually delete. Without it the script is a dry run: it prints
#                exactly what it would remove and exits without touching disk.
#     --keep N   Retain the N most recently active session ids (default 20).
#
#   Exit 0 on success (including "nothing to prune"), 1 on bad usage or if the
#   repository root cannot be resolved.
#
# What it will and will not touch:
#   Selects ONLY files matching the four runtime patterns below, each carrying a
#   hex session id. Committed content in docs/context/ — session-*.md,
#   project-profile.md, plan.md, README.md — cannot match, nor can the two
#   singleton pointers .active-session and .current-plan, which are not
#   per-session and never accumulate.
#
#     .devarch-events-{id}.jsonl     .session-state-{id}.json
#     .devarch-gate-{id}             .devarch-gate-blocks-{id}
#
#   The id named by .active-session is retained unconditionally, whatever its
#   rank: a session mid-flight depends on those files existing at the path its
#   hooks expect.
#
#   A file that git TRACKS is never deleted, only reported. The .gitignore
#   patterns do not make this redundant: gitignore has no effect on files
#   already committed, and two event logs turn out to predate the rule
#   (55c5bc06). Deleting one would be a real deletion from the repository, not
#   the removal of scratch state, so the script refuses and leaves the call to
#   a human.
#
# Owner context: repository tooling. DevArch's own hooks (~/.devarch/hooks/)
#   hardcode docs/context/ as the runtime directory and are overwritten on
#   `devarch update`, so retention belongs here rather than upstream.
#
set -euo pipefail

KEEP=20
APPLY=0

# Print the header comment block as help, so the two can never disagree. Reads
# from line 3 (past the shebang) to the first line that is not a comment.
usage() {
  awk 'NR<3 {next} /^#/ {sub(/^# ?/, ""); print; next} {exit}' "$0"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --apply) APPLY=1; shift ;;
    --keep)
      shift
      [ $# -gt 0 ] || { echo "prune-devarch-runtime: --keep needs a value" >&2; exit 1; }
      KEEP="$1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "prune-devarch-runtime: unknown argument '$1'" >&2; exit 1 ;;
  esac
done

case "$KEEP" in
  ''|*[!0-9]*) echo "prune-devarch-runtime: --keep must be a positive integer" >&2; exit 1 ;;
esac
[ "$KEEP" -gt 0 ] || { echo "prune-devarch-runtime: --keep must be a positive integer" >&2; exit 1; }

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "prune-devarch-runtime: not inside a git repository" >&2; exit 1
}
CTX="$REPO_ROOT/docs/context"
[ -d "$CTX" ] || { echo "prune-devarch-runtime: no $CTX — nothing to do"; exit 0; }

cd "$CTX"

# The four runtime families, newest first. `ls -At` orders by mtime and the grep
# is the only thing that decides eligibility — a name that does not match here
# is structurally unreachable by the rest of the script.
RUNTIME_RE='^\.(devarch-events-[0-9a-f]+\.jsonl|session-state-[0-9a-f]+\.json|devarch-gate-(blocks-)?[0-9a-f]+)$'

files=$(ls -At 2>/dev/null | grep -E "$RUNTIME_RE" || true)
if [ -z "$files" ]; then
  echo "prune-devarch-runtime: no runtime files in docs/context/ — nothing to do"
  exit 0
fi

# Session ids ranked by most recent activity. The blocks- rule must precede the
# bare gate rule, or .devarch-gate-blocks-{id} would yield "blocks-{id}".
ranked=$(printf '%s\n' "$files" | sed \
  -e 's/^\.devarch-events-\(.*\)\.jsonl$/\1/' \
  -e 's/^\.session-state-\(.*\)\.json$/\1/' \
  -e 's/^\.devarch-gate-blocks-\(.*\)$/\1/' \
  -e 's/^\.devarch-gate-\(.*\)$/\1/' \
  | awk '!seen[$0]++')

active=""
[ -f .active-session ] && active=$(tr -d '[:space:]' < .active-session)

keep_ids=$(printf '%s\n' "$ranked" | head -n "$KEEP")
[ -n "$active" ] && keep_ids=$(printf '%s\n%s\n' "$keep_ids" "$active" | awk 'NF && !seen[$0]++')

total_ids=$(printf '%s\n' "$ranked" | wc -l | tr -d ' ')
kept_ids=$(printf '%s\n' "$keep_ids" | wc -l | tr -d ' ')

# Files git already tracks, relative to docs/context/. Gitignore does not cover
# these — it never applied to what was committed before the rule existed.
tracked=$(git ls-files -- . 2>/dev/null || true)

removed=0
skipped=0
for id in $ranked; do
  if printf '%s\n' "$keep_ids" | grep -qx "$id"; then
    continue
  fi
  for f in ".devarch-events-$id.jsonl" ".session-state-$id.json" \
           ".devarch-gate-$id" ".devarch-gate-blocks-$id"; do
    [ -e "$f" ] || continue
    if printf '%s\n' "$tracked" | grep -qx "$f"; then
      echo "SKIPPED (tracked by git)  $f"
      skipped=$((skipped + 1))
      continue
    fi
    if [ "$APPLY" -eq 1 ]; then
      rm -f "$f"
      echo "removed  $f"
    else
      echo "would remove  $f"
    fi
    removed=$((removed + 1))
  done
done

echo
if [ "$APPLY" -eq 1 ]; then
  echo "prune-devarch-runtime: removed $removed file(s); retained $kept_ids of $total_ids session id(s)${active:+, including active session $active}"
else
  echo "prune-devarch-runtime: dry run — $removed file(s) would be removed; $kept_ids of $total_ids session id(s) would be retained${active:+, including active session $active}"
  echo "prune-devarch-runtime: re-run with --apply to delete."
fi
if [ "$skipped" -gt 0 ]; then
  echo "prune-devarch-runtime: $skipped file(s) left alone because git tracks them — deleting those is a human's call, not this script's."
fi
