/**
 * @file ADR-172 Phase 6 Step 6.1 — `ActionContext.emitSound`.
 *
 * Pins the contract for the authoring API actions use to register a
 * sound emission during their report phase. The factory-side closure
 * fills `sourceEntity` (from the actor) and `sourceLocation` (from the
 * actor's current room) automatically; the partial argument supplies
 * only the semantic payload (kind, volumeTier, optional content).
 *
 * Owner context: `@sharpee/engine` — sound subsystem tests.
 *
 * Behavior pinned:
 *   - DOES: appends an `ISound` to the wired sound buffer with
 *     auto-filled `sourceEntity` (player.id) and `sourceLocation`
 *     (currentLocation.id).
 *   - REJECTS WHEN no buffer is wired: silently drops the emission
 *     (no throw, buffer ref stays as the caller passed it).
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
import {
  Action,
  ValidatedCommand,
  createScopeResolver,
} from '@sharpee/stdlib';
import { ISound } from '@sharpee/if-domain';

import { createActionContext } from '../../src/action-context-factory';
import { GameContext } from '../../src/types';

// =============================================================================
// Test fixture: a self-contained world + a fake action + a fake command.
// We do NOT boot a full GameEngine — Step 6.1 is the factory closure only.
// Engine wiring (turn-cycle integration) lands in Step 6.3.
// =============================================================================

function buildFixture() {
  const world = new WorldModel();

  const player = world.createEntity('yourself', 'actor');
  player.add(new ActorTrait());
  player.add(new ContainerTrait());
  player.add(new IdentityTrait({ name: 'yourself', article: '' }));

  const room = world.createEntity('Parlor', 'room');
  room.add(new RoomTrait());
  world.moveEntity(player.id, room.id);
  world.setPlayer(player.id);

  const fakeAction: Action = {
    id: 'test.action.fake',
    requiredMessages: [],
    descriptionMessageId: 'test.action.fake.description',
    examplesMessageId: 'test.action.fake.examples',
    group: 'test',
    validate: () => ({ valid: true }),
    execute: () => {},
    report: () => [],
  };

  const fakeCommand: ValidatedCommand = {
    parsed: {
      rawInput: 'fake',
      action: fakeAction.id,
      tokens: [],
      structure: { verb: { tokens: [0], text: 'fake', head: 'fake' } },
      pattern: 'VERB_ONLY',
      confidence: 1.0,
    },
    actionId: fakeAction.id,
  };

  const now = new Date();
  const gameContext: GameContext = {
    currentTurn: 1,
    player,
    history: [],
    metadata: {
      title: 'Emit Sound Test',
      author: 'test',
      version: '0.0.0',
      started: now,
      lastPlayed: now,
    },
  };

  const scopeResolver = createScopeResolver(world);

  return { world, player, room, fakeAction, fakeCommand, gameContext, scopeResolver };
}

describe('ActionContext.emitSound (ADR-172 Phase 6 Step 6.1)', () => {
  let buffer: ISound[];

  beforeEach(() => {
    buffer = [];
  });

  it('appends a single sound with auto-filled sourceEntity and sourceLocation', () => {
    const { world, player, room, fakeAction, fakeCommand, gameContext, scopeResolver } = buildFixture();

    const ctx = createActionContext(
      world,
      gameContext,
      fakeCommand,
      fakeAction,
      scopeResolver,
      buffer,
    );

    ctx.emitSound({ kind: 'speech', volumeTier: 'normal' });

    expect(buffer).toHaveLength(1);
    expect(buffer[0].sourceEntity).toBe(player.id);
    expect(buffer[0].sourceLocation).toBe(room.id);
    expect(buffer[0].kind).toBe('speech');
    expect(buffer[0].volumeTier).toBe('normal');
  });

  it('preserves optional content payload on the buffered sound', () => {
    const { world, fakeAction, fakeCommand, gameContext, scopeResolver } = buildFixture();

    const ctx = createActionContext(
      world,
      gameContext,
      fakeCommand,
      fakeAction,
      scopeResolver,
      buffer,
    );

    ctx.emitSound({
      kind: 'speech',
      volumeTier: 'raised',
      content: { messageId: 'herve.greeting', params: { who: 'detective' } },
    });

    expect(buffer).toHaveLength(1);
    expect(buffer[0].content).toEqual({
      messageId: 'herve.greeting',
      params: { who: 'detective' },
    });
  });

  it('appends multiple sounds in call order when invoked repeatedly', () => {
    const { world, fakeAction, fakeCommand, gameContext, scopeResolver } = buildFixture();

    const ctx = createActionContext(
      world,
      gameContext,
      fakeCommand,
      fakeAction,
      scopeResolver,
      buffer,
    );

    ctx.emitSound({ kind: 'speech', volumeTier: 'whisper' });
    ctx.emitSound({ kind: 'glass-break', volumeTier: 'shouting' });
    ctx.emitSound({ kind: 'footsteps', volumeTier: 'subdued' });

    expect(buffer).toHaveLength(3);
    expect(buffer.map((s) => s.kind)).toEqual(['speech', 'glass-break', 'footsteps']);
    expect(buffer.map((s) => s.volumeTier)).toEqual(['whisper', 'shouting', 'subdued']);
  });

  it('is a silent no-op when the factory was given no sound buffer', () => {
    const { world, fakeAction, fakeCommand, gameContext, scopeResolver } = buildFixture();

    // No sixth argument — production path for legacy callers (and the
    // recursive implicit-take chain when the parent had no buffer).
    const ctx = createActionContext(
      world,
      gameContext,
      fakeCommand,
      fakeAction,
      scopeResolver,
    );

    expect(() => ctx.emitSound({ kind: 'speech', volumeTier: 'normal' })).not.toThrow();
    // The caller-side buffer is untouched (nothing to push into).
    expect(buffer).toHaveLength(0);
  });

  it('falls back to the player id for sourceLocation when the actor has no room', () => {
    // Construct a world where the player has been removed from any room.
    // This is an edge case (unlocated actor) and the ADR specifies
    // "detached entities cannot emit propagating sound, emission dropped
    // silently." Step 6.1's factory still buffers an entry; the
    // dispatcher's `propagate()` (Step 6.3) is what returns null and
    // suppresses delivery. The factory's contract here is just safe
    // auto-fill — never throw.
    const { world, player, fakeAction, fakeCommand, gameContext, scopeResolver } = buildFixture();
    // Unlocate the player (no longer in any room).
    world.moveEntity(player.id, null);

    const ctx = createActionContext(
      world,
      gameContext,
      fakeCommand,
      fakeAction,
      scopeResolver,
      buffer,
    );

    expect(() => ctx.emitSound({ kind: 'speech', volumeTier: 'normal' })).not.toThrow();
    expect(buffer).toHaveLength(1);
    // Auto-fill never produces undefined — the closure falls back to player.id.
    expect(buffer[0].sourceLocation).toBe(player.id);
    expect(buffer[0].sourceEntity).toBe(player.id);
  });
});
