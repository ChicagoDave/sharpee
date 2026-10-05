/**
 * migrate.test.js — pins the kind-line migration (ADR-359 D1, plan Phase 3).
 *
 * Three layers, cheapest failure first:
 *
 *   1. the planner on Chord text — one fixture per rule and per refusal,
 *      asserting on the migrated text itself;
 *   2. each host — fences, TS/JS literals (quoted, template, `${}`, arrays of
 *      lines), Swift literals — asserting the file text after migration;
 *   3. the corpus — every file `--corpus` reaches, migrated in memory:
 *      nothing is left to migrate since the cutover, a second pass finds
 *      nothing (idempotent), and every in-repo story loses exactly its
 *      kind-line errors, with each entity keeping its kind and every
 *      kindless entity becoming `thing`.
 *
 * Everything runs the real Chord parser and compiler from
 * `packages/chord/dist`; nothing is stubbed. Build chord first.
 *
 * Run: node --test tools/migrate-kind-line/tests/
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { planChordText, applyEdits } = require('../core.js');
const { migrateFile } = require('../hosts.js');
const { walk, run, CORPUS_ROOTS } = require('../cli.js');

const REPO = path.resolve(__dirname, '..', '..', '..');
const { compile } = require(path.join(REPO, 'packages', 'chord', 'dist', 'index.js'));

/** Migrate Chord text through the planner alone. */
function migrate(text) {
  const plan = planChordText(text);
  return { text: applyEdits(text, plan.blocks.flatMap((b) => b.edits)), plan };
}

/** Chord source lines joined with `\n`. */
const src = (...lines) => lines.join('\n');

// --------------------------------------------------------------------------
// 1. the planner
// --------------------------------------------------------------------------

describe('planner rules', () => {
  test('a traits-only first composition line gets `a thing, ` in front', () => {
    const { text, plan } = migrate(src('create the rug', '  scenery', '  in the Hall', ''));
    assert.equal(text, src('create the rug', '  a thing, scenery', '  in the Hall', ''));
    assert.deepEqual(plan.blocks.map((b) => b.rule), ['prepend-thing']);
  });

  test('two traits keep their order behind `a thing`', () => {
    assert.equal(migrate(src('create the beans', '  scenery, plural', '')).text, src('create the beans', '  a thing, scenery, plural', ''));
  });

  test('a block with no composition line gets an `a thing` line after its header, at the body indent', () => {
    const { text, plan } = migrate(src('create the coin', '    in the Hall', '', '    A coin.', ''));
    assert.equal(text, src('create the coin', '    a thing', '    in the Hall', '', '    A coin.', ''));
    assert.deepEqual(plan.blocks.map((b) => b.rule), ['insert-line']);
  });

  test('a header-only block at the end of text without a newline gets the line too', () => {
    assert.equal(migrate(src('create the Hall', '  a room', '', 'create the box')).text, src('create the Hall', '  a room', '', 'create the box', '  a thing'));
  });

  test('a header-only block borrows the text\'s first indent', () => {
    assert.equal(migrate(src('create the Hall', '    a room', '', 'create the box', '')).text, src('create the Hall', '    a room', '', 'create the box', '    a thing', ''));
  });

  test('a kind after a trait on the same line moves to the front', () => {
    assert.equal(migrate(src('create the table', '  scenery, a supporter', '')).text, src('create the table', '  a supporter, scenery', ''));
  });

  test('a kind between traits moves to the front and its separator goes with it', () => {
    assert.equal(migrate(src('create the bag', '  wearable, a container, openable', '')).text, src('create the bag', '  a container, wearable, openable', ''));
  });

  test('a kind alone on a later line moves up with its settings and its line goes', () => {
    const { text, plan } = migrate(src('create the shelf', '  scenery', '  a supporter with capacity 2', '  in the Hall', ''));
    assert.equal(text, src('create the shelf', '  a supporter with capacity 2, scenery', '  in the Hall', ''));
    assert.deepEqual(plan.blocks.map((b) => b.rule), ['move-kind']);
  });

  test('blocks already kind-first are untouched: rooms, doors, people, things', () => {
    const before = src('create the Hall', '  a room', '', 'create the oak door', '  a door, openable', '', 'create Alex', '  a person', '', 'create the lamp', '  a thing, switchable', '');
    const { text, plan } = migrate(before);
    assert.equal(text, before);
    assert.equal(plan.blocks.length, 0);
  });

  test('two kind nouns are left alone and reported', () => {
    const before = src('create the crate', '  a container, a supporter', '');
    const { text, plan } = migrate(before);
    assert.equal(text, before);
    assert.deepEqual(plan.skipped.map((s) => [s.name, s.reason]), [['crate', 'two or more kind nouns']]);
  });

  test('a conditional kind is left alone and reported', () => {
    const before = src('create the chest', '  scenery, a container while the flag is set', '');
    const { text, plan } = migrate(before);
    assert.equal(text, before);
    assert.deepEqual(plan.skipped.map((s) => s.reason), ['conditional kind']);
  });

  test('CRLF text keeps CRLF on the inserted line', () => {
    const before = 'create the coin\r\n  in the Hall\r\n\r\ncreate the rug\r\n  scenery\r\n';
    assert.equal(migrate(before).text, 'create the coin\r\n  a thing\r\n  in the Hall\r\n\r\ncreate the rug\r\n  a thing, scenery\r\n');
  });

  test('a tab-indented block keeps its tab on the inserted line', () => {
    assert.equal(migrate('create the coin\n\tin the Hall\n').text, 'create the coin\n\ta thing\n\tin the Hall\n');
  });

  test('several blocks in one text all migrate in one pass', () => {
    const { text, plan } = migrate(src('create the rug', '  scenery', '', 'create the coin', '  in the Hall', '', 'create the table', '  scenery, a supporter', ''));
    assert.equal(text, src('create the rug', '  a thing, scenery', '', 'create the coin', '  a thing', '  in the Hall', '', 'create the table', '  a supporter, scenery', ''));
    assert.deepEqual(plan.blocks.map((b) => b.rule), ['prepend-thing', 'insert-line', 'move-kind']);
  });

  test('a second pass changes nothing', () => {
    const once = migrate(src('create the rug', '  scenery', '', 'create the coin', '', 'create the shelf', '  scenery', '  a supporter', '')).text;
    const twice = migrate(once);
    assert.equal(twice.text, once);
    assert.equal(twice.plan.blocks.length, 0);
  });

  test('a kind noun written without its article is left alone and reported', () => {
    const before = src('create the crate', '  scenery, container', '');
    const { text, plan } = migrate(before);
    assert.equal(text, before);
    assert.deepEqual(plan.skipped.map((s) => s.reason), ['kind noun without an article']);
  });

  test('a source with a parse error elsewhere still has its blocks migrated, and the error is counted', () => {
    const { text, plan } = migrate(src('create the rug', '  scenery', '', 'when @@@ !!!', '', 'create the coin', '  in the Hall', ''));
    assert.ok(plan.parseErrors > 0);
    assert.ok(text.includes('  a thing, scenery\n'));
    assert.ok(text.includes('create the coin\n  a thing\n  in the Hall'));
  });
});

// --------------------------------------------------------------------------
// 2. hosts
// --------------------------------------------------------------------------

describe('hosts', () => {
  test('a .story file is one view', () => {
    const r = migrateFile('x.story', src('create the rug', '  scenery', ''));
    assert.equal(r.text, src('create the rug', '  a thing, scenery', ''));
  });

  test('markdown: chord fences migrate, other fences and prose do not', () => {
    const md = src('Prose: create the rug.', '', '```chord', 'create the rug', '  scenery', '```', '', '```text', 'create the coin', '  in the Hall', '```', '');
    const r = migrateFile('page.mdx', md);
    assert.equal(r.text, src('Prose: create the rug.', '', '```chord', 'create the rug', '  a thing, scenery', '```', '', '```text', 'create the coin', '  in the Hall', '```', ''));
  });

  test('markdown: an indented fence keeps its indent on the inserted line', () => {
    const md = src('1. Step', '', '  ```chord', '  create the coin', '    in the Hall', '  ```', '');
    assert.equal(migrateFile('page.md', md).text, src('1. Step', '', '  ```chord', '  create the coin', '    a thing', '    in the Hall', '  ```', ''));
  });

  test('TS: a template literal at column 0 migrates in place', () => {
    const ts = 'const s = `\ncreate the coin\n  in the Hall\n`;\n';
    assert.equal(migrateFile('a.test.ts', ts).text, 'const s = `\ncreate the coin\n  a thing\n  in the Hall\n`;\n');
  });

  test('TS: an indented template literal is dedented to plan and re-indented to write', () => {
    const ts = 'const s = `\n    create the coin\n      in the Hall\n    create the rug\n      scenery\n  `;\n';
    assert.equal(migrateFile('a.test.ts', ts).text, 'const s = `\n    create the coin\n      a thing\n      in the Hall\n    create the rug\n      a thing, scenery\n  `;\n');
  });

  test('TS: a quoted string writes the new line as an escape', () => {
    const ts = "const s = 'create the coin\\n  in the Hall\\n';\n";
    assert.equal(migrateFile('a.ts', ts).text, "const s = 'create the coin\\n  a thing\\n  in the Hall\\n';\n");
  });

  test('TS: a moved kind keeps its quotes escaped for the host literal', () => {
    const ts = 'const s = "create the box\\n  scenery, a container with label \\"x\\"\\n";\n';
    assert.equal(migrateFile('a.ts', ts).text, 'const s = "create the box\\n  a container with label \\"x\\", scenery\\n";\n');
  });

  test('TS: `${}` inside a block skips that block, and the block beside it still migrates', () => {
    const ts = 'const s = `\ncreate the ${name}\n  scenery\n\ncreate the rug\n  scenery\n`;\n';
    const r = migrateFile('a.ts', ts);
    assert.equal(r.text, 'const s = `\ncreate the ${name}\n  scenery\n\ncreate the rug\n  a thing, scenery\n`;\n');
    assert.deepEqual(r.skipped.map((s) => s.reason), ['`${}` inside the block']);
  });

  test('TS: an array of lines gets new lines as new elements, separated like their neighbours', () => {
    const ts = "const s = [\n  'create the coin',\n  '  in the Hall',\n  'create the rug',\n  '  scenery',\n].join('\\n');\n";
    assert.equal(
      migrateFile('a.ts', ts).text,
      "const s = [\n  'create the coin',\n  '  a thing',\n  '  in the Hall',\n  'create the rug',\n  '  a thing, scenery',\n].join('\\n');\n",
    );
  });

  test('TS: a kind alone on its own array element moves up and its element goes', () => {
    const ts = "const s = ['create the shelf', '  scenery', '  a supporter', '  in the Hall'];\n";
    assert.equal(migrateFile('a.ts', ts).text, "const s = ['create the shelf', '  a supporter, scenery', '  in the Hall'];\n");
  });

  test('TS: a spread element is a stand-in line; a block it does not touch still migrates', () => {
    const ts = "const s = [...HEAD, 'create the rug', '  scenery'];\n";
    assert.equal(migrateFile('a.ts', ts).text, "const s = [...HEAD, 'create the rug', '  a thing, scenery'];\n");
  });

  test('TS: a `+` chain reads as one story — a kind on the next operand is not missing', () => {
    const ts = "const s = 'create Kemp\\n' +\n  '  a person, proper\\n' +\n  'create the rug\\n' +\n  '  scenery\\n';\n";
    assert.equal(
      migrateFile('a.ts', ts).text,
      "const s = 'create Kemp\\n' +\n  '  a person, proper\\n' +\n  'create the rug\\n' +\n  '  a thing, scenery\\n';\n",
    );
  });

  test('TS: a `+` chain keeps each operand\'s own quote when it inserts a line', () => {
    const ts = 'const s = "create the coin\\n" + \'  in the Hall\\n\';\n';
    assert.equal(migrateFile('a.ts', ts).text, 'const s = "create the coin\\n  a thing\\n" + \'  in the Hall\\n\';\n');
  });

  test('TS: a kind alone on its own `+` operand moves up and the operand goes with its `+`', () => {
    const ts = "const s = 'create the shelf\\n' + '  scenery\\n' + '  a supporter\\n' + '  in the Hall\\n';\n";
    assert.equal(migrateFile('a.ts', ts).text, "const s = 'create the shelf\\n' + '  a supporter, scenery\\n' + '  in the Hall\\n';\n");
  });

  test('TS: a `${}` at the start of a line supplies lines; the block after it migrates', () => {
    const ts = 'const s = `${HEADER}${WORLD}create the keeper\n  in the Lab\n`;\n';
    assert.equal(migrateFile('a.ts', ts).text, 'const s = `${HEADER}${WORLD}create the keeper\n  a thing\n  in the Lab\n`;\n');
  });

  test('TS: a block followed directly by a non-literal operand is skipped — the value may be its body', () => {
    const ts = "const s = 'create Kemp\\n' + BODY;\n";
    const r = migrateFile('a.ts', ts);
    assert.equal(r.text, ts);
    assert.deepEqual(r.skipped.map((s) => s.reason), ['`${}` right after the header may supply the block']);
  });

  test('TS: a block with lines of its own still migrates when a `${}` follows them', () => {
    const ts = 'const s = `\ncreate the sword\n  in the Yard\n${extra}\n  A sword.\n`;\n';
    assert.equal(migrateFile('a.ts', ts).text, 'const s = `\ncreate the sword\n  a thing\n  in the Yard\n${extra}\n  A sword.\n`;\n');
  });

  test('TS: a literal that ends on a bare header is a fragment and is skipped', () => {
    const ts = "src.replace('create the Alley', \"create the Stall\\n  a room\\n\\ncreate the Alley\");\n";
    const r = migrateFile('a.ts', ts);
    assert.equal(r.text, ts);
    assert.deepEqual(r.skipped.map((s) => s.reason), ['the literal ends on the block header']);
  });

  test('Swift: an expected substring that ends on a header and its newline is a fragment and is skipped', () => {
    const sw = 'XCTAssertTrue(buffer.contains("  Salt air.\\n\\nimport \\"h\\"\\ncreate the Pier\\n"), buffer)\n';
    const r = migrateFile('A.swift', sw);
    assert.equal(r.text, sw);
    assert.deepEqual(r.skipped.map((s) => s.reason), ['the literal ends on the block header']);
  });

  test('TS: a one-line literal is reported, never edited', () => {
    const ts = "throw new Error('create the player was removed');\n";
    const r = migrateFile('a.ts', ts);
    assert.equal(r.text, ts);
    assert.equal(r.reports.length, 1);
  });

  test('Swift: a multi-line literal strips the closing indent to plan and restores it to write', () => {
    const sw = 'let s = """\n    create the coin\n      in the Hall\n    """\n';
    assert.equal(migrateFile('A.swift', sw).text, 'let s = """\n    create the coin\n      a thing\n      in the Hall\n    """\n');
  });

  test('Swift: a one-line string with escapes migrates with escapes', () => {
    const sw = 'let s = "story \\"P\\"\\n\\ncreate the Lab\\n  in the Hall\\n"\n';
    assert.equal(migrateFile('A.swift', sw).text, 'let s = "story \\"P\\"\\n\\ncreate the Lab\\n  a thing\\n  in the Hall\\n"\n');
  });

  test('Swift: interpolation inside a block skips it; comments are not read', () => {
    const sw = '// create the rug\nlet s = "create the \\(name)\\n  scenery\\n"\n';
    const r = migrateFile('A.swift', sw);
    assert.equal(r.text, sw);
    assert.deepEqual(r.skipped.map((s) => s.reason), ['`${}` inside the block']);
  });

  test('C# is reported, not edited', () => {
    const cs = 'var s = "create the coin\\n  in the Hall\\n";\n';
    const r = migrateFile('A.cs', cs);
    assert.equal(r.text, cs);
    assert.equal(r.reports.length, 1);
  });
});

describe('cli run', () => {
  const setup = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kind-line-'));
    fs.writeFileSync(path.join(dir, 'a.story'), src('create the rug', '  scenery', ''));
    fs.writeFileSync(path.join(dir, 'b.story'), src('create the Hall', '  a room', ''));
    return dir;
  };

  test('a dry run tallies per file and writes nothing', () => {
    const dir = setup();
    const result = run(walk([dir]));
    assert.deepEqual(result.totals, { 'prepend-thing': 1, 'insert-line': 0, 'move-kind': 0 });
    assert.equal(result.files.length, 1);
    assert.equal(fs.readFileSync(path.join(dir, 'a.story'), 'utf8'), src('create the rug', '  scenery', ''));
  });

  test('--write rewrites only the files that change', () => {
    const dir = setup();
    const untouched = fs.statSync(path.join(dir, 'b.story')).mtimeMs;
    run(walk([dir]), { write: true });
    assert.equal(fs.readFileSync(path.join(dir, 'a.story'), 'utf8'), src('create the rug', '  a thing, scenery', ''));
    assert.equal(fs.statSync(path.join(dir, 'b.story')).mtimeMs, untouched);
  });
});

// --------------------------------------------------------------------------
// 3. the corpus (in memory; nothing is written)
// --------------------------------------------------------------------------

describe('corpus', () => {
  const files = walk(CORPUS_ROOTS.map((r) => path.join(REPO, r)));
  const migrated = new Map();
  for (const f of files) migrated.set(f, migrateFile(f, fs.readFileSync(f, 'utf8')));

  test('the walk reaches the corpus, and since the cutover nothing in it is left to migrate', () => {
    const hosts = files.filter((f) => /\.(story|chord)$/.test(f)).length;
    assert.ok(hosts > 100, `expected the full corpus, found ${hosts} story/chord files`);
    const left = [...migrated].filter(([, r]) => r.blocks.length > 0).map(([f]) => path.relative(REPO, f));
    assert.deepEqual(left, []);
  });

  test('a second pass over the migrated corpus plans nothing new', () => {
    for (const [f, r] of migrated) {
      if (r.blocks.length === 0) continue;
      const again = migrateFile(f, r.text);
      assert.equal(again.blocks.length, 0, `${path.relative(REPO, f)} changed on a second pass`);
      assert.equal(again.text, r.text);
    }
  });

  const stories = files.filter(
    (f) => f.endsWith('.story') && (f.includes(`${path.sep}stories${path.sep}`) || f.includes(`${path.sep}branch-stories${path.sep}`)),
  );

  /** Compile a story with imports read from a text source keyed by absolute path. */
  const compileWith = (file, textOf) =>
    compile(textOf(file), { importResolver: (p) => {
      const abs = path.join(path.dirname(file), p);
      return fs.existsSync(abs) ? textOf(abs) : null;
    } });

  for (const story of stories) {
    test(`${path.relative(REPO, story)} loses exactly its kind-line errors, and every entity names its kind`, () => {
      // Read against the enforcing compiler: before migration a story carries
      // missing-kind / kind-not-first errors; after, those and only those are gone.
      const before = compileWith(story, (f) => fs.readFileSync(f, 'utf8'));
      const after = compileWith(story, (f) => (migrated.has(f) ? migrated.get(f).text : fs.readFileSync(f, 'utf8')));
      const codes = (r) => r.diagnostics.map((d) => `${d.severity} ${d.code}`).sort();
      const kindLine = new Set(['error analysis.missing-kind-noun', 'error analysis.kind-not-first']);
      assert.deepEqual(codes(after), codes(before).filter((c) => !kindLine.has(c)));
      if (!after.ok) return;
      const kinds = (r) => r.ir.entities.map((e) => [e.id, e.kinds.map((k) => k.name).join(',')]);
      const expected = kinds(before).map(([id, k]) => [id, k === '' ? 'thing' : k]);
      assert.deepEqual(kinds(after), expected);
    });
  }
});
