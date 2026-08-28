# @sharpee/if-services

Runtime service interfaces (perception).

---

### perception-service

```typescript
/**
 * Perception service interface for Interactive Fiction
 *
 * Perception services filter events based on what the player can perceive.
 * They sit between action execution and the text service, transforming
 * events that describe things the player cannot perceive (due to darkness,
 * blindness, etc.) into appropriate alternative events.
 *
 * @see ADR-069 Perception-Based Event Filtering
 */
import type { ISemanticEvent, Presence } from '@sharpee/core';
import type { IFEntity, IWorldModel } from '@sharpee/world-model';
export type { Presence } from '@sharpee/core';
/**
 * Sense types for perception checks
 */
export type Sense = 'sight' | 'hearing' | 'smell' | 'touch';
/**
 * A single per-sense rendering of a witnessable fact: the message ID to render
 * and the parameters that fill its template.
 *
 * @see ADR-069 amendment — Per-sense rendering selection
 */
export interface Rendering {
    messageId: string;
    params: Record<string, unknown>;
}
/**
 * The per-sense renderings carried by a witnessable event's `data.renderings`.
 *
 * The emitter (e.g. NpcService) populates the senses it produces; PerceptionService
 * selects one by the perceiver's available sense. Absent ⇒ not a witnessable fact
 * (pass through). Present-but-empty `{}` ⇒ perceptible by nothing (blocked).
 */
export type PerSenseRenderings = Partial<Record<Sense, Rendering>>;
/**
 * Fixed selection precedence for renderings — independent of map key order.
 * A new `Sense` must declare its rank here.
 */
export declare const SENSE_PRECEDENCE: readonly Sense[];
/**
 * Reasons why perception might be blocked
 */
export type PerceptionBlockReason = 'darkness' | 'blindness' | 'blindfolded' | 'unknown';
/**
 * Data for a perception-blocked event
 */
export interface PerceptionBlockedData {
    /** The original event type that was blocked */
    originalType: string;
    /** Why perception was blocked */
    reason: PerceptionBlockReason;
    /** Which sense was blocked */
    sense: Sense;
    /** Original event data (for debugging/logging) */
    originalData?: unknown;
}
/**
 * Service interface for filtering events based on player perception.
 *
 * The perception service determines what the player can perceive based on:
 * - Environmental factors (darkness, noise, etc.)
 * - Actor state (blindness, deafness, etc.)
 * - Equipment (blindfold, earplugs, etc.)
 *
 * Events that describe things the player cannot perceive are transformed
 * or removed before being sent to the text service.
 *
 * @see ADR-069 Perception-Based Event Filtering
 */
export interface IPerceptionService {
    /**
     * Filter events based on what the actor can perceive.
     *
     * @param events - Raw events from action execution
     * @param actor - The perceiving actor (usually the player)
     * @param world - The world model for checking environment state
     * @returns Filtered/transformed events based on perception
     */
    filterEvents(events: ISemanticEvent[], actor: IFEntity, world: IWorldModel): ISemanticEvent[];
    /**
     * Check if an actor can perceive using a specific sense.
     *
     * @param actor - The perceiving actor
     * @param location - The location being perceived
     * @param world - The world model
     * @param sense - Which sense to check (defaults to 'sight')
     * @returns true if the actor can perceive, false otherwise
     */
    canPerceive(actor: IFEntity, location: IFEntity, world: IWorldModel, sense: Sense): boolean;
    /**
     * The observer's presence relative to a place where an event happened
     * (ADR-328 D3). Co-location and concealment only — sight is a separate
     * question (`canPerceive`), and darkness stays a transform (ADR-069).
     *
     * @param observer - The perceiving actor (usually the player)
     * @param locationId - Where the event happened: a room, a region, or any
     *   entity (resolved to its containing room)
     * @param world - The world model
     * @returns `present` when co-located and visible, `concealed` when
     *   co-located and hidden, `absent` otherwise — including when the
     *   location cannot be resolved
     */
    presenceOf(observer: IFEntity, locationId: string, world: IWorldModel): Presence;
}
```
