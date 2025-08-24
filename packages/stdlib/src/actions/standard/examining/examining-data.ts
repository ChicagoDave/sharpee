/**
 * Data builder for examining action
 * 
 * Centralizes all entity snapshot and event data logic for the examining action.
 * This separates data structure concerns from business logic.
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel, TraitType, IFEntity } from '@sharpee/world-model';
import { OpenableBehavior, SwitchableBehavior, LockableBehavior, WearableBehavior } from '@sharpee/world-model';
import { captureEntitySnapshot, captureEntitySnapshots } from '../../base/snapshot-utils';
import { ExaminedEventData } from './examining-events';

/**
 * Build examining action success data
 * 
 * Creates the complete data structure for examined events,
 * including entity snapshots and trait-specific information.
 */
export const buildExaminingData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const actor = context.player;
  const noun = context.command.directObject?.entity;
  
  if (!noun) {
    // Shouldn't happen if validation passed, but handle gracefully
    return {
      targetId: '',
      targetName: 'nothing'
    };
  }
  
  const isSelf = noun.id === actor.id;
  
  // Capture complete entity snapshot for atomic event
  const entitySnapshot = captureEntitySnapshot(noun, context.world, true);
  
  // Build base event data
  const eventData: Record<string, unknown> = {
    // New atomic structure
    target: entitySnapshot,
    // Backward compatibility fields
    targetId: noun.id,
    targetName: isSelf ? 'yourself' : noun.name
  };
  
  if (isSelf) {
    eventData.self = true;
    return eventData; // No trait checking for self-examination
  }
  
  // Add trait-specific information
  
  // Identity trait (description/brief)
  if (noun.has(TraitType.IDENTITY)) {
    const identityTrait = noun.get(TraitType.IDENTITY);
    if (identityTrait) {
      eventData.hasDescription = !!(identityTrait as any).description;
      eventData.hasBrief = !!(identityTrait as any).brief;
    }
  }
  
  // Container trait
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
    
    // Check if open/closed
    if (noun.has(TraitType.OPENABLE)) {
      eventData.isOpenable = true;
      eventData.isOpen = OpenableBehavior.isOpen(noun);
    } else {
      eventData.isOpen = true; // Containers without openable trait are always open
    }
  }
  
  // Supporter trait
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
  }
  
  // Switchable trait
  if (noun.has(TraitType.SWITCHABLE)) {
    eventData.isSwitchable = true;
    eventData.isOn = SwitchableBehavior.isOn(noun);
  }
  
  // Readable trait
  if (noun.has(TraitType.READABLE)) {
    const readableTrait = noun.get(TraitType.READABLE);
    eventData.isReadable = true;
    eventData.hasText = readableTrait ? !!(readableTrait as any).text : false;
  }
  
  // Wearable trait
  if (noun.has(TraitType.WEARABLE)) {
    eventData.isWearable = true;
    eventData.isWorn = WearableBehavior.isWorn(noun);
  }
  
  // Door trait
  if (noun.has(TraitType.DOOR)) {
    eventData.isDoor = true;
    
    // Check if door is openable
    if (noun.has(TraitType.OPENABLE)) {
      eventData.isOpenable = true;
      eventData.isOpen = OpenableBehavior.isOpen(noun);
    }
    
    // Add lock status
    if (noun.has(TraitType.LOCKABLE)) {
      eventData.isLockable = true;
      eventData.isLocked = LockableBehavior.isLocked(noun);
    }
  }
  
  return eventData;
};

/**
 * Build message parameters for examining action
 * 
 * Creates the parameters needed for text generation based on
 * the entity's traits and state.
 */
export function buildExaminingMessageParams(
  eventData: Record<string, unknown>,
  noun: IFEntity
): { messageId: string; params: Record<string, any> } {
  const params: Record<string, any> = {};
  let messageId = eventData.self ? 'examined_self' : 'examined';
  
  if (!eventData.self && noun) {
    // Add trait-specific parameters
    
    // Add description text if available
    if (eventData.hasDescription && noun.has(TraitType.IDENTITY)) {
      const identityTrait = noun.get(TraitType.IDENTITY);
      if ((identityTrait as any)?.description) {
        params.description = (identityTrait as any).description;
      }
    }
    
    // Container-specific message
    if (eventData.isContainer) {
      messageId = 'examined_container';
      params.isOpen = eventData.isOpen;
    }
    
    // Supporter-specific message (only if not also a container)
    else if (eventData.isSupporter) {
      messageId = 'examined_supporter';
    }
    
    // Switchable-specific message
    else if (eventData.isSwitchable) {
      messageId = 'examined_switchable';
      params.isOn = eventData.isOn;
    }
    
    // Readable-specific message
    else if (eventData.isReadable && eventData.hasText && noun.has(TraitType.READABLE)) {
      const readableTrait = noun.get(TraitType.READABLE);
      if ((readableTrait as any)?.text) {
        params.text = (readableTrait as any).text;
        messageId = 'examined_readable';
      }
    }
    
    // Wearable-specific message
    else if (eventData.isWearable) {
      messageId = 'examined_wearable';
      params.isWorn = eventData.isWorn;
    }
    
    // Door-specific message
    else if (eventData.isDoor) {
      messageId = 'examined_door';
      if (eventData.isLocked !== undefined) {
        params.isLocked = eventData.isLocked;
      }
    }
    
    // Default parameters for basic examined message
    else if (messageId === 'examined') {
      params.target = noun.name;
    }
  }
  
  return { messageId, params };
}

/**
 * Configuration for examining data builder
 * 
 * Allows stories to extend the data while protecting core fields
 */
export const examiningDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildExaminingData,
  protectedFields: ['targetId', 'targetName', 'target']
};