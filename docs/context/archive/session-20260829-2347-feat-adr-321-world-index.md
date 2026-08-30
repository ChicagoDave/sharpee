# Session Summary: 2026-08-29 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Secret Letter port, Phase 6 (CURRENT): resume — gap-check the change document against the build, pick the next structural increment, build it, pin it.
- Content authority unchanged: structural work is Claude's; every line of prose is David's (PLACEHOLDERs) or Gentry's carried verbatim.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — "Port The Secret Letter (Textfyre, 2009) to Chord". `.current-plan` points here.
- **Phase executed**: Phase 6 — "Chapter 1 vertical slice in `branch-stories/secret-letter/`" (P-5) (Large, 400-budget). Still **CURRENT** — not closed this session; this was a progress increment (a dated 2026-08-30 progress note added to `plan.md`).
- **Tool calls used**: see `docs/context/.session-state-87efc1.json`.
- **Phase outcome**: Completed increment — the eavesdrop scene, market gates, and tree restructure landed; Phase 6 itself remains open.

## Completed
- **Gap check** (change document vs. `branch-stories/secret-letter/`): every ruled section is built except Book 1's own scene — the bite went straight to `hunted` and started the sweep clock, so Jack was hunted before she had heard why. The P-8 spike is answered in `peering.chord` (the market file's "not wired yet" note was stale; fixed). Baseline confirmed first: 247 cards / 357 assertions passing (2026-08-30 00:05 CDT).
- **The eavesdrop increment** — new `branch-stories/secret-letter/eavesdrop.chord` (imported between Teisha and the mercenaries): the voices at the alley mouth (examine, `listen to voices`, the "still talking" texture one chance in four, southeast refused with the source's `stopping` pair); the Outer Market Roof with tiles, view, and the nine-way "steep and slick" refusal; the group of mercenaries and the captain as scenery on it; the five-line briefing spooled one turn at a time from the room's `on every turn` through `first time` … `fifth time` — the fifth sends the three off-stage and turns the story `hunted` (the gates lock through the junction's existing `north is blocked while hunted`). The sweep opens as the source opens it (`story.ni:1725`): the Alley's `after the player entering while hunted, once` is the tumble — the pair rushes in `approaching` with `lunge` running and `waiting` reset — and `up` is refused while they stand there (the ankle grab, line only). Every line Gentry's, `story.ni:1474-1804`.
- **The market gates** as an examinable at the junction (`story.ni:2236` verbatim): "Until now." as a `phrase detail while hunted or chase`, the junction reporting them closed, open/enter/push refused with the locked line.
- **The apple** keeps its bite mark (`states: whole, bitten`, `phrase detail while the apple is bitten`); four peering pairs for the roof (up from the alley; down, north, southeast from the roof).
- **Tree restructured programmatically** (scratch `retree.mjs`): the bite card pins `calm`; three new branches (calm alley probes, the post-briefing roof, the ankle grab → capture death); a calm roof visit pinned on the texture branch; the nine old post-bite branches re-hung under the descent unchanged — the sweep timeline kept its shape at seed 1209. `./sharpee test branch-stories/secret-letter` — **271 cards passing, 414 assertions passing, 0 failing** (2026-08-30 00:12 CDT).
- **Probe harness** built in the scratchpad (`probe.mjs`: a command list → scratch tree document → `./sharpee test --json --capture-output`), since the bundle's `--exec` has no import resolver for Chord fragments and `./sharpee play` drops piped commands after the first (#240).

## Key Decisions
- **`hunted` begins at the briefing's end, not the bite — RULED (David, 2026-08-30: "the latter", confirmed)**. The change document's "the bite moves calm → hunted" sentence read literally would have made the eavesdrop a `hunted`-state scene with the arrival clock stopped; its other two statements ("Jack has heard the voices and knows she is wanted"; the gates lock "at the eavesdrop's end — the calm → hunted transition") put it at the end. Built that way, the bite card pins `calm`, and the ruling is a dated note in the change document's "eavesdrop's aftermath" section superseding the bite sentence.
- **The briefing spools from the room, not the group** — a phrase emitted in the same arm that moves its owner off-stage never renders (filed).
- **The pair's `when the player moves` is guarded `while the wandering mercenaries is not here`** — it fires after a room's `after the player entering` on the same move, so a move that ends with the pair already in Jack's new room is an arrival beat (the tumble) and must not be undone.
- **Not carried, with reasons** (file header): the ankle grab's posture change (a blocked line cannot mutate; the lunge grabs next turn anyway), "Carefully, you descend the stack of crates" (an entering clause cannot tell a descent from a walk in), "No time for breakfast right now!" (stdlib's zero-servings refusal precedes any story clause), bare `listen` (reaches no entity clause), the arms as their own examinable.

## Open Items
- David's PLACEHOLDER lines (unchanged list from last session) plus the three chase exit refusals.
- Platform filed this session: **#329** (a phrase emitted in the same clause arm that moves its owner off-stage never renders), **#330** (a `remove`d entity named in a blocked-exit condition throws on entering and the direction stops parsing). #323–#328 still open.
- `branch-stories/secret-letter/README.md` still says "Scaffold. No chapter content." — stale, not touched.

## Files Modified
- `branch-stories/secret-letter/eavesdrop.chord` (new)
- `branch-stories/secret-letter/grubbers-market.chord` — the Alley's climb, refusals, detail and descent beat; the gates; the bite; header notes; `import "eavesdrop"`
- `branch-stories/secret-letter/mercenaries.chord` — the move-clause guard; header note
- `branch-stories/secret-letter/peering.chord` — four roof pairs, three phrases
- `branch-stories/secret-letter/secret-letter.story` — deviation 6 in the header list
- `branch-stories/secret-letter/secret-letter.tests.json` — restructured (271 cards / 414 assertions)
- `docs/work/secret-letter-port/plan.md` — Phase 6 progress note
- `docs/work/secret-letter-port/change-document.md` — dated RULED note: `calm` → `hunted` at the briefing's end
- `docs/context/session-20260829-2347-feat-adr-321-world-index.md` (this file)

## Notes
- Session started: 2026-08-29 23:47 CDT
- Rule 15 (`mutation-verification`) does not fire for `.chord`/`.story` files (not source per the rule's carve-out); the tree's `states:` pins carry the mutation checks (story state, locations).

**Session duration**: ~1h33m (23:47 CDT 2026-08-29 – ~01:20 CDT 2026-08-30).

**Approach**: Content authoring against the accepted platform (structure only, David's prose as PLACEHOLDERs), continuing Phase 6 with a gap-check against the change document followed by one structural increment (the eavesdrop scene) and a programmatic tree restructure, closed out by a David ruling on where the calm→hunted transition sits.

---

## Session Metadata

- **Status**: COMPLETE (unverified: test/build pass counts — the baseline 247/357 and post-change 271/414 `./sharpee test branch-stories/secret-letter` runs are reported by the session's narrative with no corroborating event-log row; both were run by the main agent this session, not re-verified by this writer)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 6 continues; no incomplete-work estimate given this session)
- **Rollback Safety**: safe to revert — nothing committed yet

## Dependency/Prerequisite Check

- **Prerequisites met**: the existing chase-state machinery (`hunted`/`chase`) from prior Phase 6 increments; ADR-330's chapter extension (unaffected, already shipped); the junction's existing `north is blocked while hunted` gate, reused rather than re-specified for the market gates.
- **Prerequisites discovered**: the change document's bite-moves-calm→hunted sentence was stale against its own later statements — resolved by asking David rather than guessing, producing the dated ruling below.

## Architectural Decisions

- None this session — no ADR written, amended, or referenced. The calm→hunted placement is a content ruling (change-document.md dated note), not a platform decision.
- David's ruling: `hunted` begins at the briefing's end, not the bite (2026-08-30: "the latter", confirmed) — recorded as a dated note in `change-document.md` superseding the bite sentence.

## Mutation Audit

- Files with state-changing logic modified: none — this session's changes are `.chord`/`.story` content files, which rule 15's carve-out excludes from the mutation-verification trigger (no side-effect-named TypeScript functions touched).
- Tests verify actual state mutations (not just events): N/A for TypeScript mutation-verification; the tree's own `states:` pins carry the equivalent check for content — story.state = calm on the bite card, story.state = hunted on the "Okay, go!" card, and player.location pins on the roof/alley/descent cards. [reported by session, unverified] — no fresh run performed by this writer.
- If NO: N/A — see above; this is the project's documented alternative to TS-level mutation assertions for story content.

## Recurrence Check

- Similar to past issue? YES — the port-content-exposes-a-platform-gap pattern recurs again this session: GH #329 (a phrase emitted in the same clause arm that moves its owner off-stage never renders) and GH #330 (a `remove`d entity named in a blocked-exit condition throws on entering and stops direction parsing) join #323–#328 from the prior session, all filed from the same Phase 6 work per `docs/context/session-20260829-1710-feat-adr-321-world-index.md`'s own Recurrence Check, which already traced this back further to ADR-325's #305–#310.
- Consider one-time audit: not warranted yet — same conclusion as the prior session's check: each occurrence resolves cleanly through the discuss-then-file (or discuss-then-ADR) path CLAUDE.md prescribes; this is the intended pattern operating as designed.

## Test Coverage Delta

- Tests added: Secret Letter tree +24 cards / +57 assertions (247→271 cards, 357→414 assertions) from the eavesdrop increment and tree restructure.
- Tests passing before: 247 cards / 357 assertions (2026-08-30 00:05 CDT) → after: 271 cards / 414 assertions, 0 failing (2026-08-30 00:12 CDT) (evidence: `./sharpee test branch-stories/secret-letter` [reported by session, unverified] — both runs performed by the main agent this session; no session-event-log row or fresh run was performed by this summary-writer to corroborate them).
- Known untested areas: David's PLACEHOLDER lines carry no content-level assertions beyond structural card pins; `branch-stories/secret-letter/README.md` still says "Scaffold. No chapter content." (stale, unfixed); GH #329/#330 remain open against the platform.

---

**Progressive update**: Session completed 2026-08-30 01:20 CDT
