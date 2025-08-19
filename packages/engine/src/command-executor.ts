/**
 * Command Executor - Orchestrates command execution flow
 * 
 * Ties together parsing, resolution, action execution, and event processing
 */

import { ISemanticEvent } from '@sharpee/core';
import { LanguageProvider } from '@sharpee/if-domain';
import { 
  IParsedCommand, 
  IValidatedCommand,
  IParser,
  IValidationError
} from '@sharpee/world-model';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import {
  CommandValidator,
  ActionContext,
  ActionRegistry,
  Action,
  ScopeResolver,
  createScopeResolver
} from '@sharpee/stdlib';

import { 
  GameContext, 
  TurnResult, 
  SequencedEvent,
  GameEvent,
  EngineConfig 
} from './types';
import { eventSequencer } from './event-sequencer';
import { createActionContext } from './action-context-factory';

/**
 * Command executor options
 */
export interface CommandExecutorOptions {
  /**
   * World model
   */
  world: WorldModel;
  
  /**
   * Action registry to use
   */
  actionRegistry: ActionRegistry;
  
  /**
   * Event processor to use
   */
  eventProcessor: EventProcessor;
  
  /**
   * Language provider for parsing
   */
  languageProvider: LanguageProvider;
  
  /**
   * Parser to use
   */
  parser: IParser;
  
  /**
   * Whether to auto-resolve ambiguities
   */
  autoResolveAmbiguities?: boolean;
}

/**
 * Command executor implementation
 */
export class CommandExecutor {
  private parser: IParser;
  private validator: CommandValidator;
  private actionRegistry: ActionRegistry;
  private eventProcessor: EventProcessor;
  private autoResolve: boolean;

  constructor(
    world: WorldModel,
    actionRegistry: ActionRegistry,
    eventProcessor: EventProcessor,
    languageProvider: LanguageProvider,
    parser: IParser
  ) {
    if (!world) throw new Error('World model is required');
    if (!actionRegistry) throw new Error('Action registry is required');
    if (!eventProcessor) throw new Error('Event processor is required');
    if (!languageProvider) throw new Error('Language provider is required');
    if (!parser) throw new Error('Parser is required');
    
    this.parser = parser;
    this.validator = new CommandValidator(world, actionRegistry);
    this.actionRegistry = actionRegistry;
    this.eventProcessor = eventProcessor;
    this.autoResolve = true;
  }
  
  /**
   * Set the system event source for debug output
   */
  setSystemEventSource(eventSource: any): void {
    this.validator.setSystemEventSource(eventSource);
  }

  /**
   * Execute a command string
   */
  async execute(
    input: string,
    world: WorldModel,
    context: GameContext,
    config?: EngineConfig
  ): Promise<TurnResult> {
    const startTime = config?.collectTiming ? Date.now() : 0;
    let parseEndTime = 0;
    const turn = context.currentTurn;

    try {
      // Check if system events are enabled
      const debugData = world.getCapability('debug');
      const emitParserEvents = debugData?.debugParserEvents === true;
      const emitValidationEvents = debugData?.debugValidationEvents === true;
      
      // Phase 1: Parse the input
      const parseResult = this.parser.parse(input);
      
      if (config?.collectTiming) {
        parseEndTime = Date.now();
      }
      
      if (!parseResult.success) {
        throw new Error(parseResult.error.message);
      }

      const parsed = parseResult.value;
      
      // Emit parser events if enabled
      const systemEvents: SequencedEvent[] = [];
      if (emitParserEvents) {
        // Emit main parser event
        systemEvents.push(eventSequencer.sequence({
          type: 'system.parser',
          data: {
            input,
            parsed: {
              action: parsed.action,
              pattern: parsed.pattern,
              confidence: parsed.confidence,
              tokens: parsed.tokens?.length || 0
            }
          }
        }, turn));
        
        // Emit detailed tokenization event
        if (parsed.tokens && parsed.tokens.length > 0) {
          systemEvents.push(eventSequencer.sequence({
            type: 'system.parser.tokens',
            data: {
              count: parsed.tokens.length,
              tokens: parsed.tokens.map((t: any) => ({
                word: t.word,
                normalized: t.normalized,
                partOfSpeech: t.partOfSpeech,
                position: t.position,
                length: t.length,
                candidates: t.candidates?.map((c: any) => ({
                  id: c.id,
                  type: c.type,
                  confidence: c.confidence
                }))
              }))
            }
          }, turn));
        }
        
        // Emit structure breakdown event if structure exists
        if (parsed.structure) {
          systemEvents.push(eventSequencer.sequence({
            type: 'system.parser.structure',
            data: {
              verb: {
                text: parsed.structure.verb?.text,
                head: parsed.structure.verb?.head,
                particles: parsed.structure.verb?.particles
              },
              directObject: parsed.structure.directObject ? {
                text: parsed.structure.directObject.text,
                head: parsed.structure.directObject.head,
                modifiers: parsed.structure.directObject.modifiers,
                articles: parsed.structure.directObject.articles,
                determiners: parsed.structure.directObject.determiners
              } : undefined,
              preposition: parsed.structure.preposition?.text,
              indirectObject: parsed.structure.indirectObject ? {
                text: parsed.structure.indirectObject.text,
                head: parsed.structure.indirectObject.head,
                modifiers: parsed.structure.indirectObject.modifiers,
                articles: parsed.structure.indirectObject.articles,
                determiners: parsed.structure.indirectObject.determiners
              } : undefined
            }
          }, turn));
        }
      }

      // Phase 2: Validate against the world
      if (emitValidationEvents) {
        // Emit validation start event
        systemEvents.push(eventSequencer.sequence({
          type: 'system.validation.start',
          data: {
            action: parsed.action,
            hasDirectObject: !!parsed.structure?.directObject,
            hasIndirectObject: !!parsed.structure?.indirectObject,
            preposition: parsed.structure?.preposition?.text
          }
        }, turn));
      }
      
      const validationResult = this.validator.validate(parsed);
      
      if (!validationResult.success) {
        // Emit validation failure event if enabled
        if (emitValidationEvents) {
          systemEvents.push(eventSequencer.sequence({
            type: 'system.validation.failed',
            data: {
              error: validationResult.error.message,
              code: validationResult.error.code,
              details: validationResult.error.details
            }
          }, turn));
        }
        throw new Error(validationResult.error.message);
      }

      const validated = validationResult.value;
      
      // Emit validation success event if enabled
      if (emitValidationEvents) {
        // Main success event
        systemEvents.push(eventSequencer.sequence({
          type: 'system.validation.success',
          data: {
            actionId: validated.actionId,
            directObject: validated.directObject?.entity?.id,
            indirectObject: validated.indirectObject?.entity?.id
          }
        }, turn));
        
        // Emit detailed scope information
        if (validated.scopeInfo) {
          const scopeData: any = {};
          
          if (validated.scopeInfo.directObject) {
            const identity = validated.directObject?.entity?.get?.('identity') as any;
            scopeData.directObject = {
              entityId: validated.directObject?.entity?.id,
              entityName: identity?.name,
              scopeLevel: validated.scopeInfo.directObject.level,
              perceivedBy: validated.scopeInfo.directObject.perceivedBy
            };
          }
          
          if (validated.scopeInfo.indirectObject) {
            const identity = validated.indirectObject?.entity?.get?.('identity') as any;
            scopeData.indirectObject = {
              entityId: validated.indirectObject?.entity?.id,
              entityName: identity?.name,
              scopeLevel: validated.scopeInfo.indirectObject.level,
              perceivedBy: validated.scopeInfo.indirectObject.perceivedBy
            };
          }
          
          if (Object.keys(scopeData).length > 0) {
            systemEvents.push(eventSequencer.sequence({
              type: 'system.validation.scope',
              data: scopeData
            }, turn));
          }
        }
        
        // Emit entity resolution details
        if (validated.directObject || validated.indirectObject) {
          const resolutionData: any = {};
          
          if (validated.directObject) {
            const directEntity = validated.directObject.entity;
            const directIdentity = directEntity?.get?.('identity') as any;
            resolutionData.directObject = {
              parsed: validated.directObject.parsed.text,
              resolved: directEntity?.id,
              name: directIdentity?.name,
              location: world.getLocation(directEntity?.id || '')
            };
          }
          
          if (validated.indirectObject) {
            const indirectEntity = validated.indirectObject.entity;
            const indirectIdentity = indirectEntity?.get?.('identity') as any;
            resolutionData.indirectObject = {
              parsed: validated.indirectObject.parsed.text,
              resolved: indirectEntity?.id,
              name: indirectIdentity?.name,
              location: world.getLocation(indirectEntity?.id || '')
            };
          }
          
          systemEvents.push(eventSequencer.sequence({
            type: 'system.validation.resolution',
            data: resolutionData
          }, turn));
        }
      }

      // Phase 3: Execute the validated command
      const result = await this.executeCommand(validated, world, context, turn);
      
      // Add system events to the result
      if (systemEvents.length > 0) {
        // Insert system events at the beginning so they appear first
        result.events = [...systemEvents, ...result.events];
      }

      // Add timing if configured
      if (config?.collectTiming) {
        const endTime = Date.now();
        result.timing = {
          parsing: parseEndTime - startTime,
          execution: endTime - parseEndTime,
          total: endTime - startTime
        };
      }

      return result;

    } catch (error) {
      // Handle errors
      if (config?.onError) {
        config.onError(error as Error, context);
      }

      // Create error event
      const errorEvent = eventSequencer.sequence({
        type: 'command.failed',
        data: {
          reason: (error as Error).message,
          input
        }
      }, turn);
      
      const errorResult: TurnResult = {
        turn,
        input,
        success: false,
        events: [errorEvent],
        error: (error as Error).message
      };
      
      // Add timing if configured
      if (config?.collectTiming) {
        const endTime = Date.now();
        errorResult.timing = {
          parsing: parseEndTime - startTime,
          execution: endTime - (parseEndTime || startTime),
          total: endTime - startTime
        };
      }
      
      return errorResult;
    }
  }

  /**
   * Execute a validated command
   */
  async executeCommand(
    command: IValidatedCommand,
    world: WorldModel,
    context: GameContext,
    turn: number
  ): Promise<TurnResult> {
    // Reset sequencer for this turn
    eventSequencer.resetTurn(turn);

    // Look up the action from the registry
    const action = this.actionRegistry.get(command.actionId);
    if (!action) {
      throw new Error(`Action not found in registry: ${command.actionId}`);
    }

    // Create action context
    const actionContext = this.createActionContext(world, context, command, action);

    let events: GameEvent[] = [];
    let success = true;
    let error: string | undefined;

    // Phase 1: Validate the action can be executed
    // Check if action has the new validate() method (during migration, some may not)
    if ('validate' in action && typeof action.validate === 'function') {
      const validationResult = action.validate(actionContext);
      
      if (!validationResult.valid) {
        // Create error event from validation failure
        const errorEvent: ISemanticEvent = {
          id: `${turn}-validation-error`,
          type: 'action.error',
          timestamp: Date.now(),
          data: {
            actionId: command.actionId,
            messageId: validationResult.messageId || validationResult.error || 'validation_failed',
            reason: validationResult.error || 'validation_failed',
            params: validationResult.params || {}
          },
          entities: {}
        };
        
        // Convert to GameEvent and return early
        events = [{
          type: errorEvent.type,
          data: errorEvent.data,
          metadata: { id: errorEvent.id, entities: errorEvent.entities }
        }];
        
        const sequencedEvents = eventSequencer.sequenceAll(events, turn);
        
        return {
          turn,
          input: command.parsed.rawInput || command.parsed.action,
          success: false,
          events: sequencedEvents,
          error: validationResult.error || 'validation_failed',
          actionId: command.actionId,
          parsedCommand: command.parsed
        };
      }
    }
    // During migration: fall back to canExecute if validate doesn't exist
    else if ('canExecute' in action && typeof action.canExecute === 'function') {
      const canExecute = action.canExecute(actionContext);
      if (!canExecute) {
        // Create generic error for old-style validation
        const errorEvent: ISemanticEvent = {
          id: `${turn}-canexecute-error`,
          type: 'action.error',
          timestamp: Date.now(),
          data: {
            actionId: command.actionId,
            messageId: 'cannot_execute',
            reason: 'cannot_execute'
          },
          entities: {}
        };
        
        events = [{
          type: errorEvent.type,
          data: errorEvent.data,
          metadata: { id: errorEvent.id, entities: errorEvent.entities }
        }];
        
        const sequencedEvents = eventSequencer.sequenceAll(events, turn);
        
        return {
          turn,
          input: command.parsed.rawInput || command.parsed.action,
          success: false,
          events: sequencedEvents,
          error: 'cannot_execute',
          actionId: command.actionId,
          parsedCommand: command.parsed
        };
      }
    }

    // Phase 2: Execute the action (only if validation passed)
    // All actions now use the modern Action pattern - execute returns SemanticEvent[]
    const semanticEvents = await (action as Action).execute(actionContext);
    
    // Phase 3: Check for entity-level event handlers
    // After action execution, check if any entities involved have handlers
    const additionalEvents: ISemanticEvent[] = [];
    for (const event of semanticEvents) {
      // Check if this is an event that entities might handle (e.g., if.event.pushed)
      if (event.type.startsWith('if.event.')) {
        // Get the target entity if specified
        const targetId = event.data?.target;
        if (targetId && typeof targetId === 'string') {
          const targetEntity = world.getEntity(targetId);
          if (targetEntity && 'on' in targetEntity && targetEntity.on) {
            // Check if entity has handler for this event type
            const handler = targetEntity.on[event.type];
            if (handler) {
              // Execute entity handler
              const handlerResult = handler(event as any);
              if (handlerResult) {
                additionalEvents.push(...handlerResult);
              }
            }
          }
        }
      }
    }
    
    // Phase 4: Check for story-level event handlers
    // Story-level handlers would need to be passed in via context or another mechanism
    // For now, we'll skip this as GameContext doesn't have a story property
    // This can be added later when the story is properly integrated into the context
    
    // Combine all events
    const allEvents = [...semanticEvents, ...additionalEvents];
    
    // Convert SemanticEvent[] to GameEvent[]
    events = allEvents.map((se: ISemanticEvent) => ({
      type: se.type,
      data: se.data,
      metadata: { id: se.id, entities: se.entities }
    }));
    
    // Determine success based on whether we have error events
    success = !allEvents.some(e => e.type === 'action.error');
    
    // Extract error message if present
    const errorEvent = allEvents.find(e => e.type === 'action.error');
    error = errorEvent ? String(errorEvent.data?.reason || 'Action failed') : undefined;

    // Sequence the events
    const sequencedEvents = eventSequencer.sequenceAll(events, turn);

    // Process the events to update the world
    if (sequencedEvents.length > 0) {
      // Convert SequencedEvent[] to SemanticEvent[] for the event processor
      const semanticEvents = sequencedEvents.map(e => ({
        id: e.sequence.toString(),
        type: e.type,
        data: e.data,
        timestamp: e.timestamp instanceof Date ? e.timestamp.getTime() : e.timestamp,
        entities: e.data?.entities || {}
      }));
      
      // Process entity event handlers BEFORE updating the world
      const entityHandlerEvents = this.processEntityHandlers(semanticEvents);
      if (entityHandlerEvents.length > 0) {
        // Convert SemanticEvent[] to GameEvent[] for sequencer
        const gameEvents = entityHandlerEvents.map(e => ({
          ...e,
          data: e.data || {}
        }));
        const sequencedHandlerEvents = eventSequencer.sequenceAll(gameEvents, turn);
        sequencedEvents.push(...sequencedHandlerEvents);
        
        // Convert entity handler events to match semanticEvents format
        const formattedHandlerEvents = sequencedHandlerEvents.map(e => ({
          id: e.sequence.toString(),
          type: e.type,
          data: e.data,
          timestamp: e.timestamp instanceof Date ? e.timestamp.getTime() : e.timestamp,
          entities: e.data?.entities || {}
        }));
        semanticEvents.push(...formattedHandlerEvents);
      }
      
      this.eventProcessor.processEvents(semanticEvents);
    }

    return {
      turn,
      input: command.parsed.rawInput || command.parsed.action,
      success,
      events: sequencedEvents,
      error,
      actionId: command.actionId,
      parsedCommand: command.parsed
    };
  }

  /**
   * Scope resolver instance
   */
  private scopeResolver?: ScopeResolver;

  /**
   * Process entity event handlers
   */
  private processEntityHandlers(events: ISemanticEvent[]): ISemanticEvent[] {
    const handlerEvents: ISemanticEvent[] = [];
    const world = this.eventProcessor.getWorld();
    
    for (const event of events) {
      // Check all entities in the world for handlers
      const entities = world.getAllEntities();
      
      for (const entity of entities) {
        // Check if entity has event handlers
        if (entity.on && typeof entity.on === 'object') {
          const handler = entity.on[event.type];
          
          if (typeof handler === 'function') {
            try {
              // Convert SemanticEvent to GameEvent (ensure data property exists)
              const gameEvent = {
                ...event,
                data: event.data || {}
              };
              
              // Call the handler with the event
              const result = handler(gameEvent);
              
              // If handler returns events, add them
              if (result && Array.isArray(result)) {
                handlerEvents.push(...result);
              }
            } catch (error) {
              console.error(`Error in entity ${entity.id} handler for ${event.type}:`, error);
            }
          }
        }
      }
    }
    
    return handlerEvents;
  }

  /**
   * Create action context from game context
   */
  private createActionContext(
    world: WorldModel, 
    context: GameContext,
    command: IValidatedCommand,
    action: Action
  ): ActionContext {
    // Create scope resolver if not exists
    if (!this.scopeResolver) {
      this.scopeResolver = createScopeResolver(world);
    }

    return createActionContext(world, context, command, action, this.scopeResolver);
  }

  /**
   * Get recent entities from turn history
   */
  private getRecentEntities(context: GameContext): string[] {
    const recent: string[] = [];
    const recentTurns = context.history.slice(-5); // Last 5 turns

    // TODO: Implement entity tracking from events
    // For now, return empty array
    // We would need to examine the events in each turn to extract entity references
    
    return recent;
  }

  /**
   * Create an error command for failed parsing
   */
  private createErrorCommand(input: string): IParsedCommand {
    return {
      action: 'UNKNOWN',
      rawInput: input,
      tokens: [],
      structure: {
        verb: { 
          tokens: [],
          text: 'unknown',
          head: 'unknown'
        }
      },
      pattern: '',
      confidence: 0
    };
  }
}

/**
 * Factory function to create a command executor
 */
export function createCommandExecutor(
  world: WorldModel,
  actionRegistry: ActionRegistry,
  eventProcessor: EventProcessor,
  languageProvider: LanguageProvider,
  parser: IParser
): CommandExecutor {
  return new CommandExecutor(
    world,
    actionRegistry,
    eventProcessor,
    languageProvider,
    parser
  );
}
