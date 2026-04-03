/**
 * @sharpee/helpers — Fluent entity builder helpers for the Sharpee IF platform.
 *
 * Public interface: Importing this module activates world.helpers() via
 * declaration merging on IWorldModel. Also exports createHelpers() and
 * EntityHelpers for direct use.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 *
 * @example
 * ```typescript
 * import '@sharpee/helpers';
 *
 * initializeWorld(world: WorldModel): void {
 *   const { room, object, actor } = world.helpers();
 *
 *   const kitchen = room('Kitchen')
 *     .description('A warm kitchen.')
 *     .build();
 * }
 * ```
 */

// Side-effect import: patches WorldModel.prototype.helpers
import './augment';

// Named exports for direct use
export { createHelpers, EntityHelpers } from './create-helpers';
export { RoomBuilder } from './builders/room';
export { ObjectBuilder } from './builders/object';
export { ContainerBuilder } from './builders/container';
export { ActorBuilder } from './builders/actor';
export { DoorBuilder } from './builders/door';
