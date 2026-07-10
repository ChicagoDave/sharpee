/**
 * runtime.ts — the Chord turn-by-turn runtime (Phase 5).
 *
 * Purpose: bind compiled behavior to a live world — `when` rules as keyed
 * event chains, entity `on`-clauses as ActionInterceptors (the §5.4
 * standard-semantics half; the CapabilityBehavior half is Phase B),
 * ordinal occurrence counters in world state, derived `dark while`
 * recomputation, and phrase emission with strategy Choice atoms and
 * hatch producers as params.
 *
 * Public interface: ChordRuntime.
 * Owner context: @sharpee/story-loader.
 *
 * Invariants:
 * - All registration is per-world and keyed/idempotent (ADR-207/208).
 * - Occurrence and RNG state live in world state only — the runtime holds
 *   no turn-scoped mutable fields, so save/restore needs no runtime hooks.
 * - Select decisions are snapshotted before the execute phase so a
 *   mutation inside an arm cannot re-route the report phase (§5.4).
 */
import type { IREntity, IROnClause, IRRule, IRStatement, IRValue, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { Choice, Literal, PhraseProducer, StoryEndingKind } from '@sharpee/if-domain';
import {
  ActionInterceptor,
  CapabilityEffect,
  IFEntity,
  ITrait,
  InterceptorReportResult,
  InterceptorResult,
  InterceptorSharedData,
  ReadableTrait,
  RoomTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import { Evaluator, EvalContext } from './evaluator';
import { LoadError } from './errors';
import {
  CHORD_FLAG_PREFIX,
  CHORD_OCCURRENCE_PREFIX,
  CHORD_STATE_PREFIX,
} from './state-keys';

/** Chord strategy adverb → phrase-algebra Choice selector (ADR-196). */
const STRATEGY_SELECTOR: Record<string, Choice['selector']> = {
  randomly: 'random',
  cycling: 'cycling',
  ordered: 'stopping',
  once: 'firstTime',
};

/** Phase A event-verb → trigger event type (Interface Contract 2 slice). */
const EVENT_TRIGGERS: Record<string, string> = {
  enters: 'if.event.actor_moved',
};

/** Marker trait carried by entities with compiled `on` clauses. */
export class ChordBehaviorTrait implements ITrait {
  static readonly type = 'chord.behavior';
  readonly type = ChordBehaviorTrait.type;
}

/** Hooks the runtime needs from the story (implemented by ChordStory). */
export interface RuntimeHost {
  entityId(irId: string): string | undefined;
  irIdOf(worldId: string): string | undefined;
  producers: Map<string, PhraseProducer>;
  triggerEnding(world: WorldModel, ending: StoryEndingKind, messageId?: string): ISemanticEvent;
}

interface ExecContext extends EvalContext {
  /** Occurrence count of the enclosing rule firing (ordinal blocks test it). */
  occurrence?: number;
  /** Pre-mutation select-on decisions, keyed by statement identity. */
  decisions?: Map<IRStatement, string>;
}

export class ChordRuntime {
  private eventSeq = 0;

  constructor(
    private readonly ir: StoryIR,
    private readonly host: RuntimeHost,
    private readonly evaluator: Evaluator,
  ) {}

  // ------------------------------------------------------------------ bind

  /** Register rules, on-clause interceptors, and derived-property chains. */
  bind(world: WorldModel): void {
    this.ir.rules.forEach((rule, index) => this.bindRule(world, rule, index));

    for (const entity of this.ir.entities) {
      for (const clause of entity.onClauses) {
        this.bindOnClause(world, entity, clause);
      }
    }

    // Derived `dark while` — recompute when possession or location changes.
    if (this.derivedDarkRooms().length > 0) {
      for (const trigger of [
        'if.event.taken',
        'if.event.dropped',
        'if.event.worn',
        'if.event.removed',
        'if.event.put_on',
        'if.event.put_in',
        'if.event.actor_moved',
      ]) {
        world.chainEvent(
          trigger,
          (_event, w) => {
            this.recomputeDerived(w as WorldModel);
            return null;
          },
          { key: `chord.derived.${trigger}`, priority: 100 },
        );
      }
    }
  }

  // ----------------------------------------------------------------- rules

  private bindRule(world: WorldModel, rule: IRRule, index: number): void {
    this.forbidRefusals(rule.body, 'a `when` rule');
    const trigger = EVENT_TRIGGERS[rule.verb];
    if (!trigger) {
      throw new LoadError(`Event verb \`${rule.verb}\` has no trigger binding in the Phase A runtime.`, rule.span);
    }
    world.chainEvent(
      trigger,
      (event, w) => this.fireRule(rule, index, event, w as WorldModel),
      { key: `chord.rule.${index}` },
    );
  }

  /**
   * Evaluate one rule against a trigger event. Public-for-tests via
   * `fireRules`; the registered chain is the production path (the Phase 6
   * golden transcripts exercise it end-to-end).
   */
  private fireRule(rule: IRRule, index: number, event: ISemanticEvent, world: WorldModel): ISemanticEvent[] | null {
    const data = (event.data ?? {}) as Record<string, unknown>;
    const targetWorldId = this.host.entityId(rule.target);
    if (rule.verb === 'enters' && data.toRoom !== targetWorldId) return null;
    if (rule.actor.kind === 'player') {
      const actor = (event.entities as Record<string, unknown> | undefined)?.actor;
      const playerId = world.getPlayer()?.id;
      if (actor && playerId && actor !== playerId) return null;
    }

    const ctx: ExecContext = { world };
    if (rule.condition && !this.evaluator.evalCondition(rule.condition, ctx)) return null;

    const key = CHORD_OCCURRENCE_PREFIX + `rule.${index}`;
    const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
    world.setStateValue(key, occurrence);
    ctx.occurrence = occurrence;
    ctx.decisions = this.snapshotDecisions(rule.body, ctx);

    return this.execStatements(rule.body, ctx);
  }

  /** Test/debug entry: run every rule bound to this event. */
  fireRules(world: WorldModel, event: ISemanticEvent): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    this.ir.rules.forEach((rule, index) => {
      if (EVENT_TRIGGERS[rule.verb] !== event.type) return;
      const produced = this.fireRule(rule, index, event, world);
      if (produced) out.push(...produced);
    });
    return out;
  }

  // ------------------------------------------------------------ on-clauses

  private bindOnClause(world: WorldModel, entity: IREntity, clause: IROnClause): void {
    const worldId = this.host.entityId(entity.id);
    if (!worldId) throw new LoadError(`Entity \`${entity.id}\` has no world instance.`, clause.span);
    const target = world.getEntity(worldId);
    if (!target) throw new LoadError(`Entity \`${entity.id}\` vanished before binding.`, clause.span);

    if (!target.has(ChordBehaviorTrait.type)) {
      target.add(new ChordBehaviorTrait());
    }
    // `on reading it` targets must satisfy the reading action's trait gate.
    if (clause.action === 'reading' && !target.has(TraitType.READABLE)) {
      target.add(new ReadableTrait({ text: '' }));
    }

    world.registerActionInterceptor(
      ChordBehaviorTrait.type,
      `if.action.${clause.action}`,
      this.buildInterceptor(entity, clause),
    );
  }

  /**
   * Compile one `on` clause to an ActionInterceptor via the §5.4 partition:
   * leading refusals → preValidate; mutations → postExecute; phrase/emit/
   * win/lose → postReport (first phrase overrides the primary message).
   */
  private buildInterceptor(entity: IREntity, clause: IROnClause): ActionInterceptor {
    const runtime = this;
    const ownWorldId = () => runtime.host.entityId(entity.id);

    return {
      preValidate(target: IFEntity, world: WorldModel): InterceptorResult | null {
        if (target.id !== ownWorldId()) return null;
        const ctx: ExecContext = { world, it: entity.id };
        const refusal = runtime.findRefusal(clause.body, ctx);
        return refusal ? { valid: false, error: refusal } : null;
      },

      postValidate(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        if (target.id !== ownWorldId()) return null;
        const key = CHORD_OCCURRENCE_PREFIX + `on.${entity.id}.${clause.action}`;
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        world.setStateValue(key, occurrence);
        const ctx: ExecContext = { world, it: entity.id, occurrence };
        data.chordOccurrence = occurrence;
        data.chordDecisions = runtime.snapshotDecisions(clause.body, ctx);
        return null;
      },

      postExecute(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): void {
        if (target.id !== ownWorldId()) return;
        const ctx = runtime.restoreCtx(world, entity.id, data);
        runtime.execStatements(clause.body, ctx, 'mutations');
      },

      postReport(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        if (target.id !== ownWorldId()) return {};
        const ctx = runtime.restoreCtx(world, entity.id, data);
        const reports = runtime.execStatements(clause.body, ctx, 'reports');

        const result: InterceptorReportResult = {};
        const emit: CapabilityEffect[] = [];
        for (const event of reports) {
          const payload = (event.data ?? {}) as Record<string, unknown>;
          if (event.type === 'chord.phrase' && !result.override) {
            result.override = {
              messageId: String(payload.messageId),
              params: (payload.params as Record<string, unknown>) ?? {},
            };
          } else {
            emit.push({ type: event.type, payload });
          }
        }
        if (emit.length) result.emit = emit;
        return result;
      },
    };
  }

  private restoreCtx(world: WorldModel, itIrId: string, data: InterceptorSharedData): ExecContext {
    return {
      world,
      it: itIrId,
      occurrence: data.chordOccurrence as number | undefined,
      decisions: data.chordDecisions as Map<IRStatement, string> | undefined,
    };
  }

  // ------------------------------------------------------ derived (dark)

  private derivedDarkRooms(): Array<{ entity: IREntity; condition: NonNullable<IREntity['traits'][number]['condition']> }> {
    const out = [];
    for (const entity of this.ir.entities) {
      for (const trait of entity.traits) {
        if (trait.name === 'dark' && trait.condition) out.push({ entity, condition: trait.condition });
      }
    }
    return out;
  }

  /** Re-evaluate every `dark while` condition into `RoomTrait.isDark`. */
  recomputeDerived(world: WorldModel): void {
    for (const { entity, condition } of this.derivedDarkRooms()) {
      const worldId = this.host.entityId(entity.id);
      const room = worldId ? (world.getEntity(worldId)?.get(TraitType.ROOM) as RoomTrait | undefined) : undefined;
      if (!room) continue;
      room.isDark = this.evaluator.evalCondition(condition, { world });
    }
  }

  // ------------------------------------------------------------ statements

  /**
   * Execute a statement tree. `phase` narrows which leaves act:
   * 'mutations' applies change/set/move only; 'reports' collects
   * phrase/emit/win/lose only; 'all' (rules) does both in source order.
   */
  private execStatements(
    body: IRStatement[],
    ctx: ExecContext,
    phase: 'all' | 'mutations' | 'reports' = 'all',
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    for (const stmt of body) {
      switch (stmt.kind) {
        case 'phrase':
          if (phase !== 'mutations') events.push(this.phraseEvent(stmt.phraseKey, ctx));
          break;
        case 'emit':
          if (phase !== 'mutations') events.push(this.rawEvent(stmt.event, {}));
          break;
        case 'win':
        case 'lose':
          if (phase !== 'mutations') {
            if (stmt.phraseKey) events.push(this.phraseEvent(stmt.phraseKey, ctx));
            events.push(
              this.host.triggerEnding(ctx.world, stmt.kind === 'win' ? 'victory' : 'defeat', stmt.phraseKey ?? undefined),
            );
          }
          break;
        case 'change': {
          if (phase !== 'reports') {
            const irId = this.irIdOfValue(stmt.entity, ctx);
            ctx.world.setStateValue(CHORD_STATE_PREFIX + irId, stmt.state);
          }
          break;
        }
        case 'move': {
          if (phase !== 'reports') {
            const thing = this.evaluator.entityValue(stmt.entity, ctx);
            const place = this.evaluator.entityValue(stmt.place, ctx);
            ctx.world.moveEntity(thing, place);
          }
          break;
        }
        case 'set': {
          if (phase !== 'reports') {
            if (stmt.target.kind !== 'symbol') {
              throw new LoadError('`set` supports flags only in the Phase A runtime.', stmt.span);
            }
            ctx.world.setStateValue(CHORD_FLAG_PREFIX + stmt.target.name, this.evaluator.evalValue(stmt.value, ctx));
          }
          break;
        }
        case 'award':
          throw new LoadError('`award` is not part of the Phase A runtime (Phase B scoring).', stmt.span);
        case 'refuse':
          // Refusals are consumed by findRefusal (validate phase); reaching
          // one here means phase-order enforcement failed upstream.
          break;
        case 'if': {
          const decided = ctx.decisions?.get(stmt);
          const takeThen = decided !== undefined ? decided === 'then' : this.evaluator.evalCondition(stmt.condition, ctx);
          const branch = takeThen ? stmt.then : stmt.else;
          if (branch) events.push(...this.execStatements(branch, ctx, phase));
          break;
        }
        case 'select-on': {
          const decided = ctx.decisions?.get(stmt) ?? this.decideSelectOn(stmt, ctx);
          const arm = stmt.arms.find((a) => a.value === decided);
          if (arm) events.push(...this.execStatements(arm.body, ctx, phase));
          break;
        }
        case 'select-strategy': {
          const index = this.decideStrategy(stmt, ctx);
          const alternative = stmt.alternatives[index];
          if (alternative) events.push(...this.execStatements(alternative, ctx, phase));
          break;
        }
        case 'ordinal':
          if (ctx.occurrence === stmt.ordinal) {
            events.push(...this.execStatements(stmt.body, ctx, phase));
          }
          break;
      }
    }
    return events;
  }

  /** Leading-refusal scan (§5.4 validate partition). */
  private findRefusal(body: IRStatement[], ctx: ExecContext): string | null {
    for (const stmt of body) {
      if (stmt.kind === 'refuse') return stmt.phraseKey;
      if (stmt.kind === 'if') {
        const branch = this.evaluator.evalCondition(stmt.condition, ctx) ? stmt.then : stmt.else;
        if (branch) {
          const found = this.findRefusal(branch, ctx);
          if (found) return found;
        }
        continue;
      }
      break; // first non-refusal statement ends the validate partition
    }
    return null;
  }

  private forbidRefusals(body: IRStatement[], where: string): void {
    for (const stmt of body) {
      if (stmt.kind === 'refuse') {
        throw new LoadError(`\`refuse\` is not meaningful in ${where} — rules react after the action.`, stmt.span);
      }
      if (stmt.kind === 'if') {
        this.forbidRefusals(stmt.then, where);
        if (stmt.else) this.forbidRefusals(stmt.else, where);
      }
      if (stmt.kind === 'select-on') stmt.arms.forEach((a) => this.forbidRefusals(a.body, where));
      if (stmt.kind === 'select-strategy') stmt.alternatives.forEach((a) => this.forbidRefusals(a, where));
      if (stmt.kind === 'ordinal') this.forbidRefusals(stmt.body, where);
    }
  }

  /**
   * Snapshot every branching decision (`if` and `select-on`) before
   * mutations run, walking only the branches actually taken (§5.4: the
   * report phase must see the same routing the execute phase did).
   */
  private snapshotDecisions(body: IRStatement[], ctx: ExecContext): Map<IRStatement, string> {
    const decisions = new Map<IRStatement, string>();
    const walk = (stmts: IRStatement[]): void => {
      for (const stmt of stmts) {
        switch (stmt.kind) {
          case 'select-on': {
            const decided = this.decideSelectOn(stmt, ctx);
            decisions.set(stmt, decided);
            const arm = stmt.arms.find((a) => a.value === decided);
            if (arm) walk(arm.body);
            break;
          }
          case 'if': {
            const takeThen = this.evaluator.evalCondition(stmt.condition, ctx);
            decisions.set(stmt, takeThen ? 'then' : 'else');
            const branch = takeThen ? stmt.then : stmt.else;
            if (branch) walk(branch);
            break;
          }
          case 'select-strategy':
            stmt.alternatives.forEach((a) => walk(a));
            break;
          case 'ordinal':
            if (ctx.occurrence === stmt.ordinal) walk(stmt.body);
            break;
          default:
            break;
        }
      }
    };
    walk(body);
    return decisions;
  }

  private decideSelectOn(stmt: Extract<IRStatement, { kind: 'select-on' }>, ctx: ExecContext): string {
    return String(this.evaluator.evalValue(stmt.subject, ctx));
  }

  private decideStrategy(stmt: Extract<IRStatement, { kind: 'select-strategy' }>, ctx: ExecContext): number {
    const count = stmt.alternatives.length;
    if (count === 0) return 0;
    // Occurrence-ordered strategies key off world state; randomly keys off
    // the persisted chance stream (via one draw per firing).
    const key = CHORD_OCCURRENCE_PREFIX + `select.${this.ir.rules.length}.${stmt.span.line}`;
    const n = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
    ctx.world.setStateValue(key, n + 1);
    switch (stmt.strategy) {
      case 'cycling':
        return n % count;
      case 'ordered':
        return Math.min(n, count - 1);
      case 'once':
        return n === 0 ? 0 : Math.min(1, count - 1);
      case 'randomly':
        return this.randomIndex(count, ctx);
      default:
        throw new LoadError(`Unknown select strategy \`${stmt.strategy}\`.`, stmt.span);
    }
  }

  private randomIndex(count: number, ctx: ExecContext): number {
    // Reuse the persisted chance stream: draw until a bucket resolves.
    for (let i = 0; i < count - 1; i++) {
      if (this.evaluator.evalCondition({ kind: 'chance', n: count - i }, ctx)) return i;
    }
    return count - 1;
  }

  // --------------------------------------------------------------- phrases

  /**
   * Build the semantic event for `phrase <key>`: entity-scoped override
   * resolution (prereq 4), strategy variants as a persistent Choice atom,
   * and hatch producers bound by marker name.
   */
  private phraseEvent(key: string, ctx: ExecContext): ISemanticEvent {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    const overrideKey = ctx.it && table[`${ctx.it}.${key}`] ? `${ctx.it}.${key}` : key;
    const phrase = table[overrideKey];
    if (!phrase) throw new LoadError(`Phrase \`${key}\` is missing from the IR at emit time.`);

    const params: Record<string, unknown> = {};
    for (const variant of phrase.variants) {
      for (const marker of variant.markers) {
        const producer = this.host.producers.get(marker);
        if (producer) params[marker] = producer;
      }
    }
    if (phrase.strategy) {
      const choice: Choice = {
        kind: 'choice',
        alternatives: phrase.variants.map((v): Literal => ({ kind: 'literal', text: v.text })),
        selector: STRATEGY_SELECTOR[phrase.strategy],
        entityId: 'chord',
        messageKey: overrideKey,
      };
      params.variants = choice;
    }

    return this.rawEvent('chord.phrase', { messageId: overrideKey, params });
  }

  private rawEvent(type: string, data: Record<string, unknown>): ISemanticEvent {
    return {
      id: `chord-${type}-${this.eventSeq++}`,
      type,
      timestamp: Date.now(),
      entities: {},
      data,
    };
  }

  // --------------------------------------------------------------- helpers

  private irIdOfValue(value: IRValue, ctx: ExecContext): string {
    if (value.kind === 'entity') return value.id;
    if (value.kind === 'it') {
      if (!ctx.it) throw new LoadError('`it` used outside an entity-scoped clause.');
      return ctx.it;
    }
    const worldId = this.evaluator.entityValue(value, ctx);
    const irId = this.host.irIdOf(worldId);
    if (!irId) throw new LoadError('Cannot change the state of a non-story entity.');
    return irId;
  }
}
