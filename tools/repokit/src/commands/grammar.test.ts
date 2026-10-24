/**
 * grammar.test.ts — ADR-269 D7/D10: the standing build step's contracts.
 *
 * Covers: the D10 name validation (unknown name → named error with a
 * did-you-mean; ADR-269 acceptance 9), the stdlib id extraction from source,
 * the standard-grammar refusals, the generated `grammar.rule()` line, the
 * standard grammar's definition order (ADR-382 D7), and the freshness gate
 * against the real committed module.
 */
import { describe, expect, it } from 'vitest';
import { findRepoRoot } from '../repo';
import {
  checkDocsBlocksModule,
  checkGrammarModule,
  compileStandardGrammarRules,
  extractGrammarBlocks,
  refuseNonStandardConstructs,
  renderRuleCall,
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

describe('standard-grammar refusals (ADR-269 D2, D3)', () => {
  const take = { name: 'taking', patterns: [{ cardinality: null }] };

  it('accepts an action with none of the refused constructs', () => {
    expect(() => refuseNonStandardConstructs([take])).not.toThrow();
  });

  it('refuses a scope constraint, a greedy slot and → cardinality, naming the action', () => {
    expect(() => refuseNonStandardConstructs([{ ...take, constraints: [{ slot: 'item', requirement: 'reachable' }] }])).toThrow(
      /if\.action\.taking carries a scope constraint/,
    );
    expect(() => refuseNonStandardConstructs([{ ...take, greedy: ['item'] }])).toThrow(/if\.action\.taking declares a greedy slot/);
    expect(() => refuseNonStandardConstructs([{ name: 'taking', patterns: [{ cardinality: ['each'] }] }])).toThrow(
      /if\.action\.taking uses → cardinality/,
    );
  });
});

describe('generated registration line (ADR-382 Q-2)', () => {
  it('renders a lowered rule as one grammar.rule() literal with its parts, defaults and typed slots', () => {
    const line = renderRuleCall('if.action.opening', {
      parts: [
        { kind: 'word', word: 'open' },
        { kind: 'slot', name: 'container' },
        { kind: 'alt', words: ['with', 'using'] },
        { kind: 'slot', name: 'tool' },
      ],
      pattern: 'open :container with|using :tool',
      defaults: { manner: 'careful' },
      slotTypes: { tool: 'instrument' },
      seats: { container: 'direct' },
      requirements: [],
      bare: false,
    });
    expect(line).toBe(
      '  grammar.rule({ action: "if.action.opening", pattern: "open :container with|using :tool", ' +
        'parts: [{"kind":"word","word":"open"},{"kind":"slot","name":"container"},{"kind":"alt","words":["with","using"]},{"kind":"slot","name":"tool"}], ' +
        'defaults: {"manner":"careful"}, slots: { "container": { seat: "direct" }, "tool": { type: SlotType.INSTRUMENT } } });',
    );
  });

  it('omits defaults and slots when the rule has none', () => {
    const line = renderRuleCall('if.action.looking', {
      parts: [{ kind: 'word', word: 'look' }],
      pattern: 'look',
      defaults: null,
      slotTypes: {},
      seats: {},
      requirements: [],
      bare: false,
    });
    expect(line).toBe('  grammar.rule({ action: "if.action.looking", pattern: "look", parts: [{"kind":"word","word":"look"}] });');
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

describe('the standard grammar registers in definition order (ADR-382 D7)', () => {
  it('steering\'s rules follow the source lines, not grouped by `means` defaults', () => {
    const { lowered } = compileStandardGrammarRules(findRepoRoot());
    const steering = lowered.find((a) => a.action === 'if.action.steering')!;
    const order = steering.rules.map((r) => r.pattern);
    // Source order: `port :turn` (port), `starboard :turn` (starboard), `port` (port), `starboard` (starboard).
    // Grouping by defaults would have put `port` straight after `port :turn`.
    const at = (pattern: string) => order.indexOf(pattern);
    expect(at('port :turn')).toBeGreaterThanOrEqual(0);
    expect(at('starboard :turn')).toBe(at('port :turn') + 1);
    expect(at('port')).toBe(at('starboard :turn') + 1);
    expect(at('starboard')).toBe(at('port') + 1);
  });
});
