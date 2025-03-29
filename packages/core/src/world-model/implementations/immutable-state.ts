// packages/core/src/world-model/implementations/immutable-state.ts

import { EventEmitter, StandardEvents, createEventEmitter } from './event-emitter';

import {
    WorldState,
    WorldStateMeta,
    StateHistoryEntry,
    StateManagerConfig,
    StateTransformer,
    Entity,
    EntityId,
    EntityCreationParams,
    EntityOperationOptions
  } from '../types';
  
  /**
   * Default configuration for the state manager
   */
  const DEFAULT_CONFIG: StateManagerConfig = {
    maxHistorySize: 100,
    enableUndo: true,
    trackAllChanges: false
  };
  
  /**
   * Manages the immutable state of the world and its history
   */
  export class StateManager {
    private currentState: WorldState;
    private history: StateHistoryEntry[] = [];
    private config: StateManagerConfig;
    private undoStack: StateHistoryEntry[] = [];
    private redoStack: StateHistoryEntry[] = [];
    private eventEmitter: EventEmitter;
  
    /**
     * Creates a new StateManager
     * @param initialState Initial world state or undefined to create default
     * @param config Configuration options
     */
    constructor(initialState?: WorldState, config: Partial<StateManagerConfig> = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.currentState = initialState || this.createInitialState();
      this.eventEmitter = createEventEmitter();
      this.addToHistory(this.currentState, 'Initial state');
    }

    /**
     * Gets event emitter instance
     */
    public getEventEmitter(): EventEmitter {
        return this.eventEmitter;
      }
  
    /**
     * Creates a default initial state
     */
    private createInitialState(): WorldState {
      const meta: WorldStateMeta = {
        version: '1.0.0',
        timestamp: Date.now(),
        turnNumber: 0
      };
  
      return {
        entities: {},
        meta
      };
    }
  
    /**
     * Gets the current world state
     */
    public getState(): WorldState {
      return this.currentState;
    }
  
    /**
     * Gets an entity by ID from the current state
     * @param id Entity ID
     */
    public getEntity(id: EntityId): Entity | undefined {
      return this.currentState.entities[id];
    }
  
    /**
     * Updates the world state using a transformer function
     * @param transformer Function that transforms the state
     * @param description Description of the update for history
     */
    public updateState(transformer: StateTransformer, description?: string): WorldState {
        const previousState = this.currentState;
        const nextState = transformer(this.currentState);
        
        // Only update if something changed
        if (nextState !== this.currentState) {
          // Update metadata
          const updatedState = {
            ...nextState,
            meta: {
              ...nextState.meta,
              timestamp: Date.now(),
              turnNumber: this.currentState.meta.turnNumber + 1
            }
          };
    
          this.currentState = updatedState;
          
          // Add to history if tracking all changes or if description provided
          if (this.config.trackAllChanges || description) {
            this.addToHistory(updatedState, description);
          }
          
          // Clear redo stack since we've made a new change
          this.redoStack = [];
          
          // Emit state updated event
          this.eventEmitter.emitTyped(StandardEvents.STATE_UPDATED, {
            previousState,
            currentState: this.currentState,
            description
          });
        }
        
        return this.currentState;
      }
  
    /**
     * Adds a state to the history
     * @param state State to add
     * @param description Description of what caused this state
     * @param command Command that led to this state
     */
    private addToHistory(state: WorldState, description?: string, command?: string): void {
      const entry: StateHistoryEntry = {
        state,
        description,
        command
      };
  
      this.history.push(entry);
      
      // Limit history size
      if (this.config.maxHistorySize && this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
      
      // Add to undo stack if undo is enabled
      if (this.config.enableUndo) {
        this.undoStack.push(entry);
      }
    }
  
    /**
     * Gets the history of state changes
     */
    public getHistory(): StateHistoryEntry[] {
      return [...this.history];
    }
  
    /**
     * Updates the world state in response to the undo operation
     * @returns The previous state or undefined if no previous state
     */
    public undo(): WorldState | undefined {
        if (!this.config.enableUndo || this.undoStack.length <= 1) {
        return undefined;
        }
    
        // Store current state for event emission
        const previousState = this.currentState;
    
        // Pop the current state off the undo stack
        const current = this.undoStack.pop()!;
        
        // Add to redo stack
        this.redoStack.push(current);
        
        // Get the previous state
        const previous = this.undoStack[this.undoStack.length - 1];
        
        // Set as current state
        this.currentState = previous.state;
        
        // Emit state updated event for undo
        this.eventEmitter.emitTyped(StandardEvents.STATE_UPDATED, {
        previousState,
        currentState: this.currentState,
        description: 'Undo operation'
        });
        
        return this.currentState;
    }
    
    /**
     * Updates the world state in response to the redo operation
     * @returns The redone state or undefined if no state to redo
     */
    public redo(): WorldState | undefined {
        if (!this.config.enableUndo || this.redoStack.length === 0) {
        return undefined;
        }
    
        // Store current state for event emission
        const previousState = this.currentState;
    
        // Pop the most recent state off the redo stack
        const next = this.redoStack.pop()!;
        
        // Add to undo stack
        this.undoStack.push(next);
        
        // Set as current state
        this.currentState = next.state;
        
        // Emit state updated event for redo
        this.eventEmitter.emitTyped(StandardEvents.STATE_UPDATED, {
        previousState,
        currentState: this.currentState,
        description: 'Redo operation'
        });
        
        return this.currentState;
    }
  
    /**
     * Creates and adds a new entity to the world state
     * @param params Entity creation parameters
     * @param description Description for history
     */
    public createEntity(params: EntityCreationParams, description?: string): Entity {
        const id = this.generateId();
        
        const entity: Entity = {
          id,
          type: params.type,
          attributes: params.attributes || {},
          relationships: params.relationships || {}
        };
    
        this.updateState(state => ({
          ...state,
          entities: {
            ...state.entities,
            [id]: entity
          }
        }), description || `Created entity: ${entity.type} (${id})`);
        
        // Emit entity created event
        this.eventEmitter.emitTyped(StandardEvents.ENTITY_CREATED, {
          entityId: id,
          entityType: entity.type
        });
    
        return entity;
      }
  
    /**
     * Updates an existing entity
     * @param id Entity ID to update
     * @param updates Partial entity updates
     * @param options Update options
     * @param description Description for history
     */
    public updateEntity(
        id: EntityId, 
        updates: Partial<Entity>, 
        options: EntityOperationOptions = {},
        description?: string
    ): Entity | undefined {
        const existingEntity = this.getEntity(id);
        if (!existingEntity) return undefined;
    
        this.updateState(state => {
        const updatedEntity = this.mergeEntity(existingEntity, updates, options);
        
        return {
            ...state,
            entities: {
            ...state.entities,
            [id]: updatedEntity
            }
        };
        }, description || `Updated entity: ${existingEntity.type} (${id})`);
    
        // Emit entity updated event
        this.eventEmitter.emitTyped(StandardEvents.ENTITY_UPDATED, {
        entityId: id,
        entityType: existingEntity.type,
        changes: updates
        });
    
        return this.getEntity(id);
    }
  
    /**
     * Removes an entity from the world state
     * @param id Entity ID to remove
     * @param description Description for history
     */
    public removeEntity(id: EntityId, description?: string): boolean {
        const existingEntity = this.getEntity(id);
        if (!existingEntity) return false;
    
        // Store entity type for event emission
        const entityType = existingEntity.type;
    
        this.updateState(state => {
        const { [id]: _, ...remainingEntities } = state.entities;
        
        return {
            ...state,
            entities: remainingEntities
        };
        }, description || `Removed entity: ${existingEntity.type} (${id})`);
    
        // Emit entity removed event
        this.eventEmitter.emitTyped(StandardEvents.ENTITY_REMOVED, {
        entityId: id,
        entityType: entityType
        });
    
        return true;
    }
  
    /**
     * Creates a relationship between two entities
     * @param sourceId Source entity ID
     * @param type Relationship type
     * @param targetId Target entity ID
     * @param description Description for history
     */
    public createRelationship(
        sourceId: EntityId,
        type: string,
        targetId: EntityId,
        description?: string
    ): boolean {
        const source = this.getEntity(sourceId);
        const target = this.getEntity(targetId);
        
        if (!source || !target) return false;
    
        const existingRelationships = source.relationships[type] || [];
        
        // Skip if relationship already exists
        if (existingRelationships.includes(targetId)) {
        return true; // Already exists, so technically "successful"
        }
    
        this.updateState(state => {
        return {
            ...state,
            entities: {
            ...state.entities,
            [sourceId]: {
                ...source,
                relationships: {
                ...source.relationships,
                [type]: [...existingRelationships, targetId]
                }
            }
            }
        };
        }, description || `Created relationship: ${sourceId} -[${type}]-> ${targetId}`);
    
        // Emit relationship created event
        this.eventEmitter.emitTyped(StandardEvents.RELATIONSHIP_CREATED, {
        sourceId,
        type,
        targetId
        });
    
        return true;
    }
  
    /**
     * Removes a relationship between two entities
     * @param sourceId Source entity ID
     * @param type Relationship type
     * @param targetId Target entity ID
     * @param description Description for history
     */
    public removeRelationship(
        sourceId: EntityId,
        type: string,
        targetId: EntityId,
        description?: string
    ): boolean {
        const source = this.getEntity(sourceId);
        
        if (!source) return false;
        
        const existingRelationships = source.relationships[type] || [];
        
        // Skip if relationship doesn't exist
        if (!existingRelationships.includes(targetId)) {
        return false;
        }
    
        this.updateState(state => {
        return {
            ...state,
            entities: {
            ...state.entities,
            [sourceId]: {
                ...source,
                relationships: {
                ...source.relationships,
                [type]: existingRelationships.filter(id => id !== targetId)
                }
            }
            }
        };
        }, description || `Removed relationship: ${sourceId} -[${type}]-> ${targetId}`);
    
        // Emit relationship removed event
        this.eventEmitter.emitTyped(StandardEvents.RELATIONSHIP_REMOVED, {
        sourceId,
        type,
        targetId
        });
    
        return true;
    }
  
    /**
     * Helper method to merge entity updates
     */
    private mergeEntity(
      entity: Entity, 
      updates: Partial<Entity>,
      options: EntityOperationOptions
    ): Entity {
      // Handle basic properties
      const result: Entity = {
        ...entity,
        ...updates,
        // Always preserve ID
        id: entity.id,
        // Always preserve type if not explicitly changed
        type: updates.type || entity.type,
      };
      
      // Handle attributes merge
      if (updates.attributes) {
        result.attributes = {
          ...entity.attributes,
          ...updates.attributes
        };
      }
      
      // Handle relationships merge
      if (updates.relationships) {
        if (options.mergeRelationships) {
          // Merge relationship arrays instead of replacing
          result.relationships = { ...entity.relationships };
          
          for (const [type, targets] of Object.entries(updates.relationships)) {
            const existing = entity.relationships[type] || [];
            // Deduplicate targets
            const uniqueTargets = [...new Set([...existing, ...targets])];
            result.relationships[type] = uniqueTargets;
          }
        } else {
          // Replace relationships
          result.relationships = {
            ...entity.relationships,
            ...updates.relationships
          };
        }
      }
      
      return result;
    }
  
    /**
     * Generate a unique entity ID
     */
    private generateId(): string {
      return `entity_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    
  }
  
  /**
   * Creates a new state manager with default initial state
   * @param config Configuration options
   */
  export function createStateManager(config?: Partial<StateManagerConfig>): StateManager {
    return new StateManager(undefined, config);
  }

  