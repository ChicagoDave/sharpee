# Text System

Text blocks, decorations, rendering.

---

### types

```typescript
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
 * // Decorated content (post ADR-174)
 * const decorated: TextContent = {
 *   className: 'sharpee-item',
 *   content: ['brass lantern']
 * };
 */
export type TextContent = string | IDecoration;
/**
 * Decorated content with a final, fully-resolved CSS class name.
 *
 * Per ADR-174, the bracket parser resolves bracketed names against a
 * closed platform vocabulary at parse time:
 *  - Platform names (e.g. `em`, `item`, `color-red`) become
 *    `sharpee-{name}` and are styled by the platform CSS bundle.
 *  - Author names pass through verbatim and the story owns their CSS.
 *
 * Renderers translate `IDecoration` to their target output (HTML span
 * for browser, ANSI for terminal, ignored for audio).
 *
 * @example
 * // Platform emphasis (resolved from `[em:carefully]`)
 * { className: 'sharpee-em', content: ['carefully'] }
 *
 * // Platform item name
 * { className: 'sharpee-item', content: ['brass lantern'] }
 *
 * // Author class
 * { className: 'thief-taunt', content: ["You'll regret this."] }
 *
 * // Nested decorations
 * { className: 'sharpee-item', content: [
 *   { className: 'sharpee-em', content: ['glowing'] },
 *   ' lantern'
 * ]}
 */
export interface IDecoration {
    /**
     * Final, fully-resolved CSS class name. Already prefixed with
     * `sharpee-` for platform-vocabulary names; bare for author names.
     * @see ADR-174 §Wire shape
     */
    readonly className: string;
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
 *   content: [{ className: 'sharpee-room', content: ['West of House'] }]
 * }
 *
 * // Action result with decorated item
 * {
 *   key: 'action.result',
 *   content: [
 *     'You take ',
 *     { className: 'sharpee-item', content: ['the brass lantern'] },
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
    /**
     * Visual continuation hint. When `true`, the renderer must collapse
     * the paragraph margin between this block and its predecessor so the
     * two lines appear flush (no inter-line gap beyond `line-height`).
     *
     * Used to express multi-line content where every line is its own
     * block (so blocks carry no intra-content `\n`), while preserving
     * the tight visual stacking that single-block-with-newlines used to
     * provide. Invariant: a `tight` block must not appear first in a
     * packet — the renderer relies on a predecessor to collapse against.
     */
    readonly tight?: boolean;
    /**
     * Optional semantic CSS class applied to the rendered element by the
     * browser main-channel renderer (in addition to `main-entry`). Used
     * for content with its own visual identity — game banner pieces
     * (`game-title`, `story-version`, `platform-version`, `sub-title`,
     * `author-list`, `banner-spacer`), and similar future categories.
     * Author classes (no `sharpee-` prefix) flow through unchanged so
     * stories can define their own.
     */
    readonly className?: string;
}
/**
 * Core block keys defined by the platform.
 * Stories can emit custom keys.
 */
export declare const CORE_BLOCK_KEYS: {
    /** Room title */
    readonly ROOM_NAME: "room.name";
    /** Room description */
    readonly ROOM_DESCRIPTION: "room.description";
    /** Items visible in room */
    readonly ROOM_CONTENTS: "room.contents";
    /** Action success result */
    readonly ACTION_RESULT: "action.result";
    /** Action blocked message */
    readonly ACTION_BLOCKED: "action.blocked";
    /** Current room (status bar) */
    readonly STATUS_ROOM: "status.room";
    /** Current score (status bar) */
    readonly STATUS_SCORE: "status.score";
    /** Turn count (status bar) */
    readonly STATUS_TURNS: "status.turns";
    /** System error */
    readonly ERROR: "error";
    /** Command prompt */
    readonly PROMPT: "prompt";
    /** Game/story message */
    readonly GAME_MESSAGE: "game.message";
    /** Game opening banner */
    readonly GAME_BANNER: "game.banner";
};
```

### guards

```typescript
/**
 * Type Guards for TextBlock types
 *
 * Utilities for safely working with TextContent, IDecoration, and ITextBlock.
 */
import type { TextContent, IDecoration, ITextBlock } from './types';
/**
 * Check if content is a decoration (not a plain string).
 *
 * @example
 * const content: TextContent = getContent();
 * if (isDecoration(content)) {
 *   console.log(content.className); // TypeScript knows this is IDecoration
 * }
 */
export declare function isDecoration(content: TextContent): content is IDecoration;
/**
 * Check if a value is a valid TextBlock.
 *
 * @example
 * if (isTextBlock(value)) {
 *   console.log(value.key);
 * }
 */
export declare function isTextBlock(value: unknown): value is ITextBlock;
/**
 * Check if a block key starts with a given prefix.
 *
 * @example
 * if (hasKeyPrefix(block, 'status.')) {
 *   // Render to status bar
 * }
 */
export declare function hasKeyPrefix(block: ITextBlock, prefix: string): boolean;
/**
 * Check if a block is a status block.
 */
export declare function isStatusBlock(block: ITextBlock): boolean;
/**
 * Check if a block is a room-related block.
 */
export declare function isRoomBlock(block: ITextBlock): boolean;
/**
 * Check if a block is an action-related block.
 */
export declare function isActionBlock(block: ITextBlock): boolean;
/**
 * Extract plain text from TextContent, stripping all decorations.
 *
 * @example
 * const text = extractPlainText([
 *   'You take ',
 *   { className: 'sharpee-item', content: ['the sword'] },
 *   '.'
 * ]);
 * // Returns: "You take the sword."
 */
export declare function extractPlainText(content: ReadonlyArray<TextContent>): string;
```

### index

```typescript
/**
 * @sharpee/text-blocks
 *
 * Pure interfaces for structured text output in Sharpee IF platform.
 *
 * This package contains only TypeScript interfaces and type guards -
 * no runtime dependencies. It defines the contract between TextService
 * and clients (CLI, React, etc.).
 *
 * @packageDocumentation
 * @see ADR-096: Text Service Architecture
 * @see ADR-091: Text Decorations
 */
export type { TextContent, IDecoration, ITextBlock } from './types.js';
export { CORE_BLOCK_KEYS } from './types.js';
export { CORE_BLOCK_KEYS as BLOCK_KEYS } from './types.js';
export { isDecoration, isTextBlock, hasKeyPrefix, isStatusBlock, isRoomBlock, isActionBlock, extractPlainText, } from './guards.js';
export declare const BLOCK_KEY_PREFIXES: {
    readonly STATUS: "status.";
    readonly ROOM: "room.";
    readonly ACTION: "action.";
};
```
