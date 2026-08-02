/**
 * Room trait module
 * 
 * Exports both the trait and behavior for rooms.
 * Rooms are special entities that represent locations in the game world.
 */

export { RoomTrait, IExitInfo } from './roomTrait.js';
export { RoomBehavior } from './roomBehavior.js';

// ADR-295: computed-exit declaration contract (existence + candidates as
// trait data; the resolver side lives in capabilities/exit-resolver-binding).
export {
  IComputedExitDeclaration,
  IComputedExitCarrier,
  isComputedExitCarrier
} from './computedExitContract.js';

// ADR-209: snippet wire types re-exported so trait consumers (helpers builder,
// direct-trait stories) reach them from @sharpee/world-model.
export type { SnippetMap, SnippetEntry, SnippetText } from '@sharpee/if-domain';
