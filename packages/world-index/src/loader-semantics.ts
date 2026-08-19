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
 * platformTraitForState, isPlatformStateWord, isStartableStateWord,
 * platformStateWordsFor.
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
  const lockable = (entity.traits ?? []).some((trait) => trait.name === 'lockable');
  if (!lockable) return false;

  const starts = entity.startsStates ?? [];
  if (starts.includes('unlocked')) return false;
  if (starts.includes('locked')) return true;

  return isDoor;
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
