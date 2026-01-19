/**
 * Unlocking action - unlocks containers and doors
 *
 * This action properly delegates to LockableBehavior for validation
 * and execution. It follows the three-phase pattern.
 *
 * Uses three-phase pattern:
 * 1. validate: Check if target is lockable and key requirements
 * 2. execute: Call LockableBehavior.unlock(), store result in sharedData
 * 3. report: Generate events from sharedData
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, LockableBehavior, IUnlockResult } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { UnlockedEventData } from './unlocking-events';
import { analyzeLockContext, validateKeyRequirements, determineLockMessage } from '../lock-shared';
import { MESSAGES } from './unlocking-messages';

/**
 * Shared data passed between execute and report phases
 */
interface UnlockingSharedData {
  targetId: string;
  targetName: string;
  keyId?: string;
  keyName?: string;
  isContainer?: boolean;
  isDoor?: boolean;
  hasContents?: boolean;
  contentsCount?: number;
  contentsIds?: string[];
  sound?: string;
  willAutoOpen?: boolean;
  messageId: string;
  params: Record<string, any>;
  // In case of behavior failure
  failed?: boolean;
  errorMessageId?: string;
}

function getUnlockingSharedData(context: ActionContext): UnlockingSharedData {
  return context.sharedData as UnlockingSharedData;
}

export const unlockingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.UNLOCKING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE,
    key: ScopeLevel.CARRIED
  },

  requiredMessages: [
    'no_target',
    'not_lockable',
    'no_key',
    'wrong_key',
    'already_unlocked',
    'unlocked',
    'unlocked_with',
    'cant_reach',
    'key_not_held',
    'still_locked'
  ],
  group: 'lock_manipulation',

  /**
   * Validate whether the unlock action can be executed
   * Uses behavior validation methods to check preconditions
   */
  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;
    // ADR-080: Prefer instrument field (from .instrument() patterns), fall back to indirectObject
    const withKey = context.command.instrument?.entity ?? context.command.indirectObject?.entity;

    // Validate we have a target
    if (!noun) {
      return {
        valid: false,
        error: MESSAGES.NO_TARGET
      };
    }

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if it's lockable
    if (!noun.has(TraitType.LOCKABLE)) {
      return {
        valid: false,
        error: MESSAGES.NOT_LOCKABLE,
        params: { item: noun.name }
      };
    }

    // Use behavior's canUnlock method for validation
    if (!LockableBehavior.canUnlock(noun)) {
      return {
        valid: false,
        error: MESSAGES.ALREADY_UNLOCKED,
        params: { item: noun.name }
      };
    }

    // Validate key requirements using shared helper
    const keyValidation = validateKeyRequirements(context, noun, withKey, false);
    if (keyValidation) {
      return keyValidation;
    }

    return { valid: true };
  },

  /**
   * Execute the unlock action - performs mutations only
   * Assumes validation has already passed
   * Delegates to LockableBehavior for actual state changes
   */
  execute(context: ActionContext): void {
    const noun = context.command.directObject!.entity!;
    // ADR-080: Prefer instrument field, fall back to indirectObject
    const withKey = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    const sharedData = getUnlockingSharedData(context);

    // Analyze the unlocking context
    const analysis = analyzeLockContext(context, noun, withKey);

    // Delegate to behavior for unlocking (world mutation)
    const result: IUnlockResult = LockableBehavior.unlock(noun, withKey);

    // Store basic info
    sharedData.targetId = noun.id;
    sharedData.targetName = noun.name;

    // Check if the behavior reported failure
    if (!result.success) {
      sharedData.failed = true;
      // Map behavior failure to error message
      if (result.wrongKey) {
        sharedData.errorMessageId = 'wrong_key';
      } else if (result.noKey) {
        sharedData.errorMessageId = 'no_key';
      } else {
        sharedData.errorMessageId = 'cant_unlock';
      }
      return;
    }

    // Unlocking succeeded
    sharedData.failed = false;

    // Add type information from analysis
    if (analysis.isContainer) {
      sharedData.isContainer = true;
      // Get container contents
      const contents = context.world.getContents(noun.id);
      sharedData.hasContents = contents.length > 0;
      sharedData.contentsCount = contents.length;
      sharedData.contentsIds = contents.map(e => e.id);
    }
    if (analysis.isDoor) {
      sharedData.isDoor = true;
    }

    // Add key information
    if (withKey) {
      sharedData.keyId = withKey.id;
      sharedData.keyName = withKey.name;
    }

    // Add sound information from result
    if (result.unlockSound) {
      sharedData.sound = result.unlockSound;
    }

    // Check for auto-open behavior
    if (noun.has(TraitType.OPENABLE)) {
      const openableTrait = noun.get(TraitType.OPENABLE) as any;
      if (openableTrait.autoOpenOnUnlock) {
        sharedData.willAutoOpen = true;
      }
    }

    // Determine success message
    sharedData.messageId = determineLockMessage(false, !!withKey);
    sharedData.params = {
      item: noun.name
    };

    // Add container/door info to params
    if (analysis.isContainer) {
      sharedData.params.isContainer = true;
      sharedData.params.hasContents = sharedData.hasContents;
    }
    if (analysis.isDoor) {
      sharedData.params.isDoor = true;
    }
    if (withKey) {
      sharedData.params.key = withKey.name;
    }
    if (sharedData.willAutoOpen) {
      sharedData.params.willAutoOpen = true;
    }
    if (sharedData.sound) {
      sharedData.params.sound = sharedData.sound;
    }
  },

  /**
   * Report phase - generates events after successful execution
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getUnlockingSharedData(context);

    // Check if behavior failed (safety net for edge cases)
    if (sharedData.failed) {
      return [context.event('if.event.unlock_blocked', {
        messageId: `${context.action.id}.${sharedData.errorMessageId}`,
        params: { item: sharedData.targetName },
        targetId: sharedData.targetId,
        targetName: sharedData.targetName,
        reason: sharedData.errorMessageId
      })];
    }

    // Emit domain event with messageId (simplified pattern - ADR-097)
    return [
      context.event('if.event.unlocked', {
        // Rendering data (messageId + params for text-service)
        messageId: `${context.action.id}.${sharedData.messageId}`,
        params: sharedData.params,
        // Domain data (for event sourcing / handlers)
        targetId: sharedData.targetId,
        targetName: sharedData.targetName,
        containerId: sharedData.targetId,
        containerName: sharedData.targetName,
        actorId: context.player.id,
        isContainer: sharedData.isContainer,
        isDoor: sharedData.isDoor,
        keyId: sharedData.keyId,
        keyName: sharedData.keyName,
        sound: sharedData.sound,
        willAutoOpen: sharedData.willAutoOpen,
        hasContents: sharedData.hasContents,
        contentsCount: sharedData.contentsCount,
        contentsIds: sharedData.contentsIds
      })
    ];
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    return [context.event('if.event.unlock_blocked', {
      // Rendering data
      messageId: `${context.action.id}.${result.error}`,
      params: result.params || {},
      // Domain data
      targetId: noun?.id,
      targetName: noun?.name,
      reason: result.error
    })];
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
