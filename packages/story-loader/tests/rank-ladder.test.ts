/**
 * rank-ladder.test.ts — ADR-261 D5/D7 loader side: `ir.ranks` lowers onto
 * ADR-260's `setRanks` seam, `use scoring` drives both extension hooks, and
 * a `says` rung speaks the story's own phrase.
 *
 * Covers ADR-261 acceptance #7a, plus ADR-260 acceptance #6's
 * "no loader-side special-casing of the `scoring` name".
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { createSeededRandom } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

const source = (headerBody: string, phrases = '') => `story "The Folly" by "T"
  id: folly
  version: 0.0.1
${headerBody}
create the Lawn
  a room

  A lawn.

create the player
  starts in the Lawn

  You.
${phrases}`;

function compileSource(text: string): StoryIR {
  const result = compile(text);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

/** Load a story into a world, returning the world and every plugin registered. */
function load(text: string) {
  const story = createStory(compileSource(text));
  const world = new WorldModel();
  story.initializeWorld(world);
  world.setPlayer(story.createPlayer(world).id);

  const plugins: TurnPlugin[] = [];
  story.onEngineReady({
    getPluginRegistry: () => ({ register: (p: unknown) => plugins.push(p as TurnPlugin) }),
  });
  return { story, world, plugins };
}

const context = (world: WorldModel, turn = 1): TurnPluginContext => ({
  world,
  turn,
  playerId: world.getPlayer()!.id,
  playerLocation: 'lawn',
  random: createSeededRandom(1),
});

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

const LADDER =
  '  score lamp worth 200\n' +
  '  use scoring\n' +
  '    rank "Curious Visitor" at 0\n' +
  '    rank "Attentive Guest" at 40\n' +
  '    rank "Master of the Folly" at 120\n';

describe('the ladder lowers onto setRanks (ADR-261 D5)', () => {
  it('installs the rungs, sorted, with their kebab ids', () => {
    const { world } = load(source(LADDER));

    expect(world.getRanks()).toEqual([
      { id: 'curious-visitor', name: 'Curious Visitor', threshold: 0 },
      { id: 'attentive-guest', name: 'Attentive Guest', threshold: 40 },
      { id: 'master-of-the-folly', name: 'Master of the Folly', threshold: 120 },
    ]);
  });

  it('never puts phraseKey on the platform type (ADR-260 D2 / ADR-261 D7)', () => {
    const { world } = load(source(
      '  score lamp worth 200\n' +
      '  use scoring\n' +
      '    rank "Attentive Guest" at 40 says settled-in\n'
    ));

    for (const rank of world.getRanks()) {
      expect(rank).not.toHaveProperty('phraseKey');
    }
  });

  it('`use scoring` enables scoring through registerWorld', () => {
    const { world } = load(source(LADDER));
    expect(world.isScoringEnabled()).toBe(true);
  });

  it('a story without `use scoring` installs neither flag nor ladder (D3)', () => {
    const { world } = load(source('  version: 0.0.2\n'));

    expect(world.isScoringEnabled()).toBe(false);
    expect(world.getRanks()).toEqual([]);
  });

  it('the ceiling and the ladder are independent — thresholds are absolute', () => {
    const { world } = load(source(LADDER));

    expect(world.getMaxScore()).toBe(200);
    world.awardScore('lamp', 120, 'Everything');
    const before = world.getRank();
    world.setMaxScore(650);

    expect(world.getRank()).toEqual(before);
  });
});

describe('the rogue-IR backstop (ADR-261 D4)', () => {
  // The compiler's analysis.scoring-needs-use catches this first; hand-built
  // IR reaches the loader, and a gated construct must never be silently dead.
  const stripScoring = (ir: StoryIR): StoryIR =>
    ({ ...ir, uses: ir.uses.filter((u) => u !== 'scoring') });

  it('scores without `use scoring` in the IR throw a LoadError', () => {
    const ir = stripScoring(compileSource(source(LADDER)));

    expect(() => createStory(ir).initializeWorld(new WorldModel()))
      .toThrow(/need `use scoring`/);
  });

  it('ranks without `use scoring` in the IR throw a LoadError', () => {
    const compiled = compileSource(source(LADDER));
    const ir = { ...stripScoring(compiled), scores: [] };

    expect(() => createStory(ir).initializeWorld(new WorldModel()))
      .toThrow(/need `use scoring`/);
  });

  it('a story with neither loads fine', () => {
    const ir = compileSource(source('  version: 0.0.2\n'));

    expect(() => createStory(ir).initializeWorld(new WorldModel())).not.toThrow();
  });
});

describe('registerPlugin reaches the registry (ADR-260 acceptance #6)', () => {
  it('`use scoring` registers the rank watcher, with no loader-side name check', () => {
    const { plugins } = load(source(LADDER));

    expect(plugins.map((p) => p.id)).toContain('sharpee.ext.scoring.rank-watcher');
  });

  it('a story without `use scoring` registers no watcher', () => {
    const { plugins } = load(source('  version: 0.0.2\n'));

    expect(plugins.map((p) => p.id)).not.toContain('sharpee.ext.scoring.rank-watcher');
  });

  it('the watcher emits if.event.rank_risen on a crossing', () => {
    const { world, plugins } = load(source(LADDER));
    const watcher = plugins.find((p) => p.id === 'sharpee.ext.scoring.rank-watcher')!;

    watcher.onAfterAction(context(world));
    world.awardScore('lamp', 60, 'Found the lamp');
    const events = watcher.onAfterAction(context(world, 2));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('if.event.rank_risen');
    expect(events[0].data).toMatchObject({ toRank: 'attentive-guest' });
  });
});

describe('`says` promotion phrases (ADR-261 acceptance #7a)', () => {
  const WITH_SAYS = source(
    '  score lamp worth 200\n' +
    '  use scoring\n' +
    '    rank "Curious Visitor" at 0\n' +
    '    rank "Attentive Guest" at 40 says settled-in\n' +
    '    rank "Master of the Folly" at 120\n',
    '\ndefine phrases en-US\n' +
    '  settled-in:\n' +
    '    The Folly begins to feel like somewhere you belong.\n'
  );

  it('registers a narrator only when some rung says something', () => {
    expect(load(WITH_SAYS).plugins.map((p) => p.id))
      .toContain('chord.story.promotion-narrator');

    // Every rung silent — no narrator at all.
    expect(load(source(LADDER)).plugins.map((p) => p.id))
      .not.toContain('chord.story.promotion-narrator');
  });

  it('speaks the rung\'s phrase ONCE on the turn it is crossed', () => {
    const { world, plugins } = load(WITH_SAYS);
    const narrator = plugins.find((p) => p.id === 'chord.story.promotion-narrator')!;

    narrator.onAfterAction(context(world));
    world.awardScore('lamp', 60, 'Found the lamp');

    expect(messageIdsOf(narrator.onAfterAction(context(world, 2)))).toEqual(['settled-in']);
    // Still inside the same band on the next turn.
    expect(narrator.onAfterAction(context(world, 3))).toEqual([]);
  });

  it('the spoken key belongs to the STORY — it appears in no platform source', () => {
    const { world, plugins } = load(WITH_SAYS);
    const narrator = plugins.find((p) => p.id === 'chord.story.promotion-narrator')!;

    narrator.onAfterAction(context(world));
    world.awardScore('lamp', 60, 'Found the lamp');
    const events = narrator.onAfterAction(context(world, 2));

    // `settled-in` is the author's phrase key, not a platform message id:
    // nothing under if.action.* or if.event.* could produce it.
    expect((events[0].data as { messageId: string }).messageId).toBe('settled-in');
    expect((events[0].data as { messageId: string }).messageId).not.toMatch(/^if\./);
  });

  it('a rung WITHOUT says speaks nothing, while the event still fires', () => {
    const { world, plugins } = load(WITH_SAYS);
    const narrator = plugins.find((p) => p.id === 'chord.story.promotion-narrator')!;
    const watcher = plugins.find((p) => p.id === 'sharpee.ext.scoring.rank-watcher')!;

    narrator.onAfterAction(context(world));
    watcher.onAfterAction(context(world));

    // Straight to the top rung, which names no phrase.
    world.awardScore('lamp', 150, 'Everything at once');

    expect(narrator.onAfterAction(context(world, 2))).toEqual([]);
    const risen = watcher.onAfterAction(context(world, 2));
    expect(risen).toHaveLength(1);
    expect(risen[0].data).toMatchObject({ toRank: 'master-of-the-folly' });
  });

  it('does not re-speak across save/restore', () => {
    const { world, plugins } = load(WITH_SAYS);
    const narrator = plugins.find((p) => p.id === 'chord.story.promotion-narrator')!;

    narrator.onAfterAction(context(world));
    world.awardScore('lamp', 60, 'Found the lamp');
    expect(narrator.onAfterAction(context(world, 2))).toHaveLength(1);

    const restored = load(WITH_SAYS);
    const restoredNarrator = restored.plugins.find((p) => p.id === 'chord.story.promotion-narrator')!;
    restored.world.loadJSON(world.toJSON());
    restoredNarrator.setState!(narrator.getState!());

    expect(restoredNarrator.onAfterAction(context(restored.world, 3))).toEqual([]);
  });

  it('registers the phrase as a message, so the key resolves at render time', () => {
    const { story } = load(WITH_SAYS);
    const registered = new Map<string, string>();
    story.extendLanguage({
      addMessage: (id: string, template: string) => registered.set(id, template),
    } as never);

    expect(registered.get('settled-in')).toContain('somewhere you belong');
  });
});
