# Session Summary: 2026-08-30 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Secret Letter port, Phase 6: the market's standing scenery — the two far-post
  backdrops (Part 15, `story.ni:2952-2978`), the silk tent as a thing (Part 16
  Ch 2, `story.ni:2999`), the bottom of the center post with its climb and the
  climb-up flavor (Part 18, `story.ni:3652-3676`), the farmland view (Part 19,
  `story.ni:3620-3628`), and the Alley's walls, nails, and crates' refusals
  (`story.ni:1509-1543`). David: "proceed with the scenery" (2026-08-30 ~15:35
  CDT) on the recommended increment.
- Standing rule: build what the source does; report every gap.
- Content authority unchanged: every finished line is Gentry's carried
  verbatim; this increment has zero placeholders.

## Completed
- **`market-scenery.chord`** (new, imported from `grubbers-market.chord` after
  the backdrops):
  - **The distant post** — follower over the perimeter ring + the roof
    (`post-seen-distantly`), the source's distant description, every covered
    verb refused with the find-a-way line.
  - **The inner post / the near post** — the source's inaccessible post as TWO
    entities (Rope/Pottery/Candle vs Outside the Silk Tent), because `phrase
    present` cannot vary its noun by room: each carries the source's four
    random paragraph frames (`phrase present, randomly`) with the right
    stall/tent wording, the close-up description, and the same refusal set.
    First `phrase present` use in this story — the paragraph rides the room
    description (appended to its paragraph, not its own — rendering seam noted).
  - **The silk tent** — follower over Outside/Inside/Base; body carries the
    south wording, an examine dispatch flips it north outside.
  - **The canvas tent** — follower over Alley + Base; climb refused.
  - **The storehouse wall**, **the nails** (no `part of` in Chord; description
    absent as in source — the platform answers "The nails are just nails.").
  - **The center post** at the Base — `climbable, enterable` (the mechanical-
    trait pattern the market's `enterable` set: enterable satisfies
    `canMoveEntity`, `container-utils.ts:57`, so the climb succeeds and the
    clause's `move` rides postExecute to the Top). take/push/pull/turn/attack
    → "The enormous post does not budge."
  - **The farmland view** at the Top — everything but looking refused with the
    too-far line.
- **`grubbers-market.chord`**: the `market-scenery` import; the crates'
  refusals (open/search → nailed shut, take/push → gold-bricks); the Top of
  the Post arrival clauses — `pole-climbed` (first-time strategy: the
  hidden-back-here text once, the grunting line after) while not chase,
  `pole-scamper` while chase. They fire on the walked `u` AND on the clause's
  authorial climb move alike (probed).
- **Entity-name lesson**: a create name's words feed the parser vocabulary —
  "the post behind the tent" made `x tent` ambiguous; renamed to `the inner
  post` / `the near post`.
- **Tree**: `./sharpee test branch-stories/secret-letter` — **546 cards
  passing, 924 assertions passing, 0 failing** (seed 1209, 2026-08-30 ~16:00
  CDT); baseline 517/887 re-verified green with the scenery in before branches
  were added. New: four branches — the far-posts tour (trunk 2), the Base tour
  with both climbs (first-time long/short variants, `player.location = Top of
  the Post` pins; trunk 16), the Alley walls/nails/crates tour (trunk 57), and
  the chase scamper climb (`/65.b7/14.b1` card 3).

## Key Decisions
- No ruling needed from David; no platform code touched; no new prose
  deviations. Gaps reported (below), none filed yet — discuss-then-file.

## Open Items
- **Gaps reported to David** (in `market-scenery.chord` header):
  - `descend post` / `climb down post` climb UP — the parser folds descend and
    climb down into the one climbing action
    (`packages/parser-en-us/src/grammar.ts:415-418`); the source sent them
    down. A story cannot see the surface verb. Candidate GH issue.
  - The slide-down-the-pole flavor on going down from the Top — no came-from
    guard on arrival clauses; the Base cannot tell a descent from a tent
    walk-in. Candidate GH issue.
  - The climb narrates no destination description (ADR-326 D5 seam, same as
    the market walk-outs); the walked `u` does. `look` answers.
  - `phrase present` renders inside the room-description paragraph, not as its
    own paragraph as Inform's initial appearance did.
  - Not carried: the crates' `raising` + looking-under lift gag (no clause
    verbs), in/out directions (standing omission), the bottom post's initial
    appearance (dead text in 2009 — scenery never prints one), nails'
    description (source had none; platform default answers).
- Still unbuilt from Book 2: Teisha's silk wares (`story.ni:3023-3057` — the
  cloak/dress "perfect disguise!" line is David's call), plus the wares-session
  readings still open in the `wares.chord` header.

## Files Modified
- `branch-stories/secret-letter/market-scenery.chord` — new
- `branch-stories/secret-letter/grubbers-market.chord` — import, crates
  refusals, Top arrival clauses
- `branch-stories/secret-letter/secret-letter.tests.json` — four new branches
  (517 → 546 cards)
- `docs/work/secret-letter-port/plan.md` — Phase 6 progress note
- `docs/context/session-20260830-1533-feat-adr-321-world-index.md` (this file)

## Notes
- Session started: 2026-08-30 15:33 CDT (session 189735)
- Probes ran through a scratchpad REPL driver (`probe.py` feeding
  `./sharpee play` with per-command delays — a closed stdin kills the loop
  after one command); `./sharpee compose` served as the fast analyzer gate.
- Rule 15 does not fire for `.chord` content; the tree's pins carry the
  mutation checks (`player.location = Top of the Post` on both climb paths and
  the chase climb).
- Not committed — David's call.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 6 continues; next candidates in Open Items)
- **Rollback Safety**: safe to revert — nothing committed (2 modified, 2 new files)

## Dependency/Prerequisite Check

- **Prerequisites met**: the backdrops increment (regions + follower pattern +
  `market-perimeter` condition) reused; the market's `enterable` mechanical-
  trait precedent reused for the climb; peering's Base `wayUp` answer left as
  the facing surface.
- **Prerequisites discovered**: none blocking — gaps reported, all routed
  around in story content or recorded as not carried.

## Architectural Decisions

- None — no ADR written or amended; the climbable-post shape is story content
  on existing language.

## Mutation Audit

- Files with state-changing logic modified: none in rule 15's scope — `.chord`
  content only.
- Tests verify actual state mutations: YES — `player.location = Top of the
  Post` pinned on the calm climb, the repeat climb, and the chase climb
  (evidence: `./sharpee test branch-stories/secret-letter`, 546 cards / 924
  assertions / 0 failing, seed 1209, 2026-08-30, after the last edit).

## Recurrence Check

- Similar to past issue? YES — the port-content-exposes-a-platform-gap pattern
  again, but this increment ROUTED AROUND everything (no new filings yet): the
  descend-conflation and came-from-guard gaps are reported for discussion, the
  rest are recorded not-carried. The entity-name-words-feed-vocabulary trip is
  new and worth remembering when naming multi-word entities.

## Test Coverage Delta

- Tests added: +29 cards / +37 assertions (517→546, 887→924) across four
  branches.
- Tests passing before: 517/887 (verified green post-scenery, pre-branches) →
  after: 546/924, 0 failing (evidence: `./sharpee test
  branch-stories/secret-letter`, seed 1209, 2026-08-30).
- Known untested areas: the `x wall` / `x tent`-at-Base disambiguation prompts
  (source-faithful ambiguity, prompts not asserted); the near post's tent
  paragraph random variants beyond the shared "tall wooden post" core.
