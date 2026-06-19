/**
 * Platform decoration vocabulary — closed enumeration of names the
 * platform recognises and prefixes with `sharpee-` when emitting class
 * names on the wire.
 *
 * Public interface: `PLATFORM_VOCABULARY` (frozen Set), consumed by
 * the resolver in this directory. No external package imports this.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Closed platform vocabulary
 */

const VOCABULARY_NAMES = [
  // Switches — apply on/off, no parameter.
  'em',
  'strong',
  'u',
  'st',
  'code',
  'super',
  'sub',

  // IF-semantic — entity classifiers retained from ADR-091.
  'item',
  'npc',
  'room',
  'direction',
  'command',
  'quote',

  // Class vocabulary — color-* starter palette.
  'color-red',
  'color-blue',
  'color-green',
  'color-yellow',
  'color-magenta',
  'color-cyan',
  'color-white',
  'color-grey',
  'color-black',

  // Class vocabulary — bgcolor-* matching set.
  'bgcolor-red',
  'bgcolor-blue',
  'bgcolor-green',
  'bgcolor-yellow',
  'bgcolor-magenta',
  'bgcolor-cyan',
  'bgcolor-white',
  'bgcolor-grey',
  'bgcolor-black',

  // Class vocabulary — size-*.
  'size-small',
  'size-large',

  // Class vocabulary — font-*.
  'font-mono',

  // Layout macros (ADR-183). `br`/`p` are void (no content); `indent`/`center`
  // accept an optional `=value` (level / width %); `right` is plain. All
  // presentation lives in the platform stylesheet, author-overridable en masse.
  'br',
  'p',
  'indent',
  'center',
  'right',
] as const;

/**
 * Names that take **no content** — written `[br]` / `[p]` (no colon). The
 * parser treats a colon-less `[name]` as a void decoration iff `name` is
 * listed here; any other colon-less bracket stays literal (ADR-174 AC-11).
 *
 * @see ADR-183 §1 — Vocabulary, §2 — Syntax
 */
export const VOID_MACROS: ReadonlySet<string> = Object.freeze(
  new Set<string>(['br', 'p']),
);

/**
 * Frozen set of every name the platform reserves under the `sharpee-`
 * namespace. Adding a new entry requires both updating this list and
 * shipping a corresponding `.sharpee-{name}` rule in the platform CSS.
 */
export const PLATFORM_VOCABULARY: ReadonlySet<string> = Object.freeze(
  new Set<string>(VOCABULARY_NAMES),
);

/**
 * Type-level export of every recognised name; useful for tests that
 * iterate the closed enumeration.
 */
export type PlatformVocabularyName = (typeof VOCABULARY_NAMES)[number];

export const PLATFORM_VOCABULARY_NAMES: ReadonlyArray<PlatformVocabularyName> =
  Object.freeze([...VOCABULARY_NAMES]);
