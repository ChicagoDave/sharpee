/**
 * Real-path test for `runInitCommand` (ADR-185 scaffold rework). Runs the actual
 * non-interactive scaffold against the devkit-owned template and asserts the
 * generated package.json: injected version ranges (not the stale literal), a
 * `@sharpee/devkit` devDependency (so the `sharpee` bin is local), and no `npx`.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInitCommand } from './init';

describe('runInitCommand (scaffold)', () => {
  let dir = '';

  afterEach(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('scaffolds with injected versions, a devkit devDep, and no npx', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {}); // quiet the scaffold chatter
    dir = mkdtempSync(join(tmpdir(), 'devkit-init-'));

    await runInitCommand([dir, '-y']);

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));

    // Version is injected (caret range), not the stale hardcoded literal.
    expect(pkg.dependencies['@sharpee/sharpee']).toMatch(/^\^\d+\.\d+\.\d+$/);
    expect(pkg.dependencies['@sharpee/sharpee']).not.toBe('^0.9.61-beta');
    // world-model is a direct dep so the story can import traits idiomatically.
    expect(pkg.dependencies['@sharpee/world-model']).toMatch(/^\^\d+\.\d+\.\d+$/);
    // Finding A: the injected devkit range reads devkit's real version (not the 1.0.0 fallback).
    expect(pkg.devDependencies['@sharpee/devkit']).toBe('^1.0.4');

    // The CLI is a local devDependency so `sharpee build`/`introspect` resolve.
    expect(pkg.devDependencies['@sharpee/devkit']).toMatch(/^\^1\./);

    // No npx anywhere in the scaffold's scripts (1.0 decision).
    expect(JSON.stringify(pkg.scripts)).not.toContain('npx');
    expect(pkg.scripts['build:browser']).toBe('sharpee build-browser');
    expect(pkg.scripts.introspect).toBe('sharpee introspect');

    // The story source was scaffolded too.
    expect(existsSync(join(dir, 'src', 'index.ts'))).toBe(true);
  });
});
