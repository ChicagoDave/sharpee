/**
 * adr-369-container-settings.test.ts — ADR-369: `transparent` (D1),
 * `holds <n>` (D2), the retired kind settings (D2a) and `in`/`out` exits
 * (D3) on the chord side: AC-1, AC-3, AC-5 and AC-6. Every case asserts an
 * IR field or a specific diagnostic code — never "parsed without throwing".
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { StoryIR } from '../src/ir';

const HEADER = `story
  title: Settings
  authors:
    T
  id: settings
  story-version: 0.0.1
`;

interface Slots {
  top?: string;
  hall?: string;
  closet?: string;
  jar?: string;
  jarKind?: string;
  shelf?: string;
}

const world = (s: Slots = {}) => `${HEADER}
${s.top ?? ''}
create the Hall
  a room
  states: busy, quiet
${s.hall ?? ''}
  A hall.

create the Closet
  a room
${s.closet ?? ''}
  A closet.

create the jar
  ${s.jarKind ?? 'a container, openable'}
${s.jar ?? ''}
  in the Hall

  A jar.

create the shelf
  a supporter
${s.shelf ?? ''}
  in the Hall

  A shelf.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before

define phrase no-way
  No way.
end phrase
`;

const errors = (s: Slots) => compile(world(s)).diagnostics.filter((d) => d.severity === 'error');
const codes = (s: Slots) => errors(s).map((d) => d.code);
const ok = (s: Slots): StoryIR => {
  const r = compile(world(s));
  const e = r.diagnostics.filter((d) => d.severity === 'error');
  if (e.length) throw new Error(e.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir;
};
const entity = (ir: StoryIR, id: string) => ir.entities.find((e) => e.id === id)!;

describe('AC-1 (D1) — `transparent` is a container adjective', () => {
  it('rides the IR as a trait marker on a container', () => {
    const jar = entity(ok({ jarKind: 'a container, openable, transparent' }), 'jar');
    expect(jar.traits.map((t) => t.name)).toContain('transparent');
  });

  it('is refused on a thing, naming the fix', () => {
    const e = errors({ jarKind: 'a thing, transparent' });
    const d = e.find((d) => d.code === 'analysis.transparent-not-container')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`a container, transparent`');
    expect(d.message).toContain('is a thing');
  });

  it('is refused on a room and a supporter', () => {
    expect(codes({ hall: '  transparent\n' })).toContain('analysis.transparent-not-container');
    expect(codes({ shelf: '  transparent\n' })).toContain('analysis.transparent-not-container');
  });

  it('is refused with a condition', () => {
    expect(codes({ jarKind: 'a container, transparent while the Hall is busy' })).toContain('analysis.transparent-conditional');
  });
});

describe('AC-3 (D2) — `holds <n>` is the item capacity', () => {
  it('lowers to `holds` on a container and a supporter', () => {
    const ir = ok({ jar: '  holds 2\n', shelf: '  holds 1\n' });
    expect(entity(ir, 'jar').holds).toBe(2);
    expect(entity(ir, 'shelf').holds).toBe(1);
  });

  it('is absent when the block has no line', () => {
    expect(entity(ok({}), 'jar').holds).toBeUndefined();
  });

  it('is refused on a thing, a room and a person', () => {
    const thing = errors({ jarKind: 'a thing', jar: '  holds 2\n' });
    const d = thing.find((d) => d.code === 'analysis.holds-owner')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('is a thing');
    expect(codes({ hall: '  holds 2\n' })).toContain('analysis.holds-owner');
    expect(codes({ top: 'create Jack\n  a person\n  holds 2\n  in the Hall\n\n  Jack.\n' })).toContain('analysis.holds-owner');
  });

  it('a second line is `analysis.holds-duplicate`, citing the first', () => {
    const e = errors({ jar: '  holds 2\n  holds 3\n' });
    const d = e.find((d) => d.code === 'analysis.holds-duplicate')!;
    expect(d).toBeDefined();
    expect(d.message).toMatch(/line \d+/);
    expect(entity(compile(world({ jar: '  holds 2\n  holds 3\n' })).ir, 'jar').holds).toBe(2);
  });

  it('zero, a negative, a fraction, a word and trailing words are `parse.holds-number`', () => {
    for (const line of ['  holds 0\n', '  holds -1\n', '  holds 1.5\n', '  holds two\n', '  holds 2 things\n', '  holds\n']) {
      expect(codes({ jar: line }), line).toContain('parse.holds-number');
    }
  });
});

describe('AC-5 (D2a) — kind nouns take no `with` settings', () => {
  it('`with max items` is `parse.removed-capacity-setting` with the `holds` fix-it', () => {
    const e = errors({ jarKind: 'a container with max items 3' });
    const d = e.find((d) => d.code === 'parse.removed-capacity-setting')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`holds 3`');
  });

  it('`with max weight` says weight is not a Chord concept', () => {
    const d = errors({ jarKind: 'a container with max weight 3' }).find((d) => d.code === 'parse.removed-capacity-setting')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('Weight is not a Chord concept');
  });

  it('`with capacity` on a supporter is the same removal', () => {
    const d = errors({ shelf: '' , top: 'create the bench\n  a supporter with capacity 2\n  in the Hall\n\n  A bench.\n' }).find((d) => d.code === 'parse.removed-capacity-setting')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`holds 2`');
  });

  it('any other setting on a kind is `parse.kind-setting`', () => {
    const d = errors({ jarKind: 'a container with anything 2' }).find((d) => d.code === 'parse.kind-setting')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`container` is a kind');
  });

  it('a setting on an adjective still parses', () => {
    const top = 'create the chest\n  a container, lockable with the iron key\n  in the Hall\n\n  A chest.\n\ncreate the iron key\n  a thing\n  in the Hall\n\n  A key.\n';
    const chest = entity(ok({ top }), 'chest');
    expect(chest.traits.find((t) => t.name === 'lockable')?.config).toHaveLength(1);
  });
});

describe('AC-6 (D3) — `in` and `out` are exit directions', () => {
  it('`in to <room>` and `out to <room>` are exits; `in the <room>` is placement', () => {
    const ir = ok({ hall: '  in to the Closet\n' });
    expect(entity(ir, 'hall').exits).toEqual([expect.objectContaining({ direction: 'in', to: 'closet', via: null })]);
    const out = ok({ closet: '  out to the Hall\n' });
    expect(entity(out, 'closet').exits).toEqual([expect.objectContaining({ direction: 'out', to: 'hall' })]);
    expect(entity(ok({}), 'jar').placement).toMatchObject({ place: 'hall' });
  });

  it('takes `, one-way` and `through <door>`', () => {
    const top = 'create the hatch\n  a door\n\n  A hatch.\n';
    const ir = ok({ top, hall: '  in to the Closet through the hatch\n', closet: '  out to the Hall, one-way\n' });
    expect(entity(ir, 'hall').exits[0]).toMatchObject({ direction: 'in', to: 'closet', via: 'hatch' });
    expect(entity(ir, 'closet').exits[0]).toMatchObject({ direction: 'out', to: 'hall', oneWay: true });
  });

  it('rides an `exits:` line and a region exit table', () => {
    const line = ok({ hall: '  exits: in to the Closet\n' });
    expect(entity(line, 'hall').exits[0]).toMatchObject({ direction: 'in', to: 'closet' });
    const top = 'create the Wing\n  a region\n  exits\n    the Hall: out to the Closet\n';
    const table = ok({ top, hall: '  in the Wing\n' });
    expect(entity(table, 'hall').exits.some((e) => e.direction === 'out' && e.to === 'closet')).toBe(true);
  });

  it('`in is blocked: …` is a blocked exit', () => {
    const ir = ok({ hall: '  in is blocked: no-way\n' });
    expect(entity(ir, 'hall').blockedExits[0]).toMatchObject({ direction: 'in' });
  });

  it('`in to <room>` on a thing is `analysis.exit-non-room`', () => {
    expect(codes({ jar: '  in to the Closet\n' })).toContain('analysis.exit-non-room');
  });

  it('two `in` exits on one room are `analysis.duplicate-exit`', () => {
    expect(codes({ hall: '  in to the Closet\n  in to the Closet\n' })).toContain('analysis.duplicate-exit');
  });
});
