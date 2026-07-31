/**
 * @sharpee/helpers — Fluent entity builder helpers for the Sharpee IF platform.
 *
 * Public interface: createHelpers() and EntityHelpers, plus the five builder
 * classes. Call createHelpers(world) to obtain builders bound to that world.
 *
 * Owner context: @sharpee/helpers (ADR-140; ADR-237 D1 — author-facing only,
 * no platform package may depend on this one)
 *
 * ADR-140 Amendment 1 retired the `WorldModel.prototype.helpers` augmentation.
 * `createHelpers(world)` is the only entry form: the prototype patch landed on
 * whichever copy of `@sharpee/world-model` the importer resolved, so it never
 * reached the engine's world across a bundle boundary (issue #146).
 *
 * @example
 * ```typescript
 * import { createHelpers } from '@sharpee/helpers';
 *
 * initializeWorld(world: WorldModel): void {
 *   const { room, object, actor } = createHelpers(world);
 *
 *   const kitchen = room('Kitchen')
 *     .description('A warm kitchen.')
 *     .build();
 * }
 * ```
 */

export { createHelpers, EntityHelpers } from './create-helpers.js';
export { RoomBuilder } from './builders/room.js';
export { ObjectBuilder } from './builders/object.js';
export { ContainerBuilder } from './builders/container.js';
export { ActorBuilder } from './builders/actor.js';
export { DoorBuilder } from './builders/door.js';
