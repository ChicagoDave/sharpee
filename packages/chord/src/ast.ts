/**
 * ast.ts — the Chord abstract syntax tree (Phase A grammar subset).
 *
 * Purpose: the parser's output — a faithful, span-carrying tree of the
 * `.story` text. The AST is pre-resolution: entity/phrase/state references
 * are still raw word sequences; event headers are unsegmented word lists
 * (verb vocabulary belongs to the analyzer, keeping the parser
 * platform-free per design.md §5.2).
 *
 * Public interface: every exported node type; StoryFile is the root.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { Span } from './span.js';

/** Root of a parsed `.story` file. */
export interface StoryFile {
  kind: 'story-file';
  header: StoryHeader | null;
  /**
   * `grammar "<name>"` header (ADR-269 D8) — present exactly when the file is
   * a grammar file. Mutually exclusive with `header` (parse-gated): a file
   * carries a `story` header or a `grammar` header, never both.
   */
  grammarHeader: GrammarHeader | null;
  declarations: Declaration[];
  span: Span;
}

/**
 * `grammar "<name>"` — declares a grammar file (ADR-269 D8): a file carrying
 * `define action` grammar surfaces only. The analyzer's grammar-file mode
 * rejects behavior (bodies, refusals, phrases, scores) and story declarations.
 */
export interface GrammarHeader {
  kind: 'grammar-header';
  /** The quoted grammar name, e.g. `standard-en-us`. */
  name: string;
  span: Span;
}

/**
 * A prose-valued header field (ADR-298 D4): either literal text or a bare
 * phrase reference. Classification is structural — a value that is a single
 * kebab atom is ALWAYS a phrase reference (the analyzer errors if no such
 * phrase exists); anything else is literal prose. Never resolve-if-exists.
 */
export interface HeaderProseValue {
  kind: 'literal' | 'phrase-ref';
  value: string;
  span: Span;
}

/**
 * Typed story-block metadata (ADR-298 D1/D4). The schema is closed: the
 * parser rejects unknown keys, so this shape is exhaustive by construction.
 */
export interface StoryFields {
  id?: string;
  /** `story-version:` — the author's own story version (renames `version:`). */
  storyVersion?: string;
  /** `ifid:` — Treaty of Babel identifier (ADR-074); minted by `sharpee init`. */
  ifid?: string;
  /** `authors:` — required; one name per indented line (no inline form). */
  authors: string[];
  /** `testers:` — same shape as `authors:`. */
  testers: string[];
  /** `prologue:` — emitted before the banner on the prologue channel (D3). */
  prologue?: HeaderProseValue;
  /** `description:` — build-time metadata, never emitted in play (D3). */
  description?: HeaderProseValue;
  /** `client:` — the client target (ADR-252 D3; defaults to `browser`). */
  client?: string;
  /** `theme:` — the theme PACKAGE the story uses (ADR-252 D3 / ADR-188). */
  theme?: string;
  /** `template:` — the template/layout package (ADR-252 D3 amendment). */
  template?: string;
  /** `themes:` — comma list of bundled theme names (ADR-252 D3). */
  themes: string[];
  /** `default-theme:` — falls back to `theme:`, then `classic` (ADR-252 D3). */
  defaultTheme?: string;
  /** `storage-prefix:` — browser storage namespace; defaults to `id` (ADR-252 D3). */
  storagePrefix?: string;
  /**
   * `publish-source:` — does the author's `.story` source travel in the
   * published artifact? Absent means NO: a build ships the compiled IR, and
   * shipping source is opt-in the way Inform's `Release along with the source
   * text` is. The IDE's Publish checkbox is a view over this field, so a
   * terminal publish and an IDE publish produce the same artifact (ADR-284 D1).
   */
  publishSource?: boolean;
  /**
   * `auto-assertion:` — the story's transcript auto-assertion policy
   * (go-live Phase 6e, issue #253): what the test runner writes for a NEW
   * command's first run. Closed value set (`all-emitted-text` |
   * `room-description` | `room-name-and-description`); absent means "let me
   * decide" — the runner writes nothing and an unasserted command keeps its
   * ADR-294 D2 tier-boundary failure. Editor-owned like `themes:` — the IDE's
   * Test menu writes it; authors never type it.
   */
  autoAssertion?: AutoAssertionPolicy;
}

/**
 * The `auto-assertion:` header values (Phase 6e). Per-story by design: the
 * policy shapes committed test files and must reach the CLI runner, so it
 * cannot live in per-user (IDE-side) preferences.
 */
export type AutoAssertionPolicy =
  | 'all-emitted-text'
  | 'room-description'
  | 'room-name-and-description';

/** `story` plus its indented fielded metadata (ADR-298 — positional form removed). */
export interface StoryHeader {
  kind: 'story-header';
  /** From the `title:` field; stays top-level (the IDE reads `IRMeta.title`). */
  title: string;
  /** Typed, closed-schema metadata fields (ADR-298 D4). */
  fields: StoryFields;
  /**
   * `states: a, b` — the story's phases (ownership package D2). The story
   * starts in the first declared state; bare state names are condition refs.
   */
  states: StateName[];
  /** `states, reversible:` — declared back-transitions allowed (D4). */
  statesReversible: boolean;
  /** `score <name> worth N` lines — story-owned score identities (D12). */
  scores: ScoreDecl[];
  /**
   * `on every turn [while <cond>][, once]` clauses in the header's indented
   * body (ADR-236 D7, ratchet R4) — story-owned daemons: no presence gate,
   * `it` unbound (a compile error if referenced). The only clause form the
   * header hosts.
   */
  onClauses: OnClause[];
  /** `when <timer> expires` clauses for story-owned timers (ADR-325 D3e). */
  timerClauses: TimerClause[];
  /**
   * `use <extension>` lines in the header's indented body (ADR-215):
   * static, one trusted platform-extension name per line. Each admits that
   * extension's manifest vocabulary at compile time and triggers its
   * runtime registration at load.
   */
  uses: UseDecl[];
  /**
   * `use phrasebook <name> [while <condition>]` lines (ADR-250 D2) —
   * packaged voices, predicate bound at the use site (absent = the
   * default/always book). Stackable; header position = arbitration
   * position ahead of every body-declared book.
   */
  usePhrasebooks: UsePhrasebookDecl[];
  /**
   * `rank "<name>" at <n> [says <key>]` rungs from the indented `use scoring`
   * body (ADR-261 D2). Source order is preserved here; the analyzer sorts
   * ascending. Empty when the story declares no ladder — which is legal and
   * means "scoring on, SCORE reports a score with no rank".
   */
  ranks: RankDecl[];
  /**
   * The `use hunger` body (ADR-263 D1) — a depleting satiety meter: `grows N
   * each turn`, `<band> at <n> [says <key>]` rungs, and `fatal at N`. Absent
   * when the story has no `use hunger` line.
   */
  hunger?: HungerDecl;
  span: Span;
}

/**
 * The indented body of a `use hunger` line (ADR-263 D1).
 *
 * `grows` is the per-turn severity gain (lowered to an `on every turn` daemon);
 * `fatal` is a raw-value death trigger above the top band (lowered to `kill the
 * player`); `rungs` are the announce bands over the ADR-262 crossing engine.
 */
export interface HungerDecl {
  grows?: number;
  fatal?: number;
  rungs: MeterRung[];
  span: Span;
}

/**
 * One `<band> at <n> [says <key>]` rung in a metering extension's body
 * (ADR-263 D1). Unlike a `rank` rung, the band is a bareword (`peckish`), not a
 * quoted author string — it doubles as the band id. `phraseKey` is the story
 * phrase spoken on crossing; absent means the ADR-262 platform fallback.
 */
export interface MeterRung {
  kind: 'meter-rung';
  band: string;
  threshold: number;
  phraseKey?: string;
  span: Span;
}

/** One `use <extension>` line (ADR-215). */
export interface UseDecl {
  name: string;
  /**
   * The `, announce <mode>` suffix (ADR-262 D3) — how a metering extension's
   * band crossings narrate: `all` / `collapsed` / `combined` / `silent`. The
   * analyzer validates the value; absent means the extension's default.
   */
  announce?: string;
  span: Span;
}

/**
 * One `rank "<name>" at <n> [says <key>]` rung, from the indented body of a
 * `use scoring` line (ADR-261 D2/D7).
 *
 * `threshold` is **absolute points, never a percentage** — ADR-260 D2's
 * invariant, which exists so a change to maxScore can never move a boundary.
 *
 * `name` is a quoted author string, written the way entity names are written:
 * rank prose is author content (ADR-260 D4), not a key resolved through a
 * phrasebook. `phraseKey` is the opposite — a kebab key in the story's own
 * phrase namespace, spoken when the player crosses this rung. A rung with no
 * `says` is silent, because there is no platform sentence to fall back to.
 */
export interface RankDecl {
  kind: 'rank';
  name: string;
  threshold: number;
  phraseKey?: string;
  span: Span;
}

/** One `use phrasebook <name> [while <condition>]` line (ADR-250 D2). */
export interface UsePhrasebookDecl {
  name: string;
  condition: ConditionNode | null;
  span: Span;
}

/** `score <name> worth <n>` on an owner (create/trait/action/story — D12). */
export interface ScoreDecl {
  kind: 'score';
  name: string;
  worth: number;
  span: Span;
}

/**
 * `counter <name> [starts <n>] [between <lo> and <hi>]` inside a `create` block
 * (ADR-264 D1) — a per-entity numeric counter, one value per instance. `starts`
 * and the bounds are optional (null = default 0 / unbounded).
 */
export interface CounterDecl {
  kind: 'counter';
  name: string;
  starts: number | null;
  lo: number | null;
  hi: number | null;
  span: Span;
}

export type Declaration =
  | CreateDecl
  | DefineCondition
  | DefinePhrase
  | DefinePhrases
  // `define verb` REMOVED (ADR-270 D7, 2026-07-26) — `extend action`
  // subsumes it; the parser emits parse.removed-define-verb with a fix-it.
  | DefineText
  // Phase B (design.md §2.2/§2.3/§2.5/§3.4):
  | DefineTrait
  | DefineAction
  | DefineHatch
  | DefineSequence
  | DefineTimer
  // ADR-264 story-global numeric counter:
  | DefineCounter
  // ADR-215 `use state-machines` depth (spelling A, David 2026-07-18):
  | DefineMachine
  // ADR-216 declared media assets (DATA references, never hatches):
  | DefineAsset
  | DefineFamilyChannel
  // ADR-216 custom channels (spelling A, David 2026-07-18):
  | DefineChannel
  // ADR-239 topic conversation (D3 as amended, David 2026-07-18):
  | DefineTopics
  // ADR-320 D5 manner blocks / D4 boundary blocks (frozen 2026-08-17):
  | DefineManner
  | DefineGreetings
  // ADR-320 D4 exchange blocks / D7 initiative blocks (frozen 2026-08-17):
  | DefineExchange
  | DefineInitiative
  // ADR-320 D14 conversation threads (frozen 2026-08-17):
  | DefineConversation
  // ADR-310 D14 valued-belief fact declarations:
  | DefineFact
  | DefineTemperament
  | DefineCode
  | DefineHonor
  | DefineWitnessedTopic
  // ADR-310 D4 named cognitive profiles:
  | DefineProfile
  // ADR-310 D5 custom vocabulary (Option 2, David 2026-08-15):
  | DefineMood
  | DefinePersonality
  // ADR-242 person identity (ruled Q-1, David 2026-07-19):
  | DefinePronouns
  // ADR-245/250 phrasebooks (David 2026-07-21):
  | DefinePhrasebook
  // ADR-255 standard-action message override ACL (David 2026-07-22):
  | OverrideMessage
  | OverrideMessages
  // ADR-251 generalized import (David 2026-07-21):
  | ImportDecl
  // ADR-270 author alteration model (David 2026-07-26):
  | ExtendAction
  | RemoveFromAction
  // ADR-327 D10 the start block (David 2026-08-26):
  | StartBlockDecl;

/**
 * `before the game starts … end before` (ADR-327 D10) — the one place a
 * story assigns the player role before play begins. Effect statements only:
 * `phrase`/`emit` are an analyzer gate, because the block runs before any
 * turn exists to carry prose (the story header's `prologue:` is that seam).
 * Exactly one per story; the analyzer also requires that one to assign the
 * role on some path.
 */
export interface StartBlockDecl {
  kind: 'start-block';
  body: Statement[];
  span: Span;
}

/**
 * `define phrasebook <name> [while <condition>] … end phrasebook`
 * (ADR-245/ADR-250 D1): a named, predicated collection of phrase entries.
 * Entries reuse the phrase-override grammar (`<key>[, strategy]:` +
 * `or` variants); an entry-level `while` parses but is an analyzer gate
 * (`analysis.phrasebook-entry-gate`) — the book's header predicate is the
 * only gate. A predicate-less book is the default phrasebook (always).
 */
export interface DefinePhrasebook {
  kind: 'define-phrasebook';
  /** Single kebab-case book name (extension-name form). */
  name: string;
  /** The book's activity predicate; null = always (the default book). */
  condition: ConditionNode | null;
  entries: PhraseOverride[];
  span: Span;
}

/**
 * `import "<file>"` (ADR-251) — the author's multi-file organization axis.
 * `path` is the name as written, WITHOUT extension: the compiler appends
 * `.chord` before handing it to the host `importResolver`, which resolves
 * it to the fragment's source text. The fragment's complete declarations
 * (any kind except a `story` header; its own `import` lines nest, spliced
 * depth-first at their own position) are spliced at
 * this position (import site = arbitration position — D4). Unresolved at
 * analysis time = `analysis.import-unresolved`. Supersedes ADR-250 D2's
 * typed `import phrasebook`/`.story` form.
 */
export interface ImportDecl {
  kind: 'import';
  /** Import target as written, extension-free (compiler appends `.chord`). */
  path: string;
  span: Span;
}

/**
 * `define topics for <entity> … end topics` (ADR-239 D3 as amended) — the
 * entity's declared table of ask/tell topics + responses: a closed,
 * compile-visible set (D4 — lookup, never fuzzy). One block per entity
 * (duplicate = analyzer error); any number of `about` rows.
 */
export interface DefineTopics {
  kind: 'define-topics';
  /** The owning entity (`for the porter`) — must be a person kind (analyzer gate). */
  owner: NameRef;
  rows: TopicRow[];
  span: Span;
}

/**
 * One `about …: <response>` table row. Entity tier: `about the <entity>`
 * (the platform's quiet `topicEntityId` resolution). Free-text tier:
 * `about "<text>"[, "<text>" …]` — comma-separated declared aliases
 * (spelling ruled by David 2026-07-18). The response is a one-line
 * statement or an indented statement body; `it` inside binds to the owner.
 */
export interface TopicRow {
  kind: 'topic-row';
  filter:
    | { kind: 'entity'; ref: NameRef }
    | { kind: 'text'; primary: string; aliases: string[]; span: Span };
  body: Statement[];
  span: Span;
}

/**
 * `define manner for <entity> … end manner` (ADR-320 D5, vocabulary frozen
 * 2026-08-17) — the character's declared delivery layer: state-conditioned
 * rows of ambient beats and voice markers that color any phrase the
 * character delivers which lacks a more specific authored variant. One
 * block per entity (analyzer error); at least one row (parse error).
 */
export interface DefineManner {
  kind: 'define-manner';
  /** The owning entity (`for Viola Wainright`) — person kind (analyzer gate). */
  owner: NameRef;
  rows: MannerRow[];
  span: Span;
}

/**
 * One `when <condition>:` manner row: an indented body of `beat "<prose>"`
 * and `voice <word>` lines. Beats rotate at runtime without back-to-back
 * repeats; `voice` is one word, open vocabulary (frozen decision §5.5).
 */
export interface MannerRow {
  kind: 'manner-row';
  condition: ConditionNode;
  lines: MannerLine[];
  span: Span;
}

/** One line of a manner row body. */
export type MannerLine =
  | { kind: 'beat'; text: string; span: Span }
  | { kind: 'voice'; word: string; span: Span };

/**
 * `define greetings for <entity> … end greetings` (ADR-320 D4, spelling
 * frozen 2026-08-17) — the scene boundary block: rows selected by the
 * boundary moment (first meeting, return, exit) refined by the frozen
 * absence words (`again so soon` / `after a while` / `after days`) and
 * repetition words (`asked once/again/many times` — scene visits in this
 * context). One block per entity; at least one row.
 */
export interface DefineGreetings {
  kind: 'define-greetings';
  /** The owning entity — person kind (analyzer gate). */
  owner: NameRef;
  rows: GreetingRow[];
  span: Span;
}

/**
 * One boundary row: a head selecting the moment, then a one-line statement
 * or an indented statement body (the topic-row body idiom; `it` = owner).
 */
export interface GreetingRow {
  kind: 'greeting-row';
  head: GreetingHead;
  body: Statement[];
  span: Span;
}

/** The frozen absence words, kebab-normalized. */
export type AbsenceWord = 'again-so-soon' | 'after-a-while' | 'after-days';

/** The frozen repetition words, kebab-normalized. */
export type RepetitionWord = 'once' | 'again' | 'many-times';

/**
 * A greeting row head (frozen spellings): `first time`, `on return`
 * (optionally `, <absence-word>`), `asked <repetition-word>`, `on leaving`.
 */
export type GreetingHead =
  | { kind: 'first-time'; span: Span }
  | { kind: 'return'; absence: AbsenceWord | null; span: Span }
  | { kind: 'asked'; word: RepetitionWord; span: Span }
  | { kind: 'leaving'; span: Span };

/**
 * The frozen strength words (ADR-320 D10) — spelled exactly as
 * `@sharpee/character`'s `ConversationStrength` union, so the Chord
 * surface and the runtime skeleton never need a mapping table.
 */
export type StrengthWord = 'passive' | 'assertive' | 'blocking';

/**
 * `define exchange <key> for <entity>[, <strength>] … end exchange`
 * (ADR-320 D4, vocabulary frozen 2026-08-17) — a named exchange point:
 * the response set that overlays the owner's topic table while open. The
 * block holds responses only — the opening line lives in the calling row
 * (`then asks <key>`), so one exchange can be opened with different
 * openings. Person-kind owners; one definition per (owner, key); at
 * least one row. Input matching no row falls through to the topic table
 * (D16 innermost-wins) — there is no `otherwise` row to author.
 */
export interface DefineExchange {
  kind: 'define-exchange';
  /** Single kebab-case exchange key (phrase-key form). */
  name: string;
  /** The owning entity — the character who asked (person kind, analyzer gate). */
  owner: NameRef;
  /** Header comma-modifier; null = the runtime derives strength from intent. */
  strength: StrengthWord | null;
  rows: ExchangeRow[];
  span: Span;
}

/**
 * One exchange response row: a head selecting what the responder says
 * (`answer …`), does (`on <act/event>`), or withholds (`on silence`),
 * then a one-line statement or an indented statement body (the topic-row
 * idiom; `it` = the owner).
 */
export interface ExchangeRow {
  kind: 'exchange-row';
  head: ExchangeHead;
  body: Statement[];
  span: Span;
}

/**
 * An exchange row head (frozen spellings): `answer` reuses the topic-key
 * grammar whole (quoted free-text with comma aliases, or the entity
 * tier); `on` carries an act/event word from the existing event-verb
 * register; `on silence` is fixed — silence is something that happens,
 * not something said (D8 renders it like any response).
 */
export type ExchangeHead =
  | { kind: 'answer'; filter: TopicRow['filter']; span: Span }
  | { kind: 'act'; action: string; span: Span }
  | { kind: 'silence'; span: Span };

/**
 * `define conversation <key> for <entity>[, <strength>] … end conversation`
 * (ADR-320 D14, vocabulary frozen 2026-08-17) — a conversation thread: an
 * author-scripted subject the owner carries beat by beat to a defined
 * conclusion, across as many sittings as it takes. Person-kind owners;
 * one definition per (owner, key); at least one beat; exactly one
 * conclusion. The `about` filter reuses the topic-key grammar; header
 * strength reuses the frozen `passive`/`assertive`/`blocking` words and
 * governs off-thread transitions (blocking = single-topic completion).
 */
export interface DefineConversation {
  kind: 'define-conversation';
  /** Single kebab-case thread key (phrase-key form). */
  name: string;
  /** The owning entity — the character who carries the thread (person kind, analyzer gate). */
  owner: NameRef;
  /** Header comma-modifier; null = the runtime derives strength from intent. */
  strength: StrengthWord | null;
  /** The `about <topic-keys>` filter; null when the line is absent. */
  about: TopicRow['filter'] | null;
  /** The `opens when <condition>` NPC-opened entry; null when absent. */
  opensWhen: ConditionNode | null;
  /** Ordered `beat:` rows, declaration order. */
  beats: ConversationBeat[];
  /** `on parting:` body — rendered when the thread parks unconcluded; null when unauthored. */
  onParting: Statement[] | null;
  /** `on resuming:` body — rendered when the thread re-engages; null when unauthored. */
  onResuming: Statement[] | null;
  /** `on refusing:` body — a blocking thread's off-topic refusal; null when unauthored. */
  onRefusing: Statement[] | null;
  /** The `conclusion:` body — beat n, fires once; null only on a parse error (gated). */
  conclusion: Statement[] | null;
  span: Span;
}

/**
 * One thread beat: an optional `, when <condition>` hold-gate before the
 * colon (the initiative-row composition shape), then a one-line statement
 * or an indented statement body (the topic-row idiom; `it` = the owner).
 */
export interface ConversationBeat {
  kind: 'conversation-beat';
  /** The `beat, when <condition>:` hold-gate; null = the beat is always ready. */
  condition: ConditionNode | null;
  body: Statement[];
  span: Span;
}

/**
 * `define initiative for <entity> … end initiative` (ADR-320 D7,
 * vocabulary frozen 2026-08-17) — authored occasion rows that force or
 * suppress a seizure. A row firing forces the moment
 * (most-specific-wins over disposition); a `hold their tongue` body
 * suppresses it. Rows need NOT be mutually exclusive — selection is the
 * scene runtime's. Person-kind owners; one block per entity; at least
 * one row.
 */
export interface DefineInitiative {
  kind: 'define-initiative';
  owner: NameRef;
  rows: InitiativeRow[];
  span: Span;
}

/**
 * One initiative row: an occasion head, an optional condition refinement
 * after a comma (`on an open floor, when morale is low:`), then a
 * one-line statement or an indented statement body.
 */
export interface InitiativeRow {
  kind: 'initiative-row';
  head: InitiativeHead;
  /** The `, when <condition>` refinement; null = the occasion alone. */
  condition: ConditionNode | null;
  body: Statement[];
  span: Span;
}

/**
 * An initiative occasion head (frozen spellings) — the author-addressable
 * `SceneOccasion` kinds: `on an open floor`, `on silence`, `when the
 * subject changes` (the Phase 3 threading condition reused as a head),
 * and `on <act/event>` (witnessed event, the event-verb register). The
 * goal-step occasion is deliberately not surfaced — goal steps force
 * moments through the goal machinery itself.
 */
export type InitiativeHead =
  | { kind: 'open-floor'; span: Span }
  | { kind: 'silence'; span: Span }
  | { kind: 'subject-change'; span: Span }
  | { kind: 'act'; action: string; span: Span };

/**
 * The construct a channel `return`s (ADR-253 D1). The channel's value is
 * whatever it returns from the turn's last matching event:
 *  - `field`  — `return hour from …`: the raw field value;
 *  - `text`   — `return "The clock: (hour)" from …`: a text template whose
 *    `(slot)` names project event fields (the phrase slot spelling, ADR-250);
 *  - `phrase` — `return phrase clock-line from …`: the phrase's rendered text.
 */
export type ChannelReturn =
  | { kind: 'field'; field: string }
  | { kind: 'text'; text: string }
  | { kind: 'phrase'; phrase: string }
  | { kind: 'record'; members: ChannelRecordMember[] };

/**
 * One member of a `return record` block (ADR-300 D10).
 *
 * `<name> <construct>` projects a single value; `<name> list of <construct>`
 * projects a repeated one. `value` is never itself a record — records do not
 * nest, and the parser reports an attempt to nest one.
 */
export interface ChannelRecordMember {
  name: string;
  /** True for `list of <construct>` — the member carries an array. */
  list: boolean;
  /** The member's construct; null = parse error already reported. */
  value: ChannelReturn | null;
  span: Span;
}

/**
 * `define channel <name> … end channel` (ADR-216; spelling A ratified by
 * David 2026-07-18; ADR-253 replaced `take`/`from event` with `return …
 * from <event>`) — a declarative data projection: a `return` construct, a
 * mode, and an optional capability gate, producing a value from the turn's
 * last event of the named type. Pure IR — placement/rendering is the
 * client's (ADR-253 D2/D3), never here.
 */
export interface DefineChannel {
  kind: 'define-channel';
  name: string;
  /** `mode replace|append|event` (null = parse error reported). */
  mode: string | null;
  /** `gated by <capability>` — a client capability flag, or null (ungated). */
  gatedBy: string | null;
  /** The source event type, from the `return … from <event>` tail (ADR-256:
   *  a dotless Chord id; null = parse error reported). */
  fromEvent: string | null;
  /** `return <construct> from <event>` (ADR-253 D1); null = parse error
   *  reported. A `record` construct (ADR-300 D10) carries its members. */
  returns: ChannelReturn | null;
  span: Span;
}
/** One `pronouns <word>` person body line (ADR-242 D5). */
export interface PronounsDecl {
  word: string;
  span: Span;
}

/**
 * `define pronouns <name> … end pronouns` (ADR-242 D7, ruled Q-1) — a
 * named pronoun set as a block with five named rows (`subject`, `object`,
 * `possessive`, `possessive-pronoun`, `reflexive`), each `<case> <form>`.
 * Row completeness, duplicates, and standard-word shadowing are the
 * analyzer's gates; the declared forms are locale text carried as data
 * (registered into the language provider at load, never rendered here).
 */
export interface DefinePronouns {
  kind: 'define-pronouns';
  name: string;
  rows: PronounRow[];
  span: Span;
}

/** One `<case> <form>` row of a `define pronouns` block. */
export interface PronounRow {
  case: string;
  form: string;
  span: Span;
}

// Removed by the ownership package (ratchet 2026-07-11): DefineFlag,
// DefineScore, WhenRule, OnceRule, EveryRule — the parser emits removal
// diagnostics with fix-its pointing at the owner-attached replacements.

/** A raw (unresolved) name reference: optional article + word sequence. */
export interface NameRef {
  kind: 'name';
  /** Leading article if present (`the`, `a`, `an`) — resolution strips it. */
  article: string | null;
  /** Name words in source order, joined by single spaces. */
  words: string[];
  span: Span;
}

/** Prose-block text; `{…}` markers extracted but not validated (parser stage). */
export interface TextValue {
  kind: 'text';
  /**
   * 'prose' = indented bare block — inter-line whitespace collapsed, blank
   * lines become `\n\n` paragraph breaks. 'verbatim' = line structure and
   * indentation preserved exactly (`define phrase X, verbatim`). The quoted
   * same-line form was removed (grammar log 2026-07-10).
   */
  form: 'prose' | 'verbatim';
  /** The text (paragraphs separated by `\n\n`; verbatim lines by `\n`). */
  text: string;
  markers: TextMarker[];
  span: Span;
}

/** One `{…}` marker inside a TextValue. */
export interface TextMarker {
  /** Marker content between the braces, e.g. `garbled` or `snippet:pond`. */
  content: string;
  span: Span;
}

// --------------------------------------------------------------------------
// create
// --------------------------------------------------------------------------

/** `create <name>` block (dedent-terminated). */
export interface CreateDecl {
  kind: 'create';
  name: NameRef;
  /** `aka` aliases, in declaration order. */
  aka: string[];
  /**
   * `pronouns <word>` lines (ADR-242 D5) — collected in order so the
   * analyzer can reject duplicates with the second line's span. Legal
   * only on person blocks; word resolution (standard four or a
   * `define pronouns` set) is the analyzer's gate.
   */
  pronouns: PronounsDecl[];
  /** Kind-noun and trait-adjective composition items. */
  compositions: CompositionItem[];
  /**
   * `starts <state>` initial-state clauses (ADR-231 D5a) riding the
   * composition lines, in declaration order (`starts locked`). Pairing with
   * the required trait (`lockable`, …) is the analyzer's gate.
   */
  startsStates: StartsStateDecl[];
  /** `in <place>` / `on <place>` / `starts in <place>`. */
  placement: Placement | null;
  /** `wears <thing>` lines (the player wears the cloak). */
  wears: NameRef[];

  /** `carries <thing>` lines — start inventory, not worn (ADR-230 Phase 6). */
  carries: NameRef[];
  /**
   * `containing <name list>` region-membership lines (ADR-236 D2, ratchet
   * R2) — additive across lines; members are rooms or nested regions. Legal
   * only on region blocks (the analyzer's gate).
   */
  containing: NameRef[];
  /**
   * `landing <room>` / `landing, <strategy>: <rooms>` (ADR-325 D5) — where
   * something put in the region lands. One per region (the parser rejects
   * a second); region-only and contained-only are the analyzer's gates.
   */
  landing: LandingDecl | null;
  exits: ExitDecl[];
  blockedExits: BlockedExitDecl[];
  /** `<direction> is deadly: <phrase>` lines (ADR-227). */
  deadlyExits: DeadlyExitDecl[];
  /** `deadly: <phrase>` no-escape room marker (ADR-227); null = not deadly. */
  deadly: DeadlyRoomDecl | null;
  /** `states: a, b, c` — ordered. */
  states: StateName[];
  /** `states, reversible:` — declared back-transitions allowed (D4). */
  statesReversible: boolean;
  /** `score <name> worth N` lines — entity-owned scores (D12). */
  scores: ScoreDecl[];
  /** `counter <name> …` lines — per-entity numeric counters (ADR-264 D1). */
  counters: CounterDecl[];
  /** First bare indented paragraph. */
  description: TextValue | null;
  /**
   * `first time` prose block (Z1) — the first-VISIT description; compiles
   * to `RoomTrait.initialDescription`. Rooms only (analyzer-enforced).
   */
  initialDescription: TextValue | null;
  /** Per-entity phrase overrides: `phrase <key>: <text>` lines. */
  phraseOverrides: PhraseOverride[];
  onClauses: OnClause[];
  /** `when <timer> expires` clauses (ADR-325 D3e). */
  timerClauses: TimerClause[];
  /** `when <entity> moves` clauses (ADR-325 D3h). */
  moveClauses: MoveClause[];
  /**
   * `mood <word>` lines (ADR-310 D3) — collected in order so the analyzer
   * can reject duplicates with the second line's span (the pronouns idiom).
   * Person-only; word resolution is the analyzer's gate.
   */
  moods: MoodDecl[];
  /** `feels <disposition> [toward] <entity>` lines (ADR-310 D3). */
  feels: FeelsDecl[];
  /** `knows <topic>, <source>[, …]` lines (ADR-310 D3). */
  knows: KnowsDecl[];
  /** `thinks <fact> is <value>[, …]` lines (ADR-310 D14). */
  thinks: ThinksDecl[];
  /** `spreads …` propagation lines (ADR-310 D10) — at most one is legal (analyzer gate). */
  spreads: SpreadsDecl[];
  /** `goal <name>, <priority> … end goal` blocks (ADR-310 D8). */
  goals: GoalDecl[];
  /** `influence <name>, <mode>, <range> … end influence` blocks (ADR-310 D9). */
  influences: InfluenceDecl[];
  /** `resists <influence>[, except from <ref>]` lines (ADR-310 D9). */
  resists: ResistsDecl[];
  /** `temperament …` binding lines (ADR-318 D3/D7). */
  temperaments: TemperamentDecl[];
  /** `never <category> [scope][, except …]` principle lines (ADR-318 D4). */
  nevers: NeverDecl[];
  /** `protects <scope>` / `answers honestly` obligation lines (ADR-318 D4/D5). */
  obligations: ObligationLineDecl[];
  /** `code <name>` bundle references (ADR-318 D4) — union with the bare lines. */
  codes: Array<{ name: string; span: Span }>;
  /** `honor [<name>] before <scope>[, except …]` lines (ADR-318 D7) — at most one is legal (analyzer gate). */
  honors: HonorLineDecl[];
  /** `burdened by <topic>` pre-story conscience seeds (ADR-318 D8) — the topic must be held (analyzer gate). */
  burdens: Array<{ topic: NameRef; span: Span }>;
  span: Span;
}

/**
 * One `honor` line (ADR-318 D7): the full face-act bundle (`honor before
 * the regiment`) or a named selective bundle (`honor soldiers-honor before
 * anyone`). Audience scope reuses the D9/D10 grammar; `except` lists
 * entities (the spreads idiom).
 */
export interface HonorLineDecl {
  /** The `define honor` bundle name; null = the full platform bundle. */
  name: string | null;
  scope: ScopeRefDecl;
  except: NameRef[];
  span: Span;
}

/**
 * One `never …` principle line (ADR-318 D4). Pre-comma words are raw —
 * the category longest-match (third-person surface against the manifest's
 * infinitives) and the trailing scope are the analyzer's gates, so the
 * parser stays vocabulary-free.
 */
export interface NeverDecl {
  words: Array<{ word: string; span: Span }>;
  except: ExceptClauseDecl | null;
  span: Span;
}

/**
 * `, except [to protect] <scope>` (ADR-318 D4/D6 — exp-02's collision
 * carve-out). With `to protect`, the principle yields to the obligation
 * protecting that scope; without, the act's object in scope is exempt.
 */
export interface ExceptClauseDecl {
  protect: boolean;
  scope: ScopeRefDecl;
  span: Span;
}

/** A scope reference (ADR-310 D9/D10 grammar): `anyone`, a classifier, or an entity. */
export type ScopeRefDecl =
  | { kind: 'anyone'; span: Span }
  | { kind: 'ref'; ref: NameRef };

/** One obligation line (ADR-318 D4/D5): `protects <scope>` or `answers honestly`. */
export interface ObligationLineDecl {
  kind: 'protects' | 'answers-honestly';
  /** Present for `protects`; null for `answers honestly`. */
  scope: ScopeRefDecl | null;
  span: Span;
}

/**
 * One `temperament` line on a create block (ADR-318 D3/D7): a named
 * reference with optional pair overrides (`temperament steadfast with
 * desire over fear while resolute`) or an inline anonymous ordering
 * (`temperament honor over fear`). Word resolution, the override fold,
 * and the same-state tie are the analyzer's gates.
 */
export interface TemperamentDecl {
  /** The referenced `define temperament` name; null for an inline ordering. */
  name: string | null;
  /** Inline pairs, or `with` override pairs on a named reference. */
  pairs: ForcePairDecl[];
  /** `while <state>` binding; null = unconditional. */
  while: { word: string; span: Span } | null;
  span: Span;
}

/** One `<force> over <force>` ordering pair (ADR-318 D3) — force words resolve in the analyzer. */
export interface ForcePairDecl {
  first: { word: string; span: Span };
  second: { word: string; span: Span };
  span: Span;
}

/**
 * A `goal` block (ADR-310 D8): named, prioritized, activation-conditioned,
 * with an ordered step body — one verb per line, the same reading order as
 * the sequence it compiles to.
 */
export interface GoalDecl {
  kind: 'goal';
  name: string;
  /** Priority word from the header's comma slot; null when missing (parse error already reported). */
  priority: { word: string; span: Span } | null;
  /** `active when <condition>`; null = always active. */
  activeWhen: ConditionNode | null;
  steps: GoalStepDecl[];
  span: Span;
}

/** One goal step line (ADR-310 D8) — verbs per ADR-145's step types. */
export type GoalStepDecl =
  | { kind: 'seek'; target: NameRef; in: NameRef | null; span: Span }
  | { kind: 'acquire'; target: NameRef; span: Span }
  | { kind: 'wait-for'; condition: ConditionNode; span: Span }
  | { kind: 'move-to'; target: NameRef; span: Span }
  | { kind: 'act'; phraseKey: string; span: Span }
  | { kind: 'say'; phraseKey: string; target: NameRef | null; span: Span }
  | { kind: 'give'; item: NameRef; target: NameRef; span: Span }
  | { kind: 'drop'; item: NameRef; in: NameRef | null; span: Span };

/**
 * An `influence` block (ADR-310 D9): author-invented name, mode and range
 * on the header, effect lines in the body. Header slot words classify
 * order-free (mode vs range are disjoint vocabularies — analyzer gate).
 */
export interface InfluenceDecl {
  kind: 'influence';
  name: string;
  slots: Array<{ word: string; span: Span }>;
  effects: InfluenceEffectDecl[];
  span: Span;
}

/** One influence body line (ADR-310 D9). */
export type InfluenceEffectDecl =
  | { kind: 'clouds-focus'; span: Span }
  | { kind: 'makes'; axis: string; value: string; span: Span }
  | { kind: 'phrase'; key: string; on: 'witnessed' | 'resisted' | 'expired'; span: Span };

/** One `resists <influence>[, except from <ref>]` line (ADR-310 D9). */
export interface ResistsDecl {
  influence: string;
  /** `except from a woman` / `except from the Duke` — article decides classifier vs entity (analyzer). */
  exceptFrom: NameRef | null;
  span: Span;
}

/**
 * One `spreads` line (ADR-310 D10). `spreads nothing` is `mute` said in
 * English; the spreads form implies the chatty tendency, and its topic
 * list (possibly empty = everything held) is the whitelist — listing IS
 * selectivity, so `selective` never appears as a word.
 */
export type SpreadsDecl =
  | { mode: 'nothing'; span: Span }
  | {
      mode: 'spreads';
      topics: NameRef[];
      audience: { word: string; span: Span };
      except: NameRef[];
      span: Span;
    };

/** One `mood <word>` line (ADR-310 D3). */
export interface MoodDecl {
  word: string;
  span: Span;
}

/** One `feels <disposition> [toward] <entity>` line (ADR-310 D3). */
export interface FeelsDecl {
  /** The matched disposition word, as spelled in the vocabulary (`wary of`). */
  disposition: string;
  target: NameRef;
  span: Span;
}

/**
 * One `knows <topic>, <source>[, <slot>]…` line (ADR-310 D3). Comma slots
 * are collected raw — classification (source / confidence / future
 * markers) is the analyzer's gate, so slot order stays free.
 */
export interface KnowsDecl {
  topic: NameRef;
  slots: Array<{ word: string; span: Span }>;
  span: Span;
}

/**
 * One `thinks <fact> is <value>[, <slot>]…` line (ADR-310 D14) — a valued
 * belief against a `define fact` value set. Slots classify like `knows`.
 */
export interface ThinksDecl {
  fact: NameRef;
  value: NameRef;
  slots: Array<{ word: string; span: Span }>;
  span: Span;
}

/**
 * `define fact <name> … end fact` (ADR-310 D14): the closed value set that
 * makes valued belief checkable. Body lines list values — entity names or
 * bare words (`nobody`) — additive across lines.
 */
export interface DefineFact {
  kind: 'define-fact';
  name: NameRef;
  values: NameRef[];
  span: Span;
}

/**
 * `define mood <name> like <mood>[, but <modifier>]` (ADR-310 D5 — Option
 * 2, David 2026-08-15): a custom mood anchored at a platform mood's
 * coordinates, optionally nudged one axis by a closed modifier word.
 * Numbers never appear; word resolution is the analyzer's gate.
 */
export interface DefineMood {
  kind: 'define-mood';
  name: string;
  like: { word: string; span: Span };
  but: { word: string; span: Span } | null;
  span: Span;
}

/**
 * `define personality <name>` (ADR-310 D5): a custom personality
 * adjective — one line, no body; intensity words compose as usual.
 */
export interface DefinePersonality {
  kind: 'define-personality';
  name: string;
  span: Span;
}

/**
 * `define code <name> … end code` (ADR-318 D4): a named principle bundle.
 * Body lines are `never …` and obligation lines; `code <name>` on a create
 * block unions the bundle with the block's bare lines. Codes flatten at
 * compile time — they never reach the wire.
 */
export interface DefineCode {
  kind: 'define-code';
  name: string;
  nevers: NeverDecl[];
  obligations: ObligationLineDecl[];
  span: Span;
}

/**
 * `define topic <actor> <act> as <alias>` (ADR-318 D12a): names a
 * mechanically-minted witnessed-act topic. One line, no body. Words before
 * `as` are raw — the actor/act split (longest act-surface suffix) is the
 * analyzer's gate.
 */
export interface DefineWitnessedTopic {
  kind: 'define-witnessed-topic';
  words: Array<{ word: string; span: Span }>;
  alias: string;
  span: Span;
}

/**
 * `define honor <name> … end honor` (ADR-318 D7): a named selective
 * face-act bundle — one face-act per body line, raw words (resolution is
 * the analyzer's gate). The ladder rung above `honor before <scope>`.
 */
export interface DefineHonor {
  kind: 'define-honor';
  name: string;
  faceActs: Array<{ words: Array<{ word: string; span: Span }>; span: Span }>;
  span: Span;
}

/**
 * `define temperament <name> … end temperament` (ADR-318 D3): a named
 * force ordering. Body lines are `<force> over <force>` pairs; force
 * resolution is the analyzer's gate.
 */
export interface DefineTemperament {
  kind: 'define-temperament';
  name: string;
  pairs: ForcePairDecl[];
  span: Span;
}

/**
 * `define profile <name> … end profile` (ADR-310 D4): a named cognitive
 * profile. Body rows are `<dimension> <value>`; unstated dimensions
 * inherit from `clear-headed` at compile time (a profile is always
 * complete). Word resolution is the analyzer's gate.
 */
export interface DefineProfile {
  kind: 'define-profile';
  name: string;
  rows: Array<{ dimension: string; value: string; span: Span }>;
  span: Span;
}

/**
 * One `starts <state>` initializer clause on a composition line (ADR-231
 * D5a): `starts locked`, `starts open`, … — the state word is one of the
 * catalog's STARTS_STATE_PAIRINGS keys (parse-gated; unknown words after
 * `starts` are parse errors, `starts in` stays placement).
 */
export interface StartsStateDecl {
  kind: 'starts-state';
  /** The accepted state word (`locked`, `unlocked`, `closed`, `open`, `off`, `on`). */
  state: string;
  span: Span;
}

/** One composition term: `a room`, `scenery`, `a supporter with capacity 1`, `dark while <cond>`. */
export interface CompositionItem {
  kind: 'composition';
  /** Present iff the term is a kind noun (`a room`); absent for trait adjectives. */
  article: string | null;
  words: string[];
  /** `with <setting> [and <setting>]…` configuration. */
  config: ConfigSetting[];
  /** `while <condition>` conditional composition (e.g. `dark while …`). */
  condition: ConditionNode | null;
  span: Span;
}

/**
 * One `with` setting. Values are a trailing number/string/word, or — when an
 * article introduces the tail (`with food the handful of feed`, Phase B) — a
 * multi-word entity name (`valueKind: 'name'`, article stripped), or — when
 * a bracket opens the tail (`with route [Hall, Study, Hall]`, ADR-215) — a
 * list of name references (`valueKind: 'list'`, entries in `listValues`).
 */
export interface ConfigSetting {
  key: string[];
  value: string;
  valueKind: 'number' | 'string' | 'word' | 'name' | 'list';
  /** List entries when valueKind is 'list' (resolution is the analyzer's). */
  listValues?: NameRef[];
  span: Span;
}

export interface Placement {
  kind: 'placement';
  /** 'in' | 'on' | 'starts-in' */
  relation: 'in' | 'on' | 'starts-in';
  place: NameRef;
  span: Span;
}

export interface ExitDecl {
  kind: 'exit';
  direction: string;
  to: NameRef;
  /**
   * `through the <door>` tail (ADR-234 D1, ratchet R2) — the one door
   * relationship form. Null on plain exits. References a declared door;
   * never creates one.
   */
  via: NameRef | null;
  span: Span;
}

export interface BlockedExitDecl {
  kind: 'blocked-exit';
  direction: string;
  /** Phrase key emitted when the exit is tried. */
  phraseKey: string;
  /**
   * `is blocked while <cond>: <key>` — refusal applies only while the
   * condition holds (grammar log 2026-07-10, Phase B). Null = always.
   */
  condition: ConditionNode | null;
  span: Span;
}

/**
 * `<direction> is deadly: <phrase>` (ADR-227 Decision 4) — a deadly *exit*:
 * going that way takes the player to their death. Mirrors the blocked-exit
 * shape; lowers to a pre-validate command redirect (the deadly exit need
 * not exist in the room graph), never a destination-resolved interceptor.
 */
export interface DeadlyExitDecl {
  kind: 'deadly-exit';
  direction: string;
  /** Phrase key carrying the death text (also the derived cause). */
  phraseKey: string;
  /** `is deadly while <cond>: <key>` — parsed but not yet wired (post-scope). */
  condition: ConditionNode | null;
  span: Span;
}

/**
 * `deadly: <phrase>` (ADR-227 Decision 4) — the rare no-escape room marker:
 * any verb but the DeadlyRoomTrait safe allowlist (look/examine default)
 * is fatal. Lowers to `DeadlyRoomTrait`.
 */
export interface DeadlyRoomDecl {
  kind: 'deadly-room';
  /** Phrase key carrying the death text (also the derived cause). */
  phraseKey: string;
  span: Span;
}

export interface StateName {
  name: string;
  span: Span;
}

/** `phrase <key>: <text>` inside a create block (entity-scoped override). */
export interface PhraseOverride {
  kind: 'phrase-override';
  key: string;
  /** Optional strategy adverb (CP3 — channel phrases carry the Z5 set), null when plain. */
  strategy: string | null;
  /**
   * Optional `while <condition>` (Z3b `detail` gates; `it` = the owner).
   * Null when ungated.
   */
  condition: ConditionNode | null;
  /** One entry when plain; several when `or`-separated variants (CP3). */
  variants: TextValue[];
  span: Span;
}

/**
 * `on|after … end on|end after` behavior clause — inside a create block or a
 * `define trait`. Header forms (ADR-327 D1 heads; ownership package D3/D5):
 *   `on <actor> <action> [, before <trait> | , after <trait>] [, once]`
 *   `after <actor> <action> [while <condition>] [, once]`   → reaction (D3)
 *   `on <actor> <action> anything as the <role>`            → binding 'role'
 *   `on every turn [while <condition>] [, once]`            → binding 'every-turn'
 *   `on <action> [while <condition>]` / `after <action> …`  → binding 'self'
 *     (own-block bare head: the block owner's own action; legal only in the
 *     player's or a character's block — the analyzer's gate)
 * The actor is `the player` (the role, resolved at fire time) or a
 * character's name; the block owner is the action's object (`object`) or,
 * with a role tail, the named role. `on` intercepts (may refuse; phrase
 * output is primary); `after` reacts (refuse is a parse error; phrase
 * output appends).
 */
export interface OnClause {
  kind: 'on-clause';
  /** `on` = intercept, `after` = react (ratchet D3). */
  clauseKind: 'on' | 'after';
  /** The action word as written (gerund), e.g. `reading`; `every turn` clauses use 'every-turn'. */
  action: string;
  /**
   * Who acts (ADR-327 D1): the words before the gerund — `the player` or a
   * character's name — as a value expression the analyzer resolves. Null for
   * a bare head (`self`) and for `every turn`.
   * Invariant: non-null iff `binding` is 'object' or 'role' — except after
   * `parse.removed-head-it`, where the parser leaves it null with binding
   * 'object' so the analyzer knows the head was already reported.
   */
  actor: ValueExpr | null;
  /**
   * How the clause binds: the owner is the action's object (`object`), the
   * named role (`role`), every turn, or the owner's own action (`self`).
   */
  binding: 'object' | 'role' | 'every-turn' | 'self';
  /** Role name for `anything as the <role>` clauses. */
  role: string | null;
  /** `while <condition>` qualifier (all bindings since the ownership package). */
  condition: ConditionNode | null;
  /** `, once` clause modifier — one lifetime firing (ratchet D5). */
  once: boolean;
  /** `, before <trait>` / `, after <trait>` explicit ordering. */
  ordering: { relation: 'before' | 'after'; trait: string } | null;
  body: Statement[];
  span: Span;
}

// --------------------------------------------------------------------------
// define
// --------------------------------------------------------------------------

/** `define condition <name>: <condition>` */
export interface DefineCondition {
  kind: 'define-condition';
  name: string;
  condition: ConditionNode;
  span: Span;
}

/**
 * `, claims <fact> is <value>` on a `define phrase` header (ADR-318 D9):
 * the lie-ledger tag — what this line asserts, in checkable words. Fact
 * and value resolve against `define fact` in the analyzer.
 */
export interface ClaimsTagDecl {
  fact: NameRef;
  value: NameRef;
  span: Span;
}

/** `define phrase <key>[, <strategy>|, verbatim][, claims <fact> is <value>] [while <condition>] … end phrase`. */
export interface DefinePhrase {
  kind: 'define-phrase';
  key: string;
  /** randomly | cycling | stopping | sticky | first-time (Z5) — null for a plain phrase. */
  strategy: string | null;
  /** Whitespace-preserving text (grammar log 2026-07-10); excludes strategies. */
  verbatim: boolean;
  /** The ADR-318 D9 lie-ledger tag; null for a line that asserts nothing. */
  claims: ClaimsTagDecl | null;
  /**
   * Trailing `while <condition>` header gate (Z2/CP1'): a presence condition
   * compiles to ADR-209 `mentions`; anything else registers on the ADR-211
   * gate seam. Null when ungated.
   */
  condition: ConditionNode | null;
  /** One entry when plain; several when `or`-separated variants. */
  variants: TextValue[];
  span: Span;
}

/** `define phrases <locale>` keyed-template block (dedent-terminated). */
export interface DefinePhrases {
  kind: 'define-phrases';
  locale: string;
  entries: PhraseEntry[];
  span: Span;
}

/**
 * `override message <alias> [, strategy] [while <cond>] … end override` (ADR-255
 * D1): override a standard-action message story-wide via a curated kebab alias.
 * Body is the full `define phrase` body (strategy/variants/verbatim/condition),
 * read by the same reader so the two never drift; the alias — never a dotted
 * platform id — is resolved to `if.action.*` loader-side (Interface Contract 3).
 */
export interface OverrideMessage {
  kind: 'override-message';
  alias: string;
  strategy: string | null;
  verbatim: boolean;
  condition: ConditionNode | null;
  variants: TextValue[];
  span: Span;
}

/**
 * `override messages <locale>` keyed-template block (ADR-255 D1), the
 * localizable form mirroring `define phrases <locale>`: `alias: text` entries,
 * dedent-terminated, flat text per entry. Each entry `key` is an ACL alias.
 */
export interface OverrideMessages {
  kind: 'override-messages';
  locale: string;
  entries: PhraseEntry[];
  span: Span;
}

export interface PhraseEntry {
  key: string;
  value: TextValue;
  span: Span;
}

/**
 * One pattern element (ADR-267): a literal word, a `the <name>` slot (D15),
 * or an `or`-joined alternation of words (D8) — any of them optionally
 * bracket-wrapped (D9, `optional` present only when written `[…]`).
 */
export type PatternPart =
  | { kind: 'word'; word: string; optional?: boolean; span: Span }
  | { kind: 'slot'; word: string; optional?: boolean; span: Span }
  | { kind: 'alt'; words: string[]; optional?: boolean; span: Span };

/**
 * `define sound|image|music <name> from "<file>"` (ADR-216) — a declared
 * media asset: a DATA reference (static file path), never a code hatch —
 * it does NOT set `hasHatches` and keeps the pure-IR profile. Referenced
 * by name from the media sugar statements (typo-checked at compile).
 */
export interface DefineAsset {
  kind: 'define-asset';
  assetKind: 'sound' | 'image' | 'music';
  name: string;
  path: string;
  span: Span;
}

/**
 * `define ambient <word>` / `define layer <word>` (ADR-241 D2): a named
 * family channel — an ambient bed or an image layer. One-liners beside
 * the asset declarations; the registered ids (`ambient:<word>`,
 * `image:<word>`) are an implementation detail, never author-facing.
 */
export interface DefineFamilyChannel {
  kind: 'define-family-channel';
  family: 'ambient' | 'layer';
  name: string;
  span: Span;
}

/**
 * ADR-216 typed media sugar — each form lowers AT ANALYSIS onto a
 * payloaded `media.*` emit (no runtime surface of its own): `play sound
 * <asset>`, `play music <asset> [looping]`, `stop music`, `show image
 * <asset> [in <layer>]`, `hide image`, `play ambient <asset>
 * [in <channel>]`, `stop ambient [in <channel>]` (ADR-241 D3),
 * `transition <kind>`, `clear`.
 */
export interface MediaStmt {
  kind: 'media';
  form:
    | 'play-sound'
    | 'play-music'
    | 'stop-music'
    | 'show-image'
    | 'hide-image'
    | 'play-ambient'
    | 'stop-ambient'
    | 'transition'
    | 'clear';
  /** Declared asset name for the play/show forms; null otherwise. */
  asset: string | null;
  /** `in <layer>` on show-image; null otherwise. */
  layer: string | null;
  /** `in <channel>` on play-ambient/stop-ambient (ADR-241 D3); null = the implied `main` bed. */
  channel: string | null;
  /** `looping` modifier on play-music. */
  looping: boolean;
  /** The transition kind word (`transition fade`); null otherwise. */
  transitionKind: string | null;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/** `define text <name> from "<module>"` — TS escape hatch declaration. */
export interface DefineText {
  kind: 'define-text';
  name: string;
  modulePath: string;
  span: Span;
}

// `define flag` was removed (given 8, ratchet 2026-07-11) — facts are
// derived conditions or owned states.

// --------------------------------------------------------------------------
// Phase B declarations (design.md §2.2/§2.3/§2.5/§3.4)
// --------------------------------------------------------------------------

/** `define trait <name> … end trait` — data, states, phrases, behavior clauses. */
export interface DefineTrait {
  kind: 'define-trait';
  name: string;
  data: TraitField[];
  /**
   * `states[, reversible]: a, b` — trait-declared states (ratchet D8):
   * every composer gets the set; resolution is across the composer's full
   * trait set. Replaces the removed `flag` field type.
   */
  states: StateName[];
  statesReversible: boolean;
  /** `score <name> worth N` lines — trait-owned scores (D12). */
  scores: ScoreDecl[];
  /** Embedded `phrases <locale>` block, if any. */
  phrases: DefinePhrases | null;
  onClauses: OnClause[];
  span: Span;
}

/** One `data` field: `body part: optional name`, `kind: one of a, b, c`. */
export interface TraitField {
  /** Field name words (`body part`). */
  name: string[];
  /** entity | number | name | one-of. `flag` was removed (given 8 / D8). */
  type: 'entity' | 'number' | 'name' | 'one-of';
  optional: boolean;
  /** `starts <value>` initial, if declared. */
  initial: string | null;
  /** Members when type is 'one-of' (`one of goats, rabbits, parrot, snake`). */
  oneOf: string[] | null;
  span: Span;
}

/** `define action <name> … ` — grammar, scope constraints, refusals, body. */
export interface DefineAction {
  kind: 'define-action';
  /** The action name as written (gerund), e.g. `petting`. */
  name: string;
  /** `grammar` block pattern lines. */
  patterns: ActionPattern[];
  /** `the <slot> must be <requirement>` lines (scope kit, no phrase key). */
  constraints: ScopeConstraint[];
  /** `the <slot> takes the rest of the line` lines (greedy slot, ADR-267 D10). */
  greedy: GreedySlotDecl[];
  /** `the <slot> is an instrument` / `is a topic` lines (typed slot, ADR-267 D11). */
  slotTypes: SlotTypeDecl[];
  /** `directions` block entries — bound to the `direction` slot (ADR-267 D12). */
  directions: DirectionEntry[];
  /** `<subject> must <predicate>: <key>` requirement lines (ratchet D6). */
  musts: MustRequirement[];
  /** `refuse without <slot>: <key>` / `refuse when <cond>: <key>` lines. */
  refusals: ActionRefusal[];
  /** `otherwise refuse <key>` — the dispatch-miss phrase. */
  otherwise: { phraseKey: string; span: Span } | null;
  /** `score <name> worth N` lines — action-owned scores (D12). */
  scores: ScoreDecl[];
  /** Embedded `phrases <locale>` block, if any. */
  phrases: DefinePhrases | null;
  /** Standard-semantics body statements (design.md §2.3 taking), if any. */
  body: Statement[];
  span: Span;
}

/**
 * `<subject> must <predicate>: <phrase-key>` — a positive requirement
 * (ratchet D6); failing it refuses with the key. The predicate is written
 * in the infinitive (`be hungry`, `have its food`, `hold the camera`) and
 * normalized to the finite Predicate forms at parse.
 * Doubles as a body statement.
 */
export interface MustRequirement {
  kind: 'must';
  subject: ValueExpr;
  predicate: Predicate;
  phraseKey: string;
  span: Span;
}

/** `means <key> <value>` — a static semantic default for the pattern line
 *  directly above it (ADR-267 D12). */
export interface MeansDecl {
  key: string;
  value: string;
  span: Span;
}

/** One `directions` block line: `north or n` — canonical word + aliases
 *  (ADR-267 D12; `or` in exactly its D8 meaning). */
export interface DirectionEntry {
  canonical: string;
  aliases: string[];
  span: Span;
}

/** One grammar-block pattern: pattern elements (ADR-267), optional `→ each …`
 *  cardinality, and any `means` static-default lines under it (D12). */
export interface ActionPattern {
  parts: PatternPart[];
  /** `means <key> <value>` lines indented under this pattern (ADR-267 D12). */
  means: MeansDecl[];
  /** Cardinality expansion words after `→` (`each reachable item not already held`). */
  cardinality: string[] | null;
  span: Span;
}

/** `the <slot> takes the rest of the line` — greedy slot (ADR-267 D10). */
export interface GreedySlotDecl {
  slot: string;
  span: Span;
}

/** `the <slot> is an instrument` / `is a topic` — typed slot (ADR-267 D11).
 *  The type word is carried raw; the analyzer owns the closed-set check. */
export interface SlotTypeDecl {
  slot: string;
  type: string;
  span: Span;
}

/** `the <slot> must be <requirement>` (reachable, visible, held, …). */
export interface ScopeConstraint {
  slot: string;
  requirement: string;
  span: Span;
}

/**
 * `extend action <name>` (ADR-270 D2/D6) — grammar lines added to an
 * EXISTING action, story tier. The block parses with the full define-action
 * surface so the analyzer can reject behavior sections by name
 * (`analysis.alteration-behavior`) — the grammar-file-mode treatment.
 * Target resolution (story-first, else stdlib `if.action.<name>`) is the
 * loader's; the analyzer validates structure only.
 */
export interface ExtendAction {
  kind: 'extend-action';
  /** The target action name as written (gerund), e.g. `taking`. */
  name: string;
  patterns: ActionPattern[];
  constraints: ScopeConstraint[];
  greedy: GreedySlotDecl[];
  slotTypes: SlotTypeDecl[];
  directions: DirectionEntry[];
  /** Behavior sections — parsed but analyzer-rejected (ADR-270 D2). */
  musts: MustRequirement[];
  refusals: ActionRefusal[];
  otherwise: { phraseKey: string; span: Span } | null;
  scores: ScoreDecl[];
  phrases: DefinePhrases | null;
  body: Statement[];
  span: Span;
}

/**
 * `remove from action <name>` (ADR-270 D3/D6) — pattern shapes removed from
 * a standard action, identified by shape (pattern-string equality). Each
 * indented line is one pattern; `means` lines and `→` cardinality are not
 * part of a pattern's identity and are analyzer-rejected
 * (`analysis.removal-shape`).
 */
export interface RemoveFromAction {
  kind: 'remove-from-action';
  /** The target action name as written (gerund), e.g. `taking`. */
  name: string;
  patterns: ActionPattern[];
  span: Span;
}

/** `refuse without <slot>: <key>` or `refuse when <condition>: <key>`. */
export interface ActionRefusal {
  kind: 'without' | 'when';
  /** Slot name for `without`. */
  slot: string | null;
  /** Condition for `when`. */
  condition: ConditionNode | null;
  phraseKey: string;
  span: Span;
}

/**
 * `define action X from "./mod.ts"` — TS action hatch. (`define behavior …
 * from` was removed by ADR-235 D2, 2026-07-18 — it had no binding key and
 * could never fire; the parser emits a fix-it error.)
 *
 * `define chain <name> from "./mod.ts"` — TS chain hatch (ADR-094 chains):
 * replaces a stdlib event chain (e.g. `opened-revealed`) with an
 * author-supplied handler. `name` is the curated chain alias; the module
 * default-exports the `EventChainHandler`. Like every hatch, it sets
 * `hasHatches` — a chained story is not browser-pure.
 */
export interface DefineHatch {
  kind: 'define-hatch';
  hatchKind: 'action' | 'chain';
  name: string;
  modulePath: string;
  span: Span;
}

// `define score` (top-level), `once <cond>` rules, and `every N turns`
// rules were removed (ownership package, ratchet 2026-07-11) — scores
// attach to owners (ScoreDecl); once/every become owner clause modifiers
// and story-owned schedules.

/**
 * `define machine <name> … end machine` — the ADR-119 depth under
 * `use state-machines` (ADR-215; spelling A ratified by David 2026-07-18).
 * Role lines bind names to entities; `starts <state>`; one `state` block
 * per state carrying transition lines and `on enter`/`on exit` bodies.
 */
export interface DefineMachine {
  kind: 'define-machine';
  /** Machine name words (`drawbridge works`). */
  name: string[];
  /** `role <name> is <entity>` bindings, in declaration order. */
  roles: MachineRole[];
  /** `starts <state>` — the initial state name (null = parse error reported). */
  initialState: string | null;
  states: MachineState[];
  span: Span;
}

/** One `role <name> is <entity>` binding line. */
export interface MachineRole {
  name: string;
  entity: NameRef;
  span: Span;
}

/** One `state <name>[, terminal]` block. */
export interface MachineState {
  name: string;
  terminal: boolean;
  transitions: MachineTransition[];
  onEnter: Statement[];
  onExit: Statement[];
  span: Span;
}

/**
 * One `when <trigger>[ while <condition>]: <target>` transition line.
 * Triggers: an action (`turning the winch` — gerund + role/entity), an
 * event (`event if.event.opened`), or a bare condition (`the bridge is
 * down`).
 */
export interface MachineTransition {
  trigger:
    | { kind: 'action'; action: string; target: NameRef | null }
    | { kind: 'event'; event: string }
    | { kind: 'condition'; condition: ConditionNode }
    /**
     * A single bare word — grammatically either an action gerund
     * (`waiting`) or a condition ref/story state (`stormy`). The parser is
     * vocabulary-free; the ANALYZER resolves it (declared condition/story
     * state wins, else action gerund).
     */
    | { kind: 'word'; word: string; span: Span };
  /** Optional `while <condition>` guard riding any trigger form. */
  condition: ConditionNode | null;
  /** Target state name. */
  target: string;
  span: Span;
}

/**
 * `define timer <name> [for <owner>] … end timer` (ADR-325 D3a) — a timer
 * counts turns by name: once started it steps through `states` one per
 * turn and ends in the built-in `expired`. `owner` null = the story's.
 */
export interface DefineTimer {
  kind: 'define-timer';
  name: string;
  /** `for <owner>` — an entity or the player; null = story-owned. */
  owner: NameRef | null;
  states: TimerStateDecl[];
  /** `meanwhile[, one chance in n]` body — runs each turn the timer is running. */
  meanwhile: { chance: number | null; body: Statement[]; span: Span } | null;
  /** `interrupted one chance in n` — per-turn chance of expiring early. */
  interrupted: number | null;
  span: Span;
}

/** One named turn of a timer, with optional prose spoken when it is reached. */
export interface TimerStateDecl {
  name: string;
  text: TextValue | null;
  span: Span;
}

/**
 * `when <timer> expires [, while <cond>] … end when` (ADR-325 D3e) — the
 * expiry clause head on the owner's block. `timer` is a bare name (the
 * block owner's, then the story's) or a possessive (`the player's waiting`).
 */
export interface TimerClause {
  kind: 'timer-clause';
  timer: ValueExpr;
  condition: ConditionNode | null;
  body: Statement[];
  span: Span;
}

/** A region's landing line (ADR-325 D5). `strategy` is null for a single room. */
export interface LandingDecl {
  rooms: NameRef[];
  strategy: 'randomly' | 'cycling' | 'stopping' | null;
  span: Span;
}

/**
 * `when <entity> moves [, while <cond>] … end when` (ADR-325 D3h) — an
 * event clause head on any entity block, riding the actor-moved event the
 * `going` action emits. Fires on the COMPLETED move only; a refusal belongs
 * on the mover's own `on going`. `it` inside the body is the clause owner.
 */
export interface MoveClause {
  kind: 'move-clause';
  /** The mover — an entity name or `the player`. */
  mover: ValueExpr;
  condition: ConditionNode | null;
  body: Statement[];
  span: Span;
}

/** `define sequence <name> … end sequence` — timeline of chained steps. */
export interface DefineSequence {
  kind: 'define-sequence';
  /** Sequence name words (`closing time`). */
  name: string[];
  steps: SequenceStep[];
  span: Span;
}

/**
 * `define counter <name> [starts <n>] [between <lo> and <hi>]` (ADR-264 D1) —
 * a story-global numeric counter. `starts`/bounds optional (null = 0 / unbounded).
 */
export interface DefineCounter {
  kind: 'define-counter';
  name: string;
  starts: number | null;
  lo: number | null;
  hi: number | null;
  span: Span;
}

/**
 * `at turn <n>` (absolute), `<n> turns later` (relative), or
 * `when <owner> becomes <state>` (state anchor, ratchet D10) step.
 */
export interface SequenceStep {
  kind: 'sequence-step';
  timing: 'at-turn' | 'later' | 'becomes';
  /** Turn count for at-turn/later; 0 for becomes. */
  turns: number;
  /** Anchor owner for `becomes` steps (`the story`, an entity). */
  owner: NameRef | null;
  /** Anchor state for `becomes` steps. */
  state: string | null;
  body: Statement[];
  span: Span;
}

// --------------------------------------------------------------------------
// statements
// --------------------------------------------------------------------------

export type Statement =
  | RefuseStmt
  | RefuseWhenStmt
  | PhraseStmt
  | EmitStmt
  | MediaStmt
  | SetStmt
  | ChangeStmt
  | ChangePlayerStmt
  | ChangeMoodStmt
  | ChangeFeelingStmt
  | MoveStmt
  | RemoveStmt
  | AwardStmt
  | CounterMutateStmt
  | TimerVerbStmt
  | WinStmt
  | LoseStmt
  | KillStmt
  | MustRequirement
  | SelectOnStmt
  | SelectStrategyStmt
  | OrdinalBlock
  | EachStmt
  // ADR-320 D4/D7/D8 conversation-row statements (frozen 2026-08-17):
  | ThenOpenStmt
  | DeflectStmt
  | LeaveStmt
  | HoldTongueStmt;

/**
 * `then asks <exchange-key>` / `then invites <exchange-key>` (ADR-320
 * D4/D8) — open the named exchange, which must belong to the same owner
 * (analyzer gate). One mechanism; the word is carried as data to the
 * wire — a chat client may render an invitation differently from a
 * question. Conversation bodies only (topic / greetings / exchange /
 * initiative rows — parse gate). A fired exchange row closes its
 * exchange unless it chains via one of these.
 */
export interface ThenOpenStmt {
  kind: 'then-open';
  word: 'asks' | 'invites';
  /** The target exchange key (single kebab word). */
  exchange: string;
  span: Span;
}

/**
 * `deflect to <topic>` (ADR-320 D8) — the owner redirects to a row of
 * their OWN topic table (analyzer gate). The target is the topic-key
 * grammar: an entity name or a quoted free-text topic. Conversation
 * bodies only (parse gate).
 */
export interface DeflectStmt {
  kind: 'deflect';
  target:
    | { kind: 'entity'; ref: NameRef }
    | { kind: 'text'; text: string; span: Span };
  span: Span;
}

/**
 * `leave` (ADR-320 D8) — the owner exits the scene. Leaving is movement
 * and obeys the world: legality is consulted against the world model at
 * dispatch (Phase 6), never a conversation-only physics. Conversation
 * bodies only (parse gate).
 */
export interface LeaveStmt {
  kind: 'leave';
  span: Span;
}

/**
 * `hold their tongue` (ADR-320 D7) — suppress the seizure this
 * initiative row would otherwise force. Initiative rows only (parse
 * gate), and the row's only statement (analyzer gate — a suppression
 * cannot also speak). Distinct from D8's rendered silence, which is a
 * response.
 */
export interface HoldTongueStmt {
  kind: 'hold-tongue';
  span: Span;
}

/**
 * `each <condition-name> … end each` — body-position iteration block
 * (ratchet E3, 2026-07-12). Hosts: `on`/`after` clause bodies, action
 * bodies, trait clause bodies, sequence steps — never top-level (given 9).
 * Inside the body `the match` is the iterated entity; `it` keeps meaning
 * the clause owner. The open-condition requirement is the analyzer's gate.
 */
export interface EachStmt {
  kind: 'each';
  /** The named open condition selecting the matches. */
  condition: string;
  body: Statement[];
  span: Span;
}

/**
 * `refuse when <condition>: <key>` in body position — the prohibition half
 * of decision 6 (requirements are `must`; prohibitions are `refuse when`).
 */
export interface RefuseWhenStmt {
  kind: 'refuse-when';
  condition: ConditionNode;
  phraseKey: string;
  span: Span;
}
// `if` was removed (given 4 amended, ratchet 2026-07-11): guards are `must`
// requirements; moment conditionals are the statement `when` suffix
// (`stmtWhen` below); branching is `select`.

/** `refuse <phrase-key> [with <param> = <value>]…` */
export interface RefuseStmt {
  kind: 'refuse';
  phraseKey: string;
  params: ParamBinding[];
  span: Span;
}

/** `phrase <phrase-key> [with <param> = <value>]… [when <cond>]` (given 6b). */
export interface PhraseStmt {
  kind: 'phrase';
  phraseKey: string;
  params: ParamBinding[];
  /**
   * Declare-and-emit sugar (design.md §2.6/§3.3): an indented prose block
   * after the statement registers the text under the key at load. Null when
   * the key is declared elsewhere.
   */
  inlineText: TextValue | null;
  /** Statement `when` suffix (ratchet D7) — execute only if it holds. */
  stmtWhen: ConditionNode | null;
  span: Span;
}

/** `with <param> = <value>` binding for refuse/phrase. */
export interface ParamBinding {
  param: string[];
  value: ValueExpr;
  span: Span;
}

/**
 * `emit <event> [with <field> <value> [and …]] [when <cond>]` (ADR-216) —
 * the payloaded emit. Event segments are dotted keys (`media.sound.play`).
 * Flat payload fields separate with `and` (the create-data grammar);
 * bracketed/braced structures separate with commas.
 */
export interface EmitStmt {
  kind: 'emit';
  event: string[];
  /** `with` payload fields, empty when none (ADR-216). */
  payload: EmitField[];
  stmtWhen: ConditionNode | null;
  span: Span;
}

/** One `<field> <value>` payload entry (top level or inside `{ … }`). */
export interface EmitField {
  /** Field key words (`skill bonus` → one payload key). */
  key: string[];
  value: EmitValue;
  span: Span;
}

/**
 * One payload value: a literal, a value expression (world-state read), an
 * `[ … ]` array of values, or a `{ <field> <value>, … }` nested object.
 */
export type EmitValue =
  | { kind: 'literal'; value: string; literalKind: 'number' | 'string'; span: Span }
  | { kind: 'expr'; expr: ValueExpr; span: Span }
  | { kind: 'array'; items: EmitValue[]; span: Span }
  | { kind: 'object'; fields: EmitField[]; span: Span };

/** `set <field-path> to <value> [when <cond>]` */
export interface SetStmt {
  kind: 'set';
  target: ValueExpr;
  value: ValueExpr;
  /** Statement `when` suffix (ratchet D7) — execute only if it holds. */
  stmtWhen: ConditionNode | null;
  span: Span;
}

/** `change <entity> to <state> [when <cond>]` — explicit state transition. */
export interface ChangeStmt {
  kind: 'change';
  entity: NameRef;
  state: string;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/**
 * `change the player to <entity> [when <cond>]` (ADR-327 D9/D10) — moves the
 * player role to a named character. Distinguished from `ChangeStmt` in the
 * parser by the target reading exactly `the player`, which lets the tail
 * parse as a multi-word name ref rather than the single state word
 * `ChangeStmt` takes. The analyzer requires the target to be a `playable`
 * person; the loader reads it two ways — assignment inside the start block,
 * a runtime switch request on any turn after that.
 */
export interface ChangePlayerStmt {
  kind: 'change-player';
  target: NameRef;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/**
 * `change mood to <word> [when <cond>]` (ADR-310 D3) — the clause's `it`
 * takes the mood. Word resolution is the analyzer's gate.
 */
export interface ChangeMoodStmt {
  kind: 'change-mood';
  mood: string;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/**
 * `change feeling toward <entity> to <disposition> [when <cond>]`
 * (ADR-310 D3) — the clause's `it` feels differently about the target.
 * Disposition-word resolution is the analyzer's gate.
 */
export interface ChangeFeelingStmt {
  kind: 'change-feeling';
  target: NameRef;
  disposition: string;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/**
 * A place, wherever the grammar wants one (ADR-325 D1–D2): the destination
 * of `move … to`, the object of `is in`.
 *
 * - `name` — a room or holder by name (`the Rope Stall`, `the crate`).
 * - `location` — `<owner>'s location` / `its location`: the owner's
 *   containing room, always (a room is its own).
 * - `here` — sugar for the player's location (`move it here`).
 * - `offstage` — no location at all (`move it offstage`); the entity stays
 *   in the world, detached, until a later `move` reattaches it.
 * - `adjacent-room` — `a random adjacent room` (ADR-326 D1): a room one
 *   traversable exit from the mover's room, drawn at effect time. The
 *   randomness is in the noun; there is no strategy word. Legal only as a
 *   `move` destination.
 */
export type PlaceExpr =
  | { kind: 'name'; ref: NameRef; span: Span }
  | { kind: 'location'; owner: ValueExpr; span: Span }
  | { kind: 'here'; span: Span }
  | { kind: 'offstage'; span: Span }
  | { kind: 'adjacent-room'; span: Span };

/** `move <entity> to <place> | here | offstage [when <cond>]` (ADR-325 D1–D2) */
export interface MoveStmt {
  kind: 'move';
  entity: NameRef;
  place: PlaceExpr;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/**
 * `remove <entity> [when <cond>]` (Z6, ADR-213 Q3) — takes the entity out of
 * play entirely (`world.removeEntity`; pre-removal observers fire; a
 * witnessed `phrase disappeared:` narrates). Permanent — nothing restores a
 * removed entity. Orphaning is deliberately NOT this statement.
 */
export interface RemoveStmt {
  kind: 'remove';
  entity: NameRef;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/**
 * `start|stop|restart|reset|interrupt <timer> [when <cond>]` (ADR-325 D3c).
 * `target` is a bare name (owner-first, then story) or a possessive.
 */
export interface TimerVerbStmt {
  kind: 'timer-verb';
  verb: 'start' | 'stop' | 'restart' | 'reset' | 'interrupt';
  target: ValueExpr;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/** `award <quantity-words> [, once] [when <cond>]` */
export interface AwardStmt {
  kind: 'award';
  expression: string[];
  once: boolean;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/**
 * `raise`/`lower <target> by <n> [when <cond>]` (ADR-264 D2) — additive counter
 * mutation. `target` is a ValueExpr: a bare name (story-global counter) or a
 * possessive (`the innkeeper's suspicion` / `its suspicion`, per-entity).
 * `amount` is the non-negative literal after `by`.
 */
export interface CounterMutateStmt {
  kind: 'raise' | 'lower';
  target: ValueExpr;
  amount: number;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/** `win [<phrase-key>] [when <cond>]` */
export interface WinStmt {
  kind: 'win';
  phraseKey: string | null;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/** `lose [<phrase-key>] [when <cond>]` */
export interface LoseStmt {
  kind: 'lose';
  phraseKey: string | null;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/**
 * `kill the player [<phrase-key>] [when <cond>]` (ADR-227 Decision 4) —
 * terminal death via the platform's killPlayer sink; peer to win/lose.
 * The phrase carries the death text; the cause is derived, never authored.
 */
export interface KillStmt {
  kind: 'kill';
  phraseKey: string | null;
  /**
   * ADR-325 D3i: an indented prose block in place of the key — the death
   * text, registered under a synthesized key by the analyzer. Null when a
   * key (or nothing) was written.
   */
  inlineText: TextValue | null;
  stmtWhen: ConditionNode | null;
  span: Span;
}

/** `select on <value> / when <state> … end select` */
export interface SelectOnStmt {
  kind: 'select-on';
  subject: ValueExpr;
  arms: SelectArm[];
  span: Span;
}

export interface SelectArm {
  /** The `when <value>` word. */
  value: string;
  body: Statement[];
  span: Span;
}

/** `select <strategy> … or … end select` */
export interface SelectStrategyStmt {
  kind: 'select-strategy';
  strategy: string;
  alternatives: Statement[][];
  span: Span;
}

/** `first time` / `third time` … ordinal block inside a rule (indent-scoped). */
export interface OrdinalBlock {
  kind: 'ordinal';
  /** 1-based occurrence number the block fires on. */
  ordinal: number;
  /** The ordinal word as written (`first`, `third`). */
  ordinalWord: string;
  body: Statement[];
  span: Span;
}

// --------------------------------------------------------------------------
// expressions — the closed selector grammar (design.md §2.7, Phase A subset)
// --------------------------------------------------------------------------

export type ConditionNode =
  | OrNode
  | AndNode
  | NotNode
  | PredicateNode
  | ChanceNode
  | NamedConditionRef
  | AnyOfNode
  | NoneOfNode
  | ClientHasNode
  | SubjectChangesNode
  | AskedNode;

/**
 * `the subject changes` (ADR-320 D9, frozen 2026-08-17) — true when the
 * scene noticed a live thread abandoned this turn. Available to manner
 * rows, response rows, and (Phase 4) initiative occasions; evaluation is
 * the scene runtime's.
 */
export interface SubjectChangesNode {
  kind: 'subject-changes';
  span: Span;
}

/**
 * `asked once` / `asked again` / `asked many times` (ADR-320 D4, frozen
 * 2026-08-17) — the repetition words. In a topic-row body the counter is
 * the current topic's per-pair ask count; the runtime owns the counting
 * and the word curve (never numbers).
 */
export interface AskedNode {
  kind: 'asked';
  word: RepetitionWord;
  span: Span;
}

/**
 * `client has <capability>` (ADR-216) — reads the live negotiated client
 * capability at evaluation time so a story can degrade deliberately.
 * Capability words are the platform's boolean flags in Chord spelling
 * (`sound`, `split-pane`, …); `client` is reserved in condition-subject
 * position.
 */
export interface ClientHasNode {
  kind: 'client-has';
  capability: string;
  span: Span;
}

/**
 * `any <condition-name>` — existential over a named open condition
 * (ratchet E1, 2026-07-12): true iff some world entity satisfies it;
 * false over the empty set. The open-condition requirement is the
 * analyzer's gate.
 */
export interface AnyOfNode {
  kind: 'any-of';
  /** The named open condition doing the filtering. */
  condition: string;
  span: Span;
}

/**
 * `no <condition-name>` — the negated existential, its own positive
 * spelling (ratchet E2, 2026-07-12): true iff no entity satisfies the
 * condition; true over the empty set.
 */
export interface NoneOfNode {
  kind: 'none-of';
  /** The named open condition doing the filtering. */
  condition: string;
  span: Span;
}

export interface OrNode {
  kind: 'or';
  operands: ConditionNode[];
  span: Span;
}

export interface AndNode {
  kind: 'and';
  operands: ConditionNode[];
  span: Span;
}

export interface NotNode {
  kind: 'not';
  operand: ConditionNode;
  span: Span;
}

/** `one chance in <n>` */
export interface ChanceNode {
  kind: 'chance';
  n: number;
  span: Span;
}

/**
 * A single-word condition reference (`in-darkness`) — either a named
 * condition or a bare state test; the analyzer decides which.
 */
export interface NamedConditionRef {
  kind: 'condition-ref';
  name: string;
  span: Span;
}

/** `<subject> <predicate>` — one spelling per predicate (given 7). */
export interface PredicateNode {
  kind: 'predicate';
  subject: ValueExpr;
  predicate: Predicate;
  span: Span;
}

export type Predicate =
  | { kind: 'is'; negated: boolean; value: ValueExpr; span: Span }
  /**
   * `<subject> <op> <n>` numeric comparison (ADR-264 D3) — word forms
   * (`is at least`/`is more than`/`is at most`/`is less than`) and symbolic
   * (`>=`/`>`/`<=`/`<`) both lower here; `value` is the right operand.
   */
  | { kind: 'compare'; op: 'gte' | 'gt' | 'lte' | 'lt' | 'eq'; value: ValueExpr; span: Span }
  | { kind: 'is-a'; negated: boolean; classifier: string[]; span: Span }
  | { kind: 'is-in'; negated: boolean; place: PlaceExpr; span: Span }
  /** `<subject> is here` — the Z4 deictic: subject shares the player's location. */
  | { kind: 'is-here'; negated: boolean; span: Span }
  | { kind: 'holds'; thing: NameRef; span: Span }
  | { kind: 'has'; thing: NameRef; span: Span }
  /** `<timer> has started` / `has expired` (ADR-325 D3d) — the lifecycle reads. */
  | { kind: 'timer-has'; negated: boolean; what: 'started' | 'expired'; span: Span }
  | { kind: 'wears'; thing: NameRef; span: Span }
  /** `can see <thing>` / `can reach <thing>` (design.md §2.7; Phase B). */
  | { kind: 'can'; ability: string; thing: NameRef; span: Span }
  /** `<subject> feels <disposition> toward <entity>` (ADR-310 D13) — interior-state predicate. */
  | { kind: 'feels'; disposition: string; target: NameRef; span: Span }
  /** `<subject> knows <topic>` (ADR-310 D13) — held-topic predicate. */
  | { kind: 'knows'; topic: NameRef; span: Span }
  /**
   * `<topic> is fresh|recent|stale` (ADR-320 D6, frozen 2026-08-17) — the
   * recency words over the ledger's turn stamps. The subject is the TOPIC;
   * the holder is the enclosing context's owner. Runtime owns the aging
   * curve; the word is all the author conditions on.
   */
  | { kind: 'recency'; negated: boolean; word: 'fresh' | 'recent' | 'stale'; span: Span }
  /**
   * `<topic> was discussed` (ADR-320 D9, frozen 2026-08-17) — the per-pair
   * discussed-ness predicate: the topic has been covered between the owner
   * and the conversation partner, across scenes, in any order.
   */
  | { kind: 'was-discussed'; span: Span }
  /**
   * `<thread> is concluded` (ADR-320 D14, frozen 2026-08-17) — the thread's
   * conclusion beat has fired between the owner and the conversation
   * partner. The subject is the THREAD KEY; the word stands alone (the
   * recency standalone rule), so an entity state named `concluded` keeps
   * its ordinary is-value parse.
   */
  | { kind: 'concluded'; negated: boolean; span: Span }
  /**
   * `must be any <open-condition>` membership (David, 2026-07-12 — each
   * package P3): the subject satisfies the named open condition. Parsed
   * only in the `must` infinitive-predicate position, never in ordinary
   * condition predicates.
   */
  | { kind: 'is-any'; condition: string; span: Span };

/**
 * A value position: a name reference, possessive chain, literal, bare word,
 * or the `each`-block binder `the match` (ratchet E3, 2026-07-12).
 * `its state` parses as possessive with subject `it`. In NameRef positions
 * (`change`/`move` targets) `the match` stays a name reference — resolved
 * to the binder at analysis, exactly as `it` is.
 */
export type ValueExpr =
  | { kind: 'ref'; ref: NameRef; span: Span }
  | { kind: 'possessive'; base: ValueExpr; field: string[]; span: Span }
  | { kind: 'literal'; value: string; literalKind: 'number' | 'string'; span: Span }
  | { kind: 'bare'; words: string[]; span: Span }
  | { kind: 'match'; span: Span };
