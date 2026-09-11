/**
 * @sharpee/stdlib/endings — the story-ending primitive (ADR-347).
 *
 * Owner context: stdlib. The single declaring verb every ending mechanism
 * lowers to, beside the `death/` primitive it is modelled on. The record
 * type and the event types themselves stay in `@sharpee/if-domain`, which
 * both surfaces import — one wire shape, no drift (DEVARCH rule 8b).
 *
 * Public interface:
 * - `endStory` — record the Ending on the world + produce the blessed event.
 * - `IEndStoryOptions` — `endStory`'s options.
 */

export { endStory, type IEndStoryOptions } from './end-story.js';
