#!/usr/bin/env node
/**
 * Script to update action tests to use executeActionWithScopeValidation
 * for tests that check scope-related failures
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Pattern to find tests that check for not_visible or not_reachable errors
const scopeTestPattern = /test\(['"](should fail when.*(?:not visible|not reachable|not held|not in room|not in inventory))['"][\s\S]*?drinkingAction\.execute\(context\)/g;

// Files to process
const testFiles = glob.sync('tests/unit/actions/*-golden.test.ts', {
  cwd: __dirname,
  absolute: true
});

console.log(`Found ${testFiles.length} test files to check`);

testFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file imports the helper
  const hasImport = content.includes('executeActionWithScopeValidation');
  
  // Check if file has scope-related tests
  const hasScopeTests = content.match(/should fail when.*(?:not visible|not reachable|not held|not in room)/);
  
  if (!hasScopeTests) {
    return;
  }
  
  let updated = content;
  
  // Add import if missing
  if (!hasImport) {
    updated = updated.replace(
      /from '\.\.\/\.\.\/test-utils';/,
      `from '../../test-utils';`
    ).replace(
      /createCommand,\s*setupBasicWorld/,
      `createCommand,
  setupBasicWorld,
  executeActionWithScopeValidation`
    );
  }
  
  // Update all action.execute calls to use executeActionWithScopeValidation
  // But only in tests that check for scope errors
  const lines = updated.split('\n');
  let inScopeTest = false;
  let updatedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're entering a scope-related test
    if (line.match(/test\(['"](should fail when.*(?:not visible|not reachable|not held|not in room))/)) {
      inScopeTest = true;
    }
    
    // Check if we're exiting a test
    if (line.match(/^\s*}\);/) && inScopeTest) {
      inScopeTest = false;
    }
    
    // Replace action.execute with executeActionWithScopeValidation in scope tests
    if (inScopeTest && line.match(/const events = \w+Action\.execute\(context\);/)) {
      const actionMatch = line.match(/const events = (\w+Action)\.execute\(context\);/);
      if (actionMatch) {
        updatedLines.push(line.replace(
          /const events = (\w+Action)\.execute\(context\);/,
          `const events = executeActionWithScopeValidation($1, context);`
        ));
        continue;
      }
    }
    
    updatedLines.push(line);
  }
  
  updated = updatedLines.join('\n');
  
  if (updated !== content) {
    fs.writeFileSync(filePath, updated);
    console.log(`Updated ${path.basename(filePath)}`);
  }
});

console.log('Done!');