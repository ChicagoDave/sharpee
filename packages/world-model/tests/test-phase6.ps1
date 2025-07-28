# test-phase6.ps1 - Run Phase 6 tests for Sharpee World Model (Windows PowerShell version)
# This script runs all Phase 6 tests (Services & Integration)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Sharpee World Model - Phase 6 Test Suite" -ForegroundColor Cyan
Write-Host "Services & Integration Testing" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test counters
$totalTests = 0
$passedTests = 0
$failedTests = 0
$testResults = @()

# Function to run a test file
function Run-Test {
    param(
        [string]$testFile,
        [string]$testName
    )
    
    Write-Host "Running $testName..." -ForegroundColor Blue
    $totalTests++
    
    # Run the test
    $output = pnpm --filter @sharpee/world-model test -- --run --reporter=verbose $testFile 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "✓ $testName passed" -ForegroundColor Green
        $script:passedTests++
        $script:testResults += @{Name=$testName; Status="Passed"; File=$testFile}
    } else {
        Write-Host "✗ $testName failed" -ForegroundColor Red
        $script:failedTests++
        $script:testResults += @{Name=$testName; Status="Failed"; File=$testFile}
    }
    Write-Host ""
}

# Function to run a category of tests
function Run-TestCategory {
    param(
        [string]$category,
        [string]$pattern
    )
    
    Write-Host "═══ $category ═══" -ForegroundColor Yellow
    Write-Host ""
    
    # Run tests with pattern
    $output = pnpm --filter @sharpee/world-model test -- --run --reporter=verbose $pattern 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "✓ $category tests passed" -ForegroundColor Green
    } else {
        Write-Host "✗ Some $category tests failed" -ForegroundColor Red
    }
    Write-Host ""
}

# Start timer
$startTime = Get-Date

Write-Host "Starting Phase 6 test execution..." -ForegroundColor White
Write-Host ""

# Run Services Tests
Write-Host "╔═══════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║      SERVICES TESTS           ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

Run-Test "services/world-model-service.test.ts" "WorldModelService Tests"
Run-Test "services/scope-service.test.ts" "ScopeService Tests"

# Run Extension Tests
Write-Host "╔═══════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║      EXTENSION TESTS          ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

Run-Test "extensions/registry.test.ts" "Extension Registry Tests"
Run-Test "extensions/loader.test.ts" "Extension Loader Tests"

# Run Integration Tests
Write-Host "╔═══════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║    INTEGRATION TESTS          ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

# Run individual integration tests for better reporting
Run-Test "integration/trait-combinations.test.ts" "Trait Combinations"
Run-Test "integration/container-hierarchies.test.ts" "Container Hierarchies"
Run-Test "integration/room-navigation.test.ts" "Room Navigation"
Run-Test "integration/door-mechanics.test.ts" "Door Mechanics"
Run-Test "integration/visibility-chains.test.ts" "Visibility Chains"

# End timer
$endTime = Get-Date
$duration = $endTime - $startTime

# Summary
Write-Host ""
Write-Host "╔═══════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║      TEST SUMMARY             ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

Write-Host "Phase 6 Test Results:" -ForegroundColor White
Write-Host "  Total Test Files: $totalTests"
Write-Host "  Passed: $passedTests" -ForegroundColor Green
Write-Host "  Failed: $failedTests" -ForegroundColor Red
Write-Host ""
Write-Host "Test Categories:"
Write-Host "  Services Tests: 2 files"
Write-Host "  Extension Tests: 2 files"
Write-Host "  Integration Tests: 5 files"
Write-Host ""
Write-Host "Execution Time: $($duration.TotalSeconds) seconds"
Write-Host ""

# Detailed results
Write-Host "Detailed Results:" -ForegroundColor Cyan
$testResults | ForEach-Object {
    $color = if ($_.Status -eq "Passed") { "Green" } else { "Red" }
    Write-Host "  $($_.Name): $($_.Status)" -ForegroundColor $color
}

Write-Host ""

# Run coverage if all tests passed
if ($failedTests -eq 0) {
    Write-Host "╔═══════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║    COVERAGE REPORT            ║" -ForegroundColor Yellow
    Write-Host "╚═══════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    
    # Generate coverage for Phase 6
    pnpm --filter @sharpee/world-model test:coverage -- `
        --testPathPattern="(services|extensions|integration)" `
        --collectCoverageFrom="src/services/**/*.ts" `
        --collectCoverageFrom="src/extensions/**/*.ts" `
        --collectCoverageFrom="src/world/WorldModel.ts"
}

Write-Host ""
Write-Host "Phase 6 testing complete!" -ForegroundColor Cyan

# Exit with appropriate code
if ($failedTests -eq 0) {
    Write-Host "All Phase 6 tests passed! 🎉" -ForegroundColor Green
    exit 0
} else {
    Write-Host "$failedTests test(s) failed." -ForegroundColor Red
    exit 1
}
