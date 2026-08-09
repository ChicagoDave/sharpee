# Session Plan: Testing play-surface revamp — implement the settled design

**Created**: 2026-08-09
**Plan Status**: ACTIVE
**Overall scope**: Implement `design-testing-play-surface.md` — a dedicated
testing page (`index-testing.html`) that turns play into test authoring:
cards + a checkbox rail, tick-to-range segments, gesture-authored assertions
edited in a source panel, branching with lineage stickiness, auto-name/
auto-save, and a minimal run column. Supersedes parts of ADR-304 (workspace
layout) and ADR-305/6f's UI (margin chrome, Create button, save panel,
per-turn-checkbox); keeps ALL of 6f's platform substrate (turn feed,
`data-turn` anchors, `IDE_PLAY_SEED`, synthesis module, ADR-302 tree) and
retires the author-world golden tier per the design's §8 capstone ruling.
**Bounded contexts touched**: N/A — this codebase does not use DDD framing
(traits/behaviors/capability-dispatch is its own vocabulary, not
aggregates/bounded contexts). Phases are named in Sharpee's own terms:
turns, cards, segments, transcripts, lineages.
**Key domain language**: turn, card, segment (range), lineage, fork,
auto-assertion policy, `[SKIP]`, `continues:` — all defined in the design
doc; no new glossary needed.

## References consulted
- `docs/work/testing/design-testing-play-surface.md` — authoritative spec; §9's build list and §8's "no golden path" ruling shape every phase's scope and ordering below.
- `docs/work/testing/mock-testing-play-surface.html` — living-illustration mock (David-iterated ~15 rounds); its DOM/JS shape (segments, branch points, run evaluator) is the acceptance reference for Phases 3–6.
- `docs/architecture/adrs/adr-305-create-transcript-from-play.md` — ACCEPTED; the turn feed (`turnEvents`), `data-turn` anchors, `IDE_PLAY_SEED = 42`, and the shared synthesis module are kept substrate — Phases 3–5 build on them, never reimplement them.
- `docs/architecture/adrs/adr-304-testing-workspace-layout.md` — ACCEPTED; its D1/D2 modal workspace (Play in the left pane, modal enter/exit) is wholesale superseded by the dedicated testing page — Phase 6 retires this machinery, and only after Phase 3's page is live.
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — D1's "golden transcripts are the regression baseline" is scoped by this revamp to the frozen transcript-tester/Dungeo world only; Phase 1's ADR must record the amendment, and Phase 6 must not touch transcript-tester's frozen `golden.ts` copy (ADR-302 D15's deliberate freeze).
- `docs/architecture/adrs/adr-302-transcript-branches.md` — the `continues:` tree / stem-rename machinery Phase 4 (auto-save) and Phase 5 (branching) build on, unchanged.
- `docs/architecture/adrs/adr-301-sharpee-transcript-editor.md` — the Testing tab's editing-interaction "next decision" this design answers; Phase 6 must draw the post-revamp Testing-tab boundary this ADR left open.
- `docs/context/project-profile.md` — TS strict mode, rule-8b shared-module discipline, and pnpm/vitest conventions constrain every `packages/` touch in Phases 2, 4, 5, 6, 7.
- `docs/context/session-20260808-2200-feat-ide-go-live-phases-1-3.md` — most recent session; records the design's genesis, the still-outstanding 6a–6f click-throughs (left with the go-live plan, not this one, per scope), and two loose threads to keep in view (editor pane doesn't auto-refresh during a policy-writing run; `sharpee test --tree` drops root `channels:` — needs a GH issue).
- `docs/work/ide-go-live/plan-20260806-go-live.md` — outgoing plan (now stamped superseded, still live); Phase 6f is the substrate this revamp keeps, and Phase 5 / 6a–6f remain CURRENT there — their click-throughs are that plan's business, not this one's.
- `docs/proposals/phase-6-fallout.md` — P-7 status context: PLANNED, not yet DONE (6f's acceptance click-through pending). This revamp does not resolve P-7 — it supersedes parts of what P-7 built; P-7 stays PLANNED until the go-live plan flips it.

## Ordering and dependencies

Real dependencies, not a linear pipeline:

- **Phase 1** (ADR) has no dependency and is cheap — it goes first so the
  supersession record and the Testing-tab boundary decision exist before
  `packages/` discussions start.
- **Phase 2** (substrate) does not strictly need Phase 1, but both touch
  `packages/` and should be discussed with David together.
- **Phase 3** (cards/rail/segments) needs Phase 2's `index-testing.html` and
  the existing turn feed (6f's, already shipped) to render against.
- **Phase 4** (assertion authoring + auto-save) needs Phase 3's cards to
  gesture on, and Phase 2's world-digest field for the State picker.
- **Phase 5** (branching) needs Phase 3's cards and Phase 2's lineage-id /
  fork-ordinal fields, and is blocked on the open "meta commands at fork
  points" question (§11) — resolve that before building the replay driver,
  not after.
- **Phase 6** (run column + retirements) needs Phase 4 and Phase 5 done —
  retiring old UI before the replacement works leaves nothing for authors to
  use.
- **Phase 7** (play to a goal, Tier 1) is explicitly "(Later phase)" in the
  design doc (§10 item 6a) — deferred, not blocking go-live of Phases 1–6.

## Phases

### Phase 1: Revamp ADR — supersession record + ADR-294 D1 scoping
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — architecture-decision recording, plain technical framing.
- **Entry state**: Design doc and mock are settled (done, session 1dd6d3); ADR-305 "As built" section exists.
- **Deliverable**: New ADR (`docs/architecture/adrs/adr-306-testing-play-surface-revamp.md`) recording: (1) the supersession list verbatim from design doc §9 — ADR-304 D1/D2 (workspace modal), 6f's margin chrome/Create button/save panel/user naming, the per-turn-checkbox model; (2) the keeps list — turn feed, `data-turn` anchors, `IDE_PLAY_SEED`, synthesis module, 6e policy, ADR-302 tree; (3) an amendment to ADR-294 D1 scoping the golden tier to the frozen transcript-tester/Dungeo world only (design doc §8); (4) an explicit ruling on the post-revamp Testing tab's boundary (runner/diff/golden depth and rename — ADR-301's open item), proposed under David's fold-with-defaults pattern and flagged for veto; (5) an Open Questions section carrying the genuinely unresolved items — from design doc §11: state-picker-at-scale, meta-commands-at-fork-points, session-view-persistence confirmation; plus one from plan-review: the editor-pane refresh rule under continuous auto-save (a transcript open in the editor goes stale on every gesture once Phase 4's writer rewrites on every edit — the already-open "no auto-refresh during policy-writing runs" thread, David to rule); (6) an explicit scoping of ADR-301 D5 — whether "explorer findings are adopted as documents" continues to govern the batch explorer only, or is superseded, given §12's play-to-goal lands verified paths as live cards instead (Phase 7 must not quietly build a second adoption path beside an unscoped "that is the whole interaction" ruling). **Flip timing**: ADR-306 records the §9 supersessions as *forthcoming* — ADR-304/305 status lines flip to SUPERSEDED at Phase 6's retirements (design doc §10 item 7: "the flip owner is whoever lands the revamp"), never at ADR-306's writing while the superseded UI still ships.
- **Exit state**: ADR written and (if David confirms) ACCEPTED, or DRAFT with Open Questions pending the interview offered per rule 11a. Testing-tab boundary decided, not deferred.
- **Status**: DONE (2026-08-09, session 2b82b5) — ADR-306 ACCEPTED. All 4 Open Questions resolved by interview (D6 picker with Grouped toggle + collapsible sections, D7 lineage-sticky saves, D8 complete-state restore, D9 auto-reload/conflict-guard); adr-review twice (11/18 → folds → 16/16 READY); D4 boundary + D5 scoping stood un-vetoed. AC-1..AC-6 in the ADR are the revamp-level acceptance bar.

### Phase 2: Testing-page substrate — `index-testing.html` + feed wire additions
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A — plumbing (devkit browser build, platform-browser turn feed).
- **Entry state**: Phase 1's ADR exists (at least DRAFT) so the wire-shape amendment has a home to cite.
- **Deliverable**: (1) `index-testing.html` — a second template rendering in the devkit browser build (same `game.js`, same client, no banner/status/menu/theme chrome); the IDE's testing surface loads it, regular Play keeps the real player page, published zips never carry it. (2) Turn-feed record additions in `platform-browser`'s `turn-events.ts`: emitted event types, a world digest (NPC/item locations, score, state machine — the source of the design's State picker, never `player.location`), and a lineage id (+ parent lineage, fork ordinal). (3) Amend ADR-305 D4's wire shape to record the additions.
- **Note**: touches `packages/devkit` and `packages/platform-browser` — per CLAUDE.md MAJOR DIRECTIONS, discuss with David before implementation.
- **Exit state**: `index-testing.html` builds and loads with no chrome; the extended feed record ships the three new fields; capture-parity suite still green; ADR-305 amended.
- **Delivered** (David green-lit the scope — "go" — and it was built same day, session 2b82b5): `index-testing.html` template + both build paths emit it (chord-build/browser-build tests pin content: game.js + text-content + command-input, no menu-bar/status-line/THEME_LINKS; publish.test pins zip exclusion); feed additions in `turn-events.ts` (`events`, `world` digest gated on bridge, `lineage` + `__SHARPEE_PLAY_LINEAGE__` boot global, fence carries new lineage id) + new `world-digest.ts` ([STATE:]-token mirror of branch-tester's worldEntityRef, pinned both sides); ADR-305 D4 amended. Evidence 2026-08-09: platform-browser **141 passing** (capture-parity green over real engine), devkit 171 passing, branch-tester 422 passing, repo `tsc --noEmit` clean. Mutation-verification ran: all mutations GREEN against real outputs; its two findings (digest-gate false branch unasserted; thrown-turn `events` staleness) were closed same session with two tests (spy-through digest gate both sides; engine-throw posts `events: []`). Note — "loads with no chrome" is pinned at emitted-content level; the first real in-WKWebView load of the testing page is Phase 3's opening act.
- **Status**: DONE (2026-08-09, session 2b82b5)

### Phase 3: Cards, rail, and segments — the three-column skeleton
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: N/A — IDE UI (`tools/ide/SharpeeIDE`), judged by IDE-primacy ("what makes a great IDE"), not ADR letter.
- **Entry state**: Phase 2's testing page and extended feed exist.
- **Deliverable**: The Cards / Source / Run column skeleton per design doc §1–§4: outlined turn-card blocks (command echo + full output, `data-turn`-anchored), a distinct checkbox rail (never overlaid on text), the opening rendered as ordinal 0 (nameable beginning, no `[SKIP]` prefix), tick-to-start/tick-to-end segments with implied tinted mid-range turns, collapse-to-summary-card, merge-up and split-here restructuring, and auto-name derivation (`<start>-to-<end>-<turns>`, same-room collapse, `-2` collision suffix — naming only; the write-back is Phase 4). Plus **ADR-306 D8's session-state substrate**: the per-story sidecar (command log with fences, segment structure incl. open range, view ephemera) and restore-on-reopen by replay at `IDE_PLAY_SEED` — degraded mode per D8 (unreadable sidecar → discard, rebuild from `tests/`, never an error; ADR-306 AC-1/AC-2). Fork/lineage state joins the sidecar in Phase 5.
- **Exit state**: An author can play, range a segment by ticking start/end, see it collapse/expand/merge/split, and see the auto-derived name — against real play sessions, not the mock.
- **Status**: PENDING

### Phase 4: Assertion authoring + auto-save writer
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: N/A — IDE UI + the toolchain write path (`branch-tester`'s synthesis module, reused not reimplemented per rule 8b).
- **Entry state**: Phase 3's cards and segments exist.
- **Deliverable**: The gesture table from design doc §5 (select-text → contains, inline not-contains, Exact toggle → `[OK]` + literal block, State/Event/Channel pickers sourced from the world digest / turn events / captures — never free text) writing into the source panel, which is the editor: hover-✕ deletes a line, deleting a policy-default keeps the other default as authored, an exact block deletes whole, pruning a turn to nothing demotes it to `[SKIP]`. Plus the auto-save writer (design doc §10 item 5): a closed segment writes to `tests/` immediately, rewrites on every edit, cascades `continues:` renames on restructure, and hand-rename (Testing-tab affordance) stops auto-renaming for that file. Two ADR-306 rulings land here: the **State picker is one list with a Grouped toggle** — collapsible kind sections, live filter auto-expands folds (D6, shape pinned by `mock-state-picker.html`; AC-5) — and the **editor auto-reload/conflict-guard rule** (D9: clean buffers reload silently on tool writes, dirty buffers badge and the author chooses; one rule covering this writer, renames, and 6e policy runs; AC-3 asserts on content both sides).
- **Note**: any change to the shared synthesis module or the write path touches `packages/branch-tester` — discuss with David first. The continuous write-back intersects the open editor-refresh thread (a `tests/` file open in the editor pane goes stale on every gesture); the rule comes from Phase 1's ADR-306 Open Questions — do not improvise one here.
- **Exit state**: A real play session, ranged and gestured on, produces a correct `.transcript` file on disk with no manual save step, and restructuring renames it and its children's `continues:` lines correctly.
- **Status**: PENDING

### Phase 5: Branching — replay driver + lineage stickiness
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: N/A — IDE UI + toolchain replay (over the existing fence machinery from 6f).
- **Entry state**: Phase 3's cards exist; Phase 2's lineage-id/fork-ordinal fields exist. The "meta commands at fork points" question is RESOLVED (ADR-306 D7): ADR-305 D3 extends unchanged — no save/restore special-casing in the replay driver, lineage stickiness applies to saves, a cross-lineage restore is an ordinary visible failure (rejection test = ADR-306 AC-4). Fork/lineage state also joins D8's session sidecar here.
- **Deliverable**: **Branch…** on any card in a closed, expanded transcript; first fork at a point auto-splits the shared prefix into a collapsed parent; later uses at the same point add siblings (no limit); chip row rendering ("all continue from *parent*"); lineage stickiness (turns after a fork exist only in the branch that played them; the lineage cut hides main-lineage elements past it while an alternate is selected, restorable, nothing deleted). Mechanics: fresh boot at the pinned seed, replay of the parent's commands, then the typed command played live, arriving over the same feed as any turn.
- **Exit state**: A real branch (not the mock's placeholder) replays deterministically and lands as ordinary feed turns; switching between siblings shows exactly one coherent lineage.
- **Status**: PENDING

### Phase 6: Run column + retirements
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A — IDE UI (minimal run surface) + toolchain/IDE code removal.
- **Entry state**: Phases 4 and 5 are done — there is a working replacement before the old surface is retired.
- **Deliverable**: (1) The run column per design doc §7 — Run button, one row per transcript (branches included) with PASS/FAIL, first failure on one line, a tally; an open range doesn't run, a pending branch shows a dash. (2) Retirements per design doc §9 and §8: ADR-304's workspace modal machinery, 6f's in-page margin chrome + Create Transcript button + save panel flow + user naming, the per-turn-checkbox selection model, and the author-world golden machinery (`branch-tester`'s copied `golden.ts` and the Testing tab's "Record golden…" button) — **not** `transcript-tester`'s frozen copy (ADR-302 D15), which stays untouched.
- **Note**: deletion of existing code — per CLAUDE.md, confirm the specific files with David before removing, even though the design doc names them explicitly as superseded.
- **Exit state**: The run column answers "do my transcripts still pass?" for the real tree; the named retired code paths are gone; `transcript-tester`'s golden world is verified unaffected (its own suite still green).
- **Status**: PENDING

### Phase 7: Play to a goal — Tier 1 (reach a room)
- **Tier**: Large
- **Budget**: ~400 tool calls (deferred — not required for go-live of Phases 1–6)
- **Domain focus**: N/A — toolchain search (`branch-tester/src/search.ts`, ADR-293 D12) + IDE affordance.
- **Entry state**: Phases 3–5 are done (cards/segments/lineage exist for the found path to land into). Explicitly a later phase per design doc §10 item 6a — start only when David asks for it.
- **Deliverable**: Design doc §12 Tier 1 — BFS over real forked states to reach a picker-chosen room (blocked/conditional/computed exits are edges that fail); a measured budget with named exhaustion ("didn't reach the Vault in 400 forked turns — likely puzzle-gated"); the found path re-proven by one fresh-boot replay before display (search artifacts never leak); a "Play to…" affordance beside the prompt plays the verified path into the live surface as ordinary cards, ready to range into a test.
- **Note**: touches `packages/branch-tester` — discuss with David first. Tier 2 (possess-an-item) and Tier 3 (refused) are out of scope for this phase per the design doc's own tiering. Build against ADR-306's ADR-301 D5 scoping (Phase 1 item 6): found paths land as live cards, and the D5 document-adoption model's remaining scope (batch explorer) is whatever ADR-306 ruled — not a second, improvised adoption path.
- **Exit state**: A room-reachability goal, chosen from the IR's room picker, either lands a verified path as cards or reports named exhaustion — never a false claim of unreachability, never an unverified path shown.
- **Status**: PENDING

## Open questions — ALL RESOLVED 2026-08-09 (ADR-306, interview session 2b82b5)

| Question | Resolution |
|---|---|
| State picker at scale | **D6** — one searchable list with a Grouped toggle; collapsible kind sections; live filter auto-expands folds. Shape pinned by `mock-state-picker.html`. Phase 4 fully unblocked. |
| Meta commands at fork points | **D7** — ADR-305 D3 extends unchanged; lineage stickiness applies to saves; cross-lineage restore fails visibly (AC-4). Phase 5 unblocked. |
| Persistence of the session view | **D8** — David rejected files-only: the page's COMPLETE state is managed and restored on reopen (restore-by-replay at the pinned seed; sidecar is view truth only; degraded mode = rebuild from `tests/`). Adds real scope to Phases 3/5 (AC-1/AC-2). |
| The Testing tab's role after the revamp | **D4** — authoring (play surface) vs reading (tab); rename stays tab-side via ADR-302 D14; no golden/diff/bless surface in the author world; run column never grows toward the tab. Stood un-vetoed. |
| Editor-pane refresh under continuous auto-save | **D9** — auto-reload clean buffers, conflict-guard dirty ones; one rule for all tool-written files; closes the 6e loose thread. Phase 4's writer is fully unblocked (AC-3). |
| ADR-301 D5 scope after play-to-goal | **D5** — document-adoption governs the batch explorer only; goal search never emits proposed files, the explorer never injects live turns. Phase 7 builds against this. |
