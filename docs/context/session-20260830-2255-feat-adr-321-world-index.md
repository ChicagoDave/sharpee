# Session Summary: 2026-08-30/31 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Secret Letter port, Phase 6: Teisha's silk wares — Book 2 Part 17 Ch 2
  (`story.ni:3023-3057`) plus the buy verb it depends on (Part 27,
  `story.ni:688-693`). David: "proceed with the silk wares" (2026-08-30
  ~23:05 CDT).
- Standing rule: build what the source does; report every gap.
- Next morning: David's four rulings on the reported items, applied
  (2026-08-31).

## Completed
- **`silk-wares.chord`** (new, imported from `grubbers-market.chord` after
  the standing scenery):
  - **The buy verb** — a story `buying` action (`buy the target`) whose
    `otherwise refuse` carries the source's "Nothing is on sale." for
    everything without its own answer (entity-less `buy` included).
  - **The silk garments** collective and the five kinds — gowns, capes,
    cloaks, shawls, robes — scenery in the tent, descriptions verbatim.
  - **`silk-ware` trait**: take → "You'd sooner go hungry than steal from
    Teisha."; buy → "You'd love to, but you haven't any money." in every
    state.
  - **The cloaks' "perfect disguise!" tail** — `after the player examining`
    + a `first-time` phrase, Gentry verbatim (its placement/timing goes to
    the GH #344 sweep).
- **Rulings applied (David, 2026-08-31)**:
  1. **GH #344 filed** — one sweep of all carried text for cloak-era
     references against the dress retarget, instead of per-line rulings.
  2. **GH #345 filed** — removed items remain in memory as 'gone';
     conditions evaluate instead of throwing (the seam found here: a
     `refuse when` naming a `remove`d entity died as "I don't understand
     that." — #330's cousin).
  3. **The buy path does not trade** — "'give necklace to teisha' should
     still be the action." The interim flag-drain build (trait buy clause
     striking a state flag, an every-turn drain running the TE20 trade)
     was removed; the source's buy-with-necklace redirect
     (`story.ni:3035`) is recorded as not carried by ruling. This also
     dissolved the drain's narration-interleave question.
  4. **Jack is `proper`** (`secret-letter.story`) — the acting-give line
     now renders "Teisha gives the dress to Jack".
- **Tests**: 12-card calm wares tour on the tent-entry trunk card; one
  ruled-behavior branch beside the nine give-necklace ones (buy silks with
  the necklace → no-money and still `hunted`; then the give runs the trade,
  "to Jack" asserted). `./sharpee test branch-stories/secret-letter` —
  **562 cards passing, 953 assertions passing, 0 failing** (seed 1209,
  2026-08-31); baseline 546/924 (`434bfeb8`).

## Key Decisions
- The cloaks carry no singular `cloak` alias — that exact word is the old
  gray cloak's and 16 existing `cloak.location` pins resolve by it (the
  bonnet/fashionable-hat precedent). Documented in the file header.
- The trade is giving's (or showing's) alone — David's ruling, recorded in
  both file headers.
- No platform code touched.

## Open Items
- **GH #344** — the cloak-era text sweep (per-line dispositions folded
  into the change document; rewrites are David's prose).
- **GH #345** — platform: `remove` keeps entities as 'gone'. Until then:
  never name a removable entity in a condition reachable after its
  removal, or use `move … offstage`.
- "Teisha gives the dress to **you**" (second person when the recipient is
  the player) noted as the eventual right rendering — platform, not filed;
  `proper` covers the immediate wrongness.
- Book 2 content: the silk wares were the last held increment from the
  wares session's list. Next candidates come from a fresh gap check of the
  change document (the conspicuous shopper #303 remains open
  platform-side).

## Files Modified
- `branch-stories/secret-letter/silk-wares.chord` — new
- `branch-stories/secret-letter/grubbers-market.chord` — the import
- `branch-stories/secret-letter/npc-teisha.chord` — trade-is-giving's note
- `branch-stories/secret-letter/secret-letter.story` — Jack `proper`
- `branch-stories/secret-letter/secret-letter.tests.json` — three new
  branches (546 → 562 cards)
- `docs/work/secret-letter-port/plan.md` — Phase 6 progress note + rulings
- `docs/context/session-20260830-2255-feat-adr-321-world-index.md` (this file)

## Notes
- Session d13e8a; work spans the 2026-08-30 evening build and the
  2026-08-31 rulings pass.
- Probes via scratchpad `probe.py` driving `./sharpee play
  branch-stories/secret-letter` (the bundle's `--play` on the `.story`
  fails: no import resolver in that compile host); `./sharpee compose`
  as the analyzer gate.
- Dispatch-action architecture learned and recorded: a trait holds ONE
  clause per dispatch action; `on` clauses cannot carry acting statements;
  entity-level `after` clauses are the reaction surface; `otherwise refuse`
  is the dispatch miss. (The flag-drain idiom built on this was removed by
  ruling 3 but the constraints stand recorded in git history and here.)
- Rule 15 does not fire for `.chord` content; the tree's pins carry the
  mutation checks.
- Not committed — David's call.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 6 continues; next increment from a
  fresh gap check)
- **Rollback Safety**: safe to revert — nothing committed (5 story files,
  1 plan file, this summary)

## Dependency/Prerequisite Check

- **Prerequisites met**: the monkey chain (necklace), the TE20 trade
  (npc-teisha), the tent rooms, the satchel — all reused; the wares
  session's taking-as-stealing ruling reused.
- **Prerequisites discovered**: none blocking — GH #344/#345 filed, the
  rest routed around in story content.

## Architectural Decisions

- None — no ADR written or amended; the buy verb is story content on
  existing language, and #345 carries David's platform direction for its
  own track.

## Mutation Audit

- Files with state-changing logic modified: none in rule 15's scope —
  `.chord` content only.
- Tests verify actual state mutations: YES — `story.state = hunted` pinned
  on the refused buy, `dress.location = cloth satchel` / `bonnet.location
  = cloth satchel` / `story.state = chase` on the give that follows it
  (evidence: `./sharpee test branch-stories/secret-letter`, 562/953/0,
  seed 1209, 2026-08-31, after the last edit).

## Recurrence Check

- Similar to past issue? YES — the port-content-exposes-a-platform-gap
  pattern again: the removed-entity throw is GH #330's shape on the
  refusal path (now #345, with a ruled direction rather than another
  workaround), and the pin-word collision repeated the bonnet lesson.

## Test Coverage Delta

- Tests added: +16 cards / +29 assertions net (546→562, 924→953) across
  three branches (the interim trade branches were replaced by the
  ruled-behavior branch).
- Tests passing before: 546/924 (`434bfeb8`) → after: 562/953, 0 failing
  (evidence: `./sharpee test branch-stories/secret-letter`, seed 1209,
  2026-08-31).
- Known untested areas: the `x silk` / `x cloak` disambiguation prompts
  (source-faithful ambiguity, prompts not asserted).
