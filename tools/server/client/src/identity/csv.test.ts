/**
 * Identity CSV behavior tests (ADR-161 portability).
 *
 * Behavior Statement — parseIdentityCsv / formatIdentityCsv
 *   DOES: parse rejects malformed input with a specific error code;
 *         accepts a single comma-separated row of 3 trimmed fields
 *         (id Crockford XXXX-XXXX, handle 3–12 alpha, non-empty
 *         passcode). format produces a CSV row with trailing newline.
 *         The pair round-trips: parse(format(x)) === x.
 *   WHEN: Upload Identity reads a CSV file the user previously
 *         downloaded; Erase modal's Download CSV writes one.
 *   BECAUSE: portability across browsers/devices is via a file the user
 *            keeps. The format must be human-readable and round-trippable.
 *   REJECTS WHEN: empty input; wrong column count; missing fields;
 *                 malformed Id (regex fail); out-of-spec Handle (length
 *                 or non-alpha); empty passcode.
 */

import { describe, expect, it } from 'vitest';
import { formatIdentityCsv, parseIdentityCsv } from './csv';

describe('identity/csv — parseIdentityCsv', () => {
  it('parses a valid row with no trailing newline', () => {
    const res = parseIdentityCsv('1234-ABCD,Alice,plate-music');
    expect(res).toEqual({
      ok: true,
      id: '1234-ABCD',
      handle: 'Alice',
      passcode: 'plate-music',
    });
  });

  it('parses a valid row with a trailing newline', () => {
    const res = parseIdentityCsv('1234-ABCD,Alice,plate-music\n');
    expect(res).toEqual({
      ok: true,
      id: '1234-ABCD',
      handle: 'Alice',
      passcode: 'plate-music',
    });
  });

  it('parses a valid row with a trailing CRLF', () => {
    const res = parseIdentityCsv('1234-ABCD,Alice,plate-music\r\n');
    expect(res).toEqual({
      ok: true,
      id: '1234-ABCD',
      handle: 'Alice',
      passcode: 'plate-music',
    });
  });

  it('trims whitespace per field', () => {
    const res = parseIdentityCsv('  1234-ABCD , Alice ,  plate-music  ');
    expect(res).toEqual({
      ok: true,
      id: '1234-ABCD',
      handle: 'Alice',
      passcode: 'plate-music',
    });
  });

  it('rejects empty input as empty_input', () => {
    expect(parseIdentityCsv('')).toEqual({ ok: false, error: 'empty_input' });
  });

  it('rejects whitespace-only input as empty_input', () => {
    expect(parseIdentityCsv('   \n')).toEqual({ ok: false, error: 'empty_input' });
  });

  it('rejects multi-row input as wrong_column_count', () => {
    const res = parseIdentityCsv(
      '1234-ABCD,Alice,plate-music\nWXYZ-1234,Bob,key-stone',
    );
    expect(res).toEqual({ ok: false, error: 'wrong_column_count' });
  });

  it('rejects a row with too few columns as wrong_column_count', () => {
    expect(parseIdentityCsv('1234-ABCD,Alice')).toEqual({
      ok: false,
      error: 'wrong_column_count',
    });
  });

  it('rejects a row with too many columns as wrong_column_count', () => {
    expect(parseIdentityCsv('1234-ABCD,Alice,plate-music,extra')).toEqual({
      ok: false,
      error: 'wrong_column_count',
    });
  });

  it('rejects an empty id field as missing_field', () => {
    expect(parseIdentityCsv(',Alice,plate-music')).toEqual({
      ok: false,
      error: 'missing_field',
    });
  });

  it('rejects an empty handle field as missing_field', () => {
    expect(parseIdentityCsv('1234-ABCD,,plate-music')).toEqual({
      ok: false,
      error: 'missing_field',
    });
  });

  it('rejects an empty passcode field as missing_field', () => {
    expect(parseIdentityCsv('1234-ABCD,Alice,')).toEqual({
      ok: false,
      error: 'missing_field',
    });
  });

  it('rejects a lowercase id as malformed_id', () => {
    expect(parseIdentityCsv('1234-abcd,Alice,plate-music')).toEqual({
      ok: false,
      error: 'malformed_id',
    });
  });

  it('rejects an id missing the dash as malformed_id', () => {
    expect(parseIdentityCsv('1234ABCD,Alice,plate-music')).toEqual({
      ok: false,
      error: 'malformed_id',
    });
  });

  it('rejects an id containing a forbidden Crockford letter (I) as malformed_id', () => {
    expect(parseIdentityCsv('I234-ABCD,Alice,plate-music')).toEqual({
      ok: false,
      error: 'malformed_id',
    });
  });

  it('rejects a handle shorter than 3 chars as invalid_handle', () => {
    expect(parseIdentityCsv('1234-ABCD,ab,plate-music')).toEqual({
      ok: false,
      error: 'invalid_handle',
    });
  });

  it('rejects a handle longer than 12 chars as invalid_handle', () => {
    expect(parseIdentityCsv(`1234-ABCD,${'a'.repeat(13)},plate-music`)).toEqual({
      ok: false,
      error: 'invalid_handle',
    });
  });

  it('rejects a handle with digits as invalid_handle', () => {
    expect(parseIdentityCsv('1234-ABCD,Alice7,plate-music')).toEqual({
      ok: false,
      error: 'invalid_handle',
    });
  });

  it('rejects a handle with spaces as invalid_handle', () => {
    // After trim, the inner space is preserved in the field; reject as non-alpha.
    expect(parseIdentityCsv('1234-ABCD,Al ice,plate-music')).toEqual({
      ok: false,
      error: 'invalid_handle',
    });
  });
});

describe('identity/csv — formatIdentityCsv', () => {
  it('formats with a trailing newline', () => {
    expect(
      formatIdentityCsv({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' }),
    ).toBe('1234-ABCD,Alice,plate-music\n');
  });
});

describe('identity/csv — round-trip', () => {
  it('parse(format(x)) === x', () => {
    const original = { id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' };
    const parsed = parseIdentityCsv(formatIdentityCsv(original));
    expect(parsed).toEqual({ ok: true, ...original });
  });

  it('preserves Handle case', () => {
    const original = { id: '1234-ABCD', handle: 'CamelCase', passcode: 'plate-music' };
    const parsed = parseIdentityCsv(formatIdentityCsv(original));
    expect(parsed).toEqual({ ok: true, ...original });
  });
});
