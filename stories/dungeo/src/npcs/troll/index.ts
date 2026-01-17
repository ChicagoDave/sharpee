/**
 * Troll NPC exports
 */

import { INpcService } from '@sharpee/stdlib';
import { trollBehavior } from './troll-behavior';

export { trollBehavior } from './troll-behavior';
export { TrollMessages } from './troll-messages';

/**
 * Register the troll NPC behavior with the game
 *
 * Unlike cyclops/thief, the troll entity is created in underground.ts.
 * This function just registers the behavior with the NPC service.
 *
 * @param npcService The NPC service to register behavior with
 */
export function registerTrollBehavior(npcService: INpcService): void {
  npcService.registerBehavior(trollBehavior);
}
