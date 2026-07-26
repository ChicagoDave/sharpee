# Gap Report — ADR-266 D5 / ADR-267 D7

**Date**: 2026-07-25 (session 2d5bc7, Phase 4)
**Generator**: `scripts/chord-gap-report.cjs` (built this phase — ADR-266 D5 specified it,
nothing had implemented it; retires with ADR-269 when `grammar.ts` stops being the source).
**Baseline**: 422 registered rules — `defineGrammar` against a real `EnglishGrammarEngine`.
**Chord surface**: language 2.3.0 (ADR-267 groups 1–4: D15 slots, D8 alternation,
D9 optional, D10 greedy, D11 typed slots, D12 semantic defaults + direction map).

## BLOCKING (rules Chord cannot write)

| construct | rules | detail |
| --- | --- | --- |
| `pattern-syntax:?` | 1 | `grammar.define('?').mapsTo('if.action.help')` (grammar.ts:860) — a punctuation-literal pattern; Chord patterns are word-based, `?` is unwritable |

That one row was a **new finding, not a Phase 1–4 defect**: the punctuation-literal pattern
class never appeared in `sharpee-chord-grammar-syntax.md`'s construct analysis (Parts A/C),
so no ADR-267 construct covers it. **RULED (David, 2026-07-25, session 2d5bc7): platform-side
exception** — `?` stays a tiny TS-side registration outside the ADR-269 Chord-source
migration (ADR-269 carries it); no new Chord syntax. The generator whitelists it with the
ruling cited; the report now reads EMPTY except ordering.

Checked and clean: slot types beyond `instrument`/`topic`/`TEXT_GREEDY` (0 rules),
computed semantic mappings / `withSemanticVerbs` (0 rules — matches the D12′ zero-uses
measurement), pattern-string syntax outside the D8/D9/D10/D15 token shapes (0 beyond the
`?` row).

## ORDERING (ADR-268's, excluded by D7)

106 rules at priority ≠ 100 — matches the analysis's measured 106 deviating rules exactly.

## RESULT

**EMPTY except ordering — ADR-267 D7 satisfied** (the `?` row resolved as a ruled
platform-side exception, 2026-07-25).
