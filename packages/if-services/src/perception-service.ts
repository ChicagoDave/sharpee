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

import type { ISemanticEvent } from '@sharpee/core';
import type { IFEntity, IWorldModel } from '@sharpee/world-model';

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
export const SENSE_PRECEDENCE: readonly Sense[] = ['sight', 'hearing', 'smell', 'touch'];

/**
 * Reasons why perception might be blocked
 */
export type PerceptionBlockReason =
  | 'darkness' // Room is dark, no light source
  | 'blindness' // Actor has blind trait
  | 'blindfolded' // Actor wearing something blocking vision
  | 'unknown';

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
  filterEvents(
    events: ISemanticEvent[],
    actor: IFEntity,
    world: IWorldModel
  ): ISemanticEvent[];

  /**
   * Check if an actor can perceive using a specific sense.
   *
   * @param actor - The perceiving actor
   * @param location - The location being perceived
   * @param world - The world model
   * @param sense - Which sense to check (defaults to 'sight')
   * @returns true if the actor can perceive, false otherwise
   */
  canPerceive(
    actor: IFEntity,
    location: IFEntity,
    world: IWorldModel,
    sense: Sense
  ): boolean;
}
