/**
 * Unit test for `runIntrospect` (ADR-185). The build-gated negative path is
 * self-contained (no story build needed); the positive real-path is exercised
 * against a built story via the CLI (see the ADR's test:npm acceptance).
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runIntrospect } from './introspect';

describe('runIntrospect', () => {
  it('rejects when the project has no dist/index.js (story not built)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'devkit-introspect-'));
    try {
      await expect(runIntrospect({ dir })).rejects.toThrow(/no dist\/index\.js/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
