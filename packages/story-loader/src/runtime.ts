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
import type { IRActionDef, IREntity, IROnClause, IRRule, IRStatement, IRValue, StoryIR } from '@sharpee/chord';
import type { Span } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { Choice, Literal, PhraseProducer, StoryEndingKind } from '@sharpee/if-domain';
import {
  ActionInterceptor,
  CapabilityBehavior,
  CapabilityEffect,
  CapabilitySharedData,
  CapabilityValidationResult,
  Direction,
  DirectionType,
  IFEntity,
  ITrait,
  InterceptorReportResult,
  InterceptorResult,
  InterceptorSharedData,
  ReadableTrait,
  RoomBehavior,
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
  CHORD_TRAIT_PREFIX,
} from './state-keys';
import { withLineBreaks } from './text';
import { EVENT_TRIGGERS } from './event-contract';

/** Chord strategy adverb → phrase-algebra Choice selector (ADR-196). */
const STRATEGY_SELECTOR: Record<string, Choice['selector']> = {
  randomly: 'random',
  cycling: 'cycling',
  ordered: 'stopping',
  once: 'firstTime',
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

/** What a scheduler tick provides (structural subset of plugin-scheduler's SchedulerContext). */
export interface SchedulerTick {
  world: WorldModel;
  turn: number;
  playerLocation?: string;
}

/** Structural mirror of plugin-scheduler's Daemon — registration-compatible. */
export interface SchedulerDaemon {
  id: string;
  name: string;
  condition?: (ctx: SchedulerTick) => boolean;
  run: (ctx: SchedulerTick) => ISemanticEvent[];
}

export class ChordRuntime {
  private eventSeq = 0;
  /** Declared score identities (Phase B): name → worth. */
  private readonly scoreWorth = new Map<string, number>();

  constructor(
    private readonly ir: StoryIR,
    private readonly host: RuntimeHost,
    private readonly evaluator: Evaluator,
  ) {
    for (const score of ir.scores) this.scoreWorth.set(score.name, score.worth);
  }

  // ------------------------------------------------------------------ bind

  /** Register rules, on-clause interceptors, and derived-property chains. */
  bind(world: WorldModel): void {
    this.ir.rules.forEach((rule, index) => this.bindRule(world, rule, index));

    // The interceptor registry is keyed (traitType, actionId) — a second
    // registration for the same action would REPLACE the first, silently
    // disabling earlier entities' clauses. Group clauses by action and
    // register one dispatching interceptor per action that routes by the
    // action's target entity.
    const byAction = new Map<string, Array<{ entity: IREntity; clause: IROnClause }>>();
    for (const entity of this.ir.entities) {
      for (const clause of entity.onClauses) {
        this.prepareOnClauseTarget(world, entity, clause);
        const list = byAction.get(clause.action) ?? [];
        list.push({ entity, clause });
        byAction.set(clause.action, list);
      }
    }
    for (const [action, clauses] of byAction) {
      world.registerActionInterceptor(
        ChordBehaviorTrait.type,
        `if.action.${action}`,
        this.buildDispatchingInterceptor(clauses),
      );
    }

    // Phase B: `define trait` clauses register per TRAIT TYPE — capability
    // behaviors for dispatch verbs, interceptors for standard-semantics
    // actions (§5.4 routing recorded on the IR by the analyzer).
    for (const trait of this.ir.traits) {
      const traitType = CHORD_TRAIT_PREFIX + trait.name;
      for (const clause of trait.onClauses) {
        if (clause.binding === 'every-turn') continue; // scheduler phase (plan phase 5)
        if (clause.binding === 'role') {
          throw new LoadError(
            `Role-bound trait clauses (\`on ${clause.action} anything as the ${clause.role}\`) are not wired yet — the standard-action role path is post-Zoo scope.`,
            clause.span,
          );
        }
        if (clause.routing === 'capability') {
          world.registerCapabilityBehavior(
            traitType,
            `chord.action.${clause.action}`,
            this.buildCapabilityBehavior(trait.name, clause),
          );
        } else {
          world.registerActionInterceptor(
            traitType,
            `if.action.${clause.action}`,
            this.buildTraitInterceptor(clause),
          );
        }
      }
    }

    // Derived properties (`dark while`, `is blocked while`) — recompute
    // when possession, location, or openable/switchable state changes.
    if (this.derivedDarkRooms().length > 0 || this.hasConditionalBlockedExits()) {
      for (const trigger of [
        'if.event.taken',
        'if.event.dropped',
        'if.event.worn',
        'if.event.removed',
        'if.event.put_on',
        'if.event.put_in',
        'if.event.actor_moved',
        'if.event.opened',
        'if.event.closed',
        'if.event.switched_on',
        'if.event.switched_off',
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
    if (rule.actionName) {
      // Derived-verb rules (`when the player pets anything`) bind to the
      // declared action's dispatch path — loader phases 4-5 wire these.
      return;
    }
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
    // Phase B target union: `enters` rules bind entity targets; anything/
    // any-condition targets belong to dispatch-verb rules (phases 4-5).
    const targetWorldId =
      rule.target.kind === 'entity' ? this.host.entityId(rule.target.id) : undefined;
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

  /** Mark the clause's target entity so interceptor resolution finds it. */
  private prepareOnClauseTarget(world: WorldModel, entity: IREntity, clause: IROnClause): void {
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
  }

  /**
   * One interceptor per action: each hook forwards to the clause whose
   * entity is the action's target (per-clause interceptors keep their own
   * occurrence keys and decision snapshots).
   */
  private buildDispatchingInterceptor(clauses: Array<{ entity: IREntity; clause: IROnClause }>): ActionInterceptor {
    const runtime = this;
    const arms = clauses.map(({ entity, clause }) => ({
      entity,
      interceptor: this.buildInterceptor(entity, clause),
    }));
    const armFor = (target: IFEntity): ActionInterceptor | undefined =>
      arms.find((a) => runtime.host.entityId(a.entity.id) === target.id)?.interceptor;

    return {
      preValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        return armFor(target)?.preValidate?.(target, world, actorId, data) ?? null;
      },
      postValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        return armFor(target)?.postValidate?.(target, world, actorId, data) ?? null;
      },
      postExecute(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): void {
        armFor(target)?.postExecute?.(target, world, actorId, data);
      },
      postReport(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        return armFor(target)?.postReport?.(target, world, actorId, data) ?? {};
      },
    };
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

  // ------------------------------------------- dispatch verbs (Phase B, §5.4)

  /** Write a `define trait` data field on the entity's chord trait instance. */
  private writeChordTraitField(world: WorldModel, worldId: string, field: string, value: unknown, span?: Span): void {
    const entity = world.getEntity(worldId);
    for (const trait of entity?.traits.values() ?? []) {
      if (!trait.type.startsWith(CHORD_TRAIT_PREFIX)) continue;
      const record = trait as unknown as Record<string, unknown>;
      if (field in record) {
        record[field] = typeof value === 'boolean' ? String(value) : value;
        return;
      }
    }
    throw new LoadError(`No trait on this entity carries the field \`${field}\`.`, span);
  }

  /**
   * A `define trait` clause on a dispatch verb → CapabilityBehavior
   * (§5.4's second half): refusal scan in validate (with the occurrence
   * bump and decision snapshot stashed in sharedData), mutations in
   * execute, phrase/emit/win/lose in report.
   */
  private buildCapabilityBehavior(traitName: string, clause: IROnClause): CapabilityBehavior {
    const runtime = this;
    const ctxOf = (entity: IFEntity, world: WorldModel, actorId: string, data: CapabilitySharedData): ExecContext => ({
      world,
      it: runtime.host.irIdOf(entity.id),
      slots: { ...(data.chordSlots as Record<string, string> | undefined), actor: actorId },
      occurrence: data.chordOccurrence as number | undefined,
      decisions: data.chordDecisions as Map<IRStatement, string> | undefined,
    });

    return {
      validate(entity, world, actorId, data): CapabilityValidationResult {
        const ctx = ctxOf(entity, world, actorId, data);
        const refusal = runtime.findRefusal(clause.body, ctx);
        if (refusal) return { valid: false, error: refusal };
        const key = `${CHORD_OCCURRENCE_PREFIX}trait.${traitName}.${clause.action}.${runtime.host.irIdOf(entity.id)}`;
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        world.setStateValue(key, occurrence);
        ctx.occurrence = occurrence;
        data.chordOccurrence = occurrence;
        data.chordDecisions = runtime.snapshotDecisions(clause.body, ctx);
        return { valid: true };
      },
      execute(entity, world, actorId, data): void {
        runtime.execStatements(clause.body, ctxOf(entity, world, actorId, data), 'mutations');
      },
      report(entity, world, actorId, data): CapabilityEffect[] {
        const events = runtime.execStatements(clause.body, ctxOf(entity, world, actorId, data), 'reports');
        return events.map((e) => ({ type: e.type, payload: (e.data ?? {}) as Record<string, unknown> }));
      },
      blocked(entity, world, actorId, error, data): CapabilityEffect[] {
        const event = runtime.phraseEvent(error, ctxOf(entity, world, actorId, data));
        return [{ type: event.type, payload: (event.data ?? {}) as Record<string, unknown> }];
      },
    };
  }

  /**
   * A `define trait` clause on a standard-semantics action → one
   * ActionInterceptor registered under the trait type (ADR-118 resolves it
   * for every entity carrying the trait).
   */
  private buildTraitInterceptor(clause: IROnClause): ActionInterceptor {
    const runtime = this;
    const itOf = (target: IFEntity) => runtime.host.irIdOf(target.id) ?? target.id;

    return {
      preValidate(target: IFEntity, world: WorldModel): InterceptorResult | null {
        const refusal = runtime.findRefusal(clause.body, { world, it: itOf(target) });
        return refusal ? { valid: false, error: refusal } : null;
      },
      postValidate(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        const key = `${CHORD_OCCURRENCE_PREFIX}trait.${clause.action}.${itOf(target)}`;
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        world.setStateValue(key, occurrence);
        const ctx: ExecContext = { world, it: itOf(target), occurrence };
        data.chordOccurrence = occurrence;
        data.chordDecisions = runtime.snapshotDecisions(clause.body, ctx);
        return null;
      },
      postExecute(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): void {
        runtime.execStatements(clause.body, runtime.restoreCtx(world, itOf(target), data), 'mutations');
      },
      postReport(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        const reports = runtime.execStatements(clause.body, runtime.restoreCtx(world, itOf(target), data), 'reports');
        const result: InterceptorReportResult = {};
        const emit: CapabilityEffect[] = [];
        for (const event of reports) {
          const payload = (event.data ?? {}) as Record<string, unknown>;
          if (event.type === 'chord.phrase' && !result.override) {
            result.override = { messageId: String(payload.messageId), params: (payload.params as Record<string, unknown>) ?? {} };
          } else {
            emit.push({ type: event.type, payload });
          }
        }
        if (emit.length) result.emit = emit;
        return result;
      },
    };
  }

  /**
   * `define action` → a four-phase dispatch action (structurally typed —
   * `Story.getCustomActions()` is untyped by design): the refusal ladder
   * runs in validate, the matched CapabilityBehavior carries the phases,
   * `otherwise refuse` is the dispatch-miss, and `when <player> <verbs>`
   * rules fire in report.
   */
  buildDispatchActions(): unknown[] {
    return this.ir.actions.map((def) => this.buildDispatchAction(def));
  }

  private buildDispatchAction(def: IRActionDef) {
    const runtime = this;
    const actionId = `chord.action.${def.name}`;
    const primarySlot = def.patterns.flatMap((p) => p.parts).find((part) => part.kind === 'slot')?.word;

    interface DispatchContext {
      world: WorldModel;
      player: IFEntity;
      command: { directObject?: { entity?: IFEntity } };
      sharedData: Record<string, unknown>;
      event(type: string, data: Record<string, unknown>): ISemanticEvent;
    }

    return {
      id: actionId,
      group: 'interaction',
      validate(context: DispatchContext): { valid: boolean; error?: string } {
        const entity = context.command.directObject?.entity;
        for (const refusal of def.refusals) {
          if (refusal.kind === 'without' && !entity) {
            return { valid: false, error: refusal.phraseKey };
          }
          if (refusal.kind === 'when' && entity) {
            const ctx: ExecContext = {
              world: context.world,
              slots: runtime.slotBindings(primarySlot, entity, context.player),
            };
            if (runtime.evaluator.evalCondition(refusal.condition, ctx)) {
              return { valid: false, error: refusal.phraseKey };
            }
          }
        }
        if (!entity) return { valid: false, error: def.otherwise ?? 'cant' };

        // Dispatch: the first trait on the target with a behavior bound for
        // this action claims it (per-world binding map, ADR-090/207).
        // Instance-type lookup: ChordDataTrait types are per-instance, so
        // the constructor-static path (getBehaviorForCapability) can't see
        // them.
        let behavior: CapabilityBehavior | undefined;
        for (const trait of entity.traits.values()) {
          behavior = context.world.getBehaviorBinding(trait.type, actionId)?.behavior;
          if (behavior) break;
        }
        if (!behavior) return { valid: false, error: def.otherwise ?? 'cant' };

        const capShared: CapabilitySharedData = {
          chordSlots: runtime.slotBindings(primarySlot, entity, context.player),
        };
        const result = behavior.validate(entity, context.world, context.player.id, capShared);
        if (!result.valid) return { valid: false, error: result.error };
        context.sharedData.capEntity = entity;
        context.sharedData.capBehavior = behavior;
        context.sharedData.capShared = capShared;
        return { valid: true };
      },
      execute(context: DispatchContext): void {
        const entity = context.sharedData.capEntity as IFEntity | undefined;
        const behavior = context.sharedData.capBehavior as CapabilityBehavior | undefined;
        if (entity && behavior) {
          behavior.execute(entity, context.world, context.player.id, context.sharedData.capShared as CapabilitySharedData);
        }
      },
      report(context: DispatchContext): ISemanticEvent[] {
        const entity = context.sharedData.capEntity as IFEntity | undefined;
        const behavior = context.sharedData.capBehavior as CapabilityBehavior | undefined;
        if (!entity || !behavior) return [];
        const effects = behavior.report(entity, context.world, context.player.id, context.sharedData.capShared as CapabilitySharedData);
        const events = effects.map((e) => context.event(e.type, e.payload));
        events.push(...runtime.fireActionRules(def.name, entity, context.world));
        return events;
      },
      blocked(context: DispatchContext, result: { error?: string }): ISemanticEvent[] {
        const key = result.error ?? def.otherwise ?? 'cant';
        const event = runtime.phraseEvent(key, { world: context.world });
        return [context.event(event.type, (event.data ?? {}) as Record<string, unknown>)];
      },
    };
  }

  private slotBindings(primarySlot: string | undefined, entity: IFEntity, player: IFEntity): Record<string, string> {
    const slots: Record<string, string> = { actor: player.id };
    if (primarySlot) slots[primarySlot] = entity.id;
    return slots;
  }

  // -------------------------------------------- scheduler constructs (Phase B)

  /**
   * Build the story's scheduler daemons (`once` / `every N turns` /
   * `define sequence` / every-turn trait clauses). ALL progression state is
   * namespaced world state — save/restore/undo cover it with no
   * getRunnerState plumbing (design.md §6). Registered by
   * ChordStory.onEngineReady; exposed for direct unit driving.
   */
  buildSchedulerDaemons(): SchedulerDaemon[] {
    const daemons: SchedulerDaemon[] = [];

    this.ir.everyRules.forEach((rule, index) => {
      const key = `${CHORD_OCCURRENCE_PREFIX}every.${index}`;
      daemons.push({
        id: `chord.every.${index}`,
        name: `every ${rule.turns} turns`,
        condition: (ctx) => {
          if (ctx.turn <= 0 || ctx.turn % rule.turns !== 0) return false;
          const fired = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
          return rule.times === null || fired < rule.times;
        },
        run: (ctx) => {
          const fired = ((ctx.world.getStateValue(key) as number | undefined) ?? 0) + 1;
          ctx.world.setStateValue(key, fired);
          return this.narrated(this.execStatements(rule.body, { world: ctx.world, occurrence: fired }));
        },
      });
    });

    this.ir.onceRules.forEach((rule, index) => {
      const key = `${CHORD_OCCURRENCE_PREFIX}once.${index}`;
      daemons.push({
        id: `chord.once.${index}`,
        name: `once rule ${index}`,
        condition: (ctx) =>
          !ctx.world.getStateValue(key) &&
          this.evaluator.evalCondition(rule.condition, { world: ctx.world }),
        run: (ctx) => {
          ctx.world.setStateValue(key, true); // retires after firing
          return this.narrated(this.execStatements(rule.body, { world: ctx.world, occurrence: 1 }));
        },
      });
    });

    for (const sequence of this.ir.sequences) {
      // Absolute firing turns: `at turn N` anchors; `N turns later` chains.
      const schedule: number[] = [];
      let at = 0;
      for (const step of sequence.steps) {
        at = step.timing === 'at-turn' ? step.turns : at + step.turns;
        schedule.push(at);
      }
      const slug = sequence.name.replace(/\s+/g, '-');
      const key = `${CHORD_OCCURRENCE_PREFIX}sequence.${slug}`;
      daemons.push({
        id: `chord.sequence.${slug}`,
        name: `sequence ${sequence.name}`,
        condition: (ctx) => {
          const next = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
          return next < schedule.length && ctx.turn >= schedule[next];
        },
        run: (ctx) => {
          const next = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
          ctx.world.setStateValue(key, next + 1);
          const step = sequence.steps[next];
          return this.narrated(this.execStatements(step.body, { world: ctx.world, occurrence: next + 1 }));
        },
      });
    }

    // Every-turn trait clauses (`on every turn while …`): one daemon per
    // clause, evaluated per entity carrying the trait. The composition
    // condition (`chatty while not after-hours`) gates per entity per turn
    // (Prerequisite 2's NPC-behavior shape).
    this.ir.traits.forEach((trait) => {
      trait.onClauses.forEach((clause, clauseIndex) => {
        if (clause.binding !== 'every-turn') return;
        const traitType = CHORD_TRAIT_PREFIX + trait.name;
        daemons.push({
          id: `chord.trait-turn.${trait.name}.${clauseIndex}`,
          name: `on every turn (${trait.name})`,
          run: (ctx) => {
            const out: ISemanticEvent[] = [];
            for (const irEntity of this.ir.entities) {
              const comp = irEntity.traits.find((t) => t.name === trait.name);
              if (!comp) continue;
              const worldId = this.host.entityId(irEntity.id);
              const entity = worldId ? ctx.world.getEntity(worldId) : undefined;
              if (!entity?.has(traitType)) continue;
              const evalCtx: ExecContext = { world: ctx.world, it: irEntity.id };
              if (comp.condition && !this.evaluator.evalCondition(comp.condition, evalCtx)) continue;
              if (clause.condition && !this.evaluator.evalCondition(clause.condition, evalCtx)) continue;
              out.push(...this.execStatements(clause.body, evalCtx));
            }
            return this.narrated(out);
          },
        });
      });
    });

    return daemons;
  }

  /** Scheduler-returned events must narrate to reach the transcript. */
  private narrated(events: ISemanticEvent[]): ISemanticEvent[] {
    return events.map((e) => ({ ...e, narrate: true } as ISemanticEvent));
  }

  /**
   * Fire `when <actor> <derived-verb> <target>` rules after a dispatch
   * action completes: target matches `anything`, the specific entity, or
   * an `any <open-condition>` selection evaluated with `it` = the target.
   */
  private fireActionRules(actionName: string, target: IFEntity, world: WorldModel): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    const targetIrId = this.host.irIdOf(target.id);
    this.ir.rules.forEach((rule, index) => {
      if (rule.actionName !== actionName) return;
      const matches =
        rule.target.kind === 'anything' ||
        (rule.target.kind === 'entity' && rule.target.id === targetIrId) ||
        (rule.target.kind === 'any-condition' &&
          targetIrId !== undefined &&
          this.evaluator.evalCondition({ kind: 'condition', name: rule.target.name }, { world, it: targetIrId }));
      if (!matches) return;

      const ctx: ExecContext = { world, it: targetIrId };
      if (rule.condition && !this.evaluator.evalCondition(rule.condition, ctx)) return;
      const key = CHORD_OCCURRENCE_PREFIX + `rule.${index}`;
      const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
      world.setStateValue(key, occurrence);
      ctx.occurrence = occurrence;
      ctx.decisions = this.snapshotDecisions(rule.body, ctx);
      out.push(...this.execStatements(rule.body, ctx));
    });
    return out;
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

  /**
   * Re-evaluate derived properties: `dark while` into `RoomTrait.isDark`,
   * and `is blocked while <cond>` into blockedExits (block/unblock per the
   * condition's current truth — grammar log 2026-07-10).
   */
  recomputeDerived(world: WorldModel): void {
    for (const { entity, condition } of this.derivedDarkRooms()) {
      const worldId = this.host.entityId(entity.id);
      const room = worldId ? (world.getEntity(worldId)?.get(TraitType.ROOM) as RoomTrait | undefined) : undefined;
      if (!room) continue;
      room.isDark = this.evaluator.evalCondition(condition, { world });
    }

    for (const irEntity of this.ir.entities) {
      for (const blocked of irEntity.blockedExits) {
        if (!blocked.condition) continue;
        const worldId = this.host.entityId(irEntity.id);
        const room = worldId ? world.getEntity(worldId) : undefined;
        if (!room) continue;
        const direction = (Direction as Record<string, DirectionType>)[blocked.direction.toUpperCase()];
        if (!direction) continue;
        const holds = this.evaluator.evalCondition(blocked.condition, { world, it: irEntity.id });
        if (holds) {
          RoomBehavior.blockExit(room, direction, this.blockedPhraseText(blocked.phraseKey));
        } else {
          RoomBehavior.unblockExit(room, direction);
        }
      }
    }
  }

  /** Single-variant text of a blocked-exit phrase (mirrors the loader's read). */
  private blockedPhraseText(key: string): string {
    const phrase = this.ir.phrases.locales[this.ir.phrases.defaultLocale]?.[key];
    return phrase?.variants[0]?.text ?? '';
  }

  /** True when any entity declares a conditional blocked exit. */
  private hasConditionalBlockedExits(): boolean {
    return this.ir.entities.some((e) => e.blockedExits.some((b) => b.condition !== null));
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
            const value = this.evaluator.evalValue(stmt.value, ctx);
            if (stmt.target.kind === 'flag' || stmt.target.kind === 'symbol') {
              // Declared flags (analyzer emits 'flag'; 'symbol' kept for
              // older IR) live in world state.
              ctx.world.setStateValue(CHORD_FLAG_PREFIX + stmt.target.name, value);
            } else if (stmt.target.kind === 'field') {
              // Trait data fields (`set fed to true`) write the entity's
              // chord trait instance — world state via traits (AC-6-safe).
              const baseId = this.evaluator.entityValue(stmt.target.base, ctx);
              this.writeChordTraitField(ctx.world, baseId, stmt.target.field, value, stmt.span);
            } else {
              throw new LoadError('`set` targets a flag or a trait data field.', stmt.span);
            }
          }
          break;
        }
        case 'award': {
          if (phase !== 'reports') {
            // `award <score>` — dedup by identity (ADR-129), so repeat
            // awards are no-ops and `, once` is automatic.
            if (stmt.expression.length !== 1) {
              throw new LoadError('Only `award <score-name>` is supported (expression awards are Phase C).', stmt.span);
            }
            const name = stmt.expression[0];
            const worth = this.scoreWorth.get(name);
            if (worth === undefined) {
              throw new LoadError(`\`${name}\` is not a declared score.`, stmt.span);
            }
            ctx.world.awardScore(name, worth, name);
          }
          break;
        }
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
        if (producer) {
          // Params carry phrase ATOMS, not functions — the template binder
          // string-coerces anything that isn't a Phrase (ADR-196: producers
          // are invoked at staging, their atoms realized by the assembler).
          params[marker] = producer({ world: ctx.world } as unknown as Parameters<PhraseProducer>[0]);
        }
      }
    }
    if (phrase.verbatim) {
      // `{verbatim:text}` template (loader registration) — the atom is
      // exempt from whitespace collapse, so line structure and interior
      // spacing survive as authored (grammar log 2026-07-10).
      params.text = phrase.variants[0]?.text ?? '';
    } else if (phrase.strategy) {
      const choice: Choice = {
        kind: 'choice',
        alternatives: phrase.variants.map((v): Literal => ({ kind: 'literal', text: withLineBreaks(v.text) })),
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
