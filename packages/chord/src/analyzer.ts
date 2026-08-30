/**
 * analyzer.ts — Chord semantic analysis: two-pass resolution, the load-time
 * gates, and Story IR construction (design.md §5.2/§5.3).
 *
 * Pass 1 collects declarations (entities + aliases + states, phrases per
 * locale, named conditions, hatches, flags). Pass 2 resolves every
 * reference with article stripping and builds the IR, reporting the AC-3
 * gate classes as errors with `.story` spans:
 *   missing phrase key · unknown predicate value (nearest-valid suggestion)
 *   · undeclared state · ambiguous entity reference (rename suggestion)
 *   · refusal after mutation (phase-order rule) · unbound `{…}` marker.
 *
 * Public interface: analyze().
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 *
 * Invariants:
 * - Ambiguity is an error with a suggestion, never a guess.
 * - The returned IR is pure JSON data (round-trips through JSON.stringify).
 * - Diagnostics gate the load (atomic): callers must check hasErrors().
 */
import {
  ActStmt,
  ActionPattern,
  CompositionItem,
  ConditionNode,
  CreateDecl,
  StartBlockDecl,
  CounterDecl,
  DefineCounter,
  DefineAction,
  DefineChannel,
  ChannelReturn,
  DefineCondition,
  DefineMachine,
  DefinePhrase,
  DefinePhrasebook,
  DefinePhrases,
  OverrideMessage,
  OverrideMessages,
  DefineFact,
  DefineTemperament,
  DefineCode,
  ForcePairDecl,
  NeverDecl,
  ObligationLineDecl,
  ScopeRefDecl,
  DefineHonor,
  ClaimsTagDecl,
  DefineWitnessedTopic,
  DefineMood,
  DefinePersonality,
  DefineProfile,
  DefinePronouns,
  DefineTrait,
  EmitField,
  EmitValue,
  ExtendAction,
  GoalStepDecl,
  RemoveFromAction,
  MachineTransition,
  MediaStmt,
  NameRef,
  PlaceExpr,
  OnClause,
  DefineTimer,
  DefineChapters,
  ChapterTrigger,
  TimerClause,
  MoveClause,
  KillStmt,
  LandingDecl,
  PatternPart,
  StateName,
  Statement,
  StoryFile,
  TextValue,
  TraitField,
  UsePhrasebookDecl,
  ValueExpr,
} from './ast.js';
import { capabilityKeyOf, CLIENT_CAPABILITY_FLAGS, EVENT_VERBS, KIND_NOUNS, MESSAGE_OVERRIDE_ALIASES, PLATFORM_STATE_PAIRS, PRONOUN_CASES, PRONOUN_WORDS, SCOPE_REQUIREMENT_PREDICATES, STARTS_STATE_PAIRINGS, STATE_ADJECTIVES, STDLIB_CHAIN_NAMES, TRAIT_ADJECTIVES } from './catalog.js';
import { STDLIB_MANIFEST } from './stdlib-manifest.js';
import { CHARACTER_MANIFEST } from './character-manifest.js';
import { buildSingleValuedAxes, provablyDisjoint, type SingleValuedAxes } from './condition-disjoint.js';
import type { ScopeRequirementWord } from './catalog.js';
import { EXTENSION_MANIFESTS, manifestForAdjective } from './manifests/index.js';
import { PHRASEBOOK_REGISTRY } from './phrasebooks.js';
import { DiagnosticBag } from './diagnostics.js';
import { CHORD_LANGUAGE_VERSION } from './version.js';
import {
  IR_FORMAT,
  IRActionDef,
  IRCondition,
  IREntity,
  IRExit,
  IRDataChannelDef,
  IRChannelReturn,
  IRChannelRecordMember,
  IRChannelDef,
  IRPronounSetDef,
  IREmitField,
  IREmitValue,
  IRMachineDef,
  IRMachineTransition,
  IROnClause,
  IRPatternPart,
  IRPhrase,
  IRRankDef,
  IRHungerDef,
  IRMeterRung,
  IRCounterDef,
  IRTimerDef,
  IRChapterDef,
  IRChapterTrigger,
  IRTimerClause,
  IRMoveClause,
  IRLanding,
  IRCounterDecl,
  IRGrammarExtension,
  IRGrammarRemoval,
  IRScoreDef,
  IRStatement,
  IRFactDef,
  IRFeelsEntry,
  IRGoalDef,
  IRGoalStep,
  IRPerformSlots,
  IRInfluenceDef,
  IRKnowsEntry,
  IRPersonalityEntry,
  IRPhrasebook,
  IRResistsEntry,
  IRSpreads,
  IRTemperamentDef,
  IRTemperamentBinding,
  IRPrincipleEntry,
  IRObligationEntry,
  IRScopeRef,
  IRHonorDecl,
  IRWitnessedTopicDef,
  IRThinksEntry,
  IRTopicRow,
  IRMannerRow,
  IRGreetingRow,
  IRExchange,
  IRExchangeRow,
  IRInitiativeRow,
  IRConversation,
  IRConversationBeat,
  IRTraitDef,
  IRValue,
  IRStoryFields,
  StoryIR,
} from './ir.js';
import { mergeSpans, Span, spanOf } from './span.js';

/**
 * The `story` block's opening keyword. Its length is how far a header-level
 * diagnostic underlines: a field missing from the block has no span of its own,
 * so the block's opening token is the honest target.
 */
const STORY_KEYWORD = 'story';

/** AST pattern part → IR: span dropped; `optional` present only when written `[…]` (ADR-267 D9). */
function lowerPatternPart(part: PatternPart): IRPatternPart {
  const base: IRPatternPart =
    part.kind === 'alt' ? { kind: 'alt', words: part.words } : { kind: part.kind, word: part.word };
  return part.optional ? { ...base, optional: true } : base;
}

/** Phase A stories register text in this locale (design.md §2.6). */
const DEFAULT_LOCALE = 'en-US';

/**
 * Kebab-case a quoted author string into a story key (ADR-254).
 *
 * Used to derive a rank's id from its name, so a rank is addressable in
 * diagnostics and in `if.event.band_crossed` without the author declaring one.
 */
function kebabId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Exit-direction opposites (parser DIRECTIONS vocabulary) — the same
 * inference every plain exit line performs platform-side; here it backs
 * the door mirror-line check (ADR-234 D2/D3, `checkDoors`).
 */
const OPPOSITE_DIRECTION: Record<string, string> = {
  north: 'south', south: 'north', east: 'west', west: 'east',
  northeast: 'southwest', southwest: 'northeast',
  northwest: 'southeast', southeast: 'northwest',
  up: 'down', down: 'up',
};
/**
 * The phrase key an inline `kill the player` body registers under (ADR-325
 * D3i): source-position keyed, so two inline deaths never collide and the
 * key is derivable from the statement alone in both the collection and
 * lowering passes.
 */
function inlineKillKey(stmt: KillStmt): string {
  return `death-at-${stmt.span.line}-${stmt.span.column}`;
}

const PLAYER_WORDS = new Set(['player', 'you', 'yourself']);

/** Reserved-name gate text (David, 2026-07-12 — each package P3). */
const RESERVED_MATCH_MESSAGE =
  '`match` is reserved for the `each`-block binder `the match` (ratchet E3) — pick another name.';

/**
 * Z3/Z3b reserved channel keys — entity-owned, platform-PULLED phrase
 * surfaces (occupant lifecycle family + examine detail). Bare declarations
 * and `phrase`-statement pushes are load errors; the entity `phrase <key>:`
 * block is the one authoring surface.
 */
const RESERVED_CHANNEL_KEYS = new Set(['present', 'entered', 'exited', 'disappeared', 'detail']);

/**
 * Image layers the platform pre-registers (`image:background|main|
 * overlay`, stdlib MEDIA_CHANNELS) — implied like the `main` ambient
 * bed; `define layer` covers only layers beyond these (ADR-241 D3).
 */
const IMPLIED_IMAGE_LAYERS = new Set(['background', 'main', 'overlay']);

/** Ring 1 of the boolean-state gate (D9): literal booleans as state names. */
const BOOLEAN_STATE_WORDS = new Set(['true', 'false', 'yes', 'no']);

/**
 * ADR-239 D4 topic normalization — ONE implementation for both halves of
 * the lookup contract: the analyzer's overlap gates here, and the
 * story-loader's runtime table lookup (which imports this). Rules:
 * case-insensitive, leading article stripped, whitespace collapsed.
 * Whole-topic equality only; never substring matching.
 */
export function normalizeTopic(text: string): string {
  const words = text.trim().toLowerCase().split(/\s+/);
  if (words.length > 1 && (words[0] === 'the' || words[0] === 'a' || words[0] === 'an')) words.shift();
  return words.join(' ');
}

/**
 * Negation prefixes/suffix for ring 3 of the boolean-state gate (D9):
 * `not-`/`un-`/`non-` (hyphenated or fused), `no-` (hyphenated only — bare
 * `no` false-positives on words like `noon`), shared-stem prefixes
 * (`active`/`inactive`), and the `-less` suffix.
 */
const NEGATION_PREFIXES = ['not-', 'not', 'un-', 'un', 'non-', 'non', 'no-', 'in', 'im', 'dis'];

/** True when `candidate` is a negation-shaped form of `base` (D9 ring 3). */
function isNegationOf(candidate: string, base: string): boolean {
  if (base.length < 2) return false;
  for (const prefix of NEGATION_PREFIXES) {
    if (candidate === prefix + base) return true;
  }
  return candidate === `${base}-less` || candidate === `${base}less`;
}

/**
 * Span-free structural fingerprint of a condition, for the duplicate-clause
 * gate's per-condition event-clause key. Same shape → same string.
 */
function conditionFingerprint(cond: ConditionNode): string {
  const placeKey = (pl: PlaceExpr): string => {
    switch (pl.kind) {
      case 'name':
        return pl.ref.words.join(' ').toLowerCase();
      case 'location':
        return `loc:${value(pl.owner)}`;
      case 'here':
      case 'offstage':
      case 'adjacent-room':
        return pl.kind;
    }
  };
  const value = (v: ValueExpr): string => {
    switch (v.kind) {
      case 'literal':
        return `lit:${v.value}`;
      case 'ref':
        return `ref:${v.ref.words.join(' ').toLowerCase()}`;
      case 'bare':
        return `bare:${v.words.join(' ').toLowerCase()}`;
      case 'possessive':
        return `poss:${value(v.base)}.${v.field.join(' ').toLowerCase()}`;
      case 'match':
        return 'match';
    }
  };
  switch (cond.kind) {
    case 'or':
    case 'and':
      return `${cond.kind}(${cond.operands.map(conditionFingerprint).join(',')})`;
    case 'not':
      return `not(${conditionFingerprint(cond.operand)})`;
    case 'chance':
      return `chance:${cond.n}`;
    case 'chapter':
      return `chapter:${cond.relation}:${cond.name}`;
    case 'client-has':
      return `client-has:${cond.capability}`;
    case 'condition-ref':
      return `cond:${cond.name}`;
    case 'any-of':
    case 'none-of':
      return `${cond.kind}:${cond.condition}`;
    case 'subject-changes':
      return 'subject-changes';
    case 'asked':
      return `asked:${cond.word}`;
    case 'predicate': {
      const p = cond.predicate;
      switch (p.kind) {
        case 'is':
          return `is${p.negated ? '!' : ''}(${value(cond.subject)},${value(p.value)})`;
        case 'compare':
          return `cmp:${p.op}(${value(cond.subject)},${value(p.value)})`;
        case 'is-a':
          return `is-a${p.negated ? '!' : ''}(${value(cond.subject)},${p.classifier.join(' ').toLowerCase()})`;
        case 'is-in':
          return `is-in${p.negated ? '!' : ''}(${value(cond.subject)},${placeKey(p.place)})`;
        case 'is-here':
          return `is-here${p.negated ? '!' : ''}(${value(cond.subject)})`;
        case 'timer-has':
          return `timer-has-${p.what}${p.negated ? '!' : ''}(${value(cond.subject)})`;
        case 'has':
        case 'holds':
        case 'wears':
          return `${p.kind}(${value(cond.subject)},${p.thing.words.join(' ').toLowerCase()})`;
        case 'can':
          return `can-${p.ability}(${value(cond.subject)},${p.thing.words.join(' ').toLowerCase()})`;
        case 'feels':
          return `feels(${value(cond.subject)},${p.disposition},${p.target.words.join(' ').toLowerCase()})`;
        case 'knows':
          return `knows(${value(cond.subject)},${p.topic.words.join(' ').toLowerCase()})`;
        case 'is-any':
          return `is-any(${value(cond.subject)},${p.condition})`;
        case 'recency':
          return `recency${p.negated ? '!' : ''}(${value(cond.subject)},${p.word})`;
        case 'was-discussed':
          return `was-discussed(${value(cond.subject)})`;
        case 'concluded':
          return `concluded${p.negated ? '!' : ''}(${value(cond.subject)})`;
      }
    }
  }
}

/**
 * Curated role vocabulary for standard-semantics actions (design.md §2.2:
 * roles are declared by the action). Grows with the event-selector map.
 */
const STANDARD_ACTION_ROLES: Record<string, string[]> = {
  taking: ['taker', 'item'],
};

/**
 * Reference scope for statement/condition resolution. `owner` binds `it`
 * (entity-scoped clauses); `fields` are the enclosing trait's data fields
 * (Phase B); `slots` are grammar-slot / role context values.
 */
interface Scope {
  owner: EntitySymbol | null;
  fields: Map<string, TraitField> | null;
  slots: Set<string> | null;
  /** Trait-declared states visible on `it` in trait scope (ratchet D8). */
  ownStates: string[] | null;
  /**
   * ADR-327 D2/D8: `it`/`its` are a carrier word here — the block has no
   * name for its subject. True inside a `define trait` body (the carrying
   * entity) and a `define condition` (the quantified subject of an open
   * condition). Everywhere else `it`/`its` are `analysis.it-removed`.
   */
  carrierIt?: boolean;
  /** Score-owner key for `award` resolution (entity id, `trait.<t>`, `action.<a>`; null = story). */
  scoreOwner: string | null;
  /** Inside an `each` block body — the `the match` binder is in scope (E3). */
  inEach: boolean;
  /**
   * A story-owned clause body (ADR-236 D7): `it`/`its` has no entity
   * referent — referencing it is `analysis.story-clause-it`, the
   * unbound-referent gate this scope makes reachable.
   */
  storyOwned?: boolean;
  /**
   * ADR-275 D4: semantic keys in scope (directions `direction`, `means`
   * keys) → the word set each can statically hold (directions canonicals /
   * collected means values). `is <word>` against one validates against
   * this set instead of the state/trait vocabulary.
   */
  semanticValues?: Map<string, string[]>;
}

const TOP_SCOPE: Scope = { owner: null, fields: null, slots: null, ownStates: null, scoreOwner: null, inEach: false };

/** Scope of a story-owned clause (ADR-236 D7): no owner, `it` unbound. */
const STORY_SCOPE: Scope = { ...TOP_SCOPE, storyOwned: true };

function entityScope(owner: EntitySymbol | null): Scope {
  return { owner, fields: null, slots: null, ownStates: null, scoreOwner: owner?.id ?? null, inEach: false };
}

/** True when the scope binds `it` (entity clause or trait clause). */
function scopeHasIt(scope: Scope): boolean {
  return scope.owner !== null || scope.fields !== null;
}

/**
 * Can this entity act (ADR-327 D1)? A `a person` block — the block kind whose
 * owner can be a clause head's subject.
 */
function isActorSymbol(sym: EntitySymbol): boolean {
  // ADR-327 D10 removed the player block, so `a person` is the whole rule —
  // the role-holder is one of these characters, chosen at run time.
  return isPersonDecl(sym.decl);
}

/** The entity's name as the author wrote it (`the Grocery Stall`), for fix-its. */
function entityDisplayName(sym: EntitySymbol): string {
  const n = sym.decl.name;
  return [n.article, ...n.words].filter((w): w is string => !!w).join(' ');
}

/** A value expression's words as written, for quoting heads in diagnostics. */
function valueExprText(expr: ValueExpr): string {
  switch (expr.kind) {
    case 'ref':
      return [expr.ref.article, ...expr.ref.words].filter((w): w is string => !!w).join(' ');
    case 'bare':
      return expr.words.join(' ');
    case 'literal':
      return expr.value;
    case 'possessive':
      return `${valueExprText(expr.base)}'s ${expr.field.join(' ')}`;
    case 'match':
      return 'the match';
  }
}

// The when-header verb-derivation table (petting → pets) died with floating
// `when` rules (ownership package, ratchet 2026-07-11) — event clauses use
// the same gerund register as every other on/after clause.

/** True when a name reference is the word `it`. */
function nameIsIt(ref: NameRef): boolean {
  return ref.words.length === 1 && ref.words[0].toLowerCase() === 'it';
}

/**
 * OPEN/CLOSED classification (grammar log 2026-07-11): a condition that
 * references `it`/`its` is a selection criterion over entities.
 */
function conditionReferencesIt(cond: ConditionNode): boolean {
  const visitValue = (v: ValueExpr): boolean => {
    switch (v.kind) {
      case 'ref':
        return nameIsIt(v.ref);
      case 'bare':
        return v.words.length === 1 && ['it', 'its'].includes(v.words[0].toLowerCase());
      case 'possessive':
        return visitValue(v.base);
      case 'literal':
        return false;
      case 'match':
        // The `each`-block binder is its own binding — not `it` (E3).
        return false;
    }
  };
  switch (cond.kind) {
    case 'or':
    case 'and':
      return cond.operands.some(conditionReferencesIt);
    case 'not':
      return conditionReferencesIt(cond.operand);
    case 'chance':
    case 'condition-ref':
    case 'client-has':
    case 'chapter':
      return false;
    case 'any-of':
    case 'none-of':
      // Quantifiers test the world, not the clause owner — no `it` here.
      return false;
    case 'subject-changes':
    case 'asked':
      // ADR-320 scene reads — the owner comes from the evaluation context,
      // never from an `it` in the condition text.
      return false;
    case 'predicate': {
      if (visitValue(cond.subject)) return true;
      const p = cond.predicate;
      switch (p.kind) {
        case 'is':
          return visitValue(p.value);
        case 'compare':
          return visitValue(p.value);
        case 'is-in':
          return p.place.kind === 'name' ? nameIsIt(p.place.ref)
            : p.place.kind === 'location' ? visitValue(p.place.owner)
            : false;
        case 'has':
        case 'holds':
        case 'wears':
        case 'can':
          return nameIsIt(p.thing);
        case 'feels':
          // D13: the target can be `it` (`the Colonel feels wary of it`).
          return nameIsIt(p.target);
        case 'knows':
          return nameIsIt(p.topic);
        case 'is-a':
        // `is here` has no object node — the subject was already visited above.
        case 'is-here':
        case 'timer-has':
        // The membership form's condition selects its own entities — the
        // subject was already visited above (E1/P3).
        case 'is-any':
        // ADR-320: the subject is a TOPIC (or a D14 thread key), visited
        // above only for form's sake — a topic is never `it`.
        case 'recency':
        case 'was-discussed':
        case 'concluded':
          return false;
      }
    }
  }
}

/**
 * Analyze a parsed story and build its IR.
 * @param ast parser output (may be partial when parse errors occurred)
 * @param diagnostics receives load-time gate errors
 * @returns the IR — meaningful only when diagnostics has no errors (atomic load)
 */
export function analyze(ast: StoryFile, diagnostics: DiagnosticBag): StoryIR {
  return new Analyzer(ast, diagnostics).run();
}

/**
 * `a person` composed on a create block — the ADR-327 D10 eligibility floor
 * for holding the player role.
 */
function isPersonDecl(decl: CreateDecl): boolean {
  return decl.compositions.some((c) => c.article && c.words.join(' ').toLowerCase() === 'person');
}

/**
 * `playable` composed on a create block (ADR-327 D10) — a bare, single-word
 * composition matched ahead of profile/personality/trait routing, so the word
 * never reaches parser vocabulary or the unknown-trait census gate.
 */
function isPlayableDecl(decl: CreateDecl): boolean {
  return decl.compositions.some(
    (c) => !c.article && c.words.length === 1 && c.words[0].toLowerCase() === 'playable',
  );
}

interface EntitySymbol {
  id: string;
  nameLower: string;
  nameWords: string[];
  aka: string[];
  states: string[];
  /** Where each merged state was declared: 'own' or the composing trait's name (D8 collision gate). */
  stateSource: Map<string, string>;
  /** The entity's own `states:` line permits back-transitions (D4). */
  ownReversible: boolean;
  decl: CreateDecl;
}

/** A declared state set with its forward-march policy (D4). */
interface StateSetInfo {
  states: string[];
  reversible: boolean;
}

/**
 * Every namespace that admits one declaration per name (ADR-289 D5).
 *
 * The list is the point. The rule was implemented seven times, each slightly
 * differently, and two constructs — `define action` and `define trait` — were
 * simply missed, which nothing could reveal because there was nowhere for a
 * row to be absent from. A construct that forgets its gate is now a missing
 * entry here rather than an omission nobody notices.
 *
 * Each value is the noun the diagnostic uses; the article is derived.
 */
const UNIQUE_NAMESPACES = [
  'action',
  'ambient bed',
  'asset',
  'channel',
  'code',
  'counter',
  'entity',
  'fact',
  'honor bundle',
  'image layer',
  'machine',
  'mood',
  'personality adjective',
  'phrasebook',
  'profile',
  'pronoun set',
  'temperament',
  'trait',
] as const;

type UniqueNamespace = (typeof UNIQUE_NAMESPACES)[number];

/**
 * How a clause body's leading validate partition ended (ADR-289 D3): the
 * first non-refusal statement, and whether it mutated. Null while the
 * partition is still open and a refusal may still be written.
 */
interface PhaseOrderState {
  ended: { kind: 'mutation' | 'statement'; what: string } | null;
}

/** The source keyword a statement was written with, for phase-order messages. */
/** Leading articles an acting statement's names may carry (ADR-329 D1). */
const ACT_ARTICLES = new Set(['the', 'a', 'an']);

/**
 * The manifest's going shapes spell directions both long and short (`go
 * north`, `go n`, `go inside`); the IR carries the canonical word the loader's
 * direction lookup expects (`north`, `in`).
 */
const ACT_DIRECTION_CANONICAL: Record<string, string> = {
  n: 'north', s: 'south', e: 'east', w: 'west',
  ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest',
  u: 'up', d: 'down', inside: 'in', outside: 'out',
};

/** The words of an acting statement or a `perform` step, as the parser carried them. */
type ActWords = ReadonlyArray<{ text: string; span: Span }>;

/** The span covering `words[from..to)`. */
function actWordsSpan(words: ActWords, from: number, to: number): Span {
  let sp = words[from].span;
  for (let i = from + 1; i < to; i++) sp = mergeSpans(sp, words[i].span);
  return sp;
}

/** `words[from..to)` as a name reference, a leading article split off (ADR-329 D1). */
function actWordsNameRef(words: ActWords, from: number, to: number): NameRef {
  const hasArticle = to - from > 1 && ACT_ARTICLES.has(words[from].text.toLowerCase());
  return {
    kind: 'name',
    article: hasArticle ? words[from].text.toLowerCase() : null,
    words: words.slice(hasArticle ? from + 1 : from, to).map((w) => w.text),
    span: actWordsSpan(words, from, to),
  };
}

/** The inflections a written verb may stand for (ADR-329 D1/Q-1) — mirrors the parser's admission test. */
function verbLemmas(word: string): Set<string> {
  const w = word.toLowerCase();
  const out = new Set([w]);
  if (w.endsWith('ies') && w.length > 4) out.add(`${w.slice(0, -3)}y`);
  if (w.endsWith('es') && w.length > 3) out.add(w.slice(0, -2));
  if (w.endsWith('s') && w.length > 2) out.add(w.slice(0, -1));
  return out;
}

/**
 * Render a story action pattern as manifest-style shapes (`kick :target`),
 * expanding optional parts to both readings and `a|b` alternatives to each.
 */
function expandPatternShapes(pattern: ActionPattern): string[] {
  let shapes: string[][] = [[]];
  for (const part of pattern.parts) {
    const options: string[][] = part.kind === 'alt' ? part.words.map((w) => [w]) : part.kind === 'slot' ? [[`:${part.word}`]] : [[part.word]];
    if (part.optional) options.push([]);
    const next: string[][] = [];
    for (const prefix of shapes) for (const opt of options) next.push([...prefix, ...opt]);
    shapes = next;
  }
  return shapes.filter((sh) => sh.length > 0).map((sh) => sh.join(' '));
}

/**
 * Match lowercased words against a shape's parts. The first literal matches
 * by lemma, later literals exactly; a slot consumes at least one word, up to
 * the next literal (or the end). Returns the slot bindings as word ranges, or
 * null when the words do not fit the shape.
 */
function matchShapeWords(words: string[], parts: string[]): Array<{ slot: string; from: number; to: number }> | null {
  const slots: Array<{ slot: string; from: number; to: number }> = [];
  let i = 0;
  for (let j = 0; j < parts.length; j++) {
    const part = parts[j];
    if (part.startsWith(':')) {
      const next = parts[j + 1];
      let end: number;
      if (next === undefined) {
        end = words.length;
      } else if (next.startsWith(':')) {
        return null; // two adjacent slots cannot be split without a parser — no standard shape has them
      } else {
        end = words.indexOf(next, i + 1);
        if (end === -1) return null;
      }
      if (end <= i) return null;
      slots.push({ slot: part.slice(1), from: i, to: end });
      i = end;
    } else {
      if (i >= words.length) return null;
      const ok = j === 0 ? verbLemmas(words[i]).has(part) : words[i] === part;
      if (!ok) return null;
      i++;
    }
  }
  return i === words.length ? slots : null;
}

function statementWord(stmt: Statement): string {
  return stmt.kind === 'media' ? stmt.form : stmt.kind === 'timer-verb' ? stmt.verb : stmt.kind;
}

class Analyzer {
  private entities: EntitySymbol[] = [];
  private byId = new Map<string, EntitySymbol>();
  private conditionNames = new Set<string>();
  private hatchNames = new Set<string>();
  /** locale → key → IRPhrase */
  private phrases = new Map<string, Map<string, IRPhrase>>();
  /** ADR-255: locale → override alias → IRPhrase (validated against MESSAGE_OVERRIDE_ALIASES). */
  private messageOverrides = new Map<string, Map<string, IRPhrase>>();
  // Phase B namespaces:
  private traitNames = new Set<string>();
  /** action name → declared grammar-slot names. */
  private actionSlots = new Map<string, Set<string>>();
  /**
   * ADR-329 D2: the story's own grammar shapes by action name — every
   * `define action` pattern and every `extend action` addition, rendered
   * like the manifest's (`kick :target`). Built on first use from the AST,
   * so a clause body that precedes its action's declaration still matches.
   */
  private actShapes: Map<string, string[]> | null = null;
  /**
   * emit event id (dotless) → the top-level payload field names it carries
   * (ADR-253 D1). Collected across every `emit` during resolution so
   * `checkChannelReturns` can flag a channel returning a field the event never
   * emits. An event with no collected entry (a platform event, or one never
   * emitted here) is left unchecked — the field set is unknown, not empty.
   */
  private emitFields = new Map<string, Set<string>>();
  /** Owner-qualified score id (`pygmy-goats.fed`, story-level bare) → worth. */
  private scoreNames = new Map<string, number>();
  /** Story-global counter names (ADR-264) — for `raise`/`lower`/read resolution. */
  private storyCounterNames = new Set<string>();
  /** ADR-325 D3: timers by `qualified` key (`<owner>.<name>` / `<name>`). */
  private timers = new Map<string, { name: string; owner: string | null; states: string[]; decl: DefineTimer }>();
  /** Lowered timer defs, in declaration order — the IR `timers` list. */
  private timerDefs: IRTimerDef[] = [];
  /** Entity id → its per-entity counter names (ADR-264). */
  private entityCounterNames = new Map<string, Set<string>>();
  /** Owner-qualified score declarations, for ir.scores emission. */
  private scoreDecls: IRScoreDef[] = [];
  /** condition name → OPEN (references `it`/`its`; usable as a selection). */
  private openConditions = new Map<string, boolean>();
  /** Spans already reported as `analysis.it-removed` (ADR-327 D2) — one per source position. */
  private itRemovedSpans = new Set<string>();
  // Ownership package (Phase C):
  /** Story-declared phases (ratchet D2); bare names are condition refs. */
  private storyStates: string[] = [];
  /** trait name → trait-declared states (ratchet D8). */
  private traitStates = new Map<string, string[]>();
  /** trait name → its `states:` line permits back-transitions (D4). */
  private traitReversible = new Map<string, boolean>();
  /**
   * trait name → states visible on `it` inside the trait's clauses: its own
   * set plus every composer's full merged set (D8: `restless` reads
   * feedable's `hungry` — resolution is across the composer's trait set).
   */
  private traitVisibleStates = new Map<string, string[]>();
  /**
   * `define pronouns` sets by name (ADR-242 D7), collected in pass 1 so a
   * `pronouns <word>` line resolves against sets declared later in the
   * file. Span doubles as the pass-2 emission guard (family-channel
   * precedent: an errored duplicate never emits a second entry).
   */
  private pronounSetDecls = new Map<string, DefinePronouns>();
  /** `define fact` declarations in order (ADR-310 D14), and their built defs by id. */
  private factDecls: DefineFact[] = [];
  /** `define chapters` blocks (ADR-330) — at most one; built after timers. */
  private chapterDecls: DefineChapters[] = [];
  private chapterDefs: IRChapterDef[] = [];
  private factDefs: IRFactDef[] = [];
  private factById = new Map<string, IRFactDef>();
  /** `define temperament` defs plus per-entity synthesized inline/override defs (ADR-318 D3), in declaration order. */
  private temperamentDefs = new Map<string, IRTemperamentDef>();
  private codeDecls: DefineCode[] = [];
  /** `define code` bundles resolved to IR entries (ADR-318 D4) — flattened into entities, never on the wire. */
  private codes = new Map<string, { principles: IRPrincipleEntry[]; obligations: IRObligationEntry[] }>();
  /** `define honor` selective face-act bundles (ADR-318 D7) — inlined into entities, never on the wire. */
  private honorDefs = new Map<string, string[]>();
  /** `claims` tags awaiting the fact table (ADR-318 D9) — resolveClaims stamps each phrase after buildFacts. */
  private pendingClaims: Array<{ claims: ClaimsTagDecl; phrase: IRPhrase }> = [];
  private witnessedTopicDecls: DefineWitnessedTopic[] = [];
  /** Resolved `define topic … as …` aliases (ADR-318 D12a). */
  private witnessedTopics: IRWitnessedTopicDef[] = [];
  /** `define profile` declarations (ADR-310 D4) and their completed dimension maps. */
  private profileDecls: DefineProfile[] = [];
  private profiles = new Map<string, Record<string, string>>();
  /** Custom vocabulary (ADR-310 D5): `define mood` / `define personality` by word. */
  private customMoods = new Map<string, DefineMood>();

  /** Declared `define conversation` keys (D14) — lazy, order-independent. */
  private conversationKeysMemo: Set<string> | null = null;

  /** Every declared thread key, normalized — the `is concluded` gate's universe. */
  private get conversationKeys(): Set<string> {
    if (!this.conversationKeysMemo) {
      this.conversationKeysMemo = new Set();
      for (const d of this.ast.declarations) {
        if (d.kind === 'define-conversation' && d.name) this.conversationKeysMemo.add(normalizeTopic(d.name));
      }
    }
    return this.conversationKeysMemo;
  }
  private customPersonalities = new Map<string, DefinePersonality>();

  constructor(
    private readonly ast: StoryFile,
    private readonly diagnostics: DiagnosticBag,
  ) {}

  /** Extensions admitted by validated `use` lines (ADR-215). */
  private usedExtensions = new Set<string>();

  /**
   * Phrasebooks in arbitration order (ADR-250 D3): header `use phrasebook`
   * lines first (file position), then body `define phrasebook` blocks in
   * declaration order. Conditions resolve in run() (pass 2), after every
   * entity symbol exists.
   */
  private phrasebookDecls: Array<{
    name: string;
    source: 'define' | 'use';
    condition: ConditionNode | null;
    entries?: Record<string, IRPhrase>;
    span: Span;
  }> = [];

  /**
   * The single duplicate-declaration store (ADR-289 D5): `<namespace> <name>`
   * → the span that first declared it. One map, so every namespace in
   * `UNIQUE_NAMESPACES` gets the same rule and the same message shape.
   */
  private uniqueNames = new Map<string, Span>();

  /** Book name → declaring span (`analysis.duplicate-phrasebook` gate). */
  private phrasebookNames = new Map<string, Span>();

  /**
   * Story key → true when a predicate-less (default/always) book covers
   * it. Book coverage counts as declaration for the missing-phrase gate
   * (ADR-250 D4.6); predicated-only coverage earns the partial-coverage
   * warning at first reference.
   */
  private bookKeys = new Map<string, boolean>();
  private partialCoverageWarned = new Set<string>();
  /**
   * Phrase-table keys derived from entity DESCRIPTIONS (`<id>.description`,
   * `<id>.initial-description`) rather than authored phrase bodies. The
   * phrase-in-phrase gate (GH #286) exempts them: room descriptions resolve
   * their markers through the Z2 snippet path, and non-room descriptions
   * keep markers unrewritten by pinned contract (zoo surfaces phase 2).
   */
  private descriptionKeys = new Set<string>();

  run(): StoryIR {
    // ADR-269 D8: grammar-file mode — a `grammar` header confines the file
    // to define-action grammar surfaces; behavior and story declarations
    // are named errors, never silently ignored.
    if (this.ast.grammarHeader) this.checkGrammarFileMode();

    this.collect();

    // ADR-215: validate `use` lines against the manifest registry — an
    // unknown name is a compile error (the loader's trusted registry check
    // backstops rogue IR), a duplicate is one-`use`-per-extension.
    const announceModes: Record<string, string> = {};
    const VALID_ANNOUNCE_MODES = ['all', 'collapsed', 'combined', 'silent'];
    for (const use of this.ast.header?.uses ?? []) {
      // ADR-262 D3: validate the `, announce <mode>` suffix and record it.
      if (use.announce !== undefined) {
        if (!VALID_ANNOUNCE_MODES.includes(use.announce)) {
          this.diagnostics.error(
            'analysis.invalid-announce-mode',
            `\`announce ${use.announce}\` is not a mode — use one of: ${VALID_ANNOUNCE_MODES.join(', ')}.`,
            use.span,
          );
        } else {
          announceModes[use.name] = use.announce;
        }
      }
      const manifest = EXTENSION_MANIFESTS.get(use.name);
      if (!manifest) {
        const gated = [...EXTENSION_MANIFESTS.values()].filter((m) => !m.core).map((m) => m.name);
        this.diagnostics.error(
          'analysis.unknown-extension',
          `\`use ${use.name}\` names no trusted extension — known: ${gated.join(', ')}.`,
          use.span,
        );
      } else if (manifest.core) {
        // ADR-215 Q4: NPC vocabulary is CORE — always on, never `use`d.
        this.diagnostics.error(
          'analysis.extension-core',
          `\`${use.name}\` vocabulary is core — it is always available; remove the \`use\` line.`,
          use.span,
        );
      } else if (this.usedExtensions.has(use.name)) {
        this.diagnostics.error(
          'analysis.duplicate-use',
          `\`use ${use.name}\` is already declared — one \`use\` per extension.`,
          use.span,
        );
      } else {
        this.usedExtensions.add(use.name);
      }
    }

    // ADR-261 D4: scoring's constructs sit behind `use scoring`. Gating them
    // together is what makes D3 ("absent `use scoring` means the game has no
    // score") a rule with no exceptions — scoring is on precisely when the
    // header says so, and there is one place to look. Reported once per
    // construct kind, at the first offending site, rather than once per line.
    if (!this.usedExtensions.has('scoring') && this.scoreDecls.length > 0) {
      this.reportScoringGate('score', this.scoreDecls[0].span);
    }

    // Built once (it emits diagnostics), spread in only when present so the
    // optional `hunger` field never appears as `undefined` on a story without it.
    const hungerDef = this.buildHunger();
    // ADR-310 D14/D4: fact-value sets and named profiles build before
    // entities — `thinks` lines and `cognitive-profile` lines resolve
    // against them.
    this.buildFacts();
    this.buildProfiles();
    // ADR-318 D4: code bundles resolve once, before entities flatten them.
    this.buildCodes();
    // ADR-318 D9: claims tags check against the built fact table.
    this.resolveClaims();
    // ADR-318 D12a: witnessed-act aliases resolve against the entity table.
    this.buildWitnessedTopics();
    // ADR-325 D3: timers resolve their owners against the entity table.
    this.buildTimers();
    // ADR-330: chapters resolve their triggers against entities, timers, and states.
    this.buildChapters();

    const ir: StoryIR = {
      format: IR_FORMAT,
      languageVersion: CHORD_LANGUAGE_VERSION, // ADR-257 D3 — the language version that compiled this story

      meta: {
        title: this.ast.header?.title ?? '',
        fields: this.buildMetaFields(),
      },
      // ADR-269 D8: mark grammar files so consumers (the standard-grammar
      // build step) can switch on grammar-file handling; spread in only when
      // present so a story's IR never carries the field.
      ...(this.ast.grammarHeader ? { grammarFile: { name: this.ast.grammarHeader.name } } : {}),
      uses: [...this.usedExtensions],
      announceModes,
      story: {
        states: this.storyStates,
        reversible: this.ast.header?.statesReversible ?? false,
        // Story-owned every-turn clauses (ADR-236 D7): built in STORY_SCOPE
        // so `it` reports the unbound-referent gate; narration broadcasts
        // (the story is everywhere — D11 satisfied trivially).
        onClauses: (this.ast.header?.onClauses ?? []).map((c, i) => ({
          ...this.buildOnClause(c, STORY_SCOPE, 'story', i),
          narration: 'broadcast' as const,
        })),
        ...((this.ast.header?.timerClauses ?? []).length > 0
          ? { timerClauses: (this.ast.header?.timerClauses ?? []).map((c, i) => this.buildTimerClause(c, STORY_SCOPE, 'story', i)) }
          : {}),
      },
      entities: [],
      // ADR-327 D10: resolved after the declaration loop, so its statements
      // see every entity the story declares.
      startBlock: null,
      conditions: [],
      phrases: { defaultLocale: DEFAULT_LOCALE, locales: {} },
      messageOverrides: { defaultLocale: DEFAULT_LOCALE, locales: {} },
      phrasebooks: [],
      hatches: [],
      traits: [],
      actions: [],
      scores: this.scoreDecls,
      ranks: this.buildRanks(),
      ...(hungerDef !== undefined ? { hunger: hungerDef } : {}),
      counters: [],
      timers: this.timerDefs,
      sequences: [],
      machines: [],
      channels: [],
      pronounSets: [],
      hasHatches: false,
      // Additive and optional — absent when the story declares no facts.
      ...(this.factDefs.length > 0 ? { facts: this.factDefs } : {}),
      // ADR-330 chapters — additive and optional, present only under `use chapters`.
      ...(this.chapterDefs.length > 0 ? { chapters: this.chapterDefs } : {}),
      // ADR-318 D12a witnessed-act aliases — additive and optional.
      ...(this.witnessedTopics.length > 0 ? { witnessedTopics: this.witnessedTopics } : {}),
      // ADR-310 D5 custom vocabulary — additive and optional.
      ...(this.customMoods.size > 0
        ? {
            customMoods: [...this.customMoods.values()].map((m) => ({
              name: m.name,
              like: m.like.word,
              ...(m.but ? { but: m.but.word } : {}),
              span: m.span,
            })),
          }
        : {}),
      ...(this.customPersonalities.size > 0
        ? { customPersonalities: [...this.customPersonalities.values()].map((p) => ({ name: p.name, span: p.span })) }
        : {}),
    };

    for (const decl of this.ast.declarations) {
      switch (decl.kind) {
        case 'create':
          ir.entities.push(this.buildEntity(decl));
          break;
        case 'define-condition':
          ir.conditions.push({
            name: decl.name,
            open: this.openConditions.get(decl.name) ?? false,
            // `it` is the quantified subject here — a carrier word, the
            // second of ADR-327 D8's two allowances (see Scope.carrierIt).
            condition: this.resolveCondition(decl.condition, { ...TOP_SCOPE, carrierIt: true }),
            span: decl.span,
          });
          break;
        case 'define-text':
          ir.hatches.push({ name: decl.name, modulePath: decl.modulePath, hatchKind: 'text', span: decl.span });
          break;
        case 'define-hatch':
          // ADR-094 chain hatch: the name must be a replaceable stdlib chain.
          if (decl.hatchKind === 'chain' && !STDLIB_CHAIN_NAMES.has(decl.name)) {
            this.diagnostics.error(
              'analysis.unknown-chain',
              `\`${decl.name}\` is not a replaceable stdlib chain${this.suggestText(decl.name, [...STDLIB_CHAIN_NAMES])}.`,
              decl.span,
            );
          }
          ir.hatches.push({ name: decl.name, modulePath: decl.modulePath, hatchKind: decl.hatchKind, span: decl.span });
          break;
        case 'define-trait':
          ir.traits.push(this.buildTrait(decl));
          break;
        case 'define-action':
          ir.actions.push(this.buildAction(decl));
          break;
        case 'extend-action':
          // ADR-270 D2: story-scoped grammar addition to an existing action.
          (ir.grammarExtensions ??= []).push(this.buildExtension(decl));
          break;
        case 'remove-from-action':
          // ADR-270 D3: standard-grammar shapes removed at load.
          (ir.grammarRemovals ??= []).push(this.buildRemoval(decl));
          break;
        case 'define-machine':
          ir.machines.push(this.buildMachine(decl));
          break;
        case 'define-counter':
          // ADR-264 D1: a story-global numeric counter.
          ir.counters.push(this.buildCounterDef(decl));
          break;
        case 'define-asset':
          break; // collected in pass 1 — data references, nothing to emit
        case 'define-family-channel':
          // ADR-241 D2/D4: the declaration joins the channel manifest.
          // The pass-1 span guard keeps an errored duplicate from
          // producing a second entry.
          if (this.familyChannels[decl.family].get(decl.name) === decl.span) {
            ir.channels.push({ name: decl.name, family: decl.family, span: decl.span });
          }
          break;
        case 'define-channel':
          ir.channels.push(this.buildChannel(decl));
          break;
        case 'define-pronouns':
          // ADR-242 D7 — the pass-1 span guard keeps a shadowing/duplicate
          // declaration from emitting (family-channel precedent).
          if (this.pronounSetDecls.get(decl.name) === decl) {
            ir.pronounSets.push(this.buildPronounSet(decl));
          }
          break;

        case 'define-sequence':
          ir.sequences.push({
            name: decl.name.join(' '),
            // Decision 10: sequences are story-owned — narration broadcasts.
            narration: 'broadcast',
            steps: decl.steps.map((step, stepIndex) => ({
              timing: step.timing,
              turns: step.turns,
              anchor: this.resolveStepAnchor(step),
              body: step.body.map((s, i) =>
                this.resolveStatement(s, TOP_SCOPE, `sequence.${decl.name.join('-')}.step-${stepIndex}.${i}`),
              ),
              span: step.span,
            })),
            span: decl.span,
          });
          break;
        case 'define-phrase':
          // Collected in pass 1; the Z2 header gate resolves here, in pass 2,
          // where every entity symbol already exists (`while the zookeeper is
          // here` may reference an entity declared after the phrase).
          if (decl.condition) {
            const entry = this.phrases.get(DEFAULT_LOCALE)?.get(decl.key);
            if (entry) entry.condition = this.resolveCondition(decl.condition, TOP_SCOPE);
          }
          break;
        case 'override-message':
          // ADR-255: same two-pass split as define-phrase — the optional
          // `while <cond>` gate resolves here in pass 2. Only set when the
          // alias survived pass-1 validation (an entry exists).
          if (decl.condition) {
            const entry = this.messageOverrides.get(DEFAULT_LOCALE)?.get(decl.alias);
            if (entry) entry.condition = this.resolveCondition(decl.condition, TOP_SCOPE);
          }
          break;
        case 'override-messages':
          break; // flat entries collected in pass 1; no per-entry condition
        case 'define-phrases':
          break; // collected in pass 1
        case 'define-phrasebook':
        case 'import':
          break; // collected/diagnosed in pass 1; conditions resolve below
        case 'define-fact':
        case 'define-temperament':
        case 'define-code':
        case 'define-honor':
        case 'define-witnessed-topic':
        case 'define-profile':
        case 'define-mood':
        case 'define-personality':
        case 'define-chapters':
          break; // collected in pass 1; built before entities (buildFacts/buildProfiles/custom vocabulary)
        case 'define-topics':
          break; // applied onto owners after all entities are built (applyTopics)
        case 'define-manner':
        case 'define-greetings':
          break; // applied onto owners after all entities are built (applyManner/applyGreetings)
        case 'define-exchange':
        case 'define-initiative':
          break; // applied onto owners after all entities are built (applyExchanges/applyInitiative)
        case 'define-conversation':
          break; // applied onto owners after all entities are built (applyConversations)
      }
    }

    // ADR-327 D10: the start block resolves after every entity is built —
    // `change the player to <name>` refers to characters declared anywhere.
    ir.startBlock = this.buildStartBlock();

    // ADR-250 D3: books in arbitration order; predicates resolve here in
    // pass 2 (an entity declared after the book may appear in its `while`).
    ir.phrasebooks = this.phrasebookDecls.map((b) => ({
      name: b.name,
      source: b.source,
      condition: b.condition ? this.resolveCondition(b.condition, TOP_SCOPE) : null,
      ...(b.entries ? { entries: b.entries } : {}),
      span: b.span,
    }));
    this.stampPhrasebookSpecificity(ir.phrasebooks);

    // ADR-241 D3/D4: the implied `main` ambient bed — used by an ambient
    // statement without a declaration — joins the channel manifest so the
    // loader registers it (nothing platform-side pre-registers ambient).
    if (this.impliedMainBedSpan && !this.familyChannels.ambient.has('main')) {
      ir.channels.push({ name: 'main', family: 'ambient', span: this.impliedMainBedSpan });
    }

    for (const [locale, table] of this.phrases) {
      ir.phrases.locales[locale] = Object.fromEntries(table);
    }
    for (const [locale, table] of this.messageOverrides) {
      ir.messageOverrides.locales[locale] = Object.fromEntries(table);
    }
    ir.hasHatches = ir.hatches.length > 0;

    this.applyTopics(ir.entities);
    this.applyManner(ir.entities);
    this.applyGreetings(ir.entities);
    this.applyExchanges(ir.entities);
    this.applyInitiative(ir.entities);
    this.applyConversations(ir.entities);
    this.checkConversationTargets(ir.entities);
    this.checkRegions(ir.entities);
    this.checkDoors(ir.entities);
    this.checkCompositionLegality(ir);
    this.checkInfluenceReferences(ir);
    // ADR-318 D3: after entities — inline/override bindings synthesize defs
    // during entity build. Additive and optional, the facts idiom.
    if (this.temperamentDefs.size > 0) ir.temperaments = [...this.temperamentDefs.values()];
    this.checkAlterationTargets(ir);
    this.checkMarkers();
    this.checkDescriptionMarkers();
    this.checkHeaderFields(); // ADR-298: header phrase-refs resolve; missing IFID warns
    this.checkChannelReturns(ir.channels); // ADR-253 D1: return-field cross-check (all emits collected)
    return ir;
  }

  /**
   * ADR-298: project the header's typed fields into the IR. Spans are
   * dropped — the IR is snapshot-stable and carries no source positions here.
   */
  private buildMetaFields(): IRStoryFields {
    const f = this.ast.header?.fields;
    if (!f) return { authors: [], testers: [], themes: [] };
    return {
      ...(f.id !== undefined ? { id: f.id } : {}),
      ...(f.storyVersion !== undefined ? { storyVersion: f.storyVersion } : {}),
      ...(f.ifid !== undefined ? { ifid: f.ifid } : {}),
      authors: f.authors,
      testers: f.testers,
      ...(f.prologue ? { prologue: { kind: f.prologue.kind, value: f.prologue.value } } : {}),
      ...(f.description ? { description: { kind: f.description.kind, value: f.description.value } } : {}),
      // ADR-252 D3 client-config keys (ADR-298 amendment, GH #221).
      ...(f.client !== undefined ? { client: f.client } : {}),
      ...(f.theme !== undefined ? { theme: f.theme } : {}),
      ...(f.template !== undefined ? { template: f.template } : {}),
      themes: f.themes,
      ...(f.defaultTheme !== undefined ? { defaultTheme: f.defaultTheme } : {}),
      ...(f.storagePrefix !== undefined ? { storagePrefix: f.storagePrefix } : {}),
      // Publishing (ADR-284): absent stays absent, so the build's own default
      // (do not ship source) is the one place that rule is written down.
      ...(f.publishSource !== undefined ? { publishSource: f.publishSource } : {}),
      // Testing (Phase 6e): absent stays absent — "let me decide" is the
      // runner's default, written down only there.
      ...(f.autoAssertion !== undefined ? { autoAssertion: f.autoAssertion } : {}),
    };
  }

  /**
   * ADR-298 header gates. A `prologue:`/`description:` phrase reference must
   * resolve to a declared phrase (D4 — a lone kebab atom is always a
   * reference, so an unresolved one is an error, never silent literal text).
   * Grammar files carry no story header and are exempt.
   *
   * The missing-`ifid:` warning that lived here retired with ADR-309: the
   * toolchain now OWNS the identifier (minted at creation into
   * `<story-name>.config.json`, rendered into the header on every save and
   * build), so an absent line is a state the tool repairs rather than one an
   * author is told about. `sharpee publish` keeps its refusal (ADR-284) as
   * the backstop for a story that never passed through a host.
   */
  private checkHeaderFields(): void {
    const header = this.ast.header;
    if (!header) return;
    for (const prose of [header.fields.prologue, header.fields.description]) {
      if (prose?.kind === 'phrase-ref') this.requirePhrase(prose.value, prose.span, null);
    }
  }

  /**
   * ADR-236 D2/D3 never-guess gates over the whole region graph: member
   * kinds (rooms or regions only), single direct membership (RoomTrait's
   * `regionId` is single-valued — an ancestor+descendant listing is the
   * same error), single parent per region, no memberless regions, no
   * containment cycles. Runs after every entity is built so cross-entity
   * lookups and spans are all available.
   */
  /**
   * ADR-276 Phase 1 (census entries 9, 11–15): composition-legality rules
   * migrated from story-loader — every rule here is derivable from the IR
   * alone, so it reports as a collected compile diagnostic with a span; the
   * loader keeps the same rules as first-throw defensive backstops for
   * rogue IR. Mirrors loader.ts `applyTraitAdjectives` (conditional gate,
   * `dark`, undeclared traits), `checkCuttableImplementations` (tool-gated
   * gerunds), the player `wears` loop, and the patrol-route requirement.
   */
  private checkCompositionLegality(ir: StoryIR): void {
    const traitDefs = new Map(ir.traits.map((t) => [t.name, t]));

    for (const entity of ir.entities) {
      // Census 17 (discovered in Phase 1 — the phrasebook fixtures compiled
      // `a thing` clean): kind nouns are the closed catalog set the loader's
      // entity builder switches on.
      for (const k of entity.kinds) {
        if (!KIND_NOUNS.has(k.name)) {
          this.diagnostics.error(
            'analysis.unknown-kind-noun',
            `\`${entity.name}\`: unknown kind noun \`${k.name}\`.`,
            k.span,
          );
        }
      }
      // Census 18 (discovered in Phase 1): one kind noun per entity.
      if (entity.kinds.length > 1) {
        this.diagnostics.error(
          'analysis.multiple-kind-nouns',
          `\`${entity.name}\` declares more than one kind noun.`,
          entity.kinds[1].span,
        );
      }

      const isRoom = entity.kinds.some((k) => k.name === 'room');
      for (const comp of entity.traits) {
        // Census 14: conditional composition legality — room-`dark`, or a
        // declared trait whose clauses are ALL NPC-behavior-shaped (`on
        // every turn …`). `proper` has its own earlier gates (ADR-242 D1).
        if (comp.condition !== null && comp.name !== 'proper') {
          const def = traitDefs.get(comp.name);
          const npcShaped =
            def !== undefined && def.onClauses.length > 0 && def.onClauses.every((c) => c.binding === 'every-turn');
          if (!(comp.name === 'dark' && isRoom) && !npcShaped) {
            this.diagnostics.error(
              'analysis.conditional-composition-unsupported',
              `Conditional composition isn't supported for \`${comp.name}\` — move the condition inside the trait (\`on the player <action>\` clauses can test it) or split the behavior.`,
              comp.span,
            );
            continue;
          }
        }
        // Census 11: `dark` is room-only (the room builder consumes it).
        if (comp.name === 'dark' && !isRoom) {
          this.diagnostics.error('analysis.dark-rooms-only', '`dark` applies to rooms only.', comp.span);
          continue;
        }
        // Census 10 (ADR-276 Phase 6): the hiding-position domain is the
        // manifest's closed set (ratchet G3, one source with the loader).
        if (comp.name === 'hiding-spot') {
          const position = comp.config.find((c) => c.key === 'position')?.value;
          if (position !== undefined && !STDLIB_MANIFEST.hidingPositions.includes(position)) {
            const list = [...STDLIB_MANIFEST.hidingPositions];
            const listed = `${list.slice(0, -1).join(', ')}, or ${list[list.length - 1]}`;
            this.diagnostics.error(
              'analysis.unknown-hiding-position',
              `\`${position}\` is not a hiding position — use ${listed}.`,
              comp.span,
            );
          }
        }

        // Census 9: a `patrol` NPC needs a route. A route whose entries all
        // failed to resolve has already errored through the unknown-entity
        // gate — only a MISSING route reports here (the loader's emptiness
        // backstop stays for rogue IR).
        if (comp.name === 'patrol' && !comp.config.some((c) => c.key === 'route')) {
          this.diagnostics.error(
            'analysis.patrol-needs-route',
            'A `patrol` NPC needs `with route [ … ]` naming its rooms.',
            comp.span,
          );
        }
        // Census 15: neither a v1 adjective, nor extension vocabulary, nor
        // a declared `define trait`.
        if (!TRAIT_ADJECTIVES.has(comp.name) && !manifestForAdjective(comp.name) && !traitDefs.has(comp.name)) {
          this.diagnostics.error(
            'analysis.trait-not-declared',
            `Trait \`${comp.name}\` is not declared (\`define trait ${comp.name}\`) and is not a v1 adjective.`,
            comp.span,
          );
        }

        // Census 4/6 (ADR-276 Phase 5): setting value domains from the
        // manifest's schema slice. Extension traits run only when admitted —
        // buildEntity's extension gates own the `use`-missing case. The
        // number domain needs no check here: valueKind mismatch is already
        // `analysis.extension-config-value` (census 5 was pre-gated).
        const schema = STDLIB_MANIFEST.settingSchema[comp.name];
        if (schema) {
          const contributed = manifestForAdjective(comp.name);
          const admitted =
            !contributed || contributed.manifest.core || this.usedExtensions.has(contributed.manifest.name);
          if (admitted) {
            for (const cfg of comp.config) {
              // Keyless v1 entity ref (`lockable with the iron key`): the
              // parser stores it under the empty key; the schema's one
              // entity-ref entry supplies the message label.
              const label =
                cfg.key !== '' ? cfg.key : Object.keys(schema).find((k) => schema[k] === 'entity-ref') ?? cfg.key;
              const type = schema[label];
              if (type === 'boolean' && cfg.value !== 'true' && cfg.value !== 'false') {
                this.diagnostics.error(
                  'analysis.setting-not-boolean',
                  `\`${entity.name}\`: \`${label}\` takes \`true\` or \`false\`, got \`${cfg.value}\`.`,
                  comp.span,
                );
              } else if (type === 'entity-ref' && cfg.valueKind === 'name' && !this.resolveConfigEntity(ir, cfg.value)) {
                this.diagnostics.error(
                  'analysis.setting-names-no-entity',
                  `\`${cfg.value}\` (config \`${label}\`) names no entity.`,
                  comp.span,
                );
              }
            }
          }
        } else if (traitDefs.has(comp.name)) {
          // Census 6 (declared traits, IR-internal): a `with <key> <name>`
          // value resolves against the story's entities — mirroring the
          // loader's duck-typing on valueKind exactly (the declared field
          // type is not consulted; behavior parity over strictness).
          for (const cfg of comp.config) {
            if (cfg.valueKind === 'name' && !this.resolveConfigEntity(ir, cfg.value)) {
              this.diagnostics.error(
                'analysis.setting-names-no-entity',
                `\`${cfg.value}\` (config \`${cfg.key}\`) names no entity.`,
                comp.span,
              );
            }
          }
        }
      }

      // Census 12: items a role-eligible character wears must be wearable.
      // Under ADR-327 D10 there is no compile-time player, so the scope is
      // every `playable` character — the set that can actually hold the role.
      if (entity.isPlayable) {
        for (const wornId of entity.wears) {
          const worn = ir.entities.find((e) => e.id === wornId);
          if (worn && !worn.traits.some((t) => t.name === 'wearable')) {
            this.diagnostics.error(
              'analysis.worn-not-wearable',
              `\`${wornId}\` is worn by the player but is not wearable.`,
              worn.span,
            );
          }
        }
      }
    }

    // Census 13: tool-gated gerunds (ADR-230 D3c) — exactly one
    // implementation. The Chord surfaces (entity clause, composed-trait
    // clause) are IR-visible; the ADR-090 capability surface (TS/hatch) is
    // not. Two-plus Chord surfaces double-fire regardless of any capability
    // surface, so that half is unconditional; the zero-surface half is
    // sound only when the story has no hatches at all (a hatch may register
    // the capability behavior) — with hatches present, the zero case stays
    // the loader's check (ADR-276 D5 residue boundary).
    const TOOL_GATED_GERUNDS = [
      { adjective: 'cuttable', gerund: 'cutting' },
      { adjective: 'diggable', gerund: 'digging' },
    ] as const;
    const gerundSurface = (c: IROnClause, gerund: string): boolean =>
      c.clauseKind === 'on' && c.action === gerund && c.binding !== 'every-turn';
    for (const { adjective, gerund } of TOOL_GATED_GERUNDS) {
      for (const entity of ir.entities) {
        const site = entity.traits.find((t) => t.name === adjective);
        if (!site) continue;
        let surfaces = 0;
        if (entity.onClauses.some((c) => gerundSurface(c, gerund))) surfaces++;
        for (const comp of entity.traits) {
          const def = traitDefs.get(comp.name);
          if (def?.onClauses.some((c) => gerundSurface(c, gerund))) surfaces++;
        }
        if (surfaces > 1) {
          this.diagnostics.error(
            'analysis.gerund-implementation',
            `\`${entity.name}\` has ${surfaces} ${gerund} implementations — a ${adjective} entity registers exactly one (one \`on ${gerund} it\` clause or one capability behavior).`,
            site.span,
          );
        } else if (surfaces === 0 && ir.hatches.length === 0) {
          this.diagnostics.error(
            'analysis.gerund-implementation',
            `\`${entity.name}\` is ${adjective} but registers no ${gerund} implementation — add \`on ${gerund} it:\` (or compose a trait that has one).`,
            site.span,
          );
        }
      }
    }
  }

  /**
   * Resolve a trait-config entity NAME the way the loader's entityRefFor
   * does — display-name or `aka` alias, lowercased, first match — so the
   * census-6 compile gate is exactly as strict as the load check it fronts.
   */
  private resolveConfigEntity(ir: StoryIR, name: string): boolean {
    const lower = name.toLowerCase();
    return ir.entities.some((e) => e.name.toLowerCase() === lower || e.aka.includes(lower));
  }

  /**
   * ADR-276 Phase 3 (census entries 1–2): alteration target names resolve at
   * compile against the story's own actions plus the generated stdlib
   * manifest, mirroring the loader's story-first order (ADR-270 D2) exactly.
   * The loader keeps the same checks as first-throw backstops for rogue IR.
   */
  private checkAlterationTargets(ir: StoryIR): void {
    const storyActionNames = new Set(ir.actions.map((a) => a.name));
    const stdlibBareNames = [...STDLIB_MANIFEST.actionIds].map((id) => id.slice('if.action.'.length));

    for (const ext of ir.grammarExtensions ?? []) {
      // Story-first (the shadowing semantic): a story-defined action of the
      // same name wins and needs no stdlib id.
      if (storyActionNames.has(ext.action)) continue;
      if (!STDLIB_MANIFEST.actionIds.has(`if.action.${ext.action}`)) {
        this.diagnostics.error(
          'analysis.extend-target',
          `\`extend action ${ext.action}\` — no story action or standard action has that name${this.suggestText(ext.action, [...storyActionNames, ...stdlibBareNames])}.`,
          ext.span,
        );
      }
    }
    for (const removal of ir.grammarRemovals ?? []) {
      // Removals name STANDARD actions only (ADR-270 D3) — a story action
      // has no standard-tier rules to remove.
      if (!STDLIB_MANIFEST.actionIds.has(`if.action.${removal.action}`)) {
        this.diagnostics.error(
          'analysis.removal-target',
          `\`remove from action ${removal.action}\` — no standard action has that name${this.suggestText(removal.action, stdlibBareNames)}.`,
          removal.span,
        );
        continue;
      }
      // Census 3: each removal pattern must match a standard-grammar shape —
      // rendered exactly as the loader renders it (renderPatternPart with no
      // greedy suffix) and compared by the same string equality removeRules
      // uses. The manifest's shapes derive from the same expansion that
      // emits the registered rules, so agreement is structural.
      const shapes = STDLIB_MANIFEST.locales['en-US'].grammarShapes[`if.action.${removal.action}`] ?? [];
      const renderPart = (p: IRPatternPart): string => {
        const core = p.kind === 'alt' ? p.words.join('|') : p.kind === 'slot' ? `:${p.word}` : p.word;
        return p.optional ? `[${core}]` : core;
      };
      for (const pattern of removal.patterns) {
        const text = pattern.parts.map(renderPart).join(' ');
        if (!shapes.includes(text)) {
          this.diagnostics.error(
            'analysis.unmatched-removal-pattern',
            `\`remove from action ${removal.action}\` — no standard rule matches \`${text}\`. The action's standard patterns are: ${shapes.map((s) => `\`${s}\``).join(', ') || '(none)'}.`,
            removal.span,
          );
        }
      }
    }
  }

  private checkRegions(entities: IREntity[]): void {
    const byId = new Map(entities.map((e) => [e.id, e]));
    const isRegionEntity = (e: IREntity) => e.kinds.some((k) => k.name === 'region');
    const regions = entities.filter(isRegionEntity);

    // Memberless region: declared-but-unanswerable, uniformly hard (D2 —
    // ruled no warning tier; its daemon could otherwise silently never fire).
    for (const region of regions) {
      if (region.containing.length === 0) {
        this.diagnostics.error(
          'analysis.region-memberless',
          `Region \`${region.name}\` has no \`containing\` line — an empty region is unanswerable (its daemons and crossings could never fire). List its member rooms.`,
          region.span,
        );
      }
    }

    // Direct membership is stated exactly once, graph-wide.
    const roomMemberOf = new Map<string, { region: IREntity; span: Span }>();
    const parentOf = new Map<string, { parent: IREntity; span: Span }>();
    for (const region of regions) {
      for (const member of region.containing) {
        const target = byId.get(member.id);
        if (!target) continue; // unresolved — already reported by resolveEntityId
        if (isRegionEntity(target)) {
          const prior = parentOf.get(member.id);
          if (prior) {
            this.diagnostics.error(
              'analysis.region-two-parents',
              `Region \`${target.name}\` is already contained by region \`${prior.parent.name}\` (line ${prior.span.line}) — a region has exactly one parent.`,
              member.span,
            );
          } else {
            parentOf.set(member.id, { parent: region, span: member.span });
          }
        } else if (target.kinds.some((k) => k.name === 'room')) {
          const prior = roomMemberOf.get(member.id);
          if (prior) {
            this.diagnostics.error(
              'analysis.region-double-membership',
              `\`${target.name}\` is already a member of region \`${prior.region.name}\` (line ${prior.span.line}) — direct membership is stated exactly once (nesting already makes a room part of every ancestor region).`,
              member.span,
            );
          } else {
            roomMemberOf.set(member.id, { region, span: member.span });
          }
        } else {
          const kind = target.kinds[0]?.name ?? 'plain thing';
          this.diagnostics.error(
            'analysis.region-member-kind',
            `\`${target.name}\` is a ${kind} — \`containing\` members must be rooms or regions.`,
            member.span,
          );
        }
      }
    }

    // ADR-325 D5: every landing room is a room the region contains,
    // directly or through a nested region.
    const roomsWithin = (region: IREntity, seen = new Set<string>()): Set<string> => {
      const out = new Set<string>();
      if (seen.has(region.id)) return out;
      seen.add(region.id);
      for (const member of region.containing) {
        const target = byId.get(member.id);
        if (!target) continue;
        if (isRegionEntity(target)) {
          for (const id of roomsWithin(target, seen)) out.add(id);
        } else {
          out.add(target.id);
        }
      }
      return out;
    };
    for (const region of regions) {
      if (!region.landing) continue;
      const within = roomsWithin(region);
      for (const roomId of region.landing.rooms) {
        const target = byId.get(roomId);
        if (!target) continue;
        if (!target.kinds.some((k) => k.name === 'room')) {
          this.diagnostics.error(
            'analysis.landing-kind',
            `\`${target.name}\` is not a room — a landing is a room the region contains.`,
            region.landing.span,
          );
        } else if (!within.has(roomId)) {
          this.diagnostics.error(
            'analysis.landing-not-contained',
            `\`${target.name}\` is not contained by \`${region.name}\` — a landing must be one of the region's own rooms (directly or through a nested region).`,
            region.landing.span,
          );
        }
      }
    }

    // Containment cycles (walking child → parent; two-parents kept the
    // first edge, so the graph is functional and one walk per region ends).
    const walked = new Map<string, 'visiting' | 'done'>();
    for (const region of regions) {
      if (walked.has(region.id)) continue;
      const path: string[] = [];
      let cur: string | undefined = region.id;
      while (cur !== undefined && !walked.has(cur)) {
        walked.set(cur, 'visiting');
        path.push(cur);
        const edge = parentOf.get(cur);
        const next: string | undefined = edge?.parent.id;
        if (next !== undefined && walked.get(next) === 'visiting') {
          const names = [...path.slice(path.indexOf(next)), next].map((id) => byId.get(id)?.name ?? id);
          this.diagnostics.error(
            'analysis.region-cycle',
            `Region containment cycle: ${names.map((n) => `\`${n}\``).join(' → ')}.`,
            edge!.span,
          );
          break;
        }
        cur = next;
      }
      for (const id of path) walked.set(id, 'done');
    }
  }

  /**
   * ADR-234 D3 never-guess gates over the whole door graph: every
   * `through` target is a door, a door connects exactly one room pair
   * (the only legal second reference is the exact mirror — other side,
   * opposite direction), and every declared door is referenced somewhere
   * (an unconnected door is unanswerable, same hard class as a
   * memberless region). Runs after every entity is built so cross-entity
   * lookups and spans are all available.
   */
  private checkDoors(entities: IREntity[]): void {
    const byId = new Map(entities.map((e) => [e.id, e]));
    const isDoorEntity = (e: IREntity) => e.kinds.some((k) => k.name === 'door');

    // First `through` reference per door — the canonical pair.
    const firstRef = new Map<string, { owner: IREntity; exit: IRExit }>();
    // Doors whose mirror side has already been stated.
    const mirrored = new Set<string>();

    for (const owner of entities) {
      for (const exit of owner.exits) {
        if (exit.via === null || exit.via === '') continue; // plain, or unresolved (already reported)
        const door = byId.get(exit.via);
        if (!door) continue;
        if (!isDoorEntity(door)) {
          const kind = door.kinds[0]?.name ?? 'plain thing';
          this.diagnostics.error(
            'analysis.door-through-kind',
            `\`${door.name}\` is a ${kind} — \`through\` names a door (\`create the ${door.name} / a door\`).`,
            exit.span,
          );
          continue;
        }
        const first = firstRef.get(door.id);
        if (!first) {
          firstRef.set(door.id, { owner, exit });
          continue;
        }
        const samePair = (owner.id === first.owner.id && exit.to === first.exit.to)
          || (owner.id === first.exit.to && exit.to === first.owner.id);
        if (!samePair) {
          this.diagnostics.error(
            'analysis.door-multi-pair',
            `\`${door.name}\` already connects \`${first.owner.name}\` and \`${byId.get(first.exit.to)?.name ?? first.exit.to}\` (line ${first.exit.span.line}) — a door connects exactly two rooms.`,
            exit.span,
          );
          continue;
        }
        const isMirror = owner.id === first.exit.to
          && exit.to === first.owner.id
          && exit.direction === OPPOSITE_DIRECTION[first.exit.direction]
          && !mirrored.has(door.id);
        if (isMirror) {
          mirrored.add(door.id);
        } else {
          this.diagnostics.error(
            'analysis.door-pair-mismatch',
            `\`${door.name}\` is already wired by \`${first.owner.name}\`'s \`${first.exit.direction}\` line (line ${first.exit.span.line}) — the only legal second reference is the exact mirror (\`${OPPOSITE_DIRECTION[first.exit.direction] ?? '?'} to the ${first.owner.name} through the ${door.name}\` in \`${byId.get(first.exit.to)?.name ?? first.exit.to}\`), stated at most once.`,
            exit.span,
          );
        }
      }
    }

    // Plain mirror of a door exit (platform-issue-sweep Phase 8 #6): a
    // plain `<dir> to <room>` line whose reverse side is door-wired would
    // re-stamp BOTH directions without the door at load, silently unwiring
    // it (the loader's connectRooms stamps the reverse too). The author
    // must name the door — or drop the line entirely, since one door-wired
    // side already connects both rooms.
    for (const owner of entities) {
      for (const exit of owner.exits) {
        if (exit.via !== null) continue;
        const target = byId.get(exit.to);
        if (!target) continue;
        const reverse = target.exits.find(
          (e) => e.via !== null && e.via !== '' && e.to === owner.id
            && e.direction === OPPOSITE_DIRECTION[exit.direction],
        );
        if (reverse) {
          const doorName = byId.get(reverse.via!)?.name ?? reverse.via;
          this.diagnostics.error(
            'analysis.door-plain-mirror',
            `\`${owner.name}\`'s plain \`${exit.direction}\` line mirrors a door exit — \`${target.name}\` wires \`${reverse.direction}\` through \`${doorName}\` (line ${reverse.span.line}), and a plain mirror would silently unwire the door at load. Name the door (\`${exit.direction} to the ${target.name} through the ${doorName}\`) or drop this line (the door side already connects both rooms).`,
            exit.span,
          );
        }
      }
    }

    // Unconnected door: declared-but-unanswerable, uniformly hard (D3 —
    // same class as region-memberless; its room pair could never resolve).
    for (const door of entities.filter(isDoorEntity)) {
      if (!firstRef.has(door.id)) {
        this.diagnostics.error(
          'analysis.door-unconnected',
          `Door \`${door.name}\` is never referenced by a \`through\` exit line — an unconnected door is unanswerable (its room pair could never resolve). Add \`<direction> to the <room> through the ${door.name}\` on a room.`,
          door.span,
        );
      }
    }
  }

  /**
   * ADR-239 D4's never-guess table gates + lowering: resolve each
   * `define topics` block onto its owner entity's `topics` rows. Runs
   * after every entity is built so owner kinds and cross-tier name
   * lookups are all available. Gates (each its own diagnostic): a second
   * block for the same owner, a non-person host, a duplicate topic
   * (entity or normalized quoted text, aliases included), and a quoted
   * entry colliding with the name/aka of an entity used in an
   * entity-tier row of the same table.
   */
  private applyTopics(entities: IREntity[]): void {
    const byId = new Map(entities.map((e) => [e.id, e]));
    /** owner id → first block's span (duplicate-block gate). */
    const blockOwners = new Map<string, Span>();

    for (const decl of this.ast.declarations) {
      if (decl.kind !== 'define-topics') continue;
      if (decl.owner.words.length === 0) continue; // header parse error already reported
      const ownerId = this.resolveEntityId(decl.owner);
      if (!ownerId) continue; // unknown/ambiguous — standard errors already reported
      const owner = byId.get(ownerId);
      const sym = this.byId.get(ownerId) ?? null;
      if (!owner) continue;

      const first = blockOwners.get(ownerId);
      if (first) {
        this.diagnostics.error(
          'analysis.duplicate-topics-block',
          `\`${owner.name}\` already has a \`define topics\` block at line ${first.line} — the table lives in one place; merge the rows.`,
          decl.span,
        );
        continue;
      }
      blockOwners.set(ownerId, decl.span);

      if (!owner.kinds.some((k) => k.name === 'person')) {
        const kind = owner.kinds[0] ? `a ${owner.kinds[0].name}` : 'a plain thing';
        this.diagnostics.error(
          'analysis.topics-host',
          `\`define topics\` needs a person — \`${owner.name}\` is ${kind}, and only people answer \`ask\`/\`tell\` (a table here could never be reached).`,
          decl.span,
        );
        continue;
      }

      // Entity-tier refs resolve once, up front: the cross-tier collision
      // gate must see every entity-tier row's names, even those declared
      // AFTER a colliding quoted row.
      const resolvedRefs = decl.rows.map((row) =>
        row.filter.kind === 'entity' ? this.resolveEntityId(row.filter.ref) : null,
      );
      /** normalized name/aka of entity-tier row entities → display name. */
      const entityTierNames = new Map<string, string>();
      for (const id of resolvedRefs) {
        if (!id) continue;
        const rowSym = this.byId.get(id);
        if (!rowSym) continue;
        entityTierNames.set(normalizeTopic(rowSym.nameLower), rowSym.nameLower);
        for (const alias of rowSym.aka) entityTierNames.set(normalizeTopic(alias), rowSym.nameLower);
      }

      const scope = entityScope(sym);
      const rows: IRTopicRow[] = [];
      const seenEntities = new Map<string, Span>();
      const seenTexts = new Map<string, Span>();

      for (let i = 0; i < decl.rows.length; i++) {
        const row = decl.rows[i];
        if (row.filter.kind === 'entity') {
          const id = resolvedRefs[i];
          if (!id) continue; // unresolved — already reported
          const dup = seenEntities.get(id);
          if (dup) {
            this.diagnostics.error(
              'analysis.duplicate-topic',
              `\`${this.byId.get(id)?.nameLower ?? id}\` is already a topic of this table (line ${dup.line}) — a topic answers in one place; merge the rows.`,
              row.span,
            );
            continue;
          }
          seenEntities.set(id, row.span);
          rows.push({
            filter: { kind: 'entity', id },
            // Keyed on the IR row index — the same index the runtime's topic
            // occurrence key uses, so the two cannot drift.
            body: row.body.map((s, i) =>
              this.resolveStatement(s, scope, `topic.${ownerId}.row-${rows.length}.${i}`),
            ),
            span: row.span,
          });
        } else {
          const texts = [row.filter.primary, ...row.filter.aliases];
          let rejected = false;
          for (const text of texts) {
            const norm = normalizeTopic(text);
            const dup = seenTexts.get(norm);
            if (dup) {
              this.diagnostics.error(
                'analysis.duplicate-topic',
                `"${text}" is already declared in this table (line ${dup.line}) — aliases included, a topic answers in one place.`,
                row.filter.span,
              );
              rejected = true;
              continue;
            }
            seenTexts.set(norm, row.span);
            const collidesWith = entityTierNames.get(norm);
            if (collidesWith) {
              this.diagnostics.error(
                'analysis.topic-entity-collision',
                `"${text}" collides with \`${collidesWith}\` — that entity is already an entity-tier row of this table, and the quoted spelling would shadow its quiet entity resolution. Remove one.`,
                row.filter.span,
              );
              rejected = true;
            }
          }
          if (rejected) continue;
          rows.push({
            filter: { kind: 'text', primary: row.filter.primary, aliases: row.filter.aliases },
            body: row.body.map((s, i) =>
              this.resolveStatement(s, scope, `topic.${ownerId}.row-${rows.length}.${i}`),
            ),
            span: row.span,
          });
        }
        this.checkPhaseOrder(row.body, { ended: null });
      }

      const axes = this.phraseAxesFor(owner);
      for (const row of rows) this.checkPhraseExclusivity(row, axes);

      owner.topics = rows;
    }
  }

  /**
   * ADR-320 D5 (vocabulary frozen 2026-08-17): fold each `define manner`
   * block onto its owner entity's `manner` rows. Gates: a second block for
   * the same owner, a non-person host, more than one `voice` word in a
   * row. Rows are NOT required to be mutually exclusive — several may be
   * live at once (the ADR's own example conditions one row on mood and
   * one on band); selection layering is the scene runtime's. Beat phrase
   * keys re-derive pass 1's deterministic minting
   * (`<owner>.manner-<row>-<line>`), so the two cannot drift.
   */
  private applyManner(entities: IREntity[]): void {
    const byId = new Map(entities.map((e) => [e.id, e]));
    /** owner id → first block's span (duplicate-block gate). */
    const blockOwners = new Map<string, Span>();

    for (const decl of this.ast.declarations) {
      if (decl.kind !== 'define-manner') continue;
      if (decl.owner.words.length === 0) continue; // header parse error already reported
      const ownerId = this.resolveEntityId(decl.owner);
      if (!ownerId) continue; // unknown/ambiguous — standard errors already reported
      const owner = byId.get(ownerId);
      const sym = this.byId.get(ownerId) ?? null;
      if (!owner) continue;

      const first = blockOwners.get(ownerId);
      if (first) {
        this.diagnostics.error(
          'analysis.duplicate-manner-block',
          `\`${owner.name}\` already has a \`define manner\` block at line ${first.line} — a character's manner lives in one place; merge the rows.`,
          decl.span,
        );
        continue;
      }
      blockOwners.set(ownerId, decl.span);

      if (!owner.kinds.some((k) => k.name === 'person')) {
        const kind = owner.kinds[0] ? `a ${owner.kinds[0].name}` : 'a plain thing';
        this.diagnostics.error(
          'analysis.manner-host',
          `\`define manner\` needs a person — \`${owner.name}\` is ${kind}, and manner colors a character's delivery (a block here could never fire).`,
          decl.span,
        );
        continue;
      }

      const scope = entityScope(sym);
      const rows: IRMannerRow[] = [];
      decl.rows.forEach((row, r) => {
        const beatKeys: string[] = [];
        let voice: string | undefined;
        row.lines.forEach((mline, b) => {
          if (mline.kind === 'beat') {
            beatKeys.push(`${ownerId}.manner-${r}-${b}`);
          } else if (voice !== undefined) {
            this.diagnostics.error(
              'analysis.manner-voice-duplicate',
              'This manner row already sets `voice` — one voice word per row.',
              mline.span,
            );
          } else {
            voice = mline.word;
          }
        });
        rows.push({
          condition: this.resolveCondition(row.condition, scope),
          beatKeys,
          ...(voice !== undefined ? { voice } : {}),
          span: row.span,
        });
      });
      owner.manner = rows;
    }
  }

  /**
   * ADR-320 D4 (spelling frozen 2026-08-17): fold each `define greetings`
   * block onto its owner entity's `greetings` rows. Gates: a second block
   * for the same owner, a non-person host, and a duplicate boundary head
   * (a boundary answers in one place). Bodies lower exactly as topic-row
   * bodies do, occurrence-keyed on the IR row index.
   */
  private applyGreetings(entities: IREntity[]): void {
    const byId = new Map(entities.map((e) => [e.id, e]));
    /** owner id → first block's span (duplicate-block gate). */
    const blockOwners = new Map<string, Span>();

    for (const decl of this.ast.declarations) {
      if (decl.kind !== 'define-greetings') continue;
      if (decl.owner.words.length === 0) continue; // header parse error already reported
      const ownerId = this.resolveEntityId(decl.owner);
      if (!ownerId) continue; // unknown/ambiguous — standard errors already reported
      const owner = byId.get(ownerId);
      const sym = this.byId.get(ownerId) ?? null;
      if (!owner) continue;

      const first = blockOwners.get(ownerId);
      if (first) {
        this.diagnostics.error(
          'analysis.duplicate-greetings-block',
          `\`${owner.name}\` already has a \`define greetings\` block at line ${first.line} — the boundary rows live in one place; merge them.`,
          decl.span,
        );
        continue;
      }
      blockOwners.set(ownerId, decl.span);

      if (!owner.kinds.some((k) => k.name === 'person')) {
        const kind = owner.kinds[0] ? `a ${owner.kinds[0].name}` : 'a plain thing';
        this.diagnostics.error(
          'analysis.greetings-host',
          `\`define greetings\` needs a person — \`${owner.name}\` is ${kind}, and only people hold conversation boundaries (a block here could never be reached).`,
          decl.span,
        );
        continue;
      }

      const scope = entityScope(sym);
      const rows: IRGreetingRow[] = [];
      const seenHeads = new Map<string, Span>();
      for (const row of decl.rows) {
        const headKey =
          row.head.kind === 'return' ? `return:${row.head.absence ?? 'plain'}`
          : row.head.kind === 'asked' ? `asked:${row.head.word}`
          : row.head.kind;
        const dup = seenHeads.get(headKey);
        if (dup) {
          this.diagnostics.error(
            'analysis.duplicate-greeting',
            `This boundary is already declared in this block (line ${dup.line}) — a boundary answers in one place; merge the rows.`,
            row.span,
          );
          continue;
        }
        seenHeads.set(headKey, row.span);

        const head: IRGreetingRow['head'] =
          row.head.kind === 'first-time' ? { kind: 'first-time' }
          : row.head.kind === 'return' ? { kind: 'return', absence: row.head.absence }
          : row.head.kind === 'asked' ? { kind: 'asked', word: row.head.word }
          : { kind: 'leaving' };
        rows.push({
          head,
          body: row.body.map((s, i) =>
            this.resolveStatement(s, scope, `greeting.${ownerId}.row-${rows.length}.${i}`),
          ),
          span: row.span,
        });
        this.checkPhaseOrder(row.body, { ended: null });
      }
      owner.greetings = rows;
    }
  }

  /**
   * ADR-320 D4/D10 (vocabulary frozen 2026-08-17): fold each `define
   * exchange` block onto its owner entity's `exchanges` list. Gates: a
   * second exchange with the same key for the same owner, a non-person
   * host, a duplicate response row (an answer answers in one place —
   * aliases included, plus the quoted-vs-entity-tier collision, the
   * topic-table rules), a duplicate act row, a second `on silence` row.
   * Bodies lower exactly as topic-row bodies do, occurrence-keyed on the
   * exchange name and IR row index.
   */
  private applyExchanges(entities: IREntity[]): void {
    const byId = new Map(entities.map((e) => [e.id, e]));
    /** owner id → exchange key → first block's span (duplicate gate). */
    const seen = new Map<string, Map<string, Span>>();

    for (const decl of this.ast.declarations) {
      if (decl.kind !== 'define-exchange') continue;
      if (decl.owner.words.length === 0 || decl.name === '') continue; // header parse error already reported
      const ownerId = this.resolveEntityId(decl.owner);
      if (!ownerId) continue; // unknown/ambiguous — standard errors already reported
      const owner = byId.get(ownerId);
      const sym = this.byId.get(ownerId) ?? null;
      if (!owner) continue;

      let ownerSeen = seen.get(ownerId);
      if (!ownerSeen) {
        ownerSeen = new Map();
        seen.set(ownerId, ownerSeen);
      }
      const first = ownerSeen.get(decl.name);
      if (first) {
        this.diagnostics.error(
          'analysis.duplicate-exchange',
          `\`${owner.name}\` already has an exchange \`${decl.name}\` at line ${first.line} — an exchange lives in one place; merge the rows or rename one.`,
          decl.span,
        );
        continue;
      }
      ownerSeen.set(decl.name, decl.span);

      if (!owner.kinds.some((k) => k.name === 'person')) {
        const kind = owner.kinds[0] ? `a ${owner.kinds[0].name}` : 'a plain thing';
        this.diagnostics.error(
          'analysis.exchange-host',
          `\`define exchange\` needs a person — \`${owner.name}\` is ${kind}, and an exchange is a speaker's own moment (a block here could never open).`,
          decl.span,
        );
        continue;
      }

      // Entity-tier answer refs resolve once, up front — the cross-tier
      // collision gate must see every entity-tier row's names (the
      // topic-table discipline).
      const resolvedRefs = decl.rows.map((row) =>
        row.head.kind === 'answer' && row.head.filter.kind === 'entity'
          ? this.resolveEntityId(row.head.filter.ref)
          : null,
      );
      /** normalized name/aka of entity-tier answer entities → display name. */
      const entityTierNames = new Map<string, string>();
      for (const id of resolvedRefs) {
        if (!id) continue;
        const rowSym = this.byId.get(id);
        if (!rowSym) continue;
        entityTierNames.set(normalizeTopic(rowSym.nameLower), rowSym.nameLower);
        for (const alias of rowSym.aka) entityTierNames.set(normalizeTopic(alias), rowSym.nameLower);
      }

      const scope = entityScope(sym);
      const rows: IRExchangeRow[] = [];
      const seenEntities = new Map<string, Span>();
      const seenTexts = new Map<string, Span>();
      const seenActs = new Map<string, Span>();
      let seenSilence: Span | null = null;

      for (let i = 0; i < decl.rows.length; i++) {
        const row = decl.rows[i];
        let head: IRExchangeRow['head'] | null = null;
        if (row.head.kind === 'answer') {
          if (row.head.filter.kind === 'entity') {
            const id = resolvedRefs[i];
            if (!id) continue; // unresolved — already reported
            const dup = seenEntities.get(id);
            if (dup) {
              this.diagnostics.error(
                'analysis.duplicate-answer',
                `\`${this.byId.get(id)?.nameLower ?? id}\` is already an answer of this exchange (line ${dup.line}) — an answer answers in one place; merge the rows.`,
                row.span,
              );
              continue;
            }
            seenEntities.set(id, row.span);
            head = { kind: 'answer', filter: { kind: 'entity', id } };
          } else {
            const texts = [row.head.filter.primary, ...row.head.filter.aliases];
            let rejected = false;
            for (const text of texts) {
              const norm = normalizeTopic(text);
              const dup = seenTexts.get(norm);
              if (dup) {
                this.diagnostics.error(
                  'analysis.duplicate-answer',
                  `"${text}" is already declared in this exchange (line ${dup.line}) — aliases included, an answer answers in one place.`,
                  row.head.filter.span,
                );
                rejected = true;
                continue;
              }
              seenTexts.set(norm, row.span);
              const collidesWith = entityTierNames.get(norm);
              if (collidesWith) {
                this.diagnostics.error(
                  'analysis.answer-entity-collision',
                  `"${text}" collides with \`${collidesWith}\` — that entity is already an entity-tier answer of this exchange, and the quoted spelling would shadow its quiet entity resolution. Remove one.`,
                  row.head.filter.span,
                );
                rejected = true;
              }
            }
            if (rejected) continue;
            head = { kind: 'answer', filter: { kind: 'text', primary: row.head.filter.primary, aliases: row.head.filter.aliases } };
          }
        } else if (row.head.kind === 'act') {
          const dup = seenActs.get(row.head.action);
          if (dup) {
            this.diagnostics.error(
              'analysis.duplicate-answer',
              `\`on ${row.head.action}\` is already a row of this exchange (line ${dup.line}) — a response answers in one place; merge the rows.`,
              row.span,
            );
            continue;
          }
          seenActs.set(row.head.action, row.span);
          head = { kind: 'act', action: row.head.action };
        } else {
          if (seenSilence) {
            this.diagnostics.error(
              'analysis.duplicate-answer',
              `\`on silence\` is already a row of this exchange (line ${seenSilence.line}) — a response answers in one place; merge the rows.`,
              row.span,
            );
            continue;
          }
          seenSilence = row.span;
          head = { kind: 'silence' };
        }

        rows.push({
          head,
          body: row.body.map((s, j) =>
            this.resolveStatement(s, scope, `exchange.${ownerId}.${decl.name}.row-${rows.length}.${j}`),
          ),
          span: row.span,
        });
        this.checkPhaseOrder(row.body, { ended: null });
      }

      const axes = this.phraseAxesFor(owner);
      for (const row of rows) this.checkPhraseExclusivity(row, axes);

      (owner.exchanges ??= []).push({
        name: decl.name,
        ...(decl.strength ? { strength: decl.strength } : {}),
        rows,
        span: decl.span,
      });
    }
  }

  /**
   * ADR-320 D7 (vocabulary frozen 2026-08-17): fold each `define
   * initiative` block onto its owner entity's `initiative` rows. Gates: a
   * second block for the same owner, a non-person host, and a `hold
   * their tongue` sharing a row body with other statements (a suppression
   * cannot also speak). Rows are NOT required to be mutually exclusive —
   * most-specific-wins selection is the scene runtime's.
   */
  private applyInitiative(entities: IREntity[]): void {
    const byId = new Map(entities.map((e) => [e.id, e]));
    /** owner id → first block's span (duplicate-block gate). */
    const blockOwners = new Map<string, Span>();

    for (const decl of this.ast.declarations) {
      if (decl.kind !== 'define-initiative') continue;
      if (decl.owner.words.length === 0) continue; // header parse error already reported
      const ownerId = this.resolveEntityId(decl.owner);
      if (!ownerId) continue; // unknown/ambiguous — standard errors already reported
      const owner = byId.get(ownerId);
      const sym = this.byId.get(ownerId) ?? null;
      if (!owner) continue;

      const first = blockOwners.get(ownerId);
      if (first) {
        this.diagnostics.error(
          'analysis.duplicate-initiative-block',
          `\`${owner.name}\` already has a \`define initiative\` block at line ${first.line} — a character's initiative lives in one place; merge the rows.`,
          decl.span,
        );
        continue;
      }
      blockOwners.set(ownerId, decl.span);

      if (!owner.kinds.some((k) => k.name === 'person')) {
        const kind = owner.kinds[0] ? `a ${owner.kinds[0].name}` : 'a plain thing';
        this.diagnostics.error(
          'analysis.initiative-host',
          `\`define initiative\` needs a person — \`${owner.name}\` is ${kind}, and initiative is a character's own seizure of a moment (a block here could never fire).`,
          decl.span,
        );
        continue;
      }

      const scope = entityScope(sym);
      const rows: IRInitiativeRow[] = [];
      for (const row of decl.rows) {
        // A suppression cannot also speak: `hold their tongue` is the
        // row's only statement, or an error.
        if (row.body.some((s) => s.kind === 'hold-tongue') && row.body.length > 1) {
          this.diagnostics.error(
            'analysis.hold-tongue-alone',
            '`hold their tongue` must be the row\'s only statement — a suppression cannot also speak; split the row if both behaviors are wanted under different conditions.',
            row.span,
          );
          continue;
        }
        const occasion: IRInitiativeRow['occasion'] =
          row.head.kind === 'act' ? { kind: 'act', action: row.head.action } : { kind: row.head.kind };
        rows.push({
          occasion,
          condition: row.condition ? this.resolveCondition(row.condition, scope) : null,
          body: row.body.map((s, j) =>
            this.resolveStatement(s, scope, `initiative.${ownerId}.row-${rows.length}.${j}`),
          ),
          span: row.span,
        });
        this.checkPhaseOrder(row.body, { ended: null });
      }
      owner.initiative = rows;
    }
  }

  /**
   * ADR-320 D14 (vocabulary frozen 2026-08-17): fold each `define
   * conversation` block onto its owner entity's `conversations`. Gates: a
   * duplicate (owner, key) pair, a non-person host. The parser already
   * gated the block shape (at least one beat, exactly one conclusion,
   * one-per-block rows); bodies lower through the same statement
   * resolution as every conversation row, so `then asks` targets join
   * `checkConversationTargets`'s walk.
   */
  private applyConversations(entities: IREntity[]): void {
    const byId = new Map(entities.map((e) => [e.id, e]));
    /** owner id → key → first span (duplicate gate). */
    const seen = new Map<string, Map<string, Span>>();

    for (const decl of this.ast.declarations) {
      if (decl.kind !== 'define-conversation') continue;
      if (decl.owner.words.length === 0 || !decl.name) continue; // header parse error already reported
      const ownerId = this.resolveEntityId(decl.owner);
      if (!ownerId) continue; // unknown/ambiguous — standard errors already reported
      const owner = byId.get(ownerId);
      const sym = this.byId.get(ownerId) ?? null;
      if (!owner) continue;

      let ownerSeen = seen.get(ownerId);
      if (!ownerSeen) {
        ownerSeen = new Map();
        seen.set(ownerId, ownerSeen);
      }
      const first = ownerSeen.get(decl.name);
      if (first) {
        this.diagnostics.error(
          'analysis.duplicate-conversation',
          `\`${owner.name}\` already has a conversation \`${decl.name}\` at line ${first.line} — a thread lives in one place; merge the beats or rename one.`,
          decl.span,
        );
        continue;
      }
      ownerSeen.set(decl.name, decl.span);

      if (!owner.kinds.some((k) => k.name === 'person')) {
        const kind = owner.kinds[0] ? `a ${owner.kinds[0].name}` : 'a plain thing';
        this.diagnostics.error(
          'analysis.conversation-host',
          `\`define conversation\` needs a person — \`${owner.name}\` is ${kind}, and a thread is a speaker's own subject (a block here could never open).`,
          decl.span,
        );
        continue;
      }

      const scope = entityScope(sym);
      const keyOf = (part: string): string => `conversation.${ownerId}.${decl.name}.${part}`;
      const lowerBody = (body: Statement[], part: string): IRStatement[] =>
        body.map((s, j) => this.resolveStatement(s, scope, `${keyOf(part)}.${j}`));

      // The `about` filter — the exchange-answer lowering: entity tier
      // resolves to a world id; the text tier carries its spellings.
      let filter: IRConversation['filter'];
      if (decl.about) {
        if (decl.about.kind === 'entity') {
          const id = this.resolveEntityId(decl.about.ref);
          if (id) filter = { kind: 'entity', id };
          // an unresolved ref is already reported by resolveEntityId
        } else {
          filter = { kind: 'text', primary: decl.about.primary, aliases: decl.about.aliases };
        }
      }

      const beats: IRConversationBeat[] = decl.beats.map((beat, i) => {
        this.checkPhaseOrder(beat.body, { ended: null });
        return {
          condition: beat.condition ? this.resolveCondition(beat.condition, scope) : null,
          body: lowerBody(beat.body, `beat-${i}`),
          span: beat.span,
        };
      });

      const conversation: IRConversation = {
        name: decl.name,
        ...(decl.strength ? { strength: decl.strength } : {}),
        ...(filter ? { filter } : {}),
        ...(decl.opensWhen ? { opensWhen: this.resolveCondition(decl.opensWhen, scope) } : {}),
        beats,
        ...(decl.onParting ? { onParting: lowerBody(decl.onParting, 'parting') } : {}),
        ...(decl.onResuming ? { onResuming: lowerBody(decl.onResuming, 'resuming') } : {}),
        ...(decl.onRefusing ? { onRefusing: lowerBody(decl.onRefusing, 'refusing') } : {}),
        conclusion: lowerBody(decl.conclusion ?? [], 'conclusion'),
        span: decl.span,
      };
      for (const body of [decl.onParting, decl.onResuming, decl.onRefusing, decl.conclusion]) {
        if (body) this.checkPhaseOrder(body, { ended: null });
      }

      const axes = this.phraseAxesFor(owner);
      for (const beat of conversation.beats) this.checkPhraseExclusivity(beat, axes);

      (owner.conversations ??= []).push(conversation);
    }
  }

  /**
   * ADR-320 D4/D8 target validation, after every conversation fold: a
   * `then asks`/`then invites` must name an exchange of the SAME owner
   * (a cross-owner open makes no sense — the exchange is the speaker's
   * own moment), and a `deflect to` must name a row of the owner's OWN
   * topic table. Walks every conversation body recursively (select
   * arms, ordinal and each bodies included). An empty deflect text
   * primary is the resolveStatement marker for an entity reference that
   * already failed to resolve — skipped, the miss is reported.
   */
  private checkConversationTargets(entities: IREntity[]): void {
    for (const e of entities) {
      const exchangeNames = new Set((e.exchanges ?? []).map((x) => x.name));
      const topicEntityIds = new Set<string>();
      const topicTexts = new Set<string>();
      for (const row of e.topics) {
        if (row.filter.kind === 'entity') topicEntityIds.add(row.filter.id);
        else {
          topicTexts.add(normalizeTopic(row.filter.primary));
          for (const alias of row.filter.aliases) topicTexts.add(normalizeTopic(alias));
        }
      }

      const visit = (stmts: IRStatement[]): void => {
        for (const stmt of stmts) {
          switch (stmt.kind) {
            case 'then-open':
              if (!exchangeNames.has(stmt.exchange)) {
                this.diagnostics.error(
                  'analysis.then-target',
                  `\`${stmt.exchange}\` is not an exchange of \`${e.name}\` — \`then ${stmt.word}\` opens one of the speaker's own \`define exchange\` blocks${this.suggestText(stmt.exchange, [...exchangeNames])}.`,
                  stmt.span,
                );
              }
              break;
            case 'deflect':
              if (stmt.target.kind === 'entity') {
                if (!topicEntityIds.has(stmt.target.id)) {
                  this.diagnostics.error(
                    'analysis.deflect-target',
                    `\`${this.byId.get(stmt.target.id)?.nameLower ?? stmt.target.id}\` is not a topic of \`${e.name}\`'s table — \`deflect to\` redirects to a row of the owner's own \`define topics\` block.`,
                    stmt.span,
                  );
                }
              } else if (stmt.target.primary !== '' && !topicTexts.has(normalizeTopic(stmt.target.primary))) {
                this.diagnostics.error(
                  'analysis.deflect-target',
                  `"${stmt.target.primary}" is not a topic of \`${e.name}\`'s table — \`deflect to\` redirects to a row of the owner's own \`define topics\` block.`,
                  stmt.span,
                );
              }
              break;
            case 'select-on':
              for (const arm of stmt.arms) visit(arm.body);
              break;
            case 'select-strategy':
              for (const alt of stmt.alternatives) visit(alt);
              break;
            case 'ordinal':
            case 'each':
              visit(stmt.body);
              break;
            default:
              break;
          }
        }
      };

      for (const row of e.topics) visit(row.body);
      for (const row of e.greetings ?? []) visit(row.body);
      for (const x of e.exchanges ?? []) for (const row of x.rows) visit(row.body);
      for (const row of e.initiative ?? []) visit(row.body);
      for (const t of e.conversations ?? []) {
        for (const beat of t.beats) visit(beat.body);
        visit(t.onParting ?? []);
        visit(t.onResuming ?? []);
        visit(t.onRefusing ?? []);
        visit(t.conclusion);
      }
    }
  }

  /**
   * Single-valued axis table for the overlap prover. Mood (platform +
   * customs), band, and threat words are single-valued interior reads;
   * the owner's declared `states:` words are a single current value per
   * entity (`change it to <state>`). Words the evaluator can ALSO answer
   * through another mechanism are excluded — platform state adjectives
   * fall through `stateAdjectiveHolds`, and a state word that is also a
   * mood word is reachable through both reads — the builder drops any
   * cross-axis collision, and we pre-filter the platform adjectives.
   */
  private phraseAxesFor(owner: IREntity): SingleValuedAxes {
    const platformAdjectives = new Set<string>([...STATE_ADJECTIVES, 'dark']);
    return buildSingleValuedAxes({
      mood: [...CHARACTER_MANIFEST.moods, ...this.customMoods.keys()],
      band: CHARACTER_MANIFEST.pressureBands,
      threat: CHARACTER_MANIFEST.threats,
      'entity-state': owner.states.filter((s) => !platformAdjectives.has(s)),
    });
  }

  /**
   * The only-match rule for a topic arm (D7 ruling, 2026-08-16): at most
   * one unconditional phrase line (the default, delivered only when no
   * conditional line matches), and every pair of conditional lines must
   * be PROVABLY exclusive — the compiler must hold a witness that no
   * state satisfies both. No witness is an error demanding the author
   * disambiguate (split on a state axis, or add a `not`). Deliberate
   * multiplicity belongs at the phrase level (`or`-separated variants),
   * never as two rows both in play.
   */
  private checkPhraseExclusivity(row: Pick<IRTopicRow, 'body'>, axes: SingleValuedAxes): void {
    const phrases = row.body.filter(
      (s): s is Extract<IRStatement, { kind: 'phrase' }> => s.kind === 'phrase',
    );
    const defaults = phrases.filter((p) => !p.stmtWhen);
    for (let i = 1; i < defaults.length; i++) {
      this.diagnostics.error(
        'analysis.phrase-overlap',
        `This row already has an unconditional response \`${defaults[0].phraseKey}\` (line ${defaults[0].span?.line}) — one default per row; give \`${defaults[i].phraseKey}\` a \`when\`.`,
        defaults[i].span,
      );
    }
    // The default is "when no conditional line matches" — order-free
    // semantics, but the runtime resolves first-in-order, so the default
    // must sit last or it would shadow a matched conditional line.
    if (defaults.length === 1) {
      const defaultIndex = phrases.indexOf(defaults[0]);
      const shadowed = phrases.find((p, i) => i > defaultIndex && p.stmtWhen);
      if (shadowed) {
        this.diagnostics.error(
          'analysis.phrase-overlap',
          `The unconditional response \`${defaults[0].phraseKey}\` must be the row's last line — written here it would shadow \`${shadowed.phraseKey}\` even when its \`when\` matches.`,
          defaults[0].span,
        );
      }
    }
    const conditional = phrases.filter((p) => p.stmtWhen);
    for (let i = 0; i < conditional.length; i++) {
      for (let j = i + 1; j < conditional.length; j++) {
        if (!provablyDisjoint(conditional[i].stmtWhen!, conditional[j].stmtWhen!, axes)) {
          this.diagnostics.error(
            'analysis.phrase-overlap',
            `\`${conditional[i].phraseKey}\` (line ${conditional[i].span?.line}) and \`${conditional[j].phraseKey}\` can both match the same state — response conditions must be provably exclusive. Split them on a state axis (mood, band, threat, story phase, \`feels\`) or add a \`not\`; for deliberate variety, use \`or\`-separated variants inside one phrase.`,
            conditional[j].span,
          );
        }
      }
    }
  }

  /** Machine names seen (duplicate gate). */
  private readonly machineNames = new Set<string>();

  /** Declared media assets (ADR-216): name → kind + path. */
  private readonly assets = new Map<string, { kind: 'sound' | 'image' | 'music'; path: string; span: Span }>();

  /**
   * Build one `define machine` (ADR-215 `use state-machines` depth):
   * gated on the `use`, states/targets/roles validated, single-word
   * triggers resolved (declared condition or story state wins, else an
   * action gerund), bodies in STORY_SCOPE (`it` unbound — the machine is
   * story-owned).
   */
  private buildMachine(decl: DefineMachine): IRMachineDef {
    if (!this.usedExtensions.has('state-machines')) {
      this.diagnostics.error(
        'analysis.extension-not-used',
        '`define machine` is `state-machines` extension vocabulary — add `use state-machines` to the story header.',
        decl.span,
      );
    }
    const name = decl.name.join(' ');
    this.registerUnique('machine', name, decl.span, 'analysis.duplicate-machine');
    this.machineNames.add(name);

    const stateNames = new Set(decl.states.map((s) => s.name));
    if (decl.states.length === 0) {
      this.diagnostics.error('analysis.machine-states', `Machine \`${name}\` declares no states.`, decl.span);
    }
    if (decl.initialState === null) {
      this.diagnostics.error('analysis.machine-starts', `Machine \`${name}\` needs a \`starts <state>\` line.`, decl.span);
    } else if (!stateNames.has(decl.initialState)) {
      this.diagnostics.error(
        'analysis.machine-starts',
        `\`starts ${decl.initialState}\` names no declared state of \`${name}\`${this.suggestText(decl.initialState, [...stateNames])}.`,
        decl.span,
      );
    }

    const roles = new Map<string, string>();
    for (const role of decl.roles) {
      if (roles.has(role.name)) {
        this.diagnostics.error('analysis.machine-role', `Role \`${role.name}\` is declared twice on \`${name}\`.`, role.span);
        continue;
      }
      const entity = this.resolveEntityId(role.entity);
      if (entity !== null) roles.set(role.name, entity);
    }

    const buildTransition = (t: MachineTransition): IRMachineTransition => {
      if (!stateNames.has(t.target)) {
        this.diagnostics.error(
          'analysis.machine-target',
          `\`${t.target}\` names no declared state of \`${name}\`${this.suggestText(t.target, [...stateNames])}.`,
          t.span,
        );
      }
      let trigger: IRMachineTransition['trigger'];
      switch (t.trigger.kind) {
        case 'event':
          trigger = { kind: 'event', event: t.trigger.event };
          break;
        case 'condition':
          trigger = { kind: 'condition', condition: this.resolveCondition(t.trigger.condition, STORY_SCOPE) };
          break;
        case 'word': {
          // Vocabulary-free parse: a declared condition or story state is a
          // condition trigger; anything else is an action gerund.
          if (this.conditionNames.has(t.trigger.word) || this.storyStates.includes(t.trigger.word)) {
            trigger = {
              kind: 'condition',
              condition: this.resolveCondition({ kind: 'condition-ref', name: t.trigger.word, span: t.trigger.span }, STORY_SCOPE),
            };
          } else {
            trigger = { kind: 'action', action: t.trigger.word, target: null };
          }
          break;
        }
        case 'action': {
          let target: string | null = null;
          if (t.trigger.target) {
            const words = t.trigger.target.words.map((w) => w.toLowerCase());
            if (words.length === 1 && roles.has(words[0])) {
              target = `$${words[0]}`; // the platform binding convention
            } else {
              target = this.resolveEntityId(t.trigger.target);
            }
          }
          trigger = { kind: 'action', action: t.trigger.action, target };
          break;
        }
      }
      return {
        trigger,
        condition: t.condition ? this.resolveCondition(t.condition, STORY_SCOPE) : null,
        target: t.target,
        span: t.span,
      };
    };

    return {
      name,
      roles: [...roles].map(([roleName, entity]) => ({ name: roleName, entity })),
      initialState: decl.initialState ?? decl.states[0]?.name ?? '',
      states: decl.states.map((s) => ({
        name: s.name,
        terminal: s.terminal,
        transitions: s.transitions.map(buildTransition),
        onEnter: s.onEnter.map((stmt, i) =>
          this.resolveStatement(stmt, STORY_SCOPE, `machine.${decl.name}.${s.name}.enter.${i}`),
        ),
        onExit: s.onExit.map((stmt, i) =>
          this.resolveStatement(stmt, STORY_SCOPE, `machine.${decl.name}.${s.name}.exit.${i}`),
        ),
        span: s.span,
      })),
      span: decl.span,
    };
  }

  /** Resolve a `when <owner> becomes <state>` step anchor (ratchet D10). */
  private resolveStepAnchor(step: { timing: string; owner: NameRef | null; state: string | null; span: Span }): { owner: string; state: string } | null {
    if (step.timing !== 'becomes' || !step.owner || !step.state) return null;
    const words = step.owner.words.map((w) => w.toLowerCase());
    if (words.length === 1 && words[0] === 'story') {
      if (!this.storyStates.includes(step.state)) {
        this.diagnostics.error(
          'analysis.undeclared-state',
          `\`${step.state}\` is not a declared state of the story${this.suggestText(step.state, this.storyStates)}.`,
          step.span,
        );
      }
      return { owner: 'story', state: step.state };
    }
    const id = this.resolveEntityId(step.owner);
    if (id === null) return null; // already reported
    const sym = this.byId.get(id);
    if (sym && !sym.states.includes(step.state)) {
      this.diagnostics.error(
        'analysis.undeclared-state',
        `\`${step.state}\` is not a declared state of ${sym.nameLower}${this.suggestText(step.state, sym.states)}.`,
        step.span,
      );
    }
    return { owner: id, state: step.state };
  }

  // ------------------------------------------------ Phase B declarations

  private buildTrait(decl: DefineTrait): IRTraitDef {
    const fields = new Map(decl.data.map((f) => [f.name.join(' '), f]));
    // States visible on `it`: the trait's own set plus every composer's
    // full merged set (D8 cross-trait resolution — `restless` reads
    // feedable's `hungry`).
    const visible = this.traitVisibleStates.get(decl.name) ?? decl.states.map((s) => s.name);
    const scope: Scope = {
      owner: null,
      fields,
      slots: null,
      ownStates: visible.length ? visible : null,
      scoreOwner: `trait.${decl.name}`,
      inEach: false,
      carrierIt: true,
    };
    return {
      name: decl.name,
      data: decl.data.map((f) => ({
        name: f.name.join(' '),
        type: f.type,
        optional: f.optional,
        initial: f.initial,
        oneOf: f.oneOf,
      })),
      states: decl.states.map((s) => s.name),
      statesReversible: decl.statesReversible,
      scores: decl.scores.map((s) => ({ name: `trait.${decl.name}.${s.name}`, worth: s.worth, span: s.span })),
      onClauses: this.checkDuplicateClauses(decl.onClauses, `trait \`${decl.name}\``).map((c, i) => this.buildOnClause(c, scope, `trait.${decl.name}`, i)),
      span: decl.span,
    };
  }

  /**
   * Duplicate-clause gate (Phase C P3, adopted from the 2026-07-11 review):
   * two clauses with the same (action, clauseKind, binding, role) on one
   * owner silently mask at runtime (interceptor/capability registration is
   * keyed) — a load error naming the first declaration. `on` vs `after` on
   * the same action is legal (different lifecycle halves); every-turn
   * clauses are exempt (daemons all fire). Event-verb clauses bind to the
   * event stream individually — there the mask is per-condition, so a
   * `while` condition differentiates (`after entering it while after-hours`
   * beside `after entering it while not after-hours` is legal; two
   * identically-conditioned clauses are not).
   * Returns the clauses unchanged for fluent use.
   */
  private checkDuplicateClauses(clauses: OnClause[], ownerDesc: string): OnClause[] {
    const seen = new Map<string, OnClause>();
    for (const clause of clauses) {
      if (clause.binding === 'every-turn') continue;
      // ADR-327 D1: the head's actor is part of the clause's identity —
      // `on the player taking` and `on the guards taking` on one owner are
      // two clauses, each firing for its own actor (Acceptance item 2).
      const actor = clause.actor ? valueExprText(clause.actor).toLowerCase() : '';
      let key = `${clause.clauseKind}|${clause.action}|${clause.binding}|${clause.role ?? ''}|${actor}`;
      if (EVENT_VERBS.has(clause.action)) {
        key += `|${clause.condition ? conditionFingerprint(clause.condition) : ''}`;
      }
      const first = seen.get(key);
      if (first) {
        this.diagnostics.error(
          'analysis.duplicate-clause',
          `A \`${clause.clauseKind} ${clause.action}\` clause is already declared on ${ownerDesc} at line ${first.span.line} — a second one would silently mask it. Merge the bodies (or split intercept/react across \`on\`/\`after\`).`,
          clause.span,
        );
        continue;
      }
      seen.set(key, clause);
    }
    return clauses;
  }

  /**
   * The grammar-surface line checks shared by `define action` and
   * `extend action` (ADR-270 D2): greedy lines (ADR-267 D10), the
   * `directions` block (D12), typed slots (D11), and scope constraints
   * (ADR-271 D1) — each validated against the block's own pattern slots.
   */
  private checkGrammarSurfaceLines(
    name: string,
    decl: Pick<DefineAction, 'constraints' | 'greedy' | 'slotTypes' | 'directions'>,
    slots: Set<string>,
  ): void {
    // ADR-267 D10: a greedy line names a slot that must exist in at least
    // one of the block's patterns — the constraint-line treatment.
    for (const g of decl.greedy) {
      if (!slots.has(g.slot)) {
        this.diagnostics.error(
          'analysis.unknown-slot',
          `\`${g.slot}\` is not a grammar slot of \`${name}\` — slots: ${[...slots].join(', ') || '(none)'}${this.suggestText(g.slot, [...slots])}.`,
          g.span,
        );
      }
    }

    // ADR-267 D12: a `directions` block binds to the slot named
    // `direction` — a block with no pattern carrying that slot is the
    // constraint-line treatment (analysis.unknown-slot), never a silently
    // inert block. Duplicate words within one block are unanswerable
    // (which canonical would the alias mean?) — refused, never guessed.
    if (decl.directions.length > 0) {
      if (!slots.has('direction')) {
        this.diagnostics.error(
          'analysis.unknown-slot',
          `A \`directions\` block binds to the \`direction\` slot, but no pattern of \`${name}\` uses \`the direction\` — slots: ${[...slots].join(', ') || '(none)'}.`,
          decl.directions[0].span,
        );
      }
      const seen = new Set<string>();
      for (const entry of decl.directions) {
        for (const word of [entry.canonical, ...entry.aliases]) {
          if (seen.has(word)) {
            this.diagnostics.error(
              'analysis.duplicate-direction',
              `\`${word}\` appears twice in the \`directions\` block — each word maps to one canonical direction.`,
              entry.span,
            );
          }
          seen.add(word);
        }
      }
    }

    // ADR-267 D11: typed slots — the slot must exist (constraint-line
    // treatment) and the type word is a closed two-word set (the ADR-271
    // D11 precedent: an unknown word names the supported set, never
    // silence).
    for (const st of decl.slotTypes) {
      if (!slots.has(st.slot)) {
        this.diagnostics.error(
          'analysis.unknown-slot',
          `\`${st.slot}\` is not a grammar slot of \`${name}\` — slots: ${[...slots].join(', ') || '(none)'}${this.suggestText(st.slot, [...slots])}.`,
          st.span,
        );
      }
      if (st.type !== 'instrument' && st.type !== 'topic') {
        this.diagnostics.error(
          'analysis.unknown-slot-type',
          `\`${st.type}\` is not a slot type — supported: instrument, topic${this.suggestText(st.type, ['instrument', 'topic'])}.`,
          st.span,
        );
      }
    }

    for (const constraint of decl.constraints) {
      if (!slots.has(constraint.slot)) {
        this.diagnostics.error(
          'analysis.unknown-slot',
          `\`${constraint.slot}\` is not a grammar slot of \`${name}\` — slots: ${[...slots].join(', ') || '(none)'}${this.suggestText(constraint.slot, [...slots])}.`,
          constraint.span,
        );
      }
      // ADR-271 D1: the requirement word is validated against the closed
      // catalog set, not accepted as any word — a constraint that cannot
      // gate is a compile error, never a silent no-op (ADR-235 D2 class).
      if (!(constraint.requirement in SCOPE_REQUIREMENT_PREDICATES)) {
        const supported = Object.keys(SCOPE_REQUIREMENT_PREDICATES);
        this.diagnostics.error(
          'analysis.unknown-requirement',
          `\`must be ${constraint.requirement}\` is not a supported scope requirement — supported: ${supported.join(', ')}${this.suggestText(constraint.requirement, supported)}.`,
          constraint.span,
        );
      }
    }
  }

  /**
   * `extend action <name>` → IR (ADR-270 D2): the grammar-surface subset,
   * with behavior sections rejected by name — the grammar-file-mode
   * treatment (`analysis.alteration-behavior`, one per offending category).
   * Target-name resolution happens in checkAlterationTargets (a whole-IR
   * post-pass — story actions may be declared after the alteration), gated
   * against the generated stdlib manifest (ADR-276 D1: chord is
   * platform-free but no longer stdlib-ignorant); the loader keeps the same
   * story-first resolution as its rogue-IR backstop.
   */
  private buildExtension(decl: ExtendAction): IRGrammarExtension {
    // The extension's own pattern lines are the slot universe for its
    // constraint-family lines; the target's base slots are not in view.
    const slots = new Set<string>();
    for (const pattern of decl.patterns) {
      for (const part of pattern.parts) {
        if (part.kind !== 'slot') continue;
        if (part.word.toLowerCase() === 'match') {
          this.diagnostics.error('analysis.reserved-name', RESERVED_MATCH_MESSAGE, part.span);
        }
        slots.add(part.word);
      }
    }

    const offend = (what: string, span: Span) =>
      this.diagnostics.error(
        'analysis.alteration-behavior',
        `\`extend action\` alters grammar only — ${what} belongs to the action's implementation, not an alteration block (ADR-270).`,
        span,
      );
    if (decl.musts.length > 0) offend('a `must` requirement', decl.musts[0].span);
    if (decl.refusals.length > 0) offend('a refusal line', decl.refusals[0].span);
    if (decl.otherwise) offend('`otherwise refuse`', decl.otherwise.span);
    if (decl.scores.length > 0) offend('a `score` line', decl.scores[0].span);
    if (decl.phrases) offend('a `phrases` block', decl.phrases.span);
    if (decl.body.length > 0) offend('a body statement', decl.body[0].span);

    if (decl.patterns.length === 0) {
      this.diagnostics.error(
        'analysis.empty-extension',
        `\`extend action ${decl.name}\` adds nothing — a \`grammar\` section with at least one pattern line is required.`,
        decl.span,
      );
    }

    this.checkGrammarSurfaceLines(decl.name, decl, slots);

    return {
      action: decl.name,
      patterns: decl.patterns.map((p) => ({
        parts: p.parts.map(lowerPatternPart),
        cardinality: p.cardinality,
        ...(p.means.length > 0 ? { means: p.means.map((m) => ({ key: m.key, value: m.value })) } : {}),
      })),
      ...(decl.greedy.length > 0 ? { greedy: decl.greedy.map((g) => g.slot) } : {}),
      ...(decl.slotTypes.length > 0
        ? { slotTypes: decl.slotTypes.map((st) => ({ slot: st.slot, type: st.type as 'instrument' | 'topic' })) }
        : {}),
      ...(decl.directions.length > 0
        ? { directions: decl.directions.map((d) => ({ canonical: d.canonical, aliases: d.aliases })) }
        : {}),
      // The cast is sound: checkGrammarSurfaceLines errors on any word
      // outside the catalog set, and the IR is meaningful only when `ok`.
      constraints: decl.constraints.map((sc) => ({ slot: sc.slot, requirement: sc.requirement as ScopeRequirementWord })),
      span: decl.span,
    };
  }

  /**
   * `remove from action <name>` → IR (ADR-270 D3): pattern shapes only —
   * `means` defaults and `→` cardinality are not part of a pattern's
   * identity and are rejected by name (`analysis.removal-shape`).
   */
  private buildRemoval(decl: RemoveFromAction): IRGrammarRemoval {
    for (const p of decl.patterns) {
      if (p.means.length > 0) {
        this.diagnostics.error(
          'analysis.removal-shape',
          'A removal line names a pattern shape only — `means` defaults are not part of a pattern\'s identity; remove the line.',
          p.means[0].span,
        );
      }
      if (p.cardinality) {
        this.diagnostics.error(
          'analysis.removal-shape',
          '`→` cardinality is not part of a pattern\'s identity — state the pattern shape only.',
          p.span,
        );
      }
    }
    return {
      action: decl.name,
      patterns: decl.patterns.map((p) => ({ parts: p.parts.map(lowerPatternPart), cardinality: null })),
      span: decl.span,
    };
  }

  private buildAction(decl: DefineAction): IRActionDef {
    const slots = this.actionSlots.get(decl.name) ?? new Set<string>();

    // ADR-275 D2/D5: semantic keys (`means` keys; `direction` under a
    // directions block) join the BODY scope exactly like slots — one
    // reference idiom. `slots` (pattern slots) stays the validation set
    // for constraints/greedy/slotTypes below. A `means` key duplicating an
    // ENTITY slot is refused — the word and the entity id would fight for
    // one binding (D5; the directions block's own `direction` identity is
    // exempt by construction).
    const hasDirections = decl.directions.length > 0;
    const entitySlots = new Set([...slots].filter((s) => !(hasDirections && s === 'direction')));
    const scopeSlots = new Set(slots);
    for (const p of decl.patterns) {
      for (const m of p.means) {
        if (entitySlots.has(m.key)) {
          this.diagnostics.error(
            'analysis.semantic-shadows-slot',
            `\`${m.key}\` is a \`means\` key and also an entity slot of \`${decl.name}\` — the word and the entity would fight for one binding. Rename the key.`,
            m.span,
          );
        } else if (hasDirections && m.key === 'direction') {
          this.diagnostics.error(
            'analysis.semantic-shadows-slot',
            `\`direction\` is bound by the \`directions\` block — a \`means direction …\` line would fight it for the same binding. Remove the line, or rename the block's slot usage.`,
            m.span,
          );
        }
        scopeSlots.add(m.key);
      }
    }
    // ADR-275 D4: the word set each semantic key can hold is statically
    // knowable — directions canonicals; the union of a means key's values.
    const semanticValues = new Map<string, string[]>();
    if (hasDirections) semanticValues.set('direction', decl.directions.map((d) => d.canonical));
    for (const p of decl.patterns) {
      for (const m of p.means) {
        if (entitySlots.has(m.key)) continue; // D5 error above; no value set
        const list = semanticValues.get(m.key) ?? [];
        if (!list.includes(m.value)) list.push(m.value);
        semanticValues.set(m.key, list);
      }
    }
    const scope: Scope = { owner: null, fields: null, slots: scopeSlots, ownStates: null, scoreOwner: `action.${decl.name}`, inEach: false, semanticValues };

    this.checkGrammarSurfaceLines(decl.name, decl, slots);

    const refusals = decl.refusals.map((r) => {
      this.requirePhrase(r.phraseKey, r.span, null);
      if (r.kind === 'without') {
        if (!slots.has(r.slot!)) {
          this.diagnostics.error(
            'analysis.unknown-slot',
            `\`${r.slot}\` is not a grammar slot of \`${decl.name}\` — slots: ${[...slots].join(', ') || '(none)'}${this.suggestText(r.slot!, [...slots])}.`,
            r.span,
          );
        }
        return { kind: 'without' as const, slot: r.slot!, phraseKey: r.phraseKey, span: r.span };
      }
      this.checkRefusalPolarity(r.condition!, r.span);
      return {
        kind: 'when' as const,
        condition: this.resolveCondition(r.condition!, scope),
        phraseKey: r.phraseKey,
        span: r.span,
      };
    });

    if (decl.otherwise) this.requirePhrase(decl.otherwise.phraseKey, decl.otherwise.span, null);

    const musts = decl.musts.map((m) => {
      this.requirePhrase(m.phraseKey, m.span, null);
      return {
        condition: this.resolveCondition({ kind: 'predicate', subject: m.subject, predicate: m.predicate, span: m.span }, scope),
        phraseKey: m.phraseKey,
        span: m.span,
      };
    });

    return {
      name: decl.name,
      patterns: decl.patterns.map((p) => ({
        parts: p.parts.map(lowerPatternPart),
        cardinality: p.cardinality,
        ...(p.means.length > 0 ? { means: p.means.map((m) => ({ key: m.key, value: m.value })) } : {}),
      })),
      ...(decl.greedy.length > 0 ? { greedy: decl.greedy.map((g) => g.slot) } : {}),
      ...(decl.slotTypes.length > 0
        ? { slotTypes: decl.slotTypes.map((st) => ({ slot: st.slot, type: st.type as 'instrument' | 'topic' })) }
        : {}),
      ...(decl.directions.length > 0
        ? { directions: decl.directions.map((d) => ({ canonical: d.canonical, aliases: d.aliases })) }
        : {}),
      // The cast is sound: the gate above errors on any word outside the
      // catalog set, and the IR is meaningful only when `ok` (atomic load).
      constraints: decl.constraints.map((sc) => ({ slot: sc.slot, requirement: sc.requirement as ScopeRequirementWord })),
      musts,
      refusals,
      otherwise: decl.otherwise?.phraseKey ?? null,
      scores: decl.scores.map((s) => ({ name: `action.${decl.name}.${s.name}`, worth: s.worth, span: s.span })),
      body: decl.body.map((s, i) => this.resolveStatement(s, scope, `action.${decl.name}.body.${i}`)),
      span: decl.span,
    };
  }

  // -------------------------------------------------------------- pass 1

  /**
   * ADR-269 D8/D4 gates: in a grammar file every declaration must be a
   * `define action` carrying grammar surfaces only (patterns, scope
   * constraints, greedy/typed-slot lines, `directions`, `means`). Anything
   * that defines behavior — `must` requirements, refusal lines, `otherwise
   * refuse`, scores, `phrases` blocks, body statements — and any other
   * declaration kind is a compile error, one per offending category.
   * (Imports are legal: the compile host splices them before analysis;
   * an unresolved survivor already errors in collect().)
   */
  private checkGrammarFileMode(): void {
    for (const decl of this.ast.declarations) {
      if (decl.kind === 'define-action') {
        const offend = (what: string, span: Span) =>
          this.diagnostics.error(
            'analysis.grammar-file-behavior',
            `A grammar file carries grammar only — ${what} belongs to the action's implementation, not this file (ADR-269).`,
            span,
          );
        if (decl.musts.length > 0) offend('a `must` requirement', decl.musts[0].span);
        if (decl.refusals.length > 0) offend('a refusal line', decl.refusals[0].span);
        if (decl.otherwise) offend('`otherwise refuse`', decl.otherwise.span);
        if (decl.scores.length > 0) offend('a `score` line', decl.scores[0].span);
        if (decl.phrases) offend('a `phrases` block', decl.phrases.span);
        if (decl.body.length > 0) offend('a body statement', decl.body[0].span);
      } else if (decl.kind !== 'import') {
        this.diagnostics.error(
          'analysis.grammar-file-declaration',
          `\`${decl.kind}\` is not legal in a grammar file — a grammar file carries only \`define action\` grammar (ADR-269).`,
          decl.span,
        );
      }
    }
  }

  private collect(): void {
    // Story header: declared phases + story-owned scores (ratchet D2/D12).
    if (this.ast.header) {
      this.checkStateSet(this.ast.header.states, 'the story');
      this.storyStates = this.ast.header.states.map((s) => s.name);
      for (const s of this.ast.header.scores) this.collectScore(s.name, s.worth, s.span, null);
      // Header `on every turn` clause bodies host inline phrase prose like
      // every other body context (platform-issue-sweep Phase 8 #14): story-
      // owned, so ownerless/bare-key scope — the same registration the five
      // pre-existing contexts use.
      for (const clause of this.ast.header.onClauses) this.collectInlineTexts(clause.body);
      for (const clause of this.ast.header.timerClauses) this.collectInlineTexts(clause.body);
      // `use phrasebook` lines (ADR-250 D2/D3) — header position puts every
      // used book ahead of body-declared books in the arbitration order.
      for (const use of this.ast.header.usePhrasebooks) this.collectUsePhrasebook(use);
    }

    for (const decl of this.ast.declarations) {
      if (decl.kind === 'create') this.collectEntity(decl);
      else if (decl.kind === 'define-condition') {
        this.conditionNames.add(decl.name);
        this.openConditions.set(decl.name, conditionReferencesIt(decl.condition));
      }
      else if (decl.kind === 'define-text' || decl.kind === 'define-hatch') {
        if (decl.name === 'br') {
          this.diagnostics.error('analysis.reserved-marker', '`br` is reserved for the built-in `{br}` line-break marker — pick another producer name.', decl.span);
        } else {
          this.hatchNames.add(decl.name);
        }
      }
      else if (decl.kind === 'define-counter') {
        // ADR-264: register the story-global counter name; duplicate is an error.
        if (this.registerUnique('counter', decl.name, decl.span, 'analysis.duplicate-counter')) {
          this.storyCounterNames.add(decl.name);
        }
      }
      else if (decl.kind === 'define-phrases') this.collectPhrasesBlock(decl);
      else if (decl.kind === 'define-phrase') this.collectPhraseDecl(decl);
      else if (decl.kind === 'define-phrasebook') this.collectPhrasebook(decl);
      else if (decl.kind === 'override-message') this.collectOverrideMessage(decl);
      else if (decl.kind === 'override-messages') this.collectOverrideMessages(decl);
      else if (decl.kind === 'import') {
        // The compile host resolves imports before analysis (splicing the
        // fragment's declarations at this position); one surviving here means
        // no resolver ran — direct parse/analyze callers included.
        this.diagnostics.error(
          'analysis.import-unresolved',
          `\`import "${decl.path}"\` was not resolved — compile with an \`importResolver\` host hook.`,
          decl.span,
        );
      }
      else if (decl.kind === 'define-asset') {
        // ADR-216: declared media assets — DATA references, one namespace.
        if (this.registerUnique('asset', decl.name, decl.span, 'analysis.duplicate-asset')) {
          this.assets.set(decl.name, { kind: decl.assetKind, path: decl.path, span: decl.span });
        }
      }
      else if (decl.kind === 'define-family-channel') {
        // ADR-241 D2: named family channels, per-family namespace — each
        // family is its own row in the table, so an ambient bed and an image
        // layer may share a name.
        const family = this.familyChannels[decl.family];
        const familyNs: UniqueNamespace = decl.family === 'ambient' ? 'ambient bed' : 'image layer';
        if (this.registerUnique(familyNs, decl.name, decl.span, 'analysis.duplicate-channel')) {
          family.set(decl.name, decl.span);
        }
      }
      else if (decl.kind === 'define-pronouns') {
        // ADR-242 D7: one namespace beside the standard four — shadowing a
        // standard word and redefining a set are each errors, never a merge.
        if (PRONOUN_WORDS.has(decl.name)) {
          this.diagnostics.error(
            'analysis.pronoun-set-shadows',
            `\`${decl.name}\` is a standard pronoun set — \`define pronouns\` names a new set; pick another name.`,
            decl.span,
          );
        } else if (this.registerUnique('pronoun set', decl.name, decl.span, 'analysis.duplicate-pronoun-set')) {
          this.pronounSetDecls.set(decl.name, decl);
        }
      }
      else if (decl.kind === 'define-fact') {
        // ADR-310 D14: fact names are unique; the value sets build after
        // symbol collection (values may name entities).
        this.registerUnique('fact', decl.name.words.join('-').toLowerCase(), decl.span, 'analysis.duplicate-fact');
        this.factDecls.push(decl);
      }
      else if (decl.kind === 'define-temperament') {
        // ADR-318 D3: temperament names are unique; force words resolve
        // here — the vocabulary is closed, no entity resolution needed.
        if (this.registerUnique('temperament', decl.name, decl.span, 'analysis.duplicate-temperament')) {
          const pairs = this.resolveForcePairs(decl.pairs, decl.name);
          this.temperamentDefs.set(decl.name, { name: decl.name, pairs, span: decl.span });
        }
      }
      else if (decl.kind === 'define-code') {
        // ADR-318 D4: code names are unique; the lines resolve after
        // symbol collection (scopes may name entities) — buildCodes.
        this.registerUnique('code', decl.name, decl.span, 'analysis.duplicate-code');
        this.codeDecls.push(decl);
      }
      else if (decl.kind === 'define-witnessed-topic') {
        // ADR-318 D12a: resolution needs the entity table — buildWitnessedTopics.
        this.witnessedTopicDecls.push(decl);
      }
      else if (decl.kind === 'define-honor') {
        // ADR-318 D7: honor bundle names are unique; face-acts resolve
        // here — the vocabulary is closed, no entity resolution needed.
        if (this.registerUnique('honor bundle', decl.name, decl.span, 'analysis.duplicate-honor')) {
          const acts: string[] = [];
          for (const line of decl.faceActs) {
            const surface = line.words.map((w) => w.word).join(' ');
            if (!CHARACTER_MANIFEST.faceActs.includes(surface)) {
              this.diagnostics.error(
                'analysis.unknown-face-act',
                `\`${surface}\` is not a face-act — the vocabulary: ${CHARACTER_MANIFEST.faceActs.join(', ')}${this.suggestText(surface, [...CHARACTER_MANIFEST.faceActs])}.`,
                line.span,
              );
              continue;
            }
            if (acts.includes(surface)) {
              this.diagnostics.error('analysis.face-act-duplicate', `\`${decl.name}\` already lists \`${surface}\`.`, line.span);
              continue;
            }
            acts.push(surface);
          }
          this.honorDefs.set(decl.name, acts);
        }
      }
      else if (decl.kind === 'define-mood') {
        // ADR-310 D5 (Option 2): a custom mood joins the same compile-time
        // vocabulary checks as platform words. The anchor must be a
        // PLATFORM mood — chained custom anchors would make placement a
        // scavenger hunt.
        if (CHARACTER_MANIFEST.moods.includes(decl.name)) {
          this.diagnostics.error(
            'analysis.mood-shadows-platform',
            `\`${decl.name}\` is a platform mood — \`define mood\` names a new word; pick another name.`,
            decl.span,
          );
        } else if (this.registerUnique('mood', decl.name, decl.span, 'analysis.duplicate-mood-word')) {
          if (!CHARACTER_MANIFEST.moods.includes(decl.like.word)) {
            this.diagnostics.error(
              'analysis.unknown-mood-word',
              `\`${decl.like.word}\` is not a platform mood — the anchor must be one of: ${CHARACTER_MANIFEST.moods.join(', ')}.`,
              decl.like.span,
            );
          } else if (decl.but && !CHARACTER_MANIFEST.moodModifiers.includes(decl.but.word)) {
            this.diagnostics.error(
              'analysis.unknown-mood-modifier',
              `\`${decl.but.word}\` is not a mood modifier — ${CHARACTER_MANIFEST.moodModifiers.join(', ')}.`,
              decl.but.span,
            );
          } else {
            this.customMoods.set(decl.name, decl);
          }
        }
      }
      else if (decl.kind === 'define-chapters') {
        // ADR-330 D1: one block per story; built in buildChapters after timers.
        if (this.chapterDecls.length > 0) {
          this.diagnostics.error('analysis.duplicate-chapters', 'This story already has a `define chapters` block — one block declares every chapter.', decl.span);
        } else {
          this.chapterDecls.push(decl);
        }
      }
      else if (decl.kind === 'define-personality') {
        // ADR-310 D5: a custom personality adjective. Platform personality
        // words, intensity words, and trait vocabulary all shadow it dead,
        // so each is refused by name.
        if (CHARACTER_MANIFEST.personality.includes(decl.name)) {
          this.diagnostics.error(
            'analysis.personality-shadows-platform',
            `\`${decl.name}\` is a platform personality word — \`define personality\` names a new word; pick another name.`,
            decl.span,
          );
        } else if (CHARACTER_MANIFEST.intensities.includes(decl.name)) {
          this.diagnostics.error(
            'analysis.personality-shadows-platform',
            `\`${decl.name}\` is an intensity word — it cannot also be a personality adjective.`,
            decl.span,
          );
        } else if (TRAIT_ADJECTIVES.has(decl.name) || manifestForAdjective(decl.name)) {
          this.diagnostics.error(
            'analysis.personality-shadows-trait',
            `\`${decl.name}\` is a trait adjective — it would compose as the trait, never as personality; pick another name.`,
            decl.span,
          );
        } else if (this.registerUnique('personality adjective', decl.name, decl.span, 'analysis.duplicate-personality-word')) {
          this.customPersonalities.set(decl.name, decl);
        }
      }
      else if (decl.kind === 'define-profile') {
        // ADR-310 D4/D5: story profiles share a namespace with the eight
        // platform presets (the pronoun-set-shadows precedent).
        if (CHARACTER_MANIFEST.profilePresets[decl.name]) {
          this.diagnostics.error(
            'analysis.profile-shadows-preset',
            `\`${decl.name}\` is a platform profile preset — \`define profile\` names a new profile; pick another name.`,
            decl.span,
          );
        } else if (this.registerUnique('profile', decl.name, decl.span, 'analysis.duplicate-profile')) {
          this.profileDecls.push(decl);
        }
      }
      else if (decl.kind === 'define-trait') {
        // ADR-289 D5: one of the two constructs the hand-rolled gates missed
        // — a second `define trait guard` used to compile, the later block
        // silently winning wherever the two disagreed.
        this.registerUnique('trait', decl.name, decl.span, 'analysis.duplicate-trait');
        this.traitNames.add(decl.name);
        for (const field of decl.data) {
          // Trait data fields resolve in value positions — the reserved-
          // name gate covers them like entity names (E3/P3).
          if (field.name.join(' ').toLowerCase() === 'match') {
            this.diagnostics.error('analysis.reserved-name', RESERVED_MATCH_MESSAGE, field.span);
          }
        }
        if (decl.states.length) {
          this.checkStateSet(decl.states, `trait \`${decl.name}\``);
          this.traitStates.set(decl.name, decl.states.map((s) => s.name));
          this.traitReversible.set(decl.name, decl.statesReversible);
        }
        for (const s of decl.scores) this.collectScore(s.name, s.worth, s.span, `trait.${decl.name}`);
        if (decl.phrases) this.collectPhrasesBlock(decl.phrases);
        for (const clause of decl.onClauses) this.collectInlineTexts(clause.body);
      }
      else if (decl.kind === 'define-action') {
        // ADR-289 D5: the other missed construct — a second `define action
        // petting` used to overwrite the first's slots silently.
        this.registerUnique('action', decl.name, decl.span, 'analysis.duplicate-action');
        const slots = new Set<string>();
        for (const pattern of decl.patterns) {
          for (const part of pattern.parts) {
            if (part.kind !== 'slot') continue;
            // Grammar slots resolve in value positions — same reserved-
            // name gate as entity names (E3/P3).
            if (part.word.toLowerCase() === 'match') {
              this.diagnostics.error('analysis.reserved-name', RESERVED_MATCH_MESSAGE, part.span);
            }
            slots.add(part.word);
          }
        }
        this.actionSlots.set(decl.name, slots);
        for (const s of decl.scores) this.collectScore(s.name, s.worth, s.span, `action.${decl.name}`);
        if (decl.phrases) this.collectPhrasesBlock(decl.phrases);
        this.collectInlineTexts(decl.body);
      }
      else if (decl.kind === 'define-sequence') {
        for (const step of decl.steps) this.collectInlineTexts(step.body);
      }
      else if (decl.kind === 'define-machine') {
        // Machine state bodies (`on enter` / `on exit`) host inline phrase
        // prose like every other body context (platform-issue-sweep Phase 8
        // #14) — ownerless/bare-key scope, matching the header clauses.
        for (const state of decl.states) {
          this.collectInlineTexts(state.onEnter);
          this.collectInlineTexts(state.onExit);
        }
      }
    }

    // Trait-declared states reach every composer (ratchet D8): merge each
    // trait's state set into the composing entity's, in composition order.
    // The same state name arriving from two sources is the D8 collision
    // gate — states are one namespace per entity.
    for (const e of this.entities) {
      for (const comp of e.decl.compositions) {
        if (comp.article) continue; // kind noun, not a trait
        const traitName = comp.words.join(' ').toLowerCase();
        const states = this.traitStates.get(traitName);
        if (!states) continue;
        for (const s of states) {
          const existing = e.stateSource.get(s);
          if (existing !== undefined && existing !== traitName) {
            const from = existing === 'own' ? `its own \`states:\` line` : `\`${existing}\``;
            this.diagnostics.error(
              'analysis.state-collision',
              `State \`${s}\` reaches ${e.nameLower} from both ${from} and \`${traitName}\` — states are one namespace per entity; rename one.`,
              comp.span,
            );
            continue;
          }
          if (existing === undefined) {
            e.states.push(s);
            e.stateSource.set(s, traitName);
          }
        }
      }
    }

    // Cross-trait visibility (D8): inside a trait's clauses, `it` may
    // reference any state on any composer's full merged set — `restless`
    // reads feedable's `hungry` without declaring it.
    for (const [t, own] of this.traitStates) this.traitVisibleStates.set(t, [...own]);
    for (const e of this.entities) {
      for (const comp of e.decl.compositions) {
        if (comp.article) continue;
        const t = comp.words.join(' ').toLowerCase();
        if (!this.traitNames.has(t)) continue;
        let vis = this.traitVisibleStates.get(t);
        if (!vis) {
          vis = [];
          this.traitVisibleStates.set(t, vis);
        }
        for (const s of e.states) if (!vis.includes(s)) vis.push(s);
      }
    }

    // Derived phrase keys: entity descriptions and per-entity overrides.
    for (const e of this.entities) {
      if (e.decl.description) {
        this.descriptionKeys.add(`${e.id}.description`);
        this.registerPhrase(DEFAULT_LOCALE, `${e.id}.description`, {
          strategy: null,
          variants: [this.variantOf(e.decl.description)],
          span: e.decl.description.span,
        });
      }
      if (e.decl.initialDescription) {
        // Z1: the `first time` prose — first-visit description, its own key.
        this.descriptionKeys.add(`${e.id}.initial-description`);
        this.registerPhrase(DEFAULT_LOCALE, `${e.id}.initial-description`, {
          strategy: null,
          variants: [this.variantOf(e.decl.initialDescription)],
          span: e.decl.initialDescription.span,
        });
      }
      let detailIndex = 0;
      for (const override of e.decl.phraseOverrides) {
        const isDetail = override.key === 'detail';
        if (isDetail) detailIndex++;
        // Z3b: multiple `detail` blocks per owner are legal (the one place a
        // key repeats) — later blocks get deterministic suffixed keys in
        // declaration order.
        const key = isDetail && detailIndex > 1 ? `${e.id}.detail.${detailIndex}` : `${e.id}.${override.key}`;

        if (isDetail && !override.condition) {
          this.diagnostics.error(
            'analysis.detail-unconditional',
            '`phrase detail` needs a `while <condition>` — unconditional detail belongs in the description (Z3b).',
            override.span,
          );
        }
        if (isDetail && (override.variants.length > 1 || override.strategy)) {
          this.diagnostics.error(
            'analysis.detail-variants',
            '`phrase detail` is one gated text per block — write another `phrase detail while …:` block for variety (Z3b).',
            override.span,
          );
        }
        // Never-guess: `while` on the lifecycle channels (entered/exited/
        // disappeared) and on ordinary overrides has no pinned semantics;
        // `present` gates ride the ADR-212 predicate seam, `detail` gates are
        // Z3b's whole point.
        if (override.condition && !isDetail && override.key !== 'present') {
          this.diagnostics.error(
            'analysis.override-gate',
            `\`while\` on \`phrase ${override.key}:\` has no defined semantics — only \`detail\` and \`present\` blocks take a gate.`,
            override.span,
          );
        }

        this.registerPhrase(DEFAULT_LOCALE, key, {
          strategy: (override.strategy as IRPhrase['strategy']) ?? null,
          ...(override.condition ? { condition: this.resolveCondition(override.condition, entityScope(e)) } : {}),
          variants: override.variants.map((v) => this.variantOf(v)),
          span: override.span,
        });
      }
      // Entity-owned clauses register their inline phrases under the
      // owner-derived key (phrase-override mechanism) — four owners each
      // declaring `phrase confession` must not collide (Phase C P3).
      for (const clause of e.decl.onClauses) this.collectInlineTexts(clause.body, e.id);
      // Event clause bodies (ADR-325 D3e/D3h) are owner-scoped the same way.
      for (const clause of e.decl.timerClauses) this.collectInlineTexts(clause.body, e.id);
      for (const clause of e.decl.moveClauses) this.collectInlineTexts(clause.body, e.id);
    }

    // Topic-table row bodies are entity-owned (ADR-239): their inline
    // phrases register owner-scoped like clause bodies. Owner resolution
    // here is silent — an unresolved owner is pass 2's error (applyTopics).
    for (const decl of this.ast.declarations) {
      if (decl.kind !== 'define-topics') continue;
      const owner = this.findEntitySilent(decl.owner);
      if (!owner) continue;
      for (const row of decl.rows) this.collectInlineTexts(row.body, owner.id);
    }

    // Greeting-row bodies are entity-owned the same way (ADR-320 D4), and
    // manner beats mint owner-scoped phrase keys deterministically from
    // declaration order (`manner-<row>-<beat>`) so compiles stay
    // byte-identical (ADR-320 D5); pass 2 (applyManner) re-derives the
    // same keys for the IR rows.
    for (const decl of this.ast.declarations) {
      if (decl.kind === 'define-greetings') {
        const owner = this.findEntitySilent(decl.owner);
        if (!owner) continue;
        for (const row of decl.rows) this.collectInlineTexts(row.body, owner.id);
      } else if (decl.kind === 'define-exchange' || decl.kind === 'define-initiative') {
        // Exchange and initiative row bodies are entity-owned the same
        // way (ADR-320 D4/D7): inline phrases register owner-scoped.
        const owner = this.findEntitySilent(decl.owner);
        if (!owner) continue;
        for (const row of decl.rows) this.collectInlineTexts(row.body, owner.id);
      } else if (decl.kind === 'define-conversation') {
        // Thread bodies are entity-owned the same way (ADR-320 D14):
        // beats, transition rows, and the conclusion alike.
        const owner = this.findEntitySilent(decl.owner);
        if (!owner) continue;
        for (const beat of decl.beats) this.collectInlineTexts(beat.body, owner.id);
        for (const body of [decl.onParting, decl.onResuming, decl.onRefusing, decl.conclusion]) {
          if (body) this.collectInlineTexts(body, owner.id);
        }
      } else if (decl.kind === 'define-manner') {
        const owner = this.findEntitySilent(decl.owner);
        if (!owner) continue;
        decl.rows.forEach((row, r) => {
          row.lines.forEach((mline, b) => {
            if (mline.kind !== 'beat') return;
            this.registerPhrase(DEFAULT_LOCALE, `${owner.id}.manner-${r}-${b}`, {
              strategy: null,
              variants: [{ text: mline.text, markers: [] }],
              span: mline.span,
            });
          });
        });
      }
    }
  }

  /**
   * Resolve a name to an entity symbol with resolveEntityId's exact
   * precedence (exact name → alias → unique in-order subset) but NO
   * diagnostics — for pass-1 uses where pass 2 will report the miss.
   */
  private findEntitySilent(ref: NameRef): EntitySymbol | null {
    const lower = ref.words.join(' ').toLowerCase();
    const exact = this.entities.filter((e) => e.nameLower === lower);
    if (exact.length === 1) return exact[0];
    const byAlias = this.entities.filter((e) => e.aka.includes(lower));
    if (byAlias.length === 1) return byAlias[0];
    const refWords = ref.words.map((w) => w.toLowerCase());
    const subset = this.entities.filter((e) => isInOrderSubset(refWords, e.nameWords));
    if (subset.length === 1) return subset[0];
    return null;
  }

  /**
   * Declare-and-emit sugar (§2.6): a `phrase <key>` statement carrying an
   * indented prose block registers the key at load — collected in pass 1 so
   * pass 2's phrase-coverage gate sees it. Inside an entity-owned clause the
   * key registers owner-scoped (`<entity-id>.<key>`, the phrase-override
   * mechanism) so per-owner keys don't collide; ownerless scopes (traits,
   * actions, sequences) keep the bare key.
   */
  private collectInlineTexts(body: Statement[], ownerId: string | null = null): void {
    for (const stmt of body) {
      switch (stmt.kind) {
        case 'phrase':
          if (stmt.inlineText) {
            this.registerPhrase(DEFAULT_LOCALE, ownerId ? `${ownerId}.${stmt.phraseKey}` : stmt.phraseKey, {
              strategy: null,
              variants: [this.variantOf(stmt.inlineText)],
              span: stmt.inlineText.span,
            });
          }
          break;
        case 'kill':
          // ADR-325 D3i: the inline death text registers under a
          // synthesized key (bare — death text is one-shot, never
          // overridden per owner) that the lowering step also derives.
          if (stmt.inlineText) {
            this.registerPhrase(DEFAULT_LOCALE, inlineKillKey(stmt), {
              strategy: null,
              variants: [this.variantOf(stmt.inlineText)],
              span: stmt.inlineText.span,
            });
          }
          break;
        case 'select-on':
          for (const arm of stmt.arms) this.collectInlineTexts(arm.body, ownerId);
          break;
        case 'select-strategy':
          for (const alt of stmt.alternatives) this.collectInlineTexts(alt, ownerId);
          break;
        case 'ordinal':
          this.collectInlineTexts(stmt.body, ownerId);
          break;
        case 'each':
          this.collectInlineTexts(stmt.body, ownerId);
          break;
        default:
          break;
      }
    }
  }

  // ------------------------------------------------- state-set gates (D9)

  /**
   * The three-ring boolean-state gate (decision 8, ratchet D9) — pattern
   * detection over every declared state set (story, trait, entity). Ring 1:
   * literal booleans. Ring 2: a set reproducing a platform-owned pair.
   * Ring 3: a state named as the negation of a sibling.
   */
  private checkStateSet(states: StateName[], ownerDesc: string): void {
    const names = states.map((s) => s.name);
    for (const s of states) {
      if (BOOLEAN_STATE_WORDS.has(s.name)) {
        this.diagnostics.error(
          'analysis.boolean-state',
          `\`${s.name}\` is a boolean literal, not a state — booleans are not part of Chord at any scope (given 8). Name what ${ownerDesc} IS in that condition.`,
          s.span,
        );
      }
    }
    for (const { pair, trait } of PLATFORM_STATE_PAIRS) {
      if (names.includes(pair[0]) && names.includes(pair[1])) {
        const at = states.find((s) => s.name === pair[1]) ?? states[0];
        this.diagnostics.error(
          'analysis.shadow-state',
          `\`${pair[0]}\`/\`${pair[1]}\` reproduces a platform-owned pair — compose \`${trait}\` and read the state live (\`is ${pair[0]}\`) instead of storing it.`,
          at.span,
        );
      }
    }
    for (const a of states) {
      for (const b of states) {
        if (a === b) continue;
        if (isNegationOf(b.name, a.name)) {
          this.diagnostics.error(
            'analysis.negated-state',
            `\`${b.name}\` names the absence of \`${a.name}\`, not a condition of ${ownerDesc}. Name what it IS when not ${a.name} — feedable's answer was \`hungry\`/\`content\`. A state names what the thing IS, never the absence of another state.`,
            b.span,
          );
        }
      }
    }
  }

  /**
   * The declared set a state belongs to on an entity, with its
   * forward-march policy (D4) — null when undeterminable.
   */
  private stateSetOf(sym: EntitySymbol | null, state: string): StateSetInfo | null {
    if (sym) {
      const source = sym.stateSource.get(state);
      if (source === 'own') {
        return { states: sym.decl.states.map((s) => s.name), reversible: sym.ownReversible };
      }
      if (source) {
        const states = this.traitStates.get(source);
        return states ? { states, reversible: this.traitReversible.get(source) ?? false } : null;
      }
      return null;
    }
    // Trait scope (`it` with no concrete owner): the declaring trait's set.
    for (const [t, states] of this.traitStates) {
      if (states.includes(state)) return { states, reversible: this.traitReversible.get(t) ?? false };
    }
    return null;
  }

  /**
   * D4 forward-march, statically provable half: a `change` targeting the
   * INITIAL state of a non-reversible set can never be a forward move.
   * (The runtime enforces full ordering; this is the load-time gate.)
   */
  private checkChangeLegality(info: StateSetInfo | null, state: string, span: Span): void {
    if (info && !info.reversible && info.states.length > 0 && info.states[0] === state) {
      this.diagnostics.error(
        'analysis.irreversible-state',
        `\`${state}\` is the initial state of a forward-only set — \`change\` cannot go back. Add \`, reversible\` to the \`states:\` line to permit back-transitions (D4).`,
        span,
      );
    }
  }

  private collectEntity(decl: CreateDecl): void {
    const nameWords = decl.name.words;
    const id = nameWords.join('-').toLowerCase();
    // `match` is a reserved value-position name (David, 2026-07-12 —
    // each package P3): it is the `each`-block binder (`the match`, E3),
    // resolved before entity lookup exactly as `it` is. Multi-word names
    // containing the word stay legal.
    if (id === 'match') {
      this.diagnostics.error('analysis.reserved-name', RESERVED_MATCH_MESSAGE, decl.name.span);
      return;
    }
    for (const alias of decl.aka) {
      if (alias.toLowerCase() === 'match') {
        this.diagnostics.error('analysis.reserved-name', RESERVED_MATCH_MESSAGE, decl.name.span);
      }
    }
    // Keyed on the LOWERCASED name, matching the `id` derivation this gate
    // used to test directly (`nameWords.join('-').toLowerCase()`) — `Hall`
    // and `hall` are one entity, and keying on the display form would have
    // quietly let the second one through.
    if (!this.registerUnique('entity', nameWords.join(' ').toLowerCase(), decl.name.span, 'analysis.duplicate-entity')) {
      return;
    }
    this.checkStateSet(decl.states, nameWords.join(' ').toLowerCase());
    const sym: EntitySymbol = {
      id,
      nameLower: nameWords.join(' ').toLowerCase(),
      nameWords: nameWords.map((w) => w.toLowerCase()),
      aka: decl.aka.map((a) => a.toLowerCase()),
      states: decl.states.map((s) => s.name),
      stateSource: new Map(decl.states.map((s) => [s.name, 'own'])),
      ownReversible: decl.statesReversible,
      decl,
    };
    this.entities.push(sym);
    this.byId.set(id, sym);
    for (const s of decl.scores) this.collectScore(s.name, s.worth, s.span, id);
    // ADR-264: register per-entity counter names under this entity's id.
    if (decl.counters.length > 0) {
      const names = this.entityCounterNames.get(id) ?? new Set<string>();
      for (const c of decl.counters) {
        if (names.has(c.name)) {
          this.diagnostics.error('analysis.duplicate-counter', `Entity \`${nameWords.join(' ')}\` already has a counter named \`${c.name}\`.`, c.span);
        } else {
          names.add(c.name);
        }
      }
      this.entityCounterNames.set(id, names);
    }
  }

  /** Construct kinds already reported by the scoring gate (one each). */
  private scoringGateReported = new Set<string>();

  /**
   * Report the `use scoring` gate for one construct kind (ADR-261 D4).
   *
   * A gated construct must never be silently dead, so this is an error rather
   * than a warning, backstopped by a `LoadError` in the story-loader for rogue
   * IR — the two-layer shape ADR-215 uses for `define machine`.
   *
   * The third gated construct, a `rank` rung, cannot reach this check: the
   * ladder is structurally inside the `use scoring` body, so a stray rung is
   * `parse.rank-outside-scoring` at parse time — an earlier and more precise
   * diagnostic. The loader's backstop covers the rogue-IR form.
   */
  private reportScoringGate(kind: 'score' | 'award', span: Span): void {
    if (this.scoringGateReported.has(kind)) return;
    this.scoringGateReported.add(kind);
    const what = kind === 'score'
      ? 'A `score … worth N` line needs'
      : 'An `award` statement needs';
    this.diagnostics.error(
      'analysis.scoring-needs-use',
      `${what} \`use scoring\` in the story header — without it the game has no score at all, and SCORE says so.`,
      span,
    );
  }

  /**
   * Build the `use scoring` rank ladder (ADR-261 D2/D5).
   *
   * Rungs may be written in any order and are sorted ascending here, so the
   * loader and the ledger both receive a sorted ladder. Three gates:
   *
   * - **duplicate threshold** — silently keeping one rung would make the
   *   resolved rank depend on array order (ADR-260 D2);
   * - **duplicate id** — two names that kebab-case alike collide in
   *   `if.event.band_crossed`'s payload, which is keyed on the id;
   * - **rung above max** — an unreachable rank. This check is sound for
   *   Chord *specifically* because Chord has no statement that changes
   *   maxScore at runtime, so the sum of declared `worth` is the whole
   *   ceiling. A TypeScript story calling `setMaxScore` mid-game (as dungeo
   *   does) has no compile step and is unaffected, by design.
   */
  private buildRanks(): IRRankDef[] {
    const declared = this.ast.header?.ranks ?? [];
    if (declared.length === 0) return [];

    const maxScore = this.scoreDecls.reduce((sum, s) => sum + s.worth, 0);
    const byThreshold = new Map<number, string>();
    const byId = new Map<string, string>();
    const ranks: IRRankDef[] = [];

    for (const rung of declared) {
      const id = kebabId(rung.name);
      if (!id) {
        this.diagnostics.error(
          'analysis.rank-id-empty',
          `Rank name "${rung.name}" yields no id — a rank name needs at least one letter or digit.`,
          rung.span,
        );
        continue;
      }
      const clashingThreshold = byThreshold.get(rung.threshold);
      if (clashingThreshold !== undefined) {
        this.diagnostics.error(
          'analysis.duplicate-rank-threshold',
          `Two rungs share the threshold ${rung.threshold} ("${clashingThreshold}" and "${rung.name}") — which rank applies would depend on source order.`,
          rung.span,
        );
        continue;
      }
      const clashingId = byId.get(id);
      if (clashingId !== undefined) {
        this.diagnostics.error(
          'analysis.duplicate-rank-id',
          `Rank names "${clashingId}" and "${rung.name}" both reduce to the id \`${id}\` — a promotion event could not tell them apart.`,
          rung.span,
        );
        continue;
      }
      if (maxScore > 0 && rung.threshold > maxScore) {
        this.diagnostics.error(
          'analysis.rank-above-max',
          `Rank "${rung.name}" sits at ${rung.threshold}, above the ${maxScore} points this story declares — no player could reach it.`,
          rung.span,
        );
        continue;
      }
      byThreshold.set(rung.threshold, rung.name);
      byId.set(id, rung.name);
      ranks.push({
        id,
        name: rung.name,
        threshold: rung.threshold,
        ...(rung.phraseKey !== undefined ? { phraseKey: rung.phraseKey } : {}),
        span: rung.span,
      });
    }

    return ranks.sort((a, b) => a.threshold - b.threshold);
  }

  /**
   * Lower the `use hunger` body (ADR-263 D1): dedup band thresholds, sort
   * ascending. `grows`/`fatal` pass through for the loader's daemon and
   * death-trigger lowering.
   */
  private buildHunger(): IRHungerDef | undefined {
    const decl = this.ast.header?.hunger;
    if (!decl) return undefined;

    const seen = new Set<number>();
    const seenBands = new Set<string>();
    const rungs: IRMeterRung[] = [];
    for (const rung of decl.rungs) {
      if (!rung.band) {
        this.diagnostics.error('analysis.meter-band-empty', 'A hunger band needs a name.', rung.span);
        continue;
      }
      if (seen.has(rung.threshold)) {
        this.diagnostics.error(
          'analysis.duplicate-hunger-threshold',
          `Two hunger bands share threshold ${rung.threshold} — the resolved band would depend on order.`,
          rung.span,
        );
        continue;
      }
      // ADR-289 D8 L7: the band name is its IDENTITY downstream — it becomes
      // BandRung.id, which the crossing watcher and the narrator both key on.
      // Two rungs sharing a name make "which band am I in" unanswerable, and
      // the threshold gate above never saw it because the thresholds differ.
      if (seenBands.has(rung.band)) {
        this.diagnostics.error(
          'analysis.duplicate-hunger-band',
          `Two hunger bands are both named \`${rung.band}\` — the band id is what the narrator and the \`band_crossed\` event carry, so it must name one band.`,
          rung.span,
        );
        continue;
      }
      // ADR-289 D8 L7: `fatal at N` kills at severity N, and the daemon runs
      // ahead of the narrator — so a band ABOVE that threshold is a rung the
      // meter can never reach. A band exactly AT `fatal` is the dying band and
      // stays legal.
      if (decl.fatal !== undefined && rung.threshold > decl.fatal) {
        this.diagnostics.error(
          'analysis.hunger-band-above-fatal',
          `Band \`${rung.band}\` sits at ${rung.threshold}, above \`fatal at ${decl.fatal}\` — the player dies before the meter reaches it, so it can never narrate.`,
          rung.span,
        );
        continue;
      }
      seen.add(rung.threshold);
      seenBands.add(rung.band);
      rungs.push({
        id: rung.band,
        threshold: rung.threshold,
        ...(rung.phraseKey !== undefined ? { phraseKey: rung.phraseKey } : {}),
        span: rung.span,
      });
    }
    rungs.sort((a, b) => a.threshold - b.threshold);
    return {
      ...(decl.grows !== undefined ? { grows: decl.grows } : {}),
      ...(decl.fatal !== undefined ? { fatal: decl.fatal } : {}),
      rungs,
      span: decl.span,
    };
  }

  /**
   * Resolve a counter's `starts`/bounds (ADR-264 D1): default `starts` 0,
   * validate a non-empty range (lo ≤ hi), and clamp the initial value into the
   * declared bounds so the seeded value is always valid.
   */
  private resolveCounter(name: string, starts: number | null, lo: number | null, hi: number | null, span: Span): { starts: number; lo: number | null; hi: number | null } {
    if (lo !== null && hi !== null && lo > hi) {
      this.diagnostics.error(
        'analysis.counter-bounds',
        `Counter "${name}" has an empty range: lower bound ${lo} exceeds upper bound ${hi}.`,
        span,
      );
    }
    let s = starts ?? 0;
    if (lo !== null && s < lo) s = lo;
    if (hi !== null && s > hi) s = hi;
    return { starts: s, lo, hi };
  }

  /** Lower a story-global `define counter` (ADR-264 D1). */
  private buildCounterDef(decl: DefineCounter): IRCounterDef {
    const { starts, lo, hi } = this.resolveCounter(decl.name, decl.starts, decl.lo, decl.hi, decl.span);
    return { name: decl.name, starts, lo, hi, span: decl.span };
  }

  /** Lower a per-entity `counter` line (ADR-264 D1). */
  private buildCounterDecl(decl: CounterDecl): IRCounterDecl {
    const { starts, lo, hi } = this.resolveCounter(decl.name, decl.starts, decl.lo, decl.hi, decl.span);
    return { name: decl.name, starts, lo, hi, span: decl.span };
  }

  /** Register an owner-attached score (ratchet D12) under its qualified id. */
  private collectScore(name: string, worth: number, span: Span, ownerKey: string | null): void {
    const qualified = ownerKey ? `${ownerKey}.${name}` : name;
    if (this.scoreNames.has(qualified)) {
      this.diagnostics.error('analysis.duplicate-score', `Score \`${name}\` is declared twice on this owner.`, span);
      return;
    }
    this.scoreNames.set(qualified, worth);
    this.scoreDecls.push({ name: qualified, worth, span });
  }

  private collectPhrasesBlock(decl: DefinePhrases): void {
    for (const entry of decl.entries) {
      this.registerPhrase(decl.locale, entry.key, {
        strategy: null,
        variants: [this.variantOf(entry.value)],
        span: entry.span,
      });
    }
  }

  private collectPhraseDecl(decl: DefinePhrase): void {
    const phrase: IRPhrase = {
      strategy: (decl.strategy as IRPhrase['strategy']) ?? null,
      ...(decl.verbatim ? { verbatim: true } : {}),
      variants: decl.variants.map((v) => this.variantOf(v)),
      span: decl.span,
    };
    this.registerPhrase(DEFAULT_LOCALE, decl.key, phrase);
    // ADR-318 D9: the claims tag resolves after the fact table builds
    // (values may name entities) — resolveClaims stamps the phrase.
    if (decl.claims) this.pendingClaims.push({ claims: decl.claims, phrase });
  }

  /** ADR-255: `override message <alias>` — full phrase body under an ACL alias. */
  private collectOverrideMessage(decl: OverrideMessage): void {
    this.registerMessageOverride(DEFAULT_LOCALE, decl.alias, decl.span, {
      strategy: (decl.strategy as IRPhrase['strategy']) ?? null,
      ...(decl.verbatim ? { verbatim: true } : {}),
      variants: decl.variants.map((v) => this.variantOf(v)),
      span: decl.span,
    });
  }

  /** ADR-255: `override messages <locale>` — flat `alias: text` entries. */
  private collectOverrideMessages(decl: OverrideMessages): void {
    for (const entry of decl.entries) {
      this.registerMessageOverride(decl.locale, entry.key, entry.span, {
        strategy: null,
        variants: [this.variantOf(entry.value)],
        span: entry.span,
      });
    }
  }

  /**
   * ADR-255 D4: register a message override, gating the alias against the
   * ACL catalog (`analysis.unknown-message-alias`, mirroring `unknown-channel`)
   * and rejecting a duplicate. The alias — never a dotted platform id — is
   * resolved to `if.action.*` loader-side (Interface Contract 3).
   */
  private registerMessageOverride(locale: string, alias: string, span: Span, phrase: IRPhrase): void {
    if (!alias) return; // header parse error already reported
    if (!MESSAGE_OVERRIDE_ALIASES.has(alias)) {
      this.diagnostics.error(
        'analysis.unknown-message-alias',
        `\`${alias}\` is not a standard-action message alias${this.suggestText(alias, [...MESSAGE_OVERRIDE_ALIASES])}.`,
        span,
      );
      return;
    }
    let table = this.messageOverrides.get(locale);
    if (!table) {
      table = new Map();
      this.messageOverrides.set(locale, table);
    }
    if (table.has(alias)) {
      this.diagnostics.error('analysis.duplicate-message-override', `Message override \`${alias}\` is declared twice in ${locale}.`, span);
      return;
    }
    table.set(alias, phrase);
  }

  private variantOf(value: TextValue): { text: string; markers: string[] } {
    return { text: value.text, markers: value.markers.map((m) => m.content) };
  }

  /**
   * The one duplicate-declaration gate (ADR-289 D5): name → first span,
   * error on the second, citing where the first one is.
   *
   * @param namespace  which namespace the name lives in — namespaces are
   *                   independent, so an action and a trait may share a name
   * @param name       the declared name, already normalized by the caller
   * @param span       the span of THIS declaration, where the error lands
   * @param code       the diagnostic code, kept per-namespace so existing
   *                   codes (`analysis.duplicate-machine`, …) are unchanged
   * @returns true when the name is newly registered; false when it duplicates
   *          one already seen, so callers can skip building a second symbol
   */
  private registerUnique(namespace: UniqueNamespace, name: string, span: Span, code: string): boolean {
    const key = `${namespace}\u0000${name}`;
    const first = this.uniqueNames.get(key);
    if (first) {
      const article = /^[aeiou]/i.test(namespace) ? 'An' : 'A';
      this.diagnostics.error(code, `${article} ${namespace} named \`${name}\` is already declared at line ${first.line}.`, span);
      return false;
    }
    this.uniqueNames.set(key, span);
    return true;
  }

  /** Duplicate-name gate shared by `define phrasebook` and `use phrasebook`. */
  private registerPhrasebookName(name: string, span: Span): boolean {
    return this.registerUnique('phrasebook', name, span, 'analysis.duplicate-phrasebook');
  }

  /** Book coverage bookkeeping: key → covered by a default (always) book? */
  private recordBookKey(key: string, isAlways: boolean): void {
    this.bookKeys.set(key, (this.bookKeys.get(key) ?? false) || isAlways);
  }

  /** `use phrasebook <name> [while <cond>]` (ADR-250 D2/D3) — pass 1. */
  private collectUsePhrasebook(use: UsePhrasebookDecl): void {
    const manifest = PHRASEBOOK_REGISTRY.get(use.name);
    if (!manifest) {
      this.diagnostics.error(
        'analysis.unknown-phrasebook',
        `\`use phrasebook ${use.name}\` names no registered phrasebook${this.suggestText(use.name, [...PHRASEBOOK_REGISTRY.keys()])}.`,
        use.span,
      );
      return;
    }
    if (!this.registerPhrasebookName(use.name, use.span)) return;
    this.phrasebookDecls.push({ name: use.name, source: 'use', condition: use.condition, span: use.span });
    for (const key of manifest.keys) this.recordBookKey(key, use.condition === null);
  }

  /** `define phrasebook` (ADR-250 D1/D3) — pass 1: entry gates + coverage. */
  private collectPhrasebook(decl: DefinePhrasebook): void {
    if (!decl.name) return; // header parse error already reported
    if (!this.registerPhrasebookName(decl.name, decl.span)) return;
    const entries: Record<string, IRPhrase> = {};
    for (const entry of decl.entries) {
      if (entry.condition) {
        this.diagnostics.error(
          'analysis.phrasebook-entry-gate',
          `Entries carry no \`while\` — the book's own predicate is the gate. Move the condition to \`define phrasebook ${decl.name} while …\`, or split the entry into a second book.`,
          entry.span,
        );
      }
      if (entry.key.includes('.')) {
        this.diagnostics.error(
          'analysis.phrasebook-dotted-key',
          `\`${entry.key}\` is a platform message ID — phrasebooks voice the story's own keys. To override a platform message, use a story-level \`define phrase ${entry.key}\`.`,
          entry.span,
        );
        continue;
      }
      if (entry.key === 'br' || RESERVED_CHANNEL_KEYS.has(entry.key)) {
        this.diagnostics.error(
          'analysis.phrasebook-reserved-key',
          `\`${entry.key}\` is reserved — pick another entry key.`,
          entry.span,
        );
        continue;
      }
      if (entries[entry.key]) {
        this.diagnostics.error(
          'analysis.phrasebook-duplicate-key',
          `\`${entry.key}\` is declared twice in phrasebook \`${decl.name}\` — competing texts live in different books.`,
          entry.span,
        );
        continue;
      }
      entries[entry.key] = {
        strategy: (entry.strategy as IRPhrase['strategy']) ?? null,
        variants: entry.variants.map((v) => this.variantOf(v)),
        span: entry.span,
      };
      this.recordBookKey(entry.key, decl.condition === null);
    }
    this.phrasebookDecls.push({ name: decl.name, source: 'define', condition: decl.condition, entries, span: decl.span });
  }

  private registerPhrase(locale: string, key: string, phrase: IRPhrase): void {
    if (key === 'br') {
      // `{br}` is the built-in hard-line-break marker (grammar log 2026-07-10).
      this.diagnostics.error('analysis.reserved-marker', '`br` is reserved for the built-in `{br}` line-break marker — pick another phrase name.', phrase.span);
      return;
    }
    if (RESERVED_CHANNEL_KEYS.has(key)) {
      // Z3/Z3b: channel keys are entity-owned surfaces — bare declarations
      // shadow the channel. (Owner-scoped `<id>.<key>` registrations are the
      // channels themselves and pass through here untouched.)
      this.diagnostics.error(
        'analysis.reserved-name',
        `\`${key}\` is a reserved channel key — author it as an entity \`phrase ${key}:\` block, never as a standalone phrase.`,
        phrase.span,
      );
      return;
    }
    let table = this.phrases.get(locale);
    if (!table) {
      table = new Map();
      this.phrases.set(locale, table);
    }
    if (table.has(key)) {
      this.diagnostics.error('analysis.duplicate-phrase', `Phrase \`${key}\` is declared twice in ${locale}.`, phrase.span);
      return;
    }
    table.set(key, phrase);
  }

  // ------------------------------------------------------------- entities

  /**
   * ADR-310 D2: route a bare composition that reads as a personality
   * adjective into character data. Returns true when the composition was
   * consumed — as a personality entry or as its own diagnostic. Platform,
   * extension, and story-defined trait names keep their trait reading (an
   * author's `define trait honest` shadows the personality word); an
   * intensity-led pair (`very …`) is always a personality attempt, so its
   * unknown second word gets the D2 vocabulary diagnostic rather than the
   * generic unknown-trait error.
   */
  private routeCharacterComposition(
    comp: CompositionItem,
    isPerson: boolean,
    entityName: string,
    out: IRPersonalityEntry[],
  ): boolean {
    const words = comp.words.map((w) => w.toLowerCase());
    const name = words.join(' ');
    if (TRAIT_ADJECTIVES.has(name) || manifestForAdjective(name) || this.traitNames.has(name)) return false;

    let trait: string;
    let intensity: string | undefined;
    if (words.length === 1 && this.isPersonalityWord(words[0])) {
      trait = words[0];
    } else if (words.length === 2 && CHARACTER_MANIFEST.intensities.includes(words[0])) {
      if (!this.isPersonalityWord(words[1])) {
        this.diagnostics.error(
          'analysis.unknown-personality-word',
          `\`${words[1]}\` is not a personality word — the vocabulary: ${this.personalityVocabulary().join(', ')}.`,
          comp.span,
        );
        return true;
      }
      intensity = words[0];
      trait = words[1];
    } else {
      return false;
    }

    if (!isPerson) {
      this.diagnostics.error(
        'analysis.personality-person-only',
        `\`${name}\` is a personality adjective — it composes only on a person (\`a person, ${name}\`); \`${entityName}\` is not a person.`,
        comp.span,
      );
      return true;
    }
    if (comp.config.length > 0) {
      this.diagnostics.error(
        'analysis.personality-config',
        `A personality adjective takes no \`with\` fields — intensity is part of the word itself (\`very ${trait}\`).`,
        comp.span,
      );
      return true;
    }
    if (comp.condition) {
      this.diagnostics.error(
        'analysis.personality-conditional',
        `Personality is fixed at creation — \`${trait} while …\` is not supported (the transient thing is mood: \`change mood to …\`).`,
        comp.span,
      );
      return true;
    }
    if (out.some((e) => e.trait === trait)) {
      this.diagnostics.error(
        'analysis.personality-duplicate',
        `\`${trait}\` is declared twice on this person.`,
        comp.span,
      );
      return true;
    }
    out.push({ trait, ...(intensity !== undefined ? { intensity } : {}), span: comp.span });
    return true;
  }

  /**
   * ADR-310 D16: stamp each phrasebook whose `while` gates on an entity's
   * interior state as character-scoped (the loader's specificity
   * arbitration reads the stamp — character-scoped beats story-scoped by
   * total override), and refuse the same-specificity tie: two
   * character-scoped books gating the same speaker can be active together,
   * which is exactly the silent wrong-voice pick D16 spends an error on.
   * Two `is`-predicates on the same subject with different mood (or
   * threat) words are provably exclusive — one mood at a time — and pass.
   */
  private stampPhrasebookSpecificity(books: IRPhrasebook[]): void {
    const subjectsOf = new Map<IRPhrasebook, Set<string>>();
    for (const book of books) {
      if (!book.condition) continue;
      const subjects = new Set<string>();
      this.collectInteriorSubjects(book.condition, subjects);
      if (subjects.size > 0) {
        book.specificity = 'character';
        subjectsOf.set(book, subjects);
      }
    }
    const stamped = books.filter((b) => subjectsOf.has(b));
    for (let i = 0; i < stamped.length; i++) {
      for (let j = i + 1; j < stamped.length; j++) {
        const shared = [...subjectsOf.get(stamped[i])!].filter((s) => subjectsOf.get(stamped[j])!.has(s));
        if (shared.length === 0) continue;
        if (this.exclusiveInteriorPair(stamped[i].condition!, stamped[j].condition!)) continue;
        this.diagnostics.error(
          'analysis.phrasebook-tie',
          `Phrasebooks \`${stamped[i].name}\` and \`${stamped[j].name}\` both gate on \`${shared[0]}\`'s interior state and could be active together — a same-specificity tie is ambiguous. Tighten one \`while\` so only one voice can hold.`,
          stamped[j].span,
        );
      }
    }
  }

  /** Collect the entity ids whose interior state a condition reads (D16 classification). */
  private collectInteriorSubjects(cond: IRCondition, out: Set<string>): void {
    const subjectId = (v: IRValue): string | null =>
      v.kind === 'entity' ? v.id : v.kind === 'player' ? 'player' : null;
    switch (cond.kind) {
      case 'and':
      case 'or':
        for (const o of cond.operands) this.collectInteriorSubjects(o, out);
        return;
      case 'not':
        this.collectInteriorSubjects(cond.operand, out);
        return;
      case 'feels':
      case 'knows-topic': {
        const id = subjectId(cond.subject);
        if (id !== null) out.add(id);
        return;
      }
      case 'predicate': {
        if (cond.pred !== 'is' || cond.object.kind !== 'symbol') return;
        const word = cond.object.name;
        if (!this.isMoodWord(word) && !CHARACTER_MANIFEST.threats.includes(word) && !CHARACTER_MANIFEST.pressureBands.includes(word)) return;
        const id = subjectId(cond.subject);
        if (id === null) return;
        // The entity's OWN declared state wins the word (resolveIsObject) —
        // a state test is not an interior-state gate.
        if (this.byId.get(id)?.states.includes(word)) return;
        out.add(id);
        return;
      }
      default:
        return;
    }
  }

  /**
   * True when two conditions are single bare `is`-predicates on the same
   * subject with different words of the SAME interior axis — one mood (or
   * threat) at a time, so both books can never be active together.
   */
  private exclusiveInteriorPair(a: IRCondition, b: IRCondition): boolean {
    const simple = (c: IRCondition) =>
      c.kind === 'predicate' && c.pred === 'is' && !c.negated && c.object.kind === 'symbol' ? c : null;
    const pa = simple(a);
    const pb = simple(b);
    if (!pa || !pb) return false;
    if (JSON.stringify(pa.subject) !== JSON.stringify(pb.subject)) return false;
    const axisOf = (w: string): string | null =>
      this.isMoodWord(w) ? 'mood' : CHARACTER_MANIFEST.threats.includes(w) ? 'threat' : CHARACTER_MANIFEST.pressureBands.includes(w) ? 'band' : null;
    const wa = (pa.object as { kind: 'symbol'; name: string }).name;
    const wb = (pb.object as { kind: 'symbol'; name: string }).name;
    const axisA = axisOf(wa);
    return axisA !== null && axisA === axisOf(wb) && wa !== wb;
  }

  /**
   * ADR-310 D9: a `resists` naming an influence nobody defines is a dead
   * line — refused, never a silent no-op. Runs after every entity is built
   * because the influencer may be declared after the resister.
   */
  private checkInfluenceReferences(ir: StoryIR): void {
    const names = new Set<string>();
    for (const e of ir.entities) for (const inf of e.character?.influences ?? []) names.add(inf.name);
    for (const e of ir.entities) {
      for (const r of e.character?.resists ?? []) {
        if (!names.has(r.influence)) {
          this.diagnostics.error(
            'analysis.unknown-influence',
            `No entity defines an influence named \`${r.influence}\`${this.suggestText(r.influence, [...names])}.`,
            r.span,
          );
        }
      }
    }
  }

  /**
   * ADR-318 D3: resolve `<force> over <force>` pairs against the closed
   * force vocabulary. A pair repeated in either order is refused — the
   * reverse would silently contradict the first, and D6 owns collisions
   * (principles resolve by `except` or paralysis, never by list order).
   */
  private resolveForcePairs(pairs: ForcePairDecl[], owner: string): Array<[string, string]> {
    const out: Array<[string, string]> = [];
    for (const p of pairs) {
      let ok = true;
      for (const side of [p.first, p.second]) {
        if (!CHARACTER_MANIFEST.forces.includes(side.word)) {
          this.diagnostics.error(
            'analysis.unknown-force',
            `\`${side.word}\` is not a force — ${CHARACTER_MANIFEST.forces.join(', ')}${this.suggestText(side.word, [...CHARACTER_MANIFEST.forces])}.`,
            side.span,
          );
          ok = false;
        }
      }
      if (!ok) continue;
      if (p.first.word === p.second.word) {
        this.diagnostics.error(
          'analysis.temperament-self-pair',
          `\`${p.first.word} over ${p.second.word}\` orders a force against itself.`,
          p.span,
        );
        continue;
      }
      const dup = out.find(([a, b]) => (a === p.first.word && b === p.second.word) || (a === p.second.word && b === p.first.word));
      if (dup) {
        this.diagnostics.error(
          'analysis.temperament-pair-duplicate',
          dup[0] === p.first.word
            ? `\`${owner}\` already orders \`${dup[0]} over ${dup[1]}\`.`
            : `\`${owner}\` already orders \`${dup[0]} over ${dup[1]}\` — the reverse contradicts it.`,
          p.span,
        );
        continue;
      }
      out.push([p.first.word, p.second.word]);
    }
    return out;
  }

  /** Third-person surface of an act-category verb (`lie` → `lies`, `trespass` → `trespasses`). */
  private inflect3sg(verb: string): string {
    return /(?:s|x|z|ch|sh)$/.test(verb) ? `${verb}es` : `${verb}s`;
  }

  /** The written surface of a manifest act category (`break a promise` → `breaks a promise`). */
  private categorySurface(category: string): string {
    const [verb, ...rest] = category.split(' ');
    return [this.inflect3sg(verb), ...rest].join(' ');
  }

  /**
   * ADR-318 D4: resolve one `never` line — longest-match the third-person
   * surface against the manifest's categories, the remainder is the scope
   * (legal only on `harms`/`abandons`), the comma slot the except clause.
   */
  private resolveNeverLine(n: NeverDecl): IRPrincipleEntry | null {
    let match: { category: string; length: number } | null = null;
    for (const category of CHARACTER_MANIFEST.actCategories) {
      const surface = this.categorySurface(category).split(' ');
      if (surface.length > n.words.length) continue;
      if (surface.every((w, i) => n.words[i].word === w)) {
        if (!match || surface.length > match.length) match = { category, length: surface.length };
      }
    }
    if (!match) {
      const vocab = CHARACTER_MANIFEST.actCategories.map((cat) => this.categorySurface(cat));
      this.diagnostics.error(
        'analysis.unknown-act-category',
        `\`${n.words.map((w) => w.word).join(' ')}\` is not an act category — the vocabulary: ${vocab.join(', ')}${this.suggestText(n.words[0].word, vocab)}.`,
        n.words[0].span,
      );
      return null;
    }
    const rest = n.words.slice(match.length);
    let scope: IRScopeRef | undefined;
    if (rest.length > 0) {
      if (match.category !== 'harm' && match.category !== 'abandon') {
        this.diagnostics.error(
          'analysis.principle-scope',
          `\`${this.categorySurface(match.category)}\` takes no scope — only \`harms\` and \`abandons\` are scoped (ADR-318 D4).`,
          rest[0].span,
        );
        return null;
      }
      const resolved = this.resolveRawScope(rest);
      if (resolved === null) return null;
      scope = resolved;
    }
    let except: IRPrincipleEntry['except'];
    if (n.except) {
      const s = this.resolveScopeRefDecl(n.except.scope);
      if (s === null) return null;
      except = { kind: n.except.protect ? 'protect' : 'object', scope: s };
    }
    return { category: match.category, ...(scope ? { scope } : {}), ...(except ? { except } : {}), span: n.span };
  }

  /** Resolve one obligation line (ADR-318 D4/D5). */
  private resolveObligationLine(o: ObligationLineDecl): IRObligationEntry | null {
    if (o.kind === 'answers-honestly') return { kind: 'answers honestly', span: o.span };
    const scope = o.scope ? this.resolveScopeRefDecl(o.scope) : null;
    if (scope === null) return null;
    return { kind: 'protects', scope, span: o.span };
  }

  /** A parsed scope ref (ADR-310 D9/D10 grammar) — classifier by article, entity otherwise. */
  private resolveScopeRefDecl(s: ScopeRefDecl): IRScopeRef | null {
    if (s.kind === 'anyone') return { kind: 'anyone' };
    if (s.ref.article === 'a' || s.ref.article === 'an') {
      return { kind: 'classifier', value: s.ref.words.join(' ').toLowerCase() };
    }
    const id = this.resolveEntityId(s.ref);
    return id === null ? null : { kind: 'entity', value: id };
  }

  /** A scope from the raw tail words of a `never` line (same grammar as {@link resolveScopeRefDecl}). */
  private resolveRawScope(words: Array<{ word: string; span: Span }>): IRScopeRef | null {
    if (words.length === 1 && words[0].word === 'anyone') return { kind: 'anyone' };
    const first = words[0].word;
    if (first === 'a' || first === 'an') {
      if (words.length === 1) {
        this.diagnostics.error('analysis.principle-scope', 'Expected a kind after the article (e.g. `a servant`).', words[0].span);
        return null;
      }
      return { kind: 'classifier', value: words.slice(1).map((w) => w.word).join(' ') };
    }
    const article = first === 'the' ? 'the' : null;
    const nameWords = article ? words.slice(1) : words;
    if (nameWords.length === 0) {
      this.diagnostics.error('analysis.principle-scope', 'Expected a scope — `anyone`, a kind (`a servant`), or an entity (`the children`).', words[0].span);
      return null;
    }
    const ref: NameRef = { kind: 'name', article, words: nameWords.map((w) => w.word), span: words[0].span };
    const id = this.resolveEntityId(ref);
    return id === null ? null : { kind: 'entity', value: id };
  }

  /**
   * ADR-318 D4: resolve `define code` bundles after symbol collection
   * (scopes may name entities), once — the flatten into each `code <name>`
   * entity copies the resolved entries.
   */
  private buildCodes(): void {
    for (const decl of this.codeDecls) {
      const principles: IRPrincipleEntry[] = [];
      const obligations: IRObligationEntry[] = [];
      for (const n of decl.nevers) {
        const p = this.resolveNeverLine(n);
        if (p) principles.push(p);
      }
      for (const o of decl.obligations) {
        const r = this.resolveObligationLine(o);
        if (r) obligations.push(r);
      }
      this.codes.set(decl.name, { principles, obligations });
    }
  }

  /**
   * ADR-318 D12a: resolve `define topic <actor> <act> as <alias>` lines.
   * The act is the longest word-suffix matching a detectable-act surface —
   * a face-act as spelled or an act category's third-person form; the
   * prefix must resolve to an entity. The namespace (actors × acts) is
   * closed, so total coverage is checkable here.
   */
  private buildWitnessedTopics(): void {
    const surfaces: Array<{ surface: string[]; act: string }> = [
      ...CHARACTER_MANIFEST.faceActs.map((f) => ({ surface: f.split(' '), act: f })),
      ...CHARACTER_MANIFEST.actCategories.map((cat) => ({ surface: this.categorySurface(cat).split(' '), act: cat })),
    ];
    const seenAlias = new Set<string>();
    const seenPair = new Set<string>();
    for (const decl of this.witnessedTopicDecls) {
      let best: { surface: string[]; act: string } | null = null;
      for (const s of surfaces) {
        if (s.surface.length >= decl.words.length) continue; // the actor needs at least one word
        const tail = decl.words.slice(decl.words.length - s.surface.length);
        if (s.surface.every((w, i) => tail[i].word === w)) {
          if (!best || s.surface.length > best.surface.length) best = s;
        }
      }
      if (!best) {
        this.diagnostics.error(
          'analysis.unknown-witnessed-act',
          `\`${decl.words.map((w) => w.word).join(' ')}\` ends in no detectable act — the vocabulary: ${surfaces.map((s) => s.surface.join(' ')).join(', ')}.`,
          decl.span,
        );
        continue;
      }
      const actorWords = decl.words.slice(0, decl.words.length - best.surface.length);
      const first = actorWords[0].word;
      const article = first === 'the' || first === 'a' || first === 'an' ? first : null;
      const nameWords = article ? actorWords.slice(1) : actorWords;
      if (nameWords.length === 0) {
        this.diagnostics.error('analysis.unknown-witnessed-act', 'Expected an actor before the act (e.g. `define topic the Colonel backs down as …`).', decl.span);
        continue;
      }
      const ref: NameRef = { kind: 'name', article, words: nameWords.map((w) => w.word), span: actorWords[0].span };
      const actor = this.resolveEntityId(ref);
      if (actor === null) continue; // resolveEntityId already reported
      if (seenAlias.has(decl.alias)) {
        this.diagnostics.error('analysis.duplicate-witnessed-alias', `\`${decl.alias}\` already names a witnessed-act topic.`, decl.span);
        continue;
      }
      const pairKey = `${actor}\u0000${best.act}`;
      if (seenPair.has(pairKey)) {
        this.diagnostics.error('analysis.witnessed-duplicate', `\`${decl.words.map((w) => w.word).join(' ')}\` already has an alias — one per witnessed act.`, decl.span);
        continue;
      }
      seenAlias.add(decl.alias);
      seenPair.add(pairKey);
      this.witnessedTopics.push({ actor, act: best.act, alias: decl.alias, span: decl.span });
    }
  }

  /**
   * ADR-318 D9: resolve every `claims` tag against the built fact table —
   * a value outside the fact's declared set is the misspelled-assertion
   * error the tag exists to make impossible at runtime.
   */
  private resolveClaims(): void {
    for (const { claims, phrase } of this.pendingClaims) {
      const factId = claims.fact.words.join('-').toLowerCase();
      const fact = this.factById.get(factId);
      if (!fact) {
        this.diagnostics.error(
          'analysis.unknown-fact',
          `No \`define fact\` named \`${claims.fact.words.join(' ')}\`${this.suggestText(factId, [...this.factById.keys()])}.`,
          claims.fact.span,
        );
        continue;
      }
      const value = this.canonicalFactValue(claims.value);
      if (value === null) continue; // canonicalFactValue already reported
      if (!fact.values.includes(value)) {
        this.diagnostics.error(
          'analysis.unknown-claim-value',
          `\`${claims.value.words.join(' ')}\` is not a declared value of \`${fact.name}\` — the set: ${fact.values.join(', ')}.`,
          claims.value.span,
        );
        continue;
      }
      phrase.claims = { factId, value };
    }
  }

  /**
   * ADR-310 D14: build the closed fact-value sets before entities compile.
   * Values canonicalize to entity IDs when they name an entity; a bare
   * unmatched word stays a literal (`nobody`); an article-led or
   * multi-word value naming no entity is the standard unknown-entity error.
   */
  private buildFacts(): void {
    for (const decl of this.factDecls) {
      const id = decl.name.words.join('-').toLowerCase();
      const values: string[] = [];
      for (const v of decl.values) {
        const canonical = this.canonicalFactValue(v);
        if (canonical === null) continue;
        if (values.includes(canonical)) {
          this.diagnostics.error(
            'analysis.fact-value-duplicate',
            `\`${v.words.join(' ')}\` appears twice in \`${decl.name.words.join(' ')}\`'s value set.`,
            v.span,
          );
          continue;
        }
        values.push(canonical);
      }
      if (values.length === 0) {
        this.diagnostics.error(
          'analysis.fact-empty',
          `\`define fact ${decl.name.words.join(' ')}\` declares no values — the closed value set is what makes \`thinks\` checkable.`,
          decl.span,
        );
      }
      const def: IRFactDef = {
        id,
        name: decl.name.words.join(' '),
        article: decl.name.article,
        values,
        span: decl.span,
      };
      this.factDefs.push(def);
      this.factById.set(id, def);
    }
  }

  /** ADR-310 D5: platform mood words plus this story's `define mood` words. */
  private isMoodWord(word: string): boolean {
    return CHARACTER_MANIFEST.moods.includes(word) || this.customMoods.has(word);
  }

  /** The full mood vocabulary for messages and suggestions. */
  private moodVocabulary(): string[] {
    return [...CHARACTER_MANIFEST.moods, ...this.customMoods.keys()];
  }

  /** ADR-310 D5: platform personality words plus this story's `define personality` words. */
  private isPersonalityWord(word: string): boolean {
    return CHARACTER_MANIFEST.personality.includes(word) || this.customPersonalities.has(word);
  }

  /** The full personality vocabulary for messages and suggestions. */
  private personalityVocabulary(): string[] {
    return [...CHARACTER_MANIFEST.personality, ...this.customPersonalities.keys()];
  }

  /**
   * ADR-310 D4: complete each `define profile` at compile time — declared
   * rows overlay `clear-headed`, so a profile is never partial on the wire
   * and an author never writes five lines to change one.
   */
  private buildProfiles(): void {
    for (const decl of this.profileDecls) {
      const dims: Record<string, string> = { ...CHARACTER_MANIFEST.profilePresets['clear-headed'] };
      const seen = new Set<string>();
      for (const row of decl.rows) {
        const values = CHARACTER_MANIFEST.cognitiveDimensions[row.dimension];
        if (!values) {
          this.diagnostics.error(
            'analysis.unknown-dimension',
            `\`${row.dimension}\` is not a cognitive dimension — ${Object.keys(CHARACTER_MANIFEST.cognitiveDimensions).join(', ')}.`,
            row.span,
          );
          continue;
        }
        if (seen.has(row.dimension)) {
          this.diagnostics.error('analysis.profile-row-duplicate', `This profile already sets \`${row.dimension}\`.`, row.span);
          continue;
        }
        seen.add(row.dimension);
        if (!values.includes(row.value)) {
          this.diagnostics.error(
            'analysis.unknown-dimension-value',
            `\`${row.value}\` is not a \`${row.dimension}\` value — ${values.join(', ')}.`,
            row.span,
          );
          continue;
        }
        dims[row.dimension] = row.value;
      }
      this.profiles.set(decl.name, dims);
    }
  }

  /**
   * ADR-310 D4: route a `cognitive-profile <name> [with <dimension>
   * <value> and …]` composition into character data. The named base (a
   * story profile or a platform preset) is completed with the overrides at
   * compile time. Returns the completed dimension map, or null when the
   * line was consumed by a diagnostic instead.
   */
  private routeProfileComposition(
    comp: CompositionItem,
    isPerson: boolean,
    entityName: string,
    isDuplicate: boolean,
  ): Record<string, string> | null {
    if (!isPerson) {
      this.diagnostics.error(
        'analysis.character-line-person-only',
        `\`cognitive-profile\` composes only on a person — \`${entityName}\` is not a person.`,
        comp.span,
      );
      return null;
    }
    if (isDuplicate) {
      this.diagnostics.error('analysis.profile-duplicate', 'This block already has a `cognitive-profile` line.', comp.span);
      return null;
    }
    if (comp.condition) {
      this.diagnostics.error(
        'analysis.profile-conditional',
        '`cognitive-profile while …` is not supported — fluctuation is the runtime\'s (the `lucidity` dimension), not a condition.',
        comp.span,
      );
      return null;
    }
    const name = comp.words[1]?.toLowerCase();
    const known = [...Object.keys(CHARACTER_MANIFEST.profilePresets), ...this.profiles.keys()];
    if (name === undefined || comp.words.length > 2) {
      this.diagnostics.error(
        'analysis.profile-missing-name',
        `Expected one profile name after \`cognitive-profile\` — a preset (${Object.keys(CHARACTER_MANIFEST.profilePresets).join(', ')}) or a \`define profile\` name.`,
        comp.span,
      );
      return null;
    }
    const base = this.profiles.get(name) ?? CHARACTER_MANIFEST.profilePresets[name];
    if (!base) {
      this.diagnostics.error(
        'analysis.unknown-profile',
        `\`${name}\` is not a profile — the presets: ${Object.keys(CHARACTER_MANIFEST.profilePresets).join(', ')}, plus any \`define profile\` name${this.suggestText(name, known)}.`,
        comp.span,
      );
      return null;
    }
    const dims: Record<string, string> = { ...base };
    const seen = new Set<string>();
    for (const cfg of comp.config) {
      const dimension = cfg.key.join(' ').toLowerCase();
      const values = CHARACTER_MANIFEST.cognitiveDimensions[dimension];
      if (!values) {
        this.diagnostics.error(
          'analysis.unknown-dimension',
          `\`${dimension || cfg.value}\` is not a cognitive dimension — ${Object.keys(CHARACTER_MANIFEST.cognitiveDimensions).join(', ')}.`,
          cfg.span,
        );
        continue;
      }
      if (seen.has(dimension)) {
        this.diagnostics.error('analysis.profile-row-duplicate', `This line already sets \`${dimension}\`.`, cfg.span);
        continue;
      }
      seen.add(dimension);
      if (cfg.valueKind !== 'word' || !values.includes(cfg.value.toLowerCase())) {
        this.diagnostics.error(
          'analysis.unknown-dimension-value',
          `\`${cfg.value}\` is not a \`${dimension}\` value — ${values.join(', ')}.`,
          cfg.span,
        );
        continue;
      }
      dims[dimension] = cfg.value.toLowerCase();
    }
    return dims;
  }

  /**
   * Canonicalize a fact value or `thinks` value (ADR-310 D14): the resolved
   * entity ID when the name matches an entity; a bare unmatched single word
   * stays the literal word; an article-led or multi-word miss reports the
   * standard unknown-entity error and returns null.
   */
  private canonicalFactValue(v: NameRef): string | null {
    const lower = v.words.join(' ').toLowerCase();
    const exact = this.entities.filter((e) => e.nameLower === lower);
    if (exact.length === 1) return exact[0].id;
    if (v.article === null && v.words.length === 1) return lower;
    return this.resolveEntityId(v);
  }

  /**
   * Classify `knows`/`thinks` comma slots (order-free): a source word, a
   * confidence word, at most one of each. Reports per-slot diagnostics;
   * `ok: false` means the line should not emit.
   */
  private classifyKnowledgeSlots(
    slots: Array<{ word: string; span: Span }>,
    construct: 'knows' | 'thinks',
  ): { source?: string; confidence?: string; confided?: boolean; ok: boolean } {
    let source: string | undefined;
    let confidence: string | undefined;
    let confided: boolean | undefined;
    let ok = true;
    for (const slot of slots) {
      if (CHARACTER_MANIFEST.factSources.includes(slot.word)) {
        if (source !== undefined) {
          this.diagnostics.error(`analysis.${construct}-slot-duplicate`, `This \`${construct}\` line already has a source (\`${source}\`).`, slot.span);
          ok = false;
        } else {
          source = slot.word;
        }
      } else if (CHARACTER_MANIFEST.confidences.includes(slot.word)) {
        if (confidence !== undefined) {
          this.diagnostics.error(`analysis.${construct}-slot-duplicate`, `This \`${construct}\` line already has a confidence (\`${confidence}\`).`, slot.span);
          ok = false;
        } else {
          confidence = slot.word;
        }
      } else if (slot.word === 'confided' && construct === 'knows') {
        // ADR-318 D4: the received-in-confidence marker — what `never
        // betrays a confidence` binds on. `knows` lines only.
        if (confided !== undefined) {
          this.diagnostics.error(`analysis.${construct}-slot-duplicate`, `This \`${construct}\` line is already marked \`confided\`.`, slot.span);
          ok = false;
        } else {
          confided = true;
        }
      } else {
        this.diagnostics.error(
          `analysis.unknown-${construct}-slot`,
          `\`${slot.word}\` is not a \`${construct}\` slot — a source (${CHARACTER_MANIFEST.factSources.join(', ')}), a confidence (${CHARACTER_MANIFEST.confidences.join(', ')})${construct === 'knows' ? ', or `confided`' : ''}.`,
          slot.span,
        );
        ok = false;
      }
    }
    return { source, confidence, ...(confided !== undefined ? { confided } : {}), ok };
  }

  /**
   * ADR-310 D14's scope line: one level of belief, no theory of mind. A
   * topic or fact reference containing a mental verb is the attempt this
   * diagnostic exists to refuse — loudly, never an unimplemented feature
   * failing quietly.
   */
  private checkTheoryOfMind(ref: NameRef, construct: 'knows' | 'thinks'): boolean {
    const mental = ['thinks', 'believes', 'knows'];
    if (!ref.words.some((w) => mental.includes(w.toLowerCase()))) return false;
    this.diagnostics.error(
      'analysis.theory-of-mind',
      `One level of belief — a character cannot hold a model of another character's beliefs (\`${construct} ${ref.words.join(' ')} …\`).`,
      ref.span,
    );
    return true;
  }

  private buildEntity(decl: CreateDecl): IREntity {
    const sym = this.byId.get(decl.name.words.join('-').toLowerCase());
    const id = sym?.id ?? decl.name.words.join('-').toLowerCase();
    const isPerson = isPersonDecl(decl);
    // ADR-327 D10: `playable` marks a character eligible for the player role.
    const isPlayable = isPlayableDecl(decl);
    if (isPlayable && !isPerson) {
      const comp = decl.compositions.find(
        (c) => !c.article && c.words.length === 1 && c.words[0].toLowerCase() === 'playable',
      )!;
      this.diagnostics.error(
        'analysis.playable-non-person',
        `\`playable\` marks a character who can hold the player role — \`${decl.name.words.join(' ')}\` is not \`a person\`.`,
        comp.span,
      );
    }

    const kinds = [];
    const traits = [];
    const personality: IRPersonalityEntry[] = [];
    let profile: Record<string, string> | undefined;
    let sawProfileLine = false;
    for (const comp of decl.compositions) {
      // ADR-327 D10: `playable` is a reserved bare composition. Consumed here,
      // ahead of profile/personality/trait routing, so the word never enters
      // parser vocabulary and never reaches the unknown-trait census gate.
      if (!comp.article && comp.words.length === 1 && comp.words[0].toLowerCase() === 'playable') {
        continue;
      }
      // ADR-310 D4: `cognitive-profile <name> [with …]` rides the
      // composition grammar and compiles into character data.
      if (!comp.article && comp.words[0]?.toLowerCase() === 'cognitive-profile') {
        const built = this.routeProfileComposition(comp, isPerson, decl.name.words.join(' '), sawProfileLine);
        sawProfileLine = true;
        if (built) profile = built;
        continue;
      }
      // ADR-310 D2: a bare composition that reads as a personality
      // adjective (`very honest`, `cowardly`) compiles into character data.
      // Consumed words never reach trait composition, so they never enter
      // parser vocabulary (the D2 no-parser-vocabulary rule) and never hit
      // the census-15 unknown-trait gate.
      if (!comp.article && this.routeCharacterComposition(comp, isPerson, decl.name.words.join(' '), personality)) {
        continue;
      }
      const built = {
        name: comp.words.join(' ').toLowerCase(),
        config: comp.config.map((c) => ({
          key: c.key.join(' '),
          value: c.value,
          valueKind: c.valueKind,
          // `[ … ]` list entries resolve to entity IDs here (ADR-215) —
          // unresolved names report through the standard unknown-entity gate.
          ...(c.valueKind === 'list'
            ? { values: (c.listValues ?? []).map((ref) => this.resolveEntityId(ref) ?? '').filter((id) => id !== '') }
            : {}),
        })),
        condition: comp.condition ? this.resolveCondition(comp.condition, entityScope(sym ?? null)) : null,
        span: comp.span,
      };
      if (comp.article) kinds.push(built);
      else traits.push(built);

      // ADR-215: extension vocabulary is admitted only when its `use` is
      // declared (core manifests — npc — are always admitted), and its
      // `with`-fields are the manifest's closed, typed set — unknown keys
      // and mistyped values are compile errors, never a silent drop at the
      // loader. `[ … ]` list values exist only as manifest list fields.
      if (!comp.article) {
        const contributed = manifestForAdjective(built.name);
        if (!contributed) {
          for (const cfg of comp.config) {
            if (cfg.valueKind === 'list') {
              this.diagnostics.error(
                'analysis.config-list-host',
                `\`[ … ]\` list values belong to extension fields that declare them (e.g. \`patrol route [ … ]\`) — \`${built.name}\` has none.`,
                cfg.span,
              );
            }
          }
        }
        if (contributed) {
          if (!contributed.manifest.core && !this.usedExtensions.has(contributed.manifest.name)) {
            this.diagnostics.error(
              'analysis.extension-not-used',
              `\`${built.name}\` is \`${contributed.manifest.name}\` extension vocabulary — add \`use ${contributed.manifest.name}\` to the story header.`,
              comp.span,
            );
          } else {
            for (const cfg of comp.config) {
              const key = cfg.key.join(' ');
              const field = contributed.adjective.fields.find((f) => f.key === key);
              if (!field) {
                const known = contributed.adjective.fields.map((f) => f.key).join(', ');
                this.diagnostics.error(
                  'analysis.extension-config-key',
                  `\`${key}\` is not a \`${built.name}\` field — known fields: ${known}.`,
                  cfg.span,
                );
              } else if (field.valueKind !== cfg.valueKind) {
                this.diagnostics.error(
                  'analysis.extension-config-value',
                  `\`${key}\` takes a ${field.valueKind} value, not ${cfg.valueKind === 'name' ? 'an entity name' : `a ${cfg.valueKind}`}.`,
                  cfg.span,
                );
              }
            }
          }
        }
      }
    }

    // ADR-231 D5a pairing gate: each `starts <state>` initializer requires
    // its paired trait composed on the same entity (`starts locked` needs
    // `lockable`, `starts closed`/`open` need `openable`, `starts off`/`on`
    // need `switchable`). Table-driven — STARTS_STATE_PAIRINGS is the one
    // place future stateful traits extend. Mismatch = load-time error, never
    // a silent no-op.
    const startsStates: string[] = [];
    for (const s of decl.startsStates) {
      const requiredTrait = STARTS_STATE_PAIRINGS.get(s.state);
      if (!requiredTrait) continue; // parser already rejected the word
      if (!traits.some((t) => t.name === requiredTrait)) {
        this.diagnostics.error(
          'analysis.starts-state-pairing',
          `\`starts ${s.state}\` requires \`${requiredTrait}\` composed on this entity.`,
          s.span,
        );
        continue;
      }
      startsStates.push(s.state);
    }

    // ADR-242 D1: `proper` is the first kind-scoped trait adjective —
    // person-only and unconditional (identity is not turn state). Both
    // gates are analyzer diagnostics so the author reads the specific
    // reason, not the loader's generic conditional-composition error.
    for (const comp of decl.compositions) {
      if (comp.article || comp.words.join(' ').toLowerCase() !== 'proper') continue;
      if (!isPerson) {
        this.diagnostics.error(
          'analysis.proper-person-only',
          `\`proper\` composes only on a person (\`a person, proper\`) — \`${decl.name.words.join(' ')}\` is not a person.`,
          comp.span,
        );
      }
      if (comp.condition) {
        this.diagnostics.error(
          'analysis.proper-conditional',
          'Identity is not conditional — `proper while …` is not supported; a name is proper or it is not.',
          comp.span,
        );
      }
    }

    // ADR-242 D5: `pronouns <word>` — person-only, at most one line, and
    // the word resolves against the standard four or a `define pronouns`
    // set (never guessed; nearest-match suggestion on a miss, ruled Q-2:
    // no default is injected when the line is absent).
    let pronouns: string | undefined;
    if (decl.pronouns.length > 0) {
      if (!isPerson) {
        this.diagnostics.error(
          'analysis.pronouns-person-only',
          `\`pronouns\` is a person line — \`${decl.name.words.join(' ')}\` is not a person.`,
          decl.pronouns[0].span,
        );
      }
      for (const extra of decl.pronouns.slice(1)) {
        this.diagnostics.error('analysis.pronouns-duplicate', 'This `create` block already has a `pronouns` line.', extra.span);
      }
      const word = decl.pronouns[0].word;
      if (PRONOUN_WORDS.has(word) || this.pronounSetDecls.has(word)) {
        if (isPerson) pronouns = word;
      } else {
        const known = [...PRONOUN_WORDS, ...this.pronounSetDecls.keys()];
        this.diagnostics.error(
          'analysis.unknown-pronouns',
          `\`${word}\` is not a pronoun set — the standard sets are ${[...PRONOUN_WORDS].map((w) => `\`${w}\``).join(', ')}, plus any \`define pronouns\` set${this.suggestText(word, known)}.`,
          decl.pronouns[0].span,
        );
      }
    }

    // ADR-310 D3/D14: `mood` / `feels` / `knows` / `thinks` declaration
    // lines — the same person-only/never-the-player gates as personality
    // adjectives. Words resolve against the character manifest; targets
    // like any entity ref; `thinks` against the fact table.
    let mood: string | undefined;
    const feels: IRFeelsEntry[] = [];
    const knows: IRKnowsEntry[] = [];
    const thinks: IRThinksEntry[] = [];
    let spreads: IRSpreads | undefined;
    const goals: IRGoalDef[] = [];
    const influences: IRInfluenceDef[] = [];
    const resists: IRResistsEntry[] = [];
    const temperaments: IRTemperamentBinding[] = [];
    const principles: IRPrincipleEntry[] = [];
    const obligations: IRObligationEntry[] = [];
    let honor: IRHonorDecl | undefined;
    const burdenedBy: string[] = [];
    const firstCharacterLine =
      decl.moods[0] ??
      decl.feels[0] ??
      decl.knows[0] ??
      decl.thinks[0] ??
      decl.spreads[0] ??
      decl.goals[0] ??
      decl.influences[0] ??
      decl.resists[0] ??
      decl.temperaments[0] ??
      decl.nevers[0] ??
      decl.obligations[0] ??
      decl.codes[0] ??
      decl.honors[0] ??
      decl.burdens[0];
    if (firstCharacterLine && !isPerson) {
      this.diagnostics.error(
        'analysis.character-line-person-only',
        `Character declaration lines (mood, feels, knows, thinks, spreads, goal, influence, resists, temperament, never, protects, answers, code, honor, burdened by) compose only on a person — \`${decl.name.words.join(' ')}\` is not a person.`,
        firstCharacterLine.span,
      );
    } else if (firstCharacterLine) {
      if (decl.moods.length > 0) {
        const word = decl.moods[0].word;
        if (!this.isMoodWord(word)) {
          this.diagnostics.error(
            'analysis.unknown-mood-word',
            `\`${word}\` is not a mood word — the vocabulary: ${this.moodVocabulary().join(', ')}${this.suggestText(word, this.moodVocabulary())}.`,
            decl.moods[0].span,
          );
        } else {
          mood = word;
        }
        for (const extra of decl.moods.slice(1)) {
          this.diagnostics.error('analysis.mood-duplicate', 'This `create` block already has a `mood` line.', extra.span);
        }
      }
      for (const f of decl.feels) {
        if (!CHARACTER_MANIFEST.dispositions.includes(f.disposition)) {
          this.diagnostics.error(
            'analysis.unknown-disposition-word',
            `\`${f.disposition}\` is not a disposition word — the vocabulary: ${CHARACTER_MANIFEST.dispositions.join(', ')}.`,
            f.span,
          );
          continue;
        }
        const target = this.resolveEntityId(f.target);
        if (target === null) continue; // resolveEntityId already reported
        if (feels.some((e) => e.target === target)) {
          this.diagnostics.error(
            'analysis.feels-duplicate',
            `This block already declares a feeling toward \`${f.target.words.join(' ')}\`.`,
            f.span,
          );
          continue;
        }
        feels.push({ disposition: f.disposition, target, span: f.span });
      }
      for (const k of decl.knows) {
        if (this.checkTheoryOfMind(k.topic, 'knows')) continue;
        const topic = normalizeTopic(k.topic.words.join(' '));
        const { source, confidence, confided, ok } = this.classifyKnowledgeSlots(k.slots, 'knows');
        if (!ok) continue;
        if (source === undefined) {
          this.diagnostics.error(
            'analysis.knows-missing-source',
            `\`knows ${k.topic.words.join(' ')}\` needs a source — ${CHARACTER_MANIFEST.factSources.join(', ')} (e.g. \`knows the murder, witnessed\`).`,
            k.span,
          );
          continue;
        }
        if (knows.some((e) => e.topic === topic)) {
          this.diagnostics.error('analysis.knows-duplicate', `This block already declares \`knows ${topic}\`.`, k.span);
          continue;
        }
        knows.push({
          topic,
          source,
          ...(confidence !== undefined ? { confidence } : {}),
          ...(confided !== undefined ? { confided } : {}),
          span: k.span,
        });
      }
      for (const t of decl.thinks) {
        if (this.checkTheoryOfMind(t.fact, 'thinks')) continue;
        const factId = t.fact.words.join('-').toLowerCase();
        const fact = this.factById.get(factId);
        if (!fact) {
          this.diagnostics.error(
            'analysis.unknown-fact',
            `No \`define fact\` named \`${t.fact.words.join(' ')}\`${this.suggestText(factId, [...this.factById.keys()])}.`,
            t.fact.span,
          );
          continue;
        }
        const value = this.canonicalFactValue(t.value);
        if (value === null) continue; // canonicalFactValue already reported
        if (!fact.values.includes(value)) {
          this.diagnostics.error(
            'analysis.unknown-fact-value',
            `\`${t.value.words.join(' ')}\` is not a declared value of \`${fact.name}\` — the set: ${fact.values.join(', ')}.`,
            t.value.span,
          );
          continue;
        }
        const { source, confidence, ok } = this.classifyKnowledgeSlots(t.slots, 'thinks');
        if (!ok) continue;
        if (thinks.some((e) => e.factId === factId)) {
          this.diagnostics.error('analysis.thinks-duplicate', `This block already declares a belief about \`${fact.name}\`.`, t.span);
          continue;
        }
        thinks.push({
          factId,
          value,
          ...(confidence !== undefined ? { confidence } : {}),
          ...(source !== undefined ? { source } : {}),
          span: t.span,
        });
      }
      // ADR-310 D10: at most one `spreads` line; the audience resolves
      // against the manifest; topics normalize like `knows` topics.
      for (const extra of decl.spreads.slice(1)) {
        this.diagnostics.error('analysis.spreads-duplicate', 'This block already has a `spreads` line.', extra.span);
      }
      const s = decl.spreads[0];
      if (s?.mode === 'nothing') {
        spreads = { kind: 'nothing', span: s.span };
      } else if (s) {
        if (!CHARACTER_MANIFEST.audiences.includes(s.audience.word)) {
          this.diagnostics.error(
            'analysis.unknown-audience',
            `\`${s.audience.word}\` is not an audience — ${CHARACTER_MANIFEST.audiences.join(', ')}.`,
            s.audience.span,
          );
        } else {
          const topics: string[] = [];
          for (const t of s.topics) {
            const topic = normalizeTopic(t.words.join(' '));
            if (topics.includes(topic)) {
              this.diagnostics.error('analysis.spreads-topic-duplicate', `\`${topic}\` is already in this \`spreads\` list.`, t.span);
              continue;
            }
            topics.push(topic);
          }
          const except = s.except.map((e) => this.resolveEntityId(e)).filter((id): id is string => id !== null);
          spreads = { kind: 'spreads', topics, to: s.audience.word, except, span: s.span };
        }
      }
      // ADR-310 D8: goal blocks. Conditions resolve with `it` = the owner
      // (the on-clause scope); step refs resolve like any entity ref;
      // act/say keys are phrase keys.
      for (const g of decl.goals) {
        if (g.priority === null) continue; // header already errored at parse
        if (!CHARACTER_MANIFEST.goalPriorities.includes(g.priority.word)) {
          this.diagnostics.error(
            'analysis.unknown-priority',
            `\`${g.priority.word}\` is not a goal priority — ${CHARACTER_MANIFEST.goalPriorities.join(', ')}.`,
            g.priority.span,
          );
          continue;
        }
        if (goals.some((e) => e.id === g.name)) {
          this.diagnostics.error('analysis.goal-duplicate', `This block already has a goal named \`${g.name}\`.`, g.span);
          continue;
        }
        const scope = entityScope(sym ?? null);
        const steps: IRGoalStep[] = [];
        for (const step of g.steps) {
          switch (step.kind) {
            case 'seek': {
              const target = this.resolveEntityId(step.target);
              if (target === null) break;
              const inId = step.in ? this.resolveEntityId(step.in) : null;
              if (step.in && inId === null) break;
              steps.push({ kind: 'seek', target, ...(inId !== null ? { in: inId } : {}), span: step.span });
              break;
            }
            case 'acquire': {
              const target = this.resolveEntityId(step.target);
              if (target !== null) steps.push({ kind: 'acquire', target, span: step.span });
              break;
            }
            case 'wait-for':
              steps.push({ kind: 'wait-for', condition: this.resolveCondition(step.condition, scope), span: step.span });
              break;
            case 'move-to': {
              const target = this.resolveEntityId(step.target);
              if (target !== null) steps.push({ kind: 'move-to', target, span: step.span });
              break;
            }
            case 'act':
              this.requirePhrase(step.phraseKey, step.span, null);
              steps.push({ kind: 'act', phraseKey: step.phraseKey, span: step.span });
              break;
            case 'say': {
              this.requirePhrase(step.phraseKey, step.span, null);
              const target = step.target ? this.resolveEntityId(step.target) : null;
              if (step.target && target === null) break;
              steps.push({ kind: 'say', phraseKey: step.phraseKey, ...(target !== null ? { target } : {}), span: step.span });
              break;
            }
            case 'give': {
              const item = this.resolveEntityId(step.item);
              const target = this.resolveEntityId(step.target);
              if (item !== null && target !== null) steps.push({ kind: 'give', item, target, span: step.span });
              break;
            }
            case 'drop': {
              const item = this.resolveEntityId(step.item);
              if (item === null) break;
              const inId = step.in ? this.resolveEntityId(step.in) : null;
              if (step.in && inId === null) break;
              steps.push({ kind: 'drop', item, ...(inId !== null ? { in: inId } : {}), span: step.span });
              break;
            }
            case 'perform': {
              const lowered = this.lowerPerformStep(step);
              if (lowered !== null) steps.push(lowered);
              break;
            }
          }
        }
        goals.push({
          id: g.name,
          priority: g.priority.word,
          activeWhen: g.activeWhen ? this.resolveCondition(g.activeWhen, scope) : null,
          steps,
          span: g.span,
        });
      }
      // ADR-310 D9: influence blocks — header slots classify order-free
      // (mode and range are disjoint vocabularies); effect axes carry
      // vocabulary words; phrase hooks are author-written prose keys.
      for (const inf of decl.influences) {
        if (influences.some((e) => e.name === inf.name)) {
          this.diagnostics.error('analysis.influence-duplicate', `This block already defines an influence named \`${inf.name}\`.`, inf.span);
          continue;
        }
        let mode: string | undefined;
        let range: string | undefined;
        let slotError = false;
        for (const slot of inf.slots) {
          if (CHARACTER_MANIFEST.influenceModes.includes(slot.word)) {
            if (mode !== undefined) slotError = true;
            mode = slot.word;
          } else if (CHARACTER_MANIFEST.influenceRanges.includes(slot.word)) {
            if (range !== undefined) slotError = true;
            range = slot.word;
          } else {
            this.diagnostics.error(
              'analysis.unknown-influence-slot',
              `\`${slot.word}\` is not an influence mode (${CHARACTER_MANIFEST.influenceModes.join(', ')}) or range (${CHARACTER_MANIFEST.influenceRanges.join(', ')}).`,
              slot.span,
            );
            slotError = true;
          }
        }
        if (mode === undefined || range === undefined || slotError) {
          if (!slotError) {
            this.diagnostics.error(
              'analysis.influence-missing-mode-range',
              `An influence header needs a mode (${CHARACTER_MANIFEST.influenceModes.join(', ')}) and a range (${CHARACTER_MANIFEST.influenceRanges.join(', ')}).`,
              inf.span,
            );
          }
          continue;
        }
        const effect: Record<string, string> = {};
        let witnessed: string | undefined;
        let resisted: string | undefined;
        let expired: string | undefined;
        for (const e of inf.effects) {
          if (e.kind === 'clouds-focus') {
            if (effect['focus'] !== undefined) {
              this.diagnostics.error('analysis.influence-effect-duplicate', 'This influence already clouds focus.', e.span);
              continue;
            }
            effect['focus'] = 'clouded';
          } else if (e.kind === 'makes') {
            const vocab = e.axis === 'mood' ? this.moodVocabulary() : e.axis === 'threat' ? [...CHARACTER_MANIFEST.threats] : null;
            if (vocab === null) {
              this.diagnostics.error(
                'analysis.unknown-influence-axis',
                `\`makes ${e.axis}\` is not an influence effect — \`makes mood <word>\`, \`makes threat <word>\`, or \`clouds focus\`.`,
                e.span,
              );
              continue;
            }
            if (!vocab.includes(e.value)) {
              this.diagnostics.error(
                'analysis.unknown-influence-effect-word',
                `\`${e.value}\` is not a ${e.axis} word — the vocabulary: ${vocab.join(', ')}.`,
                e.span,
              );
              continue;
            }
            if (effect[e.axis] !== undefined) {
              this.diagnostics.error('analysis.influence-effect-duplicate', `This influence already sets ${e.axis}.`, e.span);
              continue;
            }
            effect[e.axis] = e.value;
          } else {
            this.requirePhrase(e.key, e.span, null);
            if (e.on === 'witnessed') {
              if (witnessed !== undefined) {
                this.diagnostics.error('analysis.influence-effect-duplicate', 'This influence already has a witnessed phrase.', e.span);
                continue;
              }
              witnessed = e.key;
            } else if (e.on === 'resisted') {
              if (resisted !== undefined) {
                this.diagnostics.error('analysis.influence-effect-duplicate', 'This influence already has a resisted phrase.', e.span);
                continue;
              }
              resisted = e.key;
            } else {
              if (expired !== undefined) {
                this.diagnostics.error('analysis.influence-effect-duplicate', 'This influence already has an expired phrase.', e.span);
                continue;
              }
              expired = e.key;
            }
          }
        }
        influences.push({
          name: inf.name,
          mode,
          range,
          effect,
          ...(witnessed !== undefined ? { witnessed } : {}),
          ...(resisted !== undefined ? { resisted } : {}),
          ...(expired !== undefined ? { expired } : {}),
          span: inf.span,
        });
      }
      // ADR-310 D9: resistance is one line on the target; the influence
      // name joins across entities (checked post-build, when every
      // influence exists — checkInfluenceReferences).
      for (const r of decl.resists) {
        if (resists.some((e) => e.influence === r.influence)) {
          this.diagnostics.error('analysis.resists-duplicate', `This block already resists \`${r.influence}\`.`, r.span);
          continue;
        }
        let exceptFrom: IRResistsEntry['exceptFrom'];
        if (r.exceptFrom) {
          if (r.exceptFrom.article === 'a' || r.exceptFrom.article === 'an') {
            exceptFrom = { kind: 'classifier', value: r.exceptFrom.words.join(' ').toLowerCase() };
          } else {
            const id = this.resolveEntityId(r.exceptFrom);
            if (id === null) continue;
            exceptFrom = { kind: 'entity', value: id };
          }
        }
        resists.push({ influence: r.influence, ...(exceptFrom !== undefined ? { exceptFrom } : {}), span: r.span });
      }
      // ADR-318 D3/D7: temperament bindings. Named defs resolve; inline
      // orderings and `with` overrides synthesize defs (`@` in the name —
      // unreachable from author kebab words, so no collision with `define
      // temperament` names). At most one binding live per state (the tie
      // gate D3 names, same shape as D16's phrasebook tie).
      let synthesized = 0;
      for (const t of decl.temperaments) {
        let defName: string;
        if (t.name !== null) {
          const base = this.temperamentDefs.get(t.name);
          if (!base) {
            this.diagnostics.error(
              'analysis.unknown-temperament',
              `No \`define temperament\` named \`${t.name}\`${this.suggestText(t.name, [...this.temperamentDefs.keys()].filter((n) => !n.includes('@')))}.`,
              t.span,
            );
            continue;
          }
          if (t.pairs.length === 0) {
            defName = t.name;
          } else {
            // `with` overrides fold as in ADR-310 D4: an override replaces
            // any base pair over the same two forces, and adds otherwise.
            const overrides = this.resolveForcePairs(t.pairs, `this \`${t.name}\` override`);
            const folded = base.pairs.filter(([a, b]) => !overrides.some(([c, d]) => (a === c && b === d) || (a === d && b === c)));
            folded.push(...overrides);
            defName = `${id}@temperament-${++synthesized}`;
            this.temperamentDefs.set(defName, { name: defName, pairs: folded, span: t.span });
          }
        } else {
          const pairs = this.resolveForcePairs(t.pairs, 'this temperament');
          if (pairs.length === 0) continue; // every pair errored above
          defName = `${id}@temperament-${++synthesized}`;
          this.temperamentDefs.set(defName, { name: defName, pairs, span: t.span });
        }
        if (t.while) {
          const states = this.byId.get(id)?.states ?? [];
          if (!states.includes(t.while.word)) {
            this.diagnostics.error(
              'analysis.temperament-unknown-state',
              `\`${t.while.word}\` is not a declared state of \`${decl.name.words.join(' ')}\` — a temperament binds to a word from the entity's \`states:\` line.`,
              t.while.span,
            );
            continue;
          }
        }
        const clash = temperaments.find((e) => (e.while ?? null) === (t.while?.word ?? null));
        if (clash) {
          this.diagnostics.error(
            'analysis.temperament-tie',
            t.while
              ? `Two temperaments bound to \`${t.while.word}\` — at most one may be live per state; give each its own state.`
              : `This block already has an unconditional \`temperament\` line — at most one may be live; bind one to a state with \`while <state>\`.`,
            t.span,
          );
          continue;
        }
        temperaments.push({ name: defName, ...(t.while ? { while: t.while.word } : {}), span: t.span });
      }
      // ADR-318 D4/D5: principles and obligations — `code` bundles flatten
      // first (in reference order), then the bare lines union in. An exact
      // duplicate (category + scope + except) is dead weight, refused.
      const principleKey = (p: IRPrincipleEntry) =>
        JSON.stringify({ category: p.category, scope: p.scope ?? null, except: p.except ?? null });
      const obligationKey = (o: IRObligationEntry) => JSON.stringify({ kind: o.kind, scope: o.scope ?? null });
      const addPrinciple = (p: IRPrincipleEntry, span: Span): void => {
        if (principles.some((e) => principleKey(e) === principleKey(p))) {
          this.diagnostics.error(
            'analysis.principle-duplicate',
            `This block already holds \`never ${this.categorySurface(p.category)}\`${p.scope || p.except ? ' with the same scope' : ''}.`,
            span,
          );
          return;
        }
        principles.push({ ...p, span });
      };
      const addObligation = (o: IRObligationEntry, span: Span): void => {
        if (obligations.some((e) => obligationKey(e) === obligationKey(o))) {
          this.diagnostics.error('analysis.obligation-duplicate', `This block already holds \`${o.kind}\` with the same scope.`, span);
          return;
        }
        obligations.push({ ...o, span });
      };
      for (const ref of decl.codes) {
        const bundle = this.codes.get(ref.name);
        if (!bundle) {
          this.diagnostics.error(
            'analysis.unknown-code',
            `No \`define code\` named \`${ref.name}\`${this.suggestText(ref.name, [...this.codes.keys()])}.`,
            ref.span,
          );
          continue;
        }
        for (const p of bundle.principles) addPrinciple(p, ref.span);
        for (const o of bundle.obligations) addObligation(o, ref.span);
      }
      for (const n of decl.nevers) {
        const p = this.resolveNeverLine(n);
        if (p) addPrinciple(p, n.span);
      }
      for (const o of decl.obligations) {
        const r = this.resolveObligationLine(o);
        if (r) addObligation(r, o.span);
      }
      // ADR-318 D7: at most one honor declaration; the full platform
      // bundle for `honor before`, the named bundle's subset otherwise.
      for (const h of decl.honors) {
        if (honor !== undefined) {
          this.diagnostics.error('analysis.honor-duplicate', 'This block already has an `honor` line.', h.span);
          continue;
        }
        let faceActs: string[];
        if (h.name !== null) {
          const bundle = this.honorDefs.get(h.name);
          if (!bundle) {
            this.diagnostics.error(
              'analysis.unknown-honor',
              `No \`define honor\` named \`${h.name}\`${this.suggestText(h.name, [...this.honorDefs.keys()])}.`,
              h.span,
            );
            continue;
          }
          faceActs = [...bundle];
        } else {
          faceActs = [...CHARACTER_MANIFEST.faceActs];
        }
        const scope = this.resolveScopeRefDecl(h.scope);
        if (scope === null) continue;
        const except = h.except.map((e) => this.resolveEntityId(e)).filter((eid): eid is string => eid !== null);
        honor = { scope, except, faceActs, span: h.span };
      }
      // ADR-318 D8: `burdened by` seeds — the topic must be HELD (a
      // compile check: pre-story guilt over something the character does
      // not know is unexpressable, refused rather than silently inert).
      for (const b of decl.burdens) {
        const topic = normalizeTopic(b.topic.words.join(' '));
        if (!knows.some((k) => k.topic === topic)) {
          this.diagnostics.error(
            'analysis.burdened-unheld',
            `\`burdened by ${b.topic.words.join(' ')}\` needs the topic held — add \`knows ${b.topic.words.join(' ')}, <source>\` to this block.`,
            b.span,
          );
          continue;
        }
        if (burdenedBy.includes(topic)) {
          this.diagnostics.error('analysis.burdened-duplicate', `This block is already \`burdened by ${topic}\`.`, b.span);
          continue;
        }
        burdenedBy.push(topic);
      }
    }

    // ADR-327 D10: the player-block composition gates (`analysis.player-kind`,
    // `analysis.player-behavior`) are gone with the player block itself. A
    // `playable` character composes like any other person, and an NPC behavior
    // adjective on one is legitimate — it drives them for as long as they are
    // NOT the role-holder, which is exactly what D9's role gate makes possible.

    // ADR-234 D3: a door's location IS its room pair — the loader places
    // it in room1 per the platform convention; a placement line is a load
    // error (the region-placement gate is the direct precedent).
    if (kinds.some((k) => k.name === 'door') && decl.placement) {
      this.diagnostics.error(
        'analysis.door-placement',
        `A door has no placement — its location IS its room pair (the loader places it in the first room of its \`through\` exit line). Remove this line.`,
        decl.placement.span,
      );
    }

    // ADR-236 D1: a region's "location" IS its member list — placement
    // lines on a region block are a load error (mirror of ADR-234 D3's
    // door-placement gate).
    const isRegion = kinds.some((k) => k.name === 'region');
    if (isRegion && decl.placement) {
      this.diagnostics.error(
        'analysis.region-placement',
        `A region has no location — its place IS its member list. Remove this line; membership is \`containing <rooms>\`.`,
        decl.placement.span,
      );
    }
    // ADR-325 D5: `landing` is a region's door — on any other block it
    // names nothing.
    if (!isRegion && decl.landing) {
      this.diagnostics.error(
        'analysis.landing-host',
        `\`landing\` declares where things put in a region land — \`${decl.name.words.join(' ')}\` is not a region.`,
        decl.landing.span,
      );
    }
    // ADR-236 D2: `containing` is region membership — on any other block it
    // would be a silent no-op, so it is a load error, never a guess.
    if (!isRegion && decl.containing.length > 0) {
      this.diagnostics.error(
        'analysis.region-containing-host',
        `\`containing\` declares region membership — \`${decl.name.words.join(' ')}\` is not a region. (Contents are placed with \`in\`/\`on\` lines on the contained entity.)`,
        decl.containing[0].span,
      );
    }

    // Z1: `first time` prose compiles to RoomTrait.initialDescription —
    // only rooms carry that field, so any other kind is a load error
    // until a platform surface exists (never a guess).
    if (decl.initialDescription && !kinds.some((k) => k.name === 'room')) {
      this.diagnostics.error(
        'analysis.first-time-non-room',
        `\`first time\` prose is only supported on rooms (it compiles to RoomTrait.initialDescription) — \`${decl.name.words.join(' ')}\` is not a room.`,
        decl.initialDescription.span,
      );
    }

    // ADR-289 D6: an exit wires into RoomTrait.exits, which only a room
    // carries — anywhere else the line compiles and then does nothing, the
    // silent no-op Chord exists to refuse. Blocked and deadly exits ride the
    // same gate: each names a direction out of a place, and a non-room is
    // not a place you leave. The loader keeps a defensive throw against
    // rogue IR (ADR-276's two-layer pattern).
    if (!kinds.some((k) => k.name === 'room')) {
      const strayExit = decl.exits[0] ?? decl.blockedExits[0] ?? decl.deadlyExits[0];
      if (strayExit) {
        this.diagnostics.error(
          'analysis.exit-non-room',
          `Exits belong to rooms — \`${decl.name.words.join(' ')}\` is not a room. Remove the line, or make this block \`a room\`.`,
          strayExit.span,
        );
      }
    }

    return {
      id,
      name: decl.name.words.join(' '),
      article: decl.name.article,
      aka: decl.aka,
      // Present only when declared and resolved (ruled Q-2: absent means
      // the platform's by-number fallback — and zero golden churn).
      ...(pronouns !== undefined ? { pronouns } : {}),
      isPlayable,
      kinds,
      traits,
      // ADR-310 D7: present exactly when the block declared at least one
      // character construct — a person with none compiles exactly as today.
      ...(personality.length > 0 ||
      mood !== undefined ||
      feels.length > 0 ||
      knows.length > 0 ||
      thinks.length > 0 ||
      profile !== undefined ||
      spreads !== undefined ||
      goals.length > 0 ||
      influences.length > 0 ||
      resists.length > 0 ||
      temperaments.length > 0 ||
      principles.length > 0 ||
      obligations.length > 0 ||
      honor !== undefined ||
      burdenedBy.length > 0
        ? {
            character: {
              personality,
              ...(mood !== undefined ? { mood } : {}),
              feels,
              knows,
              thinks,
              ...(profile !== undefined ? { profile } : {}),
              ...(spreads !== undefined ? { spreads } : {}),
              goals,
              influences,
              resists,
              temperaments,
              principles,
              obligations,
              ...(honor !== undefined ? { honor } : {}),
              burdenedBy,
            },
          }
        : {}),
      startsStates,
      placement: decl.placement
        ? {
            relation: decl.placement.relation,
            place: this.resolveEntityId(decl.placement.place) ?? '',
            span: decl.placement.span,
          }
        : null,
      wears: decl.wears.map((w) => this.resolveEntityId(w) ?? '').filter((w) => w !== ''),
      carries: decl.carries.map((c) => this.resolveEntityId(c) ?? '').filter((c) => c !== ''),
      containing: decl.containing
        .map((m) => ({ id: this.resolveEntityId(m) ?? '', span: m.span }))
        .filter((m) => m.id !== ''),
      ...(decl.landing && isRegion ? { landing: this.buildLanding(decl.landing) } : {}),
      exits: decl.exits.map((e) => ({
        direction: e.direction,
        to: this.resolveEntityId(e.to) ?? '',
        // `through the <door>` (ADR-234 D1): resolved like any entity
        // reference — an unknown name is the standard unresolved-entity
        // error; '' marks it so checkDoors skips what is already reported.
        via: e.via ? (this.resolveEntityId(e.via) ?? '') : null,
        span: e.span,
      })),
      blockedExits: decl.blockedExits.map((b, i) => {
        this.requirePhrase(b.phraseKey, b.span);
        // GH #315: a direction's blocked lines compose in declaration order —
        // the first line whose condition holds supplies the refusal, and a
        // condition-less line always holds. Any later line on the same
        // direction can therefore never be selected; say so at compile time
        // instead of leaving the order rule as runtime folklore.
        const shadowedBy = decl.blockedExits.findIndex(
          (earlier, j) => j < i && earlier.direction === b.direction && !earlier.condition,
        );
        if (shadowedBy !== -1) {
          this.diagnostics.warning(
            'analysis.blocked-exit-unreachable',
            `This \`${b.direction} is blocked\` line can never fire: the condition-less \`${b.direction} is blocked\` line above it always supplies the refusal first. Blocked lines compose in declaration order — put the condition-less fallback last.`,
            b.span,
          );
        }
        return {
          direction: b.direction,
          phraseKey: b.phraseKey,
          condition: b.condition ? this.resolveCondition(b.condition, entityScope(sym ?? null)) : null,
          span: b.span,
        };
      }),
      deadlyExits: decl.deadlyExits.map((d) => {
        this.requirePhrase(d.phraseKey, d.span);
        // Compile gate (platform-issue-sweep Phase 8 #15d): the conditional
        // form is post-scope (mirror: role-bound trait clauses). It used to
        // fail only at LOAD (loader.ts throw — kept there as the defensive
        // backstop), which the harness's expect-fail-manifest convention
        // cannot pin; failing here makes it a compile diagnostic.
        if (d.condition !== null) {
          this.diagnostics.error(
            'analysis.deadly-while-unsupported',
            '`is deadly while <condition>` is not wired yet — the conditional deadly exit is post-scope. Use an unconditional `is deadly:` or an `on going` clause with `kill the player when <condition>`.',
            d.span,
          );
        }
        return {
          direction: d.direction,
          phraseKey: d.phraseKey,
          condition: d.condition ? this.resolveCondition(d.condition, entityScope(sym ?? null)) : null,
          span: d.span,
        };
      }),
      deadly: decl.deadly
        ? (this.requirePhrase(decl.deadly.phraseKey, decl.deadly.span),
          { phraseKey: decl.deadly.phraseKey, span: decl.deadly.span })
        : null,
      // Merged set: own `states:` plus every composed trait's declared
      // states (ratchet D8) — the loader initializes from states[0].
      states: sym ? sym.states : decl.states.map((s) => s.name),
      statesReversible: decl.statesReversible,
      counters: decl.counters.map((c) => this.buildCounterDecl(c)),
      descriptionKey: decl.description ? `${id}.description` : null,
      initialDescriptionKey: decl.initialDescription ? `${id}.initial-description` : null,
      onClauses: this.checkDuplicateClauses(decl.onClauses, decl.name.words.join(' ').toLowerCase()).map((c, i) =>
        this.buildOnClause(c, entityScope(sym ?? null), id, i),
      ),
      ...(decl.timerClauses.length > 0
        ? { timerClauses: decl.timerClauses.map((c, i) => this.buildTimerClause(c, entityScope(sym ?? null), id, i)) }
        : {}),
      ...(decl.moveClauses.length > 0
        ? { moveClauses: decl.moveClauses.map((c, i) => this.buildMoveClause(c, entityScope(sym ?? null), id, i)) }
        : {}),
      // Filled by applyTopics after every entity is built (ADR-239).
      topics: [],
      span: decl.span,
    };
  }

  /**
   * ADR-327 D1: resolve a clause head's actor and gate the head against its
   * block. An explicit head names the player (the role, fire-time) or a
   * character; one naming the block's own owner is the bare form written
   * long (`analysis.head-actor-is-owner`); anything else that is not an
   * actor is `analysis.head-actor`. A bare head is the owner's own action
   * and belongs only in the player's or a character's block — a trait body,
   * a room, or a thing has no acting owner (`analysis.head-bare-outside-actor`).
   * @returns the actor IRValue (`player` | `entity`), or null for a bare or
   *   every-turn head — and for an unresolvable actor, already reported.
   */
  private resolveHeadActor(clause: OnClause, scope: Scope): IRValue | null {
    if (clause.binding === 'every-turn') return null;
    const owner = scope.owner;
    const explicit = `${clause.clauseKind} the player ${clause.action}`;

    if (clause.actor === null) {
      // Bare head — or the parser's marker for an already-reported `… it`.
      if (clause.binding !== 'self') return null;
      if (!owner || !isActorSymbol(owner)) {
        this.diagnostics.error(
          'analysis.head-bare-outside-actor',
          `\`${clause.clauseKind} ${clause.action}\` names no actor — a bare head is the block owner's own action and belongs only in the player's or a character's block. Name who acts: \`${explicit}\` (or the actor's name).`,
          clause.span,
        );
      }
      return null;
    }

    const actorText = valueExprText(clause.actor);
    const head = `${clause.clauseKind} ${actorText} ${clause.action}`;
    const ref = clause.actor.kind === 'ref' ? clause.actor.ref : null;
    const words = ref ? ref.words.map((w) => w.toLowerCase()) : [];
    if (ref && words.length === 1 && PLAYER_WORDS.has(words[0])) {
      if (owner?.id === 'player') {
        this.diagnostics.error(
          'analysis.head-actor-is-owner',
          `\`${head}\` in the player's own block — the subject of a block is its owner; write bare \`${clause.clauseKind} ${clause.action}\`.`,
          clause.span,
        );
        return null;
      }
      return { kind: 'player' };
    }
    const sym = ref && !(words.length === 1 && words[0] === 'it') ? this.findEntitySilent(ref) : null;
    if (sym && !isActorSymbol(sym)) {
      this.diagnostics.error(
        'analysis.head-actor',
        `\`${head}\` — \`${actorText}\` cannot act; a head names the player or a character (\`a person\`): \`${explicit}\`.`,
        clause.span,
      );
      return null;
    }
    if (sym && owner && sym.id === owner.id) {
      this.diagnostics.error(
        'analysis.head-actor-is-owner',
        `\`${head}\` in ${entityDisplayName(owner)}'s own block — the subject of a block is its owner; write bare \`${clause.clauseKind} ${clause.action}\`.`,
        clause.span,
      );
      return null;
    }
    if (sym) return { kind: 'entity', id: sym.id };
    this.diagnostics.error(
      'analysis.head-actor',
      `\`${head}\` — \`${actorText}\` is not the player or a character. A head is \`${clause.clauseKind} <who acts> <action>\`: the actor first, then the action word (here \`${clause.action}\`) — e.g. \`${explicit}\`.`,
      clause.span,
    );
    return null;
  }

  /**
   * @param ownerKey ADR-289 D2 id prefix naming the compile-time owner —
   *   an entity IR id, `trait.<name>`, or `story`.
   * @param clauseIndex position among this owner's clauses. Required for
   *   uniqueness: the duplicate-clause gate skips `every-turn` clauses and
   *   separates event verbs only by condition, so kind+action can repeat.
   */
  private buildOnClause(clause: OnClause, scope: Scope, ownerKey: string, clauseIndex: number): IROnClause {
    // §5.4 compiler rule, both halves: clauses on dispatch verbs (`define
    // action` names) compile to CapabilityBehaviors; clauses on standard-
    // semantics actions compile to ActionInterceptors (the Phase A path).
    let routing: IROnClause['routing'] = null;
    if (clause.binding !== 'every-turn') {
      routing = this.actionSlots.has(clause.action) ? 'capability' : 'interceptor';
    }

    // Clauses bound to a dispatch verb may reference its grammar slots
    // (`the animal`); role clauses additionally bind the role word itself.
    const extraSlots = new Set<string>(scope.slots ?? []);
    for (const slot of this.actionSlots.get(clause.action) ?? []) extraSlots.add(slot);
    if (clause.binding === 'role' && clause.role) {
      const roles = this.rolesFor(clause.action);
      if (!roles.has(clause.role)) {
        this.diagnostics.error(
          'analysis.unknown-role',
          `\`${clause.role}\` is not a role of \`${clause.action}\` — roles: ${[...roles].join(', ') || '(none)'}${this.suggestText(clause.role, [...roles])}.`,
          clause.span,
        );
      }
      extraSlots.add(clause.role);
    }
    const clauseScope: Scope = { ...scope, slots: extraSlots.size ? extraSlots : scope.slots };

    const actor = this.resolveHeadActor(clause, scope);
    const condition = clause.condition ? this.resolveCondition(clause.condition, clauseScope) : null;
    const clausePath = `${ownerKey}.${clause.clauseKind}-${clause.action}-${clauseIndex}`;
    const body = clause.body.map((s, i) => this.resolveStatement(s, clauseScope, `${clausePath}.${i}`));
    this.checkPhaseOrder(clause.body, { ended: null });
    return {
      clauseKind: clause.clauseKind,
      once: clause.once,
      action: clause.action,
      actor,
      binding: clause.binding,
      role: clause.role,
      condition,
      ordering: clause.ordering,
      routing,
      // Decision 10: all on-clauses are entity/trait-owned (ownership
      // package) — their narration is presence-scoped.
      narration: 'presence',
      body,
      span: clause.span,
    };
  }

  /** Roles a clause may bind on an action: declared slots + the actor role. */
  private rolesFor(action: string): Set<string> {
    const declared = this.actionSlots.get(action);
    if (declared) return new Set([...declared, 'actor']);
    return new Set(STANDARD_ACTION_ROLES[action] ?? []);
  }

  /**
   * Phase-order rule (§5.3 gate 4), as ADR-289 D3 widened it: a clause body
   * opens with a leading validate partition of refusals only, and a refusal
   * outside it cannot fire.
   *
   * Two errors, one gate. A refusal after a mutation keeps
   * `analysis.refusal-after-mutation` — the oldest and most common shape,
   * with the remedy authors already know. Every other dead refusal is
   * `analysis.refusal-misplaced`: after a non-refusal statement that is not
   * a mutation, or nested inside a routing block, where no mutation is
   * being blamed and the remedy is to lift the refusal out.
   *
   * Arms and alternatives branch: they cannot co-execute, so arm one's
   * mutation must never accuse arm two's refusal (Acceptance 10). On exit
   * the block closes the partition for its parent, as a mutation when any
   * branch mutated — but never displacing an earlier ender, since the
   * message names the *first* statement that closed the partition.
   */
  private checkPhaseOrder(body: Statement[], state: PhaseOrderState, nestedIn: string | null = null): void {
    for (const stmt of body) {
      switch (stmt.kind) {
        case 'set':
        case 'change':
        case 'change-player':
        case 'change-mood':
        case 'change-feeling':
        case 'move':
        case 'act':
        case 'remove':
        case 'award':
        case 'raise':
        case 'lower':
        case 'timer-verb':
          // `raise`/`lower` are mutations (D3) — a counter change is world
          // state, and a refusal after one is as dead as after a `change`.
          // A timer verb (ADR-325 D3c) is the same kind of change.
          state.ended ??= { kind: 'mutation', what: statementWord(stmt) };
          break;
        case 'refuse':
        case 'must':
        case 'refuse-when': {
          const refusal = stmt.kind === 'must' ? 'must' : `refuse ${stmt.phraseKey}`;
          if (nestedIn) {
            this.diagnostics.error(
              'analysis.refusal-misplaced',
              `Refusal inside ${nestedIn} — it never fires, because refusals are decided before any branch runs. Move \`${refusal}\` to the top of the clause, above the block.`,
              stmt.span,
            );
          } else if (state.ended?.kind === 'mutation') {
            this.diagnostics.error(
              'analysis.refusal-after-mutation',
              `Refusal after mutation — move the check above the first set/change/move (\`${refusal}\` must precede mutations).`,
              stmt.span,
            );
          } else if (state.ended) {
            this.diagnostics.error(
              'analysis.refusal-misplaced',
              `Refusal after \`${state.ended.what}\` — refusals must lead the clause. Move \`${refusal}\` above the first \`${state.ended.what}\`.`,
              stmt.span,
            );
          }
          break;
        }
        case 'select-on':
          this.checkRoutingBlock(
            stmt.arms.map((arm) => arm.body),
            state,
            'a `select` arm',
            'select',
          );
          break;
        case 'select-strategy':
          this.checkRoutingBlock(stmt.alternatives, state, 'a `select` alternative', 'select');
          break;
        case 'ordinal':
          this.checkRoutingBlock([stmt.body], state, `a \`${stmt.ordinalWord} time\` block`, `${stmt.ordinalWord} time`);
          break;
        case 'each':
          // The block's body runs per match, after the matching — a refusal
          // inside it is as dead as one inside a select arm, and a mutation
          // inside it closes the partition for what follows.
          this.checkRoutingBlock([stmt.body], state, 'an `each` block', 'each');
          break;
        default:
          state.ended ??= { kind: 'statement', what: statementWord(stmt) };
          break;
      }
    }
  }

  /**
   * Walk each branch of a routing block under its own partition state, then
   * close the parent's partition on the block itself.
   *
   * @param branches   the arm/alternative bodies — each cannot see the others
   * @param state      the parent partition state, updated on exit
   * @param nestedIn   how the block is named when accusing a refusal inside it
   * @param word       the block keyword, for the parent's "after `<word>`" message
   */
  private checkRoutingBlock(
    branches: Statement[][],
    state: PhaseOrderState,
    nestedIn: string,
    word: string,
  ): void {
    let mutated = false;
    for (const branch of branches) {
      const branchState: PhaseOrderState = { ended: state.ended };
      this.checkPhaseOrder(branch, branchState, nestedIn);
      if (branchState.ended?.kind === 'mutation') mutated = true;
    }
    state.ended ??= { kind: mutated ? 'mutation' : 'statement', what: word };
  }

  // ----------------------------------------------------------- statements

  /**
   * Resolve the story's `before the game starts` block (ADR-327 D10).
   *
   * Runs after every entity is built, so the role assignment can name a
   * character declared anywhere in the story. Three gates live here:
   * exactly one block per story, effect statements only, and a role
   * assignment on some path. The last is a compile-time *reachability*
   * check, not a guarantee — the assignment may carry a `when` tail, so the
   * loader keeps a matching runtime backstop for the path that skips it.
   *
   * @returns the lowered block, or null when the story declares none (which
   *   is itself reported, except in a grammar file, which carries no story)
   */
  private buildStartBlock(): { body: IRStatement[]; span: Span } | null {
    const blocks = this.ast.declarations.filter((d): d is StartBlockDecl => d.kind === 'start-block');
    if (blocks.length === 0) {
      // Only a story is missing a start block. A grammar file carries no story
      // content, and a headerless fragment is not a story either — both are
      // compiled all over the test suites and neither has a role to fill.
      if (!this.ast.grammarHeader && this.ast.header) {
        this.diagnostics.error(
          'analysis.start-block-missing',
          'This story never says who the player is. Add a `before the game starts` block assigning the role: `change the player to <character>`.',
          this.ast.header?.span ?? this.ast.span,
        );
      }
      return null;
    }
    for (const extra of blocks.slice(1)) {
      this.diagnostics.error(
        'analysis.duplicate-start-block',
        'A story has one `before the game starts` block — merge these two.',
        extra.span,
      );
    }

    const decl = blocks[0];
    const body: IRStatement[] = [];
    let assignsRole = false;
    decl.body.forEach((stmt, index) => {
      // Q3 (ruled 2026-08-26): the block runs before any turn exists to carry
      // prose, so narration here has no sink. The story header's `prologue:`
      // is the seam that does.
      if (stmt.kind === 'phrase' || stmt.kind === 'emit') {
        this.diagnostics.error(
          'analysis.start-block-narration',
          `\`${stmt.kind}\` has no sink before the game starts — opening text belongs in the story header's \`prologue:\` field.`,
          stmt.span,
        );
        return;
      }
      if (stmt.kind === 'change-player') assignsRole = true;
      body.push(this.resolveStatement(stmt, STORY_SCOPE, `start-block.${index}`));
    });

    if (!assignsRole) {
      this.diagnostics.error(
        'analysis.start-block-no-role',
        'This `before the game starts` block never assigns the player role — add `change the player to <character>`.',
        decl.span,
      );
    }
    return { body, span: decl.span };
  }

  private resolveStatement(stmt: Statement, scope: Scope, path: string): IRStatement {
    switch (stmt.kind) {
      case 'refuse':
      case 'phrase': {
        if (RESERVED_CHANNEL_KEYS.has(stmt.phraseKey)) {
          // Z3: channels are platform-PULLED — emitting one via a `phrase`
          // (or `refuse`) statement is a load error, never a push.
          this.diagnostics.error(
            'analysis.channel-pushed',
            `\`${stmt.phraseKey}\` is a platform-pulled channel — it narrates when its platform condition fires, never via a \`${stmt.kind}\` statement.`,
            stmt.span,
          );
        }
        this.requirePhrase(stmt.phraseKey, stmt.span, scope.owner);
        const params = stmt.params.map((p) => ({
          param: p.param.join(' '),
          value: this.resolveValue(p.value, scope),
          span: p.span,
        }));
        if (stmt.kind === 'refuse') {
          return { kind: 'refuse', phraseKey: stmt.phraseKey, params, span: stmt.span };
        }
        return {
          kind: 'phrase',
          phraseKey: stmt.phraseKey,
          params,
          stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope),
          span: stmt.span,
        };
      }
      case 'emit': {
        const payload = stmt.payload.map((f) => this.resolveEmitField(f, scope));
        // ADR-253 D1: record the event's top-level payload field names so a
        // channel `return`ing an unknown field is caught (checkChannelReturns).
        const eventId = stmt.event.join(' ');
        let fields = this.emitFields.get(eventId);
        if (!fields) {
          fields = new Set<string>();
          this.emitFields.set(eventId, fields);
        }
        for (const f of stmt.payload) fields.add(f.key.join(' '));
        return {
          kind: 'emit',
          event: eventId,
          ...(payload.length > 0 ? { payload } : {}),
          stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope),
          span: stmt.span,
        };
      }
      case 'set': {
        // ADR-325 D3: a timer never takes a value.
        if (this.timerKeyOf(stmt.target, scope) !== null) {
          this.diagnostics.error(
            'analysis.tally-verb-on-timer',
            '`set` writes a value — a timer has none; it is `start`ed, `stop`ped, `restart`ed, `reset`, or `interrupt`ed.',
            stmt.span,
          );
        }
        // ADR-325 D4: `set <tally> to <n>` — the one absolute tally write,
        // same target forms as raise/lower; clamped by the loader.
        const tally = this.counterTargetOf(stmt.target, scope);
        if (tally) {
          const v = stmt.value;
          const literal = v.kind === 'literal' && v.literalKind === 'number' ? Number(v.value) : null;
          if (literal === null) {
            this.diagnostics.error(
              'analysis.set-counter-value',
              `\`set ${tally.counter} to …\` takes a number — tally arithmetic is later scope.`,
              stmt.span,
            );
          }
          return { kind: 'set-counter', counter: tally.counter, owner: tally.owner, value: literal ?? 0, stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
        }
        const target = this.resolveValue(stmt.target, scope);
        // ADR-325 D5: `set <region>'s landing to <room>` — the base must be
        // a region that declared a landing (a `set` replaces, never creates).
        if (target.kind === 'field' && target.field === 'landing' && target.base.kind === 'entity') {
          const sym = this.byId.get(target.base.id);
          const isRegion = sym?.decl.compositions.some((c) => c.article && c.words.join(' ').toLowerCase() === 'region') ?? false;
          if (sym && (!isRegion || !sym.decl.landing)) {
            this.diagnostics.error(
              'analysis.landing-set-target',
              `\`${sym.decl.name.words.join(' ')}\` has no landing to set — only a region with a \`landing\` line has one.`,
              stmt.span,
            );
          }
        }
        return {
          kind: 'set',
          target,
          value: this.resolveValue(stmt.value, scope),
          stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope),
          span: stmt.span,
        };
      }
      case 'change': {
        // `change the story to <state>` targets the story object (D2).
        const targetWords = stmt.entity.words.map((w) => w.toLowerCase());
        if (targetWords.length === 1 && targetWords[0] === 'story') {
          if (!this.storyStates.includes(stmt.state)) {
            this.diagnostics.error(
              'analysis.undeclared-state',
              `\`${stmt.state}\` is not a declared state of the story${this.suggestText(stmt.state, this.storyStates)}.`,
              stmt.span,
            );
          } else {
            this.checkChangeLegality(
              { states: this.storyStates, reversible: this.ast.header?.statesReversible ?? false },
              stmt.state,
              stmt.span,
            );
          }
          return { kind: 'change', entity: { kind: 'story' }, state: stmt.state, stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
        }
        const entity = this.resolveEntityValue(stmt.entity, scope);
        const sym = entity.kind === 'entity' ? this.byId.get(entity.id) : entity.kind === 'it' ? scope.owner : null;
        const validStates = sym ? sym.states : entity.kind === 'it' ? scope.ownStates : null;
        if (validStates && !validStates.includes(stmt.state)) {
          this.diagnostics.error(
            'analysis.undeclared-state',
            `\`${stmt.state}\` is not a declared state of ${sym?.nameLower ?? 'it'}${this.suggestText(stmt.state, validStates)}.`,
            stmt.span,
          );
        } else if (validStates) {
          this.checkChangeLegality(this.stateSetOf(sym ?? null, stmt.state), stmt.state, stmt.span);
        }
        return { kind: 'change', entity, state: stmt.state, stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
      }
      case 'change-player': {
        // ADR-327 D9/D10: the role moves to a named character. Eligibility is
        // compile-time so the engine's `switchPlayer` isPlayable throw can
        // never reach a player. An unresolved name is left to the standard
        // unknown-entity gate `resolveEntityValue` already fires — a second
        // diagnostic for one miss reads as two problems.
        const entity = this.resolveEntityValue(stmt.target, scope);
        if (entity.kind === 'entity') {
          const sym = this.byId.get(entity.id);
          if (sym && !isPersonDecl(sym.decl)) {
            this.diagnostics.error(
              'analysis.player-target-not-person',
              `\`${sym.nameLower}\` cannot hold the player role — only \`a person\` can.`,
              stmt.span,
            );
          } else if (sym && !isPlayableDecl(sym.decl)) {
            this.diagnostics.error(
              'analysis.player-target-not-playable',
              `\`${sym.nameLower}\` is not \`playable\` — add \`playable\` to its create block to let the player role move to it.`,
              stmt.span,
            );
          }
        }
        return {
          kind: 'change-player',
          entity,
          stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope),
          span: stmt.span,
        };
      }
      case 'change-mood': {
        // ADR-310 D3: the mood word resolves against the character
        // manifest (plus this story's `define mood` words) here; whether
        // the bound `it` actually carries a character model is the
        // loader's gate (the binding is dynamic).
        if (!this.isMoodWord(stmt.mood)) {
          this.diagnostics.error(
            'analysis.unknown-mood-word',
            `\`${stmt.mood}\` is not a mood word — the vocabulary: ${this.moodVocabulary().join(', ')}${this.suggestText(stmt.mood, this.moodVocabulary())}.`,
            stmt.span,
          );
        }
        return { kind: 'change-mood', mood: stmt.mood, stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
      }
      case 'change-feeling': {
        // ADR-310 D3: same split — disposition word compile-gated here,
        // the has-model check is the loader's.
        if (!CHARACTER_MANIFEST.dispositions.includes(stmt.disposition)) {
          this.diagnostics.error(
            'analysis.unknown-disposition-word',
            `\`${stmt.disposition}\` is not a disposition word — the vocabulary: ${CHARACTER_MANIFEST.dispositions.join(', ')}.`,
            stmt.span,
          );
        }
        const target = this.resolveEntityValue(stmt.target, scope);
        return {
          kind: 'change-feeling',
          target,
          disposition: stmt.disposition,
          stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope),
          span: stmt.span,
        };
      }
      case 'remove': {
        // Z6 (ADR-213 Q3): entity references resolve as `move`'s do; the
        // player is never removable (`analysis.remove-player` — the platform
        // defines no post-removal player semantics).
        const entity = this.resolveEntityValue(stmt.entity, scope);
        if (
          entity.kind === 'player' ||
          (entity.kind === 'entity' && this.byId.get(entity.id)?.decl.name.words.join(' ').toLowerCase() === 'player')
        ) {
          this.diagnostics.error(
            'analysis.remove-player',
            '`remove the player` is not a thing — the platform defines no post-removal player semantics (ADR-213).',
            stmt.span,
          );
        }
        return {
          kind: 'remove',
          entity,
          stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope),
          span: stmt.span,
        };
      }
      case 'move':
        return {
          kind: 'move',
          entity: this.resolveEntityValue(stmt.entity, scope),
          place: this.resolvePlace(stmt.place, scope),
          stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope),
          span: stmt.span,
        };
      case 'act':
        return this.resolveActStatement(stmt, scope);
      case 'award': {
        // ADR-261 D4: `award` is gated with `score` and `ranks`.
        if (!this.usedExtensions.has('scoring')) {
          this.reportScoringGate('award', stmt.span);
        }
        // `award <score-name>` resolves owner-first (ratchet D12): the
        // enclosing owner's qualified id, then the story-level bare name.
        let expression = stmt.expression;
        if (stmt.expression.length === 1 && !stmt.expression[0].includes("'")) {
          const name = stmt.expression[0];
          const qualified = scope.scoreOwner ? `${scope.scoreOwner}.${name}` : null;
          if (qualified && this.scoreNames.has(qualified)) {
            expression = [qualified];
          } else if (!this.scoreNames.has(name) && this.scoreNames.size > 0) {
            this.diagnostics.error(
              'analysis.unknown-score',
              `\`${name}\` is not a declared score of this owner or the story${this.suggestText(name, [...this.scoreNames.keys()].map((k) => k.split('.').pop()!))}.`,
              stmt.span,
            );
          }
        }
        return { kind: 'award', expression, once: stmt.once, stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
      }
      case 'timer-verb': {
        // ADR-325 D3c: the five timer verbs. A tally is not a timer.
        const timer = this.resolveTimerRef(stmt.target, scope, stmt.span, stmt.verb);
        return { kind: 'timer', verb: stmt.verb, timer: timer ?? '', stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
      }
      case 'raise':
      case 'lower': {
        // ADR-264 D2: resolve the target — a bare name (story-global) or a
        // possessive (per-entity), validated against the counter registries.
        const target = stmt.target;
        // ADR-325 D3: a timer never takes a number.
        if (this.timerKeyOf(target, scope) !== null) {
          this.diagnostics.error(
            'analysis.tally-verb-on-timer',
            `\`${stmt.kind}\` moves a tally, not a timer — a timer is \`start\`ed, \`stop\`ped, \`restart\`ed, \`reset\`, or \`interrupt\`ed, never counted.`,
            stmt.span,
          );
        }
        let counter = '';
        let owner: IRValue | null = null;
        let ownerId: string | null = null;
        if (target.kind === 'possessive') {
          counter = target.field.join(' ');
          owner = this.possessiveBase(target, scope);
          if (owner.kind === 'entity') ownerId = owner.id;
          else if (owner.kind === 'it') ownerId = scope.owner?.id ?? null;
        } else if (target.kind === 'ref') {
          counter = target.ref.words.join(' ');
        } else if (target.kind === 'bare') {
          counter = target.words.join(' ');
        }
        if (owner === null) {
          if (!this.storyCounterNames.has(counter)) {
            this.diagnostics.error(
              'analysis.unknown-counter',
              `\`${counter}\` is not a declared counter${this.suggestText(counter, [...this.storyCounterNames])}.`,
              stmt.span,
            );
          }
        } else if (ownerId !== null) {
          const set = this.entityCounterNames.get(ownerId);
          if (!set || !set.has(counter)) {
            this.diagnostics.error('analysis.unknown-counter', `\`${counter}\` is not a counter of \`${ownerId}\`.`, stmt.span);
          }
        }
        return { kind: stmt.kind, counter, owner, amount: stmt.amount, stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
      }
      case 'win':
      case 'lose':
      case 'kill': {
        if (stmt.phraseKey) this.requirePhrase(stmt.phraseKey, stmt.span, scope.owner);
        const phraseKey = stmt.kind === 'kill' && stmt.inlineText ? inlineKillKey(stmt) : stmt.phraseKey;
        return { kind: stmt.kind, phraseKey, stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
      }
      case 'must': {
        // `<subject> must <predicate>: <key>` (ratchet D6) — a positive
        // requirement; compiled as its predicate condition plus the key.
        this.requirePhrase(stmt.phraseKey, stmt.span, scope.owner);
        return {
          kind: 'must',
          condition: this.resolveCondition({ kind: 'predicate', subject: stmt.subject, predicate: stmt.predicate, span: stmt.span }, scope),
          phraseKey: stmt.phraseKey,
          span: stmt.span,
        };
      }
      case 'refuse-when': {
        // Prohibition (D6): refuse with the key while the hazard holds.
        this.checkRefusalPolarity(stmt.condition, stmt.span);
        this.requirePhrase(stmt.phraseKey, stmt.span, scope.owner);
        return {
          kind: 'refuse-when',
          condition: this.resolveCondition(stmt.condition, scope),
          phraseKey: stmt.phraseKey,
          span: stmt.span,
        };
      }
      case 'media':
        return this.lowerMediaStatement(stmt, scope);
      case 'then-open':
        // ADR-320 D4/D8: the word is data (a chat client may render an
        // invitation differently); same-owner existence is
        // checkConversationTargets' gate, after every exchange has folded.
        return { kind: 'then-open', word: stmt.word, exchange: stmt.exchange, span: stmt.span };
      case 'deflect': {
        // ADR-320 D8: entity tier resolves here; membership in the
        // owner's own topic table is checkConversationTargets' gate. An
        // unresolved entity lowers to the empty-text marker — the miss is
        // already reported, and the target check skips it.
        if (stmt.target.kind === 'entity') {
          const id = this.resolveEntityId(stmt.target.ref);
          if (!id) return { kind: 'deflect', target: { kind: 'text', primary: '' }, span: stmt.span };
          return { kind: 'deflect', target: { kind: 'entity', id }, span: stmt.span };
        }
        return { kind: 'deflect', target: { kind: 'text', primary: stmt.target.text }, span: stmt.span };
      }
      case 'leave':
        return { kind: 'leave', span: stmt.span };
      case 'hold-tongue':
        return { kind: 'hold-tongue', span: stmt.span };
      case 'select-on': {
        const subject = this.resolveValue(stmt.subject, scope);
        const stateOwner = this.stateOwnerOf(subject, scope);
        // Trait scope: `select on its state` validates against the visible
        // state set (own + cross-trait, D8) with no concrete owner entity.
        const traitStates =
          !stateOwner && subject.kind === 'field' && subject.field === 'state' && subject.base.kind === 'it'
            ? scope.ownStates
            : null;
        const fieldValues = this.fieldValueSet(subject, scope);
        for (const arm of stmt.arms) {
          if (stateOwner && !stateOwner.states.includes(arm.value)) {
            this.diagnostics.error(
              'analysis.undeclared-state',
              `\`${arm.value}\` is not a declared state of ${stateOwner.nameLower}${this.suggestText(arm.value, stateOwner.states)}.`,
              arm.span,
            );
          } else if (traitStates && !traitStates.includes(arm.value)) {
            this.diagnostics.error(
              'analysis.undeclared-state',
              `\`${arm.value}\` is not a declared state of \`it\` here${this.suggestText(arm.value, traitStates)}.`,
              arm.span,
            );
          } else if (fieldValues && !fieldValues.includes(arm.value)) {
            this.diagnostics.error(
              'analysis.unknown-value',
              `\`${arm.value}\` is not a value of this field${this.suggestText(arm.value, fieldValues)}.`,
              arm.span,
            );
          }
        }
        return {
          kind: 'select-on',
          subject,
          arms: stmt.arms.map((a, armIndex) => ({
            value: a.value,
            body: a.body.map((s, i) => this.resolveStatement(s, scope, `${path}.${armIndex}.${i}`)),
            span: a.span,
          })),
          span: stmt.span,
        };
      }
      case 'select-strategy':
        // ADR-289 D2: the compiler assigns the stable id that keys this
        // select's persisted occurrence counter. Line numbers are NOT
        // identity — `import` splices fragments that keep their own, and a
        // select in a trait clause is shared by every composing entity.
        return {
          kind: 'select-strategy',
          id: path,
          strategy: stmt.strategy,
          alternatives: stmt.alternatives.map((alt, altIndex) =>
            alt.map((s, i) => this.resolveStatement(s, scope, `${path}.${altIndex}.${i}`)),
          ),
          span: stmt.span,
        };
      case 'ordinal':
        return {
          kind: 'ordinal',
          ordinal: stmt.ordinal,
          body: stmt.body.map((s, i) => this.resolveStatement(s, scope, `${path}.${i}`)),
          span: stmt.span,
        };
      case 'each': {
        // E3 (ratchet 2026-07-12): body-position iteration over a named
        // OPEN condition — the same never-guess gate as `any`/`no`. The
        // body resolves with the binder in scope; `it` keeps meaning the
        // clause owner (no shadowing), so the scope is otherwise unchanged.
        this.requireOpenCondition(stmt.condition, stmt.span, 'each');
        const eachScope: Scope = { ...scope, inEach: true };
        return {
          kind: 'each',
          condition: stmt.condition,
          body: stmt.body.map((s, i) => this.resolveStatement(s, eachScope, `${path}.${i}`)),
          span: stmt.span,
        };
      }
    }
  }

  /** Resolve a statement `when` suffix (ratchet D7), or null. */
  // ------------------------------------------------- acting statements (ADR-329)

  /** Bodies where a character may act (ADR-329 D3): reactions and the turn's own clock. */
  private static readonly ACT_BODIES = new Set(['after', 'when', 'every-turn', 'timer', 'topics', 'exchange', 'initiative', 'conversation']);

  /**
   * `<actor> <verb> …` (ADR-329 D1–D3). Split the actor from the verb by the
   * longest name prefix that names an entity, match the rest against the
   * story's and the manifest's grammar shapes on the verb's lemma, resolve
   * each slot as a name, and gate the body. Every failure is a named
   * diagnostic; nothing is guessed.
   */
  private resolveActStatement(stmt: ActStmt, scope: Scope): IRStatement {
    const line = stmt.words.map((w) => w.text).join(' ');
    const stmtWhen = this.resolveStmtWhen(stmt.stmtWhen, scope);
    const dead: IRStatement = { kind: 'phrase', phraseKey: '', params: [], stmtWhen, span: stmt.span };

    if (!Analyzer.ACT_BODIES.has(stmt.bodyKind)) {
      const where = stmt.bodyKind === 'on'
        ? 'an `on` clause is deciding whether the triggering action happens, and cannot perform another'
        : stmt.bodyKind === 'before'
          ? 'nothing acts before the game starts'
          : `a \`${stmt.bodyKind}\` body is not a place where a character acts`;
      this.diagnostics.error(
        'analysis.act-in-intercept',
        `\`${line}\` — ${where}. A character acts in a reaction: move this line to an \`after\` clause, a \`when\` clause, \`on every turn\`, or a conversation row.`,
        stmt.span,
      );
      return dead;
    }

    const words = stmt.words;
    const lowerOf = (w: { text: string }) => w.text.toLowerCase();
    const spanOfRange = (from: number, to: number): Span => actWordsSpan(words, from, to);
    const nameRefOf = (from: number, to: number): NameRef => actWordsNameRef(words, from, to);

    // The actor: the longest prefix naming an entity wins; `the player` is
    // remembered so the refusal can name the rule it hit.
    let actor: EntitySymbol | null = null;
    let actorEnd = 0;
    let playerPrefix = false;
    for (let k = words.length - 1; k >= 1; k--) {
      const ref = nameRefOf(0, k);
      const joined = ref.words.join(' ').toLowerCase();
      if (ref.words.length === 1 && PLAYER_WORDS.has(joined)) { playerPrefix = true; continue; }
      const sym = this.findEntitySilent(ref);
      if (sym) { actor = sym; actorEnd = k; break; }
    }
    if (!actor) {
      if (playerPrefix) {
        // ADR-329 D1 (Q-3): the player is never made to act — a forced player
        // action would be a second spelling for the `move` eject scene and
        // breaks one-command-one-action.
        this.diagnostics.error(
          'analysis.act-player-actor',
          `\`${line}\` — the player cannot be made to act; an acting statement names a character. Write the character's own name, or use \`move\` for an authorial change.`,
          stmt.span,
        );
        return dead;
      }
      const people = this.entities.filter((e) => isActorSymbol(e)).map((e) => e.nameLower);
      this.diagnostics.error(
        'analysis.act-actor',
        `\`${line}\` — no character named here acts; an acting statement begins with a character's name (\`a person\`)${this.suggestText(lowerOf(words[0]) === 'the' && words.length > 1 ? lowerOf(words[1]) : lowerOf(words[0]), people)}.`,
        stmt.span,
      );
      return dead;
    }
    if (!isActorSymbol(actor)) {
      this.diagnostics.error(
        'analysis.act-actor',
        `\`${line}\` — \`${entityDisplayName(actor)}\` cannot act; an acting statement names a character (\`a person\`).`,
        spanOfRange(0, actorEnd),
      );
      return dead;
    }

    // The verb and its slots, against every shape the story and the manifest know.
    const rest = words.slice(actorEnd);
    const match = this.matchActShape(rest.map((w) => w.text));
    if (!match) {
      const verb = lowerOf(rest[0]);
      const shapesOfVerb = this.shapesOpenedBy(verb);
      if (shapesOfVerb.length === 0) {
        const verbs = [...new Set([...this.allActShapes().values()].flat().map((sh) => sh.split(' ')[0]).filter((v) => !v.startsWith(':')))];
        this.diagnostics.error(
          'analysis.act-unknown-verb',
          `\`${line}\` — \`${rest[0].text}\` is not an action's word; an acting statement uses an action's own grammar (\`take the sword\`, \`give the necklace to the player\`)${this.suggestText(verb, verbs)}.`,
          spanOfRange(actorEnd, words.length),
        );
      } else {
        this.diagnostics.error(
          'analysis.act-slot-shape',
          `\`${line}\` — \`${rest.map((w) => w.text).join(' ')}\` matches none of the shapes \`${rest[0].text}\` opens: ${shapesOfVerb.map((sh) => `\`${sh}\``).join(', ')}.`,
          spanOfRange(actorEnd, words.length),
        );
      }
      return dead;
    }

    const slots: Array<{ slot: string; value: IRValue }> = [];
    for (const bound of match.slots) {
      const ref = nameRefOf(actorEnd + bound.from, actorEnd + bound.to);
      slots.push({ slot: bound.slot, value: this.resolveEntityValue(ref, scope) });
    }
    if (match.direction) {
      slots.push({ slot: 'direction', value: { kind: 'literal', value: match.direction, valueType: 'string' } });
    }
    return {
      kind: 'act',
      actor: { kind: 'entity', id: actor.id },
      action: match.action,
      shape: match.shape,
      slots,
      stmtWhen,
      span: stmt.span,
    };
  }

  /**
   * ADR-329 D10: a goal line in an action's own words, the block's owner
   * implied as the actor. The words match the story's and the manifest's
   * shapes exactly as an acting statement's do (D2); each slot resolves as a
   * step ref (`the player` is the sentinel id, as `give … to the player`
   * already resolves it). A manifest `taking`, `giving`, or `dropping` match
   * folds onto the step kind that already carries its planning half —
   * `acquire`, `give`, `drop` — so the tick behaves exactly as it did for
   * those words; anything else is a `perform` step, its slots sorted into the
   * execution entry's roles: a story action's `is an instrument` slot is the
   * instrument, the rest fill direct then indirect object in shape order, and
   * a `going` shape's literal is the direction.
   *
   * @returns the lowered step, or null after a reported diagnostic
   */
  private lowerPerformStep(step: Extract<GoalStepDecl, { kind: 'perform' }>): IRGoalStep | null {
    const words = step.words;
    const line = words.map((w) => w.text).join(' ');
    const match = this.matchActShape(words.map((w) => w.text));
    if (!match) {
      const verb = words[0].text.toLowerCase();
      const shapesOfVerb = this.shapesOpenedBy(verb);
      if (shapesOfVerb.length === 0) {
        // The parser admitted the first word by lemma against the same
        // lexicon, so this branch is unreachable in practice; the named
        // error stays so a drift between the two tests is loud, not silent.
        this.diagnostics.error(
          'analysis.act-unknown-verb',
          `\`${line}\` — \`${words[0].text}\` is not an action's word; a goal step in an action's own words uses its grammar (\`open the door\`, \`go east\`).`,
          step.span,
        );
      } else {
        this.diagnostics.error(
          'analysis.act-slot-shape',
          `\`${line}\` matches none of the shapes \`${words[0].text}\` opens: ${shapesOfVerb.map((sh) => `\`${sh}\``).join(', ')}.`,
          step.span,
        );
      }
      return null;
    }

    const bound: Array<{ slot: string; id: string }> = [];
    for (const b of match.slots) {
      const id = this.resolveEntityId(actWordsNameRef(words, b.from, b.to));
      if (id === null) return null;
      bound.push({ slot: b.slot, id });
    }

    // The fold: the standard verbs keep their planning half. A story action
    // of the same name shadows the standard one (matchActShape) and is
    // performed as itself.
    if (!this.storyActShapes().has(match.action)) {
      if (match.action === 'taking' && bound.length === 1) {
        return { kind: 'acquire', target: bound[0].id, span: step.span };
      }
      if (match.action === 'giving' && bound.length === 2) {
        const item = bound.find((b) => b.slot === 'item');
        const recipient = bound.find((b) => b.slot === 'recipient');
        if (item && recipient) return { kind: 'give', item: item.id, target: recipient.id, span: step.span };
      }
      if (match.action === 'dropping' && bound.length === 1) {
        return { kind: 'drop', item: bound[0].id, span: step.span };
      }
    }

    const instrumentSlots = new Set<string>();
    for (const decl of this.ast.declarations) {
      if ((decl.kind === 'define-action' || decl.kind === 'extend-action') && decl.name === match.action) {
        for (const st of decl.slotTypes) if (st.type === 'instrument') instrumentSlots.add(st.slot);
      }
    }
    const slots: IRPerformSlots = {};
    for (const b of bound) {
      if (instrumentSlots.has(b.slot)) slots.instrument = b.id;
      else if (slots.directObject === undefined) slots.directObject = b.id;
      else slots.indirectObject = b.id;
    }
    if (match.direction !== null) slots.direction = match.direction;
    return { kind: 'perform', action: match.action, shape: match.shape, slots, span: step.span };
  }

  /**
   * The story's own shapes (`define action` patterns, `extend action`
   * additions) by action name, rendered like the manifest's. Optional parts
   * expand to both readings; `a|b` alternatives to each.
   */
  private storyActShapes(): Map<string, string[]> {
    if (this.actShapes) return this.actShapes;
    const out = new Map<string, string[]>();
    const add = (name: string, patterns: ActionPattern[]) => {
      const list = out.get(name) ?? [];
      for (const pattern of patterns) list.push(...expandPatternShapes(pattern));
      out.set(name, list);
    };
    for (const decl of this.ast.declarations) {
      if (decl.kind === 'define-action') add(decl.name, decl.patterns);
      else if (decl.kind === 'extend-action') add(decl.name, decl.patterns);
    }
    this.actShapes = out;
    return out;
  }

  /** Story shapes first (a story action of a standard name shadows it), then the manifest's. */
  private allActShapes(): Map<string, string[]> {
    const out = new Map<string, string[]>(this.storyActShapes());
    const manifest = STDLIB_MANIFEST.locales['en-US'].grammarShapes;
    for (const [id, shapes] of Object.entries(manifest)) {
      const name = id.slice('if.action.'.length);
      out.set(name, [...(out.get(name) ?? []), ...shapes]);
    }
    return out;
  }

  private shapesOpenedBy(verb: string): string[] {
    const lemmas = verbLemmas(verb);
    const out: string[] = [];
    for (const shapes of this.allActShapes().values()) {
      for (const sh of shapes) {
        const first = sh.split(' ')[0];
        if (!first.startsWith(':') && lemmas.has(first)) out.push(sh);
      }
    }
    return out;
  }

  /**
   * Match the words after the actor against every known shape: the first
   * literal by lemma, later literals exactly, each slot consuming at least one
   * word up to the next literal. Story actions win over standard ones; among
   * the rest the shape with the most literal words wins (`take the cap off`
   * is `taking_off`, not `taking`). A `going` shape with no slot yields its
   * direction word.
   */
  private matchActShape(rest: string[]): { action: string; shape: string; slots: Array<{ slot: string; from: number; to: number }>; direction: string | null } | null {
    if (rest.length === 0) return null;
    const lower = rest.map((w) => w.toLowerCase());
    const story = this.storyActShapes();
    let best: { action: string; shape: string; slots: Array<{ slot: string; from: number; to: number }>; literals: number; isStory: boolean } | null = null;
    for (const [action, shapes] of this.allActShapes()) {
      const isStory = story.has(action);
      for (const shape of shapes) {
        const slots = matchShapeWords(lower, shape.split(' '));
        if (!slots) continue;
        const literals = shape.split(' ').filter((pt) => !pt.startsWith(':')).length;
        if (!best || (isStory && !best.isStory) || (isStory === best.isStory && literals > best.literals)) {
          best = { action, shape, slots, literals, isStory };
        }
      }
    }
    if (!best) return null;
    const parts = best.shape.split(' ');
    const written = best.action === 'going' && best.slots.length === 0 && parts.length >= 1 ? parts[parts.length - 1] : null;
    const direction = written === null ? null : (ACT_DIRECTION_CANONICAL[written] ?? written);
    return { action: best.action, shape: best.shape, slots: best.slots, direction };
  }

  private resolveStmtWhen(cond: ConditionNode | null, scope: Scope): IRCondition | null {
    return cond ? this.resolveCondition(cond, scope) : null;
  }

  /**
   * D6 polarity gate: `refuse when` states a hazard that is PRESENT — a
   * top-level `not` inverts a requirement, and requirements have one
   * canonical form (`must`).
   */
  private checkRefusalPolarity(cond: ConditionNode, span: Span): void {
    if (cond.kind === 'not') {
      this.diagnostics.error(
        'analysis.negated-requirement',
        'State requirements positively — `refuse when not …` is not a form. Write `<subject> must <predicate>: <phrase-key>` for the requirement; `refuse when` is for hazards that are present.',
        span,
      );
    }
  }

  /** The entity whose `states:` list governs a select-on subject, if determinable. */
  private stateOwnerOf(subject: IRValue, scope: Scope): EntitySymbol | null {
    if (subject.kind === 'field' && subject.field === 'state') {
      if (subject.base.kind === 'it') return scope.owner;
      if (subject.base.kind === 'entity') return this.byId.get(subject.base.id) ?? null;
    }
    return null;
  }

  // ------------------------------------------------------------- values

  private resolveValue(expr: ValueExpr, scope: Scope): IRValue {
    switch (expr.kind) {
      case 'literal':
        return { kind: 'literal', value: expr.value, valueType: expr.literalKind };
      case 'possessive': {
        // ADR-264 D3: `<owner>'s <counter>` / `its <counter>` reads a per-entity
        // counter when the field names one; otherwise it is a trait field.
        // ADR-325 D3d: `<owner>'s <timer>` reads the timer's state word.
        const field = expr.field.join(' ');
        const base = this.possessiveBase(expr, scope);
        let ownerId: string | null = null;
        if (base.kind === 'entity') ownerId = base.id;
        else if (base.kind === 'player') ownerId = 'player';
        else if (base.kind === 'it') ownerId = scope.owner?.id ?? null;
        if (ownerId !== null && this.entityCounterNames.get(ownerId)?.has(field)) {
          return { kind: 'counter', name: field, owner: base };
        }
        if (ownerId !== null && this.timers.has(`${ownerId}.${field}`)) {
          return { kind: 'timer', timer: `${ownerId}.${field}` };
        }
        return { kind: 'field', base, field };
      }
      case 'ref': {
        // ADR-264 D3: a bare name that is a story-global counter reads it.
        if (expr.ref.kind === 'name' && expr.ref.words.length === 1 && this.storyCounterNames.has(expr.ref.words[0])) {
          return { kind: 'counter', name: expr.ref.words[0], owner: null };
        }
        // ADR-325 D3d: a bare timer name, owner-first then story.
        const timer = this.timerKeyOf(expr, scope);
        if (timer !== null) return { kind: 'timer', timer };
        return this.resolveRefValue(expr.ref, scope);
      }
      case 'bare': {
        const scoped = this.resolveScopedWords(expr.words, scope, expr.span);
        return scoped ?? { kind: 'symbol', name: expr.words.join(' ') };
      }
      case 'match':
        return this.resolveMatch(expr.span, scope);
    }
  }

  /**
   * Lower one media sugar statement (ADR-216) onto a payloaded `media-*`
   * emit — pure compile-time sugar, no runtime surface of its own. The IR
   * event id is the dotless Chord form (ADR-254/256); `@sharpee/story-loader`
   * translates it to the platform's dotted `media.*` id at the emit seam.
   * Asset references are typo-checked with a nearest-match suggestion; kind
   * mismatches gate (`play ambient` plays SOUND assets — an ambient loop
   * is a sound file).
   */
  private lowerMediaStatement(stmt: MediaStmt, scope: Scope): IRStatement {
    const stmtWhen = this.resolveStmtWhen(stmt.stmtWhen, scope);
    const fields: IREmitField[] = [];
    let event = '';
    const requireAsset = (expected: 'sound' | 'image' | 'music'): void => {
      if (!stmt.asset) return; // the parser already reported
      const found = this.assets.get(stmt.asset);
      if (!found) {
        this.diagnostics.error(
          'analysis.unknown-asset',
          `\`${stmt.asset}\` names no declared asset${this.suggestText(stmt.asset, [...this.assets.keys()])}. Declare it: \`define ${expected} ${stmt.asset} from "<file>"\`.`,
          stmt.span,
        );
        return;
      }
      if (found.kind !== expected) {
        this.diagnostics.error(
          'analysis.asset-kind',
          `\`${stmt.asset}\` is a ${found.kind} asset — this statement needs a ${expected} asset.`,
          stmt.span,
        );
        return;
      }
      fields.push({ key: 'src', value: { kind: 'literal', value: found.path, valueType: 'string' } });
    };
    switch (stmt.form) {
      case 'play-sound':
        event = 'media-sound-play';
        requireAsset('sound');
        break;
      case 'play-music':
        event = 'media-music-play';
        requireAsset('music');
        if (stmt.looping) fields.push({ key: 'loop', value: { kind: 'value', value: { kind: 'symbol', name: 'true' } } });
        break;
      case 'stop-music':
        event = 'media-music-stop';
        break;
      case 'play-ambient':
        event = 'media-ambient-play';
        requireAsset('sound');
        this.stampAmbientChannel(stmt, fields);
        break;
      case 'stop-ambient':
        event = 'media-ambient-stop';
        this.stampAmbientChannel(stmt, fields);
        break;
      case 'show-image':
        event = 'media-image-show';
        requireAsset('image');
        if (stmt.layer) {
          // ADR-241 D3: layers beyond the platform's pre-registered three
          // must be declared (`define layer <word>`) — never-guess.
          if (!IMPLIED_IMAGE_LAYERS.has(stmt.layer) && !this.familyChannels.layer.has(stmt.layer)) {
            this.diagnostics.error(
              'analysis.unknown-channel',
              `\`${stmt.layer}\` names no declared image layer${this.suggestText(stmt.layer, [...IMPLIED_IMAGE_LAYERS, ...this.familyChannels.layer.keys()])}. Declare it: \`define layer ${stmt.layer}\`.`,
              stmt.span,
            );
          }
          fields.push({ key: 'layer', value: { kind: 'literal', value: stmt.layer, valueType: 'string' } });
        }
        break;
      case 'hide-image':
        event = 'media-image-hide';
        break;
      case 'transition':
        event = 'media-transition';
        fields.push({ key: 'kind', value: { kind: 'literal', value: stmt.transitionKind ?? '', valueType: 'string' } });
        break;
      case 'clear':
        event = 'media-clear';
        break;
    }
    return { kind: 'emit', event, ...(fields.length > 0 ? { payload: fields } : {}), stmtWhen, span: stmt.span };
  }

  /**
   * ADR-241 D3: resolve an ambient statement's channel word (the default
   * bed is `main` — Q-1), gate undeclared words (never-guess — Q-3), and
   * stamp `channel` onto the payload — the field stdlib's ambient
   * channels filter on. A bare use of the implied `main` bed records its
   * first use-site so the bed joins the channel manifest (D4).
   */
  private stampAmbientChannel(stmt: MediaStmt, fields: IREmitField[]): void {
    const word = stmt.channel ?? 'main';
    if (word === 'main') {
      if (!this.familyChannels.ambient.has('main')) this.impliedMainBedSpan ??= stmt.span;
    } else if (!this.familyChannels.ambient.has(word)) {
      this.diagnostics.error(
        'analysis.unknown-channel',
        `\`${word}\` names no declared ambient bed${this.suggestText(word, ['main', ...this.familyChannels.ambient.keys()])}. Declare it: \`define ambient ${word}\`.`,
        stmt.span,
      );
    }
    fields.push({ key: 'channel', value: { kind: 'literal', value: word, valueType: 'string' } });
  }

  /** Channel names seen (duplicate gate). */
  private readonly channelNames = new Set<string>();

  /** Declared family channels (ADR-241 D2) by family: word → first declaration span. */
  private readonly familyChannels = {
    ambient: new Map<string, Span>(),
    layer: new Map<string, Span>(),
  };

  /** First use-site of the implied `main` ambient bed (ADR-241 D3), if any. */
  private impliedMainBedSpan: Span | null = null;

  /**
   * Build one `define channel` (ADR-216; spelling A): mode/from/take are
   * required, `gated by` must name a client capability flag (Chord
   * spelling, lowered to the platform's camelCase key). Re-declaring a
   * STANDARD channel id is legal platform behavior (story override);
   * duplicating a story channel is not.
   */
  private buildChannel(decl: DefineChannel): IRDataChannelDef {
    this.registerUnique('channel', decl.name, decl.span, 'analysis.duplicate-channel');
    this.channelNames.add(decl.name);
    if (decl.mode === null || !['replace', 'append', 'event'].includes(decl.mode)) {
      this.diagnostics.error(
        'analysis.channel-mode',
        `Channel \`${decl.name}\` needs \`mode replace\`, \`mode append\`, or \`mode event\`${decl.mode ? ` — got \`${decl.mode}\`` : ''}.`,
        decl.span,
      );
    }
    if (decl.returns === null || decl.fromEvent === null) {
      this.diagnostics.error(
        'analysis.channel-return',
        `Channel \`${decl.name}\` needs a \`return <field | "text" | phrase <key> | record> from <event>\` line.`,
        decl.span,
      );
    }
    let gatedBy: string | null = null;
    if (decl.gatedBy !== null) {
      if (!CLIENT_CAPABILITY_FLAGS.has(decl.gatedBy)) {
        this.diagnostics.error(
          'analysis.unknown-capability',
          `\`${decl.gatedBy}\` is not a client capability flag${this.suggestText(decl.gatedBy, [...CLIENT_CAPABILITY_FLAGS])}.`,
          decl.span,
        );
      } else {
        gatedBy = capabilityKeyOf(decl.gatedBy);
      }
    }
    return {
      name: decl.name,
      family: 'data',
      mode: (decl.mode ?? 'event') as IRDataChannelDef['mode'],
      gatedBy,
      fromEvent: decl.fromEvent ?? '',
      returns: this.lowerChannelReturn(decl.returns, decl),
      span: decl.span,
    };
  }

  /**
   * Lower a parsed channel return to IR (ADR-253 D1; ADR-300 D10 for
   * records).
   *
   * A record's members are validated here rather than in the parser: an
   * empty record, a duplicate member name, and a member whose construct
   * failed to parse are all analysis gates. Members that did not parse are
   * dropped after being reported, so the IR never carries a null construct
   * and the loader needs no defensive branch.
   */
  private lowerChannelReturn(
    returns: ChannelReturn | null,
    decl: DefineChannel,
  ): IRChannelReturn {
    if (returns === null) return { kind: 'field', field: '' };
    if (returns.kind !== 'record') return returns;

    const members: IRChannelRecordMember[] = [];
    const seen = new Set<string>();
    for (const member of returns.members) {
      if (seen.has(member.name)) {
        this.diagnostics.error(
          'analysis.channel-record-duplicate',
          `Channel \`${decl.name}\` already has a \`${member.name}\` member.`,
          member.span,
        );
        continue;
      }
      seen.add(member.name);
      // A null construct was already reported by the parser; dropping it here
      // keeps one error per bad line instead of two.
      if (member.value === null || member.value.kind === 'record') continue;
      members.push({ name: member.name, list: member.list, value: member.value });
    }
    if (members.length === 0) {
      this.diagnostics.error(
        'analysis.channel-record-empty',
        `Channel \`${decl.name}\` returns a \`record\` with no members — give it at least one \`<name> <construct>\` line, or return the construct directly.`,
        decl.span,
      );
    }
    return { kind: 'record', members };
  }

  /**
   * ADR-253 D1 field check: a channel returning a `field` (or a `text` template
   * with `(slot)` names) references event payload fields; error when the named
   * event emits a payload that lacks one. Runs as a post-pass so every `emit`
   * is collected first, regardless of declaration order. An event with no
   * collected payload (platform events, or one never emitted here) is skipped —
   * its field set is unknown, not empty. `phrase` returns own their slots
   * (the phrase system), so they are not cross-checked here.
   */
  private checkChannelReturns(channels: IRChannelDef[]): void {
    for (const ch of channels) {
      if (ch.family !== 'data') continue;
      const emitted = this.emitFields.get(ch.fromEvent);
      if (!emitted) continue; // unknown field set — cannot check
      const required: string[] = channelReturnFields(ch.returns);
      for (const field of required) {
        if (!emitted.has(field)) {
          this.diagnostics.error(
            'analysis.channel-return-field',
            `Channel \`${ch.name}\` returns \`${field}\`, but the \`${ch.fromEvent}\` event carries no such field (it emits: ${[...emitted].join(', ') || '(none)'}).`,
            ch.span,
          );
        }
      }
    }
  }

  /**
   * `define pronouns` (ADR-242 D7): exactly the five case rows the
   * assembler's pronoun table keys — a missing or duplicate row is an
   * error (order is free; named rows, ruled Q-1). Forms pass through as
   * data; the language provider owns rendering them.
   */
  private buildPronounSet(decl: DefinePronouns): IRPronounSetDef {
    const byCase = new Map<string, string>();
    for (const row of decl.rows) {
      if (byCase.has(row.case)) {
        this.diagnostics.error('analysis.pronoun-set-duplicate-row', `\`define pronouns ${decl.name}\` already has a \`${row.case}\` row.`, row.span);
        continue;
      }
      byCase.set(row.case, row.form);
    }
    for (const c of PRONOUN_CASES) {
      if (!byCase.has(c)) {
        this.diagnostics.error('analysis.pronoun-set-rows', `\`define pronouns ${decl.name}\` is missing its \`${c}\` row — all five case rows are required.`, decl.span);
      }
    }
    return {
      name: decl.name,
      forms: {
        subject: byCase.get('subject') ?? '',
        object: byCase.get('object') ?? '',
        possessive: byCase.get('possessive') ?? '',
        possessivePronoun: byCase.get('possessive-pronoun') ?? '',
        reflexive: byCase.get('reflexive') ?? '',
      },
      span: decl.span,
    };
  }

  /** Resolve one emit-payload field (ADR-216) — key words join with a space, passed verbatim. */
  private resolveEmitField(field: EmitField, scope: Scope): IREmitField {
    return { key: field.key.join(' '), value: this.resolveEmitValue(field.value, scope) };
  }

  /** Resolve one emit-payload value (ADR-216) — recursive over arrays/objects. */
  private resolveEmitValue(value: EmitValue, scope: Scope): IREmitValue {
    switch (value.kind) {
      case 'literal':
        return { kind: 'literal', value: value.value, valueType: value.literalKind };
      case 'expr':
        return { kind: 'value', value: this.resolveValue(value.expr, scope) };
      case 'array':
        return { kind: 'array', items: value.items.map((i) => this.resolveEmitValue(i, scope)) };
      case 'object':
        return { kind: 'object', fields: value.fields.map((f) => this.resolveEmitField(f, scope)) };
    }
  }

  /**
   * `it` in a story-owned clause (ADR-236 D7): the story is the owner and
   * has no entity referent — the unbound-referent case no other clause
   * home can produce. A load error, never a silent undefined.
   */
  private reportStoryClauseIt(span: Span): void {
    this.diagnostics.error(
      'analysis.story-clause-it',
      '`it` is not bound in a story-owned clause — the story has no entity referent. Name the entity, or use `the player`.',
      span,
    );
  }

  /**
   * `the match` — the `each`-block binder (ratchet E3). Legal only inside
   * an `each` body, at any nesting depth (the runtime binds innermost).
   * Outside one there is no match to reference — a load error, never a
   * guess (`analysis.match-outside-each`).
   */
  private resolveMatch(span: Span, scope: Scope): IRValue {
    if (!scope.inEach) {
      this.diagnostics.error(
        'analysis.match-outside-each',
        '`the match` is the `each`-block binder — outside an `each` body there is no match to reference. Name the entity (or, in a `define trait` body, use `it` for the carrier).',
        span,
      );
    }
    return { kind: 'match' };
  }

  /**
   * Scope-aware resolution of a bare/`the`-led word sequence (Phase B):
   * trait data fields read as `its <field>`; grammar slots and role words
   * are context values; declared flags are flag reads. Null = not scoped.
   */
  private resolveScopedWords(rawWords: string[], scope: Scope, span?: Span): IRValue | null {
    const joined = rawWords.join(' ').toLowerCase();
    if (scope.fields?.has(joined)) {
      return { kind: 'field', base: { kind: 'it' }, field: joined };
    }
    if (rawWords.length === 1) {
      const word = rawWords[0].toLowerCase();
      if (scope.slots?.has(word)) {
        // ADR-267 D2: slot-first resolution is correct and does not change —
        // the silence does. When the slot name also names an entity, the
        // author may have meant the entity; warn, naming both.
        if (span) {
          const shadowed = this.findEntitySilent({ kind: 'name', article: null, words: [word], span });
          if (shadowed) {
            this.diagnostics.warning(
              'analysis.slot-shadows-entity',
              `\`${word}\` is a grammar slot here and also names the entity \`${shadowed.nameLower}\` — the slot wins. Rename the slot, or refer to the entity by its full name.`,
              span,
            );
          }
        }
        return { kind: 'slot', name: word };
      }
      // `the actor` — the acting entity, always bound inside trait/action
      // clauses (design.md §2.2 role vocabulary).
      if (word === 'actor' && (scope.fields !== null || scope.slots !== null)) {
        return { kind: 'slot', name: 'actor' };
      }
    }
    return null;
  }

  /**
   * ADR-327 D2: `it`/`its` outside a carrier scope (trait body, open
   * condition — D8) is the removed spelling. The owner is known statically,
   * so the fix-it names it: `it` → `the gate`, `its lunge` → `the gate's lunge`.
   * Story-owned scope keeps its own unbound-referent gate.
   */
  private reportItRemoved(ref: NameRef, scope: Scope, field: string | null): void {
    // Statement lowering probes some values twice (`counterTargetOf` before
    // the verb resolves its target); one span reports once.
    const key = `${ref.span.line}:${ref.span.column}`;
    if (this.itRemovedSpans.has(key)) return;
    this.itRemovedSpans.add(key);
    const owner = scope.owner ? entityDisplayName(scope.owner) : null;
    const spelled = field ? `its ${field}` : 'it';
    const fix = owner ? `name the owner: \`${field ? `${owner}'s ${field}` : owner}\`` : 'name the entity you mean';
    this.diagnostics.error(
      'analysis.it-removed',
      `\`${spelled}\` is no longer a form outside \`define trait\` — ${fix}.`,
      ref.span,
    );
  }

  /**
   * The base of a possessive (`<owner>'s <field>` / `its <field>`), resolved.
   * `its` is the parser's possessive over a base `it`: ADR-327 D2 reports the
   * possessive spelling once, here (`its lunge` → `Jack's lunge`), and lowers
   * the base to the carrier without re-reporting the bare `it` beneath it.
   * Every site that reads a possessive's owner goes through here.
   */
  private possessiveBase(expr: Extract<ValueExpr, { kind: 'possessive' }>, scope: Scope): IRValue {
    if (expr.base.kind === 'ref' && nameIsIt(expr.base.ref)) {
      if (scope.storyOwned) this.reportStoryClauseIt(expr.base.ref.span);
      else if (!scope.carrierIt) this.reportItRemoved(expr.base.ref, scope, expr.field.join(' '));
      return { kind: 'it' };
    }
    return this.resolveValue(expr.base, scope);
  }

  private resolveRefValue(ref: NameRef, scope: Scope): IRValue {
    const words = ref.words.map((w) => w.toLowerCase());
    if (words.length === 1 && words[0] === 'it') {
      if (scope.storyOwned) this.reportStoryClauseIt(ref.span);
      else if (!scope.carrierIt) this.reportItRemoved(ref, scope, null);
      return { kind: 'it' };
    }
    // `the match` in NameRef positions (`change`/`move` targets, predicate
    // things) resolves to the binder exactly as `it` does — before entity
    // lookup; the name itself is reserved at declaration (E3/P3).
    if (words.length === 1 && words[0] === 'match') return this.resolveMatch(ref.span, scope);
    if (words.length === 1 && PLAYER_WORDS.has(words[0])) return { kind: 'player' };
    // Boolean words are symbols, not entity lookups (`set fed to true`).
    if (words.length === 1 && (words[0] === 'true' || words[0] === 'false')) {
      return { kind: 'symbol', name: words[0] };
    }
    // `its <field>` in name position (`the actor has its food`).
    if (words.length > 1 && words[0] === 'its') {
      if (scope.storyOwned) this.reportStoryClauseIt(ref.span);
      else if (!scope.carrierIt) this.reportItRemoved(ref, scope, words.slice(1).join(' '));
      return { kind: 'field', base: { kind: 'it' }, field: words.slice(1).join(' ') };
    }
    const scoped = this.resolveScopedWords(ref.words, scope, ref.span);
    if (scoped) return scoped;
    const id = this.resolveEntityId(ref);
    if (id !== null) return id === 'player' ? { kind: 'player' } : { kind: 'entity', id };
    return { kind: 'symbol', name: ref.words.join(' ') };
  }

  // ---------------------------------------------------------------- timers

  /**
   * ADR-325 D3a: resolve every `define timer` — owner to an entity id (or
   * `player`, or null for the story), state names unique, state prose into
   * the phrase table under `<qualified>.<state>`, and the `meanwhile` body
   * lowered in the owner's scope (`it` = the owner).
   */
  private buildTimers(): void {
    const decls = this.ast.declarations.filter((d): d is DefineTimer => d.kind === 'define-timer');
    // Register names first so `meanwhile` bodies may name any timer.
    for (const decl of decls) {
      let owner: string | null = null;
      if (decl.owner) {
        const lower = decl.owner.words.join(' ').toLowerCase();
        owner = PLAYER_WORDS.has(lower) ? 'player' : this.resolveEntityId(decl.owner);
        if (owner === null) continue; // unknown owner already reported
      }
      const qualified = owner === null ? decl.name : `${owner}.${decl.name}`;
      if (this.timers.has(qualified)) {
        this.diagnostics.error('analysis.duplicate-timer', `A timer named \`${decl.name}\` is already declared${owner ? ` for \`${owner}\`` : ''}.`, decl.span);
        continue;
      }
      const states: string[] = [];
      for (const st of decl.states) {
        if (states.includes(st.name)) {
          this.diagnostics.error('analysis.duplicate-timer-state', `The timer \`${decl.name}\` already has a turn named \`${st.name}\`.`, st.span);
          continue;
        }
        states.push(st.name);
        if (st.text) {
          this.registerPhrase(DEFAULT_LOCALE, `${qualified}.${st.name}`, { strategy: null, variants: [this.variantOf(st.text)], span: st.span });
        }
      }
      this.timers.set(qualified, { name: decl.name, owner, states, decl });
    }
    for (const [qualified, t] of this.timers) {
      const scope = t.owner === null ? STORY_SCOPE : t.owner === 'player' ? entityScope(this.byId.get('player') ?? null) : entityScope(this.byId.get(t.owner) ?? null);
      const meanwhile = t.decl.meanwhile
        ? { chance: t.decl.meanwhile.chance, body: t.decl.meanwhile.body.map((st, i) => this.resolveStatement(st, scope, `timer.${qualified}.meanwhile.${i}`)) }
        : null;
      this.timerDefs.push({ name: t.name, qualified, owner: t.owner, states: t.states, meanwhile, interrupted: t.decl.interrupted, span: t.decl.span });
    }
  }

  /**
   * Build the chapter table (ADR-330 D1–D3): the `use chapters` gate, name
   * uniqueness, the opening row (exactly one on `the game starts`, and it is
   * the first row), and each trigger resolved — a room for a first visit, a
   * timer's qualified key, an entity or the story with a declared state.
   */
  private buildChapters(): void {
    const decl = this.chapterDecls[0];
    if (!decl) return;
    if (!this.usedExtensions.has('chapters')) {
      this.diagnostics.error(
        'analysis.chapters-needs-use',
        'A `define chapters` block needs `use chapters` in the story header — chapters are an extension, on precisely when the header says so.',
        decl.span,
      );
      return;
    }
    const seen = new Set<string>();
    const openers: number[] = [];
    decl.rows.forEach((row, ordinal) => {
      if (seen.has(row.name)) {
        this.diagnostics.error('analysis.duplicate-chapter', `A chapter named \`${row.name}\` is already declared — names are what conditions say, one each.`, row.span);
        return;
      }
      seen.add(row.name);
      if (!row.trigger) return; // parse.chapter-no-trigger already reported
      const trigger = this.resolveChapterTrigger(row.trigger);
      if (!trigger) return;
      if (trigger.kind === 'game-starts') openers.push(ordinal);
      this.chapterDefs.push({ name: row.name, title: row.title, description: row.description ?? '', ordinal, trigger, span: row.span });
    });
    if (openers.length === 0) {
      this.diagnostics.error(
        'analysis.chapter-no-opening',
        'A story with `use chapters` opens a chapter when the game starts — give the first row `begins when the game starts` (ADR-330 D2).',
        decl.span,
      );
    } else if (openers.length > 1) {
      this.diagnostics.error(
        'analysis.chapter-two-openings',
        'Only one chapter begins when the game starts — this is the second row on that moment.',
        decl.rows[openers[1]].span,
      );
    } else if (openers[0] !== 0) {
      this.diagnostics.error(
        'analysis.chapter-opening-not-first',
        'The chapter that begins when the game starts must be the first row — chapters are in declaration order, and nothing can begin before the opening (ADR-330 D1/D3).',
        decl.rows[openers[0]].span,
      );
    }
  }

  /** Resolve one chapter trigger (ADR-330 D2), or null after reporting. */
  private resolveChapterTrigger(t: ChapterTrigger): IRChapterTrigger | null {
    switch (t.kind) {
      case 'game-starts':
        return { kind: 'game-starts' };
      case 'first-visit': {
        const id = this.resolveEntityId(t.room);
        if (id === null) return null; // already reported
        const sym = this.byId.get(id);
        if (!sym || !sym.decl.compositions.some((k) => k.article !== null && k.words[0]?.toLowerCase() === 'room')) {
          this.diagnostics.error('analysis.chapter-visit-not-room', `\`${t.room.words.join(' ')}\` is not a room — a chapter begins on the first visit to a ROOM.`, t.room.span);
          return null;
        }
        return { kind: 'first-visit', room: id };
      }
      case 'timer-expires': {
        const key = this.timerKeyOf(t.timer, STORY_SCOPE);
        if (key === null) {
          const candidates = [...this.timers.values()].map((x) => (x.owner === null ? x.name : `the ${x.owner}'s ${x.name}`));
          const written = t.timer.kind === 'ref' ? t.timer.ref.words.join(' ') : t.timer.kind === 'bare' ? t.timer.words.join(' ') : t.timer.kind === 'possessive' ? t.timer.field.join(' ') : '<value>';
          this.diagnostics.error('analysis.unknown-timer', `\`${written}\` is not a declared timer of the story${this.suggestText(written, candidates)} — from the chapter table, name an owner's timer by its possessive.`, t.span);
          return null;
        }
        return { kind: 'timer-expires', timer: key };
      }
      case 'becomes': {
        const anchor = this.resolveStepAnchor({ timing: 'becomes', owner: t.owner, state: t.state, span: t.span });
        if (!anchor) return null;
        return { kind: 'becomes', owner: anchor.owner, state: anchor.state };
      }
    }
  }

  /**
   * The timer a value names, or null: a bare name resolves owner-first
   * (the scope's owner, the player inside the player's block) then the
   * story's; a possessive names its owner outright (ADR-325 D3c).
   */
  private timerKeyOf(expr: ValueExpr, scope: Scope): string | null {
    if (expr.kind === 'ref' && expr.ref.words.length === 1) {
      const name = expr.ref.words[0];
      const ownerId = scope.owner?.id ?? null;
      if (ownerId !== null && this.timers.has(`${ownerId}.${name}`)) return `${ownerId}.${name}`;
      if (this.timers.has(name)) return name;
      return null;
    }
    if (expr.kind === 'bare' && expr.words.length === 1) {
      return this.timerKeyOf({ kind: 'ref', ref: { kind: 'name', article: null, words: expr.words, span: expr.span }, span: expr.span }, scope);
    }
    if (expr.kind === 'possessive' && expr.field.length === 1) {
      const base = this.possessiveBase(expr, scope);
      let ownerId: string | null = null;
      if (base.kind === 'entity') ownerId = base.id;
      else if (base.kind === 'player') ownerId = 'player';
      else if (base.kind === 'it') ownerId = scope.owner?.id ?? null;
      if (ownerId === null) return null;
      const key = `${ownerId}.${expr.field[0]}`;
      return this.timers.has(key) ? key : null;
    }
    return null;
  }

  /** Resolve a timer reference for a verb or clause head; errors name the verb. */
  private resolveTimerRef(expr: ValueExpr, scope: Scope, span: Span, verb: string): string | null {
    const key = this.timerKeyOf(expr, scope);
    if (key !== null) return key;
    const written =
      expr.kind === 'ref' ? expr.ref.words.join(' ')
      : expr.kind === 'bare' ? expr.words.join(' ')
      : expr.kind === 'possessive' ? expr.field.join(' ')
      : '<value>';
    // A tally named where a timer is wanted is its own error (D3).
    const ownerCounters = scope.owner ? this.entityCounterNames.get(scope.owner.id) : undefined;
    const isTally =
      ((expr.kind === 'ref' || expr.kind === 'bare') && (this.storyCounterNames.has(written) || ownerCounters?.has(written) === true)) ||
      (expr.kind === 'possessive' && [...this.entityCounterNames.values()].some((set) => set.has(written)));
    if (isTally) {
      this.diagnostics.error(
        'analysis.timer-verb-on-tally',
        `\`${verb}\` acts on a timer, not a tally — \`${written}\` is a counter; it is \`raise\`d, \`lower\`ed, or \`set\`.`,
        span,
      );
      return null;
    }
    // Suggest the reachable spellings: a same-named timer elsewhere is
    // offered by its possessive, never by the bare name that just failed.
    const candidates = [...this.timers.values()].map((t) => (t.owner === null ? t.name : `the ${t.owner}'s ${t.name}`));
    this.diagnostics.error(
      'analysis.unknown-timer',
      `\`${written}\` is not a declared timer${scope.owner ? ` of \`${scope.owner.id}\` or the story` : ''}${this.suggestText(written, candidates)}.`,
      span,
    );
    return null;
  }

  /** `when <timer> expires [, while <cond>]` (ADR-325 D3e) on an owner. */
  private buildTimerClause(clause: TimerClause, scope: Scope, ownerKey: string, index: number): IRTimerClause {
    const timer = this.resolveTimerRef(clause.timer, scope, clause.span, 'when … expires') ?? '';
    const condition = clause.condition ? this.resolveCondition(clause.condition, scope) : null;
    const body = clause.body.map((st, i) => this.resolveStatement(st, scope, `${ownerKey}.expires-${index}.${i}`));
    this.checkPhaseOrder(clause.body, { ended: null });
    return { timer, condition, body, span: clause.span };
  }

  /**
   * `when <entity> moves [, while <cond>]` (ADR-325 D3h): the mover must be
   * an entity or the player — a value of any other shape has no actor.
   * @param ownerKey the owner's IR id (statement-path prefix, ADR-289 D2)
   * @param index position among the owner's move clauses
   */
  private buildMoveClause(clause: MoveClause, scope: Scope, ownerKey: string, index: number): IRMoveClause {
    const mover = this.resolveValue(clause.mover, scope);
    if (mover.kind !== 'entity' && mover.kind !== 'player') {
      this.diagnostics.error(
        'analysis.move-clause-mover',
        '`when <entity> moves` names who moves — an entity or the player.',
        clause.mover.span,
      );
    }
    const condition = clause.condition ? this.resolveCondition(clause.condition, scope) : null;
    const body = clause.body.map((st, i) => this.resolveStatement(st, scope, `${ownerKey}.moves-${index}.${i}`));
    this.checkPhaseOrder(clause.body, { ended: null });
    return { mover, condition, body, span: clause.span };
  }

  /**
   * Lower a place (ADR-325 D1–D2) onto the existing IR value shapes — no new
   * IR kind: `<owner>'s location` is the `location` field read, `here` is
   * that read on the player, `offstage` is the `offstage` symbol the loader
   * treats as "no location".
   */
  /**
   * Is this value a declared counter (ADR-264) — a bare name in the story
   * registry, or `<entity>'s <name>` / `its <name>` in the owner's? Returns
   * the counter name and owner value, or null when it names no counter.
   * Diagnostics-free: a probe for verbs (`set`) that accept other targets.
   */
  private counterTargetOf(target: ValueExpr, scope: Scope): { counter: string; owner: IRValue | null } | null {
    if (target.kind === 'possessive') {
      const counter = target.field.join(' ');
      const owner = this.possessiveBase(target, scope);
      const ownerId = owner.kind === 'entity' ? owner.id : owner.kind === 'it' ? scope.owner?.id ?? null : null;
      if (ownerId !== null && this.entityCounterNames.get(ownerId)?.has(counter)) return { counter, owner };
      return null;
    }
    const counter = target.kind === 'ref' ? target.ref.words.join(' ') : target.kind === 'bare' ? target.words.join(' ') : null;
    if (counter !== null && this.storyCounterNames.has(counter)) return { counter, owner: null };
    return null;
  }

  /** Lower a `landing` line (ADR-325 D5); unresolved rooms are dropped (already reported). */
  private buildLanding(landing: LandingDecl): IRLanding {
    const rooms = landing.rooms.map((r) => this.resolveEntityId(r)).filter((id): id is string => id !== null);
    return { rooms, strategy: landing.strategy, span: landing.span };
  }

  /**
   * ADR-325 D5: a region is a place only once it names a landing. Fires on
   * a region used as a destination or as the owner of `'s location`.
   */
  private checkRegionPlace(value: IRValue, span: Span): void {
    if (value.kind !== 'entity') return;
    const sym = this.byId.get(value.id);
    if (!sym) return;
    const isRegion = sym.decl.compositions.some((c) => c.article && c.words.join(' ').toLowerCase() === 'region');
    if (isRegion && !sym.decl.landing) {
      this.diagnostics.error(
        'analysis.region-not-a-place',
        `\`${sym.decl.name.words.join(' ')}\` is a region with no \`landing\` line — a region is a place only once it says where things put in it land.`,
        span,
      );
    }
  }

  private resolvePlace(place: PlaceExpr, scope: Scope): IRValue {
    switch (place.kind) {
      case 'name': {
        const value = this.resolveEntityValue(place.ref, scope);
        this.checkRegionPlace(value, place.ref.span);
        return value;
      }
      case 'location': {
        const owner = this.resolveValue(place.owner, scope);
        this.checkRegionPlace(owner, place.owner.span);
        return { kind: 'field', base: owner, field: 'location' };
      }
      case 'here':
        return { kind: 'field', base: { kind: 'player' }, field: 'location' };
      case 'offstage':
        return { kind: 'symbol', name: 'offstage' };
      case 'adjacent-room':
        // ADR-326 D1: a computed place — the loader draws it at effect time.
        return { kind: 'symbol', name: 'adjacent-room' };
    }
  }

  private resolveEntityValue(ref: NameRef, scope: Scope): IRValue {
    // `holds nothing` — the empty-contents idiom, not an entity lookup.
    if (ref.words.length === 1 && ref.words[0].toLowerCase() === 'nothing') {
      return { kind: 'symbol', name: 'nothing' };
    }
    const value = this.resolveRefValue(ref, scope);
    return value;
  }

  /**
   * Resolve a name to an entity ID: exact name → exact alias → unique
   * in-order word-subset match. Ambiguity and misses are errors (with
   * rename/nearest suggestions) — never a guess.
   */
  private resolveEntityId(ref: NameRef): string | null {
    const lower = ref.words.join(' ').toLowerCase();
    // ADR-327 D10: `the player` names the ROLE, not an entity — there is no
    // player block any more. `player` is the sentinel id the loader resolves
    // against `world.getPlayer()` at run time, exactly as `define timer … for
    // the player` already did.
    if (PLAYER_WORDS.has(lower)) return 'player';

    const exact = this.entities.filter((e) => e.nameLower === lower);
    if (exact.length === 1) return exact[0].id;

    const byAlias = this.entities.filter((e) => e.aka.includes(lower));
    if (byAlias.length === 1) return byAlias[0].id;
    if (byAlias.length > 1) {
      this.diagnostics.error(
        'analysis.ambiguous-reference',
        `\`${ref.words.join(' ')}\` is ambiguous — it could be ${byAlias.map((e) => `\`${e.nameLower}\``).join(' or ')}. Use the full name, or rename an alias.`,
        ref.span,
      );
      return null;
    }

    const refWords = ref.words.map((w) => w.toLowerCase());
    const subset = this.entities.filter((e) => isInOrderSubset(refWords, e.nameWords));
    if (subset.length === 1) return subset[0].id;
    if (subset.length > 1) {
      this.diagnostics.error(
        'analysis.ambiguous-reference',
        `\`${ref.words.join(' ')}\` is ambiguous — it could be ${subset.map((e) => `\`${e.nameLower}\``).join(' or ')}. Use the full name, or rename an alias.`,
        ref.span,
      );
      return null;
    }

    const candidates = [
      ...this.entities.map((e) => e.nameLower),
      ...this.entities.flatMap((e) => e.aka),
    ];
    this.diagnostics.error(
      'analysis.unknown-entity',
      `No entity named \`${ref.words.join(' ')}\`${this.suggestText(lower, candidates)}.`,
      ref.span,
    );
    return null;
  }

  // ---------------------------------------------------------- conditions

  private resolveCondition(cond: ConditionNode, scope: Scope): IRCondition {
    switch (cond.kind) {
      case 'or':
      case 'and':
        return { kind: cond.kind, operands: cond.operands.map((o) => this.resolveCondition(o, scope)) };
      case 'not':
        return { kind: 'not', operand: this.resolveCondition(cond.operand, scope) };
      case 'chance':
        return { kind: 'chance', n: cond.n };
      case 'chapter': {
        // ADR-330 D5: the row's name → its ordinal, under the `use` gate.
        // Read off the AST, not the built tables: a `phrase detail` gate
        // resolves in pass 1, before `use` lines and chapter rows are built.
        const uses = (this.ast.header?.uses ?? []).some((u) => u.name === 'chapters');
        if (!uses) {
          this.diagnostics.error('analysis.chapters-needs-use', `\`${cond.relation} ${cond.name}\` reads a chapter — add \`use chapters\` and a \`define chapters\` block to the story.`, cond.span);
          return { kind: 'chapter', relation: cond.relation, ordinal: -1 };
        }
        const block = this.ast.declarations.find((d): d is DefineChapters => d.kind === 'define-chapters');
        const rows = block?.rows ?? [];
        const ordinal = rows.findIndex((r) => r.name === cond.name);
        if (ordinal < 0) {
          const names = rows.map((r) => r.name);
          this.diagnostics.error('analysis.unknown-chapter', `\`${cond.name}\` is not a declared chapter${this.suggestText(cond.name, names)} — the names are the \`define chapters\` rows: ${names.join(', ') || '(none)'}.`, cond.span);
          return { kind: 'chapter', relation: cond.relation, ordinal: -1 };
        }
        return { kind: 'chapter', relation: cond.relation, ordinal };
      }
      case 'client-has': {
        // ADR-216: capability words are the closed platform flag set —
        // validated here, lowered to the camelCase platform key.
        if (!CLIENT_CAPABILITY_FLAGS.has(cond.capability)) {
          this.diagnostics.error(
            'analysis.unknown-capability',
            `\`${cond.capability}\` is not a client capability flag${this.suggestText(cond.capability, [...CLIENT_CAPABILITY_FLAGS])}.`,
            cond.span,
          );
        }
        return { kind: 'client-has', capability: capabilityKeyOf(cond.capability) };
      }
      case 'condition-ref': {
        if (this.conditionNames.has(cond.name)) {
          // Never-guess gate (grammar log 2026-07-11): an OPEN condition is a
          // selection over `it` — as a bare truth test it needs `it` in scope.
          if (this.openConditions.get(cond.name) && !scopeHasIt(scope)) {
            this.diagnostics.error(
              'analysis.open-condition-truth',
              `\`${cond.name}\` is an open condition (it references \`it\`) — here there is no \`it\` to test. Use \`any ${cond.name}\` to test for a matching entity, \`no ${cond.name}\` to test for none, or a closed condition.`,
              cond.span,
            );
          }
          return { kind: 'condition', name: cond.name };
        }
        // A story state reads as a phase test (`while after-hours`, D2).
        if (this.storyStates.includes(cond.name)) {
          return { kind: 'story-state', state: cond.name };
        }
        this.diagnostics.error(
          'analysis.unknown-condition',
          `\`${cond.name}\` is not a declared condition or story state${this.suggestText(cond.name, [...this.conditionNames, ...this.storyStates])}.`,
          cond.span,
        );
        return { kind: 'condition', name: cond.name };
      }
      case 'any-of':
      case 'none-of':
        // E1/E2 (ratchet 2026-07-12): existential / negated existential
        // over a named OPEN condition. Closed, story-state, and unknown
        // names are load errors — never a guess.
        this.requireOpenCondition(cond.condition, cond.span, cond.kind === 'any-of' ? 'any' : 'no');
        return { kind: cond.kind, condition: cond.condition };
      case 'subject-changes':
        // ADR-320 D9: the scene's thread-abandonment notice — no operands;
        // evaluation is the scene runtime's.
        return { kind: 'subject-changes' };
      case 'asked':
        // ADR-320 D4: repetition word over the enclosing row's topic —
        // words are the parser's closed set; the runtime owns the counting.
        return { kind: 'asked', word: cond.word };
      case 'predicate': {
        // ADR-320 D6/D9: recency and discussed-ness take the SUBJECT as a
        // topic, not an entity — intercept before entity resolution, and
        // normalize exactly as `knows` topics do.
        if (cond.predicate.kind === 'recency' || cond.predicate.kind === 'was-discussed') {
          const topicWords =
            cond.subject.kind === 'ref' ? cond.subject.ref.words
            : cond.subject.kind === 'bare' ? cond.subject.words
            : null;
          if (!topicWords || topicWords.length === 0) {
            this.diagnostics.error(
              cond.predicate.kind === 'recency' ? 'analysis.recency-topic' : 'analysis.discussed-topic',
              `Expected a topic name before \`${cond.predicate.kind === 'recency' ? `is ${cond.predicate.word}` : 'was discussed'}\` — the subject is the topic being tested.`,
              cond.predicate.span,
            );
            return { kind: 'condition', name: '' };
          }
          const topic = normalizeTopic(topicWords.join(' '));
          if (cond.predicate.kind === 'recency') {
            const node: IRCondition = { kind: 'recency', topic, word: cond.predicate.word };
            return cond.predicate.negated ? { kind: 'not', operand: node } : node;
          }
          return { kind: 'discussed', topic };
        }
        // ADR-320 D14: `<thread> is concluded` takes the SUBJECT as a
        // thread key — intercept before entity resolution, and validate
        // the key against the story's declared `define conversation`
        // blocks (a typo here would otherwise be silently false forever).
        if (cond.predicate.kind === 'concluded') {
          const threadWords =
            cond.subject.kind === 'ref' ? cond.subject.ref.words
            : cond.subject.kind === 'bare' ? cond.subject.words
            : null;
          if (!threadWords || threadWords.length === 0) {
            this.diagnostics.error(
              'analysis.concluded-thread',
              'Expected a thread key before `is concluded` — the subject is the `define conversation` key being tested.',
              cond.predicate.span,
            );
            return { kind: 'condition', name: '' };
          }
          const thread = normalizeTopic(threadWords.join(' '));
          if (!this.conversationKeys.has(thread)) {
            this.diagnostics.error(
              'analysis.unknown-conversation',
              `\`${thread}\` is not a declared conversation — \`is concluded\` tests a \`define conversation\` key${this.suggestText(thread, [...this.conversationKeys])}.`,
              cond.predicate.span,
            );
            return { kind: 'condition', name: '' };
          }
          const node: IRCondition = { kind: 'concluded', thread };
          return cond.predicate.negated ? { kind: 'not', operand: node } : node;
        }
        const subject = this.resolveValue(cond.subject, scope);
        switch (cond.predicate.kind) {
          case 'is': {
            const object = this.resolveIsObject(cond.predicate.value, subject, scope, cond.predicate.span);
            return { kind: 'predicate', pred: 'is', negated: cond.predicate.negated, subject, object };
          }
          case 'compare': {
            // ADR-264 D3: numeric comparison — the left operand must be a
            // counter (the only numeric value a condition reads); a bare/
            // possessive name that isn't one is a typo, not a silent symbol.
            if (subject.kind !== 'counter') {
              const name =
                cond.subject.kind === 'ref' ? cond.subject.ref.words.join(' ')
                : cond.subject.kind === 'possessive' ? cond.subject.field.join(' ')
                : '<value>';
              this.diagnostics.error('analysis.unknown-counter', `\`${name}\` is not a declared counter — a comparison reads a counter.`, cond.predicate.span);
            }
            return { kind: 'compare', op: cond.predicate.op, left: subject, right: this.resolveValue(cond.predicate.value, scope) };
          }
          case 'is-a':
            return {
              kind: 'predicate',
              pred: 'is-a',
              negated: cond.predicate.negated,
              subject,
              object: { kind: 'symbol', name: cond.predicate.classifier.join(' ') },
            };
          case 'is-in':
            return {
              kind: 'predicate',
              pred: 'is-in',
              negated: cond.predicate.negated,
              subject,
              object: this.resolvePlace(cond.predicate.place, scope),
            };
          case 'timer-has': {
            // ADR-325 D3d: `has started` / `has expired` read a timer's lifecycle.
            if (subject.kind !== 'timer') {
              this.diagnostics.error('analysis.unknown-timer', `\`has ${cond.predicate.what}\` reads a timer — the subject is not a declared timer.`, cond.predicate.span);
              return { kind: 'condition', name: '' };
            }
            const node: IRCondition = { kind: 'timer-has', timer: subject.timer, what: cond.predicate.what };
            return cond.predicate.negated ? { kind: 'not', operand: node } : node;
          }
          case 'is-here': {
            // Z4 deictic: entity-valued subjects only — a literal can
            // never be "here", so reject at load rather than evaluating
            // to a silent false. (A no-LOCATION entity evaluating false
            // is a runtime semantic, not a load-time check.)
            if (subject.kind === 'literal' || subject.kind === 'symbol' || subject.kind === 'story') {
              this.diagnostics.error(
                'analysis.here-subject',
                '`is here` needs an entity subject — the deictic tests whether the subject shares the player\'s location.',
                cond.predicate.span,
              );
            }
            return {
              kind: 'predicate',
              pred: 'is-here',
              negated: cond.predicate.negated,
              subject,
              object: { kind: 'symbol', name: 'here' },
            };
          }
          case 'has':
          case 'holds':
          case 'wears':
            return {
              kind: 'predicate',
              pred: cond.predicate.kind,
              negated: false,
              subject,
              object: this.resolveEntityValue(cond.predicate.thing, scope),
            };
          case 'can':
            // Phase B (§2.7): resolution matches has/holds; evaluation lands
            // with the loader phases.
            return {
              kind: 'predicate',
              pred: cond.predicate.ability === 'see' ? 'can-see' : 'can-reach',
              negated: false,
              subject,
              object: this.resolveEntityValue(cond.predicate.thing, scope),
            };
          case 'feels': {
            // ADR-310 D13: interior-state predicate — the word gate is the
            // same vocabulary the `feels` declaration line uses.
            if (!CHARACTER_MANIFEST.dispositions.includes(cond.predicate.disposition)) {
              this.diagnostics.error(
                'analysis.unknown-disposition-word',
                `\`${cond.predicate.disposition}\` is not a disposition word — the vocabulary: ${CHARACTER_MANIFEST.dispositions.join(', ')}.`,
                cond.predicate.span,
              );
            }
            return {
              kind: 'feels',
              subject,
              disposition: cond.predicate.disposition,
              target: this.resolveEntityValue(cond.predicate.target, scope),
            };
          }
          case 'knows':
            // ADR-310 D13: held-topic predicate; topics normalize exactly
            // as the `knows` declaration line's do.
            return { kind: 'knows-topic', subject, topic: normalizeTopic(cond.predicate.topic.words.join(' ')) };
          case 'is-any':
            // `<subject> must be any <name>` membership (David, 2026-07-12
            // — P3): the subject satisfies the named open condition (its
            // `it` bound to the subject at evaluation).
            this.requireOpenCondition(cond.predicate.condition, cond.predicate.span, 'any');
            return { kind: 'satisfies', subject, condition: cond.predicate.condition };
        }
      }
    }
  }

  /**
   * E1/E2/E3 never-guess gate: `any`/`no`/`each` (and `must be any`)
   * reference a declared OPEN condition. A closed condition revives the
   * pre-ownership gate verbatim (`analysis.closed-condition-selection`);
   * story states and unknown names get their own errors.
   */
  private requireOpenCondition(name: string, span: Span, form: 'any' | 'no' | 'each'): void {
    if (this.openConditions.get(name)) return;
    if (this.conditionNames.has(name)) {
      this.diagnostics.error(
        'analysis.closed-condition-selection',
        `\`${name}\` is a closed condition — it never mentions \`it\`, so it doesn't describe a thing. Reference \`it\` in the condition to make it a selection.`,
        span,
      );
      return;
    }
    if (this.storyStates.includes(name)) {
      this.diagnostics.error(
        'analysis.closed-condition-selection',
        `\`${name}\` is a story state (a truth test), not an open condition — \`${form}\` selects entities via a condition that references \`it\`.`,
        span,
      );
      return;
    }
    this.diagnostics.error(
      'analysis.unknown-condition',
      `\`${name}\` is not a declared condition${this.suggestText(name, [...this.conditionNames])}.`,
      span,
    );
  }

  /**
   * The object of `is` may be a state of the subject entity, a trait
   * adjective, a literal, or an entity. A bare word that is none of these
   * is the unknown-value gate (with nearest-valid suggestions).
   */
  private resolveIsObject(expr: ValueExpr, subject: IRValue, scope: Scope, span: Span): IRValue {
    if (expr.kind === 'literal') return this.resolveValue(expr, scope);

    const words =
      expr.kind === 'ref' ? expr.ref.words : expr.kind === 'bare' ? expr.words : null;
    if (words && words.length === 1) {
      const word = words[0];
      // ADR-325 D3d: a timer subject reads its own named turns; `expired`
      // is the lifecycle's word (`has expired`), never `is expired`.
      if (subject.kind === 'timer') {
        const timer = this.timers.get(subject.timer)!;
        if (word === 'expired') {
          this.diagnostics.error('analysis.timer-is-expired', '`is expired` is not a read — write `has expired` (the lifecycle), or name one of the timer\'s turns.', span);
          return { kind: 'symbol', name: word };
        }
        if (timer.states.includes(word)) return { kind: 'symbol', name: word };
        this.diagnostics.error(
          'analysis.unknown-timer-state',
          `\`${word}\` is not a turn of the timer \`${timer.name}\`${this.suggestText(word, timer.states)}.`,
          span,
        );
        return { kind: 'symbol', name: word };
      }
      // Trait-field subjects validate against the field's own value set
      // (`if kind is snake` — one-of members; flags — true/false).
      const fieldValues = this.fieldValueSet(subject, scope);
      if (fieldValues) {
        if (fieldValues.includes(word)) return { kind: 'symbol', name: word };
        this.diagnostics.error(
          'analysis.unknown-value',
          `\`${word}\` is not a value of this field${this.suggestText(word, fieldValues)}.`,
          span,
        );
        return { kind: 'symbol', name: word };
      }
      // The `each`-block binder: its state set is statically unknowable
      // (any world entity may match) — same stance as `change the match
      // to <state>`; the runtime resolves the word against the live match.
      if (subject.kind === 'match') return { kind: 'symbol', name: word };
      // ADR-275 D4: a semantic-word subject (`the direction`, a `means`
      // key) compares by word equality; its legal word set is the
      // construct's own — validated here, never guessed.
      if (subject.kind === 'slot' && scope.semanticValues?.has(subject.name)) {
        const legal = scope.semanticValues.get(subject.name)!;
        if (legal.includes(word)) return { kind: 'symbol', name: word };
        this.diagnostics.error(
          'analysis.unknown-value',
          `\`${word}\` is not a value \`${subject.name}\` can hold${this.suggestText(word, legal)}.`,
          span,
        );
        return { kind: 'symbol', name: word };
      }
      const subjectEntity =
        subject.kind === 'entity' ? this.byId.get(subject.id) : subject.kind === 'it' ? scope.owner : null;
      // Which closure `it` validates against depends on how it is bound.
      // Owner entity → its own states. Trait scope → the trait's declared
      // states (ratchet D8). Unbound — a top-level `define condition`, whose
      // whole purpose is quantifying over unknown subjects — the union of
      // every state some trait or entity declares (ADR-289 D10). The
      // vocabulary stays closed and validated; only the closure changes.
      const validStates = subjectEntity?.states ?? (subject.kind === 'it' ? scope.ownStates ?? this.declaredStateUnion() : []);
      if (validStates.includes(word)) return { kind: 'symbol', name: word };
      if (TRAIT_ADJECTIVES.has(word)) return { kind: 'symbol', name: word };
      // State adjectives (ratchet D1): read live from world trait state.
      if (STATE_ADJECTIVES.has(word)) return { kind: 'symbol', name: word };
      // ADR-310 D13 / ADR-318 D8: mood, threat, and pressure-band words
      // gate on interior state (`while the Colonel is panicked`, `active
      // when it is breaking`). An entity's OWN declared state wins the
      // word on collision — checked above.
      if (this.isMoodWord(word) || CHARACTER_MANIFEST.threats.includes(word) || CHARACTER_MANIFEST.pressureBands.includes(word)) {
        return { kind: 'symbol', name: word };
      }
      const exactEntity = this.entities.find((e) => e.nameLower === word.toLowerCase() || e.aka.includes(word.toLowerCase()));
      if (exactEntity) return { kind: 'entity', id: exactEntity.id };
      const valid = [...validStates, ...TRAIT_ADJECTIVES, ...STATE_ADJECTIVES, ...this.moodVocabulary(), ...CHARACTER_MANIFEST.threats, ...CHARACTER_MANIFEST.pressureBands];
      this.diagnostics.error(
        'analysis.unknown-value',
        `\`${word}\` is not a state${subjectEntity ? ` of ${subjectEntity.nameLower}` : ''} or a known trait${this.suggestText(word, valid)}.`,
        span,
      );
      return { kind: 'symbol', name: word };
    }
    return this.resolveValue(expr, scope);
  }

  /**
   * Every state declared by some trait or entity (ADR-289 D10) — the closure
   * an unbound `it` validates against, and the pool its nearest-match
   * suggestion draws from.
   */
  private declaredStateUnion(): string[] {
    const union = new Set<string>();
    for (const entity of this.entities) for (const state of entity.states) union.add(state);
    for (const states of this.traitStates.values()) for (const state of states) union.add(state);
    return [...union];
  }

  /** Valid comparison values for a trait-field subject, or null. */
  private fieldValueSet(subject: IRValue, scope: Scope): string[] | null {
    if (subject.kind !== 'field' || subject.base.kind !== 'it' || !scope.fields) return null;
    const field = scope.fields.get(subject.field);
    if (!field) return null;
    if (field.type === 'one-of') return field.oneOf ?? [];
    return null;
  }

  // ------------------------------------------------------------- phrases

  /** Gate: every referenced phrase key must resolve in the default locale. */
  private requirePhrase(key: string, span: Span, owner: EntitySymbol | null = null): void {
    const table = this.phrases.get(DEFAULT_LOCALE);
    if (table?.has(key)) return;
    if (owner && table?.has(`${owner.id}.${key}`)) return;
    // ADR-250 D4.6: book coverage counts as declaration. Covered only by
    // predicated books → warn once (off-book it renders nothing).
    if (this.bookKeys.has(key)) {
      if (!this.bookKeys.get(key) && !this.partialCoverageWarned.has(key)) {
        this.partialCoverageWarned.add(key);
        this.diagnostics.warning(
          'analysis.phrasebook-partial-coverage',
          `\`${key}\` is only defined in conditional phrasebooks — when no book is active it renders nothing.`,
          span,
        );
      }
      return;
    }
    const known = table ? [...table.keys()] : [];
    this.diagnostics.error(
      'analysis.missing-phrase',
      `Phrase \`${key}\` is not declared in ${DEFAULT_LOCALE}${this.suggestText(key, known)}.`,
      span,
    );
  }

  /**
   * Gate: bare single-word `{…}` markers must name a declared hatch or
   * phrase key. Formatter-chain forms (uppercase start, spaces, `:`) are
   * outside the Phase A validation slice.
   */
  private checkMarkers(): void {
    for (const [, table] of this.phrases) {
      for (const [key, phrase] of table) {
        this.checkPhraseMarkers(key, phrase);
      }
    }
    // Phrasebook entries carry the same marker contract (ADR-250 D1 —
    // entries are ordinary phrase definitions).
    for (const book of this.phrasebookDecls) {
      if (!book.entries) continue;
      for (const [key, phrase] of Object.entries(book.entries)) {
        this.checkPhraseMarkers(`${book.name}.${key}`, phrase);
      }
    }
  }

  private checkPhraseMarkers(label: string, phrase: IRPhrase): void {
    for (const variant of phrase.variants) {
      // A variant carrying formatter-chain forms ({You}, {the item},
      // {verb:…}) is a TEMPLATE — its bare lowercase markers are chain
      // verbs ({open}), not producer references (Phase B: §3.2 trait
      // phrases). Full chain validation lands with the AC-9 contract.
      const isTemplate = variant.markers.some(
        (m) => /[A-Z]/.test(m[0] ?? '') || m.includes(' ') || m.includes(':'),
      );
      if (isTemplate) continue;
      for (const marker of variant.markers) {
        if (!/^[a-z][a-z0-9-]*$/.test(marker)) continue;
        if (marker === 'br') continue; // built-in line break (grammar log 2026-07-10)
        if (this.hatchNames.has(marker)) continue;
        if (this.phrases.get(DEFAULT_LOCALE)?.has(marker)) {
          // Description-derived entries are not phrase BODIES: room
          // descriptions resolve markers via Z2 snippets, non-room ones
          // keep them unrewritten by pinned contract. Silent, as before.
          if (this.descriptionKeys.has(label)) continue;
          // GH #286 floor: nothing resolves a phrase reference inside
          // another phrase's body — snippet rewriting is room-description
          // prose only (Z2, checkDescriptionMarkers) — so the marker would
          // reach the player as literal braces. Reject it instead. Whether
          // phrase-in-phrase should RESOLVE is held open (GH #303 item 2);
          // if it lands, this gate relaxes into cycle detection.
          this.diagnostics.error(
            'analysis.phrase-in-phrase',
            `\`{${marker}}\` in phrase \`${label}\` names another phrase, but a phrase body cannot invoke a phrase — the marker would print literally. Carry the text inline, or emit \`phrase ${marker}\` beside this one at the call site.`,
            phrase.span,
          );
          continue;
        }
        if (this.bookKeys.has(marker)) continue; // book coverage counts (ADR-250 D4.6)
        this.diagnostics.error(
          'analysis.unbound-marker',
          `\`{${marker}}\` in phrase \`${label}\` is not a declared text producer or phrase${this.suggestText(marker, [...this.hatchNames])}.`,
          phrase.span,
        );
      }
    }
  }

  /**
   * Z2 (ADR-211): validate `{key}` phrase markers in ROOM description prose
   * — the sites the loader compiles to `{snippet:key}` + `RoomTrait.snippets`.
   * Never-guess diagnostics live here: a separator-led variant is a load
   * error with the bare-fragment fix-it (AC-3), a clause-site fragment ending
   * in a sentence terminator is a lint warning, and a `verbatim` phrase at a
   * description marker is a load error. `nothing` is the explicit empty
   * variant and is exempt. The rewrite itself is the loader's, atomically
   * with the snippet-map population.
   */
  private checkDescriptionMarkers(): void {
    const table = this.phrases.get(DEFAULT_LOCALE);
    if (!table) return;
    const reportedBare = new Set<string>();
    for (const e of this.entities) {
      const isRoom = e.decl.compositions.some(
        (c) => c.article && c.words.join(' ').toLowerCase() === 'room',
      );
      if (!isRoom) continue;
      for (const key of [`${e.id}.description`, `${e.id}.initial-description`]) {
        const desc = table.get(key);
        if (!desc) continue;
        for (const site of descriptionMarkerSites(desc.variants[0]?.text ?? '')) {
          if (site.marker === 'br' || this.hatchNames.has(site.marker)) continue;
          const target = table.get(site.marker);
          if (!target) continue; // unbound → checkMarkers' analysis.unbound-marker
          if (target.verbatim) {
            this.diagnostics.error(
              'analysis.verbatim-marker',
              `\`{${site.marker}}\` in \`${key}\` names a \`verbatim\` phrase — verbatim text cannot splice at a description marker.`,
              desc.span,
            );
            continue;
          }
          for (const variant of target.variants) {
            if (variant.text === 'nothing') continue; // explicit empty variant (Z2)
            if (SEPARATOR_LED.test(variant.text)) {
              if (!reportedBare.has(site.marker)) {
                reportedBare.add(site.marker);
                this.diagnostics.error(
                  'analysis.fragment-not-bare',
                  `A variant of \`${site.marker}\` begins with punctuation/whitespace — write the fragment bare; the separator is platform-owned (ADR-211).`,
                  target.span,
                );
              }
            } else if (site.mode === 'clause' && /[.?!]$/.test(variant.text.trimEnd())) {
              this.diagnostics.warning(
                'analysis.fragment-terminator',
                `\`{${site.marker}}\` sits mid-sentence in \`${key}\`, but a variant ends with a sentence terminator — the clause join (\`, \`) will read oddly.`,
                target.span,
              );
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------- suggestions

  /** `— did you mean \`x\`?` when a near match exists, else empty. */
  private suggestText(input: string, candidates: string[]): string {
    const best = nearest(input, candidates);
    return best ? ` — did you mean \`${best}\`?` : '';
  }
}

/** Separator-shaped leading characters a bare fragment must not carry (mirrors the engine's ADR-211 gate). */
const SEPARATOR_LED = /^[\s,.;:?!]/;

/** One `{key}` occurrence in description prose with its ADR-211 site mode. */
interface DescriptionMarkerSite {
  marker: string;
  /** 'clause' (mid-sentence), 'sentence' (after a terminator), 'boundary' (text start / paragraph edge). */
  mode: 'clause' | 'sentence' | 'boundary';
}

/**
 * Scan description prose for `{key}` marker sites and classify each per the
 * ADR-211 join rule: mode comes from the nearest preceding non-marker,
 * non-whitespace character (adjacent markers are transparent); `.?!;:` ⇒
 * sentence, start-of-text / paragraph edge ⇒ boundary, else clause.
 */
function descriptionMarkerSites(text: string): DescriptionMarkerSite[] {
  const sites: DescriptionMarkerSite[] = [];
  for (const match of text.matchAll(/\{([a-z][a-z0-9-]*)\}/g)) {
    let i = (match.index ?? 0) - 1;
    let mode: DescriptionMarkerSite['mode'] | null = null;
    while (i >= 0) {
      const ch = text[i];
      if (ch === '}') {
        const open = text.lastIndexOf('{', i);
        if (open >= 0 && /^\{[a-z][a-z0-9-]*\}$/.test(text.slice(open, i + 1))) {
          i = open - 1; // adjacent marker: transparent — keep scanning left
          continue;
        }
        mode = 'clause';
        break;
      }
      if (ch === '\n' && text[i - 1] === '\n') {
        mode = 'boundary';
        break;
      }
      if (/\s/.test(ch)) {
        i--;
        continue;
      }
      mode = '.?!;:'.includes(ch) ? 'sentence' : 'clause';
      break;
    }
    sites.push({ marker: match[1], mode: mode ?? 'boundary' });
  }
  return sites;
}

/** True when `needle` appears in `haystack` in order (not necessarily adjacent). */
function isInOrderSubset(needle: string[], haystack: string[]): boolean {
  if (needle.length === 0) return false;
  let i = 0;
  for (const word of haystack) {
    if (word === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

/** Nearest candidate within an edit distance budget, or null. */
function nearest(input: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestDist = Math.max(2, Math.floor(input.length / 3)) + 1;
  for (const c of candidates) {
    const d = levenshtein(input.toLowerCase(), c.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const row = [i];
    for (let j = 1; j <= n; j++) {
      row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = row;
  }
  return prev[n];
}


/**
 * Every event-payload field a channel return references (ADR-253 D1;
 * ADR-300 D10 for records).
 *
 * A `field` names one directly; a `text` template names each `(slot)`; a
 * `record` names the union of its members'. `phrase` returns own their slots
 * through the phrase system, so they contribute nothing here.
 */
function channelReturnFields(returns: IRChannelReturn): string[] {
  switch (returns.kind) {
    case 'field':
      return [returns.field];
    case 'text':
      return [...returns.text.matchAll(/\(\s*([^)]+?)\s*\)/g)].map((m) => m[1]);
    case 'phrase':
      return [];
    case 'record':
      return returns.members.flatMap((m) => channelReturnFields(m.value));
  }
}
