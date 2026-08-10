# Session Plan: ADR-307 Testing Tree Model v2 — the tree is the model, files are a projection

**Created**: 2026-08-09
**Plan Status**: ACTIVE
**Overall scope**: Implement ADR-307 end to end: replace the Testing tab's
range/tick/stem model with a single card-recursive JSON tree
(`<story-id>.tests.json`) that both the Testing tab and `sharpee test --tree`
deserialize, mutate, and reserialize — checkboxes, stems, rename-cascade,
`continues:`, and the detach/diverged class all retired; tail-cut and
splice-repair-by-whole-path-replay take their place. Ends in a clean-start
cutover (no import of existing `tests/*.transcript`) that flips ADR-306's
and ADR-302's superseded status lines in the same edit set.
**Bounded contexts touched**: N/A — this codebase does not use DDD framing.
Phases are named in Sharpee's own terms: tree, card, branch, splice,
tail-cut, replay, derived label — all defined in ADR-307.
**Key domain language**: tree (the model), card (opening/boot/turn node),
branch (fork on a card), splice (repair by insert/remove + whole-path
replay), tail-cut (discard a card and its descendants), derived label
(computed display name, never persisted), seam (a failed assertion where a
story edit invalidated a recorded card).

## References consulted
- `docs/architecture/adrs/adr-307-testing-tree-model-v2.md` — the ACCEPTED ADR this plan implements; D1–D8, AC-1..AC-5, and the E2E scenario are the acceptance bar. Its "Flip owner" clause is binding: the ADR-306/ADR-302 supersession status flips land in the same edit set as the cutover phase, never earlier.
- `docs/work/testing/functional-logic-testing-surface-20260809.md` — the 39-behavior v1 write-up; its §9 addendum is what v2 supersedes (checkboxes, stems/naming, `continues:`, detach class). Open questions A and B are deleted, not answered, by ADR-307 D2; C dissolves with the checkboxes (D3). **D (is the banner title the right opening default assertion?) is NOT deleted** — defaults still synthesize under v2 and the opening card still needs one; it carries as an open item into Phase 3 rather than being silently re-answered there.
- `docs/architecture/adrs/adr-306-testing-play-surface-revamp.md` — the current shipped model; rulings 8 (range-is-a-file-from-first-tick), 13 (branch-during-open-recording), and 17 (sequential-tick-extends) are exactly what the tree model deletes. Its status line stays ACCEPTED until the cutover phase flips it — earlier phases build alongside the still-shipping v1 UI, not against a pre-flipped record.
- `docs/architecture/adrs/adr-302-transcript-branches.md` — the `continues:`-file at-rest representation for the Chord/IDE testing world (D1's stem-parent field); ADR-307 supersedes it for that world only (transcript-tester's own text format is untouched per ADR-307's header). Flip lands with the cutover phase.
- `docs/context/project-profile.md` — TS strict mode, pnpm/vitest conventions, and the established direct-source-import alias pattern (tsconfig paths + vitest alias + esbuild alias, all three wired together) constrain every `packages/branch-tester` ↔ `tools/ide/web/testing-surface` touch.
- `docs/context/session-20260809-2345-feat-testing-tab-embed.md` — most recent session; ADR-307 accepted, outgoing plan's supersession already disposed (stamped "still live," not touched by this plan); no open blockers besides the standing DerivedData-clean note for signing-rot recurrence.
- `docs/work/testing/plan-20260809-testing-surface-revamp.md` — outgoing (superseded, still live) plan. Its Phase 3/4 delivered substrate — the turn feed, the sidecar pattern (`TestingSessionStore`), the real-path xcodebuild test precedent (`TestingSurfaceRealPathTests.swift`), and the direct-source-import alias pattern for branch-tester ↔ testing-surface — is exactly what this plan's phases build on and, in the cutover phase, partially retire.
- `CLAUDE.md` (project instructions) — "Platform changes require discussion first" gates every phase touching `packages/`; rule 8b (co-located wire-type sharing) requires the tree schema to be a single shared TS file both `packages/branch-tester` and `tools/ide/web/testing-surface` import directly — not duplicated interfaces — following the alias pattern already in place for `types.ts`/`auto-assertion.ts`/`parser.ts`/`serializer.ts`.

## Ordering and dependencies

Real dependencies, not a linear pipeline:

- **Phase 1** (schema) blocks everything else — both consumers import it
  directly (rule 8b) and every AC is stated in its terms. It goes first and
  is deliberately small.
- **Phase 2** (branch-tester runtime) and **Phase 3** (testing-surface model)
  are independent of each other — both depend only on Phase 1's schema, not
  on one another's output. They can run in either order, or as parallel
  session lanes.
- **Phase 4** (IDE Swift shell) needs Phase 3's rebuilt web bundle to wrap
  and rewire the write bridge against.
- **Phase 5** (two-consumer parity / AC sign-off) needs Phase 2 (the CLI
  consumer) and Phase 4 (the tab consumer) both done — AC-2 is specifically
  about the two of them agreeing.
- **Phase 6** (cutover) needs Phase 5's AC verification green before any
  retirement code is deleted — per the ADR, the supersession flips and the
  transcript-grammar deletion are the same edit set, last.

## Phases

### Phase 1: Tree-document schema — shared wire types + round-trip
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — schema/wire-format definition.
- **Entry state**: ADR-307 ACCEPTED (done). `docs/work/testing/sample.json`
  exists as David's normalization reference.
- **Deliverable**: A single shared TS module in `packages/branch-tester/src/`
  (e.g. `tree-types.ts`) defining the card-recursive schema per ADR-307 D2:
  top level `{ version: 1, story, seed, cards }`; a card is
  `{ type: 'opening'|'boot'|'turn', command?, assertions?, skip?, branches?:
  [{ branch: <stable id>, cards }] }`; assertion families limited to
  `contains`, `notContains`, `exact`, `states`, `events`, `channels:
  {id, contains|is}`, `noDefaults`. Wired into `tools/ide/web/testing-surface`
  via the same three-point alias pattern already used for
  `types.ts`/`parser.ts` (tsconfig `paths`, `vitest.config.ts` `alias`,
  `build.mjs` alias) — no re-declaration on the surface side (rule 8b).
  Reader/writer: deterministic serialization (sorted keys, stable array
  order), `version` newer-than-known refused with a named message, malformed
  JSON degrades to a fresh empty tree without throwing (AC-4). Discovery:
  `<story-id>.tests.json` beside the `.story` file at the project root —
  added as a new lookup in `packages/devkit`'s `test-tree` command alongside
  (not yet replacing) the existing `tests/` directory discovery.
- **Note**: touches `packages/branch-tester` and `packages/devkit` — per
  CLAUDE.md MAJOR DIRECTIONS, discuss scope with David before implementation.
- **Exit state**: A hand-built multi-branch tree round-trips
  (serialize → deserialize → serialize) byte-identical in a real-path vitest
  test (AC-1); a newer-version document is refused with a named error; a
  malformed document degrades to an empty tree; `<story-id>.tests.json` is
  discoverable by both the new devkit lookup and, when built, the surface.
- **Status**: DONE (2026-08-10, session a58d1b, on David's "start phase 1").
  Delivered: `packages/branch-tester/src/tree-document.ts` (schema +
  deterministic reader/writer, ADR-307 D2's resolved form — no `root`
  wrapper, opening carries no command, single assertions object per card,
  closed grammar with unknown-key = malformed), exported from the barrel;
  `findTreeDocument` in `packages/devkit/src/commands/test-tree.ts`
  (lookup only — routes nothing yet); three-point alias wired
  (tsconfig paths / vitest alias / build.mjs alias). Evidence (2026-08-10
  00:01–00:02): branch-tester **370 passing** (+19 contract tests incl.
  AC-1 byte-identical round-trip, refusal-beats-shape, 10 malformed
  cases); devkit **171 passing, 1 skipped** (+4 discovery); surface vitest
  **120 passing** (+2 aliased round-trip) and `tsc -p` clean; dist AND
  dist-esm rebuilt (staleness trap). David confirmed mid-phase that the
  normalized (not raw sample.json) schema is the agreed one.

### Phase 2: branch-tester tree-walker — replay, assertions, branch execution
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: N/A — platform runtime (`packages/branch-tester`).
- **Entry state**: Phase 1's schema and discovery exist.
- **Deliverable**: A new replay path in `branch-tester` that walks the tree
  (Phase 1's schema) instead of `continues:`-linked transcript files:
  fresh boot + deterministic replay at the pinned seed (D5, unchanged
  mechanically); per-card assertion evaluation reusing the existing
  opening-claim evaluation and policy-default synthesis
  (`auto-assertion.ts`) unmodified in behavior; branch execution walks a
  card's `branches` array recursively (fork children replay from the
  parent's point — the "run-parent-once-children-continue" behavior derives
  from tree shape, D2); run-event stream and CLI/JSON output relabeled to
  derived labels (`opening-<room>`, `<fork room> · <command>` — D2's Q-8
  resolution) with no stem/name persistence anywhere in the new path.
  `sharpee test --tree` selects its input **by discovery**: it prefers
  `<story-id>.tests.json` when present, else falls back to the existing
  `tests/` transcript-tree walk unchanged — the still-shipping v1 Testing
  tab's Run column keeps invoking `--tree` over `tests/` until Phase 4
  replaces the tab, so the old path must keep working verbatim; the
  fallback dies in Phase 6 with the rest of the transcript grammar.
  The old transcript parser (`parser.ts`), transcript-form serializer
  (`serializer.ts`), and stem-rename/`continues:` cascade (`rename.ts`)
  stay in place serving that fallback — actual deletion is Phase 6's,
  once nothing depends on them.
- **Note**: touches `packages/branch-tester` core (runner/tree-runner) — per
  CLAUDE.md MAJOR DIRECTIONS, discuss scope with David before implementation.
  This is the largest single platform-risk phase in the plan; consider
  walking the design with David before writing code, not just flagging after.
  Design walked 2026-08-10 (session 478de5); David's ruling: **the v1 tree
  runner is deprecated — the walker is greenfield.** It carries none of v1's
  semantics (no stem identities, no header inheritance, no replay
  re-assertion, no unreached-on-assertion-failure); the transcript `tests/`
  path stays as an untouched fallback only until Phase 6 deletes it.
- **Exit state**: A real `.tests.json` tree with at least one branch runs
  through the real `sharpee test --tree` CLI against the real engine at the
  pinned seed (real-path, rule 13a — no stubbed engine) and produces
  PASS/FAIL rows with derived labels; a seeded content edit in the story
  surfaces as a failed assertion at the seam, not a crash or silent pass.
- **Status**: DONE (2026-08-10, session 478de5). Delivered greenfield (not an
  adapter over the deprecated v1 runner, per David's ruling):
  `packages/branch-tester/src/tree-walker.ts` — `runTreeDocument` walks
  lines (main line continuous, each branch fresh-boot + verbatim prefix
  replay), reuses `runTranscript` wholesale for assertions/opening/policy
  synthesis, derived labels off the live world, seams never block /
  execution errors do, replays never re-evaluate claims;
  `channelIdsReferencedBy` in the shared wire module;
  `packages/devkit/src/commands/test-tree-document.ts` (document path of
  `--tree`, refused/malformed = exit 2 named, never a silent pass),
  discovery-preferred routing in `test.ts` (explicit transcripts bypass),
  `loadAuthorGame` channels pass-through. Evidence (2026-08-10 00:37):
  branch-tester **387 passing** (+17); devkit **176 passing, 1 skipped**
  (+5, incl. the real-path suite: real chord compile → bootstrap → engine
  at seed 42, branched document, `opening-den` / `den · look` labels, seam
  = exit 1 with the branch still passing, channel claim through the full
  ADR-294 D15 chain); surface vitest **120 passing** and `tsc -p` clean;
  dist AND dist-esm rebuilt for branch-tester and devkit.
  Mutation-verification's 4 warnings (channel-chain coverage) closed
  same-session with targeted tests.

### Phase 3: Testing-surface model rewrite — the tree IS the model
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Started**: 2026-08-10 (session 01ff09)
- **Domain focus**: N/A — IDE web bundle (`tools/ide/web/testing-surface`).
- **Entry state**: Phase 1's schema exists and is importable by the surface
  via the established alias pattern.
- **Deliverable**: Rewrite `model.ts` (and the `cards.ts`/`compose.ts`
  surface as needed) so the in-memory model IS the card-recursive tree, not
  the range/segment/tick model. **Removed**: ticks, open/closed ranges,
  extension rules, the checkbox rail, stems and auto-naming, rename-cascade,
  the detach/diverged class, `continues:` composition — deleted from the
  module, not left dead. **Added**: always-recording (every played turn
  appends a card and reserializes immediately — D3); derived-label
  computation with no persisted names (D2 Q-8); tail-cut (hover ✕ on a card,
  armed-then-confirmed like the existing branch-chip ✕, discards the card
  and its descendants including branches, clears the ⌘Z stack rather than
  joining it — D4/Q-4); splice-repair validated by whole-path replay (a
  structural story edit is repaired by inserting/removing a turn, then the
  next whole-path replay re-derives every downstream card and surfaces
  invalidated claims as failures — D4). Assertion authoring gestures and
  defaults precedence carry over in spirit, retargeted to card shape.
  Serialization goes through Phase 1's shared module directly.
- **Note**: the splice MODEL operation is specified by ADR-307 D4, but its
  gesture surface is deliberately unrecorded there ("design-phase chrome").
  When this phase reaches the splice gesture, surface the design to David
  before building it — do not invent the chrome silently. Open question D
  from the functional-logic doc (the opening card's default assertion)
  carries into this phase as an open item; flag it rather than silently
  re-answering it via "defaults carry over in spirit".
- **Exit state**: A real play session driven through vitest (not the mock)
  produces a tree matching Phase 1's schema; a vitest case each for tail-cut
  and for a splice-then-replay seam; grep confirms no range/tick/stem/rename/
  `continues:` code remains reachable in the rewritten files.
- **Status**: DONE (2026-08-10, session 01ff09). Delivered: `model.ts`
  rewritten as `TreeSessionModel` (live TreeDocument + session-only
  ordinal↔card binding; always-recording, binding replay for
  restore/repair, branch/tail-cut/splice as structure ops, v1 narrowing
  semantics on card assertions, card-keyed authoring undo); `compose.ts`
  rewritten as the display-line composer (no serializer/parser imports —
  Phase 6 unblocked; `src/shims/fs.ts` now dead, on the Phase 6 delete
  list); `cards.ts` rewritten (rail/strips/summaries/collapse gone; card ✕
  tail-cut armed like the chip ✕; path-ordered rendering; run column keyed
  by derived labels); `main.ts` rewritten (single-document post, D7
  view-state sidecar, restore/restart = whole-tree replay, refused document
  = named notice + write-lock). **Open question D resolved by David
  (2026-08-10): opening defaults = prologue, title, description (no id)** —
  shared `synthesizeOpeningAssertions` in branch-tester's
  `auto-assertion.ts`, evaluated live by the runner for claim-less
  openings, rendered/narrowed by the tab (`removeOpeningDefault`); devkit
  always captures `prologue`+`info`; `channelIdsReferencedBy` base-maps
  dotted ids and the walker splits them into channelId+channelPath; label
  formatting shared via `tree-document.ts` helpers. **Splice gesture chrome
  NOT built** — model ops + tests only, per the phase note; David has not
  yet ruled on the proposed chrome (hover `+` between cards / armed
  `remove turn`) — carry to Phase 4/5. Evidence (2026-08-10 07:45–07:52):
  branch-tester **396 passing** (+9); devkit **177 passing, 1 skipped**
  (+2: opening defaults fire through the real CLI as a passing `(opening)`
  row; wrong-value `info.title` opening claim exits 1 citing the channel);
  surface **49 passing** (model 24 + compose 11 rewritten, real-path 3 new:
  real chord compile → bootstrap → engine at seed 42 through compiled dist,
  document round-trip + walker parity with identical labels, splice seam =
  failed claim with branch still passing, tail-cut clean) and `tsc -p`
  clean; grep: no range/tick/stem/rename/`continues:` code reachable
  (doc-comments describing the deletion only); dist AND dist-esm rebuilt
  for branch-tester + devkit; `tsf build --npm` green for both.
  Mutation-verification: 1 warning (CLI opening-defaults coverage) closed
  same-session with the two devkit tests above. The web bundle is NOT
  rebuilt into `Resources/` — deliberate; the shipped v1 tab keeps working
  until Phase 4 swaps it.

### Phase 4: IDE shell — checkboxes gone, sidecar shrinks, single-document write bridge
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Started**: 2026-08-10 (session 01ff09)
- **Domain focus**: N/A — IDE UI (`tools/ide/SharpeeIDE`), judged by
  IDE-primacy per the project direction notes.
- **Entry state**: Phase 3's rebuilt web bundle exists and is rebuilt into
  `tools/ide/SharpeeIDE/Resources/testing-surface/`.
- **Deliverable**: `TestingSurfaceViewController` drops the checkbox rail
  entirely (D3). `TestingSessionStore` (Swift) shrinks to view-state-only
  ephemera (active lineage, collapse state, save/restore dialog outcomes) —
  commands, structure, claims, and seed move out of the sidecar and into the
  tree document; the sidecar carries nothing the tree can re-derive (D7).
  The write bridge targets the single `<story-id>.tests.json` via Phase 3's
  serializer instead of per-segment `tests/*.transcript` writes. The
  tail-cut gesture (hover ✕ on the card) and the retargeted branch gesture
  (D5, mechanically unchanged) wire into the real webview.
- **Exit state**: A real fernhill (or equivalent) play session in a real IDE
  window produces `<story-id>.tests.json` at the project root with no writes
  under `tests/`; closing and reopening the project deserializes and replays
  to an identical board (AC-1 through the real driver, matching the ADR's
  E2E scenario's reopen step) — proven by a real-path xcodebuild test
  extending the existing `TestingSurfaceRealPathTests.swift` pattern, not a
  stubbed store.
- **Note**: if signing/Runningboard errors appear mid-phase, go straight to
  a full DerivedData clean (recurred 3+ times per prior sessions) rather
  than iterating around it.
- **Status**: DONE (2026-08-10, session 01ff09; no signing rot this time).
  Delivered: web bundle rebuilt into `Resources/testing-surface/` (the v2
  tab ships); `TestingSessionStore` v3 — view state only, command log gone
  (D7); `TestingSurfaceViewController` — `testDocumentURL` replaces
  `testsDirectory`, boot payload = document text + story id (the `.story`
  STEM, discovery's key) + pinned seed + policy + view state, write bridge
  = atomic whole-document writes, per-segment write/rename/`continues:`
  cascade/re-hydration code deleted, turnEvents forwards without logging;
  `MainWindow` opener wires the document beside the `.story` file;
  `main.ts` gained the author-restart ack-turn strip (the client's restart
  ack is mechanics, not a recorded card). Two Phase 2 stream gaps surfaced
  by the first real consumer and fixed in `test-tree-document.ts`:
  `transcript-end` now stamps the derived label (walker results carry no
  filePath), and line starts no longer carry `replayed: true` (on the wire
  it means "state rebuild, not a row" — every branch line was being
  silently dropped from the column). Tests rebuilt around the document:
  `TestingSessionStoreTests` (6) and `TestingSurfaceRealPathTests` (16 —
  always-recording into the document, opening defaults + narrowing from
  real boot captures, branch/chip-delete/tail-cut against the document,
  author restart replay + ack strip, reopen to a byte-identical document
  (AC-1 through the real driver), refused = notice + write-lock and
  malformed = fresh tree (AC-4), D7 sidecar shape, run column over the
  real CLI's document path keyed by derived labels, real-fernhill session
  incl. document content and `fountain-court · east` chip). Evidence
  (2026-08-10 08:10–08:11): surface real-path suite passed; full IDE suite
  **474 passing, 0 failures** (was 488 — the retired v1 range/tick tests
  left with their machinery); devkit **177 passing, 1 skipped** after the
  stream fixes; devkit dist + dist-esm rebuilt. Mutation-verification
  clean (advisory: MainWindow's stem derivation verified transitively;
  the Phase 5 click-through exercises the real opener). Carry-over for
  Phase 5: the tab tally counts COMMANDS ("2 passing, 1 failures") while
  the CLI human report counts LINES ("1 passed, 1 failed") — check during
  AC-2 parity; splice gesture chrome still awaits David's ruling.

### Phase 5: Two-consumer parity — AC sign-off and the E2E scenario
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A — cross-package integration verification, spanning
  `packages/branch-tester` (Phase 2) and the IDE tab (Phase 4).
- **Entry state**: Phase 2 and Phase 4 both done and green independently.
- **Deliverable**: The ADR's full acceptance bar proven end to end, not
  per-package: **AC-2** — a suite authored in the real Testing tab runs
  green in the real `sharpee test --tree` CLI with identical derived labels
  and failure citations (byte-level document identity, not "close enough").
  **AC-3** — tail-cut, splice-in/out, and branch, each followed by a whole-
  path replay, yield exactly the specified tree with seams as failed
  assertions, never corruption or lost nodes (one real-path test per
  gesture, run through the real CLI). The **ADR's E2E scenario verbatim**:
  play fernhill in the tab (three norths → opening/boot/turn cards); branch
  from turn 2 with `east`; tail-cut the main line's turn 3; close and reopen
  the project (replay to identical board); Run shows `opening-iron-gates`
  and `gravel-drive · east` rows with PASS and turn counts; edit a room
  description, rebuild, Run again — only that turn's contains assertion
  fails.
- **Exit state**: AC-1 through AC-4 all independently verified with cited
  evidence (test names + pass counts, dated); the E2E scenario walked as a
  real click-through in the IDE, not simulated.
- **Status**: PENDING

### Phase 6: Cutover — retire transcript grammar, flip supersession status lines
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A — deletion + ADR status maintenance, plain technical.
- **Entry state**: Phase 5's AC-1..AC-4 verified green.
- **Deliverable**: Clean-start cutover per D8 — **no import of existing
  `tests/*.transcript` suites**; any suite worth keeping is re-played into
  the tree by hand (replay makes that cheap) before this phase deletes the
  source. Remove `tests/` directory discovery entirely from `devkit` and
  `branch-tester` (Phase 1's coexisting lookup becomes the only one). Delete
  the retired transcript parser (`parser.ts`), transcript-form serializer
  (`serializer.ts`), and stem-rename/`continues:` cascade (`rename.ts`) from
  `branch-tester` — verified by AC-5 (grep confirms no transcript-grammar
  code remains reachable; `transcript-tester`'s own suite, untouched per the
  ADR's header, still green). Flip status lines in the same edit set:
  ADR-306's status line marked SUPERSEDED in part, pointing to ADR-307 —
  covering **the range/tick model (design §3) AND click-through rulings
  8/13/17 where they concern ticking**, per ADR-307's Supersedes line;
  ADR-302's D1 at-rest representation marked SUPERSEDED for the
  Chord/IDE testing world (its text-format use elsewhere, if any, is
  untouched per ADR-307's own scoping); `functional-logic-testing-surface-
  20260809.md`'s v1 sections (§1–§8) gain superseded markers pointing at
  ADR-307's §9 successor note.
- **Note**: the deletions touch `packages/branch-tester` and
  `packages/devkit` — per CLAUDE.md MAJOR DIRECTIONS, confirm the delete
  list with David before removing files (rule: never delete files without
  confirmation, even "to get a build working").
- **Exit state**: AC-5 fully verified — scoped to the Chord/IDE testing
  world: no `tests/` discovery remains in `branch-tester`, `devkit`, or the
  IDE surface (`transcript-tester`'s world is untouched — Dungeo's
  `stories/dungeo/tests/transcripts/` stays read by v1 indefinitely per
  ADR-302 D9/D12 and ADR-307's Untouched header);
  `transcript-tester`'s suite still green;
  ADR-306/ADR-302 status lines flipped; David has signed off on the E2E
  click-through as the acceptance gate for closing this plan.
- **Status**: PENDING
