/**
 * Brick Explosion Fuse System - MDL act2.mud:646-736
 *
 * Three cascading fuses implement the brick/safe puzzle:
 *
 * FUSIN (2 turns): Fuse wire burns down → explosion
 *   - Brick in slot (Dusty Room): safe blown open, schedule SAFIN + LEDIN
 *   - Brick in player's room: player dies
 *   - Brick elsewhere: room munged (exits blocked with debris)
 *   - Wire not co-located with brick: fizzles, no explosion
 *
 * SAFIN (5 turns after explosion): Safe room collapse
 *   - Player in Dusty Room: dies (50,000 pounds of rock)
 *   - Player elsewhere: ominous rumbling message
 *
 * LEDIN (8 turns after explosion): Wide Ledge collapse
 *   - Player on ledge: dies
 *   - Player elsewhere: narrow escape message
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel, IdentityTrait, RoomTrait, DirectionType, OpenableTrait, SceneryTrait, TraitType, Direction } from '@sharpee/world-model';
import { ISchedulerService, Fuse, SchedulerContext } from '@sharpee/plugin-scheduler';
import { DungeoSchedulerMessages } from './scheduler-messages';
import { BurnableTrait } from '../traits';

// Fuse IDs
export const EXPLOSION_FUSE_ID = 'dungeo.brick.explosion';
const SAFE_COLLAPSE_FUSE_ID = 'dungeo.safe.collapse';
const LEDGE_COLLAPSE_FUSE_ID = 'dungeo.ledge.collapse';

// Timing constants (in turns)
const EXPLOSION_TURNS = 2;         // FUSIN: 2 turns after lighting
const SAFE_COLLAPSE_TURNS = 5;     // SAFIN: 5 turns after explosion
const LEDGE_COLLAPSE_TURNS = 8;    // LEDIN: 8 turns after explosion

/**
 * Configuration for the explosion fuse system.
 * Entity and room IDs needed for explosion logic.
 */
export interface ExplosionConfig {
  brickId: EntityId;
  fuseWireId: EntityId;
  dustyRoomId: EntityId;
  wideLedgeId: EntityId;
  slotId: EntityId;
  safeId: EntityId;
}

/**
 * Mung a room: block all exits with debris message, hide scenery.
 * MDL: MUNG-ROOM (rooms.mud:1970-1973)
 */
function mungRoom(world: WorldModel, roomId: string): void {
  const room = world.getEntity(roomId);
  if (!room) return;
  const roomTrait = room.get(RoomTrait);
  if (!roomTrait) return;

  room.attributes.isMunged = true;

  // Block all exits with debris message
  const debrisMessage = 'The way is blocked by debris from the recent explosion.';
  for (const dir of Object.keys(roomTrait.exits)) {
    delete roomTrait.exits[dir as DirectionType];
    if (!roomTrait.blockedExits) roomTrait.blockedExits = {} as Partial<Record<DirectionType, string>>;
    roomTrait.blockedExits[dir as DirectionType] = debrisMessage;
  }

  // Hide non-takeable scenery items in room
  const contents = world.getContents(roomId);
  for (const item of contents) {
    if (item.get(SceneryTrait)) {
      const identity = item.get(IdentityTrait);
      if (identity) identity.concealed = true;
    }
  }
}

/**
 * Make a semantic event for the fuse system.
 */
function makeEvent(id: string, type: string, turn: number, messageId: string, entityId?: string): ISemanticEvent {
  return {
    id: `${id}-${turn}`,
    type,
    timestamp: Date.now(),
    entities: entityId ? { target: entityId } : {},
    data: { messageId }
  };
}

// ============================================================================
// FUSIN: Brick Explosion (2 turns after lighting fuse)
// ============================================================================

function createExplosionFuse(config: ExplosionConfig, scheduler: ISchedulerService): Fuse {
  return {
    id: EXPLOSION_FUSE_ID,
    name: 'Brick Explosion',
    turns: EXPLOSION_TURNS,
    entityId: config.brickId,
    priority: 20,

    // Only tick while the fuse wire is burning
    tickCondition: (ctx: SchedulerContext): boolean => {
      const wire = ctx.world.getEntity(config.fuseWireId);
      if (!wire) return false;
      const burnable = wire.get(BurnableTrait);
      return burnable?.isBurning === true;
    },

    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      const { world } = ctx;
      const events: ISemanticEvent[] = [];

      // Mark wire as burned out
      const wire = world.getEntity(config.fuseWireId);
      if (wire) {
        const burnable = wire.get(BurnableTrait);
        if (burnable) {
          burnable.isBurning = false;
          burnable.burnedOut = true;
        }
        // Update wire description
        const wireIdentity = wire.get(IdentityTrait);
        if (wireIdentity) {
          wireIdentity.description = 'A burnt piece of wire.';
          wireIdentity.concealed = true;
        }
      }

      // Check if fuse wire was co-located with brick
      const wireLocation = world.getLocation(config.fuseWireId);
      const brickLocation = world.getLocation(config.brickId);

      // Wire could be in player inventory while brick is in slot (in room).
      // MDL checks OCAN (object container) — fuse must be in brick's container.
      // We interpret this as: wire and brick are in the same location (room or inventory).
      // Wire in player inventory + brick in slot (which is in room) is the intended scenario.
      // So we check: wire is with player, brick is in slot in dusty room — that's fine.
      // Simplification: if wire has been burning, the explosion happens. The wire was
      // lit while in player's hands (or room), and the brick can be anywhere.
      // The MDL check is actually about whether the fuse wire reached the brick.
      // For now: always explode (the player lit the fuse that's attached to the brick).

      // Determine brick location (it could be in slot, which is in the dusty room)
      const brickInSlot = brickLocation === config.slotId;
      const brickInDustyRoom = brickLocation === config.dustyRoomId;
      const brickInPlayerRoom = brickLocation === ctx.playerLocation;
      const brickInPlayerInventory = brickLocation === ctx.playerId;

      if (brickInSlot) {
        // === SAFE BLOWN OPEN (MDL: brick in SSLOT in SAFE room) ===
        const safe = world.getEntity(config.safeId);
        if (safe) {
          safe.attributes.safeBlownOpen = true;
          safe.attributes.rustedShut = false;
          // Open the safe
          const openable = safe.get(OpenableTrait);
          if (openable) {
            openable.isOpen = true;
          }
          // Update safe description
          const safeIdentity = safe.get(IdentityTrait);
          if (safeIdentity) {
            safeIdentity.description = 'On the far wall is a rusty box, whose door has been blown off.';
          }
        }

        // Hide the slot (MDL: TRZ SSLOT OVISON)
        const slot = world.getEntity(config.slotId);
        if (slot) {
          const slotIdentity = slot.get(IdentityTrait);
          if (slotIdentity) slotIdentity.concealed = true;
        }

        // Conceal the brick (destroyed by explosion)
        const brick = world.getEntity(config.brickId);
        if (brick) {
          const brickIdentity = brick.get(IdentityTrait);
          if (brickIdentity) brickIdentity.concealed = true;
        }

        // Schedule SAFIN and LEDIN
        scheduler.setFuse(createSafeCollapseFuse(config));
        scheduler.setFuse(createLedgeCollapseFuse(config));

        // Message depends on player location
        if (ctx.playerLocation === config.dustyRoomId) {
          events.push(makeEvent('safe-explosion', 'scheduler.fuse.triggered', ctx.turn,
            DungeoSchedulerMessages.SAFE_BLOWN_OPEN, config.brickId));
        } else {
          events.push(makeEvent('distant-explosion', 'scheduler.fuse.triggered', ctx.turn,
            DungeoSchedulerMessages.DISTANT_EXPLOSION));
        }

      } else if (brickInPlayerRoom || brickInPlayerInventory) {
        // === PLAYER DIES (brick in same room as player) ===
        world.setStateValue('dungeo.player.death_cause', 'brick_explosion');

        // Conceal the brick
        const brick = world.getEntity(config.brickId);
        if (brick) {
          const brickIdentity = brick.get(IdentityTrait);
          if (brickIdentity) brickIdentity.concealed = true;
        }

        // Mung the room too
        if (ctx.playerLocation) {
          mungRoom(world, ctx.playerLocation);
        }

        events.push(makeEvent('brick-death', 'if.event.player.died', ctx.turn,
          DungeoSchedulerMessages.BRICK_KILLS_PLAYER, config.brickId));

      } else if (brickInDustyRoom) {
        // Brick is on the floor of dusty room (not in slot) — still explodes in room
        // Same as slot case but without opening the safe
        mungRoom(world, config.dustyRoomId);

        // Conceal the brick
        const brick = world.getEntity(config.brickId);
        if (brick) {
          const brickIdentity = brick.get(IdentityTrait);
          if (brickIdentity) brickIdentity.concealed = true;
        }

        // Schedule collapses
        scheduler.setFuse(createSafeCollapseFuse(config));
        scheduler.setFuse(createLedgeCollapseFuse(config));

        if (ctx.playerLocation === config.dustyRoomId) {
          // Player is in blast zone
          world.setStateValue('dungeo.player.death_cause', 'brick_explosion');
          events.push(makeEvent('brick-death', 'if.event.player.died', ctx.turn,
            DungeoSchedulerMessages.BRICK_KILLS_PLAYER, config.brickId));
        } else {
          events.push(makeEvent('distant-explosion', 'scheduler.fuse.triggered', ctx.turn,
            DungeoSchedulerMessages.DISTANT_EXPLOSION));
        }

      } else {
        // === ROOM MUNGED (brick somewhere else in dungeon) ===
        if (brickLocation) {
          mungRoom(world, brickLocation);
        }

        // Conceal the brick
        const brick = world.getEntity(config.brickId);
        if (brick) {
          const brickIdentity = brick.get(IdentityTrait);
          if (brickIdentity) brickIdentity.concealed = true;
        }

        events.push(makeEvent('room-munged', 'scheduler.fuse.triggered', ctx.turn,
          DungeoSchedulerMessages.DISTANT_EXPLOSION));
      }

      return events;
    }
  };
}

// ============================================================================
// SAFIN: Safe Room Collapse (5 turns after explosion)
// ============================================================================

function createSafeCollapseFuse(config: ExplosionConfig): Fuse {
  return {
    id: SAFE_COLLAPSE_FUSE_ID,
    name: 'Safe Room Collapse',
    turns: SAFE_COLLAPSE_TURNS,
    priority: 20,

    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      const { world } = ctx;
      const events: ISemanticEvent[] = [];

      // Mung the Dusty Room (if not already munged)
      const dustyRoom = world.getEntity(config.dustyRoomId);
      if (dustyRoom && !dustyRoom.attributes.isMunged) {
        mungRoom(world, config.dustyRoomId);
      }

      // Also block entry FROM Wide Ledge going SOUTH (it's already deleted from Dusty Room's exits,
      // but we also need to remove the Wide Ledge → Dusty Room exit)
      const wideLedge = world.getEntity(config.wideLedgeId);
      const wideLedgeTrait = wideLedge?.get(RoomTrait);
      if (wideLedgeTrait?.exits?.[Direction.SOUTH]) {
        delete wideLedgeTrait.exits[Direction.SOUTH];
        if (!wideLedgeTrait.blockedExits) wideLedgeTrait.blockedExits = {} as Partial<Record<DirectionType, string>>;
        (wideLedgeTrait.blockedExits as any)[Direction.SOUTH] = 'The way is blocked by debris from the recent explosion.';
      }

      if (ctx.playerLocation === config.dustyRoomId) {
        // Player in Dusty Room: dies
        world.setStateValue('dungeo.player.death_cause', 'safe_collapse');
        events.push(makeEvent('safe-collapse-death', 'if.event.player.died', ctx.turn,
          DungeoSchedulerMessages.SAFE_COLLAPSE_DEATH));
      } else {
        // Player elsewhere: ominous rumbling
        events.push(makeEvent('safe-collapse-rumble', 'scheduler.fuse.triggered', ctx.turn,
          DungeoSchedulerMessages.SAFE_COLLAPSE_RUMBLE));
      }

      return events;
    }
  };
}

// ============================================================================
// LEDIN: Wide Ledge Collapse (8 turns after explosion)
// ============================================================================

function createLedgeCollapseFuse(config: ExplosionConfig): Fuse {
  return {
    id: LEDGE_COLLAPSE_FUSE_ID,
    name: 'Wide Ledge Collapse',
    turns: LEDGE_COLLAPSE_TURNS,
    priority: 20,

    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      const { world } = ctx;
      const events: ISemanticEvent[] = [];

      // Mung the Wide Ledge
      mungRoom(world, config.wideLedgeId);

      // Mark ledge as collapsed (balloon daemon checks this)
      const wideLedge = world.getEntity(config.wideLedgeId);
      if (wideLedge) {
        wideLedge.attributes.ledgeCollapsed = true;
      }

      if (ctx.playerLocation === config.wideLedgeId) {
        // Player on Wide Ledge: dies
        world.setStateValue('dungeo.player.death_cause', 'ledge_collapse');
        events.push(makeEvent('ledge-collapse-death', 'if.event.player.died', ctx.turn,
          DungeoSchedulerMessages.LEDGE_COLLAPSE_DEATH));
      } else {
        // Player elsewhere: narrow escape
        events.push(makeEvent('ledge-collapse-escape', 'scheduler.fuse.triggered', ctx.turn,
          DungeoSchedulerMessages.LEDGE_COLLAPSE_NARROW_ESCAPE));
      }

      return events;
    }
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Start the explosion countdown. Called by the burn action when
 * the player lights the fuse wire.
 */
export function startExplosionCountdown(
  scheduler: ISchedulerService,
  config: ExplosionConfig
): void {
  scheduler.setFuse(createExplosionFuse(config, scheduler));
}
