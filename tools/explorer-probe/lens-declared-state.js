/**
 * lens-declared-state.js — the second testing-explorer lens (issue #515):
 * "declared states nothing assigns".
 *
 * For every entity state a story declares (and the story's own state), report
 * what no rule ever does with it. Static and zero-execution: the verdict is
 * read off the compiled IR the engine loads, never off Chord source text, and
 * nothing is run. This is a lens by output shape — one question, real
 * findings, no exhaustiveness claim (ADR-294 D23) — not by mechanism; it
 * borrows nothing from the walker.
 *
 * DIRECTIONS — each finding carries one:
 *
 *   never-assigned      a declared value no `change` statement ever writes.
 *                       Dead vocabulary, or a bug: a clause gated on it can
 *                       never fire. The FIRST declared value is excluded —
 *                       the loader assigns it at load time, not a rule
 *                       (`story-loader/src/loader.ts`, `setStateValue(...,
 *                       irEntity.states[0])`; likewise `story.states[0]`), so
 *                       fernhill's `vine: seedling` is assigned even though no
 *                       statement names it. Do not "fix" that as a missed case.
 *   never-read          a dimension some rule writes but no rule ever reads
 *                       any value of: an inert dimension, nothing can branch
 *                       on it. Reported per ENTITY, not per value. Per value
 *                       is noise on fernhill: the boiler's `primed` is a
 *                       progression step nothing needs to test, and tobias's
 *                       initial `steady` is read as `not shaken`. Which values
 *                       are read is kept in the data (`dimensions[].read`).
 *
 * Two more directions were built and then removed, because the compiler
 * already refuses them at load time (measured on this lens's own fixture,
 * 2026-09-24): a rule testing an entity for a value it never declares is
 * `analysis.unknown-value` ("not a state of lamp or a known trait" — the
 * "known trait" half is why `boiler is off` compiles: the boiler is
 * switchable), and a `change` to an undeclared value is
 * `analysis.undeclared-state`. Neither can exist in a compiled IR, so a lens
 * over the IR has nothing to find; ADR-322 D8 says do not rebuild what
 * ships, and a compiler gate is the strongest form of shipped.
 *
 * SURFACES. The assigned side is `@sharpee/world-index`'s `collectStateWriters`
 * (ADR-322 D8: consume ADR-321's derivations, never rebuild them). It walks
 * entity `onClauses`, `topics` and `manner`, trait `onClauses` expanded once
 * per composing entity with `it` bound to that entity (the trait-owned
 * `change it to fruiting` the measurement spike first misread as never
 * assigned), machine states' `onEnter`/`onExit`, and the story-level roots.
 * It does NOT walk entity `timerClauses`, `moveClauses` or `exchanges`
 * (issue #517 — measured 2026-09-24: 8 + 1 writes in secret-letter, 1 in
 * ides-of-march, which made three of secret-letter's states look never
 * assigned), and it omits story-state writes (`change` whose entity is
 * `{kind:'story'}`). So the lens unions the platform walk with a whole-IR
 * sweep of the same shape (`collectAllStateWriters`) and reports every writer
 * only the sweep found as `platformGap`; when #517 closes, that list empties
 * and the pin says so.
 *
 * The read side has no platform derivation to consume (verified: world-index's
 * `conditions.ts` evaluates reachability gates, it does not enumerate reads;
 * `dimensions.js`'s harvest never roots at topics, manner, machines or
 * traits), so `collectStateReads` below is local. It is shaped like
 * `collectStateWriters` — same owners, same `it` binding — so it can move to
 * world-index unchanged; that move is a discussion item, not done here. It
 * walks EVERY root of the IR, not a chosen list: a missed read is a false
 * never-read finding, and the soundness contract forbids that. Reads are:
 *
 *   predicate `is`     subject entity/it, object symbol   → (entity, value)
 *   select-on          subject `it.state` / `<entity>.state`, one arm per
 *                      value                              → (entity, value) each
 *   story-state        → (story, value)
 *
 * USAGE
 *
 *   node tools/explorer-probe/lens-declared-state.js <story.story> [--all] [--json]
 *
 * The story must be compiled first (`<dir>/dist/<stem>.ir.json`, as
 * `./sharpee compose` writes it). `--all` also prints the per-dimension
 * record. `--json` prints the report:
 *
 *   {
 *     lens: 'declared-state', format: 1,
 *     story,
 *     counts: { <direction>: n, ... },
 *     findings:   [ { direction, entity, state?, sources: [ { owner, line } ] }, .. ],
 *     dimensions: [ { entity, name, declared: [..], initial,
 *                     written: { <value>: [ { owner, line } ] },
 *                     read:    { <value>: [ { owner, line } ] } }, .. ],
 *     platformGap: [ { target, state, owner, line }, .. ]
 *   }
 *
 * `entity` is the IR id, or `story` for the story's own state. `owner` is
 * `entity:<id>`, `machine:<name>` or `story`, as world-index tags writers.
 * Findings are sorted by direction (the order above), then entity, then
 * value; `dimensions` follows IR declaration order. Everything is
 * deterministic for a given IR.
 *
 * REGRESSION PIN — `node --test 'tools/explorer-probe/tests/*.test.js'` pins
 * the walks and classifier on IR fragments, the fixture under
 * `fixtures/declared-state-fixture/` (compiled from source at test time; one
 * yard exercising every surface above and both directions), and the corpus:
 * fernhill (9 dimensions, clean) and secret-letter (41, clean, nine missed
 * writers by line). A prose or compiler change that moves a dimension shows
 * up there as a diff.
 *
 * Public interface: CLI as above; module — `runLens(storyPath)`,
 * `collectStateReads(ir)`, `collectStoryStateWriters(ir)`, `classify(ir)`,
 * `printReport(report, opts, out)`.
 * Owner context: tools/ — the testing-explorer, outside the published packages.
 */

const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const { loadStoryIR } = require('./dimensions.js');
const { collectStateWriters } = require(path.join(REPO, 'packages/world-index/dist/index.js'));

/** The id under which the story's own state is reported. */
const STORY = 'story';

/** Finding directions, in report order. */
const DIRECTIONS = ['never-assigned', 'never-read'];

// ---------------------------------------------------------------------------
// The read-side walk — shaped like world-index's collectStateWriters
// ---------------------------------------------------------------------------

function isWalkable(node) {
  return typeof node === 'object' && node !== null;
}

/** The entity a subject value names: an id, the `it` binding, or undefined. */
function subjectOf(value, itBinding) {
  if (!isWalkable(value) || Array.isArray(value)) return undefined;
  if (value.kind === 'entity' && typeof value.id === 'string') return value.id;
  if (value.kind === 'it') return itBinding;
  return undefined;
}

function lineOf(node) {
  return node && node.span && typeof node.span.line === 'number' ? node.span.line : null;
}

/**
 * Collect every state read in a subtree.
 *
 * @param root      the subtree
 * @param owner     what the read belongs to (`entity:<id>`, `machine:<name>`, `story`)
 * @param itBinding the entity `it` refers to here, if any
 * @param into      accumulator of { target, state, owner, line, via }
 */
function walkForReads(root, owner, itBinding, into) {
  if (!isWalkable(root)) return;
  if (Array.isArray(root)) {
    for (const child of root) walkForReads(child, owner, itBinding, into);
    return;
  }
  const node = root;
  if (node.kind === 'predicate' && node.pred === 'is') {
    const target = subjectOf(node.subject, itBinding);
    const object = node.object;
    if (target !== undefined && isWalkable(object) && object.kind === 'symbol' && typeof object.name === 'string') {
      into.push({ target, state: object.name, owner, line: lineOf(node), via: 'is' });
    }
  } else if (node.kind === 'select-on') {
    const subject = node.subject;
    const base = isWalkable(subject) && subject.kind === 'field' && subject.field === 'state' ? subject.base : undefined;
    const target = subjectOf(base, itBinding);
    if (target !== undefined) {
      for (const arm of node.arms || []) {
        if (typeof arm.value === 'string') {
          into.push({ target, state: arm.value, owner, line: lineOf(arm) || lineOf(node), via: 'select-on' });
        }
      }
    }
  } else if (node.kind === 'story-state' && typeof node.state === 'string') {
    into.push({ target: STORY, state: node.state, owner, line: lineOf(node), via: 'story-state' });
  }
  for (const key of Object.keys(node)) walkForReads(node[key], owner, itBinding, into);
}

/** Every entity composing a named trait, in declaration order. */
function composersOf(ir, traitName) {
  return (ir.entities || []).filter((e) => (e.traits || []).some((t) => t.name === traitName));
}

/**
 * Every state read in the story, resolved to the entity (or the story) it
 * tests and the value it tests for.
 *
 * Every root of the IR is walked: entities whole (their `states` list is not
 * a read and holds no nodes), traits once per composing entity with `it`
 * bound, machines, and every other top-level key as story-owned.
 *
 * @param ir the compiled story IR
 * @returns Array<{ target, state, owner, line, via }>
 */
function collectStateReads(ir) {
  const reads = [];
  for (const entity of ir.entities || []) {
    const { states, ...rest } = entity;
    walkForReads(rest, 'entity:' + entity.id, entity.id, reads);
  }
  for (const trait of ir.traits || []) {
    for (const composer of composersOf(ir, trait.name)) {
      walkForReads(trait, 'entity:' + composer.id, composer.id, reads);
    }
  }
  for (const machine of ir.machines || []) {
    walkForReads(machine, 'machine:' + machine.name, undefined, reads);
  }
  for (const key of Object.keys(ir)) {
    if (key === 'entities' || key === 'traits' || key === 'machines') continue;
    walkForReads(ir[key], STORY, undefined, reads);
  }
  return reads;
}

/**
 * Every `change` of the story's own state. world-index's collector resolves
 * only entity and `it` targets, so the story target is collected here.
 *
 * @returns Array<{ target: 'story', state, owner: 'story', line }>
 */
function collectStoryStateWriters(ir) {
  const writers = [];
  const walk = (root) => {
    if (!isWalkable(root)) return;
    if (Array.isArray(root)) { for (const c of root) walk(c); return; }
    if (root.kind === 'change' && isWalkable(root.entity) && root.entity.kind === 'story' && typeof root.state === 'string') {
      writers.push({ target: STORY, state: root.state, owner: STORY, line: lineOf(root) });
    }
    for (const key of Object.keys(root)) walk(root[key]);
  };
  walk(ir);
  return writers;
}

/** Every entity-targeted `change` in a subtree, with the same shape as world-index's rows. */
function walkForWriters(root, owner, itBinding, into) {
  if (!isWalkable(root)) return;
  if (Array.isArray(root)) { for (const c of root) walkForWriters(c, owner, itBinding, into); return; }
  if (root.kind === 'change' && typeof root.state === 'string') {
    const target = subjectOf(root.entity, itBinding);
    if (target !== undefined) into.push({ target, state: root.state, owner, line: lineOf(root) });
  }
  for (const key of Object.keys(root)) walkForWriters(root[key], owner, itBinding, into);
}

/**
 * Every entity state write in the story: world-index's `collectStateWriters`
 * (ADR-322 D8 — consumed, not rebuilt) plus a whole-IR sweep of the same
 * shape, because the platform walk roots at a chosen list of surfaces and
 * the sweep found writes it misses. Measured 2026-09-24 over every `change`
 * in the four compiled stories: the platform walk sees entity `onClauses`,
 * `topics`, `manner`, traits, machines and the story roots, and misses three
 * entity surfaces — `timerClauses` (`when <timer> expires`, 8 writes in
 * secret-letter), `moveClauses` (1 in secret-letter) and `exchanges` (1 in
 * ides-of-march). That made all three of secret-letter's never-assigned rows
 * false. A missed writer is a false finding, so the union is used and the
 * difference is reported as `platformGap` — the evidence for closing the
 * gap upstream, where Reach's gate-opening check (ADR-321 D4) has the same
 * blind spot.
 *
 * @returns { writers, platformGap } — every write, and the ones only the sweep found
 */
function collectAllStateWriters(ir) {
  const platform = collectStateWriters(ir).map((w) => ({ target: w.target, state: w.state, owner: ownerLabel(w.owner), line: w.line }));
  const swept = [];
  for (const entity of ir.entities || []) {
    const { states, ...rest } = entity;
    walkForWriters(rest, 'entity:' + entity.id, entity.id, swept);
  }
  for (const trait of ir.traits || []) {
    for (const composer of composersOf(ir, trait.name)) walkForWriters(trait, 'entity:' + composer.id, composer.id, swept);
  }
  for (const machine of ir.machines || []) walkForWriters(machine, 'machine:' + machine.name, undefined, swept);
  for (const key of Object.keys(ir)) {
    if (key === 'entities' || key === 'traits' || key === 'machines') continue;
    walkForWriters(ir[key], STORY, undefined, swept);
  }
  const seen = new Set(platform.map((w) => [w.target, w.state, w.owner, w.line].join('|')));
  const platformGap = swept.filter((w) => !seen.has([w.target, w.state, w.owner, w.line].join('|')));
  return { writers: [...platform, ...platformGap], platformGap };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/** world-index's WriterOwner, flattened to the same string form as reads. */
function ownerLabel(owner) {
  if (typeof owner === 'string') return owner;
  if (owner.kind === 'entity') return 'entity:' + owner.id;
  if (owner.kind === 'machine') return 'machine:' + owner.name;
  return STORY;
}

/** Group { target, state, owner, line } rows into target → value → sources. */
function byTargetAndValue(rows) {
  const out = new Map();
  for (const r of rows) {
    let values = out.get(r.target);
    if (!values) { values = new Map(); out.set(r.target, values); }
    let sources = values.get(r.state);
    if (!sources) { sources = []; values.set(r.state, sources); }
    sources.push({ owner: ownerLabel(r.owner), line: r.line });
  }
  return out;
}

function toObject(map) {
  const o = {};
  for (const [k, v] of map || []) o[k] = v;
  return o;
}

/**
 * Classify every declared dimension of the story.
 *
 * @param ir the compiled story IR
 * @returns { findings, dimensions } — see the header for both shapes
 */
function classify(ir) {
  const { writers, platformGap } = collectAllStateWriters(ir);
  const written = byTargetAndValue([...writers, ...collectStoryStateWriters(ir)]);
  const read = byTargetAndValue(collectStateReads(ir));

  // Declared dimensions: entities with two or more values (one value has
  // nothing to assign or read — dimensions.js draws the same line), plus the
  // story's own state when it declares any.
  const declared = [];
  for (const e of ir.entities || []) {
    if (Array.isArray(e.states) && e.states.length >= 2) declared.push({ entity: e.id, name: e.name, states: e.states });
  }
  const storyStates = (ir.story && ir.story.states) || [];
  if (storyStates.length >= 2) declared.push({ entity: STORY, name: 'the story', states: storyStates });
  const findings = [];
  const dimensions = [];
  for (const d of declared) {
    const w = written.get(d.entity) || new Map();
    const r = read.get(d.entity) || new Map();
    dimensions.push({ entity: d.entity, name: d.name, declared: d.states, initial: d.states[0], written: toObject(w), read: toObject(r) });

    for (const value of d.states.slice(1)) {
      if (!w.has(value)) findings.push({ direction: 'never-assigned', entity: d.entity, state: value, sources: [] });
    }
    if (w.size > 0 && r.size === 0) {
      findings.push({ direction: 'never-read', entity: d.entity, sources: [...w.values()].flat() });
    }
  }

  const key = (f) => [DIRECTIONS.indexOf(f.direction), f.entity, f.state || ''];
  findings.sort((a, b) => {
    const [da, ea, sa] = key(a); const [db, eb, sb] = key(b);
    return da - db || (ea < eb ? -1 : ea > eb ? 1 : 0) || (sa < sb ? -1 : sa > sb ? 1 : 0);
  });
  return { findings, dimensions, platformGap };
}

// ---------------------------------------------------------------------------
// The lens
// ---------------------------------------------------------------------------

/**
 * Run the lens over a compiled story.
 *
 * @param storyPath absolute path to the `.story` file (its `dist/` IR is read)
 * @returns the format-1 report described in the header
 */
function runLens(storyPath) {
  const ir = loadStoryIR(storyPath);
  const { findings, dimensions, platformGap } = classify(ir);
  const counts = {};
  for (const f of findings) counts[f.direction] = (counts[f.direction] || 0) + 1;
  return { lens: 'declared-state', format: 1, story: path.basename(storyPath), counts, findings, dimensions, platformGap };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { story: null, json: false, all: false };
  for (const a of argv) {
    if (a === '--json') opts.json = true;
    else if (a === '--all') opts.all = true;
    else if (!opts.story) opts.story = a;
  }
  return opts;
}

function sourceText(s) {
  return s.owner + (s.line !== null && s.line !== undefined ? ':' + s.line : '');
}

/**
 * Print the console form: header, findings grouped by direction, and with
 * `--all` the per-dimension record.
 *
 * @param out line sink (default `console.log`); tests capture it
 */
function printReport(report, opts, out = console.log) {
  out('');
  out('story             ' + report.story);
  out('dimensions        ' + report.dimensions.length + ' declared (entities with two or more states' + (report.dimensions.some((d) => d.entity === STORY) ? ', plus the story' : '') + ')');
  out('findings          ' + (report.findings.length ? DIRECTIONS.filter((d) => report.counts[d]).map((d) => d + ' ' + report.counts[d]).join(', ') : 'none'));
  out('');

  for (const direction of DIRECTIONS) {
    const rows = report.findings.filter((f) => f.direction === direction);
    if (!rows.length) continue;
    out('== ' + direction + '  (' + rows.length + ')');
    for (const f of rows) {
      const what = f.state !== undefined ? f.entity + ' is ' + f.state : f.entity;
      out('   ' + what);
      if (f.sources.length) out('      ' + (direction === 'never-read' ? 'written at: ' : 'at: ') + f.sources.map(sourceText).join(', '));
    }
    out('');
  }

  if (opts.all) {
    out('== dimensions');
    for (const d of report.dimensions) {
      out('   ' + d.entity + '  [' + d.declared.join(', ') + ']');
      out('      written: ' + (Object.keys(d.written).join(', ') || '-') + '   read: ' + (Object.keys(d.read).join(', ') || '-'));
    }
    out('');
  }

  if (report.platformGap.length) {
    out('== writes world-index\'s collectStateWriters does not see  (' + report.platformGap.length + ')');
    for (const w of report.platformGap) out('   ' + w.target + ' to ' + w.state + '   at: ' + sourceText(w));
    out('');
  }

  out('Findings are real: each is a fact of the compiled IR the engine loads. Absence is');
  out('not proof of anything about play: this lens runs nothing and reads no prose.');
  out('');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.story) {
    console.error('usage: node tools/explorer-probe/lens-declared-state.js <story.story> [--all] [--json]');
    process.exit(2);
  }
  const report = runLens(path.resolve(opts.story));
  if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
  printReport(report, opts);
}

module.exports = { runLens, classify, collectStateReads, collectStoryStateWriters, printReport, DIRECTIONS };

if (require.main === module) {
  try { main(); } catch (e) { console.error(e && e.stack || e); process.exit(1); }
}
