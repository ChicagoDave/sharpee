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
  ConditionNode,
  CreateDecl,
  DefineAction,
  DefineCondition,
  DefinePhrase,
  DefinePhrases,
  DefineTrait,
  NameRef,
  OnClause,
  StateName,
  Statement,
  StoryFile,
  TextValue,
  TraitField,
  ValueExpr,
} from './ast';
import { EVENT_VERBS, PLATFORM_STATE_PAIRS, STARTS_STATE_PAIRINGS, STATE_ADJECTIVES, TRAIT_ADJECTIVES } from './catalog';
import { DiagnosticBag } from './diagnostics';
import {
  IR_FORMAT,
  IRActionDef,
  IRCondition,
  IREntity,
  IROnClause,
  IRPhrase,
  IRScoreDef,
  IRStatement,
  IRTraitDef,
  IRValue,
  StoryIR,
} from './ir';
import { Span } from './span';

/** Phase A stories register text in this locale (design.md §2.6). */
const DEFAULT_LOCALE = 'en-US';
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

/** Ring 1 of the boolean-state gate (D9): literal booleans as state names. */
const BOOLEAN_STATE_WORDS = new Set(['true', 'false', 'yes', 'no']);

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
    case 'condition-ref':
      return `cond:${cond.name}`;
    case 'any-of':
    case 'none-of':
      return `${cond.kind}:${cond.condition}`;
    case 'predicate': {
      const p = cond.predicate;
      switch (p.kind) {
        case 'is':
          return `is${p.negated ? '!' : ''}(${value(cond.subject)},${value(p.value)})`;
        case 'is-a':
          return `is-a${p.negated ? '!' : ''}(${value(cond.subject)},${p.classifier.join(' ').toLowerCase()})`;
        case 'is-in':
          return `is-in${p.negated ? '!' : ''}(${value(cond.subject)},${p.place.words.join(' ').toLowerCase()})`;
        case 'is-here':
          return `is-here${p.negated ? '!' : ''}(${value(cond.subject)})`;
        case 'has':
        case 'holds':
        case 'wears':
          return `${p.kind}(${value(cond.subject)},${p.thing.words.join(' ').toLowerCase()})`;
        case 'can':
          return `can-${p.ability}(${value(cond.subject)},${p.thing.words.join(' ').toLowerCase()})`;
        case 'is-any':
          return `is-any(${value(cond.subject)},${p.condition})`;
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
  /** Score-owner key for `award` resolution (entity id, `trait.<t>`, `action.<a>`; null = story). */
  scoreOwner: string | null;
  /** Inside an `each` block body — the `the match` binder is in scope (E3). */
  inEach: boolean;
}

const TOP_SCOPE: Scope = { owner: null, fields: null, slots: null, ownStates: null, scoreOwner: null, inEach: false };

function entityScope(owner: EntitySymbol | null): Scope {
  return { owner, fields: null, slots: null, ownStates: null, scoreOwner: owner?.id ?? null, inEach: false };
}

/** True when the scope binds `it` (entity clause or trait clause). */
function scopeHasIt(scope: Scope): boolean {
  return scope.owner !== null || scope.fields !== null;
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
      return false;
    case 'any-of':
    case 'none-of':
      // Quantifiers test the world, not the clause owner — no `it` here.
      return false;
    case 'predicate': {
      if (visitValue(cond.subject)) return true;
      const p = cond.predicate;
      switch (p.kind) {
        case 'is':
          return visitValue(p.value);
        case 'is-in':
          return nameIsIt(p.place);
        case 'has':
        case 'holds':
        case 'wears':
        case 'can':
          return nameIsIt(p.thing);
        case 'is-a':
        // `is here` has no object node — the subject was already visited above.
        case 'is-here':
        // The membership form's condition selects its own entities — the
        // subject was already visited above (E1/P3).
        case 'is-any':
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

class Analyzer {
  private entities: EntitySymbol[] = [];
  private byId = new Map<string, EntitySymbol>();
  private conditionNames = new Set<string>();
  private hatchNames = new Set<string>();
  /** locale → key → IRPhrase */
  private phrases = new Map<string, Map<string, IRPhrase>>();
  // Phase B namespaces:
  private traitNames = new Set<string>();
  /** action name → declared grammar-slot names. */
  private actionSlots = new Map<string, Set<string>>();
  /** Owner-qualified score id (`pygmy-goats.fed`, story-level bare) → worth. */
  private scoreNames = new Map<string, number>();
  /** Owner-qualified score declarations, for ir.scores emission. */
  private scoreDecls: IRScoreDef[] = [];
  /** condition name → OPEN (references `it`/`its`; usable as a selection). */
  private openConditions = new Map<string, boolean>();
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

  constructor(
    private readonly ast: StoryFile,
    private readonly diagnostics: DiagnosticBag,
  ) {}

  run(): StoryIR {
    this.collect();

    const ir: StoryIR = {
      format: IR_FORMAT,
      meta: {
        title: this.ast.header?.title ?? '',
        author: this.ast.header?.author ?? '',
        fields: this.ast.header?.fields ?? {},
      },
      story: {
        states: this.storyStates,
        reversible: this.ast.header?.statesReversible ?? false,
      },
      entities: [],
      conditions: [],
      phrases: { defaultLocale: DEFAULT_LOCALE, locales: {} },
      verbs: [],
      hatches: [],
      traits: [],
      actions: [],
      scores: this.scoreDecls,
      sequences: [],
      hasHatches: false,
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
            condition: this.resolveCondition(decl.condition, TOP_SCOPE),
            span: decl.span,
          });
          break;
        case 'define-verb':
          ir.verbs.push({
            verbs: decl.verbs,
            pattern: decl.pattern.map((p) => ({ kind: p.kind, word: p.word })),
            span: decl.span,
          });
          break;
        case 'define-text':
          ir.hatches.push({ name: decl.name, modulePath: decl.modulePath, hatchKind: 'text', span: decl.span });
          break;
        case 'define-hatch':
          ir.hatches.push({ name: decl.name, modulePath: decl.modulePath, hatchKind: decl.hatchKind, span: decl.span });
          break;
        case 'define-trait':
          ir.traits.push(this.buildTrait(decl));
          break;
        case 'define-action':
          ir.actions.push(this.buildAction(decl));
          break;
        case 'define-sequence':
          ir.sequences.push({
            name: decl.name.join(' '),
            // Decision 10: sequences are story-owned — narration broadcasts.
            narration: 'broadcast',
            steps: decl.steps.map((step) => ({
              timing: step.timing,
              turns: step.turns,
              anchor: this.resolveStepAnchor(step),
              body: step.body.map((s) => this.resolveStatement(s, TOP_SCOPE)),
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
        case 'define-phrases':
          break; // collected in pass 1
      }
    }

    for (const [locale, table] of this.phrases) {
      ir.phrases.locales[locale] = Object.fromEntries(table);
    }
    ir.hasHatches = ir.hatches.length > 0;

    this.checkMarkers();
    this.checkDescriptionMarkers();
    return ir;
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
      onClauses: this.checkDuplicateClauses(decl.onClauses, `trait \`${decl.name}\``).map((c) => this.buildOnClause(c, scope)),
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
      let key = `${clause.clauseKind}|${clause.action}|${clause.binding}|${clause.role ?? ''}`;
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

  private buildAction(decl: DefineAction): IRActionDef {
    const slots = this.actionSlots.get(decl.name) ?? new Set<string>();
    const scope: Scope = { owner: null, fields: null, slots, ownStates: null, scoreOwner: `action.${decl.name}`, inEach: false };

    for (const constraint of decl.constraints) {
      if (!slots.has(constraint.slot)) {
        this.diagnostics.error(
          'analysis.unknown-slot',
          `\`${constraint.slot}\` is not a grammar slot of \`${decl.name}\` — slots: ${[...slots].join(', ') || '(none)'}${this.suggestText(constraint.slot, [...slots])}.`,
          constraint.span,
        );
      }
    }

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
        parts: p.parts.map((part) => ({ kind: part.kind, word: part.word })),
        cardinality: p.cardinality,
      })),
      constraints: decl.constraints.map((sc) => ({ slot: sc.slot, requirement: sc.requirement })),
      musts,
      refusals,
      otherwise: decl.otherwise?.phraseKey ?? null,
      scores: decl.scores.map((s) => ({ name: `action.${decl.name}.${s.name}`, worth: s.worth, span: s.span })),
      body: decl.body.map((s) => this.resolveStatement(s, scope)),
      span: decl.span,
    };
  }

  // -------------------------------------------------------------- pass 1

  private collect(): void {
    // Story header: declared phases + story-owned scores (ratchet D2/D12).
    if (this.ast.header) {
      this.checkStateSet(this.ast.header.states, 'the story');
      this.storyStates = this.ast.header.states.map((s) => s.name);
      for (const s of this.ast.header.scores) this.collectScore(s.name, s.worth, s.span, null);
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
      else if (decl.kind === 'define-phrases') this.collectPhrasesBlock(decl);
      else if (decl.kind === 'define-phrase') this.collectPhraseDecl(decl);
      else if (decl.kind === 'define-trait') {
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
        this.registerPhrase(DEFAULT_LOCALE, `${e.id}.description`, {
          strategy: null,
          variants: [this.variantOf(e.decl.description)],
          span: e.decl.description.span,
        });
      }
      if (e.decl.initialDescription) {
        // Z1: the `first time` prose — first-visit description, its own key.
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
    }
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
    if (this.byId.has(id)) {
      this.diagnostics.error('analysis.duplicate-entity', `An entity named \`${nameWords.join(' ')}\` already exists.`, decl.name.span);
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
    this.registerPhrase(DEFAULT_LOCALE, decl.key, {
      strategy: (decl.strategy as IRPhrase['strategy']) ?? null,
      ...(decl.verbatim ? { verbatim: true } : {}),
      variants: decl.variants.map((v) => this.variantOf(v)),
      span: decl.span,
    });
  }

  private variantOf(value: TextValue): { text: string; markers: string[] } {
    return { text: value.text, markers: value.markers.map((m) => m.content) };
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

  private buildEntity(decl: CreateDecl): IREntity {
    const sym = this.byId.get(decl.name.words.join('-').toLowerCase());
    const id = sym?.id ?? decl.name.words.join('-').toLowerCase();
    const isPlayer = decl.name.words.length === 1 && decl.name.words[0].toLowerCase() === 'player';

    const kinds = [];
    const traits = [];
    for (const comp of decl.compositions) {
      const built = {
        name: comp.words.join(' ').toLowerCase(),
        config: comp.config.map((c) => ({ key: c.key.join(' '), value: c.value, valueKind: c.valueKind })),
        condition: comp.condition ? this.resolveCondition(comp.condition, entityScope(sym ?? null)) : null,
        span: comp.span,
      };
      if (comp.article) kinds.push(built);
      else traits.push(built);
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

    return {
      id,
      name: decl.name.words.join(' '),
      article: decl.name.article,
      aka: decl.aka,
      isPlayer,
      kinds,
      traits,
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
      exits: decl.exits.map((e) => ({ direction: e.direction, to: this.resolveEntityId(e.to) ?? '', span: e.span })),
      blockedExits: decl.blockedExits.map((b) => {
        this.requirePhrase(b.phraseKey, b.span);
        return {
          direction: b.direction,
          phraseKey: b.phraseKey,
          condition: b.condition ? this.resolveCondition(b.condition, entityScope(sym ?? null)) : null,
          span: b.span,
        };
      }),
      deadlyExits: decl.deadlyExits.map((d) => {
        this.requirePhrase(d.phraseKey, d.span);
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
      descriptionKey: decl.description ? `${id}.description` : null,
      initialDescriptionKey: decl.initialDescription ? `${id}.initial-description` : null,
      onClauses: this.checkDuplicateClauses(decl.onClauses, decl.name.words.join(' ').toLowerCase()).map((c) =>
        this.buildOnClause(c, entityScope(sym ?? null)),
      ),
      span: decl.span,
    };
  }

  private buildOnClause(clause: OnClause, scope: Scope): IROnClause {
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

    const condition = clause.condition ? this.resolveCondition(clause.condition, clauseScope) : null;
    const body = clause.body.map((s) => this.resolveStatement(s, clauseScope));
    this.checkPhaseOrder(clause.body, { mutated: false });
    return {
      clauseKind: clause.clauseKind,
      once: clause.once,
      action: clause.action,
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
   * Phase-order rule (§5.3 gate 4): within an `on` block, `refuse` must
   * precede the first mutation. Traversal is source order, descending into
   * nested blocks.
   */
  private checkPhaseOrder(body: Statement[], state: { mutated: boolean }): void {
    for (const stmt of body) {
      switch (stmt.kind) {
        case 'set':
        case 'change':
        case 'move':
        case 'remove':
        case 'award':
          state.mutated = true;
          break;
        case 'refuse':
        case 'must':
        case 'refuse-when':
          if (state.mutated) {
            this.diagnostics.error(
              'analysis.refusal-after-mutation',
              `Refusal after mutation — move the check above the first set/change/move (\`${stmt.kind === 'must' ? 'must' : `refuse ${stmt.phraseKey}`}\` must precede mutations).`,
              stmt.span,
            );
          }
          break;
        case 'select-on':
          for (const arm of stmt.arms) this.checkPhaseOrder(arm.body, state);
          break;
        case 'select-strategy':
          for (const alt of stmt.alternatives) this.checkPhaseOrder(alt, state);
          break;
        case 'ordinal':
          this.checkPhaseOrder(stmt.body, state);
          break;
        case 'each':
          // The block's body mutates per match — refusals after it (or
          // inside it, after a mutation) violate the phase order.
          this.checkPhaseOrder(stmt.body, state);
          break;
        default:
          break;
      }
    }
  }

  // ----------------------------------------------------------- statements

  private resolveStatement(stmt: Statement, scope: Scope): IRStatement {
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
      case 'emit':
        return { kind: 'emit', event: stmt.event.join(' '), stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
      case 'set':
        return {
          kind: 'set',
          target: this.resolveValue(stmt.target, scope),
          value: this.resolveValue(stmt.value, scope),
          span: stmt.span,
        };
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
          place: this.resolveEntityValue(stmt.place, scope),
          stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope),
          span: stmt.span,
        };
      case 'award': {
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
      case 'win':
      case 'lose':
      case 'kill':
        if (stmt.phraseKey) this.requirePhrase(stmt.phraseKey, stmt.span, scope.owner);
        return { kind: stmt.kind, phraseKey: stmt.phraseKey, stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
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
          arms: stmt.arms.map((a) => ({
            value: a.value,
            body: a.body.map((s) => this.resolveStatement(s, scope)),
            span: a.span,
          })),
          span: stmt.span,
        };
      }
      case 'select-strategy':
        return {
          kind: 'select-strategy',
          strategy: stmt.strategy,
          alternatives: stmt.alternatives.map((alt) => alt.map((s) => this.resolveStatement(s, scope))),
          span: stmt.span,
        };
      case 'ordinal':
        return {
          kind: 'ordinal',
          ordinal: stmt.ordinal,
          body: stmt.body.map((s) => this.resolveStatement(s, scope)),
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
          body: stmt.body.map((s) => this.resolveStatement(s, eachScope)),
          span: stmt.span,
        };
      }
    }
  }

  /** Resolve a statement `when` suffix (ratchet D7), or null. */
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
      case 'possessive':
        return {
          kind: 'field',
          base: this.resolveValue(expr.base, scope),
          field: expr.field.join(' '),
        };
      case 'ref':
        return this.resolveRefValue(expr.ref, scope);
      case 'bare': {
        const scoped = this.resolveScopedWords(expr.words, scope);
        return scoped ?? { kind: 'symbol', name: expr.words.join(' ') };
      }
      case 'match':
        return this.resolveMatch(expr.span, scope);
    }
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
        '`the match` is the `each`-block binder — outside an `each` body there is no match to reference. Use `it` for the clause owner, or name the entity.',
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
  private resolveScopedWords(rawWords: string[], scope: Scope): IRValue | null {
    const joined = rawWords.join(' ').toLowerCase();
    if (scope.fields?.has(joined)) {
      return { kind: 'field', base: { kind: 'it' }, field: joined };
    }
    if (rawWords.length === 1) {
      const word = rawWords[0].toLowerCase();
      if (scope.slots?.has(word)) return { kind: 'slot', name: word };
      // `the actor` — the acting entity, always bound inside trait/action
      // clauses (design.md §2.2 role vocabulary).
      if (word === 'actor' && (scope.fields !== null || scope.slots !== null)) {
        return { kind: 'slot', name: 'actor' };
      }
    }
    return null;
  }

  private resolveRefValue(ref: NameRef, scope: Scope): IRValue {
    const words = ref.words.map((w) => w.toLowerCase());
    if (words.length === 1 && words[0] === 'it') return { kind: 'it' };
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
      return { kind: 'field', base: { kind: 'it' }, field: words.slice(1).join(' ') };
    }
    const scoped = this.resolveScopedWords(ref.words, scope);
    if (scoped) return scoped;
    const id = this.resolveEntityId(ref);
    if (id !== null) return id === 'player' ? { kind: 'player' } : { kind: 'entity', id };
    return { kind: 'symbol', name: ref.words.join(' ') };
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
    if (PLAYER_WORDS.has(lower)) {
      const player = this.entities.find((e) => e.id === 'player');
      if (player) return player.id;
    }

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
      case 'predicate': {
        const subject = this.resolveValue(cond.subject, scope);
        switch (cond.predicate.kind) {
          case 'is': {
            const object = this.resolveIsObject(cond.predicate.value, subject, scope, cond.predicate.span);
            return { kind: 'predicate', pred: 'is', negated: cond.predicate.negated, subject, object };
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
              object: this.resolveEntityValue(cond.predicate.place, scope),
            };
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
      const subjectEntity =
        subject.kind === 'entity' ? this.byId.get(subject.id) : subject.kind === 'it' ? scope.owner : null;
      // Trait scope: `it` validates against the trait's own declared states
      // (ratchet D8) when no concrete owner entity is in scope.
      const validStates = subjectEntity?.states ?? (subject.kind === 'it' ? scope.ownStates ?? [] : []);
      if (validStates.includes(word)) return { kind: 'symbol', name: word };
      if (TRAIT_ADJECTIVES.has(word)) return { kind: 'symbol', name: word };
      // State adjectives (ratchet D1): read live from world trait state.
      if (STATE_ADJECTIVES.has(word)) return { kind: 'symbol', name: word };
      const exactEntity = this.entities.find((e) => e.nameLower === word.toLowerCase() || e.aka.includes(word.toLowerCase()));
      if (exactEntity) return { kind: 'entity', id: exactEntity.id };
      const valid = [...validStates, ...TRAIT_ADJECTIVES, ...STATE_ADJECTIVES];
      this.diagnostics.error(
        'analysis.unknown-value',
        `\`${word}\` is not a state${subjectEntity ? ` of ${subjectEntity.nameLower}` : ''} or a known trait${this.suggestText(word, valid)}.`,
        span,
      );
      return { kind: 'symbol', name: word };
    }
    return this.resolveValue(expr, scope);
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
            if (this.phrases.get(DEFAULT_LOCALE)?.has(marker)) continue;
            this.diagnostics.error(
              'analysis.unbound-marker',
              `\`{${marker}}\` in phrase \`${key}\` is not a declared text producer or phrase${this.suggestText(marker, [...this.hatchNames])}.`,
              phrase.span,
            );
          }
        }
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
