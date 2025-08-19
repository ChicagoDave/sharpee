/**
 * Extension registry implementation
 * 
 * Manages registration and lookup of extension-provided traits,
 * events, actions, and other components.
 */

import { ITraitConstructor } from '../traits/trait';
import { 
  IExtensionRegistry, 
  IExtensionTraitDefinition,
  IExtensionEventDefinition,
  IExtensionActionDefinition,
  createNamespacedId
} from './types';

/**
 * Default implementation of the extension registry
 */
export class ExtensionRegistry implements IExtensionRegistry {
  private traits = new Map<string, ITraitConstructor>();
  private events = new Map<string, IExtensionEventDefinition>();
  private actions = new Map<string, IExtensionActionDefinition>();
  private namespaces = new Set<string>();
  
  /**
   * Register a trait from an extension
   */
  registerTrait(namespace: string, definition: IExtensionTraitDefinition): void {
    const fullType = this.getTraitType(namespace, definition.type);
    
    if (this.traits.has(fullType)) {
      throw new Error(`Trait type '${fullType}' is already registered`);
    }
    
    this.traits.set(fullType, definition.implementation);
    this.namespaces.add(namespace);
    
    // TODO: Register behavior if provided
    // This would integrate with a behavior registry
  }
  
  /**
   * Register an event type from an extension
   */
  registerEvent(namespace: string, definition: IExtensionEventDefinition): void {
    const fullType = this.getEventType(namespace, definition.type);
    
    if (this.events.has(fullType)) {
      throw new Error(`Event type '${fullType}' is already registered`);
    }
    
    this.events.set(fullType, definition);
    this.namespaces.add(namespace);
  }
  
  /**
   * Register an action from an extension
   */
  registerAction(namespace: string, definition: IExtensionActionDefinition): void {
    const fullId = this.getActionId(namespace, definition.id);
    
    if (this.actions.has(fullId)) {
      throw new Error(`Action '${fullId}' is already registered`);
    }
    
    this.actions.set(fullId, definition);
    this.namespaces.add(namespace);
  }
  
  /**
   * Get a namespaced trait type
   */
  getTraitType(namespace: string, type: string): string {
    return createNamespacedId(namespace, type);
  }
  
  /**
   * Get a namespaced event type
   */
  getEventType(namespace: string, type: string): string {
    return createNamespacedId(namespace, type);
  }
  
  /**
   * Get a namespaced action ID
   */
  getActionId(namespace: string, id: string): string {
    return createNamespacedId(namespace, id);
  }
  
  /**
   * Get a trait constructor by its full type
   */
  getTrait(fullType: string): ITraitConstructor | undefined {
    return this.traits.get(fullType);
  }
  
  /**
   * Get an event definition by its full type
   */
  getEvent(fullType: string): IExtensionEventDefinition | undefined {
    return this.events.get(fullType);
  }
  
  /**
   * Get an action definition by its full ID
   */
  getAction(fullId: string): IExtensionActionDefinition | undefined {
    return this.actions.get(fullId);
  }
  
  /**
   * Check if a namespace is registered
   */
  hasNamespace(namespace: string): boolean {
    return this.namespaces.has(namespace);
  }
  
  /**
   * Get all registered namespaces
   */
  getNamespaces(): string[] {
    return Array.from(this.namespaces);
  }
  
  /**
   * Get all traits in a namespace
   */
  getTraitsByNamespace(namespace: string): string[] {
    const prefix = namespace + '.';
    return Array.from(this.traits.keys())
      .filter(type => type.startsWith(prefix));
  }
  
  /**
   * Get all events in a namespace
   */
  getEventsByNamespace(namespace: string): string[] {
    const prefix = namespace + '.';
    return Array.from(this.events.keys())
      .filter(type => type.startsWith(prefix));
  }
  
  /**
   * Get all actions in a namespace
   */
  getActionsByNamespace(namespace: string): string[] {
    const prefix = namespace + '.';
    return Array.from(this.actions.keys())
      .filter(id => id.startsWith(prefix));
  }
  
  /**
   * Clear all registrations for a namespace
   */
  clearNamespace(namespace: string): void {
    const prefix = namespace + '.';
    
    // Remove traits
    for (const type of this.traits.keys()) {
      if (type.startsWith(prefix)) {
        this.traits.delete(type);
      }
    }
    
    // Remove events
    for (const type of this.events.keys()) {
      if (type.startsWith(prefix)) {
        this.events.delete(type);
      }
    }
    
    // Remove actions
    for (const id of this.actions.keys()) {
      if (id.startsWith(prefix)) {
        this.actions.delete(id);
      }
    }
    
    this.namespaces.delete(namespace);
  }
  
  /**
   * Clear all registrations
   */
  clear(): void {
    this.traits.clear();
    this.events.clear();
    this.actions.clear();
    this.namespaces.clear();
  }
  
  /**
   * Get all traits (for compatibility)
   */
  getTraits(): Map<string, ITraitConstructor> {
    return new Map(this.traits);
  }
  
  /**
   * Get all events (for compatibility)
   */
  getEvents(): Map<string, IExtensionEventDefinition> {
    return new Map(this.events);
  }
  
  /**
   * Get all actions (for compatibility)
   */
  getActions(): Map<string, IExtensionActionDefinition> {
    return new Map(this.actions);
  }
  
  /**
   * Get services (placeholder for future implementation)
   */
  getServices(): Map<string, unknown> {
    return new Map();
  }
}

// Global registry instance
export const extensionRegistry = new ExtensionRegistry();

// Function to get the extension registry (for backwards compatibility)
export function getExtensionRegistry(): ExtensionRegistry {
  return extensionRegistry;
}
