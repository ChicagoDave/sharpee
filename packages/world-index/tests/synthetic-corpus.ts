/**
 * synthetic-corpus.ts — Chord stories at any size, in the corpus's proportions.
 *
 * Purpose: ADR-321 AC-8 asks how the World Index scales, and the repository's
 * real Chord corpus tops out at 13 rooms (Dungeo is TypeScript, not Chord, so it
 * cannot stand in). This module writes structurally valid Chord *source* at any
 * room count.
 *
 * **Nothing here is chosen.** Every density — exits per room, things per room,
 * obstacles per room, the lock-to-gate ratio, words per description, rooms per
 * region — arrives as a {@link StoryRatios} measured off the real stories by
 * `corpus-shape.ts`. A generator tuned by hand would produce a timing table
 * about a story nobody wrote, and the table would look just as convincing. The
 * one honest check on that is `synthetic-corpus.test.ts`, which profiles what
 * this module emits with the same profiler and holds it to the same ratios.
 *
 * Source rather than hand-authored IR, for the reason `corpus.ts` gives: the
 * analyzer must see what the compiler actually emits (D3). Compilation happens
 * outside any timing window, so it costs the measurement nothing.
 *
 * Public interface: CorpusShape, StoryPlan, planStory, generateStory.
 *
 * Owner context: @sharpee/world-index — tests and measurement support.
 *
 * @packageDocumentation
 * @see ADR-321 AC-8: synthetic corpus and scale timing
 */

import type { StoryRatios } from './corpus-shape.js';

/**
 * Which question a generated story is built to answer.
 *
 * - `derived` — the corpus's own proportions, obstacles included, with each
 *   opener sitting in a room the player passes through before meeting the
 *   obstacle it opens. This is what a bigger version of Fernhill looks like, and
 *   it is the only shape whose timing describes an author's real experience.
 * - `dense-chain` — an **upper bound, never a representative case**: obstacles
 *   packed as tightly as the map allows, each opener sealed in the stretch the
 *   previous obstacle guards, so the D4 fixed point cannot open more than one
 *   obstacle per pass. No story in the corpus is remotely this shape. It exists
 *   to bound the worst case, and any figure taken from it must be reported as a
 *   bound.
 */
export type CorpusShape = 'derived' | 'dense-chain';

/** Room-name halves — 10 x 10 gives 100 distinct names, none containing a digit. */
const ROOM_ADJECTIVES = ['Cold', 'Narrow', 'Low', 'Damp', 'Bright', 'Quiet', 'Long', 'Dusty', 'Green', 'Iron'];
const ROOM_NOUNS = ['Vestry', 'Gallery', 'Cellar', 'Scullery', 'Landing', 'Pantry', 'Cloister', 'Attic', 'Yard', 'Forge'];

/** Region names, used at the corpus's measured rooms-per-region. */
const REGION_NAMES = [
  'the Grounds', 'the House', 'the Undercroft', 'the East Wing', 'the West Wing', 'the Stables',
  'the Orchard', 'the Chapel Yard', 'the Servants Range', 'the Long Terrace', 'the Old Court',
  'the North Range', 'the Water Meadow', 'the Home Farm', 'the Ice House', 'the Walled Garden',
];

/** Woods and metals, for locked doors and the keys that open them. */
const WOODS = ['oaken', 'elm', 'ash', 'pine', 'teak', 'cedar', 'birch', 'walnut', 'maple', 'beech',
  'holly', 'yew', 'alder', 'rowan', 'hazel', 'chestnut'];
const METALS = ['brass', 'iron', 'bronze', 'copper', 'pewter', 'silver', 'nickel', 'steel',
  'tin', 'zinc', 'lead', 'gilt', 'wrought', 'plated', 'blackened', 'burnished'];

/** Lever names, for gates. */
const LEVERS = ['crank', 'pulley', 'treadle', 'winch', 'capstan', 'spindle', 'ratchet', 'bellows',
  'flywheel', 'governor', 'stopcock', 'damper', 'sluice', 'windlass', 'gudgeon', 'trip'];

/** A second modifier tier, so obstacle furniture outlasts any one word list. */
const PANELS = ['banded', 'studded', 'panelled', 'plain', 'ribbed', 'braced'];

/** Halves of a thing's name, kept apart from the room vocabulary. */
const THING_ADJECTIVES = ['worn', 'chipped', 'folded', 'tarnished', 'waxed', 'cracked', 'faded', 'knotted'];
const THING_NOUNS = ['ledger', 'lantern', 'twine', 'mug', 'chart', 'comb', 'tin', 'bracket'];

/** Compass headings used for branch rooms hung off the spine. */
const BRANCH_DIRECTIONS = ['east', 'west'] as const;

/** The largest story this module can name without repeating a room. */
const MAX_ROOMS = ROOM_ADJECTIVES.length * ROOM_NOUNS.length;

/** The smallest story with room for a spine, a branch, and an obstacle. */
const MIN_ROOMS = 4;

/** In `dense-chain`, one obstacle every this many spine rooms. */
const DENSE_CHAIN_STRIDE = 2;

/** One connection between two rooms, and what stands in it. */
export interface PlannedEdge {
  /** Room index the connection is declared on. */
  from: number;
  /** Room index it leads to. */
  to: number;
  /** Direction as written on `from`. */
  direction: string;
  /** Whether `to` also declares the return leg, or leaves it to the loader's mirror. */
  declaresReturn: boolean;
}

/** One obstacle, and the thing that opens it. */
export interface PlannedObstacle {
  /** Which obstacle class. */
  kind: 'lock' | 'gate';
  /** Spine index the obstacle sits on. */
  from: number;
  /** Spine index beyond it. */
  to: number;
  /** The door's name, for a lock. */
  door: string | null;
  /** The key's name, for a lock. */
  key: string | null;
  /** The lever's name, for a gate. */
  lever: string | null;
  /** Room index holding the key or lever. */
  opener: number;
}

/** Everything a generated story is made of, before any Chord is written. */
export interface StoryPlan {
  /** Room indices on the spine, in order from the start room. */
  spine: number[];
  /** Branch rooms, each hung off one spine room. */
  branches: Array<{ index: number; host: number; direction: string }>;
  /** Every connection, spine and branch alike. */
  edges: PlannedEdge[];
  /** The obstacles standing in spine connections. */
  obstacles: PlannedObstacle[];
  /** Things, each placed in one room. */
  things: Array<{ name: string; room: number }>;
  /** Regions, each holding a run of consecutive rooms. */
  regions: Array<{ name: string; rooms: number[] }>;
}

/**
 * The name of room `index`, article included.
 *
 * @param index zero-based room index
 * @returns the room's name as the story writes it
 */
function roomName(index: number): string {
  return `the ${ROOM_ADJECTIVES[index % ROOM_ADJECTIVES.length]} ${ROOM_NOUNS[Math.floor(index / ROOM_ADJECTIVES.length) % ROOM_NOUNS.length]}`;
}

/**
 * A count derived from a per-room ratio.
 *
 * @param rooms the room count
 * @param perRoom the measured ratio
 * @returns the derived count, never negative
 */
function scaled(rooms: number, perRoom: number): number {
  return Math.max(0, Math.round(rooms * perRoom));
}

/**
 * A deterministic IFID for one generated story.
 *
 * Generated stories are regenerated rather than committed, so the identifier
 * only has to be well-formed and stable for a given size and shape.
 *
 * @param rooms the room count
 * @param shape the shape
 * @returns a UUID-shaped identifier
 */
function ifidFor(rooms: number, shape: CorpusShape): string {
  const seed = (rooms * 7919 + (shape === 'dense-chain' ? 31 : 17)).toString(16).padStart(12, '0');
  return `${seed.slice(0, 8)}-5A11-4E00-9C0D-${seed.padStart(12, '0')}`;
}

/**
 * Plan a story: its map, obstacles, things, and regions, all sized from the
 * measured ratios.
 *
 * Kept separate from Chord emission so tests can assert on the intended
 * structure without parsing the story back.
 *
 * @param rooms how many rooms to declare
 * @param ratios the proportions measured off the real corpus
 * @param shape which question the story is built to answer
 * @returns the plan
 * @throws {RangeError} when `rooms` is outside the nameable range
 */
export function planStory(rooms: number, ratios: StoryRatios, shape: CorpusShape): StoryPlan {
  if (!Number.isInteger(rooms) || rooms < MIN_ROOMS || rooms > MAX_ROOMS) {
    throw new RangeError(`rooms must be an integer in ${MIN_ROOMS}..${MAX_ROOMS}, got ${rooms}`);
  }

  // The map is a tree, because every map in the corpus is one: Fernhill wires 12
  // connections across 13 rooms, The Alderman 7 across 8, Ides of March 4 across
  // 5. Not one of them contains a cycle, so a generated story must not invent
  // them — a cycle is work the Map view's collision and skew handling has never
  // actually been asked to do.
  //
  // Half the corpus's rooms are dead ends, so half the generated rooms are
  // leaves hanging off a trunk. The bound shape instead spends a third of its
  // rooms on leaves, so the trunk stays long enough to pack obstacles into.
  const branchCount = shape === 'dense-chain'
    ? Math.floor(rooms / 3)
    : Math.min(rooms - 2, Math.max(0, scaled(rooms, ratios.deadEndShare) - 1));
  const spineCount = rooms - branchCount;
  const spine = Array.from({ length: spineCount }, (_, index) => index);

  // The bound shape needs a branch hanging off every obstacle, because that is
  // where it hides the opener; the derived shape spreads branches evenly.
  const guarded = obstaclePositions(rooms, spineCount, ratios, shape);
  const branches = Array.from({ length: branchCount }, (_, offset) => ({
    index: spineCount + offset,
    host: shape === 'dense-chain' && offset < guarded.length ? guarded[offset] : offset % spineCount,
    direction: BRANCH_DIRECTIONS[offset % BRANCH_DIRECTIONS.length],
  }));

  const obstacles = planObstacles(guarded, ratios, shape, branches);

  // A tree of n rooms has n - 1 connections; the corpus writes 1.65 exit lines
  // per room against those connections, so the rest of each line count is return
  // legs the author spelled out instead of leaving to the loader's mirror. That
  // share is derived here rather than picked, and spread evenly across the map.
  const connections = rooms - 1;
  const returnShare = connections === 0
    ? 0
    : Math.min(1, Math.max(0, (rooms * ratios.exitsPerRoom - connections) / connections));
  const writesReturn = (ordinal: number): boolean =>
    Math.floor(ordinal * returnShare) < Math.floor((ordinal + 1) * returnShare);

  const edges: PlannedEdge[] = [];
  for (let index = 0; index + 1 < spineCount; index += 1) {
    // A locked connection must not carry a plain mirror line: the loader would
    // unwire the door.
    const locked = obstacles.some((obstacle) => obstacle.from === index && obstacle.kind === 'lock');
    edges.push({ from: index, to: index + 1, direction: 'north', declaresReturn: !locked && writesReturn(edges.length) });
  }
  for (const branch of branches) {
    edges.push({
      from: branch.host,
      to: branch.index,
      direction: branch.direction,
      declaresReturn: writesReturn(edges.length),
    });
  }

  const things: Array<{ name: string; room: number }> = [];
  const thingTotal = scaled(rooms, ratios.thingsPerRoom);
  for (let ordinal = 0; ordinal < thingTotal; ordinal += 1) {
    const room = ordinal % rooms;
    const adjective = THING_ADJECTIVES[Math.floor(ordinal / rooms) % THING_ADJECTIVES.length];
    const noun = THING_NOUNS[ordinal % THING_NOUNS.length];
    things.push({ name: `the ${adjective} ${noun} of ${roomName(room).slice(4)}`, room });
  }

  const regions: Array<{ name: string; rooms: number[] }> = [];
  const regionSize = ratios.roomsPerRegion > 0 ? Math.max(2, Math.round(ratios.roomsPerRegion)) : 0;
  if (regionSize > 0) {
    const regionCount = Math.min(REGION_NAMES.length, Math.floor(rooms / regionSize));
    for (let ordinal = 0; ordinal < regionCount; ordinal += 1) {
      const members = [];
      for (let offset = 0; offset < regionSize; offset += 1) members.push(ordinal * regionSize + offset);
      regions.push({ name: REGION_NAMES[ordinal], rooms: members });
    }
  }

  return { spine, branches, edges, obstacles, things, regions };
}

/**
 * Which spine connections carry an obstacle.
 *
 * The `derived` count comes from the measured density, spread evenly along the
 * spine. The `dense-chain` count deliberately ignores that density — it packs
 * obstacles as tightly as the map allows, which is what makes it a bound.
 *
 * @param rooms the story's total room count — the measured density is per room
 *   of the whole story, spine and branches together, not per spine room
 * @param spineCount how many rooms sit on the spine
 * @param ratios the measured proportions
 * @param shape which question the story is built to answer
 * @returns the spine indices carrying an obstacle, in order
 */
function obstaclePositions(rooms: number, spineCount: number, ratios: StoryRatios, shape: CorpusShape): number[] {
  const positions: number[] = [];
  if (shape === 'dense-chain') {
    for (let position = 1; position + 1 < spineCount; position += DENSE_CHAIN_STRIDE) positions.push(position);
    return positions;
  }

  const wanted = Math.min(scaled(rooms, ratios.obstaclesPerRoom), Math.max(0, spineCount - 2));
  const stride = wanted === 0 ? 0 : Math.max(2, Math.floor((spineCount - 1) / (wanted + 1)));
  for (let ordinal = 0; ordinal < wanted; ordinal += 1) {
    const position = stride * (ordinal + 1);
    if (position + 1 >= spineCount) break;
    positions.push(position);
  }
  return positions;
}

/**
 * Give each obstacle position its class, its furniture, and its opener.
 *
 * Locks and gates are interleaved rather than grouped, so neither class clusters
 * at one end of the map. The `derived` shape puts each opener two rooms back
 * down the spine — reachable well before the obstacle, the way Fernhill's key
 * sits on the doormat long before the cellar door. The `dense-chain` shape seals
 * each opener in a branch off the obstacle's own room instead.
 *
 * @param positions the spine indices carrying an obstacle
 * @param ratios the measured proportions
 * @param shape which question the story is built to answer
 * @param branches the branch rooms, for sealing openers off the spine
 * @returns the obstacles, in spine order
 */
function planObstacles(
  positions: readonly number[],
  ratios: StoryRatios,
  shape: CorpusShape,
  branches: ReadonlyArray<{ index: number; host: number }>,
): PlannedObstacle[] {
  const lockCount = shape === 'dense-chain'
    ? Math.ceil(positions.length / 2)
    : Math.round(positions.length * ratios.lockShare);

  let locks = 0;
  let gates = 0;
  return positions.map((position, ordinal) => {
    const share = (index: number): number => Math.floor((index * lockCount) / Math.max(1, positions.length));
    const kind = share(ordinal) < share(ordinal + 1) ? 'lock' : 'gate';
    const opener = shape === 'dense-chain' ? sealedOpener(position, branches) : Math.max(0, position - 2);
    const ordinalOfKind = kind === 'lock' ? locks++ : gates++;
    return {
      kind,
      from: position,
      to: position + 1,
      door: kind === 'lock' ? `the ${compound(WOODS, PANELS, ordinalOfKind)} door` : null,
      key: kind === 'lock' ? `the ${compound(METALS, PANELS, ordinalOfKind)} key` : null,
      lever: kind === 'gate' ? `the ${compound(LEVERS, PANELS, ordinalOfKind)} lever` : null,
      opener,
    };
  });
}

/**
 * A two-word modifier, so obstacle furniture stays uniquely named past the
 * length of any single word list.
 *
 * @param first the word list varying fastest
 * @param second the word list varying slowest
 * @param ordinal which name to build
 * @returns the modifier, e.g. `oaken banded`
 */
function compound(first: readonly string[], second: readonly string[], ordinal: number): string {
  return `${first[ordinal % first.length]} ${second[Math.floor(ordinal / first.length) % second.length]}`;
}

/**
 * Where the `dense-chain` shape hides an opener.
 *
 * A branch room hung off the obstacle's own spine room is scanned only after the
 * obstacle has already been tested in that pass, so the fixed point needs
 * another pass to get through — the worst case the bound exists to measure.
 *
 * @param position the spine index the obstacle sits on
 * @param branches the branch rooms
 * @returns the room index holding the opener
 */
function sealedOpener(position: number, branches: ReadonlyArray<{ index: number; host: number }>): number {
  return branches.find((branch) => branch.host === position)?.index ?? Math.max(0, position - 1);
}

/**
 * A description of about the measured length.
 *
 * Prose is not decoration here: the Incomplete derivation extracts noun phrases
 * from every description, so a story of bare rooms would time the wrong thing.
 * The sentences are assembled to reach the measured word count and are otherwise
 * unremarkable — they are not tuned to produce, or to avoid, findings.
 *
 * @param seed a number varying the wording
 * @param words how many words to reach
 * @returns the description, one sentence per line, already indented
 */
function prose(seed: number, words: number): string {
  const openings = [
    'A plastered room with a worn stone floor and a ceiling stained by old smoke',
    'A low chamber, its boards sprung at the edges and its window shuttered fast',
    'A narrow space smelling of cold ash, swept once and not swept since',
    'A square room hung with faded paper that has lifted along every seam',
  ];
  const closings = [
    'Someone has left a chair against the wall, and the dust around it is undisturbed',
    'The air here is colder than it has any business being at this hour',
    'A draught moves through steadily, carrying the smell of wet stone with it',
    'Nothing in here has been moved for a long while, and it shows',
  ];

  // The description is built to a word count, not to a sentence count: prose
  // volume is the axis Incomplete's cost scales on, so overshooting the measured
  // length would quietly inflate every timing figure taken from these stories.
  const pool = [openings[seed % openings.length], closings[seed % closings.length]].join(' ').split(/\s+/u);
  const taken = pool.slice(0, Math.max(4, words));
  while (taken.length < words) taken.push(['light', 'quiet', 'cold', 'stone'][taken.length % 4]);

  const middle = Math.ceil(taken.length / 2);
  return [taken.slice(0, middle).join(' '), taken.slice(middle).join(' ')]
    .filter((line) => line.length > 0)
    .map((line) => `  ${line}.`)
    .join('\n');
}

/**
 * Generate one synthetic Chord story in the corpus's proportions.
 *
 * @param rooms how many rooms to declare, from 4 to 100
 * @param ratios the proportions measured off the real corpus
 * @param shape which question the story is built to answer, default `derived`
 * @returns Chord source, ready to compile
 * @throws {RangeError} when `rooms` is outside the nameable range
 */
export function generateStory(rooms: number, ratios: StoryRatios, shape: CorpusShape = 'derived'): string {
  const plan = planStory(rooms, ratios, shape);
  const words = Math.max(8, Math.round(ratios.wordsPerDescription));
  const lines: string[] = [];

  lines.push('story');
  lines.push('  title: Synthetic Scale Corpus');
  lines.push('  authors:');
  lines.push('    The Sharpee Project');
  lines.push(`  id: synth-${shape}-${rooms}`);
  lines.push(`  ifid: ${ifidFor(rooms, shape)}`);
  lines.push('  story-version: 1.0.0');
  lines.push('  description: A generated story for World Index scale timing.');
  lines.push('');

  for (const region of plan.regions) {
    lines.push(`create ${region.name}`);
    lines.push('  a region');
    lines.push(`  containing ${region.rooms.map(roomName).join(', ')}`);
    lines.push('');
  }

  const outbound = new Map<number, PlannedEdge[]>();
  const inbound = new Map<number, PlannedEdge[]>();
  for (const edge of plan.edges) {
    outbound.set(edge.from, [...(outbound.get(edge.from) ?? []), edge]);
    if (edge.declaresReturn) inbound.set(edge.to, [...(inbound.get(edge.to) ?? []), edge]);
  }
  const obstacleFrom = new Map(plan.obstacles.map((obstacle) => [obstacle.from, obstacle]));

  for (let index = 0; index < rooms; index += 1) {
    lines.push(`create ${roomName(index)}`);
    lines.push('  a room');

    for (const edge of inbound.get(index) ?? []) {
      lines.push(`  ${opposite(edge.direction)} to ${roomName(edge.from)}`);
    }
    for (const edge of outbound.get(index) ?? []) {
      const obstacle = obstacleFrom.get(index);
      const guarded = obstacle !== undefined && obstacle.to === edge.to;
      if (guarded && obstacle.kind === 'lock') {
        lines.push(`  ${edge.direction} to ${roomName(edge.to)} through ${obstacle.door}`);
      } else {
        lines.push(`  ${edge.direction} to ${roomName(edge.to)}`);
        if (guarded) {
          lines.push(`  ${edge.direction} is blocked while ${obstacle.lever} is off: shut-${leverSlug(obstacle.lever)}`);
        }
      }
    }

    lines.push('');
    lines.push(prose(index, words));
    lines.push('');
  }

  for (const obstacle of plan.obstacles) {
    if (obstacle.kind === 'lock') {
      lines.push(`create ${obstacle.door}`);
      lines.push(`  a door, lockable with ${obstacle.key}`);
      lines.push('');
      lines.push(prose(obstacle.from + 1, words));
      lines.push('');
      lines.push(`create ${obstacle.key}`);
      lines.push(`  in ${roomName(obstacle.opener)}`);
      lines.push('');
      lines.push(prose(obstacle.from + 2, words));
      lines.push('');
    } else {
      lines.push(`create ${obstacle.lever}`);
      lines.push('  switchable');
      lines.push(`  in ${roomName(obstacle.opener)}`);
      lines.push('');
      lines.push(prose(obstacle.from + 3, words));
      lines.push('');
      lines.push(`define phrase shut-${leverSlug(obstacle.lever)}`);
      lines.push('  The way stays shut while the lever is thrown back.');
      lines.push('end phrase');
      lines.push('');
    }
  }

  for (const [ordinal, thing] of plan.things.entries()) {
    lines.push(`create ${thing.name}`);
    lines.push(`  in ${roomName(thing.room)}`);
    lines.push('');
    lines.push(prose(ordinal, words));
    lines.push('');
  }

  lines.push('create the player');
  lines.push(`  starts in ${roomName(0)}`);
  lines.push('');
  lines.push(prose(rooms, words));
  lines.push('');

  return lines.join('\n');
}

/** The phrase-key half of a lever's name. */
function leverSlug(lever: string | null): string {
  return String(lever).replace(/^the /, '').replace(/ /gu, '-');
}

/**
 * The heading that leads back the way an exit came.
 *
 * @param direction the outbound heading
 * @returns its opposite
 */
function opposite(direction: string): string {
  const pairs: Record<string, string> = { north: 'south', south: 'north', east: 'west', west: 'east' };
  return pairs[direction] ?? direction;
}
