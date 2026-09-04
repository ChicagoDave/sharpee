/**
 * corpus-shape.ts — the structural profile of a Chord story.
 *
 * Purpose: ADR-321 AC-8 asks how the World Index scales, which needs stories
 * larger than the repository's real corpus. A generated story is only worth
 * timing if its proportions come from stories people actually wrote — obstacle
 * density, exits per room, prose volume — so this module measures those
 * proportions off the real corpus, and the generator derives its parameters from
 * the measurement rather than from anyone's taste.
 *
 * Every question here is answered through the package's own loader semantics
 * (`isDoor`, `doorStartsLocked`, `roomsOf`) rather than by reading IR rows
 * directly, for the same reason the analyzer does (D3): a second, private idea
 * of what "a locked door" means is the error the whole package exists to avoid.
 *
 * Public interface: StoryShape, profileStory, ratiosOf.
 *
 * Owner context: @sharpee/world-index — tests and measurement support.
 *
 * @packageDocumentation
 * @see ADR-321 AC-8: synthetic corpus and scale timing
 */

import type { IREntity, StoryIR } from '@sharpee/chord';
import { doorStartsLocked, wiredEdges } from '../src/loader-semantics.js';
import { isDoor, isRegion, isRoom, roomsOf, thingsOf } from '../src/story.js';

/** What one story is made of, counted. */
export interface StoryShape {
  /** Entities of every kind, the player included. */
  entities: number;
  /** Rooms the story declares. */
  rooms: number;
  /** Regions grouping those rooms. */
  regions: number;
  /** Things that are neither rooms, regions, doors, nor the player. */
  things: number;
  /** Doors, however they are wired. */
  doors: number;
  /** Doors that start locked — an obstacle the walk has to open. */
  lockedDoors: number;
  /** `<direction> is blocked …` lines — the other obstacle class. */
  gates: number;
  /** Exit lines written on rooms, before the loader mirrors any of them. */
  exits: number;
  /**
   * Connections between rooms once the loader has mirrored what it mirrors —
   * the map's real shape, as distinct from how much of it the author spelled
   * out. A tree of `n` rooms has `n - 1`; anything above that is a cycle, which
   * is what the Map view's collision and skew detection has to work through.
   */
  connections: number;
  /** Rooms with exactly one connection — the map's dead ends. */
  deadEnds: number;
  /** Rooms carrying a description, a first-visit description, or both. */
  describedRooms: number;
  /** Things carrying a description. */
  describedThings: number;
  /** Words of authored description across every entity that has one. */
  proseWords: number;
}

/** A story's shape expressed per room, which is what survives scaling. */
export interface StoryRatios {
  /** Exit lines per room — an authoring habit, not a structure. */
  exitsPerRoom: number;
  /**
   * Connections beyond a spanning tree, per room — the map's cycle density.
   *
   * Taken per story and then pooled, never pooled first: a story of `n` rooms
   * has `n - 1` connections when it is a tree, so summing connections and rooms
   * across several stories before subtracting makes every corpus look as though
   * it were missing connections it never lacked.
   */
  cyclesPerRoom: number;
  /** The share of rooms that are dead ends. */
  deadEndShare: number;
  /** Obstacles — locked doors and gates together — per room. */
  obstaclesPerRoom: number;
  /** Of those obstacles, the share that are locked doors rather than gates. */
  lockShare: number;
  /** Things per room. */
  thingsPerRoom: number;
  /**
   * Rooms per region, counted only over stories that declare regions, or 0 when
   * none do — a story with no regions has no opinion about region size, and
   * letting it contribute rooms to the numerator would describe no story at all.
   */
  roomsPerRegion: number;
  /** Words of description per described entity. */
  wordsPerDescription: number;
}

/**
 * The words of an entity's authored descriptions.
 *
 * Counts the same prose the Incomplete derivation reads — description and
 * first-visit description both — because that volume is what its noun-phrase
 * extraction costs are paid against.
 *
 * @param ir the story IR
 * @param entity the entity to read
 * @returns the word count across every description the entity carries
 */
function proseWordsOf(ir: StoryIR, entity: IREntity): number {
  const locale = ir.phrases.locales[ir.phrases.defaultLocale] ?? {};
  const keys = [entity.descriptionKey, entity.initialDescriptionKey].filter(
    (key): key is string => typeof key === 'string',
  );

  let words = 0;
  for (const key of keys) {
    const phrase = locale[key];
    if (phrase === undefined) continue;
    for (const variant of phrase.variants) {
      words += variant.text.split(/\s+/u).filter((word) => word.length > 0).length;
    }
  }
  return words;
}

/**
 * The map as the loader actually wires it.
 *
 * Read through the package's own `wiredEdges` rather than off `exits` rows, for
 * the reason the analyzer does: the loader mirrors an exit its author never
 * wrote, so counting declared rows would undercount half the map.
 *
 * @param ir the story IR
 * @param rooms the story's rooms
 * @returns the undirected connection count and each room's degree
 */
function wiring(ir: StoryIR, rooms: readonly IREntity[]): { connections: number; degree: Map<string, number> } {
  const roomIds = new Set(rooms.map((room) => room.id));
  const pairs = new Set<string>();
  const degree = new Map<string, number>(rooms.map((room) => [room.id, 0]));

  for (const edge of wiredEdges(rooms, (id) => roomIds.has(id))) {
    const pair = [edge.from, edge.to].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)).join('|');
    if (pairs.has(pair)) continue;
    pairs.add(pair);
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }

  return { connections: pairs.size, degree };
}

/**
 * Measure one story.
 *
 * @param ir the compiled story IR
 * @returns the story's structural profile
 */
export function profileStory(ir: StoryIR): StoryShape {
  const rooms = roomsOf(ir);
  const things = thingsOf(ir);
  const doors = ir.entities.filter(isDoor);

  const described = (entity: IREntity): boolean =>
    entity.descriptionKey !== null || entity.initialDescriptionKey !== null;

  const { connections, degree } = wiring(ir, rooms);

  return {
    entities: ir.entities.length,
    rooms: rooms.length,
    regions: ir.entities.filter(isRegion).length,
    things: things.filter((thing) => !isDoor(thing)).length,
    doors: doors.length,
    lockedDoors: doors.filter((door) => doorStartsLocked(door, true)).length,
    gates: ir.entities.reduce((total, entity) => total + entity.blockedExits.length, 0),
    exits: rooms.reduce((total, room) => total + room.exits.length, 0),
    connections,
    deadEnds: [...degree.values()].filter((count) => count === 1).length,
    describedRooms: rooms.filter(described).length,
    describedThings: things.filter(described).length,
    proseWords: ir.entities.reduce((total, entity) => total + proseWordsOf(ir, entity), 0),
  };
}

/**
 * Reduce one or more profiles to the per-room ratios a generated story must
 * reproduce.
 *
 * Several stories are pooled rather than averaged story-by-story, so a small
 * story cannot weigh as heavily as a large one on a ratio that is about density.
 *
 * @param shapes the profiles to pool
 * @returns the pooled ratios
 * @throws {RangeError} when the pool declares no rooms — every ratio here is
 *   per room, so an empty pool has no answer rather than a zero one
 */
export function ratiosOf(shapes: readonly StoryShape[]): StoryRatios {
  const sum = (pick: (shape: StoryShape) => number): number =>
    shapes.reduce((total, shape) => total + pick(shape), 0);

  const rooms = sum((shape) => shape.rooms);
  if (rooms === 0) throw new RangeError('cannot take per-room ratios of a pool with no rooms');

  const obstacles = sum((shape) => shape.lockedDoors) + sum((shape) => shape.gates);
  const descriptions = sum((shape) => shape.describedRooms) + sum((shape) => shape.describedThings);

  const regioned = shapes.filter((shape) => shape.regions > 0);
  const regionRooms = regioned.reduce((total, shape) => total + shape.rooms, 0);
  const regionCount = regioned.reduce((total, shape) => total + shape.regions, 0);

  return {
    exitsPerRoom: sum((shape) => shape.exits) / rooms,
    cyclesPerRoom: sum((shape) => Math.max(0, shape.connections - (shape.rooms - 1))) / rooms,
    deadEndShare: sum((shape) => shape.deadEnds) / rooms,
    obstaclesPerRoom: obstacles / rooms,
    lockShare: obstacles === 0 ? 0 : sum((shape) => shape.lockedDoors) / obstacles,
    thingsPerRoom: sum((shape) => shape.things) / rooms,
    roomsPerRegion: regionCount === 0 ? 0 : regionRooms / regionCount,
    wordsPerDescription: descriptions === 0 ? 0 : sum((shape) => shape.proseWords) / descriptions,
  };
}
