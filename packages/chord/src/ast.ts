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
import type { Span } from './span';

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
  | DefineSequence;
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
  /** Kind-noun and trait-adjective composition items. */
  compositions: CompositionItem[];
  /** `in <place>` / `on <place>` / `starts in <place>`. */
  placement: Placement | null;
  /** `wears <thing>` lines (the player wears the cloak). */
  wears: NameRef[];
  exits: ExitDecl[];
  blockedExits: BlockedExitDecl[];
  /** `states: a, b, c` — ordered. */
  states: StateName[];
  /** `states, reversible:` — declared back-transitions allowed (D4). */
  statesReversible: boolean;
  /** `score <name> worth N` lines — entity-owned scores (D12). */
  scores: ScoreDecl[];
  /** First bare indented paragraph. */
  description: TextValue | null;
  /** Per-entity phrase overrides: `phrase <key>: <text>` lines. */
  phraseOverrides: PhraseOverride[];
  onClauses: OnClause[];
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
 * multi-word entity name (`valueKind: 'name'`, article stripped).
 */
export interface ConfigSetting {
  key: string[];
  value: string;
  valueKind: 'number' | 'string' | 'word' | 'name';
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

export interface StateName {
  name: string;
  span: Span;
}

/** `phrase <key>: <text>` inside a create block (entity-scoped override). */
export interface PhraseOverride {
  kind: 'phrase-override';
  key: string;
  value: TextValue;
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

/** `define phrase <key>[, <strategy>|, verbatim] … end phrase`. */
export interface DefinePhrase {
  kind: 'define-phrase';
  key: string;
  /** randomly | cycling | ordered | once — null for a plain phrase. */
  strategy: string | null;
  /** Whitespace-preserving text (grammar log 2026-07-10); excludes strategies. */
  verbatim: boolean;
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

/** `define action X from "./mod.ts"` / `define behavior X from "./mod.ts"` — TS hatches. */
export interface DefineHatch {
  kind: 'define-hatch';
  hatchKind: 'action' | 'behavior';
  name: string;
  modulePath: string;
  span: Span;
}

// `define score` (top-level), `once <cond>` rules, and `every N turns`
// rules were removed (ownership package, ratchet 2026-07-11) — scores
// attach to owners (ScoreDecl); once/every become owner clause modifiers
// and story-owned schedules.

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
  | SetStmt
  | ChangeStmt
  | MoveStmt
  | AwardStmt
  | WinStmt
  | LoseStmt
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

/** `emit <event-words> [when <cond>]` */
export interface EmitStmt {
  kind: 'emit';
  event: string[];
  stmtWhen: ConditionNode | null;
  span: Span;
}

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
  | NoneOfNode;

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
  | { kind: 'holds'; thing: NameRef; span: Span }
  | { kind: 'has'; thing: NameRef; span: Span }
  | { kind: 'wears'; thing: NameRef; span: Span }
  /** `can see <thing>` / `can reach <thing>` (design.md §2.7; Phase B). */
  | { kind: 'can'; ability: string; thing: NameRef; span: Span };

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
