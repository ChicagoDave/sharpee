/**
 * ADR-332 Acceptance 4 — the placement test: every one of the eleven turn plugins a live engine registers has its
 * priority falls inside its declared band, and a live engine runs them in
 * D2's order — story reactions, platform phases, watchers. REAL PATH: a
 * real Chord compile, the real loader registering every plugin the story
 * needs, the engine's own registry read back.
 *
 * Owner context: @sharpee/story-loader tests
 */
import { describe, expect, it } from 'vitest';
import { TURN_BANDS, TURN_BAND_ORDER, bandOf } from '@sharpee/plugins';
import { bootEngine } from './helpers/boot-engine';

/** A story that makes the loader register every shipped plugin. */
const SOURCE = `story
  title: Bands
  authors:
    T
  id: bands
  story-version: 0.0.1
  states: calm, chase
  use chapters
  use scoring
    rank "Nobody" at 0
    rank "Somebody" at 10
  use hunger
    grows 5 each turn
    peckish at 30
    fatal at 100
  use state-machines

define chapters
  one - Chapter I
    begins when the game starts
  two - Chapter II
    begins when the story becomes chase
end chapters

define timer bell for the player
end timer

define machine the watch
  starts waiting
  state waiting
    when chase: done
  state done, terminal
end machine

create the Camp
  a room

  A cold camp.

create Bea
  a person
  in the Camp

  A watcher.

create the stone
  in the Camp

  A stone.

  after the player taking
    Bea takes the stone
  end after

create Alex
  a person
  playable
  starts in the Camp

  You.

before the game starts
  change the player to Alex
  start the player's bell
end before
`;

describe('ADR-332 — turn-phase bands, on a live engine', () => {
  it('runs the scheduler first, then the platform phases in ADR-120 order, then the watchers', () => {
    const { engine } = bootEngine(SOURCE, 7);
    const plugins = engine.getPluginRegistry().getAll();
    const ids = plugins.map((p) => p.id);

    expect(ids).toEqual([
      'chord.acted-events',
      'sharpee.plugin.scheduler',
      'chord.story.hunger-daemon',
      'sharpee.engine.actors',
      'sharpee.plugin.state-machine',
      'sharpee.scene-evaluation',
      'sharpee.ext.scoring.rank-watcher',
      'sharpee.ext.hunger.crossing-watcher',
      'chord.story.promotion-narrator',
      'chord.story.hunger-narrator',
      'sharpee.ext.chapters',
    ]);
  });

  it('every shipped plugin sits inside its declared band — none unbanded', () => {
    const { engine } = bootEngine(SOURCE, 7);
    const plugins = engine.getPluginRegistry().getAll();

    const expected: Record<string, keyof typeof TURN_BANDS> = {
      'chord.acted-events': 'storyReactions',
      'chord.story.hunger-daemon': 'storyReactions',
      'chord.story.promotion-narrator': 'watchers',
      'chord.story.hunger-narrator': 'watchers',
      'sharpee.plugin.scheduler': 'storyReactions',
      'sharpee.engine.actors': 'platformPhases',
      'sharpee.plugin.state-machine': 'platformPhases',
      'sharpee.scene-evaluation': 'platformPhases',
      'sharpee.ext.scoring.rank-watcher': 'watchers',
      'sharpee.ext.hunger.crossing-watcher': 'watchers',
      'sharpee.ext.chapters': 'watchers',
    };
    for (const p of plugins) {
      expect(bandOf(p.priority), `${p.id} at ${p.priority}`).toBe(expected[p.id]);
    }
    // The run order across bands is the band order itself.
    const bands = plugins.map((p) => bandOf(p.priority));
    const firstIndex = TURN_BAND_ORDER.map((b) => bands.indexOf(b));
    expect(firstIndex).toEqual([...firstIndex].sort((a, b) => a - b));
  });

  it('pins the eleven numbers of ADR-332 D2', () => {
    const { engine } = bootEngine(SOURCE, 7);
    const byId = Object.fromEntries(engine.getPluginRegistry().getAll().map((p) => [p.id, p.priority]));
    expect(byId).toEqual({
      'chord.acted-events': 390,
      'chord.story.hunger-daemon': 340,
      'chord.story.promotion-narrator': 115,
      'chord.story.hunger-narrator': 115,
      'sharpee.plugin.scheduler': 350,
      'sharpee.engine.actors': 250,
      'sharpee.plugin.state-machine': 240,
      'sharpee.scene-evaluation': 230,
      'sharpee.ext.scoring.rank-watcher': 120,
      'sharpee.ext.hunger.crossing-watcher': 120,
      'sharpee.ext.chapters': 110,
    });
  });
});
