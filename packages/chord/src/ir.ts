/**
 * ir.ts — the Story IR wire types (`story language 2`).
 *
 * Purpose: the versioned, JSON-serializable product of Chord compilation
 * (ADR-210: the IR is the product). Everything is resolved — entity
 * references are canonical IDs, phrase keys are validated, event headers
 * are segmented — but statements remain trees: the loader performs the
 * four-phase partition (§5.4) at bind time. Nodes carry source spans for
 * error reporting and IDE tooling.
 *
 * Public interface: StoryIR and every IR* type; IR_FORMAT.
 * Owner context: @sharpee/chord owns this schema (ADR-210 Interface
 * Contract 1, owner-confirmed 2026-07-10); @sharpee/ide-protocol re-exports
 * it. Invariant: pure data — JSON.parse(JSON.stringify(ir)) is identity.
 */
import type { ScopeRequirementWord } from './catalog.js';
import type { Span } from './span.js';

/** Format stamp of this IR schema. Consumers refuse unknown formats. */
export const IR_FORMAT = 'story language 2';

/** Root of a compiled story. */
export interface StoryIR {
  format: typeof IR_FORMAT;
  /**
   * The Chord LANGUAGE version that compiled this story (ADR-257 D3, semver
   * from `CHORD_LANGUAGE_VERSION`) — a top-level, additive marker beside
   * `format`. Informational only: `format` is the loader's hard wire gate;
   * consumers may read `languageVersion` for tooling/diagnostics but the loader
   * never warns or refuses on it.
   */
  languageVersion: string;
  meta: IRMeta;
  /**
   * Present exactly when the source carried a `grammar` header (ADR-269 D8):
   * the file is a grammar file — `define action` grammar surfaces only,
   * analyzer-gated. Consumers (the standard-grammar build step) read this to
   * switch on grammar-file handling (D10 id derivation); the story loader
   * never sets or reads it. Additive and optional — absent on every story.
   */
  grammarFile?: { name: string };
  /**
   * `extend action <name>` blocks (ADR-270 D2) — story-scoped grammar lines
   * added to an existing action. Target resolution (story-first, else the
   * stdlib id set) and emission are the loader's. Additive and optional —
   * absent when the story declares none.
   */
  grammarExtensions?: IRGrammarExtension[];
  /**
   * `remove from action <name>` blocks (ADR-270 D3) — standard-grammar
   * shapes removed at load via the engine's removal primitive; an unmatched
   * shape is a load error, never a silent no-op (D1). Additive and optional.
   */
  grammarRemovals?: IRGrammarRemoval[];
  /**
   * The story object's declared phases (ownership package D2) and its
   * owned `on every turn` clauses (ADR-236 D7, ratchet R4) — daemons with
   * NO presence gate; `it` is unbound (compile-gated), narration
   * broadcasts.
   */
  story: { states: string[]; reversible: boolean; onClauses: IROnClause[] };
  /**
   * `use <extension>` names (ADR-215), validated against the manifest
   * registry — the loader registers each against its trusted runtime
   * registry at load (unknown names there are load errors).
   */
  uses: string[];
  /**
   * `use <extension>, announce <mode>` (ADR-262 D3), keyed by extension name.
   * How a metering extension's band crossings narrate — `all` / `collapsed` /
   * `combined` / `silent`. Absent key = the extension's default (`all`). The
   * loader passes the value to the ADR-262 narrator; a non-metering extension's
   * entry is simply never read.
   */
  announceModes: Record<string, string>;
  entities: IREntity[];
  conditions: IRNamedCondition[];
  phrases: IRPhrases;
  /**
   * ADR-255 standard-action message overrides, keyed by ACL alias per locale
   * (never a dotted platform id — the loader resolves the alias to `if.action.*`
   * via Interface Contract 3). Each entry is a full IRPhrase body, so cycling /
   * variants ride the same phrasebook resolution seam a platform message uses.
   */
  messageOverrides: IRMessageOverrides;
  /**
   * Phrasebooks in arbitration order — file-appearance order of
   * `use phrasebook` (header) and `define phrasebook`/import-spliced
   * blocks (body). First predicate-match in this order, per key, wins;
   * a `condition: null` book is the default (always) book (ADR-250 D3).
   */
  phrasebooks: IRPhrasebook[];
  // `verbs` REMOVED (ADR-270 D7, 2026-07-26): `define verb` is gone from the
  // language; `extend action` grammar lines carry the capability generally.
  hatches: IRHatch[];
  // Phase B (plan phase 3):
  traits: IRTraitDef[];
  actions: IRActionDef[];
  /** Owner-attached score identities (D12) — names are owner-qualified (`pygmy-goats.fed`). */
  scores: IRScoreDef[];
  /**
   * The `use scoring` rank ladder (ADR-261 D2/D5), sorted ascending by
   * threshold. The loader lowers this through `world.setRanks(...)` beside
   * the `setMaxScore` it already computes — generically, with no knowledge
   * that `scoring` is the extension consuming it.
   */
  ranks: IRRankDef[];
  /** The `use hunger` satiety meter (ADR-263 D1), or absent. */
  hunger?: IRHungerDef;
  /** Story-global numeric counters (ADR-264 D1). */
  counters: IRCounterDef[];
  sequences: IRSequenceDef[];
  /** `define machine` blocks (ADR-215 `use state-machines` depth). */
  machines: IRMachineDef[];
  /** `define channel` data projections (ADR-216) — pure IR; renderers are platform/extension territory. */
  channels: IRChannelDef[];
  /**
   * `define pronouns` named sets (ADR-242 D7) — declared case forms as
   * DATA. The loader registers each into the language provider through
   * the `extendLanguage` seam; the forms are locale text and render only
   * in lang-{locale}, never here.
   */
  pronounSets: IRPronounSetDef[];
  /** True when any hatch is declared — the pure-IR profile refuses these (AC-4). */
  hasHatches: boolean;
  /**
   * `define fact` declarations (ADR-310 D14) — closed value sets the
   * compiler checked `thinks` lines against and the loader re-checks at
   * load; act detection reads them at runtime (a claim's value lives in a
   * fact's set). Additive and optional — absent when the story declares
   * none.
   */
  facts?: IRFactDef[];
  /**
   * `define mood` declarations (ADR-310 D5, Option 2) — the loader lowers
   * each to a custom-mood registration (anchor coordinates + nudge, all
   * runtime-owned numbers). Additive and optional.
   */
  customMoods?: IRMoodDef[];
  /** `define personality` declarations (ADR-310 D5). Additive and optional. */
  customPersonalities?: IRWordDef[];
}

/** A `define mood <name> like <mood>[, but <modifier>]` declaration (ADR-310 D5). */
export interface IRMoodDef {
  name: string;
  /** The platform anchor mood. */
  like: string;
  /** The nudge modifier word, if any. */
  but?: string;
  span: Span;
}

/** A bare custom vocabulary word declaration (`define personality watchful`). */
export interface IRWordDef {
  name: string;
  span: Span;
}

/**
 * A prose-valued meta field (ADR-298 D4): literal text, or a phrase
 * reference the engine resolves at emission time (variants keep their
 * normal semantics). No spans — IR is snapshot-stable.
 */
export interface IRProseValue {
  kind: 'literal' | 'phrase-ref';
  value: string;
}

/**
 * Typed story-block metadata (ADR-298 — closed schema, unknown keys never
 * reach the IR). The client-config fields (`client`/`theme`/`template`/
 * `themes`/`defaultTheme`/`storagePrefix`) are ADR-252 D3's browser-build
 * keys, folded into the closed set by the ADR-298 amendment (GH #221,
 * 2026-08-03) — consumed by devkit's browser build, inert elsewhere.
 */
export interface IRStoryFields {
  id?: string;
  storyVersion?: string;
  ifid?: string;
  authors: string[];
  testers: string[];
  prologue?: IRProseValue;
  description?: IRProseValue;
  client?: string;
  theme?: string;
  template?: string;
  themes: string[];
  defaultTheme?: string;
  storagePrefix?: string;
  /** `publish-source:` — ship the `.story` source in the artifact. Absent = no. */
  publishSource?: boolean;
  /**
   * `auto-assertion:` — transcript auto-assertion policy (Phase 6e, #253).
   * Consumed by the test harness; inert at play time. Absent = "let me decide".
   */
  autoAssertion?: 'all-emitted-text' | 'room-description' | 'room-name-and-description';
}

export interface IRMeta {
  /** Top-level by contract — the IDE's window title reads this directly (ADR-279 A1). */
  title: string;
  /** Typed header fields (ADR-298 D4). */
  fields: IRStoryFields;
}

// --------------------------------------------------------------------------
// entities
// --------------------------------------------------------------------------

export interface IREntity {
  /** Canonical slug (lowercased name words joined with `-`). Unique. */
  id: string;
  /** Display name without article. */
  name: string;
  /** Leading article as written (`the`), or null. */
  article: string | null;
  aka: string[];
  /**
   * `pronouns <word>` (ADR-242 D5) — a standard set (`he`/`she`/`it`/
   * `they`) or a `define pronouns` set name. Present only when declared:
   * no default is injected (ruled Q-2) — absent means the platform's
   * by-number fallback.
   */
  pronouns?: string;
  /** True for the story's player entity (`create the player`). */
  isPlayer: boolean;
  /** Kind-noun compositions (`a room`), in declaration order. */
  kinds: IRComposition[];
  /** Trait-adjective compositions (`scenery`, `dark while …`). */
  traits: IRComposition[];
  /**
   * `starts <state>` initializers (ADR-231 D5a), in declaration order —
   * accepted state words (`locked`, `open`, `on`, …) whose pairing with a
   * composed trait the analyzer has already enforced. The loader maps each
   * to the paired trait's initial-value field (`isLocked`, `isOpen`,
   * `isOn`); the state adjective itself is never stored story state.
   */
  startsStates: string[];
  placement: IRPlacement | null;
  /** Entity IDs this entity wears at start (player wears the cloak). */
  wears: string[];

  /** Entity IDs carried at start, not worn (player carries the knife — ADR-230 Phase 6). */
  carries: string[];
  /**
   * Region membership (`containing <list>`, ADR-236 D2/D3) — resolved member
   * entity IDs in declaration order, additive across lines. Members are
   * rooms (loader: `assignRoom`) or nested regions (member's
   * `parentRegionId` = this region). Non-empty only on region-kind entities
   * (analyzer-gated).
   */
  containing: IRContainedMember[];
  exits: IRExit[];
  blockedExits: IRBlockedExit[];
  /** `<direction> is deadly: <phrase>` lines (ADR-227). */
  deadlyExits: IRDeadlyExit[];
  /** `deadly: <phrase>` no-escape room marker (ADR-227); null = not deadly. */
  deadly: IRDeadlyRoom | null;
  /**
   * Ordered state names — the entity's own `states:` line first, then every
   * composed trait's declared set in composition order (D8 merge; one
   * namespace per entity, collisions are load errors).
   */
  states: string[];
  /**
   * The entity's OWN `states:` line permits back-transitions (D4). Trait
   * sets carry their own flag on IRTraitDef — the runtime resolves a
   * `change` target's declaring set for the forward-march check.
   */
  statesReversible: boolean;
  /** Per-entity numeric counters (ADR-264 D1) — one value per instance. */
  counters: IRCounterDecl[];
  /** Phrase key of the description in the phrase table, or null. */
  descriptionKey: string | null;
  /**
   * Phrase key of the `first time` (first-visit) description (Z1), or null.
   * Rooms only — the loader binds it to `RoomTrait.initialDescription`.
   */
  initialDescriptionKey: string | null;
  onClauses: IROnClause[];
  /**
   * The entity's declared ask/tell topic table (`define topics for …`,
   * ADR-239 D3/D4) — rows in declaration order; empty when no block is
   * declared. Runtime matching is normalized whole-topic lookup, never
   * fuzzy; a miss falls to the owner's `on asking it` catch-all (D5).
   */
  topics: IRTopicRow[];
  /**
   * The declared character model (ADR-310) — present exactly when the
   * `create` block carries at least one character construct (D7: a person
   * with no character line compiles exactly as today, no model attached).
   */
  character?: IRCharacter;
  span: Span;
}

/**
 * A person entity's declared character model (ADR-310 D2–D5, D14). The
 * invariant of the shape: WORDS as written, never numbers — the word→value
 * mapping is @sharpee/character's at load time, so the wire carries exactly
 * what the author said. Personality words never join parser vocabulary
 * (D2); nothing here may reach player-facing text (D12). Goal, influence,
 * and propagation declarations (D8–D10) join this shape with their grammar.
 */
export interface IRCharacter {
  /** Personality adjectives (D2), in declaration order. */
  personality: IRPersonalityEntry[];
  /** Starting mood word (`mood nervous`, D3); absent = runtime default. */
  mood?: string;
  /** `feels <disposition> toward <entity>` lines (D3; any entity — NPC-to-NPC included, D14). */
  feels: IRFeelsEntry[];
  /** `knows <topic>, <source>` valueless held topics (D3). */
  knows: IRKnowsEntry[];
  /** `thinks <fact> is <value>, …` valued beliefs (D14). */
  thinks: IRThinksEntry[];
  /**
   * Resolved-COMPLETE cognitive profile (D4) — all five dimensions, kebab
   * keys. Named profiles and partial overrides are inlined at compile time
   * (a profile is always complete at compile time, so `define profile`
   * blocks never reach the wire). Absent = the platform default.
   */
  profile?: Record<string, string>;
  /** `spreads …` propagation declaration (D10); absent = the runtime default. */
  spreads?: IRSpreads;
  /** `goal` blocks (D8), in declaration order. */
  goals: IRGoalDef[];
  /** `influence` blocks (D9) — defined on the exerter. */
  influences: IRInfluenceDef[];
  /** `resists` lines (D9) — resistance on the target, joined to an influence by name. */
  resists: IRResistsEntry[];
}

/** A `goal` block (ADR-310 D8): named, prioritized, an ordered step sequence. */
export interface IRGoalDef {
  /** The author's goal name (kebab word) — unique per entity. */
  id: string;
  /** Priority word (critical / high / medium / low). */
  priority: string;
  /** `active when` — re-evaluated each NPC turn; null = always active. */
  activeWhen: IRCondition | null;
  steps: IRGoalStep[];
  span: Span;
}

/** One goal step (ADR-310 D8) — verbs per ADR-145's step types; entity refs resolved. */
export type IRGoalStep =
  | { kind: 'seek'; target: string; in?: string; span: Span }
  | { kind: 'acquire'; target: string; span: Span }
  | { kind: 'wait-for'; condition: IRCondition; span: Span }
  | { kind: 'move-to'; target: string; span: Span }
  | { kind: 'act'; phraseKey: string; span: Span }
  | { kind: 'say'; phraseKey: string; target?: string; span: Span }
  | { kind: 'give'; item: string; target: string; span: Span }
  | { kind: 'drop'; item: string; in?: string; span: Span };

/**
 * An `influence` block (ADR-310 D9), defined on the exerter. Effect axes
 * carry vocabulary words (`focus: 'clouded'`, mood and threat words);
 * `witnessed`/`resisted` are the author-written phrase keys (D12 — prose
 * about an event, never a readout of state).
 */
export interface IRInfluenceDef {
  /** Author-invented name — the join key `resists` refers to. */
  name: string;
  mode: string;
  range: string;
  effect: Record<string, string>;
  witnessed?: string;
  resisted?: string;
  span: Span;
}

/** One `resists` line (ADR-310 D9) on the target. */
export interface IRResistsEntry {
  influence: string;
  /**
   * `except from a woman` (classifier — article `a`/`an`) or `except from
   * the Duke` (resolved entity ID). Absent = unconditional resistance.
   */
  exceptFrom?: { kind: 'classifier' | 'entity'; value: string };
  span: Span;
}

/**
 * A `spreads` propagation declaration (ADR-310 D10). `nothing` is `mute`
 * said in English; the spreads form implies the chatty tendency, and its
 * topic list (possibly empty = everything held) is the whitelist — listing
 * IS selectivity.
 */
export type IRSpreads =
  | { kind: 'nothing'; span: Span }
  | {
      kind: 'spreads';
      /** Canonical topic strings (normalized like `knows` topics). */
      topics: string[];
      /** Audience word: trusted / anyone / allied. */
      to: string;
      /** `except <entities>` — resolved entity IDs. */
      except: string[];
      span: Span;
    };

/** One personality adjective (D2): trait word plus optional intensity word. */
export interface IRPersonalityEntry {
  trait: string;
  /** Intensity word (`very`) as written; absent = the bare step. */
  intensity?: string;
  span: Span;
}

/** One `feels <disposition> toward <entity>` line (D3). */
export interface IRFeelsEntry {
  /** Disposition word — may be two words (`wary of`, `devoted to`). */
  disposition: string;
  /** Resolved entity ID of the disposition's object. */
  target: string;
  span: Span;
}

/** One `knows <topic>, <source>` line (D3) — a valueless held topic. */
export interface IRKnowsEntry {
  /** Canonical topic string (name words joined, article dropped). */
  topic: string;
  /** Fact source word (`witnessed`, `told`, …). */
  source: string;
  /** Confidence word; absent = the runtime default. */
  confidence?: string;
  /** The topic was received in confidence (ADR-318 D4 comma-slot marker). */
  confided?: boolean;
  span: Span;
}

/** One `thinks <fact> is <value>, <confidence>, <source>` line (D14). */
export interface IRThinksEntry {
  /** The `define fact` id this belief addresses. */
  factId: string;
  /** The believed value — canonical: an entity-name value is its resolved id; a plain word stays the word. */
  value: string;
  /** Confidence word; absent = the runtime default. */
  confidence?: string;
  /** Fact source word; absent = the runtime default. */
  source?: string;
  span: Span;
}

/**
 * A `define fact` declaration (ADR-310 D14) — the closed value set that
 * makes valued belief checkable: a `thinks` value outside the set is a
 * compile error, in the same shape as an unknown personality word.
 */
export interface IRFactDef {
  /** Canonical fact id (lowercased name words joined with `-`). Unique. */
  id: string;
  /** Display name without article. */
  name: string;
  /** Leading article as written (`the`), or null. */
  article: string | null;
  /**
   * The closed value set, canonicalized: an entity-name value is the
   * resolved entity ID; a non-entity word (`nobody`) stays the word.
   */
  values: string[];
  span: Span;
}

/**
 * One resolved topic-table row (ADR-239). Entity tier carries the resolved
 * entity id (matched against the platform's `topicEntityId`); free-text
 * tier carries the primary spelling plus declared aliases (matched against
 * the normalized asked text). The body executes with `it` = the owner.
 */
export interface IRTopicRow {
  filter:
    | { kind: 'entity'; id: string }
    | { kind: 'text'; primary: string; aliases: string[] };
  body: IRStatement[];
  span: Span;
}

export interface IRComposition {
  name: string;
  config: IRConfigSetting[];
  /** Conditional composition (`dark while …`), or null. */
  condition: IRCondition | null;
  span: Span;
}

export interface IRConfigSetting {
  /** Setting key words joined with a space (`max items`). */
  key: string;
  value: string;
  /**
   * 'name' = multi-word entity-name value (`with food the handful of
   * feed`, Phase B); 'list' = bracketed name list (`with route [Hall,
   * Study]`, ADR-215) — resolved entity IDs in `values`, `value` empty.
   */
  valueKind: 'number' | 'string' | 'word' | 'name' | 'list';
  /** Resolved entity IDs when valueKind is 'list'. */
  values?: string[];
}

/** One resolved `containing` member (ADR-236 D2) — a room or nested region. */
export interface IRContainedMember {
  /** Entity ID of the member. */
  id: string;
  span: Span;
}

export interface IRPlacement {
  relation: 'in' | 'on' | 'starts-in';
  /** Entity ID of the containing place. */
  place: string;
  span: Span;
}

export interface IRExit {
  direction: string;
  /** Entity ID of the destination room. */
  to: string;
  /**
   * Entity ID of the door this exit passes through (`through the <door>`,
   * ADR-234 D1) — null on plain exits. The loader stamps it as `via` on
   * both directions and places the door in the declaring room.
   */
  via: string | null;
  span: Span;
}

export interface IRBlockedExit {
  direction: string;
  phraseKey: string;
  /** `is blocked while <cond>` — null = always blocked (grammar log 2026-07-10). */
  condition: IRCondition | null;
  span: Span;
}

/** `<direction> is deadly: <phrase>` (ADR-227) — a lethal exit. */
export interface IRDeadlyExit {
  direction: string;
  /** Phrase key carrying the death text (also the derived cause). */
  phraseKey: string;
  /** `is deadly while <cond>` — parsed but not yet wired (post-scope). */
  condition: IRCondition | null;
  span: Span;
}

/** `deadly: <phrase>` (ADR-227) — the no-escape room marker. */
export interface IRDeadlyRoom {
  /** Phrase key carrying the death text (also the derived cause). */
  phraseKey: string;
  span: Span;
}

export interface IROnClause {
  /** `on` = intercept (may refuse; primary text), `after` = react (appends; ratchet D3). */
  clauseKind: 'on' | 'after';
  /** `, once` clause modifier — one lifetime firing (ratchet D5). */
  once: boolean;
  /** Action word as written (gerund), e.g. `reading`; `every-turn` for `on every turn`. */
  action: string;
  /** How the clause binds: target (`it`), role (`anything as the <role>`), or every turn. */
  binding: 'it' | 'role' | 'every-turn';
  /** Role name for role-bound clauses (validated against the action's roles). */
  role: string | null;
  /** `while` qualifier (every-turn clauses). */
  condition: IRCondition | null;
  /** Explicit `before`/`after` ordering between traits on the same action. */
  ordering: { relation: 'before' | 'after'; trait: string } | null;
  /**
   * §5.4 compiler rule: clauses on standard-semantics actions compile to
   * ActionInterceptors; clauses on dispatch verbs (`define action`) compile
   * to CapabilityBehaviors. Null for every-turn clauses (daemon-shaped).
   */
  routing: 'interceptor' | 'capability' | null;
  /**
   * Narration scope (decision 10, 2026-07-11): entity/trait-owned clauses
   * are presence-scoped — the loader fires their narration only when the
   * player shares the owner's location (performances need an audience;
   * presence, not sight). Story-owned schedule/sequence bodies broadcast.
   * All on-clauses are owner-attached under the ownership package, so this
   * is always 'presence' — recorded explicitly for the loader (Phase 4) and
   * IDE consumers.
   */
  narration: 'presence' | 'broadcast';
  /**
   * Statement tree in source order. The phase-order rule is enforced at
   * compile time; the loader partitions this into validate/execute/report.
   */
  body: IRStatement[];
  span: Span;
}

// --------------------------------------------------------------------------
// phrases
// --------------------------------------------------------------------------

export interface IRPhrases {
  /** The story's default locale (Phase A: en-US). */
  defaultLocale: string;
  /** locale → phrase key → phrase. */
  locales: Record<string, Record<string, IRPhrase>>;
}

/**
 * ADR-255 message overrides. Same shape as {@link IRPhrases} but keyed by ACL
 * alias (`taking-fixed-in-place`), not a story phrase key; the loader resolves
 * each alias to its `if.action.*` id and registers the phrase body on the
 * phrasebook resolution seam so strategy/cycling works for a platform message.
 */
export interface IRMessageOverrides {
  defaultLocale: string;
  /** locale → override alias → phrase body. */
  locales: Record<string, Record<string, IRPhrase>>;
}

export interface IRPhrase {
  /** Choice strategy for multi-variant phrases, or null for a single text (Z5 adverbs, ADR-211 Decision 4). */
  strategy: 'randomly' | 'cycling' | 'stopping' | 'sticky' | 'first-time' | null;
  /**
   * Whitespace-preserving text (`define phrase X, verbatim`, grammar log
   * 2026-07-10) — the loader must exempt it from whitespace collapse.
   * Present only when true (additive field; format stamp unchanged).
   */
  verbatim?: boolean;
  /**
   * Trailing `while <condition>` header gate (Z2/CP1', additive like
   * `verbatim`): at a description-marker site a presence condition compiles
   * to ADR-209 `mentions` and anything else registers on the ADR-211 gate
   * seam keyed `(roomId, marker)`. Absent when ungated.
   */
  condition?: IRCondition;
  variants: IRPhraseVariant[];
  span: Span;
}

export interface IRPhraseVariant {
  text: string;
  /**
   * `{…}` marker contents appearing in the text, in order. `br` is the
   * built-in hard line break; prose paragraphs arrive as `\n\n` in `text`.
   */
  markers: string[];
}

/**
 * One phrasebook (ADR-245/ADR-250 D3): a named, predicated collection of
 * story-key phrase entries. `define`d (and import-spliced) books carry
 * their entries; `use`d books carry none — the loader resolves them from
 * the packaged-book data registry at load (manifest keys ≡ data keys,
 * conformance-checked).
 */
export interface IRPhrasebook {
  /** Single kebab-case book name. */
  name: string;
  source: 'define' | 'use';
  /** Activity predicate, evaluated at render time; null = always (the default book). */
  condition: IRCondition | null;
  /** Present for 'define'; absent for 'use'. Keys are story keys (never dotted platform IDs). */
  entries?: Record<string, IRPhrase>;
  /**
   * ADR-310 D16: present (`'character'`) when the `while` gates on an
   * entity's interior state (mood/threat `is`, `feels`, `knows`) — the
   * loader's arbitration reads it: character-scoped beats story-scoped by
   * total override; within a specificity, file order stays the rule.
   */
  specificity?: 'character';
  span: Span;
}

// --------------------------------------------------------------------------
// declarations
// --------------------------------------------------------------------------

export interface IRNamedCondition {
  name: string;
  /**
   * True when the body references `it`/`its` — an OPEN condition, usable as
   * a selection via `any <name>` (grammar log 2026-07-11). Closed conditions
   * are plain truth tests.
   */
  open: boolean;
  condition: IRCondition;
  span: Span;
}

/**
 * One pattern element (ADR-267): a literal word, a `the <name>` slot (D15),
 * or an `or`-alternation of words (D8). `optional` is present only when the
 * element was written `[…]` (D9) — absent otherwise, keeping pre-267 IR
 * byte-identical.
 */
export type IRPatternPart =
  | { kind: 'word'; word: string; optional?: boolean }
  | { kind: 'slot'; word: string; optional?: boolean }
  | { kind: 'alt'; words: string[]; optional?: boolean };

export interface IRHatch {
  name: string;
  modulePath: string;
  /**
   * Target interface: dynamic-text producer, Action, or event `chain`
   * (ADR-094 — a chain hatch replaces a stdlib chain like `opened-revealed`).
   * (`behavior` was removed by ADR-235 D2 — the hatch had no binding key and
   * could never fire.)
   */
  hatchKind: 'text' | 'action' | 'chain';
  span: Span;
}

// --------------------------------------------------------------------------
// Phase B declarations
// --------------------------------------------------------------------------

/** `define trait` — data fields, trait-declared states, behavior clauses. */
export interface IRTraitDef {
  name: string;
  data: IRTraitField[];
  /** Trait-declared states (ratchet D8) — every composer gets the set. */
  states: string[];
  statesReversible: boolean;
  /** Trait-owned scores (D12); names owner-qualified (`trait.<name>.<score>`). */
  scores: IRScoreDef[];
  onClauses: IROnClause[];
  span: Span;
}

export interface IRTraitField {
  /** Field name words joined with a space (`body part`). */
  name: string;
  type: 'entity' | 'number' | 'name' | 'one-of';
  optional: boolean;
  initial: string | null;
  oneOf: string[] | null;
}

/** `define action` — grammar, scope constraints, requirements, refusal ladder, body. */
export interface IRActionDef {
  name: string;
  patterns: IRActionPattern[];
  /** Scope constraints (`the <slot> must be <requirement>`) — requirement words are catalog-validated (ADR-271 D1). */
  constraints: Array<{ slot: string; requirement: ScopeRequirementWord }>;
  /**
   * Greedy slots (`the <slot> takes the rest of the line`, ADR-267 D10) —
   * each compiles to `:slot...` (TEXT_GREEDY) in the emitted pattern string.
   * Present only when declared (absent keeps pre-267 IR byte-identical).
   */
  greedy?: string[];
  /**
   * Typed slots (`the <slot> is an instrument` / `is a topic`, ADR-267 D11)
   * — each emits `.slotType(slot, INSTRUMENT | TOPIC)` on the registered
   * rules. The closed two-word set is analyzer-gated; present only when
   * declared (absent keeps pre-267 IR byte-identical).
   */
  slotTypes?: Array<{ slot: string; type: 'instrument' | 'topic' }>;
  /**
   * `directions` block (ADR-267 D12) — bound to the `direction` slot: every
   * pattern using the slot expands across the set (one rule per alias ×
   * pattern, `direction: <canonical>` as its semantic default); a bare
   * `the direction` pattern registers the standalone forms. Per-action
   * vocabulary, never compass-hardcoded. Present only when declared.
   */
  directions?: Array<{ canonical: string; aliases: string[] }>;
  /** `must` requirement lines (ratchet D6) — checked before the body. */
  musts: IRMust[];
  refusals: IRActionRefusal[];
  /** Dispatch-miss phrase key (`otherwise refuse …`), or null. */
  otherwise: string | null;
  /** Action-owned scores (D12); names owner-qualified (`action.<name>.<score>`). */
  scores: IRScoreDef[];
  body: IRStatement[];
  span: Span;
}

/** A resolved `must` requirement: refuse with the key unless the condition holds. */
export interface IRMust {
  condition: IRCondition;
  phraseKey: string;
  span: Span;
}

export interface IRActionPattern {
  parts: IRPatternPart[];
  /** `→ each …` cardinality words, or null. */
  cardinality: string[] | null;
  /**
   * `means <key> <value>` static semantic defaults for THIS pattern's rules
   * (ADR-267 D12) — per-pattern, never action-wide. Present only when
   * declared (absent keeps pre-267 IR byte-identical).
   */
  means?: Array<{ key: string; value: string }>;
}

export type IRActionRefusal =
  | { kind: 'without'; slot: string; phraseKey: string; span: Span }
  | { kind: 'when'; condition: IRCondition; phraseKey: string; span: Span };

/**
 * `extend action <name>` (ADR-270 D2/D6) — the grammar-surface subset of
 * IRActionDef, added to an EXISTING action at story tier. No behavior
 * fields exist here by construction (analyzer-gated).
 */
export interface IRGrammarExtension {
  /** The target action name as written (gerund) — the loader resolves it story-first, else against the stdlib id set. */
  action: string;
  patterns: IRActionPattern[];
  constraints: Array<{ slot: string; requirement: ScopeRequirementWord }>;
  greedy?: string[];
  slotTypes?: Array<{ slot: string; type: 'instrument' | 'topic' }>;
  directions?: Array<{ canonical: string; aliases: string[] }>;
  span: Span;
}

/**
 * `remove from action <name>` (ADR-270 D3/D6) — pattern shapes to remove.
 * Identity is the pattern string; `means`/cardinality never appear here
 * (analyzer-gated).
 */
export interface IRGrammarRemoval {
  action: string;
  patterns: IRActionPattern[];
  span: Span;
}

/** `define score <name> worth <n>` — dedup-by-identity award (ADR-129). */
export interface IRScoreDef {
  name: string;
  worth: number;
  span: Span;
}

/**
 * One rung of the `use scoring` ladder (ADR-261 D2/D5/D7).
 *
 * `id` is the rank name kebab-cased (ADR-254), which makes a rank addressable
 * in diagnostics and in `if.event.band_crossed`'s payload without the author
 * declaring one. Because ranks are configuration rather than saved state
 * (ADR-260 D2), a rank id never reaches a save file — so renaming a rank
 * between releases cannot invalidate one.
 *
 * `phraseKey` lives here and deliberately **not** on the platform's
 * `RankDefinition` (ADR-261 D7): a phrase key is a Chord concept, and a
 * TypeScript story has nothing to put there. The loader keeps the mapping and
 * registers a story-side reaction; the platform never learns the key exists.
 */
export interface IRRankDef {
  id: string;
  name: string;
  /** Absolute points, never a percentage of max (ADR-260 D2's invariant). */
  threshold: number;
  /** `says <key>` — a key in the story's own phrase namespace, or absent. */
  phraseKey?: string;
  span: Span;
}

/**
 * The `use hunger` satiety meter (ADR-263 D1), lowered from the header body.
 * The loader installs `rungs` on the ADR-262 crossing engine, `grows` as an
 * `on every turn` daemon, and `fatal` as a `kill the player` trigger.
 */
export interface IRHungerDef {
  /** `grows N each turn` — per-turn severity gain. Absent = no decay. */
  grows?: number;
  /** `fatal at N` — a raw-value death trigger above the top band. */
  fatal?: number;
  /** Announce bands, sorted ascending by threshold. */
  rungs: IRMeterRung[];
  span: Span;
}

/** One `<band> at <n> [says <key>]` rung of a metering body (ADR-263 D1). */
export interface IRMeterRung {
  /** The band id — the bareword band name (already kebab). */
  id: string;
  threshold: number;
  /** `says <key>` — a story phrase key, or absent (platform fallback). */
  phraseKey?: string;
  span: Span;
}

/**
 * A story-global numeric counter (ADR-264 D1). `starts` is resolved to a
 * concrete initial value (default 0, clamped into bounds); `lo`/`hi` are the
 * declared bounds or null (unbounded). The loader seeds `starts` into world
 * state under `CHORD_COUNTER_PREFIX + name`; mutations clamp to `[lo, hi]`.
 */
export interface IRCounterDef {
  name: string;
  starts: number;
  lo: number | null;
  hi: number | null;
  span: Span;
}

/** A per-entity numeric counter (ADR-264 D1) — same shape, carried on IREntity. */
export interface IRCounterDecl {
  name: string;
  starts: number;
  lo: number | null;
  hi: number | null;
  span: Span;
}

/** `define sequence <name>` — chained-fuse timeline. */
export interface IRSequenceDef {
  /** Name words joined with a space (`closing time`). */
  name: string;
  /**
   * Narration scope (decision 10): sequences are story-owned — their
   * narration broadcasts regardless of the player's location.
   */
  narration: 'broadcast';
  steps: IRSequenceStep[];
  span: Span;
}

/** One step: wall-clock (`at turn N`/`N turns later`) or state anchor (D10). */
export interface IRSequenceStep {
  timing: 'at-turn' | 'later' | 'becomes';
  /** Turn count for at-turn/later; 0 for becomes. */
  turns: number;
  /** State anchor for `becomes` steps: owner is `story` or an entity id. */
  anchor?: { owner: string; state: string } | null;
  body: IRStatement[];
  span: Span;
}

/**
 * `define machine` (ADR-215 `use state-machines` depth; spelling A,
 * 2026-07-18). The loader lowers onto the ADR-119 plugin: platform machine
 * id `chord.machine.<slug>`, role bindings as `$<role>` refs, Chord
 * conditions as custom guards, Chord bodies as custom effects.
 */
export interface IRMachineDef {
  /** Name words joined with a space (`drawbridge works`). */
  name: string;
  /** Role name → resolved entity id (the machine's bindings). */
  roles: Array<{ name: string; entity: string }>;
  initialState: string;
  states: IRMachineState[];
  span: Span;
}

export interface IRMachineState {
  name: string;
  terminal: boolean;
  transitions: IRMachineTransition[];
  onEnter: IRStatement[];
  onExit: IRStatement[];
  span: Span;
}

export interface IRMachineTransition {
  /** Resolved trigger: action targets are `$<role>` refs or entity ids. */
  trigger:
    | { kind: 'action'; action: string; target: string | null }
    | { kind: 'event'; event: string }
    | { kind: 'condition'; condition: IRCondition };
  /** Optional `while` guard riding the trigger. */
  condition: IRCondition | null;
  /** Target state name. */
  target: string;
  span: Span;
}

/**
 * The construct a channel `return`s (ADR-253 D1). The loader evaluates it
 * against the turn's last matching event to produce the channel's value:
 *  - `field`  — the raw event field value;
 *  - `text`   — a text template whose `(slot)` names project event fields
 *    (the phrase slot spelling), yielding finished text;
 *  - `phrase` — the named phrase's rendered text;
 *  - `record` — a structured object whose members each project one of the
 *    above (ADR-300 D10). This is the Chord side of ADR-300 D7: the platform
 *    could already build record-valued channels (the banner), and until D10
 *    an author could not say so in a `.story` file.
 */
export type IRChannelReturn =
  | { kind: 'field'; field: string }
  | { kind: 'text'; text: string }
  | { kind: 'phrase'; phrase: string }
  | { kind: 'record'; members: IRChannelRecordMember[] };

/**
 * One member of a record-valued channel (ADR-300 D10). `list: true` is the
 * `list of` spelling — the member's value is an array. Members never nest a
 * record; the analyzer guarantees `value.kind !== 'record'`.
 */
export interface IRChannelRecordMember {
  name: string;
  list: boolean;
  value: Exclude<IRChannelReturn, { kind: 'record' }>;
}

/**
 * `define channel` (ADR-216; spelling A, 2026-07-18; ADR-253 replaced
 * `take`/`from event` with `return … from <event>`): a declarative data
 * projection — the loader lowers it to a real IOChannel whose produce
 * evaluates `returns` against the turn's last event of `fromEvent`.
 * `gatedBy` carries the PLATFORM camelCase capability key. The `family`
 * discriminator is ADR-241's additive extension: every data projection
 * reads as `family: 'data'`.
 */
export interface IRDataChannelDef {
  name: string;
  family: 'data';
  mode: 'replace' | 'append' | 'event';
  gatedBy: string | null;
  fromEvent: string;
  returns: IRChannelReturn;
  span: Span;
}

/**
 * A named family channel (ADR-241 D2): `define ambient <word>` /
 * `define layer <word>`, or the implied `main` bed when used. `name` is
 * the author's word (`wind`); the registered id (`ambient:wind`,
 * `image:wind`) and the channel's mode/gate/produce are the loader's
 * business via stdlib's family builders — never carried here.
 */
export interface IRFamilyChannelDef {
  name: string;
  family: 'ambient' | 'layer';
  span: Span;
}

/** Any story-declared dynamic channel (ADR-163 §7 / ADR-241 D1). */
export type IRChannelDef = IRDataChannelDef | IRFamilyChannelDef;

/**
 * One `define pronouns <name>` set (ADR-242 D7) — the five case forms the
 * lang-{locale} assembler's pronoun table keys. Forms are carried as data;
 * they become rendered text only inside the language provider's registry.
 */
export interface IRPronounSetDef {
  name: string;
  forms: {
    subject: string;
    object: string;
    possessive: string;
    possessivePronoun: string;
    reflexive: string;
  };
  span: Span;
}

// --------------------------------------------------------------------------
// statements
// --------------------------------------------------------------------------

export type IRStatement =
  | { kind: 'refuse'; phraseKey: string; params: IRParam[]; span: Span }
  | { kind: 'phrase'; phraseKey: string; params: IRParam[]; stmtWhen?: IRCondition | null; span: Span }
  /** Payload present only when authored (`with …`, ADR-216) — additive field. */
  | { kind: 'emit'; event: string; payload?: IREmitField[]; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'set'; target: IRValue; value: IRValue; span: Span }
  | { kind: 'change'; entity: IRValue; state: string; stmtWhen?: IRCondition | null; span: Span }
  /** `change mood to <word>` (ADR-310 D3) — the clause's `it` takes the mood. */
  | { kind: 'change-mood'; mood: string; stmtWhen?: IRCondition | null; span: Span }
  /** `change feeling toward <entity> to <disposition>` (ADR-310 D3) — `it` feels differently about the target. */
  | { kind: 'change-feeling'; target: IRValue; disposition: string; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'move'; entity: IRValue; place: IRValue; stmtWhen?: IRCondition | null; span: Span }
  /** `remove <entity>` (Z6, ADR-213 Q3) — out of play via `world.removeEntity`; observers fire. */
  | { kind: 'remove'; entity: IRValue; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'award'; expression: string[]; once: boolean; stmtWhen?: IRCondition | null; span: Span }
  // ADR-264 D2: `raise`/`lower` a counter by an amount. `owner` is the entity
  // IRValue for a per-entity counter, or null for a story-global one.
  | { kind: 'raise' | 'lower'; counter: string; owner: IRValue | null; amount: number; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'win'; phraseKey: string | null; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'lose'; phraseKey: string | null; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'kill'; phraseKey: string | null; stmtWhen?: IRCondition | null; span: Span }
  /** `must` requirement as a body statement (ratchet D6). */
  | { kind: 'must'; condition: IRCondition; phraseKey: string; span: Span }
  /** `refuse when <cond>: <key>` as a body statement (prohibition, D6). */
  | { kind: 'refuse-when'; condition: IRCondition; phraseKey: string; span: Span }
  | { kind: 'select-on'; subject: IRValue; arms: IRSelectArm[]; span: Span }
  | {
      kind: 'select-strategy';
      /**
       * ADR-289 D2: compiler-assigned stable id keying this select's persisted
       * occurrence counter — `<owner>.<clause-key>.<statement-path>`, e.g.
       * `troll.on-attacking-0.2.0`. NEVER bare digits: that shape is reserved
       * for the retired line-number key space the load/restore sweep removes.
       * Positional by construction, so editing or reordering clauses and
       * statements re-keys the select and resets its counter (ADR-289 D2
       * consequence). `select-on` carries no id — it has no persisted state.
       */
      id: string;
      strategy: string;
      alternatives: IRStatement[][];
      span: Span;
    }
  | { kind: 'ordinal'; ordinal: number; body: IRStatement[]; span: Span }
  /**
   * `each <open-condition> … end each` (ratchet E3, 2026-07-12): run the
   * body once per matching world entity in creation order, `the match`
   * bound to that entity; empty set = no-op.
   */
  | { kind: 'each'; condition: string; body: IRStatement[]; span: Span };

export interface IRSelectArm {
  value: string;
  body: IRStatement[];
  span: Span;
}

export interface IRParam {
  /** Parameter name words joined with a space (`other item`). */
  param: string;
  value: IRValue;
  span: Span;
}

/** One resolved emit-payload field (ADR-216): key words joined with a space, passed VERBATIM to the event data. */
export interface IREmitField {
  key: string;
  value: IREmitValue;
}

/**
 * One resolved emit-payload value (ADR-216): a literal, a resolved value
 * expression (evaluated live at emit time — `true`/`false` symbols become
 * booleans), an array, or a nested object.
 */
export type IREmitValue =
  | { kind: 'literal'; value: string; valueType: 'number' | 'string' }
  | { kind: 'value'; value: IRValue }
  | { kind: 'array'; items: IREmitValue[] }
  | { kind: 'object'; fields: IREmitField[] };

// --------------------------------------------------------------------------
// values and conditions
// --------------------------------------------------------------------------

export type IRValue =
  | { kind: 'literal'; value: string; valueType: 'number' | 'string' }
  | { kind: 'entity'; id: string }
  | { kind: 'player' }
  | { kind: 'it' }
  /** The story object (`change the story to after-hours`, ratchet D2). */
  | { kind: 'story' }
  | { kind: 'field'; base: IRValue; field: string }
  /** A numeric counter read (ADR-264 D3) — `owner` is the entity IRValue for a
   *  per-entity counter, or null for a story-global one. */
  | { kind: 'counter'; name: string; owner: IRValue | null }
  /** A grammar-slot / role context value inside an action or role clause (`the animal`, `the taker`). */
  | { kind: 'slot'; name: string }
  /** The `each`-block binder `the match` (ratchet E3) — parallel to `it`. */
  | { kind: 'match' }
  | { kind: 'symbol'; name: string };

export type IRCondition =
  | { kind: 'and'; operands: IRCondition[] }
  | { kind: 'or'; operands: IRCondition[] }
  | { kind: 'not'; operand: IRCondition }
  | { kind: 'chance'; n: number }
  | { kind: 'condition'; name: string }
  /** The story is in the named phase (`while after-hours`, ratchet D2). */
  | { kind: 'story-state'; state: string }
  /**
   * `any <open-condition>` (ratchet E1, 2026-07-12): true iff some world
   * entity satisfies the named open condition; false over the empty set.
   */
  | { kind: 'any-of'; condition: string }
  /**
   * `no <open-condition>` (ratchet E2, 2026-07-12): true iff no entity
   * satisfies the condition; true over the empty set.
   */
  | { kind: 'none-of'; condition: string }
  /**
   * `<subject> must be any <open-condition>` membership (David,
   * 2026-07-12 — P3 decision, a dated addition to the proposal's §3.5
   * contract): the subject satisfies the named open condition (the
   * condition's `it` bound to the subject).
   */
  | { kind: 'satisfies'; subject: IRValue; condition: string }
  /**
   * `client has <capability>` (ADR-216): the live negotiated client
   * capability flag, by its PLATFORM camelCase key. Text-only when no
   * client negotiated.
   */
  | { kind: 'client-has'; capability: string }
  | {
      kind: 'predicate';
      /** 'can-see'/'can-reach' land with Phase B (design.md §2.7). */
      pred: 'is' | 'is-a' | 'is-in' | 'is-here' | 'has' | 'holds' | 'wears' | 'can-see' | 'can-reach';
      negated: boolean;
      subject: IRValue;
      object: IRValue;
    }
  /** A numeric comparison (ADR-264 D3): `left <op> right`. */
  | {
      kind: 'compare';
      op: 'gte' | 'gt' | 'lte' | 'lt' | 'eq';
      left: IRValue;
      right: IRValue;
    }
  /**
   * `<subject> feels <disposition> toward <entity>` (ADR-310 D13) — the
   * subject's disposition toward the target reads as the named word band.
   */
  | { kind: 'feels'; subject: IRValue; disposition: string; target: IRValue }
  /** `<subject> knows <topic>` (ADR-310 D13) — the subject holds the topic. */
  | { kind: 'knows-topic'; subject: IRValue; topic: string };
