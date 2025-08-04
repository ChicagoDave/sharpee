/**
 * Inserting action - insert objects specifically into containers
 * 
 * This action is container-specific, unlike putting which handles both
 * containers and supporters. It's more explicit about the container relationship.
 * In many cases, this delegates to the putting action with 'in' preposition.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { puttingAction } from '../putting';
import { createActionContext } from '../../enhanced-context';

export const insertingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.INSERTING,
  requiredMessages: [
    'no_target',
    'no_destination',
    'not_held',
    'not_insertable',
    'not_container',
    'already_there',
    'inserted',
    'wont_fit',
    'container_closed'
  ],
  group: 'object_manipulation',
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.CARRIED,
    indirectObjectScope: ScopeLevel.REACHABLE
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    const item = context.command.directObject?.entity;
    const container = context.command.indirectObject?.entity;
    
    // Validate we have an item
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Validate we have a destination
    if (!container) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_destination',
        reason: 'no_destination',
        params: { item: item.name }
      })];
    }
    
    // For most cases, delegate to putting with 'in' preposition
    // This ensures consistent behavior between "insert X in Y" and "put X in Y"
    const modifiedCommand = {
      ...context.command,
      parsed: {
        ...context.command.parsed,
        structure: {
          ...context.command.parsed.structure,
          preposition: { 
            tokens: [], 
            text: 'in' 
          }
        },
        preposition: 'in' // Add this for backward compatibility with tests
      }
    };
    
    // Create a new context for the putting action with the modified command
    const modifiedContext = createActionContext(
      context.world,
      context.player,
      puttingAction,
      modifiedCommand
    );
    
    // Execute putting action with 'in' preposition
    return puttingAction.execute(modifiedContext);
  }
};
