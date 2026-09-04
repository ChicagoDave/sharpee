/**
 * loader-semantics.ts — the platform rules a static reading of the Story IR must
 * obey (ADR-321 D3).
 *
 * Purpose: the IR lists what an author *wrote*, not what the loader *wires*. Every
 * rule here is a place where reading an IR row literally yields a confident wrong
 * answer about the author's own story. Each is a named, independently testable
 * function so the derivation never re-derives them ad hoc, and so AC-6 can pin one
 * test per rule against platform behavior rather than against a source line.
 *
 * Public interface: initialStateOf, isInitialState, undirectedExits, doorStartsLocked,
 * isPortableByDefault, platformTraitForState, isPlatformStateWord,
 * isStartableStateWord, platformStateWordsFor.
 *
 * Owner context: @sharpee/world-index — the derivation package the IDE's World tab
 * reads. No platform contract; nothing here is authoritative over the loader, it
 * mirrors the loader.
 *
 * @packageDocumentation
 * @see ADR-321 D3: the derivation models the loader's semantics, never literal IR rows
 */

import {
  PLATFORM_STATE_PAIRS,
  STARTS_STATE_PAIRINGS,
  type IREntity,
} from '@sharpee/chord';

/**
 * The state an entity holds before anything changes it.
 *
 * The loader seeds a declared state set from its first member — there is no
 * `initial` marker in the IR — so a reading that treats every declared state as
 * equally unreached reports healthy stories as broken.
 *
 * @param states the entity's declared state group, in declaration order
 * @returns the implicit initial state, or `undefined` for an empty group
 */
export function initialStateOf(states: readonly string[] | undefined): string | undefined {
  return states && states.length > 0 ? states[0] : undefined;
}

/**
 * Whether a named state is the one its group starts in.
 *
 * @param states the entity's declared state group, in declaration order
 * @param state the state word to test
 * @returns true when `state` is the group's implicit initial member
 */
export function isInitialState(states: readonly string[] | undefined, state: string): boolean {
  return initialStateOf(states) === state;
}

/**
 * Room adjacency as the world is actually wired, not as the exits were authored.
 *
 * Connecting two rooms stamps the reverse exit as well, door or not, so an authored
 * exit row implies its mirror. A reading that walks only the authored rows reports
 * one-way exits and unreachable rooms that do not exist.
 *
 * @param rooms the story's room entities
 * @param isKnownRoom predicate identifying a destination id as a real room; a
 *   destination failing it is a broken exit and contributes no adjacency
 * @returns room id to the set of room ids reachable in one move, both directions
 */
export function undirectedExits(
  rooms: readonly IREntity[],
  isKnownRoom: (id: string) => boolean,
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const room of rooms) adjacency.set(room.id, new Set<string>());

  for (const room of rooms) {
    for (const exit of room.exits ?? []) {
      if (!isKnownRoom(exit.to)) continue;
      adjacency.get(room.id)?.add(exit.to);
      adjacency.get(exit.to)?.add(room.id);
    }
  }
  return adjacency;
}

/**
 * Whether a door is locked before the player touches anything.
 *
 * A composed `lockable` means *can be locked*, not *is locked*. The loader parts
 * company with intuition here: a door defaults to locked and every other lockable
 * defaults to unlocked, and either way an explicit `starts` word wins. Reading
 * `lockable` as "locked" reports passable doors as sealed.
 *
 * @param entity the IR entity to test
 * @param isDoor whether this entity is a door kind
 * @returns true when the entity begins play locked
 */
export function doorStartsLocked(entity: IREntity, isDoor: boolean): boolean {
  return platformStateHoldsAtStart(entity, 'locked', isDoor) ?? false;
}

/**
 * Whether a thing is takeable with nothing authored to make it so.
 *
 * There is no `takeable` row anywhere in the IR to read. `world-model` grants
 * portability by default and `scenery` is what withdraws it, so a reading that
 * hunts for an affordance row finds none and calls every unadorned object inert
 * — backwards, because the unadorned object is precisely the one the player can
 * pick up.
 *
 * Mirrors `IFEntity.isTakeable` exactly, quirk included: portability is
 * withdrawn for scenery, rooms and doors and for nothing else, which leaves an
 * actor nominally takeable. Whether that makes an NPC a *tool* is a question for
 * the reading above this one (D12); this is not the place to disagree with the
 * loader.
 *
 * @param entity the IR entity to test
 * @param isPlaceOrDoor whether this entity is a room, region, or door kind
 * @returns true when the player can take it without the author wiring anything
 */
export function isPortableByDefault(entity: IREntity, isPlaceOrDoor: boolean): boolean {
  if (isPlaceOrDoor) return false;
  return !(entity.traits ?? []).some((composed) => composed.name === 'scenery');
}

/**
 * The trait that owns a platform state word, if any.
 *
 * State words like `open`, `locked`, `on`, and `lit` belong to a composed trait
 * rather than to a state group the author declared. Counting them as author states
 * reports them as never written — no story statement writes them, because standard
 * actions do.
 *
 * @param word the state word read from a condition
 * @returns the owning trait's adjective, or `undefined` when the word is the
 *   author's own
 */
export function platformTraitForState(word: string): string | undefined {
  return PLATFORM_STATE_PAIRS.find(({ pair }) => pair.includes(word))?.trait;
}

/**
 * Whether a state word is owned by a platform trait rather than by the author.
 *
 * @param word the state word to test
 * @returns true when a composed trait owns the word
 */
export function isPlatformStateWord(word: string): boolean {
  return platformTraitForState(word) !== undefined;
}

/**
 * Whether a platform state word may be used as a `starts` initializer.
 *
 * The two platform vocabularies are not the same set, and conflating them is its
 * own error: every startable word is readable, but `lit` and `worn` are readable
 * only — they are derived from world state, so no story can seed them directly.
 *
 * @param word the state word to test
 * @returns true when the word may follow `starts`
 */
export function isStartableStateWord(word: string): boolean {
  return STARTS_STATE_PAIRINGS.has(word);
}

/**
 * The platform state words an entity answers to, given the traits it composes.
 *
 * @param entity the IR entity to inspect
 * @returns the state words readable on this entity because of a composed trait
 */
export function platformStateWordsFor(entity: IREntity): string[] {
  const composed = new Set((entity.traits ?? []).map((trait) => trait.name));
  return PLATFORM_STATE_PAIRS
    .filter(({ trait }) => composed.has(trait))
    .flatMap(({ pair }) => [...pair]);
}

/**
 * Direction opposites for the ten exit directions Chord accepts.
 *
 * Pinned against the platform's own table by test rather than imported: the
 * derivation depends on `@sharpee/chord` alone (ADR-321 D2), and `world-model`
 * is a runtime package this tool has no other reason to load.
 */
const OPPOSITE_DIRECTION: Readonly<Record<string, string>> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  northeast: 'southwest',
  southwest: 'northeast',
  northwest: 'southeast',
  southeast: 'northwest',
  up: 'down',
  down: 'up',
};

/**
 * The direction the mirror of an exit runs in.
 *
 * @param direction the authored exit's direction
 * @returns the opposite direction, or `undefined` for a word that is not an exit
 *   direction
 */
export function oppositeDirection(direction: string): string | undefined {
  return OPPOSITE_DIRECTION[direction];
}

/** One room-to-room move as the world is wired, authored or mirrored. */
export interface WiredEdge {
  /** Room the move starts in. */
  from: string;
  /** Room it arrives in. */
  to: string;
  /** Direction typed from `from`. */
  direction: string;
  /** Door the move passes through, or null. */
  via: string | null;
  /** False when this edge is the loader's mirror rather than an authored row. */
  authored: boolean;
}

/**
 * Every room-to-room move the loader wires, in both directions.
 *
 * Connecting two rooms stamps the reverse exit as well — door and all — so an
 * authored row implies a move the author never typed. Reading only the authored
 * rows reports one-way exits that do not exist; reading them as undirected loses
 * the direction a gate is declared on.
 *
 * @param rooms the story's room entities
 * @param isKnownRoom predicate identifying a destination id as a real room; a
 *   destination failing it yields no edge in either direction
 * @returns every wired edge, authored rows first, each mirror following its row
 */
export function wiredEdges(
  rooms: readonly IREntity[],
  isKnownRoom: (id: string) => boolean,
): WiredEdge[] {
  const edges: WiredEdge[] = [];
  for (const room of rooms) {
    for (const exit of room.exits ?? []) {
      if (!isKnownRoom(exit.to)) continue;
      edges.push({
        from: room.id,
        to: exit.to,
        direction: exit.direction,
        via: exit.via,
        authored: true,
      });
      const back = oppositeDirection(exit.direction);
      if (back === undefined) continue;
      edges.push({
        from: exit.to,
        to: room.id,
        direction: back,
        via: exit.via,
        authored: false,
      });
    }
  }
  return edges;
}

/**
 * The state a platform trait word holds before the player touches anything.
 *
 * Each pair has a resting member the loader seeds — closed, unlocked, off,
 * unlit, unworn — with one kind-scoped exception: a lockable door starts locked.
 * An explicit `starts` word wins over both.
 *
 * @param entity the IR entity to read
 * @param word the platform state word to test
 * @param isDoor whether this entity is a door kind
 * @returns true when the entity begins play in that state, false when it begins
 *   in the paired state, `undefined` when no composed trait owns the word
 */
export function platformStateHoldsAtStart(
  entity: IREntity,
  word: string,
  isDoor: boolean,
): boolean | undefined {
  const owning = PLATFORM_STATE_PAIRS.find(({ pair }) => pair.includes(word));
  if (owning === undefined) return undefined;
  if (!(entity.traits ?? []).some((trait) => trait.name === owning.trait)) return undefined;

  const [positive, negative] = owning.pair;
  const starts = entity.startsStates ?? [];
  if (starts.includes(word)) return true;
  if (starts.includes(word === positive ? negative : positive)) return false;

  const restingWord = owning.trait === 'lockable' && isDoor ? positive : negative;
  return word === restingWord;
}
