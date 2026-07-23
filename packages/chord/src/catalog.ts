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
 * PLATFORM_STATE_PAIRS, STARTS_STATE_PAIRINGS, EVENT_VERBS,
 * PRONOUN_WORDS, PRONOUN_CASES.
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
  'region', // ratchet R1 (ADR-236 D1, 2026-07-17) — named room group; membership via `containing`
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
  'enterable', // ADR-218 §1a (ratchet F1) — composes EnterableTrait; always explicit
  'climbable', // ADR-218 §1a (ratchet F2) — composes ClimbableTrait
  'cuttable', // ADR-230 D3c — composes CuttableTrait; `with tool <entity>` config; requires a cut implementation
  'diggable', // ADR-230 Phase 6 — composes DiggableTrait; same tool config + implementation rule as cuttable
  'drinkable', // ratchet G1 (2026-07-17) — composes EdibleTrait with liquid=true (drunk, not eaten)
  'concealed', // ratchet G2 (2026-07-17) — marker: IdentityTrait.concealed = true; searching reveals
  'hiding-spot', // ratchet G3 (2026-07-17) — composes ConcealmentTrait; bare = all positions, `with position <word>` narrows
  'proper', // ratchet H1 (ADR-242 D1, 2026-07-19) — person-only, unconditional: IdentityTrait.properName (bare name, no article)
]);

/**
 * Standard pronoun sets (ADR-242 D5) — the four rows the lang-{locale}
 * assembler ships. A `pronouns <word>` person line accepts these or a
 * story-defined named set (`define pronouns <name>`); defining a set that
 * shadows one of these is an error.
 */
export const PRONOUN_WORDS: ReadonlySet<string> = new Set(['he', 'she', 'it', 'they']);

/**
 * The five case rows of a `define pronouns` block (ADR-242 D7, ruled Q-1)
 * — exactly the cases the assembler's pronoun table keys. All five are
 * required; order is free (named rows, not positional).
 */
export const PRONOUN_CASES: ReadonlyArray<string> = ['subject', 'object', 'possessive', 'possessive-pronoun', 'reflexive'];

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
 * `starts <state>` initializer pairings (ADR-231 D5a, approved 2026-07-17):
 * each accepted state word after `starts` on a composition line, mapped to
 * the trait adjective that must be composed on the same entity — the
 * analyzer's pairing gate (`analysis.starts-state-pairing`). The state
 * adjective is an *initializer* of the trait's initial-value field, never
 * stored story state (the shadow-state ratchet survives: `locked`, `open`,
 * `on`, … stay derivable). Future stateful traits extend this table, not
 * the code. Platform field mappings (`isLocked`, `isOpen`, `isOn`) live in
 * @sharpee/story-loader, keeping this file names-only.
 */
export const STARTS_STATE_PAIRINGS: ReadonlyMap<string, string> = new Map([
  ['locked', 'lockable'],
  ['unlocked', 'lockable'],
  ['closed', 'openable'],
  ['open', 'openable'],
  ['off', 'switchable'],
  ['on', 'switchable'],
]);

/**
 * Event verbs entity `on`/`after` clauses recognize beyond action gerunds
 * (the curated event-selector map's language side; the if.event.* bindings
 * are the loader's side of Interface Contract 2). Gerund register since
 * the ownership package (ratchet D3): `after entering it`.
 * `leaving` (ratchet R3, ADR-236 D6) exists only as a region crossing
 * reaction — the loader refuses it on any other owner.
 */
export const EVENT_VERBS: ReadonlySet<string> = new Set(['entering', 'leaving']);

/**
 * Client capability flags (ADR-216 `client has <capability>` and channel
 * `gated by` lines), in Chord spelling — hyphenated words mapping
 * mechanically to the platform's camelCase `ClientCapabilities` boolean
 * keys (`split-pane` → `splitPane`). `text` is excluded: it is always
 * true and cannot gate. The loader-side conformance test pins this list
 * against the platform's real flag set.
 */
export const CLIENT_CAPABILITY_FLAGS: ReadonlySet<string> = new Set([
  'images',
  'animations',
  'video',
  'sound',
  'music',
  'speech',
  'split-pane',
  'status-bar',
  'sidebar',
  'clickable-text',
  'clickable-image',
  'drag-drop',
  'transitions',
  'layers',
  'custom-fonts',
]);

/** Chord capability word → the platform's camelCase key (`split-pane` → `splitPane`). */
export function capabilityKeyOf(word: string): string {
  return word.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

/**
 * ADR-255 Interface Contract 3 (names side): the closed set of curated kebab
 * aliases valid in `override message <alias>` — one per standard-action message
 * id in lang-en-us. Names only; the alias → `if.action.*` binding lives in
 * `@sharpee/story-loader`. The data (and its generation rule) is in
 * `message-alias-catalog.ts`; re-exported here so the analyzer reads the ACL
 * vocabulary through the single catalog surface.
 */
export { MESSAGE_OVERRIDE_ALIASES } from './message-alias-catalog.js';
