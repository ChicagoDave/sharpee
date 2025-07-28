/**
 * Meta action event handlers
 * 
 * Handles events for meta-game actions like waiting, scoring, help, etc.
 */

import { SemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';

/**
 * Handle waited event
 * 
 * This event is fired when a player waits/passes time.
 * Default behavior: Increment turn counter in shared data
 * 
 * Can be overridden to:
 * - Trigger time-based events (e.g., NPC movements, timed puzzles)
 * - Update atmospheric descriptions (e.g., sun setting)
 * - Advance story-specific timers
 */
export function handleWaited(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    turnsPassed: number;
    location?: string;
  };

  // Update turn counter
  // TODO: Implement shared data storage in WorldModel
  // const sharedData = world.getSharedData() || {};
  // const currentTurns = sharedData.turns || 0;
  // world.setSharedData({
  //   ...sharedData,
  //   turns: currentTurns + (data.turnsPassed || 1)
  // });

  // Default: Just advance time
  // Story authors can override to add time-based events
}

/**
 * Handle score_displayed event
 * 
 * This event is fired when a player checks their score.
 * Default behavior: No world state changes (display only)
 * 
 * Can be overridden to:
 * - Track how often player checks score
 * - Trigger achievements based on score milestones
 * - Update NPC reactions based on player progress
 */
export function handleScoreDisplayed(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    score: number;
    maxScore: number;
    moves: number;
    percentage?: number;
    rank?: string;
    achievements?: string[];
  };

  // Default: No state changes
  // This is primarily a display event
  
  // Could track score checks for analytics
  // TODO: Implement shared data storage in WorldModel
  // const sharedData = world.getSharedData() || {};
  // const scoreChecks = sharedData.scoreChecks || 0;
  // world.setSharedData({
  //   ...sharedData,
  //   scoreChecks: scoreChecks + 1
  // });
}

/**
 * Handle help_displayed event
 * 
 * This event is fired when a player requests help.
 * Default behavior: Mark help as requested in shared data
 * 
 * Can be overridden to:
 * - Track which help topics were viewed
 * - Adjust difficulty based on help usage
 * - Provide context-sensitive help
 */
export function handleHelpDisplayed(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    topic?: string;
    specificHelp?: boolean;
    generalHelp?: boolean;
    firstTime?: boolean;
    sections?: string[];
    hintsAvailable?: boolean;
  };

  // Mark that help has been requested
  // TODO: Implement shared data storage in WorldModel
  // if (data.firstTime) {
  //   const sharedData = world.getSharedData() || {};
  //   world.setSharedData({
  //     ...sharedData,
  //     helpRequested: true,
  //     firstHelpTime: Date.now()
  //   });
  // }

  // Track help topics if specific help requested
  // if (data.specificHelp && data.topic) {
  //   const sharedData = world.getSharedData() || {};
  //   const helpTopics = sharedData.helpTopics || [];
  //   if (!helpTopics.includes(data.topic)) {
  //     helpTopics.push(data.topic);
  //     world.setSharedData({
  //       ...sharedData,
  //       helpTopics
  //     });
  //   }
  // }
}

/**
 * Handle about_displayed event
 * 
 * This event is fired when a player requests game information.
 * Default behavior: Track that about was viewed
 * 
 * Can be overridden to:
 * - Unlock easter eggs for viewing credits
 * - Track completion statistics
 */
export function handleAboutDisplayed(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    title: string;
    author: string;
    version: string;
    releaseDate: string;
    description?: string;
    credits?: any;
    playTime?: number;
    sessionMoves?: number;
  };

  // Track that about/credits were viewed
  // TODO: Implement shared data storage in WorldModel
  // const sharedData = world.getSharedData() || {};
  // world.setSharedData({
  //   ...sharedData,
  //   aboutViewed: true,
  //   aboutViewedTime: Date.now()
  // });

  // Could unlock an achievement for viewing credits
  // Story authors can override to add easter eggs
}

/**
 * Register all meta action event handlers
 */
export function registerMetaHandlers(world: WorldModel): void {
  world.registerEventHandler('waited', handleWaited);
  world.registerEventHandler('score_displayed', handleScoreDisplayed);
  world.registerEventHandler('help_displayed', handleHelpDisplayed);
  world.registerEventHandler('about_displayed', handleAboutDisplayed);
}
