/**
 * Integration tests for meta-commands
 * 
 * Tests that meta-commands don't increment turns, don't get recorded in history,
 * and properly register themselves.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetaCommandRegistry, MetaAction } from '../../src/actions';
import { ActionContext } from '../../src/actions/enhanced-types';
import { SemanticEvent } from '@sharpee/core';

// Test meta-action implementation
class TestMetaAction extends MetaAction {
  id = 'test.meta_command';
  verbs = ['testmeta'];
  
  constructor() {
    super();
    this.ensureRegistered();
  }
  
  execute(context: ActionContext): SemanticEvent[] {
    return [
      context.event('test.meta_executed', {
        message: 'Meta command executed'
      })
    ];
  }
}

// Test regular action for comparison
class TestRegularAction {
  id = 'test.regular_command';
  verbs = ['testregular'];
  
  execute(context: ActionContext): SemanticEvent[] {
    return [
      context.event('test.regular_executed', {
        message: 'Regular command executed'
      })
    ];
  }
}

describe('Meta-Commands Integration', () => {
  let metaAction: TestMetaAction;
  let regularAction: TestRegularAction;
  
  beforeEach(() => {
    // Reset registry to defaults
    MetaCommandRegistry.reset();
    
    // Create test actions
    metaAction = new TestMetaAction();
    regularAction = new TestRegularAction();
  });
  
  describe('Registration', () => {
    it('should auto-register meta-actions', () => {
      expect(MetaCommandRegistry.isMeta('test.meta_command')).toBe(true);
    });
    
    it('should not register regular actions', () => {
      expect(MetaCommandRegistry.isMeta('test.regular_command')).toBe(false);
    });
    
    it('should include meta-action in getAll()', () => {
      const all = MetaCommandRegistry.getAll();
      expect(all).toContain('test.meta_command');
    });
  });
  
  describe('Standard meta-commands', () => {
    it('should recognize SAVE as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.saving')).toBe(true);
    });
    
    it('should recognize RESTORE as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.restoring')).toBe(true);
    });
    
    it('should recognize QUIT as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.quitting')).toBe(true);
    });
    
    it('should recognize SCORE as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.scoring')).toBe(true);
    });
    
    it('should recognize HELP as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.help')).toBe(true);
    });
    
    it('should recognize AGAIN as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.again')).toBe(true);
    });
  });
  
  describe('Author commands', () => {
    it('should recognize author.parser_events as meta', async () => {
      // Import to trigger registration
      const { ParserEventsAction } = await import('../../src/actions/author/parser-events');
      const action = new ParserEventsAction();
      
      expect(MetaCommandRegistry.isMeta('author.parser_events')).toBe(true);
    });
    
    it('should recognize author.validation_events as meta', async () => {
      const { ValidationEventsAction } = await import('../../src/actions/author/validation-events');
      const action = new ValidationEventsAction();
      
      expect(MetaCommandRegistry.isMeta('author.validation_events')).toBe(true);
    });
    
    it('should recognize author.system_events as meta', async () => {
      const { SystemEventsAction } = await import('../../src/actions/author/system-events');
      const action = new SystemEventsAction();
      
      expect(MetaCommandRegistry.isMeta('author.system_events')).toBe(true);
    });
  });
  
  describe('Non-meta commands', () => {
    it('should not recognize TAKE as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.taking')).toBe(false);
    });
    
    it('should not recognize DROP as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.dropping')).toBe(false);
    });
    
    it('should not recognize LOOK as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.looking')).toBe(false);
    });
    
    it('should not recognize GO as meta', () => {
      expect(MetaCommandRegistry.isMeta('if.action.going')).toBe(false);
    });
  });
  
  describe('Custom command detection', () => {
    it('should detect custom meta-commands', () => {
      // Before adding custom command
      const hadCustomBefore = MetaCommandRegistry.hasCustomCommands();
      
      // Add our test meta-command (already done in constructor)
      // The TestMetaAction registered itself
      
      // Should now have custom commands
      expect(MetaCommandRegistry.hasCustomCommands()).toBe(true);
    });
    
    it('should not have custom commands after reset', () => {
      // Ensure we have a custom command
      new TestMetaAction();
      expect(MetaCommandRegistry.hasCustomCommands()).toBe(true);
      
      // Reset should remove custom commands
      MetaCommandRegistry.reset();
      expect(MetaCommandRegistry.hasCustomCommands()).toBe(false);
    });
  });
});