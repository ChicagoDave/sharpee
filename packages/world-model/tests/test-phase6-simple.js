#!/usr/bin/env node

// test-phase6-simple.js - Simple Phase 6 test runner with no dependencies
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.cyan}${colors.bold}${msg}${colors.reset}`)
};

// Banner
log.header('=========================================');
log.header('Sharpee World Model - Phase 6 Test Suite');
log.header('Services & Integration Testing');
log.header('=========================================');
console.log('');

// Test commands to run
const testCommands = [
  {
    name: 'All Phase 6 Tests',
    cmd: 'pnpm --filter @sharpee/world-model test -- --testPathPattern="(services|extensions|integration)" --verbose'
  }
];

// Alternative: Run individual categories
const detailedCommands = [
  {
    name: 'Services Tests',
    cmd: 'pnpm --filter @sharpee/world-model test -- --testPathPattern="services" --verbose'
  },
  {
    name: 'Extension Tests',
    cmd: 'pnpm --filter @sharpee/world-model test -- --testPathPattern="extensions" --verbose'
  },
  {
    name: 'Integration Tests',
    cmd: 'pnpm --filter @sharpee/world-model test -- --testPathPattern="integration" --verbose'
  }
];

// Function to run a command
function runCommand(name, cmd) {
  log.warn(`\nRunning ${name}...`);
  
  try {
    const output = execSync(cmd, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Parse Jest output for results
    const lines = output.split('\n');
    let testSummary = '';
    let foundSummary = false;
    
    lines.forEach(line => {
      if (line.includes('Test Suites:') || line.includes('Tests:')) {
        foundSummary = true;
        testSummary += line + '\n';
      } else if (foundSummary && line.includes('Time:')) {
        testSummary += line + '\n';
        foundSummary = false;
      }
    });
    
    log.success(`✓ ${name} completed`);
    if (testSummary) {
      console.log(testSummary);
    }
    
    return { name, status: 'passed', summary: testSummary };
    
  } catch (error) {
    log.error(`✗ ${name} failed`);
    
    // Try to extract error summary
    const errorOutput = error.stdout || error.stderr || '';
    const lines = errorOutput.toString().split('\n');
    const failedTests = lines.filter(line => 
      line.includes('FAIL') || 
      line.includes('✕') ||
      line.includes('Expected') ||
      line.includes('Received')
    ).slice(0, 10); // Limit output
    
    if (failedTests.length > 0) {
      console.log('Failed tests:');
      failedTests.forEach(line => console.log(`  ${line}`));
    }
    
    return { name, status: 'failed', error: failedTests };
  }
}

// Main execution
async function main() {
  const startTime = Date.now();
  const results = [];
  
  // Check if we should run detailed or simple
  const runDetailed = process.argv.includes('--detailed');
  const commands = runDetailed ? detailedCommands : testCommands;
  
  // Run tests
  for (const { name, cmd } of commands) {
    const result = runCommand(name, cmd);
    results.push(result);
  }
  
  // Calculate statistics
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log('');
  log.warn('╔═══════════════════════════════════╗');
  log.warn('║         TEST SUMMARY              ║');
  log.warn('╚═══════════════════════════════════╝');
  console.log('');
  
  console.log('Phase 6 Test Results:');
  console.log(`  Total Test Runs: ${results.length}`);
  log.success(`  Passed: ${passed}`);
  if (failed > 0) {
    log.error(`  Failed: ${failed}`);
  }
  console.log(`  Duration: ${duration}s`);
  console.log('');
  
  console.log('Phase 6 Components:');
  console.log('  • WorldModelService (Event Sourcing)');
  console.log('  • ScopeService (Visibility/Reachability)');
  console.log('  • Extension Registry & Loader');
  console.log('  • Integration Test Suites:');
  console.log('    - Trait Combinations');
  console.log('    - Container Hierarchies');
  console.log('    - Room Navigation');
  console.log('    - Door Mechanics');
  console.log('    - Visibility Chains');
  console.log('');
  
  // Coverage
  if (failed === 0 && !process.argv.includes('--no-coverage')) {
    log.warn('Running coverage analysis...');
    try {
      execSync('pnpm --filter @sharpee/world-model test:phase6:coverage', {
        stdio: 'inherit'
      });
    } catch (error) {
      log.error('Coverage generation failed');
    }
  }
  
  // Final message
  console.log('');
  if (failed === 0) {
    log.success('All Phase 6 tests passed! 🎉');
    log.info('The Sharpee world model testing suite is complete.');
    process.exit(0);
  } else {
    log.error(`${failed} test run(s) failed.`);
    log.info('Please check the output above for details.');
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  log.error('Test runner failed:', error.message);
  process.exit(1);
});

// Usage instructions
if (process.argv.includes('--help')) {
  console.log('Usage: node test-phase6-simple.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --detailed     Run each test category separately');
  console.log('  --no-coverage  Skip coverage report');
  console.log('  --help         Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node test-phase6-simple.js');
  console.log('  node test-phase6-simple.js --detailed');
  console.log('  node test-phase6-simple.js --no-coverage');
  process.exit(0);
}
