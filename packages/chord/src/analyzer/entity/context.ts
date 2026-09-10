/**
 * context.ts — what an entity-block line builder reads and writes.
 *
 * Building one `create` block into its IR entity is a sequence of builders,
 * one per line kind the block accepts. Each builder reads the parsed lines
 * it owns from the declaration, resolves them through the analyzer surface
 * this module declares, and writes its slice into a draft. The runner
 * (`Analyzer.buildEntity`) creates the draft, runs the builders in their
 * declared order, and assembles the wire entity from the draft — so the
 * wire key order is the assembler's alone, and a builder's position in the
 * list decides only when its diagnostics are reported.
 *
 * Public interface: EntityDraft, EntityBuildContext, EntityLineBuilder,
 * newEntityDraft(), isPersonDecl(), isPlayableDecl().
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-336 D2 — one builder per entity-block line kind, keyed by the
 *   keyword family the parser produces.
 * - ADR-327 D10 — `a person` is the floor for the player role; `playable`
 *   marks the eligible character.
 */
import type {
  CompositionItem,
  ConditionNode,
  CounterDecl,
  CreateDecl,
  DefinePronouns,
  ForcePairDecl,
  GoalStepDecl,
  LandingDecl,
  MoveClause,
  NameRef,
  NeverDecl,
  ObligationLineDecl,
  OnClause,
  ScopeRefDecl,
  TimerClause,
} from '../../ast.js';
import type { DiagnosticBag } from '../../diagnostics.js';
import type {
  IRBlockedExit,
  IRComposition,
  IRCondition,
  IRContainedMember,
  IRCounterDecl,
  IRDeadlyExit,
  IRDeadlyRoom,
  IRExit,
  IRFactDef,
  IRFeelsEntry,
  IRGoalDef,
  IRGoalStep,
  IRHonorDecl,
  IRInfluenceDef,
  IRKnowsEntry,
  IRLanding,
  IRMoveClause,
  IROnClause,
  IRObligationEntry,
  IRPersonalityEntry,
  IRPlacement,
  IRPrincipleEntry,
  IRResistsEntry,
  IRScopeRef,
  IRSpreads,
  IRTemperamentBinding,
  IRTemperamentDef,
  IRThinksEntry,
  IRTimerClause,
} from '../../ir.js';
import type { Span } from '../../span.js';
import type { EntitySymbol, Scope } from '../../analyzer.js';

/**
 * The entity under construction. Identity fields are set at creation; each
 * other field is one builder's slice. Optional fields stay absent when the
 * block declares nothing for them, and the assembler keeps them absent on
 * the wire.
 */
export interface EntityDraft {
  /** Canonical id — the pass-1 symbol's, else derived from the name. */
  readonly id: string;
  /** The pass-1 symbol, or null when collection rejected the block. */
  readonly sym: EntitySymbol | null;
  /** `a person` is composed on the block. */
  readonly isPerson: boolean;
  /** The block's own scope for conditions and clauses (`it` is this entity). */
  readonly scope: Scope;
  readonly name: string;
  readonly article: string | null;
  readonly aka: string[];
  readonly isPlayable: boolean;
  readonly statesReversible: boolean;
  readonly span: Span;

  pronouns?: string;
  kinds: IRComposition[];
  traits: IRComposition[];
  personality: IRPersonalityEntry[];
  profile?: Record<string, string>;
  mood?: string;
  feels: IRFeelsEntry[];
  knows: IRKnowsEntry[];
  thinks: IRThinksEntry[];
  spreads?: IRSpreads;
  goals: IRGoalDef[];
  influences: IRInfluenceDef[];
  resists: IRResistsEntry[];
  temperaments: IRTemperamentBinding[];
  principles: IRPrincipleEntry[];
  obligations: IRObligationEntry[];
  honor?: IRHonorDecl;
  burdenedBy: string[];
  startsStates: string[];
  placement: IRPlacement | null;
  wears: string[];
  carries: string[];
  containing: IRContainedMember[];
  landing?: IRLanding;
  exits: IRExit[];
  blockedExits: IRBlockedExit[];
  deadlyExits: IRDeadlyExit[];
  deadly: IRDeadlyRoom | null;
  states: string[];
  counters: IRCounterDecl[];
  descriptionKey: string | null;
  initialDescriptionKey: string | null;
  onClauses: IROnClause[];
  timerClauses?: IRTimerClause[];
  moveClauses?: IRMoveClause[];
}

/**
 * The analyzer surface a builder resolves through. Every member delegates to
 * the analyzer; the maps are the analyzer's own tables (a builder that
 * synthesizes a temperament definition writes it there).
 */
export interface EntityBuildContext {
  readonly diagnostics: DiagnosticBag;
  /** Extensions the header `use`s — extension vocabulary is admitted only under its `use`. */
  readonly usedExtensions: ReadonlySet<string>;
  /** `define pronouns` sets by name. */
  readonly pronounSetDecls: ReadonlyMap<string, DefinePronouns>;
  /** Entity symbols by id (a `while <state>` binding reads the owner's states). */
  readonly byId: ReadonlyMap<string, EntitySymbol>;
  /** `define fact` by id — `thinks` values resolve against it. */
  readonly factById: ReadonlyMap<string, IRFactDef>;
  /** Temperament definitions by name; inline and override bindings add synthesized ones. */
  readonly temperamentDefs: Map<string, IRTemperamentDef>;
  /** `define code` bundles by name. */
  readonly codes: ReadonlyMap<string, { principles: IRPrincipleEntry[]; obligations: IRObligationEntry[] }>;
  /** `define honor` bundles by name — the face acts each names. */
  readonly honorDefs: ReadonlyMap<string, string[]>;

  resolveEntityId(ref: NameRef): string | null;
  resolveCondition(cond: ConditionNode, scope: Scope): IRCondition;
  suggestText(input: string, candidates: string[]): string;
  requirePhrase(key: string, span: Span, owner?: EntitySymbol | null): void;
  routeProfileComposition(comp: CompositionItem, isPerson: boolean, entityName: string, isDuplicate: boolean): Record<string, string> | null;
  routeCharacterComposition(comp: CompositionItem, isPerson: boolean, entityName: string, out: IRPersonalityEntry[]): boolean;
  isMoodWord(word: string): boolean;
  moodVocabulary(): string[];
  checkTheoryOfMind(ref: NameRef, construct: 'knows' | 'thinks'): boolean;
  classifyKnowledgeSlots(
    slots: Array<{ word: string; span: Span }>,
    construct: 'knows' | 'thinks',
  ): { source?: string; confidence?: string; confided?: boolean; ok: boolean };
  canonicalFactValue(v: NameRef): string | null;
  lowerPerformStep(step: Extract<GoalStepDecl, { kind: 'perform' }>): IRGoalStep | null;
  resolveForcePairs(pairs: ForcePairDecl[], owner: string): Array<[string, string]>;
  categorySurface(category: string): string;
  resolveNeverLine(n: NeverDecl): IRPrincipleEntry | null;
  resolveObligationLine(o: ObligationLineDecl): IRObligationEntry | null;
  resolveScopeRefDecl(s: ScopeRefDecl): IRScopeRef | null;
  buildLanding(landing: LandingDecl): IRLanding;
  buildCounterDecl(decl: CounterDecl): IRCounterDecl;
  checkDuplicateClauses(clauses: OnClause[], ownerDesc: string): OnClause[];
  buildOnClause(clause: OnClause, scope: Scope, ownerKey: string, clauseIndex: number): IROnClause;
  buildTimerClause(clause: TimerClause, scope: Scope, ownerKey: string, index: number): IRTimerClause;
  buildMoveClause(clause: MoveClause, scope: Scope, ownerKey: string, index: number): IRMoveClause;
}

/**
 * One entity-block line builder: reads the lines it owns from the
 * declaration and writes its slice of the draft. `requires` names the
 * builders whose slices it reads, and the list order is checked against it.
 */
export interface EntityLineBuilder {
  readonly name: string;
  readonly requires: readonly string[];
  build(decl: CreateDecl, entity: EntityDraft, context: EntityBuildContext): void;
}

/** `a person` composed on a create block — the eligibility floor for the player role. */
export function isPersonDecl(decl: CreateDecl): boolean {
  return decl.compositions.some((c) => c.article && c.words.join(' ').toLowerCase() === 'person');
}

/**
 * `playable` composed on a create block — a bare, single-word composition
 * matched ahead of profile/personality/trait routing, so the word never
 * reaches parser vocabulary or the unknown-trait census gate.
 */
export function isPlayableDecl(decl: CreateDecl): boolean {
  return decl.compositions.some(
    (c) => !c.article && c.words.length === 1 && c.words[0].toLowerCase() === 'playable',
  );
}

/**
 * Create the draft for one `create` block with its identity fields set and
 * every slice at its empty value.
 * @param decl the block
 * @param sym its pass-1 symbol, or null when collection rejected the block
 * @param scope the block's own scope
 */
export function newEntityDraft(decl: CreateDecl, sym: EntitySymbol | null, scope: Scope): EntityDraft {
  return {
    id: sym?.id ?? decl.name.words.join('-').toLowerCase(),
    sym,
    isPerson: isPersonDecl(decl),
    scope,
    name: decl.name.words.join(' '),
    article: decl.name.article,
    aka: decl.aka,
    isPlayable: isPlayableDecl(decl),
    statesReversible: decl.statesReversible,
    span: decl.span,
    kinds: [],
    traits: [],
    personality: [],
    feels: [],
    knows: [],
    thinks: [],
    goals: [],
    influences: [],
    resists: [],
    temperaments: [],
    principles: [],
    obligations: [],
    burdenedBy: [],
    startsStates: [],
    placement: null,
    wears: [],
    carries: [],
    containing: [],
    exits: [],
    blockedExits: [],
    deadlyExits: [],
    deadly: null,
    states: [],
    counters: [],
    descriptionKey: null,
    initialDescriptionKey: null,
    onClauses: [],
  };
}
