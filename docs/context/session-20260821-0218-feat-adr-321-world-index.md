# Session Summary: 2026-08-21 02:18 - feat/adr-321-world-index

**Continuation note**: second half of session 502b0b. The first half (through ADR-322's acceptance and the ADR-131 cleanup) is `docs/context/session-20260820-2207-feat-adr-321-world-index.md`, committed as `bd6aca3a`. This summary covers only what happened after that commit — no repetition below.

## Goals
- Finish scoping the Secret Letter port using the design-archive and Textfyre-extensions GitHub sources David supplied.
- Resolve whether Dramatic Priority is already implemented in Chord, and write the ADR that answers it.

## Phase Context
- **Plan**: No active plan (`.current-plan` absent).
- **Phase executed**: N/A — ADR/proposal work outside any plan phase.
- **Tool calls used**: Not tracked — the session-state file for 502b0b was retired by the first-half finalize; no per-session count is recoverable for this half.
- **Phase outcome**: N/A.

## Completed

### Secret Letter scoping, continued (design archive + extensions)
- Measured the design archive from source: 16 Detail Design revisions, Orphan drafts back to 2007-02, dialogue tables (`.xlsx`), Visio puzzle/map diagrams, five clean playtest transcripts in `>command`/response format, recorded bugs, 18+ compiled builds.
- Re-split the Textfyre extensions three ways: ~90KB already solved by the platform (FyreVM Support + channel shims + Image Output + XML Output Toggling → Sharpee channels ADR-163; Textfyre Standard Rules → stdlib); direct equivalents (Counters → ADR-264/ADR-217; Scripted Events → `define sequence`/`define machine`, ADR-215); and two with no mapping — Quips and Dramatic Priority.
- Diffed the two extension trees David supplied (`games/shadow` vs `inform7/trunk`) for Quips: the difference is I7 dialect only (`change X to Y` → `now X is Y`, named rules, one added debug guard) — same model, so the prior mapping analysis needed no revision.
- Found `Conversation Topics` — a topic-based alternative to Quips, by Textfyre's own description — commented out in Secret Letter's source at `story.ni:206`. They had the topic model available and chose the menu instead.
- Measured the real rewrite scale precisely: 380 quip declarations, 297 `menu text` lines, 307 `response of` edges, 40 `start conversation with` entry points — roughly 40 conversations averaging 9-10 nodes, not "472 of anything" (correcting the first-half session's `472 quip references` figure, which was a raw reference count, not a node count).
- Confirmed `Triggers` is trivial (~20 lines: one fired/unfired boolean plus a firing activity) — this collapsed a concern raised earlier that the beat mapping was gated on it.

### David's decisions
- Conversation will be built native to Chord (beat-based `define conversation`), not ported — the quip trees get rewritten, not translated.
- He has Michael Gentry's blessing to use his voice and GenAI for the Secret Letter remake specifically.
- General rule stated: for a real comp entry, or any story he wants people to actually play, he will very likely leave GenAI out entirely. The existing writing clearances (Secret Letter, zoo tutorial, thealderman) are narrow exceptions, not a default.

### Name-handling verification (two standing constraints, both person-level)
- **Excluded name**: verified the Sharpee repo is clean (zero occurrences of the excluded Textfyre-programmer name). The exposure is confined to `story.ni` — 123 occurrences across three source variants, including one runtime credits line at `story.ni:229` that prints to players. David's substitute is "Voldemort"; a 3-step substitution recipe was produced and verified to zero remaining occurrences.
- **Tara McGrew**: confirmed as the correct name; the earlier first name that appears in historical Textfyre and FyreVM material is a dead name and is not written here. Verified the live Sharpee docs already credit her correctly (book frontmatter v1.5.0 and v2.0.0, ADR-096's FyreVM authorship line) — nothing needed fixing. The risk identified is transcription from historical source material, not intent.

### ADR-323 — Deferred narration ("say it later" as a prose-pipeline primitive)
- Origin: David asked whether Dramatic Priority was already implemented in Chord ("I kind of see this as already implemented, no?"). Investigation found three quarters of it IS built: ADR-296 narrative slots (placement), ADR-320 D7 `define initiative`/`hold their tongue` (suppression), ADR-310 D8 goal priority (a ladder), `filter.ts` (categorical drops). Missing: deferral — "not this turn, but soon" — which does not reduce to the other three.
- **D1**: the primitive is deferral; the feature is named for it, not "dramatic priority" (the ladder is the least valuable, most portable-looking part).
- **D2**: Chord declares, engine arbitrates — reuses ADR-296's split rather than inventing a new shape.
- **D3**: new prose-pipeline stage between `filter` and `sort` — order is load-bearing (a deferred phrase has no slot in the turn it was deferred from).
- **D4**: deferral is bounded; every deferred emission lands within a horizon or expires — no unbounded queue.
- **D5**: the deferral queue must be *shown* to leave ADR-322's state-space signature, not assumed to — check against Fernhill required before merge (AC-3).
- **D6**: the six-level Textfyre ladder is not ported; only the mechanism transfers.
- **D7-D11** resolved through a five-question rule 11a interview, each folded immediately:
  - **Q-1 → D7** (tension model): author-first per-turn ratchet, not a persistent global — starts at floor each turn, rises on events, resets at turn end. Mid-question correction: Claude initially argued against a persistent global on rot-vector grounds, then found Textfyre itself resets `current tension` to trivial every turn (a ratchet, not a persistent global) — the rot vector didn't exist as posed. This dissolved a derived question (what a "set piece" binds to in Chord) entirely.
  - **Q-2 → D8**: three levels (`drop`/`defer`/`always`), empirical — Textfyre's six collapse to three behavioral roles in its own arbitration rule, and its own documentation states three ("stand out / survive / die").
  - **Q-3 → D9**: deferral attaches to the declared source, not the phrase — a source-keyed queue is bounded by a compile-time constant, making D5's check a formality rather than a risk. Textfyre's `if absent` dedupe does the same.
  - **Q-4 → D10**: expiry horizon is a platform constant now, an authored value only when a story demonstrates the need. Textfyre has no horizon at all — this bound is this project's addition, not a port.
  - **Q-5 → D11**: at most one deferrable source narrates per turn, reverse-priority sort with random shuffle for ties. Argument: the ratchet starts each turn at the floor, so a *quiet* turn is exactly when everything clears a low bar and crowding happens — the cap, not the ladder, fixes the motivating case.
- `adr-review` then ran and scored **7/18 NEEDS WORK with two blockers**, both introduced by the interview itself:
  1. D8 and D11 contradicted each other (`always` = "renders regardless" vs. D11's one-per-turn cap, undefined for two `always` sources in one turn). Fixed: the cap wins; `always` means never-dropped and first-in-line, not rendered-this-instant.
  2. A load-bearing claim was false: Consequences said the prose pipeline had never held cross-turn state, offered as the strongest argument against building the feature. Verified against source: `pipeline.ts:203-205` constructs a `WorldTextStateStore` documented as surviving save/restore (ADR-192 W2, ADR-196). Fixing it improved the ADR — the objection dissolved and the queue gained an existing persistence home, which became AC-7.
  - Two smaller fixes: a bad citation (D5 cited "ADR-322 §9"; ADR-322 has no §9 — Tractability is §9 of the working *proposal* document, `docs/proposals/state-space-analysis.md`), and an inherited claim upgraded to direct measurement (Fernhill has three atmospheric daemons — one chance in 12 at line 18, one chance in 6 at line 29, one chance in 8 at line 780 — not the one the earlier session's text implied).
- Flipped DRAFT → **ACCEPTED** as a scoping ADR. Status line states plainly what acceptance authorizes and records the review score (7/18, two blockers fixed) rather than hiding it. AC-1 through AC-7 (AC-1 horizon/expiry, AC-2 stage order, AC-3 Fernhill signature check, AC-4 three levels, AC-5 no silent drops, AC-6 one-per-turn cap with randomized ties, AC-7 save/restore via `textState`). Stage signature, queue-entry shape, IR field, and end-to-end/boundary/rejection test scenarios are deliberately left to the implementing child.

## Key Decisions

### 1. Conversation is native, not ported
David chose beat-based `define conversation` over translating the 380-declaration Quips menu tree. Rationale above (Completed).

### 2. Two person-level name rules made standing constraints
The excluded-programmer substitution ("Voldemort") and the Tara McGrew correct-name rule are recorded as durable constraints for any future Secret Letter work, independent of this session (see memory entries below).

### 3. ADR-323 names the missing capability precisely
Rather than porting "Dramatic Priority" wholesale, the ADR isolates deferral as the one thing not already covered by ADR-296/ADR-320/ADR-310/`filter.ts`, and explicitly declines to port the six-level ladder or Textfyre's tension-never-resets absence-of-horizon design.

## Next Phase
No active plan. ADR-323 is accepted but unimplemented — it is a platform change and CLAUDE.md-gated; the implementing child ADR/plan does not exist yet.

## Open Items

### Short Term
- ADR-323's remaining review gaps (stage signature, queue-entry shape, IR field, test scenarios) are deliberate scope left to the implementing child — not debt to hide.
- Secret Letter port not started. Open decisions: whether the remake breaks the linear spine (which would cost ADR-322 D13 its intent-neutrality sample), and where a local munged copy of the source should live.
- The Word design documents are unchecked for the excluded name and for content generally — check at conversion time.

### Long Term
- `Adjacent Rooms` (13KB Textfyre extension) still has no identified Chord equivalent.
- David's general no-GenAI-for-real-comp-works rule should inform scoping of any future comp entry before writing starts.

## Files Modified

**ADRs** (1 file, new):
- `docs/architecture/adrs/adr-323-deferred-narration.md` - new ADR, ACCEPTED, D1-D11, AC-1 through AC-7.

## Notes

**Session duration**: continuation of 502b0b; this half is ADR/doc work only, no code changed, no tests or builds run.

**Approach**: source-verified throughout rather than working from memory or from the prior session's own figures — the 472→~40-conversations correction and the "three daemons, not one" correction both came from re-measuring against the actual GitHub sources rather than trusting earlier-session summaries.

**Outside the repo**: four memory entries were written to Claude's memory directory (not committed, not part of this repo's history) — the Secret Letter remake, the Gentry voice clearance, the excluded-programmer name rule, the Tara McGrew name rule, and the rule that GenAI stays out of David's real comp works. Recorded here for continuity only.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (single new ADR file, no code touched)

## Dependency/Prerequisite Check

- **Prerequisites met**: GitHub source access to `ChicagoDave/textfyre` (design archive and I7 extensions), David's own read of prior ADRs (ADR-296, ADR-320, ADR-310, ADR-322, ADR-192, ADR-196) available for cross-check.
- **Prerequisites discovered**: None.

## Architectural Decisions

- **ADR-323**: Deferred narration as a new prose-pipeline stage between `filter` and `sort` — accepted as scoping-only; see Completed for D1-D11 and the review's two blockers and how each was fixed.
- Pattern applied: ADR-296's declare/arbitrate split, reused for a second mechanism (D2) — the ADR itself notes this makes the split a convention rather than a one-off.
- Insight worth preserving: resolving two interview questions independently (D8, D11) produced a real contradiction that `adr-review` caught — cross-checking newly-folded decisions against each other, not just against pre-existing text, is where this kind of gap hides.

## Mutation Audit

- Files with state-changing logic modified: None — ADR/documentation only.
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this is the first ADR-323-specific interview-introduced contradiction; distinct from prior sessions' review-loop issues (referenced in the first-half summary as "the prior session's four-round review-loop failure," which was a different failure mode — repeated review rounds, not a cross-decision contradiction).

## Test Coverage Delta

- Tests added: 0
- Tests passing before: N/A → after: N/A (no test changes this session)
- Known untested areas: ADR-323's D5 state-space signature check against Fernhill (AC-3) is explicitly unrun — required before the feature merges, not before the ADR's acceptance.

---

**Progressive update**: Session completed 2026-08-21 02:18
