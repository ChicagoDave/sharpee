/**
 * TraversalBehavior — the one answer to "may this mover take this way now?"
 *
 * A system in ADR-379's sense: one rule over the whole world, consulted by
 * every mover (the walking player, a steered vehicle, a pushed thing, an NPC)
 * from one place, so that a gate added here is a gate for all of them. Before
 * this module each mover carried its own copy of the gates and they
 * disagreed (ADR-379 Context).
 *
 * The gates, in order (ADR-378 D0, D3): the way exists (an exit hidden by its
 * `while` condition is absent); the way is not blocked (ADR-240's live key,
 * else the stamped map); any door on the way is open and unlocked; the
 * destination exists; the way admits the mover (ADR-366 D6 for a steered
 * vehicle, ADR-378 D6 for a pushed thing), read from the exit's own `admits`
 * when it has one, else the destination room's.
 *
 * Public interface: TraversalBehavior.wayFor, exitOf, isExitHidden,
 *   isExitBlocked, blockedMessage, admitsMover; the key builders
 *   exitHiddenKey, exitBlockedKey, exitMessageKey; the types TraversalMover,
 *   Way, WayRefusal, PUSHING.
 * Owner context: world-model — traversal (the system's home).
 */

import { IFEntity } from '../entities/if-entity.js';
import { TraitType } from '../traits/trait-types.js';
import { RoomTrait, IExitInfo } from '../traits/room/roomTrait.js';
import { RoomBehavior } from '../traits/room/roomBehavior.js';
import { IComputedExitDeclaration } from '../traits/room/computedExitContract.js';
import { OpenableBehavior } from '../traits/openable/openableBehavior.js';
import { LockableBehavior } from '../traits/lockable/lockableBehavior.js';
import type { ExitKey } from '../constants/directions.js';
import type { WorldModel } from './WorldModel.js';

/** The class word an `admits` list carries for a pushed thing (ADR-378 D6). */
export const PUSHING = 'pushing';

/** Who is trying to take the way. */
export type TraversalMover =
  | { kind: 'walker'; entity: IFEntity }
  | { kind: 'steered'; vehicle: IFEntity }
  | { kind: 'pushed'; thing: IFEntity }
  | { kind: 'npc'; entity: IFEntity };

/** Why a way refused. */
export type WayRefusal =
  | 'hidden'
  | 'no_exit'
  | 'blocked'
  | 'door_closed'
  | 'door_locked'
  | 'destination_missing'
  | 'not_admitted'
  | 'pushing_not_admitted';

/** The query's answer. */
export type Way =
  | { kind: 'exit'; key: ExitKey; exit: IExitInfo; destination: IFEntity; door?: IFEntity }
  | {
      /** The way is a computed exit (ADR-295): its destination is drawn by the caller's one resolution. */
      kind: 'computed';
      key: ExitKey;
      declaration: IComputedExitDeclaration;
      exit: IExitInfo | null;
    }
  | { kind: 'refused'; key: ExitKey; reason: WayRefusal; message?: string; door?: IFEntity };

/** Derived key: is this way hidden now? (ADR-378 D3; registered by the story's `while` on the exit line) */
export function exitHiddenKey(roomId: string, key: ExitKey): string {
  return `exit.hidden.${roomId}.${key}`;
}

/** Derived key: is this way blocked now? (ADR-240; registered by the story's `is blocked` line) */
export function exitBlockedKey(roomId: string, key: ExitKey): string {
  return `exit.blocked.${roomId}.${key}`;
}

/** Derived key: the blocked way's refusal message, resolved at refusal time (ADR-240). */
export function exitMessageKey(roomId: string, key: ExitKey): string {
  return `exit.message.${roomId}.${key}`;
}

export class TraversalBehavior {
  /**
   * Whether the way is hidden: its `while` condition is registered and false.
   * With nothing registered the way is not hidden.
   *
   * @param world - The live world
   * @param room - The room the way leaves
   * @param key - The way
   */
  static isExitHidden(world: WorldModel, room: IFEntity, key: ExitKey): boolean {
    const derived = world.evaluate(exitHiddenKey(room.id, key));
    return derived === true;
  }

  /**
   * The exit for a way, or null when there is none or it is hidden (ADR-378 D3).
   *
   * @param world - The live world
   * @param room - The room the way leaves
   * @param key - The way
   */
  static exitOf(world: WorldModel, room: IFEntity, key: ExitKey): IExitInfo | null {
    if (this.isExitHidden(world, room, key)) return null;
    return RoomBehavior.getExit(room, key);
  }

  /**
   * Whether the way is blocked: a registered evaluator is authoritative;
   * with none, the stamped `RoomTrait.blockedExits` map applies.
   *
   * @param world - The live world
   * @param room - The room the way leaves
   * @param key - The way
   */
  static isExitBlocked(world: WorldModel, room: IFEntity, key: ExitKey): boolean {
    const derived = world.evaluate(exitBlockedKey(room.id, key));
    if (typeof derived === 'boolean') return derived;
    return RoomBehavior.isExitBlocked(room, key);
  }

  /**
   * The blocked way's message: the registered evaluator first, the trait map as fallback.
   *
   * @param world - The live world
   * @param room - The room the way leaves
   * @param key - The way
   */
  static blockedMessage(world: WorldModel, room: IFEntity, key: ExitKey): string | undefined {
    const derived = world.evaluate(exitMessageKey(room.id, key));
    if (typeof derived === 'string') return derived;
    return RoomBehavior.getBlockedMessage(room, key);
  }

  /**
   * Whether a way admits a mover that needs admitting: the exit's own
   * `admits` list when it has one, else the destination room's (ADR-366 D6,
   * ADR-378 D6). A walker and an NPC need no admitting.
   *
   * @param exit - The exit being taken
   * @param destination - The room it leads to
   * @param mover - Who is taking it
   */
  static admitsMover(exit: IExitInfo, destination: IFEntity, mover: TraversalMover): boolean {
    if (mover.kind === 'walker' || mover.kind === 'npc') return true;
    const list = exit.admits ?? destination.get(RoomTrait)?.admits ?? [];
    return mover.kind === 'steered' ? list.includes(mover.vehicle.id) : list.includes(PUSHING);
  }

  /**
   * The way for a mover out of a room by a key, or the refusal (ADR-378 D0).
   *
   * @param world - The live world
   * @param room - The room the way leaves (must carry RoomTrait)
   * @param key - The way: a compass direction or a passage key
   * @param mover - Who is taking it
   * @returns The exit and its destination; a computed declaration for the
   *   caller to resolve once; or the refusal with its reason
   */
  static wayFor(world: WorldModel, room: IFEntity, key: ExitKey, mover: TraversalMover): Way {
    if (!room.has(TraitType.ROOM)) return { kind: 'refused', key, reason: 'no_exit' };

    // Existence before blocking (ADR-378 D3): a hidden way is not there,
    // whatever else is said about it.
    if (this.isExitHidden(world, room, key)) return { kind: 'refused', key, reason: 'hidden' };

    // A blocked-only way has no exit to read (Chord `north is blocked:`), so
    // blocking is read before the exit.
    if (this.isExitBlocked(world, room, key)) {
      return { kind: 'refused', key, reason: 'blocked', message: this.blockedMessage(world, room, key) };
    }

    const exit = RoomBehavior.getExit(room, key);
    const computed = RoomBehavior.getComputedExitDeclaration(room, key);
    if (!exit && !computed) return { kind: 'refused', key, reason: 'no_exit' };

    const door = exit?.via !== undefined ? world.getEntity(exit.via) : undefined;
    if (door) {
      if (door.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(door)) {
        return { kind: 'refused', key, reason: 'door_locked', door };
      }
      if (door.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(door)) {
        return { kind: 'refused', key, reason: 'door_closed', door };
      }
    }

    if (computed) return { kind: 'computed', key, declaration: computed.declaration, exit };

    const destination = world.getEntity(exit!.destination);
    if (!destination) return { kind: 'refused', key, reason: 'destination_missing', door };

    if (!this.admitsMover(exit!, destination, mover)) {
      return {
        kind: 'refused',
        key,
        reason: mover.kind === 'pushed' ? 'pushing_not_admitted' : 'not_admitted',
        door
      };
    }

    return { kind: 'exit', key, exit: exit!, destination, door };
  }
}
