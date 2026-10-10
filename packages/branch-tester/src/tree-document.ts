/**
 * tree-document.ts — the Testing tree's model and its at-rest format
 * (ADR-307, ADR-355).
 *
 * The test tree is the branch hierarchy of played turns, each carrying its
 * authored assertions. In memory it is one recursive `TreeDocument`; at rest
 * it is a DIRECTORY beside the `.story` file (`<story-id>.tests/`) holding a
 * manifest and one file per segment (ADR-355 D1-D5). The tree is the model
 * and the files are its projection — the Testing tab and `sharpee test`
 * both assemble, mutate, and re-segment THIS model.
 *
 * A segment is the run of cards between fork points (D2). A fork point is a
 * card carrying branches: it ends the segment it sits in, each of its
 * branches begins a segment, and the cards after it on the same line begin
 * a continuation segment. Each segment names the segment it descends from
 * and the fork ordinal it descends at — 0 for the continuation, 1..n for the
 * branches in sibling order (D4). The manifest holds `version`, `story` and
 * `seed`, plus the optional `claims` path (ADR-365 D7), so it changes when
 * those do and never when the tree does.
 *
 * Every segment carries an opaque id, generated once and persisted (D5):
 * the root segment's is the document's `id`, a branch's is its `id`, and a
 * continuation's is its fork card's `continuation`. A line — the main line,
 * or one branch — is identified by the id of the segment it begins with.
 * Every card carries its own opaque id too, minted once when the card is
 * created (D7), so anything that points at a card survives an insertion
 * above it. No id is derived from position or content. Display labels stay
 * derived and are never persisted.
 *
 * SHARED WIRE TYPES (rule 8b): `tools/ide/web/testing-surface` imports this
 * SOURCE file directly (tsconfig `paths` + vitest alias + build.mjs alias),
 * so it must stay free of runtime-specific types and imports — no `fs`, no
 * Node types, no DOM. Pure data and pure functions only; the file system is
 * the caller's, which hands this module a {@link TreeFiles} map.
 *
 * Invariants:
 * - Serialization is deterministic per file: object keys sorted, array
 *   order preserved (card order is meaning), two-space indent, one trailing
 *   newline. `segment → assemble → segment` is the identity on every file's
 *   bytes (ADR-355 AC-6).
 * - A change confined to one run of cards changes one file (AC-1), and no
 *   edit moves another segment's id (AC-4): ids encode nothing positional.
 *   Removing a branch renumbers its later siblings' ordinals — sibling order
 *   is carried by the ordinal, so those files change by that one field.
 * - The reader REFUSES a newer manifest `version` with a named message (the
 *   caller must not clobber a tree it cannot read) and reports anything else
 *   it cannot understand as MALFORMED (the caller degrades to a fresh empty
 *   tree). A dangling parent, an absent manifest, a duplicate ordinal or an
 *   unreachable segment is MALFORMED — never repaired, never thrown.
 * - The grammar is closed: unknown keys and unknown file names are
 *   malformed, and so is any shape the writer cannot emit (an empty
 *   continuation, a card without an id). Additive fields arrive with a
 *   version bump, never silently. File names beginning with `.`
 *   (`.DS_Store`) are not the tree's and are ignored.
 * - The reader does NOT check formatting — any valid JSON of the right
 *   shape reads — so a hand edit is flagged, not made unreadable. Formatting
 *   is the canonical gate's ({@link checkCanonicalTree}): a tree file whose
 *   bytes differ from what `segmentTree` would write is reported by name.
 * - A card that declares an `ending` is an END STATE card (ADR-356 D4): the
 *   story ended on that turn, so it is the last card of its line that runs.
 *   The wire validator checks the field's shape; the walker stops the line
 *   there and reports whatever was recorded after it as never reached.
 *
 * Public interface: the TreeDocument/TreeCard/TreeBranch/TreeAssertions/
 * TreeChannelAssertion/TreeFiles/TreeDocumentReadResult types,
 * TREE_DOCUMENT_VERSION, TREE_MANIFEST_FILE_NAME, treeDirectoryNameFor,
 * createSegmentId, emptyTreeDocument, ensureSegmentIds, segmentTree,
 * assembleTree, diffTreeFiles, checkCanonicalTree, TreeCanonicalCheck,
 * channelIdsReferencedBy, splitChannelClaimId,
 * endingIdsDeclaredBy, roomSlugOf, mainLineLabelOf, branchLineLabelOf.
 * Owner context: @sharpee/branch-tester — the Chord/IDE testing world's
 * harness (transcript-tester's text world is a different format and is
 * untouched by this module).
 */

/**
 * The newest tree version this build reads and writes (the manifest's).
 *
 * 2 (ADR-356 D4): a turn card may declare `ending`.
 * 3 (ADR-355): the tree is a directory of segments and a manifest.
 * Older versions are read as malformed — there is no shim; a one-shot
 * conversion wrote every tree in the repository at version 3.
 */
export const TREE_DOCUMENT_VERSION = 3;

/** The manifest's file name inside `<story-id>.tests/` (ADR-355 D4). */
export const TREE_MANIFEST_FILE_NAME = 'manifest.json';

/**
 * A tree's at-rest files: file name (no directory component) → contents.
 * The manifest under {@link TREE_MANIFEST_FILE_NAME}, each segment under
 * `<segment id>.json`.
 */
export type TreeFiles = Record<string, string>;

/**
 * The whole tree in memory: story id, the pinned seed governing every
 * replay, and the main line's cards (branches nest recursively inside).
 */
export interface TreeDocument {
  /** Format version — the reader refuses anything newer than it knows. */
  version: typeof TREE_DOCUMENT_VERSION;
  /** The story id the tree belongs to (`<story-id>.tests/`). */
  story: string;
  /** The pinned master seed — the whole tree replays at this seed (D5). */
  seed: number;
  /**
   * The claims fragment the claims runner compiles beside the story, as a
   * path relative to the story file (ADR-365 D7). Absent means no claims
   * run; the story never imports the fragment. The one optional key the
   * manifest carries beyond ADR-355 D4's three.
   */
  claims?: string;
  /** The root segment's id: the main line's identity (ADR-355 D5). */
  id: string;
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
 * array is the line's continuation (ADR-307 D2).
 */
export interface TreeCard {
  /**
   * The card's stable id (ADR-355 D7): minted once, when the card is
   * created, and never changed — not by an insertion above it, not by an
   * edit to its assertions. Present on every card the reader returns; a
   * writer mints any missing through {@link ensureSegmentIds}.
   */
  id?: string;
  type: TreeCardType;
  /** The typed command. Present exactly when `type` is `'turn'`. */
  command?: string;
  /** Authored claims only — policy defaults synthesize live, never persist. */
  assertions?: TreeAssertions;
  /** The turn runs and asserts nothing (`[SKIP]` demotion, D4). */
  skip?: boolean;
  /**
   * The ending this turn reached — the id the story's `win`, `lose` or
   * `kill` statement named (ADR-356 D4). Its presence makes the card an END
   * STATE card: the replay asserts the world's Ending carries this id, the
   * line ends here, and no card may follow it or fork from it. Present only
   * on a `'turn'` card.
   */
  ending?: string;
  /** Forks taken from this card, in sibling order. */
  branches?: TreeBranch[];
  /**
   * The id of the segment holding the cards after this card on its line —
   * meaningful only on a fork card with cards after it (ADR-355 D2/D5).
   * Model-only: it is persisted as that segment's own id, never on the card.
   * {@link ensureSegmentIds} allocates it when a fork first has cards after it.
   */
  continuation?: string;
}

/** One fork alternative: its segment's stable id and its cards. */
export interface TreeBranch {
  /** The branch segment's id, generated once and persisted — never positional. */
  id: string;
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

/** What reading a tree produced — never an exception. */
export type TreeDocumentReadResult =
  /** The tree assembled and validated; here it is. */
  | { status: 'ok'; document: TreeDocument }
  /**
   * The tree is from a NEWER format version. The caller must leave the
   * files alone — refusing is what protects them from an older writer.
   */
  | { status: 'refused'; message: string }
  /**
   * The tree cannot be understood (bad JSON, bad shape, broken parentage).
   * The caller degrades to a fresh empty tree (`emptyTreeDocument`) without
   * erroring — and a caller that reports results (`sharpee test`) reports
   * the tree as unreadable rather than as an empty pass.
   */
  | { status: 'malformed'; message: string };

/**
 * The tree's directory name for a story: `<story-id>.tests`.
 *
 * @param storyId the story's id (the `.story` file's stem).
 * @returns the directory name, no parent component.
 */
export function treeDirectoryNameFor(storyId: string): string {
  return `${storyId}.tests`;
}

/** The segment id alphabet and length (ADR-355 D5: short, opaque). */
const SEGMENT_ID_PATTERN = /^[a-z0-9]{8}$/;
const SEGMENT_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SEGMENT_ID_LENGTH = 8;

/**
 * A fresh opaque segment id: eight lowercase base-36 characters, random.
 * Generated once per segment and persisted; nothing about it is positional.
 *
 * @param random a source of uniform numbers in [0, 1) — injectable so tests
 *   are deterministic.
 * @returns the id.
 */
export function createSegmentId(random: () => number = Math.random): string {
  let id = '';
  for (let index = 0; index < SEGMENT_ID_LENGTH; index++) {
    id += SEGMENT_ID_ALPHABET[Math.floor(random() * SEGMENT_ID_ALPHABET.length)];
  }
  return id;
}

/**
 * A fresh empty tree — the degrade target for a malformed tree and the
 * starting tree for a story that has never recorded one.
 *
 * @param story the story id.
 * @param seed the pinned master seed the tree will replay at.
 * @param id the root segment's id — normally `createSegmentId()`.
 * @returns a valid tree with no cards.
 */
export function emptyTreeDocument(story: string, seed: number, id: string): TreeDocument {
  return { version: TREE_DOCUMENT_VERSION, story, seed, id, cards: [] };
}

/**
 * Mint the ids a mutation can leave missing: a new card's own `id` (D7),
 * and a fork card's `continuation`, needed once the fork has cards after
 * it. Existing ids are never touched. A writer calls this before
 * {@link segmentTree}; a surface that mints a card's id when it creates the
 * card leaves this nothing to do for cards.
 *
 * Mutates `document` in place — the allocated ids must persist in the model,
 * or the next write would allocate different ones and rename the file.
 *
 * @param document the tree to complete.
 * @param generateId the id source — `createSegmentId` unless a test injects.
 * @returns the number of ids allocated.
 */
export function ensureSegmentIds(
  document: TreeDocument,
  generateId: () => string = () => createSegmentId(),
): number {
  const taken = new Set<string>(collectSegmentIds(document));
  let allocated = 0;
  const fresh = (): string => {
    for (;;) {
      const id = generateId();
      if (!taken.has(id)) {
        taken.add(id);
        return id;
      }
    }
  };
  const walk = (cards: TreeCard[]): void => {
    cards.forEach((card, index) => {
      if (card.id === undefined) {
        card.id = fresh();
        allocated++;
      }
      const branches = card.branches ?? [];
      if (branches.length > 0 && index < cards.length - 1 && card.continuation === undefined) {
        card.continuation = fresh();
        allocated++;
      }
      for (const branch of branches) walk(branch.cards);
    });
  };
  walk(document.cards);
  return allocated;
}

/**
 * Cut a tree into its at-rest files (ADR-355 D2-D5): the manifest, and one
 * file per segment named `<segment id>.json`. Pure — the caller writes the
 * files (and removes stale ones, see {@link diffTreeFiles}).
 *
 * A fork card ends its segment; each branch begins one (ordinals 1..n in
 * sibling order); the cards after the fork begin a continuation (ordinal 0).
 * A fork with no cards after it has no continuation file. A card carrying an
 * empty `branches` array is not a fork.
 *
 * @param document the tree, with every needed id present.
 * @returns the files, keyed by file name.
 * @throws Error when the model breaks its own invariant — a card without an
 *   id, a fork with cards after it and no `continuation`, two segments
 *   sharing an id, two cards sharing one, or a card and a segment sharing
 *   one (a single namespace). That is a writer bug (call
 *   `ensureSegmentIds` first; never copy a card without minting it a new
 *   id), never a property of input a reader produced.
 */
export function segmentTree(document: TreeDocument): TreeFiles {
  const files: TreeFiles = {};
  files[TREE_MANIFEST_FILE_NAME] = canonicalJson({
    version: TREE_DOCUMENT_VERSION,
    story: document.story,
    seed: document.seed,
    ...(document.claims !== undefined ? { claims: document.claims } : {}),
  });

  const cardIds = new Set<string>();
  const emit = (id: string, cards: TreeCard[], parent?: { id: string; ordinal: number }): void => {
    if (files[segmentFileNameOf(id)] !== undefined) {
      throw new Error(`segment id '${id}' is used by two segments`);
    }
    const run: PersistedCard[] = [];
    for (let index = 0; index < cards.length; index++) {
      const card = cards[index];
      if (card.id === undefined) {
        throw new Error(`the card at '${id}'[${index}] has no id — mint it with ensureSegmentIds`);
      }
      if (cardIds.has(card.id)) throw new Error(`card id '${card.id}' is used by two cards`);
      cardIds.add(card.id);
      run.push(persistedCardOf(card));
      const branches = card.branches ?? [];
      if (branches.length === 0) continue;
      write(id, run, parent);
      branches.forEach((branch, position) => emit(branch.id, branch.cards, { id, ordinal: position + 1 }));
      const rest = cards.slice(index + 1);
      if (rest.length > 0) {
        if (card.continuation === undefined) {
          throw new Error(`the fork card at '${id}'[${index}] has cards after it and no continuation id`);
        }
        emit(card.continuation, rest, { id, ordinal: 0 });
      }
      return;
    }
    write(id, run, parent);
  };

  const write = (id: string, run: PersistedCard[], parent?: { id: string; ordinal: number }): void => {
    files[segmentFileNameOf(id)] = canonicalJson({
      id,
      ...(parent !== undefined ? { parent: parent.id, ordinal: parent.ordinal } : {}),
      cards: run,
    });
  };

  emit(document.id, document.cards);
  // Card ids share one namespace with segment ids (D5, D7).
  for (const cardId of cardIds) {
    if (files[segmentFileNameOf(cardId)] !== undefined) {
      throw new Error(`id '${cardId}' is used by both a segment and a card`);
    }
  }
  return files;
}

/**
 * Assemble a tree from its at-rest files. Never throws: a newer manifest
 * version is `refused` (leave the files alone), anything else unreadable is
 * `malformed` (degrade to `emptyTreeDocument`), and a valid tree is `ok`.
 *
 * @param files the directory's files, keyed by file name.
 * @returns the read result — see {@link TreeDocumentReadResult}.
 */
export function assembleTree(files: TreeFiles): TreeDocumentReadResult {
  const manifestText = files[TREE_MANIFEST_FILE_NAME];
  if (manifestText === undefined) {
    return { status: 'malformed', message: `the tree has no ${TREE_MANIFEST_FILE_NAME}` };
  }
  const manifest = readManifest(manifestText);
  if (manifest.status !== 'ok') return manifest;

  const segments = new Map<string, PersistedSegment>();
  for (const name of Object.keys(files).sort(byCodeUnit)) {
    if (name === TREE_MANIFEST_FILE_NAME || name.startsWith('.')) continue;
    const read = readSegment(name, files[name]);
    if (typeof read === 'string') return { status: 'malformed', message: read };
    segments.set(read.id, read);
  }

  const shape = linkSegments(segments);
  if (typeof shape === 'string') return { status: 'malformed', message: shape };

  // Card ids share one namespace with segment ids (D5, D7).
  const cardOwners = new Map<string, string>();
  for (const segment of segments.values()) {
    for (const card of segment.cards) {
      const id = card.id!;
      if (segments.has(id)) {
        return { status: 'malformed', message: `card id '${id}' in '${segment.id}' is also a segment's id` };
      }
      const owner = cardOwners.get(id);
      if (owner === segment.id) {
        return { status: 'malformed', message: `card id '${id}' appears twice in '${segment.id}'` };
      }
      if (owner !== undefined) {
        return { status: 'malformed', message: `card id '${id}' appears in both '${owner}' and '${segment.id}'` };
      }
      cardOwners.set(id, segment.id);
    }
  }

  const build = (segment: PersistedSegment): TreeCard[] => {
    const cards: TreeCard[] = segment.cards.map((card) => ({ ...card }));
    const children = shape.children.get(segment.id);
    if (children === undefined) return cards;
    const fork = cards[cards.length - 1];
    fork.branches = children.branches.map((child) => ({ id: child.id, cards: build(child) }));
    if (children.continuation !== undefined) {
      fork.continuation = children.continuation.id;
      cards.push(...build(children.continuation));
    }
    return cards;
  };

  return {
    status: 'ok',
    document: {
      version: TREE_DOCUMENT_VERSION,
      story: manifest.story,
      seed: manifest.seed,
      ...(manifest.claims !== undefined ? { claims: manifest.claims } : {}),
      id: shape.root.id,
      cards: build(shape.root),
    },
  };
}

/**
 * What a writer must do to bring a directory from `previous` to `next`: the
 * files whose bytes differ (or are new), and the files to remove. Unchanged
 * files appear in neither — a write touches only what changed (AC-1).
 *
 * @param previous the files on disk (or last written).
 * @param next the files `segmentTree` produced.
 * @returns the files to write and the names to remove, both sorted.
 */
export function diffTreeFiles(
  previous: TreeFiles,
  next: TreeFiles,
): { written: TreeFiles; removed: string[] } {
  const written: TreeFiles = {};
  for (const name of Object.keys(next).sort(byCodeUnit)) {
    if (previous[name] !== next[name]) written[name] = next[name];
  }
  const removed = Object.keys(previous)
    .filter((name) => next[name] === undefined && !name.startsWith('.'))
    .sort(byCodeUnit);
  return { written, removed };
}

/**
 * Every channel id the document's claims read, deduplicated, in first-use
 * order, AS WRITTEN. A game must be assembled with these declared or there
 * is nothing captured for the claims to read (ADR-294 D15) — both consumers
 * derive their capture set from the document through this one function.
 *
 * A claim id may be a channel id (`prologue`) or a dotted path into a
 * STRUCTURED capture (`info.title`, ADR-300 D13). Which segments are the
 * channel and which are the path is the registry's to say — a channel's own
 * id may carry a dot (`story.chapter`, GH #369) — so the ids go out whole
 * and the assembler resolves each to the registered channel it names
 * (bootstrap's `resolveDeclaredChannelId`). Splitting on the first dot here
 * named a channel that does not exist.
 *
 * @param document the tree document.
 * @returns the referenced claim ids, each once.
 */
export function channelIdsReferencedBy(document: TreeDocument): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const walkCards = (cards: TreeCard[]): void => {
    for (const card of cards) {
      for (const channel of card.assertions?.channels ?? []) {
        const id = channel.id.trim();
        if (id.length > 0 && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
      for (const branch of card.branches ?? []) walkCards(branch.cards);
    }
  };
  walkCards(document.cards);
  return ids;
}

/**
 * Every ending id an END STATE card in the document declares, deduplicated,
 * in first-declaration order — the "reached" side of ADR-356 D5's endings
 * ratio, read off the document alone. Which of the story's declared endings
 * are missing from this list is the enumerator's question, not this one.
 *
 * @param document the tree document.
 * @returns the declared ending ids, each once.
 */
export function endingIdsDeclaredBy(document: TreeDocument): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const walkCards = (cards: TreeCard[]): void => {
    for (const card of cards) {
      if (card.ending !== undefined && !seen.has(card.ending)) {
        seen.add(card.ending);
        ids.push(card.ending);
      }
      for (const branch of card.branches ?? []) walkCards(branch.cards);
    }
  };
  walkCards(document.cards);
  return ids;
}

/**
 * Split a claim id into the channel it reads and the path into that
 * channel's value.
 *
 * The channel is the LONGEST id in `knownChannelIds` that equals the claim
 * id or is a dot-bounded prefix of it; the rest is the path. With no known
 * ids (a harness that captured nothing) the split falls back to the first
 * segment, which is what every single-segment channel id needs.
 *
 * @param claimId the claim's id as written (`story.chapter.title`).
 * @param knownChannelIds the base channel ids the game captures.
 * @returns the channel id and the (possibly empty) path.
 */
export function splitChannelClaimId(
  claimId: string,
  knownChannelIds: readonly string[],
): { channelId: string; channelPath: string[] } {
  let channelId: string | undefined;
  for (const known of knownChannelIds) {
    const prefixes = claimId === known || claimId.startsWith(known + '.');
    if (prefixes && (channelId === undefined || known.length > channelId.length)) channelId = known;
  }
  if (channelId === undefined) {
    const [first, ...rest] = claimId.split('.');
    return { channelId: first, channelPath: rest };
  }
  const remainder = claimId.slice(channelId.length);
  const channelPath = remainder.length > 0 ? remainder.slice(1).split('.') : [];
  return { channelId, channelPath };
}
/** What the canonical gate found — never an exception. */
export type TreeCanonicalCheck =
  /** Every file's bytes are exactly what `segmentTree` writes. */
  | { status: 'canonical' }
  /**
   * The tree reads, but these files' bytes differ from their canonical form
   * (re-indented, keys reordered, a missing trailing newline…). Sorted.
   */
  | { status: 'non-canonical'; files: string[] }
  /** The tree does not read at all — the reader's own verdict, passed on. */
  | { status: 'refused' | 'malformed'; message: string };

/**
 * The canonical gate: does every file of this tree carry exactly the bytes
 * `segmentTree` would write for it? A second writer that re-indents or
 * reorders keys rewrites whole files without changing a single claim; this
 * names every such file so the churn is caught before it is committed.
 * Consumers: `sharpee test` and the local pre-commit hook — never CI.
 *
 * @param files the directory's files, keyed by file name.
 * @returns `canonical`, the non-canonical file names, or why the tree does
 *   not read.
 */
export function checkCanonicalTree(files: TreeFiles): TreeCanonicalCheck {
  const read = assembleTree(files);
  if (read.status !== 'ok') return read;
  const canonical = segmentTree(read.document);
  const differing = Object.keys(files)
    .filter((name) => !name.startsWith('.') && files[name] !== canonical[name])
    .sort(byCodeUnit);
  return differing.length === 0 ? { status: 'canonical' } : { status: 'non-canonical', files: differing };
}

// ---------------------------------------------------------------------------
// Derived labels (ADR-307 D2/Q-8, ADR-355 D5) — shared formatting, never persisted.
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
 * to `branch-<ordinal>` when no fork room is known and `(empty)` when the
 * line has no typed command yet.
 *
 * @param roomSlug the fork card's room slug ({@link roomSlugOf}).
 * @param ordinal the branch's 1-based position among its fork's branches
 *   (the room-less fallback — display only, never an identity).
 * @param firstCommand the line's first typed command, if any.
 * @returns the label.
 */
export function branchLineLabelOf(
  roomSlug: string | undefined,
  ordinal: number,
  firstCommand: string | undefined,
): string {
  return `${roomSlug ?? `branch-${ordinal}`} · ${firstCommand ?? '(empty)'}`;
}


// ---------------------------------------------------------------------------
// Internal: segment files — naming, reading, linking.
// ---------------------------------------------------------------------------

/** A card as a segment file carries it: the tree's structure lives in segments. */
type PersistedCard = Omit<TreeCard, 'branches' | 'continuation'>;

/** One segment file, read and shape-validated. */
interface PersistedSegment {
  id: string;
  parent?: string;
  ordinal?: number;
  cards: PersistedCard[];
}

/** A parent segment's children: its branches in ordinal order, and its continuation. */
interface SegmentChildren {
  branches: PersistedSegment[];
  continuation?: PersistedSegment;
}

function segmentFileNameOf(id: string): string {
  return `${id}.json`;
}

function persistedCardOf(card: TreeCard): PersistedCard {
  const { branches: _branches, continuation: _continuation, ...persisted } = card;
  return persisted;
}

/** Canonical bytes: keys sorted at every depth, arrays in order, one trailing newline. */
function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      message: `not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function readManifest(
  text: string,
):
  | { status: 'ok'; story: string; seed: number; claims?: string }
  | { status: 'refused'; message: string }
  | { status: 'malformed'; message: string } {
  const parsed = parseJson(text);
  if (!parsed.ok) return { status: 'malformed', message: `${TREE_MANIFEST_FILE_NAME} is ${parsed.message}` };
  const manifest = parsed.value;
  if (!isPlainObject(manifest)) {
    return { status: 'malformed', message: `${TREE_MANIFEST_FILE_NAME} is not a JSON object` };
  }

  // Version gates first: refusal must win over any other complaint, so a
  // newer tree with a shape this build has never heard of still reads as
  // "newer", not "broken".
  const version = manifest['version'];
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return { status: 'malformed', message: `'version' must be an integer` };
  }
  if (version > TREE_DOCUMENT_VERSION) {
    return {
      status: 'refused',
      message:
        `this test tree is version ${version}; this build reads up to version ` +
        `${TREE_DOCUMENT_VERSION} — update Sharpee to open it`,
    };
  }
  if (version < TREE_DOCUMENT_VERSION) {
    return { status: 'malformed', message: `unknown test tree version ${version}` };
  }

  const unknownKey = firstUnknownKey(manifest, ['version', 'story', 'seed', 'claims']);
  if (unknownKey !== undefined) {
    return { status: 'malformed', message: `unknown key '${unknownKey}' in ${TREE_MANIFEST_FILE_NAME}` };
  }
  const story = manifest['story'];
  if (typeof story !== 'string' || story === '') {
    return { status: 'malformed', message: `'story' must be a non-empty string` };
  }
  const seed = manifest['seed'];
  if (typeof seed !== 'number' || !Number.isInteger(seed)) {
    return { status: 'malformed', message: `'seed' must be an integer` };
  }
  // ADR-365 D7: the claims fragment, optional; a path the runner resolves
  // relative to the story file. Whether it exists is the runner's load-time
  // error, named against this manifest — not a reader concern.
  const claims = manifest['claims'];
  if (claims !== undefined && (typeof claims !== 'string' || claims === '')) {
    return { status: 'malformed', message: `'claims' must be a non-empty path when present` };
  }
  return { status: 'ok', story, seed, ...(claims !== undefined ? { claims } : {}) };
}

/** The segment the file holds, or a problem description. */
function readSegment(name: string, text: string): PersistedSegment | string {
  const id = name.endsWith('.json') ? name.slice(0, -'.json'.length) : '';
  if (!SEGMENT_ID_PATTERN.test(id)) {
    return `'${name}' is neither ${TREE_MANIFEST_FILE_NAME} nor a segment file ('<8 lowercase letters or digits>.json')`;
  }
  const parsed = parseJson(text);
  if (!parsed.ok) return `'${name}' is ${parsed.message}`;
  const segment = parsed.value;
  if (!isPlainObject(segment)) return `'${name}' is not a JSON object`;

  const unknownKey = firstUnknownKey(segment, ['id', 'parent', 'ordinal', 'cards']);
  if (unknownKey !== undefined) return `unknown key '${unknownKey}' in '${name}'`;
  if (segment['id'] !== id) return `'${name}' carries id '${String(segment['id'])}' — a segment's file is named by its id`;

  const parent = segment['parent'];
  const ordinal = segment['ordinal'];
  if ((parent === undefined) !== (ordinal === undefined)) {
    return `'${name}' must carry both 'parent' and 'ordinal', or neither (the root)`;
  }
  if (parent !== undefined && (typeof parent !== 'string' || !SEGMENT_ID_PATTERN.test(parent))) {
    return `'${name}.parent' must be a segment id`;
  }
  if (ordinal !== undefined && (typeof ordinal !== 'number' || !Number.isInteger(ordinal) || ordinal < 0)) {
    return `'${name}.ordinal' must be a non-negative integer`;
  }

  const problem = validateCards(segment['cards'], `${id}.cards`);
  if (problem !== undefined) return problem;
  return {
    id,
    ...(parent !== undefined ? { parent: parent as string, ordinal: ordinal as number } : {}),
    cards: segment['cards'] as PersistedCard[],
  };
}

/**
 * The tree's shape: exactly one root, every parent present, ordinals unique
 * per parent, a continuation only beside a branch, every segment reachable.
 * Returns the problem description when the parentage is broken — never
 * repairs it, since a tree that quietly loses a subtree reads as an author
 * having deleted tests they did not delete (ADR-355 Affected).
 */
function linkSegments(
  segments: Map<string, PersistedSegment>,
): { root: PersistedSegment; children: Map<string, SegmentChildren> } | string {
  const roots = [...segments.values()].filter((segment) => segment.parent === undefined);
  if (roots.length === 0) return 'the tree has no root segment (every segment names a parent)';
  if (roots.length > 1) {
    return `the tree has ${roots.length} root segments: ${roots.map((root) => root.id).join(', ')}`;
  }

  const byParent = new Map<string, PersistedSegment[]>();
  for (const segment of segments.values()) {
    if (segment.parent === undefined) continue;
    if (!segments.has(segment.parent)) {
      return `segment '${segment.id}' names parent '${segment.parent}', which no segment in the tree carries`;
    }
    const siblings = byParent.get(segment.parent) ?? [];
    siblings.push(segment);
    byParent.set(segment.parent, siblings);
  }

  const children = new Map<string, SegmentChildren>();
  for (const [parentId, siblings] of byParent) {
    siblings.sort((a, b) => a.ordinal! - b.ordinal!);
    for (let index = 1; index < siblings.length; index++) {
      if (siblings[index].ordinal === siblings[index - 1].ordinal) {
        return `segments '${siblings[index - 1].id}' and '${siblings[index].id}' both descend from '${parentId}' at ordinal ${siblings[index].ordinal}`;
      }
    }
    const continuation = siblings[0].ordinal === 0 ? siblings[0] : undefined;
    const branches = continuation !== undefined ? siblings.slice(1) : siblings;
    if (branches.length === 0) {
      return `segment '${continuation!.id}' continues '${parentId}', whose last card is not a fork (no branch descends from it)`;
    }
    if (continuation !== undefined && continuation.cards.length === 0) {
      return `continuation segment '${continuation.id}' has no cards`;
    }
    if (segments.get(parentId)!.cards.length === 0) {
      return `segment '${parentId}' has descendants but no cards to fork from`;
    }
    children.set(parentId, { branches, ...(continuation !== undefined ? { continuation } : {}) });
  }

  // Every segment must hang from the root: a cycle of parents is unreachable.
  let reached = 0;
  const visit = (segment: PersistedSegment): void => {
    reached++;
    const own = children.get(segment.id);
    for (const child of own?.branches ?? []) visit(child);
    if (own?.continuation !== undefined) visit(own.continuation);
  };
  visit(roots[0]);
  if (reached !== segments.size) {
    const unreachable = segments.size - reached;
    return `${unreachable} segment${unreachable === 1 ? '' : 's'} cannot be reached from the root (their parents form a cycle)`;
  }

  return { root: roots[0], children };
}

/**
 * Every id the model already carries — root, branches, continuations and
 * cards. One namespace, so a minted id never repeats any of them.
 */
function collectSegmentIds(document: TreeDocument): string[] {
  const ids = [document.id];
  const walk = (cards: TreeCard[]): void => {
    for (const card of cards) {
      if (card.id !== undefined) ids.push(card.id);
      if (card.continuation !== undefined) ids.push(card.continuation);
      for (const branch of card.branches ?? []) {
        ids.push(branch.id);
        walk(branch.cards);
      }
    }
  };
  walk(document.cards);
  return ids;
}

// ---------------------------------------------------------------------------
// Internal: canonical ordering and card shape validation.
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

function validateCards(value: unknown, path: string): string | undefined {
  if (!Array.isArray(value)) return `'${path}' must be an array`;
  for (let index = 0; index < value.length; index++) {
    const problem = validateCard(value[index], `${path}[${index}]`);
    if (problem !== undefined) return problem;
  }
  return undefined;
}

/**
 * A persisted card: today's card shape, minus the tree structure — forks are
 * segments at rest, so `branches` (and the model-only `continuation`) are
 * unknown keys in a segment file.
 */
function validateCard(value: unknown, path: string): string | undefined {
  if (!isPlainObject(value)) return `'${path}' must be an object`;
  const unknownKey = firstUnknownKey(value, ['id', 'type', 'command', 'assertions', 'skip', 'ending']);
  if (unknownKey !== undefined) return `unknown key '${unknownKey}' in '${path}'`;

  const type = value['type'];
  if (type !== 'opening' && type !== 'boot' && type !== 'turn') {
    return `'${path}.type' must be 'opening', 'boot', or 'turn'`;
  }
  // The opening and the boot look are what the story did unprompted; only a
  // typed turn carries a command (ADR-307 D2) — and only a typed turn can
  // have ended the story (ADR-356 D4).
  if (type === 'turn') {
    if (typeof value['command'] !== 'string' || value['command'] === '') {
      return `'${path}' is a turn and must carry a non-empty 'command'`;
    }
  } else {
    if (value['command'] !== undefined) {
      return `'${path}' is type '${type}' and must not carry a 'command'`;
    }
    if (value['ending'] !== undefined) {
      return `'${path}' is type '${type}' and cannot be an END STATE card`;
    }
  }

  if (value['ending'] !== undefined && (typeof value['ending'] !== 'string' || value['ending'] === '')) {
    return `'${path}.ending' must be a non-empty ending id`;
  }

  if (value['skip'] !== undefined && typeof value['skip'] !== 'boolean') {
    return `'${path}.skip' must be a boolean`;
  }

  if (value['assertions'] !== undefined) {
    const problem = validateAssertions(value['assertions'], `${path}.assertions`);
    if (problem !== undefined) return problem;
  }

  // Every persisted card carries its minted id (ADR-355 D7).
  if (typeof value['id'] !== 'string' || !SEGMENT_ID_PATTERN.test(value['id'])) {
    return `'${path}' must carry an 'id' of 8 lowercase letters or digits`;
  }
  return undefined;
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
