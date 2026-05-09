/**
 * @file ADR-172 Phase 6 Step 6.3 — `GameEngine` sound buffer + dispatcher wiring.
 *
 * Pins the turn-cycle integration:
 *   - The per-turn sound buffer is cleared at the start of every
 *     `executeTurn()`.
 *   - Action contexts created during a turn share that buffer
 *     (threaded through `commandExecutor.execute → createActionContext`).
 *   - After the plugin tick, the dispatcher fans out buffered sounds to
 *     every `ListenerTrait` entity, producing `sound.audibility.heard`
 *     events that land in the turn's events, the eventSource, and the
 *     `result.events` array seen by callers.
 *   - Quiet turns produce no sound events.
 *   - Sounds do NOT survive turn boundaries (consecutive turns each see
 *     a fresh buffer).
 *
 * Owner context: `@sharpee/engine` — sound subsystem tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActorTrait,
  ContainerTrait,
  IdentityTrait,
  IFEntity,
  RoomTrait,
  WorldModel,
} from '@sharpee/world-model';
import type { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import type { ISemanticEvent } from '@sharpee/core';

import { GameEngine } from '../../src/game-engine';
import type { Story, StoryConfig } from '../../src/story';

// =============================================================================
// Test story: one room, player, a custom four-phase 'shout' action that
// calls `context.emitSound` in its report phase.
// =============================================================================

const SHOUT_ACTION_ID = 'test.action.shout';

const shoutAction: Action = {
  id: SHOUT_ACTION_ID,
  validate(_context: ActionContext): ValidationResult {
    return { valid: true };
  },
  execute(_context: ActionContext): void {
    // No mutations — the only side effect is a sound emission, which
    // belongs in `report` per the Phase 6 contract.
  },
  report(context: ActionContext): ISemanticEvent[] {
    context.emitSound({
      kind: 'speech',
      volumeTier: 'shouting',
      content: { messageId: 'test.shout.line' },
    });
    // Return a tiny success event so the turn isn't "blocked".
    return [
      context.event('test.event.shouted', {
        actionId: SHOUT_ACTION_ID,
        messageId: 'shouted',
      }),
    ];
  },
};

class ShoutTestStory implements Story {
  config: StoryConfig = {
    id: 'shout-test',
    title: 'Shout Test',
    author: 'test',
    version: '1.0.0',
  };

  private _player: IFEntity | null = null;
  private _room: IFEntity | null = null;

  createPlayer(world: WorldModel): IFEntity {
    const p = world.createEntity('yourself', 'actor');
    p.add(new ActorTrait());
    p.add(new ContainerTrait());
    p.add(new IdentityTrait({ name: 'yourself', article: '' }));
    this._player = p;
    return p;
  }

  initializeWorld(world: WorldModel): void {
    const r = world.createEntity('Parlor', 'room');
    r.add(new RoomTrait());
    r.add(new IdentityTrait({ name: 'Parlor', article: 'the' }));
    this._room = r;
    if (this._player) {
      world.moveEntity(this._player.id, r.id);
    }
  }

  getCustomActions(): Action[] {
    return [shoutAction];
  }

  getPlayer(): IFEntity | null {
    return this._player;
  }
  getRoom(): IFEntity | null {
    return this._room;
  }
}

// =============================================================================
// Fixture
// =============================================================================

function buildEngine() {
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });

  // Create the player up-front so the engine has it. setStory will then
  // call createPlayer again (overwriting the engine-side reference, but
  // the new player is what's used). This mirrors what `setupTestEngine`
  // does for other tests.
  const placeholder = world.createEntity('yourself', 'actor');
  world.setPlayer(placeholder.id);

  const engine = new GameEngine({ world, player: placeholder, parser, language });
  return { engine, world, parser, language };
}

// =============================================================================
// Tests
// =============================================================================

describe('GameEngine sound buffer + dispatcher wiring (ADR-172 Phase 6 Step 6.3)', () => {
  let engine: GameEngine;
  let story: ShoutTestStory;

  beforeEach(async () => {
    let parser: EnglishParser;
    ({ engine, parser } = buildEngine());
    // Register the verb directly on the parser. The Story.extendParser
    // hook is not invoked by the engine's setStory path, so we wire the
    // verb here as a test-fixture step.
    parser.addVerb(SHOUT_ACTION_ID, ['shout'], 'VERB_ONLY');
    story = new ShoutTestStory();
    engine.setStory(story);
    await engine.start();
  });

  it('emits a sound.audibility.heard event when an action calls context.emitSound', async () => {
    const result = await engine.executeTurn('shout');
    expect(result.success).toBe(true);

    const audEvents = result.events.filter((e) => e.type === 'sound.audibility.heard');
    expect(audEvents).toHaveLength(1);

    const ev = audEvents[0];
    expect(ev.entities.target).toBe(story.getPlayer()!.id);
    // Same-room emission yields 'full' audibility.
    expect((ev.data as any).audibilityTier).toBe('full');
    expect((ev.data as any).kind).toBe('speech');
    expect((ev.data as any).volumeTier).toBe('shouting');
  });

  it('produces no sound.audibility.heard event on a quiet turn', async () => {
    const result = await engine.executeTurn('look');
    const audEvents = result.events.filter((e) => e.type === 'sound.audibility.heard');
    expect(audEvents).toHaveLength(0);
  });

  it('does not carry sounds across turn boundaries', async () => {
    const r1 = await engine.executeTurn('shout');
    expect(r1.events.filter((e) => e.type === 'sound.audibility.heard')).toHaveLength(1);

    const r2 = await engine.executeTurn('look');
    // r2 must NOT include the previous turn's sound event.
    expect(r2.events.filter((e) => e.type === 'sound.audibility.heard')).toHaveLength(0);

    const r3 = await engine.executeTurn('shout');
    // Each shout turn produces exactly one event — buffer was cleared
    // at the start of r3 so r1's sound did not pile up.
    expect(r3.events.filter((e) => e.type === 'sound.audibility.heard')).toHaveLength(1);
  });

  it('routes the audibility event into the engine event source so save/restore captures it', async () => {
    // Subscribe to engine 'event' emissions before running the turn.
    const heardOnEngine: ISemanticEvent[] = [];
    engine.on('event', (e: ISemanticEvent) => {
      if (e.type === 'sound.audibility.heard') heardOnEngine.push(e);
    });

    await engine.executeTurn('shout');
    expect(heardOnEngine).toHaveLength(1);
  });
});
