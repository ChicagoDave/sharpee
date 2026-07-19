/**
 * Data builder for attacking action
 * 
 * Following atomic event principles - minimal data per event
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types.js';
import { ActionContext } from '../../enhanced-types.js';
import { AttackedEventData } from './attacking-events.js';

export const buildAttackedData: ActionDataBuilder<AttackedEventData> = (
  context: ActionContext
): AttackedEventData => {
  const target = context.command.directObject?.entity;
  // ADR-080: Prefer instrument field, fall back to indirectObject
  const weapon = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
  
  if (!target) {
    return { 
      target: '', 
      targetName: 'nothing',
      unarmed: true
    };
  }
  
  return {
    target: target.id,
    targetName: target.name,
    weapon: weapon?.id,
    weaponName: weapon?.name,
    unarmed: !weapon
  };
};

export const attackedDataConfig: ActionDataConfig<AttackedEventData> = {
  builder: buildAttackedData,
  protectedFields: ['target', 'targetName']
};