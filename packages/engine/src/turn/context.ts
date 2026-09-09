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
 * `TurnEngine`, the facade's turn-facing surface: the services and state
 * a turn touches and the helpers that stayed on the engine because other
 * paths call them too.
 *
 * Public interface: `TurnStage`, `TurnStageContext`, `TurnEngine`,
 * `StageOutcome`, `TurnRoute`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1 (the stage contract, the route set by parse
 * alone), D1a (two lists sharing the parse stage), D5 (the facade does
 * not move; stages reach it through this surface).
 */

import type { ISemanticEvent, ISemanticEventSource, IPlatformEvent } from '@sharpee/core';
import type { WorldModel, IParsedCommand } from '@sharpee/world-model';
import type { Parser, StandardActionRegistry } from '@sharpee/stdlib';
import type { ISound } from '@sharpee/if-domain';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { PluginRegistry } from '@sharpee/plugins';
import type { EngineConfig, GameContext, InputModeHandler, TurnResult } from '../types.js';
import type { CommandExecutor } from '../command-executor.js';
import type { EngineRandomService } from '../engine-random-service.js';
import type { IProsePipeline } from '../prose-pipeline/index.js';
import type { SoundDispatcher } from '../sound/index.js';
import type { TurnEventSource } from '../turn-event-processor.js';
import type { GameEngineEvents } from '../game-engine.js';

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
 * fields (the parser, text service, and executor are set by `setStory`;
 * the pending platform list is replaced when drained).
 */
export interface TurnEngine {
  readonly world: WorldModel;
  readonly context: GameContext;
  readonly config: EngineConfig;
  readonly parser: Parser | undefined;
  readonly commandExecutor: CommandExecutor;
  readonly actionRegistry: StandardActionRegistry;
  readonly randomService: EngineRandomService;
  readonly pluginRegistry: PluginRegistry;
  readonly textService: IProsePipeline | undefined;
  readonly eventSource: ISemanticEventSource;
  /** Events stored per turn, rendered at turn end and cleared after. */
  readonly turnEvents: Map<number, ISemanticEvent[]>;
  /** Platform requests queued this turn for `processPlatformOperations`. */
  readonly pendingPlatformOps: IPlatformEvent[];
  /** The per-turn sound buffer the report phase and the plugin tick fill. */
  readonly soundBuffer: ISound[];
  readonly soundDispatcher: SoundDispatcher;
  readonly inputModeHandlers: ReadonlyMap<string, InputModeHandler>;

  /** Emit one of the engine's lifecycle events. */
  emit<K extends keyof GameEngineEvents>(event: K, ...args: Parameters<GameEngineEvents[K]>): void;
  /** Run an input as a turn of its own (command chaining, AGAIN). */
  executeTurn(input: string): Promise<TurnResult>;
  /** Spend a held command on this input (GH #318). */
  spliceHeldCommand(input: string): string;
  /** Offer the input to an open exchange before the parse (GH #346). */
  offerToOpenExchange(input: string): string;
  /** Remember a clarification for the next input (GH #318). */
  holdCommand(input: string): void;
  createUndoSnapshot(): void;
  /** The one enrichment funnel, with the engine's context filled in. */
  enrichTurnEvents(events: readonly ISemanticEvent[], turn: number, locationId: string | null | undefined, source: TurnEventSource): ISemanticEvent[];
  processPluginEvents(events: ISemanticEvent[], turn: number, playerLocation: string | null | undefined, pluginId: string): void;
  updateCommandHistory(result: TurnResult, input: string, turn: number): void;
  registerBlockedReferent(events: ISemanticEvent[], turn: number): void;
  /** Advance the turn counter and player context from the result. */
  updateContext(result: TurnResult): void;
  /** Count a turn (and a move when it succeeded) in the session statistics. */
  countSessionTurn(success: boolean): void;
  drainPlayerSwitch(turn: number): void;
  processPlatformOperations(turn: number): Promise<void>;
  processMetaPlatformOperation(operation: IPlatformEvent): Promise<ISemanticEvent[]>;
  appendPromptBlock(blocks: ITextBlock[]): void;
  emitChannelPacket(events: ISemanticEvent[], blocks: ITextBlock[], turn: number): void;
  playerDeathCauseThisTurn(turn: number): string | undefined;
  isPlayerDead(): boolean;
  isGameOver(): boolean;
  stop(reason: 'victory' | 'defeat', details?: unknown): void;
}
