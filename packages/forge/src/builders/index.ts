/**
 * Builder classes for the fluent API
 * These provide the chainable methods that make the authoring experience natural
 */

import { IFEntityType, IFEntity } from '@sharpee/core';
import { Forge } from './forge';

/**
 * Base builder class with common functionality
 */
abstract class BaseBuilder<T> {
  protected forge: Forge;
  protected id: string;
  protected entity: Partial<IFEntity>;

  constructor(forge: Forge, id: string, type: IFEntityType) {
    this.forge = forge;
    this.id = id;
    this.entity = {
      id,
      type,
      attributes: {
        name: id,
        description: '',
        visible: true
      },
      relationships: {}
    };
  }

  /**
   * Set the display name for this entity
   */
  name(name: string): T {
    this.entity.attributes!.name = name;
    return this as unknown as T;
  }

  /**
   * Set the description for this entity
   */
  description(description: string): T {
    this.entity.attributes!.description = description;
    return this as unknown as T;
  }

  /**
   * Set whether this entity is visible
   */
  visible(visible: boolean = true): T {
    this.entity.attributes!.visible = visible;
    return this as unknown as T;
  }

  /**
   * Set whether this entity is hidden (opposite of visible)
   */
  hidden(hidden: boolean = true): T {
    this.entity.attributes!.visible = !hidden;
    return this as unknown as T;
  }

  /**
   * Set a custom attribute
   */
  attribute<V>(key: string, value: V): T {
    this.entity.attributes![key] = value;
    return this as unknown as T;
  }

  /**
   * Return to the main forge instance
   */
  done(): Forge {
    // Add the entity to the world
    this.forge.getStory().getWorld().addEntity(this.entity as IFEntity);
    return this.forge;
  }
}

/**
 * Builder for locations/rooms
 */
export class LocationBuilder extends BaseBuilder<LocationBuilder> {
  constructor(forge: Forge, id: string) {
    super(forge, id, IFEntityType.ROOM);
  }

  /**
   * Make this location dark
   */
  dark(isDark: boolean = true): LocationBuilder {
    this.entity.attributes!.dark = isDark;
    return this;
  }

  /**
   * Add an exit from this location
   */
  exit(direction: string, targetLocationId: string): LocationBuilder {
    // Create a simple exit relationship
    if (!this.entity.relationships![direction]) {
      this.entity.relationships![direction] = [];
    }
    this.entity.relationships![direction].push(targetLocationId);
    return this;
  }

  /**
   * Add an item to this location
   */
  item(itemId: string): ItemBuilder {
    // Create the item and set its location
    const itemBuilder = new ItemBuilder(this.forge, itemId);
    itemBuilder.in(this.id);
    return itemBuilder;
  }

  /**
   * Add a character to this location
   */
  character(characterId: string): CharacterBuilder {
    // Create the character and set its location
    const characterBuilder = new CharacterBuilder(this.forge, characterId);
    characterBuilder.in(this.id);
    return characterBuilder;
  }

  /**
   * Add multiple exits at once
   */
  exits(exitMap: Record<string, string>): LocationBuilder {
    Object.entries(exitMap).forEach(([direction, target]) => {
      this.exit(direction, target);
    });
    return this;
  }
}

/**
 * Builder for items/things
 */
export class ItemBuilder extends BaseBuilder<ItemBuilder> {
  constructor(forge: Forge, id: string) {
    super(forge, id, IFEntityType.THING);
    
    // Set default item attributes
    this.entity.attributes!.takeable = true;
    this.entity.attributes!.portable = true;
  }

  /**
   * Make this item takeable by the player
   */
  takeable(canTake: boolean = true): ItemBuilder {
    this.entity.attributes!.takeable = canTake;
    this.entity.attributes!.portable = canTake;
    return this;
  }

  /**
   * Make this item fixed in place (not takeable)
   */
  fixed(): ItemBuilder {
    return this.takeable(false);
  }

  /**
   * Make this item a container
   */
  container(isOpen: boolean = false, canOpen: boolean = true): ItemBuilder {
    this.entity.attributes!.container = true;
    this.entity.attributes!.open = isOpen;
    this.entity.attributes!.openable = canOpen;
    return this;
  }

  /**
   * Make this item a surface (like a table)
   */
  surface(): ItemBuilder {
    this.entity.attributes!.supporter = true;
    return this;
  }

  /**
   * Set the weight of this item
   */
  weight(weight: number): ItemBuilder {
    this.entity.attributes!.weight = weight;
    return this;
  }

  /**
   * Add adjectives that can be used to refer to this item
   */
  adjectives(...adjectives: string[]): ItemBuilder {
    this.entity.attributes!.adjectives = adjectives;
    return this;
  }

  /**
   * Set the location of this item
   */
  in(locationId: string): ItemBuilder {
    this.entity.attributes!.location = locationId;
    return this;
  }

  /**
   * Make this item wearable
   */
  wearable(): ItemBuilder {
    this.entity.attributes!.wearable = true;
    return this;
  }

  /**
   * Make this item edible
   */
  edible(): ItemBuilder {
    this.entity.attributes!.edible = true;
    return this;
  }

  /**
   * Make this item a light source
   */
  lightSource(isLit: boolean = true): ItemBuilder {
    this.entity.attributes!.lightSource = true;
    this.entity.attributes!.lit = isLit;
    return this;
  }
}

/**
 * Builder for characters/NPCs
 */
export class CharacterBuilder extends BaseBuilder<CharacterBuilder> {
  constructor(forge: Forge, id: string) {
    super(forge, id, IFEntityType.PERSON);
    
    // Set default character attributes
    this.entity.attributes!.alive = true;
    this.entity.attributes!.proper = true; // Characters are usually proper nouns
  }

  /**
   * Set the location of this character
   */
  in(locationId: string): CharacterBuilder {
    this.entity.attributes!.location = locationId;
    return this;
  }

  /**
   * Make this character able to move around
   */
  mobile(canMove: boolean = true): CharacterBuilder {
    this.entity.attributes!.mobile = canMove;
    return this;
  }

  /**
   * Set conversation topics for this character
   */
  conversations(topics: Record<string, string>): CharacterBuilder {
    this.entity.attributes!.conversations = topics;
    return this;
  }

  /**
   * Add a single conversation topic
   */
  canTalkAbout(topic: string, response: string): CharacterBuilder {
    if (!this.entity.attributes!.conversations) {
      this.entity.attributes!.conversations = {};
    }
    this.entity.attributes!.conversations[topic] = response;
    return this;
  }

  /**
   * Set the character's initial greeting
   */
  greeting(greeting: string): CharacterBuilder {
    this.entity.attributes!.greeting = greeting;
    return this;
  }

  /**
   * Give this character an item
   */
  has(itemId: string): CharacterBuilder {
    // TODO: Implement inventory for characters
    return this;
  }

  /**
   * Make this character friendly or hostile
   */
  friendly(isFriendly: boolean = true): CharacterBuilder {
    this.entity.attributes!.friendly = isFriendly;
    return this;
  }
}
