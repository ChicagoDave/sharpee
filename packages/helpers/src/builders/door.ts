/**
 * DoorBuilder — fluent builder for door entities.
 *
 * Public interface: description, aliases, between, openable, lockable, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */

import {
  IFEntity,
  IdentityTrait,
  DoorTrait,
  SceneryTrait,
  OpenableTrait,
  LockableTrait,
  RoomBehavior,
} from '@sharpee/world-model';
import type { IWorldModel, ITrait } from '@sharpee/world-model';
import { getOppositeDirection } from '@sharpee/world-model';
import type { DirectionType } from '@sharpee/world-model';

/**
 * Fluent builder for creating door entities.
 *
 * @example
 * ```typescript
 * const ironDoor = door('iron door')
 *   .description('A heavy iron door.')
 *   .between(room1, room2, Direction.NORTH)
 *   .openable({ isOpen: false })
 *   .lockable({ isLocked: true, keyId: ironKey.id })
 *   .build();
 * ```
 */
export class DoorBuilder {
  private _description?: string;
  private _aliases?: string[];
  private _room1?: IFEntity;
  private _room2?: IFEntity;
  private _direction?: DirectionType;
  private _openable?: { isOpen?: boolean };
  private _lockable?: { isLocked?: boolean; keyId?: string };
  private _traits: ITrait[] = [];

  constructor(
    private world: IWorldModel,
    private name: string,
  ) {}

  /**
   * Set the door description.
   *
   * @param desc - Door description text
   * @returns this (for chaining)
   */
  description(desc: string): this {
    this._description = desc;
    return this;
  }

  /**
   * Add name aliases.
   *
   * @param names - Alternative names
   * @returns this (for chaining)
   */
  aliases(...names: string[]): this {
    this._aliases = names;
    return this;
  }

  /**
   * Set the two rooms the door connects and the direction from room1 to room2.
   *
   * @param room1 - First room entity
   * @param room2 - Second room entity
   * @param direction - Direction from room1 to room2
   * @returns this (for chaining)
   */
  between(room1: IFEntity, room2: IFEntity, direction: DirectionType): this {
    this._room1 = room1;
    this._room2 = room2;
    this._direction = direction;
    return this;
  }

  /**
   * Add a custom trait to the entity.
   *
   * @param trait - Any ITrait instance
   * @returns this (for chaining)
   */
  addTrait(trait: ITrait): this {
    this._traits.push(trait);
    return this;
  }

  /**
   * Make the door openable.
   *
   * @param opts - Openable options
   * @returns this (for chaining)
   */
  openable(opts: { isOpen?: boolean } = {}): this {
    this._openable = opts;
    return this;
  }

  /**
   * Make the door lockable.
   *
   * @param opts - Lockable options
   * @returns this (for chaining)
   */
  lockable(opts: { isLocked?: boolean; keyId?: string } = {}): this {
    this._lockable = opts;
    return this;
  }

  /**
   * Create the door entity with configured traits and wire room exits.
   *
   * @returns The created IFEntity
   * @throws Error if between() was not called
   */
  build(): IFEntity {
    if (!this._room1 || !this._room2 || !this._direction) {
      throw new Error('DoorBuilder: .between(room1, room2, direction) is required before .build()');
    }

    const entity = this.world.createEntity(this.name, 'door');
    entity.add(new IdentityTrait({
      name: this.name,
      description: this._description,
      aliases: this._aliases,
    }));
    entity.add(new DoorTrait({
      room1: this._room1.id,
      room2: this._room2.id,
    }));
    entity.add(new SceneryTrait());
    entity.add(new OpenableTrait({ isOpen: this._openable?.isOpen ?? false }));

    if (this._lockable) {
      entity.add(new LockableTrait({
        isLocked: this._lockable.isLocked ?? true,
        ...(this._lockable.keyId ? { requiredKey: this._lockable.keyId } : {}),
      }));
    }

    for (const trait of this._traits) {
      entity.add(trait);
    }

    // Wire exits through the door
    const opposite = getOppositeDirection(this._direction);
    RoomBehavior.setExit(this._room1, this._direction, this._room2.id, entity.id);
    RoomBehavior.setExit(this._room2, opposite, this._room1.id, entity.id);

    // Place door in room1 for scope resolution
    this.world.moveEntity(entity.id, this._room1.id);

    return entity;
  }
}
