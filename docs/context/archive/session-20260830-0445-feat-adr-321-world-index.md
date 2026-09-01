# Session Summary: 2026-08-30 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Secret Letter port, Phase 6 (CURRENT): the next structural increment after the four cables and Market Escape (`8e4c0b4d`), David: "go". Chosen by a gap check of the change document and the source's Book 2 against the build: the stalls' wares — the one Chapter 1 content class with no declarations at all — and the source's generic theft rule that goes with them.
- Standing rule (David, 2026-08-30): "whatever the original source does and if there's a gap, then I want to know." Build the source's behaviour where the change document is silent; report every divergence.
- Content authority unchanged: structural work is Claude's; every line of prose is Gentry's carried verbatim or David's PLACEHOLDER.

## Completed
- **The wares** — new `branch-stories/secret-letter/wares.chord`, imported from `grubbers-market.chord` after the fruit: the eight other stalls' collective wares, displays (scenery supporters) and items, every line Gentry's (`story.ni:2252-2950`): Grocery (bread, cheese, jerky; "The food smells tasty!", "You don't have time for breakfast now!"), Hat (the pegs, the stock of hats, five hatstands — theft refused with the "perfectly serviceable hat" line), Leather (leather goods with the smell line, the saddle "way too huge", reins/harnesses/stirrups/scabbards/belts → riding reins, harness, stirrup, plain scabbard, belt; the scabbard's "You need a belt"), Weapons (weaponry, longswords "too big", knives → knife), Gems (gems, loose stones, jewelry — "constantly glaring"), Herb (jars of herbs, collective herbs → the herb jar with its dried weeds and the open/close/search/insert/take-weeds refusals), Rope (pegs, rope wares → length of rope), Candle (stock of candles, tallow candles → tallow candle, wax candles, the four colours as four displays → four candles, the tallow pots "stay out of my tallow pots!", dowels, fumes), Pottery (assorted pottery, pots/urns/jars/bowls → four small containers with "too small to conveniently hold things"). The fruit stall gains oranges and limes; every fruit now sits on its display.
- **The source's generic theft rule** (`story.ni:1978-1998`, as the change document makes it situational): one trait per stall (`grocer-ware`, `leather-ware`, `leather-ware-plural`, `weapons-ware`, `herb-ware`, `rope-ware`, `candle-ware`, `pottery-ware`, and `fruit-ware` with the fruit). Calm: a quiet lift (one PLACEHOLDER, `stall-lift-quietly`; the apple keeps David's line). Hunted/chase: the stallkeeper sees, the item goes into the satchel, Jack is thrown to a random adjacent room, the stall turns `blocked` (seven stalls carry `states: trading, blocked`; the Fruit Stall has its own rule, the Hat and Gems stalls cannot be robbed), and coming back bounces her with `story.ni:1825`'s line. The two openers split on a story counter `thefts` (the source's urchin/thief flag), raised by every noisy theft including the banana's. The fruit rule now covers every fruit, with the chaotic stall's second theft (`story.ni:2447`) reachable. Stealing during Market Escape refused with `escape-no-time`. The sticky-fingers rule (`story.ni:1940`) on every display (touch/push/pull/search/take). A ware is `shelved` until taken and `nicked` after, so a dropped ware retaken is a plain "Taken."
- The theft text names the ware through `{the item}` — the taking action's own grammar slot, which the runtime binds into any `on the player taking` body (`runtime.ts:3044`); no `with` binding needed.
- Corrected in passing: a story `on the player taking` refusal on scenery DOES fire ahead of stdlib's scenery gate (probed) — the fruit-era note "taking refuses scenery before any story hook" no longer holds; `wares.chord`'s header says so.
- **Tree**: `./sharpee test branch-stories/secret-letter` — **429 cards passing, 774 assertions passing, 0 failing** at seed 1209 (2026-08-30 05:12 CDT); baseline 313/544 (`8e4c0b4d`). Two calm branches under the first Grocery visit, three hunted branches at the junction, one chase branch at the post (the Market Escape refusal). Four existing trade-card pins repointed from a shadowed alias (below).

## Key Decisions
- No ruling from David this session; no ADR written or amended; no platform code touched. Four platform gaps discussed-then-filed, three worked around in the story.
- Prose deviations 7 and 8 added to the story header's list: "that" for the inserted noun in the herb jar's refusal; "another piece of fruit" for "another [noun]" (#337). Both substitutions, not inventions, listed where the earlier six are.
- The bonnets carry no singular `bonnet` alias: that word is the fashionable hat's and the trade pins name the hat by it (a `states:` pin takes one word). Recorded as a structural choice in the header.

## Open Items
- **Readings flagged for David** (`wares.chord` header): (1) a calm lift of ANY ware is quiet — a knife, a belt, a candle — as the change document's theft rule literally reads (it was written about the fruit); (2) a quiet calm lift does not make Jack a "successful thief" for the opener choice (the banana's reading); (3) eating a stolen grocery is refused in every state, as the source has it (its scarf-down line was dead code) — reads oddly beside the apple's appetite thread in the remake's calm walk.
- **Platform filed**: GH #335 (`phrase … with p = v when …` cannot parse — `when` is not a value stop); #336 (a possessive entity name, `the Weaponsmith's Stall`, cannot be named in a condition or `change` — the `'s` reads as a possessive; worked around by aka); #337 (no bare-name marker — `{item}` rejected as unbound, the binder's hints are all articles); #338 (`look` lists scenery supporters' contents, the entering description does not).
- Not carried, with reasons in the header: `steal <collective wares>` drawing a random display; the blocked tail on the distant descriptions; bare `smell` in the Leather and Candle stalls; the knife-into-scabbard refusal; tasting, peeling, the random wax colour; ADR-326's draw not excluding blocked rooms (a throw can land her in a blocked stall unbounced until she walks out and back).
- Still unbuilt from Book 2, the next increment's candidates: Teisha's silk wares (`story.ni:3023-3057` — the cloaks' "perfect disguise!" first-time line is on the cloak thread the dress replaced: David's call), the market backdrops (shoppers, walls, awnings, support wires, perimeter wall, smell and sound — `story.ni:3324-3617`), the distant centre post, the conspicuous shopper (#303).

## Files Modified
- `branch-stories/secret-letter/wares.chord` — new: the eight stalls' wares, the theft traits, the counter, the shared phrases and refusals
- `branch-stories/secret-letter/grubbers-market.chord` — seven stalls' `states: trading, blocked` and bounce clauses; the fruit displays as supporters, oranges and limes, every fruit placed with `fruit-ware`; the banana's clause on the shared `{the item}` phrases with the counter; `fruit-theft-chaos-thief`, `fruit-theft-again`; `import "wares"`
- `branch-stories/secret-letter/secret-letter.story` — deviations 7 and 8 in the header list
- `branch-stories/secret-letter/mercenaries.chord` — header: the stealing refusal now has consumers
- `branch-stories/secret-letter/secret-letter.tests.json` — six new branches (313 → 429 cards); the wax-candle clarification pin
- `docs/work/secret-letter-port/plan.md` — Phase 6 progress note
- `docs/context/session-20260830-0445-feat-adr-321-world-index.md` (this file)

## Notes
- Session started: 2026-08-30 04:45 CDT (session 5c4461)
- Rule 15 does not fire for `.chord`/`.story`; the tree's `states:` pins carry the mutation checks (`loaf.location = cloth satchel` after the noisy theft and `= player` after the quiet one; `player.location` at every eject and bounce; `pear.location`/`orange.location` on the fruit pair; `belt.location = rack of belts` on the refused chase theft; `story.state` at the hunted and chase cards).
- Probe harness reused from session 94cc71 (`probe.mjs`, repointed); tree edited programmatically (`retree-wares.mjs` against the committed tree).
- Not committed — David's call.

**Session duration**: ~0h30m (04:45 CDT – ~05:15 CDT 2026-08-30).

**Approach**: a gap check (change document + source Book 2 against the build's declarations) to pick the increment, then content authoring against the accepted platform — structure only, Gentry's text verbatim, David's lines as PLACEHOLDERs — with every mechanism question answered by reading the source (`runtime.ts`, the parser, the binder) and every divergence either worked around in the story and recorded, or filed.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 6 continues; no incomplete-work estimate given this session)
- **Rollback Safety**: safe to revert — nothing committed yet (`git status --short` shows 5 modified files, 1 new story file (`wares.chord`), plus this untracked summary)

## Dependency/Prerequisite Check

- **Prerequisites met**: the prior session's cable/Market Escape work (`8e4c0b4d`) as the tree baseline; the trade trait and `wary` shared-refusal trait reused for the wares' theft refusals; ADR-326's random-adjacent-room throw reused for the chase eject; the timer pattern reused nowhere new this session (Market Escape's spool from the prior session gained a consumer instead).
- **Prerequisites discovered**: none new this session — the four platform gaps filed (#335-#338) surfaced during this work but did not block it; three were routed around in the story content, one (#338) reported and left open.

## Architectural Decisions

- None this session — no ADR written, amended, or referenced. The prose-substitution and bonnet-alias choices recorded in Key Decisions are content/structural rulings within Claude's authority, not platform decisions.

## Mutation Audit

- Files with state-changing logic modified: none — this session's changes are `.chord`/`.story` content files, which rule 15's carve-out excludes from the mutation-verification trigger (no side-effect-named TypeScript functions touched).
- Tests verify actual state mutations (not just events): YES (evidence: the tree's `states:` pins carry the mutation checks — `loaf.location = cloth satchel` after the noisy theft and `= player` after the quiet one, `player.location` at every eject and bounce, `pear.location`/`orange.location` on the fruit pair, `belt.location = rack of belts` on the refused chase theft, `story.state` at the hunted and chase cards; `./sharpee test branch-stories/secret-letter` run directly by this writer, 429 cards passing / 774 assertions passing / 0 failing, seed 1209, 2026-08-30, after the session's last edit).
- If NO: N/A — see above; this is the project's documented alternative to TS-level mutation assertions for story content.

## Recurrence Check

- Similar to past issue? YES — the port-content-exposes-a-platform-gap pattern recurs again this session: GH #335 (`phrase … with p = v when …` unparseable), #336 (possessive entity names unusable in conditions/`change`), #337 (no bare-name binder marker), #338 (scenery supporters' contents shown by `look` but not by the entering description) join #333/#334 from the immediately preceding session (`docs/context/session-20260830-0253-feat-adr-321-world-index.md`) and #323-#332 before that, all from the same Phase 6 work.
- Consider one-time audit: not warranted yet — same conclusion as the prior sessions' checks: each occurrence resolves cleanly through the discuss-then-file path CLAUDE.md prescribes; this is the intended pattern operating as designed.

## Test Coverage Delta

- Tests added: Secret Letter tree +116 cards / +230 assertions (313→429 cards, 544→774 assertions) from the wares and generic theft-rule increment.
- Tests passing before: 313 cards / 544 assertions (previous session's finalize, `8e4c0b4d`) → after: 429 cards / 774 assertions, 0 failing (evidence: `./sharpee test branch-stories/secret-letter`, run directly by this writer, 2026-08-30 CDT, seed 1209, after the session's last edit — the main session's own 05:12 CDT run reported the same 429/774/0 and is corroborated by this re-run).
- Known untested areas: David's PLACEHOLDER lines carry no content-level assertions beyond structural card pins; GH #335-#338 remain open against the platform; the "not carried" list in Open Items (collective-wares steal, blocked-tail on distant descriptions, bare smell in two stalls, knife-into-scabbard, tasting/peeling/random wax colour, unbounded blocked-room throw) is unaddressed.

---

**Progressive update**: Session completed 2026-08-30 05:15 CDT
