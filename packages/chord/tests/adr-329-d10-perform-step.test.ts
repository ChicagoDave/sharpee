/**
 * adr-329-d10-perform-step.test.ts — ADR-329 D10 (GH #321), Acceptance item 6:
 * a goal body line in an action's own words is a goal step with the block's
 * owner implied as the actor. A manifest `taking`/`giving`/`dropping` match
 * folds onto `acquire`/`give`/`drop`; everything else lowers to a `perform`
 * step with its slots sorted into the execution entry's roles. Every illegal
 * spelling is a named diagnostic. Compile only.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRGoalStep, StoryIR } from '../src/ir';

const story = (slots: { top?: string; steps: string }) => `story
  title: Conjuring
  authors:
    T
  id: conjuring
  story-version: 0.0.1

define phrase conjure-what
  Conjure what?
end phrase

define phrase wizard-gloats
  The wizard gloats.
end phrase

define action conjuring
  grammar
    conjure the item into the place
  the item must be reachable
  otherwise refuse conjure-what

define action waving
  grammar
    wave the wand at the target
  the wand is an instrument
  the target must be visible
  otherwise refuse conjure-what

${slots.top ?? ''}
create the Tower
  a room
  east to the Vault

  A tower.

create the Vault
  a room
  west to the Tower

  A vault.

create the key
  in the Tower

  A key.

create the wand
  in the Tower

  A wand.

create the door
  in the Tower

  A door.

create the wizard
  a person
  in the Tower

  goal secure-the-key, high
${slots.steps}
  end goal

  A wizard.

create Alex
  a person
  playable
  starts in the Tower

  You.

before the game starts
  change the player to Alex
end before

`;

const errorsOf = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error');
const ok = (src: string): StoryIR => {
  const r = compile(src);
  const e = r.diagnostics.filter((d) => d.severity === 'error');
  if (e.length) throw new Error(e.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir!;
};
const stepsOf = (lines: string[]): IRGoalStep[] => {
  const ir = ok(story({ steps: lines.map((l) => `    ${l}`).join('\n') }));
  const wizard = ir.entities.find((e) => e.id === 'wizard')!;
  return wizard.character!.goals[0].steps;
};
const oneStep = (line: string): IRGoalStep => stepsOf([line])[0];

describe('a goal line in an action\'s own words lowers to a step (ADR-329 D10)', () => {
  it('a story verb is a `perform` step: `conjure the key into the Vault` — conjuring, item then place as direct and indirect object', () => {
    expect(oneStep('conjure the key into the Vault')).toMatchObject({
      kind: 'perform',
      action: 'conjuring',
      shape: 'conjure :item into :place',
      slots: { directObject: 'key', indirectObject: 'vault' },
    });
  });

  it("a story action's `is an instrument` slot is the instrument, whatever its position: `wave the wand at the door`", () => {
    expect(oneStep('wave the wand at the door')).toMatchObject({
      kind: 'perform',
      action: 'waving',
      slots: { instrument: 'wand', directObject: 'door' },
    });
  });

  it('a standard verb outside the fold is a `perform` of that action: `open the door` is opening', () => {
    expect(oneStep('open the door')).toMatchObject({ kind: 'perform', action: 'opening', shape: 'open :door', slots: { directObject: 'door' } });
  });

  it('a `going` shape carries its canonical direction and no objects: `go east`, `walk e`', () => {
    expect(oneStep('go east')).toMatchObject({ kind: 'perform', action: 'going', slots: { direction: 'east' } });
    expect(oneStep('walk e')).toMatchObject({ kind: 'perform', action: 'going', slots: { direction: 'east' } });
  });

  it('the verb matches by lemma, as in a statement: `opens the door` lowers as `open the door` does', () => {
    expect(oneStep('opens the door')).toMatchObject({ kind: 'perform', action: 'opening' });
  });

  it('`the player` is admissible in a slot: `wave the wand at the player`', () => {
    expect(oneStep('wave the wand at the player')).toMatchObject({ kind: 'perform', slots: { instrument: 'wand', directObject: 'player' } });
  });

  it('the step keeps its place in the sequence among the eight step verbs', () => {
    expect(stepsOf(['seek the player', 'conjure the key into the Vault', 'say wizard-gloats'])).toMatchObject([
      { kind: 'seek', target: 'player' },
      { kind: 'perform', action: 'conjuring' },
      { kind: 'say', phraseKey: 'wizard-gloats' },
    ]);
  });
});

describe('the standard verbs keep their planning half — the fold (ADR-329 D10)', () => {
  it('every `taking` shape is `acquire`: `take the key`, `get the key`, `pick up the key`', () => {
    for (const line of ['take the key', 'get the key', 'pick up the key']) {
      expect(oneStep(line), line).toEqual({ kind: 'acquire', target: 'key', span: expect.anything() });
    }
  });

  it('every `giving` shape is `give`, slots bound by name: `hand the key to the player`, `offer the key to the player`', () => {
    for (const line of ['hand the key to the player', 'offer the key to the player']) {
      expect(oneStep(line), line).toEqual({ kind: 'give', item: 'key', target: 'player', span: expect.anything() });
    }
  });

  it('every `dropping` shape is `drop`: `discard the key`, `put down the key`', () => {
    for (const line of ['discard the key', 'put down the key']) {
      expect(oneStep(line), line).toEqual({ kind: 'drop', item: 'key', span: expect.anything() });
    }
  });

  it('`take the key off` is taking_off, not the fold — the most literal shape wins, so it is a `perform`', () => {
    expect(oneStep('take the key off')).toMatchObject({ kind: 'perform', action: 'taking_off', slots: { directObject: 'key' } });
  });

  it('a story action of a standard name shadows it and is performed as itself, not folded', () => {
    const ir = ok(story({
      top: 'define action taking\n  grammar\n    take the thing\n  the thing must be reachable\n  otherwise refuse conjure-what\n\n',
      steps: '    take the key',
    }));
    const wizard = ir.entities.find((e) => e.id === 'wizard')!;
    expect(wizard.character!.goals[0].steps[0]).toMatchObject({ kind: 'perform', action: 'taking', slots: { directObject: 'key' } });
  });
});

describe('what the step refuses (ADR-329 D10)', () => {
  const codesFor = (line: string) => errorsOf(story({ steps: `    ${line}` })).map((d) => d.code);
  const errorFor = (line: string) => errorsOf(story({ steps: `    ${line}` }))[0];

  it('a first word that opens no action is still the unrecognized goal line, and the message now names the form', () => {
    const e = errorFor('frobnicate the key');
    expect(e.code).toBe('parse.goal-step');
    expect(e.message).toContain("an action's own words");
  });

  it('a `when` suffix on a step is refused, pointing at `wait for`', () => {
    const e = errorFor('open the door when the door is closed');
    expect(e.code).toBe('parse.goal-step');
    expect(e.message).toContain('wait for');
    expect(codesFor('open the door when the door is closed')).toEqual(['parse.goal-step']);
  });

  it('words that fit none of the verb\'s shapes are `analysis.act-slot-shape`, listing them: bare `open`', () => {
    const e = errorFor('open');
    expect(e.code).toBe('analysis.act-slot-shape');
    expect(e.message).toContain('`open :door`');
  });

  it('a trailing word rides into the last slot, as it does in a statement: `open the door quietly` names no entity', () => {
    expect(codesFor('open the door quietly')).toEqual(['analysis.unknown-entity']);
  });

  it('an unknown name in a slot is the existing unknown-entity error', () => {
    expect(codesFor('open the gate')).toEqual(['analysis.unknown-entity']);
  });

  it('a line with a comma or a colon is not a candidate: it stays the unrecognized goal line', () => {
    expect(codesFor('open the door, then leave')).toEqual(['parse.goal-step']);
  });
});
