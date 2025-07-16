/**
 * Action registry implementation
 * 
 * Manages registration and lookup of actions.
 * Actions are pure logic - patterns come from the language provider.
 */

import { Action, ActionRegistry as IActionRegistry } from './enhanced-types';
import { LanguageProvider } from '@sharpee/if-domain';

export { ActionRegistry } from './enhanced-types';

export class StandardActionRegistry implements IActionRegistry {
  private actions = new Map<string, Action>();
  private actionsByPattern = new Map<string, Action[]>(); // pattern -> actions
  private actionsByGroup = new Map<string, Action[]>(); // group -> actions
  private languageProvider: LanguageProvider | null = null;
  
  /**
   * Set the language provider for pattern resolution
   * @param provider Language provider instance (required for pattern resolution)
   */
  setLanguageProvider(provider: LanguageProvider): void {
    this.languageProvider = provider;
    // Rebuild pattern mappings when language provider changes
    this.rebuildPatternMappings();
  }

  /**
   * Register an action
   */
  register(action: Action): void {
    this.actions.set(action.id, action);
    
    // Add to group mapping if specified
    if (action.group) {
      const groupActions = this.actionsByGroup.get(action.group) || [];
      groupActions.push(action);
      this.actionsByGroup.set(action.group, groupActions);
    }
    
    // Handle direct aliases (backward compatibility)
    if ('aliases' in action && Array.isArray((action as any).aliases)) {
      const aliases = (action as any).aliases as string[];
      for (const alias of aliases) {
        const normalizedAlias = alias.toLowerCase();
        // For direct aliases, only keep the latest action (override previous)
        this.actionsByPattern.set(normalizedAlias, [action]);
      }
    }
    
    // Update pattern mappings if we have a language provider
    if (this.languageProvider) {
      this.updatePatternMappingsForAction(action);
    }
  }
  
  /**
   * Register multiple actions
   */
  registerMany(actions: Action[]): void {
    for (const action of actions) {
      this.register(action);
    }
  }

  /**
   * Get an action by ID
   */
  get(actionId: string): Action | undefined {
    return this.actions.get(actionId);
  }
  
  /**
   * Get all registered actions
   */
  getAll(): Action[] {
    return Array.from(this.actions.values());
  }
  
  /**
   * Check if an action is registered
   */
  has(actionId: string): boolean {
    return this.actions.has(actionId);
  }
  
  /**
   * Find actions by pattern
   */
  findByPattern(pattern: string): Action[] {
    return this.actionsByPattern.get(pattern.toLowerCase()) || [];
  }

  /**
   * Get actions by group
   */
  getByGroup(group: string): Action[] {
    return this.actionsByGroup.get(group) || [];
  }

  /**
   * Find an action by ID or pattern (backward compatibility)
   * @param idOrPattern Action ID or pattern to search for
   * @returns First matching action or undefined
   */
  find(idOrPattern: string): Action | undefined {
    // First try direct ID lookup
    const directLookup = this.get(idOrPattern);
    if (directLookup) return directLookup;
    
    // Then try pattern lookup
    const patternMatches = this.findByPattern(idOrPattern);
    return patternMatches[0]; // Return first match
  }

  /**
   * Register messages for an action (placeholder for future implementation)
   */
  registerMessages(actionId: string, messages: Record<string, string>): void {
    // This would be implemented when we have a message registry
    // For now, messages are handled by the language provider
  }

  /**
   * Update pattern mappings for a single action
   */
  private updatePatternMappingsForAction(action: Action): void {
    if (!this.languageProvider) {
      // Language provider not yet set - patterns will be mapped when it's provided
      return;
    }
    
    const patterns = this.languageProvider.getActionPatterns(action.id);
    if (patterns) {
      for (const pattern of patterns) {
        const normalizedPattern = pattern.toLowerCase();
        const actions = this.actionsByPattern.get(normalizedPattern) || [];
        if (!actions.includes(action)) {
          actions.push(action);
          // Sort by priority (higher priority first)
          actions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
          this.actionsByPattern.set(normalizedPattern, actions);
        }
      }
    }
  }

  /**
   * Rebuild all pattern mappings from language provider
   */
  private rebuildPatternMappings(): void {
    this.actionsByPattern.clear();
    
    for (const action of this.actions.values()) {
      this.updatePatternMappingsForAction(action);
    }
  }
}
