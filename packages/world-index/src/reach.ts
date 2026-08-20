/**
 * reach.ts — can the player actually get to what the author wrote?
 *
 * Purpose: the obstacle-aware half of the World Index (ADR-321 D4). Walking the
 * exit graph answers a different, easier question and answers it wrong: it
 * declares a story clean whose cellar key is sealed inside the cellar. This
 * module honours locked doors and blocked exits, opens each only when the thing
 * that opens it is itself already reached, and iterates the two together to a
 * fixed point — because opening a gate can expose the room holding a key, and
 * using a key can expose the room holding whatever falsifies a gate.
 *
 * Public interface: deriveReach and its result types.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract.
 *
 * @packageDocumentation
 * @see ADR-321 D4: locks and gates are one fixed point, not two passes
 */

import type { IRBlockedExit, IRCondition, IREntity, StoryIR } from '@sharpee/chord';
import { holderIndex, roomOf, type ContainmentIndex } from './containment.js';
import { canBeFalsified, holdsAtStart, type ConditionWorld } from './conditions.js';
import { doorStartsLocked, wiredEdges, type WiredEdge } from './loader-semantics.js';
import { collectStateWriters, entitiesMovedIntoPlay, type StateWriter, type WriterOwner } from './statements.js';
import { isDoor, roomsOf, startRoomOf, thingsOf } from './story.js';

/** What stands between two rooms: a locked door, or a blocked exit. */
export type ObstacleKind = 'lock' | 'gate';

/** One move the player cannot make, and why. */
export interface BlockedEdge {
  /** Room the move starts in. */
  from: string;
  /** Room it would arrive in. */
  to: string;
  /** Direction typed from `from`. */
  direction: string;
  /** Whether a lock or a gate stops it. */
  obstacle: ObstacleKind;
  /** The door, for a lock. */
  door?: string;
  /** The door's declared key, resolved to an entity id where one matches. */
  key?: string;
  /** The room that key sits in, when it sits anywhere. */
  keyRoom?: string;
  /** The reason, in the author's terms — the finding is the reason, not the fact. */
  reason: string;
  /** Source line of the blocked-exit line, for a gate. */
  line?: number;
}

/** A thing nothing reaches. */
export interface StrandedThing {
  /** Entity id. */
  id: string;
  /** Display name. */
  name: string;
  /** The room it sits in, when it sits in one. */
  room?: string;
  /** Why it is out of reach. */
  reason: string;
}

/** An exit pointing at something that is not a room. */
export interface BrokenExit {
  /** Room declaring the exit. */
  from: string;
  /** Direction as written. */
  direction: string;
  /** The destination as written — it resolves to no room. */
  to: string;
  /** Source line. */
  line: number | null;
}

/** A thing the player can reach and examine, with nothing written to read. */
export interface NothingToRead {
  /** Entity id. */
  id: string;
  /** Display name. */
  name: string;
  /** The room it is reached in, when it sits in one. */
  room?: string;
}

/**
 * An obstacle the fixed point overcame, and what it took (Amendment 1, D14).
 *
 * The same shape as the `BlockedEdge` this edge would have produced had it stayed
 * shut — its `reason` reads why it OPENED — plus the two facts only the loop knows.
 */
export interface LiftedObstacle extends BlockedEdge {
  /** Fixed-point pass it opened on; 1 is the first sweep. */
  pass: number;
  /** Entities that had to be reachable, or actable on, first. */
  requires: string[];
}

/** The Reach view for one story. */
export interface ReachResult {
  /** The room play begins in, when the story places a player. */
  start?: string;
  /** Room counts and lists — `total` is the declared rooms, never the walk. */
  rooms: { total: number; reachable: string[]; unreached: string[] };
  /** Moves that stay blocked once the walk has converged. */
  blocked: BlockedEdge[];
  /** Things behind those blocks, or placed nowhere. */
  stranded: StrandedThing[];
  /** Exits resolving to no room. */
  brokenExits: BrokenExit[];
  /** Reachable things with no description. */
  nothingToRead: NothingToRead[];
  /** Every finding above, counted — zero is a clean story. */
  findingCount: number;
  /**
   * Obstacles the walk overcame, in the order it overcame them.
   *
   * NOT a finding — a story with a rich lifted list is a story with puzzles in it.
   * It is the dependency graph of progress, and D12 reads it to tell a tool the
   * player must use from scenery that merely exists.
   */
  lifted: LiftedObstacle[];
  /**
   * Every entity on the progression chain: the doors, keys, gate subjects, and
   * machine triggers that stand between the start room and the rest of the story.
   */
  progression: string[];
}

/** A gate declaration, keyed to the room and direction it blocks. */
type GateIndex = ReadonlyMap<string, IRBlockedExit>;

/** The key under which an edge and a gate meet. */
function edgeKey(from: string, direction: string): string {
  return `${from}|${direction}`;
}

/**
 * Index every blocked-exit line by the room and direction it applies to.
 *
 * @param ir the story IR
 * @returns blocked exits keyed by room and direction
 */
function gateIndex(ir: StoryIR): GateIndex {
  const gates = new Map<string, IRBlockedExit>();
  for (const entity of ir.entities) {
    for (const gate of entity.blockedExits ?? []) {
      gates.set(edgeKey(entity.id, gate.direction), gate);
    }
  }
  return gates;
}

/**
 * The entity a door's `lockable with the <key>` names.
 *
 * The IR carries the key as the display name the author wrote, so it is resolved
 * the way the loader resolves it — by name, then by alternate name.
 *
 * @param door the door entity
 * @param byName entity ids indexed by lowercased name and alternate name
 * @returns the key's entity id, or undefined when the door declares no key or
 *   names one that does not exist
 */
function declaredKeyOf(door: IREntity, byName: ReadonlyMap<string, string>): string | undefined {
  const lockable = (door.traits ?? []).find((trait) => trait.name === 'lockable');
  const named = (lockable?.config ?? []).find((field) => field.valueKind === 'name');
  if (named === undefined) return undefined;
  return byName.get(String(named.value).toLowerCase());
}

/**
 * Index entity ids by every name they answer to.
 *
 * @param ir the story IR
 * @returns lowercased name and alternate name to entity id
 */
function nameIndex(ir: StoryIR): ReadonlyMap<string, string> {
  const byName = new Map<string, string>();
  for (const entity of ir.entities) {
    for (const form of [entity.name, ...(entity.aka ?? [])]) {
      if (typeof form !== 'string' || form.length === 0) continue;
      const word = form.toLowerCase();
      if (!byName.has(word)) byName.set(word, entity.id);
    }
  }
  return byName;
}

/**
 * Derive the Reach view: what the player can get to, and what stops them.
 *
 * @param ir the story IR
 * @returns the reachable rooms, the blocks that survive convergence with their
 *   reasons, the things stranded behind them, the exits resolving to nothing,
 *   and the reachable things with nothing written to read
 */
export function deriveReach(ir: StoryIR): ReachResult {
  const rooms = roomsOf(ir);
  const roomIds = new Set(rooms.map((room) => room.id));
  const containment = holderIndex(ir);
  const isKnownRoom = (id: string): boolean => roomIds.has(id);

  const edges = wiredEdges(rooms, isKnownRoom);
  const gates = gateIndex(ir);
  const byName = nameIndex(ir);
  const writers = collectStateWriters(ir);
  const moved = entitiesMovedIntoPlay(ir);
  const namedConditions = new Map(ir.conditions.map((named) => [named.name, named.condition]));

  const start = startRoomOf(ir);
  const reached = new Set<string>(start !== undefined && roomIds.has(start) ? [start] : []);

  const world = conditionWorld(containment, reached, moved, writers, namedConditions);
  const drivers = machineDrivers(ir);
  const blocks = new Map<string, BlockedEdge>();
  const lifted: LiftedObstacle[] = [];

  for (let growing = true, pass = 1; growing; pass += 1) {
    growing = false;
    for (const edge of edges) {
      if (!reached.has(edge.from) || reached.has(edge.to)) continue;
      const verdict = obstacleOn(edge, gates, containment, reached, byName, world, drivers);
      if (!verdict.open) {
        blocks.set(edgeKey(edge.from, edge.direction), verdict.block);
        continue;
      }
      // D14: an edge that took something to open is a step of the story's spine, and
      // this is the only moment anything knows what it took. The old code deleted the
      // record here and kept the reached room alone.
      if (verdict.requires.length > 0) {
        lifted.push({
          ...(blocks.get(edgeKey(edge.from, edge.direction)) ?? openedEdge(edge)),
          reason: 'the player can open this before they need it',
          pass,
          requires: verdict.requires,
        });
      }
      blocks.delete(edgeKey(edge.from, edge.direction));
      reached.add(edge.to);
      growing = true;
    }
  }

  const blocked = [...blocks.values()].filter((block) => !reached.has(block.to));
  const brokenExits = brokenExitsOf(rooms, isKnownRoom);
  const stranded = strandedThings(ir, containment, reached, moved);
  const nothingToRead = thingsOf(ir)
    .filter((thing) => thing.descriptionKey === null)
    .filter((thing) => isEntityReached(thing.id, containment, reached, moved))
    .map((thing) => ({ id: thing.id, name: thing.name, room: roomOf(containment, thing.id) }));

  return {
    start,
    rooms: {
      total: rooms.length,
      reachable: rooms.filter((room) => reached.has(room.id)).map((room) => room.id),
      unreached: rooms.filter((room) => !reached.has(room.id)).map((room) => room.id),
    },
    blocked,
    stranded,
    brokenExits,
    nothingToRead,
    lifted,
    progression: unique([
      ...lifted.flatMap((step) => step.requires),
      ...blocked.flatMap((block) => [block.door, block.key].filter((id): id is string => id !== undefined)),
    ]),
    findingCount:
      blocked.length +
      stranded.length +
      brokenExits.length +
      nothingToRead.length +
      rooms.filter((room) => !reached.has(room.id)).length,
  };
}

/**
 * Whether the player can act on an entity given what has been reached so far.
 *
 * @param entityId the entity in question
 * @param containment the story's containment index
 * @param reached the rooms reached so far
 * @param moved entities a statement moves into play
 * @returns true when the entity sits in a reached room, or enters play by
 *   statement
 */
function isEntityReached(
  entityId: string,
  containment: ContainmentIndex,
  reached: ReadonlySet<string>,
  moved: ReadonlySet<string>,
): boolean {
  if (moved.has(entityId)) return true;
  const room = roomOf(containment, entityId);
  return room !== undefined && reached.has(room);
}

/**
 * Build the view of the story a gate condition reads.
 *
 * The frontier is passed by reference on purpose: the same object grows during
 * the fixed point, so a gate asked twice gets a different answer once the room
 * holding its lever is reached.
 *
 * @param containment the story's containment index
 * @param reached the live set of reached rooms
 * @param moved entities a statement moves into play
 * @param writers every resolvable `change` statement
 * @param namedConditions the story's named conditions
 * @returns the condition world
 */
function conditionWorld(
  containment: ContainmentIndex,
  reached: ReadonlySet<string>,
  moved: ReadonlySet<string>,
  writers: readonly StateWriter[],
  namedConditions: ReadonlyMap<string, IRCondition>,
): ConditionWorld {
  const canAct = (id: string): boolean => isEntityReached(id, containment, reached, moved);
  const triggerable = (owner: WriterOwner): boolean => {
    if (owner.kind === 'story') return true;
    if (owner.kind === 'machine') return owner.roles.some(canAct);
    return canAct(owner.id);
  };

  return {
    entity: (id) => containment.byId.get(id),
    isDoor: (id) => {
      const entity = containment.byId.get(id);
      return entity !== undefined && isDoor(entity);
    },
    canAct,
    canWriteState: (entityId, state, into) =>
      writers.some(
        (writer) =>
          writer.target === entityId &&
          (into ? writer.state === state : writer.state !== state) &&
          triggerable(writer.owner),
      ),
    namedCondition: (name) => namedConditions.get(name),
  };
}

/**
 * What stops the player taking one wired move, if anything does.
 *
 * A gate is read first: it sits on the room's own line and governs the move
 * whether or not a door is involved. A condition the analyzer cannot model
 * yields no obstacle at all — dropping the check beats guessing (D3).
 *
 * @param edge the wired move
 * @param gates blocked exits by room and direction
 * @param containment the story's containment index
 * @param reached the rooms reached so far
 * @param byName entity ids by name
 * @param world the condition world
 * @returns the block, or undefined when the move is passable
 */
/**
 * What the fixed point decided about one edge, and why.
 *
 * An open edge carries `requires` — the entities it consulted to decide — which is
 * the thing D14 exists to keep. `blocks.delete()` used to throw exactly this away:
 * the loop knew the cellar door opened BECAUSE the tarnished key was reachable, and
 * recorded only that the cellar was reached.
 */
type EdgeVerdict =
  | { open: false; block: BlockedEdge }
  | { open: true; requires: string[] };

/** An unguarded edge: nothing stood in the way, so nothing is on the chain. */
const UNGUARDED: EdgeVerdict = { open: true, requires: [] };

function obstacleOn(
  edge: WiredEdge,
  gates: GateIndex,
  containment: ContainmentIndex,
  reached: ReadonlySet<string>,
  byName: ReadonlyMap<string, string>,
  world: ConditionWorld,
  drivers: ReadonlyMap<string, readonly string[]>,
): EdgeVerdict {
  const gate = gates.get(edgeKey(edge.from, edge.direction));
  if (gate !== undefined) {
    const base = {
      from: edge.from,
      to: edge.to,
      direction: edge.direction,
      obstacle: 'gate' as const,
      line: gate.span?.line,
    };
    if (gate.condition === null) {
      return { open: false, block: { ...base, reason: 'the exit is blocked with no condition that lifts it' } };
    }
    if (holdsAtStart(gate.condition, world) === 'true') {
      const openable = canBeFalsified(gate.condition, world);
      if (openable === 'false') {
        return {
          open: false,
          block: { ...base, reason: 'nothing the player can reach lifts the condition blocking this exit' },
        };
      }
      if (openable === 'unknown') {
        return {
          open: false,
          block: { ...base, reason: 'the condition blocking this exit cannot be read statically' },
        };
      }
      // It lifts. What the player must act on to lift it is the condition's own
      // subjects plus whatever drives them — D14's `requires`.
      const subjects = conditionSubjects(gate.condition);
      const gateRequires = [...subjects, ...subjects.flatMap((id) => drivers.get(id) ?? [])];
      // An exit can carry BOTH a gate and a locked door. Before D14 the gate branch
      // returned first and the door went unexamined.
      const lock = lockRequires(edge, containment, reached, byName);
      if (lock !== undefined && 'block' in lock) return { open: false, block: lock.block };
      return {
        open: true,
        requires: unique([...gateRequires, ...(lock?.requires ?? [])]),
      };
    }
  }

  const lock = lockRequires(edge, containment, reached, byName);
  if (lock === undefined) return UNGUARDED;
  if ('block' in lock) return { open: false, block: lock.block };
  return { open: true, requires: lock.requires };
}

/**
 * The lock on an edge, if it has one: the block it produces, or what opening it took.
 *
 * Split out of `obstacleOn` so a gated edge can consult it too — an exit may carry a
 * gate AND a locked door, and before D14 the gate branch returned first and the door
 * went unexamined.
 *
 * @returns undefined when no locked door stands here
 */
function lockRequires(
  edge: WiredEdge,
  containment: ContainmentIndex,
  reached: ReadonlySet<string>,
  byName: ReadonlyMap<string, string>,
): { block: BlockedEdge } | { requires: string[] } | undefined {
  const doorId = edge.via;
  const door = doorId === null ? undefined : containment.byId.get(doorId);
  if (door === undefined || !doorStartsLocked(door, isDoor(door))) return undefined;

  const base = {
    from: edge.from,
    to: edge.to,
    direction: edge.direction,
    obstacle: 'lock' as const,
    door: door.id,
  };
  const keyId = declaredKeyOf(door, byName);
  if (keyId === undefined) {
    return { block: { ...base, reason: 'the door is locked and declares no key' } };
  }

  const keyRoom = roomOf(containment, keyId);
  if (keyRoom !== undefined && reached.has(keyRoom)) {
    return { requires: [door.id, keyId] };
  }
  return {
    block: {
      ...base,
      key: keyId,
      keyRoom,
      reason:
        keyRoom === edge.to
          ? 'the key is inside the room it opens'
          : 'the key cannot be reached before the door',
    },
  };
}

/**
 * Entities a condition names.
 *
 * Shape-agnostic for the same reason `statements.ts` walks that way: an `IRCondition`
 * is a tree whose node kinds grow, and a walk keyed to today's names silently stops
 * finding subjects the day a new one lands.
 *
 * @param condition the condition to read
 * @returns every entity id it mentions, first occurrence order
 */
function conditionSubjects(condition: IRCondition): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    const record = node as Record<string, unknown>;
    if (record.kind === 'entity' && typeof record.id === 'string') found.push(record.id);
    for (const value of Object.values(record)) walk(value);
  };
  walk(condition);
  return unique(found);
}

/**
 * What the player acts on to drive each entity's state, by entity id.
 *
 * A machine's roles name the entities it drives; its transitions name the actions
 * that advance it. THIS IS THE HALF A STATIC SCAN CANNOT SEE — Fernhill's greenhouse
 * gate reads `the boiler is off`, and the boiler only reaches a state that lifts it
 * through `define machine the boiler works`, whose first transition is
 * `when turning the stopcock`. The stopcock appears nowhere in the gate, nowhere in
 * the boiler's own clauses, and nowhere in any `change` statement attached to an
 * entity; it is a trigger on a top-level construct (D14).
 *
 * @param ir the story IR
 * @returns entity id -> the entities whose actions drive its state
 */
function machineDrivers(ir: StoryIR): Map<string, string[]> {
  const drivers = new Map<string, string[]>();
  for (const machine of ir.machines ?? []) {
    // A trigger may name a ROLE rather than an entity — `switching_on $furnace`
    // where `role furnace is the boiler`. Resolved here so the chain names things
    // the author can look up, never the machine's private vocabulary.
    const roleEntity = new Map(machine.roles.map((role) => [`$${role.name}`, role.entity]));
    const triggers: string[] = [];
    for (const state of machine.states) {
      for (const transition of state.transitions) {
        const target = (transition.trigger as { target?: unknown }).target;
        if (typeof target !== 'string') continue;
        triggers.push(roleEntity.get(target) ?? target);
      }
    }
    if (triggers.length === 0) continue;
    for (const role of machine.roles) {
      drivers.set(role.entity, unique([...(drivers.get(role.entity) ?? []), ...triggers]));
    }
  }
  return drivers;
}

/**
 * The record for an edge that opened without ever having been recorded as blocked.
 *
 * The walk tests an edge only once its `from` room is reached, so an obstacle whose
 * key was already in hand is overcome on first sight and never enters `blocks`. It is
 * still a step of the spine, and omitting it would make the chain depend on walk order.
 *
 * @param edge the edge that opened
 * @returns the base record, ready for `reason`, `pass`, and `requires`
 */
function openedEdge(edge: WiredEdge): BlockedEdge {
  return {
    from: edge.from,
    to: edge.to,
    direction: edge.direction,
    obstacle: edge.via === null ? 'gate' : 'lock',
    ...(edge.via === null ? {} : { door: edge.via }),
    reason: '',
  };
}

/** The list with duplicates removed, first occurrence winning. */
function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Exits naming a destination that is not a room.
 *
 * @param rooms the story's rooms
 * @param isKnownRoom predicate identifying a real room id
 * @returns one finding per exit resolving to nothing
 */
function brokenExitsOf(rooms: readonly IREntity[], isKnownRoom: (id: string) => boolean): BrokenExit[] {
  const broken: BrokenExit[] = [];
  for (const room of rooms) {
    for (const exit of room.exits ?? []) {
      if (isKnownRoom(exit.to)) continue;
      broken.push({ from: room.id, direction: exit.direction, to: exit.to, line: exit.span?.line ?? null });
    }
  }
  return broken;
}

/**
 * Things nothing reaches: behind a block, or placed nowhere at all.
 *
 * @param ir the story IR
 * @param containment the story's containment index
 * @param reached the rooms reached
 * @param moved entities a statement moves into play
 * @returns one finding per stranded thing
 */
function strandedThings(
  ir: StoryIR,
  containment: ContainmentIndex,
  reached: ReadonlySet<string>,
  moved: ReadonlySet<string>,
): StrandedThing[] {
  const stranded: StrandedThing[] = [];
  for (const thing of thingsOf(ir)) {
    if (moved.has(thing.id)) continue;
    const room = roomOf(containment, thing.id);
    if (room !== undefined && reached.has(room)) continue;
    stranded.push({
      id: thing.id,
      name: thing.name,
      room,
      reason: room === undefined ? 'placed nowhere and never moved into play' : 'nothing reaches the room it sits in',
    });
  }
  return stranded;
}
