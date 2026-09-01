# Session Summary: 2026-08-30 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Secret Letter port, Phase 6 (CURRENT): the market backdrops — Book 2, Part 19 (`story.ni:3324-3617`): the shoppers, the market wall, the generic stalls, the awnings, the support wires, Grubber's Market as a noun, and the bare `smell`/`listen` answers that fall through to it. David: "proceed" (2026-08-30 05:30 CDT) on the recommended increment.
- Standing rule (David, 2026-08-30): build what the source does; report every gap.
- Content authority unchanged: structural work is Claude's; every finished line is Gentry's carried verbatim (this increment has zero placeholders).

## Completed
- **`backdrops.chord`** (new, imported from `grubbers-market.chord` after the wares): the six backdrops, each ONE scenery entity that FOLLOWS the player — a `when Jack moves` clause moving it `here` wherever it belongs, firing on walked AND authorial moves (the theft eject pin proves the crowd lands with her) — membership as named conditions over explicit room lists (`open-air`, `market-perimeter`, `within-grubbers`, `under-the-awnings`, `among-the-wires`, `market-air`, `market-din`).
  - **The shoppers**: base + mercenaries-wary descriptions, the four away-place lines answering every covered verb (roof/alley+base/top/tent), the `stopping` talk refusal, the four random shoves on the physical verbs, smell/listen lines.
  - **The market wall** (perimeter only): description, climb refused.
  - **The stalls**: six per-place examine variants, push refused.
  - **The awnings** and **the wires**: full refusal sets; the wires' looking-straight-up variant at the base; not at the Top, where the runway's cables answer to "wires" themselves.
  - **Grubber's Market**: five per-place examine variants, its smell and sound.
  - **The alley's garbage** (`story.ni:1545-1557`), for the alley's smell answer.
- **Bare `smell` and `listen`** as bare-grammar story actions (`sniffing`, `hearkening` — peering's shape, GH #317's known seam; `smell bread` still reaches the loaf): the source's per-room tables with exclusive guards and Gentry's own fallbacks (`story.ni:519, 526`). Lands the previously-unreachable Leather/Candle stall smells (`story.ni:2557, 2795`), the Fruit Stall's, the tent's and top's smell/sound pairs, and the eavesdrop's alley/roof bare listens on their existing phrase keys.
- **Tree**: `./sharpee test branch-stories/secret-letter` — **498 cards passing, 857 assertions passing, 0 failing** at seed 1209 (2026-08-30 ~06:30 CDT); baseline 429/774 (`1d48d219`). New: a 56-card calm tour (branch 3 under the first Grocery visit) covering every backdrop surface and both tables with mover-location pins (`shoppers.location = Top of the Post` / `= Alley`, `wires.location = Base of the Center Post`, etc.); two eavesdrop branches (alley strain + ripe smell; roof listen-carefully + roof variants); two hunted branches at the junction (plain→wary crowd across the pair's arrival; a noisy cheese theft — urchin opener, `cheese.location = cloth satchel`, and `shoppers.location = Northwest Junction` after the authorial throw).

## Key Decisions
- No ruling needed from David; no platform code touched; no new prose deviations (the increment is placeholder-free). Five platform gaps filed; the dead `entering` clauses were authored, probed dead, removed, and their Gentry texts kept aside in the file for the day #341 closes.

## Open Items
- **Platform filed**: GH **#339** (`the player is in <region>` always false — is-in walks containment; the backdrops' named conditions become one-line region tests when it closes), **#340** (a bare-head actor clause colliding with the target's own clause yields "I don't understand that."), **#341** (`on the player entering` on a THING silently binds to room arrival and can never fire — this also makes the market gates' committed hunted entering refusal, `grubbers-market.chord:121`, dead code), **#342** (no proper-name marker for entities — "the Grubber's Market" in stdlib defaults), **#343** (listening default's number agreement — "The shoppers isn't making any sound.").
- **Not carried**, with reasons in the file header: the conspicuous shopper (random composed names — needs GH #303 item 2), `x stall`/`steal stall` → random ware (no random draw, no `try`), the source's `departing` rules (dead code in 2009 — no grammar reaches them), every `enter <backdrop>` answer (#341), "crowd of people" disambiguation naming and the does-the-player-mean preferences (`x people` on the roof asks which), per-location stall synonyms, `descend wall`, night closing, the crowd's peasant adjectives.
- **Walker limit noted**: a `states:` pin subject takes a single-word entity name — `market wall.location = Hat Stall` does not parse (dropped; the single-word movers carry the pins).
- Still unbuilt from Book 2: Teisha's silk wares (`story.ni:3023-3057` — the cloaks' "perfect disguise!" first-time line sits on the cloak thread the dress replaced: David's call), the bottom-of-the-post scenery (`story.ni:3654`, Part 18), the alley's remaining scenery (canvas tent backdrop, storehouse wall, the crates' nails), the distant centre post.
- Readings still open for David from the wares session (`wares.chord` header): the quiet calm lift of any ware; the opener split; the ungrateful stolen groceries.

## Files Modified
- `branch-stories/secret-letter/backdrops.chord` — new
- `branch-stories/secret-letter/grubbers-market.chord` — `import "backdrops"` after the wares
- `branch-stories/secret-letter/secret-letter.tests.json` — five new branches (429 → 498 cards)
- `docs/work/secret-letter-port/plan.md` — Phase 6 progress note
- `docs/context/session-20260830-0527-feat-adr-321-world-index.md` (this file)

## Notes
- Session started: 2026-08-30 05:27 CDT (session 262648)
- Mechanism probes (scratch story copies, `probe.mjs` repointed from session 0c81f6): a bare `smell`/`listen` consults no entity (`smelling.ts:38-40`); a bare-head `on smelling` on Jack fires on every smell and collides with a target's clause (#340); `is in <region>` is never true (#339); `when Jack moves` + `move … here` moves a backdrop with the player, authorial moves included; named conditions nest; a dispatch body fires EVERY matching phrase line (guards must partition); entering runs interceptor preValidate first (`entering.ts:106`) but Chord routes a thing's `entering` clause to the event stream (#341).
- The 37 `renderMessage … param 'item' is not bound` warnings in the tree run are pre-existing (identical count on the committed baseline, verified against a HEAD copy) — a pre-render of the theft phrases outside a taking context; not from this increment.
- Rule 15 does not fire for `.chord` content; the tree's pins carry the mutation checks (mover locations at the top/alley/junction, the stolen cheese's satchel, `story.state = hunted`).
- Not committed — David's call.

**Session duration**: ~1h05m (05:27 CDT – ~06:32 CDT 2026-08-30).

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 6 continues; next increment candidates listed in Open Items)
- **Rollback Safety**: safe to revert — nothing committed (`git status --short`: 4 modified, 1 new chord file, plus this summary)

## Dependency/Prerequisite Check

- **Prerequisites met**: the wares increment (`1d48d219`) as tree baseline; the eavesdrop's `alley-strain-to-hear`/`roof-listen-carefully` and the wares' `leather-smell`/`tallow-fumes-smell` phrase keys reused as the bare-verb tables' entries; peering's bare-grammar action shape reused for `sniffing`/`hearkening`.
- **Prerequisites discovered**: none blocking — five gaps filed (#339–#343), all routed around in story content or recorded as not carried.

## Architectural Decisions

- None — no ADR written or amended; the backdrop-as-follower shape is story content built on existing language (`when <entity> moves`, ADR-325 D3h).

## Mutation Audit

- Files with state-changing logic modified: none in rule 15's scope — `.chord` content only.
- Tests verify actual state mutations: YES — mover-location pins (`shoppers.location = Top of the Post`, `= Alley`, `= Northwest Junction` after the authorial throw; `wires.location = Base of the Center Post`), `cheese.location = cloth satchel`, `story.state = hunted` (evidence: `./sharpee test branch-stories/secret-letter`, 498 cards / 857 assertions / 0 failing, seed 1209, 2026-08-30, after the last edit).

## Recurrence Check

- Similar to past issue? YES — the port-content-exposes-a-platform-gap pattern again: #339–#343 join #335–#338 (wares), #333/#334, and #323–#332, all from Phase 6. Same conclusion as prior sessions: each resolves through the discuss-then-file path; the pattern is the process working. One nuance worth watching: #341 is the second case (after #327's minted back door) of a Chord declaration loading clean and being silently dead — silent-never-fires may deserve its own sweep someday.

## Test Coverage Delta

- Tests added: +69 cards / +83 assertions (429→498, 774→857) across five branches.
- Tests passing before: 429/774 (`1d48d219`) → after: 498/857, 0 failing (evidence: `./sharpee test branch-stories/secret-letter`, seed 1209, 2026-08-30 ~06:30 CDT).
- Known untested areas: `enter <backdrop>` paths (dead, #341); the conspicuous shopper (not carried); the wary crowd during chase (same clause as hunted, unpinned); `x people` disambiguation prompt.

---

**Progressive update**: Session completed 2026-08-30 ~06:32 CDT

---

## Progressive update 2 — the backdrop-gaps platform plan (same session, after David's "we need to wrap those 5 things in a plan" → "go with the proper keyword")

- **Plan**: `docs/work/archive/backdrop-platform-gaps/plan.md` (session-planner; `.current-plan` repointed; the port plan stamped "still live" per the standing 18b ruling). Plan review found one CONTRADICTION (Phase 4 offered an option ADR-242 D4 forecloses) — resolved by David's ruling: **the explicit `proper` kind word**; GH #342's framing corrected in a comment.
- **Phase 1 (#339) DONE**: `is in <region>` is a membership test — `evaluator.ts` routes a region place through `world.isInRegion` (transitive, non-room subjects via containing room); `resolvePlace` takes a purpose and the `analysis.region-not-a-place` landing gate fires for destinations only (`is in <region>'s location` stays gated). Tests: chord `landing.test.ts` +3 (12 passing); new `story-loader/tests/region-is-in.test.ts` (5 passing).
- **Phase 2 (#341) DONE**: an `entering` clause on a THING rides the entering action's interceptor — `runtime.ts` `eventTriggerFor` is owner-aware (rooms keep the arrival event, regions the crossings) and the `leaving` load-error keys on region-only verbs; ebnf comment updated. New REAL-PATH `entering-on-things.test.ts` (3 passing) through `CommandExecutor.executeAsActor`. Learned: a blocked turn returns `success: true`; refusals read from `if.event.entered { blocked, reason }`.
- **Phase 3 (#340) DONE**: the collision was `runPostReport`'s double-override throw surfacing as `command.failed` → "I don't understand that." Fix: FIRST override in consultation order wins (slots before actor = target-first), later overrides dropped with their emits kept — the same first-wins rule the runtime's per-owner merge uses. `lifecycle-engine.ts` + the `InterceptorReportResult` contract comment; stdlib's hard-error test rewritten (24 passing); new REAL-PATH `actor-target-collision.test.ts` (2 passing).
- **Phase 4 (#342 + #343) DONE**: `proper` composes on any create block (`analysis.proper-person-only` retired, unconditional gate kept; the loader's trait-adjective pass applies `properName: true, article: ''` to any kind) — chord `person-identity.test.ts` flipped (16 passing), new `proper-things.test.ts` (2 passing); ADR-257 D5 pin re-recorded under the standing 3.5.0 with the landing history in `version.ts` and a `chord-grammar-changes.md` ratchet row. #343: negative contractions added to `IRREGULAR_VERBS` (isn't/aren't, doesn't/don't, hasn't/haven't, wasn't/weren't) and the three hard-coded templates re-templated (`listening.no_sound`, `attacking.combat.not_hostile`, `giving.not_interested`) — singular renderings byte-identical, no default flip; `verb-agreement.test.ts` +1 case (18 passing), lang-en-us 447 passing.
- **Suites after Phases 1-4**: chord 1124 passing (73 files), story-loader 1014 passing (99 files), stdlib 1663 passing + 27 pre-existing skips, lang-en-us 447 passing; tsc clean on chord, story-loader, stdlib, world-model.
- **Phase 5 (story-side) DONE**: `./repokit build` fresh; `backdrops.chord` — the Open-Air Market and Market Perimeter as real nested regions (no landing lines needed), conditions collapsed to one-line region tests, the `enter <backdrop>` answers wired (the stalls' shoo behind the restored `at-a-stall`, the crowd's shove, the market's six-way ladder — the alley/tent walk-outs as authorial moves with a `merc-held` guard; the market `enterable, proper`: enterable is mechanical — clause moves ride a successful enter and the ladder covers every other room; proper renders "You get into Grubber's Market."). The gates' hunted `enter gates` refusal came alive (probed, pinned). Tree +19 cards / +30 assertions: the calm enter tour with `player.location` pins, the roof refusal, the hunted gates pair — **517 cards passing, 887 assertions passing, 0 failing** (seed 1209, 2026-08-30).
- **Closed**: GH #339, #340, #341, #342, #343 — each with the fix summary. Plan `backdrop-platform-gaps` DONE (all five phases); archived and the pointer returned to the port plan per its "resumable when the pointer returns" stamp.
- **Files (platform)**: `packages/chord/src/analyzer.ts`, `packages/chord/chord.ebnf`, `packages/chord/src/version.ts`, `packages/chord/tests/{landing,person-identity,language-version}.test.ts`, `packages/story-loader/src/{evaluator,runtime,loader}.ts`, `packages/story-loader/tests/{region-is-in,entering-on-things,actor-target-collision,proper-things}.test.ts`, `packages/stdlib/src/actions/lifecycle/lifecycle-engine.ts`, `packages/stdlib/tests/unit/actions/lifecycle-engine.test.ts`, `packages/world-model/src/capabilities/action-interceptor.ts`, `packages/lang-en-us/src/assembler/english-assembler.ts`, `packages/lang-en-us/src/actions/{listening,attacking,giving}.ts`, `packages/lang-en-us/tests/assembler/verb-agreement.test.ts`, `docs/architecture/chord-grammar-changes.md`, plus `branch-stories/secret-letter/{backdrops.chord,secret-letter.tests.json}` and both plans.

