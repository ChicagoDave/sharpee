/**
 * ADR-374 D1–D5 on the REAL path: a backdrop placed by a list and by a
 * region, `night-vision` on a playable person, `can see` reading the
 * platform, and a night-vision observer seeing its own dark room. A compiled
 * Chord story, loaded through the loader and driven by
 * `GameEngine.executeTurn`; assertions read the world (traits, locations,
 * the story's declared state) and the turn's message ids.
 *
 * Behavior Statements:
 *   backdrop     DOES lower to BackdropTrait listing every room's world id
 *                (region members for `in the <region>`), live in the first;
 *                examining it works from each listed room. REJECTS (out of
 *                scope) from an unlisted room, and unseen in a dark one.
 *   night-vision DOES lower to NightVisionTrait; that observer's `look` in a
 *                dark room describes it. REJECTS: anyone else gets darkness.
 *   can see      DOES read VisibilityBehavior: false in the dark without
 *                night vision, true with it.
 *
 * Owner context: story-loader tests (rule 13a real-path gate).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { BackdropTrait, TraitType } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootEngine } from './helpers/boot-engine';

const SOURCE = `story
  title: Ceres
  authors:
    T
  id: ceres
  story-version: 0.0.1

before the game starts
  change the player to Courier
end before

create the Ceres Surface
  a region

create the Landing Pad
  a room
  in the Ceres Surface
  east to the Tram Platform
  down to the Crawlspace
  west to the Hold

  A pad.

  on the player waving
    change the player to the loader robot
  end on

create the Tram Platform
  a room
  in the Ceres Surface

  A platform.

create the Hold
  a room

  A hold.

create the Crawlspace
  a room, dark
  up to the Landing Pad

  A low crawlspace full of crates.

  after the player jumping while the player can see the crate
    change the tally board to marked
  end after

create the view of Ceres
  a thing, scenery
  in the Landing Pad, the Tram Platform and the Crawlspace
  aka ceres, view

  Ceres hangs overhead.

create the dust haze
  a thing, scenery
  in the Ceres Surface
  aka haze

  A fine grey haze.

create the crate
  a thing
  in the Crawlspace

  A crate.

create Courier
  a person
  playable
  starts in the Landing Pad

  You.

create the loader robot
  a person, night-vision
  playable
  in the Landing Pad
  aka robot

  A robot.

create the tally board
  a thing, scenery
  in the Crawlspace
  states, reversible: blank, marked

  A board.
`;

/** The message ids a turn emitted, in order. */
function ids(result: { events: ISemanticEvent[] }): string[] {
  return result.events
    .map((e) => (e.data as { messageId?: unknown } | undefined)?.messageId)
    .filter((m): m is string => typeof m === 'string');
}

async function boot() {
  const b = bootEngine(SOURCE, 7);
  await b.engine.start();
  const byName = (name: string) => b.world.getAllEntities().find((e) => e.name === name)!;
  const state = (id: string) => b.world.getStateValue(`${CHORD_STATE_PREFIX}${id}`);
  const examined = (result: { events: ISemanticEvent[] }) => result.events.some((e) => e.type === 'if.event.examined');
  return { ...b, byName, state, examined };
}

describe('a backdrop (ADR-374 D1, D2)', () => {
  it('lowers a list placement to BackdropTrait, living in the first room', async () => {
    const b = await boot();
    const view = b.byName('view of Ceres');
    const rooms = ['Landing Pad', 'Tram Platform', 'Crawlspace'].map((n) => b.byName(n).id);
    expect((view.get(TraitType.BACKDROP) as BackdropTrait).roomIds).toEqual(rooms);
    expect(b.world.getLocation(view.id)).toBe(rooms[0]);
  });

  it('lowers a region placement to every member room', async () => {
    const b = await boot();
    const haze = b.byName('dust haze');
    expect([...(haze.get(TraitType.BACKDROP) as BackdropTrait).roomIds].sort()).toEqual(
      [b.byName('Landing Pad').id, b.byName('Tram Platform').id].sort(),
    );
  });

  it('is examinable from each lit listed room and not from an unlisted one', async () => {
    const b = await boot();
    expect(b.examined(await b.engine.executeTurn('examine ceres'))).toBe(true);
    await b.engine.executeTurn('east');
    expect(b.examined(await b.engine.executeTurn('examine ceres'))).toBe(true);
    expect(b.examined(await b.engine.executeTurn('examine haze'))).toBe(true);
    await b.engine.executeTurn('west');
    await b.engine.executeTurn('west');
    expect(b.world.getLocation(b.player.id)).toBe(b.byName('Hold').id);
    expect(b.examined(await b.engine.executeTurn('examine ceres'))).toBe(false);
  });

  it('is unseen in a dark listed room', async () => {
    const b = await boot();
    await b.engine.executeTurn('down');
    expect(b.examined(await b.engine.executeTurn('examine ceres'))).toBe(false);
  });
});

describe('night vision (ADR-374 D3–D5)', () => {
  it('lowers to NightVisionTrait on the person', async () => {
    const b = await boot();
    expect(b.byName('loader robot').has(TraitType.NIGHT_VISION)).toBe(true);
    expect(b.byName('Courier').has(TraitType.NIGHT_VISION)).toBe(false);
  });

  it('the courier finds the crawlspace dark; the robot sees it', async () => {
    const b = await boot();
    const dark = await b.engine.executeTurn('down');
    expect(ids(dark).join(' ')).toContain('too_dark');
    await b.engine.executeTurn('up');
    await b.engine.executeTurn('wave');
    expect(b.world.getPlayer()?.id).toBe(b.byName('loader robot').id);
    const seen = await b.engine.executeTurn('down');
    expect(ids(seen).join(' ')).not.toContain('too_dark');
    expect(b.examined(await b.engine.executeTurn('examine crate'))).toBe(true);
  });

  it('`can see` reads the platform: false in the dark, true with night vision', async () => {
    const b = await boot();
    await b.engine.executeTurn('down');
    await b.engine.executeTurn('jump');
    expect(b.state('tally-board')).toBe('blank');
    await b.engine.executeTurn('up');
    await b.engine.executeTurn('wave');
    await b.engine.executeTurn('down');
    await b.engine.executeTurn('jump');
    expect(b.state('tally-board')).toBe('marked');
  });
});
