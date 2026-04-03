/**
 * IWorldModel augmentation — adds helpers() method via declaration merging.
 *
 * Importing this module (or any re-export of it) patches WorldModel.prototype
 * with a helpers() method that returns pre-bound entity builder functions.
 *
 * This follows the same pattern as @sharpee/media extending EventDataRegistry.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */

import { WorldModel } from '@sharpee/world-model';
import { createHelpers, EntityHelpers } from './create-helpers';

// Declaration merging: extend the WorldModel class only.
// We don't augment IWorldModel because AuthorModel implements it
// and would be forced to provide helpers() — creating a circular dep.
declare module '@sharpee/world-model' {
  interface WorldModel {
    /** Get fluent entity builder functions bound to this world. */
    helpers(): EntityHelpers;
  }
}

// Patch WorldModel.prototype at import time
(WorldModel.prototype as any).helpers = function (this: WorldModel): EntityHelpers {
  return createHelpers(this as unknown as import('@sharpee/world-model').IWorldModel);
};
