/**
 * core.ts — what every runtime section shares.
 *
 * The runtime is a set of section classes, one per concern, over one core:
 * the compiled IR, the story host, the evaluator, the engine's turn and
 * execution entries once wired, and the runtime's own mutable state — the
 * re-entrancy guards and per-turn buffers the sections set and release, and
 * the two cross-turn counters a restore resets. The five helpers every
 * section reaches for (an NPC's dialogue turn, a raw runtime event, an
 * entity's place, narration and sourcing of scheduler events) live here
 * beside the state. Each section is a field on the core, assigned by the
 * facade that constructs them, so a section reaches another through
 * `core.<section>` and never imports it.
 *
 * Invariants:
 * - Occurrence and RNG state live in world state only. The guards
 *   (`actDepth`/`actChain`, `moveArrivalDepth`/`moveArrivalChain`,
 *   `inStartBlock`) are released by the code that set them and asserted
 *   clear at the top of every between-turns entry point; a guard left set
 *   throws, naming the field. The buffers (`pendingActEvents`,
 *   `pendingChannelEvents`) are drained, not asserted. The counters
 *   (`eventSeq`, `lastTickTurn`) reset through `resetAfterRestore`; no
 *   save key exists for either.
 *
 * Public interface: RuntimeCore, RuntimeHost, ExecContext, RefusalVeto,
 * SchedulerTick, SchedulerDaemon, STRATEGY_SELECTOR, ChordBehaviorTrait,
 * TOPIC_GERUNDS, toEffect, knownTopicsIn, MOVE_ARRIVAL_DEPTH_CAP, ACT_DEPTH_CAP.
 * Owner context: @sharpee/story-loader.
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a small shared core.
 * - ADR-335 D2 — the mutable-field split, asserted rather than promised.
 * - ADR-207/208 — per-world, keyed registration.
 */
import { dialogueTurn, type KindMembership } from '@sharpee/character';
import type { IRCondition, IRTimerClause, IRTimerDef, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { Choice, PhraseProducer, StoryEndingKind } from '@sharpee/if-domain';
import type { ActResult, ActSlots } from '@sharpee/stdlib';
import { type CapabilityEffect, type CapabilityValidationResult, type InterceptorResult, type ITrait, type TemperamentDef, TraitType, WorldModel } from '@sharpee/world-model';
import { DecisionLedger } from '../decisions.js';
import { EvalContext, Evaluator } from '../evaluator.js';
import type { ConversationThreadsSection } from './conversation-threads.js';
import type { DispatchVerbsSection } from './dispatch-verbs.js';
import type { DialogueSection } from './dialogue.js';
import type { TopicTablesSection } from './topic-tables.js';
import type { BindSection } from './bind.js';
import type { EventClausesSection } from './event-clauses.js';
import type { MoveClausesSection } from './move-clauses.js';
import type { OnClausesSection } from './on-clauses.js';
import type { SchedulerConstructsSection } from './scheduler-constructs.js';
import type { TimersSection } from './timers.js';
import type { DerivedSection } from './derived.js';
import type { StatementsSection } from './statements.js';
import type { PhrasesSection } from './phrases.js';

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

/**
 * The two gerunds a topic table serves (ADR-239 D1 — one table, ask and
 * tell alike). The table rides these actions' interceptor dispatch.
 */
export const TOPIC_GERUNDS = ['asking', 'telling'] as const;

/**
 * Flatten a semantic event into the interceptor effect envelope,
 * carrying its actor attribution through (D9): character-model events
 * are minted with `entities.actor` = the NPC, and the envelope's
 * re-mint would otherwise stamp the acting player over it.
 */
export const toEffect = (e: ISemanticEvent): CapabilityEffect => ({
  type: e.type,
  payload: (e.data ?? {}) as Record<string, unknown>,
  ...(e.entities?.actor !== undefined ? { actor: e.entities.actor } : {}),
});

/**
 * The topics a condition gates on knowing — every `knows-topic` node under
 * it, through `and`/`or`/`not`. One walk for both halves of the arrival
 * contract: the loader derives `arrivalNarratedTopics` from it (which
 * topics the platform stays silent for) and the arrival reaction consults
 * it (which clauses fire on the tick a topic lands) — GH #353.
 *
 * @param condition the clause condition, or null for an unconditional clause
 * @returns the topics named; empty for null or for a condition naming none
 */
export function knownTopicsIn(condition: IRCondition | null): Set<string> {
  const topics = new Set<string>();
  const walk = (node: IRCondition | null): void => {
    if (!node) return;
    switch (node.kind) {
      case 'knows-topic':
        topics.add(node.topic);
        return;
      case 'and':
      case 'or':
        for (const operand of node.operands) walk(operand);
        return;
      case 'not':
        walk(node.operand);
        return;
      default:
        return;
    }
  };
  walk(condition);
  return topics;
}

/** Hooks the runtime needs from the story (implemented by ChordStory). */
export interface RuntimeHost {
  entityId(irId: string): string | undefined;
  irIdOf(worldId: string): string | undefined;
  producers: Map<string, PhraseProducer>;
  triggerEnding(world: WorldModel, ending: StoryEndingKind, messageId?: string): ISemanticEvent;
  /**
   * Character-model story data for the topic dispatch (ADR-310/318 Phase
   * 6): authored temperament defs and the kind-membership half of the
   * story oracle. Undefined when the story declares no character blocks
   * — the dispatch then skips every character consultation.
   */
  characterStoryData?(): {
    temperamentDefs?: Readonly<Record<string, TemperamentDef>>;
    isKindMember: KindMembership;
  } | undefined;
}

export interface ExecContext extends EvalContext {
  /** Occurrence count of the enclosing rule firing (ordinal blocks test it). */
  occurrence?: number;
  /**
   * How this pass answers routing questions (ADR-289 D1 as amended): the
   * mutations pass records, the reports pass replays, single-pass contexts
   * decide live. Absent means live.
   */
  ledger?: DecisionLedger;
  /**
   * The composing entity, for bodies whose compile-time owner is a TRAIT
   * (ADR-289 D2). One trait clause is shared IR; each composing entity needs
   * its own select counter, so the runtime — the layer that knows which
   * entity is executing — appends it to the compiler's statement id. Absent
   * for entity-owned bodies, whose id already names the owner.
   */
  owner?: string;
}

/**
 * A refusal veto from the validate partition: the fully-qualified message id
 * plus the render params its phrase stages (the strategy Choice, hatch
 * producers, slot bindings). Spread into an `InterceptorResult` /
 * `ValidationResult` / `CapabilityValidationResult` — all three carry
 * `error` + `params`, and stdlib threads `params` through to the blocked
 * render (lifecycle-engine `vetoOf`).
 */
export interface RefusalVeto {
  error: string;
  params?: Record<string, unknown>;
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

/** ADR-327 D5: the most nested move-arrivals one turn may fire before the runtime refuses. */
export const MOVE_ARRIVAL_DEPTH_CAP = 8;
/** ADR-329 D4: how deep an act whose reactions act again may nest — ADR-327 D5's cap, same number. */
export const ACT_DEPTH_CAP = 8;

/** The state and helpers every runtime section shares (see the module header). */
export class RuntimeCore {
  /** The phrases section; assigned by the facade that constructs it. */
  phrases!: PhrasesSection;
  /** The statements section; assigned by the facade that constructs it. */
  statements!: StatementsSection;
  /** The derived section; assigned by the facade that constructs it. */
  derived!: DerivedSection;
  /** The timers section; assigned by the facade that constructs it. */
  timers!: TimersSection;
  /** The scheduler constructs section; assigned by the facade that constructs it. */
  scheduler!: SchedulerConstructsSection;
  /** The on clauses section; assigned by the facade that constructs it. */
  onClauses!: OnClausesSection;
  /** The move clauses section; assigned by the facade that constructs it. */
  moveClauses!: MoveClausesSection;
  /** The event clauses section; assigned by the facade that constructs it. */
  eventClauses!: EventClausesSection;
  /** The bind section; assigned by the facade that constructs it. */
  binding!: BindSection;
  /** The topic tables section; assigned by the facade that constructs it. */
  topicTables!: TopicTablesSection;
  /** The dialogue section; assigned by the facade that constructs it. */
  dialogue!: DialogueSection;
  /** The dispatch verbs section; assigned by the facade that constructs it. */
  dispatchVerbs!: DispatchVerbsSection;
  /** The conversation threads section; assigned by the facade that constructs it. */
  threads!: ConversationThreadsSection;
  /** Cross-turn counter: numbers every runtime-raised event id. A restore resets it. */
  eventSeq = 0;

  /** Declared score identities (Phase B): name → worth. */
  readonly scoreWorth = new Map<string, number>();

  /** ADR-325 D3: timers by `qualified` key, in declaration order. */
  readonly timerDefs = new Map<string, IRTimerDef>();

  /** ADR-325 D3e: expiry clauses by timer `qualified` key, with their `it`. */
  readonly timerClauses = new Map<string, { clause: IRTimerClause; it: string | null }[]>();

  /** The engine's live turn counter (wired at engine-ready); null headless. */
  turnProvider: (() => number) | null = null;

  /** ADR-329 D4: the engine's execution entry, wired at engine-ready; null headless. */
  executionEntry: ((actorId: string, actionId: string, slots?: ActSlots) => ActResult) | null = null;

  /** Events an acting statement produced inside an action or handler, awaiting the flush plugin / drain daemon. */
  readonly pendingActEvents: ISemanticEvent[] = [];

  actDepth = 0;

  /** The acts in flight, for the re-entry diagnostic (`the guards taking → …`). */
  readonly actChain: string[] = [];

  /** The last scheduler tick's turn — the headless fallback for `turnNow`. A restore sets it to the restored turn. */
  lastTickTurn = 0;

  constructor(
    readonly ir: StoryIR,
    readonly host: RuntimeHost,
    readonly evaluator: Evaluator,
  ) {
    for (const score of ir.scores) this.scoreWorth.set(score.name, score.worth);
    for (const t of ir.timers ?? []) this.timerDefs.set(t.qualified, t);
    for (const e of ir.entities) {
      for (const clause of e.timerClauses ?? []) {
        const list = this.timerClauses.get(clause.timer) ?? [];
        list.push({ clause, it: e.id });
        this.timerClauses.set(clause.timer, list);
      }
    }
    for (const clause of ir.story.timerClauses ?? []) {
      const list = this.timerClauses.get(clause.timer) ?? [];
      list.push({ clause, it: null });
      this.timerClauses.set(clause.timer, list);
    }
  }

  /**
   * Reset the two cross-turn counters after a restore: the fallback turn
   * becomes the restored turn and event numbering starts over. The guards
   * and buffers need nothing — a restore runs between turns, when they are
   * clear.
   *
   * @param turn the restored save's turn count — the turn its last tick ran on
   */
  resetAfterRestore(turn: number): void {
    this.lastTickTurn = turn;
    this.eventSeq = 0;
  }

  /**
   * The between-turns invariant: no act, move arrival, or start block is in
   * flight. Called at the top of every entry point that runs between turns.
   *
   * @param entry the entry point checking, for the diagnostic
   * @throws Error `runtime.guard-leaked` naming the first guard still set
   */
  assertBetweenTurns(entry: string): void {
    const leaked =
      this.actDepth !== 0 ? 'actDepth'
      : this.actChain.length !== 0 ? 'actChain'
      : this.moveArrivalDepth !== 0 ? 'moveArrivalDepth'
      : this.moveArrivalChain.length !== 0 ? 'moveArrivalChain'
      : this.inStartBlock ? 'inStartBlock'
      : null;
    if (leaked) {
      throw new Error(
        `runtime.guard-leaked: \`${leaked}\` was left set between turns (at ${entry}) — a re-entrancy guard must be released by the code that set it.`,
      );
    }
  }

  /**
   * True only while `runStartBlock` is executing. This — not "does the world
   * have a player yet" — is what tells `change the player to` which of its two
   * meanings applies. Hosts are free to seed a placeholder player before
   * `installStory` (bootstrap does), so the world's own answer says nothing about
   * whether the story has opened.
   */
  inStartBlock = false;

  /** Nesting depth of move-arrival firings in flight (ADR-327 D5's re-entry cap). */
  moveArrivalDepth = 0;

  /** The rooms of the arrival chain in flight, for the diagnostic. */
  readonly moveArrivalChain: string[] = [];

  /** Z3 lifecycle narration awaiting the next report-collecting pass (never rendered inline — ADR-213 §2). */
  readonly pendingChannelEvents: ISemanticEvent[] = [];

  /**
   * The turn the player is acting in, for dialogue-path bookkeeping —
   * delegates to the character clock seam's mirror read.
   */
  dialogueTurn(world: WorldModel): number {
    return dialogueTurn(world);
  }

  rawEvent(type: string, data: Record<string, unknown>): ISemanticEvent {
    return {
      id: `chord-${type}-${this.eventSeq++}`,
      type,
      timestamp: Date.now(),
      entities: {},
      data,
    };
  }

  /**
   * The owner's place for ADR-328 D3 sourcing: a room owner is the room, a
   * region owner the region, anything else its containing room (or bare
   * location). `null` when the owner has no place (offstage); `undefined`
   * when it has no world entity at all.
   *
   * @param ownerIrId the owner, as an IR id
   * @param world the live world
   */
  placeOf(ownerIrId: string, world: WorldModel): string | null | undefined {
    const ownerId = this.host.entityId(ownerIrId);
    if (!ownerId) return undefined;
    const owner = world.getEntity(ownerId);
    if (owner?.has(TraitType.ROOM) || owner?.has(TraitType.REGION)) return ownerId;
    return world.getContainingRoom(ownerId)?.id ?? world.getLocation(ownerId) ?? null;
  }

  /** Scheduler-returned events must narrate to reach the transcript. */
  narrated(events: ISemanticEvent[]): ISemanticEvent[] {
    return events.map((e) => ({ ...e, narrate: true } as ISemanticEvent));
  }

  /**
   * ADR-328 D3, producer half: an owner's autonomous narration carries the
   * owner as `entities.actor` and the place it happened as
   * `entities.location` — a room owner is the room, a region owner the
   * region, anything else its containing room. The engine's enrichment
   * funnel reads the location to tag `presence`; without it the funnel
   * would default both to the player. A value the statement already set
   * wins. An owner with no place at all (offstage) has nowhere the player
   * could be present, so its narration is tagged `absent` here — the
   * funnel never overwrites a producer-set presence.
   *
   * "The place it happened" is where the owner stood when the clause FIRED:
   * a body that moves its owner (`move Kemp to the Tavern` after the storm-off
   * line) narrates the leaving, not the arriving, so a caller that runs a body
   * snapshots the place with `placeOf` first and passes it as `at` (GH #353).
   * Omitted, the place is read now.
   *
   * @param events the events to stamp
   * @param ownerIrId the owner, as an IR id
   * @param world the live world
   * @param at the owner's place when the events happened (`null` = no place);
   *   omitted → the owner's place now
   */
  sourced(events: ISemanticEvent[], ownerIrId: string, world: WorldModel, at?: string | null): ISemanticEvent[] {
    const ownerId = this.host.entityId(ownerIrId);
    if (!ownerId) return events;
    const location = (at === undefined ? this.placeOf(ownerIrId, world) : at) ?? undefined;
    return events.map((e) => ({
      ...e,
      entities: {
        ...e.entities,
        actor: e.entities?.actor ?? ownerId,
        ...(location !== undefined && e.entities?.location === undefined ? { location } : {}),
      },
      ...(location === undefined && e.entities?.location === undefined && e.presence === undefined
        ? { presence: 'absent' as const }
        : {}),
    }));
  }
}
