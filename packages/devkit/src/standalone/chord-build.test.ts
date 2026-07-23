/**
 * chord-build.test.ts — the Chord-first author pipeline (ADR-233 G2,
 * chord-author-pipeline Phase 2). REAL-PATH: the ACTUAL runInitCommand
 * (Chord default) → runBuildBrowserCommand chain against the devkit-owned
 * templates — the real chord compiler as the validation gate, the real
 * esbuild bundling the compiler INTO game.js (David's ruling 2026-07-18:
 * the bundle ships the .story source and compiles at boot), and the
 * terminal play path through the shared author-game loader. No stubs of
 * any owned dependency. The scratch project lives INSIDE the repo so
 * esbuild resolves @sharpee/* by walking up to the monorepo node_modules
 * (browser-build.test.ts precedent).
 */
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInitCommand } from './init.js';
import { runBuildBrowserCommand } from './build-browser.js';
import { runBuildCommand } from './build.js';
import { loadAuthorGame } from './author-game.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

let tmp = '';
let projectDir = '';

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {}); // quiet scaffold/build chatter
  tmp = mkdtempSync(join(REPO_ROOT, '.tmp-chord-verify-'));
  projectDir = join(tmp, 'first-light'); // basename → storyId 'first-light'
  await runInitCommand([projectDir, '-y']);
}, 30_000);

afterAll(() => {
  vi.restoreAllMocks();
  if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
});

/** Route process.exit into a throw so gate failures surface as test failures. */
function trapExit(): void {
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit(${code})`);
  }) as never);
}

describe('Chord-default scaffold (David 2026-07-18: .story is the default; --ts opts out)', () => {
  it('writes the .story source, chord deps, and the compile-at-boot browser entry', () => {
    expect(existsSync(join(projectDir, 'first-light.story'))).toBe(true);
    expect(existsSync(join(projectDir, 'src', 'index.ts'))).toBe(false); // no TS story logic
    expect(existsSync(join(projectDir, 'tsconfig.json'))).toBe(false);

    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'));
    expect(pkg.dependencies['@sharpee/chord']).toMatch(/^\^\d+/);
    expect(pkg.dependencies['@sharpee/story-loader']).toMatch(/^\^\d+/);
    expect(pkg.dependencies['@sharpee/platform-browser']).toMatch(/^\^\d+/); // browser-ready scaffold
    expect(JSON.stringify(pkg.scripts)).not.toContain('npx');

    const entry = readFileSync(join(projectDir, 'src', 'browser-entry.ts'), 'utf-8');
    expect(entry).toContain("from '@sharpee/chord'"); // compiler ships client-side
    expect(entry).toContain("fetch('./story.story')"); // source shipped, compiled at boot
    expect(entry).not.toContain('{{STORY_ID}}');
  });

  it('the scaffolded story plays through the shared author-game loader (terminal path)', async () => {
    const game = await loadAuthorGame(projectDir);
    const output = await game.executeCommand('inventory');
    expect(output.toLowerCase()).toContain('lantern'); // the scaffold's carried item, from real world state
  });
});

describe('browser build: ships the source + the compiler (ruling 2)', () => {
  it('builds dist/web/ with story.story (the source, verbatim) and a game.js containing the chord compiler', async () => {
    trapExit();
    await runBuildBrowserCommand([], projectDir);

    // ADR-252 D2: output keyed on the Story IR id (dist/web/<id>), not the project name.
    const outDir = join(projectDir, 'dist', 'web', 'first-light');
    for (const f of ['game.js', 'index.html', 'story.story', 'base.css', 'engine.css', 'decorations.css']) {
      expect(existsSync(join(outDir, f)), `${f} missing`).toBe(true);
    }
    // The shipped story IS the author's source, byte for byte.
    expect(readFileSync(join(outDir, 'story.story'), 'utf-8'))
      .toBe(readFileSync(join(projectDir, 'first-light.story'), 'utf-8'));
    // The compiler is IN the bundle: chord's IR format stamp only exists in
    // @sharpee/chord source — its presence proves compile() shipped.
    const game = readFileSync(join(outDir, 'game.js'), 'utf-8');
    expect(game).toContain('story language 1');
    expect(statSync(join(outDir, 'game.js')).size).toBeGreaterThan(100_000);

    // IR artifact for the IDE/tooling surface (David, 2026-07-18): dist/,
    // beside (not inside) the shipped page.
    const ir = JSON.parse(readFileSync(join(projectDir, 'dist', 'first-light.ir.json'), 'utf-8'));
    expect(ir.format).toBe('story language 1');
    expect(ir.entities.length).toBeGreaterThan(0);
  }, 120_000);

  it('a gate error fails the build on the author machine with file:line diagnostics — never a broken page', async () => {
    trapExit();
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storyPath = join(projectDir, 'first-light.story');
    const good = readFileSync(storyPath, 'utf-8');
    try {
      writeFileSync(storyPath, good.replace('starts in the Landing', 'starts in the Ballroom'));
      await expect(runBuildBrowserCommand([], projectDir)).rejects.toThrow('process.exit(1)');
      const err = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(err).toContain('analysis.unknown-entity');
      expect(err).toMatch(/first-light\.story:\d+:\d+/);
    } finally {
      writeFileSync(storyPath, good);
      stderr.mockRestore();
    }
  });

  it('a hatched story is refused legibly for the browser (no boot-dead bundles)', async () => {
    trapExit();
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storyPath = join(projectDir, 'first-light.story');
    const good = readFileSync(storyPath, 'utf-8');
    try {
      writeFileSync(storyPath, good + '\ndefine text weather from "./weather.ts"\n');
      await expect(runBuildBrowserCommand([], projectDir)).rejects.toThrow('process.exit(1)');
      const err = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(err).toContain('hatch');
    } finally {
      writeFileSync(storyPath, good);
      stderr.mockRestore();
    }
  });
});

describe('plain `sharpee build` on a Chord project', () => {
  it('a gate error exits 1 through the validation gate (no esbuild involved)', async () => {
    trapExit();
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storyPath = join(projectDir, 'first-light.story');
    const good = readFileSync(storyPath, 'utf-8');
    try {
      writeFileSync(storyPath, good.replace('carries the brass lantern', 'carries the ghost lantern'));
      await expect(runBuildCommand([], projectDir)).rejects.toThrow('process.exit(1)');
    } finally {
      writeFileSync(storyPath, good);
      stderr.mockRestore();
    }
  });
});
