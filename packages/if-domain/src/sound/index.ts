/**
 * @sharpee/if-domain/sound — spatial sound propagation type contracts.
 *
 * Owner context: domain layer. Single canonical home for the sound
 * type contracts shared between emission (stdlib), propagation (engine),
 * and rendering (lang-{locale}, audio-capable clients).
 *
 * Public interface:
 *
 *  - `VolumeTier`, `VOLUME_TIER_BUDGETS` — emission-side volume tier set.
 *  - `AudibilityTier` — listener-side audibility tier set.
 *  - `SoundKind` — semantic classifier string.
 *  - `ISoundContent` — optional structured content payload.
 *  - `ISound` — emission shape for `context.emitSound`.
 *  - `IAudibilityEvent` — per-listener delivery shape produced by
 *    propagation and routed through the sound channel.
 *
 * @see ADR-172 — Spatial Sound Propagation
 */

export * from './types';
