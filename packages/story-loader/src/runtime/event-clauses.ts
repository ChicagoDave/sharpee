/**
 * event-clauses.ts — the runtime's event clauses section.
 *
 * Event clauses: an entity's `after entering it` and its kin bound to the
 * event stream per the selector contract, a region owner re-homing the verb
 * onto the crossing events, and the firing that runs a clause's body when
 * its event arrives with the actor and place it names.
 *
 * Public interface: EventClausesSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import type { IREntity, IROnClause } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { crossingRegionId, enteringDestination, EVENT_TRIGGERS, movedActorId, REGION_EVENT_TRIGGERS } from '../event-contract.js';
import { CHORD_OCCURRENCE_PREFIX } from '../state-keys.js';
import { ExecContext, type RuntimeCore } from './core.js';

export class EventClausesSection {
  constructor(private readonly core: RuntimeCore) {}

  /**
   * Bind an event clause (`after entering it` on a room or region) to its
   * trigger event per the selector contract — the ownership package's
   * replacement for floating `when` rules: the same firing semantics,
   * owned by the entity the event is about.
   */
  bindEventClause(world: WorldModel, entity: IREntity, clause: IROnClause, clauseIndex: number, trigger: string): void {
    const key = `chord.clause.${entity.id}.${clause.action}.${clauseIndex}`;
    world.chainEvent(
      trigger,
      (event, w) => this.fireEventClause(entity, clause, key, event, w as WorldModel),
      { key },
    );
  }

  /** The clause's trigger event type by owner kind, or undefined for non-event clauses. */
  eventTriggerFor(entity: IREntity, clause: IROnClause): string | undefined {
    const isRegionOwner = entity.kinds.some((k) => k.name === 'region');
    if (isRegionOwner) return REGION_EVENT_TRIGGERS[clause.action];
    // GH #341: the arrival event is a ROOM's story of a move. A THING's
    // `entering` clause means "someone enters this thing" and rides the
    // entering action's interceptor instead — bound to the arrival event it
    // could never fire (the event's destination is a room, never the thing).
    const isRoomOwner = entity.kinds.some((k) => k.name === 'room');
    return isRoomOwner ? EVENT_TRIGGERS[clause.action] : undefined;
  }

  /** Test/debug entry: run every event clause bound to this event type. */
  fireEventClauses(world: WorldModel, event: ISemanticEvent): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    for (const entity of this.core.ir.entities) {
      entity.onClauses.forEach((clause, clauseIndex) => {
        if (clause.binding === 'every-turn' || this.eventTriggerFor(entity, clause) !== event.type) return;
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
    // The clause is about its owner. Region owners (ADR-236 D6): the
    // crossing event names which boundary was crossed — fire only for this
    // region's own boundary (the emitter's getRegionCrossings already made
    // parent reactions crossing-accurate; no transitive widening here).
    if (entity.kinds.some((k) => k.name === 'region')) {
      if (crossingRegionId(event.data) !== this.core.host.entityId(entity.id)) return null;
    } else if (clause.action === 'entering' && enteringDestination(event.data) !== this.core.host.entityId(entity.id)) {
      // Room/enterable owners: `after the player entering` fires when the
      // movement's destination IS the owner — read through the AC-9 payload
      // guard, never a blind cast (the stdlib event is a foreign surface).
      return null;
    }
    // ADR-327 D1: the head names who arrives — the event's actor (the
    // walker, or the `move`d entity under D5) must be the head's actor.
    if (!this.core.moveClauses.actorMatches(clause.actor, movedActorId(event), world)) return null;

    const ctx: ExecContext = { world, it: entity.id };
    if (clause.condition && !this.core.evaluator.evalCondition(clause.condition, ctx)) return null;

    const occKey = CHORD_OCCURRENCE_PREFIX + key;
    const occurrence = ((world.getStateValue(occKey) as number | undefined) ?? 0) + 1;
    if (clause.once && occurrence > 1) return null; // `, once` — one lifetime firing (D5)
    world.setStateValue(occKey, occurrence);
    ctx.occurrence = occurrence;

    // Single pass — routing decided live, nothing recorded (ADR-289 D1).
    return this.core.statements.execStatements(clause.body, ctx);
  }
}
