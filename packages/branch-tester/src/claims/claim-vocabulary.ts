/**
 * claim-vocabulary.ts — the words a claim is spelled in: a thing's written
 * name, the flag sentences (`open`/`closed`, `read`/`unread`), and an
 * action's past participle.
 *
 * Purpose: the lock offers a fact as a sentence the fragment accepts
 * (`the deed box is open`), and a broken lock is reported in the same
 * words (`the deed box is closed`). Both spellings come from here, so the
 * offer and the report cannot drift. IR-only and browser-safe.
 *
 * Public interface: `writtenName`, `FLAG_SENTENCES`, `participleOf`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import type { IREntity } from '@sharpee/chord';

/**
 * `the deed`, `Tobias`, `the Iron Gates` — the name as the story declared
 * it, which the claims resolver takes exactly.
 *
 * @param entity a compiled entity
 * @returns its written name, article included when it has one
 */
export function writtenName(entity: IREntity): string {
  return entity.article ? `${entity.article} ${entity.name}` : entity.name;
}

/** One trait flag and the two words a sentence spells its states with. */
export interface FlagSentence {
  readonly trait: string;
  readonly field: string;
  readonly whenTrue: string;
  readonly whenFalse: string;
}

/** The trait flags a claim sentence can name, each with its two words. */
export const FLAG_SENTENCES: readonly FlagSentence[] = [
  { trait: 'openable', field: 'isOpen', whenTrue: 'open', whenFalse: 'closed' },
  { trait: 'lockable', field: 'isLocked', whenTrue: 'locked', whenFalse: 'unlocked' },
  { trait: 'switchable', field: 'isOn', whenTrue: 'on', whenFalse: 'off' },
  { trait: 'lightSource', field: 'isLit', whenTrue: 'lit', whenFalse: 'unlit' },
  { trait: 'wearable', field: 'worn', whenTrue: 'worn', whenFalse: 'unworn' },
  { trait: 'readable', field: 'hasBeenRead', whenTrue: 'read', whenFalse: 'unread' },
];

/**
 * Participles whose spelling the gerund does not give, kept to the ones the
 * resolver's stem match still accepts (`taken` and `taking` share `tak`;
 * `worn` and `wearing` share nothing, so `wearing` stays regular).
 */
const PARTICIPLES: Readonly<Record<string, string>> = {
  taking: 'taken', giving: 'given', showing: 'shown', throwing: 'thrown', hearing: 'heard',
  setting: 'set', reading: 'read', seeing: 'seen', eating: 'eaten', breaking: 'broken', knowing: 'known',
};

/**
 * A gerund as a past participle, loosely — `turning` → `turned`; the
 * resolver's stem match forgives the rest.
 *
 * @param action an action's gerund (`reading`)
 * @returns the participle, or `undefined` for a name that is not a plain gerund
 */
export function participleOf(action: string): string | undefined {
  if (action.includes('-') || action.includes('_') || !action.endsWith('ing')) return undefined;
  const known = PARTICIPLES[action];
  if (known) return known;
  const stem = action.slice(0, -3);
  if (stem.length < 2) return undefined;
  if (stem.endsWith('e')) return `${stem}d`;
  return `${stem}ed`;
}
