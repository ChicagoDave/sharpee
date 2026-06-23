/**
 * test-npm.test.ts — runTestNpm rejection paths (fast, no subprocess) plus a
 * gated real-path integration test. Derived from the runTestNpm Behavior Statement.
 *
 * The real-path test (DEVKIT_INTEGRATION=1) is the ADR-180 Integration Reality
 * REAL-PATH TEST: it drives the production npm-consumer pipeline (generate → npm
 * install → tsc → transcript-test) against the bundled fixture and the live
 * `tsf build --npm` staging — no stubs. It is gated only for speed/env, and is
 * executed as the Phase-2 parity gate.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTestNpm, DEFAULT_STAGING } from './test-npm';

describe('runTestNpm rejection paths', () => {
  it('throws when the location has no package.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'devkit-loc-'));
    expect(() => runTestNpm({ location: dir })).toThrow(/no package\.json/);
  });

  it('throws when the location has no src/', () => {
    const dir = mkdtempSync(join(tmpdir(), 'devkit-loc-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: {} }));
    expect(() => runTestNpm({ location: dir })).toThrow(/no src/);
  });
});

const integration = process.env.DEVKIT_INTEGRATION === '1' && existsSync(DEFAULT_STAGING);

describe.skipIf(!integration)('runTestNpm real-path (fixture, local staging)', () => {
  it('compiles and runs the fixture transcripts against the local build', () => {
    const fixture = join(__dirname, '..', '..', 'fixtures', 'basic-story');
    const result = runTestNpm({ location: fixture, mode: 'local' });
    expect(result.ran).toBe(true);
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThan(0);
  }, 600_000);
});
