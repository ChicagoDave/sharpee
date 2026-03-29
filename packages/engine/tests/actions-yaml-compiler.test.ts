/**
 * Tests for actions.yaml compiler (ADR-136, Phase 5)
 */

import { describe, it, expect } from 'vitest';
import {
  compileActionsYaml,
  parseAndCompileActionsYaml,
  ActionsYamlError,
} from '../src/actions-yaml-compiler';

describe('compileActionsYaml', () => {
  describe('empty/null input', () => {
    it('returns empty config for null', () => {
      const result = compileActionsYaml(null);
      expect(result.config).toEqual({});
      expect(result.overrides.suppressions).toEqual([]);
      expect(result.overrides.hints).toEqual([]);
    });

    it('returns empty config for undefined', () => {
      const result = compileActionsYaml(undefined);
      expect(result.config).toEqual({});
    });

    it('returns empty config for empty object', () => {
      const result = compileActionsYaml({});
      expect(result.config).toEqual({});
      expect(result.overrides.suppressions).toEqual([]);
    });
  });

  describe('defaults', () => {
    it('compiles maxActions', () => {
      const result = compileActionsYaml({ defaults: { maxActions: 20 } });
      expect(result.config.maxActions).toBe(20);
    });

    it('compiles maxPerEntity', () => {
      const result = compileActionsYaml({ defaults: { maxPerEntity: 5 } });
      expect(result.config.maxPerEntity).toBe(5);
    });

    it('compiles intransitives', () => {
      const result = compileActionsYaml({
        defaults: { intransitives: ['look', 'wait'] },
      });
      expect(result.config.intransitives).toEqual(['look', 'wait']);
    });

    it('compiles categoryOrder', () => {
      const result = compileActionsYaml({
        defaults: { categoryOrder: ['movement', 'meta', 'interaction'] },
      });
      expect(result.config.categoryOrder).toEqual(['movement', 'meta', 'interaction']);
    });

    it('rejects invalid maxActions', () => {
      expect(() => compileActionsYaml({ defaults: { maxActions: -1 } }))
        .toThrow(ActionsYamlError);
    });

    it('rejects invalid category', () => {
      expect(() => compileActionsYaml({
        defaults: { categoryOrder: ['movement', 'bogus'] },
      })).toThrow(/Unknown category "bogus"/);
    });
  });

  describe('entity suppressions', () => {
    it('compiles suppressions with entity key as targetId', () => {
      const result = compileActionsYaml({
        entities: {
          'brass lantern': {
            suppress: [{ actionId: 'if.action.eating' }],
          },
        },
      });
      expect(result.overrides.suppressions).toEqual([
        { actionId: 'if.action.eating', targetId: 'brass lantern' },
      ]);
    });

    it('compiles multiple suppressions for one entity', () => {
      const result = compileActionsYaml({
        entities: {
          lamp: {
            suppress: [
              { actionId: 'if.action.eating' },
              { actionId: 'if.action.drinking' },
            ],
          },
        },
      });
      expect(result.overrides.suppressions.length).toBe(2);
    });

    it('rejects suppression without actionId', () => {
      expect(() => compileActionsYaml({
        entities: { lamp: { suppress: [{}] } },
      })).toThrow(/actionId/);
    });
  });

  describe('entity hints', () => {
    it('compiles hints with all fields', () => {
      const result = compileActionsYaml({
        entities: {
          door: {
            hints: [{
              command: 'unlock door with key',
              actionId: 'if.action.unlocking',
              label: 'Unlock the door',
              category: 'interaction',
              priority: 200,
            }],
          },
        },
      });
      const hint = result.overrides.hints[0];
      expect(hint.command).toBe('unlock door with key');
      expect(hint.actionId).toBe('if.action.unlocking');
      expect(hint.label).toBe('Unlock the door');
      expect(hint.category).toBe('interaction');
      expect(hint.priority).toBe(200);
      expect(hint.targetId).toBe('door');
    });

    it('uses entity key as targetId when not specified', () => {
      const result = compileActionsYaml({
        entities: {
          chest: {
            hints: [{
              command: 'open chest',
              actionId: 'if.action.opening',
            }],
          },
        },
      });
      expect(result.overrides.hints[0].targetId).toBe('chest');
    });

    it('uses explicit targetId when provided', () => {
      const result = compileActionsYaml({
        entities: {
          chest: {
            hints: [{
              command: 'open chest',
              actionId: 'if.action.opening',
              targetId: 'o42',
            }],
          },
        },
      });
      expect(result.overrides.hints[0].targetId).toBe('o42');
    });

    it('rejects hint without command', () => {
      expect(() => compileActionsYaml({
        entities: { door: { hints: [{ actionId: 'if.action.opening' }] } },
      })).toThrow(/command/);
    });

    it('rejects hint without actionId', () => {
      expect(() => compileActionsYaml({
        entities: { door: { hints: [{ command: 'open door' }] } },
      })).toThrow(/actionId/);
    });

    it('rejects hint with invalid category', () => {
      expect(() => compileActionsYaml({
        entities: {
          door: {
            hints: [{
              command: 'open door',
              actionId: 'if.action.opening',
              category: 'invalid',
            }],
          },
        },
      })).toThrow(/Unknown category/);
    });
  });

  describe('multiple entities', () => {
    it('compiles overrides across multiple entities', () => {
      const result = compileActionsYaml({
        entities: {
          lamp: { suppress: [{ actionId: 'if.action.eating' }] },
          door: {
            suppress: [{ actionId: 'if.action.taking' }],
            hints: [{ command: 'knock door', actionId: 'if.action.knocking' }],
          },
        },
      });
      expect(result.overrides.suppressions.length).toBe(2);
      expect(result.overrides.hints.length).toBe(1);
    });
  });

  describe('validation errors', () => {
    it('rejects non-object root', () => {
      expect(() => compileActionsYaml('string')).toThrow(/Root must be an object/);
    });

    it('rejects array root', () => {
      expect(() => compileActionsYaml([])).toThrow(/Root must be an object/);
    });

    it('rejects non-object entities value', () => {
      expect(() => compileActionsYaml({ entities: 'bad' }))
        .toThrow(/entities must be an object/);
    });

    it('rejects non-array suppress', () => {
      expect(() => compileActionsYaml({
        entities: { lamp: { suppress: 'bad' } },
      })).toThrow(/suppress must be an array/);
    });

    it('rejects non-array hints', () => {
      expect(() => compileActionsYaml({
        entities: { lamp: { hints: 'bad' } },
      })).toThrow(/hints must be an array/);
    });
  });
});

describe('parseAndCompileActionsYaml', () => {
  it('parses and compiles valid YAML', () => {
    const yaml = `
defaults:
  maxActions: 30
  intransitives:
    - look
    - wait

entities:
  brass lantern:
    suppress:
      - actionId: if.action.eating
    hints:
      - command: rub lantern
        actionId: if.action.rubbing
        label: Rub the lantern
        priority: 150
`;
    const result = parseAndCompileActionsYaml(yaml);
    expect(result.config.maxActions).toBe(30);
    expect(result.config.intransitives).toEqual(['look', 'wait']);
    expect(result.overrides.suppressions.length).toBe(1);
    expect(result.overrides.hints.length).toBe(1);
    expect(result.overrides.hints[0].label).toBe('Rub the lantern');
  });

  it('throws on invalid YAML syntax', () => {
    expect(() => parseAndCompileActionsYaml('{{{')).toThrow(/YAML parse error/);
  });

  it('handles empty YAML', () => {
    const result = parseAndCompileActionsYaml('');
    expect(result.config).toEqual({});
  });
});
