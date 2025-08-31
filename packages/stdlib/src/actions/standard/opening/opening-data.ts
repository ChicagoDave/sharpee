/**
 * Data builder for opening action
 * 
 * Following atomic event principles - minimal data per event
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { OpenedEventData } from './opening-events';

export const buildOpenedData: ActionDataBuilder<OpenedEventData> = (
  context: ActionContext
): OpenedEventData => {
  const noun = context.command.directObject?.entity;
  if (!noun) {
    return { 
      targetId: '', 
      targetName: 'nothing' 
    };
  }
  
  return {
    targetId: noun.id,
    targetName: noun.name
  };
};

export const openedDataConfig: ActionDataConfig<OpenedEventData> = {
  builder: buildOpenedData,
  protectedFields: ['targetId', 'targetName']
};
