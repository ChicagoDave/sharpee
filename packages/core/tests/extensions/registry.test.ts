/**
 * Extension Registry Tests
 *
 * Tests the plugin registration system used for commands, abilities,
 * events, and parser extensions.
 */

import { describe, it, expect } from 'vitest';
import { createExtensionRegistry, ExtensionRegistry } from '../../src/extensions/registry';
import { ExtensionType, ICommandExtension } from '../../src/extensions/types';

function makeExtension(id: string, verbs: string[] = []): ICommandExtension {
  return { id, name: `Extension ${id}`, verbs };
}

describe('ExtensionRegistry', () => {
  let registry: ExtensionRegistry;

  beforeEach(() => {
    registry = createExtensionRegistry();
  });

  describe('register and retrieve', () => {
    it('should register and retrieve an extension', () => {
      const ext = makeExtension('take-cmd', ['take', 'get']);
      registry.register(ExtensionType.COMMAND, ext);

      const retrieved = registry.get<ICommandExtension>(ExtensionType.COMMAND, 'take-cmd');
      expect(retrieved).toBe(ext);
      expect(retrieved?.verbs).toEqual(['take', 'get']);
    });

    it('should return undefined for unregistered extension', () => {
      const result = registry.get(ExtensionType.COMMAND, 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return undefined for unregistered type', () => {
      const result = registry.get(ExtensionType.ABILITY, 'anything');
      expect(result).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true for registered extension', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('drop-cmd'));

      expect(registry.has(ExtensionType.COMMAND, 'drop-cmd')).toBe(true);
    });

    it('should return false for unregistered extension', () => {
      expect(registry.has(ExtensionType.COMMAND, 'missing')).toBe(false);
    });
  });

  describe('remove()', () => {
    it('should remove a registered extension', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('temp-cmd'));

      expect(registry.has(ExtensionType.COMMAND, 'temp-cmd')).toBe(true);

      const removed = registry.remove(ExtensionType.COMMAND, 'temp-cmd');

      expect(removed).toBe(true);
      expect(registry.has(ExtensionType.COMMAND, 'temp-cmd')).toBe(false);
      expect(registry.get(ExtensionType.COMMAND, 'temp-cmd')).toBeUndefined();
    });

    it('should return false when removing nonexistent extension', () => {
      expect(registry.remove(ExtensionType.COMMAND, 'ghost')).toBe(false);
    });

    it('should update count after removal', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('a'));
      registry.register(ExtensionType.COMMAND, makeExtension('b'));

      expect(registry.count(ExtensionType.COMMAND)).toBe(2);

      registry.remove(ExtensionType.COMMAND, 'a');

      expect(registry.count(ExtensionType.COMMAND)).toBe(1);
    });
  });

  describe('count()', () => {
    it('should return 0 for empty type', () => {
      expect(registry.count(ExtensionType.COMMAND)).toBe(0);
    });

    it('should count registered extensions', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('x'));
      registry.register(ExtensionType.COMMAND, makeExtension('y'));
      registry.register(ExtensionType.COMMAND, makeExtension('z'));

      expect(registry.count(ExtensionType.COMMAND)).toBe(3);
    });
  });

  describe('duplicate registration', () => {
    it('should throw on duplicate ID within same type', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('dup'));

      expect(() => {
        registry.register(ExtensionType.COMMAND, makeExtension('dup'));
      }).toThrow('already registered');
    });

    it('should allow same ID in different types', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('shared'));
      // Ability type also accepts ICommandExtension since it's a superset
      registry.register(ExtensionType.ABILITY, makeExtension('shared') as any);

      expect(registry.has(ExtensionType.COMMAND, 'shared')).toBe(true);
      expect(registry.has(ExtensionType.ABILITY, 'shared')).toBe(true);
    });
  });

  describe('getAll() and ordering', () => {
    it('should return extensions in registration order', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('first'));
      registry.register(ExtensionType.COMMAND, makeExtension('second'));
      registry.register(ExtensionType.COMMAND, makeExtension('third'));

      const all = registry.getAll<ICommandExtension>(ExtensionType.COMMAND);

      expect(all.map(e => e.id)).toEqual(['first', 'second', 'third']);
    });

    it('should return empty array for unregistered type', () => {
      expect(registry.getAll(ExtensionType.PARSER)).toEqual([]);
    });

    it('should respect custom processing order', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('a'));
      registry.register(ExtensionType.COMMAND, makeExtension('b'));
      registry.register(ExtensionType.COMMAND, makeExtension('c'));

      registry.setProcessingOrder(ExtensionType.COMMAND, ['c', 'a', 'b']);

      const all = registry.getAll<ICommandExtension>(ExtensionType.COMMAND);
      expect(all.map(e => e.id)).toEqual(['c', 'a', 'b']);
    });

    it('should throw if processing order references unknown ID', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('a'));

      expect(() => {
        registry.setProcessingOrder(ExtensionType.COMMAND, ['a', 'ghost']);
      }).toThrow('not found');
    });

    it('should throw if processing order is incomplete', () => {
      registry.register(ExtensionType.COMMAND, makeExtension('a'));
      registry.register(ExtensionType.COMMAND, makeExtension('b'));

      expect(() => {
        registry.setProcessingOrder(ExtensionType.COMMAND, ['a']);
      }).toThrow('must include all');
    });
  });
});
