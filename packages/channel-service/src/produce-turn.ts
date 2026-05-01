/**
 * @sharpee/channel-service — turn packet producer
 *
 * Owner context: platform package. Routes engine output (text blocks,
 * events, world snapshot) through the session's registered rules into
 * a `TurnPacket` per ADR-163 §1, §5, §10, §12.
 *
 * Responsibility split:
 *  - Rule matching — block-vs-rule predicate evaluation (key,
 *    keyPattern, keyPrefix, decoration, custom).
 *  - Extraction — apply `extract` to convert blocks into channel values
 *    (`'content'` | `'string'` | `'number'` | function).
 *  - Mode application — `replace` keeps the latest contribution per
 *    block-iteration order; `append` accumulates new entries; `event`
 *    fires transient signals (last-write within a turn).
 *  - Conflict resolution (AC-10) — within a single block, multiple
 *    rules emitting to the same channel are resolved by priority then
 *    registration order; only the highest-priority match contributes.
 *  - Emit policy (§5, AC-9) — `always` channels appear in every payload;
 *    `sparse` channels appear only on change.
 *
 * @see ADR-163 — Channel-Service Platform — decisions 1, 5, 10, 12
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
import type { ChannelRule, ChannelRuleExtract } from './types';
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
 * `events` and `world` are accepted for forward compatibility — Phase 1
 * routing is text-block-driven; event-driven and world-snapshot-driven
 * rules are added in later phases when ADR-163 §12's `ChannelRule.when`
 * grows event predicates.
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
  const contributions = collectContributions(input.textBlocks, rules, channels);
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
   * Values emitted to this channel this turn, in block-iteration order.
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
 * Walk each block through the rule chain. For each block, dedupe per
 * channel — only the highest-priority matching rule per channel
 * contributes (AC-10).
 */
function collectContributions(
  textBlocks: ReadonlyArray<ITextBlock>,
  rules: ReadonlyArray<ChannelRule>,
  channels: Map<string, ChannelDefinition>,
): Map<string, Contribution> {
  const contributions = new Map<string, Contribution>();

  for (const block of textBlocks) {
    const emittedHere = new Set<string>();
    for (const rule of rules) {
      if (!matches(block, rule)) continue;
      const channelId = rule.emit.channel;
      if (emittedHere.has(channelId)) continue;
      const def = channels.get(channelId);
      if (!def) continue;

      const value = applyExtract(block, rule.emit.extract, def.contentType);
      if (value === null || value === undefined) continue;

      emittedHere.add(channelId);
      let contrib = contributions.get(channelId);
      if (!contrib) {
        contrib = { mode: def.mode, entries: [] };
        contributions.set(channelId, contrib);
      }
      if (def.mode === 'replace') {
        // last contribution within a turn wins (later block wins);
        // multiple rules per block are already deduped above.
        contrib.entries.length = 0;
        contrib.entries.push(value);
      } else {
        contrib.entries.push(value);
      }
    }
  }

  return contributions;
}

/**
 * Predicate evaluation for `ChannelRule.when` (ADR-163 §12).
 *
 * Order of precedence (only the first set field is consulted):
 *  1. `key` — exact match on `block.key`
 *  2. `keyPattern` — regex test
 *  3. `keyPrefix` — `block.key.startsWith(prefix)`
 *  4. `decoration` — any content node carries this decoration type
 *  5. `custom` — caller-supplied predicate
 *
 * A rule with none of the fields set never matches.
 */
function matches(block: ITextBlock, rule: ChannelRule): boolean {
  const w = rule.when;
  if (w.key !== undefined) {
    return block.key === w.key;
  }
  if (w.keyPattern !== undefined) {
    const re =
      w.keyPattern instanceof RegExp ? w.keyPattern : new RegExp(w.keyPattern);
    return re.test(block.key);
  }
  if (w.keyPrefix !== undefined) {
    return block.key.startsWith(w.keyPrefix);
  }
  if (w.decoration !== undefined) {
    return contentHasDecoration(block.content, w.decoration);
  }
  if (w.custom !== undefined) {
    return Boolean(w.custom(block));
  }
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
 * Apply the rule's `extract` strategy to produce a channel value.
 *
 * Defaults (when `extract` is omitted):
 *  - `json` channels → `'content'` (preserve `TextContent[]`)
 *  - `text` channels → `'string'` (flatten)
 *  - `number` channels → `'number'` (flatten then parseInt)
 *
 * Returns `null` to signal "extractor refused" — the producer drops the
 * contribution rather than write a malformed value to the wire (e.g.,
 * a number extractor on a non-numeric block).
 */
function applyExtract(
  block: ITextBlock,
  extract: ChannelRuleExtract | undefined,
  contentType: ChannelContentType,
): unknown {
  const strategy = extract ?? defaultExtractFor(contentType);

  if (typeof strategy === 'function') {
    return strategy(block);
  }
  switch (strategy) {
    case 'content':
      return block.content;
    case 'string':
      return flattenContent(block.content);
    case 'number': {
      const flat = flattenContent(block.content).trim();
      const parsed = Number(flat);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
}

function defaultExtractFor(contentType: ChannelContentType): ChannelRuleExtract {
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
