/**
 * player.ts — the session's player role (ADR-390 D2).
 *
 * Purpose: one object that answers what only the role answers — who holds it
 * now, whether a given actor is it, what a given actor may do, and from where
 * the session looks. The world knows which actor holds the role (the role
 * flag on the actor, read through `WorldModel.playerCharacter`); this object
 * is the engine's, one per session, and holds no state of its own: every
 * answer is computed from the world at the moment it is asked.
 *
 * Public interface: `Player`, `createPlayer`.
 * Owner context: `@sharpee/engine` — session.
 */
import type { IFEntity, WorldModel } from '@sharpee/world-model';
import { MetaCommandRegistry } from '@sharpee/stdlib';

/** The player role as the session holds it. */
export interface Player {
  /** The actor holding the role now; throws when none does (a read before the start block assigns it is a bug). */
  readonly character: IFEntity;
  /** The id perception, presence tagging and sound witnessing take as the viewpoint. */
  readonly viewpointId: string;
  /** Whether `actorId` holds the role now; false when no one does. */
  is(actorId: string): boolean;
  /** Whether `actorId` may perform `actionId`: everything for the player, everything but a meta action for anyone else. */
  permits(actorId: string, actionId: string): boolean;
}

/**
 * The session's Player over a world.
 *
 * @param world the live world the role is read from
 * @returns a Player whose every member reads the world when asked
 */
export function createPlayer(world: WorldModel): Player {
  const is = (actorId: string): boolean => world.hasPlayerCharacter && world.playerCharacter.id === actorId;
  return {
    get character() {
      return world.playerCharacter;
    },
    get viewpointId() {
      return world.playerCharacter.id;
    },
    is,
    permits: (actorId, actionId) => !MetaCommandRegistry.isMeta(actionId) || is(actorId),
  };
}
