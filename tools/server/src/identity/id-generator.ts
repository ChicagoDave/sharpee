/**
 * Crockford base32 Id generator (ADR-161).
 *
 * Public interface: {@link generateId}, {@link isWellFormedId},
 * {@link CROCKFORD_ALPHABET}, {@link ID_PATTERN}.
 *
 * Bounded context: identity (server-internal generator used by
 * `POST /api/identities` and `POST /api/identities/upload`).
 *
 * Format: 8 symbols from the 32-symbol Crockford base32 alphabet
 * (`0-9` + `A-Z` minus `I`, `L`, `O`, `U` — the four ambiguous letters),
 * formatted as `XXXX-XXXX`. The dash is part of the canonical form.
 *
 * Crockford was chosen so a downloaded CSV can be eyeballed without
 * confusable-character risk: no `O`/`0` mix-up, no `I`/`l`/`1` mix-up,
 * and the two visually similar Cs (`C` and `Q`) stay distinguishable.
 *
 * Uniqueness is enforced by the DB (UNIQUE PK on `identities.id`); this
 * generator does not consult the DB. The HTTP route loops with a small
 * retry budget on UNIQUE collision (~1.1 trillion combinations make this
 * practically unreachable, but the route still defends against it).
 */

import { randomInt } from 'node:crypto';

/** The 32-symbol Crockford base32 alphabet, excluding I, L, O, U. */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Canonical form regex: `XXXX-XXXX`, uppercase Crockford symbols only. */
export const ID_PATTERN = /^[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}$/;

const ID_LENGTH = 8;

/**
 * Return a fresh Id in the form `XXXX-XXXX` with each symbol drawn
 * uniformly at random from {@link CROCKFORD_ALPHABET}. Uses
 * `crypto.randomInt` so the distribution is unbiased (a naive
 * `Math.floor(Math.random() * 32)` would pick up modulo bias depending
 * on the underlying RNG).
 */
export function generateId(): string {
  let out = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    out += CROCKFORD_ALPHABET[randomInt(CROCKFORD_ALPHABET.length)];
    if (i === 3) out += '-';
  }
  return out;
}

/**
 * True iff `value` is a string matching {@link ID_PATTERN}. The caller
 * is responsible for any upstream normalization (uppercase, trim) — this
 * function does not normalize. Lowercase or whitespace-padded inputs
 * return false intentionally.
 */
export function isWellFormedId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}
