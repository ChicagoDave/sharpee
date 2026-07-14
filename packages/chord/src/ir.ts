/**
 * ir.ts — the Story IR wire types (`story language 1`).
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
import type { Span } from './span';

/** Format stamp of this IR schema. Consumers refuse unknown formats. */
export const IR_FORMAT = 'story language 1';

/** Root of a compiled story. */
export interface StoryIR {
  format: typeof IR_FORMAT;
  meta: IRMeta;
  /** The story object's declared phases (ownership package D2). */
  story: { states: string[]; reversible: boolean };
  entities: IREntity[];
  conditions: IRNamedCondition[];
  phrases: IRPhrases;
  verbs: IRVerbDef[];
  hatches: IRHatch[];
  // Phase B (plan phase 3):
  traits: IRTraitDef[];
  actions: IRActionDef[];
  /** Owner-attached score identities (D12) — names are owner-qualified (`pygmy-goats.fed`). */
  scores: IRScoreDef[];
  sequences: IRSequenceDef[];
  /** True when any hatch is declared — the pure-IR profile refuses these (AC-4). */
  hasHatches: boolean;
}

export interface IRMeta {
  title: string;
  author: string;
  /** Raw header fields (id, version, blurb, ...). */
  fields: Record<string, string>;
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
  /** True for the story's player entity (`create the player`). */
  isPlayer: boolean;
  /** Kind-noun compositions (`a room`), in declaration order. */
  kinds: IRComposition[];
  /** Trait-adjective compositions (`scenery`, `dark while …`). */
  traits: IRComposition[];
  placement: IRPlacement | null;
  /** Entity IDs this entity wears at start (player wears the cloak). */
  wears: string[];
  exits: IRExit[];
  blockedExits: IRBlockedExit[];
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
  /** Phrase key of the description in the phrase table, or null. */
  descriptionKey: string | null;
  /**
   * Phrase key of the `first time` (first-visit) description (Z1), or null.
   * Rooms only — the loader binds it to `RoomTrait.initialDescription`.
   */
  initialDescriptionKey: string | null;
  onClauses: IROnClause[];
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
  /** 'name' = multi-word entity-name value (`with food the handful of feed`, Phase B). */
  valueKind: 'number' | 'string' | 'word' | 'name';
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
  span: Span;
}

export interface IRBlockedExit {
  direction: string;
  phraseKey: string;
  /** `is blocked while <cond>` — null = always blocked (grammar log 2026-07-10). */
  condition: IRCondition | null;
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

export interface IRVerbDef {
  verbs: string[];
  pattern: IRPatternPart[];
  span: Span;
}

export type IRPatternPart = { kind: 'word'; word: string } | { kind: 'slot'; word: string };

export interface IRHatch {
  name: string;
  modulePath: string;
  /** Target interface: dynamic-text producer, Action, or CapabilityBehavior. */
  hatchKind: 'text' | 'action' | 'behavior';
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
  constraints: Array<{ slot: string; requirement: string }>;
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
}

export type IRActionRefusal =
  | { kind: 'without'; slot: string; phraseKey: string; span: Span }
  | { kind: 'when'; condition: IRCondition; phraseKey: string; span: Span };

/** `define score <name> worth <n>` — dedup-by-identity award (ADR-129). */
export interface IRScoreDef {
  name: string;
  worth: number;
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

// --------------------------------------------------------------------------
// statements
// --------------------------------------------------------------------------

export type IRStatement =
  | { kind: 'refuse'; phraseKey: string; params: IRParam[]; span: Span }
  | { kind: 'phrase'; phraseKey: string; params: IRParam[]; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'emit'; event: string; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'set'; target: IRValue; value: IRValue; span: Span }
  | { kind: 'change'; entity: IRValue; state: string; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'move'; entity: IRValue; place: IRValue; stmtWhen?: IRCondition | null; span: Span }
  /** `remove <entity>` (Z6, ADR-213 Q3) — out of play via `world.removeEntity`; observers fire. */
  | { kind: 'remove'; entity: IRValue; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'award'; expression: string[]; once: boolean; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'win'; phraseKey: string | null; stmtWhen?: IRCondition | null; span: Span }
  | { kind: 'lose'; phraseKey: string | null; stmtWhen?: IRCondition | null; span: Span }
  /** `must` requirement as a body statement (ratchet D6). */
  | { kind: 'must'; condition: IRCondition; phraseKey: string; span: Span }
  /** `refuse when <cond>: <key>` as a body statement (prohibition, D6). */
  | { kind: 'refuse-when'; condition: IRCondition; phraseKey: string; span: Span }
  | { kind: 'select-on'; subject: IRValue; arms: IRSelectArm[]; span: Span }
  | { kind: 'select-strategy'; strategy: string; alternatives: IRStatement[][]; span: Span }
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
  | {
      kind: 'predicate';
      /** 'can-see'/'can-reach' land with Phase B (design.md §2.7). */
      pred: 'is' | 'is-a' | 'is-in' | 'is-here' | 'has' | 'holds' | 'wears' | 'can-see' | 'can-reach';
      negated: boolean;
      subject: IRValue;
      object: IRValue;
    };
