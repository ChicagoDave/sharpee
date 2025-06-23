/**
 * Forge - The fluent API layer for Sharpee
 * This provides the author-friendly interface that sits on top of the core Story class
 */

import { Story, createStory, StoryConfig } from '@sharpee/core/src/story';
import { SupportedLanguage } from '@sharpee/core/src/languages';
import { IFEntityType, Direction } from '@sharpee/core';
import { LocationBuilder, ItemBuilder, CharacterBuilder } from './builders';
import { ForgeStory } from './forge-story';

/**
 * Configuration for creating a forge-based story
 */
export interface ForgeConfig extends StoryConfig {
  /** Whether to enable debug mode */
  debug?: boolean;
  
  /** Custom template overrides */
  templates?: Record<string, string>;
}

/**
 * Fluent API for creating interactive fiction stories
 * This is the main entry point that authors will use
 */
export class Forge {
  private story: Story;
  private debug: boolean = false;
  private templates: Record<string, string> = {};
  private builtStory?: ForgeStory;

  constructor(config: ForgeConfig = {}) {
    this.story = createStory(config);
    this.debug = config.debug || false;
    this.templates = config.templates || {};
  }

  /**
   * Set the language for this story
   * Usage: forge().languageSet(US_EN)
   */
  languageSet(language: SupportedLanguage): this {
    this.story.languageSet(language);
    return this;
  }

  /**
   * Set the story title
   * Usage: forge().title("The Mysterious Key")
   */
  title(title: string): this {
    this.story.title(title);
    return this;
  }

  /**
   * Set the starting location
   * Usage: forge().startIn("library")
   */
  startIn(locationId: string): this {
    // Store this for when we build the story
    this.story.getWorld().setStartingRoom(locationId);
    return this;
  }

  /**
   * Create a room/location
   * Usage: forge().room("library").description("A dusty old library")
   */
  room(id: string): LocationBuilder {
    return new LocationBuilder(this, id);
  }

  /**
   * Create an item
   * Usage: forge().item("key").description("A brass key").takeable()
   */
  item(id: string): ItemBuilder {
    return new ItemBuilder(this, id);
  }

  /**
   * Create a character/NPC
   * Usage: forge().character("librarian").description("An old librarian")
   */
  character(id: string): CharacterBuilder {
    return new CharacterBuilder(this, id);
  }

  /**
   * Set a custom template
   * Usage: forge().template("item_taken", "You picked up {0}.")
   */
  template(key: string, template: string): this {
    this.templates[key] = template;
    return this;
  }

  /**
   * Get the underlying story instance
   */
  getStory(): Story {
    return this.story;
  }

  /**
   * Enable debug mode
   */
  enableDebug(): this {
    this.debug = true;
    return this;
  }

  /**
   * Build and return the runnable story
   */
  build(): ForgeStory {
    if (this.builtStory) {
      return this.builtStory;
    }

    // Apply any custom templates
    Object.entries(this.templates).forEach(([key, template]) => {
      // TODO: Apply templates to language instance
    });

    this.builtStory = new ForgeStory(this.story, { debug: this.debug });
    return this.builtStory;
  }

  /**
   * Build and start the story immediately
   * Usage: forge().languageSet(US_EN).title("My Story").room("start").description("...").build().start()
   */
  start(): ForgeStory {
    const builtStory = this.build();
    builtStory.start();
    return builtStory;
  }
}

/**
 * Create a new forge instance - the main entry point for authors
 * Usage: import { forge } from '@sharpee/forge'; const story = forge().languageSet(US_EN)...
 */
export function forge(config?: ForgeConfig): Forge {
  return new Forge(config);
}

/**
 * Export the main function as default for convenience
 */
export default forge;
