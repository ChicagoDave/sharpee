/**
 * Exorcism Handler - Event handler for the bell/book/candle ritual
 *
 * The exorcism ritual to banish the spirits blocking Hades requires:
 * 1. Ring the bell
 * 2. Read the black book
 * 3. Light the candles
 *
 * All three must be performed while at the Entry to Hades.
 * The order doesn't matter, but all three must be done.
 *
 * When complete:
 * - Spirits are banished
 * - Passage south to Land of Dead opens
 * - Player receives points
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel, IdentityTrait, LightSourceTrait, SwitchableTrait, RoomTrait, RoomBehavior, Direction } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';
import { HadesEntryTrait } from '../traits';

export const ExorcismMessages = {
  SPIRITS_BLOCK: 'dungeo.exorcism.spirits_block',
  SPIRITS_VANISH: 'dungeo.exorcism.spirits_vanish',
  PASSAGE_OPENS: 'dungeo.exorcism.passage_opens',
  BELL_ECHOES: 'dungeo.exorcism.bell_echoes',
  RITUAL_PROGRESS: 'dungeo.exorcism.ritual_progress',
} as const;

// State keys for tracking ritual progress
const EXORCISM_STATE_PREFIX = 'dungeo.exorcism.';
const BELL_RUNG_KEY = `${EXORCISM_STATE_PREFIX}bell_rung`;
const BOOK_READ_KEY = `${EXORCISM_STATE_PREFIX}book_read`;
const CANDLES_LIT_KEY = `${EXORCISM_STATE_PREFIX}candles_lit`;
const SPIRITS_BANISHED_KEY = `${EXORCISM_STATE_PREFIX}spirits_banished`;

/**
 * Check if an entity is the exorcism bell
 */
function isExorcismBell(entity: any): boolean {
  return entity?.exorcismRole === 'bell';
}

/**
 * Check if an entity is the black book
 */
function isExorcismBook(entity: any): boolean {
  return entity?.exorcismRole === 'book';
}

/**
 * Check if an entity is the candles
 */
function isExorcismCandles(entity: any): boolean {
  return entity?.exorcismRole === 'candles';
}

/**
 * Check if candles are currently lit
 */
function areCandlesLit(candles: any): boolean {
  const switchable = candles?.get?.(SwitchableTrait);
  const lightSource = candles?.get?.(LightSourceTrait);
  return switchable?.isOn === true || lightSource?.isLit === true;
}

/**
 * Find the Entry to Hades room
 */
function findEntryToHades(world: WorldModel): EntityId | undefined {
  const room = world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Entrance to Hades';
  });
  return room?.id;
}

/**
 * Find exorcism items
 */
function findExorcismItems(world: WorldModel): {
  bell?: EntityId;
  book?: EntityId;
  candles?: EntityId;
} {
  const result: { bell?: EntityId; book?: EntityId; candles?: EntityId } = {};

  for (const entity of world.getAllEntities()) {
    if (isExorcismBell(entity)) result.bell = entity.id;
    if (isExorcismBook(entity)) result.book = entity.id;
    if (isExorcismCandles(entity)) result.candles = entity.id;
  }

  return result;
}

/**
 * Check if all ritual requirements are met
 */
function checkRitualComplete(world: WorldModel, entryToHadesId: EntityId): boolean {
  return (
    world.getStateValue(BELL_RUNG_KEY) === true &&
    world.getStateValue(BOOK_READ_KEY) === true &&
    world.getStateValue(CANDLES_LIT_KEY) === true
  );
}

/**
 * Complete the exorcism - banish spirits and open passage
 */
function completeExorcism(
  world: WorldModel,
  entryToHadesId: EntityId,
  landOfDeadId: EntityId
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  // Mark spirits as banished
  world.setStateValue(SPIRITS_BANISHED_KEY, true);

  // Get the Entry to Hades room and clear the spirits flag
  const entryRoom = world.getEntity(entryToHadesId);
  if (entryRoom) {
    const hadesTrait = entryRoom.get(HadesEntryTrait);
    if (hadesTrait) {
      hadesTrait.spiritsBlocking = false;
    }

    // Clear the blocked east exit
    RoomBehavior.unblockExit(entryRoom, Direction.EAST);

    // Update room description
    const identity = entryRoom.get(IdentityTrait);
    if (identity) {
      identity.description = 'You are at the entrance to Hades, the land of the dead. An eerie mist swirls around you. A passage leads east into darkness, and a corridor leads north.';
    }
  }

  // Emit spirits vanish event
  events.push({
    id: `exorcism-spirits-vanish-${Date.now()}`,
    type: 'npc.emoted',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: ExorcismMessages.SPIRITS_VANISH
    },
    narrate: true
  });

  // Emit passage opens event
  events.push({
    id: `exorcism-passage-opens-${Date.now()}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: ExorcismMessages.PASSAGE_OPENS
    }
  });

  // Award points (exorcism is worth 10 points)
  world.awardScore('exorcism', 10, 'Completed the exorcism');

  return events;
}

/**
 * Register exorcism event handlers
 */
export function registerExorcismHandler(
  scheduler: ISchedulerService,
  world: WorldModel,
  entryToHadesId: EntityId,
  landOfDeadId: EntityId
): void {
  const exorcismItems = findExorcismItems(world);

  // Initialize ritual state
  world.setStateValue(BELL_RUNG_KEY, false);
  world.setStateValue(BOOK_READ_KEY, false);
  world.setStateValue(CANDLES_LIT_KEY, false);
  world.setStateValue(SPIRITS_BANISHED_KEY, false);

  // Track bell ringing via game.message event (emitted by ring action)
  world.registerEventHandler('game.message', (event, w) => {
    const data = event.data as Record<string, any> | undefined;
    const messageId = data?.messageId;
    const location = data?.location;

    // Check if this is bell being rung at Entry to Hades
    if (messageId === 'dungeo.ring.success' && location === entryToHadesId) {
      w.setStateValue(BELL_RUNG_KEY, true);
    }
  });

  // Track book reading via if.event.read event
  world.registerEventHandler('if.event.read', (event, w) => {
    const data = event.data as Record<string, any> | undefined;
    const targetId = data?.target || data?.targetId;

    if (targetId && exorcismItems.book && targetId === exorcismItems.book) {
      // Check if player is at Entry to Hades
      const player = w.getPlayer();
      if (player) {
        const playerLocation = w.getLocation(player.id);
        if (playerLocation === entryToHadesId) {
          w.setStateValue(BOOK_READ_KEY, true);
        }
      }
    }
  });

  // Track candle lighting via if.event.switched_on
  world.registerEventHandler('if.event.switched_on', (event, w) => {
    const data = event.data as Record<string, any> | undefined;
    const targetId = data?.target;

    if (targetId && exorcismItems.candles && targetId === exorcismItems.candles) {
      // Check if player is at Entry to Hades
      const player = w.getPlayer();
      if (player) {
        const playerLocation = w.getLocation(player.id);
        if (playerLocation === entryToHadesId) {
          w.setStateValue(CANDLES_LIT_KEY, true);
        }
      }
    }
  });

  // Daemon to check for ritual completion
  const exorcismDaemon: Daemon = {
    id: 'dungeo-exorcism-check',
    name: 'Exorcism Ritual Check',
    priority: 40,

    condition: (context: SchedulerContext): boolean => {
      // Only run if spirits not already banished and player is at Entry to Hades
      if (context.world.getStateValue(SPIRITS_BANISHED_KEY)) {
        return false;
      }
      return context.playerLocation === entryToHadesId;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const { world } = context;

      // Check if all ritual requirements are met
      if (checkRitualComplete(world, entryToHadesId)) {
        // Complete the exorcism!
        return completeExorcism(world, entryToHadesId, landOfDeadId);
      }

      return [];
    }
  };

  scheduler.registerDaemon(exorcismDaemon);
}

/**
 * Check if spirits are blocking the passage
 */
export function areSpiritsBlocking(world: WorldModel, entryToHadesId: EntityId): boolean {
  const room = world.getEntity(entryToHadesId);
  const trait = room?.get(HadesEntryTrait);
  return trait?.spiritsBlocking === true;
}

/**
 * Get exorcism ritual state for GDT display
 */
export function getExorcismState(world: WorldModel): {
  bellRung: boolean;
  bookRead: boolean;
  candlesLit: boolean;
  spiritsBanished: boolean;
} {
  return {
    bellRung: world.getStateValue(BELL_RUNG_KEY) === true,
    bookRead: world.getStateValue(BOOK_READ_KEY) === true,
    candlesLit: world.getStateValue(CANDLES_LIT_KEY) === true,
    spiritsBanished: world.getStateValue(SPIRITS_BANISHED_KEY) === true
  };
}
