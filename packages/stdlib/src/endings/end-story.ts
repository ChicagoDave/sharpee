/**
 * `endStory` — the single declaring verb for a story's ending (ADR-347 D2c).
 *
 * Every ending mechanism (a Chord `win`/`lose` statement, a TypeScript action,
 * an event handler that notices the last treasure was scored) calls this
 * instead of hand-setting a world flag or hand-building an ending event. It
 * records the Ending on the world (ADR-347 D2a) and returns the blessed
 * `story.victory` / `story.defeat` event; the caller routes that event into
 * its own event stream, exactly as it does with `killPlayer`'s death event.
 *
 * Public interface: `endStory`, `IEndStoryOptions`.
 * Owner context: `@sharpee/stdlib` — the story-ending primitive (ADR-347),
 * sitting beside the player-death primitive it is modelled on.
 */

import type { ISemanticEvent } from '@sharpee/core';
import { createEvent } from '@sharpee/core';
import type { IStoryEnding, StoryEndingKind } from '@sharpee/if-domain';
import { StoryEndingEvents } from '@sharpee/if-domain';
import type { WorldModel } from '@sharpee/world-model';

/**
 * Options for {@link endStory}.
 */
export interface IEndStoryOptions {
  /**
   * The turn the story ended on. Required, because {@link IStoryEnding}
   * records it as a fact and there is no honest default: the world holds
   * no turn counter, so only the declaring site knows.
   */
  turn: number;

  /**
   * Message ID of the ending phrase, when the author supplied one.
   *
   * It rides the event as `endingMessageId`, never as a top-level
   * `messageId`: the engine's ADR-097 domain-message handler renders any
   * event carrying `data.messageId`, and a `win`/`lose` statement already
   * emits the phrase through the ordinary phrase path, so carrying it as
   * `messageId` printed every story's final paragraph twice (GH #274).
   */
  messageId?: string;

  /** Free-form cause, e.g. the `cause` a player death carried. */
  cause?: string;
}

/**
 * End the story: record the Ending on the world and produce the blessed
 * ending event.
 *
 * First ending wins. Called on a world that already carries an Ending, this
 * writes nothing, emits nothing, and returns `undefined` — the precedent is
 * `killPlayer`, idempotent for the same reason (`engine/src/turn/detect-death.ts`):
 * when several fire in one turn the first is authoritative. An ending that
 * could be overwritten would make the Ending's `turn` a lie and give one
 * conclusion two closing events.
 *
 * @param world the world that owns the Ending
 * @param kind victory or defeat
 * @param opts the turn it happened on (required), plus an optional
 *   ending-phrase message id and cause
 * @returns the blessed ending event, or `undefined` if the story had already ended
 */
export function endStory(
  world: WorldModel,
  kind: StoryEndingKind,
  opts: IEndStoryOptions,
): ISemanticEvent | undefined {
  // Already ended → no-op (first ending wins; prevents two closing events).
  if (world.getEnding() !== undefined) {
    return undefined;
  }

  const ending: IStoryEnding = {
    kind,
    turn: opts.turn,
    ...(opts.messageId !== undefined ? { messageId: opts.messageId } : {}),
    ...(opts.cause !== undefined ? { cause: opts.cause } : {}),
  };
  world.setEnding(ending);

  return createEvent(
    kind === 'victory' ? StoryEndingEvents.VICTORY : StoryEndingEvents.DEFEAT,
    {
      ending: kind,
      ...(opts.messageId !== undefined ? { endingMessageId: opts.messageId } : {}),
      ...(opts.cause !== undefined ? { cause: opts.cause } : {}),
    },
  );
}
