# Session Summary: 2026-08-23 - feat/adr-321-world-index (2026-08-23 18:42 CDT)

## Status: COMPLETE

## Goals
- Resume port Phase 6 (Chapter 1 vertical slice) at the state session 1544 left it.
- Land the held-back kick verb and the woolen cap (both change-document-authorized).
- Surface — not decide — the sweep-recognition ruling the disguise work waits on.

## Completed

### Phase 6 increment — the kick verb and the woolen cap
- **Woolen cap** (`secret-letter.story`): `create the woolen cap` (wearable, Gentry's
  description `story.ni:1393`), worn by the player from the first turn per the change
  document's escape-disguise ruling ("the woolen cap worn at start"). Wear/take-off
  lines (`story.ni:1402`/`:1414`) carried as `on wearing it`/`on taking_off it` clauses —
  `on`, not `after`, so Gentry's line **replaces** the stdlib "You put on/take off…"
  line, same mechanism as the 93e032f5 attack-message fix; both suppressions pinned
  with `notContains` in the tree.
- **Kick verb** (`mercenaries.chord`): `define action kicking` (grammar `kick the
  target`, deliberately no `must be reachable` — see #312 below). Reactions live in
  traits (a dispatch action's `on` clauses can't sit on entities — loader gate said so):
  `kick-escape` on the mercenaries forces the source's shin line (`story.ni:2184-2185`)
  with per-posture tails (`merc-break-free-kick`/`merc-shove-off-kick`), same
  mutations/postures as `on attacking it`; `kick-yourself` on the player carries the
  kicking-yourself rule (`story.ni:559`, "Not so hard really, was it?"). The shin arm
  was also restored as the first arm of the generic `merc-break-free`/`merc-shove-off`
  random pools — the source's narrow-escape pool includes it (`story.ni:2165-2168`).
- **Divergence, noted in the file**: Chord has no action delegation, so kick-anything-else
  falls to the platform's can't-do-that line rather than the source's attack response.
- **Tests**: two new tree branches under the Alley bite, probe-derived at seed 1209
  (scratch-copy + `--capture-output`): branch 5 mirrors the attack break-free timeline
  with `kick mercenaries` (shin line + "You're free!" pinned); branch 6 pins kick-self,
  cap description, both cap overrides (stdlib lines asserted absent), and the
  can't-do-that fallback. `./sharpee test branch-stories/secret-letter` — **116 cards
  passing, 135 assertions passing** (2026-08-23, up from 102/118); diff to
  `secret-letter.tests.json` is append-only (143 insertions, no reformat).

### Platform seam filed — GH #312
- `the target must be reachable` on a `define action` slot excludes the player from
  resolution: `kick me/myself/self` → "I don't understand that." A/B-verified at the
  same seed (constraint removed → resolves and the trait fires). stdlib attacking's
  REACHABLE scope resolves `attack me` fine, so the gap is dispatch-action-specific.
  Mechanism traced to `SCOPE_REQUIREMENT_PREDICATES` `reachable` → `touchable`.
  Workaround shipped: the kick action carries no reachable constraint.

### Change document — Behind Fruit Stall ruling recorded (Phase 4 conversation)
- David (2026-08-23): a **Behind Fruit Stall** room that only surfaces from the
  northeast-cable landing; in this one case no one gets knocked over and no one sees
  the landing; one turn to change, one turn to return to the market and head east.
  Recorded as a dated amendment to the escape-disguise "Where she changes" section —
  it replaces the in-the-open change and makes the grace window concrete. The slide
  ending's Behind-Fruit-Stall variant is David's line to write. Both forced questions
  answered same day and folded in: identification fires at the Fruit Stall one turn
  after the return; a second turn behind the stall moves the pair to the Fruit Stall
  and she is caught on the exit. One build reading left to confirm: "caught" mapped
  to the standing grab posture (break-free possible), not a bespoke hard ending.
- Third ruling, same conversation: **the slide takes two turns** — the mid-slide text
  reveals the open spot behind the fruit stall; letting go there is the only way into
  Behind Fruit Stall; riding the slide out lands her in front of the fruit stall
  (Gentry's knock-over ending, unchanged), seen, no way to change properly — caught,
  escape forfeited. Mid-slide reveal and let-go drop text are David's lines to write.

### Housekeeping
- #304 confirmed already closed (21:39Z last session, full closing comment) — the
  "close #304" open item was stale.
- `mercenaries.chord` header updated: cap-not-wearable and kick-has-no-verb notes
  replaced with the current state; the recognition-suppression hold is restated
  against the change document's reframed recognition rule.

## Key Decisions
- **Kick ships without the reachable constraint** — `kick me` parsing (a source rule)
  outweighs a reach refusal on distant targets; both facts recorded in the file and
  in #312.
- **Recognition rule sharpened — DECIDED (David): "anything except dress and new hat
  leaves Jack exposed."** The source's cap-off suppression (`story.ni:2093-2099`) is
  dropped entirely, not deferred; the 2009 "don't recognize you" arrival variant is
  not carried in its source form; the suppression state is built with the escape
  sequence only. Recorded in the change document; `mercenaries.chord` header updated
  from "held" to "dropped".

## Open Items
- **David's ruling needed (standing, from session 55eedf)**: topic ASKS bypass the wary
  gate — should asks share it?
- #311 (noisy theft / random-adjacent-room move) — blocked on David's platform decision.
- Conspicuous shopper — waits on #303 item 2 (phrase composition) evidence gate.

## Files Modified
- `branch-stories/secret-letter/secret-letter.story` — player wears the cap; `kick-yourself`
  composed; cap create block + `cap-on`/`cap-off`/`kick-self` phrases.
- `branch-stories/secret-letter/mercenaries.chord` — `kick-escape` composed on the pair;
  `define action kicking`; `kick-escape`/`kick-yourself` traits; shin arm restored to both
  narrow-escape pools; `merc-break-free-kick`/`merc-shove-off-kick` phrases; header updated.
- `branch-stories/secret-letter/secret-letter.tests.json` — branches 5 (kick break-free)
  and 6 (kick-self/cap texture), append-only.

## Notes
- Session started: 2026-08-23 18:00 CDT (approx; recap + audit first).
- Lesson re-confirmed: `##` comments are not legal inside `create` blocks — hit the
  same parse.create-property gate session 55eedf documented, twice, before moving the
  comments out.
- Owned-timer statements inside a trait need the possessive form
  (`reset the wandering mercenaries' lunge`) — the bare timer name resolves only
  inside the owner's own block.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Estimated Remaining**: N/A — the increment landed whole; the escape sequence build waits on David's TE20/dress quips, not on this session.
- **Rollback Safety**: safe to revert — story-only changes (`branch-stories/secret-letter/`) plus documentation; no `packages/` code touched. The tree branches 5–6 must revert with the story files (they pin the new behaviors).

## Test Coverage Delta

- Tree cards: 102 → 116 passing; assertions 118 → 135 (evidence: `./sharpee test branch-stories/secret-letter`, 2026-08-23, run after every edit — last run after the recognition-ruling header change, same counts).
- No platform tests touched (no `packages/` changes; #312 filed instead).

## Mutation Audit

- N/A — no side-effect functions in platform source were written or modified this session (story `.chord`/`.story` content and documentation only). Story-behavior mutations (posture changes, timer resets on kick) are pinned by tree-document state-visible assertions (break-free → dash-away sequence).

## Recurrence Check

- Similar to past issue? YES, benignly: the `##`-comment-in-create-block parse gate documented by session 55eedf was hit again before the comments were moved out — the documented lesson caught it immediately; no new pattern.

