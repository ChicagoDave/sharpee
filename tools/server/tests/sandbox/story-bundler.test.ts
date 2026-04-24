/**
 * Integration test for the install-time story bundler.
 *
 * Public interface: test suite over {@link compileStoryBundle} against the
 *   real `dungeo.sharpee` archive that ships with this package.
 * Bounded context: sandbox install-time compilation (ADR-153 Phase 4
 *   remediation plan, sub-phase 4-REMEDIATION-2).
 *
 * Rule enforced: No-Stub-Under-Test (see docs/work/stub-antipattern.md).
 * No mocks or stubs for esbuild, fflate, or Deno. The bundler is the SUT;
 * substituting a fake for any of its owned dependencies defeats the test.
 * If `deno` is missing from PATH, the final case fails loudly with its
 * spawn error — do NOT add a silent skip or a stub fallback.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileStoryBundle,
  type CompiledStory,
} from '../../src/sandbox/story-bundler.js';

const STORY_PATH = resolvePath(
  dirname(fileURLToPath(import.meta.url)),
  '../../stories/dungeo.sharpee',
);

const BUNDLE_TIMEOUT_MS = 30_000;
const DENO_HANDSHAKE_TIMEOUT_MS = 15_000;

/**
 * Spawn `deno run ...` against the given args and wait for the first
 * newline-terminated chunk on stdout. Kills the child as soon as that arrives
 * or the timeout fires. Used to verify the bundle emits a well-formed READY
 * frame on startup without running the full engine loop.
 */
function spawnDenoAndReadFirstLine(args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('deno', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdoutBuf = '';
    let stderrBuf = '';
    let settled = false;

    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        /* already dead */
      }
      fn();
    };

    const timer = setTimeout(() => {
      settle(() =>
        reject(
          new Error(
            `Deno did not produce stdout within ${timeoutMs}ms. stderr:\n${stderrBuf}`,
          ),
        ),
      );
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString('utf8');
      const nl = stdoutBuf.indexOf('\n');
      if (nl >= 0) {
        clearTimeout(timer);
        settle(() => resolve(stdoutBuf.slice(0, nl)));
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      settle(() =>
        reject(
          new Error(
            `spawn deno failed (${err.message}). Install Deno on PATH — do not swap in a fake. stderr:\n${stderrBuf}`,
          ),
        ),
      );
    });

    child.on('exit', (code, signal) => {
      if (settled) return;
      clearTimeout(timer);
      settle(() =>
        reject(
          new Error(
            `Deno exited (code=${code}, signal=${signal}) before emitting any stdout.\nstderr:\n${stderrBuf}`,
          ),
        ),
      );
    });
  });
}

describe('story-bundler — compileStoryBundle(dungeo.sharpee)', () => {
  let outDir: string;
  let result: CompiledStory;

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'story-bundler-test-'));
    result = await compileStoryBundle(STORY_PATH, { outDir });
  }, BUNDLE_TIMEOUT_MS);

  afterAll(async () => {
    await fs.rm(outDir, { recursive: true, force: true });
  });

  it('produces a bundle at outDir/<slug>.host.js of non-trivial size', async () => {
    expect(result.slug).toBe('dungeo');
    expect(result.bundlePath).toBe(join(outDir, 'dungeo.host.js'));
    const stat = await fs.stat(result.bundlePath);
    // 10KB floor is a sanity check — the real dungeo bundle is ~2 MB.
    expect(stat.size).toBeGreaterThan(10_000);
  });

  it('passes meta.json fields through on the result', () => {
    expect(result.meta.title).toBe('DUNGEON');
    expect(result.meta.formatVersion).toBe(1);
    expect(result.meta.version).toBe('0.9.92-beta');
    expect(result.meta.ifid).toBe('621168D1-6D5C-449F-83D5-841D03A1BF78');
  });

  it('produces a self-contained bundle with no surviving @sharpee/* specifiers', async () => {
    const content = await fs.readFile(result.bundlePath, 'utf8');
    // Catch both `import X from "@sharpee/..."` and `export * from "@sharpee/..."`.
    expect(content).not.toMatch(/^\s*(import|export) [^;]* from ['"]@sharpee\//m);
    // Stricter: the substring should not appear at all. The whole @sharpee graph
    // is inlined — no bare specifier can survive, even in comments or strings.
    expect(content).not.toContain('@sharpee/');
  });

  it('inlines meta.json as a constant in the bundle', async () => {
    const content = await fs.readFile(result.bundlePath, 'utf8');
    // The generated shim serialises meta into the output. Assert a
    // distinctive marker so a regression (e.g., meta never reaching the
    // bundle) would be caught even if the bundle still runs.
    expect(content).toContain('DUNGEON');
    expect(content).toContain('621168D1-6D5C-449F-83D5-841D03A1BF78');
  });

  it('cleans up the scratch directory on success', async () => {
    const scratchRoot = join(outDir, '.scratch');
    // Cleanup is per-slug; the top-level .scratch may or may not exist but
    // must not contain any leftover story-specific subdir.
    try {
      const entries = await fs.readdir(scratchRoot);
      expect(entries).not.toContain('dungeo');
    } catch (err) {
      // ENOENT is fine — scratch was removed entirely.
      expect((err as NodeJS.ErrnoException).code).toBe('ENOENT');
    }
  });

  it('runs under real Deno and emits a READY frame on startup', async () => {
    const firstLine = await spawnDenoAndReadFirstLine(
      [
        'run',
        `--allow-read=${result.bundlePath},${STORY_PATH}`,
        result.bundlePath,
      ],
      DENO_HANDSHAKE_TIMEOUT_MS,
    );
    const frame = JSON.parse(firstLine) as {
      kind: string;
      story_metadata?: { title?: string; author?: string; version?: string };
    };
    expect(frame.kind).toBe('READY');
    expect(frame.story_metadata?.title).toBe('DUNGEON');
    // A real bundle carries a real version string. Stub was '0.0.0'.
    expect(frame.story_metadata?.version).toBe('0.9.92-beta');
  }, DENO_HANDSHAKE_TIMEOUT_MS + 5_000);
});

describe('story-bundler — error paths', () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'story-bundler-err-'));
  });

  afterAll(async () => {
    await fs.rm(outDir, { recursive: true, force: true });
  });

  it('rejects when the source file does not exist', async () => {
    await expect(
      compileStoryBundle('/tmp/this-file-should-not-exist.sharpee', { outDir }),
    ).rejects.toThrow();
  });

  it('rejects when the archive lacks meta.json', async () => {
    const badArchivePath = join(outDir, 'bad-no-meta.sharpee');
    const { zipSync } = await import('fflate');
    const bytes = zipSync({ 'story.js': new TextEncoder().encode('export const story = {};') });
    await fs.writeFile(badArchivePath, bytes);
    await expect(
      compileStoryBundle(badArchivePath, { outDir }),
    ).rejects.toThrow(/missing meta\.json/);
  });

  it('rejects when the archive lacks story.js', async () => {
    const badArchivePath = join(outDir, 'bad-no-story.sharpee');
    const { zipSync } = await import('fflate');
    const meta = JSON.stringify({ format: 'sharpee-story', formatVersion: 1, title: 'X' });
    const bytes = zipSync({ 'meta.json': new TextEncoder().encode(meta) });
    await fs.writeFile(badArchivePath, bytes);
    await expect(
      compileStoryBundle(badArchivePath, { outDir }),
    ).rejects.toThrow(/missing story\.js/);
  });

  it('rejects when meta declares an unknown format', async () => {
    const badArchivePath = join(outDir, 'bad-format.sharpee');
    const { zipSync } = await import('fflate');
    const meta = JSON.stringify({ format: 'something-else', formatVersion: 1, title: 'X' });
    const bytes = zipSync({
      'meta.json': new TextEncoder().encode(meta),
      'story.js': new TextEncoder().encode('export const story = {};'),
    });
    await fs.writeFile(badArchivePath, bytes);
    await expect(
      compileStoryBundle(badArchivePath, { outDir }),
    ).rejects.toThrow(/unknown format/);
  });

  it('rejects when meta declares an unsupported formatVersion', async () => {
    const badArchivePath = join(outDir, 'bad-version.sharpee');
    const { zipSync } = await import('fflate');
    const meta = JSON.stringify({ format: 'sharpee-story', formatVersion: 999, title: 'X' });
    const bytes = zipSync({
      'meta.json': new TextEncoder().encode(meta),
      'story.js': new TextEncoder().encode('export const story = {};'),
    });
    await fs.writeFile(badArchivePath, bytes);
    await expect(
      compileStoryBundle(badArchivePath, { outDir }),
    ).rejects.toThrow(/formatVersion 999 not supported/);
  });
});
