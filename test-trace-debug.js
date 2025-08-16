#!/usr/bin/env node

/**
 * Test trace command functionality
 */

const { GameEngine } = require('./packages/engine');
const { WorldModel } = require('./packages/world-model');
const { EnglishParser } = require('./packages/parser-en-us');
const { EnglishLanguageProvider } = require('./packages/lang-en-us');

async function testTrace() {
  console.log('=== Testing Trace Command ===\n');
  
  // Create minimal world
  const world = new WorldModel();
  const player = world.createEntity({
    id: 'player',
    traits: {
      identity: { name: 'Player' },
      actor: { isPlayer: true }
    }
  });
  
  const room = world.createEntity({
    id: 'room',
    traits: {
      identity: { name: 'Test Room' },
      room: {}
    }
  });
  
  world.moveEntity('player', 'room');
  
  // Create language and parser
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser();
  
  // Simple text service
  const textService = {
    formatEvents: (events) => {
      return events.map(e => `[${e.type}] ${JSON.stringify(e.data || {})}`).join('\n');
    }
  };
  
  // Create engine
  const engine = new GameEngine({
    world,
    player,
    parser,
    language,
    textService
  });
  
  console.log('Initial debug state:', world.getCapability('debug') || 'undefined');
  
  // Test trace commands
  const tests = [
    { cmd: 'trace', desc: 'Show trace status' },
    { cmd: 'trace parser on', desc: 'Enable parser tracing' },
    { cmd: 'look', desc: 'Command with parser trace on' },
    { cmd: 'trace validation on', desc: 'Enable validation tracing' },
    { cmd: 'examine room', desc: 'Command with both traces on' },
    { cmd: 'trace off', desc: 'Disable all tracing' },
    { cmd: 'look', desc: 'Command with traces off' }
  ];
  
  for (const test of tests) {
    console.log(`\n> ${test.cmd} (${test.desc})`);
    try {
      const result = await engine.executeTurn(test.cmd);
      
      // Show debug state after command
      const debugState = world.getCapability('debug');
      console.log('Debug state:', debugState || 'undefined');
      
      // Show events
      console.log('Events:', result.events.length);
      result.events.forEach(e => {
        console.log(`  [${e.type}] ${JSON.stringify(e.data || {})}`);
      });
      
      // Look for system events
      const systemEvents = result.events.filter(e => e.type.startsWith('system.'));
      if (systemEvents.length > 0) {
        console.log('SYSTEM EVENTS FOUND:', systemEvents.length);
      }
      
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

testTrace().catch(console.error);