#!/usr/bin/env node
/**
 * Clean up orphaned code from removed tests
 */

const fs = require('fs');
const path = require('path');

// File to clean
const filePath = path.join(__dirname, 'unit/actions/drinking-golden.test.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Find the test for 'should fail when no item specified' and remove orphaned code after it
const lines = content.split('\n');
const cleanedLines = [];
let skipOrphaned = false;
let inTest = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if we're in a test
  if (line.match(/^\s*test\(/)) {
    inTest = true;
    skipOrphaned = false;
  }
  
  // Check if we're at the end of a test
  if (inTest && line.match(/^\s*}\);/)) {
    cleanedLines.push(line);
    inTest = false;
    // Check if next lines are orphaned code (not a test start)
    if (i + 1 < lines.length && !lines[i + 1].match(/^\s*(test|describe|it)\(/)) {
      // Look ahead to see if this is orphaned code
      let hasTestStart = false;
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        if (lines[j].match(/^\s*(test|describe)\(/)) {
          hasTestStart = true;
          break;
        }
      }
      if (!hasTestStart) {
        skipOrphaned = true;
      }
    }
    continue;
  }
  
  // Skip orphaned code until we find a test or describe
  if (skipOrphaned) {
    if (line.match(/^\s*(test|describe)\(/)) {
      skipOrphaned = false;
      cleanedLines.push(line);
    }
    continue;
  }
  
  cleanedLines.push(line);
}

// Write cleaned content
const cleanedContent = cleanedLines.join('\n');
fs.writeFileSync(filePath, cleanedContent);

console.log('Cleaned up orphaned code from drinking-golden.test.ts');

// Also check for other files with similar issues
const testFiles = [
  'eating-golden.test.ts',
  'giving-golden.test.ts',
  'inserting-golden.test.ts',
  'listening-golden.test.ts',
  'pulling-golden.test.ts',
  'pushing-golden.test.ts',
  'putting-golden.test.ts',
  'searching-golden.test.ts',
  'smelling-golden.test.ts',
  'switching_off-golden.test.ts',
  'switching_on-golden.test.ts',
  'touching-golden.test.ts',
  'wearing-golden.test.ts'
];

testFiles.forEach(filename => {
  const testPath = path.join(__dirname, 'unit/actions', filename);
  if (fs.existsSync(testPath)) {
    let testContent = fs.readFileSync(testPath, 'utf8');
    
    // Remove any executeActionWithScopeValidation references
    if (testContent.includes('executeActionWithScopeValidation')) {
      testContent = testContent.replace(/executeActionWithScopeValidation/g, '');
      fs.writeFileSync(testPath, testContent);
      console.log(`Cleaned references from ${filename}`);
    }
  }
});

console.log('Done!');