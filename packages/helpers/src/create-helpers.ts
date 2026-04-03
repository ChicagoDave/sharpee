/**
 * createHelpers — factory that binds a world reference and returns
 * all entity builder functions.
 *
 * Public interface: createHelpers(world) => EntityHelpers
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */

import type { IWorldModel } from '@sharpee/world-model';
import { RoomBuilder } from './builders/room';
import { ObjectBuilder } from './builders/object';
import { ContainerBuilder } from './builders/container';
import { ActorBuilder } from './builders/actor';
import { DoorBuilder } from './builders/door';

/**
 * The set of builder factories returned by world.helpers().
 */
export interface EntityHelpers {
  /** Create a room entity */
  room(name: string): RoomBuilder;
  /** Create an object entity */
  object(name: string): ObjectBuilder;
  /** Create a container entity */
  container(name: string): ContainerBuilder;
  /** Create an actor entity (player or NPC) */
  actor(name: string): ActorBuilder;
  /** Create a door entity */
  door(name: string): DoorBuilder;
}

/**
 * Create a set of entity builder functions bound to a world reference.
 *
 * @param world - The IWorldModel to create entities in
 * @returns EntityHelpers with all builder factories
 */
export function createHelpers(world: IWorldModel): EntityHelpers {
  return {
    room: (name: string) => new RoomBuilder(world, name),
    object: (name: string) => new ObjectBuilder(world, name),
    container: (name: string) => new ContainerBuilder(world, name),
    actor: (name: string) => new ActorBuilder(world, name),
    door: (name: string) => new DoorBuilder(world, name),
  };
}
