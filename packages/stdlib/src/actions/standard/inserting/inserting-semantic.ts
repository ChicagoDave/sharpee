/**
 * SEMANTIC VERSION: Inserting action - insert objects specifically into containers
 * 
 * This version demonstrates how semantic grammar eliminates the need for:
 * - Modifying parsed commands to add implicit prepositions
 * - Checking verb.text for variations
 * - Tight coupling to parser internals
 * 
 * Instead, the grammar provides semantic properties that tell us:
 * - spatialRelation: 'in' (normalized from 'in', 'into', or implicit)
 * - manner: how the insertion should be performed
 * - implicitPreposition: whether the user said "insert X Y" vs "insert X into Y"
 */

import { IAction, IActionContext, ValidationResult, CommandSemantics } from '@sharpee/if-domain';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';

export const insertingActionSemantic: IAction = {
  id: 'if.action.inserting',
  
  requiredMessages: [
    'no_target',
    'no_destination',
    'not_held',
    'not_insertable',
    'not_container',
    'already_there',
    'inserted',
    'inserted_forcefully',
    'inserted_carefully',
    'wont_fit',
    'container_closed'
  ],
  
  validate(context: IActionContext): ValidationResult {
    const item = context.command.directObject?.entity;
    const container = context.command.indirectObject?.entity;
    const semantics = context.command.semantics || {};
    
    // Validate we have an item
    if (!item) {
      return {
        valid: false,
        error: 'no_target'
      };
    }
    
    // Validate we have a destination
    if (!container) {
      return {
        valid: false,
        error: 'no_destination',
        params: { item: item.name }
      };
    }
    
    // Check if player is holding the item
    if (!context.canReach(item)) {
      return {
        valid: false,
        error: 'not_held',
        params: { item: item.name }
      };
    }
    
    // Check if container is actually a container
    const containerData = container.getCapability('container');
    if (!containerData) {
      return {
        valid: false,
        error: 'not_container',
        params: { container: container.name }
      };
    }
    
    // Check if container is closed
    if (containerData.closed) {
      return {
        valid: false,
        error: 'container_closed',
        params: { container: container.name }
      };
    }
    
    // Check if item is already in container
    if (context.getEntityLocation(item.id) === container.id) {
      return {
        valid: false,
        error: 'already_there',
        params: { 
          item: item.name,
          container: container.name 
        }
      };
    }
    
    // Check capacity if applicable
    if (containerData.maxCapacity !== undefined) {
      const contents = context.getEntityContents(container.id);
      if (contents.length >= containerData.maxCapacity) {
        return {
          valid: false,
          error: 'wont_fit',
          params: {
            item: item.name,
            container: container.name
          }
        };
      }
    }
    
    // Semantic validation: forceful insertion might damage fragile containers
    if (semantics.manner === 'forceful' && container.hasAttribute('fragile')) {
      return {
        valid: false,
        error: 'would_damage',
        params: {
          item: item.name,
          container: container.name
        }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: IActionContext): ISemanticEvent[] {
    // Revalidate
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: validation.error,
        params: validation.params || {}
      })];
    }
    
    const item = context.command.directObject!.entity;
    const container = context.command.indirectObject!.entity;
    const semantics = context.command.semantics || {};
    
    // Move the item into the container
    const success = context.moveEntity(item.id, container.id);
    
    if (!success) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: 'insertion_failed',
        params: {
          item: item.name,
          container: container.name
        }
      })];
    }
    
    // Choose message based on semantic manner
    let messageId = 'inserted';
    if (semantics.manner === 'forceful') {
      messageId = 'inserted_forcefully';
    } else if (semantics.manner === 'careful') {
      messageId = 'inserted_carefully';
    } else if (semantics.manner === 'stealthy') {
      messageId = 'inserted_stealthily';
    }
    
    // If the preposition was implicit, we might want to be more explicit in the response
    if (semantics.implicitPreposition) {
      // The grammar told us the user said "insert X Y" not "insert X into Y"
      // We can provide clearer feedback
      messageId = 'inserted_into'; // "You insert the coin into the slot."
    }
    
    return [
      context.event('action.success', {
        actionId: this.id,
        messageId: messageId,
        params: {
          item: item.name,
          container: container.name,
          manner: semantics.manner || 'normal'
        }
      }),
      
      // Additional semantic events based on manner
      ...(semantics.manner === 'forceful' ? [
        context.event('sound.loud', {
          source: container.id,
          description: 'clunk'
        })
      ] : []),
      
      ...(semantics.manner === 'stealthy' ? [
        context.event('sound.quiet', {
          source: container.id,
          description: 'soft sliding'
        })
      ] : [])
    ];
  }
};

/**
 * Key improvements in this semantic version:
 * 
 * 1. NO COMMAND MODIFICATION
 *    - The old version modified context.command.parsed to add 'in' preposition
 *    - This version trusts the grammar-provided semantics.spatialRelation
 * 
 * 2. SEMANTIC-BASED BEHAVIOR
 *    - Different messages based on manner (forceful, careful, stealthy)
 *    - Sound events based on how the action was performed
 *    - Validation considers semantics (forceful + fragile = error)
 * 
 * 3. CLEANER ARCHITECTURE
 *    - No delegation to putting action needed
 *    - No need to create modified contexts
 *    - Action is self-contained and focused
 * 
 * 4. IMPLICIT PREPOSITION HANDLING
 *    - Grammar tells us if user said "insert X Y" via implicitPreposition flag
 *    - We can provide clearer feedback without hacking the command
 * 
 * 5. NO PARSER COUPLING
 *    - Never accesses context.command.parsed
 *    - Never checks verb.text
 *    - Never looks at structure.preposition.text
 */