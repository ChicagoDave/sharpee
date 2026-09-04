/**
 * chord-build.test.ts — the Chord-first author pipeline (ADR-233 G2,
 * chord-author-pipeline Phase 2). REAL-PATH: the ACTUAL runInitCommand
 * (Chord default) → runBuildBrowserCommand chain against the devkit-owned
 * templates — the real chord compiler as the validation gate, the real
 * esbuild bundling the compiled IR into game.js, and the terminal play
 * path through the shared author-game loader. No stubs of
 * any owned dependency. The scratch project lives INSIDE the repo so
 * esbuild resolves @sharpee/* by walking up to the monorepo node_modules
 * (browser-build.test.ts precedent).
 */
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInitCommand } from './init.js';
import { runBuildBrowserCommand } from './build-browser.js';
import { runBuildCommand } from './build.js';
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
    // The story arrives as build-stamped IR, not as source fetched at boot.
    expect(entry).toContain("from './story-ir.js'");
    expect(entry).not.toContain("fetch('./"); // no runtime file reads (the file:// defect)
    expect(entry).not.toContain("from '@sharpee/chord'"); // no compiler on the page
    expect(entry).not.toContain('{{STORY_ID}}');
  });

  it('the scaffolded story plays through the shared author-game loader (terminal path)', async () => {
    const game = await loadAuthorGame(projectDir);
    const output = await game.executeCommand('inventory');
    expect(output.toLowerCase()).toContain('lantern'); // the scaffold's carried item, from real world state
  });
});

describe('browser build: ships the compiled IR, not the source (ADR-284)', () => {
  it('builds dist/web/ with the story embedded in game.js, no source and no compiler', async () => {
    trapExit();
    await runBuildBrowserCommand([], projectDir);

    // ADR-252 D2: output keyed on the Story IR id (dist/web/<id>), not the project name.
    const outDir = join(projectDir, 'dist', 'web', 'first-light');
    for (const f of ['game.js', 'index.html', 'base.css', 'engine.css', 'decorations.css']) {
      expect(existsSync(join(outDir, f)), `${f} missing`).toBe(true);
    }
    // The author's source does NOT travel — `publish-source:` is absent here.
    expect(existsSync(join(outDir, 'first-light.story'))).toBe(false);

    const game = readFileSync(join(outDir, 'game.js'), 'utf-8');
    // The story IS in the bundle: its IR carries the format stamp and the
    // story's own id, neither of which any platform package would supply.
    // (`sharpee init -y` titles the story after its directory.)
    expect(game).toContain('story language 4');
    expect(game).toContain('first-light');
    // ...and the COMPILER is not. This message exists only in chord's parser
    // (verified by grep across chord/story-loader/engine/platform-browser),
    // so its absence is what distinguishes embedded IR from compile-at-boot.
    expect(game).not.toContain('Unknown story-header field');
    // No runtime I/O at all — the defect that made a published zip fail to
    // open from file:// was a fetch() the page could not satisfy there.
    expect(game).not.toContain("fetch('./story.story')");
    expect(statSync(join(outDir, 'game.js')).size).toBeGreaterThan(100_000);
    // ADR-299 D5: the shipped entry honors a pre-set pinned play seed — the
    // IDE's skein surface depends on this hook being in every built bundle.
    expect(game).toContain('__SHARPEE_PLAY_SEED__');
    // ADR-305 D4: the anchor contract and the turn feed ship in every built
    // bundle — `data-turn` stamps (what the IDE margin keys off) and the
    // `turnEvents` bridge (a no-op outside a WKWebView that registered it).
    expect(game).toContain('data-turn');
    expect(game).toContain('turnEvents');
    // Presence alone proves nothing: the seed has TWO distinct sinks, and
    // ADR-299 Phase 5 (2026-08-03) found both shipped dead. Assert each.
    //
    // 1. The engine's master seed must land in EngineConfig
    //    (`options.config.seed`) — a top-level `seed` on the GameEngine
    //    options object is silently ignored by the constructor.
    expect(game).toMatch(/config:\s*\{\s*seed:/);
    // 2. The chord evaluator's own stream (`one chance in <n>`, `randomly`)
    //    derives from `createStory`'s `options.seed` (ADR-293 D1) — a
    //    SEPARATE sink beside `hatchModules`. Without it, story-level draws
    //    stay clock-seeded even while the engine runs pinned, which reads as
    //    a flaky replay rather than a missing argument. Matched
    //    structurally (no minified identifier names).
    expect(game).toMatch(/hatchModules:[^}]*\{\s*seed:/);
    // ADR-299 D5 forced branches: the IDE replays a counterfactual by handing
    // the page structured force specs, which only work if the built entry
    // actually loads them into the engine's random service. Presence of the
    // global alone would not prove that — assert the call too.
    expect(game).toContain('__SHARPEE_PLAY_FORCES__');
    expect(game).toMatch(/loadForces\(/);
    // ADR-306 Phase 2: the lineage boot hook (the branch-replay sibling of
    // the seed global) and the digest's plugin-registry read ship in every
    // built bundle.
    expect(game).toContain('__SHARPEE_PLAY_LINEAGE__');
    expect(game).toContain('sharpee.plugin.state-machine');

    // ADR-306 Phase 2: the TESTING page — same bundle, no chrome, no theme
    // links; always emitted, excluded from publish (pinned in publish.test).
    const testing = readFileSync(join(outDir, 'index-testing.html'), 'utf-8');
    expect(testing).toContain('game.js');
    expect(testing).toContain('id="text-content"');
    expect(testing).toContain('id="command-input"');
    for (const chrome of ['menu-bar', 'status-line', 'THEME_LINKS', 'menu-title']) {
      expect(testing, `testing page must not carry ${chrome}`).not.toContain(chrome);
    }
    // ADR-318 D11 / ADR-310 D12: the TESTING page (and only it) flips the
    // author-channels capability, and the built entry actually reads the
    // global into `clientCapabilities` — presence on one side alone would
    // prove nothing. The player page must never carry the flip (Acceptance 8).
    expect(testing).toContain('__SHARPEE_AUTHOR_CHANNELS__ = true');
    expect(game).toContain('__SHARPEE_AUTHOR_CHANNELS__');
    expect(game).toMatch(/authorChannels:\s*(!0|true)/);
    const playerPage = readFileSync(join(outDir, 'index.html'), 'utf-8');
    expect(playerPage, 'player page must never flip author channels')
      .not.toContain('__SHARPEE_AUTHOR_CHANNELS__');

    // IR artifact for the IDE/tooling surface (David, 2026-07-18): dist/,
    // beside (not inside) the shipped page.
    const ir = JSON.parse(readFileSync(join(projectDir, 'dist', 'first-light.ir.json'), 'utf-8'));
    expect(ir.format).toBe('story language 4');
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

describe('build entry points reconcile identity (ADR-309 D3, real write moments)', () => {
  it('a bare .story build ADOPTS the header ifid into a new config — real file, adopted value', async () => {
    // Bypasses init deliberately: a legacy story with a header ifid and NO
    // config, built directly. The build entry itself must write the config.
    const legacyDir = mkdtempSync(join(REPO_ROOT, '.tmp-chord-adopt-'));
    const storyFile = join(legacyDir, 'legacy.story');
    try {
      writeFileSync(
        storyFile,
        'story\n  title: Legacy\n  authors:\n    T\n  id: legacy\n  story-version: 0.0.1\n  ifid: LEGACY-ADOPT-42\n\n' +
          'create the Den\n  a room\n\n  A small den.\n\ncreate Alex\n  a person\n  playable\n  starts in the Den\n\n  You.\n\nbefore the game starts\n  change the player to Alex\nend before\n',
      );
      trapExit();
      await runBuildBrowserCommand([], storyFile);

      const config = JSON.parse(readFileSync(join(legacyDir, 'legacy.config.json'), 'utf-8'));
      expect(config).toEqual({ version: 1, ifid: 'LEGACY-ADOPT-42' });
    } finally {
      rmSync(legacyDir, { recursive: true, force: true });
    }
  }, 60_000);

  it('the project-directory build entry (runBuildCommand) refuses a BROKEN config the same way', async () => {
    const brokenDir = mkdtempSync(join(REPO_ROOT, '.tmp-chord-cmd-broken-'));
    const storySource =
      'story\n  title: C\n  authors:\n    T\n  id: c\n  story-version: 0.0.1\n  ifid: CCCC-1\n\n' +
      'create the Den\n  a room\n\n  A small den.\n\ncreate Alex\n  a person\n  playable\n  starts in the Den\n\n  You.\n\nbefore the game starts\n  change the player to Alex\nend before\n';
    try {
      writeFileSync(join(brokenDir, 'package.json'), '{ "name": "c", "version": "0.0.1" }\n');
      writeFileSync(join(brokenDir, 'c.story'), storySource);
      writeFileSync(join(brokenDir, 'c.config.json'), '{ not json');
      trapExit();
      const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(runBuildCommand([], brokenDir)).rejects.toThrow('process.exit(1)');
      const err = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(err).toContain('story-config.broken');
      expect(readFileSync(join(brokenDir, 'c.story'), 'utf-8')).toBe(storySource);
    } finally {
      rmSync(brokenDir, { recursive: true, force: true });
    }
  });

  it('a BROKEN config refuses the build by name, rewriting neither file', async () => {
    const brokenDir = mkdtempSync(join(REPO_ROOT, '.tmp-chord-broken-'));
    const storySource =
      'story\n  title: B\n  authors:\n    T\n  id: b\n  story-version: 0.0.1\n  ifid: BBBB-1\n\n' +
      'create the Den\n  a room\n\n  A small den.\n\ncreate Alex\n  a person\n  playable\n  starts in the Den\n\n  You.\n\nbefore the game starts\n  change the player to Alex\nend before\n';
    const storyFile = join(brokenDir, 'b.story');
    try {
      writeFileSync(storyFile, storySource);
      writeFileSync(join(brokenDir, 'b.config.json'), '{ not json');
      trapExit();
      const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(runBuildBrowserCommand([], storyFile)).rejects.toThrow('process.exit(1)');
      const err = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(err).toContain('story-config.broken');
      // Broken stops the line: neither file was rewritten, nothing re-minted.
      expect(readFileSync(storyFile, 'utf-8')).toBe(storySource);
      expect(readFileSync(join(brokenDir, 'b.config.json'), 'utf-8')).toBe('{ not json');
    } finally {
      rmSync(brokenDir, { recursive: true, force: true });
    }
  });
});

describe('the scaffold shows what the tool supports', () => {
  it('is born with identity: the config sidecar exists and the header renders it (ADR-309 AC-1)', () => {
    const configPath = join(projectDir, 'first-light.config.json');
    expect(existsSync(configPath), 'config sidecar missing').toBe(true);
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(config.version).toBe(1);
    expect(typeof config.ifid).toBe('string');
    expect(config.ifid.length).toBeGreaterThan(0);
    // The header line is the config's rendering — identical value.
    const story = readFileSync(join(projectDir, 'first-light.story'), 'utf-8');
    expect(story).toContain(`ifid: ${config.ifid}`);
  });

  it('creates the project folders, each kept by a dotfile', () => {
    // No tests/ folder since the ADR-307 cutover — tests live in the story's
    // tree document (<story-id>.tests.json), recorded by the Testing tab.
    // Asserted as absence, not omission: a regression re-creating it fails.
    expect(existsSync(join(projectDir, 'tests')), 'tests/ must NOT be scaffolded').toBe(false);
    for (const folder of ['assets', 'feelies', 'walkthroughs']) {
      expect(existsSync(join(projectDir, folder)), `${folder}/ missing`).toBe(true);
      // A `.gitkeep` rather than a README: the build copies assets/ and
      // feelies/ into the artifact wholesale, and dotfiles are the only thing
      // that copy skips — a doc file in either would ship to players.
      expect(existsSync(join(projectDir, folder, '.gitkeep')), `${folder}/.gitkeep missing`).toBe(true);
    }
  });

  it('writes a root README naming every folder and the publishing rules', () => {
    const readme = readFileSync(join(projectDir, 'README.md'), 'utf-8');
    for (const folder of ['assets/', 'feelies/', 'walkthroughs/', 'browser/']) {
      expect(readme, `README does not mention ${folder}`).toContain(folder);
    }
    // The distinction that is easy to get wrong, and the default that matters.
    expect(readme).toContain('publish-source: yes');
    expect(readme).toContain('does **not** ship by default');
    expect(readme).toContain('first-light.story');
  });

  it('scaffolded folders do not leak into the published artifact', async () => {
    trapExit();
    const outDir = join(projectDir, 'dist', 'web', 'first-light');
    rmSync(outDir, { recursive: true, force: true });
    await runBuildBrowserCommand([], projectDir);

    // The markers keeping empty folders alive must not become bundle content.
    expect(existsSync(join(outDir, '.gitkeep'))).toBe(false);
    expect(existsSync(join(outDir, 'feelies'))).toBe(false); // nothing but the marker in it
    expect(existsSync(join(outDir, 'README.md'))).toBe(false);
  }, 120_000);
});

describe('feelies/ — player-facing extras that travel with the artifact', () => {
  it('ships the folder, preserving its name and skipping dotfiles', async () => {
    trapExit();
    const feeliesDir = join(projectDir, 'feelies');
    mkdirSync(join(feeliesDir, 'maps'), { recursive: true });
    writeFileSync(join(feeliesDir, 'the-letter.txt'), 'Dear Ada,\n');
    writeFileSync(join(feeliesDir, 'maps', 'harbor.svg'), '<svg/>\n');
    writeFileSync(join(feeliesDir, '.DS_Store'), 'junk');

    const outDir = join(projectDir, 'dist', 'web', 'first-light');
    rmSync(outDir, { recursive: true, force: true });
    await runBuildBrowserCommand([], projectDir);

    // Under feelies/, NOT flattened into the page's own directory: a feelie
    // named index.html or game.js must not be able to overwrite the page.
    expect(readFileSync(join(outDir, 'feelies', 'the-letter.txt'), 'utf-8')).toBe('Dear Ada,\n');
    expect(readFileSync(join(outDir, 'feelies', 'maps', 'harbor.svg'), 'utf-8')).toBe('<svg/>\n');
    expect(existsSync(join(outDir, 'the-letter.txt'))).toBe(false);
    expect(existsSync(join(outDir, 'feelies', '.DS_Store'))).toBe(false);
  }, 120_000);

  it('ships nothing — and creates no empty folder — when there are no feelies', async () => {
    trapExit();
    rmSync(join(projectDir, 'feelies'), { recursive: true, force: true });
    const outDir = join(projectDir, 'dist', 'web', 'first-light');
    rmSync(outDir, { recursive: true, force: true });
    await runBuildBrowserCommand([], projectDir);

    expect(existsSync(join(outDir, 'game.js'))).toBe(true); // the build really ran
    expect(existsSync(join(outDir, 'feelies'))).toBe(false);
  }, 120_000);
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
