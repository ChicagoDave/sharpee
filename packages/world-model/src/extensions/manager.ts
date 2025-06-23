/**
 * Extension manager implementation
 * 
 * Manages loading, unloading, and lifecycle of extensions
 */

import { 
  IExtension, 
  IExtensionManager, 
  ExtensionDependency,
  VersionString 
} from './types';
import { ExtensionRegistry, getExtensionRegistry } from './registry';

/**
 * Manages extension lifecycle
 */
export class ExtensionManager implements IExtensionManager {
  private extensions = new Map<string, IExtension>();
  private extensionAPIs = new Map<string, Record<string, unknown>>();
  private loadOrder: string[] = [];
  
  /**
   * Load an extension
   */
  async loadExtension(extension: IExtension): Promise<void> {
    const { id, dependencies = [] } = extension.metadata;
    
    // Check if already loaded
    if (this.extensions.has(id)) {
      throw new Error(`Extension '${id}' is already loaded`);
    }
    
    // Validate dependencies
    await this.validateDependencies(dependencies);
    
    // Get the global extension registry
    const registry = getExtensionRegistry();
    
    try {
      // Initialize the extension if method is provided
      if (extension.initialize) {
        await extension.initialize(registry);
      }
      
      // Store the extension
      this.extensions.set(id, extension);
      this.loadOrder.push(id);
      
      // Get and store API if provided
      const getAPI = extension.getAPI;
      if (getAPI) {
        const api = getAPI.call(extension);
        if (api) {
          this.extensionAPIs.set(id, api);
        }
      }
      
      console.log(`Extension '${id}' loaded successfully`);
    } catch (error) {
      // Clean up on failure
      registry.clearNamespace(extension.metadata.namespace);
      
      throw new Error(`Failed to load extension '${id}': ${error}`);
    }
  }
  
  /**
   * Unload an extension
   */
  async unloadExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension '${extensionId}' is not loaded`);
    }
    
    // Check if other extensions depend on this one
    const dependents = this.findDependents(extensionId);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot unload '${extensionId}': required by ${dependents.join(', ')}`
      );
    }
    
    try {
      // Call shutdown if provided
      if (extension.shutdown) {
        await extension.shutdown();
      }
      
      // Remove from collections
      this.extensions.delete(extensionId);
      this.extensionAPIs.delete(extensionId);
      this.loadOrder = this.loadOrder.filter(id => id !== extensionId);
      
      // Note: In a real implementation, we'd also clean up registered traits,
      // events, actions, and services from the global registries
      
      console.log(`Extension '${extensionId}' unloaded successfully`);
    } catch (error) {
      throw new Error(`Failed to unload extension '${extensionId}': ${error}`);
    }
  }
  
  /**
   * Get loaded extension by ID
   */
  getExtension(extensionId: string): IExtension | undefined {
    return this.extensions.get(extensionId);
  }
  
  /**
   * Get all loaded extensions
   */
  getLoadedExtensions(): IExtension[] {
    return this.loadOrder.map(id => this.extensions.get(id)!);
  }
  
  /**
   * Check if an extension is loaded
   */
  isLoaded(extensionId: string): boolean {
    return this.extensions.has(extensionId);
  }
  
  /**
   * Get extension API
   */
  getExtensionAPI(extensionId: string): Record<string, unknown> | undefined {
    return this.extensionAPIs.get(extensionId);
  }
  
  /**
   * Validate extension dependencies
   */
  private async validateDependencies(dependencies: ExtensionDependency[]): Promise<void> {
    for (const dep of dependencies) {
      if (!dep.optional && !this.isLoaded(dep.id)) {
        throw new Error(`Required dependency '${dep.id}' is not loaded`);
      }
      
      // In a real implementation, we'd also check version compatibility
      if (this.isLoaded(dep.id)) {
        const loadedExt = this.getExtension(dep.id)!;
        if (!this.isVersionCompatible(loadedExt.metadata.version, dep.version)) {
          throw new Error(
            `Dependency '${dep.id}' version ${loadedExt.metadata.version} ` +
            `does not satisfy requirement ${dep.version}`
          );
        }
      }
    }
  }
  
  /**
   * Find extensions that depend on a given extension
   */
  private findDependents(extensionId: string): string[] {
    const dependents: string[] = [];
    
    for (const [id, ext] of this.extensions) {
      const deps = ext.metadata.dependencies || [];
      if (deps.some(dep => dep.id === extensionId && !dep.optional)) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }
  
  /**
   * Check version compatibility (simplified)
   */
  private isVersionCompatible(version: VersionString, requirement: string): boolean {
    // This is a simplified version check
    // In a real implementation, use a proper semver library
    
    if (requirement.startsWith('^')) {
      // Compatible with same major version
      const reqVersion = requirement.slice(1);
      return version.split('.')[0] === reqVersion.split('.')[0];
    }
    
    if (requirement.startsWith('>=')) {
      // Greater than or equal
      const reqVersion = requirement.slice(2);
      return version >= reqVersion;
    }
    
    // Exact match
    return version === requirement;
  }
}

/**
 * Global extension manager singleton
 */
export const extensionManager = new ExtensionManager();
