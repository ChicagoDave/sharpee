/**
 * Enhanced Action Context
 * 
 * Action context that includes the service layer for orchestration
 */

import { Entity as IFEntity, SemanticEvent, createEvent } from '@sharpee/core';
import { IFWorld } from '@sharpee/world-model';
import { IFLanguageProvider } from '../../language/if-language-provider';
import { RoomService } from '../../services/room-service';
import { InventoryService } from '../../services/inventory-service';
import { VisibilityService } from '../../services/visibility-service';
import { MovementService } from '../../services/movement-service';
import { ParserService } from '../../services/parser-service';
import { TextService } from '../../text/text-service';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { IFEvents } from '../../constants/if-events';

/**
 * Context provided to actions during execution
 * Includes all services for complex operations
 */
export interface ActionContext {
  /**
   * The world instance
   */
  world: IFWorld;
  
  /**
   * The player entity
   */
  player: IFEntity;
  
  /**
   * Services available to actions
   */
  services: {
    room: RoomService;
    inventory: InventoryService;
    visibility: VisibilityService;
    movement: MovementService;
    parser: ParserService;
    text: TextService;
  };
  
  /**
   * Language provider for localization
   */
  language: IFLanguageProvider;
  
  /**
   * Convenience method to emit an event
   */
  emit(event: SemanticEvent): void;
  
  /**
   * Convenience method to create a failure event
   */
  fail(reason: ActionFailureReason, data?: any): SemanticEvent;
}

/**
 * Options for creating an ActionContext
 */
export interface ActionContextOptions {
  world: IFWorld;
  player: IFEntity;
  language: IFLanguageProvider;
  parser?: ParserService;
  text?: TextService;
}

/**
 * Create an ActionContext with all services
 */
export function createActionContext(options: ActionContextOptions): ActionContext {
  const { world, player, language, parser, text } = options;
  
  // Create services
  const roomService = new RoomService(world);
  const inventoryService = new InventoryService(world);
  const visibilityService = new VisibilityService(world);
  const movementService = new MovementService(world);
  
  // Use provided parser/text or create defaults
  const parserService = parser || createDefaultParserService(world, language);
  const textService = text || createDefaultTextService(language);
  
  // Keep track of emitted events
  const events: SemanticEvent[] = [];
  
  const context: ActionContext = {
    world,
    player,
    services: {
      room: roomService,
      inventory: inventoryService,
      visibility: visibilityService,
      movement: movementService,
      parser: parserService,
      text: textService
    },
    language,
    
    emit(event: SemanticEvent): void {
      events.push(event);
    },
    
    fail(reason: ActionFailureReason, data?: any): SemanticEvent {
      return createEvent(
        IFEvents.ACTION_FAILED,
        { reason, ...data },
        { actor: player.id }
      );
    }
  };
  
  return context;
}

// Placeholder for default parser service
function createDefaultParserService(world: IFWorld, language: IFLanguageProvider): ParserService {
  // This will be implemented when ParserService is created
  return {} as ParserService;
}

// Placeholder for default text service  
function createDefaultTextService(language: IFLanguageProvider): TextService {
  // Use existing text service
  const { SimpleTextService } = require('../text/text-service');
  return new SimpleTextService(language);
}
