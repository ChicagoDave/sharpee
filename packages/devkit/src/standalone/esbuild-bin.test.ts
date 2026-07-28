/**
 * esbuild-bin.test.ts — real-path tests for the esbuild resolver (rule 13a).
 *
 * These SPAWN the resolved command rather than asserting on the returned
 * strings alone. The bug this module fixes was precisely that a plausible-
 * looking command (`npx esbuild`) ran a DIFFERENT esbuild than the one
 * installed — so the assertion that matters is that the thing we spawn reports
 * the version devkit actually depends on.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, openSync, readSync, closeSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveEsbuild } from './esbuild-bin.js';

/** The esbuild version devkit resolves as its own dependency. */
function installedEsbuildVersion(): string {
  const pkg = JSON.parse(readFileSync(require.resolve('esbuild/package.json'), 'utf-8'));
  return pkg.version as string;
}

describe('resolveEsbuild', () => {
  it('resolves devkit\'s own installed esbuild, not the npx fallback', () => {
    const resolved = resolveEsbuild();
    expect(resolved.bundled).toBe(true);
    expect(resolved.command).not.toBe('npx');
    expect(resolved.prefixArgs).not.toContain('esbuild');
  });

  it('spawns and reports the exact version devkit depends on', () => {
    const resolved = resolveEsbuild();
    const out = execFileSync(resolved.command, [...resolved.prefixArgs, '--version'], {
      encoding: 'utf-8',
    }).trim();

    // Not merely "some esbuild answered" — the SAME esbuild that is installed
    // beside the CLI. An npx-downloaded copy would report a different version.
    expect(out).toBe(installedEsbuildVersion());
  });

  it('actually bundles an import graph, so the resolved command is usable for builds', () => {
    const dir = mkdtempSync(join(tmpdir(), 'esbuild-bin-'));
    try {
      writeFileSync(join(dir, 'dep.js'), "export const marker = 'sealed-bundle-marker';\n");
      writeFileSync(join(dir, 'entry.js'), "import { marker } from './dep.js';\nconsole.log(marker);\n");

      const resolved = resolveEsbuild();
      const out = execFileSync(
        resolved.command,
        [...resolved.prefixArgs, join(dir, 'entry.js'), '--bundle', '--format=iife'],
        { encoding: 'utf-8' },
      );

      // The dependency's contents are INLINED — proves real bundling ran, not
      // just that a binary exited 0.
      expect(out).toContain('sealed-bundle-marker');
      expect(out).not.toContain("from './dep.js'");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('routes a script shim through this process\'s Node, and a native binary directly', () => {
    const resolved = resolveEsbuild();
    // The invariant: whatever the install shape, the spawn never depends on
    // `node` being discoverable on PATH — the sealed toolchain has no PATH to
    // rely on (ADR-279 D4).
    const target = resolved.prefixArgs[0] ?? resolved.command;
    const fd = openSync(target, 'r');
    const head = Buffer.alloc(2);
    readSync(fd, head, 0, 2, 0);
    closeSync(fd);
    const isScript = head[0] === 0x23 && head[1] === 0x21;

    if (isScript) {
      expect(resolved.command).toBe(process.execPath);
      expect(resolved.prefixArgs).toHaveLength(1);
    } else {
      expect(resolved.command).toBe(target);
      expect(resolved.prefixArgs).toHaveLength(0);
    }
  });
});
