/**
 * @file Sound and AudibilityEvent domain types (ADR-172).
 *
 * The wire-level contract between sound emission, propagation, and
 * rendering. This file defines:
 *
 *  - `VolumeTier` — the discrete emission-volume tier set
 *    (whisper / subdued / normal / raised / shouting) with platform
 *    propagation budgets.
 *  - `AudibilityTier` — the discrete listener-side tier set
 *    (silent / presence-only / fragments / muffled / full).
 *  - `Sound` — the emission shape an action constructs and hands to
 *    `context.emitSound` (Phase 6).
 *  - `AudibilityEvent` — the per-listener delivery shape produced by
 *    the propagation function (Phase 3) and routed through the sound
 *    channel (Phase 5).
 *
 * No behavior — pure shapes. Propagation logic lands in
 * `@sharpee/engine` (Phase 3); trait definitions land in
 * `@sharpee/world-model` (Phase 2). Both depend on this file.
 *
 * Owner context: `@sharpee/if-domain` — domain-layer contracts.
 *
 * @see ADR-172 — Spatial Sound Propagation
 * @see ADR-173 — Wall Adjacency Primitive (substrate this rides on)
 */

import type { EntityId } from '@sharpee/core';

// =============================================================================
// Volume tier — emission side
// =============================================================================

/**
 * The five discrete volume tiers an emitter may declare. Ordered from
 * quietest to loudest. Each tier has an integer propagation budget (see
 * `VOLUME_TIER_BUDGETS`); the propagation algorithm subtracts accumulated
 * path cost from this budget to compute clarity at each listener.
 *
 * Discrete tiers are deliberate over continuous numeric volumes: authoring
 * is qualitative, prose layers render per-tier, and continuous values
 * invite balance tuning that produces no gameplay value.
 */
export type VolumeTier = 'whisper' | 'subdued' | 'normal' | 'raised' | 'shouting';

/**
 * Platform-default propagation budgets per volume tier (ADR-172). Stories
 * that want a different acoustic register (a horror story with sound that
 * carries unnaturally far, a soundproofed-bunker setting) override this
 * table without the platform code changing.
 *
 * The budget is consumed against accumulated path cost during propagation;
 * negative remainders below 1 collapse to `silent`.
 */
export const VOLUME_TIER_BUDGETS: Readonly<Record<VolumeTier, number>> = Object.freeze({
  whisper: 1,
  subdued: 2,
  normal: 5,
  raised: 7,
  shouting: 9,
});

// =============================================================================
// Audibility tier — listener side
// =============================================================================

/**
 * The five discrete audibility tiers the propagation function reports per
 * listener. `silent` means the listener does not perceive the sound and
 * receives no event; the other four are delivered as `AudibilityEvent`s
 * with rendering modulated by tier.
 *
 *  - `presence-only` — the listener knows a sound occurred (kind, rough
 *    direction) but no content passes.
 *  - `fragments`     — partial content; key words, broken phrases.
 *  - `muffled`       — full content, rendered with distortion framing at
 *    the prose layer.
 *  - `full`          — verbatim; clean reception.
 */
export type AudibilityTier = 'silent' | 'presence-only' | 'fragments' | 'muffled' | 'full';

// =============================================================================
// Sound — emission shape
// =============================================================================

/**
 * A sound's *kind*: a coarse semantic classifier the rendering layer uses
 * to pick per-`(kind, audibility_tier)` prose defaults. New kinds are
 * added as the platform grows; this is a string union, not a closed enum,
 * to keep the type extensible to story-level kinds.
 *
 * Examples chosen from ADR-172's running examples; this list is *not*
 * exhaustive and not part of the platform contract — story code may pass
 * any string here, with the language layer falling through to a generic
 * default if no per-kind prose is registered.
 */
export type SoundKind = string;

/**
 * Optional structured content for a sound. Content-bearing sounds carry
 * a content payload that audibility tier modulates: at `full` the content
 * is verbatim; at `muffled` it's distorted; at `fragments` only key
 * fragments pass; at `presence-only` no content passes (the listener
 * only knows the sound happened).
 *
 * The shape carries a `messageId` (resolved by the language layer) and
 * optional `params` for templating. Pattern-as-content (knock codes,
 * rhythmic taps) is *not* a separate dimension — it composes through
 * the same content + tier pipeline, with the language layer rendering
 * pattern degradation per tier.
 */
export interface ISoundContent {
  /** Message ID resolved by the language layer (e.g. story-authored line ID). */
  messageId: string;
  /** Optional params for the message template; keys depend on the messageId. */
  params?: Readonly<Record<string, unknown>>;
}

/**
 * The emission shape an action hands to the platform's sound dispatcher.
 *
 * `sourceLocation` is the room-id the sound originates from; the
 * propagation function uses it as the path-search root. `sourceEntity`
 * is the entity that produced the sound (an actor, a device, an
 * inanimate object) — propagation does not consult it, but downstream
 * handlers and prose templates may.
 *
 * `kind` is the semantic classifier (see `SoundKind`). `volumeTier` is
 * the emission-side tier (see `VolumeTier`). `content` is optional;
 * sounds without content are *ambient* (a gunshot, breaking glass, a
 * closing door) and the prose layer renders the sound itself rather
 * than its content.
 */
export interface ISound {
  readonly sourceLocation: EntityId;
  readonly sourceEntity: EntityId;
  readonly kind: SoundKind;
  readonly volumeTier: VolumeTier;
  readonly content?: ISoundContent;
}

// =============================================================================
// AudibilityEvent — per-listener delivery shape
// =============================================================================

/**
 * The per-listener event the propagation function produces and the sound
 * channel routes. Carries enough context for both prose rendering and
 * audio-cue mapping.
 *
 *  - `sourceRoomId`   — room-id where the sound was emitted.
 *  - `targetRoomId`   — room-id the listener is in when the sound reaches
 *                       them (typically the listener's current room).
 *  - `wallId`         — the wall entity-id whose acoustic cost contributed
 *                       to the lowest-cost path, when the path crosses one
 *                       wall. Optional — may be absent for paths that go
 *                       through doors, conduits, or are within the same
 *                       room. Future ADRs may extend this to a path of
 *                       crossings; today the field is single-valued for
 *                       common single-hop cases.
 *  - `sourceEntityId` — the entity that emitted the sound (mirrors
 *                       `Sound.sourceEntity`).
 *  - `kind`           — the sound's kind, copied from the emission.
 *  - `volumeTier`     — the emission's volume tier, copied as-emitted.
 *  - `audibilityTier` — the propagation result for this listener.
 *                       Never `silent`: silent results suppress event
 *                       delivery entirely (no `AudibilityEvent` is
 *                       produced).
 *  - `content`        — copied from the emission iff content-bearing.
 *  - `timestamp`      — engine-provided turn-sequence integer for ordering.
 *
 * The prose layer maps `(kind, audibilityTier)` to a default rendering
 * pattern; stories override per-kind. The audio-channel renderer maps
 * `audibilityTier` to a playback volume via ADR-169's fade infrastructure.
 *
 * Adding fields to this interface requires a future ADR — it is the
 * contract L2+ ADRs (NPC voice, conversation choreography, stealth
 * observation) ride on.
 */
export interface IAudibilityEvent {
  readonly sourceRoomId: EntityId;
  readonly targetRoomId: EntityId;
  readonly wallId?: EntityId;
  readonly sourceEntityId: EntityId;
  readonly kind: SoundKind;
  readonly volumeTier: VolumeTier;
  /** Always one of the *delivered* tiers — never `'silent'`. */
  readonly audibilityTier: Exclude<AudibilityTier, 'silent'>;
  readonly content?: ISoundContent;
  readonly timestamp: number;
}
