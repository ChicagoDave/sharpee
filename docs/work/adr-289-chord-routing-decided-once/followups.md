# ADR-289 implementation — follow-up items

Items surfaced while implementing ADR-289 that are out of its scope but should
not be lost. Raised 2026-07-29, branch `adr-289-p1`.

---

## F1 — `tsf build` leaves `dist-esm` stale: a sensor that lies

**Severity: high for trust, low for runtime.** This is not a footnote; it is a
test harness reporting failures in code that is correct.

**What happened.** Chord ships two builds — `dist` (CJS, the `main`/`types`
entry) and `dist-esm` (the `module`/`import` entry). `tsf build` refreshes
`dist` only. Vitest resolves the ESM entry, so after changing
`packages/chord/src/ir.ts` the story-loader suite ran against a **stale**
chord and reported `IR_FORMAT` as `story language 1` against a source and a
`dist` that both said `2`. Thirteen tests failed for a reason that had nothing
to do with the code under test. The fix was `tsc -p tsconfig.esm.json`, run by
hand.

**Why it matters more than the time it cost.** The failure mode is the
dangerous direction: it looks exactly like "your change didn't take." A
developer who trusts it edits correct code; a developer who learns to distrust
it stops trusting every green and red after it. `package.json` already declares
`"build": "tsc && tsc -p tsconfig.esm.json"` — so the package knows both
outputs are required, and only the orchestrator disagrees.

**The repo already owns the cure.** ADR-269 D7 established the freshness-gate
pattern for generated artifacts — a build step whose staleness fails the build
rather than being discovered later — and ADR-276 D2 reused it for the stdlib
manifest, with `repokit manifest --check` wired into both `verify` and the
platform build. A dual-output package whose second output can silently drift
from its source is the same shape and deserves the same gate.

**Proposed:** `tsf build` emits both outputs for dual-build packages, or
`repokit verify` gains a `--check` that fails when any `dist-esm` is older than
its `src`. Either turns a silent lie into a build failure. Affects every
package with a `dist-esm`, not just chord.

---

## F2 — Nothing in the corpus exercises a statement-level `select <strategy>`

**Severity: informational, but it explains ADR-289 H1's survival.**

A grep across `stories/` and every `packages/*/tests/fixtures/*.story` found
**no** use of `select cycling` / `randomly` / `stopping` / `sticky` /
`first-time` as a *statement*. (The same adverbs on `define phrase` are
common — those are `Choice` atoms, a different construct.) Independently
confirmed from the other direction: after the `IR_FORMAT` bump, the only diff
across all four regenerated golden snapshots was the format string — no
snapshot gained an `id` field, because no golden fixture contains one.

So the H1 double-advance shipped undetected because nothing ever ran it, and
`two-pass-routing.test.ts` / `select-ids.test.ts` are the only coverage this
construct has ever had.

**Proposed:** decide whether a shipped story should use one. If the construct
is worth having in the language, something in the corpus should exercise it end
to end; if it is not, that is worth knowing too. Not urgent — the unit coverage
is now real — but a construct with zero corpus usage is a candidate for either
adoption or retirement, and the choice should be made rather than defaulted.

---

## F3 — `ordinal` cannot satisfy Acceptance 19 by revert

**Severity: recorded, no action proposed.**

AC19 requires the D9 harness to fail if D1's decision-recording is reverted for
any one construct. Verified by probe for four of five: `select-on`,
`select-strategy`, `each`, and the `when` suffix each turn the harness red.

`ordinal` cannot. `ctx.occurrence` is pinned into the interceptor bag before
either pass runs, so re-deriving `occurrence === stmt.ordinal` cannot diverge.
Recording it is defensive — it completes the decision table so a future
construct cannot silently regress — not a fix for a live defect. Documented in
the harness at the case itself.

**Proposed:** none. Recorded so AC19 is not read as fully discharged by revert
probe, and so the next session does not spend time trying to make it bite.
