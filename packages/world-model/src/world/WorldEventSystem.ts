/**
 * WorldEventSystem — event registration, chaining, validation, and history
 * for WorldModel.
 *
 * Public interface: registerEventHandler, unregisterEventHandler,
 * registerEventValidator, registerEventPreviewer, connectEventProcessor,
 * chainEvent, applyEvent, canApplyEvent, previewEvent, getAppliedEvents,
 * getEventsSince, clearEventHistory, preserveChains, restoreChains, clear.
 *
 * Owner context: packages/world-model (ADR-086, ADR-094). Extracted from
 * WorldModel to isolate event concerns.
 */

import { ISemanticEvent } from '@sharpee/core';
import {
  WorldChange,
  IEventProcessorWiring,
} from '@sharpee/if-domain';
import type { IWorldModel } from './WorldModel';

// ── Handler types ─────────────────────────────────────────────────────

/** Handler invoked when an event is applied to the world */
export type EventHandler = (event: ISemanticEvent, world: IWorldModel) => void;

/** Validator that determines whether an event can be applied */
export type EventValidator = (event: ISemanticEvent, world: IWorldModel) => boolean;

/** Previewer that returns predicted world changes without applying */
export type EventPreviewer = (event: ISemanticEvent, world: IWorldModel) => WorldChange[];

/**
 * Chain handler — returns events to emit (or null/empty to skip).
 * Unlike regular event handlers, chain handlers produce new events.
 */
export type EventChainHandler = (
  event: ISemanticEvent,
  world: IWorldModel
) => ISemanticEvent | ISemanticEvent[] | null | undefined | void;

/**
 * Options for chain registration.
 */
export interface ChainEventOptions {
  /**
   * How to handle existing chains for this trigger:
   * - 'cascade' (default): Add to existing chains, all fire
   * - 'override': Replace ALL existing chains for this trigger
   */
  mode?: 'cascade' | 'override';

  /**
   * Unique key for this chain. Chains with same key replace each other.
   * Useful for stdlib to define replaceable defaults.
   */
  key?: string;

  /**
   * Priority for ordering when multiple chains fire (lower = earlier).
   * Default: 100
   */
  priority?: number;
}

/**
 * Internal chain registration record.
 */
interface ChainRegistration {
  handler: EventChainHandler;
  key?: string;
  priority: number;
}

/**
 * Manages all event-related state and logic for WorldModel.
 *
 * Handlers, validators, previewers, and chain handlers are registered here.
 * The world reference is set after construction via setWorldRef() so that
 * handlers receive the correct IWorldModel when invoked.
 */
export class WorldEventSystem {
  private worldRef: IWorldModel | null = null;

  private eventHandlers = new Map<string, EventHandler>();
  private eventValidators = new Map<string, EventValidator>();
  private eventPreviewers = new Map<string, EventPreviewer>();
  private appliedEvents: ISemanticEvent[] = [];
  private eventProcessorWiring: IEventProcessorWiring | null = null;
  private maxEventHistory = 1000;

  // Event chaining (ADR-094)
  private eventChains = new Map<string, ChainRegistration[]>();

  /**
   * Set the world reference used when invoking handlers.
   * Called by WorldModel after construction.
   *
   * @param world - The IWorldModel instance handlers will receive
   */
  setWorldRef(world: IWorldModel): void {
    this.worldRef = world;
  }

  private getWorld(): IWorldModel {
    if (!this.worldRef) {
      throw new Error('WorldEventSystem: world reference not set. Call setWorldRef() first.');
    }
    return this.worldRef;
  }

  // ── Handler registration ────────────────────────────────────────────

  /**
   * Register an event handler for a specific event type.
   *
   * @param eventType - The event type string to handle
   * @param handler - Handler function receiving the event and world
   */
  registerEventHandler(eventType: string, handler: EventHandler): void {
    this.eventHandlers.set(eventType, handler);

    // If already connected to EventProcessor, wire immediately (ADR-086)
    if (this.eventProcessorWiring) {
      this.wireHandlerToProcessor(eventType, handler);
    }
  }

  /**
   * Unregister the handler for a specific event type.
   *
   * @param eventType - The event type to unregister
   */
  unregisterEventHandler(eventType: string): void {
    this.eventHandlers.delete(eventType);
  }

  /**
   * Register a validator for a specific event type.
   *
   * @param eventType - The event type to validate
   * @param validator - Validator function returning true if event is valid
   */
  registerEventValidator(eventType: string, validator: EventValidator): void {
    this.eventValidators.set(eventType, validator);
  }

  /**
   * Register a previewer for a specific event type.
   *
   * @param eventType - The event type to preview
   * @param previewer - Previewer function returning predicted changes
   */
  registerEventPreviewer(eventType: string, previewer: EventPreviewer): void {
    this.eventPreviewers.set(eventType, previewer);
  }

  // ── EventProcessor wiring (ADR-086) ─────────────────────────────────

  /**
   * Connect to the engine's EventProcessor.
   * Wires all existing handlers and chains, and enables automatic wiring
   * for future registrations.
   *
   * @param wiring - The EventProcessor wiring interface
   */
  connectEventProcessor(wiring: IEventProcessorWiring): void {
    this.eventProcessorWiring = wiring;

    for (const [eventType, handler] of this.eventHandlers) {
      this.wireHandlerToProcessor(eventType, handler);
    }

    for (const triggerType of this.eventChains.keys()) {
      this.wireChainToProcessor(triggerType);
    }
  }

  private wireHandlerToProcessor(eventType: string, handler: EventHandler): void {
    if (!this.eventProcessorWiring) return;

    const world = this.getWorld();
    const adaptedHandler = (event: ISemanticEvent): unknown[] => {
      handler(event, world);
      return [];
    };

    this.eventProcessorWiring.registerHandler(eventType, adaptedHandler);
  }

  // ── Event chaining (ADR-094) ────────────────────────────────────────

  /**
   * Register an event chain handler.
   * Chain handlers produce new events when a trigger event occurs.
   *
   * @param triggerType - The event type that triggers this chain
   * @param handler - Function that returns new events to emit
   * @param options - Chain registration options (mode, key, priority)
   */
  chainEvent(
    triggerType: string,
    handler: EventChainHandler,
    options: ChainEventOptions = {}
  ): void {
    const { mode = 'cascade', key, priority = 100 } = options;
    const registration: ChainRegistration = { handler, key, priority };

    if (!this.eventChains.has(triggerType)) {
      this.eventChains.set(triggerType, []);
    }

    const chains = this.eventChains.get(triggerType)!;

    if (mode === 'override') {
      this.eventChains.set(triggerType, [registration]);
    } else if (key) {
      const existingIndex = chains.findIndex(c => c.key === key);
      if (existingIndex >= 0) {
        chains[existingIndex] = registration;
      } else {
        chains.push(registration);
      }
    } else {
      chains.push(registration);
    }

    chains.sort((a, b) => a.priority - b.priority);

    if (this.eventProcessorWiring) {
      this.wireChainToProcessor(triggerType);
    }
  }

  private wireChainToProcessor(triggerType: string): void {
    if (!this.eventProcessorWiring) return;

    this.eventProcessorWiring.registerHandler(triggerType, (event) => {
      const chainedEvents = this.executeChains(triggerType, event);
      return chainedEvents.map(e => ({ type: 'emit' as const, event: e }));
    });
  }

  private executeChains(triggerType: string, event: ISemanticEvent): ISemanticEvent[] {
    const chains = this.eventChains.get(triggerType) || [];
    const results: ISemanticEvent[] = [];
    const world = this.getWorld();

    const triggerData = (event.data || {}) as Record<string, unknown>;
    const currentDepth = (triggerData._chainDepth as number) || 0;
    const transactionId = triggerData._transactionId as string | undefined;

    for (const chain of chains) {
      const chainedEvents = chain.handler(event, world);

      if (chainedEvents) {
        const eventsArray = Array.isArray(chainedEvents) ? chainedEvents : [chainedEvents];

        for (const chainedEvent of eventsArray) {
          const newDepth = currentDepth + 1;

          if (newDepth > 10) {
            console.warn(`Chain depth exceeded for ${chainedEvent.type}, skipping`);
            continue;
          }

          const existingData = (chainedEvent.data || {}) as Record<string, unknown>;
          const enrichedEvent: ISemanticEvent = {
            id: chainedEvent.id || `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: chainedEvent.type,
            timestamp: chainedEvent.timestamp || Date.now(),
            entities: chainedEvent.entities || {},
            data: {
              ...existingData,
              _chainedFrom: event.type,
              _chainSourceId: event.id,
              _chainDepth: newDepth,
              ...(transactionId ? { _transactionId: transactionId } : {})
            }
          };

          results.push(enrichedEvent);
        }
      }
    }

    return results;
  }

  // ── Event application ───────────────────────────────────────────────

  /**
   * Apply an event to the world. Validates first, then invokes the handler
   * and records the event in history.
   *
   * @param event - The event to apply
   * @throws Error if validation fails
   */
  applyEvent(event: ISemanticEvent): void {
    if (!this.canApplyEvent(event)) {
      throw new Error(`Cannot apply event of type '${event.type}': validation failed`);
    }

    const world = this.getWorld();
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      handler(event, world);
    }

    this.appliedEvents.push(event);

    if (this.appliedEvents.length > this.maxEventHistory) {
      this.appliedEvents = this.appliedEvents.slice(-this.maxEventHistory);
    }
  }

  /**
   * Check if an event can be applied (runs the validator if registered).
   *
   * @param event - The event to validate
   * @returns true if the event is valid or no validator is registered
   */
  canApplyEvent(event: ISemanticEvent): boolean {
    const validator = this.eventValidators.get(event.type);
    if (!validator) return true;
    return validator(event, this.getWorld());
  }

  /**
   * Preview the changes an event would cause without applying it.
   *
   * @param event - The event to preview
   * @returns Array of predicted world changes
   */
  previewEvent(event: ISemanticEvent): WorldChange[] {
    const previewer = this.eventPreviewers.get(event.type);
    if (!previewer) return [];
    return previewer(event, this.getWorld());
  }

  // ── Event history ───────────────────────────────────────────────────

  /**
   * Get all applied events (defensive copy).
   *
   * @returns Array of all events in history
   */
  getAppliedEvents(): ISemanticEvent[] {
    return [...this.appliedEvents];
  }

  /**
   * Get events applied since a given timestamp.
   *
   * @param timestamp - The cutoff timestamp
   * @returns Events with timestamp greater than the cutoff
   */
  getEventsSince(timestamp: number): ISemanticEvent[] {
    return this.appliedEvents.filter(event => event.timestamp > timestamp);
  }

  /**
   * Clear the event history.
   */
  clearEventHistory(): void {
    this.appliedEvents = [];
  }

  // ── Chain preservation for save/restore ─────────────────────────────

  /**
   * Snapshot the current event chains (code registrations, not serialized).
   * Used by WorldModel.loadJSON to preserve chains across restore.
   *
   * @returns A snapshot of the chain map
   */
  preserveChains(): Map<string, ChainRegistration[]> {
    return new Map(this.eventChains);
  }

  /**
   * Restore previously preserved chains.
   *
   * @param chains - Chain snapshot from preserveChains()
   */
  restoreChains(chains: Map<string, ChainRegistration[]>): void {
    for (const [key, value] of chains) {
      this.eventChains.set(key, value);
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  /**
   * Reset all runtime event state. Does not clear handler/validator/previewer
   * registrations (those are code registrations, not runtime state).
   */
  clear(): void {
    this.appliedEvents = [];
    this.eventChains.clear();
  }
}
