/**
 * Crockford-32 join-code generator per ADR-177 carry-forward §Carries
 * forward — "Join code — short shareable Crockford-32 token, unique
 * per room."
 *
 * Public interface: {@link generateJoinCode}, {@link CROCKFORD_ALPHABET},
 * {@link JOIN_CODE_LENGTH}.
 * Owner: zifmia server, rooms domain. Pure RNG; no I/O.
 *
 * Crockford-32 excludes I, L, O, U to avoid visual confusion. With an
 * 8-character code the keyspace is 32^8 ≈ 1.1 trillion — collisions
 * during room creation are statistically negligible at the scale this
 * product targets (the IF community), but the repository still runs a
 * uniqueness retry loop to be safe.
 */

import { randomInt } from 'node:crypto';

export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const JOIN_CODE_LENGTH = 8;

/**
 * Generate a fresh Crockford-32 join code. The caller is responsible
 * for uniqueness checking against the rooms table.
 */
export function generateJoinCode(length: number = JOIN_CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CROCKFORD_ALPHABET[randomInt(0, CROCKFORD_ALPHABET.length)];
  }
  return out;
}

/**
 * Normalize user-entered join codes (lobby "I have a code" flow). The
 * Crockford-32 spec maps `i/I/l/L → 1`, `o/O → 0`, `u/U → V`, and is
 * case-insensitive. Returns the canonical uppercase form, or
 * `undefined` if the input contains characters outside Crockford-32
 * after normalization.
 */
export function normalizeJoinCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  let out = '';
  for (const ch of raw.toUpperCase()) {
    let mapped = ch;
    if (mapped === 'I' || mapped === 'L') mapped = '1';
    else if (mapped === 'O') mapped = '0';
    else if (mapped === 'U') mapped = 'V';
    if (!CROCKFORD_ALPHABET.includes(mapped)) return undefined;
    out += mapped;
  }
  return out.length === 0 ? undefined : out;
}
