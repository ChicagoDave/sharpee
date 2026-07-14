/**
 * catalog.ts — the closed language vocabulary (Phase A slice).
 *
 * Purpose: the *names* of the v1 kinds, trait adjectives, and event verbs —
 * the closed sets the analyzer checks the closed grammar against
 * (design.md §2.7; kinds catalog per prereqs.md §5). Platform *mappings*
 * (kind → trait bundle) live in @sharpee/story-loader; this file is names
 * only so the compiler stays platform-free.
 *
 * Public interface: KIND_NOUNS, TRAIT_ADJECTIVES, STATE_ADJECTIVES,
 * PLATFORM_STATE_PAIRS, EVENT_VERBS.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 * Growing any of these sets is a grammar change — owner approval via
 * docs/architecture/chord-grammar-changes.md.
 */

/** v1 kind nouns (take an article: `a room`). Plain thing = no kind noun. */
export const KIND_NOUNS: ReadonlySet<string> = new Set([
  'room',
  'door',
  'person',
  'container',
  'supporter',
]);

/** v1 trait adjectives (bare, no article). */
export const TRAIT_ADJECTIVES: ReadonlySet<string> = new Set([
  'scenery',
  'wearable',
  'readable',
  'openable',
  'lockable',
  'switchable',
  'edible',
  'pushable',
  'pullable',
  'light-source',
  'plural',
  'dark',
]);

/**
 * State adjectives (ratchet D1): `is [not] <adj>` predicates read live from
 * world trait state (OpenableTrait.isOpen, LockableTrait.isLocked,
 * SwitchableTrait.isOn, the worn relation, computed light) — derivable,
 * never stored. Same closed-catalog governance as TRAIT_ADJECTIVES.
 */
export const STATE_ADJECTIVES: ReadonlySet<string> = new Set([
  'open',
  'closed',
  'locked',
  'unlocked',
  'on',
  'off',
  'worn',
  'lit',
]);

/**
 * Platform-owned state pairs (ratchet D9 ring 2): a declared state set
 * reproducing one of these shadows a derivable fact — the fix-it names the
 * trait to compose instead.
 */
export const PLATFORM_STATE_PAIRS: ReadonlyArray<{ pair: [string, string]; trait: string }> = [
  { pair: ['open', 'closed'], trait: 'openable' },
  { pair: ['locked', 'unlocked'], trait: 'lockable' },
  { pair: ['on', 'off'], trait: 'switchable' },
  { pair: ['lit', 'unlit'], trait: 'light-source' },
  { pair: ['worn', 'unworn'], trait: 'wearable' },
];

/**
 * Event verbs entity `on`/`after` clauses recognize beyond action gerunds
 * (the curated event-selector map's language side; the if.event.* bindings
 * are the loader's side of Interface Contract 2). Gerund register since
 * the ownership package (ratchet D3): `after entering it`.
 */
export const EVENT_VERBS: ReadonlySet<string> = new Set(['entering']);
