#!/bin/bash
# Run all transcript tests, emitting each to its own timestamped log file
# Usage: ./scripts/run-transcripts.sh [transcript-name]
# If transcript-name is provided, only runs that transcript
#
# FAST MODE: Runs all transcripts in a single node process and splits output

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TRANSCRIPT_DIR="$PROJECT_ROOT/stories/dungeo/tests/transcripts"
LOG_DIR="$PROJECT_ROOT/logs"
RESULTS_DIR="$PROJECT_ROOT/docs/work/issues"
RESULTS_FILE="$RESULTS_DIR/test-results.md"
TIMESTAMP=$(date +%Y%m%d-%H%M)
DATE_READABLE=$(date "+%Y-%m-%d %H:%M")

# Ensure directories exist
mkdir -p "$LOG_DIR"
mkdir -p "$RESULTS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Transcript Test Runner ==="
echo "Timestamp: $TIMESTAMP"
echo "Log directory: $LOG_DIR"
echo ""

# Track results
PASSED=0
FAILED=0
TOTAL=0
TOTAL_TESTS=0
TOTAL_PASSED_TESTS=0
TOTAL_FAILED_TESTS=0

# Arrays to store results for markdown
declare -a PASSED_TRANSCRIPTS
declare -a FAILED_TRANSCRIPTS

# Run single transcript (slower - separate process)
run_single_transcript() {
    local transcript_path="$1"
    local transcript_name=$(basename "$transcript_path" .transcript)
    local log_file="$LOG_DIR/test-${TIMESTAMP}-${transcript_name}.log"

    printf "Running %-40s " "$transcript_name..."

    # Run the test and capture output
    node "$PROJECT_ROOT/packages/transcript-tester/dist/cli.js" \
        "$PROJECT_ROOT/stories/dungeo" \
        "$transcript_path" > "$log_file" 2>&1 || true

    parse_log_result "$log_file" "$transcript_name"
}

# Parse a log file and update results
parse_log_result() {
    local log_file="$1"
    local transcript_name="$2"

    # Parse results from log file
    local pass_count=$(grep -oP '\d+(?= passed)' "$log_file" | tail -1 || echo "0")
    local fail_count=$(grep -oP '\d+(?= failed)' "$log_file" | tail -1 || echo "0")

    # Default to 0 if empty
    pass_count=${pass_count:-0}
    fail_count=${fail_count:-0}

    # Update totals
    ((TOTAL_PASSED_TESTS += pass_count)) || true
    ((TOTAL_FAILED_TESTS += fail_count)) || true
    ((TOTAL_TESTS += pass_count + fail_count)) || true

    if [ "$fail_count" -gt 0 ] 2>/dev/null; then
        printf "${RED}FAIL${NC} (%s passed, %s failed)\n" "$pass_count" "$fail_count"
        FAILED_TRANSCRIPTS+=("$transcript_name|$pass_count|$fail_count")
        ((FAILED++)) || true
    else
        printf "${GREEN}PASS${NC} (%s tests)\n" "$pass_count"
        PASSED_TRANSCRIPTS+=("$transcript_name|$pass_count")
        ((PASSED++)) || true
    fi
    ((TOTAL++)) || true
}

# Run all transcripts in single process (FAST) and split output
run_all_fast() {
    local combined_log="$LOG_DIR/test-${TIMESTAMP}-ALL.log"

    echo "Running all transcripts in single process (fast mode)..."
    echo ""

    # Run all transcripts at once
    node "$PROJECT_ROOT/packages/transcript-tester/dist/cli.js" \
        "$PROJECT_ROOT/stories/dungeo" --all > "$combined_log" 2>&1 || true

    # Split combined output into individual log files and parse results
    local current_log=""
    local current_name=""
    local in_transcript=false

    while IFS= read -r line; do
        # Detect start of new transcript
        if [[ "$line" =~ ^Running:.*transcripts/(.+)\.transcript ]]; then
            # Save previous transcript if exists
            if [ -n "$current_name" ] && [ -n "$current_log" ]; then
                echo "$current_log" > "$LOG_DIR/test-${TIMESTAMP}-${current_name}.log"
                parse_log_result "$LOG_DIR/test-${TIMESTAMP}-${current_name}.log" "$current_name"
            fi

            current_name="${BASH_REMATCH[1]}"
            current_log="$line"
            in_transcript=true
            printf "Running %-40s " "$current_name..."
        elif $in_transcript; then
            # Check if this is the summary line (end of transcript)
            if [[ "$line" =~ ^[[:space:]]+[0-9]+\ passed ]]; then
                current_log+=$'\n'"$line"
                # This is the last line of the transcript
            elif [[ "$line" =~ ^━ ]] || [[ "$line" =~ ^Total: ]]; then
                # End of all transcripts
                if [ -n "$current_name" ] && [ -n "$current_log" ]; then
                    echo "$current_log" > "$LOG_DIR/test-${TIMESTAMP}-${current_name}.log"
                    parse_log_result "$LOG_DIR/test-${TIMESTAMP}-${current_name}.log" "$current_name"
                fi
                in_transcript=false
                current_name=""
                current_log=""
            else
                current_log+=$'\n'"$line"
            fi
        fi
    done < "$combined_log"

    # Handle last transcript if not already handled
    if [ -n "$current_name" ] && [ -n "$current_log" ]; then
        echo "$current_log" > "$LOG_DIR/test-${TIMESTAMP}-${current_name}.log"
        parse_log_result "$LOG_DIR/test-${TIMESTAMP}-${current_name}.log" "$current_name"
    fi
}

# Check if specific transcript requested
if [ -n "$1" ]; then
    # Run single transcript
    if [ -f "$TRANSCRIPT_DIR/$1.transcript" ]; then
        run_single_transcript "$TRANSCRIPT_DIR/$1.transcript"
    elif [ -f "$1" ]; then
        run_single_transcript "$1"
    else
        echo "Error: Transcript not found: $1"
        echo "Looking in: $TRANSCRIPT_DIR"
        exit 1
    fi
else
    # Run all transcripts in fast mode
    run_all_fast
fi

echo ""
echo "=== Summary ==="
echo -e "Transcripts Passed: ${GREEN}$PASSED${NC}"
echo -e "Transcripts Failed: ${RED}$FAILED${NC}"
echo "Total Transcripts:  $TOTAL"
echo ""
echo "Individual Tests: $TOTAL_PASSED_TESTS passed, $TOTAL_FAILED_TESTS failed (of $TOTAL_TESTS)"
echo ""
echo "Logs written to: $LOG_DIR/test-${TIMESTAMP}-*.log"

# Generate markdown results file
echo "Generating: $RESULTS_FILE"

cat > "$RESULTS_FILE" << EOF
# Transcript Test Results

**Last Run:** $DATE_READABLE
**Timestamp:** $TIMESTAMP

## Summary

| Metric | Count |
|--------|-------|
| Transcripts Passed | $PASSED |
| Transcripts Failed | $FAILED |
| Total Transcripts | $TOTAL |
| Individual Tests Passed | $TOTAL_PASSED_TESTS |
| Individual Tests Failed | $TOTAL_FAILED_TESTS |
| Total Individual Tests | $TOTAL_TESTS |

**Pass Rate:** $(awk "BEGIN {printf \"%.1f\", ($TOTAL_PASSED_TESTS/$TOTAL_TESTS)*100}")%

EOF

# Add failed transcripts section
if [ ${#FAILED_TRANSCRIPTS[@]} -gt 0 ]; then
    cat >> "$RESULTS_FILE" << EOF
## Failed Transcripts

| Transcript | Passed | Failed | Log File |
|------------|--------|--------|----------|
EOF

    # Sort by failure count (descending)
    IFS=$'\n' sorted=($(for t in "${FAILED_TRANSCRIPTS[@]}"; do echo "$t"; done | sort -t'|' -k3 -rn))
    unset IFS

    for entry in "${sorted[@]}"; do
        IFS='|' read -r name pass fail <<< "$entry"
        echo "| $name | $pass | $fail | \`logs/test-${TIMESTAMP}-${name}.log\` |" >> "$RESULTS_FILE"
    done

    echo "" >> "$RESULTS_FILE"
fi

# Add passed transcripts section
if [ ${#PASSED_TRANSCRIPTS[@]} -gt 0 ]; then
    cat >> "$RESULTS_FILE" << EOF
## Passed Transcripts

| Transcript | Tests |
|------------|-------|
EOF

    for entry in "${PASSED_TRANSCRIPTS[@]}"; do
        IFS='|' read -r name pass <<< "$entry"
        echo "| $name | $pass |" >> "$RESULTS_FILE"
    done

    echo "" >> "$RESULTS_FILE"
fi

# Add log directory reference
cat >> "$RESULTS_FILE" << EOF
## Log Files

Individual test logs are in \`logs/test-${TIMESTAMP}-*.log\`

To view a specific failure:
\`\`\`bash
cat logs/test-${TIMESTAMP}-<transcript-name>.log
\`\`\`
EOF

echo "Results written to: $RESULTS_FILE"

# Exit with error if any failures
if [ $FAILED -gt 0 ]; then
    exit 1
fi
