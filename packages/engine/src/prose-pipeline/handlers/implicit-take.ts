/**
 * Implicit-take handler — `if.event.implicit_take`.
 *
 * Produces the "(first taking the X)" line that prefaces an action
 * the parser auto-promoted (e.g. "READ BOOK" when the player isn't
 * holding the book yet).
 *
 * Public interface: `handleImplicitTake`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline (extracted from
 *   text-service.ts inline)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
import { createBlock } from '../assemble.js';

interface ImplicitTakeData {
  itemName?: string;
}

export function handleImplicitTake(
  event: ISemanticEvent,
  _context: HandlerContext,
): ITextBlock[] {
  const data = event.data as ImplicitTakeData;
  const itemName = data?.itemName || 'something';
  return [createBlock(BLOCK_KEYS.ACTION_RESULT, `(first taking the ${itemName})`)];
}
