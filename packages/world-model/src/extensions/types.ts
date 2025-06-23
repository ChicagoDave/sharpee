/**
 * Extension system interfaces and types
 * 
 * This module defines the contract for creating trait extensions
 * that can add new functionality to the world model.
 */

import { TraitConstructor } from '../traits/trait';
import { Behavior } from '../behaviors/behavior';
import { IFEntity } from '../entities/if-entity';

/**
 * Extension metadata
 */
export interface ExtensionMetadata {
  /** Unique identifier for the extension (e.g., 'com.example.dialogue') */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Extension version (semver format) */
  version: string;
  
  /** Brief description of what the extension provides */
  description?: string;
  
  /** Author information */
  author?: string | {
    name: string;
    email?: string;
    url?: string;
  };
  
  /** Dependencies on other extensions */
  dependencies?: ExtensionDependency[];
  
  /** Namespace for all traits/events/actions in this extension */
  namespace: string;
}

/**
 * Extension dependency specification
 */
export interface ExtensionDependency {
  /** Extension ID */
  id: string;
  
  /** Version requirement (e.g., '^1.0.0', '>=2.0.0') */
  version: string;
  
  /** Whether this dependency is optional */
  optional?: boolean;
}

/**
 * Trait definition for extensions
 */
export interface ExtensionTraitDefinition {
  /** Trait type (will be prefixed with namespace) */
  type: string;
  
  /** Trait constructor */
  implementation: TraitConstructor;
  
  /** Associated behavior (optional) */
  behavior?: typeof Behavior;
  
  /** Category for organization */
  category?: string;
}

/**
 * Event type definition for extensions
 */
export interface ExtensionEventDefinition {
  /** Event type (will be prefixed with namespace) */
  type: string;
  
  /** Description of when this event is emitted */
  description?: string;
  
  /** Expected payload structure */
  payloadSchema?: Record<string, unknown>;
}

/**
 * Action definition for extensions
 */
export interface ExtensionActionDefinition {
  /** Action ID (will be prefixed with namespace) */
  id: string;
  
  /** Action executor function */
  execute: (command: any, context: any) => any[];
  
  /** Associated command definitions */
  commands?: ExtensionCommandDefinition[];
}

/**
 * Command definition for extensions
 */
export interface ExtensionCommandDefinition {
  /** Verb that triggers this command */
  verb: string;
  
  /** Aliases for the verb */
  aliases?: string[];
  
  /** Maps to which action */
  action: string;
  
  /** Command parsing rules */
  rules?: {
    requiresNoun?: boolean;
    requiresSecondNoun?: boolean;
    prepositions?: string[];
  };
}

/**
 * Main extension interface
 * 
 * All trait extensions must implement this interface
 */
export interface ITraitExtension {
  /** Extension metadata */
  readonly metadata: ExtensionMetadata;
  
  /** Traits provided by this extension */
  readonly traits?: ExtensionTraitDefinition[];
  
  /** Event types defined by this extension */
  readonly events?: ExtensionEventDefinition[];
  
  /** Actions provided by this extension */
  readonly actions?: ExtensionActionDefinition[];
  
  /** Commands that map to actions */
  readonly commands?: ExtensionCommandDefinition[];
  
  /**
   * Initialize the extension
   * Called when the extension is loaded
   * @param registry - The extension registry for registering components
   */
  initialize?(registry?: IExtensionRegistry): Promise<void> | void;
  
  /**
   * Cleanup when extension is unloaded
   */
  cleanup?(): Promise<void> | void;
  
  /**
   * Shutdown the extension (alias for cleanup)
   */
  shutdown?(): Promise<void> | void;
  
  /**
   * Get extension API for other extensions to use
   */
  getAPI?(): Record<string, unknown>;
  
  /**
   * Get language data for a specific locale
   */
  getLanguageData?(locale: string): ExtensionLanguageData | undefined;
}

/**
 * Language data provided by extensions
 */
export interface ExtensionLanguageData {
  /** Locale identifier (e.g., 'en-US') */
  locale: string;
  
  /** Verb definitions */
  verbs?: Record<string, string[]>;
  
  /** Message templates */
  messages?: Record<string, string>;
  
  /** Event descriptions */
  events?: Record<string, string>;
  
  /** Action failure messages */
  failures?: Record<string, string>;
}

/**
 * Extension loader interface
 */
export interface IExtensionLoader {
  /**
   * Load an extension
   */
  loadExtension(extension: ITraitExtension): Promise<void>;
  
  /**
   * Unload an extension
   */
  unloadExtension(extensionId: string): Promise<void>;
  
  /**
   * Get loaded extension by ID
   */
  getExtension(extensionId: string): ITraitExtension | undefined;
  
  /**
   * Get all loaded extensions
   */
  getLoadedExtensions(): ITraitExtension[];
  
  /**
   * Check if an extension is loaded
   */
  isLoaded(extensionId: string): boolean;
}

/**
 * Extension registry interface
 * 
 * Manages registration of traits, behaviors, and other extension components
 */
export interface IExtensionRegistry {
  /**
   * Register a trait from an extension
   */
  registerTrait(namespace: string, definition: ExtensionTraitDefinition): void;
  
  /**
   * Register an event type from an extension
   */
  registerEvent(namespace: string, definition: ExtensionEventDefinition): void;
  
  /**
   * Register an action from an extension
   */
  registerAction(namespace: string, definition: ExtensionActionDefinition): void;
  
  /**
   * Get a namespaced trait type
   */
  getTraitType(namespace: string, type: string): string;
  
  /**
   * Get a namespaced event type
   */
  getEventType(namespace: string, type: string): string;
  
  /**
   * Get a namespaced action ID
   */
  getActionId(namespace: string, id: string): string;
  
  /**
   * Clear all registrations for a namespace
   */
  clearNamespace(namespace: string): void;
}

/**
 * Utility to create namespaced identifiers
 */
export function createNamespacedId(namespace: string, id: string): string {
  return `${namespace}.${id}`;
}

/**
 * Utility to parse namespaced identifiers
 */
export function parseNamespacedId(namespacedId: string): { namespace: string; id: string } | null {
  const parts = namespacedId.split('.');
  if (parts.length < 2) return null;
  
  const namespace = parts.slice(0, -1).join('.');
  const id = parts[parts.length - 1];
  
  return { namespace, id };
}

/**
 * Type aliases for backwards compatibility
 */
export type IExtension = ITraitExtension;
export type IExtensionManager = IExtensionLoader;
export type VersionString = string;
