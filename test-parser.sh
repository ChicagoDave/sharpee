#!/bin/bash
# Debug script to check what's happening with parsing

echo -e "\033[36m=== Parser Debug Test ===\033[0m"

# Create a simple test script
cat > test-parser.js << 'EOF'
const { BasicParser } = require('./packages/stdlib/dist/parser/basic-parser.js');
const langProvider = require('./packages/lang-en-us/dist/language-provider.js').default;

console.log('Language provider:', langProvider.languageCode);

const parser = new BasicParser(langProvider);

// Test tokenization
console.log('\n=== Testing tokenization ===');
const testInputs = ['look', 'examine cloak', 'west', 'inventory'];

for (const input of testInputs) {
  console.log(`\nInput: "${input}"`);
  const result = parser.parse(input);
  console.log('Success:', result.success);
  if (result.success) {
    console.log('Action:', result.value.action);
    console.log('Direct object:', result.value.directObject);
  } else {
    console.log('Error:', result.error.message);
  }
}

// Check vocabulary
console.log('\n=== Checking vocabulary ===');
const verbs = langProvider.getVerbs();
console.log('Total verbs:', verbs.length);
console.log('Sample verbs:', verbs.slice(0, 3).map(v => ({ action: v.actionId, verbs: v.verbs })));

// Find examine
const examineVerb = verbs.find(v => v.verbs.includes('examine'));
console.log('\nExamine verb:', examineVerb);
EOF

# Override Node module resolution
NODE_PATH="packages/core:packages/world-model:packages/event-processor:packages/stdlib:packages/lang-en-us:packages/engine" \
node --require ./module-resolver.js test-parser.js

# Clean up
rm test-parser.js
