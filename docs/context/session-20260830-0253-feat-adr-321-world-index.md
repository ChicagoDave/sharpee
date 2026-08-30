# Session Summary: 2026-08-30 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Secret Letter port, Phase 6 (CURRENT): the next structural increment after the noisy banana theft (`c862eafb`), David: "Continue" — chosen from the runway file's held list: the four cables, then the source's aftermath of a landing (Market Escape).
- Standing rule ruled mid-session (David): **"whatever the original source does and if there's a gap, then I want to know."** The source's behaviour is the default; every divergence or silence is reported, not decided.
- Content authority unchanged: structural work is Claude's; every line of prose is Gentry's carried verbatim or David's PLACEHOLDER.

## Completed
- **The four cables** (`aerial-runway.chord`): the source's named cables and landing table (`story.ni:3728-3830`). Northeast carries the designed two-turn path; southeast → Hat Stall, southwest → Exotic Gems Stall, northwest → Northwest Junction are single-turn slides running Gentry's whole block and landing her — no death, as the source. Per-cable description, the monkey on the southeast cable (detail + leap), the chase shouts sentence on every landing, the cable refusals (climb/cut/push/pull, monkey chatter on the southeast pair), the post's diagonal exits, the `slide down northeast cable with cloak` phrasing (instrument slot).
- **Bare `slide down cables` defaults southeast — RULED (David, 03:35 CDT)**: the collective composes `slides-to-hat-stall`; the tree's eight designed-path cards now name the northeast cable.
- **Market Escape** (`mercenaries.chord`, `story.ni:4132-4200`): opened by a seen landing in `chase` — row one on the landing turn, rows 2–5 as the `market-escape` timer's named turns, capture at expiry (row six + the captain's death); talking refused; alley and north gates refused with the scene's lines; the tent barred with the "planted themselves outside it" throw to a random adjacent stall; the sprint line on every move; reset at Commerce Street. Probe at seed 1209: landing turn 86 → capture turn 91, exactly the source's six rows.
- **Fixed on probes**: a held Jack could slide away (slide clauses now refuse `merc-held`); the cloak could not be picked up after a landing (take-refusal gated on `has`, not `wears`).
- **Tree**: `./sharpee test branch-stories/secret-letter` — **313 cards passing, 544 assertions passing, 0 failing** at seed 1209 (2026-08-30 03:50 CDT); baseline 275/428 (`c862eafb`).

## Key Decisions
- Landings behave as the source: no instant death on the three other cables (my earlier reading — sharing the ride-out's death — withdrawn under David's rule); their spool ending in capture is RULED intentional — only the northeast wire escapes. The ride-out landing keeps David's ruled instant death and opens no spool.
- Blocked-line ordering: `escape-north` placed before the chase line on the Northwest Junction — first condition wins.
- No ADR written or amended; no platform code touched.

## Open Items
- **RULED (David, 03:58 CDT): "the other three scenarios are intentional — only the one wire is the escape route."** Gaps 1 and 2 below are closed as built; recorded in the change document ("The other three cables").
1. **Seen landings are a slow death in the remake.** In the source every landing is survivable (the silk cloak is worn anywhere, then east). In the remake the change happens only Behind Fruit Stall and the east exit is watched while urchin, so from the three seen landings Market Escape can only end in capture. Options are David's: share the ride-out's instant death, open a change window, or leave the source's slow one (built).
2. **Two pressure models side by side**: the remake's ruled windows (`lingering`/`exposure`) on the designed path, the source's one spool on the other landings. The source ran one spool for every landing.
3. Previous readings still standing: fruit-stall unblocked; the first-theft opener.
- **Platform filed**: GH #333 (parser seats slots by position — instrument-first shapes never reach the target; `hang … on` is also stdlib's putting shape); GH #334 (an authorial `move` of a worn item leaves its worn flag set — `wears` stays true off-body; taking it back puts it on worn).
- Noted seams: no slot test in a must-line (a non-cloak instrument slides on the cloak); no visited condition (the cable description's landing-name tail); no stdlib untying; the tent throw lands her unnamed until `look` (#331); the stealing refusal during the spool has no consumer.

## Files Modified
- `branch-stories/secret-letter/aerial-runway.chord` — the four cables, landing traits, phrases, header (rulings, gaps, #333)
- `branch-stories/secret-letter/mercenaries.chord` — Market Escape (timer, expiry, phrases), `wary`'s fourth refusal
- `branch-stories/secret-letter/grubbers-market.chord` — the post's diagonal exits; the junction's escape refusals; the tent barred and the throw
- `branch-stories/secret-letter/secret-letter.story` — the player's merged `after going` (sprint line); the cloak's take-refusal gated on `has` (#334)
- `branch-stories/secret-letter/disguise.chord` — Commerce Street resets the spool
- `branch-stories/secret-letter/secret-letter.tests.json` — eight cards renamed, ten new branches (313 cards / 544 assertions)
- `docs/work/secret-letter-port/plan.md` — Phase 6 progress note
- `docs/work/secret-letter-port/change-document.md` — "The other three cables" ruling, the southeast default, the standing source-first rule
- `docs/context/session-20260830-0253-feat-adr-321-world-index.md` (this file)

## Notes
- Session started: 2026-08-30 02:53 CDT (session 94cc71)
- Rule 15 does not fire for `.chord`/`.story`; the tree's `states:` pins carry the mutation checks (`player.location`/`cloak.location` at each landing; `cloak.location = player` after retrieval; `player.location = Top of the Post` on the held refusal; `story.state` at the hunted and chase landings).
- Probe harness reused from session eec23b (`probe.mjs`, repointed); tree edited programmatically (`retree-cables.mjs` v2 against the committed tree).

**Session duration**: ~1h07m (02:53 CDT – ~04:00 CDT 2026-08-30).

**Approach**: Content authoring against the accepted platform (structure only, David's prose as PLACEHOLDERs), continuing Phase 6 with one structural increment (the four cables and the source's Market Escape scene), with two mid-session rulings taken directly from David (the bare-slide default, the three-other-landings-are-intentional call) rather than guessed, and two platform gaps discussed then filed rather than worked around.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 6 continues; no incomplete-work estimate given this session)
- **Rollback Safety**: safe to revert — nothing committed yet (`git status --short` shows 8 modified files plus this untracked summary)

## Dependency/Prerequisite Check

- **Prerequisites met**: the trade trait's on+after shape and the `wary` shared-refusal trait from prior Phase 6 increments (reused, not extended, for the cable and Market Escape refusals); ADR-326's `move the player to a random adjacent room` (reused for the tent-throw eject); the timer pattern from earlier Phase 6 work (reused for the `market-escape` spool).
- **Prerequisites discovered**: none new this session — the two platform gaps filed (#333, #334) surfaced during this work but did not block it; both were routed around within the story content as prior gaps have been.

## Architectural Decisions

- None this session — no ADR written, amended, or referenced. The open readings (the other three cables' capture-only ending; the two pressure models running side by side) are content rulings, closed by David mid-session (03:58 CDT) rather than left open — not platform decisions.

## Mutation Audit

- Files with state-changing logic modified: none — this session's changes are `.chord`/`.story` content files, which rule 15's carve-out excludes from the mutation-verification trigger (no side-effect-named TypeScript functions touched).
- Tests verify actual state mutations (not just events): YES (evidence: the tree's `states:` pins carry the mutation checks — `player.location`/`cloak.location` at each landing, `cloak.location = player` after retrieval, `player.location = Top of the Post` on the held refusal, `story.state` at the hunted and chase landings; `./sharpee test branch-stories/secret-letter` run directly by this writer, 313 cards passing / 544 assertions passing / 0 failing, 2026-08-30 04:19 CDT, after the session's last edit).
- If NO: N/A — see above; this is the project's documented alternative to TS-level mutation assertions for story content.

## Recurrence Check

- Similar to past issue? YES — the port-content-exposes-a-platform-gap pattern recurs again this session: GH #333 (parser seats grammar slots by position, leaving an instrument-first shape's direct object empty) and GH #334 (an authorial `move` of a worn item leaves the worn flag set) join #331/#332 from the immediately preceding session (`docs/context/session-20260830-0125-feat-adr-321-world-index.md`) and #323–#330 before that, all from the same Phase 6 work.
- Consider one-time audit: not warranted yet — same conclusion as the prior sessions' checks: each occurrence resolves cleanly through the discuss-then-file path CLAUDE.md prescribes; this is the intended pattern operating as designed.

## Test Coverage Delta

- Tests added: Secret Letter tree +38 cards / +116 assertions (275→313 cards, 428→544 assertions) from the cables and Market Escape increment.
- Tests passing before: 275 cards / 428 assertions (previous session's finalize) → after: 313 cards / 544 assertions, 0 failing (evidence: `./sharpee test branch-stories/secret-letter`, run directly by this writer, 2026-08-30 04:19 CDT, seed 1209, after the session's last edit — the main session's own 03:50 CDT run reported the same 313/544/0 and is corroborated by this re-run).
- Known untested areas: David's PLACEHOLDER lines carry no content-level assertions beyond structural card pins; GH #333/#334 remain open against the platform; the noted seams (no slot test in a must-line, no visited condition on the cable description, no stdlib untying, the stealing refusal during the spool has no consumer) are unaddressed.

---

**Progressive update**: Session completed 2026-08-30 04:19 CDT
