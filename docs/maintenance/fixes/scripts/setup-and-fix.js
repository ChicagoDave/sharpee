#!/usr/bin/env node

/**
 * Setup and run the event structure fix
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Event Structure Fix Tool\n');

// Check if we're in the right directory
if (!fs.existsSync('packages/stdlib')) {
  console.error('❌ Error: Must run from sharpee root directory');
  process.exit(1);
}

console.log('📦 Installing required dependencies...');

try {
  // Install dependencies in the stdlib package
  execSync('cd packages/stdlib && pnpm add -D typescript @types/node glob @types/glob', {
    stdio: 'inherit'
  });
  
  console.log('\n✅ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  console.log('\nPlease run manually:');
  console.log('cd packages/stdlib && pnpm add -D typescript @types/node glob @types/glob');
  process.exit(1);
}

console.log('\n🚀 Running the fix script...\n');

try {
  // Run the TypeScript file with the config
  execSync(`npx ts-node --project tsconfig.fix.json fix-event-structure.ts`, {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  console.log('\n✅ Fix complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Review changes: git diff');
  console.log('2. Run tests: cd packages/stdlib && pnpm test');
  console.log('3. Commit if tests pass');
} catch (error) {
  console.error('\n❌ Fix script failed:', error.message);
  process.exit(1);
}