/**
 * @sharpee/runtime - PostMessage Protocol
 *
 * Defines the message types exchanged between the Lantern parent frame
 * and the Sharpee runtime iframe.
 *
 * All messages are tagged unions discriminated on `type`.
 * Both directions use the `sharpee:` prefix to avoid collision
 * with other postMessage traffic.
 */

import type { ITextBlock } from '@sharpee/text-blocks';

// ─── Parent → Runtime (Inbound) ───────────────────────────────────

/**
 * Load and evaluate story code against the runtime.
 * The code string is eval'd in the iframe context where
 * window.Sharpee exposes the full engine API.
 *
 * The code must assign `window.SharpeeStory` to a Story-shaped object.
 */
export interface LoadStoryMessage {
  readonly type: 'sharpee:load-story';
  /** Story source code to eval — must set window.SharpeeStory */
  readonly code: string;
}

/**
 * Start the loaded story. Calls engine.start() which triggers
 * initializeWorld, creates the player, and runs the opening turn.
 */
export interface StartMessage {
  readonly type: 'sharpee:start';
}

/**
 * Send a player command to the engine.
 */
export interface CommandMessage {
  readonly type: 'sharpee:command';
  /** Raw command text, e.g. "go north" */
  readonly text: string;
}

/**
 * Restart the current story from scratch.
 */
export interface RestartMessage {
  readonly type: 'sharpee:restart';
}

/**
 * Request a save of the current game state.
 * The runtime responds with a SaveDataMessage containing the serialized state.
 */
export interface SaveMessage {
  readonly type: 'sharpee:save';
}

/**
 * Restore game state from a previous save.
 */
export interface RestoreMessage {
  readonly type: 'sharpee:restore';
  /** Serialized game state (opaque blob from a prior SaveDataMessage) */
  readonly data: string;
}

/** Union of all messages the parent frame can send to the runtime. */
export type InboundMessage =
  | LoadStoryMessage
  | StartMessage
  | CommandMessage
  | RestartMessage
  | SaveMessage
  | RestoreMessage;

// ─── Runtime → Parent (Outbound) ──────────────────────────────────

/**
 * Sent once when the runtime iframe has loaded and is ready to accept messages.
 */
export interface ReadyMessage {
  readonly type: 'sharpee:ready';
  /** Runtime version */
  readonly version: string;
}

/**
 * Story was successfully loaded (eval succeeded, Story object found).
 */
export interface StoryLoadedMessage {
  readonly type: 'sharpee:story-loaded';
  /** Story title from config */
  readonly title: string;
  /** Story author from config */
  readonly author: string | string[];
}

/**
 * Engine has started — the opening turn output follows as an OutputMessage.
 */
export interface StartedMessage {
  readonly type: 'sharpee:started';
}

/**
 * Text output from the engine after a command (or the opening turn).
 * Contains structured text blocks that Lantern can render however it wants.
 */
export interface OutputMessage {
  readonly type: 'sharpee:output';
  /** Structured text blocks from this turn */
  readonly blocks: ReadonlyArray<ITextBlock>;
}

/**
 * Status line update — sent after each turn.
 */
export interface StatusMessage {
  readonly type: 'sharpee:status';
  /** Current room name */
  readonly location: string;
  /** Current score (if scoring is enabled) */
  readonly score?: number;
  /** Current turn count */
  readonly turns?: number;
}

/**
 * Serialized save data in response to a SaveMessage.
 */
export interface SaveDataMessage {
  readonly type: 'sharpee:save-data';
  /** Serialized game state — opaque string, pass back to RestoreMessage */
  readonly data: string;
}

/**
 * Restore completed successfully.
 */
export interface RestoredMessage {
  readonly type: 'sharpee:restored';
}

/**
 * An error occurred in the runtime.
 */
export interface ErrorMessage {
  readonly type: 'sharpee:error';
  /** Error category */
  readonly category: 'load' | 'start' | 'command' | 'save' | 'restore' | 'unknown';
  /** Human-readable error message */
  readonly message: string;
  /** Optional stack trace (only in development) */
  readonly stack?: string;
}

/** Union of all messages the runtime can send to the parent frame. */
export type OutboundMessage =
  | ReadyMessage
  | StoryLoadedMessage
  | StartedMessage
  | OutputMessage
  | StatusMessage
  | SaveDataMessage
  | RestoredMessage
  | ErrorMessage;

// ─── Helpers ──────────────────────────────────────────────────────

/** All message types (both directions). */
export type RuntimeMessage = InboundMessage | OutboundMessage;

/** Type guard: is this MessageEvent data a Sharpee runtime message? */
export function isSharpeeMessage(data: unknown): data is RuntimeMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof (data as RuntimeMessage).type === 'string' &&
    (data as RuntimeMessage).type.startsWith('sharpee:')
  );
}

/** Type guard for inbound (parent → runtime) messages. */
export function isInboundMessage(data: unknown): data is InboundMessage {
  if (!isSharpeeMessage(data)) return false;
  const type = (data as RuntimeMessage).type;
  return (
    type === 'sharpee:load-story' ||
    type === 'sharpee:start' ||
    type === 'sharpee:command' ||
    type === 'sharpee:restart' ||
    type === 'sharpee:save' ||
    type === 'sharpee:restore'
  );
}

/** Type guard for outbound (runtime → parent) messages. */
export function isOutboundMessage(data: unknown): data is OutboundMessage {
  if (!isSharpeeMessage(data)) return false;
  const type = (data as RuntimeMessage).type;
  return (
    type === 'sharpee:ready' ||
    type === 'sharpee:story-loaded' ||
    type === 'sharpee:started' ||
    type === 'sharpee:output' ||
    type === 'sharpee:status' ||
    type === 'sharpee:save-data' ||
    type === 'sharpee:restored' ||
    type === 'sharpee:error'
  );
}
