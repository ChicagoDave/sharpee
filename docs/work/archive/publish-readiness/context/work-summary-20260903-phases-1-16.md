# Work Summary — Publish-readiness defects (Sharpee 5.2.0 + Chord Writer), Phases 1-16

**Date:** 2026-09-03
**Branch:** feat/adr-321-world-index
**Target:** `docs/work/publish-readiness/`
**Plan:** `docs/work/publish-readiness/plan.md`
**Proposal:** `docs/proposals/publish-readiness-defects.md` (44 items; per-phase "Phase N landed" lines carry the authoritative DONE list — do not trust any recap without checking it)
**Session:** `docs/context/session-20260903-0432-feat-adr-321-world-index.md` (full chronological record)

## Goal

David, 2026-09-03 04:30 CDT, going to bed: "you can work through phases and commit in between." Autonomous run through the 18-phase plan closing the publish-readiness punch list that gates a formal `@sharpee/*@5.2.0` + Chord Writer publish.

## Commits (Phases 1-16, in order)

`0e5697f4` (1) · `10eae625` (2) · `a67e4e83` (3) · `dac5dcf5` (4) · `e4267406` (5) · `0b298f01` (6) · `bd204663` (7) · `8c646c36` (9) · `34a05754` (10) · `1b22b301` (11) · `c5a4896e` (12) · `98980681` (13-15). **Phase 16 is on disk, uncommitted** (website testing reference + media guide + nav + getting-started rewrite) — the calling session did not commit it before this summary was written.

## Phase-by-phase (one line each; full detail in plan.md's per-phase Outcome and the session file)

- **Phase 1 — DONE (drafted, acceptance pending)**: five ADR amendments drafted DRAFT (ADR-118 A1, ADR-267 A1, ADR-320 D2a, ADR-325 Z6, ADR-225 one-input expiry) plus rulings for #312/#313/#314; nothing here ships until David accepts.
- **Phase 2 — DONE**: one-way exits, first-visit arrival description, authorial-move describes, worn invariant at `moveEntity`, `x me` detail, #329 confirmed already-fixed. P-1/P-2/P-3/P-9/P-10/P-12 DONE.
- **Phase 3 — DONE**: possessive names, `with`/`when` ordering, bare-hint binder, `Span.file` in inline kill keys, canonical direction mapping. P-4/P-5/P-6/P-13/P-14/P-15 DONE.
- **Phase 4 — DONE (ADR acceptance pending)**: `remove` now marks entities gone (offstage through the move lifecycle, terminal for TS stories); story-rule failures render their own message. ADR-325 Z6 amendment DRAFT. P-7/P-8 DONE.
- **Phase 5 — DONE**: parse-time visible/touchable bases include the actor (#312); `taking` resolves at VISIBLE with REACHABLE preference, a default-flip refusal behavior (#313); `OpenInventoryTrait` opt-in. P-16/P-18 DONE.
- **Phase 6 — DONE (P-11 deferred to 6a)**: dialogue-only predicates gated at compile (#349), `leave` applied on the floor-turn path, `to|with` shape alternation (#351); tick-order audit closed — one corpus clause, already covered by ADR-332 D4a. P-17 DONE.
- **Phase 7 — DONE**: `take :item from :container` and `get … from` grammar shapes added; re-wear half already closed by Phase 2. P-19 DONE.
- **Phase 8 — PENDING**, blocked on ADR-267 A1 acceptance; skipped this run per its entry state.
- **Phase 9 — DONE (ADR acceptance pending)**: held-command clarification follow-up — a bare noun after a missing-object prompt completes the command; two parser bugs fixed on the way (bare-verb misclassification, failure-classifier ranking). ADR-225 amendment DRAFT. P-20 DONE. Language freeze declared under P-44 (`only while` carve-out).
- **Phase 10 — DONE**: instrument-typed slot seating, `properName` article suppression, blocked-event pronoun referent, inventory list-line noun phrase, `looking` message templates + 21 dead `requiredMessages` pruned, #206 thief-fight root cause fixed in `CommandValidator.resolveEntity`. P-22/P-24/P-25/P-30/P-31/P-32 DONE.
- **Phase 11 — DONE (P-29 slice deferred)**: going's arrival lists open containers'/supporters' contents (14 Dungeo goldens, +110 lines, content-only — see Flagged content changes below); `answering` and `saying_goodbye` actions + grammar; implicit single-tool resolution. P-23/P-26/P-27/P-28 DONE; P-29 stays PROPOSED on ADR-320 D2a. Secret Letter port gap filed as **GH #356** (bare answers no longer count as asks against the stallkeepers' patience counter — David's call on the mechanic).
- **Phase 12 — DONE**: seven Fernhill defects (#245) — storyOver gates daemons post-ending, vine phrase-detail sentences, exact-out-of-scope head-word qualification, door-opening veto in going, `hidden_at` line, Smoke story-level clause; three Dungeo golden lines gained articles (content-only, see below). P-33 DONE.
- **Phase 13 — DONE**: `buildBrowser({ menu })` + `--no-menu` default (consequence stated), IDE Publish tab checkbox; #195 closed as already-built. P-35/P-36 DONE.
- **Phase 14 — DONE for P-38; P-37 deferred to David**: seed fixture migrated to ADR-327 player role, `pnpm test:scripts` green. P-37 (#224 tutorial editions) is an edition decision — 163/187 type errors across every chapter checkpoint of both editions, options sized in the plan. IDE compiled and signed the Phase 13 Swift test changes, but `xcodebuild`'s test runner hung before connecting on a shielded screen — the two new tests (`PublishTabTests`, `BuildRunnerTests`) have not run.
- **Phase 15 — DONE for #240 only**: `sharpee play` is pipe-safe (async readline iterator). #239 superseded by ADR-307 pending David's ruling (no goldens on the tree document, no `--bless` message name). #231 cloak-of-darkness: delete list posted in the plan, awaiting David's confirmation before anything is removed (CLAUDE.md: never delete without confirmation).
- **Phase 16 — DONE, uncommitted**: new site page `chord/guide/tooling/sharpee-test` (the tree-document reference — shape, seed, cards/branches/skip, six claim families, `auto-assertion:`, flags, exit codes), verified against a scratch story+document (6 cards / 16 assertions passing); getting-started's transcript section rewritten off `--chain`; new guide `world/sound-music-and-images`; two nav entries; Chord Writer testing page linked. P-39/P-42 DONE.

## Flagged content changes (Dungeo rendered text — not a mechanical refactor)

- **Phase 11**: 14 walkthrough goldens gained "In/On … you see …" lines on arrival at rooms with open containers/supporters (110 lines added, nothing else changed).
- **Phase 12**: three reveal-line goldens gained articles in `container_contents` output (noun-phrase rendering fix).

Both are default-flip consequences of platform fixes, not authored Dungeo edits — recorded here per CLAUDE.md's rule that a platform default changing Dungeo's rendered text is its own decision, never buried in a list.

## Proposal items closed this session (per plan's per-phase "landed" lines — verify against `docs/proposals/publish-readiness-defects.md` before citing further)

P-1 P-2 P-3 P-4 P-5 P-6 P-7 P-8 P-9 P-10 P-12 P-13 P-14 P-15 P-16 P-17 P-18 P-19 P-20 P-22 P-23 P-24 P-25 P-26 P-27 P-28 P-30 P-31 P-32 P-33 P-35 P-36 P-38 P-39 P-42, plus #240 within P-41. (P-34 was already DONE before this session, from an earlier plan.) Proposal file is NOT modified by this summary (ADR-0008) — the flip from PLANNED to DONE happened per-phase in the session's own commits.

## Open items — all David's

1. Accept or amend five DRAFT ADR amendments: ADR-118 A1 (own-block-first open question), ADR-267 A1 (spelling open question), ADR-320 D2a, ADR-325 Z6, ADR-225 (one-input expiry). These gate P-11/P-21/P-29 — plan Phases 6a, 8, and Phase 11's #242 slice.
2. P-37 (#224 tutorial editions) — an edition decision; sizing is in the plan's Phase 14 outcome.
3. #231 (cloak-of-darkness) — delete list posted in the plan, awaiting confirmation before deletion.
4. #239 — superseded by ADR-307 pending David's ruling (no separate ADR vs. addendum).
5. IDE: `PublishTabTests`/`BuildRunnerTests` compiled and signed but could not run — `xcodebuild`'s test runner hung before connecting with the screen shielded. Needs an at-the-keyboard run.
6. Phases 17 (outside-repo proof, P-43) and 18 (the publish, P-44) are both explicitly David's steps per the plan.
7. GH #356 — Secret Letter stallkeepers' patience-counter mechanic (David's call).

## Status

INCOMPLETE. Phases 1-16 of 18 run; Phase 16 uncommitted on disk. Every remaining blocker is a decision or an at-the-keyboard action that belongs to David, not further autonomous work.
