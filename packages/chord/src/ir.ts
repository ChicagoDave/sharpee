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
  entities: IREntity[];
  conditions: IRNamedCondition[];
  phrases: IRPhrases;
  verbs: IRVerbDef[];
  hatches: IRHatch[];
  flags: IRFlagDef[];
  rules: IRRule[];
  // Phase B (plan phase 3):
  traits: IRTraitDef[];
  actions: IRActionDef[];
  scores: IRScoreDef[];
  onceRules: IROnceRule[];
  everyRules: IREveryRule[];
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
  /** Ordered state names (`states: intact, trampled, obliterated`). */
  states: string[];
  /** Phrase key of the description in the phrase table, or null. */
  descriptionKey: string | null;
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
  /** Choice strategy for multi-variant phrases, or null for a single text. */
  strategy: 'randomly' | 'cycling' | 'ordered' | 'once' | null;
  /**
   * Whitespace-preserving text (`define phrase X, verbatim`, grammar log
   * 2026-07-10) — the loader must exempt it from whitespace collapse.
   * Present only when true (additive field; format stamp unchanged).
   */
  verbatim?: boolean;
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

/** `define trait` — data fields + behavior clauses (phrases fold into the table). */
export interface IRTraitDef {
  name: string;
  data: IRTraitField[];
  onClauses: IROnClause[];
  span: Span;
}

export interface IRTraitField {
  /** Field name words joined with a space (`body part`). */
  name: string;
  type: 'flag' | 'entity' | 'number' | 'name' | 'one-of';
  optional: boolean;
  initial: string | null;
  oneOf: string[] | null;
}

/** `define action` — grammar, scope constraints, refusal ladder, body. */
export interface IRActionDef {
  name: string;
  patterns: IRActionPattern[];
  constraints: Array<{ slot: string; requirement: string }>;
  refusals: IRActionRefusal[];
  /** Dispatch-miss phrase key (`otherwise refuse …`), or null. */
  otherwise: string | null;
  body: IRStatement[];
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

/** `once <cond> …` — fires once, then retires. */
export interface IROnceRule {
  condition: IRCondition;
  body: IRStatement[];
  span: Span;
}

/** `every <n> turns [, <m> times] …` — recurring daemon. */
export interface IREveryRule {
  turns: number;
  times: number | null;
  body: IRStatement[];
  span: Span;
}

/** `define sequence <name>` — chained-fuse timeline. */
export interface IRSequenceDef {
  /** Name words joined with a space (`closing time`). */
  name: string;
  steps: Array<{ timing: 'at-turn' | 'later'; turns: number; body: IRStatement[]; span: Span }>;
  span: Span;
}

export interface IRFlagDef {
  name: string;
  initial: string;
  span: Span;
}

// --------------------------------------------------------------------------
// rules
// --------------------------------------------------------------------------

/** A `when` rule with its event header segmented and resolved. */
export interface IRRule {
  /** The acting entity (`player` for the player). */
  actor: IRValue;
  /** Event verb: curated set (`enters`) or derived from a `define action` name (`pets`). */
  verb: string;
  /** The declared action this verb derives from, when it does (Phase B). */
  actionName: string | null;
  /** Event target: a specific entity, anything, or an open-condition selection. */
  target: IRRuleTarget;
  condition: IRCondition | null;
  body: IRStatement[];
  span: Span;
}

export type IRRuleTarget =
  | { kind: 'entity'; id: string }
  | { kind: 'anything' }
  /** `any <open-condition>` (grammar log 2026-07-11). */
  | { kind: 'any-condition'; name: string };

// --------------------------------------------------------------------------
// statements
// --------------------------------------------------------------------------

export type IRStatement =
  | { kind: 'refuse'; phraseKey: string; params: IRParam[]; span: Span }
  | { kind: 'phrase'; phraseKey: string; params: IRParam[]; span: Span }
  | { kind: 'emit'; event: string; span: Span }
  | { kind: 'set'; target: IRValue; value: IRValue; span: Span }
  | { kind: 'change'; entity: IRValue; state: string; span: Span }
  | { kind: 'move'; entity: IRValue; place: IRValue; span: Span }
  | { kind: 'award'; expression: string[]; once: boolean; span: Span }
  | { kind: 'win'; phraseKey: string | null; span: Span }
  | { kind: 'lose'; phraseKey: string | null; span: Span }
  | { kind: 'if'; condition: IRCondition; then: IRStatement[]; else: IRStatement[] | null; span: Span }
  | { kind: 'select-on'; subject: IRValue; arms: IRSelectArm[]; span: Span }
  | { kind: 'select-strategy'; strategy: string; alternatives: IRStatement[][]; span: Span }
  | { kind: 'ordinal'; ordinal: number; body: IRStatement[]; span: Span };

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
  | { kind: 'field'; base: IRValue; field: string }
  /** A grammar-slot / role context value inside an action or role clause (`the animal`, `the taker`). */
  | { kind: 'slot'; name: string }
  /** A declared story flag (`set after-hours to true`). */
  | { kind: 'flag'; name: string }
  | { kind: 'symbol'; name: string };

export type IRCondition =
  | { kind: 'and'; operands: IRCondition[] }
  | { kind: 'or'; operands: IRCondition[] }
  | { kind: 'not'; operand: IRCondition }
  | { kind: 'chance'; n: number }
  | { kind: 'condition'; name: string }
  /** A declared flag read as a truth test (`while not after-hours`). */
  | { kind: 'flag'; name: string }
  | {
      kind: 'predicate';
      /** 'can-see'/'can-reach' land with Phase B (design.md §2.7). */
      pred: 'is' | 'is-a' | 'is-in' | 'has' | 'holds' | 'wears' | 'can-see' | 'can-reach';
      negated: boolean;
      subject: IRValue;
      object: IRValue;
    };
