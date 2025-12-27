/**
 * PerceptionService - Filters events based on what the player can perceive
 *
 * This service sits between action execution and the text service, transforming
 * events that describe things the player cannot perceive (due to darkness,
 * blindness, etc.) into appropriate alternative events.
 *
 * @see ADR-069 Perception-Based Event Filtering
 */

import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, IWorldModel, VisibilityBehavior } from '@sharpee/world-model';

// Re-export interface types from if-services for convenience
export type {
  Sense,
  PerceptionBlockReason,
  PerceptionBlockedData,
  IPerceptionService,
} from '@sharpee/if-services';

import type {
  Sense,
  PerceptionBlockReason,
  PerceptionBlockedData,
  IPerceptionService,
} from '@sharpee/if-services';

/**
 * Default implementation of IPerceptionService
 *
 * Filters events based on environmental and actor state:
 * - Darkness (room is dark, no light source)
 * - Blindness (future: actor has blind trait)
 * - Blindfold (future: actor wearing something over eyes)
 */
export class PerceptionService implements IPerceptionService {
  /**
   * Filter events based on what the actor can perceive.
   *
   * Visual events (room descriptions, contents lists) are transformed
   * into perception-blocked events when the player cannot see.
   */
  filterEvents(
    events: ISemanticEvent[],
    actor: IFEntity,
    world: IWorldModel
  ): ISemanticEvent[] {
    const location = this.getActorRoom(actor, world);
    if (!location) {
      return events; // Can't determine location, pass through
    }

    const canSee = this.canPerceive(actor, location, world, 'sight');

    return events.map((event) => {
      // Only filter visual events
      if (!this.isVisualEvent(event)) {
        return event;
      }

      // If player can see, pass through unchanged
      if (canSee) {
        return event;
      }

      // Transform to perception-blocked event
      return this.createPerceptionBlockedEvent(event, actor, location, world);
    });
  }

  /**
   * Check if an actor can perceive using a specific sense.
   */
  canPerceive(
    actor: IFEntity,
    location: IFEntity,
    world: IWorldModel,
    sense: Sense
  ): boolean {
    switch (sense) {
      case 'sight':
        return this.canSeeVisually(actor, location, world);
      case 'hearing':
        return this.canHear(actor, location, world);
      case 'smell':
        return this.canSmell(actor, location, world);
      case 'touch':
        return this.canTouch(actor, location, world);
      default:
        return true;
    }
  }

  /**
   * Check if actor can see in the given location.
   *
   * Checks (in order):
   * 1. Actor blindness trait
   * 2. Actor wearing blindfold
   * 3. Location darkness (via VisibilityBehavior)
   */
  private canSeeVisually(
    actor: IFEntity,
    location: IFEntity,
    world: IWorldModel
  ): boolean {
    // Check actor state first
    if (this.isBlind(actor)) {
      return false;
    }

    if (this.isWearingBlindfold(actor, world)) {
      return false;
    }

    // Check environmental darkness
    // Note: VisibilityBehavior.isDark expects a concrete WorldModel
    // We cast here since IWorldModel is compatible
    if (VisibilityBehavior.isDark(location, world as any)) {
      return false;
    }

    return true;
  }

  /**
   * Check if actor can hear. Currently always true (future extension point).
   */
  private canHear(
    _actor: IFEntity,
    _location: IFEntity,
    _world: IWorldModel
  ): boolean {
    // Future: check deafness trait, earplugs, etc.
    return true;
  }

  /**
   * Check if actor can smell. Currently always true (future extension point).
   */
  private canSmell(
    _actor: IFEntity,
    _location: IFEntity,
    _world: IWorldModel
  ): boolean {
    return true;
  }

  /**
   * Check if actor can touch. Currently always true (future extension point).
   */
  private canTouch(
    _actor: IFEntity,
    _location: IFEntity,
    _world: IWorldModel
  ): boolean {
    return true;
  }

  /**
   * Check if an actor has a blindness trait.
   */
  private isBlind(_actor: IFEntity): boolean {
    // Future: check for BLIND trait
    // For now, no actors are blind
    return false;
  }

  /**
   * Check if an actor is wearing something that blocks vision.
   */
  private isWearingBlindfold(_actor: IFEntity, _world: IWorldModel): boolean {
    // Future: check worn items for blindfold trait
    // For now, no items are blindfolds
    return false;
  }

  /**
   * Get the room an actor is currently in.
   */
  private getActorRoom(actor: IFEntity, world: IWorldModel): IFEntity | null {
    // IWorldModel should have getContainingRoom, but let's be safe
    if ('getContainingRoom' in world) {
      return (world as any).getContainingRoom(actor.id) || null;
    }
    return null;
  }

  /**
   * Check if an event requires visual perception.
   */
  private isVisualEvent(event: ISemanticEvent): boolean {
    // Room descriptions always require sight
    if (event.type === 'if.event.room.description') {
      return true;
    }

    // Contents lists require sight
    if (event.type === 'if.event.contents.listed') {
      return true;
    }

    // action.success with contents_list messageId requires sight
    if (event.type === 'action.success') {
      const data = event.data as { messageId?: string } | undefined;
      if (data?.messageId === 'contents_list') {
        return true;
      }
    }

    return false;
  }

  /**
   * Create a perception-blocked event to replace a filtered event.
   */
  private createPerceptionBlockedEvent(
    originalEvent: ISemanticEvent,
    actor: IFEntity,
    location: IFEntity,
    world: IWorldModel
  ): ISemanticEvent {
    const reason = this.getBlockReason(actor, location, world);

    const blockedData: PerceptionBlockedData = {
      originalType: originalEvent.type,
      reason,
      sense: 'sight',
      originalData: originalEvent.data,
    };

    return {
      ...originalEvent,
      type: 'if.event.perception.blocked',
      data: blockedData,
    };
  }

  /**
   * Determine why perception is blocked.
   */
  private getBlockReason(
    actor: IFEntity,
    location: IFEntity,
    world: IWorldModel
  ): PerceptionBlockReason {
    if (this.isBlind(actor)) {
      return 'blindness';
    }

    if (this.isWearingBlindfold(actor, world)) {
      return 'blindfolded';
    }

    if (VisibilityBehavior.isDark(location, world as any)) {
      return 'darkness';
    }

    return 'unknown';
  }
}
