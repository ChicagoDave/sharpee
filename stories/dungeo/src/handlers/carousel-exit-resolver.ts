/**
 * Carousel exit resolver (ADR-295 computed exits).
 *
 * Replaces the retired post-hoc exit daemons for the Round Room (CAROU,
 * MDL act1.254 CAROUSEL-EXIT) and the Low Room (MAGNE, MDL act3.199
 * MAGNET-ROOM-EXIT): destination resolution now happens INSIDE the going
 * action — one traversal, one arrival (ADR-295 D1) — instead of a daemon
 * re-moving the player after the report (GH #207).
 *
 * Both rooms share one resolver, parameterized by `CarouselExitTrait` data:
 * gate (Sharpee-native spin state), named draw point, candidates, and
 * narration message ids. The Low Room's entry message ("compass starts
 * spinning") is a chain handler on actor_moved — a reaction to a completed
 * arrival, the legitimate event boundary.
 *
 * Public interface: `CarouselMessages`, `RoundRoomMessages`,
 * `registerCarouselExits`.
 * Owner context: dungeo story — carousel/magnet puzzle.
 */

import { type ISemanticEvent, definePoint, type ChoicePoint } from '@sharpee/core';
import { WorldModel, RoomBehavior, type ExitResolver } from '@sharpee/world-model';
import { CarouselExitTrait } from '../traits/carousel-exit-trait';
import { RoundRoomTrait } from '../traits/round-room-trait';

// Named draw points (ADR-293 D4): same point names the retired daemons used,
// so the seed → outcome mapping stays on the same streams.
const ROUND_ROOM_EXIT_POINT = definePoint('dungeo.round-room.exit');
const LOW_ROOM_EXIT_POINT = definePoint('dungeo.low-room.exit');

const POINTS: Record<string, ChoicePoint> = {
  [ROUND_ROOM_EXIT_POINT.name]: ROUND_ROOM_EXIT_POINT,
  [LOW_ROOM_EXIT_POINT.name]: LOW_ROOM_EXIT_POINT,
};

export const CarouselMessages = {
  COMPASS_SPINNING: 'dungeo.carousel.compass_spinning',
  CANNOT_GET_BEARINGS: 'dungeo.carousel.cannot_get_bearings',
} as const;

export const RoundRoomMessages = {
  COMPASS_SPINNING: 'dungeo.round_room.compass_spinning',
  DISORIENTED: 'dungeo.round_room.disoriented',
  ROOM_FIXED: 'dungeo.round_room.fixed',
} as const;

// State key shared with the robot's button push (robot-entity.ts).
const CAROUSEL_ACTIVE_KEY = 'dungeo.carousel.active';

let eventCounter = 0;
function messageEvent(messageId: string): ISemanticEvent {
  return {
    id: `carousel-exit-${Date.now()}-${++eventCounter}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: { messageId },
    narrate: true,
  };
}

/**
 * Shared resolver for both carousel rooms (ADR-295 D4). Gates on the room's
 * Sharpee spin state; while spinning, draws the destination from the
 * declared candidates on the trait's named point and attaches the trait's
 * narration. While fixed, defers to static topology.
 */
const carouselExitResolver: ExitResolver = (room, trait, _direction, staticExit, ctx) => {
  // MDL fidelity: CAROUSEL-EXIT / MAGNET-ROOM-EXIT are the PLAYER's exit
  // functions; ROBBER and the other residents never traverse room exits at
  // all. Now that an NPC's step is the real going action (ADR-328 D5), a
  // non-player mover crosses the static topology and draws nothing — the
  // named points' streams stay the player's alone.
  if (ctx.actorId !== ctx.world.getPlayer()?.id) {
    return undefined;
  }
  const data = trait as CarouselExitTrait;

  let spinning = false;
  if (data.spinsWhenStateKeyTrue) {
    spinning = ctx.world.getStateValue(data.spinsWhenStateKeyTrue) === true;
  } else if (data.spinsWhenNotFixed) {
    const roundRoomTrait = room.get(RoundRoomTrait);
    spinning = roundRoomTrait ? !roundRoomTrait.isFixed : false;
  }
  if (!spinning) {
    return undefined; // Static topology governs a fixed room.
  }

  const point = POINTS[data.pointName];
  if (!point) {
    // eslint-disable-next-line no-console
    console.warn(`[carousel-exit] unknown draw point "${data.pointName}" — deferring to static topology.`);
    return undefined;
  }

  const destination = ctx.random.pick(point, data.computedExitsAll.candidates);
  const redirected = destination !== staticExit?.destination;
  const messageIds = [
    ...data.alwaysMessageIds,
    ...(redirected ? data.redirectedMessageIds : []),
  ];

  return {
    kind: 'exit',
    destination,
    events: messageIds.map(messageEvent),
  };
};

export interface CarouselExitRoomIds {
  roundRoom: string;
  lowRoom: string;
  machineRoom: string;
  teaRoom: string;
}

/**
 * Wire both carousel rooms (ADR-295): attach a `CarouselExitTrait` instance
 * to each, register the shared resolver, and chain the Low Room's entry
 * message on player arrival. Called from scheduler-setup during story
 * initialization; registrations are per-world and re-run on every load.
 */
export function registerCarouselExits(world: WorldModel, ids: CarouselExitRoomIds): void {
  // Round Room (CAROU): candidates are its eight static destinations, read
  // from the live exit map in declaration order — the same list, in the same
  // order, the retired daemon drew from.
  const roundRoom = world.getEntity(ids.roundRoom);
  if (roundRoom) {
    const candidates = [...RoomBehavior.getAllExits(roundRoom).values()].map(exit => exit.destination);
    roundRoom.add(new CarouselExitTrait({
      candidates,
      pointName: ROUND_ROOM_EXIT_POINT.name,
      alwaysMessageIds: [RoundRoomMessages.COMPASS_SPINNING],
      redirectedMessageIds: [RoundRoomMessages.DISORIENTED],
      spinsWhenNotFixed: true,
    }));
  }

  // Low Room (MAGNE): all exits scramble 50/50 over Machine Room and Tea
  // Room while the flag is up (MDL <PROB 50>).
  const lowRoom = world.getEntity(ids.lowRoom);
  if (lowRoom) {
    lowRoom.add(new CarouselExitTrait({
      candidates: [ids.machineRoom, ids.teaRoom],
      pointName: LOW_ROOM_EXIT_POINT.name,
      alwaysMessageIds: [CarouselMessages.CANNOT_GET_BEARINGS],
      spinsWhenStateKeyTrue: CAROUSEL_ACTIVE_KEY,
    }));
  }

  world.registerExitResolver(CarouselExitTrait.type, carouselExitResolver);

  // Low Room entry message: a reaction to a completed arrival (the clear
  // event boundary) — fires when the player walks in while the carousel
  // is active.
  world.chainEvent('if.event.actor_moved', (event, w) => {
    const data = event.data as { toRoom?: string; actor?: { id?: string } } | undefined;
    if (data?.toRoom !== ids.lowRoom) return null;
    if (w.getStateValue(CAROUSEL_ACTIVE_KEY) !== true) return null;
    const playerId = w.getPlayer()?.id;
    if (!playerId || data?.actor?.id !== playerId) return null;
    return messageEvent(CarouselMessages.COMPASS_SPINNING);
  }, { key: 'dungeo.carousel.entry-message' });
}
