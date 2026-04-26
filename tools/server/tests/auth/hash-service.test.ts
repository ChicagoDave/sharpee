/**
 * HashService behavior tests.
 *
 * Behavior Statement — HashService (production, argon2id)
 *   DOES: hashes a plaintext passcode to an argon2id-formatted string that
 *         is not equal to the plaintext; verifies a presented passcode
 *         against a stored hash and returns true on match, false on
 *         mismatch.
 *   WHEN: invoked by the identity create route (hash) and the WS hello
 *         handler (verify); Phase C will add upload + erase callers.
 *   BECAUSE: ADR-161 AC-6 — the DB never stores plaintext; verification
 *            is argon2id and non-reversible.
 *   REJECTS WHEN: verify with a wrong passcode returns false; verify
 *                 against a malformed hash returns false (does not throw).
 *
 * These are real-path tests for AC-6: they exercise the production argon2
 * binding directly, not the stub. AC-6 cannot be satisfied by a stub.
 */

import { describe, expect, it } from 'vitest';
import { createHashService, createStubHashService } from '../../src/auth/hash-service.js';

describe('HashService (production argon2id)', () => {
  const svc = createHashService();

  // argon2 hashing is intentionally slow; keep a generous test timeout.
  const TIMEOUT_MS = 5_000;

  it(
    'hash returns an argon2id-formatted string that is not equal to plaintext',
    async () => {
      const hash = await svc.hash('correct-horse-battery-staple');
      expect(hash).not.toBe('correct-horse-battery-staple');
      expect(hash).toMatch(/^\$argon2id\$/);
      expect(hash.length).toBeGreaterThan(40);
    },
    TIMEOUT_MS
  );

  it(
    'verify returns true for the same secret used to hash',
    async () => {
      const secret = 'a-uuidv4-stand-in';
      const hash = await svc.hash(secret);
      expect(await svc.verify(secret, hash)).toBe(true);
    },
    TIMEOUT_MS
  );

  it(
    'verify returns false for a different secret',
    async () => {
      const hash = await svc.hash('correct');
      expect(await svc.verify('wrong', hash)).toBe(false);
    },
    TIMEOUT_MS
  );

  it(
    'verify returns false for a malformed hash (does not throw)',
    async () => {
      // This is the auth-boundary contract: the verifier never lets a
      // malformed-hash exception escape — bad data is treated as "no match."
      const result = await svc.verify('anything', 'not-an-argon2-hash');
      expect(result).toBe(false);
    },
    TIMEOUT_MS
  );

  it(
    'two hashes of the same secret are different (random salt)',
    async () => {
      const a = await svc.hash('same');
      const b = await svc.hash('same');
      expect(a).not.toBe(b);
      // Both still verify.
      expect(await svc.verify('same', a)).toBe(true);
      expect(await svc.verify('same', b)).toBe(true);
    },
    TIMEOUT_MS
  );
});

describe('createStubHashService (test-only)', () => {
  it('hash returns a deterministic non-plaintext value', async () => {
    const svc = createStubHashService();
    const hash = await svc.hash('s');
    expect(hash).toBe('stub:s');
    expect(hash).not.toBe('s');
  });

  it('verify true on match, false on mismatch', async () => {
    const svc = createStubHashService();
    const hash = await svc.hash('right');
    expect(await svc.verify('right', hash)).toBe(true);
    expect(await svc.verify('wrong', hash)).toBe(false);
  });
});
