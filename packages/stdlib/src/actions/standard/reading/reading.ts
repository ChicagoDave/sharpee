/**
 * Reading action - handles reading text from readable entities
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and is readable
 * 2. execute: Mark as read, compute text (mutation)
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 *
 * Supports implicit take for portable readable items (books, notes).
 * Scenery items (inscriptions, signs) can be read without taking.
 *
 * @module
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ReadableTrait } from '@sharpee/world-model';
import { nounPhraseFor } from '../../../utils';
import { IFActions } from '../../constants';
import {
  ReadingEventData,
  createReadingEvent
} from './reading-events';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked
} from '../../lifecycle';

/**
 * Interceptor surface (ADR-228): the read target is the only consultable
 * entity of a READ command.
 */
export const readingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.READING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.READING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/**
 * Shared data passed between execute and report phases.
 */
interface ReadingSharedData {
  readEvent?: ISemanticEvent;
  messageId?: string;
  params?: Record<string, any>;
}

function getReadingSharedData(context: ActionContext): ReadingSharedData {
  return context.sharedData as ReadingSharedData;
}

/**
 * Reading action implementation
 *
 * Handles:
 * - Reading books, notes, signs, inscriptions
 * - Multi-page books
 * - Language/ability requirements
 * - Tracking what has been read
 * - Implicit take for portable items
 */
import { ScopeLevel } from '../../../scope/types';

export const reading: Action = {
  id: IFActions.READING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE  // REACHABLE allows implicit take
  },

  // ADR-104: Implicit inference requirements
  targetRequirements: {
    trait: TraitType.READABLE,
    description: 'readable'
  },

  // Reading typically requires holding the item (books, notes, etc.)
  // Inscriptions/signs don't need taking - they're scenery (handled in validate)
  requiresHolding: true,

  validate(context: ActionContext) {
    const { directObject } = context.command;

    // Require a direct object
    if (!directObject?.entity) {
      return {
        valid: false,
        error: 'what_to_read'
      };
    }

    const target = directObject.entity;

    const state = resolveLifecycle(context, readingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Check scope - must be able to see the target
    const scopeCheck = context.requireScope(target, ScopeLevel.VISIBLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if entity has readable trait
    const readable = target.getTrait(ReadableTrait);
    if (!readable) {
      return {
        valid: false,
        error: 'not_readable',
        params: { item: nounPhraseFor(target) }
      };
    }

    // Check if currently readable
    if (readable.isReadable === false) {
      return {
        valid: false,
        error: 'cannot_read_now',
        params: {
          item: nounPhraseFor(target),
          reason: readable.cannotReadMessage || 'cannot_read_now'
        }
      };
    }

    // Implicit take for portable items (not scenery)
    // Scenery items (inscriptions, signs on walls) can be read without taking
    if (!target.has(TraitType.SCENERY)) {
      const carryCheck = context.requireCarriedOrImplicitTake(target);
      if (!carryCheck.ok) {
        return carryCheck.error!;
      }
    }

    // Check ability requirements
    if (readable.requiresAbility) {
      // If ability is required but player doesn't have it
      // TODO: Check if player has the required ability
      // For now, we'll assume they do if requiredAbility is set
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { directObject } = context.command;
    const target = directObject!.entity;
    const readable = target.getTrait(ReadableTrait)!;
    const sharedData = getReadingSharedData(context);

    // Mark as read (world mutation)
    readable.hasBeenRead = true;

    // Build event data
    const eventData: ReadingEventData = {
      targetId: target.id,
      targetName: String(target.attributes.name || 'something'),
      text: readable.text,
      readableType: readable.readableType || 'text',
      hasBeenRead: true
    };

    // Handle multi-page items
    if (readable.pageContent && readable.currentPage) {
      eventData.currentPage = readable.currentPage;
      eventData.totalPages = readable.pages || readable.pageContent.length;
      eventData.text = readable.pageContent[readable.currentPage - 1];
    }

    // Create the reading event
    const readEvent = createReadingEvent(eventData);

    // Determine message based on type
    let messageId = 'read_text';
    if (readable.readableType === 'book') {
      messageId = readable.pageContent ? 'read_book_page' : 'read_book';
    } else if (readable.readableType === 'sign') {
      messageId = 'read_sign';
    } else if (readable.readableType === 'inscription') {
      messageId = 'read_inscription';
    }

    // params carry EntityInfo for the formatter chain (ADR-158)
    const params: Record<string, any> = {
      item: nounPhraseFor(target),
      text: eventData.text
    };

    if (eventData.currentPage) {
      params.currentPage = eventData.currentPage;
      params.totalPages = eventData.totalPages;
    }

    // Store in sharedData for report phase
    sharedData.readEvent = readEvent;
    sharedData.messageId = messageId;
    sharedData.params = params;

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    const events: ISemanticEvent[] = [context.event('if.event.read', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { item: target ? nounPhraseFor(target) : undefined, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.read', result.error);
    }

    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getReadingSharedData(context);
    const events: ISemanticEvent[] = [];

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // Emit read event with messageId for text rendering
    const target = context.command.directObject?.entity;
    events.push(context.event('if.event.read', {
      messageId: `${context.action.id}.${sharedData.messageId || 'read_text'}`,
      params: sharedData.params || {},
      targetId: target?.id,
      targetName: String(target?.attributes.name || 'something'),
      text: sharedData.params?.text
    }));

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.read');

    return events;
  }
};