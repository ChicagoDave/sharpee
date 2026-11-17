/**
 * sync-chord-manual-companion.mjs — publish The Chord Manual's companion
 * folders as static files on the site.
 *
 * `public/chord-manual/<version>/relighting/` is a DERIVED COPY. The source of
 * truth is `tutorials/relighting/chord-v<version>/`, one folder per chapter
 * (`chapter-05` … `chapter-40`) and per Part (`part-1` … `part-8`), each holding
 * The Relighting as it stands at that point. The manual tells its reader to
 * copy from these folders (David, 2026-11-17: the companion is served from
 * sharpee.net), so the published copy must be the one the book's checks ran
 * against, not a hand-maintained second set.
 *
 * For each folder it writes:
 *   <folder>/…        every file, at the same relative path, to read in a browser
 *   <folder>.zip      the same files in one archive, the folder name at its root
 * and beside them `index.json`, the list of folders with their files.
 *
 * Left out of both: `dist/`, `node_modules/` and dot-files, which are build
 * output and never part of what a reader copies.
 *
 * The zip is written here, with node:zlib and no dependency: the site has no
 * archive library, and the server that builds the site is not known to have a
 * `zip` command.
 *
 * Public interface: none — run from `sync` (so from `prebuild` and `predev`).
 * Fails loudly: a missing source directory, or a folder with no `.story` file,
 * stops the build rather than publishing a companion the book does not match.
 *
 * Owner context: website build tooling.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..');

/** The edition's version: the folder under tutorials/relighting/ is `chord-v<VERSION>`. */
const VERSION = '4.1.0';
const SOURCE = join(REPO, 'tutorials', 'relighting', `chord-v${VERSION}`);
const DEST = join(here, '..', 'public', 'chord-manual', VERSION, 'relighting');

/** Directory names never published. */
const EXCLUDED_DIRS = new Set(['dist', 'node_modules']);

const die = (message) => {
  console.error(`sync-chord-manual-companion: ${message}`);
  process.exit(1);
};

/** Every publishable file under `dir`, as sorted POSIX-style relative paths. */
function listFiles(dir, prefix = '') {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      found.push(...listFiles(join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      found.push(rel);
    }
  }
  return found.sort();
}

/** The CRC-32 table (polynomial 0xEDB88320), built once. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 of a buffer, as the zip format stores it. */
function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Build a zip archive in memory.
 *
 * Entries are deflated, named in UTF-8, and stamped with one fixed date so the
 * archive's bytes depend only on its contents: two builds of the same folder
 * give the same file.
 *
 * @param entries [{ name, data }] — archive path (forward slashes) and bytes
 * @returns the archive as a Buffer
 */
function buildZip(entries) {
  const DOS_TIME = 0;
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 2026-01-01
  const UTF8_NAMES = 0x0800;
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf-8');
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_NAMES, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_NAMES, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + compressed.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

if (!existsSync(SOURCE)) die(`source not found: ${SOURCE}`);

const folders = readdirSync(SOURCE, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^(chapter|part)-\d+$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();
if (folders.length === 0) die(`no chapter-NN or part-N folders under ${SOURCE}`);

// Rebuilt from nothing each time, so a folder removed from the source cannot
// linger on the site.
rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

const index = [];
for (const folder of folders) {
  const files = listFiles(join(SOURCE, folder));
  if (!files.some((file) => !file.includes('/') && file.endsWith('.story'))) {
    die(`${folder} holds no .story file at its top level`);
  }
  const entries = [];
  for (const file of files) {
    const data = readFileSync(join(SOURCE, folder, file));
    const out = join(DEST, folder, file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
    entries.push({ name: `${folder}/${file}`, data });
  }
  const zip = buildZip(entries);
  writeFileSync(join(DEST, `${folder}.zip`), zip);
  index.push({ folder, zip: `${folder}.zip`, zipBytes: zip.length, files });
}
writeFileSync(join(DEST, 'index.json'), `${JSON.stringify({ version: VERSION, folders: index }, null, 2)}\n`);

const bytes = index.reduce((sum, item) => sum + statSync(join(DEST, item.zip)).size, 0);
console.log(
  `sync-chord-manual-companion: ${index.length} folders → public/chord-manual/${VERSION}/relighting/ (${Math.round(bytes / 1024)} KB of zips)`,
);
