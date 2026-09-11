/**
 * statements.ts — the runtime's statements section.
 *
 * Statement execution: the start block, and every clause body — `say`,
 * `set`, `change`, `move` with its lifecycle and arrival, `remove` and the
 * gone check, `select` over its strategies, `refuse` and the veto it
 * becomes, `emit`, counters, timers, acts — run in one of three passes
 * (mutations, reports, or both) with select decisions ledgered so the
 * report pass replays the mutations pass.
 *
 * Public interface: StatementsSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import { authoredInitiativeFor } from '@sharpee/character';
import type { IRCondition, IRStatement, IRValue, Span } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { Choice } from '@sharpee/if-domain';
import { killPlayer } from '@sharpee/stdlib';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { DecisionLedger } from '../decisions.js';
import { LoadError } from '../errors.js';
import { EVENT_TRIGGERS } from '../event-contract.js';
import { translateEventId } from '../event-id-map.js';
import { CHORD_GONE_PREFIX, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, counterKey, selectOccurrenceKey } from '../state-keys.js';
import { ExecContext, RefusalVeto, MOVE_ARRIVAL_DEPTH_CAP, type RuntimeCore } from './core.js';

export class StatementsSection {
  constructor(private readonly core: RuntimeCore) {}

  /**
   * Execute a statement tree. `phase` narrows which leaves act:
   * 'mutations' applies change/set/move only; 'reports' collects
   * phrase/emit/win/lose only; 'all' (rules) does both in source order.
   */
  /**
   * The world entity the start block assigned the player role to (ADR-327
   * D10). Set by the `change-player` effect while the world has no player;
   * read once by the loader's `createPlayer`. Undefined means the block ran
   * and never assigned — a load error, not a default.
   */
  assignedPlayerId?: string;

  /**
   * Run the story's `before the game starts` body against the fully built
   * world (ADR-327 D10).
   *
   * @param world the world every entity has already been built into
   * @returns the events the block's effects produced — ordinarily none, since
   *   the block takes effect statements only (`analysis.start-block-narration`)
   */
  runStartBlock(world: WorldModel): ISemanticEvent[] {
    this.core.assertBetweenTurns('runStartBlock');
    const block = this.core.ir.startBlock;
    if (!block) return [];
    this.core.inStartBlock = true;
    try {
      // A story-owned context: no owner entity, so `it` is unbound — the same
      // shape a story-owned daemon body runs in.
      return this.execStatements(block.body, { world });
    } finally {
      this.core.inStartBlock = false;
    }
  }

  execStatements(
    body: IRStatement[],
    ctx: ExecContext,
    phase: 'all' | 'mutations' | 'reports' = 'all',
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const ledger = ctx.ledger ?? DecisionLedger.live();
    // Statement `when` suffix (ratchet D7): the statement acts only if the
    // condition holds. ADR-289 D1 as amended — the truth is decided at this
    // statement's OWN position during the mutations pass and replayed in the
    // reports pass, so each line sees the effects of the lines above it and
    // both passes agree. (The comment that stood here claimed the passes
    // agree because the suffix runs before either phase's own mutations. That
    // is the guarantee that did not hold: `phrase … when it is armed`
    // followed by `change it to spent` emitted nothing, because by the reports
    // pass the mutation had already landed.)
    const whenHolds = (stmt: IRStatement & { stmtWhen?: IRCondition | null }): boolean => {
      const suffix = stmt.stmtWhen;
      if (!suffix) return true;
      return ledger.resolve(stmt, 'when', () => this.core.evaluator.evalCondition(suffix, ctx));
    };
    for (const stmt of body) {
      // Evaluated FIRST, before the phase gate, so the mutations pass decides
      // (and records) the suffix of a report-only statement at its position in
      // the sequence. Short-circuiting on `phase` here — as `phase !== '…' &&
      // whenHolds(stmt)` used to — would skip the recording pass entirely for
      // phrase/emit/win/lose/kill and leave the reports pass to re-derive.
      const holds = whenHolds(stmt);
      switch (stmt.kind) {
        case 'phrase':
          if (phase !== 'mutations' && holds) events.push(this.core.phrases.phraseEvent(stmt.phraseKey, ctx, stmt.params));
          break;
        case 'emit':
          // ADR-216: the payload evaluates live against the turn context —
          // literals as numbers/strings, value expressions through the
          // shared evaluator, arrays/objects recursively.
          // ADR-256: the Chord IR event id is dotless; translate it to the
          // platform runtime type here (media.* → dotted; author events pass
          // through). Not inside rawEvent — that also mints the internal
          // `chord.phrase` event, which must not be translated.
          if (phase !== 'mutations' && holds) events.push(this.core.rawEvent(translateEventId(stmt.event), this.core.phrases.emitPayload(stmt.payload, ctx)));
          break;
        case 'win':
        case 'lose':
          if (phase !== 'mutations' && holds) {
            if (stmt.phraseKey) events.push(this.core.phrases.phraseEvent(stmt.phraseKey, ctx));
            // `undefined` means the story had already ended this turn — the
            // first ending wins (ADR-347 D2d), so there is nothing to emit.
            const ended = this.core.host.triggerEnding(
              ctx.world,
              stmt.kind === 'win' ? 'victory' : 'defeat',
              this.core.turnNow(),
              stmt.phraseKey ?? undefined,
            );
            if (ended) events.push(ended);
          }
          break;
        case 'kill':
          // `kill the player` (ADR-227 Decision 4): terminal death via the
          // platform's killPlayer sink — the engine routes game-over off the
          // canonical if.event.player.died it returns; triggerEnding is NOT
          // called (a distinct lowering target from win/lose). The phrase
          // carries the death text; the cause derives from the phrase key.
          if (phase !== 'mutations' && holds) {
            if (stmt.phraseKey) events.push(this.core.phrases.phraseEvent(stmt.phraseKey, ctx));
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
          if (phase !== 'reports' && holds) {
            if (stmt.entity.kind === 'story') {
              // `change the story to <state>` — the story object's phase (D2).
              this.checkForwardMarch(
                this.core.ir.story.states,
                this.core.ir.story.reversible,
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
        case 'change-player': {
          // ADR-327 D9/D10 — one statement, two moments. Inside the start
          // block it IS the assignment: the loader reads `assignedPlayerId`
          // and returns that entity from `createPlayer`. Anywhere else it is a
          // request the engine drains at turn end, because the loader holds no
          // engine handle (the `triggerEnding` seam).
          if (holds) {
            if (this.core.inStartBlock) {
              // A state change: it belongs to the mutations pass.
              if (phase !== 'reports') this.assignedPlayerId = this.core.evaluator.entityValue(stmt.entity, ctx);
            } else if (phase !== 'mutations') {
              // A signal for the engine to act on at the turn boundary, so it
              // rides the REPORTS pass — the mutations pass's events are
              // recorded and dropped, which is where this request went missing.
              const targetId = this.core.evaluator.entityValue(stmt.entity, ctx);
              if (targetId) {
                events.push(this.core.rawEvent('if.event.player.switch_requested', { entityId: targetId }));
              }
            }
          }
          break;
        }
        case 'move': {
          if (phase !== 'reports' && holds) {
            const thing = this.core.evaluator.entityValue(stmt.entity, ctx);
            this.moveWithLifecycle(thing, this.resolvePlace(stmt.place, ctx, thing), ctx);
          }
          break;
        }
        case 'act': {
          // ADR-329 D4: one action, now, as the named character, through the
          // engine's execution entry. Runs ONCE — in a single pass, or the
          // mutations pass of a two-pass body. Its events were applied inside
          // the entry, so they never join this body's return (an action's or
          // a handler's return is re-applied); they wait in the act buffer
          // for the flush plugin, which lands them right after the report
          // that caused them — or for the drain daemon, on the tick.
          if (phase !== 'reports' && holds) {
            for (const e of this.core.timers.performAct(stmt, ctx)) this.core.pendingActEvents.push(e);
          }
          break;
        }
        case 'remove': {
          if (phase !== 'reports' && holds) {
            const thing = this.core.evaluator.entityValue(stmt.entity, ctx);
            // ADR-325 Z6 as amended (GH #345, #330): `remove` marks the
            // entity GONE rather than destroying it — offstage through the
            // move lifecycle (which narrates `disappeared` exactly as
            // `move … offstage` does), plus the gone flag. Conditions that
            // still name it evaluate; nothing throws.
            this.markGone(thing, ctx);
          }
          break;
        }
        case 'set': {
          if (phase !== 'reports' && holds) {
            const value = this.core.evaluator.evalValue(stmt.value, ctx);
            if (stmt.target.kind === 'field' && stmt.target.field === 'landing') {
              // `set <region>'s landing to <room>` (ADR-325 D5).
              const regionId = this.core.evaluator.entityValue(stmt.target.base, ctx);
              if (typeof value !== 'string' || !ctx.world.getEntity(value)?.has(TraitType.ROOM)) {
                throw new LoadError('A landing is set to a room.', stmt.span);
              }
              this.core.evaluator.setLanding(regionId, value, ctx.world);
            } else if (stmt.target.kind === 'field') {
              // Trait data fields (`set its treats to 3`) write the entity's
              // chord trait instance — world state via traits (AC-6-safe).
              const baseId = this.core.evaluator.entityValue(stmt.target.base, ctx);
              this.core.dispatchVerbs.writeChordTraitField(ctx.world, baseId, stmt.target.field, value, stmt.span);
            } else {
              throw new LoadError('`set` targets a trait data field.', stmt.span);
            }
          }
          break;
        }
        case 'award': {
          if (phase !== 'reports' && holds) {
            // `award <score>` — dedup by identity (ADR-129), so repeat
            // awards are no-ops and `, once` is automatic. Names arrive
            // owner-qualified from the analyzer (ratchet D12).
            if (stmt.expression.length !== 1) {
              throw new LoadError('Only `award <score-name>` is supported (expression awards are later scope).', stmt.span);
            }
            const name = stmt.expression[0];
            const worth = this.core.scoreWorth.get(name);
            if (worth === undefined) {
              throw new LoadError(`\`${name}\` is not a declared score.`, stmt.span);
            }
            ctx.world.awardScore(name, worth, name);
          }
          break;
        }
        case 'timer': {
          // ADR-325 D3c: the five verbs. `interrupt` expires the timer now
          // and fires its expiry clauses in place — decided once in the
          // mutations pass, their narration replayed to the reports pass.
          if (!holds) break;
          const fired = ledger.resolve(stmt, 'expiry', () => this.core.timers.runTimerVerb(stmt.verb, stmt.timer, ctx));
          if (phase !== 'mutations') events.push(...fired);
          break;
        }
        case 'raise':
        case 'lower': {
          // ADR-264 D2: additive counter mutation with silent two-sided clamp.
          if (phase !== 'reports' && holds) {
            const ownerIrId = stmt.owner === null ? null : this.irIdOfValue(stmt.owner, ctx);
            const key = counterKey(stmt.counter, ownerIrId ?? undefined);
            const bounds = this.core.phrases.counterBounds(stmt.counter, ownerIrId);
            const current = Number(ctx.world.getStateValue(key) ?? 0);
            let next = current + (stmt.kind === 'raise' ? stmt.amount : -stmt.amount);
            if (bounds) {
              if (bounds.lo !== null && next < bounds.lo) next = bounds.lo;
              if (bounds.hi !== null && next > bounds.hi) next = bounds.hi;
            }
            ctx.world.setStateValue(key, next);
          }
          break;
        }
        case 'set-counter': {
          // ADR-325 D4: absolute tally assignment, clamped like raise/lower.
          if (phase !== 'reports' && holds) {
            const ownerIrId = stmt.owner === null ? null : this.irIdOfValue(stmt.owner, ctx);
            const key = counterKey(stmt.counter, ownerIrId ?? undefined);
            const bounds = this.core.phrases.counterBounds(stmt.counter, ownerIrId);
            let next = stmt.value;
            if (bounds) {
              if (bounds.lo !== null && next < bounds.lo) next = bounds.lo;
              if (bounds.hi !== null && next > bounds.hi) next = bounds.hi;
            }
            ctx.world.setStateValue(key, next);
          }
          break;
        }
        case 'refuse':
        case 'must':
        case 'refuse-when':
          // The refusal partition is consumed by findRefusal (validate
          // phase); nothing to do in execute/report passes.
          break;
        case 'change-mood':
        case 'change-feeling': {
          // ADR-310 D3 transitions: the clause owner's character model
          // mutates in the mutations pass; the from→to record replays to
          // the reports pass, which emits the author-channel transition
          // row (D11) — never player prose (D12).
          if (!holds) break;
          const record = ledger.resolve(stmt, 'transition', () => this.core.phrases.execCharacterTransition(stmt, ctx));
          if (phase !== 'mutations' && record && record.from !== record.to) {
            events.push({
              id: `chord-${record.type}-${this.core.eventSeq++}`,
              type: record.type,
              timestamp: Date.now(),
              entities: { actor: record.actor },
              data: {
                from: record.from,
                to: record.to,
                ...(record.target !== undefined ? { target: record.target } : {}),
              },
            });
          }
          break;
        }
        case 'select-on': {
          const decided = ledger.resolve(stmt, 'arm', () => this.decideSelectOn(stmt, ctx));
          const arm = stmt.arms.find((a) => a.value === decided);
          if (arm) events.push(...this.execStatements(arm.body, ctx, phase));
          break;
        }
        case 'select-strategy': {
          // ADR-289 D1: the counter is consumed by the mutations pass, at this
          // position, and the index replayed to the reports pass. Deciding in
          // both passes is the H1 double-advance.
          const index = ledger.resolve(stmt, 'alternative', () => this.decideStrategy(stmt, ctx));
          const alternative = stmt.alternatives[index];
          if (alternative) events.push(...this.execStatements(alternative, ctx, phase));
          break;
        }
        case 'ordinal': {
          const met = ledger.resolve(stmt, 'ordinalMet', () => ctx.occurrence === stmt.ordinal);
          if (met) {
            events.push(...this.execStatements(stmt.body, ctx, phase));
          }
          break;
        }
        case 'each':
          // E3 (ratchet 2026-07-12): run the body once per matching entity
          // in creation order, `the match` bound to it; `it` and every
          // other binding pass through untouched. Empty set = no-op.
          //
          // ADR-289 D1: the match SET is recorded (one answer, keyed by this
          // statement), but the BODY runs under a live ledger in both passes.
          // The record is keyed by statement identity alone, so recording
          // inside the body would hand every iteration the last iteration's
          // answer. Live-in-both-passes is how `each` bodies behaved before
          // the ledger existed; the two passes may disagree there, and that
          // is D1's one recorded gap.
          for (const irId of this.eachMatches(stmt, ctx)) {
            events.push(...this.execStatements(stmt.body, { ...ctx, match: irId, ledger: DecisionLedger.live() }, phase));
          }
          break;
        case 'then-open':
        case 'deflect':
        case 'leave':
        case 'hold-tongue':
          // ADR-320 conversation statements are extracted by the dialogue
          // dispatch paths before a body reaches this walker (`hold-tongue`
          // never leaves authoredInitiativeFor). Reaching one here is rogue
          // IR — loud failure, never a silent fallthrough (Phase 7 design §7).
          throw new LoadError(
            `Conversation statement \`${stmt.kind}\` outside dialogue dispatch.`,
            stmt.span,
          );
        default: {
          // Unreachable at runtime; exists so the compiler proves every IR
          // statement kind is executed by this walker.
          const unhandled: never = stmt;
          throw new Error(`Unhandled statement kind: ${(unhandled as { kind: string }).kind}`);
        }
      }
    }
    // Z3: witnessed lifecycle narration enqueued during mutation phases
    // (move/remove above; the removal observer) lands in the next report-
    // collecting pass. Mutations-only passes never drain — their return
    // value is discarded by the interceptor call sites.
    if (phase !== 'mutations') events.push(...this.core.phrases.drainChannelEvents());
    return events;
  }

  /**
   * Z3: `move` with lifecycle narration (D11, as amended by ADR-328 D3).
   * `exited` fires for the mover's SOURCE room at the transition (when the
   * move really changes rooms); `entered` for the DESTINATION room after
   * arrival. Both rows fire wherever the player is, each stamped with its
   * room; the engine tags `presence` and the client hides what the player
   * was absent from. Narration is enqueued, never emitted inline from the
   * mutation pass. Moving the player itself never narrates.
   *
   * @param thingWorldId the moved entity's world id
   * @param placeWorldId the destination's world id
   * @param ctx the executing context (live world)
   */
  /**
   * Resolve a `move` destination (ADR-325 D1–D2) to a world id, or null for
   * `offstage`. A possessive `location` whose owner is offstage has no
   * place to move to: a diagnostic naming the owner, never a silent no-op.
   */
  private resolvePlace(place: IRValue, ctx: ExecContext, moverWorldId: string): string | null {
    if (place.kind === 'symbol' && place.name === 'offstage') return null;
    if (place.kind === 'symbol' && place.name === 'adjacent-room') {
      // ADR-326 D1–D3: drawn at effect time from the mover's own room.
      const drawn = this.core.evaluator.drawAdjacentRoom(moverWorldId, ctx.world);
      if (drawn === undefined) {
        const mover = ctx.world.getEntity(moverWorldId);
        const roomId = ctx.world.getContainingRoom(moverWorldId)?.id ?? ctx.world.getLocation(moverWorldId);
        const room = roomId ? ctx.world.getEntity(roomId) : undefined;
        throw new LoadError(
          `Cannot move ${mover?.name ?? moverWorldId} to a random adjacent room — no exit from ${room?.name ?? 'its location'} is traversable right now.`,
        );
      }
      return drawn;
    }
    const resolved = this.core.evaluator.evalValue(place, ctx);
    if (typeof resolved === 'string' && ctx.world.getEntity(resolved)) {
      // ADR-325 D5: a region with a landing is a place — land there.
      return this.core.evaluator.drawLanding(resolved, ctx.world) ?? resolved;
    }
    if (place.kind === 'field' && place.field === 'location') {
      const ownerId = this.core.evaluator.evalValue(place.base, ctx);
      const owner = typeof ownerId === 'string' ? ctx.world.getEntity(ownerId) : undefined;
      const name = owner?.name ?? 'the owner';
      throw new LoadError(`Cannot move to ${name}'s location — ${name} is offstage.`);
    }
    throw new LoadError(`Expected a place, got \`${String(resolved)}\`.`);
  }

  /**
   * Move an entity and enqueue its lifecycle narration: `exited` for the
   * room it leaves, `entered` for the room it arrives in, and `disappeared`
   * (ADR-325 D2, the same row `remove` uses) when it goes offstage — each
   * tagged by room (ADR-328 D3), none dropped. `placeWorldId` null detaches
   * the entity (offstage).
   */
  /**
   * Take an entity out of play (ADR-325 Z6 as amended, GH #345): move it
   * offstage through the ordinary move lifecycle — the `disappeared` row
   * fires for whoever witnessed it — and stamp the gone flag under its IR
   * id. The entity stays in the world: conditions naming it evaluate
   * (`is here` false, `has` false, location nowhere), its states read as
   * last set, and a save carries the flag. Already gone → nothing happens.
   * A non-story entity (no IR id) is only moved offstage.
   *
   * @param worldId the entity to remove
   * @param ctx the executing clause's context
   */
  private markGone(worldId: string, ctx: ExecContext): void {
    const irId = this.core.host.irIdOf(worldId);
    if (irId !== undefined && ctx.world.getStateValue(CHORD_GONE_PREFIX + irId) === true) return;
    this.moveWithLifecycle(worldId, null, ctx);
    if (irId !== undefined) ctx.world.setStateValue(CHORD_GONE_PREFIX + irId, true);
  }

  /** True while a Chord `remove` has taken the entity out of play. */
  isGone(worldId: string, world: WorldModel): boolean {
    const irId = this.core.host.irIdOf(worldId);
    return irId !== undefined && world.getStateValue(CHORD_GONE_PREFIX + irId) === true;
  }

  private moveWithLifecycle(thingWorldId: string, placeWorldId: string | null, ctx: ExecContext): void {
    const world = ctx.world;
    const roomOf = (id: string): string | undefined =>
      world.getContainingRoom(id)?.id ?? world.getLocation(id);
    const fromRoom = roomOf(thingWorldId);
    world.moveEntity(thingWorldId, placeWorldId);
    const toRoom = roomOf(thingWorldId);
    // A move back into the world revives a gone entity (ADR-325 Z6 as
    // amended): the flag is the story's "over", and a later `move` unsays it.
    if (placeWorldId !== null) {
      const irId = this.core.host.irIdOf(thingWorldId);
      if (irId !== undefined && world.getStateValue(CHORD_GONE_PREFIX + irId) === true) {
        world.setStateValue(CHORD_GONE_PREFIX + irId, false);
      }
    }

    this.witnessMove(thingWorldId, placeWorldId, fromRoom, toRoom, world);

    // ADR-327 D5: an arrival is an arrival, walked or moved — a room
    // transition fires the destination's entering clauses and every
    // `when <entity> moves` clause for the mover, whoever the mover is.
    if (placeWorldId !== null && toRoom !== undefined && fromRoom !== toRoom) {
      const outermost = this.core.moveArrivalDepth === 0;
      this.fireMoveArrival(thingWorldId, fromRoom, toRoom, world);
      // GH #331: an authorial move of the PLAYER describes the destination,
      // as a walked arrival does — the real looking action, run as the
      // player through the engine's execution entry, its events riding the
      // acting-statement flush (right after the action, ahead of the
      // scheduler, so the description precedes the arrival clauses'
      // narration exactly as it does for `going`). Only the outermost move
      // of a re-entry chain describes, so a blocked-stall bounce shows the
      // room the player ends in, not every room passed through.
      if (outermost && thingWorldId === world.getPlayer()?.id) {
        this.describeArrival(thingWorldId);
      }
    }
  }

  /**
   * Describe the player's surroundings after an authorial move (GH #331):
   * runs `if.action.looking` as the player through the engine's execution
   * entry and queues its events for the act flush. A no-op before the
   * engine is ready (a `before the game starts` move — the boot look
   * describes the start room anyway).
   *
   * @param playerId the player's world id, the mover
   */
  private describeArrival(playerId: string): void {
    if (!this.core.executionEntry) return;
    for (const e of this.core.executionEntry(playerId, 'if.action.looking').events) this.core.pendingActEvents.push(e);
  }

  /**
   * The `exited`/`entered`/`disappeared` rows for a move (ADR-325 D2, Z3),
   * as amended by ADR-328 D3: both rows fire on every room transition,
   * each stamped with the room it happened in (`exited`/`disappeared` the
   * source, `entered` the destination) and the mover as actor. The engine
   * tags `presence` from that room and the client hides what the player
   * was absent from — the rows are no longer dropped here, so the
   * `(owner, channel)` Choice counters advance off-stage.
   */
  private witnessMove(
    thingWorldId: string,
    placeWorldId: string | null,
    fromRoom: string | undefined,
    toRoom: string | undefined,
    world: WorldModel,
  ): void {
    if (thingWorldId === world.getPlayer()?.id) return; // the player's own move narrates as travel
    const irId = this.core.host.irIdOf(thingWorldId);
    if (!irId) return;
    if (fromRoom === toRoom) return; // not a room transition — nothing to witness
    const placed = (event: ISemanticEvent | null, room: string): void => {
      if (!event) return;
      this.core.phrases.enqueueChannelEvent({
        ...event,
        entities: { ...event.entities, actor: event.entities?.actor ?? thingWorldId, location: room },
      });
    };
    if (fromRoom !== undefined) {
      placed(this.core.phrases.channelEvent(irId, placeWorldId === null ? 'disappeared' : 'exited', world), fromRoom);
    }
    if (toRoom !== undefined) {
      placed(this.core.phrases.channelEvent(irId, 'entered', world), toRoom);
    }
  }

  /**
   * Fire the loader's own arrival for a `move` (ADR-327 D5): the destination
   * room's `entering` event clauses and the `when <entity> moves` clauses,
   * exactly as a walked arrival's `actor_moved` would through the engine's
   * chain — but fired here, not emitted, so the engine never fires them a
   * second time. Whatever the clauses produce is enqueued as channel
   * narration and drained by the enclosing report pass (the Z3 sink).
   * @throws LoadError `runtime.move-arrival-reentry` past 8 nested arrivals
   */
  private fireMoveArrival(actorId: string, fromRoom: string | undefined, toRoom: string, world: WorldModel): void {
    if (this.core.moveArrivalDepth >= MOVE_ARRIVAL_DEPTH_CAP) {
      const chain = [...this.core.moveArrivalChain, toRoom].map((id) => world.getEntity(id)?.name ?? id).join(' → ');
      throw new LoadError(
        `runtime.move-arrival-reentry: a \`move\` arrival re-entered ${MOVE_ARRIVAL_DEPTH_CAP} times (${chain}) — an entering clause keeps moving the arriver into a room whose entering clause moves them again.`,
      );
    }
    const event: ISemanticEvent = {
      id: `chord-move-arrival-${++this.core.eventSeq}`,
      type: EVENT_TRIGGERS.entering,
      timestamp: Date.now(),
      entities: { actor: actorId },
      data: { actorId, fromRoom, toRoom },
    };
    this.core.moveArrivalDepth++;
    this.core.moveArrivalChain.push(toRoom);
    try {
      const produced = [...this.core.eventClauses.fireEventClauses(world, event), ...this.core.moveClauses.fireMoveClauses(world, event)];
      for (const e of produced) this.core.phrases.enqueueChannelEvent(e);
    } finally {
      this.core.moveArrivalDepth--;
      this.core.moveArrivalChain.pop();
    }
  }

  /**
   * The declared set a `change` target state belongs to on an entity, with
   * its D4 policy — a composed trait's set, or the entity's own `states:`
   * line (merged list minus trait states). Null when the state is unknown
   * (the analyzer gates that; being lenient here keeps the check pure).
   */
  private stateSetOf(irId: string, state: string): { states: string[]; reversible: boolean } | null {
    const irEntity = this.core.ir.entities.find((e) => e.id === irId);
    if (!irEntity) return null;
    const traitStates = new Set<string>();
    for (const comp of irEntity.traits) {
      const trait = this.core.ir.traits.find((t) => t.name === comp.name);
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
  findRefusal(body: IRStatement[], ctx: ExecContext): RefusalVeto | null {
    for (const stmt of body) {
      if (stmt.kind === 'refuse') return this.refusalOf(stmt.phraseKey, ctx);
      if (stmt.kind === 'must') {
        if (!this.core.evaluator.evalCondition(stmt.condition, ctx)) return this.refusalOf(stmt.phraseKey, ctx);
        continue;
      }
      if (stmt.kind === 'refuse-when') {
        if (this.core.evaluator.evalCondition(stmt.condition, ctx)) return this.refusalOf(stmt.phraseKey, ctx);
        continue;
      }
      break; // first non-refusal statement ends the validate partition
    }
    return null;
  }

  /**
   * Resolve a refusal phrase key to its veto payload. A per-entity
   * `phrase <key>:` declaration registers entity-scoped as `<irId>.<key>` —
   * the same override rule `phraseEvent` applies at emit time — so a bare
   * refusal key written inside that entity's clause must travel as the
   * scoped id: the key crosses into stdlib's blocked() as a fully-qualified
   * message id (ADR-231 D1). A key with a phrase-table entry additionally
   * stages that phrase's render params — in particular the strategy
   * variants as a Choice — so the refusal selects an arm exactly as a
   * `phrase <key>` statement does, instead of rendering the registered
   * `{variants}` template's placeholder literally (GH #304). A key with no
   * table entry (a bare message id, or a book-covered key whose template
   * the render-path book layer supplies, ADR-250) travels alone, as before.
   */
  refusalOf(key: string, ctx: ExecContext): RefusalVeto {
    const table = this.core.ir.phrases.locales[this.core.ir.phrases.defaultLocale] ?? {};
    const overrideKey = ctx.it && table[`${ctx.it}.${key}`] ? `${ctx.it}.${key}` : key;
    const phrase = table[overrideKey];
    if (!phrase) return { error: overrideKey };
    const params: Record<string, unknown> = {};
    this.core.phrases.stagePhraseParams(params, overrideKey, phrase, null, ctx);
    return Object.keys(params).length > 0 ? { error: overrideKey, params } : { error: overrideKey };
  }

  /**
   * The match set for an `each` block: decided by the mutations pass at this
   * statement's position and replayed to the reports pass (§5.4 — the report
   * pass must visit the same entities the execute pass did, even after the
   * body's own mutations change who matches). Live in single-pass contexts.
   */
  private eachMatches(stmt: Extract<IRStatement, { kind: 'each' }>, ctx: ExecContext): string[] {
    const ledger = ctx.ledger ?? DecisionLedger.live();
    return ledger.resolve(stmt, 'matches', () => this.core.evaluator.matchesOf(stmt.condition, ctx));
  }

  private decideSelectOn(stmt: Extract<IRStatement, { kind: 'select-on' }>, ctx: ExecContext): string {
    return String(this.core.evaluator.evalValue(stmt.subject, ctx));
  }

  private decideStrategy(stmt: Extract<IRStatement, { kind: 'select-strategy' }>, ctx: ExecContext): number {
    const count = stmt.alternatives.length;
    if (count === 0) return 0;
    // Occurrence-ordered strategies key off world state; randomly keys off
    // the persisted chance stream (via one draw per firing). Sticky (Z5)
    // reuses the same slot with the Choice encoding instead of an
    // occurrence count: stored = chosen index + 1, 0/undefined = unchosen.
    const key = selectOccurrenceKey(stmt.id, ctx.owner);
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
      if (this.core.evaluator.evalCondition({ kind: 'chance', n: count - i }, ctx)) return i;
    }
    return count - 1;
  }

  private irIdOfValue(value: IRValue, ctx: ExecContext): string {
    if (value.kind === 'entity') return value.id;
    if (value.kind === 'it') {
      if (!ctx.it) throw new LoadError('`it` used outside an entity-scoped clause.');
      return ctx.it;
    }
    const worldId = this.core.evaluator.entityValue(value, ctx);
    const irId = this.core.host.irIdOf(worldId);
    if (!irId) throw new LoadError('Cannot change the state of a non-story entity.');
    return irId;
  }
}
