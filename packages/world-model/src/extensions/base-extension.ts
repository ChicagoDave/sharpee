/**
 * Base extension class
 * 
 * Provides a convenient base class for creating extensions
 */

import { ITraitExtension, IExtensionRegistry, IExtensionMetadata } from './types';
import { Behavior } from '../behaviors/behavior';
import { ITraitConstructor } from '../traits/trait';

/**
 * Options for defining a trait in an extension
 */
export interface IExtensionTraitDefinition {
  /** Local trait name (will be namespaced) */
  name: string;
  
  /** Trait constructor */
  trait: ITraitConstructor;
  
  /** Associated behavior class */
  behavior?: typeof Behavior;
  
  /** Category for organization */
  category?: string;
}

/**
 * Options for defining an event in an extension
 */
export interface IExtensionEventDefinition {
  /** Local event name (will be namespaced) */
  name: string;
  
  /** Description of when this event is fired */
  description?: string;
  
  /** Example payload structure */
  examplePayload?: Record<string, unknown>;
}

/**
 * Base class for extensions
 * 
 * Provides helper methods for common extension tasks
 */
export abstract class BaseExtension implements ITraitExtension {
  abstract readonly metadata: IExtensionMetadata;
  
  protected registry!: IExtensionRegistry;
  
  /**
   * Initialize the extension
   */
  async initialize(registry: IExtensionRegistry): Promise<void> {
    this.registry = registry;
    
    // Register traits
    const traits = this.defineTraits();
    for (const traitDef of traits) {
      registry.registerTrait(this.metadata.namespace, {
        type: traitDef.name,
        implementation: traitDef.trait,
        behavior: traitDef.behavior,
        category: traitDef.category
      });
    }
    
    // Register events
    const events = this.defineEvents();
    for (const eventDef of events) {
      registry.registerEvent(this.metadata.namespace, {
        type: eventDef.name,
        description: eventDef.description,
        payloadSchema: eventDef.examplePayload
      });
    }
    
    // Custom initialization
    await this.onInitialize();
  }
  
  /**
   * Define traits provided by this extension
   * Override in subclasses
   */
  protected defineTraits(): IExtensionTraitDefinition[] {
    return [];
  }
  
  /**
   * Define events provided by this extension
   * Override in subclasses
   */
  protected defineEvents(): IExtensionEventDefinition[] {
    return [];
  }
  
  /**
   * Custom initialization logic
   * Override in subclasses
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclasses
  }
  
  /**
   * Helper to create namespaced type names
   */
  protected namespaced(name: string): string {
    return `${this.metadata.id}.${name}`;
  }
  
  /**
   * Helper to create a namespaced event
   */
  protected createEvent(type: string, payload?: Record<string, unknown>): any {
    // This would use the actual event creation from core
    return {
      type: this.namespaced(type),
      payload,
      timestamp: Date.now()
    };
  }
}
