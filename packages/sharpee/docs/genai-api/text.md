# Text System

Text blocks, decorations, text service, rendering.

---

## @sharpee/text-blocks

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

## @sharpee/text-service

### text-service

```typescript
/**
 * Text Service
 *
 * Orchestrates the text output pipeline:
 * 1. Filter - remove system events
 * 2. Sort - order events for prose (ADR-094)
 * 3. Process - route to handlers
 * 4. Assemble - create ITextBlock with decorations
 *
 * Stateless transformer: events in, TextBlocks out.
 * Inspired by FyreVM channel I/O (2009).
 *
 * @see ADR-096 Text Service Architecture
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Text service interface (ADR-096)
 *
 * Stateless transformer: takes events, returns TextBlocks.
 * Engine calls processTurn() after each turn completes.
 */
export interface ITextService {
    /**
     * Process turn events and produce TextBlocks.
     * Called by Engine after turn completes.
     *
     * @param events - All events from this turn (including chained events)
     * @returns TextBlocks for client rendering
     */
    processTurn(events: ISemanticEvent[]): ITextBlock[];
}
/**
 * TextService implementation
 *
 * Orchestrates the pipeline: filter → sort → process → assemble
 */
export declare class TextService implements ITextService {
    private readonly languageProvider;
    constructor(languageProvider: LanguageProvider);
    processTurn(events: ISemanticEvent[]): ITextBlock[];
    /**
     * Route event to appropriate handler
     */
    private routeToHandler;
    /**
     * Process domain events that carry messageId directly (ADR-097).
     *
     * All stdlib actions use this pattern. Story actions that emit action.success
     * or action.blocked events fall through to the switch-case handlers below.
     *
     * @returns Text blocks if event has messageId. If the messageId doesn't resolve,
     *   emits a visible error block rather than silently producing nothing.
     */
    private tryProcessDomainEventMessage;
    /**
     * Handle if.event.implicit_take events
     * Produces "(first taking the X)" message
     */
    private handleImplicitTake;
    /**
     * Handle command.failed events
     * These occur when parsing or entity resolution fails
     */
    private handleCommandFailed;
    /**
     * Handle client.query events (disambiguation, confirmations, etc.)
     */
    private handleClientQuery;
    /**
     * Format a list of candidate names as natural English
     * e.g., "the red ball or the blue ball" or "the sword, the axe, or the knife"
     */
    private formatCandidateList;
}
/**
 * Create a TextService with the given LanguageProvider.
 * LanguageProvider supplies templates (standard + story-registered).
 *
 * @param languageProvider - Provider for template resolution
 * @returns Configured TextService instance
 */
export declare function createTextService(languageProvider: LanguageProvider): ITextService;
```

### stages/filter

```typescript
/**
 * Event filtering stage
 *
 * Filters out events that should not produce text output:
 * - System events (system.*)
 *
 * @see ADR-096 Text Service Architecture
 */
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Filter events that should produce text output
 */
export declare function filterEvents(events: ISemanticEvent[]): ISemanticEvent[];
```

### stages/sort

```typescript
/**
 * Event sorting stage
 *
 * Sorts events within each transaction for correct prose order:
 * 1. action.* events first (the main action result)
 * 2. Then by chainDepth (lower depth first)
 *
 * Events arrive from Engine in emission order, but prose requires:
 * - Action result first ("You open the chest.")
 * - Then consequences ("Inside you see...")
 *
 * @see ADR-094 Event Chaining
 * @see ADR-096 Text Service Architecture
 */
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Event data with chain metadata (ADR-094)
 */
interface ChainMetadata {
    _transactionId?: string;
    _chainDepth?: number;
    _chainedFrom?: string;
    _chainSourceId?: string;
}
/**
 * Sort events for correct prose order within transactions
 *
 * Uses stable sort to preserve order across different transactions.
 */
export declare function sortEventsForProse(events: ISemanticEvent[]): ISemanticEvent[];
/**
 * Extract chain metadata from event data
 */
export declare function getChainMetadata(event: ISemanticEvent): ChainMetadata;
export {};
```

### stages/assemble

```typescript
/**
 * Block assembly stage
 *
 * Creates ITextBlock from resolved text, parsing decorations.
 *
 * @see ADR-091 Text Decorations
 * @see ADR-096 Text Service Architecture
 */
import type { ITextBlock } from '@sharpee/text-blocks';
/**
 * Create a TextBlock, parsing decorations if present
 */
export declare function createBlock(key: string, text: string): ITextBlock;
/**
 * Extract value from provider function or direct value
 */
export declare function extractValue(value: unknown): string | null;
```

### handlers/types

```typescript
/**
 * Handler types for TextService
 *
 * @see ADR-096 Text Service Architecture
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Context passed to event handlers
 */
export interface HandlerContext {
    /** Language provider for template resolution */
    languageProvider?: LanguageProvider;
}
/**
 * Event handler function signature
 *
 * Handlers receive an event and context, return zero or more TextBlocks.
 */
export type EventHandler = (event: ISemanticEvent, context: HandlerContext) => ITextBlock[];
/**
 * Common event data with chain metadata (ADR-094)
 */
export interface ChainableEventData {
    _transactionId?: string;
    _chainDepth?: number;
    _chainedFrom?: string;
    _chainSourceId?: string;
}
/**
 * Generic event data with message fields
 */
export interface GenericEventData extends ChainableEventData {
    message?: string;
    messageId?: string;
    text?: string;
    [key: string]: unknown;
}
```

### handlers/room

```typescript
/**
 * Room description event handler
 *
 * Handles: if.event.room.description (standard format)
 * Also handles: if.event.room_description (legacy/alternate)
 *
 * Note: room.description uses a deliberate dot separator, unlike most
 * events which use underscores for compound words (e.g., actor_moved).
 *
 * @see ADR-096 Text Service Architecture
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Handle room description events
 *
 * Supports ADR-107 dual-mode: resolves message IDs through language provider
 * when present, otherwise uses literal text directly.
 */
export declare function handleRoomDescription(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### handlers/revealed

```typescript
/**
 * Revealed event handler
 *
 * Handles: if.event.revealed - when items become visible in a container
 *
 * @see ADR-094 Event Chaining
 * @see ADR-096 Text Service Architecture
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Handle if.event.revealed events
 */
export declare function handleRevealed(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### handlers/generic

```typescript
/**
 * Generic event handlers
 *
 * Handles: game.message, and fallback for unknown events
 *
 * @see ADR-096 Text Service Architecture
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Handle game.message events
 */
export declare function handleGameMessage(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
/**
 * Handle generic/unknown events using event.type as template key
 *
 * Many events (especially story-defined ones) follow a simple pattern:
 * - Event type is the template key
 * - Event data is the template params
 */
export declare function handleGenericEvent(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### decoration-parser

```typescript
/**
 * Decoration Parser — no-op passthrough.
 *
 * Per ADR-174, decoration parsing now lives in
 * `@sharpee/engine/src/prose-pipeline/decorations/parser.ts`. The
 * `text-service` package is in the process of being removed
 * (Phase 2 retires its remaining wire-production exports;
 * Phase 3 deletes the package). The block-production path inside
 * `text-service` no longer parses decorations — templates pass
 * through as a single plain-text `TextContent` entry.
 *
 * This shim exists so callers within `text-service.ts` and the
 * handler files keep compiling until Phase 1 sub-phase 1.4 ports
 * the handlers to engine. After Phase 1, no first-party caller
 * imports this function.
 *
 * Public interface: `parseDecorations(text)` returns `[text]` (or
 * `[]` for empty input). `hasDecorations(text)` returns `false`.
 *
 * Owner context: `@sharpee/text-service` — deprecated package.
 *
 * @see ADR-174 §Migration phasing
 */
import type { TextContent } from '@sharpee/text-blocks';
/**
 * No-op passthrough — wraps the input string as a single TextContent
 * entry. Bracket markup is no longer parsed here.
 */
export declare function parseDecorations(text: string): TextContent[];
/**
 * Always `false` post-ADR-174. Kept to preserve the export surface
 * during Phase 1; will be removed alongside the package in Phase 3.
 */
export declare function hasDecorations(_text: string): boolean;
```

### cli-renderer

```typescript
/**
 * CLI Renderer
 *
 * Renders ITextBlock[] to string output for CLI clients.
 * Supports optional ANSI color codes.
 *
 * @see ADR-096 Text Service Architecture
 */
import type { ITextBlock } from '@sharpee/text-blocks';
/**
 * CLI render options
 */
export interface CLIRenderOptions {
    /** Enable ANSI color codes (default: false) */
    ansi?: boolean;
    /** Separator between blocks (default: '\n\n') */
    blockSeparator?: string;
    /** Story-defined color mappings */
    colors?: Record<string, string>;
    /** Include status blocks in output (default: false) */
    includeStatus?: boolean;
}
/**
 * Render ITextBlock[] to string for CLI output.
 *
 * Uses smart joining: single newline between consecutive blocks of the same type,
 * double newline between different block types. This keeps related output together
 * (e.g., multiple "Taken" messages) while separating distinct sections.
 *
 * @example
 * const output = renderToString(blocks, { ansi: true });
 * console.log(output);
 */
export declare function renderToString(blocks: ITextBlock[], options?: CLIRenderOptions): string;
/**
 * Render status blocks to a single line (for status bar display).
 *
 * @example
 * const status = renderStatusLine(blocks);
 * // "West of House | Score: 0 | Turns: 1"
 */
export declare function renderStatusLine(blocks: ITextBlock[], options?: CLIRenderOptions): string;
```
