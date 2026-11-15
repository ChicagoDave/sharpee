/**
 * platform-state-writes.ts — a platform state word onto its paired trait's field.
 *
 * One table for the two places a story names a platform state as a fact
 * rather than a command: `starts <state>` at build time and
 * `change <thing> to <state>` at run time. Both are the author's say, so
 * each row writes the trait's field directly, with no key, fuel or power
 * check and no event. The word itself is never stored as story state.
 *
 * Invariants:
 * - Every key of @sharpee/chord's CHANGE_STATE_PAIRINGS has a row here, and
 *   the row's `traitName` is that table's value (pinned by a test).
 * - A row writes the paired trait's own field. The one exception is a thing
 *   that is both a light source and a switch: its switch and its flame move
 *   together, as the standard switching actions move them, so `on`, `off`,
 *   `lit` and `unlit` each write both.
 *
 * Public interface: PLATFORM_STATE_WRITES, PlatformStateWrite.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-231 D5a — `starts <state>` onto the paired trait's field.
 * - ADR-373 D7 — `broken`; ADR-374 D9 — `lit` and `unlit`.
 * - GH #707 — `change` reads the same table; the switch and the flame of a
 *   switchable light move together (David, 2026-11-14).
 */
import {
  type BreakableTrait,
  type IFEntity,
  type LightSourceTrait,
  type LockableTrait,
  type OpenableTrait,
  type SwitchableTrait,
  TraitType,
} from '@sharpee/world-model';

/** One platform state word: the trait that must be composed, and the field write. */
export interface PlatformStateWrite {
  /** The world-model trait the thing must carry. */
  traitType: TraitType;
  /** The Chord adjective that composes it, for error text. */
  traitName: string;
  /**
   * Write the word's value onto the entity's paired trait.
   *
   * @param entity a world entity that carries `traitType`; the caller checks
   */
  set: (entity: IFEntity) => void;
}

/**
 * Set the switch and the flame of a thing to one value, each where the
 * thing has it. A plain flame has no switch and a plain switch no flame, so
 * for those this is the one field write; a switchable light gets both.
 *
 * @param entity the thing
 * @param value true for on and lit, false for off and unlit
 */
function setSwitchAndFlame(entity: IFEntity, value: boolean): void {
  const switchable = entity.get(TraitType.SWITCHABLE) as SwitchableTrait | undefined;
  const light = entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait | undefined;
  if (switchable) switchable.isOn = value;
  if (light) light.isLit = value;
}

/** Platform state word → the paired trait and the field write it means. */
export const PLATFORM_STATE_WRITES: ReadonlyMap<string, PlatformStateWrite> = new Map<string, PlatformStateWrite>([
  ['locked', { traitType: TraitType.LOCKABLE, traitName: 'lockable', set: (entity) => { (entity.get(TraitType.LOCKABLE) as LockableTrait).isLocked = true; } }],
  ['unlocked', { traitType: TraitType.LOCKABLE, traitName: 'lockable', set: (entity) => { (entity.get(TraitType.LOCKABLE) as LockableTrait).isLocked = false; } }],
  ['closed', { traitType: TraitType.OPENABLE, traitName: 'openable', set: (entity) => { (entity.get(TraitType.OPENABLE) as OpenableTrait).isOpen = false; } }],
  ['open', { traitType: TraitType.OPENABLE, traitName: 'openable', set: (entity) => { (entity.get(TraitType.OPENABLE) as OpenableTrait).isOpen = true; } }],
  ['off', { traitType: TraitType.SWITCHABLE, traitName: 'switchable', set: (entity) => setSwitchAndFlame(entity, false) }],
  ['on', { traitType: TraitType.SWITCHABLE, traitName: 'switchable', set: (entity) => setSwitchAndFlame(entity, true) }],
  ['broken', { traitType: TraitType.BREAKABLE, traitName: 'breakable', set: (entity) => { (entity.get(TraitType.BREAKABLE) as BreakableTrait).broken = true; } }],
  ['whole', { traitType: TraitType.BREAKABLE, traitName: 'breakable', set: (entity) => { (entity.get(TraitType.BREAKABLE) as BreakableTrait).broken = false; } }],
  ['lit', { traitType: TraitType.LIGHT_SOURCE, traitName: 'light-source', set: (entity) => setSwitchAndFlame(entity, true) }],
  ['unlit', { traitType: TraitType.LIGHT_SOURCE, traitName: 'light-source', set: (entity) => setSwitchAndFlame(entity, false) }],
]);
