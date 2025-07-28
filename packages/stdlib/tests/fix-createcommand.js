#!/usr/bin/env node

/**
 * Script to fix createCommand calls in test files
 * Updates the old positional parameter style to the new options object style
 */

const fs = require('fs');
const path = require('path');

// Define the test directory
const testDir = path.join(__dirname, '..');

let totalFixed = 0;
let filesModified = 0;

function fixCreateCommandCalls(content, filePath) {
  let modified = false;
  let newContent = content;
  
  // Pattern 1: createCommand with two entity objects and optional preposition
  // Example: createCommand(IFActions.PUTTING, { entity: coin }, { entity: box, preposition: 'in' })
  const pattern1 = /createCommand\s*\(\s*([^,]+),\s*\{\s*entity:\s*([^}]+)\s*\}\s*,\s*\{\s*entity:\s*([^,}]+)(?:,\s*preposition:\s*([^}]+))?\s*\}\s*\)/g;
  
  newContent = newContent.replace(pattern1, (match, actionId, entity1, entity2, preposition) => {
    modified = true;
    totalFixed++;
    
    if (preposition) {
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
  
  // Pattern 2: createCommand with single line format
  // Example: createCommand(\n        IFActions.PUTTING,\n        { entity: table },\n        { entity: table, preposition: 'on' }\n      )
  const pattern2 = /createCommand\s*\(\s*\n\s*([^,]+),\s*\n\s*\{\s*entity:\s*([^}]+)\s*\},\s*\n\s*\{\s*entity:\s*([^,}]+)(?:,\s*preposition:\s*([^}]+))?\s*\}\s*\n\s*\)/g;
  
  newContent = newContent.replace(pattern2, (match, actionId, entity1, entity2, preposition) => {
    modified = true;
    totalFixed++;
    
    if (preposition) {
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
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = fixCreateCommandCalls(content, filePath);
    
    if (content !== newContent) {
      // Create backup
      fs.writeFileSync(filePath + '.bak', content);
      // Write updated content
      fs.writeFileSync(filePath, newContent);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      processFile(fullPath);
    }
  }
}

console.log('Starting createCommand fix...');
console.log('Processing directory:', testDir);

processDirectory(testDir);

console.log(`\nCompleted!`);
console.log(`Total fixes: ${totalFixed}`);
console.log(`Files modified: ${filesModified}`);
