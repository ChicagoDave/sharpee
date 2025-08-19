/**
 * Meta-Action Base Class
 * 
 * Base class for meta-commands (out-of-world actions) that don't affect game state.
 * Meta-commands do not:
 * - Increment the turn counter
 * - Trigger NPC actions or daemons
 * - Get recorded in command history
 * - Affect the game world state
 * 
 * Examples include debug commands, system commands (SAVE/RESTORE), and information
 * commands (SCORE/VERSION).
 */

import { Action, ActionContext, ValidationResult } from './enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { MetaCommandRegistry } from './meta-registry';

/**
 * Abstract base class for meta-commands
 * 
 * Extends this class to create commands that interact with the game system
 * rather than the game world. The constructor automatically registers the
 * command as a meta-command.
 * 
 * @example
 * ```typescript
 * export class ScoreAction extends MetaAction {
 *   id = 'score';
 *   verbs = ['score'];
 *   
 *   execute(context: ActionContext): ISemanticEvent[] {
 *     // Display score without incrementing turn
 *     return [
 *       context.event('game.score', { 
 *         score: context.world.getStateValue('score') || 0 
 *       })
 *     ];
 *   }
 * }
 * ```
 */
export abstract class MetaAction implements Action {
  /**
   * Unique identifier for this action
   */
  abstract id: string;
  
  /**
   * Verbs that trigger this action
   */
  abstract verbs: string[];
  
  /**
   * Validate whether this meta-action can be executed
   * 
   * Meta-actions typically have minimal validation requirements.
   * Override this method for custom validation logic.
   * 
   * @param context The action context
   * @returns Validation result (defaults to always valid)
   */
  validate(context: ActionContext): ValidationResult {
    // Meta-actions are generally always valid to execute
    // Subclasses can override for specific validation needs
    return { valid: true };
  }
  
  /**
   * @deprecated Use validate() instead. This will be removed after refactoring.
   * Optional method to check if action can execute
   * Override for complex conditions beyond verb matching
   */
  canExecute?(context: ActionContext): boolean;
  
  /**
   * Message ID for action description (for help/documentation)
   */
  descriptionMessageId?: string;
  
  /**
   * Message ID for example commands (for help/documentation)
   */
  examplesMessageId?: string;
  
  /**
   * Action group (for organizing related actions)
   */
  group?: string;
  
  /**
   * Priority for pattern matching (higher = preferred)
   * Default is 0
   */
  priority?: number;
  
  /**
   * Constructor - subclasses should call ensureRegistered() after setting id
   */
  constructor() {
    // Subclass must call ensureRegistered() after setting properties
  }
  
  /**
   * Execute the meta-command
   * 
   * @param context The action context
   * @returns Array of semantic events
   */
  abstract execute(context: ActionContext): ISemanticEvent[];
  
  /**
   * Register this action as a meta-command
   * Subclasses should call this after setting the id property
   * 
   * @example
   * ```typescript
   * export class ScoreAction extends MetaAction {
   *   id = 'score';
   *   verbs = ['score'];
   *   
   *   constructor() {
   *     super();
   *     this.ensureRegistered();
   *   }
   * }
   * ```
   */
  protected ensureRegistered(): void {
    if (this.id) {
      MetaCommandRegistry.register(this.id);
    } else {
      console.warn('MetaAction: Cannot register without an id');
    }
  }
}