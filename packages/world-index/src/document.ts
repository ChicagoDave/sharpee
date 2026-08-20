/**
 * document.ts — the JSON document the IDE parses.
 *
 * Purpose: the analyzer runs as a subprocess and answers with exactly one JSON
 * document on stdout (ADR-321, the IDE↔analyzer boundary). This module owns that
 * document's shape and nothing else, so the schema has one place to change and
 * the Swift side has one thing to read.
 *
 * **This file is a wire contract.** It must stay pure data — no `Map`, no `Set`,
 * no `undefined`-only fields, no runtime-specific types — because everything here
 * crosses into a language that cannot import it (DEVARCH 8b's codegen exception:
 * the language boundary is why the schema is written down rather than shared).
 *
 * Failure is a first-class document, not an exception: a missing or malformed IR
 * still produces a document naming the cause, so the World tab renders an
 * explanatory empty state rather than a blank panel (AC-9).
 *
 * Public interface: WORLD_INDEX_SCHEMA, WorldIndexDocument, WorldIndexFailure,
 * WorldIndexResponse, buildDocument, buildFailure, FailureCause.
 *
 * Owner context: @sharpee/world-index — the derivation package. This IS the
 * contract Phase 6's Swift side decodes against.
 *
 * @packageDocumentation
 * @see ADR-321 AC-9: failure states render
 */

import type { StoryIR } from '@sharpee/chord';
import { deriveIncomplete, type IncompleteResult } from './incomplete.js';
import { layoutMap, type Cell, type DirectionSkew, type ResolvedCollision } from './map.js';
import { deriveReach, type ReachResult } from './reach.js';

/**
 * The wire schema's name and version.
 *
 * Hand-bumped when the document's shape changes, never by the release train —
 * the package version rides the platform's lockstep and would churn this on
 * every release for no wire change. The Swift side branches on this; it reads
 * `analyzerVersion` only for diagnostics.
 *
 * `world-index/2` (ADR-321 Amendment 1): every Incomplete finding carries a
 * `ProseSite` in place of `where`/`whereName`/`line`, because D10 reads response
 * prose whose attribution a single owner id cannot express. The bump is
 * load-bearing rather than cosmetic — the Swift decoder REFUSES an unknown schema
 * by design, so an unbumped analyzer would be read as v1 and its findings
 * silently mis-decoded. Later steps of the same amendment add fields to v2; it
 * bumps once for the amendment, not once per field.
 */
export const WORLD_INDEX_SCHEMA = 'world-index/2';

/** One room's placement on the compass grid. */
export interface PlacedRoom {
  /** Room id. */
  room: string;
  /** The cell it occupies. */
  cell: Cell;
}

/** The Map view, as data — the in-process `Map` flattened for the wire. */
export interface SerializedMap {
  /** The room play begins in, or null. */
  start: string | null;
  /** Every placed room and its cell. */
  positions: PlacedRoom[];
  /** Rooms the walk could not place. */
  unplaced: string[];
  /** Collisions the solver resolved by displacement. */
  collisions: ResolvedCollision[];
  /** Cycles that disagree with themselves. */
  skews: DirectionSkew[];
  /** Undirected connections, each carrying its door. */
  connections: Array<{ rooms: [string, string]; via: string | null }>;
}

/** What went wrong, as a word the IDE can switch on. */
export type FailureCause =
  /** No path was given on the command line. */
  | 'usage'
  /** The path names no file, or the file cannot be read. */
  | 'unreadable-ir'
  /** The file is not JSON, or is not a Story IR. */
  | 'malformed-ir'
  /** The analysis itself threw — a defect in this package. */
  | 'internal';

/** A successful analysis. */
export interface WorldIndexDocument {
  /** The wire schema this document conforms to. */
  schema: typeof WORLD_INDEX_SCHEMA;
  /** The analyzer package's version, for diagnostics only. */
  analyzerVersion: string;
  /** Always true — the discriminator. */
  ok: true;
  /** What was analyzed. */
  story: { id: string | null; version: string | null; start: string | null };
  /** What shape is the place? */
  map: SerializedMap;
  /** Can the player get to what was authored? */
  reach: ReachResult;
  /** What was named that isn't there yet? */
  incomplete: IncompleteResult;
}

/** A failure the World tab must render rather than a crash it must survive. */
export interface WorldIndexFailure {
  /** The wire schema this document conforms to. */
  schema: typeof WORLD_INDEX_SCHEMA;
  /** The analyzer package's version, for diagnostics only. */
  analyzerVersion: string;
  /** Always false — the discriminator. */
  ok: false;
  /** Why there is no analysis. */
  failure: {
    /** The cause, as a word to switch on. */
    cause: FailureCause;
    /** A sentence naming the cause, fit to show the author. */
    message: string;
    /** The path involved, when a path was involved. */
    path: string | null;
  };
}

/** Either outcome — the only two things the analyzer ever writes to stdout. */
export type WorldIndexResponse = WorldIndexDocument | WorldIndexFailure;

/**
 * A declared header value, or null when the story omits it.
 *
 * Both fields are optional in the IR, and the wire contract carries explicit
 * nulls rather than absent keys so the Swift side decodes one shape.
 *
 * @param value the declared value
 * @returns the value, or null
 */
function declared(value: string | undefined): string | null {
  return value ?? null;
}

/**
 * Run all three derivations and assemble the document.
 *
 * @param ir the story IR to analyze
 * @param analyzerVersion this package's version
 * @returns the document the IDE renders
 */
export function buildDocument(ir: StoryIR, analyzerVersion: string): WorldIndexDocument {
  const map = layoutMap(ir);
  return {
    schema: WORLD_INDEX_SCHEMA,
    analyzerVersion,
    ok: true,
    story: {
      id: declared(ir.meta.fields.id),
      version: declared(ir.meta.fields.storyVersion),
      start: map.start ?? null,
    },
    map: {
      start: map.start ?? null,
      positions: [...map.positions].map(([room, cell]) => ({ room, cell })),
      unplaced: map.unplaced,
      collisions: map.collisions,
      skews: map.skews,
      connections: map.connections,
    },
    reach: deriveReach(ir),
    incomplete: deriveIncomplete(ir),
  };
}

/**
 * Assemble a failure document.
 *
 * @param cause the cause, as a word the IDE switches on
 * @param message a sentence naming it, fit to show the author
 * @param analyzerVersion this package's version
 * @param path the path involved, when a path was involved
 * @returns the document the World tab's empty state renders
 */
export function buildFailure(
  cause: FailureCause,
  message: string,
  analyzerVersion: string,
  path: string | null = null,
): WorldIndexFailure {
  return {
    schema: WORLD_INDEX_SCHEMA,
    analyzerVersion,
    ok: false,
    failure: { cause, message, path },
  };
}
