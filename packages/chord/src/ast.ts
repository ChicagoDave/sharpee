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
  declarations: Declaration[];
  span: Span;
}

/** `story "Title" by "Author"` plus its indented `key: value` fields. */
export interface StoryHeader {
  kind: 'story-header';
  title: string;
  author: string;
  /** Raw field values by key (id, version, blurb, ...), trimmed. */
  fields: Record<string, string>;
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
  span: Span;
}

/** One `use <extension>` line (ADR-215). */
export interface UseDecl {
  name: string;
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

export type Declaration =
  | CreateDecl
  | DefineCondition
  | DefinePhrase
  | DefinePhrases
  | DefineVerb
  | DefineText
  // Phase B (design.md §2.2/§2.3/§2.5/§3.4):
  | DefineTrait
  | DefineAction
  | DefineHatch
  | DefineSequence
  // ADR-215 `use state-machines` depth (spelling A, David 2026-07-18):
  | DefineMachine
  // ADR-216 declared media assets (DATA references, never hatches):
  | DefineAsset
  | DefineFamilyChannel
  // ADR-216 custom channels (spelling A, David 2026-07-18):
  | DefineChannel
  // ADR-239 topic conversation (D3 as amended, David 2026-07-18):
  | DefineTopics
  // ADR-242 person identity (ruled Q-1, David 2026-07-19):
  | DefinePronouns
  // ADR-245/250 phrasebooks (David 2026-07-21):
  | DefinePhrasebook
  | ImportPhrasebookDecl;

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
 * `import phrasebook "<file>"` (ADR-250 D2) — the author's
 * file-organization axis. Resolved by the compile host (`importResolver`)
 * into the fragment's `define phrasebook` blocks, spliced at this
 * position (import site = arbitration position). Unresolved at analysis
 * time = `analysis.import-unresolved`.
 */
export interface ImportPhrasebookDecl {
  kind: 'import-phrasebook';
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
 * `define channel <name> … end channel` (ADR-216; spelling A ratified by
 * David 2026-07-18) — a declarative data projection: JSON content, a
 * mode, an optional capability gate, and a produce rule taking fields
 * from the turn's last event of the named type. Pure IR — a novel
 * RENDERER for it ships via an ADR-215 trusted extension, never here.
 */
export interface DefineChannel {
  kind: 'define-channel';
  name: string;
  /** `mode replace|append|event` (null = parse error reported). */
  mode: string | null;
  /** `gated by <capability>` — a client capability flag, or null (ungated). */
  gatedBy: string | null;
  /** `from event <dotted.key>` — the source event type (null = error reported). */
  fromEvent: string | null;
  /** `take <field>, …` — data fields projected from the event. */
  take: string[];
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
 * `define trait`. Header forms (design.md §2.2 + ownership package D3/D5):
 *   `on <action> it [, before <trait> | , after <trait>] [, once]`
 *   `after <action> it [while <condition>] [, once]`       → reaction (D3)
 *   `on <action> anything as the <role>`                    → binding 'role'
 *   `on every turn [while <condition>] [, once]`            → binding 'every-turn'
 * `on` intercepts (may refuse; phrase output is primary); `after` reacts
 * (refuse is a parse error; phrase output appends).
 */
export interface OnClause {
  kind: 'on-clause';
  /** `on` = intercept, `after` = react (ratchet D3). */
  clauseKind: 'on' | 'after';
  /** The action word as written (gerund), e.g. `reading`; `every turn` clauses use 'every-turn'. */
  action: string;
  /** How the clause binds (Phase A only had 'it'). */
  binding: 'it' | 'role' | 'every-turn';
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

/** `define phrase <key>[, <strategy>|, verbatim] [while <condition>] … end phrase`. */
export interface DefinePhrase {
  kind: 'define-phrase';
  key: string;
  /** randomly | cycling | stopping | sticky | first-time (Z5) — null for a plain phrase. */
  strategy: string | null;
  /** Whitespace-preserving text (grammar log 2026-07-10); excludes strategies. */
  verbatim: boolean;
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

export interface PhraseEntry {
  key: string;
  value: TextValue;
  span: Span;
}

/** `define verb hang or hook means put (something) on (something)` */
export interface DefineVerb {
  kind: 'define-verb';
  verbs: string[];
  pattern: PatternPart[];
  span: Span;
}

export type PatternPart =
  | { kind: 'word'; word: string; span: Span }
  | { kind: 'slot'; word: string; span: Span };

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

/** One grammar-block pattern: words + `:slot`s, optional `→ each …` cardinality. */
export interface ActionPattern {
  parts: PatternPart[];
  /** Cardinality expansion words after `→` (`each reachable item not already held`). */
  cardinality: string[] | null;
  span: Span;
}

/** `the <slot> must be <requirement>` (reachable, visible, held, …). */
export interface ScopeConstraint {
  slot: string;
  requirement: string;
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
 */
export interface DefineHatch {
  kind: 'define-hatch';
  hatchKind: 'action';
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

/** `define sequence <name> … end sequence` — timeline of chained steps. */
export interface DefineSequence {
  kind: 'define-sequence';
  /** Sequence name words (`closing time`). */
  name: string[];
  steps: SequenceStep[];
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
  | MoveStmt
  | RemoveStmt
  | AwardStmt
  | WinStmt
  | LoseStmt
  | KillStmt
  | MustRequirement
  | SelectOnStmt
  | SelectStrategyStmt
  | OrdinalBlock
  | EachStmt;

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

/** `set <field-path> to <value>` */
export interface SetStmt {
  kind: 'set';
  target: ValueExpr;
  value: ValueExpr;
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

/** `move <entity> to <place> [when <cond>]` */
export interface MoveStmt {
  kind: 'move';
  entity: NameRef;
  place: NameRef;
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

/** `award <quantity-words> [, once] [when <cond>]` */
export interface AwardStmt {
  kind: 'award';
  expression: string[];
  once: boolean;
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
  | ClientHasNode;

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
  | { kind: 'is-a'; negated: boolean; classifier: string[]; span: Span }
  | { kind: 'is-in'; negated: boolean; place: NameRef; span: Span }
  /** `<subject> is here` — the Z4 deictic: subject shares the player's location. */
  | { kind: 'is-here'; negated: boolean; span: Span }
  | { kind: 'holds'; thing: NameRef; span: Span }
  | { kind: 'has'; thing: NameRef; span: Span }
  | { kind: 'wears'; thing: NameRef; span: Span }
  /** `can see <thing>` / `can reach <thing>` (design.md §2.7; Phase B). */
  | { kind: 'can'; ability: string; thing: NameRef; span: Span }
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
