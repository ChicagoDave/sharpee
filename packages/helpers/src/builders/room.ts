/**
 * RoomBuilder — fluent builder for room entities.
 *
 * Public interface: description, aliases, dark, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */

import {
  IFEntity,
  IdentityTrait,
  RoomTrait,
} from '@sharpee/world-model';
import type { IWorldModel, ITrait } from '@sharpee/world-model';

/**
 * Fluent builder for creating room entities.
 *
 * @example
 * ```typescript
 * const kitchen = room('Kitchen')
 *   .description('A warm kitchen.')
 *   .build();
 * ```
 */
export class RoomBuilder {
  private _description?: string;
  private _aliases?: string[];
  private _isDark = false;
  private _traits: ITrait[] = [];

  constructor(
    private world: IWorldModel,
    private name: string,
  ) {}

  /**
   * Set the room description.
   *
   * @param desc - Room description text
   * @returns this (for chaining)
   */
  description(desc: string): this {
    this._description = desc;
    return this;
  }

  /**
   * Add name aliases for the room.
   *
   * @param names - Alternative names
   * @returns this (for chaining)
   */
  aliases(...names: string[]): this {
    this._aliases = names;
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
   * Mark the room as dark (requires a light source to see).
   *
   * @returns this (for chaining)
   */
  dark(): this {
    this._isDark = true;
    return this;
  }

  /**
   * Create the room entity with configured traits.
   *
   * @returns The created IFEntity
   */
  build(): IFEntity {
    const entity = this.world.createEntity(this.name, 'room');
    entity.add(new RoomTrait({ isDark: this._isDark }));
    entity.add(new IdentityTrait({
      name: this.name,
      description: this._description,
      aliases: this._aliases,
    }));
    for (const trait of this._traits) {
      entity.add(trait);
    }
    return entity;
  }
}
