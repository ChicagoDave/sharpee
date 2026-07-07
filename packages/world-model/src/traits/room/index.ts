/**
 * Room trait module
 * 
 * Exports both the trait and behavior for rooms.
 * Rooms are special entities that represent locations in the game world.
 */

export { RoomTrait, IExitInfo } from './roomTrait';
export { RoomBehavior } from './roomBehavior';

// ADR-209: snippet wire types re-exported so trait consumers (helpers builder,
// direct-trait stories) reach them from @sharpee/world-model.
export type { SnippetMap, SnippetEntry, SnippetText } from '@sharpee/if-domain';
