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
  DefineCondition,
  DefinePhrase,
  DefinePhrases,
  NameRef,
  OnClause,
  Statement,
  StoryFile,
  TextValue,
  ValueExpr,
  WhenRule,
} from './ast';
import { EVENT_VERBS, TRAIT_ADJECTIVES } from './catalog';
import { DiagnosticBag } from './diagnostics';
import {
  IR_FORMAT,
  IRCondition,
  IREntity,
  IRPhrase,
  IRRule,
  IRStatement,
  IRValue,
  StoryIR,
} from './ir';
import { Span } from './span';

/** Phase A stories register text in this locale (design.md §2.6). */
const DEFAULT_LOCALE = 'en-US';
const PLAYER_WORDS = new Set(['player', 'you', 'yourself']);

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
      entities: [],
      conditions: [],
      phrases: { defaultLocale: DEFAULT_LOCALE, locales: {} },
      verbs: [],
      hatches: [],
      flags: [],
      rules: [],
    };

    for (const decl of this.ast.declarations) {
      switch (decl.kind) {
        case 'create':
          ir.entities.push(this.buildEntity(decl));
          break;
        case 'define-condition':
          ir.conditions.push({
            name: decl.name,
            condition: this.resolveCondition(decl.condition, null),
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
          ir.hatches.push({ name: decl.name, modulePath: decl.modulePath, span: decl.span });
          break;
        case 'define-flag':
          ir.flags.push({ name: decl.name, initial: decl.initial, span: decl.span });
          break;
        case 'when-rule': {
          const rule = this.buildRule(decl);
          if (rule) ir.rules.push(rule);
          break;
        }
        case 'define-phrase':
        case 'define-phrases':
          break; // collected in pass 1
      }
    }

    for (const [locale, table] of this.phrases) {
      ir.phrases.locales[locale] = Object.fromEntries(table);
    }

    this.checkMarkers();
    return ir;
  }

  // -------------------------------------------------------------- pass 1

  private collect(): void {
    for (const decl of this.ast.declarations) {
      if (decl.kind === 'create') this.collectEntity(decl);
      else if (decl.kind === 'define-condition') this.conditionNames.add(decl.name);
      else if (decl.kind === 'define-text') this.hatchNames.add(decl.name);
      else if (decl.kind === 'define-phrases') this.collectPhrasesBlock(decl);
      else if (decl.kind === 'define-phrase') this.collectPhraseDecl(decl);
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
      variants: decl.variants.map((v) => this.variantOf(v)),
      span: decl.span,
    });
  }

  private variantOf(value: TextValue): { text: string; markers: string[] } {
    return { text: value.text, markers: value.markers.map((m) => m.content) };
  }

  private registerPhrase(locale: string, key: string, phrase: IRPhrase): void {
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
        condition: comp.condition ? this.resolveCondition(comp.condition, sym ?? null) : null,
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
        return { direction: b.direction, phraseKey: b.phraseKey, span: b.span };
      }),
      states: decl.states.map((s) => s.name),
      descriptionKey: decl.description ? `${id}.description` : null,
      onClauses: decl.onClauses.map((c) => this.buildOnClause(c, sym ?? null)),
      span: decl.span,
    };
  }

  private buildOnClause(clause: OnClause, owner: EntitySymbol | null): IREntity['onClauses'][number] {
    const body = clause.body.map((s) => this.resolveStatement(s, owner));
    this.checkPhaseOrder(clause.body, { mutated: false });
    return { action: clause.action, body, span: clause.span };
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
          if (state.mutated) {
            this.diagnostics.error(
              'analysis.refusal-after-mutation',
              `Refusal after mutation — move the check above the first set/change/move (\`refuse ${stmt.phraseKey}\` must precede mutations).`,
              stmt.span,
            );
          }
          break;
        case 'if':
          this.checkPhaseOrder(stmt.then, state);
          if (stmt.else) this.checkPhaseOrder(stmt.else, state);
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

  // ---------------------------------------------------------------- rules

  private buildRule(rule: WhenRule): IRRule | null {
    const verbIndex = rule.headerWords.findIndex((w) => EVENT_VERBS.has(w));
    if (verbIndex === -1) {
      this.diagnostics.error(
        'analysis.unknown-event',
        `No known event verb in \`when ${rule.headerWords.join(' ')}\` — Phase A knows: ${[...EVENT_VERBS].join(', ')}.`,
        rule.headerSpan,
      );
      return null;
    }
    const actorWords = rule.headerWords.slice(0, verbIndex);
    const targetWords = rule.headerWords.slice(verbIndex + 1);
    const actor = this.resolveWordsAsValue(actorWords, rule.headerSpan);
    const targetRef = this.stripArticle(targetWords);
    const target = targetRef.length
      ? this.resolveEntityId({ kind: 'name', article: null, words: targetRef, span: rule.headerSpan })
      : null;
    if (target === null) {
      return null; // resolveEntityId already reported
    }

    return {
      actor,
      verb: rule.headerWords[verbIndex],
      target,
      condition: rule.condition ? this.resolveCondition(rule.condition, null) : null,
      body: rule.body.map((s) => this.resolveStatement(s, null)),
      span: rule.span,
    };
  }

  private stripArticle(words: string[]): string[] {
    return words.length > 0 && ['the', 'a', 'an'].includes(words[0].toLowerCase()) ? words.slice(1) : words;
  }

  private resolveWordsAsValue(words: string[], span: Span): IRValue {
    const stripped = this.stripArticle(words);
    if (stripped.length === 1 && PLAYER_WORDS.has(stripped[0].toLowerCase())) return { kind: 'player' };
    const id = this.resolveEntityId({ kind: 'name', article: null, words: stripped, span });
    return id ? { kind: 'entity', id } : { kind: 'symbol', name: stripped.join(' ') };
  }

  // ----------------------------------------------------------- statements

  private resolveStatement(stmt: Statement, owner: EntitySymbol | null): IRStatement {
    switch (stmt.kind) {
      case 'refuse':
      case 'phrase': {
        this.requirePhrase(stmt.phraseKey, stmt.span, owner);
        return {
          kind: stmt.kind,
          phraseKey: stmt.phraseKey,
          params: stmt.params.map((p) => ({
            param: p.param.join(' '),
            value: this.resolveValue(p.value, owner),
            span: p.span,
          })),
          span: stmt.span,
        };
      }
      case 'emit':
        return { kind: 'emit', event: stmt.event.join(' '), span: stmt.span };
      case 'set':
        return {
          kind: 'set',
          target: this.resolveValue(stmt.target, owner),
          value: this.resolveValue(stmt.value, owner),
          span: stmt.span,
        };
      case 'change': {
        const entity = this.resolveEntityValue(stmt.entity, owner);
        const sym = entity.kind === 'entity' ? this.byId.get(entity.id) : entity.kind === 'it' ? owner : null;
        if (sym && !sym.states.includes(stmt.state)) {
          this.diagnostics.error(
            'analysis.undeclared-state',
            `\`${stmt.state}\` is not a declared state of ${sym.nameLower}${this.suggestText(stmt.state, sym.states)}.`,
            stmt.span,
          );
        }
        return { kind: 'change', entity, state: stmt.state, span: stmt.span };
      }
      case 'move':
        return {
          kind: 'move',
          entity: this.resolveEntityValue(stmt.entity, owner),
          place: this.resolveEntityValue(stmt.place, owner),
          span: stmt.span,
        };
      case 'award':
        return { kind: 'award', expression: stmt.expression, once: stmt.once, span: stmt.span };
      case 'win':
      case 'lose':
        if (stmt.phraseKey) this.requirePhrase(stmt.phraseKey, stmt.span, owner);
        return { kind: stmt.kind, phraseKey: stmt.phraseKey, span: stmt.span };
      case 'if':
        return {
          kind: 'if',
          condition: this.resolveCondition(stmt.condition, owner),
          then: stmt.then.map((s) => this.resolveStatement(s, owner)),
          else: stmt.else ? stmt.else.map((s) => this.resolveStatement(s, owner)) : null,
          span: stmt.span,
        };
      case 'select-on': {
        const subject = this.resolveValue(stmt.subject, owner);
        const stateOwner = this.stateOwnerOf(subject, owner);
        for (const arm of stmt.arms) {
          if (stateOwner && !stateOwner.states.includes(arm.value)) {
            this.diagnostics.error(
              'analysis.undeclared-state',
              `\`${arm.value}\` is not a declared state of ${stateOwner.nameLower}${this.suggestText(arm.value, stateOwner.states)}.`,
              arm.span,
            );
          }
        }
        return {
          kind: 'select-on',
          subject,
          arms: stmt.arms.map((a) => ({
            value: a.value,
            body: a.body.map((s) => this.resolveStatement(s, owner)),
            span: a.span,
          })),
          span: stmt.span,
        };
      }
      case 'select-strategy':
        return {
          kind: 'select-strategy',
          strategy: stmt.strategy,
          alternatives: stmt.alternatives.map((alt) => alt.map((s) => this.resolveStatement(s, owner))),
          span: stmt.span,
        };
      case 'ordinal':
        return {
          kind: 'ordinal',
          ordinal: stmt.ordinal,
          body: stmt.body.map((s) => this.resolveStatement(s, owner)),
          span: stmt.span,
        };
    }
  }

  /** The entity whose `states:` list governs a select-on subject, if determinable. */
  private stateOwnerOf(subject: IRValue, owner: EntitySymbol | null): EntitySymbol | null {
    if (subject.kind === 'field' && subject.field === 'state') {
      if (subject.base.kind === 'it') return owner;
      if (subject.base.kind === 'entity') return this.byId.get(subject.base.id) ?? null;
    }
    return null;
  }

  // ------------------------------------------------------------- values

  private resolveValue(expr: ValueExpr, owner: EntitySymbol | null): IRValue {
    switch (expr.kind) {
      case 'literal':
        return { kind: 'literal', value: expr.value, valueType: expr.literalKind };
      case 'possessive':
        return {
          kind: 'field',
          base: this.resolveValue(expr.base, owner),
          field: expr.field.join(' '),
        };
      case 'ref':
        return this.resolveRefValue(expr.ref, owner);
      case 'bare':
        return { kind: 'symbol', name: expr.words.join(' ') };
    }
  }

  private resolveRefValue(ref: NameRef, owner: EntitySymbol | null): IRValue {
    const words = ref.words.map((w) => w.toLowerCase());
    if (words.length === 1 && words[0] === 'it') return { kind: 'it' };
    if (words.length === 1 && PLAYER_WORDS.has(words[0])) return { kind: 'player' };
    const id = this.resolveEntityId(ref);
    if (id !== null) return id === 'player' ? { kind: 'player' } : { kind: 'entity', id };
    return { kind: 'symbol', name: ref.words.join(' ') };
  }

  private resolveEntityValue(ref: NameRef, owner: EntitySymbol | null): IRValue {
    const value = this.resolveRefValue(ref, owner);
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

  private resolveCondition(cond: ConditionNode, owner: EntitySymbol | null): IRCondition {
    switch (cond.kind) {
      case 'or':
      case 'and':
        return { kind: cond.kind, operands: cond.operands.map((o) => this.resolveCondition(o, owner)) };
      case 'not':
        return { kind: 'not', operand: this.resolveCondition(cond.operand, owner) };
      case 'chance':
        return { kind: 'chance', n: cond.n };
      case 'condition-ref': {
        if (!this.conditionNames.has(cond.name)) {
          this.diagnostics.error(
            'analysis.unknown-condition',
            `\`${cond.name}\` is not a declared condition${this.suggestText(cond.name, [...this.conditionNames])}.`,
            cond.span,
          );
        }
        return { kind: 'condition', name: cond.name };
      }
      case 'predicate': {
        const subject = this.resolveValue(cond.subject, owner);
        switch (cond.predicate.kind) {
          case 'is': {
            const object = this.resolveIsObject(cond.predicate.value, subject, owner, cond.predicate.span);
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
              object: this.resolveEntityValue(cond.predicate.place, owner),
            };
          case 'has':
          case 'holds':
          case 'wears':
            return {
              kind: 'predicate',
              pred: cond.predicate.kind,
              negated: false,
              subject,
              object: this.resolveEntityValue(cond.predicate.thing, owner),
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
  private resolveIsObject(expr: ValueExpr, subject: IRValue, owner: EntitySymbol | null, span: Span): IRValue {
    if (expr.kind === 'literal') return this.resolveValue(expr, owner);

    const words =
      expr.kind === 'ref' ? expr.ref.words : expr.kind === 'bare' ? expr.words : null;
    if (words && words.length === 1) {
      const word = words[0];
      const subjectEntity =
        subject.kind === 'entity' ? this.byId.get(subject.id) : subject.kind === 'it' ? owner : null;
      const validStates = subjectEntity?.states ?? [];
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
    return this.resolveValue(expr, owner);
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
          for (const marker of variant.markers) {
            if (!/^[a-z][a-z0-9-]*$/.test(marker)) continue;
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
