/**
 * act-statement.test.ts — ADR-329 D1–D3 (Phase 9a): the acting statement
 * `<actor> <verb> …` parses in every legal body and lowers to one `act` IR
 * statement; the verb is matched by lemma against the manifest's and the
 * story's grammar shapes (D2); every illegal spelling is a named diagnostic
 * (D3, Q-3). Compile only — nothing executes until Phase 9b.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRStatement, StoryIR } from '../src/ir';

type ActIR = Extract<IRStatement, { kind: 'act' }>;

const story = (slots: { top?: string; yard?: string; guards?: string; sword?: string; player?: string; before?: string } = {}) => `story
  title: Acting
  authors:
    T
  id: acting
  story-version: 0.0.1

define phrase nope
  Nope.
end phrase

define timer waiting for Alex
  pausing
end timer

define action kicking
  grammar
    kick the target
  the target must be reachable
  otherwise refuse nope

${slots.top ?? ''}
create the Yard
  a room
${slots.yard ?? ''}
  A yard.

create the guards
  a person, plural
  in the Yard
  states, reversible: calm, alert
${slots.guards ?? ''}
  Guards.

create the sword
  in the Yard
${slots.sword ?? ''}
  A sword.

create the rock
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
${slots.player ?? ''}
  You.

before the game starts
  change the player to Alex
${slots.before ?? ''}
end before

`;

const errorsOf = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error');
const codesOf = (src: string) => errorsOf(src).map((d) => d.code);
const ok = (src: string): StoryIR => {
  const r = compile(src);
  const e = r.diagnostics.filter((d) => d.severity === 'error');
  if (e.length) throw new Error(e.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir!;
};

/** Every `act` statement anywhere in the IR, in document order. */
const actsIn = (node: unknown, out: ActIR[] = []): ActIR[] => {
  if (Array.isArray(node)) { for (const n of node) actsIn(n, out); return out; }
  if (node && typeof node === 'object') {
    const rec = node as Record<string, unknown>;
    if (rec.kind === 'act' && typeof rec.action === 'string' && Array.isArray(rec.slots)) out.push(rec as unknown as ActIR);
    for (const v of Object.values(rec)) actsIn(v, out);
  }
  return out;
};

const afterEntering = (stmt: string) => story({ yard: `  after the player entering\n    ${stmt}\n  end after\n` });

describe('the acting statement lowers to IR (ADR-329 D1/D2)', () => {
  it('`the guards take the sword` in an `after` body is one act: taking, shape `take :item`, item → the sword', () => {
    const ir = ok(afterEntering('the guards take the sword'));
    const yard = ir.entities.find((e) => e.id === 'yard')!;
    const body = yard.onClauses[0].body;
    expect(body).toHaveLength(1);
    const act = body[0] as ActIR;
    expect(act.kind).toBe('act');
    expect(act.actor).toEqual({ kind: 'entity', id: 'guards' });
    expect(act.action).toBe('taking');
    expect(act.shape).toBe('take :item');
    expect(act.slots).toEqual([{ slot: 'item', value: { kind: 'entity', id: 'sword' } }]);
    expect(act.stmtWhen).toBeNull();
  });

  it('either inflection matches on the lemma (Q-1): `takes` lowers exactly as `take` does', () => {
    const a = actsIn(ok(afterEntering('the guards take the sword')))[0];
    const b = actsIn(ok(afterEntering('the guards takes the sword')))[0];
    expect({ ...b, span: undefined }).toEqual({ ...a, span: undefined });
  });

  it('a two-slot shape binds both slots in order: `Teisha gives the sword to the player`', () => {
    const act = actsIn(ok(afterEntering('Teisha gives the sword to the player')))[0];
    expect(act.actor).toEqual({ kind: 'entity', id: 'teisha' });
    expect(act.action).toBe('giving');
    expect(act.shape).toBe('give :item to :recipient');
    expect(act.slots).toEqual([
      { slot: 'item', value: { kind: 'entity', id: 'sword' } },
      { slot: 'recipient', value: { kind: 'player' } },
    ]);
  });

  it('a going shape carries its direction as a literal `direction` slot: `the guards go east`', () => {
    const act = actsIn(ok(afterEntering('the guards go east')))[0];
    expect(act.action).toBe('going');
    expect(act.shape).toBe('go east');
    expect(act.slots).toEqual([{ slot: 'direction', value: { kind: 'literal', value: 'east', valueType: 'string' } }]);
    expect(actsIn(ok(afterEntering('the guards walk north')))[0].slots[0].value).toEqual({ kind: 'literal', value: 'north', valueType: 'string' });
    // the short spellings the manifest also carries canonicalize for the loader's direction lookup
    expect(actsIn(ok(afterEntering('the guards go n')))[0].slots[0].value).toEqual({ kind: 'literal', value: 'north', valueType: 'string' });
    expect(actsIn(ok(afterEntering('the guards go inside')))[0].slots[0].value).toEqual({ kind: 'literal', value: 'in', valueType: 'string' });
  });

  it("a story-defined action's own grammar is a shape: `the guards kick the rock` is `kicking`", () => {
    const act = actsIn(ok(afterEntering('the guards kick the rock')))[0];
    expect(act.action).toBe('kicking');
    expect(act.shape).toBe('kick :target');
    expect(act.slots).toEqual([{ slot: 'target', value: { kind: 'entity', id: 'rock' } }]);
  });

  it('the most specific shape wins: `the guards take the sword off` is taking_off, not taking', () => {
    const act = actsIn(ok(afterEntering('the guards take the sword off')))[0];
    expect(act.action).toBe('taking_off');
    expect(act.shape).toBe('take :item off');
  });

  it('the statement-final `when` suffix rides along', () => {
    const act = actsIn(ok(afterEntering('the guards take the sword when the guards is alert')))[0];
    expect(act.action).toBe('taking');
    expect(act.slots[0].value).toEqual({ kind: 'entity', id: 'sword' });
    expect(act.stmtWhen).not.toBeNull();
  });

  it('an act counts as a mutation for phase order: a refusal after it is the existing dead-refusal error', () => {
    const codes = codesOf(story({ sword: '  on the player taking\n    the guards take the sword\n    refuse nope\n  end on\n' }));
    // The intercept-body gate fires (D3); the phase-order sweep still sees the
    // act as a mutation, exactly like `move` — no second, contradictory verdict.
    expect(codes).toContain('analysis.act-in-intercept');
  });
});

describe('where a character may act (ADR-329 D3)', () => {
  it('`on every turn`, `when … expires`, `when … moves`, and conversation rows all admit the statement', () => {
    const everyTurn = ok(story({ guards: '  on every turn\n    the guards take the sword\n  end on\n' }));
    expect(actsIn(everyTurn)).toHaveLength(1);
    const expires = ok(story({ player: '  when waiting expires\n    the guards take the sword\n  end when\n' }));
    expect(actsIn(expires)).toHaveLength(1);
    const moves = ok(story({ guards: '  when the player moves\n    the guards take the sword\n  end when\n' }));
    expect(actsIn(moves)).toHaveLength(1);
    const row = ok(story({ top: 'define topics for Teisha\n  about "the sword":\n    Teisha gives the sword to the player\nend topics\n\n' }));
    expect(actsIn(row)).toHaveLength(1);
  });

  it('an `on` intercept body refuses the statement by name, pointing at `after`', () => {
    const found = errorsOf(story({ sword: '  on the player taking\n    the guards take the sword\n  end on\n' }));
    expect(found.map((d) => d.code)).toEqual(['analysis.act-in-intercept']);
    expect(found[0].message).toContain('`after` clause');
  });

  it('`before the game starts` refuses the statement — nothing acts before turn one', () => {
    const found = errorsOf(story({ before: '  the guards take the sword\n' }));
    expect(found.map((d) => d.code)).toEqual(['analysis.act-in-intercept']);
    expect(found[0].message).toContain('before the game starts');
  });
});

describe('what the statement refuses (ADR-329 D1/D2, Q-3)', () => {
  it('`the player` is never made to act (Q-3)', () => {
    const found = errorsOf(afterEntering('the player takes the sword'));
    expect(found.map((d) => d.code)).toEqual(['analysis.act-player-actor']);
    expect(found[0].message).toContain("character's own name");
  });

  it('a thing that is not a person cannot act', () => {
    const found = errorsOf(afterEntering('the sword takes the rock'));
    expect(found.map((d) => d.code)).toEqual(['analysis.act-actor']);
    expect(found[0].message).toContain('cannot act');
  });

  it('an unknown actor is named, with a nearest character suggested', () => {
    const found = errorsOf(afterEntering('the guard takes the sword'));
    expect(found.map((d) => d.code)).toEqual(['analysis.act-actor']);
    expect(found[0].message).toContain('guards');
  });

  it("a word that opens no action's grammar is `act-unknown-verb`: `the guards quietly take the sword`", () => {
    const found = errorsOf(afterEntering('the guards quietly take the sword'));
    expect(found.map((d) => d.code)).toEqual(['analysis.act-unknown-verb']);
    expect(found[0].message).toContain('`quietly`');
  });

  it('a verb whose shapes the words do not fit is `act-slot-shape`, listing the shapes', () => {
    const found = errorsOf(afterEntering('the guards give the sword'));
    expect(found.map((d) => d.code)).toEqual(['analysis.act-slot-shape']);
    expect(found[0].message).toContain('`give :item to :recipient`');
  });

  it('an unknown name in a slot is the existing unknown-entity error', () => {
    expect(codesOf(afterEntering('the guards take the spoon'))).toEqual(['analysis.unknown-entity']);
  });

  it('a line with no action verb anywhere is still `parse.unknown-statement`', () => {
    expect(codesOf(afterEntering('frobnicate the message'))).toEqual(['parse.unknown-statement']);
  });
});
