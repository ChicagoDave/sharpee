// run-phase6-tests.js - Node.js script to run Phase 6 tests
const { execSync } = require('child_process');
const chalk = require('chalk');

// Simple chalk fallback if not installed
const colors = {
  green: (text) => chalk?.green ? chalk.green(text) : `✓ ${text}`,
  red: (text) => chalk?.red ? chalk.red(text) : `✗ ${text}`,
  yellow: (text) => chalk?.yellow ? chalk.yellow(text) : `▶ ${text}`,
  blue: (text) => chalk?.blue ? chalk.blue(text) : `• ${text}`,
  cyan: (text) => chalk?.cyan ? chalk.cyan(text) : text,
  bold: (text) => chalk?.bold ? chalk.bold(text) : text.toUpperCase()
};

console.log(colors.cyan('========================================='));
console.log(colors.cyan(colors.bold('Sharpee World Model - Phase 6 Test Suite')));
console.log(colors.cyan('Services & Integration Testing'));
console.log(colors.cyan('========================================='));
console.log('');

const testCategories = [
  {
    name: 'Services Tests',
    command: 'test:phase6:services',
    files: [
      'world-model-service.test.ts',
      'scope-service.test.ts'
    ]
  },
  {
    name: 'Extension Tests',
    command: 'test:phase6:extensions',
    files: [
      'registry.test.ts',
      'loader.test.ts'
    ]
  },
  {
    name: 'Integration Tests',
    command: 'test:phase6:integration',
    files: [
      'trait-combinations.test.ts',
      'container-hierarchies.test.ts',
      'room-navigation.test.ts',
      'door-mechanics.test.ts',
      'visibility-chains.test.ts'
    ]
  }
];

let totalPassed = 0;
let totalFailed = 0;
const results = [];

// Run each category
testCategories.forEach(category => {
  console.log(colors.yellow(`\n╔${'═'.repeat(35)}╗`));
  console.log(colors.yellow(`║ ${category.name.padEnd(33)} ║`));
  console.log(colors.yellow(`╚${'═'.repeat(35)}╝\n`));
  
  try {
    console.log(colors.blue(`Running ${category.name}...`));
    execSync(`pnpm run ${category.command}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(colors.green(`✓ ${category.name} passed\n`));
    totalPassed++;
    results.push({ name: category.name, status: 'passed' });
  } catch (error) {
    console.log(colors.red(`✗ ${category.name} failed\n`));
    totalFailed++;
    results.push({ name: category.name, status: 'failed' });
  }
});

// Summary
console.log(colors.yellow(`\n╔${'═'.repeat(35)}╗`));
console.log(colors.yellow(`║ ${colors.bold('TEST SUMMARY').padEnd(33)} ║`));
console.log(colors.yellow(`╚${'═'.repeat(35)}╝\n`));

console.log('Phase 6 Test Results:');
console.log(`  Total Test Categories: ${testCategories.length}`);
console.log(colors.green(`  Passed: ${totalPassed}`));
console.log(colors.red(`  Failed: ${totalFailed}`));
console.log('');

console.log('Test Files:');
testCategories.forEach(category => {
  console.log(`\n  ${category.name}:`);
  category.files.forEach(file => {
    console.log(`    - ${file}`);
  });
});

console.log('\n');

// Run coverage if all passed
if (totalFailed === 0) {
  console.log(colors.yellow(`╔${'═'.repeat(35)}╗`));
  console.log(colors.yellow(`║ ${colors.bold('COVERAGE REPORT').padEnd(33)} ║`));
  console.log(colors.yellow(`╚${'═'.repeat(35)}╝\n`));
  
  try {
    execSync('pnpm run test:phase6:coverage', { stdio: 'inherit' });
  } catch (error) {
    console.log(colors.red('Coverage generation failed'));
  }
}

console.log('');
console.log(colors.cyan('Phase 6 testing complete!'));

if (totalFailed === 0) {
  console.log(colors.green(colors.bold('All Phase 6 tests passed! 🎉')));
  process.exit(0);
} else {
  console.log(colors.red(`${totalFailed} test category(ies) failed.`));
  process.exit(1);
}
