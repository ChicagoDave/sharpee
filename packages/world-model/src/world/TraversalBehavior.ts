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
 * field by field, else the destination room's.
 *
 * A computed way (ADR-295) has two halves and both live here. At validate
 * time `wayFor` refuses it when no candidate destination admits the mover;
 * at traversal time `resolveComputed` draws the destination once and
 * refuses it when the destination reached does not admit the mover. Every
 * mover takes a computed way through `resolveComputed`, so none re-checks
 * admittance against the candidates.
 *
 * Public interface: TraversalBehavior.wayFor, resolveComputed, exitOf,
 *   isExitHidden, isExitBlocked, blockedMessage, admitsMover; the key
 *   builders exitHiddenKey, exitBlockedKey, exitMessageKey; the types
 *   TraversalMover, Way, WayRefusal, ResolvedWay.
 * Owner context: world-model — traversal (the system's home).
 */

import { IFEntity } from '../entities/if-entity.js';
import { TraitType } from '../traits/trait-types.js';
import { RoomTrait, IExitInfo } from '../traits/room/roomTrait.js';
import { RoomBehavior } from '../traits/room/roomBehavior.js';
import { IComputedExitDeclaration } from '../traits/room/computedExitContract.js';
import { OpenableBehavior } from '../traits/openable/openableBehavior.js';
import { LockableBehavior } from '../traits/lockable/lockableBehavior.js';
import type { ExitResolution, ExitResolverContext } from '../capabilities/exit-resolver-binding.js';
import type { ExitKey } from '../constants/directions.js';
import type { WorldModel } from './WorldModel.js';

/**
 * Who is trying to take the way: an actor on foot, a vehicle the actor
 * steers, or an NPC. A walker or a steered vehicle may push a thing along
 * the way with it (ADR-378 D6, D7); the way must admit both, so they are one
 * party asking once, and a computed way is drawn once for the two.
 */
export type TraversalMover =
  | { kind: 'walker'; entity: IFEntity; pushing?: IFEntity }
  | { kind: 'steered'; vehicle: IFEntity; pushing?: IFEntity }
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

/**
 * A computed way taken (ADR-295 D5): the resolver's exit or block, passed
 * through, or traversal's own refusal of the destination it reached.
 */
export type ResolvedWay =
  | NonNullable<ExitResolution>
  | { kind: 'refused'; reason: WayRefusal };

/** The pushed things an admittance field admits: every pushable, or these. */
function admitsPushed(pushed: 'any' | string[], thing: IFEntity): boolean {
  return pushed === 'any' || pushed.includes(thing.id);
}

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
   * Whether a way admits a mover: each field of the exit's own `admits`
   * when it has it, else the destination room's (ADR-366 D6, ADR-378 D6).
   * A walker and an NPC need no admitting; a steered vehicle does, and so
   * does a thing pushed along with either.
   *
   * @param exit - The exit being taken; null for a computed way with no static exit
   * @param destination - The room it leads to
   * @param mover - Who is taking it
   */
  static admitsMover(exit: IExitInfo | null, destination: IFEntity, mover: TraversalMover): boolean {
    return this.admittanceRefusal(exit, destination, mover) === null;
  }

  /**
   * Why a way does not admit a mover, or null when it does: `not_admitted`
   * for a steered vehicle it does not name, `pushing_not_admitted` for a
   * pushed thing it does not admit. The vehicle is asked first.
   */
  private static admittanceRefusal(exit: IExitInfo | null, destination: IFEntity, mover: TraversalMover): WayRefusal | null {
    if (mover.kind === 'npc') return null;
    const room = destination.get(RoomTrait)?.admits;
    if (mover.kind === 'steered' && !(exit?.admits?.vehicles ?? room?.vehicles ?? []).includes(mover.vehicle.id)) {
      return 'not_admitted';
    }
    if (mover.pushing && !admitsPushed(exit?.admits?.pushed ?? room?.pushed ?? [], mover.pushing)) {
      return 'pushing_not_admitted';
    }
    return null;
  }

  /**
   * Take a computed way (ADR-295 D5): draw its destination once and refuse
   * it when that destination does not admit the mover (ADR-366 D6). A
   * resolver that defers hands the way to its static exit, admitted the
   * same way. Calls the resolver, which may draw, so a caller calls this
   * exactly once per traversal.
   *
   * @param world - The live world
   * @param room - The room the way leaves
   * @param key - The way
   * @param mover - Who is taking it
   * @param ctx - The resolver's context (world, actor, random service)
   * @returns The resolved way, or undefined when the way is not computed
   */
  static resolveComputed(
    world: WorldModel,
    room: IFEntity,
    key: ExitKey,
    mover: TraversalMover,
    ctx: ExitResolverContext
  ): ResolvedWay | undefined {
    if (!RoomBehavior.getComputedExitDeclaration(room, key)) return undefined;
    const exit = this.exitOf(world, room, key);
    const resolution = RoomBehavior.resolveExit(room, key, ctx);
    if (resolution?.kind === 'blocked') return resolution;
    const reached: NonNullable<ExitResolution> | undefined = resolution
      ?? (exit ? { kind: 'exit', destination: exit.destination, ...(exit.via !== undefined ? { via: exit.via } : {}) } : undefined);
    if (!reached) return { kind: 'refused', reason: 'no_exit' };
    const destination = world.getEntity(reached.destination);
    if (!destination) return { kind: 'refused', reason: 'destination_missing' };
    const refusal = this.admittanceRefusal(exit, destination, mover);
    if (refusal) return { kind: 'refused', reason: refusal };
    return reached;
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

    if (computed) {
      // The destination is drawn at traversal (resolveComputed), so here
      // the way is refused only when no candidate could admit the mover —
      // for the pushed thing's sake when some candidate takes the vehicle.
      const refusals = computed.declaration.candidates.map((id) => {
        const candidate = world.getEntity(id);
        return candidate !== undefined ? this.admittanceRefusal(exit, candidate, mover) : 'destination_missing';
      });
      if (!refusals.includes(null)) {
        const reason: WayRefusal = refusals.includes('pushing_not_admitted') ? 'pushing_not_admitted' : 'not_admitted';
        return { kind: 'refused', key, reason, door };
      }
      return { kind: 'computed', key, declaration: computed.declaration, exit };
    }

    const destination = world.getEntity(exit!.destination);
    if (!destination) return { kind: 'refused', key, reason: 'destination_missing', door };

    const refusal = this.admittanceRefusal(exit!, destination, mover);
    if (refusal) return { kind: 'refused', key, reason: refusal, door };

    return { kind: 'exit', key, exit: exit!, destination, door };
  }
}
