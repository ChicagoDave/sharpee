/**
 * Command Executor - Orchestrates command pipeline
 *
 * Responsibilities:
 * - Orchestrate the four-phase pattern (validate → execute → report/blocked)
 * - Handle implicit inference (ADR-104) when validation fails with pronouns
 * - Pass results between phases
 * - Return the final TurnResult
 *
 * All event creation is owned by the action components themselves.
 */

import { ISemanticEvent, ISystemEvent, IGenericEventSource, QuerySource, QueryType, Result } from '@sharpee/core';
import { IParser, IValidatedCommand, IParsedCommand, IValidationError } from '@sharpee/world-model';
import { hasWorldContext } from './parser-interface';
import { SharedDataKeys, EngineSharedData } from './shared-data-keys';
import { WorldModel } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import {
  CommandValidator,
  ActionRegistry,
  Action,
  ScopeResolver,
  createScopeResolver,
  tryInferTarget
} from '@sharpee/stdlib';

import { GameContext, TurnResult, EngineConfig } from './types';
import { createActionContext } from './action-context-factory';
import {
  checkCapabilityDispatch,
  checkCapabilityDispatchMulti,
  executeCapabilityValidate,
  executeCapabilityExecute,
  executeCapabilityReport,
  executeCapabilityBlocked
} from './capability-dispatch-helper';

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

export class CommandExecutor {
  private parser: IParser;
  private validator: CommandValidator;
  private actionRegistry: ActionRegistry;
  private eventProcessor: EventProcessor;
  private scopeResolver?: ScopeResolver;
  private parsedCommandTransformers: ParsedCommandTransformer[] = [];
  private beforeActionListeners: BeforeActionHookListener[] = [];

  constructor(
    world: WorldModel,
    actionRegistry: ActionRegistry,
    eventProcessor: EventProcessor,
    parser: IParser,
    systemEvents?: IGenericEventSource<ISystemEvent>
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

  async execute(
    input: string,
    world: WorldModel,
    context: GameContext,
    config?: EngineConfig
  ): Promise<TurnResult> {
    const turn = context.currentTurn;

    // Timing tracking
    const startTime = config?.collectTiming ? Date.now() : 0;
    let parseTime = 0;
    let executionTime = 0;

    try {
      // Set world context for parser entity resolution
      const player = world.getPlayer();
      if (player && hasWorldContext(this.parser)) {
        const playerLocation = world.getLocation(player.id) || '';
        this.parser.setWorldContext(world, player.id, playerLocation);
      }

      // Phase 1: Parse
      const parseStart = config?.collectTiming ? Date.now() : 0;
      const parseResult = this.parser.parse(input);
      if (config?.collectTiming) {
        parseTime = Date.now() - parseStart;
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

      // Phase 3: Execute action's three-phase pattern
      const executionStart = config?.collectTiming ? Date.now() : 0;
      const command = validationResult.value;
      const action = this.actionRegistry.get(command.actionId);
      if (!action) {
        throw new Error(`Action not found: ${command.actionId}`);
      }

      // Create context
      if (!this.scopeResolver) {
        this.scopeResolver = createScopeResolver(world);
      }
      const actionContext = createActionContext(world, context, command, action, this.scopeResolver);

      // Pre-action hook (ADR-148): listeners can modify world state before validation
      this.emitBeforeAction({
        actionId: command.actionId,
        actorId: context.player?.id,
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
          // Get entities in scope for inference (visible entities)
          const scopeEntities = this.scopeResolver!.getVisible(world.getPlayer()!);

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
              this.scopeResolver!
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
      }

      const result: TurnResult = {
        turn,
        input,
        success: !events.some(e => e.type === 'action.error'),
        events: allEvents,
        actionId: command.actionId,
        parsedCommand: command.parsed,
        validatedCommand: command
      };

      // Add timing data if requested
      if (config?.collectTiming) {
        result.timing = {
          parsing: parseTime,
          execution: executionTime,
          total: Date.now() - startTime
        };
      }

      return result;

    } catch (error) {
      // Minimal error handling - just return failure
      const result: TurnResult = {
        turn,
        input,
        success: false,
        events: [{
          id: `cmd_failed_${turn}_${Date.now()}`,
          type: 'command.failed',
          timestamp: Date.now(),
          entities: {},
          data: { reason: (error as Error).message, input }
        }],
        error: (error as Error).message
      };

      // Add timing data even for errors if requested
      if (config?.collectTiming) {
        result.timing = {
          parsing: parseTime,
          execution: executionTime,
          total: Date.now() - startTime
        };
      }

      return result;
    }
  }
}

export function createCommandExecutor(
  world: WorldModel,
  actionRegistry: ActionRegistry,
  eventProcessor: EventProcessor,
  parser: IParser,
  systemEvents?: IGenericEventSource<ISystemEvent>
): CommandExecutor {
  return new CommandExecutor(world, actionRegistry, eventProcessor, parser, systemEvents);
}