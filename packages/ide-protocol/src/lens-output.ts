/**
 * lens-output.ts — what `sharpee lens examinable --json` prints: one
 * document, a report or a refusal (ADR-408 D4).
 *
 * Purpose: the examinable lens (`@sharpee/branch-tester`'s
 *   `runExaminableLens`) builds this document typed, and every reader of the
 *   lens's JSON imports it from here, so the writer and its readers cannot
 *   silently disagree (DEVARCH 8b). The Testing tab reads the lens through
 *   `sharpee test`'s run events (ADR-408 D8), whose rows are built from these
 *   types.
 *
 * Shape: one document with an `ok` flag and optional `report` and `refusal`
 *   parts, never a union of object types, because the protocol generator
 *   refuses one (ADR-352 D5). The same reason gives `counts` a string map
 *   and `ended` a boolean. No host decodes this document today, so it has no
 *   generator roots (ADR-408 D4: roots only for the parts a host decodes).
 *
 * Sources: a finding names where the player read its phrase as passage keys
 *   and IR ids, never as spans. A consumer resolves spans (ADR-333 D2):
 *   devkit's console form from the IR's phrase spans, the Testing tab from
 *   devkit's test command. Every `…Id` here is an IR id, the id the story
 *   declares, never the engine's runtime id.
 *
 * Public interface: LENS_OUTPUT_FORMAT, LensOutput, LensRefusal,
 *   ExaminableLensReport, LensReach, UnreachedRoom, ExaminableRoom,
 *   LensPassage, LensSource, LensSourceKind, ExaminableRow, ExaminableFinding,
 *   ExaminableKind, LensRoomRef.
 * Owner context: @sharpee/ide-protocol — the shared wire contract.
 */

/**
 * The document's format. 3 is the first with sources as keys and IR ids
 * (ADR-408 D4); 2 named sources by display name.
 */
export const LENS_OUTPUT_FORMAT = 3;

/** One class per executed phrase. Every class but `resolved-described` is a finding. */
export type ExaminableKind =
  | 'resolved-described'
  | 'resolved-default'
  | 'not-in-scope'
  | 'number-form'
  | 'ambiguous'
  | 'unclassified';

/**
 * Which passage a phrase was read from.
 *
 * `description` and `first-visit` are the owner's registered texts.
 * `state` is a trait-state literal in force when the room was reached: text
 * the IR registers under no key.
 */
export type LensSourceKind = 'description' | 'first-visit' | 'state';

/** Where a player read a phrase: one passage, and the entity it belongs to. */
export interface LensSource {
  /**
   * The passage's phrase key: the same string world-index publishes as a
   * `prose[].key`, so a consumer joins the two. Null when the text has no
   * key: a `state` literal, or a literal the IR gave none.
   */
  key: string | null;
  kind: LensSourceKind;
  /** The owner's IR id; null for an entity the IR does not declare. */
  ownerId: string | null;
  /** The owner's display name, as the player reads it. */
  ownerName: string;
}

/** One passage a player reads in a room. */
export interface LensPassage {
  source: LensSource;
  text: string;
}

/** One row of a room: a phrase from its prose, or the other number of one. */
export interface ExaminableRow {
  phrase: string;
  kind: ExaminableKind;
  /** The engine's message id or refusal reason the class was read from. */
  detail: string;
  /** The display name of the thing that answered, when one did. */
  target?: string;
  /** The IR id of the thing that answered, from the examined event's target. */
  targetId?: string;
  /** For a number-form row: the form that did resolve. */
  resolvedForm?: string;
  /** Every passage in the room the phrase was read from, in prose order. */
  sources: LensSource[];
  /** False only for a non-resolution whose head noun is not a thing an author could implement. */
  thing: boolean;
}

/** A room, by IR id and display name. */
export interface LensRoomRef {
  roomId: string;
  room: string;
}

/**
 * One finding, folded across every room it was seen in: one per phrase,
 * class, detail and target, with the union of its sources by key.
 */
export interface ExaminableFinding {
  phrase: string;
  kind: ExaminableKind;
  detail: string;
  target?: string;
  targetId?: string;
  resolvedForm?: string;
  thing: boolean;
  sources: LensSource[];
  /** The rooms it was seen in, in the order the lens reached them. */
  rooms: LensRoomRef[];
}

/** One room the lens reached: the route, the prose read there, and its rows. */
export interface ExaminableRoom {
  /** The room's IR id. */
  roomId: string;
  room: string;
  /** The commands typed from the opening to reach it; empty for the start room. */
  path: string[];
  /** True when the room was first seen in the move that ended the game: no prose, no rows. */
  ended?: boolean;
  prose: LensPassage[];
  rows: ExaminableRow[];
}

/** A declared room the lens did not examine, and why. */
export interface UnreachedRoom {
  /** The room's IR id. */
  roomId: string;
  room: string;
  reason: string;
}

/** How far the lens got (ADR-322 D7, ADR-408 Amendment 1). */
export interface LensReach {
  roomsReached: number;
  roomsDeclared: number;
  unreached: UnreachedRoom[];
  commandsTyped: number;
  ms: number;
  maxSeconds: number;
  /** Why the lens stopped: every route was typed, or the time budget ran out with routes left (each listed in `unreached`). */
  stoppedBy: 'every-route' | 'budget';
}

/** A run that reached rooms and examined their prose. */
export interface ExaminableLensReport {
  /** The seed the game was booted at. */
  seed: number;
  reach: LensReach;
  phrasesExecuted: number;
  /** Rows per class, keyed by `ExaminableKind`; a class with no rows is absent. */
  counts: Record<string, number>;
  findings: ExaminableFinding[];
  rooms: ExaminableRoom[];
}

/** A run refused before any route was typed (ADR-407 D2, D6). */
export interface LensRefusal {
  /** The one refusal line every reader of prose prints. */
  message: string;
}

/** The one document `sharpee lens examinable --json` prints. */
export interface LensOutput {
  lens: 'examinable';
  format: typeof LENS_OUTPUT_FORMAT;
  /** The story file's name. */
  story: string;
  /** True with `report`, false with `refusal`: the discriminator. */
  ok: boolean;
  report?: ExaminableLensReport;
  refusal?: LensRefusal;
}
