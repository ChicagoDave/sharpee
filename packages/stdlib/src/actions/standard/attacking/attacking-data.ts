/**
 * Data builder for attacking action
 * 
 * Following atomic event principles - minimal data per event
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { AttackedEventData } from './attacking-events';

export const buildAttackedData: ActionDataBuilder<AttackedEventData> = (
  context: ActionContext
): AttackedEventData => {
  const target = context.command.directObject?.entity;
  const weapon = context.command.indirectObject?.entity;
  
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