/**
 * @sharpee/bridge - Native Engine Bridge Protocol (ADR-135)
 *
 * Defines the message types exchanged between a native host process
 * and a Sharpee engine running in a Node.js subprocess.
 *
 * Transport: newline-delimited JSON over stdin (host → engine)
 * and stdout (engine → host). Each message is a single JSON object
 * terminated by \n.
 *
 * All inbound messages are discriminated on `method`.
 * All outbound messages are discriminated on `type`.
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { ContextAction } from '@sharpee/if-domain';

/** Protocol version — bumped per ADR-135 versioning rules. */
export const BRIDGE_PROTOCOL_VERSION = '1.0.0';

// ─── Domain Event ────────────────────────────────────────────────

/**
 * A domain or platform event forwarded across the bridge.
 * Only `if.event.*` and `platform.*` events cross the bridge;
 * internal system/lifecycle events are filtered out.
 */
export interface DomainEvent {
  /** Event type, e.g. "if.event.actor_moved" or "platform.save_completed" */
  readonly type: string;
  /** Event-specific structured data */
  readonly data: Record<string, unknown>;
}

// ─── Client Capabilities (ADR-136) ──────────────────────────────

/**
 * Capabilities the host client declares when starting the engine.
 * The engine uses these to decide which optional output to produce.
 */
export interface ClientCapabilities {
  /** Client wants context-driven action menus (ADR-136) */
  readonly actionMenu?: boolean;

  /** Maximum actions the client can display per turn */
  readonly maxActions?: number;
}

// ─── Inbound Messages (host → engine via stdin) ─────────────────

/**
 * Start the engine.
 * Pass `bundle` for a .sharpee file path (play mode)
 * or `storyPath` for a .ts file path (authoring mode, compiled via esbuild).
 */
export interface StartMessage {
  readonly method: 'start';
  /** Path to a .sharpee bundle file (play mode) */
  readonly bundle?: string;
  /** Path to a .ts story file (authoring mode) */
  readonly storyPath?: string;
  /** Client capabilities for optional features */
  readonly capabilities?: ClientCapabilities;
}

/** Execute a player command. */
export interface CommandMessage {
  readonly method: 'command';
  /** Raw command text, e.g. "go north" */
  readonly text: string;
}

/** Request a save. Engine responds with platform.save_completed event. */
export interface SaveMessage {
  readonly method: 'save';
}

/** Restore from serialized save data. Engine responds with platform.restore_completed event. */
export interface RestoreMessage {
  readonly method: 'restore';
  /** Serialized save data (opaque string from a prior platform.save_completed event) */
  readonly data: string;
}

/** Shut down the engine process. */
export interface QuitMessage {
  readonly method: 'quit';
}

/** Union of all messages the host can send to the engine. */
export type InboundMessage =
  | StartMessage
  | CommandMessage
  | SaveMessage
  | RestoreMessage
  | QuitMessage;

// ─── Outbound Messages (engine → host via stdout) ───────────────

/**
 * Engine started, protocol version announced.
 * Sent once after the engine subprocess initializes.
 */
export interface ReadyMessage {
  readonly type: 'ready';
  /** Protocol version (semver) */
  readonly version: string;
}

/**
 * Structured text blocks from the text service (ADR-133).
 * Keyed by room.name, room.description, action.result, error,
 * or story-defined custom keys.
 */
export interface BlocksMessage {
  readonly type: 'blocks';
  /** Structured text blocks from this turn */
  readonly blocks: ReadonlyArray<ITextBlock>;
}

/**
 * Domain and platform events from this turn.
 * The bridge forwards if.event.* and platform.* types;
 * internal system/lifecycle events are filtered out.
 */
export interface EventsMessage {
  readonly type: 'events';
  /** Domain and platform events */
  readonly events: ReadonlyArray<DomainEvent>;
}

/**
 * Current player location and turn count.
 * Marks the end of a turn — the host should wait for this
 * before sending the next command.
 */
export interface StatusMessage {
  readonly type: 'status';
  /** Current room name */
  readonly location: string;
  /** Current turn count */
  readonly turn: number;
}

/** Engine error. */
export interface ErrorMessage {
  readonly type: 'error';
  /** Human-readable error message */
  readonly message: string;
}

/**
 * Available context actions this turn (ADR-136).
 * Sent after status when the client has declared actionMenu capability.
 * Clients that don't understand this message type ignore it.
 */
export interface ActionsMessage {
  readonly type: 'actions';
  /** Available actions, sorted by category then priority */
  readonly actions: ReadonlyArray<ContextAction>;
}

/** Engine shutting down. */
export interface ByeMessage {
  readonly type: 'bye';
}

/** Union of all messages the engine can send to the host. */
export type OutboundMessage =
  | ReadyMessage
  | BlocksMessage
  | EventsMessage
  | StatusMessage
  | ActionsMessage
  | ErrorMessage
  | ByeMessage;

// ─── Helpers ─────────────────────────────────────────────────────

/** All valid inbound method names. */
const INBOUND_METHODS = new Set<string>([
  'start', 'command', 'save', 'restore', 'quit',
]);

/** Type guard: is this parsed JSON an inbound message? */
export function isInboundMessage(data: unknown): data is InboundMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'method' in data &&
    typeof (data as InboundMessage).method === 'string' &&
    INBOUND_METHODS.has((data as InboundMessage).method)
  );
}

/**
 * Check whether an event type should cross the bridge.
 * Only if.event.* and platform.* events are forwarded.
 */
export function shouldForwardEvent(eventType: string): boolean {
  return eventType.startsWith('if.event.') || eventType.startsWith('platform.');
}
