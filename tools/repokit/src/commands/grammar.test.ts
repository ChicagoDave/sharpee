/**
 * grammar.test.ts — ADR-269 D7/D10: the standing build step's contracts.
 *
 * Covers: the D10 name validation (unknown name → named error with a
 * did-you-mean; ADR-269 acceptance 9), the stdlib id extraction from source,
 * the IR expansion semantics (loader-mirroring: direction cross-product with
 * defaults, group-major order, typed slots on carrying rules only), and the
 * freshness gate against the real committed module.
 */
import { describe, expect, it } from 'vitest';
import { findRepoRoot } from '../repo';
import {
  checkGrammarModule,
  expandGrammarIr,
  readStdlibActionIds,
  validateActionNames,
} from './grammar';

describe('D10 name validation (ADR-269 acceptance 9)', () => {
  const valid = new Set(['if.action.taking', 'if.action.dropping', 'if.action.going']);

  it('accepts names that derive to known stdlib ids', () => {
    expect(validateActionNames(['taking', 'going'], valid)).toEqual([]);
  });

  it('rejects an unknown name with the named D10 error and a did-you-mean', () => {
    const errors = validateActionNames(['takign'], valid);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('`define action takign` derives if.action.takign');
    expect(errors[0]).toContain('did you mean `taking`');
    expect(errors[0]).toContain('ADR-269 D10');
  });
});

describe('stdlib id extraction (source-as-data)', () => {
  it('reads the real constants.ts and finds the known ids', () => {
    const ids = readStdlibActionIds(findRepoRoot());
    expect(ids.has('if.action.taking')).toBe(true);
    expect(ids.has('if.action.taking_off')).toBe(true);
    expect(ids.size).toBeGreaterThanOrEqual(40);
  });
});

describe('IR expansion (loader-mirroring, standard-flavored)', () => {
  it('expands a directions block: alias cross-product with defaults, standalone bare forms', () => {
    const rules = expandGrammarIr({
      actions: [
        {
          name: 'going',
          patterns: [
            { parts: [{ kind: 'word', word: 'go' }, { kind: 'slot', word: 'direction' }], cardinality: null },
            { parts: [{ kind: 'slot', word: 'direction' }], cardinality: null },
          ],
          constraints: [],
          directions: [{ canonical: 'north', aliases: ['n'] }],
        },
      ],
    });
    expect(rules.map((r) => r.pattern)).toEqual(['go north', 'go n', 'north', 'n']);
    for (const r of rules) {
      expect(r.action).toBe('if.action.going');
      expect(r.defaults).toEqual({ direction: 'north' });
    }
  });

  it('attaches typed slots only to rules carrying the slot; means become defaults', () => {
    const rules = expandGrammarIr({
      actions: [
        {
          name: 'unlocking',
          patterns: [
            {
              parts: [
                { kind: 'word', word: 'unlock' },
                { kind: 'slot', word: 'target' },
                { kind: 'word', word: 'with' },
                { kind: 'slot', word: 'key' },
              ],
              cardinality: null,
              means: [{ key: 'manner', value: 'quietly' }],
            },
            { parts: [{ kind: 'word', word: 'unlock' }, { kind: 'slot', word: 'target' }], cardinality: null },
          ],
          constraints: [],
          slotTypes: [{ slot: 'key', type: 'instrument' }],
        },
      ],
    });
    expect(rules[0]).toEqual({
      pattern: 'unlock :target with :key',
      action: 'if.action.unlocking',
      defaults: { manner: 'quietly' },
      slotTypes: { key: 'instrument' },
    });
    expect(rules[1].slotTypes).toEqual({});
    expect(rules[1].defaults).toBeNull();
  });

  it('renders alternation and optional elements in the emitted pattern string', () => {
    const rules = expandGrammarIr({
      actions: [
        {
          name: 'searching',
          patterns: [
            {
              parts: [
                { kind: 'word', word: 'look' },
                { kind: 'alt', words: ['in', 'inside'] },
                { kind: 'slot', word: 'target' },
              ],
              cardinality: null,
            },
            {
              parts: [
                { kind: 'word', word: 'look' },
                { kind: 'word', word: 'carefully', optional: true },
              ],
              cardinality: null,
            },
          ],
          constraints: [],
        },
      ],
    });
    expect(rules.map((r) => r.pattern)).toEqual(['look in|inside :target', 'look [carefully]']);
  });

  it('refuses a scope constraint — none exist in the standard grammar baseline', () => {
    expect(() =>
      expandGrammarIr({
        actions: [
          {
            name: 'taking',
            patterns: [{ parts: [{ kind: 'word', word: 'take' }, { kind: 'slot', word: 'item' }], cardinality: null }],
            constraints: [{ slot: 'item', requirement: 'reachable' }],
          },
        ],
      }),
    ).toThrow(/scope constraint/);
  });
});

describe('freshness gate (ADR-269 D7)', () => {
  it('the committed generated module matches the Chord source', () => {
    expect(checkGrammarModule(findRepoRoot())).toBe(true);
  });
});
