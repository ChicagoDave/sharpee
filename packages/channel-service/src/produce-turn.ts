/**
 * @sharpee/channel-service — turn packet producer
 *
 * Owner context: platform package. Routes engine output (text blocks,
 * events, world snapshot) through the session's registered rules into
 * a `TurnPacket` per ADR-163 §1, §5, §7, §10, §12.
 *
 * Responsibility split:
 *  - Rule matching — input-vs-rule predicate evaluation. Block rules
 *    match `ITextBlock.key` (key / keyPattern / keyPrefix / decoration
 *    / custom); event rules match `ISemanticEvent.type` (eventType /
 *    eventTypePrefix / customEvent).
 *  - Channel resolution — `emit.channel` is either a static id string
 *    or a function of the matched input (used by media routing for
 *    `image:<layer>` and `ambient:<id>` per §7).
 *  - Extraction — apply `extract` to convert blocks/events into channel
 *    values (`'content'` | `'string'` | `'number'` | `'payload'` |
 *    `'eventType'` | function).
 *  - Mode application — `replace` keeps the latest contribution per
 *    iteration order; `append` accumulates new entries; `event` fires
 *    transient signals (last-write within a turn).
 *  - Conflict resolution (AC-10) — within a single input, multiple
 *    rules emitting to the same channel are resolved by priority then
 *    registration order; only the highest-priority match contributes.
 *  - Dispatch ordering — blocks pass first, then events. For
 *    replace-mode channels with both block and event contributors in
 *    the same turn, the event's value wins (events represent
 *    state-affecting actions; blocks represent narrative output).
 *  - Emit policy (§5, AC-9) — `always` channels appear in every payload;
 *    `sparse` channels appear only on change.
 *
 * @see ADR-163 — Channel-Service Platform — decisions 1, 5, 7, 10, 12
 */

import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { IWorldModel } from '@sharpee/world-model';
import type {
  TurnPacket,
  ChannelDefinition,
  ChannelContentType,
  ChannelMode,
} from './wire';
import type {
  ChannelRule,
  ChannelRuleExtract,
  ChannelRuleInput,
  ChannelRuleChannelResolver,
} from './types';
import {
  _isManifestFrozen,
  _getRulesInDispatchOrder,
  _getPrevValue,
  _setPrevValue,
  _nextTurnId,
  getChannelRegistry,
} from './registry';
import { flattenContent } from './platform-rules';

/**
 * Input bundle for `produceTurnPacket` (ADR-163 §12).
 *
 * `world` is accepted for forward compatibility — Phase 1 routing is
 * text-block-driven, Phase 2 adds event routing for media channels;
 * world-snapshot-driven rules are added when ADR-163 §12's
 * `ChannelRule.when` grows world predicates in a later phase.
 */
export interface ProduceTurnPacketInput {
  readonly textBlocks: ReadonlyArray<ITextBlock>;
  readonly events?: ReadonlyArray<ISemanticEvent>;
  readonly world?: IWorldModel;
  /**
   * Caller-supplied previous-value snapshot. When provided, takes
   * precedence over the producer's internal `prevValues` for this
   * call's sparse-emit comparison. Multi-user surfaces (ADR-164) pass
   * the transcript-derived snapshot; single-user surfaces omit and
   * let the producer manage its own state.
   */
  readonly prevValues?: Readonly<Record<string, unknown>>;
}

/**
 * Produce a turn packet from this turn's engine output.
 *
 * Throws if `produceCmgtManifest` has not yet been called for the
 * session — the bootstrap order (AC-11b) requires `cmgt` before any
 * `turn`.
 *
 * Side effect: updates the producer's internal `prevValues` for each
 * replace-mode channel that received a contribution this turn. After
 * the call, `resetSession()` is the only way to clear that state.
 */
export function produceTurnPacket(input: ProduceTurnPacketInput): TurnPacket {
  if (!_isManifestFrozen()) {
    throw new Error(
      'channel-service: produceTurnPacket() called before produceCmgtManifest(). ' +
        'Bootstrap order invariant (ADR-163 §11, AC-11b): cmgt must precede turn.',
    );
  }

  const channels = indexChannelsById(getChannelRegistry());
  const rules = _getRulesInDispatchOrder();
  const events = input.events ?? [];
  const contributions = collectContributions(input.textBlocks, events, rules, channels);
  const payload = buildPayload(channels, contributions, input.prevValues);

  return {
    kind: 'turn',
    turn_id: _nextTurnId(),
    payload,
  };
}

interface Contribution {
  readonly mode: ChannelMode;
  /**
   * Values emitted to this channel this turn, in iteration order.
   * For `replace` channels only the last entry is meaningful; for
   * `append` and `event` all entries matter.
   */
  readonly entries: unknown[];
}

function indexChannelsById(
  defs: ReadonlyArray<ChannelDefinition>,
): Map<string, ChannelDefinition> {
  const map = new Map<string, ChannelDefinition>();
  for (const def of defs) {
    map.set(def.id, def);
  }
  return map;
}

/**
 * Walk each block then each event through the rule chain. For each
 * input, dedupe per channel — only the highest-priority matching rule
 * per channel contributes (AC-10).
 *
 * Blocks pass first, then events. For replace-mode channels, an event's
 * contribution overwrites a block's contribution from the same turn.
 */
function collectContributions(
  textBlocks: ReadonlyArray<ITextBlock>,
  events: ReadonlyArray<ISemanticEvent>,
  rules: ReadonlyArray<ChannelRule>,
  channels: Map<string, ChannelDefinition>,
): Map<string, Contribution> {
  const contributions = new Map<string, Contribution>();

  // Pass 1: text blocks
  for (const block of textBlocks) {
    applyMatchingRules(block, false, rules, channels, contributions);
  }

  // Pass 2: events
  for (const event of events) {
    applyMatchingRules(event, true, rules, channels, contributions);
  }

  return contributions;
}

/**
 * Apply all matching rules for a single input (block or event) to the
 * contribution map. Per-input dedupe ensures only the highest-priority
 * rule per channel contributes for this input.
 */
function applyMatchingRules(
  input: ChannelRuleInput,
  isEvent: boolean,
  rules: ReadonlyArray<ChannelRule>,
  channels: Map<string, ChannelDefinition>,
  contributions: Map<string, Contribution>,
): void {
  const emittedHere = new Set<string>();
  for (const rule of rules) {
    // Source filter: block rules only see blocks; event rules only see events.
    if (isEvent ? !isEventRule(rule) : !isBlockRule(rule)) continue;
    if (!matches(input, isEvent, rule)) continue;

    const channelId = resolveChannelId(rule.emit.channel, input);
    if (emittedHere.has(channelId)) continue;

    const def = channels.get(channelId);
    if (!def) continue;

    const value = applyExtract(input, isEvent, rule.emit.extract, def.contentType);
    // `undefined` means "extractor refused" — drop. `null` is a valid
    // emission (ADR-163 §7 — `media.image.hide` / `media.music.stop` /
    // `media.ambient.stop` carry `null` to signal hide/stop).
    if (value === undefined) continue;

    emittedHere.add(channelId);
    let contrib = contributions.get(channelId);
    if (!contrib) {
      contrib = { mode: def.mode, entries: [] };
      contributions.set(channelId, contrib);
    }
    if (def.mode === 'replace') {
      // last contribution within a turn wins (later input wins);
      // multiple rules per input are already deduped above.
      contrib.entries.length = 0;
      contrib.entries.push(value);
    } else {
      contrib.entries.push(value);
    }
  }
}

/**
 * A rule is a block rule if any block-source predicate field is set.
 * Used to filter rules during the block pass.
 */
function isBlockRule(rule: ChannelRule): boolean {
  const w = rule.when;
  return (
    w.key !== undefined ||
    w.keyPattern !== undefined ||
    w.keyPrefix !== undefined ||
    w.decoration !== undefined ||
    w.custom !== undefined
  );
}

/**
 * A rule is an event rule if any event-source predicate field is set.
 * Used to filter rules during the event pass. A rule with both block
 * and event predicates is treated as an event rule (and its block
 * fields are ignored) — but stories should not author such rules.
 */
function isEventRule(rule: ChannelRule): boolean {
  const w = rule.when;
  return (
    w.eventType !== undefined ||
    w.eventTypePrefix !== undefined ||
    w.customEvent !== undefined
  );
}

/**
 * Predicate evaluation for `ChannelRule.when` (ADR-163 §12, §7).
 *
 * Block-source order (only the first set field is consulted):
 *  1. `key` — exact match on `block.key`
 *  2. `keyPattern` — regex test
 *  3. `keyPrefix` — `block.key.startsWith(prefix)`
 *  4. `decoration` — any content node carries this decoration type
 *  5. `custom` — caller-supplied predicate
 *
 * Event-source order:
 *  1. `eventType` — exact match on `event.type`
 *  2. `eventTypePrefix` — `event.type.startsWith(prefix)`
 *  3. `customEvent` — caller-supplied predicate
 *
 * A rule with no predicate field set never matches.
 */
function matches(
  input: ChannelRuleInput,
  isEvent: boolean,
  rule: ChannelRule,
): boolean {
  const w = rule.when;
  if (isEvent) {
    const event = input as ISemanticEvent;
    if (w.eventType !== undefined) return event.type === w.eventType;
    if (w.eventTypePrefix !== undefined)
      return event.type.startsWith(w.eventTypePrefix);
    if (w.customEvent !== undefined) return Boolean(w.customEvent(event));
    return false;
  }
  const block = input as ITextBlock;
  if (w.key !== undefined) return block.key === w.key;
  if (w.keyPattern !== undefined) {
    const re =
      w.keyPattern instanceof RegExp ? w.keyPattern : new RegExp(w.keyPattern);
    return re.test(block.key);
  }
  if (w.keyPrefix !== undefined) return block.key.startsWith(w.keyPrefix);
  if (w.decoration !== undefined)
    return contentHasDecoration(block.content, w.decoration);
  if (w.custom !== undefined) return Boolean(w.custom(block));
  return false;
}

/**
 * Recursively scan a `TextContent` tree for any decoration node
 * carrying `type === target`.
 */
function contentHasDecoration(
  content: ReadonlyArray<TextContent>,
  target: string,
): boolean {
  for (const node of content) {
    if (typeof node === 'string') continue;
    if (node.type === target) return true;
    if (contentHasDecoration(node.content, target)) return true;
  }
  return false;
}

/**
 * Resolve the rule's target channel id from the matched input. Static
 * string ids are returned as-is; function resolvers receive the input
 * and return the dynamic id (e.g., `'image:' + event.data.layer`).
 */
function resolveChannelId(
  resolver: ChannelRuleChannelResolver,
  input: ChannelRuleInput,
): string {
  return typeof resolver === 'function' ? resolver(input) : resolver;
}

/**
 * Apply the rule's `extract` strategy to produce a channel value.
 *
 * Defaults (when `extract` is omitted):
 *  - Block rules: `'content'` for `json`, `'string'` for `text`,
 *    `'number'` for `number`.
 *  - Event rules: `'payload'` regardless of channel content type.
 *
 * Returns `undefined` to signal "extractor refused" — the producer
 * drops the contribution rather than write a malformed value to the
 * wire (e.g., a `'payload'` extract on a block input, or a number
 * extractor on a non-numeric block). `null` is a valid emission and
 * propagates to the channel value (used by ADR-163 §7 media hide/stop
 * signals).
 */
function applyExtract(
  input: ChannelRuleInput,
  isEvent: boolean,
  extract: ChannelRuleExtract | undefined,
  contentType: ChannelContentType,
): unknown {
  const strategy = extract ?? defaultExtractFor(isEvent, contentType);

  if (typeof strategy === 'function') {
    return strategy(input);
  }
  switch (strategy) {
    case 'content':
      if (isEvent) return undefined;
      return (input as ITextBlock).content;
    case 'string':
      if (isEvent) return undefined;
      return flattenContent((input as ITextBlock).content);
    case 'number': {
      if (isEvent) return undefined;
      const flat = flattenContent((input as ITextBlock).content).trim();
      const parsed = Number(flat);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case 'payload':
      if (!isEvent) return undefined;
      return (input as ISemanticEvent).data;
    case 'eventType':
      if (!isEvent) return undefined;
      return (input as ISemanticEvent).type;
  }
}

function defaultExtractFor(
  isEvent: boolean,
  contentType: ChannelContentType,
): ChannelRuleExtract {
  if (isEvent) return 'payload';
  switch (contentType) {
    case 'json':
      return 'content';
    case 'text':
      return 'string';
    case 'number':
      return 'number';
  }
}

/**
 * Build the per-turn payload by walking every registered channel and
 * applying mode + emit-policy semantics.
 */
function buildPayload(
  channels: Map<string, ChannelDefinition>,
  contributions: Map<string, Contribution>,
  callerPrevValues: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const def of channels.values()) {
    const emit = def.emit ?? 'sparse';
    const contrib = contributions.get(def.id);
    const prev = callerPrevValues
      ? callerPrevValues[def.id]
      : _getPrevValue(def.id);

    switch (def.mode) {
      case 'replace': {
        const newValue = contrib?.entries[contrib.entries.length - 1];
        if (newValue !== undefined) {
          if (emit === 'always' || !valueEquals(newValue, prev)) {
            payload[def.id] = newValue;
          }
          _setPrevValue(def.id, newValue);
        } else if (emit === 'always' && prev !== undefined) {
          // Re-emit previous value on idle turn (AC-9a)
          payload[def.id] = prev;
        }
        break;
      }
      case 'append': {
        const entries = contrib?.entries ?? [];
        if (emit === 'always') {
          payload[def.id] = entries;
        } else if (entries.length > 0) {
          payload[def.id] = entries;
        }
        break;
      }
      case 'event': {
        // Event channels emit only when fired (regardless of emit policy).
        // Multiple firings within one turn collapse to the last —
        // multi-firing surfaces should use `append` mode instead.
        const entries = contrib?.entries ?? [];
        if (entries.length > 0) {
          payload[def.id] = entries[entries.length - 1];
        }
        break;
      }
    }
  }

  return payload;
}

/**
 * Deep value equality for sparse-emit change detection.
 *
 * Uses `JSON.stringify` for object/array compares — adequate for the
 * value shapes carried over the wire (scalars, plain objects, arrays
 * of scalars or text content nodes). Not safe for cyclic graphs, but
 * those cannot cross the JSON wire anyway.
 */
function valueEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
