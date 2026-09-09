# ADR-340 — per-function diff of the two runners

**Measured**: 2026-09-08, session 4a2d5f, branch `refactor/survey-adr-334-340` at `1e75ff155` (Phase 8 of `plan.md`; read-only). Every top-level `function` declaration in `packages/transcript-tester/src/runner.ts` and `packages/branch-tester/src/runner.ts` was extracted by brace matching and compared with a sequence-matcher ratio; neither file declares an arrow-function member at top level (checked with a second pattern). `synthesizePolicyAssertions` is compared separately below because branch-tester's copy lives in `auto-assertion.ts`, not its runner.

## The table

| function | transcript-tester | branch-tester | similarity | class |
|---|---|---|---|---|
| `captureEntityTraits` | 33 | 33 | 1.00 | identical |
| `checkEventAssertion` | 57 | 57 | 1.00 | identical |
| `checkStateAssertion` | 41 | 41 | 1.00 | identical |
| `collectStrings` | 9 | 9 | 1.00 | identical |
| `configureRandomInstruments` | 58 | 58 | 1.00 | identical |
| `directiveFailResult` | 22 | 22 | 1.00 | identical |
| `executeDirective` | 108 | 108 | 1.00 | identical |
| `findEntity` | 36 | 36 | 1.00 | identical |
| `forcesFailResult` | 17 | 17 | 1.00 | identical |
| `getEntityProperty` | 25 | 25 | 1.00 | identical |
| `normalizeOutput` | 8 | 8 | 1.00 | identical |
| `resolveValue` | 14 | 14 | 1.00 | identical |
| `runTranscript` | 4 | 4 | 1.00 | identical |
| `unfiredForceError` | 19 | 19 | 1.00 | identical |
| `evaluateStateExpression` | 4 | 4 | 0.97 | identical but for `export` |
| `errorResult` | 21 | 17 | 0.89 | diverged |
| `checkAssertion` | 114 | 94 | 0.80 | diverged |
| `runCommand` | 166 | 204 | 0.78 | diverged |
| `runAssertion` | 120 | 128 | 0.62 | diverged |
| `openingResult` | 25 | 62 | 0.24 | diverged |
| `captureEngineSave` | 15 | — | — | transcript-tester only (golden tier) |
| `commandListDrift` | 14 | — | — | transcript-tester only (golden tier) |
| `diffTurn` | 8 | — | — | transcript-tester only (golden tier) |
| `divergencePathFor` | 3 | — | — | transcript-tester only (golden tier) |
| `executeForGolden` | 6 | — | — | transcript-tester only (golden tier) |
| `goldenPassResult` | 11 | — | — | transcript-tester only (golden tier) |
| `goldenPathFor` | 4 | — | — | transcript-tester only (golden tier) |
| `proseTextLinesOf` | 14 | — | — | transcript-tester only |
| `runGolden` | 229 | — | — | transcript-tester only (golden tier) |
| `staleProvenanceFields` | 30 | — | — | transcript-tester only (golden tier) |
| `synthesizePolicyAssertions` | 28 (runner) | 28 (`auto-assertion.ts`) | 1.00 | identical but for `export` |
| `aggregateTestRun` | — (`aggregate.ts`) | 11 | — | defined in both packages, different files |
| `allAssertionsOf` | — | 7 | — | branch-tester only (tree) |
| `captureWorldSnapshot` | — | 1 | — | branch-tester only (tree) |
| `endingFrom` | — | 5 | — | branch-tester only (tree) |
| `evaluateChordStateClaim` | — | 6 | — | branch-tester only (Chord) |
| `worldEntityRef` | — | 10 | — | branch-tester only (tree) |

Fifteen functions are shared verbatim (fourteen byte-identical, one differing only by `export`), against the ten ADR-340's Context counted on 2026-09-07: `checkStateAssertion`, `findEntity`, `forcesFailResult`, and `runTranscript` have converged since. Five remain diverged.

## The five diverged functions, and what to keep

Read from the unified diffs, transcript-tester on the left.

- **`errorResult`** — transcript-tester's takes and emits two golden-tier fields (`tier`, `goldenPath`); branch-tester's does not. **Keep transcript-tester's as the core**, with the two fields optional; branch-tester calls it without them. Not a missed fix on either side.
- **`checkAssertion`** — the `channel-*` arm: transcript-tester handles `channel-contains` / `channel-not-contains` over a flattened `string[]` capture with an "undeclared channel" refusal; branch-tester routes six channel kinds (`-contains`, `-not-contains`, `-is`, `-is-not`, `-absent`, `-present`) to `checkChannelAssertion` over the **structured** capture (ADR-300 D13: dotted paths into records, list matching, typed comparison, absence as a claim). A genuine difference of claim language, not drift: the transcript grammar never gained the four newer kinds. **Keep branch-tester's arm in the core**, typed over `unknown[]`, since a flattened-string caller can pass its lines as the structured capture and the two legacy kinds evaluate identically; the "undeclared channel" refusal is transcript-tester's and stays in its caller as a pre-check. ADR-307's firewall holds: the `.transcript` grammar is untouched.
- **`runCommand`** — branch-tester additionally records the turn number, the ending, and (on request) a world snapshot inside the `try`, and its policy-skip comment. A superset for the tree world (R3/R4 of ADR-307). **Keep branch-tester's as the core**; the three extra fields are present only when the caller asks (`captureWorld`) or when the engine reports them, so transcript-tester's results gain optional fields it never reads. Its golden-tier comment fragment moves to the caller.
- **`runAssertion`** — three real differences: transcript-tester collects coverage (`options.coverage?.collectFrom`) and branch-tester does not; transcript-tester's bare-command error names `--bless` (golden tier) while branch-tester's names the policy; branch-tester synthesizes opening defaults from the boot captures under a policy while transcript-tester runs authored opening assertions only. **Not a core function**: it is each runner's loop, and D2 keeps each runner's loop where it is. The pieces both loops call (`record`, the bare-command check's *shape*) are already shared through the functions above.
- **`openingResult`** — 0.24: branch-tester's takes the first command's output as a second capture surface and merges boot values. The tree world's own result shape. **Stays in branch-tester** (D2).

## What this settles for Phase 9

- The core's function set (D1, D3's fixture): the fifteen shared functions plus `synthesizePolicyAssertions` (the umbrella's IDE-reached duplicate: branch-tester's copy is what `tools/ide/web/testing-surface/src/compose.ts:29` imports) plus, as decided above, `errorResult` (superset), `checkAssertion` (branch-tester's arm), and `runCommand` (branch-tester's superset). Twenty-one names.
- Nothing above is a missed bug fix that would change either side's output when the core replaces the copy, so the byte-identical gate is expected to hold; if a gate moves, that function is held for David rather than accepted.
- The core must carry no Node import: none of the twenty-one imports `fs` or `path` directly (they live in the seven Node-bound modules ADR-340's Context names); `runCommand` reads `engine.*` only.
- `aggregateTestRun` is defined in `transcript-tester/src/aggregate.ts` and again in `branch-tester/src/runner.ts`; it belongs to the core too, and the D3 fixture should name it.
