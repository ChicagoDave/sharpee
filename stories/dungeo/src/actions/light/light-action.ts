/**
 * Light Action - Light flammable objects with fire sources
 *
 * Used for:
 * - LIGHT GUIDEBOOK WITH MATCH (balloon fuel)
 * - LIGHT CANDLES WITH MATCH (exorcism)
 *
 * FORTRAN: Creates BINFF state (burning object in receptacle)
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { LIGHT_ACTION_ID, LightMessages } from './types';

// Objects that can be set on fire
const FLAMMABLE_NAMES = ['guidebook', 'book', 'newspaper', 'leaves', 'paper', 'coal'];

// Objects that can provide fire
const FIRE_SOURCE_NAMES = ['match', 'matches', 'matchbook', 'candle', 'candles', 'torch', 'lantern'];

/**
 * Check if entity is flammable
 */
function isFlammable(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

  return FLAMMABLE_NAMES.some(f =>
    name.includes(f) || aliases.some(a => a.includes(f))
  );
}

/**
 * Check if entity can provide fire
 */
function isFireSource(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

  return FIRE_SOURCE_NAMES.some(f =>
    name.includes(f) || aliases.some(a => a.includes(f))
  );
}

/**
 * Check if entity is the guidebook
 */
function isGuidebook(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

  return name.includes('guidebook') ||
    aliases.some(a => a.includes('guidebook') || a.includes('guide book'));
}

/**
 * Find entity by text
 */
function findEntityByText(context: ActionContext, text: string): IFEntity | undefined {
  if (!text) return undefined;
  const lowerText = text.toLowerCase();

  return context.world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    if (!identity) return false;
    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases || [];
    return name === lowerText || name.includes(lowerText) ||
      aliases.some((a: string) => a.toLowerCase() === lowerText || a.toLowerCase().includes(lowerText));
  });
}

/**
 * Get direct object from command
 */
function getDirectObject(context: ActionContext): IFEntity | undefined {
  const structure = context.command.parsed?.structure;
  if (!structure?.directObject) return undefined;
  const text = structure.directObject.text || '';
  return findEntityByText(context, text);
}

/**
 * Get indirect object (tool) from command
 */
function getIndirectObject(context: ActionContext): IFEntity | undefined {
  const structure = context.command.parsed?.structure;
  if (!structure?.indirectObject) return undefined;
  const text = structure.indirectObject.text || '';
  return findEntityByText(context, text);
}

/**
 * Light Action
 */
export const lightAction: Action = {
  id: LIGHT_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const target = getDirectObject(context);
    const tool = getIndirectObject(context);

    if (!target) {
      return { valid: false, error: LightMessages.NOT_FLAMMABLE };
    }

    // Check if already burning
    if ((target as any).isBurning) {
      return { valid: false, error: LightMessages.ALREADY_BURNING };
    }

    // Check if flammable
    if (!isFlammable(target)) {
      return { valid: false, error: LightMessages.NOT_FLAMMABLE };
    }

    // Must have a fire source
    if (!tool) {
      return { valid: false, error: LightMessages.NO_FIRE_SOURCE };
    }

    // Check if fire source
    if (!isFireSource(tool)) {
      return { valid: false, error: LightMessages.NO_FIRE_SOURCE };
    }

    // Store for execute phase
    context.sharedData.lightTarget = target;
    context.sharedData.lightTool = tool;
    context.sharedData.isGuidebook = isGuidebook(target);

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const target = context.sharedData.lightTarget as IFEntity;

    if (!target) return;

    // Set the object on fire
    (target as any).isBurning = true;

    // Calculate burn duration based on object size
    // FORTRAN: OSIZE(object) * 20 turns
    const size = (target as any).size || 2; // Default size 2 (guidebook)
    (target as any).burnTurnsRemaining = size * 20;

    // Store success for report
    context.sharedData.lightSuccess = true;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: LIGHT_ACTION_ID,
      messageId: result.error || LightMessages.NOT_FLAMMABLE,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const target = context.sharedData.lightTarget as IFEntity;

    if (!target || !context.sharedData.lightSuccess) {
      return events;
    }

    const identity = target.get(IdentityTrait);
    const targetName = identity?.name || 'object';

    // Check if it's the guidebook (special message)
    if (context.sharedData.isGuidebook) {
      events.push(context.event('game.message', {
        messageId: LightMessages.GUIDEBOOK_LIT,
        params: { target: targetName }
      }));
    } else {
      events.push(context.event('game.message', {
        messageId: LightMessages.SUCCESS,
        params: { target: targetName }
      }));
    }

    return events;
  }
};
