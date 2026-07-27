/**
 * Guard tests for the `compose --json` wire contract (ADR-258 D5).
 *
 * Validates the decode-boundary predicates: the schemaVersion gate (unknown
 * versions rejected loudly — the TS-side half of the D5 contract), the two
 * record shapes (compile: full span; hatch: file+line, span absent), and the
 * ir-presence rules the payload type documents.
 */

import { describe, it, expect } from 'vitest';
import {
  COMPOSE_JSON_SCHEMA_VERSION,
  isComposeDiagnosticRecord,
  isComposeJsonPayload,
  type ComposeDiagnosticRecord,
} from '../src/index.js';

const compileRecord: ComposeDiagnosticRecord = {
  severity: 'error',
  code: 'analysis.removal-target',
  message: '`remove from action snarf` — no standard action has that name.',
  file: 'stories/fernhill/fernhill.story',
  line: 12,
  span: { line: 12, column: 1, endLine: 12, endColumn: 25 },
};

const hatchRecord: ComposeDiagnosticRecord = {
  severity: 'error',
  code: 'hatch.chord-namespace',
  message: "`'chord.private-key'` — the chord.* state namespace is loader-private",
  file: 'stories/fernhill/extras.ts',
  line: 4,
};

describe('isComposeDiagnosticRecord', () => {
  it('accepts a compile record (full span) and a hatch record (no span)', () => {
    expect(isComposeDiagnosticRecord(compileRecord)).toBe(true);
    expect(isComposeDiagnosticRecord(hatchRecord)).toBe(true);
  });

  it('rejects a bad severity, a non-numeric line, and a partial span', () => {
    expect(isComposeDiagnosticRecord({ ...compileRecord, severity: 'fatal' })).toBe(false);
    expect(isComposeDiagnosticRecord({ ...hatchRecord, line: '4' })).toBe(false);
    expect(isComposeDiagnosticRecord({ ...compileRecord, span: { line: 1, column: 1 } })).toBe(false);
  });
});

describe('isComposeJsonPayload', () => {
  it('accepts gates-only and gates+ir payloads', () => {
    expect(
      isComposeJsonPayload({ schemaVersion: COMPOSE_JSON_SCHEMA_VERSION, diagnostics: [compileRecord, hatchRecord] })
    ).toBe(true);
    expect(
      isComposeJsonPayload({ schemaVersion: COMPOSE_JSON_SCHEMA_VERSION, diagnostics: [], ir: { format: 'sharpee-story-ir@1' } })
    ).toBe(true);
  });

  it('rejects an unknown schemaVersion loudly (the decoder-side D5 rule)', () => {
    expect(isComposeJsonPayload({ schemaVersion: 99, diagnostics: [] })).toBe(false);
    expect(isComposeJsonPayload({ diagnostics: [] })).toBe(false);
  });

  it('rejects a malformed record in the stream and a non-object ir', () => {
    expect(
      isComposeJsonPayload({ schemaVersion: COMPOSE_JSON_SCHEMA_VERSION, diagnostics: [{ code: 'x' }] })
    ).toBe(false);
    expect(
      isComposeJsonPayload({ schemaVersion: COMPOSE_JSON_SCHEMA_VERSION, diagnostics: [], ir: 'not-an-ir' })
    ).toBe(false);
  });
});
