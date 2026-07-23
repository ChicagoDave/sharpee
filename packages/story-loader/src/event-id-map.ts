/**
 * event-id-map.ts — Chord-event-id → platform-event-id translation (ADR-256).
 *
 * Purpose: Chord is dotless (ADR-254) — an author writes `emit media-sound-play`
 * — but the TS platform keeps its dotted `media.*` event ids untouched. This
 * module is the single place that knows both spellings, so the Chord compiler
 * stays platform-free (ADR-256 D1) and no rename lands in stdlib/engine.
 *
 * Public interface: `translateEventId(chordId)` — forward-translate a Chord IR
 * event id to the runtime event type applied at all three event seams (emit,
 * channel `from event`, machine `when event`). `CHORD_TO_PLATFORM_EVENT_ID` —
 * the pinned map, exported for the conformance test only.
 *
 * Owner context: @sharpee/story-loader (Chord-IR → platform bindings). The map
 * is a runtime table, distinct from `event-contract.ts` (a compile-time drift
 * guard); a `media.*` rename in stdlib is caught by `event-id-map.test.ts`.
 */

/**
 * Chord event id (dotless, as it appears in the compiled IR) → platform event
 * id (dotted, unchanged, as stdlib's channels consume it). Only Chord↔platform
 * events appear here; a story's own author events (`chord-compass-updated`,
 * `gatehouse-watch-report`, …) are emitted and consumed within Chord as their
 * kebab string and are deliberately absent — `translateEventId` passes them
 * through (ADR-256 D3).
 *
 * The initial set is stdlib's `media.*` registry (`stdlib/channels/media.ts`).
 * Each entry is the platform id with `.` → `-`; the conformance test pins this
 * table against the live `MEDIA_EVENT_TYPES` so a platform rename fails the build.
 */
export const CHORD_TO_PLATFORM_EVENT_ID: Readonly<Record<string, string>> = {
  'media-sound-play': 'media.sound.play',
  'media-image-show': 'media.image.show',
  'media-image-hide': 'media.image.hide',
  'media-image-preload': 'media.image.preload',
  'media-music-play': 'media.music.play',
  'media-music-stop': 'media.music.stop',
  'media-ambient-play': 'media.ambient.play',
  'media-ambient-stop': 'media.ambient.stop',
  'media-animation-play': 'media.animation.play',
  'media-animate': 'media.animate',
  'media-transition': 'media.transition',
  'media-layout-configure': 'media.layout.configure',
  'media-clear': 'media.clear',
};

/**
 * Forward-translate a Chord IR event id to the platform runtime event type.
 * A mapped Chord↔platform event (the `media.*` set) resolves to its dotted
 * platform id; an author event with no entry passes through unchanged. Applied
 * identically at every event seam so emit and subscribe always agree.
 *
 * @param chordId the event id as it appears in the compiled Chord IR (dotless)
 * @returns the platform runtime event type (dotted for platform events, the
 *   unchanged kebab id for author events)
 */
export function translateEventId(chordId: string): string {
  return CHORD_TO_PLATFORM_EVENT_ID[chordId] ?? chordId;
}
