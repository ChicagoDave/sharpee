/**
 * runtime.ts — the Chord turn-by-turn runtime's facade.
 *
 * The runtime binds compiled behavior to a live world and serves it every
 * turn. Its work is partitioned into thirteen sections, one module each
 * under `runtime/`, over one shared core (`runtime/core.ts`): bind
 * (phrasebooks, overrides, gerund checks), event clauses, move clauses,
 * on-clauses, topic tables, dialogue, conversation threads, dispatch verbs,
 * scheduler constructs, timers, derived properties, statements, and
 * phrases. This class is what the loader constructs and holds: it is the
 * core (so every section's shared state and helpers live on it), it
 * constructs the thirteen sections, and every method it exposes delegates
 * to the section that owns the work. `bind` runs `RUNTIME_BIND_STEPS` in
 * order — the registrations as data, so a test pins the order.
 *
 * Public interface: ChordRuntime, RUNTIME_BIND_STEPS, RuntimeBindStep; the
 * core's shared declarations re-exported (STRATEGY_SELECTOR,
 * ChordBehaviorTrait, knownTopicsIn, RuntimeHost, SchedulerTick,
 * SchedulerDaemon).
 * Owner context: @sharpee/story-loader.
 *
 * References:
 * - ADR-335 D1 — one module per runtime section, a small shared core, the
 *   facade unchanged; the bind order carries `requires`.
 * - ADR-335 D2/D5 — the core's asserted invariant; the facade's surface.
 */
import type { IRStatement, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { ActResult, ActSlots } from '@sharpee/stdlib';
import { type DialogueSelectorRegistration, type InitiativeSeizure, type SceneOccasion, type SceneStrength, WorldModel } from '@sharpee/world-model';
import { Evaluator } from './evaluator.js';
import { BindSection } from './runtime/bind.js';
import { ConversationThreadsSection } from './runtime/conversation-threads.js';
import { DerivedSection } from './runtime/derived.js';
import { DialogueSection } from './runtime/dialogue.js';
import { DispatchVerbsSection } from './runtime/dispatch-verbs.js';
import { EventClausesSection } from './runtime/event-clauses.js';
import { MoveClausesSection } from './runtime/move-clauses.js';
import { OnClausesSection } from './runtime/on-clauses.js';
import { PhrasesSection } from './runtime/phrases.js';
import { SchedulerConstructsSection } from './runtime/scheduler-constructs.js';
import { StatementsSection } from './runtime/statements.js';
import { TimersSection } from './runtime/timers.js';
import { TopicTablesSection } from './runtime/topic-tables.js';
import { RuntimeCore, RuntimeHost, ExecContext, RefusalVeto, SchedulerDaemon } from './runtime/core.js';
export { STRATEGY_SELECTOR, ChordBehaviorTrait, knownTopicsIn } from './runtime/core.js';
export type { RuntimeHost, SchedulerTick, SchedulerDaemon } from './runtime/core.js';

export class ChordRuntime extends RuntimeCore {
  constructor(ir: StoryIR, host: RuntimeHost, evaluator: Evaluator) {
    super(ir, host, evaluator);
    this.binding = new BindSection(this);
    this.eventClauses = new EventClausesSection(this);
    this.moveClauses = new MoveClausesSection(this);
    this.onClauses = new OnClausesSection(this);
    this.topicTables = new TopicTablesSection(this);
    this.dialogue = new DialogueSection(this);
    this.threads = new ConversationThreadsSection(this);
    this.dispatchVerbs = new DispatchVerbsSection(this);
    this.scheduler = new SchedulerConstructsSection(this);
    this.timers = new TimersSection(this);
    this.derived = new DerivedSection(this);
    this.statements = new StatementsSection(this);
    this.phrases = new PhrasesSection(this);
  }

  /** Facade: see `PhrasesSection.enqueueChannelEvent`. */
  enqueueChannelEvent(event: ISemanticEvent): void {
    return this.phrases.enqueueChannelEvent(event);
  }

  /** Facade: see `PhrasesSection.drainChannelEvents`. */
  drainChannelEvents(): ISemanticEvent[] {
    return this.phrases.drainChannelEvents();
  }

  /** Facade: see `PhrasesSection.channelEvent`. */
  channelEvent(ownerIrId: string, channel: string, world: WorldModel): ISemanticEvent | null {
    return this.phrases.channelEvent(ownerIrId, channel, world);
  }

  /** Facade: see `StatementsSection.assignedPlayerId`. */
  get assignedPlayerId(): string | undefined {
    return this.statements.assignedPlayerId;
  }

  /** Facade: see `StatementsSection.runStartBlock`. */
  runStartBlock(world: WorldModel): ISemanticEvent[] {
    return this.statements.runStartBlock(world);
  }

  /** Facade: see `StatementsSection.isGone`. */
  isGone(worldId: string, world: WorldModel): boolean {
    return this.statements.isGone(worldId, world);
  }

  /** Facade: see `StatementsSection.refusalOf`. */
  refusalOf(key: string, ctx: ExecContext): RefusalVeto {
    return this.statements.refusalOf(key, ctx);
  }

  /** Facade: see `TimersSection.setTurnProvider`. */
  setTurnProvider(provider: () => number): void {
    return this.timers.setTurnProvider(provider);
  }

  /** Facade: see `TimersSection.setExecutionEntry`. */
  setExecutionEntry(entry: (actorId: string, actionId: string, slots?: ActSlots) => ActResult): void {
    return this.timers.setExecutionEntry(entry);
  }

  /** Facade: see `TimersSection.hasActingStatements`. */
  hasActingStatements(): boolean {
    return this.timers.hasActingStatements();
  }

  /** Facade: see `TimersSection.hasDeferredNarration`. */
  hasDeferredNarration(): boolean {
    return this.timers.hasDeferredNarration();
  }

  /** Facade: see `TimersSection.drainActEvents`. */
  drainActEvents(): ISemanticEvent[] {
    return this.timers.drainActEvents();
  }

  /** Facade: see `SchedulerConstructsSection.buildSchedulerDaemons`. */
  buildSchedulerDaemons(): SchedulerDaemon[] {
    return this.scheduler.buildSchedulerDaemons();
  }

  /** Facade: see `SchedulerConstructsSection.fireArrivalReaction`. */
  fireArrivalReaction(listenerWorldId: string, topic: string, world: WorldModel): ISemanticEvent[] {
    return this.scheduler.fireArrivalReaction(listenerWorldId, topic, world);
  }

  /** Facade: see `SchedulerConstructsSection.execMachineBody`. */
  execMachineBody(statements: IRStatement[], world: WorldModel): ISemanticEvent[] {
    return this.scheduler.execMachineBody(statements, world);
  }

  /** Facade: see `MoveClausesSection.fireMoveClauses`. */
  fireMoveClauses(world: WorldModel, event: ISemanticEvent): ISemanticEvent[] {
    return this.moveClauses.fireMoveClauses(world, event);
  }

  /** Facade: see `EventClausesSection.fireEventClauses`. */
  fireEventClauses(world: WorldModel, event: ISemanticEvent): ISemanticEvent[] {
    return this.eventClauses.fireEventClauses(world, event);
  }

  /** Facade: see `DialogueSection.buildDialogueRegistration`. */
  buildDialogueRegistration(): DialogueSelectorRegistration {
    return this.dialogue.buildDialogueRegistration();
  }

  /** Facade: see `DialogueSection.buildAuthoredInitiative`. */
  buildAuthoredInitiative(world: WorldModel): (participantId: string, occasion: SceneOccasion, witnessedAction?: string) => 'forces' | 'suppresses' | undefined {
    return this.dialogue.buildAuthoredInitiative(world);
  }

  /** Facade: see `DialogueSection.buildInitiativeSeizure`. */
  buildInitiativeSeizure(
    world: WorldModel,
  ): (
    participantId: string,
    occasion: SceneOccasion,
    witnessedAction?: string,
    audienceId?: string,
  ) => InitiativeSeizure | undefined {
    return this.dialogue.buildInitiativeSeizure(world);
  }

  /** Facade: see `DispatchVerbsSection.buildDispatchActions`. */
  buildDispatchActions(): unknown[] {
    return this.dispatchVerbs.buildDispatchActions();
  }

  /** Facade: see `ConversationThreadsSection.buildThreadTurn`. */
  buildThreadTurn(
    world: WorldModel,
  ): (ownerId: string, partnerId: string, sceneId: string) => InitiativeSeizure | undefined {
    return this.threads.buildThreadTurn(world);
  }

  /** Facade: see `ConversationThreadsSection.buildThreadStrength`. */
  buildThreadStrength(): (ownerId: string, partnerId: string, threadKey: string) => SceneStrength | undefined {
    return this.threads.buildThreadStrength();
  }

  /** Facade: see `ConversationThreadsSection.buildPartingLine`. */
  buildPartingLine(
    world: WorldModel,
  ): (
    ownerId: string,
    partnerId: string,
    threadKey: string,
  ) => { messageId: string; params: Record<string, unknown>; events: ISemanticEvent[] } | undefined {
    return this.threads.buildPartingLine(world);
  }

  /** Facade: see `ConversationThreadsSection.buildThreadTurnReady`. */
  buildThreadTurnReady(world: WorldModel): (ownerId: string, partnerId: string) => boolean {
    return this.threads.buildThreadTurnReady(world);
  }

  /** Register the story's constructs on the world: every bind step, in the pinned order. */
  bind(world: WorldModel): void {
    for (const step of RUNTIME_BIND_STEPS) step.run(this, world);
  }

}

/** One step of `ChordRuntime.bind`, in the order the steps register today. */
export interface RuntimeBindStep {
  readonly name: string;
  /** Names of earlier steps whose registrations this step reads. None does today; the list makes the order data. */
  readonly requires: readonly string[];
  readonly run: (runtime: ChordRuntime, world: WorldModel) => void;
}

/**
 * The bind order, as data. Each step registers one section's constructs on
 * the world; the steps read nothing from one another, so every `requires`
 * is empty, and the list exists so the order is pinned by a test rather
 * than by the shape of one method.
 */
export const RUNTIME_BIND_STEPS: readonly RuntimeBindStep[] = [
  { name: 'on-clauses', requires: [], run: (r, w) => r.onClauses.bindOnClauses(w) },
  { name: 'move-clauses', requires: [], run: (r, w) => r.moveClauses.bindMoveClauses(w) },
  { name: 'trait-clauses', requires: [], run: (r, w) => r.dispatchVerbs.bindTraitClauses(w) },
  // Derived properties (`dark while`, blocked exits) — ADR-240: registered
  // as live evaluators consulted at point of use. Nothing is stamped and
  // nothing recomputes: mutations are instant, every reader sees current
  // truth (the former eleven-event recompute trigger list is gone).
  { name: 'derived-evaluators', requires: [], run: (r, w) => r.derived.registerDerivedEvaluators(w) },
  // Phrasebooks (ADR-250 D4): one evaluator per book-covered key the
  // story does not define — same ADR-240 seam, resolved at render time.
  { name: 'phrasebook-evaluators', requires: [], run: (r, w) => r.binding.registerPhrasebookEvaluators(w) },
  // Message overrides (ADR-255 D6): standard-action message baselines,
  // registered on the same seam so they beat the platform default but lose
  // to per-entity/on-clause message ids.
  { name: 'message-override-evaluators', requires: [], run: (r, w) => r.binding.registerMessageOverrideEvaluators(w) },
];
