/**
 * browser.test.ts — rejection-path unit tests for the browser client build.
 * Byte-for-byte parity with build.sh is covered by scripts/parity-browser.sh.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrowserClient } from './browser';

describe('buildBrowserClient rejection paths', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'devkit-browser-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('throws when the story does not exist', () => {
    expect(() => buildBrowserClient(root, 'nope', { quiet: true })).toThrow(/story not found/);
  });

  it('throws when the story has no browser-entry.ts', () => {
    mkdirSync(join(root, 'stories', 'foo', 'src'), { recursive: true });
    expect(() => buildBrowserClient(root, 'foo', { quiet: true })).toThrow(/browser entry not found/);
  });
});
