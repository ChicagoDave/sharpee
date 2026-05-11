/**
 * @module @sharpee/zifmia/auth/passcode
 * @purpose Passcode hashing and verification using Node's built-in
 *   scrypt (`node:crypto`). No native dependency; production-safe
 *   defaults; constant-time verification.
 * @owner Zifmia server (tools/zifmia/auth).
 *
 * Hash format: `scrypt$<N>$<r>$<p>$<saltHex>$<derivedKeyHex>`. The
 * parameters are stored inline so a future tuning bump can verify
 * older hashes without a migration. `verifyPasscode` parses the
 * stored hash to reproduce the same derivation, then constant-time
 * compares.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number }
) => Promise<Buffer>;

/** OWASP 2023 recommended scrypt parameters (interactive use). */
const DEFAULT_N = 1 << 15; // 32768
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const KEY_LEN = 32;
const SALT_LEN = 16;
// Memory cap headroom for the chosen parameters: N * r * p * 128 ~= 32 MB.
const MAX_MEM = 64 * 1024 * 1024;

/**
 * Derive an encoded hash from a plaintext passcode. Output format is
 * self-describing so future parameter bumps don't break older hashes.
 *
 * @throws Never under normal operation; only if the OS RNG fails.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const derived = await scryptAsync(passcode, salt, KEY_LEN, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
    maxmem: MAX_MEM
  });
  return `scrypt$${DEFAULT_N}$${DEFAULT_R}$${DEFAULT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Verify a candidate passcode against an encoded hash. Returns `false`
 * for any decoding failure rather than throwing — callers always treat
 * verification failure as a credential rejection.
 */
export async function verifyPasscode(
  candidate: string,
  encoded: string
): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4]!, 'hex');
    expected = Buffer.from(parts[5]!, 'hex');
  } catch {
    return false;
  }
  if (salt.length !== SALT_LEN || expected.length !== KEY_LEN) return false;

  const derived = await scryptAsync(candidate, salt, KEY_LEN, {
    N,
    r,
    p,
    maxmem: MAX_MEM
  });
  return timingSafeEqual(derived, expected);
}
