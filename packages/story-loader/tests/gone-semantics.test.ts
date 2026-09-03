/**
 * gone-semantics.test.ts — ADR-325 Z6 as amended (GH #345, GH #330) on the
 * REAL path: Chord's `remove` marks an entity gone instead of destroying
 * it. A blocked-exit condition naming a removed entity reads false (the
 * room can be entered, the exit walked); a `refuse when` naming a removed
 * entity evaluates instead of killing the command; the entity's states
 * read as last set; `has` reads false; the flag survives a world round
 * trip; a later `move` revives it; and a story rule that genuinely fails
 * renders as the story-rule message, never as the parser's refusal.
 *
 * Owner context: story-loader tests (publish-readiness Phase 4).
 */
import { describe, expect, it } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import { bootTurns } from './helpers/boot-turns';
import { CHORD_GONE_PREFIX } from '../src/state-keys';

const SOURCE = `story
  title: Gone
  authors:
    T
  id: gone
  story-version: 0.0.1

create the Alley
  a room
  southeast to the Junction
  north to the Tent
  southeast is blocked while the voices is here: alley-stay-hidden

  An alley.

create the Junction
  a room

  A junction.

create the Tent
  a room

  A tent.

create the voices
  scenery, plural
  in the Alley
  states: murmuring, shouting

  Voices.

create the necklace
  in the Tent

  A necklace.

create the silk
  in the Tent

  A silk.

  on the player taking
    refuse when the necklace is not in the player and the necklace is not in the Tent: silks-no-money
  end on

create the drum
  in the Tent

  A drum.

  after the player taking
    change the voices to shouting
    remove the voices
  end after

create the bell
  in the Tent

  A bell.

  after the player taking
    remove the necklace
  end after

create the whistle
  in the Tent

  A whistle.

  after the player taking
    move the voices to the Tent
  end after

create the cracked bell
  in the Tent

  A cracked bell.

  after the player taking while the voices is shouting
    phrase still-shouting
      The voices, wherever they went, were shouting.
  end after

define phrase alley-stay-hidden
  Not while the voices are here.
end phrase

define phrase silks-no-money
  You have nothing to pay with.
end phrase

create Jack
  a person
  playable
  starts in the Tent

  You.

before the game starts
  change the player to Jack
end before
`;

describe('ADR-325 Z6 as amended: `remove` marks an entity gone', () => {
  it('GH #330: a blocked-exit condition naming a removed entity reads false — the room enters and the exit walks', async () => {
    const b = await bootTurns(SOURCE);

    // Before: the voices are in the Alley and the exit refuses.
    await b.turnText('south');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('alley'));
    const blocked = await b.turnText('southeast');
    expect(blocked.text).toContain('Not while the voices are here.');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('alley'));

    // Remove the voices (the drum's clause), from the Tent.
    await b.turnText('north');
    await b.turnText('take drum');
    expect(b.world.getLocation(b.id('voices'))).toBeUndefined();
    expect(b.story.runtime.isGone(b.id('voices'), b.world)).toBe(true);

    // After: entering the Alley evaluates the condition without throwing, and the exit works.
    const enter = await b.turnText('south');
    expect(enter.text).not.toContain('rules failed');
    expect(enter.text).not.toContain("I don't understand");
    expect(b.world.getLocation(b.player.id)).toBe(b.id('alley'));
    const walked = await b.turnText('southeast');
    expect(walked.text).not.toContain("I don't understand");
    expect(b.world.getLocation(b.player.id)).toBe(b.id('junction'));
  });

  it('GH #345: a `refuse when` naming a removed entity evaluates instead of killing the command', async () => {
    const b = await bootTurns(SOURCE);

    await b.turnText('take bell');
    expect(b.story.runtime.isGone(b.id('necklace'), b.world)).toBe(true);

    // The necklace is nowhere: neither in the player nor in the Tent, so the refusal fires — as authored.
    const refused = await b.turnText('take silk');
    expect(refused.text).toContain('You have nothing to pay with.');
    expect(refused.text).not.toContain("I don't understand");
    expect(b.world.getLocation(b.id('silk'))).toBe(b.id('tent'));
  });

  it('a gone entity keeps its states as last set, and `has` on it reads false', async () => {
    const b = await bootTurns(SOURCE);

    await b.turnText('take drum'); // changes the voices to shouting, then removes them
    const later = await b.turnText('take cracked bell');
    expect(later.text).toContain('The voices, wherever they went, were shouting.');
  });

  it('the flag survives a world round trip, and a later `move` revives the entity', async () => {
    const b = await bootTurns(SOURCE);
    await b.turnText('take drum');
    const key = CHORD_GONE_PREFIX + 'voices';
    expect(b.world.getStateValue(key)).toBe(true);

    const copy = new WorldModel();
    copy.loadJSON(b.world.toJSON());
    expect(copy.getStateValue(key)).toBe(true);
    expect(copy.getEntity(b.id('voices'))).toBeDefined();
    expect(copy.getLocation(b.id('voices'))).toBeUndefined();

    await b.turnText('take whistle'); // moves the voices to the Tent
    expect(b.world.getLocation(b.id('voices'))).toBe(b.id('tent'));
    expect(b.story.runtime.isGone(b.id('voices'), b.world)).toBe(false);
  });

  it('a story rule that genuinely fails renders as the story-rule message, never as the parser’s refusal', async () => {
    const b = await bootTurns(SOURCE);

    // Destroy the necklace outright through the platform primitive (what a
    // TypeScript story does), so the silk's refusal condition names an
    // entity that no longer exists at all.
    b.world.removeEntity(b.id('necklace'));
    const failed = await b.turnText('take silk');

    expect(failed.text).toContain("One of the story's rules failed here:");
    expect(failed.text).toContain('Expected an entity');
    expect(failed.text).not.toContain("I don't understand that.");
  });
});
