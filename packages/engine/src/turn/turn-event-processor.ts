/**
 * Turn event enrichment: the one funnel every event produced during a
 * turn passes through before it is stored, emitted, or rendered.
 *
 * `processEvent` normalizes a single event (id, lower-cased type,
 * timestamp, empty entity map) and enriches it with the turn's context —
 * the turn number, the transaction stamp, presence at the producer's
 * location, the acting player and their location as defaults, and a tag
 * for the event family. `enrichTurnEvents` is the stage-level funnel over
 * a batch: it stamps every event with the transaction id its source
 * determines (the player action is one transaction; each plugin's batch
 * is its own) and then applies perception filtering when a perception
 * service is configured. The engine calls it once for the action's
 * events and once per plugin batch; no other path builds an enrichment
 * context.
 *
 * Public interface: `processEvent`, `enrichTurnEvents`,
 * `transactionIdFor`, `EventProcessingContext`, `TurnEventSource`,
 * `TurnEnrichment`.
 * Owner context: `@sharpee/engine` — turn cycle, event enrichment.
 *
 * References: ADR-296 D1 (transaction stamping at the funnel, idempotent
 * over `executeChains` inheritance); ADR-328 D3 (presence tagging from
 * the producer's location before the player-location default); ADR-334
 * D4 (one funnel, the source as a parameter).
 */

import { type ISemanticEvent, type Presence } from '@sharpee/core';
import type { WorldModel, IFEntity } from '@sharpee/world-model';
import { type IPerceptionService } from '@sharpee/stdlib';

/**
 * Context for event processing pipeline
 */
export interface EventProcessingContext {
  turn?: number;
  playerId?: string;
  locationId?: string;
  /**
   * Transaction id for this source's events (ADR-296 D1). The funnel that
   * builds the context decides the id — `txn:{turn}:action` for the player
   * action, `txn:{turn}:plugin:{plugin.id}` per plugin batch — and the
   * enrichment pass stamps it as `data._transactionId` when the event does
   * not already carry one (idempotent over `executeChains` inheritance).
   * Omitted for unstamped sources (sound dispatch, meta-command output,
   * platform-op completions) — safe under the sort's never-group rule.
   */
  transactionId?: string;
  /**
   * Presence resolver for the ADR-328 D3 tag. When set, enrichment stamps
   * `presence` on every event that ARRIVES with a producer-set
   * `entities.location` — the room the event happened in — evaluated
   * before the player-location default below is applied, so a defaulted
   * location never masquerades as a witnessed one. Events without a
   * producer location (player actions today) are left untagged.
   */
  presenceOf?: (locationId: string) => Presence;
}

/**
 * Who produced a batch of turn events. The source decides the transaction
 * id every event in the batch is stamped with.
 */
export type TurnEventSource =
  | { readonly kind: 'action' }
  | { readonly kind: 'plugin'; readonly pluginId: string };

/**
 * What the funnel needs from the turn to enrich a batch.
 */
export interface TurnEnrichment {
  /** The turn the events belong to. */
  turn: number;
  /** The acting player; the default actor for events that name none. */
  playerId: string;
  /** The player's location; the default location for events that name none. */
  locationId: string | undefined;
  /** Presence at a producer-stamped location; absent leaves events untagged. */
  presenceOf?: (locationId: string) => Presence;
  /** Perception filtering, applied after enrichment when configured. */
  perception?: {
    service: IPerceptionService;
    player: IFEntity;
    world: WorldModel;
  };
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Event normalization - ensures consistent event structure
 */
function normalizeEvent(event: ISemanticEvent): ISemanticEvent {
  return {
    ...event,
    id: event.id || generateEventId(),
    type: event.type.toLowerCase(),
    timestamp: event.timestamp || Date.now(),
    entities: event.entities || {},
    data: event.data,
    tags: event.tags,
    priority: event.priority,
    narrate: event.narrate
  };
}

/**
 * Event enrichment - adds turn, actor, and location context
 */
function enrichEvent(
  event: ISemanticEvent,
  context?: EventProcessingContext
): ISemanticEvent {
  const enriched = { ...event };

  if (context) {
    if (context.turn !== undefined && enriched.data && typeof enriched.data === 'object') {
      enriched.data = { ...enriched.data, turn: context.turn };
    }
    // Transaction stamp (ADR-296 D1): stamped when absent — the funnel
    // stamp is authoritative and idempotent over executeChains' inherited
    // value. Unlike the turn stamp above, this CREATES the data object for
    // data-less events (the old guard silently skipped them; v2 finding 5).
    // Events whose data is a non-object primitive cannot carry a stamp and
    // are left alone — they render nothing the sort would place.
    if (context.transactionId !== undefined) {
      if (enriched.data === undefined || enriched.data === null) {
        enriched.data = { _transactionId: context.transactionId };
      } else if (
        typeof enriched.data === 'object' &&
        (enriched.data as Record<string, unknown>)._transactionId === undefined
      ) {
        enriched.data = { ...enriched.data, _transactionId: context.transactionId };
      }
    }
    // ADR-328 D3: tag presence from the producer's location, before the
    // player-location default can stand in for it. The player is present
    // at their own events by identity — the action context locates them
    // at context creation (`action-context-factory.ts`), so a `going`
    // event sits at the origin room after the move and would otherwise
    // read as unwitnessed.
    if (context.presenceOf && enriched.entities.location && enriched.presence === undefined) {
      enriched.presence =
        context.playerId !== undefined && enriched.entities.actor === context.playerId
          ? 'present'
          : context.presenceOf(enriched.entities.location);
    }
    if (context.playerId && !enriched.entities.actor) {
      enriched.entities = { ...enriched.entities, actor: context.playerId };
    }
    if (context.locationId && !enriched.entities.location) {
      enriched.entities = { ...enriched.entities, location: context.locationId };
    }
  }

  if (!enriched.tags) {
    enriched.tags = [];
  }
  if (enriched.type.startsWith('action.') && !enriched.tags.includes('action')) {
    enriched.tags = [...enriched.tags, 'action'];
  } else if (enriched.type.startsWith('system.') && !enriched.tags.includes('system')) {
    enriched.tags = [...enriched.tags, 'system'];
  } else if (enriched.type.startsWith('game.') && !enriched.tags.includes('game')) {
    enriched.tags = [...enriched.tags, 'game'];
  }

  return enriched;
}

/**
 * Process an event through normalization and enrichment
 */
export function processEvent(
  event: ISemanticEvent,
  context?: EventProcessingContext
): ISemanticEvent {
  return enrichEvent(normalizeEvent(event), context);
}

/**
 * The transaction id a source's events carry in a turn: the player action
 * is one transaction, each plugin batch its own.
 *
 * @param turn - The turn number
 * @param source - Who produced the batch
 */
export function transactionIdFor(turn: number, source: TurnEventSource): string {
  return source.kind === 'action'
    ? `txn:${turn}:action`
    : `txn:${turn}:plugin:${source.pluginId}`;
}

/**
 * Enrich a batch of turn events from one source, then filter them by
 * perception when a service is configured. The returned events are new
 * objects; the input batch is untouched.
 *
 * @param events - The batch as the source produced it
 * @param source - Who produced it; decides the transaction stamp
 * @param enrichment - The turn's context and optional perception
 */
export function enrichTurnEvents(
  events: readonly ISemanticEvent[],
  source: TurnEventSource,
  enrichment: TurnEnrichment
): ISemanticEvent[] {
  const context: EventProcessingContext = {
    turn: enrichment.turn,
    playerId: enrichment.playerId,
    locationId: enrichment.locationId,
    transactionId: transactionIdFor(enrichment.turn, source),
    presenceOf: enrichment.presenceOf
  };
  const enriched = events.map((event) => processEvent(event, context));
  const perception = enrichment.perception;
  return perception
    ? perception.service.filterEvents(enriched, perception.player, perception.world)
    : enriched;
}
