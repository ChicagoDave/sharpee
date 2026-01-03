/**
 * Rainbow Handler
 *
 * Handles the rainbow bridge puzzle at Aragain Falls.
 * When player tries to go west at Aragain Falls and the rainbow is not solid,
 * shows a custom blocking message instead of generic "no exit that way".
 */

import { WorldModel, IdentityTrait, IParsedCommand } from '@sharpee/world-model';
import { ParsedCommandTransformer } from '@sharpee/engine';

// State key for tracking rainbow state
const RAINBOW_ACTIVE_KEY = 'dungeo.rainbow.active';

/**
 * Check if player is at Aragain Falls
 */
function isAtAragainFalls(world: WorldModel): boolean {
  const player = world.getPlayer();
  if (!player) return false;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const room = world.getEntity(playerLocation);
  if (!room) return false;

  const identity = room.get(IdentityTrait);
  const roomName = identity?.name || '';

  return roomName === 'Aragain Falls';
}

/**
 * Check if the rainbow is currently solid (active)
 */
function isRainbowActive(world: WorldModel): boolean {
  return (world.getStateValue(RAINBOW_ACTIVE_KEY) as boolean) || false;
}

/**
 * Check if command is going west
 */
function isGoingWest(parsed: IParsedCommand): boolean {
  const actionId = parsed.action?.toLowerCase();

  // Check if it's a GO/GOING action
  if (actionId !== 'go' && actionId !== 'going' && actionId !== 'if.action.going') {
    return false;
  }

  // Get direction
  let direction: string | undefined;

  if (parsed.extras?.direction) {
    direction = String(parsed.extras.direction).toLowerCase();
  } else if (parsed.structure?.directObject?.head) {
    direction = parsed.structure.directObject.head.toLowerCase();
  }

  return direction === 'west' || direction === 'w';
}

/**
 * Create the rainbow command transformer
 *
 * Intercepts "go west" at Aragain Falls when rainbow is not solid,
 * redirecting to a custom blocking action that shows the appropriate message.
 */
export function createRainbowCommandTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Only intercept when at Aragain Falls, going west, and rainbow not active
    if (!isAtAragainFalls(world) || !isGoingWest(parsed) || isRainbowActive(world)) {
      return parsed;
    }

    // Redirect to custom blocking action
    return {
      ...parsed,
      action: 'dungeo.rainbow.blocked',
      extras: {
        ...parsed.extras,
        originalAction: parsed.action,
        isRainbowBlocked: true
      }
    };
  };
}
