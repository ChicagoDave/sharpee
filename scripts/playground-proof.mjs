/**
 * playground-proof.mjs — REAL-PATH proof for the ADR-191 Phase 1 playground
 * bundle (rule 13a). No stubs of the compile/runtime path:
 *
 *   1. Build the story-agnostic playground bundle with the REAL
 *      buildPlaygroundBundle() (compiler + loader + engine + platform-browser,
 *      no story baked in).
 *   2. Assert the bundle ships NO story.story (story-agnostic) and carries the
 *      pinned platform version (AC-8 groundwork).
 *   3. Serve it and drive REAL Chromium (g2/g3 playwright pattern):
 *      - post a real cookbook `.story` over postMessage → it compiles IN THE
 *        BROWSER and runs, with no compile backend (AC-3);
 *      - a command advances a turn (the engine is live);
 *      - a malformed `.story` posts diagnostics with a line/column back to the
 *        parent, not the console (AC-5).
 *
 * Usage: node scripts/playground-proof.mjs
 */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(join(REPO_ROOT, 'package.json'));

const log = (msg) => console.log(`[pg-proof] ${msg}`);
const fail = (msg) => {
  console.error(`[pg-proof] FAIL: ${msg}`);
  process.exit(1);
};

const { buildPlaygroundBundle } = require_(join(REPO_ROOT, 'packages', 'devkit', 'dist', 'index.js'));
const version = JSON.parse(
  readFileSync(join(REPO_ROOT, 'packages', 'sharpee', 'package.json'), 'utf8'),
).version;

// A minimal, gate-clean (dotless, current-Chord) story is the runtime input.
// NB: the docs/work/stdlib-cookbook/fixtures/*.story files still use pre-dotless
// `if.action.*` keys and no longer compile — the Phase 3 example picker must run
// them through a dotless audit first (recorded in the plan).
const STORY_SOURCE = [
  'story "Playground Proof" by "Sharpee"',
  '  id: pg-proof',
  '  version: 0.0.1',
  '',
  'create the Lamp Room',
  '  a room',
  '',
  '  Shelves of unlit lamps line every wall.',
  '',
  'create the brass lantern',
  '  aka lantern',
  '  in the Lamp Room',
  '',
  '  A dented brass lantern with a wire handle.',
  '',
  'create the player',
  '  starts in the Lamp Room',
  '',
].join('\n');

const tmp = mkdtempSync(join(REPO_ROOT, '.tmp-pg-proof-'));

try {
  // ---- Step 1: real playground build --------------------------------------
  log('step 1: buildPlaygroundBundle() — story-agnostic bundle, real esbuild');
  const outDir = buildPlaygroundBundle(
    {
      stylesDir: join(REPO_ROOT, 'packages', 'platform-browser', 'styles'),
      templatesDir: join(REPO_ROOT, 'packages', 'devkit', 'templates', 'browser'),
      esbuildCwd: tmp,
      engineVersion: version,
    },
    { quiet: true },
  );

  // ---- Step 2: story-agnostic + version invariants ------------------------
  for (const f of ['index.html', 'game.js', 'base.css', 'engine.css', 'decorations.css']) {
    if (!existsSync(join(outDir, f))) fail(`${f} missing after build`);
  }
  if (existsSync(join(outDir, 'story.story'))) {
    fail('story.story shipped — the playground bundle must be story-agnostic');
  }
  if (!readFileSync(join(outDir, 'game.js'), 'utf8').includes(version)) {
    fail(`game.js does not carry the pinned version ${version} (AC-8)`);
  }
  log(`  ✓ bundle built: no story.story, pinned v${version}`);

  // ---- Step 3: serve + drive real Chromium -------------------------------
  log('step 3: serving dist/playground and driving Chromium (g2/g3 pattern)');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json' };
  const server = createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    const file = join(outDir, url === '/' ? 'index.html' : url.slice(1));
    if (!file.startsWith(outDir) || !existsSync(file) || statSync(file).isDirectory()) {
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
  const browser = await chromium
    .launch({ headless: true })
    .catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    // Capture messages the iframe posts to its parent BEFORE the bundle loads.
    await page.addInitScript(() => {
      window.__pg = [];
      window.addEventListener('message', (e) => {
        if (e.data && typeof e.data.type === 'string') window.__pg.push(e.data);
      });
    });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });

    // The entry announces readiness on load.
    await page.waitForFunction(() => (window.__pg || []).some((m) => m.type === 'ready'), undefined, {
      timeout: 30_000,
    });
    log('  ✓ bundle loaded and posted { type: "ready" }');

    // AC-3: post a real .story; it compiles IN-BROWSER and runs (no backend).
    await page.evaluate((source) => window.postMessage({ type: 'play', source }, '*'), STORY_SOURCE);
    await page.waitForFunction(
      () => (document.getElementById('text-content')?.textContent || '').toLowerCase().includes('lamps'),
      undefined,
      { timeout: 30_000 },
    );
    log('  ✓ AC-3: a pasted .story compiled in-browser and rendered the Lamp Room');

    // The engine is live: a command advances a turn.
    const input = page.locator('#command-input');
    const before = await page.evaluate(() => document.getElementById('text-content')?.textContent || '');
    await input.fill('take lantern');
    await input.press('Enter');
    await page.waitForFunction(
      (prev) => (document.getElementById('text-content')?.textContent || '') !== prev,
      before,
      { timeout: 15_000 },
    );
    log('  ✓ engine live: "take lantern" advanced a turn and rendered output');

    // AC-5: a malformed story posts diagnostics (line/column) to the parent.
    await page.evaluate(() =>
      window.postMessage({ type: 'play', source: 'create the @@@ !!! not valid chord' }, '*'),
    );
    await page.waitForFunction(
      () => (window.__pg || []).some((m) => m.type === 'diagnostics' && m.errors && m.errors.length > 0),
      undefined,
      { timeout: 15_000 },
    );
    const diag = await page.evaluate(
      () => (window.__pg || []).filter((m) => m.type === 'diagnostics').pop(),
    );
    if (typeof diag.errors[0].line !== 'number' || typeof diag.errors[0].column !== 'number') {
      fail(`diagnostic lacks a line/column: ${JSON.stringify(diag.errors[0])}`);
    }
    log(`  ✓ AC-5: malformed .story → diagnostics posted (${diag.errors.length} error(s), first at ${diag.errors[0].line}:${diag.errors[0].column})`);

    if (pageErrors.length) fail(`unexpected page errors: ${pageErrors.join('; ')}`);
  } finally {
    await browser.close();
    server.close();
  }

  log('PASS — playground proof: real buildPlaygroundBundle, real Chromium; a pasted .story compiled + ran in-browser (AC-3), the engine advanced a turn, and a malformed story surfaced diagnostics with spans (AC-5). Story-agnostic bundle, pinned v' + version + '.');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
