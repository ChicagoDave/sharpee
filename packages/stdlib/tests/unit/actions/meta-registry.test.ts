/**
 * Tests for MetaCommandRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetaCommandRegistry } from '../../../src/actions/meta-registry';

describe('MetaCommandRegistry', () => {
  beforeEach(() => {
    // Reset to defaults before each test
    MetaCommandRegistry.reset();
  });
  
  describe('Pre-registered commands', () => {
    it('should have standard system commands registered', () => {
      expect(MetaCommandRegistry.isMeta('if.action.saving')).toBe(true);
      expect(MetaCommandRegistry.isMeta('if.action.restoring')).toBe(true);
      expect(MetaCommandRegistry.isMeta('if.action.quitting')).toBe(true);
      expect(MetaCommandRegistry.isMeta('if.action.restarting')).toBe(true);
    });
    
    it('should have information commands registered', () => {
      expect(MetaCommandRegistry.isMeta('if.action.scoring')).toBe(true);
      expect(MetaCommandRegistry.isMeta('if.action.version')).toBe(true);
      expect(MetaCommandRegistry.isMeta('if.action.help')).toBe(true);
    });
    
    it('should have transcript commands registered', () => {
      expect(MetaCommandRegistry.isMeta('transcript')).toBe(true);
      expect(MetaCommandRegistry.isMeta('transcript_on')).toBe(true);
      expect(MetaCommandRegistry.isMeta('transcript_off')).toBe(true);
    });
    
    it('should not have regular game commands registered', () => {
      expect(MetaCommandRegistry.isMeta('take')).toBe(false);
      expect(MetaCommandRegistry.isMeta('drop')).toBe(false);
      expect(MetaCommandRegistry.isMeta('look')).toBe(false);
      expect(MetaCommandRegistry.isMeta('go')).toBe(false);
    });
  });
  
  describe('Registration', () => {
    it('should allow registering new meta-commands', () => {
      expect(MetaCommandRegistry.isMeta('my_debug')).toBe(false);
      
      MetaCommandRegistry.register('my_debug');
      
      expect(MetaCommandRegistry.isMeta('my_debug')).toBe(true);
    });
    
    it('should handle empty action ID gracefully', () => {
      MetaCommandRegistry.register('');
      expect(MetaCommandRegistry.isMeta('')).toBe(false);
      
      MetaCommandRegistry.register(null as any);
      expect(MetaCommandRegistry.isMeta(null as any)).toBe(false);
    });
    
    it('should allow unregistering commands', () => {
      MetaCommandRegistry.register('temp_command');
      expect(MetaCommandRegistry.isMeta('temp_command')).toBe(true);
      
      const removed = MetaCommandRegistry.unregister('temp_command');
      expect(removed).toBe(true);
      expect(MetaCommandRegistry.isMeta('temp_command')).toBe(false);
    });
    
    it('should return false when unregistering non-existent command', () => {
      const removed = MetaCommandRegistry.unregister('does_not_exist');
      expect(removed).toBe(false);
    });
  });
  
  describe('Query methods', () => {
    it('should return all registered commands sorted', () => {
      const all = MetaCommandRegistry.getAll();
      
      expect(all).toContain('if.action.saving');
      expect(all).toContain('if.action.quitting');
      expect(all).toContain('if.action.scoring');
      
      // Check it's sorted
      const sorted = [...all].sort();
      expect(all).toEqual(sorted);
    });
    
    it('should count registered commands', () => {
      const initialCount = MetaCommandRegistry.count();
      expect(initialCount).toBeGreaterThan(10); // We have many defaults
      
      MetaCommandRegistry.register('new_command');
      expect(MetaCommandRegistry.count()).toBe(initialCount + 1);
    });
    
    it('should detect custom commands', () => {
      expect(MetaCommandRegistry.hasCustomCommands()).toBe(false);
      
      MetaCommandRegistry.register('author.parser_events');
      expect(MetaCommandRegistry.hasCustomCommands()).toBe(true);
    });
  });
  
  describe('Reset and clear', () => {
    it('should reset to defaults', () => {
      MetaCommandRegistry.register('custom_command');
      expect(MetaCommandRegistry.isMeta('custom_command')).toBe(true);
      
      MetaCommandRegistry.reset();
      
      expect(MetaCommandRegistry.isMeta('custom_command')).toBe(false);
      expect(MetaCommandRegistry.isMeta('if.action.saving')).toBe(true); // Defaults restored
    });
    
    it('should clear and restore defaults', () => {
      const initialCount = MetaCommandRegistry.count();
      
      MetaCommandRegistry.clear();
      
      expect(MetaCommandRegistry.count()).toBe(initialCount); // Same count after clear->reset
      expect(MetaCommandRegistry.isMeta('if.action.saving')).toBe(true); // Defaults restored
    });
  });
});