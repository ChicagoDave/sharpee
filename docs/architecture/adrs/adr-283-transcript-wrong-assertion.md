# ADR-283: Transcript format — the `[WRONG]` assertion (expect-not)

## Status: DRAFT (2026-07-27, session fda0f0) — Open Questions unresolved

## Date: 2026-07-27

## Parent: ADR-277 (integrated testing), ADR-282 (play-to-test tagging — the consumer that motivates this). Platform change: `packages/transcript-tester` — discussed with David 2026-07-27 (option 1, "negative assertion" ruling).

## Context — verified, not assumed

- **The transcript grammar** (`packages/transcript-tester/src/parser.ts`)
  supports per-command `[OK: <matcher>]` assertions (e.g.
  `[OK: contains "West of House"]`), `[ENSURES:]`/`[REQUIRES:]` state
  conditions, and flow directives (`[IF]`, `[WHILE]`, `[RETRY]`,
  `[NAVIGATE TO]`). There is **no negative output assertion**: the format
  can say what a response must contain, never what it must not be.
- **ADR-282's "incorrect" verdict needs exactly that**: the author knows a
  response is wrong before knowing the right one. The assertion must fail
  while the bug lives and flip when the output changes.

## Decision

### D1 — `[WRONG: <matcher>]`, the negative twin of `[OK]`

A new assertion directive with `[OK]`'s exact matcher grammar:

```
> west
[WRONG: contains "You can't go that way"]
```

**Semantics**: the assertion **fails while the response matches** and
**passes once it no longer matches**. It is a runnable statement of "this
output is known-wrong," with the same per-command placement, casing, and
multi-assertion stacking rules as `[OK]`.

### D2 — Reporting names the state, not just pass/fail

A failing `[WRONG]` reports as **known-wrong response still present**
(with the matched text), distinct in wording from an `[OK]` mismatch — the
reader must see "the bug is still there," not "expectation failed." A
passing `[WRONG]` is reported normally; the re-judgment prompt on flip is
IDE behavior (ADR-282 Acceptance 2), not the runner's concern.

### D3 — Full pipeline parity

`[WRONG]` works everywhere `[OK]` works: single transcripts, `--chain`,
`--stop-on-failure`, inside `[IF]`/`[WHILE]`/`[RETRY]` blocks, CLI bundle
and IDE test panel alike. It is one grammar addition, not a mode.

## Acceptance

1. A transcript with `[WRONG: contains "X"]` fails while the response
   contains X and passes when the story's response changes — both
   directions covered by transcript-tester unit tests.
2. Failure output contains the known-wrong-still-present wording and the
   offending response text.
3. `[WRONG]` inside `[RETRY]`/`[WHILE]` blocks behaves per D3 (test
   pinned).
4. The transcript-format documentation (book appendix / reference) gains
   the directive with the ADR-282 lifecycle explained.

## Consequences

- The transcript grammar grows by one directive; every existing transcript
  remains valid (additive change, no migration).
- `[WRONG]` assertions are tautologically green once the output changes —
  they assert absence, not correctness. The ADR-282 re-judgment loop (flip
  → replay → re-tag correct) is what converts them into `[OK]`s; stale
  passing `[WRONG]`s in hand-written transcripts are an accepted soft spot
  (rule-13-style grading would flag a suite that is mostly `[WRONG]`s).
- ADR-282 is blocked on this landing in `transcript-tester` and the CLI
  bundle.

## Open Questions

### Q-1: Is `WRONG` the right keyword?
- **Why it matters**: the word appears in every author-facing transcript
  and error message forever. Candidates: `WRONG` (verdict language,
  matches ADR-282's gesture), `NOT` (matcher language), `BAD`. One-word
  ruling, David's call.
- **Blocks**: D1 implementation (trivially — a rename until shipped).

## Session

Drafted 2026-07-27, session fda0f0, from the play-to-test conversation
(option 1 ruling; `docs/context/session-20260727-2100-main.md`).
