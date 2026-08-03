/**
 * manifest-browser-parity.test.ts — ADR-276 Phase 3 browser parity harness.
 *
 * The browser client compiles the shipped `.story` at boot with the SAME
 * `@sharpee/chord` build that `game.js` bundles (chord-browser-entry
 * template), and the browser BUILD runs that compile as its fail-fast gate
 * (browser-core.ts). So the parity proof is two REAL paths, no stubs:
 * (1) the actual runInitCommand → runBuildBrowserCommand chain FAILS loudly
 * when the story carries a bad alteration target — the diagnostic the IDE
 * and CLI see is the one the browser pipeline sees; (2) the BUILT chord
 * dist (the exact module game.js bundles — not the workspace TS source)
 * reports the same code and span for the same source.
 *
 * Recorded limitation (the ADR-259 Phase F precedent): asserting the
 * diagnostic inside a RUNNING browser page needs a headless browser this
 * harness does not have; parity is pinned at the build-path and
 * bundled-module level. Later ADR-276 phases extend this file per slice.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInitCommand } from './init.js';
import { runBuildBrowserCommand } from './build-browser.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

let tmp = '';
let projectDir = '';
let storyPath = '';
let cleanSource = '';

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {}); // quiet scaffold/build chatter
  tmp = mkdtempSync(join(REPO_ROOT, '.tmp-manifest-parity-'));
  projectDir = join(tmp, 'gatehouse');
  await runInitCommand([projectDir, '-y']);
  storyPath = join(projectDir, 'gatehouse.story');
  cleanSource = readFileSync(storyPath, 'utf-8');
}, 30_000);

afterAll(() => {
  vi.restoreAllMocks();
  if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
});

const BAD_REMOVAL = '\nremove from action snarf\n  take the item\n';

describe('ADR-276 Phase 3 — alteration-target diagnostics reach the browser pipeline', () => {
  it('the real browser build fails loudly on a bad removal target, naming the compile code', async () => {
    const errors: string[] = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    writeFileSync(storyPath, cleanSource + BAD_REMOVAL);
    try {
      // The command surfaces the gate failure either as the thrown gate error
      // or by printing it and exiting 1 — both are loud; silence is the bug.
      await expect(runBuildBrowserCommand([], projectDir)).rejects.toThrow(
        /failed the load-time gates|process\.exit\(1\)/,
      );
      expect(errors.join('\n')).toContain('analysis.removal-target');
      expect(errors.join('\n')).toContain('`remove from action snarf` — no standard action');
    } finally {
      exitSpy.mockRestore();
      errSpy.mockRestore();
      writeFileSync(storyPath, cleanSource);
    }
  });

  it('the BUILT chord dist (the module game.js bundles) reports the same diagnostic with a span', () => {
    // Require the dist artifact, not the workspace TS — this is the code the
    // browser bundle ships for compile-at-boot.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chord = require(join(REPO_ROOT, 'packages/chord/dist/index.js')) as typeof import('@sharpee/chord');
    const result = chord.compile(cleanSource + BAD_REMOVAL);
    expect(result.ok).toBe(false);
    const found = result.diagnostics.filter((d) => d.code === 'analysis.removal-target');
    expect(found).toHaveLength(1);
    expect(found[0].span.line).toBeGreaterThan(0);
    // And the manifest itself ships in the dist surface the bundle carries.
    const manifest = (chord as unknown as { STDLIB_MANIFEST?: { actionIds: ReadonlySet<string> } }).STDLIB_MANIFEST;
    expect(manifest?.actionIds.has('if.action.taking')).toBe(true);
  });

  it('Phase 4 slice: the built chord dist reports analysis.unmatched-removal-pattern with the shape listing', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chord = require(join(REPO_ROOT, 'packages/chord/dist/index.js')) as typeof import('@sharpee/chord');
    const result = chord.compile(cleanSource + '\nremove from action taking\n  yoink the item\n');
    expect(result.ok).toBe(false);
    const found = result.diagnostics.find((d) => d.code === 'analysis.unmatched-removal-pattern');
    expect(found).toBeDefined();
    expect(found!.message).toContain('`take :item`');
  });

  it('Phase 5 slice: the built chord dist reports analysis.setting-not-boolean', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chord = require(join(REPO_ROOT, 'packages/chord/dist/index.js')) as typeof import('@sharpee/chord');
    const result = chord.compile(
      cleanSource + '\ncreate the keeper\n  a person, patrol with route [the Hall] and can-move maybe\n\n  A keeper.\n',
    );
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain('analysis.setting-not-boolean');
  });

  it('Phase 6 slice: the built chord dist reports analysis.unknown-hiding-position', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chord = require(join(REPO_ROOT, 'packages/chord/dist/index.js')) as typeof import('@sharpee/chord');
    const result = chord.compile(
      cleanSource + '\ncreate the wardrobe\n  hiding-spot with position sideways\n\n  A wardrobe.\n',
    );
    expect(result.diagnostics.map((d) => d.code)).toContain('analysis.unknown-hiding-position');
  });

  it('Phase 8 sweep: the built chord dist reports the composite fixture’s four codes — same as the CLI path', () => {
    // Acceptance item 2: the SAME fixture file `sharpee compose --check`
    // runs in tests/adr-276-acceptance.test.ts, compiled by the exact chord
    // module game.js bundles — one source, both consumers, same diagnostics.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chord = require(join(REPO_ROOT, 'packages/chord/dist/index.js')) as typeof import('@sharpee/chord');
    const source = readFileSync(
      join(REPO_ROOT, 'packages', 'devkit', 'tests', 'fixtures', 'adr-276-composite.story'),
      'utf-8',
    );
    const result = chord.compile(source);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid').map((d) => d.code)).toEqual([
      'analysis.trait-not-declared', // unknown direction word — census 16 is parser-gated (Phase 6)
      'analysis.setting-not-boolean',
      'analysis.removal-target',
      'analysis.unmatched-removal-pattern',
    ]);
    for (const d of result.diagnostics) expect(d.span.line).toBeGreaterThan(0);
  });

  it('Phase 8 sweep: the real browser build fails loudly with multiple codes from one run', async () => {
    const errors: string[] = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    // Three violations that need no `use` header: bad removal target,
    // unmatched removal shape, unknown direction word on a fresh room.
    const tail =
      '\ncreate the Annex\n  a room\n  sideways to the Annex\n\n  An annex.\n' +
      '\nremove from action snarf\n  take the item\n' +
      '\nremove from action taking\n  yoink the item\n';
    writeFileSync(storyPath, cleanSource + tail);
    try {
      await expect(runBuildBrowserCommand([], projectDir)).rejects.toThrow(
        /failed the load-time gates|process\.exit\(1\)/,
      );
      const output = errors.join('\n');
      expect(output).toContain('analysis.trait-not-declared');
      expect(output).toContain('analysis.removal-target');
      expect(output).toContain('analysis.unmatched-removal-pattern');
    } finally {
      exitSpy.mockRestore();
      errSpy.mockRestore();
      writeFileSync(storyPath, cleanSource);
    }
  });

  it('a clean story still builds the browser bundle end to end', async () => {
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    await runBuildBrowserCommand([], projectDir);
    expect(existsSync(join(projectDir, 'dist', 'web', 'gatehouse', 'game.js'))).toBe(true);
  });
});
