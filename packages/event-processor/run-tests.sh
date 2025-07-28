#!/bin/bash
# Run tests for event-processor package

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Running event-processor tests...${NC}"

# Change to package directory
cd "$(dirname "$0")/.."

# Clean and rebuild
echo -e "${YELLOW}Cleaning build artifacts...${NC}"
pnpm run clean 2>/dev/null || true

echo -e "${YELLOW}Building package...${NC}"
pnpm run build

# Run tests
echo -e "${YELLOW}Running unit tests...${NC}"
pnpm test

# Run with coverage if requested
if [[ "$1" == "--coverage" ]] || [[ "$1" == "-c" ]]; then
    echo -e "${YELLOW}Generating coverage report...${NC}"
    pnpm test -- --coverage
    echo -e "${GREEN}Coverage report generated in coverage/index.html${NC}"
fi

echo -e "${GREEN}Tests completed!${NC}"
