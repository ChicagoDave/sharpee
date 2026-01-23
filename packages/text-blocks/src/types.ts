/**
 * @sharpee/text-blocks
 *
 * Pure interfaces for structured text output.
 * No runtime dependencies - types only.
 *
 * @see ADR-096: Text Service Architecture
 * @see ADR-091: Text Decorations
 */

/**
 * Content within a text block - either plain string or decorated content.
 *
 * @example
 * // Plain text
 * const plain: TextContent = "You take the sword.";
 *
 * // Decorated content
 * const decorated: TextContent = {
 *   type: 'item',
 *   content: ['brass lantern']
 * };
 */
export type TextContent = string | IDecoration;

/**
 * Decorated content with semantic type.
 *
 * The `type` field is an open string to support:
 * - Core types: 'em', 'strong', 'item', 'room', 'npc', 'command', 'direction'
 * - Presentational: 'underline', 'strikethrough', 'super', 'sub'
 * - Story-defined: 'photopia.red', 'dungeo.thief', etc.
 *
 * @example
 * // Emphasis
 * { type: 'em', content: ['carefully'] }
 *
 * // Item name
 * { type: 'item', content: ['brass lantern'] }
 *
 * // Nested decorations
 * { type: 'item', content: [
 *   { type: 'em', content: ['glowing'] },
 *   ' lantern'
 * ]}
 *
 * // Story-defined color (Photopia pattern)
 * { type: 'photopia.red', content: ['The light was red, like always.'] }
 */
export interface IDecoration {
  /**
   * Semantic type of the decoration.
   * Open string to allow story extensions.
   */
  readonly type: string;

  /**
   * Content within the decoration.
   * Can contain nested decorations or plain strings.
   */
  readonly content: ReadonlyArray<TextContent>;
}

/**
 * A block of text output with semantic key (channel).
 *
 * Keys act as channels (FyreVM pattern). Clients route blocks by key:
 * - `room.name` - Room title
 * - `room.description` - Room description
 * - `room.contents` - Items in room
 * - `action.result` - Action outcome
 * - `action.blocked` - Why action failed
 * - `status.room` - Current location (status bar)
 * - `status.score` - Current score (status bar)
 * - `status.turns` - Turn count (status bar)
 * - `error` - System errors
 * - `prompt` - Command prompt
 * - Story-defined keys: 'dungeo.thief.taunt', etc.
 *
 * @example
 * // Room name block
 * {
 *   key: 'room.name',
 *   content: [{ type: 'room', content: ['West of House'] }]
 * }
 *
 * // Action result with decorated item
 * {
 *   key: 'action.result',
 *   content: [
 *     'You take ',
 *     { type: 'item', content: ['the brass lantern'] },
 *     '.'
 *   ]
 * }
 *
 * // Status bar block
 * {
 *   key: 'status.score',
 *   content: ['42']
 * }
 */
export interface ITextBlock {
  /**
   * Semantic key identifying the block type/channel.
   * Clients route blocks to UI regions based on key prefix.
   */
  readonly key: string;

  /**
   * Block content - array of plain strings and decorations.
   */
  readonly content: ReadonlyArray<TextContent>;
}

/**
 * Core decoration types defined by the platform.
 * Stories can extend with custom types.
 */
export const CORE_DECORATION_TYPES = {
  /** Emphasis (typically italic) */
  EM: 'em',
  /** Strong emphasis (typically bold) */
  STRONG: 'strong',
  /** Item/object name */
  ITEM: 'item',
  /** Room/location name */
  ROOM: 'room',
  /** NPC/character name */
  NPC: 'npc',
  /** Suggested command */
  COMMAND: 'command',
  /** Exit direction */
  DIRECTION: 'direction',
  /** Underlined text */
  UNDERLINE: 'underline',
  /** Struck-through text */
  STRIKETHROUGH: 'strikethrough',
  /** Superscript */
  SUPER: 'super',
  /** Subscript */
  SUB: 'sub',
} as const;

/**
 * Core block keys defined by the platform.
 * Stories can emit custom keys.
 */
export const CORE_BLOCK_KEYS = {
  /** Room title */
  ROOM_NAME: 'room.name',
  /** Room description */
  ROOM_DESCRIPTION: 'room.description',
  /** Items visible in room */
  ROOM_CONTENTS: 'room.contents',
  /** Action success result */
  ACTION_RESULT: 'action.result',
  /** Action blocked message */
  ACTION_BLOCKED: 'action.blocked',
  /** Current room (status bar) */
  STATUS_ROOM: 'status.room',
  /** Current score (status bar) */
  STATUS_SCORE: 'status.score',
  /** Turn count (status bar) */
  STATUS_TURNS: 'status.turns',
  /** System error */
  ERROR: 'error',
  /** Command prompt */
  PROMPT: 'prompt',
  /** Game/story message */
  GAME_MESSAGE: 'game.message',
  /** Game opening banner */
  GAME_BANNER: 'game.banner',
} as const;
