#!/usr/bin/env node

/**
 * Fix event structure in stdlib actions
 * 
 * This script fixes the systematic issues in the migrated actions:
 * 1. Changes 'if.event.error' to 'action.error'
 * 2. Changes 'if.event.success' to 'action.success'
 * 3. Adds missing actionId field
 * 4. Adds reason field to error events
 * 5. Renames messageParams to params
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if we're in the right directory
const rootPath = path.dirname(__dirname);
if (!fs.existsSync(path.join(rootPath, 'packages/stdlib'))) {
  console.error('❌ Error: This script should be in a fix-action-tests folder under the sharpee root');
  process.exit(1);
}

// Check if TypeScript is available
exec('npx ts-node --version', (error) => {
  if (error) {
    console.log('⚠️  ts-node not found. Using simple JavaScript version instead.\n');
    
    // Use the simple version
    const simpleFixPath = path.join(__dirname, 'fix-events-simple.js');
    require(simpleFixPath);
    return;
  }

  console.log('🔧 Running event structure fix (TypeScript version)...\n');

  // Run the TypeScript fixer
  const fixerPath = path.join(__dirname, 'fix-event-structure.ts');
  const tsconfigPath = path.join(__dirname, 'tsconfig.fix.json');
  
  exec(`npx ts-node --project "${tsconfigPath}" "${fixerPath}"`, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error running TypeScript fixer:', error.message);
      console.log('\n💡 Falling back to simple JavaScript version...\n');
      
      // Fallback to simple version
      const simpleFixPath = path.join(__dirname, 'fix-events-simple.js');
      require(simpleFixPath);
      return;
    }

    console.log(stdout);
    
    if (stderr) {
      console.warn('⚠️  Warnings:', stderr);
    }
  });
});