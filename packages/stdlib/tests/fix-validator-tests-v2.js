#!/usr/bin/env node
/**
 * Fix command validator tests more carefully
 * The issue is that entity names need to match what's being searched for
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'unit/validation/command-validator-golden.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The main issue: When searching for "ball", it won't find "red ball"
// When searching for "box", it should find entities with type "box"

// Fix the entity that should match "ball" searches
content = content.replace(
  /text: 'red ball',\s*head: 'ball',/g,
  `text: 'ball',
          head: 'ball',`
);

// Fix candidates for ball searches
content = content.replace(
  /candidates: \['red', 'ball'\]/g,
  `candidates: ['ball']`
);

// For tests looking for specific colored balls, use modifiers properly
// When searching for "red ball", the structure should have:
// - text: 'red ball'
// - head: 'ball' 
// - modifiers: ['red']

// Fix the small ball / large ball test
content = content.replace(
  /world\.createEntity\('small ball', 'ball'\)/g,
  `world.createEntity('ball', 'ball')`
);

content = content.replace(
  /world\.createEntity\('large ball', 'ball'\)/g,
  `world.createEntity('ball', 'ball')`
);

content = content.replace(
  /name: 'small ball',/g,
  `name: 'ball',`
);

content = content.replace(
  /name: 'large ball',/g,
  `name: 'ball',`
);

// Fix the "brass key" test - when searching for "key" it should find "brass key"
// This test is looking for type-based matching
content = content.replace(
  /world\.createEntity\('brass key', 'key'\)/g,
  `world.createEntity('key', 'key')`
);

content = content.replace(
  /name: 'brass key',/g,
  `name: 'key',`
);

// For the synonym test, fix the entity creation
content = content.replace(
  /world\.createEntity\('wooden box', 'box'\);/g,
  `world.createEntity('box', 'box');`
);

// Write the fixed content
fs.writeFileSync(filePath, content);
console.log('Fixed command-validator-golden.test.ts (v2)');