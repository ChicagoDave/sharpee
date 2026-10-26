/**
 * act-seats.test.ts — an acting statement and a goal step seat the slots
 * they name by the action's seat table (ADR-383 D6; parser review step 3,
 * Phase 5): the roles an action has once the story loads, seating by name
 * whatever order the statement names its slots, the instrument seat for a
 * typed slot, the compiler's refusal of a slot with no seat, and the
 * unused-slot warning counting every name the table seats direct.
 */
import { describe, expect, it } from 'vitest';
import { actionRoles, compile, seatActBindings, type RoleSource } from '../src';
import type { IRGoalStep, StoryIR } from '../src/ir';
import type { LowerableAction } from '../src/patterns';

/** A pattern from words; `:name` is a slot. */
function pattern(text: string): LowerableAction['patterns'][number] {
  return {
    cardinality: null,
    parts: text.split(' ').map((token) => (token.startsWith(':') ? { kind: 'slot' as const, word: token.slice(1) } : { kind: 'word' as const, word: token })),
  };
}

const PRESENTING = { name: 'presenting', patterns: ['offer :gift to :friend', 'present :friend with :gift'].map(pattern), constraints: [] };
const NONE: RoleSource = { actions: [], extensions: [] };

const story = (top: string, body: string) => `story
  title: Bestowing
  authors:
    T
  id: bestowing
  story-version: 0.0.1

define phrase none
  Nothing.
end phrase

define action bestowing
  grammar
    bestow the gift on the friend
    endow the friend with the gift
  move the gift to the friend

${top}
create the Hall
  a room

  A hall.

create the coin
  a thing
  in the Hall

  A coin.

create the chest
  a container, openable, lockable with the brass key, starts locked
  in the Hall

  A chest.

create the brass key
  a thing
  in the Hall

  A key.

create Bob
  a person, proper
  in the Hall

  Bob.

create Teisha
  a person, proper
  in the Hall

${body}
  Teisha.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

const errorsOf = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error');
const ok = (src: string): StoryIR => {
  const result = compile(src);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length) throw new Error(errors.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return result.ir!;
};
const goalStep = (line: string): IRGoalStep =>
  ok(story('', `  goal errand, high\n    ${line}\n  end goal\n`)).entities.find((e) => e.id === 'teisha')!.character!.goals[0].steps[0];
const actOf = (line: string) => `  on every turn\n    ${line}\n  end on\n`;

describe('actionRoles', () => {
  it('a story action`s table comes from its own lines, read in definition order', () => {
    expect(actionRoles('presenting', { actions: [PRESENTING], extensions: [] })).toEqual({ seats: { gift: 'direct', friend: 'indirect' }, typed: {} });
  });

  it('a standard action`s roles are the manifest`s: giving`s seats and unlocking`s instrument', () => {
    expect(actionRoles('giving', NONE).seats).toEqual({ item: 'direct', recipient: 'indirect' });
    expect(actionRoles('unlocking', NONE).typed).toEqual({ key: 'instrument' });
  });

  it('an extension adds its new names to the table it extends', () => {
    const extension = { action: 'presenting', patterns: [pattern('bestow :gift upon :heir')], constraints: [] };
    expect(actionRoles('presenting', { actions: [PRESENTING], extensions: [extension] }).seats).toEqual({ gift: 'direct', friend: 'indirect', heir: 'indirect' });
  });

  it('a story action shadows the standard action of its name', () => {
    const giving = { name: 'giving', patterns: [pattern('hand :present to :pal')], constraints: [] };
    expect(actionRoles('giving', { actions: [giving], extensions: [] }).seats).toEqual({ present: 'direct', pal: 'indirect' });
  });
});

describe('seatActBindings', () => {
  const roles = actionRoles('presenting', { actions: [PRESENTING], extensions: [] });

  it('seats by name, so naming the friend first builds the same command', () => {
    const giftFirst = seatActBindings([{ slot: 'gift', value: 'coin' }, { slot: 'friend', value: 'bob' }], roles);
    const friendFirst = seatActBindings([{ slot: 'friend', value: 'bob' }, { slot: 'gift', value: 'coin' }], roles);
    expect(friendFirst).toEqual({ ok: true, seating: { directObject: 'coin', indirectObject: 'bob' } });
    expect(friendFirst).toEqual(giftFirst);
  });

  it('an instrument slot is the instrument', () => {
    expect(seatActBindings([{ slot: 'target', value: 'chest' }, { slot: 'key', value: 'brass' }], actionRoles('unlocking', NONE))).toEqual({
      ok: true,
      seating: { directObject: 'chest', instrument: 'brass' },
    });
  });

  it('refuses a topic slot, naming it and its type, and a name the table lacks', () => {
    expect(seatActBindings([{ slot: 'recipient', value: 'bob' }, { slot: 'topic', value: 'coin' }], actionRoles('asking', NONE))).toEqual({ ok: false, slot: 'topic', type: 'topic' });
    expect(seatActBindings([{ slot: 'stranger', value: 'bob' }], roles)).toEqual({ ok: false, slot: 'stranger' });
  });

  it('throws when two bindings take one seat', () => {
    const doubled = actionRoles('presenting', { actions: [{ ...PRESENTING, patterns: [...PRESENTING.patterns, pattern('hand :thing')] }], extensions: [] });
    expect(() => seatActBindings([{ slot: 'gift', value: 'coin' }, { slot: 'thing', value: 'key' }], doubled)).toThrow(/both take the direct seat/);
  });
});

describe('a goal step seats its slots by the table', () => {
  it('`endow Bob with the coin` seats the coin direct and Bob indirect, as `bestow the coin on Bob` does', () => {
    const expected = { kind: 'perform', action: 'bestowing', slots: { directObject: 'coin', indirectObject: 'bob' } };
    expect(goalStep('endow Bob with the coin')).toMatchObject(expected);
    expect(goalStep('bestow the coin on Bob')).toMatchObject(expected);
  });

  it('a standard action`s instrument slot is the instrument: `unlock the chest with the brass key`', () => {
    expect(goalStep('unlock the chest with the brass key')).toMatchObject({ kind: 'perform', action: 'unlocking', slots: { directObject: 'chest', instrument: 'brass-key' } });
  });

  it('a topic slot is refused with `analysis.act-unseated-slot`', () => {
    const errors = errorsOf(story('', '  goal errand, high\n    ask Bob about the coin\n  end goal\n'));
    expect(errors.map((e) => e.code)).toEqual(['analysis.act-unseated-slot']);
    expect(errors[0].message).toContain('`topic` is a topic slot of `asking`');
  });
});

describe('an acting statement refuses a slot with no seat at compile time', () => {
  it('`Teisha asks Bob about the coin` is `analysis.act-unseated-slot`', () => {
    const errors = errorsOf(story('', actOf('Teisha asks Bob about the coin')));
    expect(errors.map((e) => e.code)).toEqual(['analysis.act-unseated-slot']);
    expect(errors[0].message).toContain('which an acting statement cannot carry');
  });

  it('either order of a two-line story action, and a standard instrument, compile', () => {
    for (const line of ['Teisha endows Bob with the coin', 'Teisha bestows the coin on Bob', 'Teisha unlocks the chest with the brass key']) {
      expect(errorsOf(story('', actOf(line)))).toEqual([]);
    }
  });
});

describe('the unused-slot warning reads the seat table', () => {
  const warningsOf = (top: string) => compile(story(top, '')).diagnostics.filter((d) => d.code === 'analysis.slot-unused');

  it('a name a later line seats direct is consulted, so it draws no warning', () => {
    expect(warningsOf('define action saluting\n  grammar\n    wave the flag\n    salute the banner\n  phrase none\n')).toEqual([]);
  });

  it('a name seated indirect that nothing uses still draws the warning', () => {
    const warnings = warningsOf('define action saluting\n  grammar\n    wave the flag at the crowd\n  phrase none\n');
    expect(warnings.map((w) => w.message)).toEqual([expect.stringContaining('`the crowd`')]);
  });
});
