/**
 * Handle validation per ADR-161 amended.
 *
 * Public interface: {@link validateHandle}, {@link HANDLE_MIN_LENGTH},
 * {@link HANDLE_MAX_LENGTH}, {@link HANDLE_PATTERN}.
 * Owner: zifmia server, identity domain. Pure function; no I/O.
 *
 * Rules:
 *   - Length: 3..12 characters inclusive.
 *   - Characters: ASCII alphabetic only (a..z, A..Z).
 *   - Uniqueness: case-insensitive (enforced at the storage layer
 *     via `COLLATE NOCASE`, not here).
 *   - Display: case is preserved as typed.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 12;
export const HANDLE_PATTERN = /^[A-Za-z]{3,12}$/;

export type HandleValidationResult =
  | { ok: true; value: string }
  | { ok: false };

/**
 * Validate a raw handle value. Returns `{ ok: true, value }` with the
 * caller's original casing preserved, or `{ ok: false }` on any rule
 * violation. The caller decides how to surface the rejection.
 *
 * @param raw Unknown input from a request body / query string.
 */
export function validateHandle(raw: unknown): HandleValidationResult {
  if (typeof raw !== 'string') return { ok: false };
  if (raw.length < HANDLE_MIN_LENGTH) return { ok: false };
  if (raw.length > HANDLE_MAX_LENGTH) return { ok: false };
  if (!HANDLE_PATTERN.test(raw)) return { ok: false };
  return { ok: true, value: raw };
}
