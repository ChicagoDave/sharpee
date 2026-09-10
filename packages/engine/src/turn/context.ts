/**
 * The turn-stage contract: what a stage is, what one turn's stages share,
 * and what a stage may ask of the engine.
 *
 * A turn is an ordered list of named stages (`TurnStage`), each with one
 * reason to change and a `requires` list naming the stages it must
 * follow. A stage runs over a `TurnStageContext` — the input, the turn
 * number, the result under construction, and the batches and flags the
 * old inline phases passed between themselves as locals — and returns
 * `'continue'` or `'stop'`; `'stop'` ends the list with the result as it
 * stands. The parse stage alone sets `route`, and the runner selects the
 * regular or the meta list on it. A stage reaches the engine only through
 * `TurnEngine`, the facade's turn-facing surface: getters over the services
 * and state a turn touches, and operations on the state the engine keeps
 * across turns (the held command, the pending platform requests, the
 * per-turn event store, the session counters). The bodies of the turn's
 * own helpers live in the stage modules; nothing turn-only remains on the
 * facade.
 *
 * Public interface: `TurnStage`, `TurnStageContext`, `TurnEngine`,
 * `StageOutcome`, `TurnRoute`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1 (the stage contract, the route set by parse
 * alone), D1a (two lists sharing the parse stage), D5 as amended by A1
 * (the facade's public surface does not move; stages reach its state
 * through this surface).
 */

import type { ISemanticEvent, ISemanticEventSource, IPlatformEvent } from '@sharpee/core';
import type { WorldModel, IParsedCommand } from '@sharpee/world-model';
import type { Parser, StandardActionRegistry, IPerceptionService } from '@sharpee/stdlib';
import type { ISound } from '@sharpee/if-domain';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { PluginRegistry } from '@sharpee/plugins';
import type { EngineConfig, GameContext, GameEngineEvents, InputModeHandler, TurnResult } from '../types.js';
import type { CommandExecutor } from '../command/command-executor.js';
import type { EngineRandomService } from '../session/engine-random-service.js';
import type { IProsePipeline } from '../prose-pipeline/index.js';
import type { SoundDispatcher } from '../sound/index.js';
import type { Story } from '../install/story.js';
import type { PlatformOperationHost } from './platform-dispatcher.js';
import type { EngineParser } from '../ports/parser-interface.js';
import type { SaveRestoreService } from '../session/save-restore-service.js';
import type { ChannelService } from '@sharpee/channel-service';
import type { LanguageProvider } from '@sharpee/if-domain';

/** What a stage returns: run the next stage, or end the list here. */
export type StageOutcome = 'continue' | 'stop';

/** Which list the turn runs after parsing: a regular turn or a meta command. */
export type TurnRoute = 'turn' | 'meta';

/**
 * One stage of a turn.
 */
export interface TurnStage {
  /** The stage's name; what `requires` and the order test refer to. */
  readonly name: string;
  /** Stages this one must follow, by name; empty when it reads nothing they write. */
  readonly requires: readonly string[];
  /** Run the stage over the turn's context. */
  run(context: TurnStageContext): Promise<StageOutcome>;
}

/**
 * What one turn's stages share. Fields are written by the stage named in
 * their comment and read by the stages after it.
 */
export interface TurnStageContext {
  /** The engine's turn-facing surface. */
  readonly engine: TurnEngine;
  /** The input as it stands; the held-command and exchange stages rewrite it. */
  input: string;
  /** The turn number this input runs as (not incremented by a meta command). */
  readonly turn: number;
  /** Set by `turn-start` once `turn:start` has been emitted; the runner pairs `turn:failed` with it. */
  started: boolean;
  /** Set by `parse`; the runner switches lists on it. */
  route?: TurnRoute;
  /** Set by `parse` for a meta command; what the meta stages execute. */
  parsedCommand?: IParsedCommand;
  /** The result under construction; set by `execute-command`, the meta, input-mode, and stop stages. */
  result?: TurnResult;
  /** The action's events after enrichment and perception; set by `enrich-events`. */
  semanticEvents: ISemanticEvent[];
  /** The meta command's events, rendered by `meta-render`; set by `meta-command`. */
  events: ISemanticEvent[];
  /** The turn's rendered blocks; set by `render-prose`, read by `channel-packet`. */
  blocks?: ITextBlock[];
  /** A `story.victory` seen among the action's events; set by `emit-events`. */
  victory?: { reason: string; score: number };
  /** The cause of a player death this turn, if any; set by `detect-death`. */
  deathCause?: string;
}

/**
 * The facade's turn-facing surface. Getters read the engine's live
 * fields (the text service and executor are set by `installStory`;
 * the pending platform list is replaced when drained).
 */
export interface TurnEngine {
  readonly world: WorldModel;
  readonly context: GameContext;
  /** The installed story, or none before `installStory`. */
  readonly story: Story | undefined;
  readonly config: EngineConfig;
  /** The parser as the engine calls it: every engine-facing method present. */
  readonly parser: EngineParser;
  readonly commandExecutor: CommandExecutor;
  readonly actionRegistry: StandardActionRegistry;
  readonly randomService: EngineRandomService;
  readonly pluginRegistry: PluginRegistry;
  readonly textService: IProsePipeline | undefined;
  readonly languageProvider: LanguageProvider | undefined;
  /** Snapshots for undo (the undo-snapshot stage takes one per undoable input). */
  readonly saveRestoreService: SaveRestoreService;
  /** The channel-I/O producer, constructed by `start()`; none before it. */
  readonly channelService: ChannelService | undefined;
  /** The perception service, when one was given; enrichment and presence tagging read it. */
  readonly perceptionService: IPerceptionService | undefined;
  readonly eventSource: ISemanticEventSource;
  /** Platform requests queued this turn, read-only; `queuePlatformOperation` adds, `drainPendingPlatformOperations` takes. */
  readonly pendingPlatformOps: readonly IPlatformEvent[];
  /**
   * The per-turn sound buffer. A live handle on purpose: the command executor's
   * signature takes the array and fills it in place during the report phase, the
   * plugin tick pushes into the same one, and `executeAsActor` hands it out too —
   * the collection's identity is the contract, so an operation would only wrap it.
   */
  readonly soundBuffer: ISound[];
  readonly soundDispatcher: SoundDispatcher;
  readonly inputModeHandlers: ReadonlyMap<string, InputModeHandler>;

  /** The events stored for a turn — the live list, created empty on first ask; append through `storeTurnEvents`. */
  turnEventsOf(turn: number): ISemanticEvent[];
  /** Append events to a turn's stored list, rendered at turn end and cleared after. */
  storeTurnEvents(turn: number, events: readonly ISemanticEvent[]): void;
  /** Empty a turn's stored list once it has been rendered. */
  clearTurnEvents(turn: number): void;
  /** Emit one of the engine's lifecycle events. */
  emit<K extends keyof GameEngineEvents>(event: K, ...args: Parameters<GameEngineEvents[K]>): void;
  /** Emit a game event and store it in the current turn's events (nothing stored before turn one). */
  emitGameEvent(event: ISemanticEvent): void;
  /** Refresh the parser's scope vocabulary for the player's current surroundings. */
  updateScopeVocabulary(): void;
  /** Make another playable actor the player (ADR-327); throws for a missing or unplayable entity. */
  switchPlayer(entityId: string): void;
  /** Run an input as a turn of its own (command chaining, AGAIN). */
  executeTurn(input: string): Promise<TurnResult>;
  /** Remember a clarification for the next input (GH #318). */
  holdCommand(input: string): void;
  /** Take the held command, if any, clearing the hold — exactly one input spends it (GH #318). */
  takeHeldCommand(): string | undefined;
  /** Count a turn (and a move when it succeeded) in the session statistics. */
  countSessionTurn(success: boolean): void;
  /** What a platform operation needs of the engine: the hooks, save data, stop, undo, repeat (ADR-334 D3). */
  platformOperationHost(): PlatformOperationHost;
  /** Queue a platform request for the turn's platform-operations stage. */
  queuePlatformOperation(operation: IPlatformEvent): void;
  /** Take every queued request, leaving the queue empty — so a nested turn (AGAIN) sees none of them. */
  drainPendingPlatformOperations(): IPlatformEvent[];
  stop(reason: 'victory' | 'defeat', details?: unknown): void;
}
