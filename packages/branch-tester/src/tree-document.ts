/**
 * tree-document.ts — the Testing tree's wire format (ADR-307).
 *
 * One JSON document per story (`<story-id>.tests.json`, beside the `.story`
 * file at the project root) is the at-rest form of the Testing tab's test
 * tree: the branch hierarchy of played turns, each carrying its authored
 * assertions. The tree is the model and the document is its projection —
 * the Testing tab and `sharpee test --tree` both deserialize, mutate, and
 * reserialize THIS shape (ADR-307 D1/D2/D6).
 *
 * SHARED WIRE TYPES (rule 8b): `tools/ide/web/testing-surface` imports this
 * SOURCE file directly (tsconfig `paths` + vitest alias + build.mjs alias),
 * so it must stay free of runtime-specific types and imports — no `fs`, no
 * Node types, no DOM. Pure data and pure functions only.
 *
 * Invariants:
 * - Serialization is deterministic: object keys sorted, array order
 *   preserved (sibling and card order are meaning), two-space indent, one
 *   trailing newline. `serialize → deserialize → serialize` is the identity
 *   on the emitted bytes (AC-1).
 * - The reader REFUSES a newer `version` with a named message (the caller
 *   must not clobber a document it cannot read) and reports anything else
 *   it cannot understand as MALFORMED (the caller degrades to a fresh empty
 *   tree — AC-4). It never throws.
 * - The grammar is closed: unknown keys are malformed. Additive fields
 *   arrive with a version bump, never silently.
 *
 * Public interface: the TreeDocument/TreeCard/TreeBranch/TreeAssertions/
 * TreeChannelAssertion types, TREE_DOCUMENT_VERSION,
 * treeDocumentFileNameFor, emptyTreeDocument, serializeTreeDocument,
 * deserializeTreeDocument, channelIdsReferencedBy, roomSlugOf,
 * mainLineLabelOf, branchLineLabelOf.
 * Owner context: @sharpee/branch-tester — the Chord/IDE testing world's
 * harness (transcript-tester's text world is a different format and is
 * untouched by this module).
 */

/** The newest document version this build reads and writes. */
export const TREE_DOCUMENT_VERSION = 1;

/**
 * The whole at-rest document: story id, the pinned seed governing every
 * replay, and the main line's cards (branches nest recursively inside).
 */
export interface TreeDocument {
  /** Format version — the reader refuses anything newer than it knows. */
  version: typeof TREE_DOCUMENT_VERSION;
  /** The story id the document belongs to (`<story-id>.tests.json`). */
  story: string;
  /** The pinned master seed — the whole tree replays at this seed (D5). */
  seed: number;
  /** The main line, in play order: opening, boot look, then typed turns. */
  cards: TreeCard[];
}

/**
 * What a card is: the opening (no command — nothing was typed), the boot
 * look (the automatic first look, its own card), or a typed turn.
 */
export type TreeCardType = 'opening' | 'boot' | 'turn';

/**
 * One node of the tree: a played turn (or the opening/boot look) with its
 * authored assertions. A fork lives ON the card branched from — `branches`
 * holds each alternative's own cards, and the parent's remaining `cards`
 * array is the main line's continuation (ADR-307 D2).
 */
export interface TreeCard {
  type: TreeCardType;
  /** The typed command. Present exactly when `type` is `'turn'`. */
  command?: string;
  /** Authored claims only — policy defaults synthesize live, never persist. */
  assertions?: TreeAssertions;
  /** The turn runs and asserts nothing (`[SKIP]` demotion, D4). */
  skip?: boolean;
  /** Forks taken from this card, in creation order. */
  branches?: TreeBranch[];
}

/** One fork alternative: a stable id (sidecar reference) and its cards. */
export interface TreeBranch {
  /** Stable id the sidecar's view state references — never positional. */
  branch: number;
  /** The alternative's own cards, recursively the same shape. */
  cards: TreeCard[];
}

/**
 * A turn's authored assertions — the closed family set of ADR-307 D2.
 * Family arrays keep authoring order; an absent family asserts nothing.
 */
export interface TreeAssertions {
  /** Prose the turn's output must contain, one entry per claim. */
  contains?: string[];
  /** Prose the turn's output must NOT contain. */
  notContains?: string[];
  /** The turn's exact output, as lines. Supersedes the contains family. */
  exact?: string[];
  /** State expressions (`kettle.location = hall`). */
  states?: string[];
  /** Event expressions, as the surface's Event picker authors them. */
  events?: string[];
  /** Channel claims — each reads one channel by id. */
  channels?: TreeChannelAssertion[];
}

/** One channel claim: the channel's id and exactly one predicate. */
export interface TreeChannelAssertion {
  /** The channel id the claim reads (`banner`, `status`, …). */
  id: string;
  /** Fragments the channel's rendered value must contain. */
  contains?: string[];
  /** The channel's exact scalar value. */
  is?: string;
}

/** What reading a document produced — never an exception (AC-4). */
export type TreeDocumentReadResult =
  /** The document parsed and validated; here it is. */
  | { status: 'ok'; document: TreeDocument }
  /**
   * The document is from a NEWER format version. The caller must leave the
   * file alone — refusing is what protects it from an older writer.
   */
  | { status: 'refused'; message: string }
  /**
   * The document cannot be understood (bad JSON or bad shape). The caller
   * degrades to a fresh empty tree (`emptyTreeDocument`) without erroring.
   */
  | { status: 'malformed'; message: string };

/**
 * The document's file name for a story: `<story-id>.tests.json`.
 *
 * @param storyId the story's id (the `.story` file's stem).
 * @returns the file name, no directory component.
 */
export function treeDocumentFileNameFor(storyId: string): string {
  return `${storyId}.tests.json`;
}

/**
 * A fresh empty tree — the degrade target for a malformed document and the
 * starting document for a story that has never recorded one.
 *
 * @param story the story id.
 * @param seed the pinned master seed the tree will replay at.
 * @returns a valid document with no cards.
 */
export function emptyTreeDocument(story: string, seed: number): TreeDocument {
  return { version: TREE_DOCUMENT_VERSION, story, seed, cards: [] };
}

/**
 * Serialize a document to its canonical bytes: keys sorted at every depth,
 * array order preserved, two-space indent, one trailing newline.
 *
 * @param document the tree to serialize.
 * @returns the canonical JSON text (what the file carries, byte for byte).
 */
export function serializeTreeDocument(document: TreeDocument): string {
  return `${JSON.stringify(sortKeysDeep(document), null, 2)}\n`;
}

/**
 * Read a document from text. Never throws: a newer version is `refused`
 * (leave the file alone), anything else unreadable is `malformed` (degrade
 * to `emptyTreeDocument`), and a valid document is `ok`.
 *
 * @param text the file's contents.
 * @returns the read result — see {@link TreeDocumentReadResult}.
 */
export function deserializeTreeDocument(text: string): TreeDocumentReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      status: 'malformed',
      message: `not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!isPlainObject(parsed)) {
    return { status: 'malformed', message: 'the document is not a JSON object' };
  }

  // Version gates first: refusal must win over any other complaint, so a
  // newer document with a shape this build has never heard of still reads
  // as "newer", not "broken".
  const version = parsed['version'];
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return { status: 'malformed', message: `'version' must be an integer` };
  }
  if (version > TREE_DOCUMENT_VERSION) {
    return {
      status: 'refused',
      message:
        `this document is version ${version}; this build reads up to version ` +
        `${TREE_DOCUMENT_VERSION} — update Sharpee to open it`,
    };
  }
  if (version < TREE_DOCUMENT_VERSION) {
    return { status: 'malformed', message: `unknown document version ${version}` };
  }

  const problem = validateDocumentShape(parsed);
  if (problem !== undefined) return { status: 'malformed', message: problem };

  return { status: 'ok', document: parsed as unknown as TreeDocument };
}

/**
 * Every channel id the document's claims read, deduplicated, in first-use
 * order. A game must be assembled with these declared or there is nothing
 * captured for the claims to read (ADR-294 D15) — both consumers derive
 * their capture set from the document through this one function.
 *
 * A dotted claim id (`banner.title`, `info.description`) reads one property
 * of a STRUCTURED capture (ADR-300 D13), so what must be captured is its
 * base channel — the id before the first dot.
 *
 * @param document the tree document.
 * @returns the referenced base channel ids, each once.
 */
export function channelIdsReferencedBy(document: TreeDocument): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const walkCards = (cards: TreeCard[]): void => {
    for (const card of cards) {
      for (const channel of card.assertions?.channels ?? []) {
        const base = channel.id.split('.')[0];
        if (base.length > 0 && !seen.has(base)) {
          seen.add(base);
          ids.push(base);
        }
      }
      for (const branch of card.branches ?? []) walkCards(branch.cards);
    }
  };
  walkCards(document.cards);
  return ids;
}

// ---------------------------------------------------------------------------
// Derived labels (ADR-307 D2/Q-8) — shared formatting, never persisted.
// ---------------------------------------------------------------------------

/**
 * A room name as labels carry it: lowercased, non-alphanumerics collapsed to
 * single hyphens (`Iron Gates` → `iron-gates`). Undefined in, undefined out.
 *
 * @param name the room's display name, if known.
 * @returns the slug, or undefined when nothing usable remains.
 */
export function roomSlugOf(name: string | undefined): string | undefined {
  if (name === undefined) return undefined;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : undefined;
}

/**
 * The main line's derived label: `opening-<room>` from the room the game
 * opens in, `opening-start` when no room is known.
 *
 * @param roomSlug the opening room's slug ({@link roomSlugOf}).
 * @returns the label.
 */
export function mainLineLabelOf(roomSlug: string | undefined): string {
  return `opening-${roomSlug ?? 'start'}`;
}

/**
 * A branch line's derived label: `<fork room> · <first command>`, degrading
 * to `branch-<id>` when no fork room is known and `(empty)` when the line
 * has no typed command yet.
 *
 * @param roomSlug the fork card's room slug ({@link roomSlugOf}).
 * @param branchId the branch's stable id (the room-less fallback).
 * @param firstCommand the line's first typed command, if any.
 * @returns the label.
 */
export function branchLineLabelOf(
  roomSlug: string | undefined,
  branchId: number,
  firstCommand: string | undefined,
): string {
  return `${roomSlug ?? `branch-${branchId}`} · ${firstCommand ?? '(empty)'}`;
}

// ---------------------------------------------------------------------------
// Internal: canonical ordering and shape validation.
// ---------------------------------------------------------------------------

/**
 * Code-unit ordering, stated explicitly.
 *
 * NOT `localeCompare`: this orders the keys of a persisted wire document, so
 * the result must be identical on every machine that writes one. Locale-aware
 * collation is by definition locale-dependent — adopting it would make two
 * authors' saves of the same tree differ by where they live.
 */
function byCodeUnit(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/** Rebuild a value with object keys sorted at every depth; arrays keep order. */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (isPlainObject(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort(byCodeUnit)) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A problem description, or undefined when the shape is valid. */
function validateDocumentShape(document: Record<string, unknown>): string | undefined {
  const unknownKey = firstUnknownKey(document, ['version', 'story', 'seed', 'cards']);
  if (unknownKey !== undefined) return `unknown key '${unknownKey}' at the top level`;
  if (typeof document['story'] !== 'string' || document['story'] === '') {
    return `'story' must be a non-empty string`;
  }
  if (typeof document['seed'] !== 'number' || !Number.isInteger(document['seed'])) {
    return `'seed' must be an integer`;
  }
  return validateCards(document['cards'], 'cards');
}

function validateCards(value: unknown, path: string): string | undefined {
  if (!Array.isArray(value)) return `'${path}' must be an array`;
  for (let index = 0; index < value.length; index++) {
    const problem = validateCard(value[index], `${path}[${index}]`);
    if (problem !== undefined) return problem;
  }
  return undefined;
}

function validateCard(value: unknown, path: string): string | undefined {
  if (!isPlainObject(value)) return `'${path}' must be an object`;
  const unknownKey = firstUnknownKey(value, ['type', 'command', 'assertions', 'skip', 'branches']);
  if (unknownKey !== undefined) return `unknown key '${unknownKey}' in '${path}'`;

  const type = value['type'];
  if (type !== 'opening' && type !== 'boot' && type !== 'turn') {
    return `'${path}.type' must be 'opening', 'boot', or 'turn'`;
  }
  // The opening and the boot look are what the story did unprompted; only a
  // typed turn carries a command (ADR-307 D2).
  if (type === 'turn') {
    if (typeof value['command'] !== 'string' || value['command'] === '') {
      return `'${path}' is a turn and must carry a non-empty 'command'`;
    }
  } else if (value['command'] !== undefined) {
    return `'${path}' is type '${type}' and must not carry a 'command'`;
  }

  if (value['skip'] !== undefined && typeof value['skip'] !== 'boolean') {
    return `'${path}.skip' must be a boolean`;
  }

  if (value['assertions'] !== undefined) {
    const problem = validateAssertions(value['assertions'], `${path}.assertions`);
    if (problem !== undefined) return problem;
  }

  if (value['branches'] !== undefined) {
    const branches = value['branches'];
    if (!Array.isArray(branches)) return `'${path}.branches' must be an array`;
    const seenIds = new Set<number>();
    for (let index = 0; index < branches.length; index++) {
      const problem = validateBranch(branches[index], `${path}.branches[${index}]`, seenIds);
      if (problem !== undefined) return problem;
    }
  }
  return undefined;
}

function validateBranch(
  value: unknown,
  path: string,
  seenIds: Set<number>,
): string | undefined {
  if (!isPlainObject(value)) return `'${path}' must be an object`;
  const unknownKey = firstUnknownKey(value, ['branch', 'cards']);
  if (unknownKey !== undefined) return `unknown key '${unknownKey}' in '${path}'`;
  const id = value['branch'];
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    return `'${path}.branch' must be an integer id`;
  }
  if (seenIds.has(id)) return `'${path}.branch' duplicates sibling id ${id}`;
  seenIds.add(id);
  return validateCards(value['cards'], `${path}.cards`);
}

function validateAssertions(value: unknown, path: string): string | undefined {
  if (!isPlainObject(value)) return `'${path}' must be an object`;
  // `noDefaults` left the grammar with run-time synthesis itself (David
  // 2026-08-10: the JSON is the source of truth — recording persists real
  // assertions, so there is no default synthesis to withhold). Closed
  // grammar: a document still carrying it is malformed, by design.
  const unknownKey = firstUnknownKey(value, [
    'contains',
    'notContains',
    'exact',
    'states',
    'events',
    'channels',
  ]);
  if (unknownKey !== undefined) return `unknown assertion family '${unknownKey}' in '${path}'`;

  for (const family of ['contains', 'notContains', 'exact', 'states', 'events'] as const) {
    const entries = value[family];
    if (entries === undefined) continue;
    if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== 'string')) {
      return `'${path}.${family}' must be an array of strings`;
    }
  }

  const channels = value['channels'];
  if (channels !== undefined) {
    if (!Array.isArray(channels)) return `'${path}.channels' must be an array`;
    for (let index = 0; index < channels.length; index++) {
      const problem = validateChannelAssertion(channels[index], `${path}.channels[${index}]`);
      if (problem !== undefined) return problem;
    }
  }
  return undefined;
}

function validateChannelAssertion(value: unknown, path: string): string | undefined {
  if (!isPlainObject(value)) return `'${path}' must be an object`;
  const unknownKey = firstUnknownKey(value, ['id', 'contains', 'is']);
  if (unknownKey !== undefined) return `unknown key '${unknownKey}' in '${path}'`;
  if (typeof value['id'] !== 'string' || value['id'] === '') {
    return `'${path}.id' must be a non-empty channel id`;
  }
  const hasContains = value['contains'] !== undefined;
  const hasIs = value['is'] !== undefined;
  if (hasContains === hasIs) {
    return `'${path}' must carry exactly one of 'contains' or 'is'`;
  }
  if (hasContains) {
    const entries = value['contains'];
    if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== 'string')) {
      return `'${path}.contains' must be an array of strings`;
    }
  }
  if (hasIs && typeof value['is'] !== 'string') {
    return `'${path}.is' must be a string`;
  }
  return undefined;
}

/** The first key of `value` not in `allowed`, or undefined when all are. */
function firstUnknownKey(
  value: Record<string, unknown>,
  allowed: readonly string[],
): string | undefined {
  return Object.keys(value).find((key) => !allowed.includes(key));
}
