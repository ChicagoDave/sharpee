/**
 * Types the event processor shares with its callers: the result and option
 * shapes of `processEvents`, and the world-level handler signature.
 *
 * Public interface: `WorldChange`, `ProcessedEvents`, `ProcessorOptions`,
 * `EventHandler` (all re-exports).
 * Owner context: @sharpee/event-processor.
 */

// Re-export domain types
export { WorldChange, ProcessedEvents, ProcessorOptions } from '@sharpee/if-domain';

/**
 * Re-export of world-model's world-level event handler type: the signature
 * of `WorldModel.registerEventHandler()`.
 *
 * Nothing in this package uses it any longer. It typed the standard handlers
 * this package once registered, and those are gone, so the re-export is kept
 * only for importers outside the package.
 *
 * Not to be confused with `StoryEventHandler` (`handler-types.ts`), the
 * effects-returning story handler — a different signature for a different
 * registry.
 *
 * References:
 * - ADR-052 — world-level event handlers.
 * - ADR-075 — the effects-returning story handler.
 * - #141 / proposal P-3 (2026-07-30) — why the re-export was retained then.
 */
export { EventHandler } from '@sharpee/world-model';