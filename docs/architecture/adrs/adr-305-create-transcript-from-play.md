# ADR-305: Create Transcript from Play — Promotion in the Play Surface

**Status**: ACCEPTED, SUPERSEDED IN PART by ADR-306 (UI retirement landed
2026-08-09, session d54d7e — David's shred ruling pulled ADR-306 D1's flip
forward). **Retired**: the margin selection UI (D4's margin location), the
Create Transcript button, the save-panel write flow and user naming (D6's UI
half), and the per-turn-checkbox selection model (D2 as built) — replaced by
the testing play surface's ranges + pruning. **Standing**: every platform
decision — the fixed IDE seed (D1), selection-as-assertion semantics now
expressed by ranges (D2), the restart fence (D3), the `data-turn` anchor
contract and the turn feed (D4's platform half), and the one shared synthesis
module (D5), which the testing surface serializes through.

*Original acceptance (2026-08-08, session 1dd6d3)*: the play session boots at a fixed
IDE seed (D1); a margin in the play surface selects which played turns a created
transcript *asserts*, while the file always carries the full command sequence from the
origin (D2); restart is a fence and every other meta command is an ordinary command
(D3); the per-turn margin keys off a stable `data-turn` anchor contract in the platform
client, and the turn feed is rebuilt against this decision (D4); assertions are
synthesized at creation from the played turns' captures through one shared
toolchain-owned synthesis module (D5); the write contract — destination, naming,
collision, header, and refusal paths — is pinned (D6).

**Date**: 2026-08-08 (session 1dd6d3)
**Depends on**: ADR-294 (seed as header metadata, D3; assertion tiers), ADR-300 (the
transcript model and serializer; the removal this ADR partially reinstates), ADR-301
(the Testing tab, and the "play authors the transcript" idea this ADR decides),
ADR-304 (the testing workspace this flow lives in), go-live plan Phase 6e
(auto-assertion policy — the bare/`[SKIP]` grammar this design leans on)
**Origin**: go-live Phase 6f (P-7). David, during the Phase 6 click-through: "the
author will be playing the story and then decide 'these 20 commands' are a test."

---

## Context

Writing a transcript by hand means typing commands blind and pasting expected output.
ADR-299 carried promotion from a session log as the interaction idea; ADR-301, which
holds what survived ADR-299's supersession, calls it "the genuinely valuable idea and
the reason to build an editor at all" and explicitly deferred the interaction as "the
next decision." This ADR decides the creation half.

Three facts about the code today shape the design (each verified 2026-08-08, session
1dd6d3):

- **Play is not deterministic.** ADR-300's cleanup removed the turn-events bridge, the
  pinned play seed, and the skein session from `PlayViewController` because nothing
  consumed them — with an explicit note that "play authors the transcript" would need
  a turn feed again, built against the real decision. One hook survived the removal:
  the browser-client template still honors a `__SHARPEE_PLAY_SEED__` global, but
  nothing sets it. Evidence: `grep -rn "__SHARPEE_PLAY_SEED__"` over `tools/ide` and
  `packages/devkit/src` hits only the client template's *reader*
  (`chord-browser-entry.ts.template:35`) and two build tests asserting the bundle
  contains the hook — no setter anywhere. With the global unset, the template omits
  `seed` from EngineConfig, and its own comment states the consequence: "omitting it
  leaves chord draws clock-seeded."
- **Every play boot is storage-clean.** The IDE's play chrome calls
  `localStorage.clear(); sessionStorage.clear()` at document start on every boot
  (`PlayViewController.swift`, `playSurfaceScript`; David's ruling: every load is a
  fresh boot of what ⌘B just built). A typed `restore` can therefore only refer to a
  save made earlier in the same session.
- **Phase 6e shipped the grammar this design needs.** Under an `auto-assertion:`
  policy a bare command means "awaiting assertion" and `[SKIP]` means "deliberately
  skipped, never trampled" — exactly the selected/setup distinction promotion has to
  express.

## Decision

- **D1 — The play session boots at a fixed IDE default seed.** The play chrome sets
  `__SHARPEE_PLAY_SEED__` (the surviving ADR-299 D5 hook) on every boot — build,
  restart, session restore. The value is a named constant, **`IDE_PLAY_SEED = 42`**
  (the corpus's canonical example seed, ADR-294 D7's illustration), declared once on
  the Swift side where the chrome script is composed. Play *is* the test
  environment: identical run-to-run, every session promotable. Created transcripts
  pin the seed in the header (`seed:`, ADR-294 D3). Rare outcome classes are reached
  by forcing (ADR-294 D13's mechanism, ADR-293 Phase C's `materialize`), not seed
  roulette; a seed knob in the UI is deliberately not built.

- **D2 — Selection chooses what is asserted, not what runs.** A transcript replays by
  executing commands from a fresh boot; there are no mid-session snapshots. So the
  created file always carries every command from the origin through the *last*
  selected turn. Selected turns are asserted; unselected turns — the ancestry prefix
  and any gaps — are written `[SKIP]`: executed for state, never asserted, never
  auto-written. Ancestry and gaps fall out of one rule, and the margin carries no
  anchoring restriction — mid-session promotion ("play for a while, then hit the
  sequence worth testing") is the primary case, not an edge.

- **D3 — Restart is a fence; every other meta command is an ordinary command.** A
  restart (typed or the Play header's button) makes everything before it dead
  lineage. It resets the promotion log's origin: the margin only reaches back to the
  most recent restart, and `restart` never appears in a created file — the
  transcript's fresh boot plays that role. All other meta commands (`save`,
  `restore`, `undo`, `verbose`, `score`, …) are carried like any command: the
  storage-clean boot makes save/restore self-contained, and replay at the pinned
  seed is deterministic. Stripping them was rejected (`verbose` changes subsequent
  output, `restore` changes state — stripping silently breaks replay); blocking
  selections containing them was rejected as unnecessary given the clean boot.

- **D4 — The margin lives in the play surface, over the played turns.** The gesture
  is "I just played this — these N commands are a test," and it happens where the
  play happened; mirroring the session into a Testing-tab log was considered and
  rejected (it breaks the moment the decision happens in). The DOM contract this
  requires is absorbed, not assumed: the platform client wraps each turn in a stable
  **`data-turn` anchor** — a published contract like `#menu-bar`, kept small on
  purpose. The anchor's shape: the client sets `data-turn="<ordinal>"` on the
  element that contains one turn's full rendering (command echo + everything the
  turn emitted); ordinals are 1-based and **monotonic across the whole page
  lifetime, never reset by an in-page restart** — uniqueness is the anchor's one
  invariant, and fence logic lives in the feed (below), not in numbering. An author
  customizing the client keeps the anchors to keep the IDE affordance; the wire
  stays data-only (per the author-customizable-client principle, no layout is
  assumed beyond the anchor). The turn feed — client → Swift over a
  `playTurns` script-message handler, the sibling of the existing `playConsole`
  hook — is rebuilt against this decision, as the ADR-300 removal note in
  `PlayViewController` instructed. Per turn it posts
  `{ turn, command, output, captures }`: `turn` matches the `data-turn` ordinal,
  `command` is the typed command, `output` is the turn's ordered rendered text,
  `captures` is `[{ channel, text }]` for the turn's channel captures (what D5's
  synthesis consumes). A restart — typed or header-button — posts
  `{ restart: true, turn }` naming the first ordinal of the new lineage. The
  TypeScript side of this shape lives with the client-template chrome contract;
  the Swift side decodes it the way the run-event wire is decoded. The margin and
  Create Transcript action are IDE chrome keyed off the anchors; the published
  bundle is untouched.

- **D5 — Assertions are synthesized at creation, through one shared module.** The
  play surface already holds every turn's real output and channel captures, so the
  file is born whole — no first run needed to fill it in. The captures→assertions
  synthesis (Phase 6e's policy engine: literal block for all-emitted-text,
  contains-form from the room channels for the middle policies) is extracted into a
  **shared toolchain-owned module** imported by BOTH harness runners
  (branch-tester, transcript-tester) and the creation flow — never a Swift-side or
  chrome-side reimplementation (rule 8b: co-located wire/logic sharing; drift
  between what play writes and what a runner would write is the failure mode this
  forbids). Under "let me decide" (no `auto-assertion:` policy), creation follows
  6e's editor rule: selected turns get the `[SKIP]` placeholder and nothing
  auto-writes. **Accepted information loss**: in that mode selected and unselected
  turns serialize identically, so the file records no trace of which turns the
  author meant to assert — the selection's meaning survives only under a policy.
  This is deliberate (no new grammar, D4-safe per 6e); an author who wants the
  distinction recorded sets a policy.

- **D6 — The write contract.** Create Transcript opens a save panel anchored at the
  project's `tests/` directory — `TranscriptDiscovery`'s scan root, so the new file
  is discovered by the Testing tab on the next refresh without configuration — with
  a suggested name derived from the story slug and the selection's turn span
  (e.g. `fernhill-turns-3-14.transcript`); collision is the save panel's native
  overwrite confirmation, never a silent replace. The file's header is two fields:
  `title:` (the grammar requires a title or story header — `validateTranscript`
  refuses a file with neither, found by the real-path test 2026-08-08; defaulted at
  creation, caller-suppliable) and `seed: <IDE_PLAY_SEED>` — the parser's other
  header keys (`channels`, `events`, `locale`, `forces`, `point-seed`) are opt-in
  test features with no play-session analogue, and story association is by path,
  not header. **Refusals
  (all write nothing — a partial file is never left behind, ADR-294 D5's spirit):**
  Create is disabled with an empty selection; disabled when no play session is
  live (no built bundle, dead page); and if any selected turn's feed record is
  incomplete (missing captures under a policy that needs them, bridge gap), creation
  refuses naming the turn. Stale selections cannot exist by construction: every
  rebuild reboots the page, which clears the log and the margin with it.

> **D4 AMENDED 2026-08-09 (session 2b82b5) — ADR-306 Phase 2 wire additions.**
> The turn record gains three fields for the testing play surface (ADR-306;
> design doc §10 item 2): **`events`** — the turn's emitted semantic-event
> types in emission order (the Event picker's source); **`world`** — the
> world digest (the unseen slice: non-room/non-player entity locations with
> `[STATE:]`-resolvable tokens, score from the scoring capability, machine
> states via the plugin registry's existing `getState()` surface), built only
> when the bridge is active so published players never pay for it; and
> **`lineage`** — the fence-delimited lineage id (boot value from the
> `__SHARPEE_PLAY_LINEAGE__` global — the branch-replay sibling of
> `__SHARPEE_PLAY_SEED__` — default 1, incremented at each restart fence),
> with `parentLineage`/`forkOrdinal` on boot-lineage records when the global
> names them. The restart fence record gains `lineage` naming the NEW
> lineage. The digest's token rule (alias → single-token name → id) is a
> deliberately narrowed MIRROR of branch-tester's `worldEntityRef` — the
> browser bundle cannot import the Node harness — pinned by tests on both
> sides (the ADR-301 A1 pattern). Evidence: platform-browser 139 passing
> (turn-events + world-digest suites, capture-parity green over the real
> engine), devkit 171 passing (bundle asserts `__SHARPEE_PLAY_LINEAGE__`
> ships; publish excludes `index-testing.html`), 2026-08-09.

## As built (2026-08-09, session 1dd6d3 — same session, implementation landed)

Four deviations from the letter of the Decision, each recorded here the day it
was made; none reopens a ruling:

- **D4 — the bridge is `turnEvents`, not `playTurns`.** The client already
  shipped a `turnEvents` handler name (ADR-277 D5, the one hook ADR-300's
  removal left alive); rebuilding the feed extended that published name rather
  than minting a sibling. Payload as decided, with one strengthening: captures
  carry **structured `values` per channel** (`{channel, values}`), not
  flattened text — flattening happens only in the synthesis module, so the
  one-implementation rule of D5 covers the flattener too.
- **D4 — anchors are per-element stamps, not a wrapper.** The client stamps
  `data-turn="<ordinal>"` on every top-level element a turn rendered (echo +
  entries) instead of wrapping the turn in a container: zero restructuring of
  the renderer pipeline, zero risk to theme CSS, same contract (grouping is by
  equal value; ordinal uniqueness and page-lifetime monotonicity unchanged).
- **D2/D3 — the boot look is the lineage's first recorded turn.** The browser
  client auto-runs `look` at every fresh boot; the headless harness does not.
  Left unrecorded, every replayed turn number would be off by one against play
  (daemons and fuses key on turn numbers). So the feed records the boot look
  (echo-less) as turn one of each lineage and a created file carries it —
  `[SKIP]` unless selected. Pinned by the capture-parity suite, which now
  byte-compares play records against the headless runner *with the boot turn
  aligned at index 0*.
- **D5 — the shared module is owned by `@sharpee/branch-tester`, and
  transcript-tester keeps its copy.** ADR-302 D15 makes the harness pair a
  deliberate full copy and explicitly rejects a shared third package; editing
  transcript-tester to import one would breach the freeze. The synthesis
  (`auto-assertion.ts`: `synthesizePolicyAssertions` + `proseTextLinesOf`) and
  the creation entry (`from-play.ts`: `createTranscriptFromPlay`) live in
  branch-tester — the harness the IDE's world runs (`sharpee test --tree`) —
  and the devkit CLI (`sharpee transcript-from-play`) imports them.
  Transcript-tester's frozen copy cannot drift because it never moves; D5's
  one-code-path guarantee holds everywhere play promotion can reach.

Evidence (all 2026-08-09, ~00:05 CDT): branch-tester 422 passing (12 new
from-play, synthesis extraction regression-free); devkit 171 passing incl. the
REAL-PATH replay (a file created from play records passes a genuine chord
compile → run) and the anchor-contract build assertions (`data-turn` +
`turnEvents` in every built `game.js`, chord + TS templates); platform-browser
131 passing (10 turn-feed incl. stamping/ordinals/fence, capture-parity
byte-parity with boot-turn alignment); SharpeeIDETests **527 passing, 0
failures** incl. PlayTurnLogTests (7), PlayMarginRealPathTests (5 — live
WKWebView, real bridges both directions, seed global read back as 42),
PlayTranscriptCreationTests (3 — real CLI child process, refusal path);
repo-wide `tsc --noEmit` clean. Mutation-verification raised ONE warning —
`PlayTurnLog.reset()`'s Swift-initiated call sites (`load()`, header
`restart()`) bypass the bridge and were unasserted — closed the same session
by `testSwiftInitiatedResetsClearTheLog` (live webview, both call sites).
Full suite after closure: **528 passing, 0 failures** (2026-08-09 00:11 CDT).

## Consequences

- The platform client gains a small published contract (`data-turn` anchors) that
  custom clients must keep to retain the promotion affordance; the anchor is the
  entire DOM assumption, so client customization stays otherwise free.
- The turn feed returns to `PlayViewController` with a real consumer this time; the
  bridge shape (command, ordered output, channel captures, restart events) is
  dictated by D2/D3/D5, not speculation.
- The 6e synthesis logic moves out of the two runners into a shared module both
  import — a refactor with test coverage on both sides before the creation flow
  consumes it.
- Play becomes deterministic by default in the IDE. Anyone relying on clock-seeded
  variety in play testing loses it; forcing (`forces:`/`point-seed:`) is the
  supported route to rare outcomes.
- A created transcript is replayable by construction (full command sequence, pinned
  seed, fenced restarts). The phase's acceptance is a rule-13a real-path test: play,
  select, create, and the created transcript passes a real run — no stubbed runner.
  Three boundary tests pin the seams independently of that E2E: the **restart
  fence** (turns before the most recent restart are not offered by the margin and
  are refused at creation), the **bridge round-trip** (a real played sequence's feed
  records match the typed commands and `data-turn` ordinals one-to-one), and the
  **anchor contract** (a client-template test asserting every turn carries a
  `data-turn` anchor, unique and monotonic across an in-page restart). Rejection
  tests cover D6's refusals: empty selection, no live session, and an incomplete
  feed record — each asserting *nothing was written*.
- ADR-301's "next decision" is now half-decided: creation is settled here; the
  *editing* interaction (card-per-turn surface, contains-by-selection, re-bless)
  remains open and should cite this ADR when decided.

## Session

Designed and accepted in session 1dd6d3 (2026-08-08, branch
`feat/ide-go-live-phases-1-3`), go-live plan Phase 6f design step. Five questions
posed one at a time; David ruled on each — notably overriding the Testing-tab
session-log lean in favor of the play surface (D4) and choosing creation-time
synthesis over first-run synthesis (D5). Reviewed the same session
(`/devarch:adr-review`, 10/15 initial); the review's seven findings — two citation
fixes (the promotion quote is ADR-301's, forcing is ADR-294 D13), inline evidence
for the three Context claims, the D6 write contract, the anchor/bridge interface
shapes, rejection and boundary tests, and the let-me-decide information-loss
acknowledgment — were folded in this revision. D6's defaults (save-panel flow,
`tests/` destination, single-field header, `IDE_PLAY_SEED = 42`) were
Claude-proposed under David's blanket instruction to fold with defaults, flagged
for veto rather than interviewed. Recorded in
`docs/work/ide-go-live/plan-20260806-go-live.md` (Phase 6f, DESIGN SETTLED).
