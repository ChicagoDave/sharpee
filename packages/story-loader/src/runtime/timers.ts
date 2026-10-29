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
import { seatActBindings, type IRStatement, type IRTimerDef } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { ActResult, ActSlots } from '@sharpee/stdlib';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { directionOfWord } from '../direction-words.js';
import { LoadError } from '../errors.js';
import { clauseOccurrenceKey, timerKey, type TimerRecord } from '../state-keys.js';
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

    const slots: ActSlots = {};
    const bound: Array<{ slot: string; value: IFEntity }> = [];
    for (const binding of stmt.slots) {
      if (binding.slot === 'direction') {
        const word = binding.value.kind === 'literal' ? binding.value.value : this.core.evaluator.entityValue(binding.value, ctx);
        const direction = directionOfWord(word);
        if (!direction) throw new LoadError(`Unknown direction \`${word}\`.`, stmt.span);
        slots.direction = direction;
        continue;
      }
      const entity = world.getEntity(this.core.evaluator.entityValue(binding.value, ctx));
      if (!entity) throw new LoadError(`\`${binding.slot}\` names nothing in the world.`, stmt.span);
      bound.push({ slot: binding.slot, value: entity });
    }
    // ADR-383 D6: each slot takes the seat the action's table gives its
    // name, so the order the statement names them in never moves a noun.
    // The compiler refuses a slot with no seat; this is the backstop.
    const seated = seatActBindings(bound, this.core.actionRoles(stmt.action));
    if (!seated.ok) {
      throw new LoadError(`runtime.act-unseated-slot: \`${seated.slot}\` has no seat in \`${stmt.action}\`.`, stmt.span);
    }
    Object.assign(slots, seated.seating);

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

  /** The current turn — the core owns the one implementation. */
  private turnNow(): number {
    return this.core.turnNow();
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
        if (record.phase === 'idle') this.writeTimer(qualified, world, { phase: 'running', turn: null, startedTurn: this.turnNow() });
        return [];
      case 'restart':
        this.writeTimer(qualified, world, { phase: 'running', turn: null, startedTurn: this.turnNow() });
        return [];
      case 'reset':
        this.writeTimer(qualified, world, { phase: 'idle', turn: null, startedTurn: -1 });
        return [];
      case 'stop':
        if (record.phase === 'running') this.writeTimer(qualified, world, { ...record, phase: 'stopped' });
        return [];
      case 'interrupt':
        if (record.phase === 'idle' || record.phase === 'expired') return [];
        return this.expireTimer(qualified, world);
    }
  }

  /**
   * Mark a timer expired and fire its `when … expires` clauses (once per run).
   * What the clauses report happened to the timer's owner, where the owner
   * is: it is sourced to them, so `{You}` reads in the owner's person — the
   * player's own words when they hold the role, a witness's otherwise — and
   * perception decides who sees it. A story timer's, or an owner with no
   * place (GH #372), goes out unsourced and speaks from the player.
   */
  private expireTimer(qualified: string, world: WorldModel): ISemanticEvent[] {
    const record = this.timerRecord(qualified, world);
    this.writeTimer(qualified, world, { ...record, phase: 'expired' });
    const out: ISemanticEvent[] = [];
    for (const { clause, it } of this.core.timerClauses.get(qualified) ?? []) {
      const evalCtx: ExecContext = it ? { world, it } : { world };
      if (clause.condition && !this.core.evaluator.evalCondition(clause.condition, evalCtx)) continue;
      out.push(...this.core.statements.execStatements(clause.body, evalCtx));
    }
    return this.sourcedToOwner(out, this.core.timerDefs.get(qualified), world);
  }

  /**
   * Tag a timer's report with its owner and the owner's place (ADR-328 D3, D4).
   *
   * @returns the events sourced to an entity owner with a place, else unchanged
   */
  private sourcedToOwner(events: ISemanticEvent[], def: IRTimerDef | undefined, world: WorldModel): ISemanticEvent[] {
    const owner = timerOwnerEntity(def);
    const at = owner === undefined ? undefined : this.core.placeOf(owner, world);
    return owner !== undefined && at ? this.core.sourced(events, owner, world, at) : events;
  }

  /**
   * ADR-325 D3f: one step for every running timer, in declaration order.
   * A timer started this turn waits for the next. Each step: the
   * `interrupted` roll, then the next named turn (its prose spoken, owner
   * present) or expiry; `meanwhile` only while still running afterward.
   *
   * The next turn is found by the NAME the record holds (ADR-388 D3): the
   * turn after it in the definition, or expiry after the last. A record
   * naming a turn the definition no longer lists is left where it is and
   * never stepped — that is the reconciler's unmappable case (ADR-388 D5),
   * reported there and never guessed at here.
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
      const owner = timerOwnerEntity(def);
      const ownerCtx: ExecContext = owner !== undefined ? { world, it: owner } : { world };
      if (def.interrupted !== null && this.core.evaluator.evalCondition({ kind: 'chance', n: def.interrupted }, ownerCtx)) {
        out.push(...this.expireTimer(def.qualified, world));
        continue;
      }
      const next = nextNamedTurn(def, record.turn);
      if (next === undefined) continue; // unmappable: a turn the definition no longer names
      if (next === null) {
        out.push(...this.expireTimer(def.qualified, world));
        continue;
      }
      this.writeTimer(def.qualified, world, { ...record, turn: next });
      const state = next;
      const table = this.core.ir.phrases.locales[this.core.ir.phrases.defaultLocale] ?? {};
      if (table[`${def.qualified}.${state}`]) {
        // ADR-328 D3: a named turn's prose fires wherever the player is;
        // an entity owner's place rides the event so it is tagged, not dropped.
        // An owner with no place at all — a bookkeeping entity that was never
        // placed, or one moved offstage — has nowhere to be heard from, so its
        // turn speaks from the player instead (GH #372, David's ruling): the
        // line goes out unsourced and the funnel defaults it to the player.
        const spoken = this.core.phrases.phraseEvent(`${def.qualified}.${state}`, { world });
        out.push(...this.sourcedToOwner([spoken], def, world));
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

    irEntity.onClauses.forEach((clause) => {
      if (clause.clauseKind !== 'after' || clause.action !== actionName) return;
      // ADR-327 D1: the head names who acts.
      if (!this.core.moveClauses.actorMatches(clause.actor, actorId, world)) return;
      const ctx: ExecContext = { world, it: targetIrId };
      if (clause.condition && !this.core.evaluator.evalCondition(clause.condition, ctx)) return;
      const key = clauseOccurrenceKey(clause.id);
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

/**
 * The named turn after `current` in the definition (ADR-388 D3): the first
 * turn when `current` is null (just started), the next one otherwise, null
 * once the last is passed (expiry), and undefined when `current` names a
 * turn the definition does not list.
 *
 * @param def the timer's definition
 * @param current the turn the record is on, or null before the first step
 * @returns the next turn's name, null for expiry, undefined when unmappable
 */
export function nextNamedTurn(def: Pick<IRTimerDef, 'states'>, current: string | null): string | null | undefined {
  if (current === null) return def.states[0] ?? null;
  const at = def.states.indexOf(current);
  if (at === -1) return undefined;
  return def.states[at + 1] ?? null;
}

/**
 * The entity a timer belongs to, or undefined for the story's — and for
 * `player`, the stand-in owner of a player timer in a story with no playable
 * character, which never loads.
 */
function timerOwnerEntity(def: IRTimerDef | undefined): string | undefined {
  return def?.owner != null && def.owner !== 'player' ? def.owner : undefined;
}
