# ADR-269 implementation plan — the standard grammar as Chord source

Derived directly from ADR-269 (ACCEPTED 2026-07-26). Phases ordered by the ADR's own
constraints: D6 measurements before D7's build step; D8/D10 language work before the
generator can compile its output; migration before D5 deletions.

References consulted: ADR-269 (all D1–D10), ADR-266 (umbrella acceptance 9–14),
ADR-268 D3 (29-pair constraints, `docs/work/chord-grammar-ordering/pairs.json`),
ADR-267 (construct spellings), ADR-271 D3 (emission seam), ADR-257
(`docs/architecture/chord-grammar-changes.md`), grammar-parity analysis
(`docs/work/grammar-parity/sharpee-chord-grammar-syntax.md`).

## Phase 0 — D6 baseline measurements (CURRENT)

Measure today's 422-registration cost before any change:
- `new EnglishParser()` construction time (isolated, N iterations) — covers browser
  `handleStart`, ADR-248 restart, and zifmia per-invocation shape.
- CLI whole-boot time (`dist/cli/sharpee.js`) for context.
Record in `docs/work/standard-grammar-chord-source/measurements.md`. Re-measure after
Phase 4 (acceptance 7).

## Phase 1 — D8/D10 language work (chord package)

- EBNF: `grammar` header top-level form (spelling finalized here);
  `chord-grammar-changes.md` row + ADR-257 bump.
- `parser.ts`: parse the header; grammar files carry only `define action` (+ comments,
  imports).
- `analyzer.ts`: grammar-file mode — D4 gates (body/refusal/phrase/score/story
  declarations are named errors), D10 structural validation.
- Tests for every named diagnostic (acceptance 9).

## Phase 2 — Build step + generated module (repokit; parser-en-us)

- Chord→registration-module emitter: compile the grammar file, validate derived
  `if.action.*` names against stdlib's id set (build-step-side, chord stays
  stdlib-ignorant), emit generated TS keeping the `defineGrammar(grammar)` export.
- repokit sequencing (before parser-en-us compiles) + freshness gate (regen-diff fails
  the build).

## Phase 3 — Migration generator + equivalence harness (one-shot, scripts/)

- Record today's 422 rules (`createBuilder()` → `defineGrammar()` → `getRules()`).
- Verify the 29-pair + 3-LOAD-BEARING-site constraint graph is acyclic at action-block
  level (against `pairs.json`); a cycle is a finding to surface, not accommodate.
- Emit action-first Chord (ADR-267 spellings; `directions`/`means` collapse; LOAD-BEARING
  comments carried); equivalence harness compares shape (pattern, action id, tier, slot
  types, defaults, constraints, pairwise order), ids excluded; divergences enumerated for
  individual ruling.

## Phase 4 — The swap

- `src/grammar.ts` → Chord source + committed generated module; sync tests repointed if
  the filename changes.
- Full transcript corpus green unchanged (dungeo units + chain, fernhill, friendly-zoo,
  cloak, nautical; `go-out-exiting.transcript`); TS-story regression set (thealderman,
  devkit fixture). Post-swap measurements (acceptance 7).

## Phase 5 — D5 deletions + docs

- Delete `docs/reference/stdlib-chord/`, `scripts/generate-stdlib-chord.js`,
  `reference-only` refusal (`loader.ts:255-261`), pinning test, website MDX references —
  **with explicit confirmation at deletion time**.
- parser-en-us CLAUDE.md / core docs touched by the new layout.
