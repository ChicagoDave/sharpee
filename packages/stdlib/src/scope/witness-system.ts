/**
 * Witness system implementation
 * 
 * Tracks what actors know about based on what they've witnessed.
 * Works with the scope system to determine who can perceive changes
 * and updates their knowledge accordingly.
 */

import { IFEntity, WorldModel, TraitType } from '@sharpee/world-model';
import { createEvent } from '@sharpee/core';
import {
  WitnessSystem,
  StateChange,
  WitnessRecord,
  WitnessDetail,
  WitnessLevel,
  EntityKnowledge,
  SenseType,
  MovementRecord,
  WitnessEvent,
  ScopeResolver
} from './types';

/**
 * Standard implementation of the witness system
 */
export class StandardWitnessSystem implements WitnessSystem {
  private knowledge: Map<string, Map<string, EntityKnowledge>> = new Map();
  
  constructor(
    private world: WorldModel,
    private scopeResolver: ScopeResolver
  ) {}

  /**
   * Record who can witness a state change
   */
  recordWitnesses(change: StateChange): WitnessRecord {
    const witnesses = new Map<string, WitnessDetail>();
    
    // Get all potential witnesses (actors)
    const actors = this.world.getAllEntities().filter(e => 
      e.has(TraitType.ACTOR) && e.id !== change.actorId
    );

    // Determine who can perceive this change
    for (const actor of actors) {
      const detail = this.canWitnessChange(actor, change);
      if (detail) {
        witnesses.set(actor.id, detail);
      }
    }

    const record: WitnessRecord = { change, witnesses };
    
    // Update knowledge based on what was witnessed
    this.updateKnowledge(record);
    
    return record;
  }

  /**
   * Update actor knowledge based on what was witnessed
   */
  updateKnowledge(record: WitnessRecord): void {
    for (const [actorId, detail] of record.witnesses) {
      // Get or create actor's knowledge map
      if (!this.knowledge.has(actorId)) {
        this.knowledge.set(actorId, new Map());
      }
      const actorKnowledge = this.knowledge.get(actorId)!;

      // Update knowledge based on change type
      switch (record.change.type) {
        case 'move':
          this.updateMovementKnowledge(actorId, record.change, detail);
          break;
        case 'create':
          this.updateDiscoveryKnowledge(actorId, record.change, detail);
          break;
        case 'destroy':
          this.updateDestructionKnowledge(actorId, record.change, detail);
          break;
        case 'modify':
          this.updateModificationKnowledge(actorId, record.change, detail);
          break;
        case 'action':
          this.updateActionKnowledge(actorId, record.change, detail);
          break;
      }

      // Emit witness events
      this.emitWitnessEvent(actorId, record.change, detail);
    }
  }

  /**
   * Get what an actor knows about
   */
  getKnownEntities(actorId: string): EntityKnowledge[] {
    const actorKnowledge = this.knowledge.get(actorId);
    if (!actorKnowledge) return [];
    
    return Array.from(actorKnowledge.values());
  }

  /**
   * Check if an actor has discovered an entity
   */
  hasDiscovered(actorId: string, entityId: string): boolean {
    const actorKnowledge = this.knowledge.get(actorId);
    if (!actorKnowledge) return false;
    
    const knowledge = actorKnowledge.get(entityId);
    return knowledge?.exists === true;
  }

  /**
   * Get what an actor knows about a specific entity
   */
  getKnowledge(actorId: string, entityId: string): EntityKnowledge | undefined {
    const actorKnowledge = this.knowledge.get(actorId);
    if (!actorKnowledge) return undefined;
    
    return actorKnowledge.get(entityId);
  }

  /**
   * Determine if and how an actor can witness a change
   */
  private canWitnessChange(actor: IFEntity, change: StateChange): WitnessDetail | null {
    const entity = this.world.getEntity(change.entityId);
    if (!entity) return null;

    // Check each sense type
    if (this.scopeResolver.canSee(actor, entity)) {
      return {
        actorId: actor.id,
        sense: SenseType.SIGHT,
        level: this.determineWitnessLevel(actor, entity, SenseType.SIGHT),
        confidence: 'certain'
      };
    }

    if (this.scopeResolver.canHear(actor, entity)) {
      return {
        actorId: actor.id,
        sense: SenseType.HEARING,
        level: this.determineWitnessLevel(actor, entity, SenseType.HEARING),
        confidence: 'likely'
      };
    }

    if (this.scopeResolver.canSmell(actor, entity)) {
      return {
        actorId: actor.id,
        sense: SenseType.SMELL,
        level: this.determineWitnessLevel(actor, entity, SenseType.SMELL),
        confidence: 'unsure'
      };
    }

    return null;
  }

  /**
   * Determine the level of detail in witnessing
   */
  private determineWitnessLevel(actor: IFEntity, target: IFEntity, sense: SenseType): WitnessLevel {
    // For sight, check if we can reach (close) or just see (far)
    if (sense === SenseType.SIGHT) {
      if (this.scopeResolver.canReach(actor, target)) {
        return WitnessLevel.FULL;
      }
      return WitnessLevel.PARTIAL;
    }

    // For other senses, default to partial
    // TODO: Implement distance-based witness levels
    return WitnessLevel.PARTIAL;
  }

  /**
   * Update knowledge from witnessed movement
   */
  private updateMovementKnowledge(actorId: string, change: StateChange, detail: WitnessDetail): void {
    const actorKnowledge = this.knowledge.get(actorId)!;
    
    // Get or create entity knowledge
    let knowledge = actorKnowledge.get(change.entityId);
    if (!knowledge) {
      knowledge = this.createInitialKnowledge(change.entityId, detail);
      actorKnowledge.set(change.entityId, knowledge);
    }

    // Update location and movement history
    if (change.to) {
      knowledge.lastKnownLocation = change.to;
    }

    // Add to movement history
    if (change.from && change.to) {
      if (!knowledge.movementHistory) {
        knowledge.movementHistory = [];
      }
      
      knowledge.movementHistory.push({
        from: change.from,
        to: change.to,
        witnessedAt: change.timestamp,
        witnessedBy: detail.sense,
        confidence: detail.confidence
      });

      // Limit history size
      if (knowledge.movementHistory.length > 10) {
        knowledge.movementHistory.shift();
      }
    }

    // Update sense-specific timestamps
    this.updateSenseTimestamps(knowledge, detail, change.timestamp);
  }

  /**
   * Update knowledge from witnessed creation/discovery
   */
  private updateDiscoveryKnowledge(actorId: string, change: StateChange, detail: WitnessDetail): void {
    const actorKnowledge = this.knowledge.get(actorId)!;
    
    // Create new knowledge entry
    const knowledge = this.createInitialKnowledge(change.entityId, detail);
    knowledge.exists = true;
    knowledge.discoveredAt = change.timestamp;
    knowledge.discoveredBy = detail.sense;
    
    actorKnowledge.set(change.entityId, knowledge);
  }

  /**
   * Update knowledge from witnessed destruction
   */
  private updateDestructionKnowledge(actorId: string, change: StateChange, detail: WitnessDetail): void {
    const actorKnowledge = this.knowledge.get(actorId)!;
    const knowledge = actorKnowledge.get(change.entityId);
    
    if (knowledge) {
      knowledge.exists = false;
      this.updateSenseTimestamps(knowledge, detail, change.timestamp);
    }
  }

  /**
   * Update knowledge from witnessed modification
   */
  private updateModificationKnowledge(actorId: string, change: StateChange, detail: WitnessDetail): void {
    const actorKnowledge = this.knowledge.get(actorId)!;
    let knowledge = actorKnowledge.get(change.entityId);
    
    if (!knowledge) {
      knowledge = this.createInitialKnowledge(change.entityId, detail);
      actorKnowledge.set(change.entityId, knowledge);
    }

    // Update visual properties if witnessed by sight
    if (detail.sense === SenseType.SIGHT && change.property) {
      if (!knowledge.visualProperties) {
        knowledge.visualProperties = new Map();
      }
      knowledge.visualProperties.set(change.property, change.newValue);
    }

    this.updateSenseTimestamps(knowledge, detail, change.timestamp);
  }

  /**
   * Update knowledge from witnessed action
   */
  private updateActionKnowledge(actorId: string, change: StateChange, detail: WitnessDetail): void {
    // Actions mainly update knowledge about the entities involved
    // The actual action witnessing is handled by event emission
    const actorKnowledge = this.knowledge.get(actorId)!;
    
    // Ensure we know about the actor performing the action
    if (change.actorId && change.actorId !== actorId) {
      let actorEntityKnowledge = actorKnowledge.get(change.actorId);
      if (!actorEntityKnowledge) {
        actorEntityKnowledge = this.createInitialKnowledge(change.actorId, detail);
        actorKnowledge.set(change.actorId, actorEntityKnowledge);
      }
      this.updateSenseTimestamps(actorEntityKnowledge, detail, change.timestamp);
    }

    // Ensure we know about the target
    if (change.target) {
      let targetKnowledge = actorKnowledge.get(change.target);
      if (!targetKnowledge) {
        targetKnowledge = this.createInitialKnowledge(change.target, detail);
        actorKnowledge.set(change.target, targetKnowledge);
      }
      this.updateSenseTimestamps(targetKnowledge, detail, change.timestamp);
    }
  }

  /**
   * Create initial knowledge entry for an entity
   */
  private createInitialKnowledge(entityId: string, detail: WitnessDetail): EntityKnowledge {
    return {
      entityId,
      exists: true,
      discoveredAt: Date.now(),
      discoveredBy: detail.sense
    };
  }

  /**
   * Update sense-specific timestamps
   */
  private updateSenseTimestamps(knowledge: EntityKnowledge, detail: WitnessDetail, timestamp: number): void {
    switch (detail.sense) {
      case SenseType.SIGHT:
        knowledge.lastSeen = timestamp;
        break;
      case SenseType.HEARING:
        knowledge.lastHeard = timestamp;
        break;
      case SenseType.SMELL:
        knowledge.lastSmelled = timestamp;
        knowledge.scentStrength = 'moderate'; // TODO: Calculate based on distance
        break;
    }
  }

  /**
   * Emit appropriate witness event based on change type
   */
  private emitWitnessEvent(actorId: string, change: StateChange, detail: WitnessDetail): void {
    const actor = this.world.getEntity(actorId);
    if (!actor) return;

    let event: WitnessEvent | null = null;

    switch (change.type) {
      case 'action':
        event = {
          type: 'if.witness.action',
          payload: {
            witnessId: actorId,
            sense: detail.sense,
            level: detail.level,
            action: change.action || '',
            actorId: change.actorId || '',
            targetId: change.target,
            fromLocation: change.from,
            toLocation: change.to,
            timestamp: change.timestamp
          }
        };
        break;

      case 'move':
        event = {
          type: 'if.witness.movement',
          payload: {
            witnessId: actorId,
            sense: detail.sense,
            level: detail.level,
            entityId: detail.level === WitnessLevel.FULL ? change.entityId : 'unknown',
            fromLocation: change.from || '',
            toLocation: change.to || '',
            direction: this.getDirection(change.from, change.to),
            timestamp: change.timestamp
          }
        };
        break;

      // TODO: Add sound and scent events for appropriate changes
    }

    if (event) {
      // Get entities involved in the event
      const entityObj: any = { actor: actor.id };
      if (change.entityId) entityObj.target = change.entityId;
      if (change.target) entityObj.target = change.target;
      
      createEvent(event.type, event.payload, entityObj);
    }
  }

  /**
   * Calculate direction of movement
   */
  private getDirection(from?: string, to?: string): string | undefined {
    // TODO: Implement proper direction calculation based on room connections
    // For now, return undefined
    return undefined;
  }
}