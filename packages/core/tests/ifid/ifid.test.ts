// packages/core/tests/ifid/ifid.test.ts
import { describe, it, expect } from 'vitest';
import { generateIfid, validateIfid, normalizeIfid } from '../../src/ifid';

describe('IFID utilities', () => {
  describe('generateIfid', () => {
    it('should generate a valid IFID', () => {
      const ifid = generateIfid();
      expect(validateIfid(ifid)).toBe(true);
    });

    it('should generate uppercase UUID format', () => {
      const ifid = generateIfid();
      // UUID format: 8-4-4-4-12 = 36 characters
      expect(ifid).toMatch(/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/);
    });

    it('should generate unique IFIDs', () => {
      const ifid1 = generateIfid();
      const ifid2 = generateIfid();
      expect(ifid1).not.toBe(ifid2);
    });
  });

  describe('validateIfid', () => {
    it('should accept valid uppercase UUID', () => {
      expect(validateIfid('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(true);
    });

    it('should accept valid IFID with minimum length (8 chars)', () => {
      expect(validateIfid('ABCD1234')).toBe(true);
    });

    it('should accept valid IFID with maximum length (63 chars)', () => {
      const longIfid = 'A'.repeat(63);
      expect(validateIfid(longIfid)).toBe(true);
    });

    it('should reject lowercase letters', () => {
      expect(validateIfid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(false);
    });

    it('should reject too short IFID (< 8 chars)', () => {
      expect(validateIfid('SHORT')).toBe(false);
      expect(validateIfid('1234567')).toBe(false);
    });

    it('should reject too long IFID (> 63 chars)', () => {
      const tooLong = 'A'.repeat(64);
      expect(validateIfid(tooLong)).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(validateIfid('INVALID_UNDERSCORE')).toBe(false);
      expect(validateIfid('INVALID.DOT.CHARS')).toBe(false);
      expect(validateIfid('INVALID SPACE')).toBe(false);
    });

    it('should accept hyphens', () => {
      expect(validateIfid('VALID-WITH-HYPHENS')).toBe(true);
    });
  });

  describe('normalizeIfid', () => {
    it('should convert lowercase to uppercase', () => {
      expect(normalizeIfid('a1b2c3d4-e5f6-7890-abcd-ef1234567890'))
        .toBe('A1B2C3D4-E5F6-7890-ABCD-EF1234567890');
    });

    it('should return same string if already uppercase', () => {
      const ifid = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';
      expect(normalizeIfid(ifid)).toBe(ifid);
    });

    it('should return null for invalid IFID even after normalization', () => {
      expect(normalizeIfid('invalid_chars')).toBe(null);
      expect(normalizeIfid('short')).toBe(null);
    });

    it('should handle mixed case', () => {
      expect(normalizeIfid('AbCd1234-EfGh5678')).toBe('ABCD1234-EFGH5678');
    });
  });
});
