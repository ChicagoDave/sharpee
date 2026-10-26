/**
 * ADR-371 D2–D4 compile-time gates: `flammable` joins the one-implementation
 * census, `settable` reads the thing's reversible states, and a `setting`
 * head takes `to <value>`.
 */

import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { StoryIR } from '../src/ir';

const HEADER = `story
  title: Dials
  authors:
    T
  id: dials
  story-version: 0.0.1
`;

const story = (body: string) => `${HEADER}
before the game starts
  change the player to Pilot
end before

create the Cockpit
  a room

  A cockpit.

create Pilot
  a person
  playable
  starts in the Cockpit

  You.

${body}`;

function codes(source: string): string[] {
  const result = compile(source);
  return result.ok ? [] : result.diagnostics.map((d) => d.code);
}

function ir(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join('; '));
  return result.ir;
}

describe('flammable (ADR-371 D2)', () => {
  it('requires exactly one burning implementation, as cuttable does', () => {
    expect(codes(story(`create the letter
  a thing, flammable
  in the Cockpit

  A letter.
`))).toContain('analysis.gerund-implementation');
    expect(codes(story(`create the letter
  a thing, flammable
  in the Cockpit

  A letter.

  on the player burning
    remove the letter
  end on
`))).toEqual([]);
  });

  it('carries `with the <tool>` as its single-entity value', () => {
    const compiled = ir(story(`create the torch
  a thing
  in the Cockpit

  A torch.

create the letter
  a thing, flammable with the torch
  in the Cockpit

  A letter.

  on the player burning
    remove the letter
  end on
`));
    const letter = compiled.entities.find((e) => e.id === 'letter')!;
    const flammable = letter.traits.find((t) => t.name === 'flammable')!;
    expect(JSON.stringify(flammable.config)).toContain('torch');
  });
});

describe('settable (ADR-371 D3)', () => {
  it('needs a states line', () => {
    expect(codes(story(`create the dial
  a thing, settable
  in the Cockpit

  A dial.
`))).toContain('analysis.settable-states');
  });

  it('needs the states to be reversible', () => {
    expect(codes(story(`create the dial
  a thing, settable
  in the Cockpit
  states: low, high

  A dial.
`))).toContain('analysis.settable-irreversible');
  });

  it('compiles with reversible states and lowers to nothing but the adjective', () => {
    const compiled = ir(story(`create the dial
  a thing, settable
  in the Cockpit
  states, reversible: low, medium, high

  A dial.
`));
    const dial = compiled.entities.find((e) => e.id === 'dial')!;
    expect(dial.states).toEqual(['low', 'medium', 'high']);
    expect(dial.statesReversible).toBe(true);
    expect(dial.traits.map((t) => t.name)).toContain('settable');
  });
});

describe('the `to <value>` head tail (ADR-371 D4)', () => {
  const dial = (clauses: string) => story(`create the dial
  a thing, settable
  in the Cockpit
  states, reversible: low, medium, high

  A dial.

${clauses}`);

  it('compiles on a setting head to a clause carrying valueTail', () => {
    const compiled = ir(dial(`  on the player setting to high
    refuse too-hot
  end on

  after the player setting
    phrase clicks
  end after

define phrase too-hot
  Too hot.
end phrase

define phrase clicks
  Click.
end phrase
`));
    const clauses = compiled.entities.find((e) => e.id === 'dial')!.onClauses;
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toMatchObject({ action: 'setting', valueTail: 'high' });
    expect(clauses[1].valueTail).toBeUndefined();
  });

  it('refuses a word that is not one of the states', () => {
    expect(codes(dial(`  on the player setting to mars
    refuse no
  end on

define phrase no
  No.
end phrase
`))).toContain('analysis.setting-tail-unknown');
  });

  it('refuses the tail on any other gerund', () => {
    expect(codes(dial(`  on the player taking to high
    refuse no
  end on

define phrase no
  No.
end phrase
`))).toContain('analysis.head-value-tail');
  });

  it('refuses a tail with no value', () => {
    expect(codes(dial(`  on the player setting to
    refuse no
  end on

define phrase no
  No.
end phrase
`))).toContain('parse.head-value-tail');
  });
});
