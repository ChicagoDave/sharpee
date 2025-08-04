#!/usr/bin/env node
/**
 * Script to remove scope validation tests from action unit tests
 * These tests check for "not visible", "not reachable", etc. which should be handled by CommandValidator
 */

const fs = require('fs');
const path = require('path');

// Pattern to identify scope-related test names
const scopeTestPatterns = [
  /should fail when.*not visible/i,
  /should fail when.*not reachable/i,
  /should fail when.*not held/i,
  /should fail when.*not in room/i,
  /should fail when.*not in inventory/i,
  /should fail when target is not visible/i,
  /should fail when target is not reachable/i,
  /should fail when recipient not visible/i,
  /should fail when recipient not reachable/i,
  /should fail when item not held and not in room/i
];

// Files to process
const testDir = path.join(__dirname, 'unit/actions');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('-golden.test.ts'));

console.log(`Processing ${files.length} test files...`);

let totalRemoved = 0;

files.forEach(filename => {
  const filePath = path.join(testDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let inScopeTest = false;
  let testStartLine = -1;
  let removedCount = 0;
  const newLines = [];
  let skipNextLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (skipNextLines > 0) {
      skipNextLines--;
      continue;
    }
    
    const line = lines[i];
    
    // Check if this is a scope-related test
    const isTestStart = line.match(/^\s*test\(['"`]/);
    if (isTestStart) {
      const isScopeTest = scopeTestPatterns.some(pattern => line.match(pattern));
      if (isScopeTest) {
        console.log(`  Removing from ${filename}: ${line.trim()}`);
        inScopeTest = true;
        testStartLine = i;
        removedCount++;
        continue;
      }
    }
    
    // Skip the entire test block
    if (inScopeTest) {
      // Look for the end of the test
      if (line.match(/^\s*}\);/)) {
        inScopeTest = false;
        continue;
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  if (removedCount > 0) {
    // Clean up any double blank lines
    const cleanedContent = newLines.join('\n').replace(/\n\n\n+/g, '\n\n');
    fs.writeFileSync(filePath, cleanedContent);
    console.log(`  Removed ${removedCount} tests from ${filename}`);
    totalRemoved += removedCount;
  }
});

console.log(`\nTotal tests removed: ${totalRemoved}`);

// Also update the test utils to remove the executeActionWithScopeValidation function
const testUtilsPath = path.join(__dirname, 'test-utils/index.ts');
if (fs.existsSync(testUtilsPath)) {
  console.log('\nCleaning up test-utils...');
  let utilsContent = fs.readFileSync(testUtilsPath, 'utf8');
  
  // Remove the imports we added
  utilsContent = utilsContent.replace(/import { StandardScopeResolver } from '\.\.\/\.\.\/src\/scope\/scope-resolver';\n/g, '');
  utilsContent = utilsContent.replace(/import { ScopeLevel } from '\.\.\/\.\.\/src\/scope\/types';\n/g, '');
  utilsContent = utilsContent.replace(/import { ActionMetadata } from '\.\.\/\.\.\/src\/validation\/types';\n/g, '');
  
  // Remove the executeActionWithScopeValidation function and isInScope helper
  const startMarker = '/**\n * Executes an action with scope validation';
  const endMarker = 'return scopeHierarchy[actualScope] <= scopeHierarchy[requiredScope];\n}';
  
  const startIdx = utilsContent.indexOf(startMarker);
  const endIdx = utilsContent.indexOf(endMarker);
  
  if (startIdx !== -1 && endIdx !== -1) {
    utilsContent = utilsContent.substring(0, startIdx) + utilsContent.substring(endIdx + endMarker.length + 1);
  }
  
  // Clean up imports in test files
  files.forEach(filename => {
    const filePath = path.join(testDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove executeActionWithScopeValidation import if present
    content = content.replace(/,\s*executeActionWithScopeValidation/g, '');
    content = content.replace(/executeActionWithScopeValidation,\s*/g, '');
    
    fs.writeFileSync(filePath, content);
  });
  
  fs.writeFileSync(testUtilsPath, utilsContent);
  console.log('Cleaned up test utils');
}

console.log('\nDone!');