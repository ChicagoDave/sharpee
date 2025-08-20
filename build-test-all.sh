#!/bin/bash

# Enhanced build and test script with parallel testing support
set -e

# No color codes for clean log output
RED=''
GREEN=''
YELLOW=''
BLUE=''
NC=''

# Default values
SKIP_UNTIL=""
ACTION=""
VERBOSE=false
FORCE_BUILD=false
FAILURES_ONLY=false
TYPECHECK=true
LINT=true
CLEAN_BUILD=false
STORY_TEST=true
QUICK_MODE=false
MUTE_OK_TESTS=false
PARALLEL_TESTS=true
MAX_PARALLEL_JOBS=4

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
    --failures-only)
      FAILURES_ONLY=true
      shift
      ;;
    --no-typecheck)
      TYPECHECK=false
      shift
      ;;
    --no-lint)
      LINT=false
      shift
      ;;
    --clean)
      CLEAN_BUILD=true
      shift
      ;;
    --no-story)
      STORY_TEST=false
      shift
      ;;
    --mute-ok-tests)
      MUTE_OK_TESTS=true
      shift
      ;;
    --no-parallel)
      PARALLEL_TESTS=false
      shift
      ;;
    --max-parallel)
      MAX_PARALLEL_JOBS="$2"
      shift 2
      ;;
    --quick)
      QUICK_MODE=true
      TYPECHECK=false
      LINT=false
      STORY_TEST=false
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --skip-until <pkg>  Skip packages until the specified one"
      echo "  --action <name>     Test only the specified action (requires --skip-until stdlib)"
      echo "  --verbose           Show detailed output"
      echo "  --build             Force build of the package even when using --skip-until"
      echo "  --failures-only     Run only previously failing tests"
      echo "  --no-typecheck      Skip TypeScript type checking"
      echo "  --no-lint           Skip linting checks"
      echo "  --clean             Clean build (remove dist/node_modules first)"
      echo "  --no-story          Skip story integration tests"
      echo "  --mute-ok-tests     Only show failing tests in output"
      echo "  --no-parallel       Run tests sequentially instead of in parallel"
      echo "  --max-parallel <n>  Maximum number of parallel test jobs (default: 4)"
      echo "  --quick             Quick mode (skip typecheck, lint, and story tests)"
      exit 1
      ;;
  esac
done

# Navigate to project root
cd /mnt/c/repotemp/sharpee

echo "=== Sharpee Build & Test Script ==="
echo "Configuration:"
echo "  Test Runner: Vitest"
echo "  Skip until: ${SKIP_UNTIL:-none}"
echo "  Action: ${ACTION:-all}"
echo "  Verbose: $VERBOSE"
echo "  Force build: $FORCE_BUILD"
echo "  Failures only: $FAILURES_ONLY"
echo "  TypeCheck: $TYPECHECK"
echo "  Lint: $LINT"
echo "  Clean build: $CLEAN_BUILD"
echo "  Story tests: $STORY_TEST"
echo "  Quick mode: $QUICK_MODE"
echo "  Mute OK tests: $MUTE_OK_TESTS"
echo "  Parallel tests: $PARALLEL_TESTS"
echo "  Max parallel jobs: $MAX_PARALLEL_JOBS"
echo ""

# Function to strip ANSI color codes from input
strip_ansi() {
  sed 's/\x1b\[[0-9;]*m//g'
}

# Function to extract failed test blocks from TAP output
extract_failed_tests() {
  local input_file=$1
  local output_file=$2
  
  # Use awk to extract blocks starting with "not ok" and ending with "}"
  awk '
    /^not ok/ { 
      capture = 1
      block = $0 "\n"
    }
    capture && !/^not ok/ {
      block = block $0 "\n"
      if (/^}/) {
        print block
        print "----------------------------------------"
        capture = 0
        block = ""
      }
    }
  ' "$input_file" > "$output_file"
}

# Function to run tests for a package
run_package_tests() {
  local package=$1
  local test_cmd="pnpm test:ci"
  local log_file=""
  
  # Handle platform packages that are nested
  local package_path="packages/$package"
  if [ ! -d "$package_path" ]; then
    echo "⚠ Package directory not found: $package_path, skipping tests..."
    return 0
  fi
  
  cd "$package_path"
  
  # Check if package has test scripts by looking in package.json
  if ! grep -q '"test:ci"' package.json; then
    echo "⚠ No tests configured for $package, skipping..."
    cd - > /dev/null
    return 0
  fi
  
  # Build test command based on options
  if [[ "$package" == "stdlib" && -n "$ACTION" ]]; then
    echo "Testing specific action: $ACTION"
    test_cmd="pnpm test:ci ${ACTION}-golden.test.ts"
    log_file="/mnt/c/repotemp/sharpee/logs/${ACTION}-action-tests-${TIMESTAMP}.log"
  else
    # Replace slashes with dashes in package name for log file
    local log_package=$(echo "$package" | tr '/' '-')
    log_file="/mnt/c/repotemp/sharpee/logs/${log_package}-tests-${TIMESTAMP}.log"
  fi
  
  # Add failures-only option if enabled
  if [ "$FAILURES_ONLY" = "true" ]; then
    # First check if we have a previous test results file
    local results_file=".vitest-results.json"
    if [ -f "$results_file" ]; then
      echo "Running only previously failing tests"
      test_cmd="$test_cmd --changed $results_file"
    else
      echo "No previous test results found, running all tests"
    fi
  fi
  
  # Always save test results for future --failures-only runs
  # Choose reporter based on mute-ok-tests flag
  if [ "$MUTE_OK_TESTS" = "true" ]; then
    # Save full output with TAP but filter to show only failures
    test_cmd="$test_cmd --reporter=tap --no-color --reporter=json --outputFile=.vitest-results.json"
  else
    # Use tap reporter for clean output without color codes
    test_cmd="$test_cmd --reporter=tap --no-color --reporter=json --outputFile=.vitest-results.json"
  fi
  
  echo "Running tests for $package..."
  
  # Always save to log file
  echo "Running: $test_cmd" > "$log_file"
  echo "Timestamp: $(date)" >> "$log_file"
  echo "Package: $package" >> "$log_file"
  echo "----------------------------------------" >> "$log_file"
  
  # Create failed tests log file name
  local failed_log_file="${log_file%.log}-failed.log"
  
  if $VERBOSE; then
    # Show output and save to log (strip ANSI codes from both)
    if [ "$MUTE_OK_TESTS" = "true" ]; then
      # Save full output to log, but only show failures to console
      $test_cmd | strip_ansi | tee -a "$log_file" | grep -E "^not ok|^    not ok|^        ×|^        →|# Failure|# Error|AssertionError|Error:"
      local exit_code=${PIPESTATUS[0]}
    else
      $test_cmd | strip_ansi | tee -a "$log_file"
      local exit_code=${PIPESTATUS[0]}
    fi
  else
    # Just save to log (strip ANSI codes)
    $test_cmd | strip_ansi >> "$log_file"
    local exit_code=${PIPESTATUS[0]}
  fi
  
  if [ $exit_code -eq 0 ]; then
    echo "✓ Tests passed"
    echo "  Log saved to: $log_file"
  else
    echo "✗ Tests failed"
    
    # Extract failed tests to separate log
    extract_failed_tests "$log_file" "$failed_log_file"
    
    if [ "$MUTE_OK_TESTS" = "true" ]; then
      # Show summary of failed tests
      echo "Failed tests:"
      grep "^not ok" "$log_file" | sed 's/^not ok [0-9]* - /  ✗ /'
      echo ""
      echo "  Failed tests log: $failed_log_file"
      echo "  Full log saved to: $log_file"
    else
      echo "Last 50 lines of output:"
      tail -n 50 "$log_file"
      echo "  Failed tests log: $failed_log_file"
      echo "  Full log saved to: $log_file"
    fi
    cd - > /dev/null
    return 1
  fi
  
  cd - > /dev/null
}

# Function to clean a package
clean_package() {
  local package=$1
  local package_path="packages/$package"
  
  if [ -d "$package_path" ]; then
    echo "Cleaning $package..."
    rm -rf "$package_path/dist" "$package_path/node_modules" || true
  fi
}

# Function to typecheck a package
typecheck_package() {
  local package=$1
  local package_path="packages/$package"
  
  if [ ! -d "$package_path" ]; then
    return 0
  fi
  
  cd "$package_path"
  
  # Check if package has typecheck script
  if ! grep -q '"typecheck"' package.json; then
    cd - > /dev/null
    return 0
  fi
  
  echo "Type checking $package..."
  
  if $VERBOSE; then
    pnpm typecheck
  else
    pnpm typecheck > /dev/null
  fi
  
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    echo "✓ Type check passed"
  else
    echo "✗ Type check failed"
    cd - > /dev/null
    return 1
  fi
  
  cd - > /dev/null
}

# Function to lint a package
lint_package() {
  local package=$1
  local package_path="packages/$package"
  
  if [ ! -d "$package_path" ]; then
    return 0
  fi
  
  cd "$package_path"
  
  # Check if package has lint script
  if ! grep -q '"lint"' package.json; then
    cd - > /dev/null
    return 0
  fi
  
  echo "Linting $package..."
  
  if $VERBOSE; then
    pnpm lint
  else
    pnpm lint > /dev/null
  fi
  
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    echo "✓ Lint check passed"
  else
    echo "✗ Lint check failed"
    cd - > /dev/null
    return 1
  fi
  
  cd - > /dev/null
}

# Function to build a package
build_package() {
  local package=$1
  # Replace slashes with dashes in package name for log file
  local log_package=$(echo "$package" | tr '/' '-')
  local log_file="/mnt/c/repotemp/sharpee/logs/${log_package}-build-${TIMESTAMP}.log"
  
  echo "Building $package..."
  
  # Initialize log file
  echo "Package: $package" > "$log_file"
  echo "Timestamp: $(date)" >> "$log_file"
  echo "----------------------------------------" >> "$log_file"
  
  # Handle platform packages that are nested
  local package_path="packages/$package"
  if [ ! -d "$package_path" ]; then
    echo "✗ Package directory not found: $package_path"
    return 1
  fi
  
  cd "$package_path"
  
  # Check if node_modules exists, if not run pnpm install
  if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for $package..."
    echo "Installing dependencies: pnpm install" >> "$log_file"
    pnpm install | strip_ansi >> "$log_file"
    local install_exit=${PIPESTATUS[0]}
    if [ $install_exit -ne 0 ]; then
      echo "✗ Dependency installation failed"
      cat "$log_file"
      cd - > /dev/null
      return 1
    fi
    echo "Dependencies installed successfully" >> "$log_file"
    echo "----------------------------------------" >> "$log_file"
  fi
  
  echo "Building: pnpm build" >> "$log_file"
  
  if $VERBOSE; then
    # Show output and save to log (strip ANSI codes)
    pnpm build | strip_ansi | tee -a "$log_file"
    local exit_code=${PIPESTATUS[0]}
  else
    # Just save to log (strip ANSI codes)
    pnpm build | strip_ansi >> "$log_file"
    local exit_code=${PIPESTATUS[0]}
  fi
  
  if [ $exit_code -eq 0 ]; then
    echo "✓ Build successful"
    echo "  Log saved to: $log_file"
  else
    echo "✗ Build failed"
    
    # Count TypeScript errors if any
    local error_count=$(grep -c "error TS" "$log_file" || echo "0")
    if [ "$error_count" -gt 0 ]; then
      echo "  TypeScript errors: $error_count"
      echo "  First 10 errors:"
      grep "error TS" "$log_file" | head -10
    else
      # Show last 20 lines if no TypeScript errors found
      echo "Last 20 lines of output:"
      tail -n 20 "$log_file"
    fi
    echo "  Full log saved to: $log_file"
    cd - > /dev/null
    return 1
  fi
  
  cd - > /dev/null
}

# Package list in dependency order
PACKAGES=(
  "core"
  "if-domain"
  "world-model"
  "if-services"
  "text-services"
  "lang-en-us"
  "parser-en-us"
  "stdlib"
  "event-processor"
  "engine"
  "sharpee"
  "platforms/cli-en-us"
)

# Find starting point
START_INDEX=0
if [ -n "$SKIP_UNTIL" ]; then
  for i in "${!PACKAGES[@]}"; do
    if [ "${PACKAGES[$i]}" == "$SKIP_UNTIL" ]; then
      START_INDEX=$i
      echo "Skipping to package: $SKIP_UNTIL"
      break
    fi
  done
fi

# Validate action parameter
if [ -n "$ACTION" ] && [ "$SKIP_UNTIL" != "stdlib" ]; then
  echo "Error: --action requires --skip-until stdlib"
  exit 1
fi

# Clean all packages if requested
if [ "$CLEAN_BUILD" = "true" ]; then
  echo "=== Cleaning all packages ==="
  for package in "${PACKAGES[@]}"; do
    clean_package "$package"
  done
  echo "✓ Clean complete"
  echo ""
fi

# PHASE 1: Build all packages first
echo "=== PHASE 1: Building all packages ==="
echo ""

BUILD_FAILED=false
for ((i=$START_INDEX; i<${#PACKAGES[@]}; i++)); do
  package="${PACKAGES[$i]}"
  
  echo "[$((i+1))/${#PACKAGES[@]}] Processing $package"
  
  # Determine if we should build this package
  should_build=true
  
  # Skip building if we're testing a specific action in stdlib AND --build wasn't specified
  if [[ "$package" == "stdlib" && -n "$ACTION" && "$FORCE_BUILD" != "true" ]]; then
    echo "  Skipping build for action-specific test (use --build to force)"
    should_build=false
  fi
  
  # Build the package if needed
  if [ "$should_build" = "true" ]; then
    if ! build_package "$package"; then
      echo "  Build failed for $package"
      BUILD_FAILED=true
      break
    fi
  fi
  
  # Type check if enabled
  if [ "$TYPECHECK" = "true" ]; then
    if ! typecheck_package "$package"; then
      echo "  Type check failed for $package"
      BUILD_FAILED=true
      break
    fi
  fi
  
  # Lint if enabled
  if [ "$LINT" = "true" ]; then
    if ! lint_package "$package"; then
      echo "  Lint check failed for $package"
      BUILD_FAILED=true
      break
    fi
  fi
done

# Exit if build phase failed
if [ "$BUILD_FAILED" = "true" ]; then
  echo ""
  echo "=== Build phase failed. Stopping before tests. ==="
  exit 1
fi

echo ""
echo "✓ All packages built successfully"
echo ""

# PHASE 2: Run tests (parallel or sequential)
echo "=== PHASE 2: Running tests ==="
echo ""

# Function to run tests in parallel
run_tests_parallel() {
  local pids=()
  local failed_packages=()
  local package_names=()
  
  # Start test jobs for each package
  for ((i=$START_INDEX; i<${#PACKAGES[@]}; i++)); do
    package="${PACKAGES[$i]}"
    
    # Run tests in background
    (
      run_package_tests "$package"
      echo $? > "/tmp/test_result_${package//\//_}"
    ) &
    
    pids+=($!)
    package_names+=("$package")
    
    # Wait if we've reached max parallel jobs
    if [ ${#pids[@]} -ge $MAX_PARALLEL_JOBS ]; then
      # Wait for any job to finish
      wait -n
      
      # Check results of finished jobs
      for j in "${!pids[@]}"; do
        if ! kill -0 ${pids[$j]} 2>/dev/null; then
          # Job finished, check result
          local pkg_name="${package_names[$j]}"
          local result_file="/tmp/test_result_${pkg_name//\//_}"
          if [ -f "$result_file" ]; then
            local result=$(cat "$result_file")
            rm -f "$result_file"
            if [ "$result" != "0" ]; then
              failed_packages+=("$pkg_name")
            fi
          fi
          # Remove from arrays
          unset pids[$j]
          unset package_names[$j]
        fi
      done
      
      # Rebuild arrays without gaps
      pids=("${pids[@]}")
      package_names=("${package_names[@]}")
    fi
    
    # If we're testing a specific action, stop after stdlib
    if [[ "$package" == "stdlib" && -n "$ACTION" ]]; then
      break
    fi
  done
  
  # Wait for remaining jobs
  for j in "${!pids[@]}"; do
    wait ${pids[$j]}
    local pkg_name="${package_names[$j]}"
    local result_file="/tmp/test_result_${pkg_name//\//_}"
    if [ -f "$result_file" ]; then
      local result=$(cat "$result_file")
      rm -f "$result_file"
      if [ "$result" != "0" ]; then
        failed_packages+=("$pkg_name")
      fi
    fi
  done
  
  # Report results
  if [ ${#failed_packages[@]} -gt 0 ]; then
    echo ""
    echo "✗ Tests failed for the following packages:"
    for pkg in "${failed_packages[@]}"; do
      echo "  - $pkg"
    done
    return 1
  fi
  
  return 0
}

# Run tests either in parallel or sequential
if [ "$PARALLEL_TESTS" = "true" ]; then
  echo "Running tests in parallel (max $MAX_PARALLEL_JOBS jobs)..."
  if ! run_tests_parallel; then
    echo ""
    echo "=== Some tests failed. Check logs for details. ==="
    exit 1
  fi
else
  # Sequential test execution
  for ((i=$START_INDEX; i<${#PACKAGES[@]}; i++)); do
    package="${PACKAGES[$i]}"
    
    echo "[$((i+1))/${#PACKAGES[@]}] Testing $package"
    
    # Run tests
    if ! run_package_tests "$package"; then
      echo "Tests failed for $package"
      exit 1
    fi
    
    # If we're testing a specific action, stop after stdlib
    if [[ "$package" == "stdlib" && -n "$ACTION" ]]; then
      echo ""
      echo "Action test completed for: $ACTION"
      exit 0
    fi
  done
fi

# Run story integration tests if enabled
if [ "$STORY_TEST" = "true" ]; then
  echo ""
  echo "=== Running Story Integration Tests ==="
  
  # Test Cloak of Darkness story
  echo "Testing Cloak of Darkness..."
  cd packages/stories/cloak-of-darkness
  
  if $VERBOSE; then
    pnpm test
  else
    pnpm test > /dev/null
  fi
  
  if [ $? -eq 0 ]; then
    echo "✓ Cloak of Darkness tests passed"
  else
    echo "✗ Cloak of Darkness tests failed"
    exit 1
  fi
  
  cd - > /dev/null
fi

# Summary report
echo ""
echo "=== Build & Test Summary ==="
echo "✓ All packages built successfully"
if [ "$TYPECHECK" = "true" ]; then
  echo "✓ All type checks passed"
fi
if [ "$LINT" = "true" ]; then
  echo "✓ All lint checks passed"
fi
echo "✓ All unit tests passed"
if [ "$PARALLEL_TESTS" = "true" ]; then
  echo "  (Tests run in parallel with max $MAX_PARALLEL_JOBS jobs)"
fi
if [ "$STORY_TEST" = "true" ]; then
  echo "✓ Story integration tests passed"
fi

echo ""
echo "=== All builds and tests completed successfully! ==="