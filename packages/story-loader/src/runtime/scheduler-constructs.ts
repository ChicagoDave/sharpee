/**
 * scheduler-constructs.ts — the runtime's scheduler constructs section.
 *
 * Scheduler constructs: `once`/`every`/`define sequence` and every-turn
 * clauses as plugin-scheduler daemons, each checking the story is not over
 * before it runs; the arrival reaction a landed topic fires; and the
 * machine-body executor the state-machine extension calls.
 *
 * Public interface: SchedulerConstructsSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import type { IREntity, IROnClause, IRStatement } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { STORY_ENDING_FLAG } from '@sharpee/if-domain';
import { HealthTrait, WorldModel } from '@sharpee/world-model';
import { CHORD_OCCURRENCE_PREFIX, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, CHORD_TRAIT_PREFIX } from '../state-keys.js';
import { ExecContext, SchedulerDaemon, knownTopicsIn, type RuntimeCore } from './core.js';

export class SchedulerConstructsSection {
  constructor(private readonly core: RuntimeCore) {}

  /**
   * Build the story's scheduler daemons (`once` / `every N turns` /
   * `define sequence` / every-turn trait clauses). ALL progression state is
   * namespaced world state — save/restore/undo cover it with no
   * getRunnerState plumbing (design.md §6). Registered by
   * ChordStory.onEngineReady; exposed for direct unit driving.
   */
  buildSchedulerDaemons(): SchedulerDaemon[] {
    const daemons: SchedulerDaemon[] = [];

    // ADR-325 D3f: the timer stepper runs ahead of every other daemon
    // kind — a timer's turn is decided before anything else reacts to it.
    if (this.core.timerDefs.size > 0) {
      daemons.push({
        id: 'chord.timers',
        name: 'ADR-325 timers',
        run: (ctx) => this.core.timers.stepTimers(ctx),
      });
    }

    for (const sequence of this.core.ir.sequences) {
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
          if (this.storyOver(ctx.world)) return [];
          const next = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
          ctx.world.setStateValue(key, next + 1);
          ctx.world.setStateValue(firedKey, ctx.turn);
          const step = sequence.steps[next];
          return this.core.narrated(this.core.statements.execStatements(step.body, { world: ctx.world, occurrence: next + 1 }));
        },
      });
    }

    // Entity every-turn clauses (`on every turn while …[, once]` in a
    // create block): one daemon per clause, `it` = the owning entity
    // (stickiness — the ownership package's replacement for floating
    // `once <cond>` rules).
    this.core.ir.entities.forEach((irEntity) => {
      irEntity.onClauses.forEach((clause, clauseIndex) => {
        if (clause.binding !== 'every-turn') return;
        daemons.push({
          id: `chord.entity-turn.${irEntity.id}.${clauseIndex}`,
          name: `on every turn (${irEntity.id})`,
          run: (ctx) => this.runEntityTurnClause(irEntity, clause, clauseIndex, ctx.world),
        });
      });
    });

    // Story-owned every-turn clauses (`on every turn` in the story header
    // body — ADR-236 D7, ratchet R4): one daemon per clause with NO
    // presence gate — the story is everywhere ("a background clock for the
    // whole game"); narration broadcasts. `it` never appears in the body
    // (the analyzer's story-clause-it gate refused it at compile).
    (this.core.ir.story.onClauses ?? []).forEach((clause, clauseIndex) => {
      if (clause.binding !== 'every-turn') return;
      const key = `${CHORD_OCCURRENCE_PREFIX}story-turn.${clauseIndex}`;
      daemons.push({
        id: `chord.story-turn.${clauseIndex}`,
        name: 'on every turn (story)',
        run: (ctx) => {
          if (this.storyOver(ctx.world)) return [];
          const evalCtx: ExecContext = { world: ctx.world };
          if (clause.condition && !this.core.evaluator.evalCondition(clause.condition, evalCtx)) return [];
          const fired = ((ctx.world.getStateValue(key) as number | undefined) ?? 0) + 1;
          if (clause.once && fired > 1) return []; // `, once` (D5)
          ctx.world.setStateValue(key, fired);
          evalCtx.occurrence = fired;
          return this.core.narrated(this.core.statements.execStatements(clause.body, evalCtx));
        },
      });
    });

    // Every-turn trait clauses (`on every turn while …[, once]`): one
    // daemon per clause, evaluated per entity carrying the trait. The
    // composition condition (`chatty while not after-hours`) gates per
    // entity per turn (Prerequisite 2's NPC-behavior shape).
    this.core.ir.traits.forEach((trait) => {
      trait.onClauses.forEach((clause, clauseIndex) => {
        if (clause.binding !== 'every-turn') return;
        const traitType = CHORD_TRAIT_PREFIX + trait.name;
        daemons.push({
          id: `chord.trait-turn.${trait.name}.${clauseIndex}`,
          name: `on every turn (${trait.name})`,
          run: (ctx) => {
            const out: ISemanticEvent[] = [];
            if (this.storyOver(ctx.world)) return out;
            for (const irEntity of this.core.ir.entities) {
              const comp = irEntity.traits.find((t) => t.name === trait.name);
              if (!comp) continue;
              const worldId = this.core.host.entityId(irEntity.id);
              const entity = worldId ? ctx.world.getEntity(worldId) : undefined;
              if (!entity?.has(traitType)) continue;
              // Role gate (ADR-327 D9) before any condition, so the RNG
              // stream and `, once` are untouched while the owner is the PC.
              // No presence gate (ADR-328 D3): off-stage firings are tagged,
              // not dropped.
              if (this.core.timers.holdsPlayerRole(ctx.world, irEntity.id)) continue;
              const evalCtx: ExecContext = { world: ctx.world, it: irEntity.id };
              if (comp.condition && !this.core.evaluator.evalCondition(comp.condition, evalCtx)) continue;
              if (clause.condition && !this.core.evaluator.evalCondition(clause.condition, evalCtx)) continue;
              const key = `${CHORD_OCCURRENCE_PREFIX}trait-turn.${trait.name}.${clauseIndex}.${irEntity.id}`;
              const fired = ((ctx.world.getStateValue(key) as number | undefined) ?? 0) + 1;
              if (clause.once && fired > 1) continue; // `, once` (D5)
              ctx.world.setStateValue(key, fired);
              evalCtx.occurrence = fired;
              const at = this.core.placeOf(irEntity.id, ctx.world);
              out.push(...this.core.sourced(this.core.statements.execStatements(clause.body, evalCtx), irEntity.id, ctx.world, at));
            }
            return this.core.narrated(out);
          },
        });
      });
    });

    // Z3: a `disappeared` narration enqueued OUTSIDE statement execution
    // (a TS-initiated removeEntity — daemon, hatch, interceptor) has no
    // report pass to drain it; this daemon delivers it on the tick.
    // Registered only when the channel is authored, so channel-less
    // stories keep their exact daemon roster.
    const table = this.core.ir.phrases.locales[this.core.ir.phrases.defaultLocale] ?? {};
    if (Object.keys(table).some((key) => key.endsWith('.disappeared'))) {
      daemons.push({
        id: 'chord.channel-drain',
        name: 'Z3 channel narration drain',
        condition: () => this.core.pendingChannelEvents.length > 0,
        run: () => this.core.phrases.drainChannelEvents(),
      });
    }
    // ADR-329 D4: an act fired inside a daemon body (every-turn, a timer's
    // expiry) has no player action for the flush plugin to follow; this
    // daemon delivers its events on the same tick. Registered only when the
    // story carries an acting statement or a `move` (GH #331: a moved
    // player's arrival description rides the same queue), so every other
    // story keeps its exact daemon roster.
    if (this.core.timers.hasDeferredNarration()) {
      daemons.push({
        id: 'chord.act-drain',
        name: 'Acting-statement narration drain',
        condition: () => this.core.pendingActEvents.length > 0,
        run: () => this.core.timers.drainActEvents(),
      });
    }

    return daemons;
  }

  /**
   * Whether the story is over (GH #245 defect 2): an ending was triggered
   * (`win`/`lose`) or the player is dead (`kill the player`). Every daemon
   * body — entity, story and trait every-turn clauses, sequence steps —
   * checks this before running, so nothing narrates after the turn that
   * ended the game ("Sparks walk the waxed cord" after the blast).
   */
  private storyOver(world: WorldModel): boolean {
    if (world.getStateValue(STORY_ENDING_FLAG) !== undefined) return true;
    const player = world.getPlayer();
    const health = player?.get(HealthTrait) as { dead?: boolean } | undefined;
    return health?.dead === true;
  }

  /**
   * Run one entity every-turn clause (`on every turn while …[, once]` in a
   * create block) now, `it` = the owner — the one body its scheduler daemon
   * and the arrival reaction (GH #353) share, so a clause fired by either is
   * spent for both.
   *
   * Role gate first (ADR-327 D9): a character's autonomous clauses drive them
   * only while they are NOT the one being played, checked before the
   * condition so the RNG stream and `, once` are untouched for as long as the
   * owner holds the role — the clause wakes, unconsumed, the turn the role
   * moves off them. No presence gate (ADR-328 D3): the clause fires wherever
   * the player is — `, once` and RNG conditions consume off-stage, and
   * `sourced` stamps the owner's place so the engine tags `presence` and the
   * client decides what to show.
   *
   * @param irEntity the owning entity
   * @param clause the every-turn clause
   * @param clauseIndex its index among the owner's clauses (the occurrence key)
   * @param world the live world
   * @returns the clause's events, or none when a gate holds it
   */
  private runEntityTurnClause(irEntity: IREntity, clause: IROnClause, clauseIndex: number, world: WorldModel): ISemanticEvent[] {
    const key = `${CHORD_OCCURRENCE_PREFIX}entity-turn.${irEntity.id}.${clauseIndex}`;
    if (this.storyOver(world)) return [];
    if (this.core.timers.holdsPlayerRole(world, irEntity.id)) return [];
    const evalCtx: ExecContext = { world, it: irEntity.id };
    if (clause.condition && !this.core.evaluator.evalCondition(clause.condition, evalCtx)) return [];
    const fired = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
    if (clause.once && fired > 1) return []; // `, once` (D5)
    world.setStateValue(key, fired);
    evalCtx.occurrence = fired;
    const at = this.core.placeOf(irEntity.id, world);
    return this.core.narrated(this.core.sourced(this.core.statements.execStatements(clause.body, evalCtx), irEntity.id, world, at));
  }

  /**
   * The arrival reaction the loader binds on the character registry (GH
   * #353): a fact just landed on `listenerWorldId` by propagation, so each of
   * that owner's every-turn clauses gated on knowing `topic` runs NOW, on the
   * arrival tick, in the author's words — the contract `arrivalNarratedTopics`
   * names (the platform's generic "mentions something" line already stands
   * down for these). Occurrence bookkeeping is the daemon's own, so a `, once`
   * clause fired here is spent when the scheduler next looks.
   *
   * @param listenerWorldId the listener, as a world id
   * @param topic the topic that arrived
   * @param world the live world
   * @returns the clauses' events, in clause order; none for an unmodeled listener
   */
  fireArrivalReaction(listenerWorldId: string, topic: string, world: WorldModel): ISemanticEvent[] {
    const irId = this.core.host.irIdOf(listenerWorldId);
    const irEntity = irId ? this.core.ir.entities.find((e) => e.id === irId) : undefined;
    if (!irEntity) return [];
    const out: ISemanticEvent[] = [];
    irEntity.onClauses.forEach((clause, clauseIndex) => {
      if (clause.binding !== 'every-turn') return;
      if (!knownTopicsIn(clause.condition).has(topic)) return;
      out.push(...this.runEntityTurnClause(irEntity, clause, clauseIndex, world));
    });
    return out;
  }

  /**
   * Execute a machine body (`on enter`/`on exit`/transition effects,
   * ADR-215 state-machines depth) — story-owned: no `it` (compile-gated),
   * narration broadcasts like any story-owned surface.
   * @param statements the resolved IR statement tree
   * @param world the live world the effect runs against
   */
  execMachineBody(statements: IRStatement[], world: WorldModel): ISemanticEvent[] {
    return this.core.narrated(this.core.statements.execStatements(statements, { world }));
  }
}
