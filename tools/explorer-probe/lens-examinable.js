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
 * 1. EXTRACTION — the story language's noun extractor (ADR-407 D2, D3). The
 *    lens reads the compiled IR's `phrases.defaultLocale` and finds that
 *    language's extractor through if-domain's lookup, as devkit's
 *    `nounExtractorLookup` applies it: the same lookup `sharpee world-index`
 *    uses, so the IDE's Incomplete view and this lens read the same nouns.
 *    For English that is `@sharpee/lang-en-us/nouns`, ADR-321's article
 *    heuristic and the `compromise` tagger, unioned. The lens holds no
 *    English. The tagger was added because the heuristic alone covered 66% of
 *    secret-letter's head-noun mentions (measured 2026-09-23), most misses
 *    having no article before them. `readsAsThing` from `@sharpee/world-index`
 *    is used ONLY to hide non-resolutions whose head noun is not a thing an
 *    author could implement (`the dark`, `the cold`); it never decides
 *    whether a phrase resolved, and `--all` shows what it hid. It stays in
 *    world-index until a later record moves it (ADR-407's follow-on).
 *
 *    LANGUAGE GUARD (ADR-407 D2, D6). Before any prose is read, the lens
 *    refuses, in one line and with a non-zero exit, a story whose language
 *    has no extractor (checked before the engine loads, so no room is
 *    walked), and then an engine whose `languageCode` is not the story's
 *    (checked on the opening room, before the walk takes a step). It never
 *    falls back to English rules, which would read as a clean story.
 *
 *    NUMBER FORMS (ADR-407 D5, Amendment 4). For each candidate, the
 *    extractor's `numberForms` says whether its head noun is singular or
 *    plural and gives the other form, and the lens types both. A form that no
 *    entity answers while the other resolves is a `number-form` finding,
 *    naming the form typed, the form that resolved, its sources and the
 *    engine's reason. A noun the language calls the same in both numbers has
 *    no other form to try.
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
 * USAGE
 *
 *   node tools/explorer-probe/lens-examinable.js <story.story>
 *       [--seed N] [--max-states N] [--max-seconds N] [--max-depth N]
 *       [--all] [--json]
 *
 * The story must be compiled first (`<dir>/dist/<stem>.ir.json` beside the
 * `.story` file, as `./sharpee compose <story> -o <that path>` writes it).
 * The IR names the story's language; the engine compiles the `.story` itself.
 * A refusal is one line on stderr, nothing on stdout, and exit 1.
 * `--all` also prints described resolutions and the rows `readsAsThing`
 * hid. `--json` prints the report below instead of the console form. The
 * walk budgets default to the walker's (seed 1209, 5000 states, 120s,
 * depth 40); a run meant to be repeatable should bound by `--max-states`,
 * not seconds, because states are deterministic at a seed and seconds are
 * not.
 *
 * CLASSES — one per executed phrase, decided by the engine's events:
 *
 *   resolved-described  `if.event.examined` with an authored description
 *                       (any examining id but the three below, or a Chord
 *                       phrase id from an `on examining` clause)
 *   resolved-default    `if.event.examined` whose id ends `default_description`,
 *                       `default_description_self` or `nothing_special` —
 *                       the object exists but the author wrote nothing
 *   not-in-scope        no entity answered to the phrase here: the validator's
 *                       `ENTITY_NOT_FOUND` (as `command.failed`), or a
 *                       blocked `if.event.examined` (in scope, not visible)
 *   number-form         no entity answered this form (the validator's
 *                       `ENTITY_NOT_FOUND`) while the noun's other number
 *                       resolved; `resolvedForm` names the form that did,
 *                       `target` the thing it reached, `detail` the reason
 *                       this form failed. A form written in the prose and
 *                       its other number tried by the lens are both rows.
 *   ambiguous           a `client.query` — several entities answer to the
 *                       phrase; a naming collision, reported apart
 *   unclassified        none of the above — a lens defect, never dropped
 *
 * Every class but resolved-described is a finding. A not-in-scope finding
 * whose head noun `readsAsThing` rejects is kept in the data with
 * `thing: false` and hidden from the console unless `--all`.
 * `phrasesExecuted` counts every form typed, both numbers included.
 *
 * REPORT (`--json`, format 2; format 1 had no number-form class) — the shape
 * a future consumer builds against:
 *
 *   {
 *     lens: 'examinable', format: 2,
 *     story, seed,
 *     walk: { stopReason, roomsReached, roomsDeclared, statesDiscovered, walkMs },
 *     phrasesExecuted,
 *     counts: { <class>: n, ... },
 *     findings: [ { phrase, kind, detail, target?, resolvedForm?, thing, sources: [..],
 *                   rooms: [ { roomId, room }, .. ] }, .. ],
 *     rooms:    [ { roomId, room, path: [..commands], ended?, prose: [..],
 *                   rows: [ { phrase, kind, detail, target?, resolvedForm?, sources, thing }, .. ] }, .. ]
 *   }
 *
 * A refused run is `{ lens: 'examinable', format: 2, story, refused: <the line> }`
 * and nothing else: no walk was made.
 *
 * `rooms` is the full record in discovery order, every row included.
 * `findings` folds the finding rows across rooms by (phrase, kind, detail),
 * most-rooms first, so a carried item's phrases — which recur in every room
 * the player carries it through — read once with a room count instead of
 * once per room. The console form prints that folded section first, then
 * each room with only the findings unique to it. Everything but `walkMs`
 * is deterministic at a seed and a state budget.
 *
 * REGRESSION PIN — `node --test 'tools/explorer-probe/tests/*.test.js'` pins the
 * classifier, the language guard, the fixture story under
 * `fixtures/lens-fixture/`, and the test stories orchard and scullery, so a
 * prose or extractor change that moves a finding shows up as a diff, not
 * silently.
 *
 * Public interface: CLI as above; module — `runLens(storyPath, opts)`,
 * `classify(events, result, error)`, `classifyCandidates(folded, runForm, extractor)`,
 * `phrasesIn(prose, extractor)`, `guardLanguage(storyCode, engineCode, lookup)`,
 * `foldFindings(rooms)`, `isFinding(row)`, `printReport(report, opts, out)`.
 * Owner context: tools/ — the testing-explorer, outside the published packages.
 */

const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const { explore } = require('./explore.js');
const { loadStoryIR } = require('./dimensions.js');
const { readsAsThing } = require(path.join(REPO, 'packages/world-index/dist/index.js'));
const { languageMismatchRefusal } = require(path.join(REPO, 'packages/if-domain/dist/nouns.js'));
// The lookup `sharpee world-index` applies: if-domain's `resolveNounExtractor`
// loading `@sharpee/lang-<code>/nouns` through devkit's own `require`.
const { nounExtractorLookup } = require(path.join(REPO, 'packages/devkit/dist/commands/world-index.js'));

/** A refusal by ADR-407 D6, thrown from inside the walk's first hook and caught by `runLens`. */
class LensRefusal extends Error {}

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
 * Resolve a description message id to its registered text, the way the
 * engine's prose pipeline does (ADR-107 id mode, ADR-333 D1a). It reads the
 * raw template, never the substituted message. Mirrors
 * `resolveDescriptionId` in `packages/engine/src/prose-pipeline/handlers/description-id.ts`,
 * which `@sharpee/engine` does not export.
 *
 * @param language the engine's language provider
 * @param id the message id, or undefined
 * @returns the registered text, or undefined when there is no id or it is unregistered
 */
function resolveDescriptionText(language, id) {
  if (!id || !language) return undefined;
  if (typeof language.getTemplate === 'function') return language.getTemplate(id);
  const message = language.getMessage(id, {});
  return message && message !== id ? message : undefined;
}

/**
 * A thing's description as examining shows it. A trait-state literal (open
 * or closed, on or off, lit or unlit: the `description` getter's priority)
 * wins when it is in force. Otherwise the identity's `descriptionId` resolves,
 * and the identity literal is the last resort
 * (`packages/stdlib/src/actions/standard/examining/examining-data.ts`, the id-mode block).
 */
function thingText(entity, language) {
  const identity = entity.get('identity');
  const stateText = entity.description;
  if (identity && identity.descriptionId && (!stateText || stateText === identity.description)) {
    const resolved = resolveDescriptionText(language, identity.descriptionId);
    if (resolved) return resolved;
  }
  return stateText || undefined;
}

/**
 * The prose a player sees on arriving in `room`, resolved the way the engine
 * renders it (ADR-107: a message id takes precedence over a literal):
 * - the room's first-visit text, if it has one (`RoomTrait.initialDescriptionId`
 *   or `initialDescription`, which looking shows on the first visit, the visit
 *   this hook runs on);
 * - the room's standard description, which the player reads on every later visit;
 * - each visible thing's description, as examining shows it.
 *
 * Until 2026-11-22 this read only the `description` getter's literal. That
 * went empty for every Chord entity when id-mode descriptions (fa80abaea)
 * reached the lens's branch in merge 1b671e015 (2026-09-27). The loader now
 * stores only the key (`packages/story-loader/src/build/entity.ts`, the
 * `descriptionId` line), so the lens executed no phrase (GH #805, #583).
 *
 * @param world the world, in the state the walk arrived in
 * @param room the room first seen
 * @param language the engine's language provider (`game.engine.getLanguageProvider()`)
 * @returns Array<{ source: string, text: string }>; source is 'room (first visit)',
 *   'room', or the thing's name
 */
function visibleProse(world, room, language) {
  const player = world.playerCharacter;
  const out = [];
  const roomTrait = room.get('room');
  const identity = room.get('identity');
  const firstVisit = roomTrait
    ? (resolveDescriptionText(language, roomTrait.initialDescriptionId) || roomTrait.initialDescription)
    : undefined;
  if (firstVisit) out.push({ source: 'room (first visit)', text: String(firstVisit) });
  const standard = resolveDescriptionText(language, identity && identity.descriptionId) || room.description;
  if (standard) out.push({ source: 'room', text: String(standard) });
  for (const e of world.getVisible(player.id) || []) {
    if (e.id === room.id || e.id === player.id) continue;
    const text = thingText(e, language);
    if (text) out.push({ source: e.name, text: String(text) });
  }
  return out;
}

/**
 * Fold the candidates across a room's prose: one row per distinct phrase, with
 * every source it came from.
 *
 * @param prose the room's passages, from `visibleProse`
 * @param extractor the story language's `NounExtractor`
 * @returns Map<phrase, { noun: { phrase, words }, sources: string[] }>; the
 *   phrase is the candidate's lowercased words, joined, as a player would type it
 */
function phrasesIn(prose, extractor) {
  const folded = new Map();
  for (const { source, text } of prose) {
    for (const candidate of extractor.extract(text)) {
      const phrase = candidate.words.join(' ');
      const row = folded.get(phrase) || { noun: { phrase, words: candidate.words }, sources: [] };
      if (!row.sources.includes(source)) row.sources.push(source);
      folded.set(phrase, row);
    }
  }
  return folded;
}

/**
 * A phrase with its head noun in the other grammatical number (ADR-407 D5).
 *
 * @param words the candidate's words; the last is its head
 * @param extractor the story language's `NounExtractor`, whose `numberForms` decides
 * @returns the phrase in the other number, or null when the language gives the
 *   head no other form (the same word in both numbers)
 */
function otherNumber(words, extractor) {
  const head = words[words.length - 1];
  const forms = extractor.numberForms(head);
  if (forms.singular === forms.plural) return null;
  const other = head === forms.plural ? forms.singular : head === forms.singular ? forms.plural : null;
  return other === null ? null : [...words.slice(0, -1), other].join(' ');
}

/** The engine answered with an entity: examining described it or gave its default. */
const resolves = (verdict) => verdict.kind === 'resolved-described' || verdict.kind === 'resolved-default';

/** No entity answered at all (the validator's failure); a blocked examine named one, so it does not count. */
const nothingAnswered = (verdict) => verdict.kind === 'not-in-scope' && verdict.target === undefined;

/** A number-form row: `phrase` found nothing while `resolvedForm` reached a thing. */
function numberFormRow(phrase, failed, resolvedForm, resolved, sources) {
  return {
    phrase,
    kind: 'number-form',
    detail: failed.detail,
    target: resolved.target,
    resolvedForm,
    sources: [...sources],
    thing: true,
  };
}

/**
 * Classify a room's candidates, each in both grammatical numbers (ADR-407 D5, D7).
 *
 * Every class is read off the engine's verdicts, which `runForm` supplies; the
 * candidate list only decides which forms are typed. A written phrase is a
 * number-form finding when nothing answers it and its other number resolves;
 * otherwise it keeps its own verdict. The other number of a phrase that
 * resolves is added as a number-form row when nothing answers it, unless the
 * prose wrote that form too (its own row covers it). Each distinct form is
 * typed once.
 *
 * @param folded the room's candidates, from `phrasesIn`
 * @param runForm async (form) => verdict, as `classify` returns it, from typing `examine <form>`
 * @param extractor the story language's `NounExtractor`
 * @returns the room's rows, each written phrase in prose order followed by any
 *   number-form row for its other number
 */
async function classifyCandidates(folded, runForm, extractor) {
  const verdicts = new Map();
  const verdictOf = async (form) => {
    if (!verdicts.has(form)) verdicts.set(form, await runForm(form));
    return verdicts.get(form);
  };
  const rows = [];
  const rowed = new Set();
  for (const [phrase, { noun, sources }] of folded) {
    const written = await verdictOf(phrase);
    const otherPhrase = otherNumber(noun.words, extractor);
    const other = otherPhrase === null ? null : await verdictOf(otherPhrase);
    if (other && nothingAnswered(written) && resolves(other)) {
      rows.push(numberFormRow(phrase, written, otherPhrase, other, sources));
    } else {
      rows.push({
        phrase,
        kind: written.kind,
        detail: written.detail,
        target: written.target,
        sources: [...sources],
        // Only a non-resolution is asked "is this even a thing" (readsAsThing's
        // own contract); a phrase that resolved is a thing by demonstration.
        thing: written.kind === 'not-in-scope' ? readsAsThing(noun) : true,
      });
    }
    rowed.add(phrase);
    if (other && !folded.has(otherPhrase) && !rowed.has(otherPhrase) && nothingAnswered(other) && resolves(written)) {
      rows.push(numberFormRow(otherPhrase, other, phrase, written, sources));
      rowed.add(otherPhrase);
    }
  }
  return rows;
}

/**
 * Examine every candidate mentioned in `room`, in both numbers, restoring the
 * room's save before each command so no examine sees another's side effects.
 *
 * @param ctx the walker's hook context
 * @param tally counts every form typed
 * @param extractor the story language's `NounExtractor`
 * @returns the room's report row
 */
async function examineRoom(ctx, tally, extractor) {
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

  const prose = visibleProse(world, room, game.engine.getLanguageProvider());
  const folded = phrasesIn(prose, extractor);

  const runForm = async (form) => {
    await restore();
    try {
      await game.executeCommand('examine ' + form);
    } catch (err) {
      // The harness catches engine errors itself; this is belt and braces.
    }
    tally.executed++;
    return classify(game.lastEvents || [], game.lastTurnResult, game.lastError);
  };
  const rows = await classifyCandidates(folded, runForm, extractor);
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
// Folding — one line per finding, however many rooms it recurs in
// ---------------------------------------------------------------------------

/** A finding row is anything that is not a described resolution. */
function isFinding(row) {
  return row.kind !== 'resolved-described';
}

/**
 * Fold the finding rows of every room by (phrase, kind, detail).
 *
 * @param rooms the per-room report rows, in discovery order
 * @returns findings sorted most-rooms first, then by phrase; each carries
 *   the rooms it was seen in (discovery order) and the union of its sources
 */
function foldFindings(rooms) {
  const byKey = new Map();
  for (const r of rooms) {
    for (const row of r.rows) {
      if (!isFinding(row)) continue;
      const key = JSON.stringify([row.phrase, row.kind, row.detail]);
      let f = byKey.get(key);
      if (!f) {
        f = { phrase: row.phrase, kind: row.kind, detail: row.detail, thing: row.thing, sources: [], rooms: [] };
        if (row.target !== undefined) f.target = row.target;
        if (row.resolvedForm !== undefined) f.resolvedForm = row.resolvedForm;
        byKey.set(key, f);
      }
      for (const s of row.sources) if (!f.sources.includes(s)) f.sources.push(s);
      f.rooms.push({ roomId: r.roomId, room: r.room });
    }
  }
  return [...byKey.values()].sort((a, b) => b.rooms.length - a.rooms.length || (a.phrase < b.phrase ? -1 : a.phrase > b.phrase ? 1 : 0));
}

// ---------------------------------------------------------------------------
// The lens
// ---------------------------------------------------------------------------

/**
 * The language guard (ADR-407 D2, D6): the story language's extractor, or the
 * one line the lens prints instead of walking.
 *
 * A language with no extractor is refused first, then an engine whose language
 * is not the story's, so both refusals are reachable.
 *
 * @param storyLanguageCode the IR's `phrases.defaultLocale`
 * @param engineLanguageCode the running engine's `LanguageProvider.languageCode`
 * @param lookup a `NounExtractorLookup` (language code to extractor or refusal)
 * @returns `{ found: true, extractor }`, or `{ found: false, refusal }` naming
 *   the code (no extractor) or both codes (mismatch)
 */
function guardLanguage(storyLanguageCode, engineLanguageCode, lookup) {
  const resolution = lookup(storyLanguageCode);
  if (!resolution.found) return resolution;
  if (engineLanguageCode !== storyLanguageCode) {
    return { found: false, refusal: languageMismatchRefusal(engineLanguageCode, storyLanguageCode) };
  }
  return resolution;
}

/**
 * Run the lens over every reachable room of a story.
 *
 * @param storyPath absolute path to the `.story` file
 * @param opts.seed / maxSeconds / maxStates / maxDepth — walk budgets
 * @returns the lens report (format 2 — see the header): the walk's
 *   soundness facts, the folded findings, and every room's rows; or a
 *   refused report, with no walk, when the language guard refuses
 */
async function runLens(storyPath, opts) {
  const story = path.basename(storyPath);
  const refused = (line) => ({ lens: 'examinable', format: 2, story, refused: line });

  // The story's language, from its compiled IR (D2). Refused before the engine
  // loads when the language has no extractor (D6).
  const ir = loadStoryIR(storyPath);
  const storyLanguageCode = String((ir.phrases && ir.phrases.defaultLocale) || '');
  const early = nounExtractorLookup(storyLanguageCode);
  if (!early.found) return refused(early.refusal);

  const rooms = [];
  const tally = { executed: 0 };
  let extractor = null;
  let walk;
  try {
    walk = await explore(storyPath, {
      seed: opts.seed,
      hash: 'declared',
      breadth: 'basic',
      maxStates: opts.maxStates,
      maxSeconds: opts.maxSeconds,
      maxDepth: opts.maxDepth,
      stopWhenAllRoomsSeen: true,
      onRoomFirstSeen: async (ctx) => {
        // The first call is the opening room, before the walk's first step:
        // the engine's language is known here and nowhere earlier.
        if (extractor === null) {
          const engineLanguageCode = ctx.game.engine.getLanguageProvider().languageCode;
          const guard = guardLanguage(storyLanguageCode, engineLanguageCode, nounExtractorLookup);
          if (!guard.found) throw new LensRefusal(guard.refusal);
          extractor = guard.extractor;
        }
        rooms.push(await examineRoom(ctx, tally, extractor));
      },
    });
  } catch (err) {
    if (err instanceof LensRefusal) return refused(err.message);
    throw err;
  }

  const counts = {};
  for (const r of rooms) for (const row of r.rows) counts[row.kind] = (counts[row.kind] || 0) + 1;

  return {
    lens: 'examinable',
    format: 2,
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
    findings: foldFindings(rooms),
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

/** The two console lines for one row or folded finding. */
function printRow(row, out) {
  const tgt = row.target ? '  -> ' + row.target : '';
  const resolved = row.resolvedForm ? '  (' + JSON.stringify(row.resolvedForm) + ' resolves)' : '';
  const flag = row.thing ? '' : '  (not-a-thing)';
  out('   ' + row.kind.padEnd(19) + ' ' + JSON.stringify(row.phrase) + resolved + tgt + flag);
  out('   ' + ''.padEnd(19) + '   from: ' + row.sources.join(', ') + '   [' + row.detail + ']');
}

/**
 * Print the console form of a report: header, the findings that recur in
 * more than one room, then each room with only the findings unique to it.
 *
 * @param report a `runLens` report
 * @param opts.all show described resolutions and not-a-thing rows too
 * @param out     line sink (default `console.log`); tests capture it
 */
function printReport(report, opts, out = console.log) {
  const w = report.walk;
  const visible = (row) => opts.all || row.thing;
  out('');
  out('story             ' + report.story + '  (seed ' + report.seed + ')');
  out('rooms reached     ' + w.roomsReached + (w.roomsDeclared !== undefined ? ' of ' + w.roomsDeclared + ' declared' : ''));
  out('walk stopped      ' + w.stopReason + '  (' + (w.walkMs / 1000).toFixed(1) + 's, ' + w.statesDiscovered + ' states)');
  out('phrases examined  ' + report.phrasesExecuted);
  out('by class          ' + Object.entries(report.counts).map(([k, v]) => k + ' ' + v).join(', '));
  out('');

  const recurring = report.findings.filter((f) => f.rooms.length > 1);
  const recurringKeys = new Set(recurring.map((f) => JSON.stringify([f.phrase, f.kind, f.detail])));
  const recurringShown = recurring.filter(visible);
  if (recurringShown.length) {
    out('== seen in more than one room  (' + recurringShown.length + ' findings)');
    for (const f of recurringShown) {
      printRow(f, out);
      out('   ' + ''.padEnd(19) + '   in ' + f.rooms.length + ' rooms: ' + f.rooms.map((r) => r.room).join(', '));
    }
    out('');
  }

  for (const r of report.rooms) {
    const unique = (row) => !recurringKeys.has(JSON.stringify([row.phrase, row.kind, row.detail]));
    const shown = r.rows.filter((row) => (opts.all || isFinding(row)) && visible(row) && unique(row));
    const hidden = r.rows.filter((row) => isFinding(row) && !visible(row)).length;
    const folded = r.rows.filter((row) => isFinding(row) && visible(row) && !unique(row)).length;
    out('== ' + r.room + '  [' + (r.path.length ? r.path.join(', ') : 'start') + ']');
    if (r.ended) { out('   (the game has ended in this state; nothing examined)'); out(''); continue; }
    if (shown.length === 0) out('   (no findings unique to this room' + (hidden ? '; ' + hidden + ' hidden as not-a-thing' : '') + ')');
    for (const row of shown) printRow(row, out);
    if (hidden && shown.length) out('   (' + hidden + ' more hidden as not-a-thing; --all shows them)');
    if (folded) out('   (' + folded + ' listed above under "seen in more than one room")');
    out('');
  }

  out('Findings are real: each phrase was executed through the engine in the state');
  out('the walk first reached its room. Absence is not proof: rooms the walk did not');
  out('reach, and prose only shown in other states, were not examined.');
  out('');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.story) {
    console.error('usage: node tools/explorer-probe/lens-examinable.js <story.story> [--seed N] [--max-seconds N] [--max-states N] [--all] [--json]');
    process.exit(2);
  }
  const report = await runLens(path.resolve(opts.story), opts);
  if (report.refused) {
    // ADR-407 D6: one line naming the language, no walk, a non-zero exit.
    console.error(report.refused);
    process.exitCode = 1;
    return;
  }
  if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
  printReport(report, opts);
}

module.exports = {
  runLens, classify, classifyCandidates, phrasesIn, guardLanguage, foldFindings, isFinding, printReport,
};

if (require.main === module) {
  main().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
}
