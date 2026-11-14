/**
 * lexer-golden.test.ts — ADR-258 D7: the committed golden token stream that
 * pins `lexer.ts` for the Swift `ChordLexer` port.
 *
 * The corpus (`tests/fixtures/lexer-golden/*.story`) covers the shipped
 * Chord 2.0.0 surface the D7 amendment names, plus the 3.1.0–3.3.0
 * conversation surface (ADR-320: manner, greetings, exchanges, initiative,
 * conversation threads) in `conversation-surface.story`, plus the 3.4.0–3.6.0
 * presence, duration, and chapters surface (ADR-325 timers, ADR-326 move
 * destinations, regions with a landing, `proper`, `, one-way`, `{bare}`,
 * ADR-329 D10 goal steps, the ADR-327 player role, ADR-330 chapters) in
 * `presence-and-chapters-surface.story`, plus the 4.0.0 region surface
 * (ADR-360: a `rooms` group, `in the <region>` membership, the plain and
 * one-way exit tables) in `regions-surface.story` and the ADR-362 folds (a
 * kind on the `create` head, `exits:` and `exits, one-way:` lines) in
 * `folds-surface.story`, plus the rest of the 4.0 surface and the 4.0.2
 * trait words (the `landmarks`, `sailing`, `position`, `passage` and
 * `pushing` blocks, a vehicle, `servings`, ADR-392's `wearable on the`,
 * `opens when unlocked`, `closes when switched off`, `smelly` and `loud`, a
 * story trait read after `is a`, and a name carrying `&`) in
 * `chord-4-surface.story`, with the `claims` block in `chord-4-claims.chord`
 * (a claims block is never part of a story, so that one corpus file is a
 * `.chord` fragment); the golden file
 * (`lexer-golden.json`) records `lex()`'s exact `Line[]` output per corpus
 * file. A `lexer.ts` change that alters the stream turns this test red in
 * the CI that exists today — REGENERATE THE GOLDEN deliberately
 * (`UPDATE_GOLDEN=1 pnpm --filter @sharpee/chord test:ci lexer-golden`,
 * or the `golden:lexer` package script) and update the Swift port to match:
 * the golden artifact is the thing both lexers agree on.
 *
 * Owner context: @sharpee/chord test suite.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lex, type Line } from '../src/lexer.js';
import { DiagnosticBag } from '../src/diagnostics.js';

const FIXTURE_DIR = join(__dirname, 'fixtures', 'lexer-golden');
const GOLDEN_PATH = join(FIXTURE_DIR, 'lexer-golden.json');

/**
 * Corpus files, sorted for a deterministic golden layout: every story, and
 * every `.chord` fragment (a claims block cannot be written in a story).
 */
function corpusFiles(): string[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.story') || f.endsWith('.chord'))
    .sort();
}

/** Lex one corpus file, asserting the corpus itself is lex-clean. */
function lexCorpusFile(name: string): Line[] {
  const bag = new DiagnosticBag();
  const lines = lex(readFileSync(join(FIXTURE_DIR, name), 'utf-8'), bag);
  expect(bag.all(), `corpus file ${name} must lex clean — the golden pins tokens, not errors`).toEqual([]);
  return lines;
}

function currentGolden(): Record<string, Line[]> {
  const golden: Record<string, Line[]> = {};
  for (const name of corpusFiles()) golden[name] = lexCorpusFile(name);
  return golden;
}

describe('ADR-258 D7 — lexer golden conformance pin', () => {
  it('the committed golden matches lex() exactly (regenerate with UPDATE_GOLDEN=1 on deliberate lexer changes)', () => {
    const fresh = currentGolden();
    if (process.env.UPDATE_GOLDEN === '1') {
      writeFileSync(GOLDEN_PATH, JSON.stringify(fresh, null, 2) + '\n');
      return;
    }
    const committed: unknown = JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8'));
    expect(
      fresh,
      'lexer.ts output drifted from the committed golden. If the change is deliberate, ' +
        'regenerate (UPDATE_GOLDEN=1) and update the Swift ChordLexer port against the new golden (ADR-258 D7).'
    ).toEqual(committed);
  });

  it('the corpus covers every construct the D7 amendment names (drift guard on the fixture set)', () => {
    const sources = corpusFiles().map((f) => readFileSync(join(FIXTURE_DIR, f), 'utf-8'));
    const all = sources.join('\n');
    const constructs: Record<string, RegExp> = {
      'grammar header': /^grammar "/m,
      'slot spellings': /\bthe (target|item|container|recipient)\b/,
      'or-alternation': /\b(in or inside|with or using)\b/,
      'optional words': /\[(carefully|around)\]/,
      'typed slot: topic': /^ {2}the topic is a topic$/m,
      'typed slot: instrument': /^ {2}the tool is an instrument$/m,
      means: /^ {6}means position /m,
      'directions (compass)': /^ {4}north or n$/m,
      'directions (non-compass)': /^ {4}port or p$/m,
      'extend action': /^extend action /m,
      'remove from action': /^remove from action /m,
      'counter comparison (symbolic)': />=|<=|< \d|> \d/,
      'counter comparison (word)': /\bis at least\b/,
      // The ADR-320 conversation surface (Chord 3.1.0–3.3.0). Without these
      // the corpus file could be gutted or dropped with this suite still
      // green — the fixture-set drift this guard exists to catch.
      'define manner': /^define manner for /m,
      'manner beat row': /^ {4}beat "/m,
      'manner voice row': /^ {4}voice \w+$/m,
      'define greetings': /^define greetings for /m,
      'greetings absence words': /^ {2}on return, (again so soon|after days):$/m,
      'greetings repetition words': /^ {2}asked (once|again|many times):$/m,
      'recency predicate': /\bis (fresh|recent|stale)\b/,
      'threading: was discussed': /\bwas discussed\b/,
      'threading: subject changes': /\bthe subject changes\b/,
      'define exchange': /^define exchange /m,
      'exchange strength modifier': /^define exchange [\w-]+ for .+, (passive|assertive|blocking)$/m,
      'exchange answer head': /^ {2}answer "/m,
      'exchange act head': /^ {2}on leaving:$/m,
      'exchange silence head': /^ {2}on silence:$/m,
      'define initiative': /^define initiative for /m,
      'initiative occasion refinement': /^ {2}on an open floor, when /m,
      'then asks / then invites': /^ {4}then (asks|invites) /m,
      'deflect to': /^ {4}deflect to /m,
      'hold their tongue': /^ {4}hold their tongue$/m,
      leave: /^ {4}leave$/m,
      'define conversation': /^define conversation [\w-]+ for /m,
      'conversation about filter': /^ {2}about "/m,
      'conversation opens when': /^ {2}opens when /m,
      'conversation beat (plain)': /^ {2}beat:$/m,
      'conversation beat (gated)': /^ {2}beat, when /m,
      'conversation transition rows': /^ {2}on (parting|resuming|refusing):$/m,
      'conversation conclusion': /^ {2}conclusion:$/m,
      'is concluded predicate': /\bis concluded\b/,
      // The 3.4.0–3.6.0 presence, duration, and chapters surface — the corpus
      // the IDE's Chord 3.6.0 pin (ChordVersionCheck.supportedLanguageVersion)
      // cites as its honesty condition. Same drift guard as above: without
      // these the file could be gutted with this suite still green.
      'use chapters': /^ {2}use chapters$/m,
      'define chapters': /^define chapters$/m,
      'chapter row': /^ {2}[\w-]+ - Chapter /m,
      'chapter opens on game start': /^ {4}begins when the game starts$/m,
      'chapter opens on first visit': /^ {4}begins when the player visits .+ for the first time$/m,
      'chapter opens on becomes': /^ {4}begins when \S+ becomes \w+$/m,
      'chapter reads': /\b(during|before|after) (market|commerce|alarm)\b/,
      'define timer': /^define timer [\w-]+ for /m,
      'timer chance row': /^ {2}(interrupted|meanwhile,) one chance in \d+$/m,
      'when timer expires': /^ {2}when [\w-]+ expires$/m,
      'timer verbs': /^ {4}(start|stop|restart|reset|interrupt) [\w-]+$/m,
      'timer reads': /\b[\w-]+ (is \w+|has (started|expired))\b/,
      'region landing': /^ {2}landing /m,
      'set landing': /^ {4}set .+ landing to /m,
      'proper': /^ {2}a person, proper$/m,
      'pronouns': /^ {2}pronouns he$/m,
      'one-way exit': /^ {2}\w+ to .+, one-way$/m,
      'move offstage / here': /^ {4}move .+ (offstage|here)$/m,
      'move to a random adjacent room': /^ {4}move .+ to a random adjacent room$/m,
      'bare article hint': /\{bare \w+\}/,
      'goal block': /^ {2}goal [\w-]+, (low|normal|high|critical)$/m,
      'goal perform step': /^ {4}go east$/m,
      'the player role': /^ {2}change the player to \w+$/m,
      // The 4.0.0 region surface (ADR-360 AC-12): a `rooms` group and both
      // exit tables. Same drift guard: without these the file could be gutted
      // with this suite still green.
      'rooms group': /^ {2}rooms \w+ \d+ to \d+$/m,
      'group room name block': /^ {4}room name:$/m,
      'group first time': /^ {4}first time$/m,
      'region membership': /^ {2}in the \w+$/m,
      'exit table': /^ {2}exits$/m,
      'exit table, one-way': /^ {2}exits, one-way$/m,
      'exit row': /^ {4}the \w+ \d+: \w+ to the \w+ \d+/m,
      // The ADR-362 folds (AC-6): a kind on the `create` head and both
      // `exits:` lines. Same drift guard.
      'folded create head': /^create .+, an? \w+/m,
      'exits line': /^ {2}exits: \w+ to /m,
      'exits line, one-way': /^ {2}exits, one-way: \w+ to /m,
      // The rest of the 4.0 surface and the 4.0.2 trait words — the corpus
      // the IDE's Chord 4.0.2 pin cites as its honesty condition. Same drift
      // guard: the six block openers both editors color, and the words the
      // Swift lexer port has to carry.
      'use expanses': /^ {2}use expanses$/m,
      'use sailing': /^ {2}use sailing$/m,
      'landmarks block': /^ {2}landmarks$[\s\S]+?^ {2}end landmarks$/m,
      'landmark row': /^ {4}.+: \d+, \d+$/m,
      'sailing block': /^ {2}sailing$[\s\S]+?^ {2}end sailing$/m,
      'sailing row': /^ {4}\d+ to \d+ degrees: /m,
      'a vehicle': /^ {2}a vehicle$/m,
      'position block': /^ {2}position$[\s\S]+?^ {2}end position$/m,
      'position row': /^ {4}when .+ holds .+: the /m,
      'passage block': /^ {2}passage to .+$[\s\S]+?^ {2}end passage$/m,
      'pushing block': /^ {2}pushing$[\s\S]+?^ {2}end pushing$/m,
      'pushing row': /^ {4}between .+ and .+$/m,
      'admits pushing': / admits pushing$/m,
      servings: /^ {2}servings \d+$/m,
      'wearable on the <part>': /, wearable on the \w+/,
      'wearable on a two-word part': /, wearable on the \w+ \w+$/m,
      'opens when unlocked': /^ {2}opens when unlocked$/m,
      'closes when switched off': /^ {2}closes when switched off$/m,
      smelly: /^ {2}a thing, .*\bsmelly\b/m,
      loud: /^ {2}a thing, .*\bloud\b/m,
      'story trait read after is a': /^ {2}refuse when .+ is a snake: /m,
      'a name carrying &': /^create the \w+ & \w+$/m,
      'claims block': /^claims$[\s\S]+?^end claims$/m,
      'claims needs line': /^ {2}needs (rooms|things|verbs): /m,
      'claim head': /^ {2}claim .+$/m,
      'never head': /^ {2}never .+$/m,
    };
    for (const [construct, pattern] of Object.entries(constructs)) {
      expect(pattern.test(all), `corpus no longer exercises: ${construct}`).toBe(true);
    }
    // And the interesting token kinds actually appear in the golden stream —
    // coverage of the OUTPUT, not just the input text.
    const kinds = new Set(
      Object.values(currentGolden())
        .flat()
        .flatMap((line) => line.tokens.map((t) => t.kind))
    );
    for (const kind of ['word', 'number', 'string', 'colon', 'comma', 'lbracket', 'rbracket', 'lbrace', 'rbrace', 'compare', 'punct'] as const) {
      expect(kinds.has(kind), `golden stream carries no '${kind}' token`).toBe(true);
    }
  });
});
