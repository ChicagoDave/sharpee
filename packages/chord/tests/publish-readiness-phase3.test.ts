/**
 * publish-readiness-phase3.test.ts — the compile-level pins for the
 * analyzer/parser defects of publish-readiness plan Phase 3:
 *
 * - GH #336 (P-4): a possessive-named entity (`the Weaponsmith's Stall`)
 *   resolves as an entity in a condition and a `change` — the declared name
 *   wins over the possessive-field split.
 * - GH #335 (P-5): `phrase <key> with <p> = <v> when <cond>` parses as a
 *   binding plus a condition, in either order.
 * - GH #337 (P-6, analyzer half): a `{bare item}` marker — the no-article
 *   hint — naming a bound slot or `with` param passes the marker gate (a
 *   hinted marker is a template, validated by the binder), while a bare
 *   `{gizmo}` bound nowhere is still an unbound producer.
 * - GH #324 (P-13): inline `kill the player` bodies at the same
 *   fragment-relative line:col in two imported files get distinct keys.
 *
 * Every assertion reads the compiled IR or the diagnostic list.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

/** A minimal story around `body`: header plus a playable character in the first declared room. */
const story = (body: string) => `story
  title: Phase Three
  authors:
    T
  id: phase-three
  story-version: 0.0.1

${body}
create Jack
  a person
  playable

  You.

before the game starts
  change the player to Jack
end before
`;

const errorsOf = (src: string, resolver?: (path: string) => string | null) =>
  compile(src, resolver ? { importResolver: resolver } : undefined).diagnostics.filter((d) => d.severity === 'error');

describe('GH #336: possessive entity names in conditions and statements', () => {
  const ROOMS = `create the Weaponsmith's Stall
  a room
  states: open, blocked
  west to the Candlemaker's Stall

  Blades.

create the Candlemaker's Stall
  a room
  states: open, blocked

  Wax.

  after the player entering while the Weaponsmith's Stall is blocked
    change the Candlemaker's Stall to blocked
  end after
`;

  it('resolves the possessive name as the entity in a `while` condition and a `change` target', () => {
    const result = compile(story(ROOMS));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const candle = result.ir!.entities.find((e) => e.id === "candlemaker's-stall" || e.name.toLowerCase().includes('candlemaker'))!;
    expect(candle).toBeDefined();
    const clause = candle.onClauses[0];
    expect(clause.condition).toMatchObject({ pred: 'is', subject: { kind: 'entity' }, object: { kind: 'symbol', name: 'blocked' } });
    expect(clause.body[0]).toMatchObject({ kind: 'change', entity: { kind: 'entity', id: candle.id }, state: 'blocked' });
  });

  it('still reads a genuine possessive field when no entity carries the whole name', () => {
    const result = compile(story(`create the innkeeper
  a person
  states: calm, cross

  A man.

create the Bar
  a room

  A bar.

  after the player entering while the innkeeper's location is the Bar
    change the innkeeper to cross
  end after
`));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bar = result.ir!.entities.find((e) => e.id === 'bar')!;
    expect(bar.onClauses[0].condition).toMatchObject({ pred: 'is', subject: { kind: 'field', field: 'location' } });
  });
});

describe('GH #335: `phrase … with … when …` parses in both orders', () => {
  const BODY = (line: string) => `create the pear
  in the Stall

  A pear.

  after the player taking
    ${line}
  end after

create the Stall
  a room
  states: calm, chaotic

  A stall.

define phrase lift-quietly
  You pocket {the item} without a sound.
end phrase
`;

  it('`with … when …` yields a binding and a condition', () => {
    const result = compile(story(BODY('phrase lift-quietly with item = the pear when the Stall is calm')));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const pear = result.ir!.entities.find((e) => e.id === 'pear')!;
    const stmt = pear.onClauses[0].body[0];
    expect(stmt).toMatchObject({
      kind: 'phrase',
      phraseKey: 'lift-quietly',
      params: [{ param: 'item', value: { kind: 'entity', id: 'pear' } }],
      stmtWhen: { pred: 'is', object: { kind: 'symbol', name: 'calm' } },
    });
  });

  it('`when … with …` yields the same binding and condition', () => {
    const result = compile(story(BODY('phrase lift-quietly when the Stall is calm with item = the pear')));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const pear = result.ir!.entities.find((e) => e.id === 'pear')!;
    expect(pear.onClauses[0].body[0]).toMatchObject({
      kind: 'phrase',
      params: [{ param: 'item', value: { kind: 'entity', id: 'pear' } }],
      stmtWhen: { pred: 'is', object: { kind: 'symbol', name: 'calm' } },
    });
  });
});

describe('GH #337: the `bare` hint marker passes the marker gate', () => {
  it('accepts `{bare item}` for the taking action’s slot and `{bare ware}` for a `with` param', () => {
    const errors = errorsOf(story(`create the pear
  in the Stall

  A pear.

  after the player taking
    phrase another-one
    phrase named-ware with ware = the pear
  end after

create the Stall
  a room

  A stall.

define phrase another-one
  No one notices you picking up another {bare item}.
end phrase

define phrase named-ware
  Another {bare ware}, then.
end phrase
`));
    expect(errors).toEqual([]);
  });

  it('still rejects a bare marker that is bound nowhere', () => {
    const errors = errorsOf(story(`create the Stall
  a room

  A stall.

define phrase orphan
  Another {gizmo}.
end phrase
`));
    expect(errors.map((e) => e.code)).toContain('analysis.unbound-marker');
  });
});

describe('GH #324: inline kill keys are unique across imported files', () => {
  it('two fragments killing at the same line:col compile without a duplicate-phrase error', () => {
    const fragment = (name: string, room: string) => `create the ${room}
  a room

  A ${name}.

  after the player entering
    kill the player
      The ${name} gets you.
  end after
`;
    const resolver = (path: string) =>
      path === 'north.chord' ? fragment('north wind', 'North Room') : path === 'south.chord' ? fragment('south wind', 'South Room') : null;
    const result = compile(story(`import "north"
import "south"

create the Hall
  a room
  north to the North Room
  south to the South Room

  A hall.
`), { importResolver: resolver });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const keys = Object.keys(result.ir!.phrases.locales['en-US'] ?? {}).filter((k) => k.startsWith('death-at-'));
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
  });
});
