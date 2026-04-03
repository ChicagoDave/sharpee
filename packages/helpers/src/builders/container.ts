/**
 * ContainerBuilder — fluent builder for container entities.
 *
 * Public interface: description, aliases, in, openable, lockable,
 * skipValidation, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */

import {
  IFEntity,
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  LockableTrait,
  AuthorModel,
} from '@sharpee/world-model';
import type { IWorldModel } from '@sharpee/world-model';

/**
 * Fluent builder for creating container entities.
 *
 * @example
 * ```typescript
 * const chest = container('wooden chest')
 *   .description('A sturdy wooden chest.')
 *   .openable({ isOpen: false })
 *   .lockable({ isLocked: true, keyId: key.id })
 *   .in(treasureRoom)
 *   .build();
 * ```
 */
export class ContainerBuilder {
  private _description?: string;
  private _aliases?: string[];
  private _location?: IFEntity;
  private _openable?: { isOpen?: boolean };
  private _lockable?: { isLocked?: boolean; keyId?: string };
  private _skipValidation = false;

  constructor(
    private world: IWorldModel,
    private name: string,
  ) {}

  /**
   * Set the container description.
   *
   * @param desc - Container description text
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
   * Place the container in a location.
   *
   * @param location - The entity to place this container in
   * @returns this (for chaining)
   */
  in(location: IFEntity): this {
    this._location = location;
    return this;
  }

  /**
   * Make the container openable.
   *
   * @param opts - Openable options
   * @returns this (for chaining)
   */
  openable(opts: { isOpen?: boolean } = {}): this {
    this._openable = opts;
    return this;
  }

  /**
   * Make the container lockable.
   *
   * @param opts - Lockable options
   * @returns this (for chaining)
   */
  lockable(opts: { isLocked?: boolean; keyId?: string } = {}): this {
    this._lockable = opts;
    return this;
  }

  /**
   * Bypass validation for placement.
   *
   * @returns this (for chaining)
   */
  skipValidation(): this {
    this._skipValidation = true;
    return this;
  }

  /**
   * Create the container entity with configured traits.
   *
   * @returns The created IFEntity
   */
  build(): IFEntity {
    const entity = this.world.createEntity(this.name, 'object');
    entity.add(new IdentityTrait({
      name: this.name,
      description: this._description,
      aliases: this._aliases,
    }));
    entity.add(new ContainerTrait());

    if (this._openable) {
      entity.add(new OpenableTrait({ isOpen: this._openable.isOpen ?? true }));
    }

    if (this._lockable) {
      entity.add(new LockableTrait({
        isLocked: this._lockable.isLocked ?? false,
        ...(this._lockable.keyId ? { requiredKey: this._lockable.keyId } : {}),
      }));
    }

    if (this._location) {
      const mover = this._skipValidation
        ? new AuthorModel(this.world.getDataStore(), this.world)
        : this.world;
      mover.moveEntity(entity.id, this._location.id);
    }

    return entity;
  }
}
