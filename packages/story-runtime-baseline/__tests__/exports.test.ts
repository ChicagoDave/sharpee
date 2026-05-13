/**
 * Exports test for @sharpee/story-runtime-baseline.
 *
 * Guards three invariants:
 *  1. STORY_RUNTIME_BASELINE is frozen (no caller can mutate the contract).
 *  2. The TS constant matches the package.json dependencies exactly — no
 *     drift between the manifest's declared deps and the constant story
 *     authors validate against.
 *  3. BASELINE_VERSION is a positive integer.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STORY_RUNTIME_BASELINE, BASELINE_VERSION } from '../src/index';

describe('@sharpee/story-runtime-baseline exports', () => {
  it('STORY_RUNTIME_BASELINE is frozen', () => {
    expect(Object.isFrozen(STORY_RUNTIME_BASELINE)).toBe(true);
  });

  it('STORY_RUNTIME_BASELINE matches package.json dependencies', () => {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    const declared = Object.keys(pkg.dependencies ?? {}).sort();
    const exported = [...STORY_RUNTIME_BASELINE].sort();

    expect(exported).toEqual(declared);
  });

  it('BASELINE_VERSION is a positive integer', () => {
    expect(Number.isInteger(BASELINE_VERSION)).toBe(true);
    expect(BASELINE_VERSION).toBeGreaterThan(0);
  });
});
