#!/usr/bin/env node

// Quick test to verify WearableBehavior returns result objects, not events

const { WearableBehavior } = require('./packages/world-model/dist/traits/wearable/wearableBehavior');

// Mock entities
const item = {
  id: 'item1',
  get: (trait) => {
    if (trait === 'wearable') {
      return {
        worn: false,
        wornBy: undefined,
        slot: 'finger',
        layer: 0
      };
    }
  }
};

const actor = {
  id: 'actor1'
};

console.log('Testing WearableBehavior.wear()...');
const result = WearableBehavior.wear(item, actor);

console.log('Result:', result);
console.log('Type:', typeof result);
console.log('Is Array?', Array.isArray(result));
console.log('Has success property?', 'success' in result);

if (result.success === true && result.slot === 'finger') {
  console.log('✅ PASS: WearableBehavior.wear() returns a result object as expected');
} else {
  console.log('❌ FAIL: Unexpected result structure');
}