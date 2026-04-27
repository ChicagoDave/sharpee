/**
 * Identity CSV — round-trippable file format for cross-device portability
 * (ADR-161).
 *
 * Public interface: {@link parseIdentityCsv}, {@link formatIdentityCsv},
 * {@link IdentityCsvError}, {@link IdentityCsvParseResult}.
 *
 * Bounded context: client-side identity portability. The file is what the
 * user keeps to move their identity between browsers/devices.
 *
 * Format: a single row of three comma-separated fields with a trailing
 * newline:
 *
 *   `<id>,<handle>,<passcode>\n`
 *
 *   - `id` is Crockford-32 form `XXXX-XXXX` (mirrors the server's
 *     `ID_PATTERN`).
 *   - `handle` is 3–12 alpha-only characters (mirrors ADR-161).
 *   - `passcode` is the EFF word-pair (e.g. `plate-music`); the parser
 *     does not constrain its shape beyond non-empty so future passcode
 *     formats parse without a client release.
 *
 * No header row, no quoting, no escaping. Whitespace per field is trimmed.
 * Extra columns or missing fields are rejected — there is no degraded
 * partial-parse mode.
 */

const ID_PATTERN = /^[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}$/;
const HANDLE_PATTERN = /^[A-Za-z]+$/;
const HANDLE_MIN = 3;
const HANDLE_MAX = 12;

export type IdentityCsvError =
  | 'empty_input'
  | 'wrong_column_count'
  | 'missing_field'
  | 'malformed_id'
  | 'invalid_handle'
  | 'malformed_passcode';

export type IdentityCsvParseResult =
  | { ok: true; id: string; handle: string; passcode: string }
  | { ok: false; error: IdentityCsvError };

/**
 * Parse a single CSV row into the `(id, handle, passcode)` triple.
 *
 * Returns a discriminated result so callers can branch on `ok` without
 * losing the specific error code — the UI maps codes to inline copy.
 */
export function parseIdentityCsv(text: string): IdentityCsvParseResult {
  // Strip a single optional trailing newline; any other internal newline
  // means the file has more than one row, which we reject as wrong shape.
  const trimmed = text.replace(/\r?\n$/, '');
  if (!trimmed.trim()) return { ok: false, error: 'empty_input' };
  if (/\r?\n/.test(trimmed)) return { ok: false, error: 'wrong_column_count' };

  const cells = trimmed.split(',').map((c) => c.trim());
  if (cells.length !== 3) return { ok: false, error: 'wrong_column_count' };

  const [id, handle, passcode] = cells;
  if (!id || !handle || !passcode) return { ok: false, error: 'missing_field' };

  if (!ID_PATTERN.test(id)) return { ok: false, error: 'malformed_id' };
  if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) {
    return { ok: false, error: 'invalid_handle' };
  }
  if (!HANDLE_PATTERN.test(handle)) return { ok: false, error: 'invalid_handle' };
  // Passcode shape intentionally not constrained beyond non-empty so
  // future passcode formats round-trip without a client release.
  if (passcode.length === 0) return { ok: false, error: 'malformed_passcode' };

  return { ok: true, id, handle, passcode };
}

/** Format a triple as a single CSV row with a trailing newline. */
export function formatIdentityCsv(identity: {
  id: string;
  handle: string;
  passcode: string;
}): string {
  return `${identity.id},${identity.handle},${identity.passcode}\n`;
}
