/**
 * on-clauses.ts — the runtime's on clauses section.
 *
 * Entity `on`/`after` clauses, topic-table arms and the clause-less arms of
 * a machine's action triggers, as action interceptors.
 * The interceptor registry is keyed (trait type, action), so the bind step
 * groups every owner's clauses by action and registers one dispatching
 * interceptor per action that routes by the consulted entity, in front of
 * the owner's composed traits' bindings (../clause-order.ts); each arm is
 * the clause's validate/execute/report partition over the shared evaluator,
 * with its select decisions ledgered so the report pass replays what the
 * mutations pass decided.
 *
 * Public interface: OnClausesSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import type { IREntity, IROnClause } from '@sharpee/chord';
import { actorConsultationId } from '@sharpee/stdlib';
import { type ActionInterceptor, type CapabilityEffect, IFEntity, type InterceptorReportResult, type InterceptorResult, type InterceptorSharedData, ReadableTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { DecisionLedger, type DecisionRecord } from '../decisions.js';
import { LoadError } from '../errors.js';
import { EVENT_TRIGGERS, REGION_EVENT_TRIGGERS } from '../event-contract.js';
import { worldIdOf } from '../identity.js';
import { clauseOccurrenceKey } from '../state-keys.js';
import { ChordLateBehaviorTrait, LATE_OWN_CLAUSE_PRIORITY, OWN_CLAUSE_PRIORITY, assertOrderingTrait, refuseUnplacedOrdering } from '../clause-order.js';
import { ExecContext, ChordBehaviorTrait, TOPIC_GERUNDS, topicGerundServes, toEffect, type RuntimeCore } from './core.js';

/** A typed setting value in the state register: lowercased, spaces as hyphens (ADR-371 D3). */
function normalizeTailValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, '-') : undefined;
}

export class OnClausesSection {
  constructor(private readonly core: RuntimeCore) {}

  /** Bind step: entity `on`/`after` clauses, event clauses, and topic-table arms, one dispatching interceptor per action. */
  bindOnClauses(world: WorldModel): void {
    // The interceptor registry is keyed (traitType, actionId) — a second
    // registration for the same action would REPLACE the first, silently
    // disabling earlier entities' clauses. Group clauses by action and
    // register one dispatching interceptor per action that routes by the
    // action's target entity.
    const byAction = new Map<string, Array<{ entity: IREntity; clause: IROnClause | null }>>();
    // ADR-327 D1 bare heads — consulted through the lifecycle engine's actor
    // slot, under `actorConsultationId(...)`, never under the action's own id.
    const byActorAction = new Map<string, Array<{ entity: IREntity; clause: IROnClause | null }>>();
    // Own clauses that say `, after <trait>`: consulted behind every trait
    // the owner composes, under their own marker and priority. Every other
    // own clause stands in front of the traits (the specific before the
    // shared), so `, before <trait>` asks for where the clause already is.
    const byLateAction = new Map<string, Array<{ entity: IREntity; clause: IROnClause | null }>>();
    for (const entity of this.core.ir.entities) {
      entity.onClauses.forEach((clause, clauseIndex) => {
        // A stated order names a story trait, whatever the clause is; a
        // clause that is bound outside the consultation order (each early
        // return below) may not state one.
        assertOrderingTrait(this.core.ir, clause);
        // Entity every-turn clauses are scheduler daemons, not interceptors.
        if (clause.binding === 'every-turn') {
          refuseUnplacedOrdering(clause);
          return;
        }
        // Event clauses (`after entering it`) bind to the event stream per
        // the selector contract — the ownership package's replacement for
        // floating `when` rules. A REGION owner re-homes the verb onto the
        // crossing events (ADR-236 D6): entering → region_entered, leaving
        // → region_exited.
        const trigger = this.core.eventClauses.eventTriggerFor(entity, clause);
        if (trigger) {
          refuseUnplacedOrdering(clause);
          this.core.eventClauses.bindEventClause(world, entity, clause, clauseIndex, trigger);
          return;
        }
        if (REGION_EVENT_TRIGGERS[clause.action] && !EVENT_TRIGGERS[clause.action]) {
          // `leaving` exists only as a region crossing reaction (D6) — on
          // any other owner it would silently never fire. Refuse at load.
          // `entering` is exempt: on a THING it is the entering action's
          // interceptor (GH #341), bound below like any other gerund.
          // Region crossing reactions are ADR-236's.
          throw new LoadError(
            `\`${clause.clauseKind} the player ${clause.action}\` — \`${clause.action}\` is a region crossing reaction, and \`${entity.name}\` is not a region. Put the clause on the region block whose boundary it reacts to.`,
            clause.actionSpan ?? clause.span,
          );
        }
        // ADR-327 D1: a bare head is the owner's own action, reached through
        // the lifecycle engine's actor consultation — so the OWNER carries the
        // interceptor, like any other arm. Dispatch actions consult no actor:
        // a bare head there could never fire, so refuse at load.
        if (clause.binding === 'self' && this.core.binding.isDispatchAction(clause.action)) {
          throw new LoadError(
            `\`${clause.clauseKind} ${clause.action}\` in \`${entity.name}\`'s block — \`${clause.action}\` is a Chord dispatch action, which consults no actor, so a bare head could never fire. React on the thing acted on instead: \`after the player ${clause.action}\` in its block.`,
            clause.actionSpan ?? clause.span,
          );
        }
        // D5 fail-fast (ADR-228): only bind clauses something will consult.
        if (!this.core.binding.isConsultedGerund(clause.action)) {
          if (this.core.binding.isDispatchAction(clause.action)) {
            // Dispatch reactions fire via fireAfterClauses (the runtime owns
            // those actions — interceptors never fire on the dispatch path),
            // so `after` is live without any registration here…
            if (clause.clauseKind === 'after') {
              refuseUnplacedOrdering(clause);
              return;
            }
            // …but an entity `on` clause has no dispatch surface at all.
            throw new LoadError(
              `\`on the player ${clause.action}\` — \`${clause.action}\` is a Chord dispatch action, and entity \`on\` clauses never fire on the dispatch path. Move the clause into a trait (\`define trait … on the player ${clause.action}\`) and compose the trait, or react with \`after the player ${clause.action}\`.`,
              clause.actionSpan ?? clause.span,
            );
          }
          throw this.core.binding.deadGerundError(clause);
        }
        // No trait clause is consulted under the actor key, so a bare head
        // has no trait to stand before or behind.
        if (clause.binding === 'self') refuseUnplacedOrdering(clause);
        this.prepareOnClauseTarget(world, entity, clause);
        // Bare heads register under the actor-consultation key (the owner
        // is consulted as the actor); explicit heads under the action's own
        // id (the owner is consulted as the target).
        const late = clause.ordering?.relation === 'after';
        // A table owner's own clause for a topic gerund is the table's
        // catch-all (ADR-239 D5): it fires only on a miss, inside the
        // table's arm, and cannot be moved behind the traits without it.
        if (late && (TOPIC_GERUNDS as readonly string[]).includes(clause.action) && (entity.topics ?? []).length && topicGerundServes(clause.action, entity)) {
          throw new LoadError(
            `\`, after ${clause.ordering!.trait}\` cannot move \`${entity.name}\`'s \`${clause.action}\` clause: it answers what the topic table does not, and the table answers in front of the traits. Remove the order.`,
            clause.span,
          );
        }
        if (late) this.markLateOwner(world, entity, clause);
        const table = clause.binding === 'self' ? byActorAction : late ? byLateAction : byAction;
        const list = table.get(clause.action) ?? [];
        list.push({ entity, clause });
        table.set(clause.action, list);
      });
    }
    // ADR-239: topic tables ride the asking/telling dispatch. Every table
    // owner gets an arm — with or without a catch-all clause (D5: with no
    // catch-all declared, a miss simply returns {} and the action's
    // unconditional unknown_topic/not_interested default stands).
    for (const gerund of TOPIC_GERUNDS) {
      for (const entity of this.core.ir.entities) {
        if (!(entity.topics ?? []).length || !topicGerundServes(gerund, entity)) continue;
        const list = byAction.get(gerund) ?? [];
        if (!list.some((c) => c.entity.id === entity.id)) {
          this.markArmOwner(world, entity);
          list.push({ entity, clause: null });
          byAction.set(gerund, list);
        }
      }
    }
    // A machine's `when <gerund> the <role>` is the role's thing answering
    // that verb. The thing gets an arm with no clause, so an action that
    // asks whether its target implements it (turning, pulling, lowering and
    // the like) finds an answer, runs, and the machine advances on the
    // success. A thing with its own clause for the gerund already has an arm.
    for (const { entity, action } of this.machineTriggerTargets()) {
      if (!this.core.binding.isConsultedGerund(action)) continue;
      const list = byAction.get(action) ?? [];
      if (!list.some((c) => c.entity.id === entity.id)) {
        this.markArmOwner(world, entity);
        list.push({ entity, clause: null });
        byAction.set(action, list);
      }
    }

    // The world consults every binding an entity carries for an action,
    // higher priority first: own clauses, then composed traits in the order
    // written, then own clauses ordered `, after <trait>`.
    for (const [action, clauses] of byAction) {
      const interceptor = this.buildDispatchingInterceptor(action, clauses);
      world.registerActionInterceptor(ChordBehaviorTrait.type, `if.action.${action}`, interceptor, { priority: OWN_CLAUSE_PRIORITY });
    }
    for (const [action, clauses] of byActorAction) {
      const interceptor = this.buildDispatchingInterceptor(action, clauses);
      world.registerActionInterceptor(ChordBehaviorTrait.type, actorConsultationId(`if.action.${action}`), interceptor, { priority: OWN_CLAUSE_PRIORITY });
    }
    for (const [action, clauses] of byLateAction) {
      // The owner's topic table is served once, by its front binding above:
      // a second topic arm here would answer, count and stamp a hit twice.
      const interceptor = this.buildDispatchingInterceptor(action, clauses, false);
      world.registerActionInterceptor(ChordLateBehaviorTrait.type, `if.action.${action}`, interceptor, { priority: LATE_OWN_CLAUSE_PRIORITY });
    }
  }

  /** Mark the owner of an own clause ordered `, after <trait>` so the late binding finds it. */
  private markLateOwner(world: WorldModel, entity: IREntity, clause: IROnClause): void {
    const target = world.getEntity(entity.id);
    if (!target) throw new LoadError(`Entity \`${entity.id}\` vanished before binding.`, clause.span);
    if (!target.has(ChordLateBehaviorTrait.type)) {
      target.add(new ChordLateBehaviorTrait());
    }
  }

  /** Mark the clause's target entity so interceptor resolution finds it. */
  private prepareOnClauseTarget(world: WorldModel, entity: IREntity, clause: IROnClause): void {
    // ADR-327 D10: every character, the role-holder included, is built by the
    // world passes before `bind` runs — so there is no longer an entity with
    // clauses and no world instance. The player special case retired with the
    // player block.
    const target = world.getEntity(entity.id);
    if (!target) throw new LoadError(`Entity \`${entity.id}\` vanished before binding.`, clause.span);

    if (!target.has(ChordBehaviorTrait.type)) {
      target.add(new ChordBehaviorTrait());
    }
    // `on the player reading` targets must satisfy the reading action's
    // trait gate (a bare-head owner is the reader, not the text — untouched).
    if (clause.action === 'reading' && clause.binding !== 'self' && !target.has(TraitType.READABLE)) {
      target.add(new ReadableTrait({ text: '' }));
    }
  }

  /**
   * Every thing a machine's action trigger names, with the trigger's gerund:
   * a `$<role>` target resolved through the machine's roles, an entity id
   * taken as written. A trigger with no target names no thing.
   */
  private machineTriggerTargets(): Array<{ entity: IREntity; action: string }> {
    const found: Array<{ entity: IREntity; action: string }> = [];
    for (const machine of this.core.ir.machines ?? []) {
      for (const state of machine.states) {
        for (const transition of state.transitions) {
          const trigger = transition.trigger;
          if (trigger.kind !== 'action' || trigger.target === null) continue;
          const irId = trigger.target.startsWith('$')
            ? machine.roles.find((role) => `$${role.name}` === trigger.target)?.entity
            : trigger.target;
          // An entity that was never built is refused by name at engine-ready
          // (state-machines.ts); there is nothing to mark here.
          const entity = this.core.ir.entities.find((e) => e.id === irId);
          if (entity) found.push({ entity, action: trigger.action });
        }
      }
    }
    return found;
  }

  /** Mark the owner of a clause-less arm (a topic table, a machine trigger) so interceptor resolution finds it. */
  private markArmOwner(world: WorldModel, entity: IREntity): void {
    const target = world.getEntity(entity.id);
    if (!target) throw new LoadError(`Entity \`${entity.id}\` vanished before binding.`, entity.span);
    if (!target.has(ChordBehaviorTrait.type)) {
      target.add(new ChordBehaviorTrait());
    }
  }

  /**
   * Per-clause consultation state. Two live arms on one owner (ratchet D3's
   * `on` + `after` pair) share ONE InterceptorSharedData bag per firing —
   * each clause keeps its skip/occurrence/decision state in its own
   * namespaced sub-bag so the arms never clobber each other.
   */
  clauseBag(data: InterceptorSharedData, ns: string): Record<string, unknown> {
    const key = `chord.arm.${ns}`;
    let bag = data[key] as Record<string, unknown> | undefined;
    if (!bag) {
      bag = {};
      data[key] = bag;
    }
    return bag;
  }

  /**
   * Merge one owner's clause interceptors into a single arm, in declaration
   * order (the ratchet D3 contract, previously broken by first-match arm
   * routing — an `on`/`after` pair on the same owner+gerund silently
   * shadowed the second clause): the first refusal wins preValidate; every
   * arm's postValidate/postExecute runs (own namespaced state); postReport
   * merges — the first `on` override wins (only `on` clauses override),
   * every arm's emits APPEND (the `after` half of D3).
   */
  mergeArms(arms: ActionInterceptor[]): ActionInterceptor {
    if (arms.length === 1) return arms[0];
    return {
      preValidate(target, world, actorId, data): InterceptorResult | null {
        for (const arm of arms) {
          const veto = arm.preValidate?.(target, world, actorId, data);
          if (veto) return veto;
        }
        return null;
      },
      postValidate(target, world, actorId, data): InterceptorResult | null {
        for (const arm of arms) arm.postValidate?.(target, world, actorId, data);
        return null;
      },
      postExecute(target, world, actorId, data): void {
        for (const arm of arms) arm.postExecute?.(target, world, actorId, data);
      },
      postReport(target, world, actorId, data): InterceptorReportResult {
        const merged: InterceptorReportResult = {};
        const emit: CapabilityEffect[] = [];
        for (const arm of arms) {
          const result = arm.postReport?.(target, world, actorId, data) ?? {};
          if (result.override && !merged.override) merged.override = result.override;
          if (result.emit) emit.push(...result.emit);
        }
        if (emit.length) merged.emit = emit;
        return merged;
      },
    };
  }

  /**
   * One interceptor per action: each hook forwards to the arm whose entity
   * is the action's target. An owner's arm is the D3-merged composite of
   * ALL its clauses for this action (each clause keeps its own namespaced
   * occurrence keys and decision snapshots). On the topic gerunds
   * (asking/telling, ADR-239) a table owner's arm consults its declared
   * topic table first; the merged clause composite serves as the
   * catch-all, firing only on a table miss (D5).
   *
   * @param servesTopics false for the late binding, whose arms are clauses
   *   only: the owner's table belongs to its front binding
   */
  private buildDispatchingInterceptor(
    action: string,
    clauses: Array<{ entity: IREntity; clause: IROnClause | null }>,
    servesTopics = true,
  ): ActionInterceptor {
    const runtime = this;
    const isTopicAction = servesTopics && (TOPIC_GERUNDS as readonly string[]).includes(action);
    const byEntity = new Map<string, { entity: IREntity; entityClauses: IROnClause[] }>();
    for (const { entity, clause } of clauses) {
      const group = byEntity.get(entity.id) ?? { entity, entityClauses: [] };
      if (clause) group.entityClauses.push(clause);
      byEntity.set(entity.id, group);
    }
    const arms = [...byEntity.values()].map(({ entity, entityClauses }) => {
      const built = entityClauses.map((clause, index) =>
        this.buildInterceptor(entity, clause, `${entity.id}.${action}.${clause.clauseKind}.${index}`),
      );
      const catchAll = built.length ? this.mergeArms(built) : undefined;
      const interceptor = isTopicAction && (entity.topics ?? []).length && topicGerundServes(action, entity)
        ? this.core.threads.buildTopicArm(entity, catchAll, action)
        : catchAll ?? {};
      return { entity, interceptor };
    });
    // The consulted entity IS the arm's owner — as the action's target
    // (explicit heads) or as the actor (ADR-327 D1 bare heads, reached
    // through the lifecycle engine's actor consultation). Each clause then
    // gates on who acts.
    const armFor = (target: IFEntity): ActionInterceptor | undefined =>
      arms.find((a) => a.entity.id === target.id)?.interceptor;

    return {
      // ADR-371 D1a: this interceptor rides the marker trait every clause
      // owner shares, so it implements the action only for owners with an arm.
      claims(target: IFEntity): boolean {
        return armFor(target) !== undefined;
      },
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
  private buildInterceptor(entity: IREntity, clause: IROnClause, ns: string): ActionInterceptor {
    const runtime = this;
    // ADR-327 D1: the hook's target is always the owner — consulted as the
    // action's object (explicit head: fire when the head's actor is acting)
    // or as the actor itself (bare head: fire when the owner is the actor).
    // ADR-371 D4: a `to <value>` tail fires the clause only for that value,
    // read from the consultation's seeded `value` (the setting action's slot).
    const isMine = (target: IFEntity, world: WorldModel, actorId: string, data?: InterceptorSharedData): boolean =>
      target.id === entity.id &&
      (clause.binding === 'self' ? actorId === target.id : runtime.core.moveClauses.actorMatches(clause.actor, actorId, world)) &&
      (clause.valueTail === undefined || normalizeTailValue(data?.value) === clause.valueTail) &&
      // ADR-372 D1: a counterpart tail fires only when the command's other
      // noun — seeded by the slot as `counterpartId` — is the named thing.
      (clause.counterpart === undefined || data?.counterpartId === worldIdOf(world, clause.counterpart));
    const occurrenceKey = clauseOccurrenceKey(clause.id);

    return {
      preValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        if (!isMine(target, world, actorId, data) || clause.clauseKind === 'after') return null;
        const bag = runtime.clauseBag(data, ns);
        const ctx: ExecContext = { world, it: entity.id };
        // D8 (ADR-228): the `while` gate is evaluated once per firing, at
        // validate time, BEFORE findRefusal — a gated-out clause sits out
        // entirely, refusals included. preValidate and postValidate may both
        // evaluate the gate: no mutation occurs between them within one
        // action, so the answers cannot differ. Do not move this evaluation.
        if (clause.condition && !runtime.core.evaluator.evalCondition(clause.condition, ctx)) {
          bag.skip = true;
          return null;
        }
        // `, once`: a clause that has already fired keeps its refusal out
        // too (peek only — the occurrence bump stays in postValidate).
        if (clause.once && ((world.getStateValue(occurrenceKey) as number | undefined) ?? 0) >= 1) {
          bag.skip = true;
          return null;
        }
        const refusal = runtime.core.statements.findRefusal(clause.body, ctx);
        return refusal ? { valid: false, ...refusal } : null;
      },

      postValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        if (!isMine(target, world, actorId, data)) return null;
        const bag = runtime.clauseBag(data, ns);
        const ctx: ExecContext = { world, it: entity.id };
        // D8: same gate, same evaluation point (see preValidate).
        if (clause.condition && !runtime.core.evaluator.evalCondition(clause.condition, ctx)) {
          bag.skip = true; // `while <cond>` gate — clause sits out this firing
          return null;
        }
        const occurrence = ((world.getStateValue(occurrenceKey) as number | undefined) ?? 0) + 1;
        if (clause.once && occurrence > 1) {
          bag.skip = true; // `, once` — one lifetime firing (D5)
          return null;
        }
        world.setStateValue(occurrenceKey, occurrence);
        ctx.occurrence = occurrence;
        bag.occurrence = occurrence;
        return null;
      },

      postExecute(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): void {
        const bag = runtime.clauseBag(data, ns);
        if (!isMine(target, world, actorId, data) || bag.skip === true) return;
        const ctx = runtime.restoreCtx(world, entity.id, bag, 'mutations');
        runtime.core.statements.execStatements(clause.body, ctx, 'mutations');
      },

      postReport(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        const bag = runtime.clauseBag(data, ns);
        if (!isMine(target, world, actorId, data) || bag.skip === true) return {};
        const ctx = runtime.restoreCtx(world, entity.id, bag, 'reports');
        const reports = runtime.core.statements.execStatements(clause.body, ctx, 'reports');

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
            emit.push(toEffect(event));
          }
        }
        if (emit.length) result.emit = emit;
        return result;
      },
    };
  }

  /**
   * Rebuild the exec context for one pass of a two-pass clause body.
   *
   * @param phase `'mutations'` opens a fresh record in the bag and decides
   *   into it; `'reports'` replays that record; omitted decides live.
   */
  restoreCtx(
    world: WorldModel,
    itIrId: string,
    bag: Record<string, unknown>,
    phase?: 'mutations' | 'reports',
  ): ExecContext {
    return {
      world,
      it: itIrId,
      occurrence: bag.occurrence as number | undefined,
      ledger: this.ledgerFor(bag, 'decisions', phase),
    };
  }

  /**
   * The ledger for one pass, backed by `slot` on the caller's shared bag.
   *
   * The mutations pass installs a fresh record BEFORE executing (the Map is
   * shared by reference, so it fills as the walk proceeds) and the reports
   * pass reads that same record back. Anything else decides live.
   */
  ledgerFor(
    bag: Record<string, unknown>,
    slot: string,
    phase?: 'mutations' | 'reports',
  ): DecisionLedger {
    if (phase === 'mutations') {
      const entries: DecisionRecord = new Map();
      bag[slot] = entries;
      return DecisionLedger.recording(entries);
    }
    if (phase === 'reports') {
      return DecisionLedger.replaying(bag[slot] as DecisionRecord | undefined);
    }
    return DecisionLedger.live();
  }
}
