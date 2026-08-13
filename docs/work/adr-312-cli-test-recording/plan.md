# Session Plan: Implement ADR-312 — Recording Tests from the Command Line

**Created**: 2026-08-12
**Plan Status**: ACTIVE
**Superseded by**: docs/work/chord-writer-intel/plan.md (2026-08-13, rule 18b —
David's "still live" disposition). Every phase is left exactly as it stands and
this plan remains resumable at Phase 1.

> **Read this before resuming.** The ADR this plan implements — ADR-312 — was
> deleted on 2026-08-12 and replaced by ADR-313 (tree second serialization) and
> ADR-314 (content coverage reports), both still DRAFT with open questions. The
> plan is therefore stale from Phase 2 onward and its directory name points at a
> retired ADR number. What survives intact is **Phase 1** — relocating
> `recordedTurnAssertions` / `openingDefaultClaims` out of
> `tools/ide/web/testing-surface/src/compose.ts` into `packages/branch-tester` —
> which was carried forward verbatim as ADR-313 D7 and is still the right unit
> of work. Resume there, not at the top.
**Overall scope**: Give `@sharpee/devkit` a `sharpee record <list>` command that
turns a committed, newline-delimited command list into the ADR-307 tree
document's per-element assertions — the same synthesis the Testing tab uses —
so a story can be given a passing test suite from a terminal on a machine with
no Chord Writer installed. Chord Writer is `arm64`-only and cannot currently
build universal (x86_64 fails notarization, ADR-279 D4), so today test
*authoring* is gated on owning an Apple silicon Mac; this closes that gate.
Two known-stale documentation spots (a CLI help string and a wire-type
comment) are folded in rather than deferred, and ADR-307's recorder claim gets
its owed status-note flip.
**Bounded contexts touched**: N/A — infrastructure/tooling. This is a CLI
surface over an existing wire format and an existing synthesis engine, not new
domain modeling; DDD framing does not apply (see session-planner's own
"When DDD Does NOT Apply" test — CLI tooling is the first listed case).
**Key domain language**: N/A (tooling). ADR vocabulary carried through
unchanged: tree document, line, card, claim/assertion family, policy
(`AutoAssertionPolicy`), reconcile, span.

## References consulted
- `docs/architecture/adrs/adr-312-recording-tests-from-the-command-line.md` — the ACCEPTED source of all 9 decisions (D1–D9) this plan implements; its Implementation table and worked example are folded into the phases below rather than re-derived.
- `docs/architecture/adrs/adr-307-testing-tree-model-v2.md` — the parent ADR D1 amends ("the tab is *a* recorder, not *the* recorder"); its own header names the precedent ("whoever lands the cutover phase flips ADR-306's and ADR-302's status lines... in the same edit set as the cutover") that ADR-312's Consequences section explicitly assigns to whoever lands this plan.
- `docs/context/project-profile.md` — Testing Intelligence mutation-signature bar (real replay against a pinned seed, RNG stream isolation, output asserted against the actual serialized artifact, never "did not throw") governs every phase's ACs below. Also: the profile's Testing Intelligence domain description names `from-play.ts` / `createTranscriptFromPlay` as a kept ADR-305 substrate — direct reading (2026-08-12) found it does not exist in `packages/branch-tester/src/` any more (`grep -rn createTranscriptFromPlay packages tools` is empty); it was retired in the ADR-307 cutover the profile predates (profile dated 2026-08-09, cutover flips landed 2026-08-10). Not a blocker for this plan — ADR-312's own Implementation table never names it — but recorded so no phase reaches for a substrate that is gone.
- `docs/context/session-20260812-0903-main.md` — most recent session; its Open Items (plover's build-tooling directory-ownership fragility) are unrelated to this plan's scope, recorded so this plan does not silently reopen or ignore them.
- `docs/proposals/docs-consolidation.md` — templated, P-1 through P-8 ACCEPTED and not yet PLANNED. All eight are `docs/` reorganization (`unofficial/` quarantine, archive-tree consolidation, `docs/book`/`docs/proposals` path survivorship) — orthogonal to CLI test recording. None cited; none implemented by this plan.

**Platform-change constraint (CLAUDE.md).** Phases 1–4 touch `packages/`
(`devkit`, `branch-tester`) and must be discussed with David before
implementation begins, per CLAUDE.md's "Platform changes require discussion
first." Phase 5 (website copy) is not gated. Integration Reality Statements
(rule 13a) are required before any phase whose name contains *record* or
*engine* is declared complete — `sharpee record` spawns no subprocess but it
is squarely "drives an owned dependency, the real engine, for real" territory,
and a stub-engine test cannot be the acceptance gate. Behavior Statements
(rule 12) are required before writing tests for any new side-effect function
in `record.ts` (it writes both the tree document and `<name>.list.txt`).

**A finding beyond ADR-312's own Implementation table.** The ADR's table lists
`auto-assertion.ts`'s `synthesizePolicyAssertions` as the one thing D3 forbids
re-implementing, and it is — but direct reading (2026-08-12) found a *second*
half of "record-time synthesis" that ADR-312 doesn't mention: converting the
runtime `Assertion[]` `synthesizePolicyAssertions` returns into the wire
shape (`TreeAssertions`) is done by `recordedTurnAssertions` /
`openingDefaultClaims` in `tools/ide/web/testing-surface/src/compose.ts:90-145`
— not in `packages/branch-tester`. That module's own header states the
invariant D3 exists to protect ("branch-tester's own synthesis module,
imported from source, never reimplemented") but the *display-format*
conversion sitting downstream of it currently has exactly one home: the IDE's
web bundle. A CLI recorder that reimplements that conversion inline is a
second spelling of the same class D3 forbids, just one step later in the
pipeline. Phase 1 below closes that gap by relocating the two functions into
`packages/branch-tester` (both call sites then import one definition) before
any recorder code is written — this is a plan finding, not an ADR amendment;
flag it to `plan-review`.

## Phases

### Phase 1: Relocate record-time assertion synthesis into `@sharpee/branch-tester`; retire the two stale comments; flip ADR-307's status note
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Shared wire-format/synthesis plumbing (`packages/branch-tester`), IDE web-bundle consumer (`tools/ide/web/testing-surface`), ADR bookkeeping. GATED — packages/branch-tester is under `packages/`; discuss with David before starting.
- **Entry state**: `recordedTurnAssertions` / `openingDefaultClaims` (the
  `Assertion[] → TreeAssertions` conversion) live only in
  `tools/ide/web/testing-surface/src/compose.ts:90-145`, imported there from
  `@sharpee/branch-tester/auto-assertion` via the web bundle's direct-source
  alias (rule 8b treatment, same as `tree-document.ts`'s own header). No CLI
  consumer exists yet. `packages/branch-tester/src/tree-document.ts:72`
  comments `TreeCard.assertions` as "policy defaults synthesize live, never
  persist" — stale; `tree-walker.ts:79-85` clears the policy before every
  document run, so persistence is the only source of truth on that path.
  `docs/architecture/adrs/adr-307-testing-tree-model-v2.md`'s header still
  reads as if it is the sole recorder.
- **Deliverable**:
  1. Move `recordedTurnAssertions` and `openingDefaultClaims` (and the
     `RecordedAssertions`/`TurnSource` types they use) from `compose.ts` into
     `packages/branch-tester/src/auto-assertion.ts`, exported from the
     package's `src/index.ts` barrel (today only `.`'s exports map exists —
     no subpath exports — so devkit's `require('@sharpee/branch-tester')`
     needs the barrel re-export; the IDE keeps its existing direct-source
     subpath import, now pointed at the relocated definitions). No behavior
     change — this is a location move, not a rewrite.
  2. `compose.ts` re-imports both from `@sharpee/branch-tester/auto-assertion`
     instead of defining them; delete the now-dead local definitions.
  3. Fix `tree-document.ts:72`'s comment to state the shipped invariant:
     claims are synthesized once, at record time, by whichever writer
     recorded the card, and persisted — a document run (`tree-walker.ts:79-85`)
     evaluates only what is in the file.
  4. Amend `docs/architecture/adrs/adr-307-testing-tree-model-v2.md`'s header
     with the flip ADR-312's Consequences section names as owed: note that
     ADR-312 amends its identification of the Testing tab as *the* recorder
     to *a* recorder, following the same discipline ADR-307 itself used for
     ADR-302/ADR-306 (a header note, not a rewrite of ADR-307's body).
- **Exit state**: `pnpm --filter '@sharpee/branch-tester' test` green.
  `tools/ide` web-surface tests (`ac-signoff-cli.test.ts` and the
  `testing-surface` suite covering `compose.ts`) green with zero behavioral
  diff — same assertions, now sourced from the relocated functions. No
  runtime logic in `tools/ide/` changed, only its import site (David's Not
  touched note in ADR-312 concerns *IDE behavior*; this is a source-location
  fix required for D3 to actually hold, not a feature change). ADR-307's
  header carries the amendment note.
- **Status**: CURRENT (since 2026-08-12)

### Phase 2: `sharpee record <list>` — resolve, replay, synthesize, first-write (D5, D8 steps 1–4/6, D9's registration half)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: New CLI command (`packages/devkit/src/commands/record.ts`), engine replay against `loadAuthorGame`. GATED — packages/devkit; discuss with David before starting.
- **Entry state**: Phase 1 done — `synthesizePolicyAssertions`,
  `synthesizeOpeningAssertions`, `recordedTurnAssertions`, and
  `openingDefaultClaims` are all exported from `@sharpee/branch-tester`'s
  barrel. `loadAuthorGame(dir, { seed, channels })` (`author-game.ts:145`)
  returns a `LoadedGame` (`packages/bootstrap/src/index.ts:51`) that already
  unions a story's declared `auto-assertion:` policy's required channels
  (`room-name`/`room-description`) into the capture set regardless of the
  caller's `channels` option (`bootstrap/src/index.ts:222-227`) — the
  recorder does not need to compute a policy→channel mapping itself. No
  `record` command exists; `cli.ts`'s `switch` has no `case 'record'`.
- **Deliverable**:
  1. `packages/devkit/src/commands/record.ts` (new), implementing D8 steps
     1, 2, 3, 4, and 6 (step 5's interactive/non-interactive reconcile prompt
     is Phase 3 — this phase's happy paths are the no-op, the first
     recording, the tree→list write-back, and the usage/ambiguity errors):
     - **Step 1** — resolve `<name>.list.txt` in the project root (project
       resolution reuses the existing name|path|dir resolution `test.ts:90-105`
       already implements — do not re-derive it).
     - **Step 2** — resolve the line named `<name>` in the tree document via
       `findTreeDocument`/`deserializeTreeDocument`/`flattenTreeLines`. Four
       branches: **both present** → step 3; **list only** → first recording,
       skip to write (below); **line only** → write the line's turn commands
       to `<name>.list.txt` and stop (no document write — this is how a
       tab-recorded line acquires a list, D8's explicit callout); **neither**
       → usage error naming both paths looked for, exit 2.
     - **Step 3** — compare the list's lines against the line's turn commands
       in order (both-present case only). Equal → stop, no write, exit 0
       (AC-5's no-op half — a matching list is a no-op even when the story's
       output changed; that is `sharpee test`'s job, never a reconcile, D6).
     - **Step 4** — ambiguity check: if `<name>` resolves to more than one
       line, fail loudly naming every candidate, exit 2, pick nothing (AC-6).
       The identification rule must be deterministic — settle it here as an
       explicit, named function, not inline comparison logic, since Phase 3
       reuses it for the actual reconcile.
     - **First-recording write path** (list-only case): boot via
       `loadAuthorGame(dir, { seed: document.seed })`, replay the list's
       commands turn by turn through `executeCommand`, and after each turn
       synthesize its card via `recordedTurnAssertions(effectivePolicy, {
       output, channelValues: game.lastChannelValues })` (falling back to
       `DEFAULT_AUTO_ASSERTION_POLICY` when the story declares none, D4) and
       the opening card via `openingDefaultClaims(effectivePolicy,
       game.bootChannelValues)` (D2/D3/D4). Append the new line to the
       document and write it through `serializeTreeDocument` (D8 step 6 —
       deterministic ordering/formatting, minimal diff).
  2. Register `record` as a peer `case` in `cli.ts`'s `switch` (~line 179's
     neighborhood), and in the same edit fix the stale `USAGE` block
     (`cli.ts:49-54`): remove `[transcripts…]` and `--tree|--chain`, correct
     "Run the project's transcript tests" (the CLI itself rejects both forms
     by name at `test.ts:57-77`), and add the new `sharpee record <name>`
     line. This is D9's "the help text has to change regardless" clause,
     landing where the command it was wrong about first exists.
- **Exit state**: `pnpm --filter '@sharpee/devkit' test` green, including a
  new `record.test.ts`. **Integration Reality Statement required before this
  phase is called done**: OWNED = the real engine boot via
  `loadAuthorGame`/`bootstrap.assembleGame`; REAL-PATH TEST = at least one
  test that boots a real story (the fernhill fixture, see Phase 4, or a small
  dedicated fixture project), replays a real list, and asserts on the
  document actually written to disk — not a mocked `TreeWalkerGame`. Fixture
  ACs satisfied: AC-1 (a story with no tests gets a passing suite from a
  terminal), AC-2 (the same list recorded twice at the same seed is
  byte-identical — assert on file bytes, not a diff-free claim), AC-4
  (recording a turn on a story with no `auto-assertion:` header produces
  `room-name-and-description` claims, compared field-by-field against what
  `recordedTurnAssertions` would independently produce for the same capture —
  this is also the D3 no-second-spelling check, AC-10), AC-6 (ambiguity fails
  loudly, names candidates, exit 2), AC-8 (`sharpee test` itself untouched —
  add a regression assertion that `test.ts` gained no write path), AC-9
  (every written card carries persisted claims — a bare card is never
  produced by this path).
- **Status**: PENDING

### Phase 3: The reconcile prompt — direction, replace-wholesale, list rewrite (D8 step 5)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: `record.ts`'s reconcile branch, TTY/non-interactive UX. GATED — packages/devkit; discuss with David before starting (also: the interactive-prompt UX and the non-interactive flag's name/spelling are real design surface — settle both with David in this phase's kickoff, not unilaterally).
- **Entry state**: Phase 2's steps 1–4/6 exist; step 3's comparison already
  distinguishes "equal" (no-op) from "differs" (this phase). The ambiguity
  check (step 4) and the deterministic line-identification function it
  introduced are reused here unchanged.
- **Deliverable**: When step 3 finds the list's commands differ from the
  line's, per D8:
  - Show the command-level difference (what the list has that the line
    doesn't, and vice versa).
  - **Interactive (TTY present)**: ask the direction.
    - **list → tree**: replay the list's full command sequence through
      `loadAuthorGame` at the document's pinned seed, synthesize per Phase
      2's synthesis path, and replace the line's cards wholesale (claims the
      author had hand-deleted from the old line do not survive — the ADR's
      stated, deliberate cost of whole-line replace).
      Write via `serializeTreeDocument`.
    - **tree → list**: write the line's *current* turn commands back to
      `<name>.list.txt`, overwriting it. The document is untouched.
  - **Non-interactive (no TTY)**: refuse with a named error, unless a
    direction was pre-declared via a flag on `record` (settle the flag's
    name with David at kickoff — D8 only specifies "a direction flag on
    `record`, never on `test`," not its spelling). `record` never blocks
    waiting for input when there is no TTY to read from (AC-7).
- **Exit state**: `pnpm --filter '@sharpee/devkit' test` green, extending
  `record.test.ts`. **Integration Reality Statement required**: both
  directions' REAL-PATH TEST replays against a real booted story (not a
  stubbed engine) — list→tree's replay is exactly Phase 2's synthesis path
  exercised again, so the same fixture applies. AC-5's full statement
  satisfied (prompts on command-sequence variation, resolves whole-line, a
  matching list stays a no-op even under output drift). AC-7 satisfied
  (non-interactive run either refuses or acts on a pre-declared direction,
  never blocks). A Behavior Statement (rule 12) is required before writing
  tests for the direction-resolution function and the two write paths, since
  both are new side-effect functions.
- **Status**: PENDING

### Phase 4: D7 — verify the two surfaces agree, by test
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Cross-surface contract test, spanning `packages/devkit`, `packages/branch-tester`, and (read-only) `tools/ide/web/testing-surface`. Lightly gated — no `tools/ide` runtime file changes are expected (only new tests that import its existing modules), but confirm that reading is sufficient before starting; if a real gap surfaces requiring an IDE change, stop and report per ADR-312's own instruction ("A change required in tools/ide/ to make this work would contradict D7 and should stop the work").
- **Entry state**: Phases 1–3 complete. `branch-stories/fernhill/fernhill.tests.json`
  exists with no sibling `.list.txt` — a real tab-recorded fixture, useful
  both as the "line only" case (Phase 2 already exercises acquiring a list
  for it) and as the D7 fixture below.
- **Deliverable**: Two round-trip tests, per ADR-312's D7 and its worked
  example:
  1. **CLI → tab direction**: run `sharpee record` against a fresh fixture
     project to produce a document, then feed that document through
     `deserializeTreeDocument` and the testing-surface's own model
     (`tools/ide/web/testing-surface/src/model.ts`'s `TreeSessionModel`,
     imported read-only as a test dependency) and assert it loads and
     renders as an ordinary tree — no refusal, no malformed-document path.
  2. **Tab → CLI direction**: using the fernhill fixture (a document the tab
     produced), run `sharpee record fernhill-line-name` — the "line only,
     write the list back" case — then run `sharpee test` against the
     resulting project and assert it passes, demonstrating a tab-recorded
     document re-runs from the terminal unchanged.
  Add the worked example from ADR-312 itself (`opening.list.txt` →
  `sharpee record opening` → edit → re-record → reconcile → no-op re-run) as
  a single end-to-end fixture test, since it is the ADR's own acceptance
  narrative and nothing currently exercises it as one script.
- **Exit state**: AC-3 satisfied by test, not assertion in prose (D7's
  explicit requirement — "verified by test rather than asserted in prose").
  If either round-trip fails, the defect is in whichever surface produced the
  divergent output (ADR-312: "a defect in that surface, not a migration") —
  fix it there, in this phase, rather than special-casing the reconcile logic
  to paper over it.
- **Status**: PENDING

### Phase 5: Correct the getting-started doc's "you do not write that file by hand" claim
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Author-facing documentation (`website/`). Not gated —
  `website/` is not under `packages/`, so CLAUDE.md's platform-change
  discussion rule does not apply; proceed once Phases 2–3 have shipped so the
  described command shape (name, flag) is final.
- **Entry state**: `website/src/app/chord/getting-started/compose-and-run/content.mdx:65-68`
  currently reads "You do not write that file by hand. You record it by
  playing: in Chord Writer's Testing tab..." — true today, false once
  `sharpee record` ships. The Consequences section of ADR-312 names this doc
  and the download page's Intel guidance as promises this work makes true.
- **Deliverable**: Update `compose-and-run/content.mdx` to describe both
  recording paths — the Testing tab (unchanged) and `sharpee record <list>`
  (new) — as peers, per D1 ("a second writer... both writers produce the same
  document"). Spot-check `website/src/app/chord-writer/download/content.mdx`'s
  Intel-guidance section (already partly touched by commit `56275bbe`,
  2026-08-12) for anything that still implies the CLI path is a downgrade
  rather than a first-class authoring path; correct if so.
- **Exit state**: Neither doc claims a Chord Writer install is required to
  author a test. `website` prebuild (search-index regeneration) runs clean.
- **Status**: PENDING
