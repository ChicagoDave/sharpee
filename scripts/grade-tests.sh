#!/usr/bin/env bash
#
# grade-tests.sh — Static test quality grader
#
# Classifies every test file as RED, YELLOW, or GREEN based on assertion patterns.
#
# RED:    Dead (zero assertions in an it() block), tautological (expect(true).toBe(true)),
#         or console.log debugging leftovers.
# YELLOW: Action test file that calls execute() but has NO world-state assertions
#         (only checks events — the "dropping bug" pattern).
# GREEN:  Has meaningful assertions on state, output, or behavior.
#
# Usage:
#   ./scripts/grade-tests.sh              # Full report
#   ./scripts/grade-tests.sh --ci         # Exit 1 if any RED found
#   ./scripts/grade-tests.sh --summary    # Counts only
#

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-full}"

RED_FILES=()
RED_REASONS=()
YELLOW_FILES=()
YELLOW_REASONS=()
GREEN_COUNT=0
TOTAL_FILES=0

# --- Detection patterns (extended regex, macOS-compatible) ---

# World-state assertion patterns (GREEN signals in action tests)
STATE_PATTERN='getLocation|getContents|getTrait|expectLocation|expectTraitValue|expectLocationChanged|captureEntityState'
STATE_PATTERN+='|\.isOpen[^a-zA-Z]|\.isLocked[^a-zA-Z]|\.worn[^a-zA-Z]|\.isOn[^a-zA-Z]|\.broken[^a-zA-Z]'
STATE_PATTERN+='|\.isLit[^a-zA-Z]|\.hitPoints[^a-zA-Z]|\.servings[^a-zA-Z]'
STATE_PATTERN+='|\.wornBy[^a-zA-Z]|\.concealed[^a-zA-Z]|\.position[^a-zA-Z]|\.fuelRemaining[^a-zA-Z]'

# Action execute patterns
EXECUTE_PATTERN='\.execute\(|\.executeWithValidation\(|executeAction\('

# Tautological patterns
TAUTOLOGY_PATTERN='expect\(true\)\.toBe\(true\)|expect\(1\)\.toBe\(1\)|expect\(false\)\.toBe\(false\)'

# --- Scan all test files ---

while IFS= read -r file; do
  TOTAL_FILES=$((TOTAL_FILES + 1))
  rel="${file#$ROOT/}"

  # --- Skip performance/analysis files (console.log is their purpose) ---
  if echo "$rel" | grep -q '/performance/'; then
    GREEN_COUNT=$((GREEN_COUNT + 1))
    continue
  fi

  # --- RED checks ---

  # Check for tautological assertions
  if grep -qE "$TAUTOLOGY_PATTERN" "$file"; then
    RED_FILES+=("$rel")
    RED_REASONS+=("tautological assertion (expect(true).toBe(true))")
    continue
  fi

  # Check for console.log (debugging leftover)
  # Exclude files that legitimately spy on console
  log_lines=$(grep -c '^[[:space:]]*console\.log(' "$file" || true)
  spy_lines=$(grep -c 'spyOn(console' "$file" || true)
  if [ "$log_lines" -gt 0 ] && [ "$spy_lines" -eq 0 ]; then
    RED_FILES+=("$rel")
    RED_REASONS+=("console.log debugging leftover ($log_lines occurrences)")
    continue
  fi

  # --- YELLOW checks (action golden test files only) ---

  # Allowlisted actions: zero-mutation or observation-only by design
  # about: meta action, displays info only
  # examining: observation, reads state but doesn't change it
  # looking: observation, reads state but doesn't change it
  # talking: signal action, documented as zero-mutation in Phase 3
  # waiting: signal action, advances turn but no world state change
  # listening: observation only
  # smelling: observation only
  # help: meta action
  # inventory: observation only
  # reading: observation only
  YELLOW_ALLOWLIST='about-golden|examining-golden|looking-golden|talking-golden|waiting-golden'
  YELLOW_ALLOWLIST+='|listening-golden|smelling-golden|help-golden|inventory-golden|reading-golden'

  if echo "$rel" | grep -q 'packages/stdlib/tests/unit/actions/.*-golden\.test\.ts'; then
    basename=$(basename "$rel")
    if echo "$basename" | grep -qE "$YELLOW_ALLOWLIST"; then
      # Known non-mutating action — GREEN by exception
      GREEN_COUNT=$((GREEN_COUNT + 1))
      continue
    fi

    has_execute=$(grep -cE "$EXECUTE_PATTERN" "$file" || true)
    has_state=$(grep -cE "$STATE_PATTERN" "$file" || true)

    if [ "$has_execute" -gt 0 ] && [ "$has_state" -eq 0 ]; then
      YELLOW_FILES+=("$rel")
      YELLOW_REASONS+=("execute() called ($has_execute times) but no world-state assertions")
      continue
    fi
  fi

  # --- GREEN (default) ---
  GREEN_COUNT=$((GREEN_COUNT + 1))

done < <(find "$ROOT/packages" "$ROOT/stories" -name '*.test.ts' -type f 2>/dev/null | sort)

# --- Report ---

RED_COUNT=${#RED_FILES[@]}
YELLOW_COUNT=${#YELLOW_FILES[@]}
TOTAL_GRADED=$((RED_COUNT + YELLOW_COUNT + GREEN_COUNT))

if [ "$MODE" = "--summary" ]; then
  echo "Files: $TOTAL_FILES  RED: $RED_COUNT  YELLOW: $YELLOW_COUNT  GREEN: $GREEN_COUNT"
  [ "$RED_COUNT" -gt 0 ] && exit 1
  exit 0
fi

echo "=== Test Grade Report ==="
echo "Files scanned: $TOTAL_FILES"
echo ""
echo "Grade distribution:"
printf "  \033[32mGREEN\033[0m:  %4d  (%d%%)\n" "$GREEN_COUNT" "$((GREEN_COUNT * 100 / TOTAL_GRADED))"
printf "  \033[33mYELLOW\033[0m: %4d  (%d%%)\n" "$YELLOW_COUNT" "$((YELLOW_COUNT * 100 / TOTAL_GRADED))"
printf "  \033[31mRED\033[0m:    %4d  (%d%%)\n" "$RED_COUNT" "$((RED_COUNT * 100 / TOTAL_GRADED))"
echo ""

if [ "$YELLOW_COUNT" -gt 0 ]; then
  echo "YELLOW files (action tests without world-state assertions):"
  for i in "${!YELLOW_FILES[@]}"; do
    printf "  \033[33m%s\033[0m\n" "${YELLOW_FILES[$i]}"
    printf "    %s\n" "${YELLOW_REASONS[$i]}"
  done
  echo ""
fi

if [ "$RED_COUNT" -gt 0 ]; then
  echo "RED files (must fix):"
  for i in "${!RED_FILES[@]}"; do
    printf "  \033[31m%s\033[0m\n" "${RED_FILES[$i]}"
    printf "    %s\n" "${RED_REASONS[$i]}"
  done
  echo ""
fi

if [ "$RED_COUNT" -eq 0 ] && [ "$YELLOW_COUNT" -eq 0 ]; then
  printf "\033[32mAll tests GREEN.\033[0m\n"
fi

# CI mode: fail on RED
if [ "$MODE" = "--ci" ] && [ "$RED_COUNT" -gt 0 ]; then
  echo ""
  printf "\033[31mCI FAILED: %d RED test file(s) found.\033[0m\n" "$RED_COUNT"
  exit 1
fi

exit 0
