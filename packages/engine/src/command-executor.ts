/**
 * Command Executor - Orchestrates command pipeline
 *
 * Responsibilities:
 * - Orchestrate the four-phase pattern (validate → execute → report/blocked)
 * - Handle implicit inference (ADR-104) when validation fails with pronouns
 * - Pass results between phases
 * - Return the final TurnResult
 *
 * Two entries, one path (ADR-328 D1/D2): `execute(input, …)` parses and
 * validates typed input as the player; `executeAsActor(request, …)` takes an
 * already-resolved command and a named actor. Both hand a `ValidatedCommand`
 * and an actor to the same private `runPhases`, so capability dispatch, the
 * pre-action hook, the four phases, and entity-handler reactions are
 * identical whoever acts.
 *
 * All event creation is owned by the action components themselves.
 */

import { type ISemanticEvent, type ISystemEvent, type IGenericEventSource, QuerySource, QueryType, Result, type RandomService } from '@sharpee/core';
import { type IParser, type IValidatedCommand, type IParsedCommand, type IValidationError, type IFEntity, type DirectionType } from '@sharpee/world-model';
import { type ISound } from '@sharpee/if-domain';
import { hasWorldContext } from './parser-interface.js';
import { SharedDataKeys, EngineSharedData } from './shared-data-keys.js';
import { WorldModel } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import {
  CommandValidator,
  type ActionRegistry,
  type Action,
  type ScopeResolver,
  type ValidatedCommand,
  createScopeResolver,
  tryInferTarget
} from '@sharpee/stdlib';

import { GameContext, TurnResult, EngineConfig } from './types.js';
import { createActionContext } from './action-context-factory.js';
import {
  checkCapabilityDispatch,
  checkCapabilityDispatchMulti,
  executeCapabilityValidate,
  executeCapabilityExecute,
  executeCapabilityReport,
  executeCapabilityBlocked
} from './capability-dispatch-helper.js';

/**
 * Data passed to pre-action hook listeners (ADR-148).
 *
 * Emitted after command validation but before the action's validate phase.
 * Listeners can modify world state (e.g., break concealment before a noisy action).
 */
export interface BeforeActionHookData {
  /** The action about to execute */
  actionId: string;
  /** The actor performing the action */
  actorId?: string;
  /** Direct object entity ID, if any */
  directObjectId?: string;
}

/**
 * Listener for pre-action hooks.
 *
 * @param data - Hook data describing the action about to execute
 * @param world - The world model (mutable — listeners can change state)
 */
export type BeforeActionHookListener = (data: BeforeActionHookData, world: WorldModel) => void;

/**
 * Transformer function for parsed commands.
 * Called after parsing but before validation.
 * Can modify the parsed command to bypass or alter validation behavior.
 *
 * @param parsed - The parsed command from the parser
 * @param world - The world model for checking state (e.g., gdtMode)
 * @returns The (potentially modified) parsed command
 */
export type ParsedCommandTransformer = (
  parsed: IParsedCommand,
  world: WorldModel
) => IParsedCommand;

/**
 * A resolved command for the programmatic entry (ADR-328 D2): the action to
 * run, who runs it, and the entities already chosen for each slot. There is
 * no parser step, so there is nothing to disambiguate — the caller has
 * decided. Scope and every other actor-relative check still run in the
 * action's own `validate()`.
 */
export interface ActorCommand {
  /** The action id to run, e.g. `if.action.taking` */
  actionId: string;
  /** The entity performing the action */
  actorId: string;
  /** Direct object, if the action takes one */
  directObject?: IFEntity;
  /** Indirect object, if the action takes one */
  indirectObject?: IFEntity;
  /** Instrument (ADR-080), if the action takes one */
  instrument?: IFEntity;
  /** Direction of travel, for `if.action.going` (read from `parsed.extras.direction`) */
  direction?: DirectionType;
}

/** Timing bookkeeping shared by both entries. */
interface PhaseTiming {
  startTime: number;
  parseTime: number;
}

/**
 * A synthetic parsed command for the programmatic entry — the same shape
 * the implicit-take path builds, since `IValidatedCommand.parsed` is
 * required. Nothing downstream reads it for decisions; `rawInput` is a
 * readable descriptor for transcripts and `TurnResult.input`.
 */
function syntheticParsed(request: ActorCommand): IParsedCommand {
  const words = [request.actionId];
  if (request.directObject) words.push(request.directObject.name);
  if (request.indirectObject) words.push(request.indirectObject.name);
  if (request.direction) words.push(request.direction.toLowerCase());
  return {
    rawInput: words.join(' '),
    action: request.actionId,
    tokens: [],
    structure: { verb: { tokens: [0], text: request.actionId, head: request.actionId } },
    pattern: 'PROGRAMMATIC',
    confidence: 1.0,
    ...(request.direction ? { extras: { direction: request.direction } } : {})
  };
}

/** Wrap an already-resolved entity as a validated slot reference. */
function slotReference(entity: IFEntity | undefined) {
  return entity
    ? { entity, parsed: { text: entity.name, candidates: [entity.name] } }
    : undefined;
}

export class CommandExecutor {
  private parser: IParser;
  private validator: CommandValidator;
  private actionRegistry: ActionRegistry;
  private eventProcessor: EventProcessor;
  private scopeResolver?: ScopeResolver;
  private parsedCommandTransformers: ParsedCommandTransformer[] = [];
  private beforeActionListeners: BeforeActionHookListener[] = [];
  /**
   * The session's per-point stream owner (ADR-293), threaded into every
   * ActionContext this executor creates. Optional at construction so bare
   * harnesses can wire it late, but context creation requires it — the
   * factory throws without one (D6).
   */
  private randomService?: RandomService;

  constructor(
    world: WorldModel,
    actionRegistry: ActionRegistry,
    eventProcessor: EventProcessor,
    parser: IParser,
    systemEvents?: IGenericEventSource<ISystemEvent>,
    randomService?: RandomService
  ) {
    if (!world) throw new Error('World model is required');
    if (!actionRegistry) throw new Error('Action registry is required');
    if (!eventProcessor) throw new Error('Event processor is required');
    if (!parser) throw new Error('Parser is required');

    this.parser = parser;
    this.validator = new CommandValidator(world, actionRegistry);
    if (systemEvents) {
      this.validator.setSystemEventSource(systemEvents);
    }
    this.actionRegistry = actionRegistry;
    this.eventProcessor = eventProcessor;
    this.randomService = randomService;
  }

  /**
   * Validate a parsed command against the world model.
   *
   * @param command - The parsed command to validate
   * @returns Result with validated command or validation error
   */
  validateCommand(command: IParsedCommand): Result<IValidatedCommand, IValidationError> {
    return this.validator.validate(command);
  }

  /**
   * Register a transformer that can modify parsed commands before validation.
   * Transformers are called in order of registration.
   *
   * @param transformer - Function to transform parsed commands
   */
  registerParsedCommandTransformer(transformer: ParsedCommandTransformer): void {
    this.parsedCommandTransformers.push(transformer);
  }

  /**
   * Unregister a previously registered transformer.
   *
   * @param transformer - The transformer to remove
   * @returns true if the transformer was found and removed
   */
  unregisterParsedCommandTransformer(transformer: ParsedCommandTransformer): boolean {
    const index = this.parsedCommandTransformers.indexOf(transformer);
    if (index !== -1) {
      this.parsedCommandTransformers.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Register a listener for the pre-action hook (ADR-148).
   *
   * Listeners fire after command context creation but before the action's
   * validate phase. They can modify world state (e.g., break concealment).
   *
   * @param listener - The hook listener to register
   */
  onBeforeAction(listener: BeforeActionHookListener): void {
    this.beforeActionListeners.push(listener);
  }

  /**
   * Emit the pre-action hook to all registered listeners.
   */
  private emitBeforeAction(data: BeforeActionHookData, world: WorldModel): void {
    for (const listener of this.beforeActionListeners) {
      listener(data, world);
    }
  }

  /**
   * Execute typed input as the player: parse → transform → validate → the
   * shared four-phase path (`runPhases`).
   *
   * @param input - The raw command text
   * @param world - The world model
   * @param context - Turn context (current turn, player, config)
   * @param config - Engine config (timing collection)
   * @param soundBuffer - The per-turn sound buffer (ADR-172)
   * @returns The turn result; never throws — failures come back as a
   *          `command.failed` event with `success: false`
   */
  async execute(
    input: string,
    world: WorldModel,
    context: GameContext,
    config?: EngineConfig,
    soundBuffer?: ISound[],
  ): Promise<TurnResult> {
    const turn = context.currentTurn;

    // Timing tracking
    const timing: PhaseTiming = { startTime: config?.collectTiming ? Date.now() : 0, parseTime: 0 };

    try {
      // Set world context for parser entity resolution. Parsing is
      // player-only by construction — typed input is the player's — so this
      // read stays player-bound (ADR-328 D2 threads the actor only from the
      // validated command onward).
      const player = world.getPlayer();
      if (player && hasWorldContext(this.parser)) {
        const playerLocation = world.getLocation(player.id) || '';
        this.parser.setWorldContext(world, player.id, playerLocation);
      }

      // Phase 1: Parse
      const parseStart = config?.collectTiming ? Date.now() : 0;
      const parseResult = this.parser.parse(input);
      if (config?.collectTiming) {
        timing.parseTime = Date.now() - parseStart;
      }
      
      if (!parseResult.success) {
        throw new Error(`Parse failed: ${(parseResult.error as { code?: string })?.code || 'UNKNOWN'}`);
      }

      // Phase 1.5: Apply parsed command transformers
      // Allows stories to modify parsed commands before validation
      let parsedCommand = parseResult.value;
      for (const transformer of this.parsedCommandTransformers) {
        parsedCommand = transformer(parsedCommand, world);
      }

      // Phase 2: Validate
      const validationResult = this.validator.validate(parsedCommand);
      if (!validationResult.success) {
        // Check for disambiguation - emit client.query event instead of throwing
        if (validationResult.error.code === 'AMBIGUOUS_ENTITY') {
          const details = validationResult.error.details || {};
          const candidates = details.ambiguousEntities || [];

          // Emit client.query event for disambiguation
          const queryEvent: ISemanticEvent = {
            id: `query_disambig_${turn}_${Date.now()}`,
            type: 'client.query',
            timestamp: Date.now(),
            entities: {},
            data: {
              source: QuerySource.DISAMBIGUATION,
              type: QueryType.DISAMBIGUATION,
              messageId: 'core.disambiguation_prompt',
              candidates: candidates,
              searchText: details.searchText,
              originalCommand: parsedCommand
            }
          };

          // Return early with query pending
          return {
            turn,
            input,
            success: false,
            needsInput: true,
            events: [queryEvent],
            error: 'DISAMBIGUATION_NEEDED'
          };
        }

        // Other validation errors still throw
        throw new Error(`Validation failed: ${validationResult.error.code}`);
      }

      if (!player) {
        throw new Error('No player set in world model');
      }
      return this.runPhases(validationResult.value, player, input, world, context, config, soundBuffer, timing);

    } catch (error) {
      return this.failedResult(turn, input, error as Error, config, timing);
    }
  }

  /**
   * Execute an already-resolved command as the named actor (ADR-328 D2).
   *
   * Skips parse, the parsed-command transformers, and the CommandValidator —
   * the caller has chosen the entities — and runs everything after: the
   * pre-action hook, capability dispatch, validate → execute → report |
   * blocked, and entity-handler reactions. The action's own `validate()`
   * still performs every actor-relative check (scope, capacity, traits,
   * interceptors) against the named actor. Synchronous: nothing inside the
   * four phases awaits.
   *
   * @param request - Action id, actor id, and resolved slot entities
   * @param world - The world model
   * @param context - Turn context (current turn, player, config)
   * @param config - Engine config (timing collection)
   * @param soundBuffer - The per-turn sound buffer (ADR-172)
   * @returns The turn result with `actorId` set to the request's actor;
   *          never throws — an unknown actor or action comes back as a
   *          `command.failed` event with `success: false`
   */
  executeAsActor(
    request: ActorCommand,
    world: WorldModel,
    context: GameContext,
    config?: EngineConfig,
    soundBuffer?: ISound[],
  ): TurnResult {
    const turn = context.currentTurn;
    const timing: PhaseTiming = { startTime: config?.collectTiming ? Date.now() : 0, parseTime: 0 };
    const parsed = syntheticParsed(request);

    try {
      const actor = world.getEntity(request.actorId);
      if (!actor) {
        throw new Error(`Actor not found: ${request.actorId}`);
      }
      const command: ValidatedCommand = {
        parsed,
        actionId: request.actionId,
        directObject: slotReference(request.directObject),
        indirectObject: slotReference(request.indirectObject),
        instrument: slotReference(request.instrument)
      };
      return this.runPhases(command, actor, parsed.rawInput, world, context, config, soundBuffer, timing);
    } catch (error) {
      return this.failedResult(turn, parsed.rawInput, error as Error, config, timing);
    }
  }

  /**
   * The one four-phase path (ADR-328 D1). Both entries land here with a
   * validated command and the entity acting; nothing below reads the
   * player except through `actor`.
   */
  private runPhases(
    command: ValidatedCommand,
    actor: IFEntity,
    input: string,
    world: WorldModel,
    context: GameContext,
    config: EngineConfig | undefined,
    soundBuffer: ISound[] | undefined,
    timing: PhaseTiming
  ): TurnResult {
    const turn = context.currentTurn;
    const executionStart = config?.collectTiming ? Date.now() : 0;
    let executionTime = 0;
    let refused = false;

    const action = this.actionRegistry.get(command.actionId);
    if (!action) {
      throw new Error(`Action not found: ${command.actionId}`);
    }

    // Create context
    if (!this.scopeResolver) {
      this.scopeResolver = createScopeResolver(world);
    }
    const actionContext = createActionContext(world, context, command, action, this.scopeResolver, soundBuffer, this.randomService, actor);

    // Pre-action hook (ADR-148): listeners can modify world state before validation
    this.emitBeforeAction({
      actionId: command.actionId,
      actorId: actor.id,
      directObjectId: command.directObject?.entity?.id,
    }, world);

    // Universal Capability Dispatch: Check if any involved entity has a capability for this action
    // If so, the entity's behavior handles the action instead of the stdlib default
    // Check all entities: directObject, indirectObject, and any others
    const involvedEntities = [
      command.directObject?.entity,
      command.indirectObject?.entity
    ];
    const capabilityCheck = checkCapabilityDispatchMulti(
      world,
      command.actionId,
      involvedEntities
    );

    // Run action's four phases: validate → execute → report (or blocked)
    // If capability dispatch applies, use capability behavior; otherwise use action
    let actionValidation = capabilityCheck.shouldDispatch
      ? executeCapabilityValidate(capabilityCheck, actionContext)
      : action.validate(actionContext);
    let currentCommand = command;
    let currentContext = actionContext;
    let useCapabilityDispatch = capabilityCheck.shouldDispatch;

    // ADR-104: Implicit inference - if validation fails and pronoun was used,
    // try to find a valid alternative target
    // Check story-level config first
    const inferenceEnabled = context.implicitActions?.inference !== false;
    if (!actionValidation.valid && action.targetRequirements && inferenceEnabled) {
      const directObject = command.directObject;
      // Check if pronoun was used (INounPhrase has wasPronoun, cast is safe)
      const parsedNounPhrase = directObject?.parsed as { wasPronoun?: boolean } | undefined;
      const wasPronoun = parsedNounPhrase?.wasPronoun === true;

      if (wasPronoun && directObject?.entity) {
        // Note: directObject.parsed is typed as IParsedObjectReference but at runtime
        // it's actually an INounPhrase (command-validator sets it from the noun phrase)
        // Get entities in scope for inference (visible to the actor)
        const scopeEntities = this.scopeResolver!.getVisible(actor);

        // Try to infer a different target
        const inferenceResult = tryInferTarget(
          directObject.entity,
          wasPronoun,
          action,
          scopeEntities,
          world
        );

        if (inferenceResult.inferred && inferenceResult.inferredTarget) {
          // Create a modified command with the inferred target
          const inferredCommand = {
            ...command,
            directObject: {
              entity: inferenceResult.inferredTarget,
              parsed: {
                ...directObject.parsed,
                // Update text to reflect inferred entity
                text: inferenceResult.inferredTarget.name
              }
            }
          };

          // Create new context with inferred command
          const inferredContext = createActionContext(
            world,
            context,
            inferredCommand,
            action,
            this.scopeResolver!,
            soundBuffer,
            this.randomService,
            actor,
          );

          // Mark that inference occurred (for "(the leaflet)" message)
          const sharedData = inferredContext.sharedData as EngineSharedData;
          sharedData[SharedDataKeys.INFERENCE_PERFORMED] = true;
          sharedData[SharedDataKeys.ORIGINAL_TARGET] = directObject.entity;
          sharedData[SharedDataKeys.INFERRED_TARGET] = inferenceResult.inferredTarget;

          // Re-check capability dispatch for inferred target
          const inferredInvolvedEntities = [
            inferenceResult.inferredTarget,
            command.indirectObject?.entity
          ];
          const inferredCapabilityCheck = checkCapabilityDispatchMulti(
            world,
            command.actionId,
            inferredInvolvedEntities
          );

          // Re-validate with inferred target (using capability dispatch if applicable)
          const retryValidation = inferredCapabilityCheck.shouldDispatch
            ? executeCapabilityValidate(inferredCapabilityCheck, inferredContext)
            : action.validate(inferredContext);

          if (retryValidation.valid) {
            // Inference succeeded - use the inferred command
            actionValidation = retryValidation;
            currentCommand = inferredCommand;
            currentContext = inferredContext;
            useCapabilityDispatch = inferredCapabilityCheck.shouldDispatch;
          }
        }
      }
    }

    // Thread validation result to later phases via context
    // This allows actions to access data from validate() in execute/report
    (currentContext as { validationResult?: typeof actionValidation }).validationResult = actionValidation;

    let events: ISemanticEvent[];

    if (actionValidation.valid) {
      if (useCapabilityDispatch) {
        // Capability dispatch: use behavior phases
        executeCapabilityExecute(currentContext);
        events = executeCapabilityReport(currentContext);
      } else {
        // Standard action: use action phases
        const executeResult = action.execute(currentContext);

        // Check pattern (new vs old)
        if (executeResult === undefined || executeResult === null) {
          // New pattern: use report() for success events only
          if (action.report) {
            events = action.report(currentContext);
          } else {
            throw new Error(`Action ${action.id} uses new pattern but lacks report()`);
          }
        } else {
          // Old pattern: events from execute()
          events = executeResult as ISemanticEvent[];
        }
      }
    } else {
      // Validation failed - use blocked() for error events
      refused = true;
      if (useCapabilityDispatch) {
        // Capability dispatch: use behavior's blocked phase
        events = executeCapabilityBlocked(currentContext, actionValidation, command.actionId);
      } else if (action.blocked) {
        events = action.blocked(currentContext, actionValidation);
      } else {
        // Fallback for unmigrated actions
        events = [{
          id: `${turn}-error`,
          type: 'action.error',
          timestamp: Date.now(),
          data: {
            actionId: command.actionId,
            messageId: actionValidation.error || 'validation_failed',
            params: actionValidation.params || {}
          },
          entities: {}
        }];
      }
    }

    if (config?.collectTiming) {
      executionTime = Date.now() - executionStart;
    }

    // Process events and collect reactions (ADR-052 entity handlers)
    let allEvents = events;
    if (events.length > 0) {
      const processed = this.eventProcessor.processEvents(events);
      // Add reaction events from entity handlers
      if (processed.reactions && processed.reactions.length > 0) {
        allEvents = [...events, ...processed.reactions];
      }
      // An event whose application threw — a chain handler raising a runtime
      // diagnostic (the loader's `runtime.*` LoadErrors) — surfaces on the
      // same `command.failed` event this executor's own catch produces. The
      // processor records the failure; nothing read it, so a diagnostic
      // raised from a chain-fired clause vanished (found 2026-08-29, ADR-329
      // Phase 9b). The command itself stands: the action ran; a reaction did not.
      for (const failure of processed.failed) {
        allEvents = [...allEvents, {
          id: `cmd_failed_${turn}_${Date.now()}_${allEvents.length}`,
          type: 'command.failed',
          timestamp: Date.now(),
          entities: {},
          // A chain-fired clause's failure is a story rule's diagnostic by
          // construction (GH #345): rendered as such, never as a parse failure.
          data: { reason: failure.reason, input, eventType: failure.event.type, storyRule: true }
        }];
      }
    }

    const result: TurnResult = {
      turn,
      input,
      success: !events.some(e => e.type === 'action.error'),
      ...(refused ? { refused: true as const } : {}),
      events: allEvents,
      actionId: command.actionId,
      actorId: actor.id,
      parsedCommand: command.parsed,
      validatedCommand: command
    };

    // Add timing data if requested
    if (config?.collectTiming) {
      result.timing = {
        parsing: timing.parseTime,
        execution: executionTime,
        total: Date.now() - timing.startTime
      };
    }

    return result;
  }

  /**
   * Build the failure result both entries return instead of throwing.
   */
  private failedResult(
    turn: number,
    input: string,
    error: Error,
    config: EngineConfig | undefined,
    timing: PhaseTiming
  ): TurnResult {
    // Minimal error handling - just return failure. A thrown error carrying
    // `storyRule: true` (the story loader's LoadError — a condition or clause
    // that failed at run time, GH #345) is a story rule's diagnostic: the
    // command parsed, a rule blew up. The flag rides the event so the prose
    // pipeline renders it as such, never as the parser's own refusal.
    const storyRule = (error as { storyRule?: unknown }).storyRule === true;
    const result: TurnResult = {
      turn,
      input,
      success: false,
      events: [{
        id: `cmd_failed_${turn}_${Date.now()}`,
        type: 'command.failed',
        timestamp: Date.now(),
        entities: {},
        data: { reason: error.message, input, ...(storyRule ? { storyRule: true } : {}) }
      }],
      error: error.message
    };

    // Add timing data even for errors if requested
    if (config?.collectTiming) {
      result.timing = {
        parsing: timing.parseTime,
        execution: 0,
        total: Date.now() - timing.startTime
      };
    }

    return result;
  }
}

export function createCommandExecutor(
  world: WorldModel,
  actionRegistry: ActionRegistry,
  eventProcessor: EventProcessor,
  parser: IParser,
  systemEvents?: IGenericEventSource<ISystemEvent>,
  randomService?: RandomService
): CommandExecutor {
  return new CommandExecutor(world, actionRegistry, eventProcessor, parser, systemEvents, randomService);
}