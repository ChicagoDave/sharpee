# Session Plan: Fix GH #280 — the opening card of a branch test tree is unclaimable

**Created**: 2026-08-18
**Plan Status**: ACTIVE
**Overall scope**: The opening card of every branch test tree (`ides-of-march`, `fernhill`,
and by extension every future story) is written empty — `{"assertions": {}, "type":
"opening"}` — because the channels `synthesizeOpeningAssertions` reads (`prologue`, `info`)
do not overlap the channels bootstrap actually captures at boot (`banner`, `prologue`), and
the IDE's manual fallback (the ordinal-0 Channel picker) reads the wrong record's captures
too, so there is no way to claim the opening by hand either. Fix the producer/consumer
channel mismatch, fix the picker's data source, and reconcile the three shipped trees that
were recorded (and permanently locked, per ADR-307 D2's "filled, never overwritten" rule)
while the bug was live.
**Bounded contexts touched**: Testing Intelligence / opening-card synthesis (ADR-300–307
substrate: `packages/bootstrap`, `packages/branch-tester`) and the IDE Testing tab
(`tools/ide/web/testing-surface`), which consumes the same synthesis function and adds a
manual claim path on top of it.
**Key domain language**: opening card, boot channel capture, auto-assertion policy,
record-time synthesis, channel claim (`channel-contains` / `channel-is`).

## References consulted
- `docs/architecture/adrs/adr-307-testing-tree-model-v2.md` — D2/D3: synthesis is
  record-time only ("a claim-less non-skip card is filled, never overwritten"), so the three
  already-recorded opening cards will stay empty forever under the fixed code unless this
  plan explicitly re-derives and rewrites them — the bug cannot self-heal by re-running
  anything.
- `docs/context/project-profile.md` — confirms `packages/branch-tester` (`auto-assertion.ts`,
  `tree.ts`, `tree-runner.ts`) and `tools/ide/web/testing-surface` are both live, actively
  developed Testing Intelligence surfaces (not legacy), and that author-channel isolation
  (D12/AC8) is a standing invariant to not regress while touching channel capture code.
- `docs/context/session-20260818-0336-fix-ci-esm-target.md` — most recent session's Open
  Items are entirely the Chord Writer 1.3.0 release (upload/website-bump/deploy); no
  overlapping blocker or deferred item touches testing-tree or channel-capture code, so this
  plan starts clean against it.

## Phases

### Phase 1: Fix the boot-channel capture/synthesis mismatch and the picker's data source
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Opening-card synthesis (`packages/bootstrap`, `packages/branch-tester`)
  and the IDE's manual channel-claim fallback (`tools/ide/web/testing-surface`)
- **Entry state**: PLATFORM-GATED — this phase edits `packages/bootstrap/src/index.ts` and
  `packages/branch-tester/src/auto-assertion.ts`. Per CLAUDE.md, do not start until David has
  explicitly approved these two platform edits (the `tools/ide/web/testing-surface` edit in
  this same phase is not itself platform-gated, but is bundled here because it depends on the
  same investigation). Current state verified 2026-08-18: `openingChannels` in
  `packages/bootstrap/src/index.ts:238` is `['banner', 'prologue']`;
  `synthesizeOpeningAssertions` reads `bootChannelValues['prologue']` and
  `bootChannelValues['info']` — `info` is never captured, so that branch is dead code, and
  `banner` is captured but never read by the synthesizer. Both shipped sample trees declare
  no `prologue`, so nothing synthesizes for either.
- **Deliverable**:
  1. Add `'info'` to `openingChannels` in `packages/bootstrap/src/index.ts:238` so
     title/description become reachable.
  2. Investigate whether `'banner'` is ever actually emitted (no `BANNER` channel write was
     found anywhere in `packages/*/src` outside tests during planning — confirm or refute
     this). Decide, and record the decision in the code comment: either (a) it's genuinely
     dead capture and the fix is to drop it from `openingChannels`, or (b) some story path
     does emit it and `synthesizeOpeningAssertions` should read it too. **Do not extend
     `synthesizeOpeningAssertions` to read `banner` on assumption alone** — its docstring
     currently scopes synthesis to prologue/title/description only (David 2026-08-10 ruling
     per the ADR-307 D3 amendment), and the IDE's own tooltip
     (`tools/ide/web/testing-surface/src/cards.ts:451`) treats banner as a picker-only,
     manually-claimable channel, not an auto-synthesized one. If investigation is
     inconclusive, surface the question to David rather than guessing.
  3. Fix `onChannelPicker` in `tools/ide/web/testing-surface/src/main.ts:296-322` (ordinal 0
     case) to source from the true boot channel snapshot — the same data
     `openingDefaultClaims`/`bootCaptures` already uses at record time
     (`tools/ide/web/testing-surface/src/main.ts:577`) — instead of
     `records.get(bootRecordOrdinal)`, which is the boot turn's own captures and is what
     produces David's reported symptom ("the channel list shows the room stuff, not the
     banner").
  4. **Fix the self-heal guard** (added 2026-08-18 by `/devarch:plan-review`, which found the
     plan was working around this rather than repairing it). `tools/ide/web/testing-surface/src/model.ts:314`
     refills a claim-less opening card only when `openingCard.assertions === undefined`, but
     every recorded tree carries `"assertions": {}` — an empty object, not undefined — so the
     refill never fires. Its own comment states the intent it is failing to deliver: "a
     claim-less opening (a pre-pivot document, or a hand-edited one) gains the boot's recorded
     claims on its first replay", and ADR-307 D2 says a claim-less non-skip card **is** filled.
     Treat an empty assertions object as claim-less. This is what makes the shipped trees
     repair themselves on first replay — and it covers every story already recorded elsewhere,
     which a three-file backfill would not.
  5. Verify the bootstrap comment's claim that unioning capture channels is "invisible to
     golden recordings" (packages/bootstrap/src/index.ts:227) rather than trusting it: this
     is the same union mechanism already used for `policyChannels`, so it should hold by
     precedent, but confirm by running the existing golden/transcript suites before and
     after the `openingChannels` change and diffing results.
  6. Add regression coverage: a branch-tester unit test where a story declares only
     `title:`/`description:` (no `prologue`) now synthesizes non-empty `channel-is` opening
     claims — the exact shape both shipped samples have. Extend or add to
     `tools/ide/web/testing-surface/tests/model.test.ts` (or a sibling file) covering that
     the ordinal-0 picker's channel list now matches the boot snapshot, not the boot turn's
     room captures.
- **Exit state**: `pnpm --filter '@sharpee/bootstrap' test`, `pnpm --filter
  '@sharpee/branch-tester' test`, and the testing-surface vitest suite are all green,
  including the new regression tests, which fail against the pre-fix code (confirm this by
  running them before applying the fix, or cite the equivalent). `tools/ide/build-testing-surface.sh`
  has been re-run so the built `surface.js` artifact matches source (never hand-edit
  `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js` directly). Author-channel
  isolation (D12/AC8) explicitly re-asserted, not assumed: the project profile names it a
  standing invariant for changes to channel-capture code, and adding `info` widens what every
  story captures at boot — so the isolation suite is named in this exit check rather than left
  to the golden-recording diff to catch by implication.
- **Real-path test (rule 13a)**: OWNED = the channel registry, capture pipeline, and
  synthesis function. REAL-PATH TEST = the new branch-tester regression test drives a real
  story boot through `synthesizeOpeningAssertions` against real captured channel values, not
  a hand-built fixture object standing in for the pipeline; the testing-surface test drives
  the actual `main.ts`/`cards.ts` picker wiring, not a mock of `onChannelPicker`.
- **Status**: CURRENT (since 2026-08-18)

### Phase 2: Backfill the three shipped opening cards and confirm real-path regression
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: Branch-tester test-tree fixtures (`branch-stories/*/*.tests.json`)
- **Entry state**: Phase 1 done and locally verified — the fix is live, not merely planned.
  Per ADR-307 D2, the three already-recorded opening cards
  (`branch-stories/ides-of-march/ides-of-march.tests.json`,
  `branch-stories/fernhill/fernhill.tests.json`,
  `branch-stories/thealderman/thealderman.tests.json`) will stay `{"assertions": {}}`
  forever unless explicitly rewritten — record-time synthesis never overwrites a filled
  card, empty or not.
- **RE-SCOPED 2026-08-18** by `/devarch:plan-review`: with Phase 1 item 4 fixing the
  self-heal guard, this is no longer a manual backfill of three hand-edited JSON files. It is
  "replay each tree once and commit what the fixed pipeline writes." The distinction matters —
  a backfill covers exactly the three files it touches, whereas the guard fix repairs any
  story already recorded with an empty opening, including ones not in this repository.
- **Deliverable**: Replay each of the three trees once under the fixed pipeline and commit the
  resulting opening claims. State explicitly which mechanism was used — the tree-runner replay
  or a re-record through the IDE Testing tab — do not silently pick one without saying so.
  Reconcile the resulting card/assertion
  counts against the 38-card/45-assertion and 35/38 figures recorded in prior session
  summaries, and explain any delta (the fix adding non-empty opening claims should only
  ever increase assertion counts, never card counts).
- **Exit state**: All three trees replay clean end to end (`--test --tree` or the
  branch-tester tree-runner CLI — name the exact command used) against their real story
  bundles, with non-empty, passing opening claims. `git diff` on the three `.tests.json`
  files touches only the `opening` card's `assertions` field — no incidental drift
  elsewhere in the tree.
- **Real-path test (rule 13a)**: OWNED = the three story trees and the story bundles they
  replay against. REAL-PATH TEST = a real tree-runner replay of each story's boot against
  its production story bundle, not a stub tree or a hand-typed assertion with no replay
  behind it.
- **Status**: IN PROGRESS — 2 of 3 trees healed (2026-08-18 23:40). Replaying under the
  fixed pipeline filled `ides-of-march` (`info.title` = "The Ides of March", plus
  `info.description`) and `thealderman` (`info.title` = "The Alderman"); `fernhill` is
  still `{}` and heals on its next replay. Ides now runs **39 cards / 48 assertions**
  passing, up from 38/45. **Correction to this phase's own prediction**: it stated the fix
  "should only ever increase assertion counts, never card counts", and the card count moved
  38 -> 39. That is not a new card — the opening card exists either way, but a claim-less
  one is not counted as passing because it asserts nothing; carrying claims makes it count.
  The document still holds 36 main-line cards. Original status follows.
  BLOCKED ON A GUI ACTION, not on code (2026-08-18). The mechanism question this
  phase insisted be answered explicitly has an answer, and it removes the phase's work: the
  self-heal fixed in Phase 1 item 4 lives in the IDE Testing tab's session model
  (`tools/ide/web/testing-surface/src/model.ts`), which is the only thing that writes claims
  back into a tree. `sharpee test` / `runTreeDocumentCommand` **only reads** — verified: no
  CLI path writes `.tests.json` outside test fixtures. So there is no headless replay to run,
  and hand-writing the three JSON files is exactly what the re-scope removed.
  **What actually happens now**: each tree repairs itself the next time it is opened and
  replayed in Chord Writer's Testing tab, and the resulting `assertions` are committed from
  that. No hand-editing, and the same fix covers any story recorded elsewhere.
  **Verified meanwhile** (2026-08-18, `./sharpee test`): all three trees still run clean under
  the Phase 1 changes — ides 5 cards/5 assertions, fernhill 35 cards/38 assertions (matching
  the 35/38 recorded in prior session summaries, so no drift), thealderman 4 cards/9
  assertions. The opening cards remain `{}` until a Testing-tab replay fills them, which is
  the expected pre-replay state, not a failure.

## Disposition note (resolved)

The outgoing plan was `docs/work/chord-writer-per-arch-release/plan.md`. David chose rule
18b option 1 (**done but unmarked**) on 2026-08-18: all four phases marked DONE, `Plan
Status: DONE`, and the plan archived to
`docs/work/archive/chord-writer-per-arch-release/`. Phase 1 is recorded as DONE-but-not-as-
written — its premise (finish 1.3.0 on the unmodified tooling) proved wrong and 1.3.0 was
rebuilt on the repaired pipeline in Phase 4 instead. `.current-plan` now names this plan.
