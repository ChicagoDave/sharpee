/**
 * platform-state-reads.ts — a platform state word as the trait field it reads.
 *
 * Purpose: the one table of which trait field each platform state word
 * names, the value that makes the word hold, and the word that holds when
 * it does not. The testing side reads it wherever it must know that
 * `lit` is a light source's flag and not a declared state: the assertion
 * core reading a `<thing> is <word>` claim, `arrange()` deciding the word
 * is a trait write, and the derived runner choosing a word's complement.
 * The loader's evaluator reads its flag words through the same rows.
 *
 * This module is pure and dependency-free: no world, no IR, no platform
 * import, and trait types as the plain strings the world keys them by. It
 * is published on its own subpath (`@sharpee/story-loader/
 * platform-state-reads`) so the browser-bundled assertion core can import
 * it without pulling the loader's runtime in behind it.
 *
 * Invariants:
 * - Every key of @sharpee/chord's CHANGE_STATE_PAIRINGS has a row here and
 *   every row is one of those keys; a row's `traitName` is that table's
 *   value and its `traitType` is the PLATFORM_STATE_WRITES row's (pinned by
 *   a test).
 * - Complements pair off: a row's complement is a row whose complement is
 *   the first word, on the same trait and field, with the opposite value.
 * - A read is of the field alone. `lit` here is the flame's own flag; the
 *   story's `is lit` condition also asks whether a powered light has power
 *   (LightSourceBehavior.givesLight), which needs the live world and stays
 *   in the evaluator.
 *
 * Public interface: PLATFORM_STATE_READS, PlatformStateRead,
 * PlatformStateFields, platformStateHolds, spelledPlatformState.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - GH #735 — pins and arrange knew six of the ten words.
 * - GH #772 — a derived test of `change it to lit` read "declares no states".
 * - ADR-356 D2 — the pin grammar is read and written from one recognition.
 */

/** The trait fields the platform state words read; each is absent on a trait that does not carry it. */
export interface PlatformStateFields {
  isOpen?: boolean;
  isLocked?: boolean;
  isOn?: boolean;
  isLit?: boolean;
  broken?: boolean;
}

/** One platform state word: where it is read, and what it reads as. */
export interface PlatformStateRead {
  /** The world-model trait type the thing must carry (`TraitType`'s string). */
  traitType: string;
  /** The Chord adjective that composes it, for error text. */
  traitName: string;
  /** The field of that trait the word reads. */
  field: keyof PlatformStateFields;
  /** The field's value when the word holds. A field that is unset reads as false. */
  value: boolean;
  /** The word that holds when this one does not. */
  complement: string;
}

/** Platform state word → the trait field it reads. */
export const PLATFORM_STATE_READS: ReadonlyMap<string, PlatformStateRead> = new Map<string, PlatformStateRead>([
  ['locked', { traitType: 'lockable', traitName: 'lockable', field: 'isLocked', value: true, complement: 'unlocked' }],
  ['unlocked', { traitType: 'lockable', traitName: 'lockable', field: 'isLocked', value: false, complement: 'locked' }],
  ['closed', { traitType: 'openable', traitName: 'openable', field: 'isOpen', value: false, complement: 'open' }],
  ['open', { traitType: 'openable', traitName: 'openable', field: 'isOpen', value: true, complement: 'closed' }],
  ['off', { traitType: 'switchable', traitName: 'switchable', field: 'isOn', value: false, complement: 'on' }],
  ['on', { traitType: 'switchable', traitName: 'switchable', field: 'isOn', value: true, complement: 'off' }],
  ['broken', { traitType: 'breakable', traitName: 'breakable', field: 'broken', value: true, complement: 'whole' }],
  ['whole', { traitType: 'breakable', traitName: 'breakable', field: 'broken', value: false, complement: 'broken' }],
  ['lit', { traitType: 'lightSource', traitName: 'light-source', field: 'isLit', value: true, complement: 'unlit' }],
  ['unlit', { traitType: 'lightSource', traitName: 'light-source', field: 'isLit', value: false, complement: 'lit' }],
]);

/**
 * Whether a platform state word holds of a trait's fields.
 *
 * @param read the word's row of PLATFORM_STATE_READS
 * @param fields the trait the row names, as the entity carries it
 * @returns true when the row's field has the row's value; an unset field reads as false
 */
export function platformStateHolds(read: PlatformStateRead, fields: PlatformStateFields): boolean {
  return (fields[read.field] === true) === read.value;
}

/**
 * The word a thing's trait currently spells, of a platform state word and
 * its complement: `lit` or `unlit` for a light source, whichever was asked.
 *
 * @param word the word asked about
 * @param traitOf the thing's trait of a given type, or undefined when it carries none
 * @returns `word` when it holds, its complement when it does not; undefined
 *   when `word` is no platform state word or the thing lacks the trait
 */
export function spelledPlatformState(
  word: string,
  traitOf: (traitType: string) => PlatformStateFields | undefined,
): string | undefined {
  const read = PLATFORM_STATE_READS.get(word);
  if (!read) return undefined;
  const fields = traitOf(read.traitType);
  if (!fields) return undefined;
  return platformStateHolds(read, fields) ? word : read.complement;
}
