#!/usr/bin/env node
/**
 * g2-clean-machine-proof.mjs — ADR-233 G2's proof artifact (chord-author-pipeline
 * Phase 3; form ruled by David 2026-07-18: scripted, run locally — no CI gate).
 *
 * Simulates a clean machine end to end:
 *   install the author tool → `sharpee init` (Chord default) → `sharpee build
 *   --browser` → serve dist/web/ → the page BOOTS in a real browser and plays
 *   the first turns.
 *
 * Clean-machine mechanism (no real npm publish — the plan's ruled design point):
 *   - @sharpee/* comes from the local `tsf build --npm` staging (~/.tsf-publish/
 *     sharpee), packed to tarballs and installed with npm's ordinary machinery
 *     into a temp directory OUTSIDE the repo (no pnpm-workspace.yaml above it).
 *   - The `sharpee` command is npm's own bin shim for the installed
 *     @sharpee/devkit — the same mechanism `npm i -g` uses, minus the prefix.
 *   - Public deps (esbuild, fflate, …) install from the real npm registry,
 *     exactly as they would on an author's machine.
 *   - DEFERRED TO PHASE 8 (G4 release), explicitly: proving the literal
 *     `npm i -g @sharpee/devkit` against the PUBLIC registry — nothing is
 *     published until the G4 version bump; every other step runs for real here.
 *   - The boot check drives the system Chrome via playwright-core
 *     (channel: 'chrome'); no browser download.
 *
 * Usage:  node scripts/g2-clean-machine-proof.mjs
 * Prereq: fresh `tsf build --npm` staging (run `node <tsf> build --npm`), Chrome.
 * Output: PASS/FAIL log on stdout — capture to the committed proof log with
 *         `node scripts/g2-clean-machine-proof.mjs | tee docs/work/chord-author-pipeline/proof/g2-proof-run.log`
 */
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STAGING = join(homedir(), '.tsf-publish', 'sharpee');
const require_ = createRequire(join(REPO_ROOT, 'package.json'));

const log = (msg) => console.log(`[g2-proof] ${msg}`);
const fail = (msg) => {
  console.error(`[g2-proof] FAIL: ${msg}`);
  process.exit(1);
};

if (!existsSync(STAGING)) fail(`staging not found at ${STAGING} — run tsf build --npm first`);

// consumer-gen (devkit's own closure walker) — repo-side helper only; nothing
// from the repo ships into the temp install.
const { scanStaging, computeClosure, stagingDepsOf } = require_(
  join(REPO_ROOT, 'packages', 'devkit', 'dist', 'consumer-gen.js'),
);

const staging = scanStaging(STAGING);
const tmp = mkdtempSync(join(tmpdir(), 'sharpee-g2-proof-'));
log(`clean-machine dir: ${tmp}`);

const vendor = join(tmp, 'vendor');
mkdirSync(vendor);
const packed = new Map(); // pkg name -> tarball filename
function pack(name) {
  if (packed.has(name)) return packed.get(name);
  const out = execFileSync(
    'npm',
    ['pack', join(STAGING, staging[name]), '--pack-destination', vendor, '--ignore-scripts', '--json'],
    { encoding: 'utf8' },
  );
  const filename = JSON.parse(out)[0].filename;
  packed.set(name, filename);
  return filename;
}

/** Full @sharpee closure of `seed`, as { name: "file:<abs tarball>" } deps. */
function fileDeps(seed) {
  const closure = [...computeClosure(seed, (n) => stagingDepsOf(STAGING, staging, n))].sort();
  const deps = {};
  for (const n of closure) deps[n] = `file:${join(vendor, pack(n))}`;
  return deps;
}

try {
  // ---- Step 1: install the author tool (the `sharpee` command) ------------
  log('step 1: installing @sharpee/devkit from staged tarballs (npm bin shim = the global-install mechanism)');
  const toolbox = join(tmp, 'toolbox');
  mkdirSync(toolbox);
  writeFileSync(
    join(toolbox, 'package.json'),
    JSON.stringify({ name: 'g2-toolbox', private: true, version: '0.0.0', dependencies: fileDeps(['@sharpee/devkit']) }, null, 2),
  );
  execFileSync('npm', ['install', '--no-fund', '--no-audit'], { cwd: toolbox, stdio: 'pipe' });
  const sharpeeBin = join(toolbox, 'node_modules', '.bin', 'sharpee');
  if (!existsSync(sharpeeBin)) fail('npm did not create the `sharpee` bin shim');
  const help = execFileSync(sharpeeBin, ['help'], { encoding: 'utf8', cwd: tmp });
  if (!help.includes('sharpee build')) fail('`sharpee --help` did not run');
  log('  ✓ bare `sharpee` resolves and runs');

  // ---- Step 2: scaffold a Chord story project ------------------------------
  log('step 2: `sharpee init first-light -y` (Chord default scaffold)');
  execFileSync(sharpeeBin, ['init', join(tmp, 'first-light'), '-y'], { cwd: tmp, stdio: 'pipe' });
  const app = join(tmp, 'first-light');
  if (!existsSync(join(app, 'first-light.story'))) fail('scaffold produced no .story file');
  if (!existsSync(join(app, 'src', 'browser-entry.ts'))) fail('scaffold produced no browser entry');
  log('  ✓ .story project scaffolded, browser-ready');

  // ---- Step 3: install the project deps (staged @sharpee, real registry rest)
  log('step 3: npm install in the project (@sharpee/* from staged tarballs — the Phase 8 carve-out; esbuild etc. from the registry)');
  const appPkg = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
  const seed = Object.keys(appPkg.dependencies).filter((n) => n.startsWith('@sharpee/'));
  appPkg.dependencies = { ...appPkg.dependencies, ...fileDeps(seed) };
  appPkg.devDependencies = { ...appPkg.devDependencies, ...fileDeps(['@sharpee/devkit']) };
  writeFileSync(join(app, 'package.json'), JSON.stringify(appPkg, null, 2));
  execFileSync('npm', ['install', '--no-fund', '--no-audit'], { cwd: app, stdio: 'pipe' });
  log('  ✓ project installed');

  // ---- Step 4: build the browser client ------------------------------------
  log('step 4: `sharpee build --browser` (compile gate on the author machine; bundle ships source + compiler)');
  execFileSync(sharpeeBin, ['build', '--browser'], { cwd: app, stdio: 'pipe' });
  const web = join(app, 'dist', 'web');
  for (const f of ['index.html', 'game.js', 'story.story']) {
    if (!existsSync(join(web, f))) fail(`dist/web/${f} missing after build`);
  }
  const gameJs = readFileSync(join(web, 'game.js'), 'utf8');
  if (!gameJs.includes('story language 1')) fail('the Chord compiler is not in game.js');
  if (!existsSync(join(app, 'dist', 'first-light.ir.json'))) fail('dist/first-light.ir.json missing — the IDE-facing IR artifact');
  log(`  ✓ dist/web built (game.js ${(statSync(join(web, 'game.js')).size / 1024).toFixed(0)} KB, compiler included, source shipped, IR artifact emitted)`);

  // ---- Step 5: serve + boot in a real browser -------------------------------
  log('step 5: serving dist/web and booting in Chrome (playwright-core, system channel)');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.story': 'text/plain', '.map': 'application/json' };
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

  // pnpm keeps playwright unhoisted — resolve it through zifmia (the
  // workspace package that depends on it). Repo-side helper only.
  const zifmiaRequire = createRequire(join(REPO_ROOT, 'tools', 'zifmia', 'package.json'));
  const { chromium } = zifmiaRequire('@playwright/test');
  // Prefer playwright's own chromium (npx playwright install chromium);
  // fall back to the system Chrome channel when no download is present.
  const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });

    // Boot = the story compiled IN THE BROWSER and rendered its opening text.
    await page.waitForFunction(
      () => (document.getElementById('text-content')?.textContent || '').includes('A quiet place to begin'),
      undefined,
      { timeout: 30_000 },
    );
    log('  ✓ page booted: story compiled in-browser and rendered the opening room');

    // First turns: a real command round-trip through the full engine.
    const input = page.locator('#command-input');
    await input.fill('inventory');
    await input.press('Enter');
    await page.waitForFunction(
      () => (document.getElementById('text-content')?.textContent || '').toLowerCase().includes('lantern'),
      undefined,
      { timeout: 15_000 },
    );
    await input.fill('examine the brass lantern');
    await input.press('Enter');
    await page.waitForFunction(
      () => (document.getElementById('text-content')?.textContent || '').includes('dented but serviceable'),
      undefined,
      { timeout: 15_000 },
    );
    log('  ✓ first turns played: inventory + examine answered from the compiled story');

    if (pageErrors.length) fail(`page errors during boot/play:\n  ${pageErrors.join('\n  ')}`);
  } finally {
    await browser.close();
    server.close();
  }

  log('');
  log('PASS — G2 end-to-end: staged install → sharpee init (Chord) → sharpee build --browser → served page boots and plays.');
  log('Deferred to Phase 8 (G4), explicitly: the literal `npm i -g @sharpee/devkit` against the PUBLIC registry (unpublished until the version bump).');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
