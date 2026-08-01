/**
 * Choice Point / Catalog Tests (ADR-293 D2, D4, A1 ruling 6)
 *
 * The catalog is process-global and append-only, so every test uses names unique
 * to this file (prefix 'test-choice-point.') rather than clearing shared state.
 */

import { describe, it, expect } from 'vitest';
import {
  definePoint,
  getRegisteredPoints,
  getPoint,
} from '../../src/random/choice-point';

describe('definePoint', () => {
  it('registers a choice point in the process-global catalog and returns its handle', () => {
    const point = definePoint('test-choice-point.register', {
      classes: ['yes', 'no'],
    });

    expect(point.name).toBe('test-choice-point.register');
    expect(point.classes).toEqual(['yes', 'no']);
    // The catalog itself holds the entry — both lookup routes see the same handle.
    expect(getPoint('test-choice-point.register')).toBe(point);
    expect(getRegisteredPoints()).toContain(point);
  });

  it('registers a plain draw (no classes) per D4', () => {
    const point = definePoint('test-choice-point.plain');

    expect(point.classes).toBeUndefined();
    expect(getPoint('test-choice-point.plain')).toBe(point);
  });

  it('is idempotent: redeclaring with identical classes returns the original handle and adds no entry', () => {
    const first = definePoint('test-choice-point.idempotent', {
      classes: ['hit', 'miss'],
    });
    const countAfterFirst = getRegisteredPoints().length;

    const second = definePoint('test-choice-point.idempotent', {
      classes: ['hit', 'miss'],
    });

    expect(second).toBe(first);
    expect(getRegisteredPoints().length).toBe(countAfterFirst);
  });

  it('rejects redeclaration with different classes — the catalog never mutates an entry', () => {
    const original = definePoint('test-choice-point.conflict', {
      classes: ['a', 'b'],
    });

    expect(() =>
      definePoint('test-choice-point.conflict', { classes: ['a', 'b', 'c'] })
    ).toThrow(/already registered/);
    // The registered entry is unchanged after the rejected attempt.
    expect(getPoint('test-choice-point.conflict')).toBe(original);
    expect(original.classes).toEqual(['a', 'b']);
  });

  it('rejects a choice-point/plain-draw mismatch on the same name', () => {
    definePoint('test-choice-point.tier-mismatch');

    expect(() =>
      definePoint('test-choice-point.tier-mismatch', { classes: ['yes', 'no'] })
    ).toThrow(/already registered/);
  });

  it('rejects an empty name', () => {
    expect(() => definePoint('')).toThrow(/non-empty/);
  });

  it('returns frozen handles with frozen class lists (immutable catalog metadata)', () => {
    const point = definePoint('test-choice-point.frozen', {
      classes: ['yes', 'no'],
    });

    expect(Object.isFrozen(point)).toBe(true);
    expect(Object.isFrozen(point.classes)).toBe(true);
  });

  it('copies the caller’s classes array — later caller mutation cannot reach the catalog', () => {
    const classes = ['yes', 'no'];
    const point = definePoint('test-choice-point.defensive-copy', { classes });

    classes.push('maybe');

    expect(getPoint('test-choice-point.defensive-copy')!.classes).toEqual([
      'yes',
      'no',
    ]);
    expect(point.classes).toEqual(['yes', 'no']);
  });
});

describe('getPoint', () => {
  it('returns undefined for an undeclared name — a name is a declared point or it does not exist (D2)', () => {
    expect(getPoint('test-choice-point.never-declared')).toBeUndefined();
  });
});
