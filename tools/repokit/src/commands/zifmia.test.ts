/**
 * zifmia.test.ts — rejection-path unit test for the zifmia server build.
 * Byte-for-byte parity with build.sh is covered by scripts/parity-zifmia.sh.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildZifmiaServer } from './zifmia';

describe('buildZifmiaServer rejection paths', () => {
  it('throws when tools/zifmia is absent', () => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-zifmia-'));
    expect(() => buildZifmiaServer(root, { quiet: true })).toThrow(/tools\/zifmia not found/);
    rmSync(root, { recursive: true, force: true });
  });
});
