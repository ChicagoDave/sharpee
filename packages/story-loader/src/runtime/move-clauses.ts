/**
 * move-clauses.ts — the runtime's move clauses section.
 *
 * `when <entity> moves` clauses: bound to the actor-moved event at bind, each
 * firing when the named entity is the mover and the clause's from/to and
 * actor filters hold.
 *
 * Public interface: MoveClausesSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import type { IREntity, IRMoveClause, IRValue } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { EVENT_TRIGGERS, movedActorId } from '../event-contract.js';
import { CHORD_OCCURRENCE_PREFIX } from '../state-keys.js';
import { ExecContext, type RuntimeCore } from './core.js';

export class MoveClausesSection {
  constructor(private readonly core: RuntimeCore) {}

  /** Bind step: `when <entity> moves` clauses on the actor-moved event. */
  bindMoveClauses(world: WorldModel): void {
    // `when <entity> moves` clauses (ADR-325 D3h) ride the actor-moved event.
    for (const entity of this.core.ir.entities) {
      (entity.moveClauses ?? []).forEach((clause, clauseIndex) => {
        const key = `chord.moves.${entity.id}.${clauseIndex}`;
        world.chainEvent(
          EVENT_TRIGGERS.entering,
          (event, w) => this.fireMoveClause(entity, clause, key, event, w as WorldModel),
          { key },
        );
      });
    }
  }

  /** Test/debug entry: run every `when <entity> moves` clause for this event. */
  fireMoveClauses(world: WorldModel, event: ISemanticEvent): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    if (event.type !== EVENT_TRIGGERS.entering) return out;
    for (const entity of this.core.ir.entities) {
      (entity.moveClauses ?? []).forEach((clause, clauseIndex) => {
        const produced = this.fireMoveClause(entity, clause, `chord.moves.${entity.id}.${clauseIndex}`, event, world);
        if (produced) out.push(...produced);
      });
    }
    return out;
  }

  /**
   * ADR-327 D1: does this actor satisfy a clause head? `the player` is the
   * ROLE — compared against `world.getPlayer()` at fire time, never cached,
   * so a head follows a PC switch (ADR-132/D9); a named actor is its world
   * entity. A null head (bare / every-turn) is gated by its own path.
   * @param actor the IR head actor, or null
   * @param actorId the acting entity's world id, if the path knows one
   * @param world the live world (for the player role)
   */
  actorMatches(actor: IRValue | null, actorId: string | undefined, world: WorldModel): boolean {
    if (actor === null) return true;
    if (actorId === undefined) return false;
    if (actor.kind === 'player') return actorId === world.getPlayer()?.id;
    if (actor.kind === 'entity') return actorId === this.core.host.entityId(actor.id);
    return false;
  }

  /**
   * `when <entity> moves [, while <cond>]` (ADR-325 D3h): fires when the
   * actor-moved event's actor is the mover's world entity — the completed
   * move only (a refused go emits no actor-moved event). `it` is the owner.
   */
  private fireMoveClause(
    entity: IREntity,
    clause: IRMoveClause,
    key: string,
    event: ISemanticEvent,
    world: WorldModel,
  ): ISemanticEvent[] | null {
    const moverId = clause.mover.kind === 'player'
      ? world.getPlayer()?.id
      : clause.mover.kind === 'entity' ? this.core.host.entityId(clause.mover.id) : undefined;
    if (!moverId || movedActorId(event) !== moverId) return null;

    const ctx: ExecContext = { world, it: entity.id };
    if (clause.condition && !this.core.evaluator.evalCondition(clause.condition, ctx)) return null;

    const occKey = CHORD_OCCURRENCE_PREFIX + key;
    const occurrence = ((world.getStateValue(occKey) as number | undefined) ?? 0) + 1;
    world.setStateValue(occKey, occurrence);
    ctx.occurrence = occurrence;
    return this.core.statements.execStatements(clause.body, ctx);
  }
}
