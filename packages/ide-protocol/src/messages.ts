/**
 * messages.ts — the `sharpee messages` wire contract (ADR-333 D4a).
 *
 * Purpose: the platform's overridable standard-action messages, each with
 *   the ADR-255 alias a story writes in an `override message` block and the
 *   language pack's current template. Chord Writer's Play panel reads it once
 *   per project so a click on a platform-rendered paragraph can open a new
 *   override pre-filled with the pack's own text (ADR-333 D4a); the IDE has
 *   no other lossless source for either the alias or the template.
 * Public interface: MESSAGE_CATALOG_SCHEMA_VERSION, MessageCatalogEntry,
 *   MessageCatalog, isMessageCatalog.
 * Owner context: @sharpee/ide-protocol — the TS emitter (devkit
 *   `messages.ts`) imports these types directly (DEVARCH 8b); the Swift
 *   decoder checks `schemaVersion` and rejects unknown versions loudly.
 */

/** Version of the `sharpee messages` payload shape. Bump on any breaking change. */
export const MESSAGE_CATALOG_SCHEMA_VERSION = 1 as const;

/** One overridable platform message. */
export interface MessageCatalogEntry {
  /** The dotted platform message id the engine renders (`if.action.taking.taken`). */
  id: string;
  /** The ADR-255 alias a story writes (`taking-taken`). */
  alias: string;
  /** The language pack's raw template for the id, as registered. */
  template: string;
}

/** The catalog: every ADR-255 alias with its id and the pack's template, sorted by id. */
export interface MessageCatalog {
  schemaVersion: typeof MESSAGE_CATALOG_SCHEMA_VERSION;
  /** The pack's locale (`en-us`). */
  locale: string;
  messages: MessageCatalogEntry[];
}

/**
 * Structural guard for a decoded catalog.
 *
 * @param value any parsed JSON
 * @returns true when `value` is a `MessageCatalog` at the current schema version
 */
export function isMessageCatalog(value: unknown): value is MessageCatalog {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== MESSAGE_CATALOG_SCHEMA_VERSION) return false;
  if (typeof v.locale !== 'string') return false;
  if (!Array.isArray(v.messages)) return false;
  return v.messages.every(
    (m) =>
      typeof m === 'object' &&
      m !== null &&
      typeof (m as Record<string, unknown>).id === 'string' &&
      typeof (m as Record<string, unknown>).alias === 'string' &&
      typeof (m as Record<string, unknown>).template === 'string',
  );
}
