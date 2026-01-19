/**
 * Locking action - locks containers and doors
 *
 * This action properly delegates to LockableBehavior for validation
 * and execution. It follows the three-phase pattern.
 *
 * Uses three-phase pattern:
 * 1. validate: Check if target is lockable and key requirements
 * 2. execute: Call LockableBehavior.lock(), store result in sharedData
 * 3. report: Generate events from sharedData
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, LockableBehavior, OpenableBehavior, ILockResult } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { LockedEventData } from './locking-events';
import { analyzeLockContext, validateKeyRequirements, determineLockMessage } from '../lock-shared';
import { MESSAGES } from './locking-messages';

/**
 * Shared data passed between execute and report phases
 */
interface LockingSharedData {
  targetId: string;
  targetName: string;
  keyId?: string;
  keyName?: string;
  isContainer?: boolean;
  isDoor?: boolean;
  sound?: string;
  messageId: string;
  params: Record<string, any>;
  // In case of behavior failure
  failed?: boolean;
  errorMessageId?: string;
}

function getLockingSharedData(context: ActionContext): LockingSharedData {
  return context.sharedData as LockingSharedData;
}

export const lockingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.LOCKING,

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
    'already_locked',
    'not_closed',
    'locked',
    'locked_with',
    'cant_reach',
    'key_not_held'
  ],
  group: 'lock_manipulation',

  /**
   * Validate whether the lock action can be executed
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

    // Use behavior's canLock method for validation
    if (!LockableBehavior.canLock(noun)) {
      // Check specific reason why it can't be locked
      if (LockableBehavior.isLocked(noun)) {
        return {
          valid: false,
          error: MESSAGES.ALREADY_LOCKED,
          params: { item: noun.name }
        };
      }
      if (noun.has(TraitType.OPENABLE) && OpenableBehavior.isOpen(noun)) {
        return {
          valid: false,
          error: MESSAGES.NOT_CLOSED,
          params: { item: noun.name }
        };
      }
    }

    // Validate key requirements using shared helper
    const keyValidation = validateKeyRequirements(context, noun, withKey, true);
    if (keyValidation) {
      return keyValidation;
    }

    return { valid: true };
  },

  /**
   * Execute the lock action - performs mutations only
   * Assumes validation has already passed
   * Delegates to LockableBehavior for actual state changes
   */
  execute(context: ActionContext): void {
    const noun = context.command.directObject!.entity!;
    // ADR-080: Prefer instrument field, fall back to indirectObject
    const withKey = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    const sharedData = getLockingSharedData(context);

    // Analyze the locking context
    const analysis = analyzeLockContext(context, noun, withKey);

    // Delegate to behavior for locking (world mutation)
    const result: ILockResult = LockableBehavior.lock(noun, withKey);

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
      } else if (result.alreadyLocked) {
        sharedData.errorMessageId = 'already_locked';
      } else {
        sharedData.errorMessageId = 'cant_lock';
      }
      return;
    }

    // Locking succeeded
    sharedData.failed = false;

    // Add type information from analysis
    if (analysis.isContainer) {
      sharedData.isContainer = true;
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
    if (result.lockSound) {
      sharedData.sound = result.lockSound;
    }

    // Determine success message
    sharedData.messageId = determineLockMessage(true, !!withKey);
    sharedData.params = {
      item: noun.name
    };

    // Add container/door info
    if (analysis.isContainer) {
      sharedData.params.isContainer = true;
    }
    if (analysis.isDoor) {
      sharedData.params.isDoor = true;
    }
    if (withKey) {
      sharedData.params.key = withKey.name;
    }
  },

  /**
   * Report phase - generates events after successful execution
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getLockingSharedData(context);

    // Check if behavior failed (safety net for edge cases)
    if (sharedData.failed) {
      return [context.event('if.event.lock_blocked', {
        messageId: `${context.action.id}.${sharedData.errorMessageId}`,
        params: { item: sharedData.targetName },
        targetId: sharedData.targetId,
        targetName: sharedData.targetName,
        reason: sharedData.errorMessageId
      })];
    }

    // Emit domain event with messageId (simplified pattern - ADR-097)
    return [
      context.event('if.event.locked', {
        // Rendering data (messageId + params for text-service)
        messageId: `${context.action.id}.${sharedData.messageId}`,
        params: sharedData.params,
        // Domain data (for event sourcing / handlers)
        targetId: sharedData.targetId,
        targetName: sharedData.targetName,
        actorId: context.player.id,
        isContainer: sharedData.isContainer,
        isDoor: sharedData.isDoor,
        keyId: sharedData.keyId,
        keyName: sharedData.keyName,
        sound: sharedData.sound
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

    return [context.event('if.event.lock_blocked', {
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
