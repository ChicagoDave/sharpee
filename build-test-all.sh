#!/bin/bash

# Enhanced build and test script with action-specific testing support
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SKIP_UNTIL=""
ACTION=""
VERBOSE=false
FORCE_BUILD=false

# Create logs directory if it doesn't exist
mkdir -p /mnt/c/repotemp/sharpee/logs

# Generate timestamp for log files
TIMESTAMP=$(date +"%Y%m%d-%H%M")

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-until)
      SKIP_UNTIL="$2"
      shift 2
      ;;
    --action)
      ACTION="$2"
      shift 2
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --build)
      FORCE_BUILD=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--skip-until package] [--action action-name] [--verbose] [--build]"
      echo "  --skip-until: Skip packages until the specified one"
      echo "  --action: Test only the specified action (requires --skip-until stdlib)"
      echo "  --verbose: Show detailed output"
      echo "  --build: Force build of the package even when using --skip-until"
      exit 1
      ;;
  esac
done

# Navigate to project root
cd /mnt/c/repotemp/sharpee

echo -e "${BLUE}=== Sharpee Build & Test Script ===${NC}"
echo -e "${BLUE}Configuration:${NC}"
echo -e "  Test Runner: Vitest"
echo -e "  Skip until: ${SKIP_UNTIL:-none}"
echo -e "  Action: ${ACTION:-all}"
echo -e "  Verbose: $VERBOSE"
echo -e "  Force build: $FORCE_BUILD"
echo ""

# Function to run tests for a package
run_package_tests() {
  local package=$1
  local test_cmd="pnpm test:ci"
  local log_file=""
  
  # Special handling for stdlib with action parameter
  if [[ "$package" == "stdlib" && -n "$ACTION" ]]; then
    echo -e "${YELLOW}Testing specific action: $ACTION${NC}"
    test_cmd="pnpm test:ci ${ACTION}-golden.test.ts"
    log_file="/mnt/c/repotemp/sharpee/logs/${ACTION}-action-tests-${TIMESTAMP}.log"
  else
    log_file="/mnt/c/repotemp/sharpee/logs/${package}-tests-${TIMESTAMP}.log"
  fi
  
  echo -e "${BLUE}Running tests for $package...${NC}"
  cd packages/$package
  
  # Always save to log file
  echo "Running: $test_cmd" > "$log_file"
  echo "Timestamp: $(date)" >> "$log_file"
  echo "Package: $package" >> "$log_file"
  echo "----------------------------------------" >> "$log_file"
  
  if $VERBOSE; then
    # Show output and save to log
    $test_cmd 2>&1 | tee -a "$log_file"
    local exit_code=${PIPESTATUS[0]}
  else
    # Just save to log
    $test_cmd >> "$log_file" 2>&1
    local exit_code=$?
  fi
  
  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed${NC}"
    echo -e "  Log saved to: $log_file"
  else
    echo -e "${RED}✗ Tests failed${NC}"
    echo -e "${RED}Last 50 lines of output:${NC}"
    tail -n 50 "$log_file"
    echo -e "  Full log saved to: $log_file"
    cd ../..
    return 1
  fi
  
  cd ../..
}

# Function to build a package
build_package() {
  local package=$1
  local log_file="/mnt/c/repotemp/sharpee/logs/${package}-build-${TIMESTAMP}.log"
  
  echo -e "${BLUE}Building $package...${NC}"
  cd packages/$package
  
  echo "Building: pnpm build" > "$log_file"
  echo "Timestamp: $(date)" >> "$log_file"
  echo "Package: $package" >> "$log_file"
  echo "----------------------------------------" >> "$log_file"
  
  if $VERBOSE; then
    # Show output and save to log
    pnpm build 2>&1 | tee -a "$log_file"
    local exit_code=${PIPESTATUS[0]}
  else
    # Just save to log
    pnpm build >> "$log_file" 2>&1
    local exit_code=$?
  fi
  
  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
  else
    echo -e "${RED}✗ Build failed${NC}"
    cat "$log_file"
    echo -e "  Full log saved to: $log_file"
    cd ../..
    return 1
  fi
  
  cd ../..
}

# Package list in dependency order
PACKAGES=(
  "core"
  "if-domain"
  "world-model"
  "lang-en-us"
  "parser-en-us"
  "stdlib"
  "engine"
  "server"
  "play-web"
  "authoring"
)

# Find starting point
START_INDEX=0
if [ -n "$SKIP_UNTIL" ]; then
  for i in "${!PACKAGES[@]}"; do
    if [ "${PACKAGES[$i]}" == "$SKIP_UNTIL" ]; then
      START_INDEX=$i
      echo -e "${YELLOW}Skipping to package: $SKIP_UNTIL${NC}"
      break
    fi
  done
fi

# Validate action parameter
if [ -n "$ACTION" ] && [ "$SKIP_UNTIL" != "stdlib" ]; then
  echo -e "${RED}Error: --action requires --skip-until stdlib${NC}"
  exit 1
fi

# Process packages
for ((i=$START_INDEX; i<${#PACKAGES[@]}; i++)); do
  package="${PACKAGES[$i]}"
  
  echo ""
  echo -e "${BLUE}=== Processing $package ===${NC}"
  
  # Determine if we should build this package
  should_build=true
  
  # Skip building if we're testing a specific action in stdlib AND --build wasn't specified
  if [[ "$package" == "stdlib" && -n "$ACTION" && "$FORCE_BUILD" != "true" ]]; then
    echo -e "${YELLOW}Skipping build for action-specific test (use --build to force)${NC}"
    should_build=false
  fi
  
  # Build the package if needed
  if [ "$should_build" = "true" ]; then
    if ! build_package "$package"; then
      echo -e "${RED}Build failed for $package${NC}"
      exit 1
    fi
  fi
  
  # Run tests
  if ! run_package_tests "$package"; then
    echo -e "${RED}Tests failed for $package${NC}"
    exit 1
  fi
  
  # If we're testing a specific action, stop after stdlib
  if [[ "$package" == "stdlib" && -n "$ACTION" ]]; then
    echo ""
    echo -e "${GREEN}Action test completed for: $ACTION${NC}"
    exit 0
  fi
done

echo ""
echo -e "${GREEN}=== All builds and tests completed successfully! ===${NC}"
