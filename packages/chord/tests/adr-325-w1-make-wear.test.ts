/**
 * adr-325-w1-make-wear.test.ts — ADR-325 Amendment W1 at the compiler
 * (`secret-letter-port-platform-defects` Phase 6, P-14; GH #360):
 * `make <actor> wear <item>` and `make <actor> take off <item>` parse as
 * `move`-family statements and lower to the additive IR kinds; the two
 * compile-time gates (W1e) name the line; `the player` is a legal actor (W1d).
 *
 * Every assertion reads the compiled IR or the diagnostic list.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

/** A story whose Street carries one arrival clause body, `lines`. */
const story = (lines: string) => `story
  title: Wear
  authors:
    T
  id: wear
  story-version: 0.0.1
  states: dressed, urchin

create the Street
  a room

  A street.

  after the player entering
${lines.split('\n').map((l) => `    ${l}`).join('\n')}
  end after

create the woolen cap
  wearable
  in the Street

  A cap.

create the brick
  in the Street

  A brick.

create Teisha
  a person
  in the Street

  Teisha.

create Jack
  a person
  playable
  starts in the Street

  You.

before the game starts
  change the player to Jack
end before
`;

const errors = (result: ReturnType<typeof compile>) => result.diagnostics.filter((d) => d.severity === 'error');
const firstStatement = (result: ReturnType<typeof compile>) =>
  result.ir!.entities.find((e) => e.id === 'street')!.onClauses[0].body[0];

describe('ADR-325 W1: `make <actor> wear <item>` / `make <actor> take off <item>`', () => {
  it('`make the player wear the woolen cap` lowers to `wear` with the player actor (W1a, W1d, W1g)', () => {
    const result = compile(story('make the player wear the woolen cap'));
    expect(errors(result)).toEqual([]);
    expect(firstStatement(result)).toMatchObject({
      kind: 'wear',
      actor: { kind: 'player' },
      item: { kind: 'entity', id: 'woolen-cap' },
      stmtWhen: null,
    });
  });

  it('`make Teisha take off the woolen cap when …` lowers to `take-off` with the entity actor and the gate (W1a, W1g)', () => {
    const result = compile(story('make Teisha take off the woolen cap when dressed'));
    expect(errors(result)).toEqual([]);
    expect(firstStatement(result)).toMatchObject({
      kind: 'take-off',
      actor: { kind: 'entity', id: 'teisha' },
      item: { kind: 'entity', id: 'woolen-cap' },
    });
    expect((firstStatement(result) as { stmtWhen?: unknown }).stmtWhen).not.toBeNull();
  });

  it('is a mutation for phase order — a refusal after it is dead (D3)', () => {
    const result = compile(story('make the player wear the woolen cap\nrefuse when dressed: cap-line'));
    const codes = errors(result).map((d) => d.code);
    expect(codes.some((c) => c.startsWith('analysis.') || c.startsWith('parse.'))).toBe(true);
  });

  it('refuses a garment that is not wearable, naming the line (W1e)', () => {
    const result = compile(story('make the player wear the brick'));
    const err = errors(result).find((d) => d.code === 'analysis.wear-not-wearable');
    expect(err).toBeDefined();
    expect(err!.message).toContain('make the player wear the brick');
    expect(err!.message).toContain('not wearable');
  });

  it('refuses an actor that is not a person, naming the line (W1e)', () => {
    const result = compile(story('make the brick wear the woolen cap'));
    const err = errors(result).find((d) => d.code === 'analysis.wear-actor-not-person');
    expect(err).toBeDefined();
    expect(err!.message).toContain('make the brick wear the woolen cap');
  });

  it('refuses a `make` line with neither `wear` nor `take off` at the parser', () => {
    const result = compile(story('make the player hold the woolen cap'));
    expect(errors(result).map((d) => d.code)).toContain('parse.make-verb');
  });

  it('is never read as an acting statement — `Jack wears the woolen cap` still is one', () => {
    const asAct = compile(story('Jack wears the woolen cap'));
    const kinds = asAct.ir ? [firstStatement(asAct).kind] : [];
    // The acting statement path (ADR-329) owns the bare spelling; the `make`
    // head is what keeps the put apart from the act.
    expect(kinds.length === 0 || kinds[0] === 'act').toBe(true);
  });
});
