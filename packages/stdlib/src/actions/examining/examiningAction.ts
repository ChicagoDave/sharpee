/**
 * Examining action executor
 * 
 * Handles the logic for looking at objects in detail
 */

import { ActionExecutor, ParsedCommand } from '../types/command-types';
import { ActionContext } from '../types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { 
  TraitType, 
  IdentityBehavior, 
  ContainerBehavior, 
  OpenableBehavior, 
  LockableBehavior, 
  SwitchableBehavior, 
  WearableBehavior, 
  ReadableBehavior 
} from '@sharpee/world-model';

/**
 * Executor for the examining action
 */
export const examiningAction: ActionExecutor = {
  id: IFActions.EXAMINING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor, noun } = command;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.EXAMINING,
          reason: ActionFailureReason.INVALID_TARGET
        },
        { actor: actor.id }
      )];
    }
    
    // Check if visible
    if (!context.canSee(noun)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.EXAMINING,
          reason: ActionFailureReason.NOT_VISIBLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Build examination data
    const examineData: Record<string, unknown> = {
      isRoom: noun.has(TraitType.ROOM)
    };
    
    // Get basic identity information
    if (noun.has(TraitType.IDENTITY)) {
      examineData.description = IdentityBehavior.getDescription(noun);
      examineData.brief = IdentityBehavior.getBrief(noun);
    }
    
    // Container information
    if (noun.has(TraitType.CONTAINER)) {
      examineData.isContainer = true;
      
      // Check if we can see inside
      let canSeeInside = true;
      if (noun.has(TraitType.OPENABLE)) {
        canSeeInside = OpenableBehavior.isOpen(noun);
        examineData.isOpen = canSeeInside;
      }
      
      if (canSeeInside) {
        const contents = context.world.getContents(noun.id);
        examineData.contents = contents.map(item => item.id);
        examineData.isEmpty = contents.length === 0;
      }
    }
    
    // Supporter information
    if (noun.has(TraitType.SUPPORTER)) {
      examineData.isSupporter = true;
      const supported = context.world.getContents(noun.id);
      examineData.supportedItems = supported.map(item => item.id);
      examineData.hasItems = supported.length > 0;
    }
    
    // Switchable information
    if (noun.has(TraitType.SWITCHABLE)) {
      examineData.isSwitchable = true;
      examineData.isOn = SwitchableBehavior.isOn(noun);
    }
    
    // Door information
    if (noun.has(TraitType.DOOR)) {
      examineData.isDoor = true;
      
      if (noun.has(TraitType.OPENABLE)) {
        examineData.isOpen = OpenableBehavior.isOpen(noun);
      }
      
      if (noun.has(TraitType.LOCKABLE)) {
        examineData.isLocked = LockableBehavior.isLocked(noun);
      }
    }
    
    // Wearable information
    if (noun.has(TraitType.WEARABLE)) {
      examineData.isWearable = true;
      examineData.isWorn = WearableBehavior.isWorn(noun);
    }
    
    // Readable information
    if (noun.has(TraitType.READABLE)) {
      examineData.isReadable = true;
      examineData.text = ReadableBehavior.getText(noun);
    }
    
    // Create the examination event
    return [createEvent(
      IFEvents.EXAMINED,
      examineData,
      { actor: actor.id, target: noun.id }
    )];
  }
};