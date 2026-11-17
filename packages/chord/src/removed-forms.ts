/**
 * removed-forms.ts — the registry of Chord forms the language no longer accepts.
 *
 * Purpose: the one home for every removed spelling the compiler still names
 * with a fix-it: the code it reports, the form as an author used to write it,
 * what to write instead, a source that triggers it, and the message text.
 * The parser and the analyzer ask this file for the message, so the wording
 * an author reads lives in exactly one place.
 *
 * Public interface: REMOVED_FORMS (the list a reference is generated from),
 * RemovedForm, RemovedFormCode, removedFormMessage().
 * Owner context: @sharpee/chord (language frontend; browser-safe, no imports).
 *
 * Invariants:
 * - A message names the form and its replacement and nothing else an author
 *   cannot follow: no decision-record number, no design-record name. The
 *   record behind each removal is the comment above its entry.
 * - Every entry's `example` raises that entry's code when compiled
 *   (tests/removed-forms.test.ts).
 * - A code listed here is reported only with removedFormMessage(); the one
 *   shared code is `parse.header-unknown-field`, which a header key that
 *   never existed also reports, with its own text.
 */

/** One removed form's record. `Words` are the site's words the message quotes. */
interface RemovedFormSpec<Words extends readonly string[]> {
  /** The form as an author used to write it. Backticks mark Chord text. */
  form: string;
  /** What to write instead. Backticks mark Chord text. */
  replacement: string;
  /** A source fragment that raises the code. */
  example: string;
  /** The fix-it the compiler prints. */
  message: (...words: Words) => string;
}

/** Infers a spec's `Words` from its message's parameters. */
function spec<Words extends readonly string[]>(entry: RemovedFormSpec<Words>): RemovedFormSpec<Words> {
  return entry;
}

const FORMS = {
  // ADR-298 D1: the positional story header.
  'parse.removed-story-header': spec({
    form: '`story "Title" by "Author"`',
    replacement: 'a bare `story` line with indented `title:` and `authors:` fields',
    example: 'story "The Lamp" by "A. Writer"\n',
    message: () =>
      '`story "Title" by "Author"` was removed — use the fielded form: a bare `story` line, then indented `title: <title>` and an `authors:` list (one name per indented line).',
  }),
  // ADR-298: the header fields that were renamed.
  'parse.header-unknown-field': spec({
    form: '`version:`, `blurb:` and `by:` in the story header',
    replacement: '`story-version:`, `description:` and `authors:`',
    example: 'story\n  title: The Lamp\n  authors:\n    A. Writer\n  version: 1.0.0\n',
    message: (key: string, replacement: string) =>
      `\`${key}:\` was removed from the story header — use \`${replacement}:\` instead.`,
  }),
  // The ownership package (ratchet 2026-07-11): floating rules are gone.
  'parse.removed-when': spec({
    form: 'a top-level `when` rule',
    replacement: 'an `after the player <verb>` clause on the entity or room it is about',
    example: 'when the player takes the lamp\n  win\nend when\n',
    message: () =>
      'Top-level `when` rules were removed — attach the rule to its owner: `after the player <verb>` on the entity or room it is about.',
  }),
  'parse.removed-once': spec({
    form: 'a top-level `once <condition>` rule',
    replacement: 'a `, once` modifier on a clause of the owner',
    example: 'once the lamp is lit\n  win\nend once\n',
    message: () =>
      'Top-level `once <condition>` rules were removed — use a `, once` clause modifier on the owner: `on every turn while <condition>, once`.',
  }),
  'parse.removed-every': spec({
    form: 'a top-level `every N turns` rule',
    replacement: 'a `define sequence`, or an `on every turn` clause on the owner',
    example: 'every 3 turns\n  phrase drip\nend every\n',
    message: () =>
      'Top-level `every N turns` rules were removed — use a story-owned `define sequence`, or an every-turn clause on the owner.',
  }),
  // ADR-270 D7: `extend action` subsumes `define verb`.
  'parse.removed-define-verb': spec({
    form: '`define verb`',
    replacement: 'an `extend action <name>` block with a `grammar` line',
    example: 'define verb hang means put the item on the hook\n',
    message: () =>
      '`define verb` was removed — add the verb onto the action directly: `extend action <name>` with a `grammar` pattern line (e.g. `extend action putting` → `hook the item on the hook`).',
  }),
  // Given 8: no global booleans.
  'parse.removed-flag': spec({
    form: '`define flag`',
    replacement: '`states:` on the owner, or a condition over the world',
    example: 'define flag lamp-found\n',
    message: () =>
      '`define flag` was removed (Chord has no global booleans) — model the fact as `states:` on its owner, or derive it with a condition over world state.',
  }),
  // The ownership package: a score belongs to what earns it.
  'parse.removed-score': spec({
    form: '`define score`',
    replacement: 'a `score <name> worth N` line on the owner or in the story header',
    example: 'define score treasure worth 10\n',
    message: () =>
      '`define score` was removed — attach the score to its earning owner: `score <name> worth N` in the owner\'s create/trait/action block or the story header.',
  }),
  // ADR-361 D1: the hatches are removed; Chord's syntax is closed.
  'parse.removed-text-hatch': spec({
    form: '`define text … from`',
    replacement: 'a `define phrase`, with a strategy if the text varies',
    example: 'define text garbled from "./extras.ts"\n',
    message: () =>
      '`define text … from` was removed — a story\'s text is written in Chord. Write it as a `define phrase`, with a strategy (`cycling`, `first-time`, `randomly`, `sticky`, `stopping`) if it varies.',
  }),
  'parse.removed-action-hatch': spec({
    form: '`define action <name> from …`',
    replacement: 'a `define action <name>` block with an indented body',
    example: 'define action juggling from "./stunts.ts"\n',
    message: (name: string) =>
      `\`define action ${name} from …\` was removed — an action is written in Chord. Write it as a \`define action ${name}\` block with an indented body.`,
  }),
  'parse.removed-chain-hatch': spec({
    form: '`define chain … from`',
    replacement: 'nothing yet: Chord has no form for this',
    example: 'define chain opened-revealed from "./reveal.ts"\n',
    message: () =>
      '`define chain … from` was removed — a story cannot replace a standard event chain with its own code. Chord has no form for this yet; the behavior needs support in the language.',
  }),
  // ADR-235 D2: the behavior hatch had no binding key.
  'parse.removed-behavior-hatch': spec({
    form: '`define behavior … from`',
    replacement: 'a `define trait` with clauses, composed on the entity',
    example: 'define behavior glowing from "./glow.ts"\n',
    message: () =>
      '`define behavior … from` was removed — it had no binding key and could never fire. Author the behavior in Chord: `define trait <name>` with `on the player <verb>` clauses, composed on the entity.',
  }),
  // Given 8: no booleans at any scope.
  'parse.removed-flag-field': spec({
    form: 'the `flag` field type in a trait\'s data',
    replacement: '`states:` on the trait',
    example: 'define trait sticky\n  data\n    glue: flag starts false\nend trait\n',
    message: () =>
      'The `flag` field type was removed (Chord has no booleans at any scope) — declare `states[, reversible]: …` on the trait and name what the thing IS in each state.',
  }),
  // Grammar log 2026-07-10: phrase text is a prose block.
  'parse.phrase-text-form': spec({
    form: 'phrase text on the same line as its key',
    replacement: 'an indented prose block under the key',
    example: 'define phrases en-US\n  greet: "Hello."\n',
    message: () => 'Phrase text goes in an indented prose block — the same-line form was removed.',
  }),
  // ADR-211 Decision 4: the strategy adverbs were renamed.
  'parse.phrase-strategy-retired': spec({
    form: 'the phrase strategies `ordered` and `once`',
    replacement: '`stopping` and `first-time`',
    example: 'define phrase hint, ordered\n  One.\nor\n  Two.\nend phrase\n',
    message: (word: string, replacement: string) =>
      `\`${word}\` is no longer a strategy adverb — use \`${replacement}\`.`,
  }),
  'parse.select-strategy-retired': spec({
    form: 'the `select` strategies `ordered` and `once`',
    replacement: '`stopping` and `first-time`',
    example:
      'create the lever\n  a thing\n\n  on the player pulling\n    select ordered\n      phrase first-pull\n    or\n      phrase second-pull\n    end select\n  end on\n',
    message: (word: string, replacement: string) =>
      `\`${word}\` is no longer a strategy adverb — use \`${replacement}\`.`,
  }),
  // ADR-327 D10: the player is a role a named character holds.
  'parse.removed-create-player': spec({
    form: '`create the player`',
    replacement: 'a named `playable` person, given the role in a `before the game starts` block',
    example: 'create the player\n  a person\n',
    message: () =>
      '`create the player` was removed — name the character, mark it `playable`, and assign the role in a `before the game starts` block.',
  }),
  // ADR-360 D5: membership is written where the room is.
  'parse.removed-containing': spec({
    form: 'a region\'s `containing` line',
    replacement: 'an `in the <region>` line in each room, or `rooms <name> <first> to <last>`',
    example: 'create the Cellars\n  a region\n  containing the Vault\n',
    message: () =>
      '`containing` was removed — a region declares identical rooms with `rooms <name> <first> to <last>`, and any other room joins it with an `in the <region>` line in its own block.',
  }),
  // ADR-369 D2a: kind nouns take no `with` settings.
  'parse.removed-capacity-setting': spec({
    form: '`with max items`, `with max weight` and `with capacity` on a kind',
    replacement: 'a `holds <n>` line',
    example: 'create the jar\n  a container with max items 3\n',
    message: (key: string, count: string) =>
      `\`with ${key}\` was removed — write the capacity as its own line: \`holds ${count}\`.` +
      (key === 'max weight' ? ' Weight is not a Chord concept; `holds` counts things.' : ''),
  }),
  // Ratchet R3 (ADR-234 D6): the `key`/`tool` config keywords.
  'parse.removed-config-keyword': spec({
    form: '`with key the …` and `with tool the …`',
    replacement: '`with the <thing>`',
    example: 'create the gate\n  a door\n  lockable with key the brass key\n',
    message: (keyword: string, name: string) =>
      `\`with ${keyword} the …\` was removed — write the entity directly: \`with the ${name}\`.`,
  }),
  // ADR-380 D3: a flight's trip time is its pace.
  'parse.passage-is-pace': spec({
    form: 'a vehicle\'s `passage:` line',
    replacement: '`pace: <n> turns`',
    example: 'create the gondola\n  a vehicle\n  passage: 5 turns\n',
    message: () =>
      '`passage:` is retired — a flight vehicle\'s trip time is `pace: <n> turns`, the line every moving vehicle uses.',
  }),
  // ADR-380 D4: the one-line passage forms.
  'parse.passage-line-form': spec({
    form: 'the one-line `passage <command> to <room>`, `… is blocked` and `… is deadly` lines',
    replacement: 'a `passage to <room>` block',
    example: 'create the Trench\n  a room\n  passage climb the rope to the Loft\n',
    message: () =>
      'A passage is a block: `passage to <room>`, then `grammar` with one command per line under it, and `end passage`. ' +
      'For example:\n  passage to the Loft\n    grammar\n      climb the rope\n  end passage',
  }),
  // ADR-267 D15: one slot spelling.
  'parse.removed-slot-spelling': spec({
    form: 'the `(name)` and `:name` slot spellings',
    replacement: '`the <name>`',
    example: 'extend action smelling\n  grammar\n    sniff (something)\n',
    message: (spelled: string, name: string) =>
      `The \`${spelled}\` slot spelling was removed — write \`the ${name}\`.`,
  }),
  // ADR-327 D1: a clause head names who acts.
  'parse.removed-head-it': spec({
    form: 'a clause head that ends in `it`, as in `on taking it`',
    replacement: 'a head that names who acts, as in `on the player taking`',
    example: 'create the sword\n  a thing\n\n  on taking it\n    phrase sharp\n  end on\n',
    message: (spelled: string, clauseKind: string, gerund: string) =>
      `\`${spelled}\` is no longer a form — name who acts: \`${clauseKind} the player ${gerund}\` (or the actor's name).`,
  }),
  // ADR-327 D2/D8: `it` and `its` outside a trait.
  'analysis.it-removed': spec({
    form: '`it` and `its` outside `define trait`',
    replacement: 'the owner\'s name',
    example: 'create the sword\n  a thing\n\n  on the player taking\n    remove it\n  end on\n',
    message: (spelled: string, fix: string) =>
      `\`${spelled}\` is no longer a form outside \`define trait\` — ${fix}.`,
  }),
  // ADR-253: a channel returns a construct.
  'parse.channel-from-removed': spec({
    form: 'a channel\'s `from event` line',
    replacement: '`return <construct> from <event>`',
    example: 'define channel clock\n  mode replace\n  from event estate-clock\nend channel\n',
    message: () =>
      '`from event` was removed — the event rides the `return … from <event>` clause: `return <construct> from <event>`.',
  }),
  'parse.channel-take-removed': spec({
    form: 'a channel\'s `take` line',
    replacement: 'a `return` line',
    example: 'define channel clock\n  mode replace\n  take hour\nend channel\n',
    message: () =>
      '`take` was removed — a channel `return`s a construct: `return <field> from <event>`, `return "text (slot)" from <event>`, or `return phrase <key> from <event>`.',
  }),
  // Given 4, amended: no `if`.
  'parse.removed-if': spec({
    form: '`if` blocks',
    replacement: 'a `must` line, a `when` suffix on a statement, or `select`',
    example:
      'create the Hall\n  a room\n\n  on the player entering\n    if the lamp is lit\n      win\n    end if\n  end on\n',
    message: () =>
      '`if` was removed — use a `must` requirement for guards (`it must be hungry: already-fed`), a statement `when` suffix for conditionals (`award X when <condition>`), or `select` for branching.',
  }),
};

/** A diagnostic code that reports a removed form. */
export type RemovedFormCode = keyof typeof FORMS;

/** One removed form, as a reference lists it. */
export interface RemovedForm {
  /** The diagnostic code the compiler reports. */
  code: RemovedFormCode;
  /** The form as an author used to write it. Backticks mark Chord text. */
  form: string;
  /** What to write instead. Backticks mark Chord text. */
  replacement: string;
  /** A source fragment that raises the code when compiled. */
  example: string;
}

/** Every removed form the compiler names, in the registry's order. */
export const REMOVED_FORMS: readonly RemovedForm[] = (Object.keys(FORMS) as RemovedFormCode[]).map((code) => ({
  code,
  form: FORMS[code].form,
  replacement: FORMS[code].replacement,
  example: FORMS[code].example,
}));

/**
 * The fix-it text for a removed form.
 * @param code the removed form's diagnostic code
 * @param words the site's words the message quotes, as that code's entry declares them
 * @returns the message an author reads
 */
export function removedFormMessage<Code extends RemovedFormCode>(
  code: Code,
  ...words: Parameters<(typeof FORMS)[Code]['message']>
): string {
  const message = FORMS[code].message as (...quoted: string[]) => string;
  return message(...words);
}
