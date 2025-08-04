#!/usr/bin/env node

/**
 * Script to remove scope checks from actions and add metadata
 */

const fs = require('fs');
const path = require('path');

// Actions that need scope checks removed and metadata added
const actionsToUpdate = [
  // Already done: 'taking', 'pushing', 'pulling'
  { name: 'searching', scope: 'REACHABLE' },
  { name: 'smelling', scope: 'DETECTABLE' },
  { name: 'throwing', directScope: 'CARRIED', indirectScope: 'VISIBLE' },
  { name: 'showing', directScope: 'CARRIED', indirectScope: 'VISIBLE' },
  { name: 'switching_on', scope: 'REACHABLE' },
  { name: 'switching_off', scope: 'REACHABLE' },
  { name: 'eating', scope: 'REACHABLE' },
  { name: 'drinking', scope: 'REACHABLE' },
  { name: 'listening', scope: 'AUDIBLE' },
  { name: 'giving', directScope: 'CARRIED', indirectScope: 'REACHABLE' },
  { name: 'opening', scope: 'REACHABLE' },
  { name: 'closing', scope: 'REACHABLE' },
  { name: 'locking', scope: 'REACHABLE' },
  { name: 'unlocking', scope: 'REACHABLE' },
  { name: 'touching', scope: 'REACHABLE' },
  { name: 'turning', scope: 'REACHABLE' },
  { name: 'wearing', scope: 'REACHABLE' },
  { name: 'taking_off', scope: 'CARRIED' },
  { name: 'putting', directScope: 'CARRIED', indirectScope: 'REACHABLE' },
  { name: 'inserting', directScope: 'CARRIED', indirectScope: 'REACHABLE' },
  { name: 'removing', scope: 'REACHABLE' }
];

// Actions that just need metadata added (no scope checks to remove)
const actionsNeedingMetadata = [
  { name: 'examining', scope: 'VISIBLE' },
  { name: 'looking' }, // No object requirements
  { name: 'inventory' }, // No object requirements
  { name: 'going', scope: 'VISIBLE' },
  { name: 'entering', scope: 'REACHABLE' },
  { name: 'exiting', scope: 'REACHABLE' },
  { name: 'climbing', scope: 'REACHABLE' },
  { name: 'attacking', scope: 'REACHABLE' },
  { name: 'talking', scope: 'AUDIBLE' },
  { name: 'dropping', scope: 'CARRIED' },
  { name: 'waiting' }, // No object requirements
  { name: 'sleeping' }, // No object requirements
  { name: 'scoring' }, // No object requirements
  { name: 'help' }, // No object requirements
  { name: 'about' }, // No object requirements
  { name: 'saving' }, // No object requirements
  { name: 'restoring' }, // No object requirements
  { name: 'quitting' }, // No object requirements
  { name: 'restarting' }, // No object requirements
  { name: 'again' } // Special case - repeats previous command
];

console.log('Actions that need scope checks removed:');
actionsToUpdate.forEach(action => {
  const actionPath = path.join(__dirname, `../src/actions/standard/${action.name}/${action.name}.ts`);
  if (fs.existsSync(actionPath)) {
    console.log(`✓ ${action.name} - ${action.scope || `direct: ${action.directScope}, indirect: ${action.indirectScope}`}`);
  } else {
    console.log(`✗ ${action.name} - FILE NOT FOUND`);
  }
});

console.log('\nActions that just need metadata:');
actionsNeedingMetadata.forEach(action => {
  const actionPath = path.join(__dirname, `../src/actions/standard/${action.name}/${action.name}.ts`);
  if (fs.existsSync(actionPath)) {
    console.log(`✓ ${action.name} - ${action.scope || 'no object requirements'}`);
  } else {
    // Try platform actions
    const platformPath = path.join(__dirname, `../src/actions/platform/${action.name}/${action.name}.ts`);
    if (fs.existsSync(platformPath)) {
      console.log(`✓ ${action.name} (platform) - ${action.scope || 'no object requirements'}`);
    } else {
      console.log(`✗ ${action.name} - FILE NOT FOUND`);
    }
  }
});