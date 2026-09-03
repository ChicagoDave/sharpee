/**
 * ir.ts — the Story IR wire types (`story language 3`).
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

/**
 * Format stamp of this IR schema. Consumers refuse unknown formats.
 * `story language 3` (ADR-327, 2026-08-26): `IROnClause.actor` is a new
 * required field and the owner-is-object binding is spelled `object`.
 */
export const IR_FORMAT = 'story language 4';

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
  story: { states: string[]; reversible: boolean; onClauses: IROnClause[]; timerClauses?: IRTimerClause[] };
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
  /**
   * `before the game starts … end before` (ADR-327 D10) — the story's one
   * pre-play block. The loader runs its body at the end of `initializeWorld`,
   * against a fully built world; the role assignment it performs is what
   * `createPlayer` then returns. Null only for a story the analyzer already
   * rejected (`analysis.start-block-missing`), so the loader may treat a null
   * here as a load error rather than a default.
   */
  startBlock: { body: IRStatement[]; span: Span } | null;
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
  /** `define chapters` rows in order (ADR-330 D1), present only under `use chapters`. */
  chapters?: IRChapterDef[];
  /** Named-turn timers (ADR-325 D3), every owner — keyed by `qualified`. */
  timers: IRTimerDef[];
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
   * Named force orderings (ADR-318 D3) — `define temperament` blocks plus
   * the defs the compiler synthesizes for inline orderings and `with`
   * overrides (names carry `@`, unreachable from author kebab words).
   * Additive and optional — absent when the story declares none.
   */
  temperaments?: IRTemperamentDef[];
  /**
   * `define topic … as …` witnessed-act aliases (ADR-318 D12a) — the alias
   * is the minted topic's name everywhere. The namespace is closed (actors
   * × detectable acts); derivation of the default name is runtime-owned.
   * Additive and optional.
   */
  witnessedTopics?: IRWitnessedTopicDef[];
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
  /**
   * `playable` (ADR-327 D10) — this character may hold the player role.
   * Replaces the retired `isPlayer`, which named the block (`create the
   * player`) rather than the character. Who actually *holds* the role is a
   * runtime fact the start block decides, never an IR field: the loader
   * gates `change the player to` on this flag, and gives a `playable`
   * character the carrying capacity the role needs.
   */
  isPlayable: boolean;
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
  /**
   * The region's landing (ADR-325 D5): resolved room ids and how to choose
   * among them (null = a single room). Present only on region-kind
   * entities with a `landing` line; its presence makes the region a place.
   */
  landing?: IRLanding;
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
  /** `when <timer> expires` clauses on this owner (ADR-325 D3e). */
  timerClauses?: IRTimerClause[];
  /** `when <entity> moves` clauses on this owner (ADR-325 D3h). */
  moveClauses?: IRMoveClause[];
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
   * The entity's declared manner block (`define manner for …`, ADR-320
   * D5) — state-conditioned delivery rows in declaration order; absent
   * when no block is declared (a story with no manner blocks compiles
   * byte-identically to one before the construct existed).
   */
  manner?: IRMannerRow[];
  /**
   * The entity's declared boundary block (`define greetings for …`,
   * ADR-320 D4) — scene boundary rows in declaration order; absent when
   * no block is declared.
   */
  greetings?: IRGreetingRow[];
  /**
   * The entity's declared exchange points (`define exchange <key> for …`,
   * ADR-320 D4) — in declaration order; absent when none are declared.
   * Rows are declarative and therefore enumerable: this shape feeds
   * D12's response-affordance wire data directly.
   */
  exchanges?: IRExchange[];
  /**
   * The entity's declared initiative rows (`define initiative for …`,
   * ADR-320 D7) — occasion rows in declaration order; absent when no
   * block is declared.
   */
  initiative?: IRInitiativeRow[];
  /**
   * The entity's declared conversation threads (`define conversation
   * <key> for …`, ADR-320 D14) — in declaration order; absent when none
   * are declared. Beats are declarative and enumerable: the shape feeds
   * D12's thread continuability wire data directly.
   */
  conversations?: IRConversation[];
  /**
   * The declared character model (ADR-310) — present exactly when the
   * `create` block carries at least one character construct (D7: a person
   * with no character line compiles exactly as today, no model attached).
   */
  character?: IRCharacter;
  span: Span;
}

/**
 * One manner row (ADR-320 D5): a lowered condition, the row's beat phrase
 * keys (minted into the phrase table at compile — deterministic from
 * declaration order, so compiles stay byte-identical), and the optional
 * voice word (open vocabulary, carried as data).
 */
export interface IRMannerRow {
  condition: IRCondition;
  /** Owner-scoped phrase keys, one per `beat` line, in declaration order. */
  beatKeys: string[];
  /** The row's `voice` word, if declared. */
  voice?: string;
  span: Span;
}

/**
 * One greeting (boundary) row (ADR-320 D4): the boundary selector and a
 * statement body, the topic-row idiom. Absence and repetition words are
 * kebab-normalized frozen vocabulary.
 */
export interface IRGreetingRow {
  head:
    | { kind: 'first-time' }
    | { kind: 'return'; absence: 'again-so-soon' | 'after-a-while' | 'after-days' | null }
    | { kind: 'asked'; word: 'once' | 'again' | 'many-times' }
    | { kind: 'leaving' };
  body: IRStatement[];
  span: Span;
}

/**
 * One named exchange point (ADR-320 D4): the response set that overlays
 * the owner's topic table while the exchange is open. The opening line
 * lives in the calling row's statements (`then-open`), not here.
 */
export interface IRExchange {
  /** The exchange key (single kebab word), unique per owner. */
  name: string;
  /**
   * The header strength word (ADR-320 D10) — matches `@sharpee/character`'s
   * `ConversationStrength` union exactly; absent = the runtime derives
   * strength from intent.
   */
  strength?: 'passive' | 'assertive' | 'blocking';
  rows: IRExchangeRow[];
  span: Span;
}

/**
 * One exchange response row (ADR-320 D4/D12): what the responder says
 * (`answer`, the topic-key tiers), does (`act`, the event-verb register),
 * or withholds (`silence` — rendered like any response, D8). Input
 * matching no row falls through to the topic table (D16) — fallthrough
 * is the platform's, never authored.
 */
export interface IRExchangeRow {
  head:
    | { kind: 'answer'; filter: { kind: 'entity'; id: string } | { kind: 'text'; primary: string; aliases: string[] } }
    | { kind: 'act'; action: string }
    | { kind: 'silence' };
  body: IRStatement[];
  span: Span;
}

/**
 * One conversation thread (ADR-320 D14): an author-scripted subject the
 * owner carries beat by beat to a defined conclusion, across sittings.
 * The runtime owns the per-pair cursor/status; this shape is the whole
 * authored surface — nothing here may hide behind a computed form (the
 * D12 enumerability discipline).
 */
export interface IRConversation {
  /** The thread key (single kebab word), unique per owner. */
  name: string;
  /**
   * The header strength word (ADR-320 D10/D14) — governs off-thread
   * transitions (blocking = single-topic completion); absent = the
   * runtime derives strength from intent.
   */
  strength?: 'passive' | 'assertive' | 'blocking';
  /**
   * The `about` topic filter (topic-key tiers, the exchange-answer
   * shape); absent when the thread engages only via `opens when`.
   */
  filter?: { kind: 'entity'; id: string } | { kind: 'text'; primary: string; aliases: string[] };
  /** The lowered `opens when` condition; absent = never NPC-opened. */
  opensWhen?: IRCondition;
  /** Ordered beats, declaration order — beat n is `conclusion`, held separately. */
  beats: IRConversationBeat[];
  /** `on parting:` body; absent when unauthored (passive parks silently). */
  onParting?: IRStatement[];
  /** `on resuming:` body; absent when unauthored. */
  onResuming?: IRStatement[];
  /** `on refusing:` body; absent = a blocking refusal re-serves the current beat. */
  onRefusing?: IRStatement[];
  /** The `conclusion:` body — fires once; the thread is then CONCLUDED. */
  conclusion: IRStatement[];
  span: Span;
}

/**
 * One thread beat (ADR-320 D14): an optional hold-gate condition (the
 * beat waits for its world) and a statement body served when the beat
 * advances.
 */
export interface IRConversationBeat {
  /** The `beat, when <condition>` hold-gate; null = always ready. */
  condition: IRCondition | null;
  body: IRStatement[];
  span: Span;
}

/**
 * One initiative row (ADR-320 D7): an authored occasion that forces the
 * seizure when it fires — or suppresses it when the body is the lone
 * `hold-tongue` statement. The occasion kinds mirror the scene runtime's
 * `SceneOccasion` (goal-step deliberately unsurfaced).
 */
export interface IRInitiativeRow {
  occasion:
    | { kind: 'open-floor' }
    | { kind: 'silence' }
    | { kind: 'subject-change' }
    | { kind: 'act'; action: string };
  /** The `, when <condition>` refinement; null = the occasion alone. */
  condition: IRCondition | null;
  body: IRStatement[];
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
  /** `temperament` bindings (ADR-318 D3/D7), in declaration order — at most one live per state (compile-checked). */
  temperaments: IRTemperamentBinding[];
  /** `never …` principle lines (ADR-318 D4) — `code` bundles flattened in, categories in infinitive form. */
  principles: IRPrincipleEntry[];
  /** `protects <scope>` / `answers honestly` lines (ADR-318 D4/D5) — compile to standing goals at load. */
  obligations: IRObligationEntry[];
  /** The `honor` declaration (ADR-318 D7); absent = the character carries no honor force. */
  honor?: IRHonorDecl;
  /** `burdened by <topic>` conscience seeds (ADR-318 D8) — canonical topic strings, each held via `knows`. */
  burdenedBy: string[];
}

/**
 * A scope reference (ADR-310 D9/D10 grammar): everyone, an entity kind by
 * classifier (article `a`/`an`), or a resolved entity. The resists
 * `exceptFrom` idiom, promoted to a shared shape.
 */
export type IRScopeRef =
  | { kind: 'anyone' }
  | { kind: 'classifier'; value: string }
  | { kind: 'entity'; value: string };

/**
 * One principle (ADR-318 D4): a `never` line. The category is the
 * manifest's infinitive spelling (`betray a confidence`), never the
 * third-person surface form. `except.kind` distinguishes the collision
 * carve-out (`to protect <scope>` — yields to the obligation protecting
 * that scope, exp-02's trace) from the object carve-out (`except <scope>`
 * — the act's object in scope is exempt).
 */
export interface IRPrincipleEntry {
  category: string;
  scope?: IRScopeRef;
  except?: { kind: 'object' | 'protect'; scope: IRScopeRef };
  span: Span;
}

/** One obligation (ADR-318 D4/D5): `protects` (scoped) or `answers honestly`. */
export interface IRObligationEntry {
  kind: 'protects' | 'answers honestly';
  scope?: IRScopeRef;
  span: Span;
}

/**
 * The honor declaration (ADR-318 D7): audience scope plus the face-acts
 * it binds on — the full platform six for `honor before <scope>`, the
 * named bundle's subset for `honor <name> before <scope>`. Honor sees the
 * room: it binds on declared audience PRESENCE, never anticipation.
 */
export interface IRHonorDecl {
  scope: IRScopeRef;
  /** `except <entities>` — resolved entity ids (the spreads idiom). */
  except: string[];
  faceActs: string[];
  span: Span;
}

/**
 * A named force ordering (ADR-318 D3). Pairs read `[first, second]` =
 * "first over second"; the arbiter applies them as overrides of the D2
 * intensity default for exactly the pairs they name.
 */
export interface IRTemperamentDef {
  /** The `define temperament` name, or a synthesized `<entity-id>@temperament-<n>` for inline/override forms. */
  name: string;
  pairs: Array<[string, string]>;
  span: Span;
}

/**
 * One witnessed-act topic alias (ADR-318 D12a). `act` is the canonical
 * vocabulary word — a face-act as spelled (`backs down`) or an act
 * category in infinitive form (`lie`).
 */
export interface IRWitnessedTopicDef {
  actor: string;
  act: string;
  alias: string;
  span: Span;
}

/** One temperament binding (ADR-318 D3): static (`while` absent) or bound to an entity state. */
export interface IRTemperamentBinding {
  /** The bound def's name in {@link StoryIR.temperaments}. */
  name: string;
  /** The entity state that makes this binding live; absent = unconditional. */
  while?: string;
  span: Span;
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

/**
 * One goal step (ADR-310 D8) — verbs per ADR-145's step types; entity refs
 * resolved. A `perform` step (ADR-329 D10) is one action the owner performs
 * now, through the execution entry: the action's bare name (the loader
 * qualifies it — a story action or a standard one), the shape that matched,
 * and its slots already sorted into the entry's roles.
 */
export type IRGoalStep =
  | { kind: 'seek'; target: string; in?: string; span: Span }
  | { kind: 'acquire'; target: string; span: Span }
  | { kind: 'wait-for'; condition: IRCondition; span: Span }
  | { kind: 'move-to'; target: string; span: Span }
  | { kind: 'act'; phraseKey: string; span: Span }
  | { kind: 'say'; phraseKey: string; target?: string; span: Span }
  | { kind: 'give'; item: string; target: string; span: Span }
  | { kind: 'drop'; item: string; in?: string; span: Span }
  | { kind: 'perform'; action: string; shape: string; slots: IRPerformSlots; span: Span };

/**
 * The roles of a `perform` step's slots (ADR-329 D10), as the execution entry
 * takes them: entity ids (or the `player` sentinel) for the objects, the
 * canonical direction word for a `going` shape.
 */
export interface IRPerformSlots {
  directObject?: string;
  indirectObject?: string;
  instrument?: string;
  direction?: string;
}

/**
 * An `influence` block (ADR-310 D9), defined on the exerter. Effect axes
 * carry vocabulary words (`focus: 'clouded'`, mood and threat words);
 * `witnessed`/`resisted`/`expired` are the author-written phrase keys
 * (D12 — prose about an event, never a readout of state; `expired` is the
 * opt-in release line, default silent — David's ruling 2026-08-16).
 */
export interface IRInfluenceDef {
  /** Author-invented name — the join key `resists` refers to. */
  name: string;
  mode: string;
  range: string;
  effect: Record<string, string>;
  witnessed?: string;
  resisted?: string;
  expired?: string;
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

/** A region's landing (ADR-325 D5) — see IREntity.landing. */
export interface IRLanding {
  rooms: string[];
  strategy: 'randomly' | 'cycling' | 'stopping' | null;
  span: Span;
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
  /**
   * `, one-way` (ADR-234 D4, GH #327): the loader stamps the written
   * direction only — no reverse exit, and a door on the line has
   * `bidirectional = false`. Present only when declared (absent keeps IR
   * byte-identical).
   */
  oneWay?: true;
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
  /**
   * Who acts (ADR-327 D1): `{kind:'player'}` for the player ROLE — the loader
   * resolves it against `world.getPlayer()` at fire time, never a compile-time
   * entity — or `{kind:'entity'}` for a named character. Null for `self`
   * (the owner acts) and `every-turn`.
   */
  actor: IRValue | null;
  /**
   * How the clause binds: the owner is the action's object (`object`), the
   * named role (`anything as the <role>`), every turn, or `self` — the
   * owner's own action (ADR-327 D1's own-block bare head; before ADR-327 only
   * the player's `going`, ADR-325 D3h), which fires on the action's
   * source-room slot with the owner as the actor.
   */
  binding: 'object' | 'role' | 'every-turn' | 'self';
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
  /**
   * ADR-318 D9: what delivering this line asserts — `(factId, value)`
   * checked against the fact's declared set. The runtime's mint rule keys
   * on it: delivery contradicting the speaker's held belief mints a ledger
   * entry; honest assertion mints nothing. Absent = the line asserts
   * nothing and carries nothing. Additive field.
   */
  claims?: { factId: string; value: string };
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

/**
 * A named-turn timer (ADR-325 D3a). `qualified` is the runtime key:
 * `<owner-ir-id>.<name>` for an entity's or the player's (`player.<name>`),
 * bare `<name>` for the story's. A state's prose, when authored, lives in
 * the phrase table under `<qualified>.<state>`.
 */
/** The moment a chapter begins (ADR-330 D2), resolved: ids are IR entity ids, timers their `qualified` key. */
export type IRChapterTrigger =
  | { kind: 'game-starts' }
  | { kind: 'first-visit'; room: string }
  | { kind: 'timer-expires'; timer: string }
  | { kind: 'becomes'; owner: string; state: string };

/**
 * One chapter (ADR-330 D1/D4): `name` is what conditions say and never
 * prints; `title` and `description` (empty string when the row has none)
 * ride the `story.chapter` packet verbatim; `ordinal` is the row's 0-based
 * position — the chapters' order is declaration order (D3).
 */
export interface IRChapterDef {
  name: string;
  title: string;
  description: string;
  ordinal: number;
  trigger: IRChapterTrigger;
  span: Span;
}

export interface IRTimerDef {
  name: string;
  qualified: string;
  /** The owning entity's IR id (`player` for the player), or null for the story. */
  owner: string | null;
  /** Named turns in order; `expired` follows the last and is never listed. */
  states: string[];
  /** `meanwhile[, one chance in n]` body — each turn the timer is running. */
  meanwhile: { chance: number | null; body: IRStatement[] } | null;
  /** `interrupted one chance in n` — per-turn chance of expiring early. */
  interrupted: number | null;
  span: Span;
}

/** `when <timer> expires [, while <cond>]` (ADR-325 D3e) — on the clause owner. */
export interface IRTimerClause {
  /** The timer's `qualified` key. */
  timer: string;
  condition: IRCondition | null;
  body: IRStatement[];
  span: Span;
}

/**
 * `when <entity> moves [, while <cond>]` (ADR-325 D3h) — on the clause owner.
 * The loader chains the actor-moved event and fires when the event's actor
 * is `mover`'s world entity; `it` in the body is the owner.
 */
export interface IRMoveClause {
  /** The mover — an entity reference or the player. */
  mover: IRValue;
  condition: IRCondition | null;
  body: IRStatement[];
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
  | { kind: 'set'; target: IRValue; value: IRValue; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'change'; entity: IRValue; state: string; stmtWhen?: IRCondition | null; span: Span }
  /**
   * `change the player to <entity>` (ADR-327 D9/D10). Read two ways by the
   * loader, discriminated on `world.getPlayer()`: undefined (inside the
   * start block, before the engine has set a player) assigns the role
   * directly; defined (any turn after load) emits a switch request for the
   * engine to drain at turn end.
   */
  | { kind: 'change-player'; entity: IRValue; stmtWhen?: IRCondition | null; span: Span }
  /** `change mood to <word>` (ADR-310 D3) — the clause's `it` takes the mood. */
  | { kind: 'change-mood'; mood: string; stmtWhen?: IRCondition | null; span: Span }
  /** `change feeling toward <entity> to <disposition>` (ADR-310 D3) — `it` feels differently about the target. */
  | { kind: 'change-feeling'; target: IRValue; disposition: string; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'move'; entity: IRValue; place: IRValue; stmtWhen?: IRCondition | null; span: Span }
  /**
   * `<actor> <verb> …` (ADR-329 D1): one standard or story action performed
   * NOW as `actor` through the engine's execution entry. `action` is the bare
   * name as clause heads carry it (`taking` — story-first at load, else
   * `if.action.<name>`); `shape` is the matched grammar shape (`give :item to
   * :recipient`); `slots` binds each shape slot in order. A `going` shape's
   * literal direction arrives as a `direction` slot with a literal value.
   */
  | { kind: 'act'; actor: IRValue; action: string; shape: string; slots: Array<{ slot: string; value: IRValue }>; stmtWhen?: IRCondition | null; span: Span }
  /** `remove <entity>` (Z6, ADR-213 Q3) — out of play via `world.removeEntity`; observers fire. */
  | { kind: 'remove'; entity: IRValue; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'award'; expression: string[]; once: boolean; stmtWhen?: IRCondition | null; span: Span }
  // ADR-264 D2: `raise`/`lower` a counter by an amount. `owner` is the entity
  // IRValue for a per-entity counter, or null for a story-global one.
  | { kind: 'raise' | 'lower'; counter: string; owner: IRValue | null; amount: number; stmtWhen?: IRCondition | null; span: Span }
  /** `set <tally> to <n>` (ADR-325 D4) — absolute assignment, clamped to the counter's bounds. */
  | { kind: 'set-counter'; counter: string; owner: IRValue | null; value: number; stmtWhen?: IRCondition | null; span: Span }
  /** ADR-325 D3c: a timer verb. `timer` is the timer's `qualified` key. */
  | { kind: 'timer'; verb: 'start' | 'stop' | 'restart' | 'reset' | 'interrupt'; timer: string; stmtWhen?: IRCondition | null; span: Span }
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
  | { kind: 'each'; condition: string; body: IRStatement[]; span: Span }
  /**
   * `then asks|invites <exchange-key>` (ADR-320 D4/D8): open the owner's
   * named exchange. The word is data — the wire may render an invitation
   * differently from a question. Conversation bodies only.
   */
  | { kind: 'then-open'; word: 'asks' | 'invites'; exchange: string; span: Span }
  /**
   * `deflect to <topic>` (ADR-320 D8): the owner redirects to a row of
   * their own topic table — resolved entity id, or the normalized quoted
   * text (empty primary = the entity reference failed to resolve and the
   * miss is already reported).
   */
  | { kind: 'deflect'; target: { kind: 'entity'; id: string } | { kind: 'text'; primary: string }; span: Span }
  /**
   * `leave` (ADR-320 D8): the owner exits the scene — a movement move,
   * world-legality consulted at dispatch, never conversation-only physics.
   */
  | { kind: 'leave'; span: Span }
  /**
   * `hold their tongue` (ADR-320 D7): suppress the seizure the enclosing
   * initiative row would otherwise force. Always a row's only statement.
   */
  | { kind: 'hold-tongue'; span: Span };

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
  /** A timer's current named state (ADR-325 D3d) — `timer` is the `qualified` key. Reads
   *  as the state word while running/stopped, `expired` after, nothing before start. */
  | { kind: 'timer'; timer: string }
  /** A grammar-slot / role context value inside an action or role clause (`the animal`, `the taker`). */
  | { kind: 'slot'; name: string }
  /** The `each`-block binder `the match` (ratchet E3) — parallel to `it`. */
  | { kind: 'match' }
  | { kind: 'symbol'; name: string };

export type IRCondition =
  | { kind: 'and'; operands: IRCondition[] }
  /** ADR-330 D5: the current chapter is (`during`) / has not reached (`before`) / has passed (`after`) the row at `ordinal`. */
  | { kind: 'chapter'; relation: 'during' | 'before' | 'after'; ordinal: number }
  | { kind: 'or'; operands: IRCondition[] }
  | { kind: 'not'; operand: IRCondition }
  | { kind: 'chance'; n: number }
  /** `<timer> has started` / `has expired` (ADR-325 D3d). */
  | { kind: 'timer-has'; timer: string; what: 'started' | 'expired' }
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
  | { kind: 'knows-topic'; subject: IRValue; topic: string }
  /**
   * `<topic> is fresh|recent|stale` (ADR-320 D6) — recency over the
   * holder's ledger turn stamps; the holder is the evaluation context's
   * owner (`it`). The runtime owns the aging curve. Negation wraps in
   * `not`, as everywhere.
   */
  | { kind: 'recency'; topic: string; word: 'fresh' | 'recent' | 'stale' }
  /**
   * `<topic> was discussed` (ADR-320 D9) — per-pair discussed-ness between
   * the evaluation context's owner and the conversation partner, across
   * scenes, any order.
   */
  | { kind: 'discussed'; topic: string }
  /**
   * `asked once|again|many times` (ADR-320 D4) — the current topic's
   * per-pair ask count read as a word; topic and pair come from the
   * evaluation context. The runtime owns the counting.
   */
  | { kind: 'asked'; word: 'once' | 'again' | 'many-times' }
  /**
   * `the subject changes` (ADR-320 D9) — the scene noticed a live thread
   * abandoned this turn; evaluation is the scene runtime's.
   */
  | { kind: 'subject-changes' }
  /**
   * `<thread> is concluded` (ADR-320 D14) — the named conversation
   * thread's conclusion beat has fired between the evaluation context's
   * owner and the conversation partner. Negation wraps in `not`.
   */
  | { kind: 'concluded'; thread: string };
