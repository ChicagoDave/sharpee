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
export type { TakenEventData, TakingErrorData } from '../actions/standard/taking/taking-events.js';
export type { DroppedEventData, DroppingErrorData } from '../actions/standard/dropping/dropping-events.js';
export type { LookedEventData, RoomDescriptionEventData, ListContentsEventData } from '../actions/standard/looking/looking-events.js';
export type { ExaminedEventData, ExaminingErrorData } from '../actions/standard/examining/examining-events.js';
export type { ActorMovedEventData, ActorExitedEventData, ActorEnteredEventData, GoingErrorData } from '../actions/standard/going/going-events.js';
export type { OpenedEventData, RevealedEventData, ExitRevealedEventData, OpeningErrorData } from '../actions/standard/opening/opening-events.js';
export type { PutInEventData, PutOnEventData } from '../actions/standard/putting/putting-events.js';
export type { LockedEventData, LockingErrorData } from '../actions/standard/locking/locking-events.js';
export type { UnlockedEventData, UnlockingErrorData } from '../actions/standard/unlocking/unlocking-events.js';
export type { WornEventData, WearingErrorData } from '../actions/standard/wearing/wearing-events.js';
export type { RemovedEventData as TakingOffRemovedEventData, TakingOffErrorData } from '../actions/standard/taking_off/taking-off-events.js';
export type { EnteredEventData, EnteringErrorData } from '../actions/standard/entering/entering-events.js';
export type { ExitedEventData, ExitingErrorData } from '../actions/standard/exiting/exiting-events.js';
export type { SwitchedOnEventData, SwitchingOnErrorData } from '../actions/standard/switching_on/switching_on-events.js';
export type { SwitchedOffEventData, SwitchingOffErrorData } from '../actions/standard/switching_off/switching_off-events.js';
export type { ScoreDisplayedEventData } from '../actions/standard/scoring/scoring-events.js';
export type { InventoryEventData, InventoryItem } from '../actions/standard/inventory/inventory-events.js';

// Import types for declaration merging
import type { TakenEventData } from '../actions/standard/taking/taking-events.js';
import type { DroppedEventData } from '../actions/standard/dropping/dropping-events.js';
import type { LookedEventData, RoomDescriptionEventData, ListContentsEventData } from '../actions/standard/looking/looking-events.js';
import type { ExaminedEventData } from '../actions/standard/examining/examining-events.js';
import type { ActorMovedEventData, ActorExitedEventData, ActorEnteredEventData } from '../actions/standard/going/going-events.js';
import type { OpenedEventData, RevealedEventData, ExitRevealedEventData } from '../actions/standard/opening/opening-events.js';
import type { PutInEventData, PutOnEventData } from '../actions/standard/putting/putting-events.js';
import type { LockedEventData } from '../actions/standard/locking/locking-events.js';
import type { UnlockedEventData } from '../actions/standard/unlocking/unlocking-events.js';
import type { WornEventData } from '../actions/standard/wearing/wearing-events.js';
import type { RemovedEventData as TakingOffRemovedData } from '../actions/standard/taking_off/taking-off-events.js';
import type { EnteredEventData } from '../actions/standard/entering/entering-events.js';
import type { ExitedEventData } from '../actions/standard/exiting/exiting-events.js';
import type { SwitchedOnEventData } from '../actions/standard/switching_on/switching_on-events.js';
import type { SwitchedOffEventData } from '../actions/standard/switching_off/switching_off-events.js';
import type { ScoreDisplayedEventData } from '../actions/standard/scoring/scoring-events.js';
import type { InventoryEventData } from '../actions/standard/inventory/inventory-events.js';

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
