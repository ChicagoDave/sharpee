# Plan: ADR-270 — the author alteration model

**Source ADR**: `docs/architecture/adrs/adr-270-author-alteration-model.md` (ACCEPTED 2026-07-26)
**Session**: 0ea0e5. Implementation authorized by David's "begin" (2026-07-26).

## Phase 0 — Baseline (COMPLETE 2026-07-26)

Green: chord 595/595 (45 files), if-domain 95/95, story-loader 392/392,
parser-en-us 285 pass + 3 skipped, cloak transcripts 81/81.

## Phase 1 — Chord language: `extend action` / `remove from action` (COMPLETE — Chord 2.5.0; chord 615/615; 4 IR-golden snapshots re-recorded on David's OK, version-only)

- EBNF: two new story-level productions; `chord.ebnf` updated, pin re-recorded.
- `chord/src/ast.ts` + `parser.ts`: parse both blocks (extend: `grammar` section + slot
  lines/`means`/`directions`; remove: bare pattern lines).
- `analyzer.ts`: alteration-block gates — grammar surfaces only (bodies, refusal ladders,
  phrases, scores = named diagnostics); slot-name checks mirroring `define action`.
- `ir.ts`: additive IR for extensions and removals.
- `CHORD_LANGUAGE_VERSION` 2.4.0 → 2.5.0; `chord-grammar-changes.md` rows (approval:
  ADR-270 ACCEPTED 2026-07-26); language-version pin re-recorded.
- Tests: new alteration-blocks test file (parse + analyzer gates, ADR acceptance 6);
  full chord suite green.

## Phase 2 — if-domain: the removal primitive (D3) (COMPLETE — 102/102)

- `GrammarEngine.removeRules(action, pattern, tier = 'standard'): number` (+ `GrammarBuilder`
  delegation). Diagnostic-free; returns count. No matcher/comparator changes.
- Tests: removes by shape, tier-scoped, returns 0 on miss, `getRulesForAction` reflects it.

## Phase 3 — story-loader wiring (D1/D2/D3) (COMPLETE — 400/400 at the time; 398/398 after Phase 4's test swap)

- Extension: story-first name resolution; else full `IFActions` id set (NOT
  interceptorConsultingActionIds) with did-you-mean; emission over the existing
  `forAction()`/`fullPattern()` path at story tier — no `chord.action.*` mint, no bare-verb
  rules, no dispatch action.
- Removal: IR removal lines → pattern strings (same conversion as extension emission) →
  primitive; count 0 → named `LoadError` listing the action's actual patterns.
- Tests: ADR acceptance 2 (registered rule shape), 3 (unknown name error), 4 (unmatched
  shape error), 7 (base pristine / story-scoped).

## Phase 4 — `define verb` deletion + cloak migration (D7) (COMPLETE — Chord 3.0.0 MAJOR; cloak 81/81; `hook cloak on hook` now drives real stdlib putting; ide-protocol re-export fixed)

- Delete: EBNF production, parser path, `toVocabularyVerb` stub + loader handling,
  `website/.../guide/vocabulary/define-verb/` page; update the ADR-271 D5
  docs-examples-load test.
- Migrate `cloak.story:82` to `extend action`; cloak transcripts green.
- `chord-grammar-changes.md` row for the removal (shared ADR-257 bump with Phase 1).

## Phase 5 — Acceptance + corpus (CURRENT — acceptance story + transcript green; dual-surface tests green; root tsc clean; dungeo units running)

Note on acceptance 1(iii): the 29 static TIE pairs never co-match one runtime
command (e.g. `move X to Y` vs `move X north`), so the observable reorder demo
uses D4's stated mechanism directly — `read the target` restated under
examining outcompetes reading's standard rule and the response flips. Flagged
to David rather than silently reinterpreted.

- The I7-bar transcript test (ADR acceptance 1): remove a standard verb, add a synonym
  (asserted on state), reorder via restating a real TIE-pair loser.
- Dual-surface TS removal test (acceptance 5).
- Root tsc clean; bundle rebuild; sanity transcripts (fernhill, friendly-zoo, dungeo
  spot-check); ADR flipped IMPLEMENTED.
