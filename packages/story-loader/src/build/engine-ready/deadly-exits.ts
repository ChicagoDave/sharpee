/**
 * deadly-exits.ts — the `deadly-exits` step: one command transformer over every `<direction> is deadly`.
 *
 * The wiring step collected each room's deadly exits into one map. Here
 * that map becomes ONE pre-validate command transformer, redirecting a
 * matching going command to the platform's generic extras-driven
 * deadly-death action — the same seam stdlib's own deadly-room
 * transformer uses. A deadly exit need not exist in the room graph, so no
 * destination-resolved interceptor could ever fire; a story with none
 * registers nothing.
 *
 * Public interface: registerDeadlyExits (the `deadly-exits` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the engine wiring as a named step list.
 * - ADR-227 — `<direction> is deadly:` lowers to one transformer.
 */
import type { StoryEngine } from '@sharpee/engine';
import { DEADLY_ROOM_CAUSE_KEY, DEADLY_ROOM_DEATH_ACTION_ID, DEADLY_ROOM_MESSAGE_KEY } from '@sharpee/stdlib';
import type { IParsedCommand, WorldModel } from '@sharpee/world-model';
import type { BuildContext } from '../context.js';

/**
 * The `deadly-exits` step: register the transformer when any exit is deadly.
 * @param story the build context (its `deadlyExits` map)
 * @param _world the built world (unused; the transformer reads the live world per command)
 * @param engine the story-facing engine role
 */
export function registerDeadlyExits(story: BuildContext, _world: WorldModel, engine: StoryEngine): void {
  if (story.deadlyExits.size > 0) {
    engine.registerParsedCommandTransformer(buildDeadlyExitTransformer(story));
  }
}

/**
 * The deadly-exit command transformer (ADR-227). Redirects `going
 * <deadly-direction>` from a room with declared deadly exits to
 * `DEADLY_ROOM_DEATH_ACTION_ID`, threading the phrase-derived
 * cause/messageId through extras. Pass-through otherwise.
 */
function buildDeadlyExitTransformer(story: BuildContext): (parsed: IParsedCommand, world: WorldModel) => IParsedCommand {
  const deadlyExits = story.deadlyExits;
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    const actionId = parsed.action?.toLowerCase() ?? '';
    if (actionId !== 'if.action.going' && actionId !== 'going') return parsed;

    const player = world.playerCharacter;
    const roomId = world.getLocation(player.id);
    if (!roomId) return parsed;
    const byRoom = deadlyExits.get(roomId);
    if (!byRoom) return parsed;

    // The parser hands the way over as the platform's exit key (a
    // Direction constant or a passage key), the value it is stored by.
    const hit = byRoom.get(String(parsed.extras?.direction ?? ''));
    if (!hit) return parsed;

    return {
      ...parsed,
      action: DEADLY_ROOM_DEATH_ACTION_ID,
      extras: {
        ...parsed.extras,
        [DEADLY_ROOM_CAUSE_KEY]: hit.cause,
        [DEADLY_ROOM_MESSAGE_KEY]: hit.messageId,
        originalAction: parsed.action,
      },
    };
  };
}
