/**
 * ADR-293 — post-restore action-roll determinism (REAL-PATH test).
 *
 * Behavior Statement — per-point stream persistence through the real factory
 *   DOES: `createSaveData` captures every drawn point's stream state into
 *         `IEngineState.streamStates`; `loadSaveData` restores the map into
 *         the engine's `RandomService`; `createActionContext` exposes that
 *         service as `context.random`, from which the throwing action draws
 *         its hit/fragile-break points.
 *   WHEN: a host saves mid-game through the REAL SaveRestoreService,
 *         restores the blob into a fresh engine, and replays the same
 *         command sequence.
 *   BECAUSE: ADR-293 D7/AC-4 — save → restore → continue must match an
 *            unbroken run for every point that has drawn.
 *   REJECTS WHEN: nothing new — version/story-mismatch rejections are
 *            unchanged. A 2.0.0-shaped save with NO `actionRngSeed` must
 *            NOT reject (AC-5): restore succeeds and every point reseeds
 *            from the master seed.
 *
 * Integration Reality: this drives the real engine -> parser ->
 * CommandExecutor -> throwing action -> SaveRestoreService pipeline. No
 * stub stands in for the save service or the RNG.
 */

import { describe, expect, it } from 'vitest';
import { ISaveData } from '@sharpee/core';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
} from '@sharpee/world-model';
import { Story, StoryConfig } from '../src/story';
import { setupTestEngine } from './test-helpers/setup-test-engine';

/** Type alias for accessing private GameEngine save/restore methods. */
type EnginePrivate = {
  createSaveData(): ISaveData;
  loadSaveData(data: ISaveData): void;
};

/**
 * Story fixture: the player carries six fragile items (their names hit
 * the throwing action's fragile keywords) and the room holds a stationary
 * statue. Every `throw X at statue` draws a hit roll (90%) and, on a hit,
 * a fragile-break roll (80%) from `context.random` — outcomes
 * misses_target / hits_target / breaks_against are all reachable.
 */
class ThrowRngTestStory implements Story {
  config: StoryConfig = {
    id: 'throw-rng-test',
    title: 'Throw RNG Test Story',
    author: 'Test Suite',
    version: '1.0.0',
    description: 'Fixture for ADR-231 D6 restore-determinism',
  };

  private _player: IFEntity | null = null;

  initializeWorld(world: WorldModel): void {
    const room = world.createEntity('Test Room', 'room');
    room.add(new RoomTrait({}));
    room.add(
      new IdentityTrait({
        name: 'Test Room',
        description: 'A simple room for testing.',
        article: 'the',
      }),
    );

    const items: Array<[string, string]> = [
      ['glass orb', 'orb'],
      ['glass jar', 'jar'],
      ['crystal ball', 'ball'],
      ['china plate', 'plate'],
      ['porcelain cat', 'cat'],
      ['delicate fan', 'fan'],
    ];
    for (const [name, alias] of items) {
      const item = world.createEntity(name, 'object');
      item.add(
        new IdentityTrait({
          name,
          aliases: [alias],
          description: `A very fragile ${name}.`,
          article: 'a',
        }),
      );
      // Carried by the player so the throw needs no implicit take.
      world.moveEntity(item.id, this._player!.id);
    }

    // Stationary throw target (non-actor: 90% hit, then 80% break).
    const statue = world.createEntity('stone statue', 'object');
    statue.add(
      new IdentityTrait({
        name: 'stone statue',
        aliases: ['statue'],
        description: 'A squat stone statue.',
        article: 'a',
      }),
    );
    world.moveEntity(statue.id, room.id);

    world.moveEntity(this._player!.id, room.id);
  }

  createPlayer(world: WorldModel): IFEntity {
    this._player = world.createEntity('yourself', 'actor');
    this._player.add(new ActorTrait());
    this._player.add(
      new IdentityTrait({
        name: 'yourself',
        aliases: ['self', 'me', 'myself'],
        description: 'As good-looking as ever.',
        properName: true,
        article: '',
      }),
    );
    this._player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return this._player;
  }
}

/** Boot a fresh engine + ThrowRngTestStory (not started). */
function bootFresh() {
  const setup = setupTestEngine();
  const story = new ThrowRngTestStory();
  setup.engine.setStory(story);
  return { ...setup, story };
}

/** Roll outcome observable from a turn's `if.event.thrown` event. */
interface ThrowOutcome {
  messageId: unknown;
  willBreak: unknown;
}

/** Execute one throw command and extract its roll outcome. */
async function throwAndObserve(
  engine: ReturnType<typeof bootFresh>['engine'],
  command: string,
): Promise<ThrowOutcome> {
  const result = await engine.executeTurn(command);
  const thrown = result.events.find((e) => e.type === 'if.event.thrown');
  expect(
    thrown,
    `no if.event.thrown for "${command}" — events: ${result.events
      .map((e) => `${e.type}:${JSON.stringify(e.data).slice(0, 120)}`)
      .join(' | ')}`,
  ).toBeDefined();
  const data = thrown!.data as Record<string, unknown>;
  return { messageId: data.messageId, willBreak: data.willBreak };
}

/** The post-save replay sequence, identical across both runs. */
const REPLAY_COMMANDS = [
  'throw ball at statue',
  'throw plate at statue',
  'throw cat at statue',
  'throw fan at statue',
];

describe('ADR-231 D6 — dedicated persisted action RNG stream', () => {
  it('replays identical action rolls after a real save/restore (determinism with an unbroken run)', async () => {
    // Unbroken run: advance the stream, save mid-game, keep playing.
    const source = bootFresh();
    source.engine.start();
    await throwAndObserve(source.engine, 'throw orb at statue');
    await throwAndObserve(source.engine, 'throw jar at statue');

    const saved = (source.engine as unknown as EnginePrivate).createSaveData();
    // The throwing draws landed on declared points and ride the unified map.
    expect(Object.keys(saved.engineState.streamStates ?? {})).toEqual(
      expect.arrayContaining(['stdlib.throwing.hit-stationary', 'stdlib.throwing.breaks']),
    );

    const unbrokenOutcomes: ThrowOutcome[] = [];
    for (const command of REPLAY_COMMANDS) {
      unbrokenOutcomes.push(await throwAndObserve(source.engine, command));
    }
    const unbrokenEndStates = source.engine.getRandomService().serializeStreamStates();
    source.engine.stop();

    // Restored run: fresh engine, real restore, same commands.
    const target = bootFresh();
    (target.engine as unknown as EnginePrivate).loadSaveData(saved);

    // The restored map must be exactly what the save captured.
    expect(target.engine.getRandomService().serializeStreamStates()).toEqual(
      saved.engineState.streamStates,
    );

    target.engine.start();
    const restoredOutcomes: ThrowOutcome[] = [];
    for (const command of REPLAY_COMMANDS) {
      restoredOutcomes.push(await throwAndObserve(target.engine, command));
    }

    // Roll outcomes identical to the unbroken run...
    expect(restoredOutcomes).toEqual(unbrokenOutcomes);
    // ...and the per-point stream states themselves converge (exact-state
    // assertion — immune to coincidental outcome collisions).
    expect(target.engine.getRandomService().serializeStreamStates()).toEqual(
      unbrokenEndStates,
    );

    target.engine.stop();
  });

  it('restores a 2.0.0 save with no actionRngSeed (AC-5) without crashing, reseeding by derivation', async () => {
    const source = bootFresh();
    source.engine.start();
    await source.engine.executeTurn('look');
    const saved = (source.engine as unknown as EnginePrivate).createSaveData();
    source.engine.stop();

    // Simulate the oldest readable save: 2.0.0 shape with no RNG state at all.
    saved.version = '2.0.0';
    delete saved.engineState.streamStates;
    delete saved.engineState.actionRngSeed;

    const target = bootFresh();
    expect(() =>
      (target.engine as unknown as EnginePrivate).loadSaveData(saved),
    ).not.toThrow();

    // Engine still plays — and the action stream still works.
    target.engine.start();
    const outcome = await throwAndObserve(target.engine, 'throw orb at statue');
    expect(typeof outcome.willBreak).toBe('boolean');
    target.engine.stop();
  });
});
