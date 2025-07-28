#!/bin/bash

# Script to test a specific action in the stdlib package
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p /mnt/c/repotemp/sharpee/logs

# Generate timestamp for log file
TIMESTAMP=$(date +"%Y%m%d-%H%M")

# Check if action name was provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No action name provided${NC}"
    echo "Usage: $0 <action-name>"
    echo "Example: $0 taking"
    echo ""
    echo "Available actions:"
    echo "  Core: taking, dropping, examining, going"
    echo "  Manipulation: closing, opening, locking, unlocking"
    echo "  Interaction: giving, showing, putting, inserting, removing, throwing"
    echo "  Others: attacking, climbing, drinking, eating, entering, exiting,"
    echo "         inventory, listening, looking, pulling, pushing, quitting,"
    echo "         searching, smelling, switching_off, switching_on, taking_off,"
    echo "         talking, touching, turning, waiting, wearing"
    exit 1
fi

ACTION=$1
LOG_FILE="/mnt/c/repotemp/sharpee/logs/${ACTION}-action-tests-${TIMESTAMP}.log"

# Navigate to stdlib package
cd /mnt/c/repotemp/sharpee/packages/stdlib

echo -e "${BLUE}=== Testing action: $ACTION ===${NC}"
echo -e "Log file: $LOG_FILE"
echo ""

# Setup log file
echo "Testing action: $ACTION" > "$LOG_FILE"
echo "Timestamp: $(date)" >> "$LOG_FILE"
echo "Command: pnpm test -- ${ACTION}-golden.test.ts" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"

# Run the specific test and capture output
if pnpm test -- ${ACTION}-golden.test.ts 2>&1 | tee -a "$LOG_FILE"; then
    echo ""
    echo -e "${GREEN}✓ Test passed for action: $ACTION${NC}"
    echo -e "  Log saved to: $LOG_FILE"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Test failed for action: $ACTION${NC}"
    echo -e "  Log saved to: $LOG_FILE"
    exit 1
fi
