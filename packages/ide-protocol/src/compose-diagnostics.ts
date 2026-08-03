/**
 * compose-diagnostics.ts — the `sharpee compose --json` wire contract (ADR-258 D5).
 *
 * Purpose: the versioned payload `compose --json` writes to stdout — the one
 *   diagnostics stream (ADR-276 D4: compile diagnostics with full spans, hatch
 *   findings with file+line and no end-span) plus, when the compile succeeded
 *   and the mode emits IR, the Story IR the IDE's project tree is built from
 *   (ADR-258 D6). Gates + IR, never the load-proof.
 * Public interface: COMPOSE_JSON_SCHEMA_VERSION, ComposeDiagnosticRecord,
 *   ComposeJsonPayload, isComposeDiagnosticRecord, isComposeJsonPayload.
 * Owner context: @sharpee/ide-protocol (ADR-258 D5) — the TS emitter (devkit
 *   `compose.ts`) imports these types directly (DEVARCH 8b); the Swift decoder
 *   checks `schemaVersion` and rejects unknown versions loudly (its side of
 *   the contract lives on the Mac, version-gated, not compiled together).
 */
import type { DiagnosticSeverity, Span, StoryIR } from '@sharpee/chord';

/**
 * Version of the `compose --json` payload shape. Distinct from the ADR-184
 * `ProjectManifest` `SCHEMA_VERSION` — separate contracts version separately.
 * Bump on any breaking shape change.
 *
 * 2 (ADR-298, 2026-08-03): `ir.meta` became `{ title, fields: IRStoryFields }`
 * (typed closed schema; `author` retired for `authors: string[]`). The shape
 * shipped without this bump, so the Swift D5 gate never fired and the IDE
 * failed with an opaque decode error — this is the backfill.
 */
export const COMPOSE_JSON_SCHEMA_VERSION = 2 as const;

/**
 * One record in the payload's unified diagnostics stream (ADR-276 D4).
 * `span` is present exactly for compile diagnostics — hatch findings
 * (`hatch.*` codes) carry a file+line site only, no end-span.
 */
export interface ComposeDiagnosticRecord {
  severity: DiagnosticSeverity;
  /** Stable machine code — `parse.*`/`analysis.*`, or `hatch.*` for lint findings. */
  code: string;
  message: string;
  /** Site file: the `.story` file for compile diagnostics, the hatch module for hatch findings. */
  file: string;
  /** 1-based line of the site. */
  line: number;
  /** Full source span — compile diagnostics only (the underline range, ADR-258 D5). */
  span?: Span;
}

/** The `compose --json` stdout payload (ADR-258 D5). */
export interface ComposeJsonPayload {
  /** Equals {@link COMPOSE_JSON_SCHEMA_VERSION} for payloads this package's emitters write. */
  schemaVersion: typeof COMPOSE_JSON_SCHEMA_VERSION;
  /** The one diagnostics stream: compile diagnostics first, then hatch records. */
  diagnostics: ComposeDiagnosticRecord[];
  /**
   * The Story IR the project tree is sourced from (ADR-258 D6). Present iff
   * the compile succeeded AND the mode emits IR (`--json` without `--check`);
   * absent under `--json --check` and whenever the compile failed — the
   * payload never carries a non-`ok` IR (atomic load, ADR-210).
   */
  ir?: StoryIR;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Narrow a value to a valid {@link Span} (four 1-based numbers). */
function isSpan(v: unknown): v is Span {
  if (!isObject(v)) return false;
  return (
    typeof v.line === 'number' &&
    typeof v.column === 'number' &&
    typeof v.endLine === 'number' &&
    typeof v.endColumn === 'number'
  );
}

/** Narrow a value to a valid {@link ComposeDiagnosticRecord}. */
export function isComposeDiagnosticRecord(value: unknown): value is ComposeDiagnosticRecord {
  if (!isObject(value)) return false;
  return (
    (value.severity === 'error' || value.severity === 'warning') &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    typeof value.file === 'string' &&
    typeof value.line === 'number' &&
    (value.span === undefined || isSpan(value.span))
  );
}

/**
 * Narrow untrusted JSON to a valid {@link ComposeJsonPayload} at the decode
 * boundary. Rejects unknown `schemaVersion`s — the decoder-side half of the
 * D5 contract on the TS side.
 */
export function isComposeJsonPayload(value: unknown): value is ComposeJsonPayload {
  if (!isObject(value)) return false;
  if (value.schemaVersion !== COMPOSE_JSON_SCHEMA_VERSION) return false;
  if (!Array.isArray(value.diagnostics)) return false;
  if (!value.diagnostics.every(isComposeDiagnosticRecord)) return false;
  if ('ir' in value && !isObject(value.ir)) return false;
  return true;
}
