/**
 * publish-readiness-phase12.test.ts — the REAL-path pins for the platform
 * side of the seven Fernhill defects (GH #245; publish-readiness Phase 12):
 *
 * - (2) nothing narrates after the turn that killed the player — every-turn
 *   clauses, story clauses and sequence steps all stop.
 * - (4) `take the deed` with the deed shut in its box refuses instead of
 *   taking the box: an exact out-of-scope name beats an in-scope modifier.
 * - (5) `north` at a closed door speaks the door's authored opening refusal.
 * - (6) a hidden player's `look` says where they are hiding.
 * - (text) opening a container lists its contents with articles.
 *
 * Owner context: story-loader tests.
 */
import { describe, expect, it } from 'vitest';
import { sceneWith } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Phase Twelve
  authors:
    T
  id: phase-twelve
  story-version: 0.0.1

create the Hall
  a room
  north to the Folly through the warped door

  A hall.

create the Folly
  a room

  A folly.

create the warped door
  a door
  states: jammed, braced

  A warped door.

  on the player opening while the warped door is jammed
    refuse door-jammed
  end on

create the deed box
  aka box
  a container, openable
  in the Hall

  A box.

create the deed
  in the deed box

  A deed.

create the curtains
  scenery, plural
  hiding-spot with position behind
  in the Hall

  Curtains.

create the fuse
  scenery
  in the Hall
  states: coiled, lit

  A fuse.

  on every turn while the fuse is lit
    phrase fuse-hiss
  end on

define sequence the burn
  when the fuse becomes lit
    phrase fuse-racing
  2 turns later
    kill the player fuse-blast when the fuse is lit
end sequence

create the taper
  in the Hall

  A taper.

  on the player dropping
    change the fuse to lit
  end on

define phrase door-jammed
  The warped door does not shift; something in you does not care to force it.
end phrase

define phrase fuse-hiss
  Sparks walk the cord.
end phrase

define phrase fuse-racing
  It is racing you.
end phrase

define phrase fuse-blast
  The cache goes up in one white roar.
end phrase

create Jack
  a person, proper
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Jack
end before
`;

describe('Phase 12 on the real path', () => {
  it('#245 (4): `take the deed` with the deed shut in its box refuses and leaves the box', async () => {
    const b = await bootTurns(SOURCE);

    const took = await b.turnText('take the deed');

    expect(took.text).toContain("You can't see any such thing.");
    expect(b.world.getLocation(b.id('deed-box'))).toBe(b.id('hall'));
    expect(b.world.getLocation(b.id('deed'))).toBe(b.id('deed-box'));
  });

  it('#245 (text): opening a container lists its contents with articles', async () => {
    const b = await bootTurns(SOURCE);

    const opened = await b.turnText('open the box');

    expect(opened.text).toContain('In the deed box you see a deed.');
    expect(opened.text).not.toContain('you see deed');
  });

  it('#245 (5): `north` at the closed door speaks the door\'s authored opening refusal', async () => {
    const b = await bootTurns(SOURCE);

    const went = await b.turnText('north');

    expect(went.text).toContain('The warped door does not shift');
    expect(went.text).not.toContain('The warped door is closed.');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('hall'));
  });

  it('#245 (6): a hidden player\'s look says where they are hiding', async () => {
    const b = await bootTurns(SOURCE);
    const hid = await b.turnText('hide behind the curtains');
    expect(hid.text).toContain('curtains');

    const looked = await b.turnText('look');

    expect(looked.text).toContain("(You're hiding behind the curtains.)");
  });

  it('#245 (2): nothing narrates after the turn that killed the player', async () => {
    const b = await bootTurns(SOURCE);
    await b.turnText('take the taper');
    const lit = await b.turnText('drop the taper');
    expect(lit.text).toContain('It is racing you.');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'fuse')).toBe('lit');

    await b.turnText('wait');
    const blast = await b.turnText('wait');

    expect(blast.text).toContain('The cache goes up in one white roar.');
    expect(blast.text.indexOf('Sparks walk the cord.')).toBeLessThan(blast.text.indexOf('The cache goes up'));
    expect(blast.text.slice(blast.text.indexOf('The cache goes up'))).not.toContain('Sparks walk the cord.');
    expect(sceneWith(b.world, b.player.id)).toBeUndefined();
  });
});
