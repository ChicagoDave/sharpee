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
  // 3.3.0 — ADR-320 D14 amendment, 2026-08-17 (session 13a3e0): conversation
  // threads, vocabulary frozen by owner the same day. Additive minor
  // (`define conversation` with the `about` filter, `opens when`, beat rows,
  // the `on parting|resuming|refusing` transition rows, `conclusion:`, and
  // the `<thread> is concluded` predicate).
  // 3.2.0 — ADR-320 Phase 4, 2026-08-17 (session a53a28): the second
  // conversation grammar slice, vocabulary frozen by owner the same day.
  // Additive minor (`define exchange` with answer/act/silence rows and the
  // strength comma-modifier, `define initiative` with the four occasion
  // heads, `then asks|invites`, `deflect to`, `leave`, `hold their tongue`).
  // 3.1.0 — ADR-320 Phase 3, 2026-08-17 (session 8e2f49): the conversation
  // grammar slice, vocabulary frozen by owner the same day. Additive minor
  // (`define manner`, `define greetings`, recency/discussed/subject-changes/
  // asked predicates) — the first ordinary minor after the 3.0.0 freeze,
  // per the freeze note below (Chord 3.0.0 shipped with platform 5.0.x).
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
  //
  // ADR-300 D10's `return record` + `list of` members (2026-08-05, session
  // 86e85a) fold into 3.0.0 under the SAME freeze ruling: additive grammar,
  // and nothing at 3.x is published, so there is no released surface a minor
  // would distinguish. Only the EBNF hash moves. The next additive construct
  // AFTER a 3.x publish takes an ordinary minor by D2.
  // (2.2.0 — owner ruling, 2026-07-29: ADR-289's four breaking compile
  //  gates shipped as a minor, EBNF hash unchanged — fourth departure.)
  // (2.1.0 — owner ruling, 2026-07-27: the ADR-276 diagnostics arc.)
  // (2.0.0 — owner consolidation ruling, 2026-07-26: the ADR-266 landings
  //  ship publicly as ONE major over Chord 1.x.)
  // (3.4.0 — ADR-326, 2026-08-25: `a random adjacent room`, additive minor.)
  // (4.0.0 — ADR-327, 2026-08-26: actor-explicit heads, `it`/`its` removed
  //  outside `define trait`; `on <gerund> it` stops parsing — a MAJOR.
  //  Re-recorded the same day for D9/D10 — `playable`, `before the game
  //  starts`, `change the player to`, and the removal of `create the
  //  player` — which ride the SAME major: one MAJOR for the whole ADR-327
  //  cutover, per D6.)
  // (4.1.0 — ADR-329, 2026-08-29 (session d04ae1): the acting statement
  //  `<character> <verb> …` beside `move` in the statement production, with
  //  the `verb-words` production — additive minor; every 4.0.0 story is
  //  valid. Landed 9a–9c; pinned at 9d with the paper trail.)
  // 3.5.0 — owner consolidation ruling, 2026-08-29 (session 9de27b): nothing
  // since 3.3.0 / Sharpee 5.1.1 is published, so 3.4.0, 4.0.0, 4.1.0, and
  // ADR-329 D10's `perform` goal step are ONE public minor, shipping with
  // Sharpee 5.2.0. Bumps slow down: the number moves with a publish, not a
  // landing. The EBNF hash was unchanged by the ruling itself; ADR-329
  // D10 (GH #321, same session) then added the `goal-block` production —
  // the goal block had never been in the grammar file — with its
  // `verb-words` step row, and re-pinned the hash under this same version.
  // Re-pinned again 2026-08-29 (session eec23b): the grammar file brought to
  // parity with the parser's dispatch tables — ADR-310 (the character model
  // lines and its define forms), ADR-318 (the normative layer), ADR-325
  // (timers, places, landings, the two `when` clauses), ADR-227 `kill`,
  // ADR-230 `carries`, the D13 feels/knows predicates, `set … when`, and
  // the prose productions the file had always referenced without defining.
  // Paper trail for grammar shipped since 3.x, no language change.
  // 3.6.0 — 2026-09-03 (session 0135ed): minor bump alongside Sharpee 5.3.0
  // at the owner's request; 3.5.0 / 5.2.0 were never published. The EBNF
  // hash is unchanged by the bump — the surface pinned under 3.5.0 since
  // 2026-08-29 (the re-pins below) is the 3.6.0 surface.
  languageVersion: '3.6.0',
  // Re-pinned 2026-08-29 (ADR-330 Phase 1): `define chapters` under `use
  // chapters` — the first additive grammar of the chapters extension,
  // folded into the unpublished 3.5.0 set per ADR-257 D2 as amended.
  // Re-pinned again (ADR-330 Phase 3): the `during`/`before`/`after` chapter
  // atoms and the `during` head suffix — still the unpublished 3.5.0 set.
  // Re-pinned 2026-08-30 (session 262648, GH #339-#342): comment-only ebnf
  // motion — the event-verbs note now states the #341 contract (`entering`
  // on a THING rides the entering action's interceptor; rooms keep the
  // movement event) — plus two changes with no ebnf text of their own:
  // `proper` composes on ANY create block (#342; analysis.proper-person-only
  // retired) and `is in <region>` is a membership test needing no landing
  // (#339). All fold into the unpublished 3.5.0 set per ADR-257 D2 as
  // amended (the number moves at publish).
  // Re-pinned 2026-09-03 (session effb6f, GH #327, publish-readiness Phase
  // 2): `, one-way` on exit lines — ADR-234 D4's reservation wired, the
  // `[ "," "one-way" ]` tail added to the exit production. Additive; folds
  // into the unpublished 3.5.0 set under the same ruling.
  ebnfSha256: '37a95d1b4ea4501a1a34904451eb6f0b94dfe957ca06f2399e912e80c1a69599',
};

// Colocated with the version pin it gates (2026-08-14). It previously lived at
// docs/reference/chord.ebnf; the docs-consolidation quarantine moved that tree
// into docs/unofficial/, and a live build gate must not read from there.
const EBNF_PATH = join(__dirname, '..', 'chord.ebnf');
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
