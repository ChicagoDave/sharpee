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
import { TraitType } from '@sharpee/world-model';
import {
  ReadingEventData,
  createReadingEvent
} from './reading-events';

/**
 * Shared data passed between execute and report phases
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
  id: 'if.action.reading',

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

    // Check scope - must be able to see the target
    const scopeCheck = context.requireScope(target, ScopeLevel.VISIBLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if entity has readable trait
    const readable = target.get(TraitType.READABLE);
    if (!readable) {
      return {
        valid: false,
        error: 'not_readable',
        params: { item: String(target.attributes.name || 'that') }
      };
    }

    // Check if currently readable
    if ((readable as any).isReadable === false) {
      return {
        valid: false,
        error: 'cannot_read_now',
        params: {
          item: String(target.attributes.name || 'that'),
          reason: (readable as any).cannotReadMessage || 'cannot_read_now'
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
    if ((readable as any).requiresAbility && !(readable as any).requiredAbility) {
      // If ability is required but player doesn't have it
      // TODO: Check if player has the required ability
      // For now, we'll assume they do if requiredAbility is set
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { directObject } = context.command;
    const target = directObject!.entity;
    const readable = target.get(TraitType.READABLE) as any;
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

    const params: Record<string, any> = {
      item: String(target.attributes.name || 'something'),
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
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    return [context.event('if.event.read', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: { item: target?.name, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];
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

    return events;
  }
};