/**
 * TextBlock Types
 *
 * Core interfaces for Sharpee's text output system.
 * Inspired by FyreVM channel I/O (2009, David Cornelson/Tara McGrew/Jeff Panici).
 *
 * These interfaces define the contract between:
 * - TextService (produces ITextBlock[])
 * - Clients (consume ITextBlock[] and render)
 *
 * @see ADR-096 Text Service Architecture
 */

/**
 * Content within a text block.
 * Either a plain string or decorated content with semantic type.
 */
export type TextContent = string | IDecoration;

/**
 * Decorated content with semantic type.
 *
 * Type is an open string to support:
 * - Core types: 'em', 'strong', 'item', 'room', 'npc', 'command', 'direction'
 * - Presentational: 'underline', 'strikethrough', 'super', 'sub'
 * - Story-defined: 'photopia.red', 'mystory.custom', etc.
 *
 * @example
 * // Emphasis
 * { type: 'em', content: ['brightly'] }
 *
 * // Item name
 * { type: 'item', content: ['brass lantern'] }
 *
 * // Story-defined color
 * { type: 'photopia.red', content: ['The light was red.'] }
 *
 * // Nested decorations
 * { type: 'item', content: [{ type: 'em', content: ['glowing'] }, ' lantern'] }
 */
export interface IDecoration {
  readonly type: string;
  readonly content: ReadonlyArray<TextContent>;
}

/**
 * A block of text output with semantic key (channel).
 *
 * Keys act as channels (FyreVM pattern). Clients route blocks by key prefix:
 * - 'room.*' → main transcript (styled as room info)
 * - 'action.*' → main transcript
 * - 'status.*' → status bar slots
 * - 'error' → main transcript (error styling)
 * - 'prompt' → input area
 * - '{story}.*' → story-defined, default to transcript
 *
 * @example
 * // Room description
 * {
 *   key: 'room.description',
 *   content: ['You are in a dark cave.']
 * }
 *
 * // Action result with decoration
 * {
 *   key: 'action.result',
 *   content: [
 *     'You take ',
 *     { type: 'item', content: ['the brass lantern'] },
 *     '.'
 *   ]
 * }
 *
 * // Status bar element
 * {
 *   key: 'status.room',
 *   content: [{ type: 'room', content: ['West of House'] }]
 * }
 */
export interface ITextBlock {
  readonly key: string;
  readonly content: ReadonlyArray<TextContent>;
}

/**
 * Core decoration types (conventions, not constraints).
 * Stories can define additional types.
 */
export const CORE_DECORATION_TYPES = {
  // Emphasis
  EM: 'em',
  STRONG: 'strong',

  // Semantic
  ITEM: 'item',
  ROOM: 'room',
  NPC: 'npc',
  COMMAND: 'command',
  DIRECTION: 'direction',

  // Presentational
  UNDERLINE: 'underline',
  STRIKETHROUGH: 'strikethrough',
  SUPER: 'super',
  SUB: 'sub',
} as const;

/**
 * Core block key prefixes (conventions).
 */
export const BLOCK_KEY_PREFIXES = {
  ROOM: 'room.',
  ACTION: 'action.',
  STATUS: 'status.',
  GAME: 'game.',
} as const;

/**
 * Standard block keys.
 */
export const BLOCK_KEYS = {
  // Room
  ROOM_NAME: 'room.name',
  ROOM_DESCRIPTION: 'room.description',
  ROOM_CONTENTS: 'room.contents',

  // Action
  ACTION_RESULT: 'action.result',
  ACTION_BLOCKED: 'action.blocked',

  // Status
  STATUS_ROOM: 'status.room',
  STATUS_SCORE: 'status.score',
  STATUS_TURNS: 'status.turns',

  // System
  ERROR: 'error',
  PROMPT: 'prompt',
  GAME_MESSAGE: 'game.message',
} as const;
