/**
 * gh-371-strategy-progress-per-phrase.test.ts — a strategy phrase's progress
 * belongs to the phrase entry, never to the call site
 * (`secret-letter-port-platform-defects` Phase 5, P-9; GH #371; ADR-245).
 *
 * Two clauses on one owner share one `stopping` / `first-time` / `cycling`
 * phrase — one speaks it, the other refuses with it — and every emission
 * advances the same counter: the first arm is heard once, whoever spoke it.
 *
 * REAL path (bootTurns: real compile, real engine, typed commands). The
 * assertions read the rendered text and the persisted `textState` counter
 * the assembler advances (ADR-196 §4), keyed on the phrase alone.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const BUTLER = (strategy: string, arms: string[]) => `story
  title: Butler
  authors:
    T
  id: butler
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the letter
  in the Hall

  A letter.

create the butler
  a person
  in the Hall

  A butler.

  on the player showing
    phrase butler-sees-the-letter
  end on

  on the player giving
    refuse butler-sees-the-letter
  end on

define phrase butler-sees-the-letter, ${strategy}
${arms.map((a) => `  ${a}`).join('\nor\n')}
end phrase

create Jack
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Jack
end before
`;

const STARES = 'The butler stares intently at the letter.';
const IGNORES = 'The butler pointedly does not look at it.';
const SHRUGS = 'The butler shrugs.';

/** The assembler's persisted counter for the shared phrase (ADR-196 §4). */
function counterOf(world: { getCapability(name: string): unknown }): number | undefined {
  const store = world.getCapability('textState') as Record<string, Record<string, number>> | undefined;
  return store?.chord?.['butler-sees-the-letter'];
}

describe('GH #371: strategy progress is per phrase entry, not per call site', () => {
  it('`stopping`: show then give speaks the first arm once, then the second', async () => {
    const b = await bootTurns(BUTLER('stopping', [STARES, IGNORES]));
    await b.turnText('take letter');

    const shown = await b.turnText('show letter to butler');
    expect(shown.text).toContain(STARES);
    expect(shown.text).not.toContain(IGNORES);
    expect(counterOf(b.world)).toBe(1);

    const given = await b.turnText('give letter to butler');
    expect(given.text).toContain(IGNORES);
    expect(given.text).not.toContain(STARES);
    expect(counterOf(b.world)).toBe(2);
  });

  it('`stopping`: give (a refusal) then show advances the same counter', async () => {
    const b = await bootTurns(BUTLER('stopping', [STARES, IGNORES]));
    await b.turnText('take letter');

    const given = await b.turnText('give letter to butler');
    expect(given.text).toContain(STARES);
    expect(counterOf(b.world)).toBe(1);

    const shown = await b.turnText('show letter to butler');
    expect(shown.text).toContain(IGNORES);
    expect(shown.text).not.toContain(STARES);
    expect(counterOf(b.world)).toBe(2);
  });

  it('`first-time`: the first arm is heard once across both clauses', async () => {
    const b = await bootTurns(BUTLER('first-time', [STARES, IGNORES]));
    await b.turnText('take letter');
    expect((await b.turnText('give letter to butler')).text).toContain(STARES);
    expect((await b.turnText('show letter to butler')).text).toContain(IGNORES);
    expect((await b.turnText('give letter to butler')).text).toContain(IGNORES);
  });

  it('`cycling`: the arms rotate across both clauses in emission order', async () => {
    const b = await bootTurns(BUTLER('cycling', [STARES, IGNORES, SHRUGS]));
    await b.turnText('take letter');
    expect((await b.turnText('show letter to butler')).text).toContain(STARES);
    expect((await b.turnText('give letter to butler')).text).toContain(IGNORES);
    expect((await b.turnText('show letter to butler')).text).toContain(SHRUGS);
    expect((await b.turnText('give letter to butler')).text).toContain(STARES);
    expect(counterOf(b.world)).toBe(4);
  });
});
