#!/usr/bin/env node
/**
 * chord-manual-browser-check.cjs — the Chord manual's Part VII browser check.
 *
 * Purpose: proves, in headless Chromium, the claims chapters 36 and 37 of the
 * Chord manual make about the built page of The Relighting: the title and boot
 * theme, the theme menu, the workings panel, the three recordings being
 * fetched, the picture being shown and hidden, the story's own stylesheet, and
 * the storage prefix.
 *
 * Public interface (command line):
 *   node scripts/chord-manual-browser-check.cjs <snapshot-dir>
 *     <snapshot-dir> holds `relighting.story`, its `relighting.tests/` tree and
 *     a built `dist/web/relighting/` (run `sharpee build relighting.story`
 *     there first). The walk typed into the page is the tree's own winning
 *     line: the chain of segments that ends on the card whose ending is
 *     `beacon-lit`. Prints one PASS or FAIL line per check; exits 1 when any
 *     check fails, 2 on a usage or setup error.
 *   node scripts/chord-manual-browser-check.cjs <snapshot-dir> --self-check
 *     The instrument's own known-failing fixture: the same run with the
 *     server refusing every request under `/img/`. Exits 0 only when the
 *     picture and clean-load checks FAIL and every other check passes.
 *
 * Owner context: docs/book authoring toolchain, the Chord manual plan
 * (docs/work/chord-manual/plan.md, Phase 5). A local check, never a CI gate.
 * Playwright is resolved from packages/platform-browser, which already
 * depends on it.
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const STORY_ID = 'relighting';
const WINNING_ENDING = 'beacon-lit';
const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.map': 'application/json',
};

/**
 * Read the tree in `testsDir` and return the commands of its winning line.
 * @param {string} testsDir a `<story-id>.tests` directory
 * @returns {string[]} the turn commands from the root segment to the card
 *   whose ending is the winning one
 * @throws when no card in the tree declares that ending
 */
function winningWalk(testsDir) {
  const segments = new Map();
  for (const file of fs.readdirSync(testsDir)) {
    if (file === 'manifest.json' || !file.endsWith('.json')) continue;
    const segment = JSON.parse(fs.readFileSync(path.join(testsDir, file), 'utf8'));
    segments.set(segment.id, segment);
  }
  const last = [...segments.values()].find((s) => s.cards.some((c) => c.ending === WINNING_ENDING));
  if (!last) throw new Error(`no card in ${testsDir} has the ending ${WINNING_ENDING}`);
  const chain = [];
  for (let s = last; s; s = s.parent ? segments.get(s.parent) : null) chain.unshift(s);
  return chain.flatMap((s) => s.cards.filter((c) => c.type === 'turn').map((c) => c.command));
}

/**
 * Serve `webDir` on a free local port.
 * @param {string} webDir the built page's folder
 * @param {(url: string) => boolean} refuse requests answered 404 on purpose
 * @returns {Promise<http.Server>} the listening server
 */
function serve(webDir, refuse) {
  const server = http.createServer((request, response) => {
    const url = decodeURIComponent(request.url.split('?')[0]);
    const file = path.join(webDir, url === '/' ? 'index.html' : url);
    if (refuse(url) || !file.startsWith(webDir) || !fs.existsSync(file)) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

/**
 * Type the winning walk into the built page and collect what the page showed.
 * @param {string} webDir the built page's folder
 * @param {string[]} walk the commands to type
 * @param {boolean} refuseImages answer 404 for every `/img/` request
 * @returns {Promise<Array<{name: string, pass: boolean, detail: string}>>}
 */
async function runChecks(webDir, walk, refuseImages) {
  const { chromium } = require(path.join(REPO, 'packages/platform-browser/node_modules/@playwright/test'));
  const server = await serve(webDir, (url) => refuseImages && url.startsWith('/img/'));
  const origin = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass: Boolean(pass), detail: String(detail) });
  try {
    const page = await browser.newPage();
    const requested = [];
    const problems = [];
    page.on('request', (r) => requested.push(r.url().replace(origin, '')));
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url().replace(origin, '')}`); });
    page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
    await page.goto(`${origin}/`);
    await page.waitForSelector('#command-input');
    await page.waitForTimeout(800);

    const read = () => page.evaluate(() => {
      const shown = (el) => Boolean(el) && Boolean(el.offsetWidth || el.offsetHeight);
      const sidebar = document.querySelector('#sharpee-sidebar');
      const picture = document.querySelector('#sharpee-media img');
      const panelTitle = document.querySelector('#channel-panel-workings .sharpee-channel-panel-title');
      return {
        title: document.title,
        theme: document.documentElement.getAttribute('data-theme'),
        themeMenu: [...document.querySelectorAll('#theme-menu li')].map((li) => li.textContent.trim()),
        sidebarShown: shown(sidebar),
        workings: [...document.querySelectorAll('#channel-panel-workings .sharpee-channel-panel-value')].map((el) => el.textContent),
        panelTitleVariant: panelTitle ? getComputedStyle(panelTitle).fontVariant : null,
        picture: picture ? { src: picture.getAttribute('src'), shown: shown(picture), natural: picture.naturalWidth } : null,
        storageKeys: Object.keys(localStorage),
        prose: document.querySelector('#text-content') ? document.querySelector('#text-content').innerText : '',
      };
    });
    const type = async (command) => {
      await page.fill('#command-input', command);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
    };
    const typeThrough = async (from, lastCommand) => {
      const to = walk.indexOf(lastCommand, from);
      if (to < 0) throw new Error(`the winning walk has no "${lastCommand}" after command ${from}`);
      for (let i = from; i <= to; i++) await type(walk[i]);
      return to + 1;
    };
    const fetched = (file) => requested.includes(file);

    const boot = await read();
    check('boot: the page title is the story title', boot.title === 'The Relighting', boot.title);
    check('boot: the boot theme is paper', boot.theme === 'paper', boot.theme);
    check('boot: the theme menu offers Classic, Paper, Modern Dark',
      boot.themeMenu.join(', ') === 'Classic, Paper, Modern Dark', boot.themeMenu.join(', '));
    check('boot: no panel before a working is learned', !boot.sidebarShown, `sidebar shown: ${boot.sidebarShown}`);
    check('boot: no picture', boot.picture === null, JSON.stringify(boot.picture));

    let at = await typeThrough(0, 'read kindle page');
    const kindled = await read();
    check('first page read: the panel is shown', kindled.sidebarShown, `sidebar shown: ${kindled.sidebarShown}`);
    check('first page read: the panel lists the kindle working',
      kindled.workings.join(' | ') === 'kindle: wakes a flame', kindled.workings.join(' | '));
    check('first page read: the story stylesheet styles the panel title',
      kindled.panelTitleVariant === 'small-caps', kindled.panelTitleVariant);

    at = await typeThrough(at, 'light lamp');
    check('lamp kindled: audio/catch.mp3 is fetched', fetched('/audio/catch.mp3'), requested.filter((u) => u.startsWith('/audio')).join(', '));

    at = await typeThrough(at, 'light lamp with taper');
    check('bell tolling: audio/toll.mp3 is fetched', fetched('/audio/toll.mp3'), requested.filter((u) => u.startsWith('/audio')).join(', '));

    at = await typeThrough(at, 'kindle lantern');
    at = await typeThrough(at, 'kindle lantern');
    at = await typeThrough(at, 'kindle lantern');
    const lit = await read();
    check('Lantern lit: the panel lists four workings', lit.workings.length === 4, lit.workings.join(' | '));
    check('Lantern lit: the picture is shown and loaded',
      lit.picture !== null && lit.picture.src === 'img/lantern-lit.png' && lit.picture.shown && lit.picture.natural > 0,
      JSON.stringify(lit.picture));

    at = await typeThrough(at, 'enter skiff');
    check('skiff entered: audio/lapping.mp3 is fetched', fetched('/audio/lapping.mp3'), requested.filter((u) => u.startsWith('/audio')).join(', '));

    await typeThrough(at, 'kindle beacon');
    const won = await read();
    check('beacon lit: the picture is hidden', won.picture === null, JSON.stringify(won.picture));
    check('beacon lit: the winning text is on the page', won.prose.includes('The two lights hold one another.'), won.prose.slice(-160));
    check('storage: every key starts with relighting-',
      won.storageKeys.length > 0 && won.storageKeys.every((key) => key.startsWith('relighting-')), won.storageKeys.join(', '));
    check('clean load: no refused request and no page error', problems.length === 0, problems.join('; ') || 'none');
  } finally {
    await browser.close();
    server.close();
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const selfCheck = args.includes('--self-check');
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) {
    console.error('usage: node scripts/chord-manual-browser-check.cjs <snapshot-dir> [--self-check]');
    process.exit(2);
  }
  const snapshot = path.resolve(dir);
  const webDir = path.join(snapshot, 'dist', 'web', STORY_ID);
  const testsDir = path.join(snapshot, `${STORY_ID}.tests`);
  if (!fs.existsSync(path.join(webDir, 'index.html'))) {
    console.error(`no built page at ${webDir}: run \`sharpee build ${STORY_ID}.story\` in ${snapshot} first`);
    process.exit(2);
  }
  const results = await runChecks(webDir, winningWalk(testsDir), selfCheck);
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  [${r.detail}]`);
  const failed = results.filter((r) => !r.pass).map((r) => r.name);
  if (selfCheck) {
    const expected = ['Lantern lit: the picture is shown and loaded', 'clean load: no refused request and no page error'];
    const ok = failed.length === expected.length && expected.every((name) => failed.includes(name));
    console.log(ok
      ? 'self-check: with /img/ refused, exactly the picture and clean-load checks failed, as they must'
      : `self-check FAILED: expected exactly [${expected.join('; ')}] to fail, got [${failed.join('; ')}]`);
    process.exit(ok ? 0 : 1);
  }
  console.log(`${results.length - failed.length} passing, ${failed.length} failures`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(2);
});
