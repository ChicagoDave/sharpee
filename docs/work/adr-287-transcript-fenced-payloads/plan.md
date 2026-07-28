# Session Plan: Implement ADR-287 — Transcript grammar, fenced literal payloads

**Created**: 2026-07-28
**Overall scope**: Add fenced literal blocks to the transcript grammar in
`packages/transcript-tester` — parser attachment and validation (D1), runner
comparison semantics (D1's comparison paragraph), a regression pin that existing
transcripts are untouched (D2), and the format-appendix documentation (D3). No
IDE/Swift work; no `tools/ide/` files are touched by this plan.
**Bounded contexts touched**: N/A — tooling/test infrastructure (transcript
grammar and its runner). No story-domain behavior changes.
**Key domain language**: *fence* (a line of ≥3 backticks delimiting literal
content), *fenced assertion* (`[OK]` or payload-less `[OK: contains]` carrying a
fence), *classic expected-output block* (the existing bare-prose form).

**Why this ADR, and why now**: ADR-287 is the only accepted member of the Chord
Writer 1.0 family with no dependency on ADR-279 — it is pure
TypeScript/Node in `packages/transcript-tester`, needs no Xcode, no macOS, and no
external credentials. It unblocks ADR-282's D2 serialization contract, which
currently has no lossless form to serialize verbatim blesses into. The remaining
ADR-279 phases are blocked on David's Node-vendoring decision (Phase 2) and on
Apple/Sparkle credentials (Phases 3-4), so this is the productive parallel track.

**Platform-change gate**: `packages/transcript-tester` is under `packages/`, so
CLAUDE.md's discussion gate applies — it is **already satisfied**: ADR-287's
`Parent:` line records "Platform change: `packages/transcript-tester`, ruled by
David 2026-07-27 ('A is the way': additive fences over a sigil migration)." No
further platform discussion is needed for the scope in this plan; anything
outside it re-opens the gate.

**Hard gate before Phase 1 (not resolvable in-session)**: ADR-287 carries a
**Revisit note (2026-07-27)** — David flagged he may want to rethink the test
text delimiter. If he reopens it, the ADR returns to DRAFT and this entire plan
is invalidated (ADR-282's D2 follows whatever replaces it). **Confirm fences
stand as ruled before writing any code.** This is a one-question confirmation,
not a design discussion.

**Standing gate on every phase**: `pnpm --filter '@sharpee/transcript-tester'
test` stays green, and the dungeo walkthrough chain still passes via the bundle
(`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`).
Per CLAUDE.md, a failing build or test is **reported and waited on** — never
auto-retried or fixed-and-rebuilt in a loop.

## References consulted

- `docs/architecture/adrs/adr-287-transcript-fenced-payloads.md` — the source
  ADR: D1 (fence form, grammar rules, comparison semantics), D2 (additive, with
  the one named collision window), D3 (one grammar, both consumers), and
  Acceptance 1-4, which map onto phases below one-to-one.
- `docs/architecture/adrs/adr-282-play-to-test-tagging.md` — the motivating
  consumer; its D2 serialization contract ("inline `contains` when the fragment
  fits, fences otherwise; fenced exact for verbatim bless") is the downstream
  shape this grammar must support. Not implemented here — its IDE half is
  Mac-only.
- `docs/architecture/adrs/adr-277-ide-integrated-testing.md` — the format's
  other consumer (`sharpee test` + the IDE test panel share this package, so
  D3's parity is inherited rather than re-implemented); source of the existing
  `[OK: any]` presence-only assertion the new payload-less `[OK: contains]` form
  sits beside. Its D1 + Acceptance 2 require a validation-broken transcript to
  appear as a transcript-level `error` record rather than vanishing — the
  constraint fact 6 below turns into a Phase 1 assertion.
- `packages/transcript-tester/src/parser.ts` — the parse loop (lines 102-150),
  `parseAssertion` (line ~355), `finalizeCommand`'s implicit-`[OK]` default
  (line ~505), and `validateTranscript` (line 514). These four sites are the
  entire parser-side surface.
- `packages/transcript-tester/src/runner.ts` — the exact-match path (lines
  1100-1101 build the comparison inputs, line 1174 `case 'ok'`), `ok-contains`
  (line 1193), and `normalizeOutput` (line 1568) — the normalization ADR-287's
  comparison paragraph names explicitly.
- `docs/context/session-20260728-0026-main.md` — most recent session; records
  ADR-279 Phase 2's blocking decision (why this track is the parallel one) and
  the verified-green baseline this plan builds on.

## Verified facts this plan rests on

Established by inspection on 2026-07-28, not assumed:

1. **`parseAssertion(tag)` sees only the tag string** — no line number, no
   lookahead at the following line. Fences are therefore a **parse-loop**
   concern (parser.ts:120-144), not a `parseAssertion` concern. `Assertion` also
   has no `lineNumber` field today; Acceptance 4 ("fails validation loudly with
   line numbers") requires adding one.
2. **`[OK: contains]` with no payload currently parses to `null`** and is then
   *silently dropped* at parser.ts:139 — the exact silent-drop failure mode
   ADR-287 exists to remove. The payload-less form is a new parse, not a change
   to an existing one.
3. **`validateTranscript` inspects only the finished AST** and returns
   `string[]`. Structural fence errors — unclosed fence, length-mismatched
   close — are *unrepresentable* in a clean AST, so the parser must record them
   as it goes and validation must merge them. This is the one non-obvious
   design consequence in the plan.
4. **`normalizeOutput` trims every line and the whole string** (runner.ts:1568);
   `case 'ok'` compares `actualOutput === expectedOutput` where both were
   normalized at runner.ts:1100-1101 from `command.expectedOutput.join('\n')`.
5. **`ok-contains` today matches case-insensitively against the *raw* inline
   value** (runner.ts:1194) — it does not normalize the fragment. A multi-line
   fence fragment *must* be normalized to have any chance of matching normalized
   actual output, so fenced contains normalizes where the inline form does not.
   ADR-287's comparison paragraph directs this ("normalizes the fragment
   identically"); this plan does **not** change inline behavior.
6. **`validateTranscript` has two call sites, and they behave differently.**
   `packages/transcript-tester/src/cli.ts:332` (the bundle's human reporter)
   prints the errors and `continue`s without recording a result;
   `packages/devkit/src/commands/test.ts:203` — the path the IDE test panel
   runs — builds a `status: 'error'` `TranscriptResult` from the joined error
   strings and emits it as an NDJSON record (`test.ts:146-157`). ADR-287 D3's
   "one grammar, both consumers" parity is therefore genuinely *inherited* by
   the fact-3 design: fence errors merged into `validateTranscript`'s return
   reach both consumers with no per-consumer code. Confirmed by inspection
   2026-07-28. Phase 1 pins it with one assertion rather than trusting the
   inheritance silently, because AC4's "never silently dropped" is only
   meaningful for the consumer authors actually see.
7. **D2's collision window is empirically empty**: a recursive scan of all
   **182** `.transcript` files under `stories/` found **zero** backtick-only
   lines anywhere, in fence-opening position or otherwise. (An earlier scan of
   the two well-known directory patterns saw 180; two files live outside them,
   e.g. `stories/hunger-demo/tests/`. The baseline test walks the tree rather
   than globbing those patterns, so it covers all 182.) D2's "additive in
   practice, not by construction" caveat is real for author projects but costs
   this repo nothing.

## Phases

### Phase 1: Parser — fence lexing, attachment, and loud validation (D1, D2)

- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (test tooling). Touches `packages/transcript-tester/src/parser.ts`
  (parse loop, `parseAssertion`, `validateTranscript`) and `src/types.ts`
  (`Assertion` gains a payload/line-number carrier; `Transcript` gains a
  parse-error list).
- **Entry state**: Delimiter gate above confirmed by David. Suite green.
- **Deliverable**:
  - **Baseline pin written first, before any parser edit**: a golden test that
    parses every transcript under `stories/` and snapshots the resulting AST.
    This is D2's safety net and Acceptance 3's evidence, and it is worthless if
    written after the change — it must capture pre-change behavior.
  - Fence lexing in the parse loop: after an assertion line resolves to `[OK]`
    or payload-less `[OK: contains]`, the *immediately following* line (no blank
    line permitted) is checked for a fence open — a line whose trimmed content
    is only backticks, length ≥3. Content is consumed verbatim, uninterpreted,
    until a close line of **exactly** the opening length. Longer runs inside are
    literal (markdown's longer-fence rule).
  - `parseAssertion` gains the payload-less `[OK: contains]` form (fact 2
    above); it is a validation error *unless* a fence follows.
  - `Assertion` carries the fence payload and the line number of its assertion
    line. Fence content is stored **separately from** `command.expectedOutput`
    so that D1's "fence or classic block, never both" is checkable rather than
    conflated.
  - Parse-time error collection with line numbers, merged into
    `validateTranscript`'s return (fact 3). All five of D1's error cases:
    unclosed fence; length-mismatched close; empty fence; inline-payload
    assertion (`[OK: contains "x"]`) followed by a fence; fence after any other
    assertion or directive. Plus D1's exclusivity rule: a command carrying both
    a fence and a classic expected-output block.
  - `finalizeCommand`'s implicit-`[OK]` default (parser.ts:505) audited against
    the new form — a fenced assertion must not also acquire a phantom default.
  - **D3 consumer-parity assertion** (one test, per fact 6): a malformed-fence
    transcript run through `packages/devkit/src/commands/test.ts` produces a
    `status: 'error'` `TranscriptResult` whose `errorMessage` carries the
    line-numbered fence error — i.e. the error the IDE test panel would show.
    Parity is inherited by design, not re-implemented; this pins the
    inheritance rather than trusting it, since ADR-277 Acceptance 2 makes the
    error record the contract and AC4's "never silently dropped" is only
    meaningful for the consumer an author actually looks at.
- **Behavior Statement** (rule 12, to be produced in-conversation before tests):
  the parse loop DOES attach literal fence content to the preceding assertion and
  DOES append line-numbered errors to the transcript's error list; REJECTS WHEN
  the fence is unclosed, mismatched, empty, misattached, or doubled with a
  classic block.
- **Exit state**: fenced transcripts parse to the intended AST; malformed ones
  produce line-numbered errors through the existing `validateTranscript` →
  cli.ts:332 path; the golden baseline test passes unchanged against all 180
  existing transcripts.
- **Acceptance criteria covered**: AC3 (existing suites parse identically), AC4
  (malformed fences fail loudly with line numbers). AC1/AC2 are Phase 2 — the
  parser alone cannot demonstrate matching.
- **External prerequisites**: the delimiter gate — **cleared by David 2026-07-28
  ("fences stand")**. Nothing else.
- **Status**: DONE (2026-07-28) — with one standing-gate item unverified, below.

**Phase 1 outcome (2026-07-28)**

- Delivered: `tests/parse-baseline.test.ts` (182 digests, captured *before* any
  parser edit and byte-identical after — AC3); fence lexing, attachment, the
  payload-less `[OK: contains]` form, and line-numbered parse errors in
  `parser.ts`; `Assertion.fence`/`Assertion.lineNumber` and
  `Transcript.parseErrors` in `types.ts`; `tests/fenced-payloads.test.ts`
  (18 tests); the D3 consumer-parity assertion in
  `packages/devkit/tests/test-json.test.ts`.
- Verified: transcript-tester **34 passed**; devkit **108 passed / 1 skipped**
  (including the new fence case driven through the real `runTestCommand` against
  a real compiled Chord story); `npx tsf build` clean.
- **Design constraint the baseline imposed**: `Assertion.lineNumber` is stamped
  only on fenced assertions and `Transcript.parseErrors` is attached only when
  non-empty. Setting either unconditionally changes all 182 digests and breaks
  D2. Any future field added to these types inherits the same rule.
- **Standing gate verified**: dungeo walkthrough chain green via the bundle —
  **866 passed / 0 failed** across 17 transcripts. (Pristine-parser control run:
  880 passed. The delta is the documented RNG combat variance — prior sessions
  recorded 868, 886, 905 — not a behavioral difference.) `./repokit build
  dungeo` needed `corepack enable --install-directory /home/node/.local/bin`
  first: repokit spawns a `pnpm` binary and this container had pnpm only through
  corepack.

**Cautionary finding — the dungeo suites are flaky, and the catastrophic mode
looks exactly like a regression.**
The first chain run after this change reported **11,331 tests / 1,223 failed**,
with `[WHILE]`/`[UNTIL]` loops running to their caps. It was NOT caused by this
change. It was initially attributed to a stale bundle (`pnpm -r run build` had
aborted partway on pre-existing TS2339 errors in
`packages/runtime/src/bridge.ts` — a package `ts-forge.config.json` does not
list, so `tsf build` never compiles it and the breakage is invisible on the
normal path — leaving a mixed `dist/`). **That attribution was wrong, or at
least unnecessary**: a later control run at the pristine parser, on a clean
build, produced the same catastrophic mode (**1,269 failures**). The runaway-loop
signature is part of the suite's natural flakiness — when the player dies or
gets stuck early, every subsequent `[WHILE]`/`[UNTIL]` runs to its cap and the
test count explodes.

Measured rates (see Phase 2 for the unit-suite numbers):
- Walkthrough chain (`wt-*`, `--chain`): pristine **2 failures in 6 runs**,
  changed **1 in 4**. Pass counts swing 868–915.
- Unit transcripts (`tests/transcripts/*`): pristine **5 in 21**, changed
  **3 in 18**. Pass counts swing 1781–1883.

Lessons, all of which cost time this session:
1. Neither dungeo suite is a reliable single-run gate. Judge a change by
   several runs on BOTH sides of it, never by one run on one side.
2. A wildly *inflated* test count means loops ran to their caps, which means the
   run went off the rails early — not that the parser broke.
3. The D2 digest test proves parse-identity, which is NOT runtime-identity. Do
   not reason from a green baseline to "the change is inert" — but equally, do
   not leap to blaming the change when the suite itself is this noisy.

### Phase 2: Runner — comparison semantics and failure display (D1)

- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A. Touches `packages/transcript-tester/src/runner.ts`
  (`case 'ok'` at 1174, `case 'ok-contains'` at 1193, the comparison-input
  construction at 1100-1101) and `src/reporter.ts` (failure output, currently
  keyed on `command.expectedOutput` at reporter.ts:135-138 — it will show
  nothing for a fenced assertion until updated, which AC1 explicitly tests).
- **Entry state**: Phase 1 done, **and the bundle rebuilt** (`./repokit build
  dungeo`) so `dist/cli/sharpee.js` carries the new grammar. The bundle embeds
  transcript-tester, so fixtures run against a stale bundle exercise the *old*
  parser and fail for reasons unrelated to fences. Last session lost real time
  to exactly this class of stale-artifact failure — a `tsconfig.esm.tsbuildinfo`
  left behind by `clean` made the ESM pass emit nothing and exit 0
  (`session-20260728-0026-main.md` §4). If a fixture fails inexplicably, verify
  the bundle's freshness before touching the parser. Per CLAUDE.md: a failing
  build is reported and waited on, never auto-retried.
- **Deliverable**:
  - `[OK]` + fence → exact match of normalized fence content against normalized
    actual output, reusing `normalizeOutput` unchanged (fact 4).
  - `[OK: contains]` + fence → case-insensitive contains, with the fence
    fragment normalized identically to actual output (fact 5). Inline
    `contains "..."` behavior is **unchanged** — pin that with a test, since
    this is the one place the two forms deliberately diverge.
  - Reporter shows the fence content on failure (AC1's "fails with the fence
    content shown" half).
  - Parity test: a fenced assertion inside `[IF]`, `[WHILE]`, and `[RETRY]`
    blocks and under `--chain` behaves identically to one at top level.
    Attachment is at the assertion level, so this should be inherited — the test
    exists to prove the inheritance, not to add machinery.
- **REAL-PATH TEST (rule 13a — no stub)**: this is an owned dependency (the
  transcript runner this repo ships and the CLI bundle embeds), so the
  acceptance evidence is **real transcript fixtures executed against a real
  story through the real runner** — not parser unit tests asserting on an AST.
  Add fixtures under `stories/dungeo/tests/transcripts/` exercising a response
  containing `[bracket]` lines, `"` quotes, `>`-leading and `#`-leading lines,
  and a four-backtick fence wrapping three-backtick content; run them headless
  via the bundle (`node dist/cli/sharpee.js --test …`, per CLAUDE.md — the
  bundle, never the package CLI). Both directions: a passing fixture and a
  deliberately-mismatched one that must fail with the fence content displayed.
- **Exit state**: AC1 and AC2 demonstrated by executed transcripts, not by unit
  tests alone.
- **Acceptance criteria covered**: AC1 (bracket/quote/`>`/`#` content passes and
  fails correctly), AC2 (multi-line contains; four-backtick escape round-trips).
- **External prerequisites**: none.
- **Status**: DONE (2026-07-28)

**Phase 2 outcome (2026-07-28)**

- Delivered: fenced comparison in `runner.ts` (`ok` → exact against the
  normalized fence; `ok-contains` → normalized fragment, case-insensitive);
  fence display in `reporter.ts` (`Expected (fenced):`) and a fenced-aware
  `formatAssertion`; `tests/fenced-runner.test.ts` (9) and
  `tests/fenced-reporter.test.ts` (4); real-path fixture
  `stories/dungeo/tests/transcripts/adr-287-fenced-literals.transcript`.
- Verified: transcript-tester **47 passed**; devkit **108 passed / 1 skipped**;
  fixture through the bundle **6 passed + 1 expected failure**, identical under
  `--chain`; walkthrough chain **884 passed**.
- AC1: the fixture asserts a real response containing a `"` — a case the inline
  form provably CANNOT express (its payload regex is `[^"]+`) — passing headless,
  plus the failing direction pinned in-suite via `[FAIL]`. AC2: multi-line
  fenced contains in the fixture; the four-backtick escape in unit tests.

**Two reporter defects this work exposed** (both display-only, both fixed):
1. A failing fenced assertion printed NO expected text — the diff keyed solely
   off `command.expectedOutput`.
2. The "Output" block dropped blank lines (`if (line.trim())`). Since
   `normalizeOutput` preserves paragraph breaks, a blank line is load-bearing
   for an exact match — a real dungeo failure displayed as two identical-looking
   texts. Pre-existing, and it bit the classic `[OK]` path too. **Judgment call
   flagged for David**: blank lines are now always printed, which changes the
   human report for every failing command, not just fenced ones.

**AC1's `>`- and `#`-leading LINES are not covered by a real story, by
construction.** Chord flattens a multi-line description block onto one line
(verified: the compiled IR holds `"[Notice] … Beware the \"night porter.\" > not
a command # not a comment"` as a single `sign.description` variant), so no plain
story description can emit them as separate lines. Those shapes are covered by
unit tests using the REAL parser and runner with a stubbed engine — and since
the engine's only role is producing text, the parser is the component under test
for line-leading interpretation. Worth passing to whoever implements ADR-282: if
stories cannot emit such lines, that ADR's "nothing is unencodable" risk is
narrower than assumed — though channels or other emitters may still do so.

**The dungeo unit-transcript suite is flaky, pre-existing, ~25%.** Measured
because it first looked like a regression: `stories/dungeo/tests/transcripts/*`
fails intermittently in `royal-puzzle-basic` with "Engine is not running" (the
player dies in a deadly Royal Puzzle room). Rates are comparable with and
without this change — **pristine 5 failures in 21 runs, changed 3 in 18** — and
total pass counts swing 1781–1883 run to run, consistent with the unseeded-RNG
policy (ADR-277 D5 / ADR-282 Q-3). An early 9/9-green pristine sample was luck;
do not conclude from small samples here. The walkthrough chain (`wt-*`, under
`--chain`) is stable by contrast.

### Phase 3: Format appendix and the ADR-282 handoff (D3)

- **Tier**: Small
- **Budget**: 120
- **Domain focus**: N/A (documentation). Touches the book's transcript-format
  appendix and `docs/reference/` transcript documentation — exact file to be
  located at phase start rather than guessed here.
- **Entry state**: Phases 1-2 done; the grammar is real and tested.
- **Deliverable**:
  - Fence section in the transcript-format appendix, alongside the inline forms:
    the two fenced assertions, the attachment rule, the longer-fence escape, the
    error cases, and the normalization semantics an author can actually observe.
  - D2's collision caveat documented for author projects — with the finding from
    fact 7 (zero occurrences across this repo's 180 transcripts) stated, so the
    caveat reads as the narrow edge case it is rather than a looming hazard.
  - A short note recording what ADR-282's serializer can now rely on, so
    whichever session implements the bless UI (Mac-side) does not have to
    re-derive the contract from this ADR.
- **Exit state**: an author reading the appendix can write a fenced assertion
  correctly without reading the ADR.
- **Acceptance criteria covered**: D3's documentation half. No numbered AC.
- **External prerequisites**: none.
- **Status**: DONE (2026-07-28), with one deliberate omission below.

**Phase 3 outcome (2026-07-28)**

- `docs/reference/transcript-testing.md` gained an **Exact Match** section (bare
  `[OK]` + expected-output block was previously undocumented anywhere, and the
  fence attaches to it), a **Fenced Literal Payloads** section covering both
  forms, the attachment rule, the longer-fence escape, all five validation
  errors, and the D2 collision caveat with the 183-transcript scan result.
- A normalization paragraph now opens Text Assertions: lines trimmed, CRLF
  normalized, **blank lines preserved** — the property that made the Phase 2
  reporter defect so confusing.
- **Two factual corrections** to that reference while documenting alongside it:
  `contains` and `not contains` were documented as case-**sensitive**; the
  runner lowercases both sides (`runner.ts` `ok-contains` / `ok-not-contains`),
  so they are case-**insensitive**. The inline-payload limits (no `"`, single
  line, matched raw) are now stated where authors will hit them.
- `adr-282-serializer-handoff.md` written in this directory: which form to emit
  per gesture, how to size a fence, what matching does, the error surface both
  consumers inherit, and the Chord description-flattening finding.

**Deliberately NOT done — the book chapter.** `docs/book/v2.0.0/parts/part-8/
29-transcript-testing-and-walkthroughs.md` is the book's transcript coverage
(there is no transcript-format appendix; the backmatter is A–E and none is about
transcripts). `docs/book/CLAUDE.md` requires that a content edit is not done
until `./scripts/build-book.sh` runs clean, and **pandoc is not installed in
this container**, so a book edit cannot be verified to the project's own
standard here. ch29 is a prose teaching chapter rather than a format reference,
so ADR-287 D3's documentation requirement is met by the reference doc; adding a
fence subsection to ch29 is a nice-to-have for a machine with pandoc.

## Out of scope

- **ADR-282's bless UI and serializer** — the IDE half is Swift/Mac-only; the
  serializer itself waits on that. This plan makes it *encodable*, nothing more.
- **Directive matchers** (`[UNTIL]`, `[WHILE]`, `[NAVIGATE TO]`) — D1 explicitly
  keeps their single-line quoted form and rules fences out for them.
- **Changing inline `contains "..."` semantics**, including its inability to
  hold a double quote. The fence is the escape hatch for that; touching the
  inline regex would be exactly the migration churn D2 rejects.
- **Any `tools/ide/` file.** If a change appears to need one, stop — that is the
  Mac session's territory and a signal the scope drifted.
