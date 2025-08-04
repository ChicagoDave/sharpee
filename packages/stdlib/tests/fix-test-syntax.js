#!/usr/bin/env node
/**
 * Fix syntax errors in test files after removing scope tests
 */

const fs = require('fs');
const path = require('path');

// Test files that likely have syntax errors
const testFiles = [
  'eating-golden.test.ts',
  'examining-golden.test.ts',
  'giving-golden.test.ts',
  'inserting-golden.test.ts',
  'listening-golden.test.ts',
  'locking-golden.test.ts',
  'pulling-golden.test.ts',
  'pushing-golden.test.ts',
  'putting-golden.test.ts',
  'searching-golden.test.ts',
  'smelling-golden.test.ts',
  'switching_off-golden.test.ts',
  'switching_on-golden.test.ts',
  'talking-golden.test.ts',
  'touching-golden.test.ts',
  'unlocking-golden.test.ts',
  'wearing-golden.test.ts',
  'throwing-golden.test.ts'
];

testFiles.forEach(filename => {
  const filePath = path.join(__dirname, 'unit/actions', filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filename} - not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix pattern: remove orphaned closing braces and semicolons
  // Look for patterns like:
  // });
  //
  // describe('Something', () => {
  
  const lines = content.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
    
    // Skip orphaned closing braces
    if (line.trim() === '});' && 
        nextLine.trim() === '' && 
        nextNextLine.match(/^\s*(describe|test|it)\(/)) {
      console.log(`Removing orphaned }); in ${filename} at line ${i + 1}`);
      continue;
    }
    
    // Skip orphaned code fragments that start with spaces but aren't in a test/describe block
    if (line.match(/^\s{4,}\w/) && !line.match(/^\s*(describe|test|it|expect|const|let|var|\/\/|\/\*|\*)/)) {
      // Look back to see if we're in a test block
      let inBlock = false;
      for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
        if (lines[j].match(/^\s*(test|it)\(/)) {
          inBlock = true;
          break;
        }
        if (lines[j].match(/^\s*}\);/)) {
          break;
        }
      }
      if (!inBlock) {
        console.log(`Removing orphaned code in ${filename} at line ${i + 1}: ${line.trim()}`);
        continue;
      }
    }
    
    fixedLines.push(line);
  }
  
  const fixedContent = fixedLines.join('\n');
  
  // Additional cleanup: fix double closing braces
  const cleanedContent = fixedContent
    .replace(/}\);\s*}\);/g, '});')
    .replace(/\n\n\n+/g, '\n\n');
  
  if (cleanedContent !== content) {
    fs.writeFileSync(filePath, cleanedContent);
    console.log(`Fixed ${filename}`);
  }
});

console.log('Done!');