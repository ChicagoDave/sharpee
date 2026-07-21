/**
 * RoomBuilder — fluent builder for room entities.
 *
 * Public interface: description, initialDescription, snippets, aliases,
 * addTrait, dark, build.
 *
 * Owner context: @sharpee/helpers (ADR-140)
 */

import {
  IFEntity,
  IdentityTrait,
  RoomTrait,
} from '@sharpee/world-model';
import type { IWorldModel, ITrait, SnippetMap } from '@sharpee/world-model';

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
  private _initialDescription?: string;
  private _snippets?: SnippetMap;
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
   * Set the first-visit description (ADR-196 Phase 4).
   *
   * Shown the first time the player looks at the room; on subsequent visits the
   * standard `description` is used instead. Populates `RoomTrait.initialDescription`.
   *
   * @param desc - First-visit room description text
   * @returns this (for chaining)
   */
  initialDescription(desc: string): this {
    this._initialDescription = desc;
    return this;
  }

  /**
   * Set the room's marker→snippet table (ADR-209).
   *
   * `{snippet:name}` markers in the room's `description` /
   * `initialDescription` are spliced from these entries at render time.
   * Populates `RoomTrait.snippets`; a room without a snippet map is never
   * scanned for markers.
   *
   * @param map - Marker name → snippet entry table
   * @returns this (for chaining)
   */
  snippets(map: SnippetMap): this {
    this._snippets = map;
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
    entity.add(new RoomTrait({
      requiresLight: this._isDark,
      initialDescription: this._initialDescription,
      snippets: this._snippets,
    }));
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
