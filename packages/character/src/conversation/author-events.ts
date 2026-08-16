/**
 * Author-channel event helper (ADR-318 D11)
 *
 * One constructor for `character.author.*` events shared by every
 * dialogue surface (the TS dialogue extension and the loader's topic
 * dispatch). Author events carry no message ID and never render as
 * player prose (ADR-310 D12).
 *
 * Public interface: createAuthorEvent.
 * Owner context: @sharpee/character / conversation
 */

import { type ISemanticEvent } from '@sharpee/core';

let authorEventCounter = 0;

/**
 * Build an author-channel event.
 *
 * @param type - Event type (`character.author.*`)
 * @param npcId - The NPC the event attributes to
 * @param data - Event payload (diagnostic data, never prose)
 * @returns The semantic event
 */
export function createAuthorEvent(
  type: string,
  npcId: string,
  data: Record<string, unknown>,
): ISemanticEvent {
  return {
    id: `char_author_${++authorEventCounter}`,
    type,
    timestamp: Date.now(),
    entities: { actor: npcId },
    data,
  };
}
