/**
 * Meta-Command Registry
 * 
 * Centralized registry for tracking which commands are meta-commands.
 * Meta-commands don't increment turns, trigger NPCs, or get recorded in history.
 */

/**
 * Registry for meta-commands
 * 
 * Maintains a list of action IDs that should be treated as meta-commands.
 * This includes both standard system commands (SAVE, RESTORE, etc.) and
 * custom meta-commands (debug commands, author commands, etc.).
 */
export class MetaCommandRegistry {
  /**
   * Set of registered meta-command IDs
   * Pre-populated with standard IF meta-commands
   */
  private static metaCommands = new Set<string>([
    // System commands (using IF action IDs)
    'if.action.saving',      // SAVE
    'if.action.restoring',   // RESTORE / LOAD
    'if.action.quitting',    // QUIT / Q
    'if.action.restarting',  // RESTART
    
    // Information commands
    'if.action.scoring',     // SCORE / STATUS
    'if.action.version',     // VERSION
    'if.action.about',       // ABOUT
    'if.action.help',        // HELP
    
    // Transcript commands
    'transcript',            // TRANSCRIPT ON/OFF
    'transcript_on',         // TRANSCRIPT ON
    'transcript_off',        // TRANSCRIPT OFF
    
    // Undo system
    'if.action.again',       // AGAIN (repeat last command)
    'if.action.undoing',     // UNDO (action ID)
    'undo',                  // UNDO (grammar pattern)
    
    // Preference commands
    'verbose',          // VERBOSE mode
    'brief',            // BRIEF mode
    'superbrief',       // SUPERBRIEF mode
    'notify',           // NOTIFY ON/OFF
    
    // Debug/Author commands (will be auto-registered by MetaAction)
    // Listed here for documentation
    // 'author.trace',
  ]);
  
  /**
   * Register an action ID as a meta-command
   * 
   * @param actionId The action ID to register
   * @example
   * ```typescript
   * MetaCommandRegistry.register('my_debug_command');
   * ```
   */
  static register(actionId: string): void {
    if (!actionId) {
      console.warn('MetaCommandRegistry: Attempted to register empty action ID');
      return;
    }
    this.metaCommands.add(actionId);
  }
  
  /**
   * Unregister an action ID from meta-commands
   * Useful for testing or dynamic configuration
   * 
   * @param actionId The action ID to unregister
   * @returns true if the command was registered and is now removed
   */
  static unregister(actionId: string): boolean {
    return this.metaCommands.delete(actionId);
  }
  
  /**
   * Check if an action ID is registered as a meta-command
   * 
   * @param actionId The action ID to check
   * @returns true if this is a meta-command
   * @example
   * ```typescript
   * if (!MetaCommandRegistry.isMeta(result.actionId)) {
   *   // Increment turn counter
   *   this.updateContext(result);
   * }
   * ```
   */
  static isMeta(actionId: string): boolean {
    if (!actionId) return false;
    return this.metaCommands.has(actionId);
  }
  
  /**
   * Get all registered meta-command IDs
   * Useful for debugging and documentation
   * 
   * @returns Array of all registered meta-command IDs
   */
  static getAll(): string[] {
    return Array.from(this.metaCommands).sort();
  }
  
  /**
   * Clear all registered meta-commands
   * Useful for testing - resets to default state
   */
  static clear(): void {
    this.metaCommands.clear();
    // Re-add standard commands
    this.reset();
  }
  
  /**
   * Reset to default meta-commands
   * Removes any custom registrations and restores defaults
   */
  static reset(): void {
    this.metaCommands = new Set<string>([
      'if.action.saving',
      'if.action.restoring',
      'if.action.quitting',
      'if.action.restarting',
      'if.action.undoing',
      'if.action.scoring',
      'if.action.version',
      'if.action.about',
      'if.action.help',
      'if.action.again',
      'transcript',
      'transcript_on',
      'transcript_off',
      'undo',
      'verbose',
      'brief',
      'superbrief',
      'notify'
    ]);
  }
  
  /**
   * Get the count of registered meta-commands
   * 
   * @returns Number of registered meta-commands
   */
  static count(): number {
    return this.metaCommands.size;
  }
  
  /**
   * Check if registry has any custom (non-default) meta-commands
   *
   * @returns true if any non-default commands are registered
   */
  static hasCustomCommands(): boolean {
    const defaults = new Set([
      'if.action.saving', 'if.action.restoring', 'if.action.quitting', 'if.action.restarting',
      'if.action.undoing', 'if.action.scoring', 'if.action.version', 'if.action.about', 'if.action.help',
      'if.action.again', 'transcript', 'transcript_on', 'transcript_off',
      'undo', 'verbose', 'brief', 'superbrief', 'notify'
    ]);

    for (const cmd of this.metaCommands) {
      if (!defaults.has(cmd)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Common verb strings for non-undoable commands.
   *
   * Used for early detection before parsing (when action ID is not yet available).
   * Includes both meta-commands and info commands that don't change game state.
   *
   * @internal Used by game engine for undo snapshot decisions
   */
  private static nonUndoableVerbs = new Set([
    // Meta-commands (match MetaCommandRegistry)
    'undo', 'save', 'restore', 'restart', 'quit',
    'score', 'version', 'about', 'help',
    'verbose', 'brief', 'superbrief', 'notify',
    'again', 'g',
    // Info commands (don't change game state)
    'look', 'l',
    'examine', 'x',
    'inventory', 'i'
  ]);

  /**
   * Check if a raw input string is a non-undoable command.
   *
   * Used for early detection before parsing when we don't have an action ID yet.
   * This covers:
   * - Meta-commands (save, restore, quit, restart, undo, etc.)
   * - Info commands (look, examine, inventory)
   *
   * @param input Raw command input string
   * @returns true if this command should not create an undo snapshot
   *
   * @example
   * ```typescript
   * if (!MetaCommandRegistry.isNonUndoable(input)) {
   *   createUndoSnapshot();
   * }
   * ```
   */
  static isNonUndoable(input: string): boolean {
    const normalized = input.trim().toLowerCase();
    const firstWord = normalized.split(/\s+/)[0];
    return this.nonUndoableVerbs.has(firstWord);
  }
}