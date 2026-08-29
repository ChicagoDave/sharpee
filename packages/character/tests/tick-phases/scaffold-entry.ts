/**
 * scaffold-entry.ts — hand-built execution entries for the character
 * package's tick harnesses, which run the phase over a bare WorldModel
 * with no engine.
 *
 * `scaffoldEntry` is SCAFFOLDING (DevArch rule 13a): it moves entities the
 * way stdlib's taking/giving/dropping/going would, with none of their
 * validation. The real path — the same steps through `GameEngine.executeAsActor`
 * and the real actions — is `packages/story-loader/tests/adr-329-goal-steps.test.ts`.
 *
 * Public interface: scaffoldEntry, unexpectedAct.
 * Owner context: @sharpee/character tests
 */
import { RoomTrait, type IExitInfo, type WorldModel } from '@sharpee/world-model';
import { IFActions, type ExecutionEntry } from '@sharpee/stdlib';

/** One recorded call on a scaffolding entry. */
export interface ScaffoldCall {
  actorId: string;
  actionId: string;
  direction?: string;
  directObject?: string;
  indirectObject?: string;
}

/** An entry for harnesses whose NPCs never act — any call is a test failure. */
export const unexpectedAct: ExecutionEntry = () => {
  throw new Error('no act expected in this test');
};

/**
 * A scaffolding entry over `world`: applies the four goal-step actions as
 * bare moves and records every call on `calls`.
 *
 * @param world - The harness world
 * @param refuse - Optional predicate; a matching call is refused (nothing moves)
 * @returns The entry and its call log
 */
export function scaffoldEntry(
  world: WorldModel,
  refuse?: (actorId: string, actionId: string) => boolean,
): { act: ExecutionEntry; calls: ScaffoldCall[] } {
  const calls: ScaffoldCall[] = [];
  const act: ExecutionEntry = (actorId, actionId, slots) => {
    calls.push({
      actorId,
      actionId,
      ...(slots?.direction ? { direction: slots.direction } : {}),
      ...(slots?.directObject ? { directObject: slots.directObject.id } : {}),
      ...(slots?.indirectObject ? { indirectObject: slots.indirectObject.id } : {}),
    });
    if (refuse?.(actorId, actionId)) return { success: false, events: [] };
    switch (actionId) {
      case IFActions.GOING: {
        const room = world.getLocation(actorId);
        const exits = room ? world.getEntity(room)?.get(RoomTrait)?.exits : undefined;
        const exit = exits && slots?.direction ? (exits[slots.direction] as IExitInfo | undefined) : undefined;
        if (!exit?.destination) return { success: false, events: [] };
        return { success: world.moveEntity(actorId, exit.destination), events: [] };
      }
      case IFActions.TAKING:
        return { success: world.moveEntity(slots!.directObject!.id, actorId), events: [] };
      case IFActions.GIVING:
        return { success: world.moveEntity(slots!.directObject!.id, slots!.indirectObject!.id), events: [] };
      case IFActions.DROPPING: {
        const room = world.getLocation(actorId);
        return { success: !!room && world.moveEntity(slots!.directObject!.id, room), events: [] };
      }
      default:
        return { success: false, events: [] };
    }
  };
  return { act, calls };
}
