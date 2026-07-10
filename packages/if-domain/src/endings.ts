/**
 * @file Story ending contract (ADR-210 Platform Prerequisite 3).
 *
 * Purpose: bless the existing story-ending convention as a stable wire
 * contract — the event types stories/loaders emit when a story ends and the
 * world-state key the generic `isComplete()` reads. No behavior lives here;
 * emitters build the events with existing primitives.
 *
 * Public interface: `StoryEndingEvents`, `STORY_ENDING_FLAG`,
 * `StoryEndingKind`, `IStoryEndingData`.
 *
 * Owner context: `@sharpee/if-domain` — shared by the story-loader (emits on
 * `win`/`lose`), the engine/clients (react to endings), and transcript tests
 * (assert on the event types), so per the co-located wire-type rule it lives
 * here. INVARIANT: values are frozen contract — changing them breaks saved
 * games and golden transcripts; additions only.
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

/**
 * World-state key holding the ending once one is reached (a
 * `StoryEndingKind`), or unset while play continues. The generic
 * `isComplete()` reads this key; stories never implement completion logic.
 */
export const STORY_ENDING_FLAG = 'story.ending';

/** Payload carried by a `StoryEndingEvents` event. */
export interface IStoryEndingData {
  ending: StoryEndingKind;
  /** Message ID of the ending phrase, when the author supplied one. */
  messageId?: string;
}
