/**
 * slot-visibility.spec.ts — what a story shows is visible on the stock
 * page (GH #718), in real Chromium.
 *
 * Owner: @sharpee/platform-browser visual QA.
 *
 * REAL PATH: the fixture story is built by the real devkit browser build
 * with NO `browser/index.html`, so the page under test is the default
 * page with the real `base.css` and `engine.css`, and the bundle is the
 * real `BrowserClient`. The assertions are on what Chromium laid out —
 * `toBeVisible()` and bounding boxes — never on `textContent`, which a
 * hidden element satisfies (the check the old browser proof passed on
 * while the panel was `display: none`).
 *
 * The scratch project lives inside the repository so esbuild resolves
 * `@sharpee/*` from the monorepo's node_modules (devkit's
 * browser-build.test.ts precedent). Skips when devkit has not been built:
 * run `./repokit build` first.
 */

import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');
const BUILD_MODULE = join(REPO_ROOT, 'packages/devkit/dist/standalone/build-browser.js');
const FIXTURE = join(HERE, 'fixtures/slot-visibility.story');

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wav': 'audio/wav',
  '.png': 'image/png',
};

interface BrowserBuildModule {
  runBuildBrowserCommand(args: string[], target?: string): Promise<void>;
}

/** CRC-32 of a PNG chunk (type + data). */
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** A solid-colour RGB PNG, so the image has real pixels to lay out. */
function solidPng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // colour type: RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x6a)]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A tenth of a second of silence as 8-bit mono PCM. */
function silentWav(): Buffer {
  const samples = Buffer.alloc(800, 0x80);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + samples.length, 4);
  header.write('WAVEfmt ', 8, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(samples.length, 40);
  return Buffer.concat([header, samples]);
}

let scratch = '';
let server: Server | undefined;
let origin = '';

test.beforeAll(async () => {
  test.skip(!existsSync(BUILD_MODULE), 'devkit is not built — run ./repokit build');
  test.setTimeout(120_000);

  scratch = mkdtempSync(join(REPO_ROOT, '.tmp-slot-visibility-'));
  const project = join(scratch, 'slot-visibility');
  mkdirSync(join(project, 'assets', 'img'), { recursive: true });
  mkdirSync(join(project, 'assets', 'audio'), { recursive: true });
  copyFileSync(FIXTURE, join(project, 'slot-visibility.story'));
  writeFileSync(join(project, 'assets', 'img', 'chart.png'), solidPng(320, 200));
  writeFileSync(join(project, 'assets', 'audio', 'chime.wav'), silentWav());

  const build = createRequire(import.meta.url)(BUILD_MODULE) as BrowserBuildModule;
  await build.runBuildBrowserCommand([], project);
  const webRoot = join(project, 'dist', 'web', 'slot-visibility');
  expect(existsSync(join(webRoot, 'index.html')), 'the build wrote no page').toBe(true);
  expect(existsSync(join(project, 'browser', 'index.html')), 'the project must use the stock page').toBe(false);

  server = createServer(async (req, res) => {
    const path = join(webRoot, decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/\/$/, '/index.html'));
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((ready) => server!.listen(0, '127.0.0.1', ready));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

test.afterAll(async () => {
  if (server) await new Promise<void>((done) => server!.close(() => done()));
  if (scratch && existsSync(scratch)) rmSync(scratch, { recursive: true, force: true });
});

/** Boot the page and wait for the opening room. */
async function boot(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${origin}/index.html`);
  await expect(page.locator('#text-content')).toContainText('A narrow room under the eaves', { timeout: 30_000 });
  return errors;
}

/** Type a command and wait for the prose that answers it. */
async function play(page: Page, command: string, answer: string | RegExp): Promise<void> {
  const prose = page.locator('#text-content');
  const input = page.locator('#command-input');
  await input.fill(command);
  await input.press('Enter');
  await expect(prose).toContainText(answer, { timeout: 15_000 });
}

test('both slots are in the stock page and hidden until a story uses them', async ({ page }) => {
  const errors = await boot(page);
  await expect(page.locator('#sharpee-sidebar')).toBeHidden();
  await expect(page.locator('#sharpee-media')).toBeHidden();
  expect(errors).toEqual([]);
});

test('an appending channel shows its growing list in a visible sidebar panel', async ({ page }) => {
  const errors = await boot(page);
  await play(page, 'read ledger', "Soundings, in a clerk's careful hand.");

  const panel = page.locator('#channel-panel-findings');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.sharpee-channel-panel-row')).toHaveText(['soundings taken']);

  await play(page, 'read ledger', /careful hand\.[\s\S]*careful hand\./);
  await expect(panel.locator('.sharpee-channel-panel-row')).toHaveText(['soundings taken', 'soundings taken']);

  const box = await panel.boundingBox();
  expect(box, 'the panel was laid out').not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);

  // Beside the prose, not under it: the default page's row.
  const prose = await page.locator('#main-window').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(prose!.x + prose!.width - 1);
  expect(errors).toEqual([]);
});

test('a shown image is visible with real height, and hiding it conceals the slot', async ({ page }) => {
  const errors = await boot(page);
  await play(page, 'take chart', 'Taken');

  const image = page.locator('#sharpee-media .image-layer img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(320);
  const box = await image.boundingBox();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);

  // Above the prose pane, taking none of its place away from the input.
  const media = await page.locator('#sharpee-media').boundingBox();
  const prose = await page.locator('#main-window').boundingBox();
  expect(media!.y + media!.height).toBeLessThanOrEqual(prose!.y + 1);
  await expect(page.locator('#command-input')).toBeVisible();

  await play(page, 'drop chart', 'Dropped');
  await expect(page.locator('#sharpee-media .image-layer')).toHaveCount(0);
  await expect(page.locator('#sharpee-media')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a played sound leaves no audibility panel', async ({ page }) => {
  const errors = await boot(page);
  // "You hear chime." is the prose pipeline narrating this turn's
  // `sound.audibility.heard` event — the same event the audibility channel
  // collects — so seeing it proves the channel had a value to draw.
  await play(page, 'take bell', 'You hear chime.');
  await expect
    .poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('audio/chime.wav'))))
    .toBe(true);
  await expect(page.locator('#channel-panel-audibility')).toHaveCount(0);
  await expect(page.locator('#sharpee-sidebar')).toBeHidden();
  expect(errors).toEqual([]);
});
