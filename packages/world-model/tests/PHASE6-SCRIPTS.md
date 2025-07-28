# Phase 6 Test Scripts

This directory contains various scripts for running Phase 6 tests of the Sharpee World Model, which covers Services and Integration testing.

## Available Scripts

### 1. NPM Scripts (Recommended)
The easiest way to run Phase 6 tests is using the npm scripts added to `package.json`:

```bash
# Run all Phase 6 tests
pnpm run test:phase6

# Run specific categories
pnpm run test:phase6:services      # Services tests only
pnpm run test:phase6:extensions    # Extension tests only
pnpm run test:phase6:integration   # Integration tests only

# Run with coverage
pnpm run test:phase6:coverage

# Watch mode for development
pnpm run test:phase6:watch
```

### 2. Shell Scripts

#### Bash (Linux/macOS/WSL)
```bash
# Make executable
chmod +x test-phase6.sh

# Run the script
./test-phase6.sh
```

#### PowerShell (Windows)
```powershell
# Run the script
.\test-phase6.ps1

# If you get execution policy errors:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\test-phase6.ps1
```

### 3. Node.js Scripts

#### Simple Runner (No Dependencies)
```bash
# Run all Phase 6 tests
node test-phase6-simple.js

# Run with detailed output (each category separately)
node test-phase6-simple.js --detailed

# Skip coverage report
node test-phase6-simple.js --no-coverage

# Show help
node test-phase6-simple.js --help
```

#### Full-Featured Runner
```bash
# Requires chalk for colored output (optional)
node run-phase6-tests.js
```

## What Phase 6 Tests

Phase 6 covers the following test categories:

### Services (2 test suites)
- **WorldModelService**: Event sourcing, handlers, validators, previewers
- **ScopeService**: Visibility and reachability calculations

### Extensions (2 test suites)
- **Registry**: Trait/event/action registration with namespaces
- **Loader**: Extension loading, dependencies, lifecycle management

### Integration (5 test suites)
- **Trait Combinations**: Complex multi-trait interactions
- **Container Hierarchies**: Deep nesting, capacity, weight
- **Room Navigation**: Pathfinding, exits, doors
- **Door Mechanics**: State synchronization, locking, special doors
- **Visibility Chains**: Complex visibility scenarios

## Test Output

The scripts provide colored output showing:
- ✓ Passed tests (green)
- ✗ Failed tests (red)
- Test execution time
- Coverage report (if all tests pass)

## Quick Start

For most users, the simplest approach is:

```bash
# From the world-model package directory
cd packages/world-model

# Run all Phase 6 tests
pnpm run test:phase6

# Or use the simple Node.js runner
node tests/test-phase6-simple.js
```

## Troubleshooting

1. **Permission Denied (Shell Scripts)**
   - Make the script executable: `chmod +x test-phase6.sh`

2. **PowerShell Execution Policy**
   - Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`

3. **Tests Not Found**
   - Ensure you're in the correct directory: `packages/world-model`
   - Check that test files exist in `tests/unit/services`, `tests/unit/extensions`, and `tests/integration`

4. **Coverage Fails**
   - Coverage requires all tests to pass first
   - Use `--no-coverage` flag to skip coverage generation

## Integration with CI/CD

These scripts can be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Phase 6 Tests
  run: pnpm run test:phase6

# Example GitLab CI
test:phase6:
  script:
    - pnpm run test:phase6:coverage
```

## Summary

Phase 6 represents the completion of comprehensive testing for the Sharpee World Model, adding:
- 9 new test files
- ~400+ test cases
- ~4,000 lines of test code
- Complete coverage of services, extensions, and integration scenarios

The test suite is now ready for production use!
