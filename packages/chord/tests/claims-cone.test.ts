/**
 * claims-cone.test.ts — a claim's cone of influence over its set (ADR-365
 * D12; AC-9's compile-time clauses on minimal stories).
 *
 * The cone names the things in a claim's `needs` that the claim can never
 * depend on under that set, and `compileClaims` reports them as a warning on
 * the `needs things:` line with the trimmed line proposed. Every test here
 * asserts on that output: which things are inert, which are kept and why,
 * where the finding is spanned, and that the story's IR and the lowered
 * claim set are untouched by it. The firing pass is exercised through the
 * set: the same story and claim give different cones when the set lets the
 * story leave `calm`.
 */
import { describe, expect, it } from 'vitest';
import { claimCone, compile, compileClaims } from '../src';

const HEADER = `story
  title: Cone Fixture
  authors:
    Fixture
  id: cone-fixture
  story-version: 0.0.1
  states: calm, hunted
`;

const PHRASES = `
define phrases en-US
  gate-shut:
    The gate is shut.
  no-bananas:
    Not while it is calm.
  loaf-guard:
    The baker blocks the way.
  sealed-up:
    Sealed.
`;

/**
 * A square with a lane east of it and a gate past the lane; the gate is shut
 * while the story is calm, and only entering the yard (north of the square)
 * ends the calm. Each thing in the square exercises one shape of rule.
 */
function story(options: { laneExtra?: string; top?: string } = {}): string {
  return `${HEADER}${options.top ?? ''}
create the Square
  a room
  east to the Lane
  north to the Yard

  A square.

create the Lane
  a room
  west to the Square
  east to the Gate
  east is blocked while calm: gate-shut
${options.laneExtra ?? ''}
  A lane.

create the Gate
  a room
  west to the Lane

  A gate.

create the Yard
  a room
  south to the Square

  A yard.

  after the player entering
    change the story to hunted
  end after

create the pebble
  a thing
  in the Square

  A pebble.

create the apple
  a thing
  states: shelved, nicked
  in the Square

  An apple.

  after the player taking while the apple is shelved
    change the apple to nicked
    move the player to the Lane when hunted
  end after

create the bell
  a thing
  in the Square

  A bell.

  after the player taking
    move the player to the Lane
  end after

create the banana
  a thing
  states: shelved, nicked
  in the Square

  A banana.

  on the player taking while the banana is shelved
    refuse when calm: no-bananas
  end on

  after the player taking while the banana is shelved
    change the banana to nicked
    move the player to the Lane
  end after

create the loaf
  a thing
  states: shelved, nicked
  in the Square

  A loaf.

  after the player taking
    change the loaf to nicked
  end after

create the brass key
  a thing
  in the Square

  A key.

create the box
  a container
  openable with the brass key
  in the Square

  A box.

create the coin
  a thing
  in the box

  A coin.

create Alex
  a person
  playable
  starts in the Square

  You.

before the game starts
  change the player to Alex
end before
${PHRASES}`;
}

const THINGS = ['pebble', 'apple', 'bell', 'banana', 'loaf', 'brass-key', 'box', 'coin'];
const GATE_CLAIM = { name: 'the player reaches the Gate', never: true as const, room: 'gate' };
const CALM_SET = { rooms: ['square', 'lane', 'gate'], things: THINGS, verbs: ['take', 'drop', 'open', 'unlock'] };

function irOf(source: string) {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code}: ${d.message}`).join('\n'));
  return result.ir;
}

/** 1-based line of the first source line containing `text`. */
const lineOf = (source: string, text: string) => source.split('\n').findIndex((line) => line.includes(text)) + 1;
/** 1-based line of the first source line equal to `text`. */
const exactLineOf = (source: string, text: string) => source.split('\n').findIndex((line) => line === text) + 1;

describe('claimCone — what a never-reaches-the-Gate claim can depend on', () => {
  it('under a set that keeps the story calm, only the thing whose rule moves the player is kept', () => {
    const source = story();
    const cone = claimCone(irOf(source), GATE_CLAIM, CALM_SET);
    // The reason is the clause that reads the bell: its `after the player taking` header line.
    const bellLine = exactLineOf(source, '  after the player taking');
    expect(cone.inert).toEqual(['pebble', 'apple', 'banana', 'loaf', 'brass-key', 'box', 'coin']);
    expect(cone.trimmedThings).toEqual(['bell']);
    expect(cone.kept).toEqual([{ thing: 'bell', reason: `\`after … taking\` of bell (the story:${bellLine})`, span: expect.objectContaining({ line: bellLine }) }]);
  });

  it('an effect gated on a state the set never reaches is inert; let the set reach it and the thing is kept', () => {
    const source = story();
    const ir = irOf(source);
    expect(claimCone(ir, GATE_CLAIM, CALM_SET).inert).toContain('apple');
    const withYard = claimCone(ir, GATE_CLAIM, { ...CALM_SET, rooms: [...CALM_SET.rooms, 'yard'] });
    expect(withYard.inert).toEqual(['pebble', 'loaf', 'brass-key', 'box', 'coin']);
    const apple = withYard.kept.find((k) => k.thing === 'apple')!;
    const clauseLine = lineOf(source, 'after the player taking while the apple is shelved');
    expect(apple.reason).toBe(`\`after … taking\` of apple (the story:${clauseLine})`);
    expect(apple.span?.line).toBe(clauseLine);
  });

  it('an `on` clause that certainly refuses the take switches the `after` clause off; once the refusal can fail, the thing is kept', () => {
    const ir = irOf(story());
    expect(claimCone(ir, GATE_CLAIM, CALM_SET).inert).toContain('banana');
    const withYard = claimCone(ir, GATE_CLAIM, { ...CALM_SET, rooms: [...CALM_SET.rooms, 'yard'] });
    expect(withYard.kept.map((k) => k.thing)).toContain('banana');
  });

  it('a ware whose state guards an exit is kept, with the guard line named as the reason (AC-9)', () => {
    const source = story({ laneExtra: '  east is blocked while the loaf is shelved: loaf-guard\n' });
    const cone = claimCone(irOf(source), GATE_CLAIM, CALM_SET);
    const guardLine = lineOf(source, 'east is blocked while the loaf is shelved');
    expect(cone.inert).toEqual(['pebble', 'apple', 'banana', 'brass-key', 'box', 'coin']);
    const loaf = cone.kept.find((k) => k.thing === 'loaf')!;
    expect(loaf.reason).toBe(`the guard on Lane's east exit (the story:${guardLine})`);
    expect(loaf.span?.line).toBe(guardLine);
  });

  it('a construct the cone cannot narrow keeps every thing and says so', () => {
    const source = story({ top: 'define condition is-nicked: it is nicked\n', laneExtra: '  east is blocked while any is-nicked: sealed-up\n' });
    const cone = claimCone(irOf(source), GATE_CLAIM, CALM_SET);
    expect(cone.inert).toEqual([]);
    expect(cone.trimmedThings).toEqual(THINGS);
    for (const kept of cone.kept) if (kept.thing !== 'bell') expect(kept.reason).toMatch(/cannot narrow$/);
  });
});

describe('claimCone — reaching a thing reads its holders and the key its trait names', () => {
  it('the box the coin sits in and the key that opens the box are kept; a pebble beside them is inert', () => {
    const cone = claimCone(irOf(story()), { name: 'the coin is in hand', placement: { thing: 'coin', in: 'player' } }, { rooms: ['square'], things: ['coin', 'box', 'brass-key', 'pebble'], verbs: ['take', 'open', 'unlock'] });
    expect(cone.inert).toEqual(['pebble']);
    expect(cone.trimmedThings).toEqual(['coin', 'box', 'brass-key']);
    expect(cone.kept.map((k) => k.thing)).toEqual(['coin', 'box', 'brass-key']);
    expect(cone.kept[0].reason).toBe("the claim's predicate");
    expect(cone.kept[1].reason).toMatch(/^the walk's `taking` on coin \(the story:\d+\)$/);
  });
});

describe('compileClaims — the analysis.claim-inert-needs finding', () => {
  const FRAGMENT = `## Cone fixture claims.

claims
  needs rooms: the Square, the Lane, the Gate
  needs things: the pebble, the apple, the bell, the banana, the loaf, the brass key, the box, the coin
  needs verbs: take, drop, open, unlock

  never the player reaches the Gate
    the player is in the Gate

  claim the coin is in hand
    the player has the coin
    needs rooms: the Square
    needs things: the coin, the box, the brass key, the pebble
    needs verbs: take, open, unlock

  claim the coin is in hand with a tight set
    the player has the coin
    needs rooms: the Square
    needs things: the coin, the box, the brass key
    needs verbs: take, open, unlock
end claims
`;

  it('warns once per claim with inert things, on the needs things line that supplies the set, naming them and the trimmed line', () => {
    const result = compileClaims(story(), FRAGMENT, { claimsFile: 'cone.claims.chord' });
    expect(result.ok).toBe(true);
    expect(result.claims).not.toBeNull();
    const findings = result.diagnostics.filter((d) => d.code === 'analysis.claim-inert-needs');
    expect(findings.map((d) => [d.severity, d.span.file, d.span.line])).toEqual([
      ['warning', 'cone.claims.chord', lineOf(FRAGMENT, 'needs things: the pebble, the apple')],
      ['warning', 'cone.claims.chord', lineOf(FRAGMENT, 'needs things: the coin, the box, the brass key, the pebble')],
    ]);
    expect(findings[0].message).toBe(
      '[cone.claims.chord] `the player reaches the Gate` depends on 1 of the 8 things in its set — under this set nothing it depends on reads pebble, apple, banana, loaf, brass key, box, coin. The walk still runs the set as written; a trimmed line: `needs things: bell`.',
    );
    expect(findings[1].message).toContain('`the coin is in hand` depends on 3 of the 4 things in its set');
    expect(findings[1].message).toContain('a trimmed line: `needs things: coin, box, brass key`');
  });

  it('a claim with no inert things gets no finding, and the finding never changes ok, the claim set, or the story IR', () => {
    const result = compileClaims(story(), FRAGMENT, { claimsFile: 'cone.claims.chord' });
    const tight = result.diagnostics.filter((d) => d.code === 'analysis.claim-inert-needs' && d.message.includes('with a tight set'));
    expect(tight).toEqual([]);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.claims?.things).toEqual(['pebble', 'apple', 'bell', 'banana', 'loaf', 'brass-key', 'box', 'coin']);
    expect(result.claims?.claims[0]).toEqual({ name: 'the player reaches the Gate', never: true, room: 'gate' });
    expect(result.ir).toEqual(compile(story()).ir);
  });

  it('when every thing is inert the finding says the line can go', () => {
    const fragment = 'claims\n  needs rooms: the Square, the Lane, the Gate\n  needs things: the pebble, the loaf\n  needs verbs: take\n\n  never the player reaches the Gate\n    the player is in the Gate\nend claims\n';
    const result = compileClaims(story(), fragment);
    const finding = result.diagnostics.find((d) => d.code === 'analysis.claim-inert-needs')!;
    expect(finding.message).toBe('`the player reaches the Gate` depends on none of the 2 things in its set — under this set nothing it depends on reads pebble, loaf. The walk still runs the set as written; the line can go.');
    expect(result.ok).toBe(true);
  });
});
