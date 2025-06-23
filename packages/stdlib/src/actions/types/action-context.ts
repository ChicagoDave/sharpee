/**
 * Action context interface for trait-based action system
 * 
 * Provides a clean interface for actions to interact with the world model
 * using traits instead of attributes.
 */

import { IFEntity, WorldModelService, ScopeService } from '@sharpee/world-model';
import { IFLanguageProvider } from '../../language/if-language-provider';


/**
 * Context provided to actions during execution
 * 
 * This replaces GameContext with a trait-aware interface
 */
export interface ActionContext {
  /**
   * The world model service for entity operations
   */
  world: WorldModelService;
  
  /**
   * The player entity
   */
  player: IFEntity;
  
  /**
   * The current location entity
   */
  currentLocation: IFEntity;
  
  /**
   * Service for scope calculations
   */
  scope: ScopeService;
  
  /**
   * Language provider for message formatting
   */
  language: IFLanguageProvider;
  
  // Helper methods for common operations
  
  /**
   * Check if the player can see an entity
   */
  canSee(entity: IFEntity): boolean;
  
  /**
   * Check if the player can physically reach an entity
   */
  canReach(entity: IFEntity): boolean;
  
  /**
   * Check if the player can take an entity
   * (visible, reachable, portable, not fixed, etc.)
   */
  canTake(entity: IFEntity): boolean;
  
  // Trait-aware helpers
  
  /**
   * Get the display name of an entity
   * Uses the IdentityTrait if available, falls back to entity ID
   */
  getName(entity: IFEntity): string;
  
  /**
   * Get the description of an entity
   * Uses the IdentityTrait if available
   */
  getDescription(entity: IFEntity): string | undefined;
  
  /**
   * Get the current turn number
   */
  getTurnNumber(): number;
  
  /**
   * Get a behavior class by type
   * This allows actions to access behavior logic without instantiating
   */
  getBehavior<T>(behaviorType: { new(): T }): T;
}
