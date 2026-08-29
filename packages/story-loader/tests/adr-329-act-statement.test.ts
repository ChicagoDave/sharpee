/**
 * adr-329-act-statement.test.ts — ADR-329 Acceptance item 2, REAL-PATH: a
 * Chord acting statement (`the guards take the sword`) performs the real
 * stdlib action as that character through `GameEngine.executeAsActor`,
 * inside a real turn of a real engine over the loader's world. Assertions
 * are on world state (where the sword is), on which heads fired (occurrence
 * keys), on the turn's event stream (order, actor, presence tag), and on the
 * named diagnostics. No doubles anywhere: the engine's own `executeTurn`,
 * the engine's own plugins, the stdlib actions, the loader's world.
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { createSemanticEventSource } from '@sharpee/core';
import { GameEngine, SaveRestoreService, type ISaveRestoreStateProvider, type Story } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { IFActions, PerceptionService } from '@sharpee/stdlib';
import { EntityType, WorldModel, type IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { CHORD_OCCURRENCE_PREFIX } from '../src/state-keys';
import { compileSource } from './helpers/boot-engine';

interface Slots { yard?: string; guards?: string; sword?: string; player?: string; top?: string; swordPlace?: string; playerStart?: string }

const SOURCE = (s: Slots = {}) => `story
  title: Acting
  authors:
    T
  id: acting
  story-version: 0.0.1

define phrase they-take
  They take it.
end phrase

define phrase not-theirs
  Not theirs.
end phrase

define timer waiting for Alex
  pausing
end timer

create the Cellar
  a room
  east to the Yard

  A cellar.

create the Yard
  a room
  west to the Cellar
${s.yard ?? ''}
  A yard.

create the guards
  a person, plural
  in the Yard
${s.guards ?? ''}
  Guards.

create the sword
${s.swordPlace ?? '  in the Yard\n'}${s.sword ?? ''}
  A sword.

create Teisha
  a person
  in the Yard

  Teisha.

create Alex
  a person
  playable
  starts in ${s.playerStart ?? 'the Cellar'}
${s.player ?? ''}
  You.

${s.top ?? ''}
before the game starts
  change the player to Alex
end before

`;

interface Booted {
  engine: GameEngine;
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  /** Every event the engine emitted, action and plugin alike, in stream order. */
  stream: ISemanticEvent[];
  id: (irId: string) => string;
  at: (irId: string) => string | undefined;
}

/** The boot-engine helper's shape, plus an in-order capture of the turn stream. */
async function boot(source: string, seed = 11): Promise<Booted> {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const stream: ISemanticEvent[] = [];
  const placeholder = world.createEntity('placeholder', EntityType.ACTOR);
  world.setPlayer(placeholder.id);
  // A real PerceptionService: it is what tags presence (ADR-328 D3) on every event.
  const engine = new GameEngine({ world, player: placeholder, parser, language, perceptionService: new PerceptionService(), config: { seed, onEvent: (e) => stream.push(e) } });
  engine.setStory(story);
  world.removeEntity(placeholder.id);
  await engine.start();
  const id = (irId: string) => story.entityId(irId)!;
  return { engine, story, world, player: world.getPlayer()!, stream, id, at: (irId) => world.getLocation(id(irId)) };
}

/** An entity-owned clause's firing count — the lifecycle path's key shape (`on.<entity>.<action>.<kind>.<index>`). */
const occurrence = (b: Booted, key: string) => b.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}on.${key}`);
const takenBy = (b: Booted, actorIrId: string) =>
  b.stream.filter((e) => e.type === 'if.event.taken' && e.entities.actor === b.id(actorIrId));
/** The reason an executor-caught error reports — on the stream (a nested act) or on the turn's own result (the outer action). */
const failure = (b: Booted, result?: { events: ISemanticEvent[] }) =>
  ([...b.stream, ...(result?.events ?? [])].find((e) => e.type === 'command.failed')?.data as { reason?: string } | undefined)?.reason ?? '';

const GUARDS_TAKE_ON_ENTER = { yard: '  after the player entering\n    the guards take the sword\n  end after\n' };

describe('the guards take the sword — ADR-329 Acceptance item 2, through a real turn', () => {
  it('moves the sword into the guards, fires `after the guards taking` (not the player\'s head), and narrates after the entering report', async () => {
    const b = await boot(SOURCE({ ...GUARDS_TAKE_ON_ENTER, sword: '  after the guards taking\n    phrase they-take\n  end after\n  after the player taking\n    phrase they-take\n  end after\n' }));
    expect(b.at('sword')).toBe(b.id('yard'));

    const result = await b.engine.executeTurn('east');
    expect(result.success).toBe(true);

    // World state: the guards hold the sword.
    expect(b.at('sword')).toBe(b.id('guards'));
    // Heads: the guards' `after` fired once; the player's never did.
    expect(occurrence(b, 'sword.taking.after.0')).toBe(1);
    expect(occurrence(b, 'sword.taking.after.1')).toBeUndefined();

    // Stream: the take carries the guards as actor, is witnessed (Alex is in
    // the Yard), and comes AFTER the player's own movement report.
    const taken = takenBy(b, 'guards');
    expect(taken).toHaveLength(1);
    expect(taken[0].presence).toBe('present');
    const playerMove = b.stream.findIndex((e) => e.type === 'if.event.actor_moved' && e.entities.actor === b.player.id);
    expect(playerMove).toBeGreaterThanOrEqual(0);
    expect(b.stream.indexOf(taken[0])).toBeGreaterThan(playerMove);
  });

  it('a refusal on the guards\' take leaves the sword in the Yard, fires no `after`, and narrates the refusal (D5)', async () => {
    const b = await boot(SOURCE({ ...GUARDS_TAKE_ON_ENTER, sword: '  on the guards taking\n    refuse not-theirs\n  end on\n  after the guards taking\n    phrase they-take\n  end after\n' }));
    const result = await b.engine.executeTurn('east');
    expect(result.success).toBe(true);
    expect(b.at('sword')).toBe(b.id('yard'));
    expect(occurrence(b, 'sword.taking.after.1')).toBeUndefined();
    expect(takenBy(b, 'guards')).toHaveLength(0);
    const blocked = b.stream.find((e) => e.type === 'if.event.take_blocked' && e.entities.actor === b.id('guards'));
    expect(blocked, 'the refused act narrates as any witnessed refusal would').toBeDefined();
  });

  it('an every-turn act with the player in another room still moves the sword, tagged absent', async () => {
    const b = await boot(SOURCE({ guards: '  on every turn\n    the guards take the sword\n  end on\n' }));
    expect(b.world.getLocation(b.player.id)).toBe(b.id('cellar'));
    const result = await b.engine.executeTurn('wait');
    expect(result.success).toBe(true);
    expect(b.at('sword')).toBe(b.id('guards'));
    const taken = takenBy(b, 'guards');
    expect(taken).toHaveLength(1);
    expect(taken[0].presence).toBe('absent');
  });

  it('a timer-fired act runs in the turn phase', async () => {
    const b = await boot(SOURCE({
      yard: '  after the player entering\n    start Alex\'s waiting\n  end after\n',
      player: '  when waiting expires\n    the guards take the sword\n  end when\n',
    }));
    await b.engine.executeTurn('east');
    let turns = 0;
    while (b.at('sword') !== b.id('guards') && turns < 5) {
      await b.engine.executeTurn('wait');
      turns++;
    }
    expect(b.at('sword')).toBe(b.id('guards'));
    expect(turns).toBeGreaterThan(0); // the expiry, not the entering turn
    expect(takenBy(b, 'guards')).toHaveLength(1);
  });

  it('a conversation-row act: Teisha gives the sword to the player when asked', async () => {
    const b = await boot(SOURCE({
      swordPlace: '',
      playerStart: 'the Yard',
      top: 'define topics for Teisha\n  about "the sword":\n    Teisha gives the sword to the player\nend topics\n\n',
    }).replace('create Teisha\n  a person\n  in the Yard\n', 'create Teisha\n  a person\n  in the Yard\n  carries the sword\n'));
    expect(b.at('sword')).toBe(b.id('teisha'));
    const result = await b.engine.executeTurn('ask Teisha about the sword');
    expect(result.success).toBe(true);
    expect(b.at('sword')).toBe(b.player.id);
  });

  it('re-entry stops at the cap with `runtime.act-reentry` and performs no ninth act', async () => {
    const b = await boot(SOURCE({
      ...GUARDS_TAKE_ON_ENTER,
      sword: '  after the guards taking\n    the guards drop the sword\n  end after\n  after the guards dropping\n    the guards take the sword\n  end after\n',
    }));
    let thrown = '';
    let result: { events: ISemanticEvent[] } | undefined;
    try {
      result = await b.engine.executeTurn('east');
    } catch (e) {
      thrown = (e as Error).message;
    }
    expect(`${thrown} ${failure(b, result)}`).toMatch(/runtime\.act-reentry/);
    // Eight acts ran (the cap), alternating take/drop from the first take.
    const acts = b.stream.filter((e) => (e.type === 'if.event.taken' || e.type === 'if.event.dropped') && e.entities.actor === b.id('guards'));
    expect(acts.length).toBeLessThanOrEqual(8);
  });

  it('the character holding the player role cannot be made to act at run time (D1, Q-3)', async () => {
    const b = await boot(SOURCE({ yard: '  after the player entering\n    Alex takes the sword\n  end after\n' }));
    let thrown = '';
    let result: { events: ISemanticEvent[] } | undefined;
    try {
      result = await b.engine.executeTurn('east');
    } catch (e) {
      thrown = (e as Error).message;
    }
    expect(`${thrown} ${failure(b, result)}`).toMatch(/runtime\.act-player-actor/);
    expect(b.at('sword')).toBe(b.id('yard'));
  });

  it('a save taken after the act restores the sword where the guards left it and the story continues', async () => {
    const b1 = await boot(SOURCE(GUARDS_TAKE_ON_ENTER));
    await b1.engine.executeTurn('east');
    expect(b1.at('sword')).toBe(b1.id('guards'));

    const provider = (b: Booted): ISaveRestoreStateProvider => ({
      getWorld: () => b.world,
      getContext: () => b.engine.getContext(),
      getStory: () => b.story as unknown as Story,
      getEventSource: () => createSemanticEventSource(),
      getPluginRegistry: () => b.engine.getPluginRegistry(),
      getParser: () => undefined,
    });
    const service = new SaveRestoreService();
    const saveData = service.createSaveData(provider(b1));

    const b2 = await boot(SOURCE(GUARDS_TAKE_ON_ENTER));
    service.loadSaveData(saveData, provider(b2));
    expect(b2.at('sword')).toBe(b2.id('guards'));
    const after = await b2.engine.executeTurn('west');
    expect(after.success).toBe(true);
    expect(b2.world.getLocation(b2.player.id)).toBe(b2.id('cellar'));
  });

  it('`GameEngine.executeAsActor` is the public entry the statement rides: called directly it runs the same take', async () => {
    const b = await boot(SOURCE());
    const guards = b.world.getEntity(b.id('guards'))!;
    const sword = b.world.getEntity(b.id('sword'))!;
    const result = b.engine.executeAsActor(guards.id, IFActions.TAKING, { directObject: sword });
    expect(result.success).toBe(true);
    expect(b.at('sword')).toBe(guards.id);
    expect(result.events.some((e) => e.type === 'if.event.taken' && e.entities.actor === guards.id)).toBe(true);
  });
});
