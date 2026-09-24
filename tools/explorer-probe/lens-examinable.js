/**
 * lens-examinable.js — the first testing-explorer lens (issue #508):
 * "mentioned but not examinable".
 *
 * For every room the walker can reach, take the prose a player actually sees
 * there — the room's description and the description of everything in view —
 * pull out the noun phrases, and hand each one to the real parser and engine
 * as `examine <phrase>`. Report every phrase the engine could not resolve in
 * scope, and every one that resolved to the default examine response.
 *
 * REAL PATH ONLY. The verdict is the engine's: a phrase "resolves" when
 * `game.executeCommand('examine ' + phrase)` produces an `if.event.examined`
 * event, and its class is read off that event's `messageId`. No text is
 * matched and no vocabulary-resolver stands in for the parser.
 *
 * The three design questions from the plan, and how each was settled:
 *
 * 1. EXTRACTION — `@sharpee/world-index`'s `extractNounPhrases` (ADR-321 D6b),
 *    the shipping, corpus-pinned heuristic the IDE's world index already uses.
 *    No NLP dependency, no second heuristic. `readsAsThing` from the same
 *    module is used ONLY to hide non-resolutions whose head noun is not a
 *    thing an author could implement (`the dark`, `the cold`); it never
 *    decides whether a phrase resolved, and `--all` shows what it hid.
 *
 *    Recall, measured on secret-letter 2026-09-23 against the story's own
 *    entity names in the prose the lens saw: 520 head-noun mentions, 66%
 *    covered by an extracted phrase, 34% missed. Of the misses, 146 have no
 *    article before them — `your cloak`, `with shoppers`, `woolen cap`,
 *    `wooden crates` — and 33 sit after an article the extractor did anchor
 *    on but ran past (`the wires anchor the support posts` yields `wires
 *    anchor`). Decision: ACCEPT the gap here rather than grow a second
 *    anchor list in this tool. The extractor is `@sharpee/world-index`'s,
 *    pinned by its corpus test and shared with the IDE's static check; the
 *    one extension the numbers argue for — possessive determiners (`your`,
 *    `their`, `its`) as anchors — belongs there, for both consumers, and is
 *    raised as a discussion item, not built.
 *
 * 2. DEFAULT-RESPONSE DETECTION — by `messageId`. `examining-data.ts`'s
 *    `buildExaminingMessageParams` forces `default_description` whenever
 *    `params.description` is undefined (and `default_description_self` for
 *    the player, `nothing_special` for a wall with no per-side text), so the
 *    id is the complete signal. Every other `if.action.examining.*` id is a
 *    described object.
 *
 * 3. EXECUTION SURFACE — `game.executeCommand`, the same entry a player's
 *    typed command takes. Non-resolution is NOT a `parser.error.*` event on
 *    this path (measured on fernhill, 2026-09-23): the parser accepts
 *    `examine zzyzx`, the validator fails with `ENTITY_NOT_FOUND`, and the
 *    executor throws, which surfaces as a `command.failed` event whose
 *    `reason` carries the code and as `lastTurnResult.error`. A tie between
 *    candidates surfaces as a `client.query` disambiguation event. An
 *    in-scope-but-not-visible target is refused by the action's own
 *    `validate()` and comes back as a BLOCKED `if.event.examined`.
 *
 *    A story-authored `on the player examining` clause (secret-letter's
 *    shoppers, stalls, wires, market, silk tent) swaps the message id on
 *    that same `if.event.examined` event for the Chord phrase id
 *    (`stalls-from-junction`), and an `after` clause appends `chord.phrase`
 *    events. Both classify as resolved-described; the detail column shows
 *    the authored id. Verified on 25 real rows, 2026-09-23.
 *
 * Soundness (ADR-294 D20 / ADR-322 D7): a finding is real — the engine
 * really did not resolve that phrase in that room, in the state the walk
 * first reached it. Absence is not proof: the report carries the walk's
 * `stopReason` and rooms reached against rooms declared, and never claims
 * to have seen everything.
 *
 * Public interface: CLI —
 *   node tools/explorer-probe/lens-examinable.js <story.story> [--seed N]
 *     [--max-seconds N] [--max-states N] [--all] [--json]
 * Owner context: tools/ — the testing-explorer, outside the published packages.
 */

const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const { explore } = require('./explore.js');
const { extractNounPhrases, readsAsThing } = require(path.join(REPO, 'packages/world-index/dist/index.js'));

/** Examine message ids that mean "resolved, but the author wrote nothing." */
const DEFAULT_RESPONSE_SUFFIXES = ['.default_description', '.default_description_self', '.nothing_special'];

// ---------------------------------------------------------------------------
// Classification — reading the engine's answer
// ---------------------------------------------------------------------------

/**
 * Classify one executed `examine <phrase>` from the events it produced.
 *
 * @param events   `game.lastEvents` after the command
 * @param result   `game.lastTurnResult` after the command (may be null)
 * @param error    `game.lastError` — set when the engine threw instead of
 *                 producing a turn (e.g. the game had already ended)
 * @returns {{ kind: string, detail?: string, target?: string }} where kind is
 *   one of resolved-described | resolved-default | not-in-scope | ambiguous |
 *   unclassified. `unclassified` is a lens defect to look at, never dropped.
 */
function classify(events, result, error) {
  const examined = events.find((e) => e.type === 'if.event.examined' && !(e.data && e.data.isContentsMessage));
  if (examined) {
    const d = examined.data || {};
    const id = String(d.messageId || '');
    if (d.blocked) return { kind: 'not-in-scope', detail: id, target: d.targetName };
    if (DEFAULT_RESPONSE_SUFFIXES.some((s) => id.endsWith(s))) {
      return { kind: 'resolved-default', detail: id, target: d.targetName };
    }
    return { kind: 'resolved-described', detail: id, target: d.targetName };
  }

  const query = events.find((e) => e.type === 'client.query');
  if (query) {
    const d = query.data || {};
    const names = (d.candidates || []).map((c) => (c && (c.name || c.id)) || String(c));
    return { kind: 'ambiguous', detail: names.join(' / ') || String(d.messageId || 'query') };
  }

  const failed = events.find((e) => e.type === 'command.failed');
  if (failed || (result && result.success === false)) {
    const reason = (failed && failed.data && failed.data.reason) || (result && result.error) || 'failed';
    return { kind: 'not-in-scope', detail: String(reason) };
  }

  return { kind: 'unclassified', detail: (error ? String(error) + ' ' : '') + events.map((e) => e.type).join(',') };
}

// ---------------------------------------------------------------------------
// Per-room work — the hook the walker calls
// ---------------------------------------------------------------------------

/**
 * The prose a player sees on arriving in `room`: the room's own description
 * and each visible entity's, through the same computed `description` getter
 * `examining-data.ts` reads.
 *
 * @returns Array<{ source: string, text: string }>
 */
function visibleProse(world, room) {
  const player = world.getPlayer();
  const out = [];
  if (room.description) out.push({ source: 'room', text: String(room.description) });
  for (const e of world.getVisible(player.id) || []) {
    if (e.id === room.id || e.id === player.id) continue;
    if (e.description) out.push({ source: e.name, text: String(e.description) });
  }
  return out;
}

/**
 * Fold the phrases across a room's prose: one row per distinct phrase, with
 * every source it came from.
 *
 * @returns Map<phrase, { noun, sources: string[] }>
 */
function phrasesIn(prose) {
  const folded = new Map();
  for (const { source, text } of prose) {
    for (const noun of extractNounPhrases(text)) {
      const row = folded.get(noun.phrase) || { noun, sources: [] };
      if (!row.sources.includes(source)) row.sources.push(source);
      folded.set(noun.phrase, row);
    }
  }
  return folded;
}

/**
 * Examine every phrase mentioned in `room`, restoring the room's save before
 * each so no examine sees another's side effects.
 *
 * @returns the room's report row
 */
async function examineRoom(ctx, tally) {
  const { game, world, room, restore } = ctx;

  // A room first seen in the move that ENDS the game is not a room the
  // player ever gets a turn in, so its phrases are not findings. The engine
  // derives its stopped phase from this same world ending, so reading it
  // here (before any restore) is the engine's own signal. Measured
  // 2026-09-23: secret-letter's "On the Wire" is NOT such a room — the slide
  // is two turns and the player gets exactly one command mid-wire, so its
  // rows stand.
  const ending = typeof world.getEnding === 'function' ? world.getEnding() : world.storyEnding;
  if (ending) {
    return { roomId: room.id, room: room.name, path: ctx.path, ended: true, prose: [], rows: [] };
  }

  const prose = visibleProse(world, room);
  const folded = phrasesIn(prose);

  const rows = [];
  for (const [phrase, { noun, sources }] of folded) {
    await restore();
    try {
      await game.executeCommand('examine ' + phrase);
    } catch (err) {
      // The harness catches engine errors itself; this is belt and braces.
    }
    tally.executed++;
    const verdict = classify(game.lastEvents || [], game.lastTurnResult, game.lastError);
    rows.push({
      phrase,
      kind: verdict.kind,
      detail: verdict.detail,
      target: verdict.target,
      sources,
      // Only a non-resolution is asked "is this even a thing" (readsAsThing's
      // own contract); a phrase that resolved is a thing by demonstration.
      thing: verdict.kind === 'not-in-scope' ? readsAsThing(noun) : true,
    });
  }
  await restore();

  return {
    roomId: room.id,
    room: room.name,
    path: ctx.path,
    // The prose as the player saw it, so a finding can quote its source and
    // so extractor recall can be measured against the text itself.
    prose,
    rows,
  };
}

// ---------------------------------------------------------------------------
// The lens
// ---------------------------------------------------------------------------

/**
 * Run the lens over every reachable room of a story.
 *
 * @param storyPath absolute path to the `.story` file
 * @param opts.seed / maxSeconds / maxStates / maxDepth — walk budgets
 * @returns the lens report: per-room rows plus the walk's soundness facts
 */
async function runLens(storyPath, opts) {
  const rooms = [];
  const tally = { executed: 0 };
  const walk = await explore(storyPath, {
    seed: opts.seed,
    hash: 'declared',
    breadth: 'basic',
    maxStates: opts.maxStates,
    maxSeconds: opts.maxSeconds,
    maxDepth: opts.maxDepth,
    stopWhenAllRoomsSeen: true,
    onRoomFirstSeen: async (ctx) => { rooms.push(await examineRoom(ctx, tally)); },
  });

  const counts = {};
  for (const r of rooms) for (const row of r.rows) counts[row.kind] = (counts[row.kind] || 0) + 1;

  return {
    story: path.basename(storyPath),
    seed: walk.seed,
    walk: {
      stopReason: walk.stopReason,
      roomsReached: walk.roomsReached,
      roomsDeclared: walk.roomsDeclared,
      statesDiscovered: walk.statesDiscovered,
      walkMs: walk.walkMs,
    },
    phrasesExecuted: tally.executed,
    counts,
    rooms,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { story: null, seed: 1209, maxStates: 5000, maxSeconds: 120, maxDepth: 40, json: false, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed') opts.seed = Number(argv[++i]);
    else if (a === '--max-states') opts.maxStates = Number(argv[++i]);
    else if (a === '--max-seconds') opts.maxSeconds = Number(argv[++i]);
    else if (a === '--max-depth') opts.maxDepth = Number(argv[++i]);
    else if (a === '--json') opts.json = true;
    else if (a === '--all') opts.all = true;
    else if (!opts.story) opts.story = a;
  }
  return opts;
}

/** A finding row is anything that is not a described resolution. */
function isFinding(row) {
  return row.kind !== 'resolved-described';
}

function printReport(report, opts) {
  const w = report.walk;
  console.log('');
  console.log('story             ' + report.story + '  (seed ' + report.seed + ')');
  console.log('rooms reached     ' + w.roomsReached + (w.roomsDeclared !== undefined ? ' of ' + w.roomsDeclared + ' declared' : ''));
  console.log('walk stopped      ' + w.stopReason + '  (' + (w.walkMs / 1000).toFixed(1) + 's, ' + w.statesDiscovered + ' states)');
  console.log('phrases examined  ' + report.phrasesExecuted);
  console.log('by class          ' + Object.entries(report.counts).map(([k, v]) => k + ' ' + v).join(', '));
  console.log('');

  for (const r of report.rooms) {
    const shown = r.rows.filter((row) => opts.all || (isFinding(row) && row.thing));
    const hidden = r.rows.filter((row) => !opts.all && isFinding(row) && !row.thing).length;
    console.log('== ' + r.room + '  [' + (r.path.length ? r.path.join(', ') : 'start') + ']');
    if (r.ended) { console.log('   (the game has ended in this state; nothing examined)'); console.log(''); continue; }
    if (shown.length === 0) console.log('   (no findings' + (hidden ? '; ' + hidden + ' hidden as not-a-thing' : '') + ')');
    for (const row of shown) {
      const tgt = row.target ? '  -> ' + row.target : '';
      const flag = row.thing ? '' : '  (not-a-thing)';
      console.log('   ' + row.kind.padEnd(19) + ' ' + JSON.stringify(row.phrase) + tgt + flag);
      console.log('   ' + ''.padEnd(19) + '   from: ' + row.sources.join(', ') + '   [' + row.detail + ']');
    }
    if (hidden && shown.length) console.log('   (' + hidden + ' more hidden as not-a-thing; --all shows them)');
    console.log('');
  }

  console.log('Findings are real: each phrase was executed through the engine in the state');
  console.log('the walk first reached its room. Absence is not proof: rooms the walk did not');
  console.log('reach, and prose only shown in other states, were not examined.');
  console.log('');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.story) {
    console.error('usage: node tools/explorer-probe/lens-examinable.js <story.story> [--seed N] [--max-seconds N] [--max-states N] [--all] [--json]');
    process.exit(2);
  }
  const report = await runLens(path.resolve(opts.story), opts);
  if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
  printReport(report, opts);
}

module.exports = { runLens, classify };

if (require.main === module) {
  main().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
}
