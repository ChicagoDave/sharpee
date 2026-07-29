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

---

## F4 — The D3 phase-order gate reaches clause bodies and topic rows only

**Severity: low, but it is a hole in a rule stated without qualification.**

D3 says a refusal "anywhere outside the leading validate partition" is an
error. `checkPhaseOrder` has exactly two call sites — the clause body
(`analyzer.ts:3049`) and the topic row (`:1339`) — so `define sequence` steps
and `define action` bodies are never walked. The parser does not close the gap
either: `parseStatements` is called with `'sequence'` as its clause keyword,
and only `'after'` bans refusals, so a refusal in a sequence step parses and
compiles today.

Left alone deliberately in Phase 4: no acceptance criterion covers those hosts,
nothing in the corpus writes a refusal there, and widening a gate beyond what
the ADR's acceptance pins is the kind of scope drift the corpus gate exists to
catch. Recorded because D3's letter is broader than D3's implementation, and
the next reader should not have to rediscover that.

**Proposed:** decide whether a refusal in a sequence step or an action body is
meaningful at all. If it is not, the gate is a two-line extension of the same
walk; if it is, D3's wording should say so.

---

## F5 — Nothing stops a raw control byte from entering source — **CLOSED 2026-07-29**

**Resolution.** `repokit verify` gained the gate: `tools/repokit/src/commands/
control-bytes.ts`, wired in beside the ADR-269 D7 / ADR-276 D2 freshness gates
it was modelled on. Every C0 control except tab, newline and carriage return —
plus DEL — is a build failure in text sources, reported with file, line and
codepoint. Build output, dependencies, sourcemaps and golden snapshots are out
of scope by construction (an allowlist of text extensions, not a denylist).

Before it could land, the class had to be cleared: a repo sweep of 7,046 text
files found **eight** offending lines across seven files — two written during
ADR-289 itself, **six pre-existing** (`lang-en-us` assembler tests ×4,
`generate-standard-grammar-chord.cjs` ×2, a raw ESC in
`fenced-reporter.test.ts`). All were rewritten as escapes, behaviour-identical.

**Verified by planting, not by reasoning:** a raw NUL was written into
`packages/chord/src/version.ts` and `repokit verify` exited 1 naming the site;
removing it returned exit 0. Ten unit tests cover the gate itself, including
that the *escape* form — the fix the gate demands — does not trip it.

**One more data point for the class, collected while closing it.** The first
draft of the gate's own source contained a raw control byte, in the character
class meant to match raw control bytes. It was caught by the sweeper, not by
review, `tsc`, or the eye. That is now three instances written by someone who
knew exactly what the defect was and was actively looking for it — which is the
argument for a mechanical gate stated as well as it can be stated.

**Severity (as recorded before closure): low frequency, high blast radius.**

D7 fixed two literal NULs in `runtime.ts`. Implementing D5 I put a fresh one
into `analyzer.ts`, in the `registerUnique` key join, and it had exactly the
D7 symptom: `grep` stopped matching **anything** in a 4,400-line file, silently.
It was found only because a search for a symbol that certainly existed came
back empty. `tsc` compiled it happily — a NUL inside a template literal is
valid TypeScript, and the code was even *correct*, since NUL is the right
separator for a key join.

That is the whole problem: the byte is invisible in every editor and diff, it
does not fail the build, it does not fail a test, and its only symptom is that
search tooling quietly lies to whoever comes next — human or agent.

D7 fixed the two instances it knew about. It did not close the class, and the
class reopened within one ADR's implementation.

**Proposed:** a `repokit verify` check that fails on any raw control byte
outside `\t`/`\n`/`\r` in `packages/*/src/**/*.ts`. Mechanical, no false
positives (an intentional control character belongs in source as an escape —
which is D7's rule stated positively), and it is the same freshness-gate shape
F1 asks for. A pre-commit hook would catch it earlier still.

---

## F6 — AC20's census arithmetic does not add up as the plan assumed

**Severity: blocks a clean Acceptance 20 in Phase 6 until decided.**

The plan's Phase 3 pinned D2's id-less-select backstop to `loader.ts`
specifically so ADR-276's `loader.ts`-scoped census would reach 52 — "AC20's
count only reaches 52 if this and D6's backstop both live there." It landed in
`select-ids.ts:74` instead, a new module Phase 3 introduced.

Measured after Phase 5: `loader.ts` carries **51** `new LoadError` sites (50 at
the ADR's baseline, plus D6's non-room exit). D2's backstop is the missing
52nd, and it is one file over.

Neither outcome is wrong on its own — `select-ids.ts` is a cohesive home for
everything about select ids, and the ADR already tolerates out-of-census
modules (`evaluator.ts`'s twelve sites). What cannot stand is Phase 6
recording "52" against a file that holds 51.

**Proposed:** in Phase 6, either (a) move the `assertSelectIds` throw into
`loader.ts` beside the format gate, restoring the plan's arithmetic, or
(b) record 51 and extend ADR-276's addendum to name `select-ids.ts` as
out-of-census alongside `evaluator.ts`, with the reason. Decide it before
updating the addendum, not while writing the number.
