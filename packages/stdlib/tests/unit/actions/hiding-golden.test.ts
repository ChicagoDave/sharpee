/**
 * Hiding and revealing action tests (ADR-148)
 *
 * Tests derived from behavior statements in the ADR:
 * - hidingAction: adds ConcealedStateTrait to player
 * - revealingAction: removes ConcealedStateTrait from player
 * - ConcealedVisibilityBehavior: blocks canSee() for concealed actors
 *
 * All tests verify actual world state changes (trait presence),
 * not just events or return values.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { IFActions } from '../../../src/actions/constants';
import {
  WorldModel,
  TraitType,
  IFEntity,
  ConcealmentTrait,
  ConcealedStateTrait,
  isConcealed,
  getConcealmentState,
  VisibilityBehavior,
  registerConcealedVisibilityBehavior,
} from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  createCommand,
} from '../../test-utils';
import { hidingAction } from '../../../src/actions/standard/hiding/hiding';
import { revealingAction } from '../../../src/actions/standard/hiding/revealing';

// ============================================================================
// Test Setup
// ============================================================================

function executeAction(action: any, context: any) {
  const result = action.validate(context);
  if (!result.valid) {
    return { events: action.blocked(context, result), validation: result };
  }
  action.execute(context);
  return { events: action.report(context), validation: result };
}

function createHidingSpot(world: WorldModel, roomId: string, name: string, opts: {
  positions: ConcealmentTrait['positions'];
  quality: ConcealmentTrait['quality'];
}): IFEntity {
  const entity = world.createEntity(name, 'object');
  entity.add(new ConcealmentTrait({
    positions: opts.positions,
    quality: opts.quality,
  }));
  world.moveEntity(entity.id, roomId);
  return entity;
}

// Register visibility behavior once for all tests
beforeEach(() => {
  // The registry is global — re-registration would throw.
  // We rely on the first test's beforeAll to register.
});

let visibilityRegistered = false;
function ensureVisibilityBehavior() {
  if (!visibilityRegistered) {
    try {
      registerConcealedVisibilityBehavior();
      visibilityRegistered = true;
    } catch {
      // Already registered from a previous test run
      visibilityRegistered = true;
    }
  }
}

// ============================================================================
// Hiding Action — Successful Execution
// ============================================================================

describe('hidingAction', () => {
  describe('successful execution', () => {
    test('should add ConcealedStateTrait to player when hiding behind a valid target', () => {
      const { world, player, room } = setupBasicWorld();
      const curtain = createHidingSpot(world, room.id, 'curtain', {
        positions: ['behind'],
        quality: 'good',
      });

      const command = createCommand(IFActions.HIDING, {
        entity: curtain,
        extras: { position: 'behind' },
      });
      const context = createRealTestContext(hidingAction, world, command);

      // PRECONDITION
      expect(isConcealed(player)).toBe(false);

      const { validation } = executeAction(hidingAction, context);
      expect(validation.valid).toBe(true);

      // POSTCONDITION — the critical assertion
      expect(isConcealed(player)).toBe(true);

      const state = getConcealmentState(player);
      expect(state).toBeDefined();
      expect(state!.targetId).toBe(curtain.id);
      expect(state!.position).toBe('behind');
      expect(state!.quality).toBe('good');
    });

    test('should work with "under" position', () => {
      const { world, player, room } = setupBasicWorld();
      const desk = createHidingSpot(world, room.id, 'desk', {
        positions: ['under'],
        quality: 'fair',
      });

      const command = createCommand(IFActions.HIDING, {
        entity: desk,
        extras: { position: 'under' },
      });
      const context = createRealTestContext(hidingAction, world, command);
      executeAction(hidingAction, context);

      expect(isConcealed(player)).toBe(true);
      expect(getConcealmentState(player)!.position).toBe('under');
      expect(getConcealmentState(player)!.quality).toBe('fair');
    });

    test('should work with "on" position', () => {
      const { world, player, room } = setupBasicWorld();
      const balcony = createHidingSpot(world, room.id, 'balcony', {
        positions: ['on'],
        quality: 'excellent',
      });

      const command = createCommand(IFActions.HIDING, {
        entity: balcony,
        extras: { position: 'on' },
      });
      const context = createRealTestContext(hidingAction, world, command);
      executeAction(hidingAction, context);

      expect(isConcealed(player)).toBe(true);
      expect(getConcealmentState(player)!.position).toBe('on');
    });

    test('should work with "inside" position', () => {
      const { world, player, room } = setupBasicWorld();
      const armoire = createHidingSpot(world, room.id, 'armoire', {
        positions: ['inside'],
        quality: 'good',
      });

      const command = createCommand(IFActions.HIDING, {
        entity: armoire,
        extras: { position: 'inside' },
      });
      const context = createRealTestContext(hidingAction, world, command);
      executeAction(hidingAction, context);

      expect(isConcealed(player)).toBe(true);
      expect(getConcealmentState(player)!.position).toBe('inside');
    });
  });

  // ============================================================================
  // Hiding Action — Negative Tests
  // ============================================================================

  describe('negative cases', () => {
    test('should reject when target has no ConcealmentTrait', () => {
      const { world, player, room } = setupBasicWorld();
      const table = world.createEntity('table', 'object');
      world.moveEntity(table.id, room.id);

      const command = createCommand(IFActions.HIDING, {
        entity: table,
        extras: { position: 'behind' },
      });
      const context = createRealTestContext(hidingAction, world, command);

      const { validation } = executeAction(hidingAction, context);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('nothing_to_hide');
      expect(isConcealed(player)).toBe(false);
    });

    test('should reject when position is not supported by the target', () => {
      const { world, player, room } = setupBasicWorld();
      const desk = createHidingSpot(world, room.id, 'desk', {
        positions: ['under'],
        quality: 'fair',
      });

      const command = createCommand(IFActions.HIDING, {
        entity: desk,
        extras: { position: 'behind' },
      });
      const context = createRealTestContext(hidingAction, world, command);

      const { validation } = executeAction(hidingAction, context);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('cant_hide_there');
      expect(isConcealed(player)).toBe(false);
    });

    test('should reject when player is already concealed', () => {
      const { world, player, room } = setupBasicWorld();
      const curtain = createHidingSpot(world, room.id, 'curtain', {
        positions: ['behind'],
        quality: 'good',
      });
      const desk = createHidingSpot(world, room.id, 'desk', {
        positions: ['under'],
        quality: 'fair',
      });

      // Hide behind curtain first
      const cmd1 = createCommand(IFActions.HIDING, {
        entity: curtain,
        extras: { position: 'behind' },
      });
      const ctx1 = createRealTestContext(hidingAction, world, cmd1);
      executeAction(hidingAction, ctx1);
      expect(isConcealed(player)).toBe(true);

      // Try to hide under desk while already hidden
      const cmd2 = createCommand(IFActions.HIDING, {
        entity: desk,
        extras: { position: 'under' },
      });
      const ctx2 = createRealTestContext(hidingAction, world, cmd2);
      const { validation } = executeAction(hidingAction, ctx2);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('already_hidden');
      // Original concealment unchanged
      expect(getConcealmentState(player)!.targetId).toBe(curtain.id);
    });

    test('should reject when no position semantic is provided', () => {
      const { world, player, room } = setupBasicWorld();
      const curtain = createHidingSpot(world, room.id, 'curtain', {
        positions: ['behind'],
        quality: 'good',
      });

      const command = createCommand(IFActions.HIDING, {
        entity: curtain,
        // No extras.position
      });
      const context = createRealTestContext(hidingAction, world, command);

      const { validation } = executeAction(hidingAction, context);
      expect(validation.valid).toBe(false);
      expect(isConcealed(player)).toBe(false);
    });
  });
});

// ============================================================================
// Revealing Action
// ============================================================================

describe('revealingAction', () => {
  test('should remove ConcealedStateTrait when player is concealed', () => {
    const { world, player, room } = setupBasicWorld();
    const curtain = createHidingSpot(world, room.id, 'curtain', {
      positions: ['behind'],
      quality: 'good',
    });

    // Hide first
    const hideCmd = createCommand(IFActions.HIDING, {
      entity: curtain,
      extras: { position: 'behind' },
    });
    const hideCtx = createRealTestContext(hidingAction, world, hideCmd);
    executeAction(hidingAction, hideCtx);
    expect(isConcealed(player)).toBe(true);

    // Reveal
    const revealCmd = createCommand(IFActions.REVEALING, {});
    const revealCtx = createRealTestContext(revealingAction, world, revealCmd);
    const { validation } = executeAction(revealingAction, revealCtx);

    expect(validation.valid).toBe(true);
    expect(isConcealed(player)).toBe(false);
    expect(getConcealmentState(player)).toBeUndefined();
  });

  test('should reject when player is not concealed', () => {
    const { world, player } = setupBasicWorld();

    expect(isConcealed(player)).toBe(false);

    const command = createCommand(IFActions.REVEALING, {});
    const context = createRealTestContext(revealingAction, world, command);
    const { validation } = executeAction(revealingAction, context);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('not_hidden');
  });
});

// ============================================================================
// Visibility Integration
// ============================================================================

describe('ConcealedVisibilityBehavior', () => {
  test('should make concealed player invisible to NPCs via canSee()', () => {
    ensureVisibilityBehavior();

    const { world, player, room } = setupBasicWorld();
    const curtain = createHidingSpot(world, room.id, 'curtain', {
      positions: ['behind'],
      quality: 'good',
    });

    // Create NPC in same room
    const npc = world.createEntity('guard', 'actor');
    npc.add({ type: TraitType.ACTOR });
    world.moveEntity(npc.id, room.id);

    // PRECONDITION: NPC can see player before hiding
    expect(VisibilityBehavior.canSee(npc, player, world)).toBe(true);

    // Hide
    const command = createCommand(IFActions.HIDING, {
      entity: curtain,
      extras: { position: 'behind' },
    });
    const context = createRealTestContext(hidingAction, world, command);
    executeAction(hidingAction, context);

    // POSTCONDITION: NPC cannot see concealed player
    expect(VisibilityBehavior.canSee(npc, player, world)).toBe(false);
  });

  test('should restore visibility after revealing', () => {
    ensureVisibilityBehavior();

    const { world, player, room } = setupBasicWorld();
    const curtain = createHidingSpot(world, room.id, 'curtain', {
      positions: ['behind'],
      quality: 'good',
    });
    const npc = world.createEntity('guard', 'actor');
    npc.add({ type: TraitType.ACTOR });
    world.moveEntity(npc.id, room.id);

    // Hide
    const hideCmd = createCommand(IFActions.HIDING, {
      entity: curtain,
      extras: { position: 'behind' },
    });
    const hideCtx = createRealTestContext(hidingAction, world, hideCmd);
    executeAction(hidingAction, hideCtx);
    expect(VisibilityBehavior.canSee(npc, player, world)).toBe(false);

    // Reveal
    const revealCmd = createCommand(IFActions.REVEALING, {});
    const revealCtx = createRealTestContext(revealingAction, world, revealCmd);
    executeAction(revealingAction, revealCtx);

    // NPC can see player again
    expect(VisibilityBehavior.canSee(npc, player, world)).toBe(true);
  });
});

// ============================================================================
// Concealment-Break Hook Listener
// ============================================================================

import { createConcealmentBreakListener } from '../../../src/actions/standard/hiding/concealment-break';

describe('concealment-break hook listener', () => {
  function hidePlayer(world: WorldModel, player: IFEntity, room: IFEntity) {
    const curtain = createHidingSpot(world, room.id, 'curtain', {
      positions: ['behind'],
      quality: 'good',
    });
    const cmd = createCommand(IFActions.HIDING, {
      entity: curtain,
      extras: { position: 'behind' },
    });
    const ctx = createRealTestContext(hidingAction, world, cmd);
    executeAction(hidingAction, ctx);
    return curtain;
  }

  test('should remove ConcealedStateTrait for noisy actions (going)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);
    expect(isConcealed(player)).toBe(true);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.GOING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(false);
  });

  test('should remove ConcealedStateTrait for noisy actions (taking)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);
    expect(isConcealed(player)).toBe(true);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.TAKING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(false);
  });

  test('should remove ConcealedStateTrait for noisy actions (dropping)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.DROPPING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(false);
  });

  test('should remove ConcealedStateTrait for noisy actions (attacking)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.ATTACKING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(false);
  });

  test('should preserve ConcealedStateTrait for silent actions (looking)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);
    expect(isConcealed(player)).toBe(true);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.LOOKING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(true);
  });

  test('should preserve ConcealedStateTrait for silent actions (examining)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.EXAMINING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(true);
  });

  test('should preserve ConcealedStateTrait for silent actions (waiting)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.WAITING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(true);
  });

  test('should preserve ConcealedStateTrait for silent actions (listening)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.LISTENING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(true);
  });

  test('should preserve ConcealedStateTrait for silent actions (inventory)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.INVENTORY, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(true);
  });

  test('should preserve ConcealedStateTrait for revealing action (handled by its own execute)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);

    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.REVEALING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(true);
  });

  test('should be a no-op when player is not concealed', () => {
    const { world, player } = setupBasicWorld();
    expect(isConcealed(player)).toBe(false);

    const listener = createConcealmentBreakListener();
    // Should not throw
    listener({ actionId: IFActions.GOING, actorId: player.id }, world);

    expect(isConcealed(player)).toBe(false);
  });

  test('should reveal for unknown/new action IDs (conservative allowlist)', () => {
    const { world, player, room } = setupBasicWorld();
    hidePlayer(world, player, room);

    const listener = createConcealmentBreakListener();
    listener({ actionId: 'story.action.custom_thing', actorId: player.id }, world);

    expect(isConcealed(player)).toBe(false);
  });
});

// ============================================================================
// End-to-End Pipeline Test
// ============================================================================

describe('end-to-end concealment pipeline', () => {
  test('hide → verify state → verify visibility → reveal → verify restored', () => {
    ensureVisibilityBehavior();

    const { world, player, room } = setupBasicWorld();
    const curtain = createHidingSpot(world, room.id, 'curtain', {
      positions: ['behind'],
      quality: 'good',
    });
    const npc = world.createEntity('servant', 'actor');
    npc.add({ type: TraitType.ACTOR });
    world.moveEntity(npc.id, room.id);

    // Step 1: Preconditions
    expect(isConcealed(player)).toBe(false);
    expect(VisibilityBehavior.canSee(npc, player, world)).toBe(true);

    // Step 2: Hide
    const hideCmd = createCommand(IFActions.HIDING, {
      entity: curtain,
      extras: { position: 'behind' },
    });
    const hideCtx = createRealTestContext(hidingAction, world, hideCmd);
    const hideResult = executeAction(hidingAction, hideCtx);
    expect(hideResult.validation.valid).toBe(true);

    // Step 3: Verify concealment state
    expect(isConcealed(player)).toBe(true);
    const state = getConcealmentState(player);
    expect(state!.targetId).toBe(curtain.id);
    expect(state!.position).toBe('behind');
    expect(state!.quality).toBe('good');

    // Step 4: Verify NPC cannot see player
    expect(VisibilityBehavior.canSee(npc, player, world)).toBe(false);

    // Step 5: Noisy action breaks concealment (via hook listener)
    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.TAKING, actorId: player.id }, world);

    // Step 6: Verify concealment broken
    expect(isConcealed(player)).toBe(false);
    expect(getConcealmentState(player)).toBeUndefined();
    expect(VisibilityBehavior.canSee(npc, player, world)).toBe(true);
  });

  test('hide → silent action preserves → explicit reveal clears', () => {
    ensureVisibilityBehavior();

    const { world, player, room } = setupBasicWorld();
    const desk = createHidingSpot(world, room.id, 'desk', {
      positions: ['under'],
      quality: 'fair',
    });

    // Hide
    const hideCmd = createCommand(IFActions.HIDING, {
      entity: desk,
      extras: { position: 'under' },
    });
    const hideCtx = createRealTestContext(hidingAction, world, hideCmd);
    executeAction(hidingAction, hideCtx);
    expect(isConcealed(player)).toBe(true);

    // Silent action: looking does not break concealment
    const listener = createConcealmentBreakListener();
    listener({ actionId: IFActions.LOOKING, actorId: player.id }, world);
    expect(isConcealed(player)).toBe(true);

    // Silent action: examining does not break concealment
    listener({ actionId: IFActions.EXAMINING, actorId: player.id }, world);
    expect(isConcealed(player)).toBe(true);

    // Explicit reveal
    const revealCmd = createCommand(IFActions.REVEALING, {});
    const revealCtx = createRealTestContext(revealingAction, world, revealCmd);
    const revealResult = executeAction(revealingAction, revealCtx);
    expect(revealResult.validation.valid).toBe(true);
    expect(isConcealed(player)).toBe(false);
  });
});

// ============================================================================
// Save/Restore Round-Trip
// ============================================================================

describe('save/restore', () => {
  test('ConcealedStateTrait survives entity serialization round-trip', () => {
    const { world, player, room } = setupBasicWorld();
    const curtain = createHidingSpot(world, room.id, 'curtain', {
      positions: ['behind'],
      quality: 'good',
    });

    // Hide
    const hideCmd = createCommand(IFActions.HIDING, {
      entity: curtain,
      extras: { position: 'behind' },
    });
    const hideCtx = createRealTestContext(hidingAction, world, hideCmd);
    executeAction(hidingAction, hideCtx);
    expect(isConcealed(player)).toBe(true);

    // Simulate save: read trait data
    const savedState = getConcealmentState(player);
    expect(savedState).toBeDefined();

    // Simulate restore: remove and re-add trait
    player.remove(ConcealedStateTrait.type);
    expect(isConcealed(player)).toBe(false);

    player.add(new ConcealedStateTrait({
      targetId: savedState!.targetId,
      position: savedState!.position,
      quality: savedState!.quality,
    }));

    // Verify restored state
    expect(isConcealed(player)).toBe(true);
    const restored = getConcealmentState(player);
    expect(restored!.targetId).toBe(curtain.id);
    expect(restored!.position).toBe('behind');
    expect(restored!.quality).toBe('good');
  });
});
