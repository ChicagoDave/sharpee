/**
 * Sub-action for inserting items into containers
 * Delegates to put sub-action since inserting is container-specific putting
 */

import { IFEntity } from '@sharpee/world-model';
import { put, IPutResult, IPutContext } from '../../putting/sub-actions/put';

export interface IInsertResult extends IPutResult {
  success: boolean;
  previousLocation?: string;
}

/**
 * Insert an item into a container
 * Assumes all validation has been done by the main action
 */
export function insert(
  item: IFEntity,
  container: IFEntity,
  context: IPutContext
): IInsertResult {
  // Delegate to put sub-action
  return put(item, container, context);
}