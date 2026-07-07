/**
 * @file ADR-209 Phase 1 — snippet marker extraction (shared helper).
 *
 * Derived from the extractSnippetMarkers Behavior Statement:
 *   DOES   return the distinct `{snippet:name}` marker names in a text, in
 *          first-appearance order (pure — no state change).
 *   WHEN   called with any string (description / initialDescription text).
 *   BECAUSE the engine's load-time unbound-marker validation and stdlib's
 *          render-time scan must agree on what a marker IS (one impl).
 *   REJECTS never — malformed or non-marker braces match nothing.
 */

import { describe, it, expect } from 'vitest';
import { extractSnippetMarkers, SNIPPET_MARKER_PATTERN } from '../../src/snippets';

describe('extractSnippetMarkers (ADR-209)', () => {
  it('returns [] for text with no markers', () => {
    expect(extractSnippetMarkers('The study has a doorway to the north.')).toEqual([]);
    expect(extractSnippetMarkers('')).toEqual([]);
  });

  it('extracts a single marker name', () => {
    expect(
      extractSnippetMarkers('The study has a doorway to the north{snippet:cabinet}.'),
    ).toEqual(['cabinet']);
  });

  it('extracts multiple markers in first-appearance order', () => {
    expect(
      extractSnippetMarkers(
        'A doorway{snippet:cabinet} and a fireplace{snippet:mantel}.',
      ),
    ).toEqual(['cabinet', 'mantel']);
  });

  it('deduplicates a marker appearing twice (resolves once per render, Q8)', () => {
    expect(
      extractSnippetMarkers('Dust{snippet:dust} on every shelf, dust{snippet:dust} in the air.'),
    ).toEqual(['dust']);
  });

  it('accepts identifier-like names (letters, digits, underscore, hyphen)', () => {
    expect(
      extractSnippetMarkers('{snippet:mantel_2}{snippet:old-chair}{snippet:A1}'),
    ).toEqual(['mantel_2', 'old-chair', 'A1']);
  });

  it('ignores malformed and non-marker braces (AC-7: plain braces stay prose)', () => {
    expect(extractSnippetMarkers('{snippet:}')).toEqual([]); // empty name
    expect(extractSnippetMarkers('{snippet:no spaces}')).toEqual([]); // space in name
    expect(extractSnippetMarkers('{snippet:unclosed')).toEqual([]); // no closing brace
    expect(extractSnippetMarkers('{slot:here}{verbatim:description}')).toEqual([]); // other kinds
    expect(extractSnippetMarkers('snippet:bare')).toEqual([]); // no braces
  });

  it('is pure — repeated calls on the same text return the same result', () => {
    const text = 'A{snippet:x} B{snippet:y} C{snippet:x}';
    expect(extractSnippetMarkers(text)).toEqual(['x', 'y']);
    expect(extractSnippetMarkers(text)).toEqual(['x', 'y']); // global-flag regex must not carry lastIndex
  });

  it('exposes a global pattern usable for split-based scanning', () => {
    // stdlib's render-time scan splits on the same pattern; keep it global.
    expect(SNIPPET_MARKER_PATTERN.global).toBe(true);
  });
});
