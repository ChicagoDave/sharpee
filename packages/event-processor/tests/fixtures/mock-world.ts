/**
 * Mock WorldModel implementation for testing
 */

import { WorldModel, WorldChange, IFEntity } from '@sharpee/world-model';
import { SemanticEvent } from '@sharpee/core';

// Mock IFEvents constants
export const MockIFEvents = {
  TAKEN: 'taken',
  DROPPED: 'dropped',
  REMOVED: 'removed',
  ACTOR_MOVED: 'actor_moved',
  PUT_IN: 'put_in',
  PUT_ON: 'put_on',
  REMOVED_FROM: 'removed_from'
};

export class MockWorldModel implements Partial<WorldModel> {
  private eventHandlers: Map<string, any> = new Map();
  private appliedEvents: SemanticEvent[] = [];
  private canApplyResults: Map<string, boolean> = new Map();
  private previewResults: Map<string, WorldChange[]> = new Map();
  private entities: Map<string, any> = new Map();
  private entityLocations: Map<string, string> = new Map();
  
  // Track registered handlers for testing
  registeredHandlers: string[] = [];
  
  // Track method calls for testing
  moveEntityCalls: Array<{ entityId: string; targetId: string }> = [];
  updateEntityCalls: Array<{ entityId: string; updateFn: any }> = [];
  
  registerEventHandler(eventType: string, handler: any): void {
    this.eventHandlers.set(eventType, handler);
    this.registeredHandlers.push(eventType);
  }
  
  canApplyEvent(event: SemanticEvent): boolean {
    const key = `${event.type}-${event.id}`;
    // Check if we have a specific result set for this event
    if (this.canApplyResults.has(key)) {
      return this.canApplyResults.get(key)!;
    }
    // Default to true
    return true;
  }
  
  applyEvent(event: SemanticEvent): void {
    // Don't check validation here - that's the processor's job
    this.appliedEvents.push(event);
    
    // Call registered handler if exists
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      handler(event, this);
    }
  }
  
  previewEvent(event: SemanticEvent): WorldChange[] {
    const key = `${event.type}-${event.id}`;
    return this.previewResults.get(key) ?? [];
  }
  
  // Mock entity management
  getEntity(entityId: string): any {
    return this.entities.get(entityId);
  }
  
  updateEntity(entityId: string, updateFn: (entity: IFEntity) => void): void {
    this.updateEntityCalls.push({ entityId, updateFn });
    const entity = this.entities.get(entityId);
    if (entity) {
      updateFn(entity);
    }
  }
  
  moveEntity(entityId: string, targetId: string | null): boolean {
    this.moveEntityCalls.push({ entityId, targetId: targetId || '' });
    if (targetId) {
      this.entityLocations.set(entityId, targetId);
    } else {
      this.entityLocations.delete(entityId);
    }
    return true;
  }
  
  getLocation(entityId: string): string | undefined {
    return this.entityLocations.get(entityId);
  }
  
  // Test helpers
  setCanApplyResult(event: SemanticEvent, result: boolean): void {
    const key = `${event.type}-${event.id}`;
    this.canApplyResults.set(key, result);
  }
  
  setPreviewResult(event: SemanticEvent, changes: WorldChange[]): void {
    const key = `${event.type}-${event.id}`;
    this.previewResults.set(key, changes);
  }
  
  getAppliedEvents(): SemanticEvent[] {
    return [...this.appliedEvents];
  }
  
  clearAppliedEvents(): void {
    this.appliedEvents = [];
  }
  
  hasHandler(eventType: string): boolean {
    return this.eventHandlers.has(eventType);
  }
  
  // Test helper to add mock entities
  addMockEntity(entityId: string, entity: any): void {
    this.entities.set(entityId, entity);
  }
  
  setEntityLocation(entityId: string, locationId: string): void {
    this.entityLocations.set(entityId, locationId);
  }
  
  // Clear tracking arrays
  clearTracking(): void {
    this.moveEntityCalls = [];
    this.updateEntityCalls = [];
  }
  
  // Implement as needed for specific tests
  observeProperty(entityId: string, property: string, observer: any): void {}
  unobserveProperty(entityId: string, property: string, observer: any): void {}
  observeEntity(entityId: string, observer: any): void {}
  unobserveEntity(entityId: string, observer: any): void {}
  query(selector: any): any[] { return []; }
  registerCapability(name: string, capability: any): void {}
  emit(event: string, ...args: any[]): void {}
}

export function createMockWorld(): MockWorldModel {
  return new MockWorldModel();
}

// Mock entity factory
export function createMockEntity(traits: any = {}): any {
  return {
    has: (traitType: string) => traits.hasOwnProperty(traitType),
    get: (traitType: string) => traits[traitType]
  };
}
