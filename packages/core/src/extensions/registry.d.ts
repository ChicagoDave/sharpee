import { AnyExtension, ExtensionType } from './types';
/**
 * Registry for extensions
 */
export declare class ExtensionRegistry {
    private extensions;
    private processingOrder;
    /**
     * Register an extension
     * @param type Type of extension
     * @param extension The extension to register
     */
    register<T extends AnyExtension>(type: ExtensionType, extension: T): void;
    /**
     * Get an extension by type and id
     * @param type Type of extension
     * @param id Extension ID
     */
    get<T extends AnyExtension>(type: ExtensionType, id: string): T | undefined;
    /**
     * Get all extensions of a specific type
     * @param type Type of extension
     */
    getAll<T extends AnyExtension>(type: ExtensionType): T[];
    /**
     * Set the processing order for a specific extension type
     * @param type Type of extension
     * @param orderedIds Ordered list of extension IDs
     */
    setProcessingOrder(type: ExtensionType, orderedIds: string[]): void;
    /**
     * Check if an extension is registered
     * @param type Type of extension
     * @param id Extension ID
     */
    has(type: ExtensionType, id: string): boolean;
    /**
     * Remove an extension
     * @param type Type of extension
     * @param id Extension ID
     */
    remove(type: ExtensionType, id: string): boolean;
    /**
     * Get the number of registered extensions of a specific type
     * @param type Type of extension
     */
    count(type: ExtensionType): number;
    /**
     * Initialize an extension if needed
     */
    private initializeExtension;
    /**
     * Clean up an extension if needed
     */
    private cleanupExtension;
}
/**
 * Create a new extension registry
 */
export declare function createExtensionRegistry(): ExtensionRegistry;
