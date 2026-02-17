/**
 * Brochure Delivery Fuse - MDL act1.254:60-61, act3.199:1423-1446
 *
 * When the player sends for the brochure (matchbook hint), a flag is set.
 * When the player next enters the kitchen, a 3-turn fuse is armed.
 * After 3 turns, a knock is heard and the brochure (containing the
 * Don Woods Commemorative stamp, worth 1 trophy case point) appears
 * in the mailbox at West of House.
 *
 * MDL sequence:
 * 1. SEND FOR BROCHURE → BRFLAG1 set
 * 2. Enter kitchen (GO-IN) → <CLOCK-INT ,BROIN 3>
 * 3. After 3 turns → knock, brochure in MAILB, BRFLAG2 set
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import {
  WorldModel,
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  ReadableTrait,
  EntityType
} from '@sharpee/world-model';
import { ISchedulerService, Fuse, SchedulerContext } from '@sharpee/plugin-scheduler';
import type { Daemon } from '@sharpee/plugin-scheduler';
import { TreasureTrait } from '../traits';
import { DungeoSchedulerMessages } from './scheduler-messages';

// State keys
const BROCHURE_ORDERED_KEY = 'dungeo.brochure.ordered';   // BRFLAG1
const BROCHURE_ARMED_KEY = 'dungeo.brochure.armed';       // fuse armed (entered kitchen)
const BROCHURE_DELIVERED_KEY = 'dungeo.brochure.delivered'; // BRFLAG2

// Fuse/daemon IDs
const BROCHURE_DELIVERY_FUSE_ID = 'dungeo.brochure.delivery';
const BROCHURE_KITCHEN_DAEMON_ID = 'dungeo.brochure.kitchen_watch';

// Timing
const DELIVERY_TURNS = 3; // MDL: <CLOCK-INT ,BROIN 3>

/**
 * Create the brochure with the Don Woods stamp inside and place it in the mailbox.
 * Moved from send-action.ts — runs when the delivery fuse triggers.
 */
function createBrochureWithStamp(world: WorldModel, mailboxId: EntityId): void {
  const mailbox = world.getEntity(mailboxId);
  if (!mailbox) return;

  // Create the brochure (container that holds the stamp)
  const brochure = world.createEntity('brochure', EntityType.CONTAINER);
  brochure.add(new IdentityTrait({
    name: 'large brochure',
    aliases: ['brochure', 'MIT brochure', 'free brochure'],
    description: 'A large, glossy brochure from MIT Tech. Affixed loosely to it is a small stamp.',
    properName: false,
    article: 'a'
  }));

  brochure.add(new ContainerTrait({
    capacity: { maxItems: 1 }
  }));

  brochure.add(new OpenableTrait({ isOpen: true }));

  // MDL brochure text: BRO1 + USER-NAME + BRO2 (act3.199:1431, dung.355:374-398)
  brochure.add(new ReadableTrait({
    text: `The mailing label on this glossy brochure from MIT Tech reads:

\t\tAdventurer
\t\tc/o Local Dungeon Master
\t\tWhite House, GUE

From the Introduction:

The brochure describes, for the edification of the prospective student, the stringent but wide-ranging curriculum of MIT Tech. Required courses are offered in Ambition, Distraction, Uglification and Derision. The Humanities are not slighted in this institution, as the student may register for Reeling and Writhing, Mystery (Ancient and Modern), Seaography, and Drawling (which includes Stretching and Fainting in Coils). Advanced students are expected to learn Laughing and Grief.

\t\t\tWilliam Barton Flathead, Fovnder

(The brochure continues in this vein for a few hundred more pages.)`
  }));

  // Create the Don Woods Commemorative stamp (1 point treasure)
  // MDL: dung.355:6049-6082
  const stamp = world.createEntity('stamp', EntityType.ITEM);
  stamp.add(new IdentityTrait({
    name: 'Don Woods stamp',
    aliases: ['stamp', 'woods stamp', 'postage stamp', 'commemorative stamp'],
    description: 'A small commemorative postage stamp depicting a spelunker.',
    properName: false,
    article: 'a',
    // OFVAL is 0 in MDL source — no take points
  }));

  // MDL: OREAD on the stamp object (dung.355:6058-6082)
  stamp.add(new ReadableTrait({
    text: `---v----v----v----v----v---
|         _______         |
>  One   /       \\     G  <
| Lousy /         \\    U  |
> Point |   ___   |    E  <
|       |  (___)  |       |
>       <--)___(-->    P  <
|       / /     \\ \\    o  |
>      / /       \\ \\   s  <
|     |-|---------|--|  t  |
>     | |  \\ _ /  | |  a  <
|     | | --(_)-- | |  g  |
>     | |  /| |\\  | |  e  <
|     |-|---|_|---|-|     |
>      \\ \\__/_\\__/ /      <
|       _/_______\\_       |
>      |  f.m.l.c. |      <
|      -------------       |
>                          <
|   Donald Woods, Editor  |
>     Spelunker Today      <
|                          |
---^----^----^----^----^---`
  }));

  stamp.add(new TreasureTrait({
    trophyCaseValue: 1  // OTVAL 1 — MDL dung.355:6057
  }));

  // Place stamp inside brochure
  world.moveEntity(stamp.id, brochure.id);

  // Place brochure inside mailbox (temporarily open for move, then restore)
  const openable = mailbox.get(OpenableTrait);
  const wasOpen = openable?.isOpen ?? false;
  if (openable) {
    openable.isOpen = true;
  }
  world.moveEntity(brochure.id, mailboxId);
  if (openable && !wasOpen) {
    openable.isOpen = false;
  }
}

/**
 * Create the 3-turn delivery fuse.
 * Armed when the player enters the kitchen after ordering.
 */
function createDeliveryFuse(world: WorldModel, mailboxId: EntityId): Fuse {
  return {
    id: BROCHURE_DELIVERY_FUSE_ID,
    name: 'Brochure Delivery',
    turns: DELIVERY_TURNS,
    priority: 5,

    // Always tick — once armed, counts down every turn
    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      // Create brochure and place in mailbox
      createBrochureWithStamp(ctx.world, mailboxId);

      // Mark as delivered (BRFLAG2)
      ctx.world.setStateValue(BROCHURE_DELIVERED_KEY, true);

      return [{
        id: `brochure-delivery-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: {},
        data: { messageId: DungeoSchedulerMessages.BROCHURE_KNOCK }
      }];
    }
  };
}

/**
 * Daemon that watches for the player entering the kitchen.
 * When the brochure has been ordered but not yet armed, entering
 * the kitchen arms the 3-turn delivery fuse.
 *
 * MDL: act1.254:60-61
 *   (<AND <VERB? "GO-IN"> ,BRFLAG1!-FLAG <NOT ,BRFLAG2!-FLAG>>
 *    <CLOCK-INT ,BROIN 3>)
 */
function createKitchenWatchDaemon(
  scheduler: ISchedulerService,
  world: WorldModel,
  kitchenId: EntityId,
  mailboxId: EntityId
): Daemon {
  return {
    id: BROCHURE_KITCHEN_DAEMON_ID,
    name: 'Brochure Kitchen Watch',
    priority: 1,

    condition: (ctx: SchedulerContext): boolean => {
      // Only active when ordered but not yet armed or delivered
      const ordered = ctx.world.getStateValue(BROCHURE_ORDERED_KEY) as boolean;
      const armed = ctx.world.getStateValue(BROCHURE_ARMED_KEY) as boolean;
      const delivered = ctx.world.getStateValue(BROCHURE_DELIVERED_KEY) as boolean;
      return ordered === true && !armed && !delivered;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      // Check if player is in the kitchen
      if (ctx.playerLocation !== kitchenId) return [];

      // Player entered kitchen — arm the delivery fuse
      ctx.world.setStateValue(BROCHURE_ARMED_KEY, true);
      scheduler.setFuse(createDeliveryFuse(world, mailboxId));

      return [];
    }
  };
}

/**
 * Register the brochure delivery mechanism.
 * Called from scheduler-setup.ts during story initialization.
 */
export function registerBrochureDelivery(
  scheduler: ISchedulerService,
  world: WorldModel,
  kitchenId: EntityId,
  mailboxId: EntityId
): void {
  scheduler.registerDaemon(createKitchenWatchDaemon(scheduler, world, kitchenId, mailboxId));
}
