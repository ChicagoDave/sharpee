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
  span: Span;
}

export type Declaration =
  | CreateDecl
  | DefineCondition
  | DefinePhrase
  | DefinePhrases
  | DefineVerb
  | DefineText
  | DefineFlag
  | WhenRule;

/** A raw (unresolved) name reference: optional article + word sequence. */
export interface NameRef {
  kind: 'name';
  /** Leading article if present (`the`, `a`, `an`) — resolution strips it. */
  article: string | null;
  /** Name words in source order, joined by single spaces. */
  words: string[];
  span: Span;
}

/** Prose or quoted text; `{…}` markers extracted but not validated (parser stage). */
export interface TextValue {
  kind: 'text';
  /** 'quoted' = "..." on the declaration line; 'prose' = indented bare block. */
  form: 'quoted' | 'prose';
  /** The text with original inter-line whitespace collapsed to single spaces. */
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

/** One `with` setting: trailing number/string value, preceding words are the key. */
export interface ConfigSetting {
  key: string[];
  value: string;
  valueKind: 'number' | 'string' | 'word';
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

/** `on <action> it … end on` behavior clause inside a create block. */
export interface OnClause {
  kind: 'on-clause';
  /** The action word as written (gerund), e.g. `reading`. */
  action: string;
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

/** `define phrase <key>[, <strategy>] … end phrase` or single-line quoted form. */
export interface DefinePhrase {
  kind: 'define-phrase';
  key: string;
  /** randomly | cycling | ordered | once — null for a plain phrase. */
  strategy: string | null;
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

/** `define flag <name> starts <value>` */
export interface DefineFlag {
  kind: 'define-flag';
  name: string;
  initial: string;
  span: Span;
}

// --------------------------------------------------------------------------
// when
// --------------------------------------------------------------------------

/** `when <event-header> [while <condition>] … end when` */
export interface WhenRule {
  kind: 'when-rule';
  /**
   * Unsegmented event-header words (`the player enters the Foyer Bar`).
   * The analyzer segments actor/verb/target against the event-selector map.
   */
  headerWords: string[];
  headerSpan: Span;
  /** The `while` qualifier, if present. */
  condition: ConditionNode | null;
  body: Statement[];
  span: Span;
}

// --------------------------------------------------------------------------
// statements
// --------------------------------------------------------------------------

export type Statement =
  | RefuseStmt
  | PhraseStmt
  | EmitStmt
  | SetStmt
  | ChangeStmt
  | MoveStmt
  | AwardStmt
  | WinStmt
  | LoseStmt
  | IfStmt
  | SelectOnStmt
  | SelectStrategyStmt
  | OrdinalBlock;

/** `refuse <phrase-key> [with <param> = <value>]…` */
export interface RefuseStmt {
  kind: 'refuse';
  phraseKey: string;
  params: ParamBinding[];
  span: Span;
}

/** `phrase <phrase-key> [with <param> = <value>]…` (semantic emission, given 6b). */
export interface PhraseStmt {
  kind: 'phrase';
  phraseKey: string;
  params: ParamBinding[];
  span: Span;
}

/** `with <param> = <value>` binding for refuse/phrase. */
export interface ParamBinding {
  param: string[];
  value: ValueExpr;
  span: Span;
}

/** `emit <event-words>` */
export interface EmitStmt {
  kind: 'emit';
  event: string[];
  span: Span;
}

/** `set <field-path> to <value>` */
export interface SetStmt {
  kind: 'set';
  target: ValueExpr;
  value: ValueExpr;
  span: Span;
}

/** `change <entity> to <state>` — explicit state transition. */
export interface ChangeStmt {
  kind: 'change';
  entity: NameRef;
  state: string;
  span: Span;
}

/** `move <entity> to <place>` */
export interface MoveStmt {
  kind: 'move';
  entity: NameRef;
  place: NameRef;
  span: Span;
}

/** `award <quantity-words> [, once]` */
export interface AwardStmt {
  kind: 'award';
  expression: string[];
  once: boolean;
  span: Span;
}

/** `win [<phrase-key>]` */
export interface WinStmt {
  kind: 'win';
  phraseKey: string | null;
  span: Span;
}

/** `lose [<phrase-key>]` */
export interface LoseStmt {
  kind: 'lose';
  phraseKey: string | null;
  span: Span;
}

/** `if <condition> then … [else …] end if` */
export interface IfStmt {
  kind: 'if';
  condition: ConditionNode;
  then: Statement[];
  else: Statement[] | null;
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

export type ConditionNode = OrNode | AndNode | NotNode | PredicateNode | ChanceNode | NamedConditionRef;

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
  | { kind: 'wears'; thing: NameRef; span: Span };

/**
 * A value position: a name reference, possessive chain, literal, or bare word.
 * `its state` parses as possessive with subject `it`.
 */
export type ValueExpr =
  | { kind: 'ref'; ref: NameRef; span: Span }
  | { kind: 'possessive'; base: ValueExpr; field: string[]; span: Span }
  | { kind: 'literal'; value: string; literalKind: 'number' | 'string'; span: Span }
  | { kind: 'bare'; words: string[]; span: Span };
