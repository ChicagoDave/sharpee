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
  checkDocsBlocksModule,
  checkGrammarModule,
  expandGrammarIr,
  extractGrammarBlocks,
  readReferenceEntryIds,
  readStdlibActionIds,
  validateActionNames,
  validateDocsCoverage,
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

describe('docs blocks derivation (ADR-272 D4/D5)', () => {
  const FIXTURE = [
    '## file header comment — never part of a block',
    '',
    'grammar "standard-en-us"',
    '',
    'define action looking',
    '  grammar',
    '    look',
    '    l',
    '',
    '## ORDER IS LOAD-BEARING — top-level comment between blocks',
    '',
    'define action taking',
    '  grammar',
    '    take the item',
    '    get the item',
    '',
  ].join('\n');

  it('splits verbatim blocks by action id, excluding top-level comments and trailing blanks', () => {
    const blocks = extractGrammarBlocks(FIXTURE);
    expect([...blocks.keys()]).toEqual(['if.action.looking', 'if.action.taking']);
    expect(blocks.get('if.action.looking')).toBe('define action looking\n  grammar\n    look\n    l');
    expect(blocks.get('if.action.taking')).toBe('define action taking\n  grammar\n    take the item\n    get the item');
  });

  it('is loud in both directions, with the ruled grammarless exception allowed', () => {
    const blockIds = ['if.action.looking', 'if.action.taking'];
    const entryIds = ['if.action.looking', 'if.action.taking', 'if.action.deadly_room_death'];
    expect(validateDocsCoverage(blockIds, entryIds)).toEqual([]);

    const missingBlock = validateDocsCoverage(['if.action.looking'], entryIds);
    expect(missingBlock).toHaveLength(1);
    expect(missingBlock[0]).toContain('reference entry if.action.taking has no block');
    expect(missingBlock[0]).toContain('ADR-272 D4');

    const missingEntry = validateDocsCoverage(blockIds, ['if.action.looking']);
    expect(missingEntry).toHaveLength(1);
    expect(missingEntry[0]).toContain('source block if.action.taking has no entry');

    const staleException = validateDocsCoverage([...blockIds, 'if.action.deadly_room_death'], entryIds);
    expect(staleException).toHaveLength(1);
    expect(staleException[0]).toContain('retire the exception');
  });

  it('reads the real reference page entry ids', () => {
    const ids = readReferenceEntryIds(findRepoRoot());
    expect(ids).toContain('if.action.taking');
    expect(ids).toContain('if.action.deadly_room_death');
    expect(ids.length).toBeGreaterThanOrEqual(40);
  });

  it('the committed docs data module matches the Chord source', () => {
    expect(checkDocsBlocksModule(findRepoRoot())).toBe(true);
  });
});
