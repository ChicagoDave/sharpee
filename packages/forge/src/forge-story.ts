/**
 * ForgeStory - A running story instance created by the Forge layer
 * This wraps the core Story class and provides high-level methods for interaction
 */

import { Story } from '@sharpee/core/src/story';

export interface ForgeStoryOptions {
  debug?: boolean;
}

/**
 * A story instance that can be run and interacted with
 */
export class ForgeStory {
  private story: Story;
  private debug: boolean;
  private started: boolean = false;
  private turnCount: number = 0;

  constructor(story: Story, options: ForgeStoryOptions = {}) {
    this.story = story;
    this.debug = options.debug || false;
  }

  /**
   * Start the story
   */
  start(): this {
    if (this.started) {
      throw new Error('Story has already been started');
    }
    
    this.story.start();
    this.started = true;
    
    if (this.debug) {
      console.log('ForgeStory: Started');
    }
    
    return this;
  }

  /**
   * Process a player command
   * @param command The command text from the player
   * @returns The result of processing the command
   */
  processCommand(command: string): any {
    if (!this.started) {
      throw new Error('Story must be started before processing commands');
    }
    
    this.turnCount++;
    
    if (this.debug) {
      console.log(`ForgeStory: Turn ${this.turnCount} - Processing: "${command}"`);
    }
    
    try {
      const result = this.story.parse(command);
      
      if (this.debug) {
        console.log('ForgeStory: Parse result:', result);
      }
      
      return result;
    } catch (error) {
      if (this.debug) {
        console.error('ForgeStory: Error processing command:', error);
      }
      throw error;
    }
  }

  /**
   * Get the current turn number
   */
  getTurnCount(): number {
    return this.turnCount;
  }

  /**
   * Check if the story has been started
   */
  isStarted(): boolean {
    return this.started;
  }

  /**
   * Get the story title
   */
  getTitle(): string | undefined {
    return this.story.getTitle();
  }

  /**
   * Get a formatted message in the current language
   */
  getMessage(key: string, ...params: any[]): string {
    return this.story.getMessage(key, ...params);
  }

  /**
   * Get the underlying core story instance
   */
  getCoreStory(): Story {
    return this.story;
  }

  /**
   * Save the current state (placeholder for future implementation)
   */
  save(): string {
    // TODO: Implement save functionality
    if (this.debug) {
      console.log('ForgeStory: Save requested (not yet implemented)');
    }
    return JSON.stringify({
      turnCount: this.turnCount,
      started: this.started,
      timestamp: Date.now()
    });
  }

  /**
   * Load a saved state (placeholder for future implementation)
   */
  load(saveData: string): this {
    // TODO: Implement load functionality
    if (this.debug) {
      console.log('ForgeStory: Load requested (not yet implemented)');
    }
    const data = JSON.parse(saveData);
    this.turnCount = data.turnCount || 0;
    this.started = data.started || false;
    return this;
  }
}
