/**
 * Event placement stage — realizes the ADR-296 D0 authorial ordering
 * contract for a turn's prose:
 *
 *   1. Phrases you emit in your own report render in the order you emit
 *      them, within your transaction.
 *   2. Phrases you chain render at your declared slot in the triggering
 *      transaction's frame (default `afterRoomDescription`), regardless
 *      of which internal event triggered you.
 *   3. Sources render in occurrence order: the player action's
 *      transaction, then each plugin batch in plugin-priority order.
 *   4. Platform fixtures: the banner renders first in the turn; implicit
 *      takes render first in their action.
 *
 * Mechanism: events are grouped by `data._transactionId` (an ABSENT id
 * never groups — not even with another absent id; ADR-296 D1 closes GH
 * #208's defect class structurally). Within a transaction the base order
 * is the emission stream; `data._narrativeSlot`-stamped phrases are
 * re-placed at their declared frame boundary (D2/D3); everything else
 * keeps stream position. The pre-ADR-296 type-based hoists and the
 * chain-depth comparator are deleted (D5).
 *
 * Public interface: `sortEventsForProse`, `getChainMetadata`. Used
 * internally by the prose pipeline as the second per-turn stage,
 * after filtering.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-296 Turn narrative slots (D0 contract, D2 frame/anchor,
 *   D5 hoist deletion)
 * @see ADR-094 Event Chaining, Amendment A1 (the authorial promise this
 *   stage delivers; provenance stamps remain, depth sorting is retired)
 * @see ADR-174 §Engine-internal prose pipeline
 */

import type { ISemanticEvent } from '@sharpee/core';

/**
 * Event data with chain/placement metadata (ADR-094 provenance stamps,
 * ADR-296 placement stamps).
 */
interface ChainMetadata {
  _transactionId?: string;
  _chainDepth?: number;
  _chainedFrom?: string;
  _chainSourceId?: string;
  _narrativeSlot?: string;
}

const LIFECYCLE_EVENTS = new Set([
  'game.started',
  'game.starting',
  'game.loading',
  'game.loaded',
  'game.initialized',
]);

/**
 * Anchor event types (ADR-296 D2): the transaction's room-description
 * event anchors its frame. Both spellings are live in the tree.
 */
const ANCHOR_EVENT_TYPES = new Set([
  'if.event.room.description',
  'if.event.room_description',
]);

/**
 * Cluster member types: events that extend the anchor cluster —
 * "after the room description" means after the player has been told
 * what they see, contents list included.
 */
const ANCHOR_CLUSTER_MEMBER_TYPES = new Set(['if.event.list.contents']);

/**
 * Non-rendering types skipped (not broken on, not moved) while scanning
 * for cluster members after the anchor. Exactly `if.event.illustrated`
 * today (looking emits illustrations between description and contents);
 * extended only by named addition here.
 */
const ANCHOR_CLUSTER_SKIP_TYPES = new Set(['if.event.illustrated']);

function metadataOf(event: ISemanticEvent): ChainMetadata | undefined {
  const data = event.data;
  if (data === undefined || data === null || typeof data !== 'object') {
    return undefined;
  }
  return data as ChainMetadata;
}

/**
 * Place one transaction's events: implicit-take fixture, then slot
 * insertion around the anchor cluster (or the collapsed frame's primary
 * report event). Stable — events that don't need to move never swap.
 */
function placeTransaction(events: ISemanticEvent[]): ISemanticEvent[] {
  if (events.length <= 1) {
    return events;
  }

  // Fixture (D6, contract rule 4): implicit takes render first in their
  // action — "first taking the X" before "X reads: ...". Doubly
  // guaranteed (emission-side prepend convention plus this rule).
  const implicitTakes = events.filter(e => e.type === 'if.event.implicit_take');
  const base = implicitTakes.length > 0
    ? [...implicitTakes, ...events.filter(e => e.type !== 'if.event.implicit_take')]
    : events;

  // Slot extraction (D3): slot-stamped phrases leave the skeleton and
  // re-enter at their declared frame boundary; everything unstamped
  // keeps stream position (contract rule 1). Emission order is
  // preserved within each slot group.
  const beforeDescription: ISemanticEvent[] = [];
  const afterDescription: ISemanticEvent[] = [];
  const transactionFinal: ISemanticEvent[] = [];
  const skeleton: ISemanticEvent[] = [];

  for (const event of base) {
    const slot = metadataOf(event)?._narrativeSlot;
    if (slot === 'beforeRoomDescription') {
      beforeDescription.push(event);
    } else if (slot === 'afterRoomDescription') {
      afterDescription.push(event);
    } else if (slot === 'afterEverything') {
      transactionFinal.push(event);
    } else {
      skeleton.push(event);
    }
  }

  if (
    beforeDescription.length === 0 &&
    afterDescription.length === 0 &&
    transactionFinal.length === 0
  ) {
    return base;
  }

  // Anchor cluster detection (D2): the first room-description event plus
  // the following contents events, skipping non-rendering interleaved
  // types. A second room-description in one transaction is a defect:
  // warn, first one anchors.
  let clusterStart = -1;
  let clusterEnd = -1;
  for (let i = 0; i < skeleton.length; i++) {
    if (!ANCHOR_EVENT_TYPES.has(skeleton[i].type)) continue;
    if (clusterStart !== -1) {
      console.warn(
        `sortEventsForProse: second room-description event (${skeleton[i].id}) ` +
        `in one transaction — defect; the first one anchors (ADR-296 D2)`
      );
      continue;
    }
    clusterStart = i;
    clusterEnd = i;
    for (let j = i + 1; j < skeleton.length; j++) {
      if (ANCHOR_CLUSTER_MEMBER_TYPES.has(skeleton[j].type)) {
        clusterEnd = j;
      } else if (ANCHOR_CLUSTER_SKIP_TYPES.has(skeleton[j].type)) {
        continue;
      } else {
        break;
      }
    }
  }

  // Frame boundaries. Anchor-less transactions (a TAKE turn, a blocked
  // movement) collapse the frame around the primary report event — the
  // transaction's first phrase-bearing event (first `data.messageId`).
  // With neither anchor nor primary, boundaries degenerate to the front:
  // placed phrases render before pure bookkeeping, which renders nothing.
  let insertBefore: number;
  let insertAfter: number;
  if (clusterStart !== -1) {
    insertBefore = clusterStart;
    insertAfter = clusterEnd + 1;
  } else {
    const primary = skeleton.findIndex(e => {
      const data = e.data;
      return typeof data === 'object' && data !== null &&
        (data as Record<string, unknown>).messageId !== undefined;
    });
    if (primary !== -1) {
      insertBefore = primary;
      insertAfter = primary + 1;
    } else {
      insertBefore = 0;
      insertAfter = 0;
    }
  }

  return [
    ...skeleton.slice(0, insertBefore),
    ...beforeDescription,
    ...skeleton.slice(insertBefore, insertAfter),
    ...afterDescription,
    ...skeleton.slice(insertAfter),
    ...transactionFinal,
  ];
}

/**
 * Order a turn's events for prose per the D0 contract (see module
 * header): lifecycle first, then transactions in occurrence order, each
 * internally placed by `placeTransaction`.
 *
 * Does not mutate the input array. Stable: events with no placement rule
 * keep their relative order.
 */
export function sortEventsForProse(events: ISemanticEvent[]): ISemanticEvent[] {
  // Fixture (contract rule 4): lifecycle events first — the banner
  // displays before the first room description. Stable partition.
  // Note: matches specific lifecycle events only, NOT game.message.
  const lifecycle: ISemanticEvent[] = [];
  const stream: ISemanticEvent[] = [];
  for (const event of events) {
    (LIFECYCLE_EVENTS.has(event.type) ? lifecycle : stream).push(event);
  }

  // Group into transactions by first occurrence (contract rule 3).
  // An ABSENT _transactionId never groups — not even with another absent
  // id: every unstamped event is its own frame-of-one (D1 never-group).
  interface TransactionGroup { events: ISemanticEvent[] }
  const groups: TransactionGroup[] = [];
  const byTransaction = new Map<string, TransactionGroup>();
  for (const event of stream) {
    const transactionId = metadataOf(event)?._transactionId;
    if (transactionId === undefined) {
      groups.push({ events: [event] });
      continue;
    }
    let group = byTransaction.get(transactionId);
    if (!group) {
      group = { events: [] };
      byTransaction.set(transactionId, group);
      groups.push(group);
    }
    group.events.push(event);
  }

  const placed: ISemanticEvent[] = [...lifecycle];
  for (const group of groups) {
    placed.push(...placeTransaction(group.events));
  }
  return placed;
}

/**
 * Extract chain/placement metadata from event data.
 */
export function getChainMetadata(event: ISemanticEvent): ChainMetadata {
  const data = event.data as ChainMetadata | undefined;
  return {
    _transactionId: data?._transactionId,
    _chainDepth: data?._chainDepth,
    _chainedFrom: data?._chainedFrom,
    _chainSourceId: data?._chainSourceId,
    _narrativeSlot: data?._narrativeSlot,
  };
}
