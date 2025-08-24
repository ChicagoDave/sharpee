/**
 * Data builder for inserting action
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';

export const buildInsertedData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext
): Record<string, unknown> => {
  const item = context.command.directObject?.entity;
  const container = context.command.indirectObject?.entity;
  
  if (!item || !container) {
    return { item: 'nothing', container: 'nowhere' };
  }
  
  return {
    item: item.name,
    itemSnapshot: captureEntitySnapshot(item, context.world, true),
    container: container.name,
    containerSnapshot: captureEntitySnapshot(container, context.world, true),
    itemId: item.id,
    containerId: container.id
  };
};

export const insertedDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildInsertedData,
  protectedFields: ['item', 'container', 'itemId', 'containerId']
};
