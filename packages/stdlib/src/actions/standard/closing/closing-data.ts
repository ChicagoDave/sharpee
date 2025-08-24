/**
 * Data builder for closing action
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel, TraitType } from '@sharpee/world-model';
import { captureEntitySnapshot, captureEntitySnapshots } from '../../base/snapshot-utils';

export const buildClosedData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext
): Record<string, unknown> => {
  const noun = context.command.directObject?.entity;
  if (!noun) return { target: 'nothing' };
  
  const targetSnapshot = captureEntitySnapshot(noun, context.world, false);
  const contents = context.world.getContents(noun.id);
  const contentsSnapshots = captureEntitySnapshots(contents, context.world);
  
  return {
    target: noun.name,
    targetSnapshot,
    contentsSnapshots,
    targetId: noun.id
  };
};

export const closedDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildClosedData,
  protectedFields: ['target', 'targetId']
};
