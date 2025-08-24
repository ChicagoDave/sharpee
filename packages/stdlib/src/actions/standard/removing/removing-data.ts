/**
 * Data builder for removing action
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';

export const buildRemovedData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext
): Record<string, unknown> => {
  const item = context.command.directObject?.entity;
  const source = context.command.indirectObject?.entity;
  const actor = context.player;
  
  if (!item) {
    return { item: 'nothing' };
  }
  
  return {
    item: item.name,
    itemSnapshot: captureEntitySnapshot(item, context.world, true),
    actorSnapshot: captureEntitySnapshot(actor, context.world, false),
    sourceSnapshot: source ? captureEntitySnapshot(source, context.world, true) : undefined,
    itemId: item.id,
    fromLocation: source?.name || 'somewhere'
  };
};

export const removedDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildRemovedData,
  protectedFields: ['item', 'itemId']
};
