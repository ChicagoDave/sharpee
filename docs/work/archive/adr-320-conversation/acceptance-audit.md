# ADR-320 Acceptance Audit (Phase 11)

**Date**: 2026-08-18 (session ade288). Every suite and transcript below was re-run
this session against a fresh `./repokit build dungeo` bundle — no evidence is cited
from memory. "Unit" means package tests, "bundle" means a transcript through
`dist/cli/sharpee.js`, all at their pinned seeds (single run per ADR-293 Phase D).
The AC→beat construction map is `phase10-story-traceability.md`; this audit is the
re-run discharge record.

## Suite runs backing the rows (all 2026-08-18)

| Run | Result |
|---|---|
| `./repokit build dungeo` | clean |
| Ides of March unit transcripts (incl. new `thread-wire`) | **212 passing** in 18 transcripts |
| Ides `wt-01-the-errand` walkthrough (`--chain`) | **34 passing** |
| thealderman transcripts | **75 passing** in 9 |
| Dungeo walkthrough chain | **952 passing** in 17 |
| character-acceptance: b1 group (base + 2 variants) | **15 passing** (8+1+6) |
| character-acceptance: b3 group | **63 passing** in 5 |
| character-acceptance: p8/p9 group | **19 passing** in 7 |
| character-acceptance: p10 group | **21 passing** in 4 |
| Fernhill cards (`./sharpee test branch-stories/fernhill`) | **9 cards, 18 assertions passing** |
| Unit suites | chord 909, world-model 1492, character 563, story-loader 561, stdlib 1633, engine 633, parser-en-us 324, bootstrap 43, testing-surface 89, `pnpm test:scripts` 11 — all passing |
| `npx turbo run test:ci` | 65/65 tasks successful |
| `npx tsc --noEmit` (repo-wide) | clean |

## AC-by-AC

| AC | Criterion (short) | Status | Evidence (2026-08-18 runs) |
|----|-------------------|--------|----------------------------|
| 1 | Scene lifecycle round trip; boundary rows by first-time/return/absence; rejection: conditioned row never fires | **DISCHARGED** | Bundle: ides `first-day` (first-time greetings ×3), `boundaries` (again-so-soon vs after-days — the same pair's row selection flips on the gap, so the not-holding row provably never fires), `wt-01` (re-approach across three days). Unit: `character/tests/conversation/lifecycle.test.ts`, `scene-runtime.test.ts`. |
| 2 | Exchange overlay: `then asks` opens; innermost-wins while open; close reverts; rejection: unmatched input falls through, no crash/swallow | **DISCHARGED** | Bundle: ides `first-day` (who-are-you grip wins over the same-key table row, table serves after close — the fall-through leg), `wire` (open/advertise/close on the wire). Unit: `character/tests/conversation/scene-dispatch.test.ts`, `story-loader/tests/adr-320-phase8.test.ts`. |
| 3 | Manner fallback; hand-written rows untouched; beats never repeat back-to-back. Cost leg: no-constructs story compiles byte-identically | **DISCHARGED** | Bundle: ides `wire` (manner beats ride the utterances), `wt-01` (cheerful→stung flip). Unit: `character/tests/conversation/manner.test.ts` (rotation, no back-to-back repeat). **Cost leg measured 2026-08-18** against a cold-start worktree build of the branch point (`3d68bb96`): `cloak.story` (102 lines, zero manner/scene/conversation constructs, unchanged on the branch) and `fernhill.story` (65 entities, likewise zero constructs) composed by main's chord (3.0.0) vs branch's chord (3.3.0) — each IR diff is **exactly the one `languageVersion` line**, zero other diff lines (the version stamp moves by design; the Phase 10.1 golden snapshots moved on it alone). |
| 4 | Time words: recency fires only while fresh; absence words pick the greeting; one clock seam | **DISCHARGED** | Bundle: ides `boundaries` (absence greetings), `wt-01` (Kemp's rose refused while the blow-up is fresh — "Not NOW" — then served after cooling), `threads-defection` (negated recency gates the beat). Unit: `character/tests/conversation/constraint-evaluator.test.ts` (recency/aging through the clock seam). |
| 5 | Initiative by disposition; circumstance flips it; authored row forces regardless | **DISCHARGED** | Bundle: ides `interruption` (Kemp's open-floor interject "NOT on these boards"; Burbage's `on harm` forcing row), `wt-01` (stung Kemp holds his tongue — the circumstance flip on the same character's authored rows). Unit: `character/tests/conversation/initiative.test.ts`, `scene-scoring.test.ts`. |
| 6 | `assertive` yields after protest; `blocking` does not; world act breaks even blocking | **DISCHARGED** | Bundle: ides `interruption` — the blocking who-are-you grip refuses the steer, then the witnessed attack (D8 world-act exemption) breaks it and the table serves after. Unit: `character/tests/conversation/scene-dispatch.test.ts` strength ladder. |
| 7 | World-bounded exit (rejection); silence renders as a manner-colored, witnessed response | **DISCHARGED** | Bundle: ides `cornered` (legal exit through the open door; silence as the always-available answer) + `cornered-locked` (the locked tiring-house door refuses the whole `leave` row — the rejection leg — and the default evasion stands). |
| 8 | NPC↔NPC scenes emit text only when observable; unobserved effects still land | **DISCHARGED** | Bundle: ides `earshot-effects` (blow-up witnessed same-room; the unheard confer's fact still lands, read back via Burbage's `when it knows no-clown-part` answer); character-acceptance p8 group (earshot grading same-room/adjacent, effects-land, intrusion — 19 passing incl. p9-wire). |
| 9 | Player claims land in ledgers, travel, expose contradictions (asserted on ledger state) | **DISCHARGED** | Bundle: ides `claims-return` (TELL Burbage → spreads-to-trusted → Kemp's `when it knows norwich` comeback in Kemp's voice), `first-day` (idle variant before travel). Unit: `character/tests/propagation/propagation.test.ts` (ledger-state assertions). |
| 10 | `was discussed` holds across scenes, any order, save/restore; `subject changes` on abandonment | **DISCHARGED** | Bundle: ides `wt-01` (grievance discussed in the tavern gates the offer next day), `first-day` ("You steer" — the condition-form subject-change), `thread-save`/`thread-restore` (the discussed-gated thread state survives $save/$restore). Known limit: initiative-occasion subject-change is issue #275 (condition form works and is what stories use). |
| 11 | Open exchange advertises structured wire data; player build carries no scene internals | **DISCHARGED** | Bundle: ides `wire` (scene + exchange-affordances channels: opened, rowIds, answers, the inalienable silence, clear-on-close) and **new `thread-wire`** (8 steps, first-run green 2026-08-18: thread-opened/beat/parked/resumed on the scene channel; `thread-affordances` continuability advertised, cleared on park, restored on resume); p9-wire through the p8 fixture. Isolation: `engine/tests/integration/channel-bootstrap.test.ts` (player profile provably carries neither `scene` nor `thread-affordances` — AC11 exclusion sweep), `bootstrap` assemble-channels both directions (43 passing), `stdlib/tests/channels/scene.test.ts` gate pins (`gatedBy: 'authorChannels'` on scene, exchange-affordances, and thread-affordances). |
| 12 | Mid-scene save/restore continues byte-identically at the pinned seed | **DISCHARGED** | Bundle: ides `mid-exchange-save`/`mid-exchange-restore` golden pair and `thread-save`/`thread-restore` (mid-thread), character-acceptance `p8-save`/`p8-saved-restore` and `p10-save`/`p10-saved-restore` — each pair runs in one invocation, the restore leg serving the golden lines recorded by the save leg. Unit: story-loader real-`SaveRestoreService` legs (ACTIVE mid-beat deep-equal restore; PARKED resume with `on resuming:`). |
| 13 | The demonstration story plays end-to-end via the bundle, every construct exercised | **DISCHARGED** | `wt-01-the-errand` — 34 passing, the whole three-day arc to the win through `dist/cli/sharpee.js` at seed 42; construct→beat coverage per `phase10-story-traceability.md`; the 18-transcript unit suite (212 passing) pins every construct family individually. |
| 14 | Threads: beats advance on both paths; blocking refuses via `on refusing:` (re-serve when absent); park/resume across scene close, day, save/restore; `is concluded` false-before/true-after on persisted state; lifecycle + continuability on the D12 wire. Rejections: `opens when` false never opens; concluded thread never re-claims | **DISCHARGED** | Bundle: ides `threads-defection` (28 — blocking matrix with authored `on refusing:`, NPC self-open only after its `opens when` holds — the never-opens-while-false leg — all four prompt forms, exchange-holds precedence, is-concluded false-before/true-after), `threads-suspicion` (20 — passive park with rendered `on parting`, resume same-sitting and across the night into another room, prompt-driven conclusion), `threads-drilling` (11 — repeat-second without `on refusing:`, **inert after conclusion** — the never-re-claims leg), `thread-save`/`thread-restore`, `thread-wire` (lifecycle + continuability on the wire), character-acceptance p10 group (21 — continuation prompts advance the real cursor, park-across-day, save/restore). Unit: `chord/tests/adr-320-threads.test.ts` (16 — grammar/IR gates, `is concluded` lowering), `story-loader/tests/adr-320-phase10-threads.test.ts` (dispatch precedence, held gates, tick one-move-per-turn, resume cycle-stamp, surplus-phrase re-typing), `character/tests/conversation/thread-runtime.test.ts`, `parser-en-us/tests/adr-320-continuation-prompts.test.ts` (13 — the four frozen forms, no-widening pins). |

## Regression legs (Phase 11 deliverables beyond the AC table)

- **Dungeo chain**: 952 passing in 17 transcripts at the pinned seed, single run
  (run-twice retired, ADR-293 Phase D). The chain's exact-output assertions pin the
  bytes; Dungeo (TypeScript story, no Chord constructs) is untouched by ADR-320.
- **Fernhill**: 9 cards / 18 assertions passing via `./sharpee test`; its compiled IR
  vs the branch point differs only on `languageVersion` (cost-leg row above).
- **Whole-platform**: `npx turbo run test:ci` 65/65; the nine load-bearing suites
  additionally re-run cache-free (table above); repo-wide `npx tsc --noEmit` clean.

## ADR-142 supersession

The stamp ("Status: SUPERSEDED by ADR-320 (2026-08-16)") is accurate to the shipped
implementation with one range correction made this session: the replacement range
read "D4–D13", written before D14 existed. ADR-142's NPC-continuation sketch (an NPC
continuing unprompted on subsequent turns; intent/strength flow) is exactly what
D14's conversation threads now implement, so the line was widened to **D4–D14** with
the continuation→threads mapping named inline. No construction divergence from what
D4/D14 promised was found — the two reaffirmed principles (conversation as a
projection of character state; no procedural generation) hold: threads are authored
beats gated by authored conditions, selected by character state.

## Amendment — the evidence was re-homed, not lost (2026-08-18, session ade288)

**Every row above that cites an `ides-of-march` `.transcript` cites a file that
no longer exists.** Later the same day, David ruled that Chord stories do not
get v1 transcript tests ("we're never building v1 tests for Chord again"), and
Ides moved from `stories/` to `branch-stories/` — the tree-harness side, per
ADR-302 D16, where the directory *is* the harness assignment. Its 19
`.transcript` files were deleted with his authorization. They could not have
followed: the bundle routes harness by directory, and the branch tester has no
transcript parser at all (ADR-307 deleted it), so they were unrunnable the
moment they moved.

**This does not reopen any criterion.** Every run recorded above happened, on
the date recorded, against the files as they then stood — that is what an
audit is. What changed afterward is where Ides' coverage lives, not whether
these criteria were discharged.

Coverage now sits in `branch-stories/ides-of-march/ides-of-march.tests.json` —
a recorded tree of **38 cards / 45 assertions across 75 commands**, generated
from a real bundle run by `scripts/make-story-artifacts.mjs` and re-runnable
with `sharpee test branch-stories/ides-of-march`. It covers the full winning
arc plus three branches. It does **not** yet cover everything the retired 212
transcript steps did: the thread transition matrix, the mid-thread and
mid-exchange save/restore golden pairs, and the `[CHANNEL:]` wire assertions
have no tree equivalent yet. Anyone re-verifying AC 10–14 from scratch should
read that as the honest gap rather than assuming the tree is a superset.

## Verdict (2026-08-18, session ade288)

All 14 ADR-320 acceptance criteria are **DISCHARGED**, evidence re-run this session
and inline per row. The acceptance section owes nothing further. Known limits riding
as filed platform issues, not acceptance gaps: #273 (initiative-row `then asks` on
the seize path), #274 (ending phrase double-render, pre-existing), #275
(subject-change initiative occasions for player scenes; the condition form works).
