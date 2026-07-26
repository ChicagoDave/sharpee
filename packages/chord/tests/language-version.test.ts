/**
 * language-version.test.ts — ADR-257 D5: the Chord LANGUAGE-version surface pin.
 *
 * `CHORD_LANGUAGE_VERSION` must not silently lag the language. This pins it to
 * the language's machine-readable surface — `docs/reference/chord.ebnf` — the
 * same conformance-pin discipline used for the media/event maps and the message
 * catalog. When the grammar changes (an axis-A surface change, ADR-257 D3), the
 * hash no longer matches and the build fails until the version is bumped and the
 * pin re-recorded together. An internal parser refactor that leaves `chord.ebnf`
 * unchanged does not trip it.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHORD_LANGUAGE_VERSION } from '../src/version';

// The pinned surface state. Bump BOTH together on any grammar-surface change:
//   1. raise CHORD_LANGUAGE_VERSION (src/version.ts) per ADR-257 D2 (minor/major),
//   2. re-record EBNF_SHA256 below to the new hash.
const PINNED = {
  // 2.3.0 — ADR-267 landing group 4: per-pattern `means <key> <value>`
  // static defaults + the `directions` block bound to the `direction`
  // slot (D12, one design per D5). Additive grammar → a minor.
  // (2.2.0 group 3 typed slots; 2.1.0 group 2; 2.0.0 D15 major.)
  languageVersion: '2.3.0',
  ebnfSha256: '130993cb2a9f29704be335ddb5b31fe64071bee31770f36b0a5c28e96f5f3308',
};

const EBNF_PATH = join(__dirname, '..', '..', '..', 'docs', 'reference', 'chord.ebnf');
const ebnfSha = () => createHash('sha256').update(readFileSync(EBNF_PATH)).digest('hex');

describe('Chord language version (ADR-257)', () => {
  it('CHORD_LANGUAGE_VERSION is a valid semver and matches the pin', () => {
    expect(CHORD_LANGUAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(CHORD_LANGUAGE_VERSION).toBe(PINNED.languageVersion);
  });

  it('the grammar surface (chord.ebnf) is unchanged since the pinned version', () => {
    // If this fails, docs/reference/chord.ebnf changed — an author-visible
    // language-surface change (ADR-257 D3 axis A). Bump CHORD_LANGUAGE_VERSION
    // (minor for additive, major for breaking) AND re-record PINNED above.
    expect(
      ebnfSha(),
      'chord.ebnf changed — bump CHORD_LANGUAGE_VERSION (ADR-257 D2/D5) and update the pin',
    ).toBe(PINNED.ebnfSha256);
  });
});
