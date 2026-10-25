/**
 * patterns.test.ts — chord's one pattern module (ADR-382 D5, D6): lowering
 * an action to its rules in definition order, the one renderer, readings and
 * passage commands from one walk, and the structural removal identity; plus
 * the analyzer's two readers of it (census 3 and the acting statement) and
 * chord's type-only use of if-domain (D1, acceptance 8).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import { commandParts, expandCommands, expandReadings, lowerActionRules, lowerParts, renderPattern, samePatternShape } from '../src/patterns';
import type { PatternElement } from '@sharpee/if-domain';

const word = (w: string, optional?: boolean): PatternElement => ({ kind: 'word', word: w, ...(optional ? { optional } : {}) });
const slot = (name: string, extra: { optional?: boolean; greedy?: boolean } = {}): PatternElement => ({ kind: 'slot', name, ...extra });
const alt = (words: string[], optional?: boolean): PatternElement => ({ kind: 'alt', words, ...(optional ? { optional } : {}) });

describe('lowerParts and renderPattern', () => {
  it('a Chord slot becomes a named slot, greedy where the action says so', () => {
    expect(
      lowerParts(
        [
          { kind: 'word', word: 'say' },
          { kind: 'slot', word: 'message' },
          { kind: 'word', word: 'to', optional: true },
          { kind: 'alt', words: ['bob', 'ann'] },
        ],
        ['message'],
      ),
    ).toEqual([word('say'), slot('message', { greedy: true }), word('to', true), alt(['bob', 'ann'])]);
  });

  it('renders alternations, slots, greedy slots and optionals as the registered text', () => {
    expect(renderPattern([word('put'), slot('item'), word('carefully', true), alt(['in', 'into']), slot('box', { optional: true })])).toBe(
      'put :item [carefully] in|into [:box]',
    );
    expect(renderPattern([word('say'), slot('message', { greedy: true })])).toBe('say :message...');
  });
});

describe('expandReadings and expandCommands share one walk', () => {
  it('an optional is taken with then without, an alternation in written order, slots kept', () => {
    expect(expandReadings([word('look'), word('carefully', true), alt(['at', 'toward']), slot('target')])).toEqual([
      [word('look'), word('carefully'), word('at'), slot('target')],
      [word('look'), word('carefully'), word('toward'), slot('target')],
      [word('look'), word('at'), slot('target')],
      [word('look'), word('toward'), slot('target')],
    ]);
  });

  it('a passage`s commands are the slot-free readings, lowercased, the pattern as written first', () => {
    expect(expandCommands([word('Climb'), word('up', true), alt(['rope', 'Ladder'])])).toEqual([
      'climb up rope',
      'climb up ladder',
      'climb rope',
      'climb ladder',
    ]);
  });

  it('commandParts turns each command back into its word elements, the inverse of the join', () => {
    const commands = expandCommands([word('Climb'), word('up', true), alt(['rope', 'Ladder'])]);
    expect(commands.map(commandParts)).toEqual([
      [word('climb'), word('up'), word('rope')],
      [word('climb'), word('up'), word('ladder')],
      [word('climb'), word('rope')],
      [word('climb'), word('ladder')],
    ]);
    expect(commands.map((command) => renderPattern(commandParts(command)))).toEqual(commands);
  });

  it('an all-optional pattern yields no empty reading', () => {
    expect(expandReadings([word('please', true)])).toEqual([[word('please')]]);
  });
});

describe('samePatternShape (the removal identity, ADR-382 D6)', () => {
  it('ignores slot names and the case of words', () => {
    expect(samePatternShape([word('get'), slot('thing')], [word('GET'), slot('item')])).toBe(true);
  });

  it('compares alternations as sets (Q-4)', () => {
    expect(samePatternShape([alt(['press', 'push']), slot('t')], [alt(['push', 'Press']), slot('target')])).toBe(true);
    expect(samePatternShape([alt(['press', 'push'])], [alt(['push', 'shove'])])).toBe(false);
  });

  it('differs on length, kind, word or optionality', () => {
    expect(samePatternShape([word('get'), slot('x')], [word('get')])).toBe(false);
    expect(samePatternShape([word('get'), slot('x')], [word('get'), word('x')])).toBe(false);
    expect(samePatternShape([word('get'), slot('x')], [word('take'), slot('x')])).toBe(false);
    expect(samePatternShape([word('look'), word('carefully', true)], [word('look'), word('carefully')])).toBe(false);
  });
});

describe('lowerActionRules (ADR-382 D5, D7)', () => {
  it('registers in definition order, each rule with its own means defaults', () => {
    const rules = lowerActionRules(
      {
        patterns: [
          { parts: [{ kind: 'word', word: 'hide' }, { kind: 'word', word: 'under' }, { kind: 'slot', word: 'target' }], cardinality: null, means: [{ key: 'position', value: 'under' }] },
          { parts: [{ kind: 'word', word: 'hide' }, { kind: 'word', word: 'behind' }, { kind: 'slot', word: 'target' }], cardinality: null, means: [{ key: 'position', value: 'behind' }] },
          { parts: [{ kind: 'word', word: 'duck' }, { kind: 'word', word: 'under' }, { kind: 'slot', word: 'target' }], cardinality: null, means: [{ key: 'position', value: 'under' }] },
        ],
        constraints: [{ slot: 'target', requirement: 'reachable' }],
      },
    );
    expect(rules.map((r) => [r.pattern, r.defaults])).toEqual([
      ['hide under :target', { position: 'under' }],
      ['hide behind :target', { position: 'behind' }],
      ['duck under :target', { position: 'under' }],
    ]);
    expect(rules.every((r) => r.requirements.length === 1)).toBe(true);
  });

  it('expands a directions block: alias × pattern with the canonical as default, a bare line as standalone aliases', () => {
    const rules = lowerActionRules(
      {
        patterns: [
          { parts: [{ kind: 'word', word: 'sail' }, { kind: 'slot', word: 'direction' }], cardinality: null },
          { parts: [{ kind: 'slot', word: 'direction' }], cardinality: null },
        ],
        constraints: [],
        directions: [{ canonical: 'port', aliases: ['p'] }],
      },
    );
    expect(rules.map((r) => [r.pattern, r.defaults])).toEqual([
      ['sail port', { direction: 'port' }],
      ['sail p', { direction: 'port' }],
      ['port', { direction: 'port' }],
      ['p', { direction: 'port' }],
    ]);
  });

  it('attaches typed slots and requirements only to rules that carry the slot, and flags greedy slots', () => {
    const rules = lowerActionRules(
      {
        patterns: [
          { parts: [{ kind: 'word', word: 'cut' }, { kind: 'slot', word: 'rope' }, { kind: 'word', word: 'with' }, { kind: 'slot', word: 'blade' }], cardinality: null },
          { parts: [{ kind: 'word', word: 'cut' }, { kind: 'slot', word: 'rope' }], cardinality: null },
          { parts: [{ kind: 'word', word: 'say' }, { kind: 'slot', word: 'words' }], cardinality: null },
        ],
        constraints: [{ slot: 'blade', requirement: 'held' }],
        slotTypes: [{ slot: 'blade', type: 'instrument' }],
        greedy: ['words'],
      },
    );
    expect(rules[0].slotTypes).toEqual({ blade: 'instrument' });
    expect(rules[0].requirements).toEqual([{ slot: 'blade', requirement: 'held' }]);
    expect(rules[1].slotTypes).toEqual({});
    expect(rules[1].requirements).toEqual([]);
    expect(rules[2].pattern).toBe('say :words...');
  });

  it('lowers exactly the written lines, adding no rule for a line\'s verb alone (ADR-384 D5)', () => {
    const rules = lowerActionRules(
      {
        patterns: [
          { parts: [{ kind: 'word', word: 'tie' }, { kind: 'slot', word: 'cord' }, { kind: 'word', word: 'to' }, { kind: 'slot', word: 'post' }], cardinality: null },
          { parts: [{ kind: 'word', word: 'tie' }, { kind: 'word', word: 'up' }, { kind: 'slot', word: 'cord' }], cardinality: null },
          { parts: [{ kind: 'word', word: 'tie' }, { kind: 'slot', word: 'cord' }], cardinality: null },
          { parts: [{ kind: 'word', word: 'knot' }, { kind: 'slot', word: 'cord' }], cardinality: ['each'] },
        ],
        constraints: [{ slot: 'cord', requirement: 'held' }],
      },
    );
    expect(rules.map((r) => r.pattern)).toEqual(['tie :cord to :post', 'tie up :cord', 'tie :cord']);
  });
});

const removalStory = (removal: string) => `story
  title: Removal
  authors:
    T
  id: removal
  story-version: 0.0.1

remove from action taking
  ${removal}

create the Yard
  a room

  A yard.

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before
`;
const errorCodes = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

describe('census 3 compares a removal by shape (ADR-382 D6, B6)', () => {
  it('`get the thing` matches the standard `get :item`', () => {
    expect(errorCodes(removalStory('get the thing'))).toEqual([]);
  });

  it('a removal no shape matches is still refused, its shape and the action`s rendered', () => {
    const result = compile(removalStory('yoink the thing'));
    const error = result.diagnostics.find((d) => d.code === 'analysis.unmatched-removal-pattern');
    expect(error?.message).toContain('`yoink :thing`');
    expect(error?.message).toContain('`get :item`');
  });
});

const actingStory = (stmt: string) => `story
  title: Acting
  authors:
    T
  id: acting
  story-version: 0.0.1

create the Yard
  a room

  after the player entering
    ${stmt}
  end after

  A yard.

create the rock
  a thing
  in the Yard

  A rock.

create Teisha
  a person
  in the Yard

  Teisha.

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before
`;
const actsIn = (node: unknown, out: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> => {
  if (Array.isArray(node)) node.forEach((n) => actsIn(n, out));
  else if (node && typeof node === 'object') {
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'act' && Array.isArray(rec.slots)) out.push(rec);
    Object.values(rec).forEach((v) => actsIn(v, out));
  }
  return out;
};

describe('the acting statement matches a standard shape through its optional element (AC10)', () => {
  it('`Teisha looks carefully at the rock` is examining, the rock in the target slot', () => {
    const result = compile(actingStory('Teisha looks carefully at the rock'));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const act = actsIn(result.ir)[0];
    expect(act.action).toBe('examining');
    expect(act.shape).toBe('look carefully at :target');
    expect(act.slots).toEqual([{ slot: 'target', value: { kind: 'entity', id: 'rock' } }]);
  });

  it('an unmatched acting statement lists the shapes as written', () => {
    const error = compile(actingStory('Teisha looks sideways at the rock')).diagnostics.find((d) => d.code === 'analysis.act-slot-shape');
    expect(error?.message).toContain('`look [carefully] at :target`');
  });
});

describe('chord imports nothing from if-domain but types (ADR-382 D1, acceptance 8)', () => {
  it('every if-domain import in chord/src is `import type`', () => {
    const src = join(__dirname, '../src');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.ts')) files.push(path);
      }
    };
    walk(src);
    const offenders = files.filter((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .some((line) => /from '@sharpee\/if-domain'/.test(line) && !/^\s*import type\b/.test(line)),
    );
    expect(offenders).toEqual([]);
    expect(files.some((file) => readFileSync(file, 'utf8').includes("from '@sharpee/if-domain'"))).toBe(true);
  });
});
