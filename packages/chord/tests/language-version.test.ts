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
  // 3.0.0 — ADR-298, 2026-08-03: the fielded story block. Breaking header
  // grammar (positional `story "Title" by "Author"` removed; closed
  // per-field schema; bare phrase references in prologue:/description:) —
  // a MAJOR by ADR-257 D2's ordinary rule. ADR-278's reservation of 3.0.0
  // released by owner ruling the same day. Includes ADR-252 D3's six
  // client-config keys (client/theme/template/themes/default-theme/
  // storage-prefix; D4-A1 amendment, GH #221) — landed as an interim 3.1.0
  // minor, folded back into 3.0.0 by the freeze ruling (2026-08-03,
  // session f382ed; nothing at 3.x published). FROZEN at 3.0.0. Package
  // versions are a separate lockstep track (4.x → 5.0.0 at the cut).
  // (2.2.0 — owner ruling, 2026-07-29: ADR-289's four breaking compile
  //  gates shipped as a minor, EBNF hash unchanged — fourth departure.)
  // (2.1.0 — owner ruling, 2026-07-27: the ADR-276 diagnostics arc.)
  // (2.0.0 — owner consolidation ruling, 2026-07-26: the ADR-266 landings
  //  ship publicly as ONE major over Chord 1.x.)
  languageVersion: '3.0.0',
  ebnfSha256: 'f7cb7a2ac03c2441ad38d2e134ade5db83b3b6435b475b624b3618e0af5f7505',
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
