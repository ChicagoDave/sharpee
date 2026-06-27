/**
 * English (US) sound prose defaults — per-`(kind, audibility_tier)` (ADR-172).
 *
 * The language layer renders each `AudibilityEvent` by looking up
 * `sound.heard.<kind>.<tier>` in this table. If a kind-specific entry
 * is missing, the consumer falls back to `sound.heard.default.<tier>`
 * (i.e. the platform default phrasing for that tier).
 *
 * Scope:
 *
 *  - **Tier set** — `full`, `muffled`, `fragments`, `presence-only`.
 *    `silent` does not reach the prose layer (the engine suppresses
 *    delivery of silent events).
 *  - **Kinds shipped** — `default` (fallback), `speech` (NPC dialogue,
 *    the most common content-bearing kind), and `ambient` (footsteps,
 *    machinery, doors slamming — content-less environmental sounds).
 *    Story authors override per kind via the standard message-override
 *    mechanism, and add new kinds as their sound vocabulary grows.
 *
 * Templates use `{content}` for the message rendered from the
 * `AudibilityEvent.content` payload (only meaningful at `full` and
 * `muffled` tiers; story-side rendering may decide to suppress
 * `{content}` at `muffled` and substitute a distortion phrasing).
 * `{kind}` is the raw kind string (used in fallback prose so the
 * listener at least learns what *sort* of sound passed through).
 *
 * Phase 5 ships the data table. Phase 6's action-integration work
 * resolves the message-id dynamically from each delivered
 * `AudibilityEvent` and feeds the result into the main text channel.
 *
 * @see ADR-172 — Spatial Sound Propagation §Audibility tier, §Channel routing
 */

export const soundMessages = {
  // ────────────────────────────────────────────────────────────────────
  //  Default fallbacks — used when no kind-specific entry exists
  // ────────────────────────────────────────────────────────────────────

  'sound.heard.default.full': '{You} {hear} {verbatim:kind}.',
  'sound.heard.default.muffled': '{You} {hear} a muffled {verbatim:kind}.',
  'sound.heard.default.fragments': '{You} {catch} broken {verbatim:kind}.',
  'sound.heard.default.presence-only': '{You} {hear} something distant.',

  // ────────────────────────────────────────────────────────────────────
  //  Speech — content-bearing dialogue (NPCs, conversations)
  // ────────────────────────────────────────────────────────────────────

  'sound.heard.speech.full': '{You} {hear}: "{verbatim:content}"',
  'sound.heard.speech.muffled': '{You} {catch} a muffled voice: "{verbatim:content}"',
  'sound.heard.speech.fragments': '{You} {catch} fragments of speech.',
  'sound.heard.speech.presence-only': '{You} {hear} voices nearby.',

  // ────────────────────────────────────────────────────────────────────
  //  Ambient — environmental sounds (footsteps, doors, mechanical)
  // ────────────────────────────────────────────────────────────────────

  'sound.heard.ambient.full': '{You} {hear} {verbatim:kind}.',
  'sound.heard.ambient.muffled': '{You} {hear} a muffled {verbatim:kind}.',
  'sound.heard.ambient.fragments': '{You} {catch} the faint sound of {verbatim:kind}.',
  'sound.heard.ambient.presence-only': '{You} {hear} something at the edge of hearing.',
} as const;

export type SoundMessageId = keyof typeof soundMessages;

/**
 * The four audibility tiers the prose layer renders. The fifth tier
 * (`silent`) is filtered upstream and never reaches rendering.
 */
export type RenderableAudibilityTier = 'full' | 'muffled' | 'fragments' | 'presence-only';

/**
 * Build a message id from a sound kind and the listener's audibility
 * tier. The id has the form `sound.heard.<kind>.<tier>`.
 *
 * Callers fall back to `sound.heard.default.<tier>` when the
 * kind-specific id is not registered. This helper is namespace-only —
 * it does not perform the fallback itself; that decision lives at the
 * call site (typically Phase 6's action integration).
 */
export function soundMessageId(kind: string, tier: RenderableAudibilityTier): string {
  return `sound.heard.${kind}.${tier}`;
}

/**
 * Convenience helper for the fallback id. When `soundMessageId(kind,
 * tier)` is not registered, callers use the result of
 * `soundFallbackMessageId(tier)` instead.
 */
export function soundFallbackMessageId(tier: RenderableAudibilityTier): string {
  return `sound.heard.default.${tier}`;
}
