import { describe, it, expect } from 'vitest';
import { validateHandle, HANDLE_MIN_LENGTH, HANDLE_MAX_LENGTH } from '../src/identity/validation.js';

describe('validateHandle (ADR-161 amended)', () => {
  it('accepts a 3-character alphabetic handle', () => {
    expect(validateHandle('abc')).toEqual({ ok: true, value: 'abc' });
  });

  it('accepts a 12-character alphabetic handle at the upper bound', () => {
    expect(validateHandle('abcdefghijkl')).toEqual({ ok: true, value: 'abcdefghijkl' });
  });

  it('preserves display case', () => {
    expect(validateHandle('Alice')).toEqual({ ok: true, value: 'Alice' });
    expect(validateHandle('BoB')).toEqual({ ok: true, value: 'BoB' });
  });

  it('rejects handles shorter than the minimum', () => {
    expect(validateHandle('a').ok).toBe(false);
    expect(validateHandle('ab').ok).toBe(false);
    expect(HANDLE_MIN_LENGTH).toBe(3);
  });

  it('rejects handles longer than the maximum', () => {
    expect(validateHandle('abcdefghijklm').ok).toBe(false);
    expect(HANDLE_MAX_LENGTH).toBe(12);
  });

  it('rejects empty string', () => {
    expect(validateHandle('').ok).toBe(false);
  });

  it('rejects handles containing digits', () => {
    expect(validateHandle('alice1').ok).toBe(false);
    expect(validateHandle('1alice').ok).toBe(false);
  });

  it('rejects handles containing whitespace or punctuation', () => {
    expect(validateHandle('al ice').ok).toBe(false);
    expect(validateHandle('al-ice').ok).toBe(false);
    expect(validateHandle('al_ice').ok).toBe(false);
    expect(validateHandle('al.ice').ok).toBe(false);
  });

  it('rejects handles containing non-ASCII letters', () => {
    expect(validateHandle('aliçe').ok).toBe(false);
    expect(validateHandle('алиса').ok).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(validateHandle(undefined).ok).toBe(false);
    expect(validateHandle(null).ok).toBe(false);
    expect(validateHandle(42).ok).toBe(false);
    expect(validateHandle({}).ok).toBe(false);
    expect(validateHandle(['alice']).ok).toBe(false);
  });
});
