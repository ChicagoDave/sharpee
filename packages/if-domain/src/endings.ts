/**
 * @file Story ending contract (ADR-210 Platform Prerequisite 3).
 *
 * Purpose: bless the story-ending convention as a stable wire contract — the
 * event types stories/loaders emit when a story ends, and the shape of the
 * Ending the world carries (ADR-347 D2a). No behavior lives here; emitters
 * build the events with existing primitives.
 *
 * Public interface: `StoryEndingEvents`, `StoryEndingKind`,
 * `IStoryEndingData`, `IStoryEnding`.
 *
 * Owner context: `@sharpee/if-domain` — shared by the story-loader (emits on
 * `win`/`lose`), the engine/clients (react to endings), and transcript tests
 * (assert on the event types), so per the co-located wire-type rule it lives
 * here. INVARIANT: the event-type values are frozen contract — changing them
 * breaks golden transcripts; additions only.
 */

/** Semantic event types emitted when a story ends. */
export const StoryEndingEvents = {
  /** The player has won (`win` in Chord; `story.victory` by convention). */
  VICTORY: 'story.victory',
  /** The player has lost (`lose` in Chord; `story.defeat` by convention). */
  DEFEAT: 'story.defeat',
} as const;

/** How a story ended. */
export type StoryEndingKind = 'victory' | 'defeat';

/** Payload carried by a `StoryEndingEvents` event. */
export interface IStoryEndingData {
  ending: StoryEndingKind;
  /** Message ID of the ending phrase, when the author supplied one. */
  messageId?: string;
}

/**
 * The ending a story reached, or absent while play continues (ADR-347 D1, D2d).
 *
 * A story that has not ended carries no Ending — which is a different
 * statement from "carries an Ending that says nothing". Once written it is
 * final: the first ending wins (`endStory`'s rejection rule), so a reader
 * may treat `turn` as the turn the conclusion actually happened on.
 */
export interface IStoryEnding {
  /** Victory or defeat. */
  readonly kind: StoryEndingKind;

  /**
   * The turn the story ended on.
   *
   * Required, so a client can always say *when* and a save can always say
   * whether the ending it carries is the one it was written at. The world
   * holds no turn counter, so the declaring site supplies it — Chord's
   * runtime has `turnNow`, the engine's stages have `context.turn`. A
   * headless Chord run with no engine turn provider wired records `0`,
   * which is `turnNow`'s existing fallback and the same answer timers get.
   */
  readonly turn: number;

  /**
   * Message ID of the ending phrase, when the author supplied one. It
   * identifies the phrase; it does not render it (GH #274) — same rule as
   * {@link IStoryEndingData.messageId}.
   */
  readonly messageId?: string;

  /** Free-form cause, e.g. the `cause` a player death carried. */
  readonly cause?: string;
}
