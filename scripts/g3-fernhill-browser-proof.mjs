#!/usr/bin/env node
/**
 * g3-fernhill-browser-proof.mjs — Fernhill Phase 8's real-browser proof
 * (chord-tutorial-story plan, G4/G5 gate; rule 13a — the browser client is
 * an owned integration).
 *
 * Builds the tutorial story's browser bundle through the REAL author
 * pipeline (devkit runInitCommand → runBuildBrowserCommand; the scratch
 * project lives INSIDE the repo so esbuild resolves @sharpee/* from the
 * monorepo node_modules — chord-build.test.ts precedent; the clean-machine
 * tarball mechanism was already proven generically by the G2 proof), serves
 * dist/web/, and drives real Chromium (g2 playwright pattern) asserting
 * observable client-side effects:
 *
 *   - boot: fernhill.story compiles IN the browser and renders Iron Gates
 *   - G4 image cue: `examine the photograph` mounts <img images/folly-photograph.png>
 *     and the asset actually loads (resource timing)
 *   - G5 channel/panel: the wound case clock's `estate.clock` emits reach the
 *     story-registered `clock` renderer — #estate-clock shows the hour —
 *     and the generic panel does NOT double-render the channel (ADR-241 AC-5)
 *   - G4 ambient cue (ADR-241 AC-1, the seam this proof originally flagged,
 *     now closed): re-entering the Grounds plays the implied `ambient:main`
 *     bed — audio/night-wind.wav actually loads in real Chromium, with the
 *     story source unchanged
 *   - G4 sound cue: lighting the boiler loads audio/boiler-thump.wav
 *   - ADR-241 AC-4 (second mini-scenario): a pure-IR story's `define channel`
 *     with NO story renderer renders visibly in the platform generic panel —
 *     no story TypeScript involved (the untouched scaffold browser entry)
 *
 * The win-ending `play music dawn-theme` rides the same pre-registered
 * mechanism as `play sound` (music channel) and is exercised text-side by
 * the wt-01 walkthrough.
 *
 * Usage:  node scripts/g3-fernhill-browser-proof.mjs
 * Output: PASS/FAIL log on stdout — capture with
 *   node scripts/g3-fernhill-browser-proof.mjs | tee docs/work/chord-tutorial-story/proof/g3-phase8-browser-proof.log
 */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, copyFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STORY_DIR = join(REPO_ROOT, 'stories', 'fernhill');
const require_ = createRequire(join(REPO_ROOT, 'package.json'));

const log = (msg) => console.log(`[g3-proof] ${msg}`);
const fail = (msg) => {
  console.error(`[g3-proof] FAIL: ${msg}`);
  process.exit(1);
};

const { runInitCommand } = require_(join(REPO_ROOT, 'packages', 'devkit', 'dist', 'standalone', 'init.js'));
const { runBuildBrowserCommand } = require_(join(REPO_ROOT, 'packages', 'devkit', 'dist', 'standalone', 'build-browser.js'));

const tmp = mkdtempSync(join(REPO_ROOT, '.tmp-g3-proof-'));
const app = join(tmp, 'fernhill');

try {
  // ---- Step 1: scaffold, then substitute the real story -------------------
  log('step 1: devkit init (Chord scaffold), then substitute fernhill.story + assets + browser entry');
  await runInitCommand([app, '-y']);
  copyFileSync(join(STORY_DIR, 'fernhill.story'), join(app, 'fernhill.story'));
  cpSync(join(STORY_DIR, 'assets'), join(app, 'assets'), { recursive: true });
  copyFileSync(join(STORY_DIR, 'src', 'browser-entry.ts'), join(app, 'src', 'browser-entry.ts'));
  log('  ✓ project staged with the tutorial story');

  // ---- Step 2: real browser build (compile gate + bundle + assets) --------
  log('step 2: devkit build --browser (compile gate, source shipped, assets copied)');
  await runBuildBrowserCommand([], app);
  const web = join(app, 'dist', 'web');
  for (const f of ['index.html', 'game.js', 'story.story', join('audio', 'boiler-thump.wav'), join('audio', 'night-wind.wav'), join('audio', 'dawn-theme.wav'), join('images', 'folly-photograph.png')]) {
    if (!existsSync(join(web, f))) fail(`dist/web/${f} missing after build`);
  }
  if (readFileSync(join(web, 'story.story'), 'utf8') !== readFileSync(join(STORY_DIR, 'fernhill.story'), 'utf8')) {
    fail('shipped story.story is not the fernhill source byte-for-byte');
  }
  if (!existsSync(join(app, 'dist', 'fernhill.ir.json'))) fail('dist/fernhill.ir.json missing — the IDE-facing IR artifact');
  log('  ✓ dist/web built: source + compiler + all four G4/G5 assets shipped');

  // ---- Step 3: serve + drive real Chromium --------------------------------
  log('step 3: serving dist/web and driving Chromium (g2 playwright pattern)');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.story': 'text/plain', '.wav': 'audio/wav', '.png': 'image/png', '.map': 'application/json' };
  const server = createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    const file = join(web, url === '/' ? 'index.html' : url.slice(1));
    if (!file.startsWith(web) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const zifmiaRequire = createRequire(join(REPO_ROOT, 'tools', 'zifmia', 'package.json'));
  const { chromium } = zifmiaRequire('@playwright/test');
  const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });

    await page.waitForFunction(
      () => (document.getElementById('text-content')?.textContent || '').includes('The cab is already grinding away'),
      undefined,
      { timeout: 30_000 },
    );
    log('  ✓ boot: fernhill.story compiled in-browser and rendered the Iron Gates');

    /** Send a command and wait for the turn counter to advance. */
    const input = page.locator('#command-input');
    async function play(cmd) {
      const before = await page.evaluate(() => document.getElementById('score-turns')?.textContent || '');
      await input.fill(cmd);
      await input.press('Enter');
      await page.waitForFunction(
        (prev) => (document.getElementById('score-turns')?.textContent || '') !== prev,
        before,
        { timeout: 15_000 },
      ).catch(() => {}); // score/turns text can coincide; prose waits below still gate
    }

    // --- G4 image cue: examine the photograph in the Entrance Hall ---------
    for (const cmd of ['north', 'north', 'north']) await play(cmd);
    await play('examine the photograph');
    await page.waitForFunction(
      () => {
        const img = document.querySelector('#img-layer-main img');
        return !!img && (img.getAttribute('src') || '').includes('images/folly-photograph.png');
      },
      undefined,
      { timeout: 15_000 },
    );
    await page.waitForFunction(
      () => {
        const img = document.querySelector('#img-layer-main img');
        const painted = !!img && img.complete && img.naturalWidth > 0;
        const fetched = performance.getEntriesByType('resource').some((e) => e.name.includes('images/folly-photograph.png'));
        return painted && fetched;
      },
      undefined,
      { timeout: 15_000 },
    ).catch(() => fail('folly-photograph.png was mounted but never fetched/painted'));
    log('  ✓ G4 image: <img> mounted on image:main and images/folly-photograph.png fetched');

    // --- G5 channel/panel: wind the clock, wait for a chime ----------------
    for (const cmd of ['take the grey overcoat', 'search the overcoat', 'take the winding key', 'wind the clock']) await play(cmd);
    let panel = '';
    for (let i = 0; i < 60 && !panel; i++) {
      await play('wait');
      panel = await page.evaluate(() => document.getElementById('estate-clock')?.textContent || '');
    }
    if (!/The clock: (evening|past midnight)/.test(panel)) {
      fail(`estate-clock panel never rendered a chime (last: "${panel}")`);
    }
    log(`  ✓ G5 channel: estate.clock → clock channel → story renderer ("${panel}")`);

    // ADR-241 AC-5: the exact-id story renderer WON — the platform generic
    // panel must not have double-rendered the clock channel.
    const clockPanelBox = await page.evaluate(() => !!document.getElementById('channel-panel-clock'));
    if (clockPanelBox) fail('generic panel double-rendered the clock channel despite the story renderer (AC-5)');
    log('  ✓ AC-5: story renderer override — no generic-panel double-render of clock');

    // --- ADR-241 AC-1: ambient bed on re-entering the Grounds ---------------
    await play('south');
    await page.waitForFunction(
      () => performance.getEntriesByType('resource').some((e) => e.name.includes('audio/night-wind.wav')),
      undefined,
      { timeout: 15_000 },
    ).catch(() => fail('night-wind.wav never fetched after re-entering the Grounds (AC-1 ambient)'));
    log('  ✓ AC-1 ambient: re-entering the Grounds fetched audio/night-wind.wav (ambient:main bed, story source unchanged)');

    // --- G4 sound cue: light the boiler -------------------------------------
    for (const cmd of ['east', 'turn the stopcock', 'push the primer', 'turn on the boiler']) await play(cmd);
    await page.waitForFunction(
      () => performance.getEntriesByType('resource').some((e) => e.name.includes('audio/boiler-thump.wav')),
      undefined,
      { timeout: 15_000 },
    );
    log('  ✓ G4 sound: lighting the boiler fetched audio/boiler-thump.wav (sound channel → AudioManager)');

    if (pageErrors.length) fail(`page errors during the run:\n  ${pageErrors.join('\n  ')}`);

    // ---- Step 4 (ADR-241 AC-4): generic panel, no story TS ----------------
    log('step 4: AC-4 mini-scenario — a pure-IR `define channel` with no story renderer renders in the generic panel');
    const panelApp = join(tmp, 'panel');
    await runInitCommand([panelApp, '-y']);
    writeFileSync(
      join(panelApp, 'panel.story'),
      `story "Panel Proof" by "T"
  id: panel
  version: 0.0.1

  on every turn
    emit proof.pulse with beat "steady"
  end on

create the Hall
  a room

  A bare proving hall.

create the player
  starts in the Hall

  You.

define channel pulse
  mode replace
  from event proof.pulse
  take beat
end channel
`,
    );
    // The scaffold's browser entry is left UNTOUCHED — no story renderer.
    await runBuildBrowserCommand([], panelApp);
    const panelWeb = join(panelApp, 'dist', 'web');
    const panelServer = createServer((req, res) => {
      const url = (req.url || '/').split('?')[0];
      const file = join(panelWeb, url === '/' ? 'index.html' : url.slice(1));
      if (!file.startsWith(panelWeb) || !existsSync(file) || statSync(file).isDirectory()) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    await new Promise((r) => panelServer.listen(0, '127.0.0.1', r));
    const panelPort = panelServer.address().port;
    try {
      const panelPage = await browser.newPage();
      await panelPage.goto(`http://127.0.0.1:${panelPort}/`, { waitUntil: 'load' });
      await panelPage.waitForFunction(
        () => (document.getElementById('text-content')?.textContent || '').includes('A bare proving hall'),
        undefined,
        { timeout: 30_000 },
      );
      const panelInput = panelPage.locator('#command-input');
      await panelInput.fill('wait');
      await panelInput.press('Enter');
      await panelPage.waitForFunction(
        () => {
          const box = document.getElementById('channel-panel-pulse');
          return !!box && (box.textContent || '').includes('steady');
        },
        undefined,
        { timeout: 15_000 },
      ).catch(() => fail('generic panel never rendered the pulse channel (AC-4)'));
      log('  ✓ AC-4: #channel-panel-pulse visible with the emitted value — zero story TypeScript');
      await panelPage.close();
    } finally {
      panelServer.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  log('');
  log('PASS — browser proof: real devkit build, real Chromium; image, clock channel + AC-5 override, AC-1 ambient bed, sound cue, and the AC-4 generic panel all observed client-side.');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
