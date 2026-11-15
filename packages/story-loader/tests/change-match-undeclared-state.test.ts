/**
 * change-match-undeclared-state.test.ts — `change the match to <state>`
 * inside an `each` block (GH #709). Which thing the match is, is known
 * only in play: one that declares the state takes it, and one that does
 * not is refused with nothing written, where the loader used to store a
 * state the thing never declared. Run through real engine turns.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader, statement execution.
 */
import { describe, expect, it } from 'vitest';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootTurns, eventsOfType } from './helpers/boot-turns';

const story = (animal: string) => `story
  title: Barn
  authors:
    T
  id: barn
  story-version: 0.0.1

define condition hungry-neighbor: it is hungry

define trait skittish
  states: calm, spooked
end trait

create the Barn
  a room

  A barn.

${animal}

create the cow bell
  aka bell
  a thing
  in the Barn

  A bell.

  on the player touching
    each hungry-neighbor
      change the match to spooked
    end each
    phrase rung
  end on

create Alex
  a person
  playable
  starts in the Barn

  You.

before the game starts
  change the player to Alex
end before

define phrase rung
  The bell clanks.
end phrase
`;

const CAT = `create the barn cat
  aka cat
  a thing, skittish
  in the Barn
  states: hungry, content

  A cat.`;

const GOAT = `create the pygmy goat
  aka goat
  a thing
  in the Barn
  states: hungry, content

  A goat.`;

describe('change the match to a state (GH #709)', () => {
  it('writes the state on a match that declares it', async () => {
    const b = await bootTurns(story(CAT));
    const key = CHORD_STATE_PREFIX + 'barn-cat';
    b.world.setStateValue(key, 'hungry');
    await b.turn('touch bell');
    expect(b.world.getStateValue(key)).toBe('spooked');
  });

  it('refuses a match that does not declare it, naming the thing, and writes nothing', async () => {
    const b = await bootTurns(story(`${CAT}\n\n${GOAT}`));
    const cat = CHORD_STATE_PREFIX + 'barn-cat';
    const goat = CHORD_STATE_PREFIX + 'pygmy-goat';
    b.world.setStateValue(cat, 'content');
    b.world.setStateValue(goat, 'hungry');
    // The engine reports a story rule that failed in play as `command.failed`
    // carrying `storyRule`, with the loader's message as the reason.
    const failures = eventsOfType(await b.turn('touch bell'), 'command.failed');
    expect(failures).toHaveLength(1);
    const data = failures[0].data as { reason: string; storyRule?: boolean };
    expect(data.storyRule).toBe(true);
    expect(data.reason).toContain('`spooked`');
    expect(data.reason).toContain('pygmy goat');
    expect(b.world.getStateValue(goat)).toBe('hungry');
    expect(b.world.getStateValue(cat)).toBe('content');
  });
});
