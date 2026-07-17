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
import type { IRActionDef, IREntity, IROnClause, IRStatement, IRValue, StoryIR } from '@sharpee/chord';
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
import { interceptorConsultingActionIds, killPlayer } from '@sharpee/stdlib';
import { Evaluator, EvalContext } from './evaluator';
import { LoadError } from './errors';
import {
  CHORD_OCCURRENCE_PREFIX,
  CHORD_STATE_PREFIX,
  CHORD_STORY_STATE_KEY,
  CHORD_TRAIT_PREFIX,
} from './state-keys';
import { withLineBreaks } from './text';
import { stagingRenderContext } from './hatch-context';
import { enteringDestination, EVENT_TRIGGERS } from './event-contract';

/**
 * Chord strategy adverb → phrase-algebra Choice selector (ADR-196).
 * The Z5 table (ADR-211 Decision 4): adverbs mirror the selectors 1:1;
 * `ordered`/`once` are retired at parse time and never reach here.
 * Exported as the single implementation (ratchet Z5) — the loader's Z2
 * snippet compile maps the same adverbs onto `SnippetEntry.selector`.
 */
export const STRATEGY_SELECTOR: Record<string, Choice['selector']> = {
  randomly: 'random',
  cycling: 'cycling',
  stopping: 'stopping',
  sticky: 'sticky',
  'first-time': 'firstTime',
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

  /** Register on/after clauses, event clauses, and derived-property chains. */
  bind(world: WorldModel): void {
    // The interceptor registry is keyed (traitType, actionId) — a second
    // registration for the same action would REPLACE the first, silently
    // disabling earlier entities' clauses. Group clauses by action and
    // register one dispatching interceptor per action that routes by the
    // action's target entity.
    const byAction = new Map<string, Array<{ entity: IREntity; clause: IROnClause }>>();
    for (const entity of this.ir.entities) {
      entity.onClauses.forEach((clause, clauseIndex) => {
        // Entity every-turn clauses are scheduler daemons, not interceptors.
        if (clause.binding === 'every-turn') return;
        // Event clauses (`after entering it`) bind to the event stream per
        // the selector contract — the ownership package's replacement for
        // floating `when` rules.
        if (EVENT_TRIGGERS[clause.action]) {
          this.bindEventClause(world, entity, clause, clauseIndex);
          return;
        }
        // D5 fail-fast (ADR-228): only bind clauses something will consult.
        if (!this.isConsultedGerund(clause.action)) {
          if (this.isDispatchAction(clause.action)) {
            // Dispatch reactions fire via fireAfterClauses (the runtime owns
            // those actions — interceptors never fire on the dispatch path),
            // so `after` is live without any registration here…
            if (clause.clauseKind === 'after') return;
            // …but an entity `on` clause has no dispatch surface at all.
            throw new LoadError(
              `\`on ${clause.action} it\` — \`${clause.action}\` is a Chord dispatch action, and entity \`on\` clauses never fire on the dispatch path. Move the clause into a trait (\`define trait … on ${clause.action} it\`) and compose the trait, or react with \`after ${clause.action} it\`.`,
              clause.span,
            );
          }
          throw this.deadGerundError(clause);
        }
        this.prepareOnClauseTarget(world, entity, clause);
        const list = byAction.get(clause.action) ?? [];
        list.push({ entity, clause });
        byAction.set(clause.action, list);
      });
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
          // D5 fail-fast (ADR-228): the analyzer routed this clause to the
          // interceptor path, so its gerund must name a consulted action.
          if (!this.isConsultedGerund(clause.action)) throw this.deadGerundError(clause);
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

  // ------------------------------------------------------- D5 fail-fast

  /**
   * True when an interceptor registered under `if.action.<gerund>` can ever
   * fire: a wired stdlib action consults the id (the ADR-228 D5 registry,
   * derived from the descriptor table), or the gerund names a `define
   * action X from` hatch — an author-owned TS Action the loader can't see
   * inside, which may consult its own id.
   * @param gerund the clause's action word (e.g. `taking`)
   */
  private isConsultedGerund(gerund: string): boolean {
    if (interceptorConsultingActionIds.has(`if.action.${gerund}`)) return true;
    return this.ir.hatches.some((h) => h.hatchKind === 'action' && h.name === gerund);
  }

  /** True when the gerund names a `define action` dispatch action. */
  private isDispatchAction(gerund: string): boolean {
    return this.ir.actions.some((a) => a.name === gerund);
  }

  /**
   * Load-time diagnostic for a clause whose gerund nothing will ever
   * consult (ADR-228 D5): a typo or an unimplemented action word would
   * otherwise register and silently die. lowering/raising get the pointed
   * capability-dispatch message (they are full-delegation by design).
   * @param clause the dead clause (its span anchors the diagnostic)
   */
  private deadGerundError(clause: IROnClause): LoadError {
    const phrase = `${clause.clauseKind} ${clause.action} it`;
    if (clause.action === 'lowering' || clause.action === 'raising') {
      return new LoadError(
        `\`${phrase}\` — \`${clause.action}\` is a full-delegation capability action by design (ADR-118): the standard action never consults interceptors. Use a capability behavior or a Chord dispatch action (\`define action ${clause.action}\`) instead.`,
        clause.span,
      );
    }
    return new LoadError(
      `\`${phrase}\` — no standard action consults \`if.action.${clause.action}\`, so this clause would never fire. Check the action word's spelling, or create the verb with \`define action ${clause.action}\`.`,
      clause.span,
    );
  }

  // ---------------------------------------------------------- event clauses

  /**
   * Bind an event clause (`after entering it` on a room) to its trigger
   * event per the selector contract — the ownership package's replacement
   * for floating `when` rules: the same firing semantics, owned by the
   * entity the event is about.
   */
  private bindEventClause(world: WorldModel, entity: IREntity, clause: IROnClause, clauseIndex: number): void {
    const trigger = EVENT_TRIGGERS[clause.action];
    const key = `chord.clause.${entity.id}.${clause.action}.${clauseIndex}`;
    world.chainEvent(
      trigger,
      (event, w) => this.fireEventClause(entity, clause, key, event, w as WorldModel),
      { key },
    );
  }

  /** Test/debug entry: run every event clause bound to this event type. */
  fireEventClauses(world: WorldModel, event: ISemanticEvent): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    for (const entity of this.ir.entities) {
      entity.onClauses.forEach((clause, clauseIndex) => {
        if (clause.binding === 'every-turn' || EVENT_TRIGGERS[clause.action] !== event.type) return;
        const key = `chord.clause.${entity.id}.${clause.action}.${clauseIndex}`;
        const produced = this.fireEventClause(entity, clause, key, event, world);
        if (produced) out.push(...produced);
      });
    }
    return out;
  }

  private fireEventClause(
    entity: IREntity,
    clause: IROnClause,
    key: string,
    event: ISemanticEvent,
    world: WorldModel,
  ): ISemanticEvent[] | null {
    // The clause is about its owner: `after entering it` fires when the
    // movement's destination IS the owner — read through the AC-9 payload
    // guard, never a blind cast (the stdlib event is a foreign surface).
    if (clause.action === 'entering' && enteringDestination(event.data) !== this.host.entityId(entity.id)) return null;

    const ctx: ExecContext = { world, it: entity.id };
    if (clause.condition && !this.evaluator.evalCondition(clause.condition, ctx)) return null;

    const occKey = CHORD_OCCURRENCE_PREFIX + key;
    const occurrence = ((world.getStateValue(occKey) as number | undefined) ?? 0) + 1;
    if (clause.once && occurrence > 1) return null; // `, once` — one lifetime firing (D5)
    world.setStateValue(occKey, occurrence);
    ctx.occurrence = occurrence;
    ctx.decisions = this.snapshotDecisions(clause.body, ctx);

    return this.execStatements(clause.body, ctx);
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
   * Compile one `on`/`after` clause to an ActionInterceptor via the §5.4
   * partition: leading refusals → preValidate (`on` only — `after` reacts
   * and cannot refuse, ratchet D3); mutations → postExecute; phrase/emit/
   * win/lose → postReport. An `on` clause's first phrase OVERRIDES the
   * primary message; an `after` clause's phrases APPEND (D3).
   */
  private buildInterceptor(entity: IREntity, clause: IROnClause): ActionInterceptor {
    const runtime = this;
    const ownWorldId = () => runtime.host.entityId(entity.id);
    const skipped = (data: InterceptorSharedData) => data.chordSkip === true;
    const occurrenceKey = CHORD_OCCURRENCE_PREFIX + `on.${entity.id}.${clause.action}`;

    return {
      preValidate(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        if (target.id !== ownWorldId() || clause.clauseKind === 'after') return null;
        const ctx: ExecContext = { world, it: entity.id };
        // D8 (ADR-228): the `while` gate is evaluated once per firing, at
        // validate time, BEFORE findRefusal — a gated-out clause sits out
        // entirely, refusals included. preValidate and postValidate may both
        // evaluate the gate: no mutation occurs between them within one
        // action, so the answers cannot differ. Do not move this evaluation.
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          data.chordSkip = true;
          return null;
        }
        // `, once`: a clause that has already fired keeps its refusal out
        // too (peek only — the occurrence bump stays in postValidate).
        if (clause.once && ((world.getStateValue(occurrenceKey) as number | undefined) ?? 0) >= 1) {
          data.chordSkip = true;
          return null;
        }
        const refusal = runtime.findRefusal(clause.body, ctx);
        return refusal ? { valid: false, error: refusal } : null;
      },

      postValidate(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        if (target.id !== ownWorldId()) return null;
        const ctx: ExecContext = { world, it: entity.id };
        // D8: same gate, same evaluation point (see preValidate).
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          data.chordSkip = true; // `while <cond>` gate — clause sits out this firing
          return null;
        }
        const key = occurrenceKey;
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        if (clause.once && occurrence > 1) {
          data.chordSkip = true; // `, once` — one lifetime firing (D5)
          return null;
        }
        world.setStateValue(key, occurrence);
        ctx.occurrence = occurrence;
        data.chordOccurrence = occurrence;
        data.chordDecisions = runtime.snapshotDecisions(clause.body, ctx);
        return null;
      },

      postExecute(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): void {
        if (target.id !== ownWorldId() || skipped(data)) return;
        const ctx = runtime.restoreCtx(world, entity.id, data);
        runtime.execStatements(clause.body, ctx, 'mutations');
      },

      postReport(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        if (target.id !== ownWorldId() || skipped(data)) return {};
        const ctx = runtime.restoreCtx(world, entity.id, data);
        const reports = runtime.execStatements(clause.body, ctx, 'reports');

        const result: InterceptorReportResult = {};
        const emit: CapabilityEffect[] = [];
        for (const event of reports) {
          const payload = (event.data ?? {}) as Record<string, unknown>;
          if (clause.clauseKind === 'on' && event.type === 'chord.phrase' && !result.override) {
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
        // D8 (ADR-228): the `while` gate is evaluated once per firing, at
        // validate time, BEFORE findRefusal — a gated-out clause sits out
        // entirely, refusals included. ADR-229 R5: the dispatch action
        // reads `chordSkip` as "not claiming" and falls through to the
        // next candidate / body / miss; the execute/report guards below
        // stay as defense in depth. Do not move this evaluation.
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          data.chordSkip = true;
          return { valid: true };
        }
        const key = `${CHORD_OCCURRENCE_PREFIX}trait.${traitName}.${clause.action}.${runtime.host.irIdOf(entity.id)}`;
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        if (clause.once && occurrence > 1) {
          data.chordSkip = true; // `, once` — one lifetime firing (D5)
          return { valid: true };
        }
        const refusal = runtime.findRefusal(clause.body, ctx);
        if (refusal) return { valid: false, error: refusal };
        world.setStateValue(key, occurrence);
        ctx.occurrence = occurrence;
        data.chordOccurrence = occurrence;
        data.chordDecisions = runtime.snapshotDecisions(clause.body, ctx);
        return { valid: true };
      },
      execute(entity, world, actorId, data): void {
        if (data.chordSkip === true) return;
        runtime.execStatements(clause.body, ctxOf(entity, world, actorId, data), 'mutations');
      },
      report(entity, world, actorId, data): CapabilityEffect[] {
        if (data.chordSkip === true) return [];
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
    const skipped = (data: InterceptorSharedData) => data.chordSkip === true;
    const occurrenceKeyOf = (target: IFEntity) => `${CHORD_OCCURRENCE_PREFIX}trait.${clause.action}.${itOf(target)}`;

    return {
      preValidate(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        if (clause.clauseKind === 'after') return null;
        const ctx: ExecContext = { world, it: itOf(target) };
        // D8 (ADR-228): the `while` gate is evaluated once per firing, at
        // validate time, BEFORE findRefusal — a gated-out clause sits out
        // entirely, refusals included. preValidate and postValidate may both
        // evaluate the gate: no mutation occurs between them within one
        // action, so the answers cannot differ. Do not move this evaluation.
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          data.chordSkip = true;
          return null;
        }
        // `, once`: a clause that has already fired keeps its refusal out
        // too (peek only — the occurrence bump stays in postValidate).
        if (clause.once && ((world.getStateValue(occurrenceKeyOf(target)) as number | undefined) ?? 0) >= 1) {
          data.chordSkip = true;
          return null;
        }
        const refusal = runtime.findRefusal(clause.body, ctx);
        return refusal ? { valid: false, error: refusal } : null;
      },
      postValidate(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        const ctx: ExecContext = { world, it: itOf(target) };
        // D8: same gate, same evaluation point (see preValidate).
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          data.chordSkip = true; // `while <cond>` gate — clause sits out this firing
          return null;
        }
        const key = occurrenceKeyOf(target);
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        if (clause.once && occurrence > 1) {
          data.chordSkip = true; // `, once` — one lifetime firing (D5)
          return null;
        }
        world.setStateValue(key, occurrence);
        ctx.occurrence = occurrence;
        data.chordOccurrence = occurrence;
        data.chordDecisions = runtime.snapshotDecisions(clause.body, ctx);
        return null;
      },
      postExecute(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): void {
        if (skipped(data)) return;
        runtime.execStatements(clause.body, runtime.restoreCtx(world, itOf(target), data), 'mutations');
      },
      postReport(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        if (skipped(data)) return {};
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

        const slots = runtime.slotBindings(primarySlot, entity, context.player);

        // Action-level requirements (`<subject> must …: <key>`, D6) run
        // after the refusal ladder, before dispatch — the action's own
        // gate, evaluated in the slots context (wired with the each
        // package's zoo-chain fixes, 2026-07-12).
        for (const must of def.musts) {
          if (!runtime.evaluator.evalCondition(must.condition, { world: context.world, slots })) {
            return { valid: false, error: must.phraseKey };
          }
        }

        // Dispatch: the first trait on the target with a behavior bound for
        // this action claims it (per-world binding map, ADR-090/207).
        // Instance-type lookup: ChordDataTrait types are per-instance, so
        // the constructor-static path (getBehaviorForCapability) can't see
        // them.
        //
        // ADR-229 R5: a gated-out behavior does NOT claim the dispatch.
        // A candidate whose validate returns valid with `chordSkip` set
        // (false `while` gate, or consumed `, once` — both side-effect-free
        // probes) is treated as if its clause were never declared: selection
        // falls through to the next trait's behavior, the action body, or
        // the `otherwise refuse` miss. A real refusal (valid: false) still
        // claims immediately, exactly as before.
        let behavior: CapabilityBehavior | undefined;
        let capShared: CapabilitySharedData = { chordSlots: slots };
        for (const trait of entity.traits.values()) {
          const candidate = context.world.getBehaviorBinding(trait.type, actionId)?.behavior;
          if (!candidate) continue;
          const candidateShared: CapabilitySharedData = { chordSlots: slots };
          const result = candidate.validate(entity, context.world, context.player.id, candidateShared);
          if (!result.valid) return { valid: false, error: result.error };
          if (candidateShared.chordSkip === true) continue; // gated out — not claiming
          behavior = candidate;
          capShared = candidateShared;
          break;
        }
        // A behavior host is optional when the action carries its own body
        // (§5.4: the body IS the action's semantics — photographing has no
        // per-trait behavior by design). No claiming behavior AND no body =
        // the dispatch miss.
        if (!behavior && def.body.length === 0) return { valid: false, error: def.otherwise ?? 'cant' };
        if (def.body.length) {
          // The body's own validate partition (leading refusals/musts) and
          // the pre-mutation decision snapshot (§5.4).
          const bodyCtx: ExecContext = { world: context.world, slots };
          const refusal = runtime.findRefusal(def.body, bodyCtx);
          if (refusal) return { valid: false, error: refusal };
          context.sharedData.chordBodyDecisions = runtime.snapshotDecisions(def.body, bodyCtx);
        }
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
        if (entity && def.body.length) {
          runtime.execStatements(def.body, runtime.actionBodyCtx(primarySlot, entity, context), 'mutations');
        }
      },
      report(context: DispatchContext): ISemanticEvent[] {
        const entity = context.sharedData.capEntity as IFEntity | undefined;
        const behavior = context.sharedData.capBehavior as CapabilityBehavior | undefined;
        if (!entity) return [];
        const events: ISemanticEvent[] = [];
        if (behavior) {
          const effects = behavior.report(entity, context.world, context.player.id, context.sharedData.capShared as CapabilitySharedData);
          events.push(...effects.map((e) => context.event(e.type, e.payload)));
        }
        if (def.body.length) {
          events.push(...runtime.execStatements(def.body, runtime.actionBodyCtx(primarySlot, entity, context), 'reports'));
        }
        events.push(...runtime.fireAfterClauses(def.name, entity, context.world));
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

  /**
   * Execution context for a `define action` body (§5.4): grammar slots
   * bound, no `it` (action bodies have no owner), decision snapshot from
   * validate carried through sharedData.
   */
  private actionBodyCtx(
    primarySlot: string | undefined,
    entity: IFEntity,
    context: { world: WorldModel; player: IFEntity; sharedData: Record<string, unknown> },
  ): ExecContext {
    return {
      world: context.world,
      slots: this.slotBindings(primarySlot, entity, context.player),
      decisions: context.sharedData.chordBodyDecisions as Map<IRStatement, string> | undefined,
    };
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

    for (const sequence of this.ir.sequences) {
      // Steps arm in order: `at turn N` on the wall clock, `N turns later`
      // relative to the PREVIOUS step's firing turn, `when <owner> becomes
      // <state>` on a state anchor (ratchet D10). Pointer and last-fired
      // turn live in world state — save/restore covers progression.
      const slug = sequence.name.replace(/\s+/g, '-');
      const key = `${CHORD_OCCURRENCE_PREFIX}sequence.${slug}`;
      const firedKey = `${key}.turn`;
      const stepReady = (step: (typeof sequence.steps)[number], world: WorldModel, turn: number): boolean => {
        switch (step.timing) {
          case 'at-turn':
            return turn >= step.turns;
          case 'later': {
            const lastFired = (world.getStateValue(firedKey) as number | undefined) ?? 0;
            return turn >= lastFired + step.turns;
          }
          case 'becomes': {
            if (!step.anchor) return false;
            if (step.anchor.owner === 'story') {
              return world.getStateValue(CHORD_STORY_STATE_KEY) === step.anchor.state;
            }
            return world.getStateValue(CHORD_STATE_PREFIX + step.anchor.owner) === step.anchor.state;
          }
        }
      };
      daemons.push({
        id: `chord.sequence.${slug}`,
        name: `sequence ${sequence.name}`,
        condition: (ctx) => {
          const next = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
          return next < sequence.steps.length && stepReady(sequence.steps[next], ctx.world, ctx.turn);
        },
        run: (ctx) => {
          const next = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
          ctx.world.setStateValue(key, next + 1);
          ctx.world.setStateValue(firedKey, ctx.turn);
          const step = sequence.steps[next];
          return this.narrated(this.execStatements(step.body, { world: ctx.world, occurrence: next + 1 }));
        },
      });
    }

    // Entity every-turn clauses (`on every turn while …[, once]` in a
    // create block): one daemon per clause, `it` = the owning entity
    // (stickiness — the ownership package's replacement for floating
    // `once <cond>` rules).
    this.ir.entities.forEach((irEntity) => {
      irEntity.onClauses.forEach((clause, clauseIndex) => {
        if (clause.binding !== 'every-turn') return;
        const key = `${CHORD_OCCURRENCE_PREFIX}entity-turn.${irEntity.id}.${clauseIndex}`;
        daemons.push({
          id: `chord.entity-turn.${irEntity.id}.${clauseIndex}`,
          name: `on every turn (${irEntity.id})`,
          run: (ctx) => {
            // Presence gate (decision 10): performances need an audience —
            // the clause does not FIRE off-stage. Checked before the
            // condition so an off-stage `one chance in N` never draws the
            // RNG (AC-5 determinism for on-stage firings) and `, once` is
            // never consumed unwitnessed. Presence, not sight.
            if (!this.playerPresentAt(ctx.world, irEntity.id)) return [];
            const evalCtx: ExecContext = { world: ctx.world, it: irEntity.id };
            if (clause.condition && !this.evaluator.evalCondition(clause.condition, evalCtx)) return [];
            const fired = ((ctx.world.getStateValue(key) as number | undefined) ?? 0) + 1;
            if (clause.once && fired > 1) return []; // `, once` (D5)
            ctx.world.setStateValue(key, fired);
            evalCtx.occurrence = fired;
            return this.narrated(this.execStatements(clause.body, evalCtx));
          },
        });
      });
    });

    // Every-turn trait clauses (`on every turn while …[, once]`): one
    // daemon per clause, evaluated per entity carrying the trait. The
    // composition condition (`chatty while not after-hours`) gates per
    // entity per turn (Prerequisite 2's NPC-behavior shape).
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
              // Presence gate (decision 10) — before any condition so the
              // RNG stream and `, once` are untouched off-stage.
              if (!this.playerPresentAt(ctx.world, irEntity.id)) continue;
              const evalCtx: ExecContext = { world: ctx.world, it: irEntity.id };
              if (comp.condition && !this.evaluator.evalCondition(comp.condition, evalCtx)) continue;
              if (clause.condition && !this.evaluator.evalCondition(clause.condition, evalCtx)) continue;
              const key = `${CHORD_OCCURRENCE_PREFIX}trait-turn.${trait.name}.${clauseIndex}.${irEntity.id}`;
              const fired = ((ctx.world.getStateValue(key) as number | undefined) ?? 0) + 1;
              if (clause.once && fired > 1) continue; // `, once` (D5)
              ctx.world.setStateValue(key, fired);
              evalCtx.occurrence = fired;
              out.push(...this.execStatements(clause.body, evalCtx));
            }
            return this.narrated(out);
          },
        });
      });
    });

    // Z3: a `disappeared` narration enqueued OUTSIDE statement execution
    // (a TS-initiated removeEntity — daemon, hatch, interceptor) has no
    // report pass to drain it; this daemon delivers it on the tick.
    // Registered only when the channel is authored, so channel-less
    // stories keep their exact daemon roster.
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    if (Object.keys(table).some((key) => key.endsWith('.disappeared'))) {
      daemons.push({
        id: 'chord.channel-drain',
        name: 'Z3 channel narration drain',
        condition: () => this.pendingChannelEvents.length > 0,
        run: () => this.drainChannelEvents(),
      });
    }

    return daemons;
  }

  /** Scheduler-returned events must narrate to reach the transcript. */
  private narrated(events: ISemanticEvent[]): ISemanticEvent[] {
    return events.map((e) => ({ ...e, narrate: true } as ISemanticEvent));
  }

  /**
   * Decision 10 presence semantics: the player shares the owner's location.
   * A room owner means the player is IN that room; for anything else the
   * two share a containing room (same co-location rule as can-see/can-reach
   * — presence, not sight, so the snake speaks in darkness).
   */
  private playerPresentAt(world: WorldModel, irEntityId: string): boolean {
    const ownerId = this.host.entityId(irEntityId);
    const playerId = world.getPlayer()?.id;
    if (!ownerId || !playerId) return false;
    if (ownerId === playerId) return true;
    const playerRoom = world.getContainingRoom(playerId)?.id ?? world.getLocation(playerId);
    const owner = world.getEntity(ownerId);
    if (owner?.has(TraitType.ROOM)) return playerRoom === ownerId;
    const ownerRoom = world.getContainingRoom(ownerId)?.id ?? world.getLocation(ownerId);
    return ownerRoom !== undefined && ownerRoom === playerRoom;
  }

  /**
   * Fire the target entity's `after <verb> it` clauses when a dispatch
   * action completes — the loader-internal mechanism the Phase 1 spike
   * confirmed (interceptor hooks never fire on the dispatch path; the
   * runtime owns these actions, so reactions run in their report phase).
   */
  private fireAfterClauses(actionName: string, target: IFEntity, world: WorldModel): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    const targetIrId = this.host.irIdOf(target.id);
    if (targetIrId === undefined) return out;
    const irEntity = this.ir.entities.find((e) => e.id === targetIrId);
    if (!irEntity) return out;

    irEntity.onClauses.forEach((clause, clauseIndex) => {
      if (clause.clauseKind !== 'after' || clause.action !== actionName) return;
      const ctx: ExecContext = { world, it: targetIrId };
      if (clause.condition && !this.evaluator.evalCondition(clause.condition, ctx)) return;
      const key = `${CHORD_OCCURRENCE_PREFIX}after.${irEntity.id}.${actionName}.${clauseIndex}`;
      const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
      if (clause.once && occurrence > 1) return; // `, once` (D5)
      world.setStateValue(key, occurrence);
      ctx.occurrence = occurrence;
      ctx.decisions = this.snapshotDecisions(clause.body, ctx);
      out.push(...this.execStatements(clause.body, ctx));
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
   * Re-evaluate derived properties: `dark while` into `RoomTrait.requiresLight`,
   * and `is blocked while <cond>` into blockedExits (block/unblock per the
   * condition's current truth — grammar log 2026-07-10).
   */
  recomputeDerived(world: WorldModel): void {
    for (const { entity, condition } of this.derivedDarkRooms()) {
      const worldId = this.host.entityId(entity.id);
      const room = worldId ? (world.getEntity(worldId)?.get(TraitType.ROOM) as RoomTrait | undefined) : undefined;
      if (!room) continue;
      room.requiresLight = this.evaluator.evalCondition(condition, { world });
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
    // Statement `when` suffix (ratchet D7): the statement acts only if the
    // condition holds at execution. Evaluated per phase-pass over the same
    // snapshot world — mutations and reports agree because the suffix runs
    // before either phase's own mutations of this statement.
    const whenHolds = (stmt: { stmtWhen?: import('@sharpee/chord').IRCondition | null }): boolean =>
      !stmt.stmtWhen || this.evaluator.evalCondition(stmt.stmtWhen, ctx);
    for (const stmt of body) {
      switch (stmt.kind) {
        case 'phrase':
          if (phase !== 'mutations' && whenHolds(stmt)) events.push(this.phraseEvent(stmt.phraseKey, ctx, stmt.params));
          break;
        case 'emit':
          if (phase !== 'mutations' && whenHolds(stmt)) events.push(this.rawEvent(stmt.event, {}));
          break;
        case 'win':
        case 'lose':
          if (phase !== 'mutations' && whenHolds(stmt)) {
            if (stmt.phraseKey) events.push(this.phraseEvent(stmt.phraseKey, ctx));
            events.push(
              this.host.triggerEnding(ctx.world, stmt.kind === 'win' ? 'victory' : 'defeat', stmt.phraseKey ?? undefined),
            );
          }
          break;
        case 'kill':
          // `kill the player` (ADR-227 Decision 4): terminal death via the
          // platform's killPlayer sink — the engine routes game-over off the
          // canonical if.event.player.died it returns; triggerEnding is NOT
          // called (a distinct lowering target from win/lose). The phrase
          // carries the death text; the cause derives from the phrase key.
          if (phase !== 'mutations' && whenHolds(stmt)) {
            if (stmt.phraseKey) events.push(this.phraseEvent(stmt.phraseKey, ctx));
            const player = ctx.world.getPlayer();
            if (player) {
              const died = killPlayer(ctx.world, player, {
                cause: stmt.phraseKey ?? 'killed',
                terminal: true,
              });
              if (died) events.push(died);
            }
          }
          break;
        case 'change': {
          if (phase !== 'reports' && whenHolds(stmt)) {
            if (stmt.entity.kind === 'story') {
              // `change the story to <state>` — the story object's phase (D2).
              this.checkForwardMarch(
                this.ir.story.states,
                this.ir.story.reversible,
                ctx.world.getStateValue(CHORD_STORY_STATE_KEY),
                stmt.state,
                'the story',
                stmt.span,
              );
              ctx.world.setStateValue(CHORD_STORY_STATE_KEY, stmt.state);
            } else {
              const irId = this.irIdOfValue(stmt.entity, ctx);
              const set = this.stateSetOf(irId, stmt.state);
              if (set) {
                this.checkForwardMarch(
                  set.states,
                  set.reversible,
                  ctx.world.getStateValue(CHORD_STATE_PREFIX + irId),
                  stmt.state,
                  irId,
                  stmt.span,
                );
              }
              ctx.world.setStateValue(CHORD_STATE_PREFIX + irId, stmt.state);
            }
          }
          break;
        }
        case 'move': {
          if (phase !== 'reports' && whenHolds(stmt)) {
            const thing = this.evaluator.entityValue(stmt.entity, ctx);
            const place = this.evaluator.entityValue(stmt.place, ctx);
            this.moveWithLifecycle(thing, place, ctx);
          }
          break;
        }
        case 'remove': {
          if (phase !== 'reports' && whenHolds(stmt)) {
            const thing = this.evaluator.entityValue(stmt.entity, ctx);
            // Z6 (ADR-213): the loader's pre-removal observer fires inside
            // removeEntity and enqueues any witnessed `disappeared`
            // narration; the report-collecting pass drains it. Never
            // rendered inline from the mutation pass.
            ctx.world.removeEntity(thing);
          }
          break;
        }
        case 'set': {
          if (phase !== 'reports') {
            const value = this.evaluator.evalValue(stmt.value, ctx);
            if (stmt.target.kind === 'field') {
              // Trait data fields (`set its treats to 3`) write the entity's
              // chord trait instance — world state via traits (AC-6-safe).
              const baseId = this.evaluator.entityValue(stmt.target.base, ctx);
              this.writeChordTraitField(ctx.world, baseId, stmt.target.field, value, stmt.span);
            } else {
              throw new LoadError('`set` targets a trait data field.', stmt.span);
            }
          }
          break;
        }
        case 'award': {
          if (phase !== 'reports' && whenHolds(stmt)) {
            // `award <score>` — dedup by identity (ADR-129), so repeat
            // awards are no-ops and `, once` is automatic. Names arrive
            // owner-qualified from the analyzer (ratchet D12).
            if (stmt.expression.length !== 1) {
              throw new LoadError('Only `award <score-name>` is supported (expression awards are later scope).', stmt.span);
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
        case 'must':
        case 'refuse-when':
          // The refusal partition is consumed by findRefusal (validate
          // phase); nothing to do in execute/report passes.
          break;
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
        case 'each':
          // E3 (ratchet 2026-07-12): run the body once per matching entity
          // in creation order, `the match` bound to it; `it` and every
          // other binding pass through untouched. Empty set = no-op.
          for (const irId of this.eachMatches(stmt, ctx)) {
            events.push(...this.execStatements(stmt.body, { ...ctx, match: irId }, phase));
          }
          break;
      }
    }
    // Z3: witnessed lifecycle narration enqueued during mutation phases
    // (move/remove above; the removal observer) lands in the next report-
    // collecting pass. Mutations-only passes never drain — their return
    // value is discarded by the interceptor call sites.
    if (phase !== 'mutations') events.push(...this.drainChannelEvents());
    return events;
  }

  /**
   * Z3: `move` with witnessed-only lifecycle narration (D11). `exited`
   * fires when the player shares the mover's SOURCE room at the transition
   * (and the move really changes rooms); `entered` when the player shares
   * the DESTINATION room after arrival. Unwitnessed transitions narrate
   * nothing and consume nothing; narration is enqueued, never emitted
   * inline from the mutation pass. Moving the player itself never narrates.
   *
   * @param thingWorldId the moved entity's world id
   * @param placeWorldId the destination's world id
   * @param ctx the executing context (live world)
   */
  private moveWithLifecycle(thingWorldId: string, placeWorldId: string, ctx: ExecContext): void {
    const world = ctx.world;
    const roomOf = (id: string): string | undefined =>
      world.getContainingRoom(id)?.id ?? world.getLocation(id);
    const fromRoom = roomOf(thingWorldId);
    world.moveEntity(thingWorldId, placeWorldId);

    const playerId = world.getPlayer()?.id;
    if (!playerId || thingWorldId === playerId) return;
    const irId = this.host.irIdOf(thingWorldId);
    if (!irId) return;
    const toRoom = roomOf(thingWorldId);
    if (fromRoom === toRoom) return; // not a room transition — nothing to witness
    const playerRoom = roomOf(playerId);
    if (playerRoom === undefined) return;
    if (playerRoom === fromRoom) {
      const event = this.channelEvent(irId, 'exited', world);
      if (event) this.enqueueChannelEvent(event);
    }
    if (playerRoom === toRoom) {
      const event = this.channelEvent(irId, 'entered', world);
      if (event) this.enqueueChannelEvent(event);
    }
  }

  /**
   * The declared set a `change` target state belongs to on an entity, with
   * its D4 policy — a composed trait's set, or the entity's own `states:`
   * line (merged list minus trait states). Null when the state is unknown
   * (the analyzer gates that; being lenient here keeps the check pure).
   */
  private stateSetOf(irId: string, state: string): { states: string[]; reversible: boolean } | null {
    const irEntity = this.ir.entities.find((e) => e.id === irId);
    if (!irEntity) return null;
    const traitStates = new Set<string>();
    for (const comp of irEntity.traits) {
      const trait = this.ir.traits.find((t) => t.name === comp.name);
      if (!trait) continue;
      if (trait.states.includes(state)) {
        return { states: trait.states, reversible: trait.statesReversible };
      }
      for (const s of trait.states) traitStates.add(s);
    }
    const own = irEntity.states.filter((s) => !traitStates.has(s));
    return own.includes(state) ? { states: own, reversible: irEntity.statesReversible } : null;
  }

  /**
   * D4 forward-march, runtime half: within a non-reversible set, `change`
   * may only move forward in declaration order. (The analyzer catches the
   * statically provable case — change-to-initial; this catches the rest
   * with the live current state.) Cross-set transitions and same-state
   * no-ops pass.
   */
  private checkForwardMarch(
    states: string[],
    reversible: boolean,
    current: unknown,
    target: string,
    ownerDesc: string,
    span?: import('@sharpee/chord').Span,
  ): void {
    if (reversible || typeof current !== 'string') return;
    const from = states.indexOf(current);
    const to = states.indexOf(target);
    if (from >= 0 && to >= 0 && to < from) {
      throw new LoadError(
        `\`change\` to \`${target}\` moves ${ownerDesc} backward in a forward-only set (currently \`${current}\`) — add \`, reversible\` to the \`states:\` line to permit back-transitions (D4).`,
        span,
      );
    }
  }

  /**
   * Leading-refusal scan (§5.4 validate partition): unconditional `refuse`,
   * `must` requirements (refuse when the requirement FAILS, ratchet D6),
   * and `refuse when` prohibitions (refuse when the hazard HOLDS) — checked
   * in source order until the first non-refusal statement.
   */
  private findRefusal(body: IRStatement[], ctx: ExecContext): string | null {
    for (const stmt of body) {
      if (stmt.kind === 'refuse') return this.resolvePhraseKey(stmt.phraseKey, ctx);
      if (stmt.kind === 'must') {
        if (!this.evaluator.evalCondition(stmt.condition, ctx)) return this.resolvePhraseKey(stmt.phraseKey, ctx);
        continue;
      }
      if (stmt.kind === 'refuse-when') {
        if (this.evaluator.evalCondition(stmt.condition, ctx)) return this.resolvePhraseKey(stmt.phraseKey, ctx);
        continue;
      }
      break; // first non-refusal statement ends the validate partition
    }
    return null;
  }

  /**
   * Resolve a refusal phrase key to its registered message id. A
   * per-entity `phrase <key>:` declaration registers entity-scoped as
   * `<irId>.<key>` — the same override rule `phraseEvent` applies at emit
   * time — so a bare refusal key written inside that entity's clause must
   * travel as the scoped id: the key crosses into stdlib's blocked() as a
   * fully-qualified message id (ADR-231 D1) and is rendered verbatim.
   */
  private resolvePhraseKey(key: string, ctx: ExecContext): string {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    return ctx.it && table[`${ctx.it}.${key}`] ? `${ctx.it}.${key}` : key;
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
          case 'select-strategy':
            stmt.alternatives.forEach((a) => walk(a));
            break;
          case 'ordinal':
            if (ctx.occurrence === stmt.ordinal) walk(stmt.body);
            break;
          case 'each':
            // Pin the match set pre-mutation (iteration is routing, same
            // as a select arm): joined IR ids, '' for the empty set. The
            // body is NOT walked — a select-on inside an `each` body may
            // decide differently per match, and this map is keyed by
            // statement identity alone, so those decide live per pass
            // (recorded follow-up; no shipped construct hits it).
            decisions.set(stmt, this.evaluator.matchesOf(stmt.condition, ctx).join('|'));
            break;
          default:
            break;
        }
      }
    };
    walk(body);
    return decisions;
  }

  /**
   * The match set for an `each` block: the pre-mutation snapshot when one
   * exists (§5.4 — the report pass must visit the same entities the
   * execute pass did, even after the body's own mutations change who
   * matches), else a live enumeration (single-pass contexts: event
   * clauses, sequences, daemons, and blocks nested inside another `each`).
   */
  private eachMatches(stmt: Extract<IRStatement, { kind: 'each' }>, ctx: ExecContext): string[] {
    const snapped = ctx.decisions?.get(stmt);
    if (snapped !== undefined) return snapped ? snapped.split('|') : [];
    return this.evaluator.matchesOf(stmt.condition, ctx);
  }

  private decideSelectOn(stmt: Extract<IRStatement, { kind: 'select-on' }>, ctx: ExecContext): string {
    return String(this.evaluator.evalValue(stmt.subject, ctx));
  }

  private decideStrategy(stmt: Extract<IRStatement, { kind: 'select-strategy' }>, ctx: ExecContext): number {
    const count = stmt.alternatives.length;
    if (count === 0) return 0;
    // Occurrence-ordered strategies key off world state; randomly keys off
    // the persisted chance stream (via one draw per firing). Sticky (Z5)
    // reuses the same slot with the Choice encoding instead of an
    // occurrence count: stored = chosen index + 1, 0/undefined = unchosen.
    const key = CHORD_OCCURRENCE_PREFIX + `select.${stmt.span.line}`;
    if (stmt.strategy === 'sticky') {
      const stored = ctx.world.getStateValue(key) as number | undefined;
      if (stored && stored > 0) return Math.min(stored - 1, count - 1);
      const i = this.randomIndex(count, ctx);
      ctx.world.setStateValue(key, i + 1);
      return i;
    }
    const n = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
    ctx.world.setStateValue(key, n + 1);
    switch (stmt.strategy) {
      case 'cycling':
        return n % count;
      case 'stopping':
        return Math.min(n, count - 1);
      case 'first-time':
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

  /** Z3 lifecycle narration awaiting the next report-collecting pass (never rendered inline — ADR-213 §2). */
  private readonly pendingChannelEvents: ISemanticEvent[] = [];

  /** Enqueue witnessed channel narration (Z3) — it lands in the turn's report pass. */
  enqueueChannelEvent(event: ISemanticEvent): void {
    this.pendingChannelEvents.push(event);
  }

  /** Drain pending channel narration (Z3) — report-collecting passes and the drain daemon consume it. */
  drainChannelEvents(): ISemanticEvent[] {
    return this.pendingChannelEvents.splice(0, this.pendingChannelEvents.length);
  }

  /**
   * Z3: build the channel phrase event for an owner (`entered` / `exited` /
   * `disappeared`). The phrase is the owner's `<irId>.<channel>` block;
   * `Choice` counters key `(ownerWorldId, channel)` — ADR-212 §4's owner +
   * channel-key convention, shared with the `present` slot entries.
   *
   * @param ownerIrId the channel owner's IR entity id
   * @param channel the channel key (`entered`/`exited`/`disappeared`)
   * @param world the live world
   * @returns the phrase event, or null when the owner has no such block
   */
  channelEvent(ownerIrId: string, channel: string, world: WorldModel): ISemanticEvent | null {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    if (!table[`${ownerIrId}.${channel}`]) return null;
    const ownerWorldId = this.host.entityId(ownerIrId);
    if (!ownerWorldId) return null;
    return this.phraseEvent(`${ownerIrId}.${channel}`, { world, it: ownerIrId }, undefined, {
      entityId: ownerWorldId,
      messageKey: channel,
    });
  }

  /**
   * Build the semantic event for `phrase <key>`: entity-scoped override
   * resolution (prereq 4), strategy variants as a persistent Choice atom,
   * and hatch producers bound by marker name.
   *
   * @param counter Z3 channel counter identity — overrides the default
   *   `('chord', overrideKey)` Choice keying with `(owner, channelKey)`.
   */
  private phraseEvent(
    key: string,
    ctx: ExecContext,
    stmtParams?: ReadonlyArray<{ param: string; value: IRValue }>,
    counter?: { entityId: string; messageKey: string },
  ): ISemanticEvent {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    const overrideKey = ctx.it && table[`${ctx.it}.${key}`] ? `${ctx.it}.${key}` : key;
    const phrase = table[overrideKey];
    if (!phrase) throw new LoadError(`Phrase \`${key}\` is missing from the IR at emit time.`);

    const params: Record<string, unknown> = {};
    // Authored `with <param> = <value>` bindings (zoo-chain follow-up,
    // 2026-07-12): entity values pass as their display name (the template's
    // article hint does the rest); scalars pass through.
    for (const p of stmtParams ?? []) {
      const value = this.evaluator.evalValue(p.value, ctx);
      const asEntity = typeof value === 'string' ? ctx.world.getEntity(value) : undefined;
      params[p.param] = asEntity ? asEntity.name : (value as string | number | boolean);
    }
    for (const variant of phrase.variants) {
      for (const marker of variant.markers) {
        const producer = this.host.producers.get(marker);
        if (producer) {
          // Params carry phrase ATOMS, not functions — the template binder
          // string-coerces anything that isn't a Phrase (ADR-196: producers
          // are invoked at staging, their atoms realized by the assembler).
          // The context is the narrow staging facade (design.md §5.6): a
          // producer reaching outside it fails HERE, named, not as an
          // anonymous TypeError downstream.
          try {
            params[marker] = producer(stagingRenderContext(ctx.world));
          } catch (error) {
            throw new LoadError(
              `Hatch \`${marker}\` threw while staging phrase \`${overrideKey}\`: ${error instanceof Error ? error.message : String(error)}. Hatches see the narrow staging context only (design.md §5.6).`,
            );
          }
        }
      }
    }
    // Grammar-slot params (`{the target}` in a dispatch-action or trait
    // clause body, zoo-chain fixes 2026-07-12): the slot entity's name
    // binds as the NounPhrase-default string — the template's own article
    // hint supplies `the`/`a`. Producers above win on a name collision.
    if (ctx.slots) {
      for (const [name, worldId] of Object.entries(ctx.slots)) {
        if (params[name] !== undefined) continue;
        const slotEntity = ctx.world.getEntity(worldId);
        if (slotEntity) params[name] = slotEntity.name;
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
        entityId: counter?.entityId ?? 'chord',
        messageKey: counter?.messageKey ?? overrideKey,
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
