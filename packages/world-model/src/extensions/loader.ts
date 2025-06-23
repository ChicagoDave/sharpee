/**
 * Extension loader implementation
 * 
 * Manages loading, initialization, and lifecycle of trait extensions
 */

import { 
  IExtensionLoader, 
  ITraitExtension,
  IExtensionRegistry
} from './types';
import { extensionRegistry } from './registry';

/**
 * Extension loading error
 */
export class ExtensionLoadError extends Error {
  constructor(
    message: string,
    public extensionId: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ExtensionLoadError';
  }
}

/**
 * Default implementation of the extension loader
 */
export class ExtensionLoader implements IExtensionLoader {
  private extensions = new Map<string, ITraitExtension>();
  private registry: IExtensionRegistry;
  
  constructor(registry: IExtensionRegistry = extensionRegistry) {
    this.registry = registry;
  }
  
  /**
   * Load an extension
   */
  async loadExtension(extension: ITraitExtension): Promise<void> {
    const { id, namespace, dependencies } = extension.metadata;
    
    // Check if already loaded
    if (this.extensions.has(id)) {
      throw new ExtensionLoadError(
        `Extension '${id}' is already loaded`,
        id
      );
    }
    
    // Check dependencies
    if (dependencies) {
      for (const dep of dependencies) {
        if (!dep.optional && !this.extensions.has(dep.id)) {
          throw new ExtensionLoadError(
            `Required dependency '${dep.id}' is not loaded`,
            id
          );
        }
      }
    }
    
    try {
      // Initialize the extension
      if (extension.initialize) {
        await extension.initialize();
      }
      
      // Register traits
      if (extension.traits) {
        for (const trait of extension.traits) {
          this.registry.registerTrait(namespace, trait);
        }
      }
      
      // Register events
      if (extension.events) {
        for (const event of extension.events) {
          this.registry.registerEvent(namespace, event);
        }
      }
      
      // Register actions
      if (extension.actions) {
        for (const action of extension.actions) {
          this.registry.registerAction(namespace, action);
        }
      }
      
      // Store the extension
      this.extensions.set(id, extension);
      
    } catch (error) {
      // Cleanup on failure
      this.registry.clearNamespace(namespace);
      
      throw new ExtensionLoadError(
        `Failed to load extension '${id}': ${error}`,
        id,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Unload an extension
   */
  async unloadExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new ExtensionLoadError(
        `Extension '${extensionId}' is not loaded`,
        extensionId
      );
    }
    
    // Check if any loaded extensions depend on this one
    for (const [id, ext] of this.extensions) {
      if (id === extensionId) continue;
      
      const deps = ext.metadata.dependencies || [];
      const dependsOnThis = deps.some(d => d.id === extensionId && !d.optional);
      
      if (dependsOnThis) {
        throw new ExtensionLoadError(
          `Cannot unload '${extensionId}': extension '${id}' depends on it`,
          extensionId
        );
      }
    }
    
    try {
      // Cleanup the extension
      if (extension.cleanup) {
        await extension.cleanup();
      }
      
      // Clear registrations
      this.registry.clearNamespace(extension.metadata.namespace);
      
      // Remove from loaded extensions
      this.extensions.delete(extensionId);
      
    } catch (error) {
      throw new ExtensionLoadError(
        `Failed to unload extension '${extensionId}': ${error}`,
        extensionId,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Get loaded extension by ID
   */
  getExtension(extensionId: string): ITraitExtension | undefined {
    return this.extensions.get(extensionId);
  }
  
  /**
   * Get all loaded extensions
   */
  getLoadedExtensions(): ITraitExtension[] {
    return Array.from(this.extensions.values());
  }
  
  /**
   * Check if an extension is loaded
   */
  isLoaded(extensionId: string): boolean {
    return this.extensions.has(extensionId);
  }
  
  /**
   * Get extensions in load order (respecting dependencies)
   */
  getLoadOrder(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const ext = this.extensions.get(id);
      if (!ext) return;
      
      // Visit dependencies first
      const deps = ext.metadata.dependencies || [];
      for (const dep of deps) {
        if (this.extensions.has(dep.id)) {
          visit(dep.id);
        }
      }
      
      result.push(id);
    };
    
    // Visit all extensions
    for (const id of this.extensions.keys()) {
      visit(id);
    }
    
    return result;
  }
  
  /**
   * Validate extension dependencies are satisfied
   */
  validateDependencies(extension: ITraitExtension): string[] {
    const missing: string[] = [];
    const deps = extension.metadata.dependencies || [];
    
    for (const dep of deps) {
      if (!dep.optional && !this.extensions.has(dep.id)) {
        missing.push(dep.id);
      }
    }
    
    return missing;
  }
}

// Global loader instance
export const extensionLoader = new ExtensionLoader();
