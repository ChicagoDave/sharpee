// packages/core/src/ifid/ifid.ts
// IFID (Interactive Fiction Identifier) utilities per Treaty of Babel

import { randomUUID } from 'crypto';

/**
 * IFID format requirements (Treaty of Babel):
 * - Length: 8 to 63 characters
 * - Characters: Uppercase letters (A-Z), digits (0-9), and hyphens (-)
 * - Recommended: UUID format (ISO/IEC 11578:1996), uppercase
 */
const IFID_PATTERN = /^[A-Z0-9-]{8,63}$/;

/**
 * Generate a new IFID using UUID v4 format.
 * Returns an uppercase UUID suitable for Treaty of Babel compliance.
 *
 * @example
 * const ifid = generateIfid();
 * // => "A1B2C3D4-E5F6-7890-ABCD-EF1234567890"
 */
export function generateIfid(): string {
  return randomUUID().toUpperCase();
}

/**
 * Validate an IFID string against Treaty of Babel requirements.
 *
 * @param ifid - The IFID to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * validateIfid("A1B2C3D4-E5F6-7890-ABCD-EF1234567890"); // true
 * validateIfid("lowercase-invalid"); // false
 * validateIfid("SHORT"); // false (less than 8 chars)
 */
export function validateIfid(ifid: string): boolean {
  return IFID_PATTERN.test(ifid);
}

/**
 * Normalize an IFID to uppercase.
 * Returns the normalized IFID or null if invalid after normalization.
 *
 * @param ifid - The IFID to normalize
 * @returns Normalized uppercase IFID, or null if invalid
 */
export function normalizeIfid(ifid: string): string | null {
  const normalized = ifid.toUpperCase();
  return validateIfid(normalized) ? normalized : null;
}
