#!/usr/bin/env node
/**
 * check-chord-snippets.cjs — prove every `chord` fence in an edition of
 * *The Chord Manual* against the sharpee CLI's own loader.
 *
 * Purpose: a fence a reader types in must compile and load. A read-through
 * cannot show that, and compiling alone is not enough: a construct the
 * compiler accepts and the loader refuses is the gap the manual exists to
 * expose. So every fence is booted through the loader `sharpee play` uses.
 *
 * Usage: node scripts/check-chord-snippets.cjs <edition dir>
 *          [--sharpee-cli <path to the sharpee CLI's cli.js>]
 *          [--snapshots <dir of companion snapshots>]
 *          [--harness <dir holding world.story>]
 *          [--list]     also print how each proven fence was proven
 *          [--verbose]  print every context a failed fragment was tried in
 *          [--keep]     keep the wrapped sources and print where they are
 *        Defaults: the in-repo CLI build (packages/devkit/dist/cli.js, which
 *        must exist), tutorials/relighting/<edition name>/, and
 *        <edition dir>/snippet-harness/.
 *        Exit code: 0 when nothing failed, 1 when a fence or snapshot failed,
 *        2 on a usage error.
 *
 * How a fence is proven, first route that applies:
 *   its own harness  the harness directory holds fences/<chapter file
 *               name>-<fence number>.story for it: the surroundings one fence
 *               needs that no general context supplies (see expandHarness).
 *               Such a file may also say the fence is one the book shows
 *               being refused, and then it must be refused with that code;
 *               or that it is a claims block, and then the CLI's claims check
 *               compiles it against a snapshot's story.
 *   complete    it has a `story` header and a `before the game starts` block,
 *               so it is loaded as it stands;
 *   snapshot    its lines appear in a companion snapshot (the chapter's own
 *               first, then any other): either in order, contiguously and
 *               with the same relative indentation, or as an excerpt of one
 *               block, from the block's first line, with lines left out. A
 *               line holding only `...` is the book's mark for lines left
 *               out. The snapshot is loaded, so the fence is proven as part
 *               of it;
 *   fragment    anything else. It is placed in each context in turn (see
 *               CONTEXTS), first in the harness world and then as a change to
 *               the chapter's snapshot and to the last snapshot, and passes
 *               on the first that loads. The harness supplies only what a
 *               fragment legitimately leaves out: a header, the illustrative
 *               world in world.story, the player, any `.chord` file beside
 *               world.story that a fence imports, and a stub for each phrase
 *               the fence says without defining. A block the fence defines
 *               itself is dropped from the harness or the snapshot, so the
 *               fence's version is the one loaded.
 *   waiting     the fence is listed in the harness directory's
 *               known-issues.json ([{file, fence, issue, reason}]) with a
 *               filed issue. It is still tried: one that now loads is
 *               reported as a failure, so the list cannot outlive its reason.
 *
 * What a pass means: the fence loads in the context named, which --list
 * prints. A fragment proven in the harness world is proven as Chord the
 * loader accepts, not as part of the running example.
 *
 * Invariants:
 *   - every `chord` fence under frontmatter/, parts/ and backmatter/ is
 *     counted in exactly one column of the table, and the columns sum to the
 *     chapter's fence count (checked; a mismatch throws);
 *   - a snapshot a fence is proven by must itself load, or the fence fails,
 *     and every snapshot is loaded whether a fence uses it or not;
 *   - nothing is skipped silently: a fence is proven, waiting or failed, and
 *     a harness file or known issue that matches no fence throws.
 *
 * Public interface: the CLI above; the pure helpers and checkEdition() are
 * exported for scripts/__tests__/check-chord-snippets.test.ts.
 * Owner context: docs/book authoring toolchain; the Chord manual plan
 * (docs/work/archive/chord-manual/plan.md, Phase 7).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_CLI = path.join(ROOT, 'packages/devkit/dist/cli.js');
const AREAS = ['frontmatter', 'parts', 'backmatter'];
const SELF = 'check-chord-snippets';

/** The header fields a fragment leaves out, each added only when the fence lacks it. */
const HEADER_FIELDS = [
  ['title', '  title: Snippet'],
  ['authors', '  authors:\n    The Chord Manual'],
  ['id', '  id: snippet'],
  ['story-version', '  story-version: 0.0.1'],
];

// ---------------------------------------------------------------- helpers

/** Throws with the given message unless the condition holds. */
function invariant(condition, message) {
  if (!condition) throw new Error(`${SELF}: ${message}`);
}

/** Every markdown file under a directory, sorted. */
function markdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith('.md') ? [full] : [];
  }).sort();
}

/**
 * Every `chord` fence in a markdown text, by the rule the snippet extractor
 * uses: a line that is three backticks and a language opens a fence, and the
 * next line of three backticks closes it.
 *
 * @param {string} markdown the file's text
 * @returns {{line: number, text: string}[]} each fence with the 1-based line of its first content line
 */
function chordFences(markdown) {
  const fences = [];
  let open = null;
  let buffer = [];
  markdown.split('\n').forEach((line, index) => {
    const match = line.match(/^```([a-zA-Z]*)\s*$/);
    if (!match) {
      if (open) buffer.push(line);
      return;
    }
    if (open === null) {
      open = { lang: match[1], line: index + 2 };
      buffer = [];
      return;
    }
    if (open.lang === 'chord') fences.push({ line: open.line, text: buffer.join('\n') });
    open = null;
  });
  invariant(open === null, 'a code fence was left open');
  return fences;
}

/** Trailing blanks removed from every line, and blank lines from both ends. */
function tidy(text) {
  const lines = text.split('\n').map((line) => line.replace(/\s+$/, ''));
  while (lines.length && lines[0] === '') lines.shift();
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** The lines with their common leading indentation removed. Blank lines stay blank. */
function dedent(lines) {
  const indents = lines.filter((line) => line !== '').map((line) => line.match(/^ */)[0].length);
  const common = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(common));
}

/** The lines pushed right by a number of spaces. Blank lines stay blank. */
function indent(lines, spaces) {
  const pad = ' '.repeat(spaces);
  return lines.map((line) => (line === '' ? '' : pad + line));
}

/**
 * Whether a fence's lines appear in a snapshot, in order, contiguously, and
 * with the same relative indentation. Chord is indentation-sensitive, so a
 * fence that differs from the snapshot only by how far one line is indented
 * is not a match.
 *
 * @param {string[]} fenceLines the fence, tidied
 * @param {string[]} snapshotLines the snapshot, trailing blanks removed
 * @returns {boolean}
 */
function appearsIn(fenceLines, snapshotLines) {
  const wanted = dedent(fenceLines).join('\n');
  const first = fenceLines[0].trim();
  for (let start = 0; start + fenceLines.length <= snapshotLines.length; start++) {
    if (snapshotLines[start].trim() !== first) continue;
    const window = dedent(snapshotLines.slice(start, start + fenceLines.length)).join('\n');
    if (window === wanted) return true;
  }
  return false;
}

/**
 * Whether a fence is an excerpt of one top-level block: it opens with the
 * block's own first line, and every later line appears in the block, in
 * order and at the same indentation, with other lines of the block left out
 * between them. Blank lines are not compared, and a line holding only `...`
 * is the book's mark for lines left out.
 *
 * @param {string[]} fenceLines the fence, tidied
 * @param {string[]} blockLines one top-level block of a snapshot
 * @returns {boolean}
 */
function excerptOf(fenceLines, blockLines) {
  const wanted = fenceLines.filter((line) => line !== '' && line.trim() !== '...');
  if (wanted.length === 0 || wanted[0] !== blockLines[0]) return false;
  let at = 0;
  for (const line of wanted) {
    while (at < blockLines.length && blockLines[at] !== line) at++;
    if (at === blockLines.length) return false;
    at++;
  }
  return true;
}

/**
 * Splits a Chord source into its top-level blocks: each starts at a line
 * with no indentation that is not a comment, and runs to the next such line.
 *
 * @param {string} source Chord text
 * @returns {{key: string, lines: string[]}[]} each block with the key a fence is matched on
 */
function topLevelBlocks(source) {
  const blocks = [];
  let current = null;
  for (const line of source.split('\n').map((l) => l.replace(/\s+$/, ''))) {
    const startsBlock = /^\S/.test(line) && !line.startsWith('##') && !/^(or|end)\b/.test(line);
    if (startsBlock) {
      current = { key: blockKey(line), lines: [line] };
      blocks.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  for (const block of blocks) {
    while (block.lines.length && block.lines[block.lines.length - 1] === '') block.lines.pop();
  }
  return blocks;
}

/**
 * The name a top-level block is known by: `create the Den, a room` and
 * `create Den` are both `create den`; a `define` block is its first three
 * words (`define phrase no-such-word`); anything else is its first line.
 */
function blockKey(line) {
  const create = line.match(/^create\s+(?:(?:the|a|an)\s+)?([^,]+?)\s*(?:,.*)?$/i);
  if (create) return `create ${create[1].toLowerCase()}`;
  // A topics block is named by whose it is: `define topics for Tamsin Vey`.
  if (/^define\s+topics\b/.test(line)) return line.trim().toLowerCase();
  const define = line.match(/^define\s+(\S+)\s+([^\s,:]+)/);
  if (define) return `define ${define[1]} ${define[2].toLowerCase()}`;
  return line.trim();
}

/** The block keys a fence defines at its own top level. */
function keysDefinedBy(fenceLines) {
  return new Set(topLevelBlocks(fenceLines.join('\n')).map((block) => block.key));
}

/** The harness world, less every block the fence defines itself. */
function worldWithout(worldBlocks, definedKeys) {
  return worldBlocks.filter((block) => !definedKeys.has(block.key)).map((block) => block.lines.join('\n')).join('\n\n');
}

/** A story header, built from the fence's own header lines plus whatever required field it lacks. */
function headerFor(ownHeaderLines) {
  const has = (key) => ownHeaderLines.some((line) => new RegExp(`^\\s+${key}:`).test(line));
  const missing = HEADER_FIELDS.filter(([key]) => !has(key)).map(([, text]) => text);
  return ['story', ...missing, ...ownHeaderLines].join('\n');
}

// ---------------------------------------------------------------- contexts

/**
 * The ways a fragment is placed in a story, in the order they are tried.
 * Each `wrap` returns what the fence becomes: `header` lines that go under
 * `story`, and `top` lines that stand at the top level. It returns null
 * when the fence cannot be placed that way at all. The harness objects carry
 * no location, so the same wrapping works in the harness world and in a
 * snapshot.
 */
const CONTEXTS = [
  { name: 'top level', wrap: (lines) => ({ header: [], top: lines }) },
  // Lines that belong under `story`: `use`, `states:`, scores, `on every turn`.
  { name: 'header lines', wrap: (lines) => ({ header: indent(dedent(lines), 2), top: [] }) },
  { name: 'in a thing', wrap: (lines) => ({ header: [], top: ['create the harness object, a thing', ...indent(dedent(lines), 2)] }) },
  { name: 'in a person', wrap: (lines) => ({ header: [], top: ['create the harness stranger, a person', ...indent(dedent(lines), 2)] }) },
  { name: 'in a room', wrap: (lines) => ({ header: [], top: ['create the Harness Room, a room', ...indent(dedent(lines), 2)] }) },
  {
    name: 'in a clause',
    // Statements: the body of a clause on a thing.
    wrap: (lines) => ({
      header: [],
      top: ['create the harness object, a thing', '', '  A harness object.', '', '  after the player examining', ...indent(dedent(lines), 4), '  end after'],
    }),
  },
  {
    name: 'a condition',
    // One line that is a condition and nothing else.
    wrap: (lines) => (lines.length === 1 ? { header: [], top: [`define condition harness-condition: ${lines[0].trim()}`] } : null),
  },
];

/**
 * A fence that opens with `story` shows header lines and perhaps more. The
 * harness adds the header fields it lacks, the world, and the start block.
 */
function headerFenceSource(lines, worldBlocks, startBlock) {
  let end = 1;
  while (end < lines.length && (lines[end] === '' || /^\s/.test(lines[end]))) end++;
  const rest = lines.slice(end);
  const defined = keysDefinedBy(rest);
  return [headerFor(lines.slice(1, end)), rest.join('\n'), worldWithout(worldBlocks, defined), defined.has('before the game starts') ? '' : startBlock].join('\n\n');
}

/** A wrapped fence in the harness world. */
function intoWorld(wrapped, worldBlocks, startBlock) {
  const defined = keysDefinedBy(wrapped.top);
  return [headerFor(wrapped.header), wrapped.top.join('\n'), worldWithout(worldBlocks, defined), defined.has('before the game starts') ? '' : startBlock].join('\n\n');
}

/**
 * A wrapped fence as a change to a snapshot: the snapshot's top-level
 * blocks, less every block the fence defines itself, with the fence's
 * header lines added to the snapshot's `story` block and the rest added at
 * the end.
 */
function intoSnapshot(snapshotSource, wrapped) {
  const defined = keysDefinedBy(wrapped.top);
  const kept = topLevelBlocks(snapshotSource).filter((block) => !defined.has(block.key));
  const parts = kept.map((block) => (block.key === 'story' ? [...block.lines, ...wrapped.header] : block.lines).join('\n'));
  return [...parts, wrapped.top.join('\n')].join('\n\n');
}

/**
 * The one repair the harness makes from a diagnostic. A fragment may say a
 * phrase whose text is defined elsewhere in the reader's file, so each
 * phrase the compiler reports missing is defined as a stub and the load is
 * tried again. Returns null when the error names no missing phrase.
 */
function withMissingPhrases(source, error) {
  const missing = new Set();
  for (const line of error) {
    for (const match of line.matchAll(/\[analysis\.missing-phrase\] Phrase `([^`]+)`/g)) missing.add(match[1]);
  }
  if (missing.size === 0) return null;
  const stubs = [...missing].sort().map((key) => `define phrase ${key}\n  Harness text.\nend phrase`);
  const at = source.indexOf('\n\n');
  // After the story header when the source opens with one, since a header comes first.
  return source.startsWith('story') ? `${source.slice(0, at)}\n\n${stubs.join('\n\n')}${source.slice(at)}` : `${stubs.join('\n\n')}\n\n${source}`;
}

/**
 * Reads a fence's own harness file: the surroundings one fence needs that
 * no general context supplies. Leading `##` lines are comments, three of
 * which are directives:
 *   ## snapshot: chapter-NN        splice the result into that snapshot
 *   ## claims against: chapter-NN  the result is a claims file for that snapshot's story
 *   ## refused: <diagnostic code>  the fence is one the book shows being refused
 * The rest is a template in which one line, `<<fence>>`, marks where the
 * fence goes, at that line's indentation.
 *
 * @param {string} text the harness file's text
 * @param {string[]} fenceLines the fence, tidied
 * @returns {{lines: string[], snapshot: string|null, claims: string|null, refused: string|null}}
 * @throws when the template has no `<<fence>>` line, or more than one
 */
function expandHarness(text, fenceLines) {
  const all = text.split('\n').map((line) => line.replace(/\s+$/, ''));
  const directive = (name) => {
    const found = all.map((line) => line.match(new RegExp(`^## ${name}:\\s*(\\S+)\\s*$`))).find(Boolean);
    return found ? found[1] : null;
  };
  let start = 0;
  while (start < all.length && (all[start].startsWith('##') || all[start] === '')) start++;
  const template = all.slice(start);
  const markers = template.filter((line) => line.trim() === '<<fence>>');
  invariant(markers.length === 1, `a fence harness needs exactly one <<fence>> line, and has ${markers.length}`);
  const lines = template.flatMap((line) => (line.trim() === '<<fence>>' ? indent(dedent(fenceLines), line.match(/^ */)[0].length) : [line]));
  return { lines: tidy(lines.join('\n')), snapshot: directive('snapshot'), claims: directive('claims against'), refused: directive('refused') };
}

// ---------------------------------------------------------------- loading

/**
 * The loader behind a sharpee CLI: the module `sharpee play` boots a story
 * with, found beside the CLI's own cli.js.
 *
 * @param {string} cliPath path to the CLI's cli.js
 * @returns {(target: string) => Promise<void>} resolves when the story compiled, loaded and started
 */
function loaderFor(cliPath) {
  const modulePath = path.join(path.dirname(cliPath), 'standalone', 'author-game.js');
  invariant(fs.existsSync(cliPath), `no sharpee CLI at ${cliPath}; build it first (./repokit build)`);
  invariant(fs.existsSync(modulePath), `the CLI at ${cliPath} has no standalone/author-game.js beside it`);
  const { loadAuthorGame } = require(modulePath);
  invariant(typeof loadAuthorGame === 'function', `${modulePath} exports no loadAuthorGame()`);
  return async (target) => {
    await loadAuthorGame(target, { seed: 1 });
  };
}

/**
 * The claims check behind a sharpee CLI: the function `sharpee test` compiles
 * a claims file with, against the story beside it.
 *
 * @param {string} cliPath path to the CLI's cli.js
 * @returns {(dir: string, claimsFile: string) => string[]|null} the refusal's lines, or null when it compiles
 */
function claimsCheckerFor(cliPath) {
  const modulePath = path.join(path.dirname(cliPath), 'commands', 'test-claims.js');
  invariant(fs.existsSync(modulePath), `the CLI at ${cliPath} has no commands/test-claims.js beside it`);
  const { compileClaimsFragment } = require(modulePath);
  invariant(typeof compileClaimsFragment === 'function', `${modulePath} exports no compileClaimsFragment()`);
  return (dir, claimsFile) => {
    // The CLI reports a refusal on stderr and returns an exit code.
    const said = [];
    const original = console.error;
    console.error = (...parts) => said.push(parts.join(' '));
    let result;
    try {
      result = compileClaimsFragment(dir, claimsFile);
    } finally {
      console.error = original;
    }
    if (typeof result !== 'number') return null;
    return said.length ? said.flatMap((text) => text.split('\n')).map((line) => line.trim()).filter(Boolean) : [`the claims check returned ${result}`];
  };
}

/** The lines of an error worth showing: each diagnostic, with the temporary path shortened. */
function errorLines(error, sourcePath) {
  const text = String((error && error.message) || error);
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
    .map((line) => (sourcePath ? line.split(sourcePath).join('fence') : line));
}

// ---------------------------------------------------------------- the check

/**
 * Checks every `chord` fence in an edition.
 *
 * @param {object} options
 * @param {string} options.edition the edition directory
 * @param {string} options.cli path to the sharpee CLI's cli.js
 * @param {string} options.snapshots directory of companion snapshots (may not exist)
 * @param {string} options.harness directory holding world.story and, optionally, known-issues.json
 * @param {string} options.workDir an empty directory the wrapped sources are written to
 * @returns {Promise<{chapters: object[], failures: object[], proofs: object[], snapshots: object[]}>}
 *   one row per file with fences, every failure, how each proven fence was proven,
 *   and every snapshot's load result
 * @throws when the harness is missing or a table row does not add up
 */
async function checkEdition({ edition, cli, snapshots, harness, workDir }) {
  const worldPath = path.join(harness, 'world.story');
  invariant(fs.existsSync(worldPath), `no harness world at ${worldPath}`);
  const load = loaderFor(cli);
  const checkClaims = claimsCheckerFor(cli);
  // A fence's own harness: fences/<chapter file name>-<fence number, two digits>.story
  const fencesDir = path.join(harness, 'fences');
  const ownHarnesses = new Map(
    (fs.existsSync(fencesDir) ? fs.readdirSync(fencesDir) : []).filter((n) => n.endsWith('.story')).map((n) => [n.slice(0, -'.story'.length), path.join(fencesDir, n)]),
  );
  const usedHarnesses = new Set();
  // Fragments beside the harness world (an `import` in a fence finds them there).
  const harnessFragments = fs.readdirSync(harness).filter((n) => n.endsWith('.chord')).map((n) => path.join(harness, n));
  const worldSource = fs.readFileSync(worldPath, 'utf8');
  const allBlocks = topLevelBlocks(worldSource);
  const startBlock = allBlocks.filter((b) => b.key === 'before the game starts').map((b) => b.lines.join('\n')).join('\n');
  invariant(startBlock !== '', `${worldPath} has no \`before the game starts\` block`);
  const worldBlocks = allBlocks.filter((b) => b.key !== 'before the game starts');
  const issuesPath = path.join(harness, 'known-issues.json');
  const knownIssues = fs.existsSync(issuesPath) ? JSON.parse(fs.readFileSync(issuesPath, 'utf8')) : [];

  // Each snapshot directory, loaded at most once, on first use.
  const snapshotDirs = fs.existsSync(snapshots)
    ? fs.readdirSync(snapshots, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
    : [];
  const snapshotCache = new Map();
  const snapshotOf = async (name) => {
    if (snapshotCache.has(name)) return snapshotCache.get(name);
    const dir = path.join(snapshots, name);
    const sources = fs.readdirSync(dir).filter((n) => /\.(story|chord)$/.test(n)).sort();
    const lines = sources.flatMap((n) => [...fs.readFileSync(path.join(dir, n), 'utf8').split('\n').map((l) => l.replace(/\s+$/, '')), '']);
    let error = null;
    try {
      await load(dir);
    } catch (caught) {
      error = errorLines(caught, dir);
    }
    const blocks = sources.flatMap((n) => topLevelBlocks(fs.readFileSync(path.join(dir, n), 'utf8')));
    const entry = { name, lines, blocks, error };
    snapshotCache.set(name, entry);
    return entry;
  };

  const chapters = [];
  const failures = [];
  const proofs = [];
  let sequence = 0;

  for (const file of AREAS.flatMap((area) => markdownFiles(path.join(edition, area)))) {
    const relative = path.relative(edition, file);
    const fences = chordFences(fs.readFileSync(file, 'utf8'));
    if (fences.length === 0) continue;
    const number = (path.basename(file).match(/^(\d+)-/) || [])[1];
    const own = number && relative.startsWith('parts') ? `chapter-${number}` : null;
    const order = [...(own && snapshotDirs.includes(own) ? [own] : []), ...snapshotDirs.filter((n) => n !== own)];
    const row = { file: relative, fences: fences.length, complete: 0, snapshot: 0, fragment: 0, waiting: 0, failed: 0 };

    for (const [index, fence] of fences.entries()) {
      const lines = tidy(fence.text);
      const where = `${relative}:${fence.line}`;
      const issue = knownIssues.find((k) => k.file === relative && k.fence === index + 1);
      const fail = (kind, detail) => {
        row.failed++;
        failures.push({ where, fence: index + 1, kind, detail });
      };
      const tryLoad = async (repair, source, siblings) => {
        let current = source;
        for (let round = 0; ; round++) {
          const dir = path.join(workDir, String(++sequence).padStart(4, '0'));
          fs.mkdirSync(dir, { recursive: true });
          // A snapshot's imported fragments travel with it; otherwise the harness's own do.
          const fragments = siblings ? fs.readdirSync(siblings).filter((n) => n.endsWith('.chord')).map((n) => path.join(siblings, n)) : harnessFragments;
          for (const fragment of fragments) fs.copyFileSync(fragment, path.join(dir, path.basename(fragment)));
          const target = path.join(dir, 'fence.story');
          fs.writeFileSync(target, current.replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n'));
          try {
            await load(target);
            return null;
          } catch (caught) {
            const error = errorLines(caught, target);
            const repaired = repair && round < 2 ? repair(current, error) : null;
            if (repaired === null) return error;
            current = repaired;
          }
        }
      };

      if (lines.length === 0) {
        fail('empty', ['the fence has no content']);
        continue;
      }

      let proven = null;
      let via = null;
      let lastError = null;
      const isComplete = lines[0] === 'story' && keysDefinedBy(lines).has('before the game starts');
      const harnessKey = `${path.basename(file, '.md')}-${String(index + 1).padStart(2, '0')}`;
      if (ownHarnesses.has(harnessKey)) {
        usedHarnesses.add(harnessKey);
        const harnessPath = ownHarnesses.get(harnessKey);
        const expanded = expandHarness(fs.readFileSync(harnessPath, 'utf8'), lines);
        const base = expanded.snapshot || expanded.claims;
        invariant(!base || snapshotDirs.includes(base), `${harnessPath} names the snapshot ${base}, which does not exist`);
        const baseDir = base ? path.join(snapshots, base) : null;
        const baseStory = baseDir ? fs.readdirSync(baseDir).find((n) => n.endsWith('.story')) : null;
        let error;
        if (expanded.claims) {
          const dir = path.join(workDir, String(++sequence).padStart(4, '0'));
          fs.mkdirSync(dir, { recursive: true });
          for (const n of fs.readdirSync(baseDir).filter((n) => /\.(story|chord)$/.test(n) && !n.endsWith('.claims.chord'))) fs.copyFileSync(path.join(baseDir, n), path.join(dir, n));
          fs.writeFileSync(path.join(dir, 'fence.claims.chord'), `${expanded.lines.join('\n')}\n`);
          error = checkClaims(dir, 'fence.claims.chord');
        } else if (expanded.snapshot) {
          error = await tryLoad(withMissingPhrases, intoSnapshot(fs.readFileSync(path.join(baseDir, baseStory), 'utf8'), { header: [], top: expanded.lines }), baseDir);
        } else if (expanded.lines[0] === 'story') {
          error = await tryLoad(withMissingPhrases, expanded.lines.join('\n'), null);
        } else {
          error = await tryLoad(withMissingPhrases, intoWorld({ header: [], top: expanded.lines }, worldBlocks, startBlock), null);
        }
        const name = path.relative(edition, harnessPath);
        if (expanded.refused) {
          const refusedAsShown = error !== null && error.some((line) => line.includes(`[${expanded.refused}]`));
          if (refusedAsShown) [proven, via] = ['fragment', `refused with ${expanded.refused} in its own harness ${name}`];
          else lastError = [`in its own harness ${name} it should be refused with ${expanded.refused}, and ${error ? 'was refused with:' : 'it loaded'}`, ...(error || [])];
        } else if (error === null) {
          [proven, via] = ['fragment', `its own harness ${name}`];
        } else {
          lastError = [`in its own harness ${name}:`, ...error];
        }
      } else if (isComplete) {
        lastError = await tryLoad(null, lines.join('\n'), null);
        if (!lastError) [proven, via] = ['complete', 'loaded as it stands'];
      } else {
        for (const name of order) {
          const snapshot = await snapshotOf(name);
          if (!appearsIn(lines, snapshot.lines) && !snapshot.blocks.some((block) => excerptOf(lines, block.lines))) continue;
          if (snapshot.error) lastError = [`it appears in the snapshot ${name}, which does not load:`, ...snapshot.error];
          else [proven, via] = ['snapshot', `${appearsIn(lines, snapshot.lines) ? 'lines of' : 'an excerpt of a block in'} the snapshot ${name}`];
          break;
        }
        if (!proven && !lastError) {
          const tried = [];
          const attempts = [];
          const snapshotBases = [...new Set([own, snapshotDirs.filter((n) => /^chapter-\d+$/.test(n)).pop()])]
            .filter((name) => name && snapshotDirs.includes(name))
            .map((name) => ({ name, dir: path.join(snapshots, name) }))
            .map((base) => ({ ...base, story: fs.readdirSync(base.dir).find((n) => n.endsWith('.story')) }))
            .filter((base) => base.story);
          if (lines[0] === 'story') {
            attempts.push({ name: 'a header in the harness world', source: headerFenceSource(lines, worldBlocks, startBlock), siblings: null });
          } else {
            for (const context of CONTEXTS) {
              const wrapped = context.wrap(lines);
              if (wrapped === null) continue;
              attempts.push({ name: `${context.name} in the harness world`, source: intoWorld(wrapped, worldBlocks, startBlock), siblings: null });
              for (const base of snapshotBases) {
                attempts.push({
                  name: `${context.name} in the snapshot ${base.name}`,
                  source: intoSnapshot(fs.readFileSync(path.join(base.dir, base.story), 'utf8'), wrapped),
                  siblings: base.dir,
                });
              }
            }
          }
          for (const attempt of attempts) {
            const error = await tryLoad(withMissingPhrases, attempt.source, attempt.siblings);
            if (!error) {
              [proven, via] = ['fragment', attempt.name];
              break;
            }
            tried.push(`as ${attempt.name}: ${error.slice(1).join(' ') || error.join(' ')}`);
          }
          if (!proven) lastError = tried;
        }
      }

      if (issue) {
        if (proven) fail('known issue', [`listed in known-issues.json as waiting on #${issue.issue}, but it now loads; remove the entry`]);
        else row.waiting++;
      } else if (proven) {
        row[proven]++;
        proofs.push({ where, fence: index + 1, route: proven, via });
      } else {
        fail(isComplete ? 'complete' : 'fragment', lastError);
      }
    }

    invariant(
      row.complete + row.snapshot + row.fragment + row.waiting + row.failed === row.fences,
      `${relative}: the columns do not add up to its ${row.fences} fences`,
    );
    chapters.push(row);
  }

  // Every snapshot is loaded, used by a fence or not: the book points readers at each one.
  const snapshotResults = [];
  for (const name of snapshotDirs) {
    const snapshot = await snapshotOf(name);
    snapshotResults.push({ name, error: snapshot.error });
    if (snapshot.error) failures.push({ where: `snapshot ${name}`, fence: 0, kind: 'snapshot', detail: snapshot.error });
  }
  for (const key of ownHarnesses.keys()) {
    invariant(usedHarnesses.has(key), `the fence harness ${key}.story matches no fence`);
  }
  for (const known of knownIssues) {
    invariant(
      chapters.some((row) => row.file === known.file && known.fence >= 1 && known.fence <= row.fences),
      `known-issues.json names fence ${known.fence} of ${known.file}, which does not exist`,
    );
  }
  return { chapters, failures, proofs, snapshots: snapshotResults };
}

/** The per-chapter table, as lines of text. */
function formatTable(chapters) {
  const columns = ['fences', 'complete', 'snapshot', 'fragment', 'waiting', 'failed'];
  const total = { file: 'total' };
  for (const column of columns) total[column] = chapters.reduce((sum, row) => sum + row[column], 0);
  const rows = [...chapters, total];
  const width = Math.max(...rows.map((row) => row.file.length), 'chapter'.length);
  const line = (name, cells) => `${name.padEnd(width)}  ${cells.map((cell) => String(cell).padStart(8)).join(' ')}`;
  return [line('chapter', columns), ...rows.map((row) => line(row.file, columns.map((column) => row[column])))];
}

// ---------------------------------------------------------------- CLI

async function main(argv) {
  const args = argv.slice(2);
  const option = (name) => {
    const at = args.indexOf(name);
    if (at === -1) return undefined;
    const value = args[at + 1];
    args.splice(at, 2);
    return value;
  };
  const cli = path.resolve(option('--sharpee-cli') || DEFAULT_CLI);
  const snapshotsArg = option('--snapshots');
  const harnessArg = option('--harness');
  const flag = (name) => {
    const at = args.indexOf(name);
    if (at !== -1) args.splice(at, 1);
    return at !== -1;
  };
  const keep = flag('--keep');
  const list = flag('--list');
  const verbose = flag('--verbose');
  if (args.length !== 1 || args[0].startsWith('--')) {
    console.error(`usage: node scripts/check-chord-snippets.cjs <edition dir> [--sharpee-cli <cli.js>] [--snapshots <dir>] [--harness <dir>] [--keep] [--list] [--verbose]`);
    return 2;
  }
  const edition = path.resolve(args[0]);
  const snapshots = path.resolve(snapshotsArg || path.join(ROOT, 'tutorials/relighting', path.basename(edition)));
  const harness = path.resolve(harnessArg || path.join(edition, 'snippet-harness'));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chord-snippets-'));

  let result;
  try {
    result = await checkEdition({ edition, cli, snapshots, harness, workDir });
  } finally {
    if (keep) console.log(`wrapped sources kept in ${workDir}`);
    else fs.rmSync(workDir, { recursive: true, force: true });
  }

  if (list) {
    for (const proof of result.proofs) console.log(`${proof.where}  ${proof.route}: ${proof.via}`);
    console.log('');
  }
  for (const line of formatTable(result.chapters)) console.log(line);
  const loaded = result.snapshots.filter((s) => !s.error).length;
  console.log(`\nsnapshots: ${loaded} of ${result.snapshots.length} load`);
  for (const failure of result.failures) {
    console.log(`\nFAILED ${failure.where} (${failure.kind}${failure.fence ? `, fence ${failure.fence}` : ''})`);
    // A fragment is tried in every context; the first is shown, and --verbose shows the rest.
    const detail = failure.detail || [];
    const shown = verbose || failure.kind !== 'fragment' ? detail : detail.slice(0, 1);
    for (const line of shown) console.log(`  ${line}`);
    if (shown.length < detail.length) console.log(`  and it loads in none of the ${detail.length - shown.length} other contexts tried (--verbose lists them)`);
  }
  console.log(`\n${result.failures.length === 0 ? 'every fence is proven' : `${result.failures.length} failure(s)`}`);
  return result.failures.length === 0 ? 0 : 1;
}

if (require.main === module) {
  main(process.argv).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message || error);
      process.exit(1);
    },
  );
}

module.exports = { expandHarness, excerptOf, intoSnapshot, withMissingPhrases, chordFences, tidy, dedent, appearsIn, topLevelBlocks, blockKey, headerFor, checkEdition, formatTable, CONTEXTS };
