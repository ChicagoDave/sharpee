/**
 * Examining action - looks at objects in detail
 * 
 * This is a read-only action that provides detailed information about objects.
 * It validates visibility but doesn't change state.
 * 
 * Uses three-phase pattern:
 * 1. validate: Check target exists and is visible
 * 2. execute: No mutations (read-only action)
 * 3. report: Generate events with complete entity snapshot
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, IFEntity, OpenableBehavior, SwitchableBehavior, LockableBehavior, WearableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { captureEntitySnapshot, captureEntitySnapshots } from '../../base/snapshot-utils';

// Import our typed event data
import { ExaminedEventData, ExaminingErrorData } from './examining-events';

interface ExaminingState {
  noun: IFEntity;
  isSelf: boolean;
  eventData: ExaminedEventData;
  messageId: string;
  params: Record<string, any>;
}

export const examiningAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EXAMINING,
  requiredMessages: [
    'no_target',
    'not_visible',
    'examined',
    'examined_self',
    'examined_container',
    'examined_supporter',
    'examined_readable',
    'examined_switchable',
    'examined_wearable',
    'examined_door',
    'nothing_special',
    'description',
    'brief_description'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const noun = context.command.directObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return {
        valid: false,
        error: 'no_target',
        params: {}
      };
    }
    
    // Check if visible (unless examining yourself)
    if (noun.id !== actor.id && !context.canSee(noun)) {
      return {
        valid: false,
        error: 'not_visible',
        params: { target: noun.name }
      };
    }
    
    // Valid - all event data will be built in report()
    return { 
      valid: true
    };
  },
  
  execute(context: ActionContext): void {
    // No mutations - examining is a read-only action
  },
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      // Capture entity data for validation errors
      const errorParams = { ...(validationResult.params || {}) };
      
      // Add entity snapshots if entities are available
      if (context.command.directObject?.entity) {
        errorParams.targetSnapshot = captureEntitySnapshot(
          context.command.directObject.entity,
          context.world,
          false
        );
      }
      
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: errorParams
        })
      ];
    }
    
    // Handle execution errors
    if (executionError) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: 'execution_failed',
          messageId: 'action_failed',
          params: {
            error: executionError.message
          }
        })
      ];
    }
    
    const actor = context.player;
    const noun = context.command.directObject?.entity;
    
    if (!noun) {
      // This shouldn't happen if validation passed, but handle it
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: 'no_target',
          messageId: 'no_target',
          params: {}
        })
      ];
    }
    
    const isSelf = noun.id === actor.id;
    
    // Capture complete entity snapshot for atomic event
    const entitySnapshot = captureEntitySnapshot(noun, context.world, true);
    
    // Build event data with both new and backward-compatible fields
    const eventData: ExaminedEventData = {
      // New atomic structure
      target: entitySnapshot,
      // Backward compatibility fields
      targetId: noun.id,
      targetName: isSelf ? 'yourself' : noun.name
    };
    
    if (isSelf) {
      eventData.self = true;
    }
    
    const params: Record<string, any> = {};
    let messageId = isSelf ? 'examined_self' : 'examined';
    
    if (!isSelf) {
      // Add trait information for text generation
      if (noun.has(TraitType.IDENTITY)) {
        const identityTrait = noun.get(TraitType.IDENTITY);
        if (identityTrait) {
          eventData.hasDescription = !!(identityTrait as any).description;
          eventData.hasBrief = !!(identityTrait as any).brief;
          
          if ((identityTrait as any).description) {
            params.description = (identityTrait as any).description;
          }
        }
      }
      
      // Container information
      if (noun.has(TraitType.CONTAINER)) {
        const contents = context.world.getContents(noun.id);
        const contentsSnapshots = captureEntitySnapshots(contents, context.world);
        eventData.isContainer = true;
        eventData.hasContents = contents.length > 0;
        eventData.contentCount = contents.length;
        // New: full snapshots
        eventData.contentsSnapshots = contentsSnapshots;
        // Backward compatibility: simple references
        eventData.contents = contents.map(e => ({ id: e.id, name: e.name }));
        
        // Check if open/closed using OpenableBehavior
        if (noun.has(TraitType.OPENABLE)) {
          eventData.isOpenable = true;
          eventData.isOpen = OpenableBehavior.isOpen(noun);
        } else {
          eventData.isOpen = true; // Containers without openable trait are always open
        }
        
        messageId = 'examined_container';
      }
      
      // Supporter information
      if (noun.has(TraitType.SUPPORTER)) {
        const contents = context.world.getContents(noun.id);
        const contentsSnapshots = captureEntitySnapshots(contents, context.world);
        eventData.isSupporter = true;
        eventData.hasContents = contents.length > 0;
        eventData.contentCount = contents.length;
        // New: full snapshots
        eventData.contentsSnapshots = contentsSnapshots;
        // Backward compatibility: simple references
        eventData.contents = contents.map(e => ({ id: e.id, name: e.name }));
        
        if (!eventData.isContainer) { // Don't override container message
          messageId = 'examined_supporter';
        }
      }
      
      // Device information using SwitchableBehavior
      if (noun.has(TraitType.SWITCHABLE)) {
        eventData.isSwitchable = true;
        eventData.isOn = SwitchableBehavior.isOn(noun);
        
        if (messageId === 'examined') { // Only set if not already specialized
          messageId = 'examined_switchable';
        }
      }
      
      // Readable information
      if (noun.has(TraitType.READABLE)) {
        const readableTrait = noun.get(TraitType.READABLE);
        eventData.isReadable = true;
        eventData.hasText = readableTrait ? !!(readableTrait as any).text : false;
        
        if (eventData.hasText) {
          params.text = (readableTrait as any).text;
          messageId = 'examined_readable';
        }
      }
      
      // Wearable information using WearableBehavior
      if (noun.has(TraitType.WEARABLE)) {
        eventData.isWearable = true;
        eventData.isWorn = WearableBehavior.isWorn(noun);
        
        if (messageId === 'examined') {
          messageId = 'examined_wearable';
        }
      }
      
      // Door information
      if (noun.has(TraitType.DOOR)) {
        eventData.isDoor = true;
        messageId = 'examined_door';
        
        // Check if door is openable using OpenableBehavior
        if (noun.has(TraitType.OPENABLE)) {
          eventData.isOpenable = true;
          eventData.isOpen = OpenableBehavior.isOpen(noun);
        }
        
        // Add lock status using LockableBehavior
        if (noun.has(TraitType.LOCKABLE)) {
          eventData.isLockable = true;
          eventData.isLocked = LockableBehavior.isLocked(noun);
          params.isLocked = eventData.isLocked;
        }
      }
      
      // Build params based on the selected message type
      if (messageId === 'examined') {
        params.target = noun.name;
      } else if (messageId === 'examined_container') {
        params.isOpen = eventData.isOpen;
      } else if (messageId === 'examined_supporter') {
        // No special params for supporter
      } else if (messageId === 'examined_switchable') {
        params.isOn = eventData.isOn;
      } else if (messageId === 'examined_wearable') {
        params.isWorn = eventData.isWorn;
      } else if (messageId === 'examined_door') {
        if (eventData.isLocked !== undefined) {
          params.isLocked = eventData.isLocked;
        }
      }
    }
    
    // Return both the domain event and success message
    return [
      context.event('if.event.examined', eventData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      })
    ];
  },
  
  group: "observation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.VISIBLE
  }
};
