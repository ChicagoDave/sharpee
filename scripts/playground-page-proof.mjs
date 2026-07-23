/**
 * playground-page-proof.mjs — REAL-PATH acceptance gate for the ADR-191 Phase 1
 * playground PAGE (rule 13a). Drives the real Next.js `/playground` route in
 * real Chromium against a real `next start`, exercising the full loop end to end
 * (editor → parent → sandboxed iframe → compiler → engine → player). No stubs.
 *
 * Covers AC-1..AC-8:
 *   AC-1 page exists + nav        AC-2 starter loads       AC-3 Play compiles+runs
 *   AC-4 a lock/key story plays   AC-5 diagnostics in the errors AREA (not console)
 *   AC-6 Reset → fresh world      AC-7 sandboxed iframe; story can't introduce JS
 *   AC-8 version shown
 *
 * Prereqs: the playground bundle is built (website/public/playground/current.json)
 * and the site is built (website/.next; this script builds it if missing).
 * Usage: node scripts/playground-page-proof.mjs
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { get } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEBSITE = join(REPO_ROOT, 'website');
const PORT = 3990;
const BASE = `http://127.0.0.1:${PORT}`;

const log = (m) => console.log(`[pg-page] ${m}`);
const fail = (m) => {
  console.error(`[pg-page] FAIL: ${m}`);
  process.exit(1);
};

function run(cmd, args, opts) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd: WEBSITE, stdio: 'inherit', ...opts });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
  });
}

function waitForServer(url, tries = 60) {
  return new Promise((res, rej) => {
    let n = 0;
    const tick = () => {
      const req = get(url, (r) => {
        r.resume();
        res();
      });
      req.on('error', () => (++n >= tries ? rej(new Error('server never came up')) : setTimeout(tick, 1000)));
    };
    tick();
  });
}

// ---- Prereqs ----
if (!existsSync(join(WEBSITE, 'public', 'playground', 'current.json'))) {
  fail('website/public/playground/current.json missing — run: ./repokit build --playground');
}
if (!existsSync(join(WEBSITE, '.next'))) {
  log('no .next — building the site (npm run build) ...');
  await run('npm', ['run', 'build']);
}

// ---- Serve ----
log(`starting next start on :${PORT}`);
const server = spawn('npx', ['next', 'start', '-p', String(PORT)], { cwd: WEBSITE, stdio: 'ignore' });
let browser;
try {
  await waitForServer(`${BASE}/playground`);

  const zr = createRequire(join(REPO_ROOT, 'tools', 'zifmia', 'package.json'));
  const { chromium } = zr('@playwright/test');
  browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }));
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto(`${BASE}/playground`, { waitUntil: 'load' });

  // AC-1: the page exists with its heading, and the nav carries a Playground link.
  await page.waitForSelector('.cm-editor', { timeout: 20000 });
  if (!(await page.getByRole('heading', { name: 'Play It Now' }).count())) fail('AC-1: heading missing');
  if (!(await page.locator('a[href="/playground"]').count())) fail('AC-1: nav link to /playground missing');
  log('✓ AC-1: /playground page + nav link');

  // AC-2: the starter story is loaded in the editor.
  if (!/Study/.test(await page.locator('.cm-content').innerText())) fail('AC-2: starter not loaded');
  log('✓ AC-2: starter story loaded in the editor');

  // AC-8: the pinned version is displayed.
  if (!(await page.locator('text=Sharpee v3.2.0').count())) fail('AC-8: version label missing');
  log('✓ AC-8: version label shown (Sharpee v3.2.0)');

  const frame = page.frameLocator('iframe[title="Sharpee Playground"]');
  const iframeText = () =>
    page.evaluate(() => {
      const f = document.querySelector('iframe[title="Sharpee Playground"]');
      return (f && f.contentDocument && f.contentDocument.getElementById('text-content')?.textContent) || '';
    });
  async function type(cmd) {
    const input = frame.locator('#command-input');
    await input.fill(cmd);
    await input.press('Enter');
    await page.waitForTimeout(400);
  }

  // AC-3: Play compiles the starter in-browser and runs it (no backend).
  await page.getByRole('button', { name: '▶ Play' }).click();
  await frame.locator('#text-content').waitFor({ timeout: 30000 });
  await page.waitForFunction(
    () => {
      const f = document.querySelector('iframe[title="Sharpee Playground"]');
      return /ready for anything|study/i.test((f?.contentDocument?.getElementById('text-content')?.textContent) || '');
    },
    undefined,
    { timeout: 30000 },
  ).catch(() => fail('AC-3: starter never rendered in the iframe'));
  log('✓ AC-3: Play compiled + ran the story in the sandboxed iframe');

  // AC-7: the player is a sandboxed iframe, and story content cannot introduce JS —
  // a TypeScript-hatch story is refused with a diagnostic, never executed.
  const sandbox = await page.locator('iframe[title="Sharpee Playground"]').getAttribute('sandbox');
  if (!sandbox || !sandbox.includes('allow-scripts')) fail(`AC-7: iframe not sandboxed (sandbox="${sandbox}")`);
  await setEditor(page, 'story "H" by "T"\n  id: h\n\ncreate the Hall\n  a room\n\n  A hall.\n\ncreate the player\n  starts in the Hall\n\n  You.\n\ndefine text foo from "./x.ts"\n');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await page.locator('.text-rose-700').first().waitFor({ timeout: 15000 }).catch(() => fail('AC-7: hatch story was not refused with a diagnostic'));
  const hatchMsg = await page.locator('.text-rose-700').first().innerText();
  if (!/hatch/i.test(hatchMsg)) fail(`AC-7: expected a hatch refusal, got: ${hatchMsg}`);
  log('✓ AC-7: sandboxed iframe; a TS-hatch story is refused (story content cannot introduce JS)');

  // AC-5: a malformed story surfaces diagnostics with line:column in the errors AREA.
  await setEditor(page, 'create the @@@ !!! this is not valid chord');
  await page.getByRole('button', { name: '▶ Play' }).click();
  await page.locator('.text-rose-700').first().waitFor({ timeout: 15000 }).catch(() => fail('AC-5: no diagnostic rendered'));
  const diagText = await page.locator('.text-rose-700').first().innerText();
  if (!/^\d+:\d+ \[/.test(diagText.trim())) fail(`AC-5: diagnostic missing line:column (got: ${diagText})`);
  log(`✓ AC-5: malformed story → diagnostic in the errors area (${diagText.trim().slice(0, 40)}…)`);

  // AC-4: a real lock/key story plays — unlock + open + move through the door.
  await page.selectOption('#pg-example', 'locked-study');
  await page.waitForFunction(() => /Locked Study|Landing/.test(document.querySelector('.cm-content')?.textContent || ''), undefined, { timeout: 5000 });
  await page.getByRole('button', { name: '▶ Play' }).click();
  await page.waitForFunction(
    () => /dim landing/i.test((document.querySelector('iframe[title="Sharpee Playground"]')?.contentDocument?.getElementById('text-content')?.textContent) || ''),
    undefined,
    { timeout: 30000 },
  ).catch(() => fail('AC-4: locked-study did not start'));
  await type('take the iron key');
  await type('unlock the study door with the iron key');
  await type('open the study door');
  await type('north');
  if (!/made it in|bookshelves/i.test(await iframeText())) fail('AC-4: could not unlock + enter the Study');
  log('✓ AC-4: a lock/key story plays (take key → unlock → open → enter the Study)');

  // AC-6: Reset restores the starter AND gives a fresh world (new run starts clean).
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.waitForFunction(() => /Welcome to the Playground/.test(document.querySelector('.cm-content')?.textContent || ''), undefined, { timeout: 5000 })
    .catch(() => fail('AC-6: Reset did not restore the starter in the editor'));
  await page.getByRole('button', { name: '▶ Play' }).click();
  await page.waitForFunction(
    () => /snug study|ready for anything/i.test((document.querySelector('iframe[title="Sharpee Playground"]')?.contentDocument?.getElementById('text-content')?.textContent) || ''),
    undefined,
    { timeout: 30000 },
  ).catch(() => fail('AC-6: fresh world did not start after Reset'));
  log('✓ AC-6: Reset restored the starter and a fresh world');

  if (pageErrors.length) fail(`unexpected page errors: ${pageErrors.join('; ')}`);
  log('PASS — AC-1..AC-8 all green against the real /playground route in real Chromium.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}

/** Replace the CodeMirror document via select-all + type. */
async function setEditor(page, text) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(text);
}
