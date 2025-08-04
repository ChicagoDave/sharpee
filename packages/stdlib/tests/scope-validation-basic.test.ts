/**
 * Basic test to verify scope validation is working
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { CommandValidator } from '../src/validation/command-validator';
import { StandardActionRegistry } from '../src/actions/registry';
import { WorldModel } from '@sharpee/world-model';

describe('Basic Scope Validation', () => {
  it('should validate a simple command', () => {
    const world = new WorldModel();
    const registry = new StandardActionRegistry();
    const validator = new CommandValidator(world, registry);
    
    // Try to validate a command without any actions registered
    const command = {
      rawInput: 'take coin',
      action: 'take',
      tokens: ['take', 'coin'],
      structure: {
        verb: { tokens: [0], text: 'take', head: 'take' },
        directObject: { 
          text: 'coin',
          candidates: ['coin'],
          modifiers: []
        }
      },
      pattern: 'VERB_OBJECT',
      confidence: 1.0
    };
    
    const result = validator.validate(command);
    console.log('Validation result:', result);
    
    // Should fail because no action is registered
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ACTION_NOT_AVAILABLE');
  });
});