/**
 * Seed derivation — per-point stream seeds from the master seed (ADR-293 D3).
 *
 * Public interface: `SEED_DERIVATION_VERSION`, `deriveStreamSeed(masterSeed, pointName)`.
 * Owner context: @sharpee/core random substrate; engine's RandomService implementation
 * is the intended caller.
 *
 * This is a COMPATIBILITY SURFACE: saves persist stream states derived through this
 * function, so its output for a given (masterSeed, pointName) pair must never change
 * within a `SEED_DERIVATION_VERSION`. A pinned-value test guards it; any algorithm
 * change requires bumping the version constant.
 */

/**
 * Version of the seed-derivation algorithm. Bump on ANY change to
 * `deriveStreamSeed`'s output for existing inputs (ADR-293 D3).
 */
export const SEED_DERIVATION_VERSION = 1;

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Derive a point's stream seed from the master seed and the point's name.
 *
 * FNV-1a (32-bit) over the point name's UTF-16 code units, then folded over the
 * four bytes of the master seed (little-endian byte order). Point names are
 * dotted ASCII by convention (ADR-293 D2), so code units and bytes coincide.
 *
 * Properties (both load-bearing, ADR-293 D3):
 * - Order-independent: a pure function of (masterSeed, pointName) — never of
 *   registration or first-draw order.
 * - Decorrelated: nearby names and nearby master seeds produce unrelated seeds,
 *   unlike ordinal/additive derivation over the core LCG.
 *
 * @param masterSeed - the session's master seed (treated as unsigned 32-bit)
 * @param pointName - the declared point name, e.g. 'dungeo.melee.blow.hero'
 * @returns an unsigned 32-bit seed for the point's stream
 */
export function deriveStreamSeed(masterSeed: number, pointName: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < pointName.length; i++) {
    hash ^= pointName.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  const seed = masterSeed >>> 0;
  for (let byte = 0; byte < 4; byte++) {
    hash ^= (seed >>> (byte * 8)) & 0xff;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}
