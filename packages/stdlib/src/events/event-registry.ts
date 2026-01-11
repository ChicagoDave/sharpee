/**
 * Stdlib Event Registry Extension
 *
 * Extends the core EventDataRegistry with stdlib action event types.
 * Uses TypeScript declaration merging to add type safety for IF events.
 *
 * @see ADR-082 for the design rationale
 */

import type { EntityId } from '@sharpee/core';

// Re-export action event data types for external use
export type { TakenEventData, TakingErrorData } from '../actions/standard/taking/taking-events';
export type { DroppedEventData, DroppingErrorData } from '../actions/standard/dropping/dropping-events';
export type { LookedEventData, RoomDescriptionEventData, ListContentsEventData } from '../actions/standard/looking/looking-events';
export type { ExaminedEventData, ExaminingErrorData } from '../actions/standard/examining/examining-events';
export type { ActorMovedEventData, ActorExitedEventData, ActorEnteredEventData, GoingErrorData } from '../actions/standard/going/going-events';
export type { OpenedEventData, RevealedEventData, ExitRevealedEventData, OpeningErrorData } from '../actions/standard/opening/opening-events';
export type { PutInEventData, PutOnEventData } from '../actions/standard/putting/putting-events';
export type { LockedEventData, LockingErrorData } from '../actions/standard/locking/locking-events';
export type { UnlockedEventData, UnlockingErrorData } from '../actions/standard/unlocking/unlocking-events';
export type { WornEventData, WearingErrorData } from '../actions/standard/wearing/wearing-events';
export type { RemovedEventData as TakingOffRemovedEventData, TakingOffErrorData } from '../actions/standard/taking_off/taking-off-events';
export type { EnteredEventData, EnteringErrorData } from '../actions/standard/entering/entering-events';
export type { ExitedEventData, ExitingErrorData } from '../actions/standard/exiting/exiting-events';
export type { SwitchedOnEventData, SwitchingOnErrorData } from '../actions/standard/switching_on/switching_on-events';
export type { SwitchedOffEventData, SwitchingOffErrorData } from '../actions/standard/switching_off/switching_off-events';
export type { ScoreDisplayedEventData, ScoringErrorData } from '../actions/standard/scoring/scoring-events';
export type { InventoryEventData, InventoryItem } from '../actions/standard/inventory/inventory-events';

// Import types for declaration merging
import type { TakenEventData } from '../actions/standard/taking/taking-events';
import type { DroppedEventData } from '../actions/standard/dropping/dropping-events';
import type { LookedEventData, RoomDescriptionEventData, ListContentsEventData } from '../actions/standard/looking/looking-events';
import type { ExaminedEventData } from '../actions/standard/examining/examining-events';
import type { ActorMovedEventData, ActorExitedEventData, ActorEnteredEventData } from '../actions/standard/going/going-events';
import type { OpenedEventData, RevealedEventData, ExitRevealedEventData } from '../actions/standard/opening/opening-events';
import type { PutInEventData, PutOnEventData } from '../actions/standard/putting/putting-events';
import type { LockedEventData } from '../actions/standard/locking/locking-events';
import type { UnlockedEventData } from '../actions/standard/unlocking/unlocking-events';
import type { WornEventData } from '../actions/standard/wearing/wearing-events';
import type { RemovedEventData as TakingOffRemovedData } from '../actions/standard/taking_off/taking-off-events';
import type { EnteredEventData } from '../actions/standard/entering/entering-events';
import type { ExitedEventData } from '../actions/standard/exiting/exiting-events';
import type { SwitchedOnEventData } from '../actions/standard/switching_on/switching_on-events';
import type { SwitchedOffEventData } from '../actions/standard/switching_off/switching_off-events';
import type { ScoreDisplayedEventData } from '../actions/standard/scoring/scoring-events';
import type { InventoryEventData } from '../actions/standard/inventory/inventory-events';

// ============================================================
// Common Action Event Data Types
// ============================================================

/**
 * Standard success event data for actions
 */
export interface ActionSuccessData {
  actionId: string;
  messageId: string;
  params?: Record<string, unknown>;
}

/**
 * Standard error event data for actions
 */
export interface ActionErrorData {
  actionId: string;
  reason: string;
  messageId: string;
  params?: Record<string, unknown>;
}

/**
 * Closed event data (for closing action)
 */
export interface ClosedEventData {
  targetId: EntityId;
  targetName: string;
}

/**
 * Implicit take event data
 *
 * Emitted when an action requires a carried item and the item
 * is automatically taken first. Used for "(first taking the X)" messages.
 */
export interface ImplicitTakeEventData {
  item: EntityId;
  itemName: string;
}

// ============================================================
// Declaration Merging - Extend Core Registry
// ============================================================

declare module '@sharpee/core' {
  interface EventDataRegistry {
    // --------------------------------------------------------
    // Taking / Dropping
    // --------------------------------------------------------
    'if.event.taken': TakenEventData;
    'if.event.dropped': DroppedEventData;
    'if.event.implicit_take': ImplicitTakeEventData;

    // --------------------------------------------------------
    // Looking / Examining
    // --------------------------------------------------------
    'if.event.looked': LookedEventData;
    'if.event.room.description': RoomDescriptionEventData;
    'if.event.list.contents': ListContentsEventData;
    'if.event.examined': ExaminedEventData;

    // --------------------------------------------------------
    // Movement
    // --------------------------------------------------------
    'if.event.actor_moved': ActorMovedEventData;
    'if.event.actor_exited': ActorExitedEventData;
    'if.event.actor_entered': ActorEnteredEventData;

    // --------------------------------------------------------
    // Opening / Closing
    // --------------------------------------------------------
    'if.event.opened': OpenedEventData;
    'if.event.closed': ClosedEventData;
    'if.event.revealed': RevealedEventData;
    'if.event.exit_revealed': ExitRevealedEventData;

    // --------------------------------------------------------
    // Containers / Supporters
    // --------------------------------------------------------
    'if.event.put_in': PutInEventData;
    'if.event.put_on': PutOnEventData;

    // --------------------------------------------------------
    // Locking / Unlocking
    // --------------------------------------------------------
    'if.event.locked': LockedEventData;
    'if.event.unlocked': UnlockedEventData;

    // --------------------------------------------------------
    // Wearing / Taking Off
    // --------------------------------------------------------
    'if.event.worn': WornEventData;
    'if.event.removed': TakingOffRemovedData;

    // --------------------------------------------------------
    // Entering / Exiting (containers/supporters)
    // --------------------------------------------------------
    'if.event.entered': EnteredEventData;
    'if.event.exited': ExitedEventData;

    // --------------------------------------------------------
    // Switching On/Off
    // --------------------------------------------------------
    'if.event.switched_on': SwitchedOnEventData;
    'if.event.switched_off': SwitchedOffEventData;

    // --------------------------------------------------------
    // Meta Actions
    // --------------------------------------------------------
    'if.event.score_displayed': ScoreDisplayedEventData;
    'if.action.inventory': InventoryEventData;

    // --------------------------------------------------------
    // Generic Action Events
    // --------------------------------------------------------
    'action.success': ActionSuccessData;
    'action.error': ActionErrorData;
  }
}

// Force module augmentation to take effect
export {};
