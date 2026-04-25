/**
 * argon2id hash service — the only place plaintext secrets are observed.
 *
 * Public interface: {@link HashService}, {@link createHashService},
 * {@link createStubHashService}.
 * Bounded context: authentication boundary (ADR-159 Resolved Implementation
 * Choice #1 — argon2id with default parameters for v1).
 *
 * The production service wraps the `argon2` Node package. Tests that don't
 * exercise hashing performance use {@link createStubHashService} for speed;
 * the real-path tests for AC-6 use {@link createHashService}.
 */

import * as argon2 from 'argon2';

export interface HashService {
  /** Hash a plaintext secret. The returned string includes the algorithm + salt. */
  hash(secret: string): Promise<string>;
  /**
   * Verify a presented secret against a stored hash. Returns false on any
   * mismatch — including malformed hashes or argon2 internal errors. The
   * verifier never throws on a bad guess; it throws only on argument-shape
   * errors (empty hash string, etc.) which would indicate a programming bug.
   */
  verify(secret: string, hash: string): Promise<boolean>;
}

/** Production hash service backed by argon2id. */
export function createHashService(): HashService {
  return {
    async hash(secret) {
      return argon2.hash(secret, { type: argon2.argon2id });
    },
    async verify(secret, hash) {
      try {
        return await argon2.verify(hash, secret);
      } catch {
        // Malformed hash, library version mismatch, etc. — treat as a verify
        // failure rather than letting the exception cross the auth boundary.
        return false;
      }
    },
  };
}

/**
 * Fast deterministic hash service for tests that don't care about the
 * cryptographic property. Hash format: `stub:<secret>`. Real-path tests for
 * AC-6 must NOT use this — they exercise {@link createHashService} directly.
 */
export function createStubHashService(): HashService {
  return {
    async hash(secret) {
      return `stub:${secret}`;
    },
    async verify(secret, hash) {
      return hash === `stub:${secret}`;
    },
  };
}
