/**
 * @module tests/auth/passcode.test
 * @purpose Verify the scrypt-based passcode hash round-trips correctly,
 *   produces different hashes for identical inputs (random salt), and
 *   rejects malformed encoded hashes without throwing.
 * @owner Zifmia server (tools/zifmia/tests/auth).
 */

import { describe, expect, it } from 'vitest';

import { hashPasscode, verifyPasscode } from '../../src/auth/passcode';

describe('scrypt passcode', () => {
  it('verifyPasscode returns true for the original passcode', async () => {
    const hash = await hashPasscode('correct passcode');
    expect(await verifyPasscode('correct passcode', hash)).toBe(true);
  });

  it('verifyPasscode returns false for a wrong passcode', async () => {
    const hash = await hashPasscode('correct passcode');
    expect(await verifyPasscode('wrong passcode', hash)).toBe(false);
  });

  it('generates different hashes for the same input (random salt)', async () => {
    const a = await hashPasscode('same input');
    const b = await hashPasscode('same input');
    expect(a).not.toBe(b);
    // Both must still verify.
    expect(await verifyPasscode('same input', a)).toBe(true);
    expect(await verifyPasscode('same input', b)).toBe(true);
  });

  it('returns false for malformed encoded hash (no throw)', async () => {
    expect(await verifyPasscode('anything', 'not-a-real-hash')).toBe(false);
    expect(await verifyPasscode('anything', 'scrypt$too$few$fields')).toBe(false);
  });

  it('encoded hash uses the documented self-describing format', async () => {
    const hash = await hashPasscode('format check');
    const parts = hash.split('$');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('scrypt');
    expect(parts[4]).toMatch(/^[0-9a-f]+$/); // salt hex
    expect(parts[5]).toMatch(/^[0-9a-f]+$/); // derived key hex
  });
});
