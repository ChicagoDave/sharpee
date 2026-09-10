/**
 * timers.ts — the runtime's timers section.
 *
 * Timers and acts: the engine's turn provider and execution entry once
 * wired; timer records in world state stepped once per tick (interruption,
 * the next named turn, expiry and its clauses); the acting statement that
 * runs an action now as a character through the execution entry, guarded
 * against re-entry; and the act buffer's drain.
 *
 * Public interface: TimersSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import type { IRStatement } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { ActResult, ActSlots } from '@sharpee/stdlib';
import { Direction, type DirectionType, IFEntity, WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { CHORD_OCCURRENCE_PREFIX, timerKey, type TimerRecord } from '../state-keys.js';
import { ExecContext, SchedulerTick, ACT_DEPTH_CAP, type RuntimeCore } from './core.js';

export class TimersSection {
  constructor(private readonly core: RuntimeCore) {}

  /** Wire the engine's turn counter (loader-only; ADR-325 D3f). */
  setTurnProvider(provider: () => number): void {
    this.core.turnProvider = provider;
  }

  /** ADR-329 D4: the engine's execution entry (`GameEngine.executeAsActor`), set at engine-ready. */
  setExecutionEntry(entry: (actorId: string, actionId: string, slots?: ActSlots) => ActResult): void {
    this.core.executionEntry = entry;
  }

  /** True when any clause body in the story carries an acting statement (ADR-329). */
  hasActingStatements(): boolean {
    return this.irCarries((rec) => rec.kind === 'act' && typeof rec.action === 'string' && Array.isArray(rec.slots));
  }

  /**
   * True when the story can queue narration for the act flush: an acting
   * statement (ADR-329 D4) or a `move` statement — an authorial move of the
   * player describes the destination through the same queue (GH #331).
   * Which entity a `move` moves is a runtime fact, so any `move` counts.
   */
  hasDeferredNarration(): boolean {
    return this.hasActingStatements()
      || this.irCarries((rec) => rec.kind === 'move' && 'entity' in rec && 'place' in rec);
  }

  /** Walk the IR for any object node the predicate accepts. */
  private irCarries(predicate: (rec: Record<string, unknown>) => boolean): boolean {
    const visit = (node: unknown): boolean => {
      if (Array.isArray(node)) return node.some(visit);
      if (node && typeof node === 'object') {
        const rec = node as Record<string, unknown>;
        if (predicate(rec)) return true;
        return Object.values(rec).some(visit);
      }
      return false;
    };
    return visit(this.core.ir);
  }

  /**
   * Drain the events acting statements produced inside actions and handlers
   * (ADR-329 D4). Consumed by the loader's `chord.acted-events` turn plugin
   * — right after the player's action, before the actor phase — and by the
   * act drain daemon for acts fired inside scheduler daemons. Never rendered
   * through an action's own return: the entry already applied them.
   */
  drainActEvents(): ISemanticEvent[] {
    this.core.assertBetweenTurns('drainActEvents');
    return this.core.pendingActEvents.splice(0, this.core.pendingActEvents.length);
  }

  /**
   * Perform an acting statement (ADR-329 D1/D4/D5): resolve the actor and
   * the action id (story-first, as clause heads resolve), bind the shape's
   * slots to roles, and run the action NOW as that actor through the
   * engine's execution entry. Returns every event the action emitted —
   * a refusal's included (D5: the pipeline's own answer).
   *
   * @throws LoadError `runtime.act-no-entry` headless; `runtime.act-player-actor`
   *   when the actor currently holds the player role; `runtime.act-reentry`
   *   past 8 nested acts.
   */
  performAct(stmt: Extract<IRStatement, { kind: 'act' }>, ctx: ExecContext): ISemanticEvent[] {
    if (!this.core.executionEntry) {
      throw new LoadError(`runtime.act-no-entry: \`${stmt.action}\` needs the engine's execution entry — the story is running without an engine.`, stmt.span);
    }
    const world = ctx.world;
    const actorId = this.core.evaluator.entityValue(stmt.actor, ctx);
    const actorName = world.getEntity(actorId)?.name ?? actorId;
    // The runtime half of D1's exclusion: the compiler refuses the spelled
    // role; a named character who currently holds it is refused here.
    if (world.getPlayer()?.id === actorId) {
      throw new LoadError(`runtime.act-player-actor: ${actorName} holds the player role this turn and cannot be made to act.`, stmt.span);
    }
    const storyDef = this.core.ir.actions.find((a) => a.name === stmt.action);
    const actionId = storyDef ? `chord.action.${stmt.action}` : `if.action.${stmt.action}`;
    const instrumentSlots = new Set((storyDef?.slotTypes ?? []).filter((t) => t.type === 'instrument').map((t) => t.slot));

    const slots: ActSlots = {};
    let entitySlots = 0;
    for (const bound of stmt.slots) {
      if (bound.slot === 'direction') {
        const word = bound.value.kind === 'literal' ? bound.value.value : this.core.evaluator.entityValue(bound.value, ctx);
        const direction = (Direction as Record<string, DirectionType>)[word.toUpperCase()];
        if (!direction) throw new LoadError(`Unknown direction \`${word}\`.`, stmt.span);
        slots.direction = direction;
        continue;
      }
      const entity = world.getEntity(this.core.evaluator.entityValue(bound.value, ctx));
      if (!entity) throw new LoadError(`\`${bound.slot}\` names nothing in the world.`, stmt.span);
      if (instrumentSlots.has(bound.slot)) slots.instrument = entity;
      else if (entitySlots++ === 0) slots.directObject = entity;
      else slots.indirectObject = entity;
    }

    const link = `${actorName} ${stmt.action}`;
    if (this.core.actDepth >= ACT_DEPTH_CAP) {
      throw new LoadError(
        `runtime.act-reentry: an acting statement re-entered ${ACT_DEPTH_CAP} times (${[...this.core.actChain, link].join(' → ')}) — a reaction keeps making a character act in a way whose reactions make one act again.`,
        stmt.span,
      );
    }
    this.core.actDepth++;
    this.core.actChain.push(link);
    try {
      return this.core.executionEntry(actorId, actionId, slots).events;
    } finally {
      this.core.actDepth--;
      this.core.actChain.pop();
    }
  }

  /** The current turn: the engine's when wired, else the last tick's. */
  private turnNow(): number {
    return this.core.turnProvider ? this.core.turnProvider() : this.core.lastTickTurn;
  }

  private timerRecord(qualified: string, world: WorldModel): TimerRecord {
    return this.core.evaluator.timerRecord(qualified, { world });
  }

  private writeTimer(qualified: string, world: WorldModel, record: TimerRecord): void {
    world.setStateValue(timerKey(qualified), record);
  }

  /**
   * ADR-325 D3c verb semantics. `start` on a started timer is a no-op;
   * `restart` always runs from the top; `reset` returns to idle;
   * `stop` holds; `interrupt` expires any started timer now (idle: no-op).
   */
  runTimerVerb(verb: 'start' | 'stop' | 'restart' | 'reset' | 'interrupt', qualified: string, ctx: ExecContext): ISemanticEvent[] {
    const world = ctx.world;
    const record = this.timerRecord(qualified, world);
    switch (verb) {
      case 'start':
        if (record.phase === 'idle') this.writeTimer(qualified, world, { phase: 'running', index: 0, startedTurn: this.turnNow() });
        return [];
      case 'restart':
        this.writeTimer(qualified, world, { phase: 'running', index: 0, startedTurn: this.turnNow() });
        return [];
      case 'reset':
        this.writeTimer(qualified, world, { phase: 'idle', index: 0, startedTurn: -1 });
        return [];
      case 'stop':
        if (record.phase === 'running') this.writeTimer(qualified, world, { ...record, phase: 'stopped' });
        return [];
      case 'interrupt':
        if (record.phase === 'idle' || record.phase === 'expired') return [];
        return this.expireTimer(qualified, world);
    }
  }

  /** Mark a timer expired and fire its `when … expires` clauses (once per run). */
  private expireTimer(qualified: string, world: WorldModel): ISemanticEvent[] {
    const record = this.timerRecord(qualified, world);
    this.writeTimer(qualified, world, { ...record, phase: 'expired' });
    const out: ISemanticEvent[] = [];
    for (const { clause, it } of this.core.timerClauses.get(qualified) ?? []) {
      const evalCtx: ExecContext = it ? { world, it } : { world };
      if (clause.condition && !this.core.evaluator.evalCondition(clause.condition, evalCtx)) continue;
      out.push(...this.core.statements.execStatements(clause.body, evalCtx));
    }
    return out;
  }

  /**
   * ADR-325 D3f: one step for every running timer, in declaration order.
   * A timer started this turn waits for the next. Each step: the
   * `interrupted` roll, then the next named turn (its prose spoken, owner
   * present) or expiry; `meanwhile` only while still running afterward.
   */
  stepTimers(tick: SchedulerTick): ISemanticEvent[] {
    this.core.assertBetweenTurns('stepTimers');
    this.core.lastTickTurn = tick.turn;
    const world = tick.world;
    const out: ISemanticEvent[] = [];
    for (const def of this.core.timerDefs.values()) {
      const record = this.timerRecord(def.qualified, world);
      if (record.phase !== 'running') continue;
      if (record.startedTurn === tick.turn) continue; // first named turn is next turn
      const ownerCtx: ExecContext = def.owner && def.owner !== 'player' ? { world, it: def.owner } : { world };
      if (def.interrupted !== null && this.core.evaluator.evalCondition({ kind: 'chance', n: def.interrupted }, ownerCtx)) {
        out.push(...this.expireTimer(def.qualified, world));
        continue;
      }
      const index = record.index + 1;
      if (index > def.states.length) {
        out.push(...this.expireTimer(def.qualified, world));
        continue;
      }
      this.writeTimer(def.qualified, world, { ...record, index });
      const state = def.states[index - 1];
      const table = this.core.ir.phrases.locales[this.core.ir.phrases.defaultLocale] ?? {};
      if (table[`${def.qualified}.${state}`]) {
        // ADR-328 D3: a named turn's prose fires wherever the player is;
        // an entity owner's place rides the event so it is tagged, not dropped.
        const spoken = this.core.phrases.phraseEvent(`${def.qualified}.${state}`, { world });
        out.push(...(def.owner && def.owner !== 'player' ? this.core.sourced([spoken], def.owner, world) : [spoken]));
      }
      if (def.meanwhile && (def.meanwhile.chance === null || this.core.evaluator.evalCondition({ kind: 'chance', n: def.meanwhile.chance }, ownerCtx))) {
        out.push(...this.core.statements.execStatements(def.meanwhile.body, ownerCtx));
      }
    }
    return this.core.narrated(out);
  }

  /**
   * Is this IR entity the one currently holding the player role (ADR-327 D9)?
   *
   * Asked at fire time, never stored: the role moves, and a clause silenced
   * this turn must be able to speak the next one.
   *
   * @param world the live world
   * @param irEntityId the clause owner's IR id
   * @returns true when that character is the current PC
   */
  holdsPlayerRole(world: WorldModel, irEntityId: string): boolean {
    const worldId = this.core.host.entityId(irEntityId);
    return worldId !== undefined && worldId === world.getPlayer()?.id;
  }

  /**
   * Fire the target entity's `after <verb> it` clauses when a dispatch
   * action completes — the loader-internal mechanism the Phase 1 spike
   * confirmed (interceptor hooks never fire on the dispatch path; the
   * runtime owns these actions, so reactions run in their report phase).
   */
  fireAfterClauses(actionName: string, target: IFEntity, world: WorldModel, actorId: string): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    const targetIrId = this.core.host.irIdOf(target.id);
    if (targetIrId === undefined) return out;
    const irEntity = this.core.ir.entities.find((e) => e.id === targetIrId);
    if (!irEntity) return out;

    irEntity.onClauses.forEach((clause, clauseIndex) => {
      if (clause.clauseKind !== 'after' || clause.action !== actionName) return;
      // ADR-327 D1: the head names who acts.
      if (!this.core.moveClauses.actorMatches(clause.actor, actorId, world)) return;
      const ctx: ExecContext = { world, it: targetIrId };
      if (clause.condition && !this.core.evaluator.evalCondition(clause.condition, ctx)) return;
      const key = `${CHORD_OCCURRENCE_PREFIX}after.${irEntity.id}.${actionName}.${clauseIndex}`;
      const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
      if (clause.once && occurrence > 1) return; // `, once` (D5)
      world.setStateValue(key, occurrence);
      ctx.occurrence = occurrence;
      // Single pass: one walk cannot disagree with itself, so routing is
      // decided live and nothing is recorded (ADR-289 D1 as amended).
      out.push(...this.core.statements.execStatements(clause.body, ctx));
    });
    return out;
  }
}
