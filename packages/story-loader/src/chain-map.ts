/**
 * chain-map.ts — Chord chain-alias → platform chain registration (ADR-094 + the
 * `define chain … from` hatch).
 *
 * Purpose: a Chord author replaces a stdlib event chain by its curated kebab
 * alias (`define chain opened-revealed from "./reveal.ts"`); the compiler keeps
 * the alias platform-free (validated against `STDLIB_CHAIN_NAMES` in chord's
 * catalog). This module is the single place that knows the dotted platform
 * facts — the chain KEY (so the author's handler REPLACES the stdlib one via
 * `world.chainEvent`, same key), the TRIGGER event type, and the stdlib PRIORITY.
 *
 * Public interface: `resolveChain(alias)`. `CHORD_CHAIN_MAP` is exported for the
 * conformance test, which pins the key against stdlib's `OPENED_REVEALED_CHAIN_KEY`.
 *
 * Owner context: @sharpee/story-loader (Chord-IR → platform bindings), the same
 * Interface-Contract seam as `event-id-map.ts` / `message-alias-map.ts`.
 */

/** The platform registration for one replaceable stdlib chain. */
export interface ChainRegistration {
  /** Dotted platform chain key — matching it makes the hatch REPLACE the stdlib chain. */
  key: string;
  /** The event type the chain fires on (`world.chainEvent` trigger). */
  trigger: string;
  /** The stdlib priority for this chain (kept identical so replacement is in-place). */
  priority: number;
}

/**
 * Chord chain alias (dotless, as authored + validated by chord's `STDLIB_CHAIN_NAMES`)
 * → its platform registration. One stdlib chain exists today (ADR-094 opened→revealed);
 * the conformance test pins `opened-revealed`'s key against `OPENED_REVEALED_CHAIN_KEY`.
 */
export const CHORD_CHAIN_MAP: Readonly<Record<string, ChainRegistration>> = {
  'opened-revealed': { key: 'stdlib.chain.opened-revealed', trigger: 'if.event.opened', priority: 100 },
};

/**
 * Resolve a Chord chain alias to its platform registration.
 * @param alias the dotless chain alias from a `define chain` hatch
 * @returns the `{ key, trigger, priority }`, or undefined for an unknown alias
 *   (the chord analyzer's `analysis.unknown-chain` gate catches this first)
 */
export function resolveChain(alias: string): ChainRegistration | undefined {
  return CHORD_CHAIN_MAP[alias];
}
