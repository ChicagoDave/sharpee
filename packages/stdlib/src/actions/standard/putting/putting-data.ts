/**
 * Data builder for putting action
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';

export const buildPutData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext
): Record<string, unknown> => {
  const item = context.command.directObject?.entity;
  const target = context.command.indirectObject?.entity;
  
  if (!item || !target) {
    return { item: 'nothing', target: 'nowhere' };
  }
  
  return {
    item: item.name,
    itemSnapshot: captureEntitySnapshot(item, context.world, true),
    target: target.name,
    targetSnapshot: captureEntitySnapshot(target, context.world, true),
    itemId: item.id,
    targetId: target.id,
    preposition: context.command.parsed.extras?.preposition || 'on'
  };
};

export const putDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildPutData,
  protectedFields: ['item', 'target', 'itemId', 'targetId']
};
