// packages/core/src/extensions/registry.ts
/**
 * Registry for extensions
 */
export class ExtensionRegistry {
    constructor() {
        this.extensions = new Map();
        this.processingOrder = new Map();
    }
    /**
     * Register an extension
     * @param type Type of extension
     * @param extension The extension to register
     */
    register(type, extension) {
        // Initialize maps if they don't exist
        if (!this.extensions.has(type)) {
            this.extensions.set(type, new Map());
            this.processingOrder.set(type, []);
        }
        const typeRegistry = this.extensions.get(type);
        const orderList = this.processingOrder.get(type);
        // Check for duplicate extensions
        if (typeRegistry.has(extension.id)) {
            throw new Error(`Extension with ID "${extension.id}" already registered for type "${type}"`);
        }
        // Register the extension
        typeRegistry.set(extension.id, extension);
        orderList.push(extension.id);
        // Handle initialization for certain extension types
        this.initializeExtension(type, extension);
    }
    /**
     * Get an extension by type and id
     * @param type Type of extension
     * @param id Extension ID
     */
    get(type, id) {
        const typeRegistry = this.extensions.get(type);
        if (!typeRegistry)
            return undefined;
        return typeRegistry.get(id);
    }
    /**
     * Get all extensions of a specific type
     * @param type Type of extension
     */
    getAll(type) {
        const typeRegistry = this.extensions.get(type);
        if (!typeRegistry)
            return [];
        const orderList = this.processingOrder.get(type) || [];
        // Return extensions in the order they were registered
        return orderList
            .map(id => typeRegistry.get(id))
            .filter((e) => e !== undefined);
    }
    /**
     * Set the processing order for a specific extension type
     * @param type Type of extension
     * @param orderedIds Ordered list of extension IDs
     */
    setProcessingOrder(type, orderedIds) {
        const typeRegistry = this.extensions.get(type);
        if (!typeRegistry) {
            throw new Error(`No extensions registered for type "${type}"`);
        }
        // Validate that all IDs exist
        for (const id of orderedIds) {
            if (!typeRegistry.has(id)) {
                throw new Error(`Extension with ID "${id}" not found for type "${type}"`);
            }
        }
        // Validate that all extensions are included
        const registeredIds = Array.from(typeRegistry.keys());
        if (registeredIds.length !== orderedIds.length) {
            throw new Error(`Processing order must include all registered extensions. ` +
                `Missing: ${registeredIds.filter(id => !orderedIds.includes(id)).join(', ')}`);
        }
        // Set the processing order
        this.processingOrder.set(type, [...orderedIds]);
    }
    /**
     * Check if an extension is registered
     * @param type Type of extension
     * @param id Extension ID
     */
    has(type, id) {
        const typeRegistry = this.extensions.get(type);
        if (!typeRegistry)
            return false;
        return typeRegistry.has(id);
    }
    /**
     * Remove an extension
     * @param type Type of extension
     * @param id Extension ID
     */
    remove(type, id) {
        const typeRegistry = this.extensions.get(type);
        if (!typeRegistry)
            return false;
        // Check if extension exists
        if (!typeRegistry.has(id))
            return false;
        // Remove from processing order
        const orderList = this.processingOrder.get(type);
        if (orderList) {
            const index = orderList.indexOf(id);
            if (index !== -1) {
                orderList.splice(index, 1);
            }
        }
        // Clean up extension if needed
        this.cleanupExtension(type, typeRegistry.get(id));
        // Remove from registry
        return typeRegistry.delete(id);
    }
    /**
     * Get the number of registered extensions of a specific type
     * @param type Type of extension
     */
    count(type) {
        const typeRegistry = this.extensions.get(type);
        if (!typeRegistry)
            return 0;
        return typeRegistry.size;
    }
    /**
     * Initialize an extension if needed
     */
    initializeExtension(type, extension) {
        // Add any initialization logic here if needed
        // For example, calling initialize() on WorldModelExtensions
    }
    /**
     * Clean up an extension if needed
     */
    cleanupExtension(type, extension) {
        // Add any cleanup logic here if needed
        // For example, calling cleanup() on WorldModelExtensions
    }
}
/**
 * Create a new extension registry
 */
export function createExtensionRegistry() {
    return new ExtensionRegistry();
}
//# sourceMappingURL=registry.js.map