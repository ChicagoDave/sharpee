/**
 * seat-tables.test.ts — a Chord action seats each entity slot name once
 * (ADR-383 D3, D4; parser review step 3, Phase 3): the seat table read in
 * definition order, the seats every lowered rule carries, the manifest's
 * tables for the standard actions, and the analyzer's two refusals —
 * `analysis.seat-conflict` for a line that puts two names in one seat and
 * `analysis.unknown-slot` for an extension line that names none of its
 * target's slots.
 */
import { describe, expect, it } from 'vitest';
import { compile, STDLIB_MANIFEST } from '../src';
import { lowerActionRules, seatTable, type LowerableAction } from '../src/patterns';

/** A pattern from words; `:name` is a slot, `[x]` an optional word or slot. */
function pattern(text: string): LowerableAction['patterns'][number] {
  return {
    cardinality: null,
    parts: text.split(' ').map((token) => {
      const optional = token.startsWith('[');
      const bare = optional ? token.slice(1, -1) : token;
      const part = bare.startsWith(':') ? { kind: 'slot' as const, word: bare.slice(1) } : { kind: 'word' as const, word: bare };
      return optional ? { ...part, optional: true } : part;
    }),
  };
}

function action(lines: string[], extra: Partial<LowerableAction> = {}): LowerableAction {
  return { patterns: lines.map(pattern), constraints: [], ...extra };
}

const STORY =
  'story\n  title: T\n  authors:\n    N\n\ncreate the Barn\n  a room\n\n  A barn.\n\ncreate Alex\n  a person\n  playable\n  starts in the Barn\n\n  You.\n\nbefore the game starts\n  change the player to Alex\nend before\n\n';

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('seatTable (ADR-383 D3)', () => {
  it('seats the first line by position and keeps each name`s seat on later lines', () => {
    const { table, problems } = seatTable(action(['offer :gift to :friend', 'present :friend with :gift']));
    expect(problems).toEqual([]);
    expect(table).toEqual({ gift: 'direct', friend: 'indirect' });
  });

  it('a new name takes the seat its line leaves open', () => {
    const { table } = seatTable(action(['give :item to :recipient', 'tip :recipient :coin']));
    expect(table).toEqual({ item: 'direct', recipient: 'indirect', coin: 'direct' });
  });

  it('counts an optional slot, and skips greedy, typed and direction slots', () => {
    const { table } = seatTable(
      action(['poke [:target] with :stick', 'say :words to :listener', 'sail :direction toward :buoy', 'ask :listener about :subject'], {
        greedy: ['words'],
        slotTypes: [{ slot: 'stick', type: 'instrument' }, { slot: 'subject', type: 'topic' }],
        directions: [{ canonical: 'port', aliases: [] }],
      }),
    );
    expect(table).toEqual({ target: 'direct', listener: 'direct', buoy: 'direct' });
  });

  it('a line whose two names already hold one seat is a conflict naming both and where each was seated', () => {
    const { problems } = seatTable(action(['give :item to :recipient', 'tip :coin to :recipient', 'swap :item :coin']));
    expect(problems).toEqual([{ kind: 'conflict', pattern: 2, slots: ['item', 'coin'], seat: 'direct', seatedBy: [0, 1] }]);
  });

  it('a third entity slot finds no seat', () => {
    const { problems } = seatTable(action(['move :item from :source to :target']));
    expect(problems).toEqual([{ kind: 'conflict', pattern: 0, slots: ['source', 'target'], seatedBy: [null, null] }]);
  });

  it('from an inherited table, a two-noun line naming neither inherited name is unknown and seats nothing', () => {
    const inherited = { item: 'direct', recipient: 'indirect' } as const;
    const { table, problems } = seatTable(action(['hand :friend :gift']), inherited);
    expect(problems).toEqual([{ kind: 'unknown', pattern: 0, slots: ['friend', 'gift'], seatedBy: [null, null] }]);
    expect(table).toEqual(inherited);
  });

  it('from an inherited table, one-noun lines and lines with one inherited name stay legal', () => {
    const { table, problems } = seatTable(action(['hang :item on :peg', 'snag :thing']), { item: 'direct' });
    expect(problems).toEqual([]);
    expect(table).toEqual({ item: 'direct', peg: 'indirect', thing: 'direct' });
  });

  it('an inherited name keeps its seat on an indirect-first extension line', () => {
    const { table } = seatTable(action(['hand :recipient :item']), { item: 'direct', recipient: 'indirect' });
    expect(table).toEqual({ item: 'direct', recipient: 'indirect' });
  });

  it('a conflict on an inherited name says it was inherited', () => {
    const { problems } = seatTable(action(['snag :thing', 'swap :item :thing']), { item: 'direct' });
    expect(problems).toEqual([{ kind: 'conflict', pattern: 1, slots: ['item', 'thing'], seat: 'direct', seatedBy: ['inherited', 0] }]);
  });
});

describe('lowerActionRules carries the seats (ADR-383 D3, D4)', () => {
  it('every rule seats its entity slots by the table, an indirect-first line included', () => {
    const rules = lowerActionRules(action(['offer :gift to :friend', 'present :friend with :gift', 'wave']), { bareVerbForms: true });
    expect(rules.map((r) => [r.pattern, r.seats])).toEqual([
      ['offer :gift to :friend', { gift: 'direct', friend: 'indirect' }],
      ['present :friend with :gift', { friend: 'indirect', gift: 'direct' }],
      ['wave', {}],
      ['offer', {}],
      ['present', {}],
    ]);
  });

  it('an extension seats from the inherited table', () => {
    const [rule] = lowerActionRules(action(['hand :recipient :item']), {
      bareVerbForms: false,
      inheritedSeats: { item: 'direct', recipient: 'indirect' },
    });
    expect(rule.seats).toEqual({ recipient: 'indirect', item: 'direct' });
  });

  it('gives no seat to a typed or greedy slot', () => {
    const [untyped] = lowerActionRules(action(['cut :rope with :blade']), { bareVerbForms: false });
    expect(untyped.seats).toEqual({ rope: 'direct', blade: 'indirect' });
    const [typed] = lowerActionRules(action(['cut :rope with :blade'], { slotTypes: [{ slot: 'blade', type: 'instrument' }] }), { bareVerbForms: false });
    expect(typed.seats).toEqual({ rope: 'direct' });
    const [greedy] = lowerActionRules(action(['tell :listener :words'], { greedy: ['words'] }), { bareVerbForms: false });
    expect(greedy.seats).toEqual({ listener: 'direct' });
  });

  it('throws on a line the table cannot seat, naming the line', () => {
    expect(() => lowerActionRules(action(['give :item to :recipient', 'tip :coin to :recipient', 'swap :item :coin']), { bareVerbForms: false })).toThrow(
      /`swap :item :coin` puts `item` and `coin` in one seat/,
    );
    expect(() => lowerActionRules(action(['hand :friend :gift']), { bareVerbForms: false, inheritedSeats: { item: 'direct' } })).toThrow(
      /`hand :friend :gift` seats neither `friend` nor `gift`/,
    );
  });
});

describe('the manifest`s seat tables (ADR-383 D4)', () => {
  const seats = STDLIB_MANIFEST.locales['en-US'].grammarSeats;

  it('seats giving and showing item direct and recipient indirect, read from their to-lines', () => {
    expect(seats['if.action.giving']).toEqual({ item: 'direct', recipient: 'indirect' });
    expect(seats['if.action.showing']).toEqual({ item: 'direct', recipient: 'indirect' });
  });

  it('has an entry for taking and none for an action with no entity slot', () => {
    expect(seats['if.action.taking']).toEqual({ item: 'direct' });
    expect(seats['if.action.waiting']).toBeUndefined();
  });
});

describe('the analyzer refuses what the table cannot seat (ADR-383 D3, D4)', () => {
  it('a story action line putting two names in one seat is analysis.seat-conflict at that line', () => {
    const source = `${STORY}define action trading\n  grammar\n    give the item to the recipient\n    tip the coin to the recipient\n    swap the item for the coin\n  phrase traded\n\n  phrases en-US\n    traded:\n      Traded.\n`;
    const conflict = errorsOf(source).find((e) => e.code === 'analysis.seat-conflict');
    expect(conflict?.message).toContain('`swap :item for :coin` puts `item` and `coin` in one seat (direct)');
    expect(conflict?.message).toContain('`item` was seated direct by `give :item to :recipient`');
    expect(conflict?.message).toContain('`coin` by `tip :coin to :recipient`');
    expect(conflict?.span?.line).toBe(source.split('\n').indexOf('    swap the item for the coin') + 1);
  });

  it('an indirect-first story action line seats by name and compiles clean', () => {
    const errors = errorsOf(
      `${STORY}define action offering\n  grammar\n    offer the gift to the friend\n    present the friend with the gift\n  phrase offered\n\n  phrases en-US\n    offered:\n      Offered.\n`,
    );
    expect(errors).toEqual([]);
  });

  it('`extend action giving` with `hand the recipient the item` compiles clean', () => {
    expect(errorsOf(`${STORY}extend action giving\n  grammar\n    hand the recipient the item\n`)).toEqual([]);
  });

  it('`extend action giving` with `hand the friend the gift` is analysis.unknown-slot listing item and recipient', () => {
    const errors = errorsOf(`${STORY}extend action giving\n  grammar\n    hand the friend the gift\n`);
    const unknown = errors.find((e) => e.code === 'analysis.unknown-slot');
    expect(unknown?.message).toContain('`hand :friend :gift` names neither of its slots from `giving`');
    expect(unknown?.message).toContain('Name at least one of: item, recipient.');
  });

  it('`extend action putting` with `hang the item on the peg` compiles clean', () => {
    expect(errorsOf(`${STORY}extend action putting\n  grammar\n    hang the item on the peg\n`)).toEqual([]);
  });

  it('a one-noun extension line naming a new slot stays legal', () => {
    expect(errorsOf(`${STORY}extend action taking\n  grammar\n    snag the thing\n`)).toEqual([]);
  });

  it('an extension line conflicting with the standard table says the name came from the extended action', () => {
    const conflict = errorsOf(`${STORY}extend action giving\n  grammar\n    swap the recipient for the thing\n    trade the item to the thing\n`).find(
      (e) => e.code === 'analysis.seat-conflict',
    );
    expect(conflict?.message).toContain('`item` was seated direct by the action `giving` extends');
  });

  it('an extension of a story action seats from that action`s own table', () => {
    const source = `${STORY}define action offering\n  grammar\n    offer the gift to the friend\n  phrase offered\n\n  phrases en-US\n    offered:\n      Offered.\n\nextend action offering\n  grammar\n    present the friend with the gift\n`;
    expect(errorsOf(source)).toEqual([]);
    const bad = `${STORY}define action offering\n  grammar\n    offer the gift to the friend\n  phrase offered\n\n  phrases en-US\n    offered:\n      Offered.\n\nextend action offering\n  grammar\n    hand the pal the box\n`;
    expect(errorsOf(bad).find((e) => e.code === 'analysis.unknown-slot')?.message).toContain('Name at least one of: friend, gift.');
  });
});
