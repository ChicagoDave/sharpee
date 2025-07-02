/**
 * Language provider interface for Interactive Fiction
 * 
 * Defines how language packages provide text generation for the IF system.
 * Language providers handle all user-facing text, keeping it separate from game logic.
 */

import { SemanticEvent } from '@sharpee/core';
import { IFEntity } from '@sharpee/world-model';

/**
 * Message context for text generation
 */
export interface MessageContext {
  /**
   * The event being described
   */
  event: SemanticEvent;
  
  /**
   * The player entity
   */
  player: IFEntity;
  
  /**
   * Current location of the player
   */
  currentLocation: IFEntity;
  
  /**
   * Get an entity by ID
   */
  getEntity(id: string): IFEntity | undefined;
  
  /**
   * Format an entity name appropriately
   */
  formatEntity(entity: IFEntity): string;
}

/**
 * Text formatting options
 */
export interface FormatOptions {
  /**
   * Whether to capitalize the first letter
   */
  capitalize?: boolean;
  
  /**
   * Whether to include articles (a, an, the)
   */
  includeArticle?: boolean;
  
  /**
   * Perspective for pronouns (first, second, third)
   */
  perspective?: 'first' | 'second' | 'third';
  
  /**
   * Tense for verbs
   */
  tense?: 'past' | 'present' | 'future';
}

/**
 * Language provider interface
 * 
 * Implementations provide text generation for specific languages
 */
export interface IFLanguageProvider {
  /**
   * Language code (e.g., 'en-US', 'es-ES')
   */
  readonly languageCode: string;
  
  /**
   * Language name (e.g., 'English (US)', 'Español')
   */
  readonly languageName: string;
  
  /**
   * Generate text for a semantic event
   * 
   * @param context Message context with event and world info
   * @param options Formatting options
   * @returns Generated text or undefined if not handled
   */
  generateEventText(
    context: MessageContext, 
    options?: FormatOptions
  ): string | undefined;
  
  /**
   * Get the display name for an entity
   * 
   * @param entity The entity to name
   * @param options Formatting options
   */
  getEntityName(
    entity: IFEntity, 
    options?: FormatOptions
  ): string;
  
  /**
   * Get the description for an entity
   * 
   * @param entity The entity to describe
   */
  getEntityDescription(entity: IFEntity): string | undefined;
  
  /**
   * Format a list of items grammatically
   * 
   * @param items Array of item names
   * @param conjunction Word to use before last item ('and', 'or')
   */
  formatList(
    items: string[], 
    conjunction?: string
  ): string;
  
  /**
   * Get standard message by key
   * 
   * @param key Message key (e.g., 'already_open', 'not_visible')
   * @param params Parameters for message formatting
   */
  getMessage(
    key: string, 
    params?: Record<string, any>
  ): string;
  
  /**
   * Get command syntax help
   * 
   * @param actionId Action identifier
   */
  getCommandHelp(actionId: string): string | undefined;
  
  /**
   * Get all command patterns for parsing
   */
  getCommandPatterns(): CommandPattern[];
}

/**
 * Command pattern for parsing
 */
export interface CommandPattern {
  /**
   * Action this pattern triggers
   */
  actionId: string;
  
  /**
   * Regular expression pattern
   */
  pattern: RegExp;
  
  /**
   * Example usage
   */
  example: string;
  
  /**
   * Priority for disambiguation (higher = preferred)
   */
  priority?: number;
}

/**
 * Standard message keys
 */
export const MessageKeys = {
  // Movement
  NO_EXIT_THAT_WAY: 'no_exit_that_way',
  DOOR_CLOSED: 'door_closed',
  DOOR_LOCKED: 'door_locked',
  TOO_DARK: 'too_dark',
  
  // Object manipulation
  ALREADY_HAVE: 'already_have',
  NOT_HELD: 'not_held',
  TAKEN: 'taken',
  DROPPED: 'dropped',
  CANT_TAKE_SELF: 'cant_take_self',
  CANT_TAKE_ROOM: 'cant_take_room',
  FIXED_IN_PLACE: 'fixed_in_place',
  
  // Visibility
  NOT_VISIBLE: 'not_visible',
  NOT_REACHABLE: 'not_reachable',
  
  // Containers
  CONTAINER_FULL: 'container_full',
  CONTAINER_EMPTY: 'container_empty',
  NOT_A_CONTAINER: 'not_a_container',
  ALREADY_OPEN: 'already_open',
  ALREADY_CLOSED: 'already_closed',
  NOT_OPENABLE: 'not_openable',
  
  // General
  NO_TARGET: 'no_target',
  CANT_DO_THAT: 'cant_do_that',
  NOTHING_HAPPENS: 'nothing_happens',
  OK: 'ok'
} as const;

export type StandardMessageKeyId = typeof MessageKeys[keyof typeof MessageKeys];
