/**
 * ObjectBuilder — fluent builder for object entities.
 *
 * Public interface: description, aliases, in, scenery, lightSource,
 * skipValidation, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */

import {
  IFEntity,
  IdentityTrait,
  SceneryTrait,
  LightSourceTrait,
  AuthorModel,
} from '@sharpee/world-model';
import type { IWorldModel } from '@sharpee/world-model';

/**
 * Fluent builder for creating object entities.
 *
 * @example
 * ```typescript
 * const knife = object('bread knife')
 *   .description('A sharp bread knife.')
 *   .aliases('knife', 'blade')
 *   .in(kitchen)
 *   .build();
 * ```
 */
export class ObjectBuilder {
  private _description?: string;
  private _aliases?: string[];
  private _location?: IFEntity;
  private _scenery = false;
  private _lightSource?: { isLit?: boolean; fuelTurns?: number };
  private _skipValidation = false;

  constructor(
    private world: IWorldModel,
    private name: string,
  ) {}

  /**
   * Set the object description.
   *
   * @param desc - Object description text
   * @returns this (for chaining)
   */
  description(desc: string): this {
    this._description = desc;
    return this;
  }

  /**
   * Add name aliases for the object.
   *
   * @param names - Alternative names
   * @returns this (for chaining)
   */
  aliases(...names: string[]): this {
    this._aliases = names;
    return this;
  }

  /**
   * Place the object in a location.
   *
   * @param location - The entity to place this object in
   * @returns this (for chaining)
   */
  in(location: IFEntity): this {
    this._location = location;
    return this;
  }

  /**
   * Mark as scenery (non-portable).
   *
   * @returns this (for chaining)
   */
  scenery(): this {
    this._scenery = true;
    return this;
  }

  /**
   * Add light source trait.
   *
   * @param opts - Light source options
   * @returns this (for chaining)
   */
  lightSource(opts: { isLit?: boolean; fuelTurns?: number } = {}): this {
    this._lightSource = opts;
    return this;
  }

  /**
   * Bypass validation for placement (e.g., placing in closed containers).
   * Internally wraps the world in an AuthorModel.
   *
   * @returns this (for chaining)
   */
  skipValidation(): this {
    this._skipValidation = true;
    return this;
  }

  /**
   * Create the object entity with configured traits.
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

    if (this._scenery) {
      entity.add(new SceneryTrait());
    }

    if (this._lightSource) {
      entity.add(new LightSourceTrait(this._lightSource));
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
