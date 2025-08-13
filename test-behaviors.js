#!/usr/bin/env node

/**
 * Simple test runner to verify ActionBehavior implementation
 */

const { LeverPullBehavior } = require('./packages/stdlib/dist/action-behaviors/pulling/LeverPullBehavior');
const { createMockContext } = require('./packages/stdlib/dist/action-behaviors/utils');
const { TraitType } = require('./packages/world-model/dist');

console.log('Testing ActionBehavior Implementation...\n');

// Test LeverPullBehavior
const context = createMockContext();
const lever = {
  id: 'lever-1',
  name: 'brass lever',
  traits: new Map([
    [TraitType.LEVER, {
      type: TraitType.LEVER,
      isOn: false,
      stuck: false,
      springLoaded: false
    }]
  ])
};

console.log('1. Testing LeverPullBehavior.canHandle()');
const canHandle = LeverPullBehavior.canHandle(lever, 'pulling');
console.log(`   Result: ${canHandle ? 'PASS' : 'FAIL'} (expected: true)`);

console.log('\n2. Testing LeverPullBehavior.validate()');
const validation = LeverPullBehavior.validate(lever, context);
console.log(`   Result: ${validation.valid ? 'PASS' : 'FAIL'} (expected: true)`);

console.log('\n3. Testing LeverPullBehavior.execute()');
const result = LeverPullBehavior.execute(lever, context);
console.log(`   Success: ${result.success ? 'PASS' : 'FAIL'}`);
console.log(`   MessageId: ${result.messageId}`);
console.log(`   Events: ${result.events.length} event(s) generated`);

console.log('\n✅ Basic ActionBehavior tests completed!');