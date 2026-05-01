/**
 * @sharpee/channel-service — producer-side types
 *
 * Owner context: platform package. These types do NOT cross the wire —
 * they are internal to the producer (channel-service) and shape how
 * `ITextBlock` and `ISemanticEvent` instances route to channel emissions.
 *
 * @see ADR-163 — Channel-Service Platform — decision 12, §7
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';

/**
 * Source-input union for `ChannelRule` evaluation. A rule's predicate
 * matches either an `ITextBlock` (engine narrative output) or an
 * `ISemanticEvent` (engine media / domain events). The producer
 * dispatches blocks and events through the rule chain in two passes;
 * a rule's predicate fields determine which input source it applies to.
 */
export type ChannelRuleInput = ITextBlock | ISemanticEvent;

/**
 * Predicate clause for a `ChannelRule` (ADR-163 §12).
 *
 * **Block-source predicates** (one applies):
 *   `key | keyPattern | keyPrefix | decoration | custom`
 *
 * **Event-source predicates** (one applies):
 *   `eventType | eventTypePrefix | customEvent`
 *
 * Block-source and event-source predicates are mutually exclusive at
 * the rule level: a rule with `key` set is a block rule; a rule with
 * `eventType` set is an event rule. Mixing both in one rule is a
 * configuration error — the producer treats it as an event rule and
 * ignores the block fields, but stories should not rely on that.
 *
 * Within a source, the first set field decides applicability (precedence
 * order matches the listing above).
 */
export interface ChannelRuleWhen {
  // ─── Block-source predicates ───────────────────────────────────────

  /** Exact match against `block.key`. */
  readonly key?: string;
  /** Pattern match against `block.key`. */
  readonly keyPattern?: string | RegExp;
  /**
   * Sugar for a `keyPattern` rooted at this prefix. A rule with
   * `keyPrefix: 'room.'` matches `room.name`, `room.description`, etc.
   */
  readonly keyPrefix?: string;
  /**
   * Match if any content node carries this decoration type. Useful for
   * routing decorated content (e.g., `{ type: 'item' }`) to a custom
   * channel without depending on a specific block key.
   */
  readonly decoration?: string;
  /**
   * Escape hatch: arbitrary block predicate. Stories use this for
   * registration-specific routing logic that doesn't fit the simpler
   * forms above. Side-effect-free — called repeatedly during
   * `produceTurnPacket`.
   */
  readonly custom?: (block: ITextBlock) => boolean;

  // ─── Event-source predicates (Phase 2, ADR-163 §7) ─────────────────

  /** Exact match against `event.type` (e.g., `'media.image.show'`). */
  readonly eventType?: string;
  /**
   * Prefix match against `event.type` (e.g., `'media.image.'` matches
   * both `media.image.show` and `media.image.hide`).
   */
  readonly eventTypePrefix?: string;
  /**
   * Escape hatch: arbitrary event predicate. Side-effect-free.
   */
  readonly customEvent?: (event: ISemanticEvent) => boolean;
}

/**
 * Extractor strategy for the value carried into the channel payload
 * (ADR-163 §12, §7).
 *
 * **Block-source extracts** (valid when the rule matched a block):
 * - `'content'` — pass through `block.content` as `TextContent[]`.
 *   Used by the platform's `main` channel so decorations survive.
 * - `'string'` — flatten `block.content` to a plain string.
 * - `'number'` — flatten then `parseInt`.
 *
 * **Event-source extracts** (valid when the rule matched an event):
 * - `'payload'` — pass through `event.data` (the engine-emitted payload
 *   record). Used by media rules to forward the original event payload
 *   to the channel without alteration. The engine is responsible for
 *   the payload shape; the platform only routes it.
 * - `'eventType'` — emit `event.type` as a string. Useful for
 *   distinguishing show/hide on a single channel where the channel
 *   value carries the action verb.
 *
 * **Function** — author-supplied projection. Receives the matched input
 * (block or event); side-effect-free. Returning `null` or `undefined`
 * tells the producer to drop the contribution rather than write a
 * malformed value to the wire.
 */
export type ChannelRuleExtract =
  | 'content'
  | 'string'
  | 'number'
  | 'payload'
  | 'eventType'
  | ((input: ChannelRuleInput) => unknown);

/**
 * Channel-id resolver for `ChannelRuleEmit.channel`. Either a static
 * id string (the rule always emits to the same channel) or a function
 * deriving the id from the matched input. Used by media routing for
 * dynamic channel ids — `image:<layer>` and `ambient:<id>` per
 * ADR-163 §7 — where the suffix lives in the event payload.
 *
 * The resolver runs after the predicate matched, so it can assume the
 * input shape its rule expects. Returning a channel id that is not
 * registered in the session causes the producer to drop the
 * contribution silently (the rule is inert).
 */
export type ChannelRuleChannelResolver =
  | string
  | ((input: ChannelRuleInput) => string);

/**
 * Emit clause for a `ChannelRule` (ADR-163 §12, §7).
 */
export interface ChannelRuleEmit {
  /**
   * Target channel id. Either a static string or a function deriving
   * the id from the matched input (used by media routing for
   * `image:<layer>` and `ambient:<id>` per §7). The resolved id must
   * reference a registered `ChannelDefinition` by the time
   * `produceCmgtManifest` is called; an unregistered id makes the
   * rule inert.
   */
  readonly channel: ChannelRuleChannelResolver;
  /**
   * Value-extraction strategy. Defaults to `'content'` for `json`
   * channels matched by block rules, `'string'` for text channels,
   * `'number'` for number channels, and `'payload'` for event rules
   * regardless of channel type.
   */
  readonly extract?: ChannelRuleExtract;
}

/**
 * Routing rule from `ITextBlock` or `ISemanticEvent` to a channel
 * emission (ADR-163 §12, §7).
 *
 * Rules are checked in priority order (higher first); ties broken by
 * registration order (first-registered wins). One block or event can
 * match multiple rules and emit to multiple channels (e.g., `room.name`
 * routes to both `main` (append) and `location` (replace)).
 *
 * The target channel's `mode` is the source of truth for behavior.
 * Rules do not carry mode.
 */
export interface ChannelRule {
  readonly when: ChannelRuleWhen;
  readonly emit: ChannelRuleEmit;
  /**
   * Higher = checked first. Default `0`. Stories override platform
   * rules by registering at higher priority for the same predicate.
   */
  readonly priority?: number;
}
