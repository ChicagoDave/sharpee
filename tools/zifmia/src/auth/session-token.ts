/**
 * @module @sharpee/zifmia/auth/session-token
 * @purpose Mint session tokens. Random 32-byte cryptographic tokens
 *   stored in the `sessions` table (per ADR-175 invariant "server
 *   holds all authoritative state").
 * @owner Zifmia server (tools/zifmia/auth).
 */

import { randomBytes } from 'node:crypto';

/** Token lifetime — 7 days. Matches typical web-session expectations
 * and is short enough that revocation is rarely needed in v1. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Hex-encoded 32-byte token (64 hex characters). 256 bits of entropy
 * is far beyond any practical brute-force threshold; no DB rate-limit
 * required on the verification path. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}
