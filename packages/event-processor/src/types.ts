/**
 * Event processor types
 */

import { type ISemanticEvent } from '@sharpee/core';
import { WorldModel, type EventHandler } from '@sharpee/world-model';
import { type WorldChange, type ProcessedEvents, type ProcessorOptions } from '@sharpee/if-domain';

// Re-export domain types
export { WorldChange, ProcessedEvents, ProcessorOptions } from '@sharpee/if-domain';

/**
 * Re-export of world-model's world-level event handler type.
 *
 * RETAINED (#141 / proposal P-3, 2026-07-30). The issue listed this as stale
 * "after ISSUE-068 removed entity handlers" — but ISSUE-068 removed *entity*
 * `on[...]` handlers, not the world-level registry. `EventHandler` is the
 * signature of `WorldModel.registerEventHandler()` (ADR-052), and it types
 * every handler in `handlers/state-change.ts` (`handleOpened`, `handleClosed`,
 * `handleLocked`, `handleUnlocked`, `handleSwitchedOn`, `handleSwitchedOff`,
 * `handleWorn`, `handleEaten`, `handleDrunk`) plus the meta handlers. Removing
 * it would untype nine live handlers.
 *
 * Not to be confused with `StoryEventHandler` (`handler-types.ts`), the ADR-075
 * effects-returning story handler — a different signature for a different
 * registry.
 */
export { EventHandler } from '@sharpee/world-model';