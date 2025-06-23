/**
 * Action Context Implementation
 * 
 * Creates concrete ActionContext instances for use in actions
 */

import { ActionContext } from './types/action-context';
import { IFEntity, WorldModelService, ScopeService } from '@sharpee/world-model';
import { IFLanguageProvider } from '../language/if-language-provider';
import { TraitType } from '@sharpee/world-model';

/**
 * Options for creating an ActionContext
 */
export interface ActionContextOptions {
  world: WorldModelService;
  player: IFEntity;
  language: IFLanguageProvider;
}

/**
 * Behavior registry for the getBehavior method
 */
const behaviorRegistry = new Map<any, any>();

/**
 * Register a behavior class for use with getBehavior
 */
export function registerBehavior<T>(behaviorClass: { new(): T }): void {
  // Create a singleton instance
  const instance = new behaviorClass();
  behaviorRegistry.set(behaviorClass, instance);
}

/**
 * Create an ActionContext instance
 */
export function createActionContext(options: ActionContextOptions): ActionContext {
  const { world, player, language } = options;
  
  // Create scope service
  const scope = new ScopeService(world);
  
  // Get current location
  const locationId = world.getLocation(player.id);
  if (!locationId) {
    throw new Error('Player has no location');
  }
  
  const currentLocation = world.getEntity(locationId);
  if (!currentLocation) {
    throw new Error('Player location not found');
  }
  
  // Create the context
  const context: ActionContext = {
    world,
    player,
    currentLocation,
    scope,
    language,
    
    // Helper methods
    canSee(entity: IFEntity): boolean {
      return scope.canSee(player, entity);
    },
    
    canReach(entity: IFEntity): boolean {
      return scope.canReach(player, entity);
    },
    
    canTake(entity: IFEntity): boolean {
      // Check basic visibility and reachability
      if (!this.canSee(entity) || !this.canReach(entity)) {
        return false;
      }
      
      // Check if it's scenery (untakeable)
      if (entity.has(TraitType.SCENERY)) {
        return false;
      }
      
      // Check if it's a room
      if (entity.has(TraitType.ROOM)) {
        return false;
      }
      
      // Otherwise it's takeable
      return true;
    },
    
    getName(entity: IFEntity): string {
      if (entity.has(TraitType.IDENTITY)) {
        const identity = entity.getTrait(TraitType.IDENTITY);
        return identity.name || entity.id;
      }
      return entity.id;
    },
    
    getDescription(entity: IFEntity): string | undefined {
      if (entity.has(TraitType.IDENTITY)) {
        const identity = entity.getTrait(TraitType.IDENTITY);
        return identity.description;
      }
      return undefined;
    },
    
    getTurnNumber(): number {
      // TODO: Implement turn tracking
      return 0;
    },
    
    getBehavior<T>(behaviorType: { new(): T }): T {
      const instance = behaviorRegistry.get(behaviorType);
      if (!instance) {
        // Auto-register if not found
        const newInstance = new behaviorType();
        behaviorRegistry.set(behaviorType, newInstance);
        return newInstance;
      }
      return instance;
    }
  };
  
  return context;
}

/**
 * Register all standard behaviors
 */
export function registerStandardBehaviors(): void {
  // Import and register all behaviors
  const {
    ContainerBehavior,
    IdentityBehavior,
    RoomBehavior,
    SceneryBehavior,
    WearableBehavior,
    ReadableBehavior,
    LightSourceBehavior,
    ExitBehavior,
    EntryBehavior,
    OpenableBehavior,
    LockableBehavior,
    SupporterBehavior,
    SwitchableBehavior,
    EdibleBehavior
  } = require('@sharpee/world-model');
  
  // Register each behavior
  registerBehavior(ContainerBehavior);
  registerBehavior(IdentityBehavior);
  registerBehavior(RoomBehavior);
  registerBehavior(SceneryBehavior);
  registerBehavior(WearableBehavior);
  registerBehavior(ReadableBehavior);
  registerBehavior(LightSourceBehavior);
  registerBehavior(ExitBehavior);
  registerBehavior(EntryBehavior);
  registerBehavior(OpenableBehavior);
  registerBehavior(LockableBehavior);
  registerBehavior(SupporterBehavior);
  registerBehavior(SwitchableBehavior);
  registerBehavior(EdibleBehavior);
}