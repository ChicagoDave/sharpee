/**
 * @sharpee/channel-service — producer-side types
 *
 * Owner context: platform package. These types do NOT cross the wire —
 * they are internal to the producer (channel-service) and shape how
 * `ITextBlock` instances route to channel emissions.
 *
 * @see ADR-163 — Channel-Service Platform — decision 12
 */

import type { ITextBlock } from '@sharpee/text-blocks';

/**
 * Predicate clause for a `ChannelRule` (ADR-163 §12).
 *
 * Exactly one of `key | keyPattern | keyPrefix | decoration | custom`
 * is meaningful per rule; multiple are not blended. The first to match
 * (in the order listed) decides the rule's applicability.
 */
export interface ChannelRuleWhen {
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
   * Escape hatch: arbitrary predicate. Stories use this for
   * registration-specific routing logic that doesn't fit the simpler
   * forms above. Side-effect-free — called repeatedly during
   * `produceTurnPacket`.
   */
  readonly custom?: (block: ITextBlock) => boolean;
}

/**
 * Extractor strategy for the value carried into the channel payload
 * (ADR-163 §12).
 *
 * - `'content'` — pass through `block.content` as `TextContent[]`.
 *   Used by the platform's `main` channel so decorations survive.
 * - `'string'` — flatten `block.content` to a plain string. Used by
 *   text-typed channels (`prompt`, `location`, `ifid`).
 * - `'number'` — flatten then `parseInt`. Used by number-typed
 *   channels (`turn`).
 * - function — author-supplied projection. The block is the only
 *   input; the function is side-effect-free.
 */
export type ChannelRuleExtract =
  | 'content'
  | 'string'
  | 'number'
  | ((block: ITextBlock) => unknown);

/**
 * Emit clause for a `ChannelRule` (ADR-163 §12).
 */
export interface ChannelRuleEmit {
  /**
   * Target channel id. Must reference a registered `ChannelDefinition`
   * by the time `produceCmgtManifest` is called; the rule is otherwise
   * inert.
   */
  readonly channel: string;
  /**
   * Value-extraction strategy. Defaults to `'content'` for `json`
   * channels and `'string'` for text/number channels.
   */
  readonly extract?: ChannelRuleExtract;
}

/**
 * Routing rule from `ITextBlock` to a channel emission (ADR-163 §12).
 *
 * Rules are checked in priority order (higher first); ties broken by
 * registration order (first-registered wins). One block can match
 * multiple rules and emit to multiple channels (e.g., `room.name`
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
