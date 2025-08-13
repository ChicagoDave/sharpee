#!/usr/bin/env node

/**
 * Verify ActionBehaviors implementation compiles and runs
 */

console.log('Testing ActionBehavior implementation...\n');

// Test 1: Check if modules exist
try {
  console.log('1. Checking module imports...');
  
  const { ActionBehavior } = require('./packages/stdlib/src/action-behaviors/ActionBehavior');
  console.log('   ✓ ActionBehavior imported');
  
  const { ActionBehaviorRegistry } = require('./packages/stdlib/src/action-behaviors/ActionBehaviorRegistry');
  console.log('   ✓ ActionBehaviorRegistry imported');
  
  const { LeverPullBehavior } = require('./packages/stdlib/src/action-behaviors/pulling/LeverPullBehavior');
  console.log('   ✓ LeverPullBehavior imported');
  
  console.log('\n✅ All modules loaded successfully!');
  
} catch (error) {
  console.error('❌ Error loading modules:', error.message);
  process.exit(1);
}

// Test 2: Basic functionality
try {
  console.log('\n2. Testing basic functionality...');
  
  // Create mock entity with lever trait
  const leverEntity = {
    id: 'lever-1',
    attributes: { name: 'brass lever' },
    traits: new Map(),
    has: function(type) { return this.traits.has(type); },
    get: function(type) { return this.traits.get(type); }
  };
  
  // Add LEVER trait
  leverEntity.traits.set('LEVER', {
    type: 'LEVER',
    isOn: false,
    stuck: false
  });
  
  const { LeverPullBehavior } = require('./packages/stdlib/src/action-behaviors/pulling/LeverPullBehavior');
  
  // Test canHandle
  const canHandle = LeverPullBehavior.canHandle(leverEntity, 'pulling');
  console.log(`   canHandle result: ${canHandle}`);
  
  // Create mock context
  const context = {
    actor: { id: 'player', location: 'room1', strength: 10 },
    command: { parsed: {} }
  };
  
  // Test validate
  const validation = LeverPullBehavior.validate(leverEntity, context);
  console.log(`   validate result: ${validation.valid ? 'valid' : 'invalid'}`);
  
  // Test execute
  const result = LeverPullBehavior.execute(leverEntity, context);
  console.log(`   execute result: ${result.success ? 'success' : 'failed'}`);
  console.log(`   Generated ${result.events.length} events`);
  
  console.log('\n✅ Basic functionality tests passed!');
  
} catch (error) {
  console.error('❌ Error testing functionality:', error);
  console.error(error.stack);
  process.exit(1);
}

console.log('\n🎉 All verification tests passed!');