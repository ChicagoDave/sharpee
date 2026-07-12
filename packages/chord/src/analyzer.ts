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
  Statement,
  StoryFile,
  TextValue,
  TraitField,
  ValueExpr,
} from './ast';
import { TRAIT_ADJECTIVES } from './catalog';
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
}

const TOP_SCOPE: Scope = { owner: null, fields: null, slots: null, ownStates: null, scoreOwner: null };

function entityScope(owner: EntitySymbol | null): Scope {
  return { owner, fields: null, slots: null, ownStates: null, scoreOwner: owner?.id ?? null };
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
  decl: CreateDecl;
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
      flags: [],
      rules: [],
      traits: [],
      actions: [],
      scores: this.scoreDecls,
      onceRules: [],
      everyRules: [],
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
        case 'define-phrases':
          break; // collected in pass 1
      }
    }

    for (const [locale, table] of this.phrases) {
      ir.phrases.locales[locale] = Object.fromEntries(table);
    }
    ir.hasHatches = ir.hatches.length > 0;

    this.checkMarkers();
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
    const scope: Scope = {
      owner: null,
      fields,
      slots: null,
      ownStates: decl.states.length ? decl.states.map((s) => s.name) : null,
      scoreOwner: `trait.${decl.name}`,
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
      onClauses: decl.onClauses.map((c) => this.buildOnClause(c, scope)),
      span: decl.span,
    };
  }

  private buildAction(decl: DefineAction): IRActionDef {
    const slots = this.actionSlots.get(decl.name) ?? new Set<string>();
    const scope: Scope = { owner: null, fields: null, slots, ownStates: null, scoreOwner: `action.${decl.name}` };

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
        if (decl.states.length) this.traitStates.set(decl.name, decl.states.map((s) => s.name));
        for (const s of decl.scores) this.collectScore(s.name, s.worth, s.span, `trait.${decl.name}`);
        if (decl.phrases) this.collectPhrasesBlock(decl.phrases);
        for (const clause of decl.onClauses) this.collectInlineTexts(clause.body);
      }
      else if (decl.kind === 'define-action') {
        const slots = new Set<string>();
        for (const pattern of decl.patterns) {
          for (const part of pattern.parts) if (part.kind === 'slot') slots.add(part.word);
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
    for (const e of this.entities) {
      for (const comp of e.decl.compositions) {
        if (comp.article) continue; // kind noun, not a trait
        const states = this.traitStates.get(comp.words.join(' ').toLowerCase());
        if (states) {
          for (const s of states) if (!e.states.includes(s)) e.states.push(s);
        }
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
      for (const override of e.decl.phraseOverrides) {
        this.registerPhrase(DEFAULT_LOCALE, `${e.id}.${override.key}`, {
          strategy: null,
          variants: [this.variantOf(override.value)],
          span: override.span,
        });
      }
      for (const clause of e.decl.onClauses) this.collectInlineTexts(clause.body);
    }
  }

  /**
   * Declare-and-emit sugar (§2.6): a `phrase <key>` statement carrying an
   * indented prose block registers the key at load — collected in pass 1 so
   * pass 2's phrase-coverage gate sees it.
   */
  private collectInlineTexts(body: Statement[]): void {
    for (const stmt of body) {
      switch (stmt.kind) {
        case 'phrase':
          if (stmt.inlineText) {
            this.registerPhrase(DEFAULT_LOCALE, stmt.phraseKey, {
              strategy: null,
              variants: [this.variantOf(stmt.inlineText)],
              span: stmt.inlineText.span,
            });
          }
          break;
        case 'select-on':
          for (const arm of stmt.arms) this.collectInlineTexts(arm.body);
          break;
        case 'select-strategy':
          for (const alt of stmt.alternatives) this.collectInlineTexts(alt);
          break;
        case 'ordinal':
          this.collectInlineTexts(stmt.body);
          break;
        default:
          break;
      }
    }
  }

  private collectEntity(decl: CreateDecl): void {
    const nameWords = decl.name.words;
    const id = nameWords.join('-').toLowerCase();
    if (this.byId.has(id)) {
      this.diagnostics.error('analysis.duplicate-entity', `An entity named \`${nameWords.join(' ')}\` already exists.`, decl.name.span);
      return;
    }
    const sym: EntitySymbol = {
      id,
      nameLower: nameWords.join(' ').toLowerCase(),
      nameWords: nameWords.map((w) => w.toLowerCase()),
      aka: decl.aka.map((a) => a.toLowerCase()),
      states: decl.states.map((s) => s.name),
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

    return {
      id,
      name: decl.name.words.join(' '),
      article: decl.name.article,
      aka: decl.aka,
      isPlayer,
      kinds,
      traits,
      placement: decl.placement
        ? {
            relation: decl.placement.relation,
            place: this.resolveEntityId(decl.placement.place) ?? '',
            span: decl.placement.span,
          }
        : null,
      wears: decl.wears.map((w) => this.resolveEntityId(w) ?? '').filter((w) => w !== ''),
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
      // Merged set: own `states:` plus every composed trait's declared
      // states (ratchet D8) — the loader initializes from states[0].
      states: sym ? sym.states : decl.states.map((s) => s.name),
      descriptionKey: decl.description ? `${id}.description` : null,
      onClauses: decl.onClauses.map((c) => this.buildOnClause(c, entityScope(sym ?? null))),
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
        }
        return { kind: 'change', entity, state: stmt.state, stmtWhen: this.resolveStmtWhen(stmt.stmtWhen, scope), span: stmt.span };
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
        // Prohibition (D6): refuse with the key while the hazard holds. The
        // negated-requirement gate (top-level `not`) lands in Phase 3.
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
        const fieldValues = this.fieldValueSet(subject, scope);
        for (const arm of stmt.arms) {
          if (stateOwner && !stateOwner.states.includes(arm.value)) {
            this.diagnostics.error(
              'analysis.undeclared-state',
              `\`${arm.value}\` is not a declared state of ${stateOwner.nameLower}${this.suggestText(arm.value, stateOwner.states)}.`,
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
    }
  }

  /** Resolve a statement `when` suffix (ratchet D7), or null. */
  private resolveStmtWhen(cond: ConditionNode | null, scope: Scope): IRCondition | null {
    return cond ? this.resolveCondition(cond, scope) : null;
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
    }
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
              `\`${cond.name}\` is an open condition (it references \`it\`) — here there is no \`it\` to test. Use \`any ${cond.name}\` in a selection position, or a closed condition.`,
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
        }
      }
    }
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
      const subjectEntity =
        subject.kind === 'entity' ? this.byId.get(subject.id) : subject.kind === 'it' ? scope.owner : null;
      // Trait scope: `it` validates against the trait's own declared states
      // (ratchet D8) when no concrete owner entity is in scope.
      const validStates = subjectEntity?.states ?? (subject.kind === 'it' ? scope.ownStates ?? [] : []);
      if (validStates.includes(word)) return { kind: 'symbol', name: word };
      if (TRAIT_ADJECTIVES.has(word)) return { kind: 'symbol', name: word };
      const exactEntity = this.entities.find((e) => e.nameLower === word.toLowerCase() || e.aka.includes(word.toLowerCase()));
      if (exactEntity) return { kind: 'entity', id: exactEntity.id };
      const valid = [...validStates, ...TRAIT_ADJECTIVES];
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

  // ---------------------------------------------------------- suggestions

  /** `— did you mean \`x\`?` when a near match exists, else empty. */
  private suggestText(input: string, candidates: string[]): string {
    const best = nearest(input, candidates);
    return best ? ` — did you mean \`${best}\`?` : '';
  }
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
