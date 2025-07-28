#!/usr/bin/env node

/**
 * Script to fix createCommand calls in test files for Priority 2
 * Updates the old two-parameter style to the new single options object style
 */

const fs = require('fs');
const path = require('path');

// Define the test files that need fixing
const filesToFix = [
  'tests/unit/actions/giving-golden.test.ts',
  'tests/unit/actions/showing-golden.test.ts', 
  'tests/unit/actions/throwing-golden.test.ts',
  'tests/unit/actions/unlocking-golden.test.ts',
  'tests/unit/actions/locking-golden.test.ts',
  'tests/unit/actions/inserting-golden.test.ts',
  'tests/unit/actions/removing-golden.test.ts'
];

let totalFixed = 0;
let filesModified = 0;

function fixCreateCommandCalls(content, filePath) {
  let modified = false;
  let newContent = content;
  
  // Pattern to match createCommand with two object parameters
  // This regex handles multi-line createCommand calls
  const pattern = /createCommand\s*\(\s*([^,]+),\s*\{\s*entity:\s*([^}]+)\s*\}(?:,\s*\{\s*entity:\s*([^,}]+)(?:,\s*preposition:\s*([^}]+))?\s*\})?\s*\)/gs;
  
  newContent = newContent.replace(pattern, (match, actionId, entity1, entity2, preposition) => {
    // If there's no second entity, just return the match as-is
    if (!entity2) {
      return match;
    }
    
    modified = true;
    totalFixed++;
    
    // Clean up the values
    actionId = actionId.trim();
    entity1 = entity1.trim();
    entity2 = entity2.trim();
    
    if (preposition) {
      preposition = preposition.trim();
      return `createCommand(${actionId}, {
        entity: ${entity1},
        secondEntity: ${entity2},
        preposition: ${preposition}
      })`;
    } else {
      return `createCommand(${actionId}, {
        entity: ${entity1},
        secondEntity: ${entity2}
      })`;
    }
  });
  
  if (modified) {
    console.log(`Fixed ${filePath}`);
    filesModified++;
  }
  
  return newContent;
}

function processFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const newContent = fixCreateCommandCalls(content, filePath);
    
    if (content !== newContent) {
      // Create backup
      const backupPath = fullPath + '.priority2.bak';
      fs.writeFileSync(backupPath, content);
      console.log(`Created backup: ${backupPath}`);
      
      // Write updated content
      fs.writeFileSync(fullPath, newContent);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log('Starting Priority 2 createCommand fix...');
console.log('This fixes two-object command patterns\n');

filesToFix.forEach(processFile);

console.log(`\nCompleted!`);
console.log(`Total fixes: ${totalFixed}`);
console.log(`Files modified: ${filesModified}`);
