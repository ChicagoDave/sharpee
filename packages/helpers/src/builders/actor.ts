/**
 * ActorBuilder — fluent builder for actor entities.
 *
 * Public interface: description, aliases, properName, inventory, in,
 * skipValidation, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */

import {
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  AuthorModel,
} from '@sharpee/world-model';
import type { IWorldModel, ITrait } from '@sharpee/world-model';

/**
 * Fluent builder for creating actor entities (players and NPCs).
 *
 * @example
 * ```typescript
 * const player = actor('yourself')
 *   .description('As good-looking as ever.')
 *   .aliases('self', 'me', 'myself')
 *   .properName()
 *   .inventory({ maxItems: 10 })
 *   .build();
 * ```
 */
export class ActorBuilder {
  private _description?: string;
  private _aliases?: string[];
  private _properName = false;
  private _inventory?: { maxItems?: number };
  private _location?: IFEntity;
  private _skipValidation = false;
  private _traits: ITrait[] = [];

  constructor(
    private world: IWorldModel,
    private name: string,
  ) {}

  /**
   * Set the actor description.
   *
   * @param desc - Actor description text
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
   * Mark as a proper name (no article).
   *
   * @returns this (for chaining)
   */
  properName(): this {
    this._properName = true;
    return this;
  }

  /**
   * Add inventory capacity (adds ContainerTrait).
   *
   * @param opts - Inventory options
   * @returns this (for chaining)
   */
  inventory(opts: { maxItems?: number } = {}): this {
    this._inventory = opts;
    return this;
  }

  /**
   * Place the actor in a location.
   *
   * @param location - The entity to place this actor in
   * @returns this (for chaining)
   */
  in(location: IFEntity): this {
    this._location = location;
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
   * Bypass validation for placement.
   *
   * @returns this (for chaining)
   */
  skipValidation(): this {
    this._skipValidation = true;
    return this;
  }

  /**
   * Create the actor entity with configured traits.
   *
   * @returns The created IFEntity
   */
  build(): IFEntity {
    const entity = this.world.createEntity(this.name, 'actor');
    entity.add(new ActorTrait());
    entity.add(new IdentityTrait({
      name: this.name,
      description: this._description,
      aliases: this._aliases,
      properName: this._properName,
      article: this._properName ? '' : undefined,
    }));

    if (this._inventory) {
      entity.add(new ContainerTrait({
        capacity: this._inventory.maxItems ? { maxItems: this._inventory.maxItems } : undefined,
      }));
    }

    for (const trait of this._traits) {
      entity.add(trait);
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
