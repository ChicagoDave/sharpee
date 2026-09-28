/**
 * gh-362-sleeping-waking-standard.test.ts — `sleeping` and `waking` are
 * standard actions a Chord story reacts to without a `define action`
 * (`secret-letter-port-platform-defects` Phase 7, P-15; GH #362).
 *
 * REAL path (bootTurns: real compile, real engine, typed commands). A room's
 * `on the player sleeping` / `on the player waking` loads (the loader's
 * fail-fast used to refuse it — no standard action consulted the id), fires
 * for the room the player is in, and speaks in place of the stock line;
 * elsewhere the stock lines stand. Every verb spelling the proposal names
 * parses. Assertions read world state (the orphans' declared state) and text.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Dormitory
  authors:
    T
  id: dormitory
  story-version: 0.0.1

create the Hall
  a room
  north to the Dormitory

  A hall.

create the Dormitory
  a room
  south to the Hall

  A long room of bunks.

  on the player sleeping
    refuse when the orphans is asleep: dont-wake-them
    phrase bunk-dozing
    change the orphans to asleep
  end on

  on the player waking
    phrase you-snap-awake
    change the orphans to awake
  end on

create the orphans
  a person, plural
  in the Dormitory
  states, reversible: awake, asleep

  Children.

define phrase bunk-dozing
  Your breath comes slower, heavier.
end phrase

define phrase you-snap-awake
  You snap awake.
end phrase

define phrase dont-wake-them
  The children are asleep.
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

describe('GH #362: sleeping and waking are standard actions a room reacts to', () => {
  it('the stock lines stand where no room reacts; every spelling parses', async () => {
    const b = await bootTurns(STORY);
    for (const cmd of ['sleep', 'go to sleep', 'go to bed', 'lie down']) {
      expect((await b.turnText(cmd)).text, cmd).toContain("You aren't tired.");
    }
    for (const cmd of ['wake', 'wake up']) {
      expect((await b.turnText(cmd)).text, cmd).toContain("You're already awake.");
    }
  });

  it('a room\'s `on the player sleeping` speaks in place of the stock line and mutates; `waking` fires too', async () => {
    const b = await bootTurns(STORY);
    await b.turnText('north');
    expect(b.world.getStateValue('chord.state.orphans')).toBe('awake');

    const slept = await b.turnText('sleep');
    expect(slept.text).toContain('Your breath comes slower, heavier.');
    expect(slept.text).not.toContain("aren't tired");
    expect(b.world.getStateValue('chord.state.orphans')).toBe('asleep');

    // The refusal arm now holds — a refuse in an `on` intercept vetoes.
    const again = await b.turnText('go to bed');
    expect(again.text).toContain('The children are asleep.');
    expect(again.text).not.toContain('slower, heavier');

    const woke = await b.turnText('wake up');
    expect(woke.text).toContain('You snap awake.');
    expect(woke.text).not.toContain('already awake');
    expect(b.world.getStateValue('chord.state.orphans')).toBe('awake');
  });
});
