# Session Plan: `climbable to <the room>` and a destination climb that arrives somewhere

**Created**: 2026-11-13
**Plan Status**: ABANDONED
**Abandoned**: 2026-11-13, session 73efa4, David's ruling "B" after `plan-review` found the plan contradicts ADR-378 D1, D1b and D6 and ADR-380 D1: a room owns its ways, and "climb this and arrive in another room" is already sayable as the room's `passage` block. Nothing in this plan was built. What follows from the ruling is a separate small change: `ClimbableTrait.destination` and the stdlib path that reads it are retired.
**Overall scope**: Give Chord a way to say where a climb arrives (`climbable to <the room>`, lowered to ClimbableTrait's existing destination field), and finish stdlib climbing's destination path so a destination climb reads like arriving in a room, as going does. Both halves ship together (David, 2026-11-13: "yes, do both together").
**Bounded contexts touched**: Chord language (`packages/chord`), Chord loader (`packages/story-loader`), stdlib actions (climbing, going), English text (`packages/lang-en-us`), the derived test tier (`packages/branch-tester`); `packages/world-index` only if open point 4 rules it in.
**Key domain language**: destination climb, arrival (room heading, description, first-time prose, darkness), `climbable to`, `climb_nowhere`, `on the player climbing` clause.

## References consulted
- `docs/architecture/adrs/adr-218-chord-foundations.md` — §1a defines `climbable` as one adjective composing ClimbableTrait with default config; `climbable to` departs from "default config", so the departure needs a recorded ruling (a new ADR or a dated §1a note — open point 3).
- `docs/architecture/adrs/adr-378-passages-and-pushing-between-rooms.md` — D7 makes a climb up or down going, delegated, with going narrating the arrival; pushing emits its own line and then going's arrival events, which is the precedent for a destination climb; D1 says a room owns its exits, so a thing must not write one.
- `docs/architecture/adrs/adr-379-systems-are-domain-services.md` — D2's one-home rule: a rule consulted by two actions has one home, and a second copy at a second consumer is a defect, so climbing must not re-implement going's arrival; D5 lists `to` in traversal's Chord vocabulary.
- `docs/architecture/adrs/adr-395-exploring-tests-run-on-test-stories.md` — derived-tier and exploring tests read a test story or a dedicated fixture, never Secret Letter; real stories other than Dungeo do not gate; a plan that adds a Chord error compiles `test-stories/` beside `stories/` and `branch-stories/` in its census.
- `docs/architecture/adrs/adr-381-connectors-replace-attachment.md` — D1 retires the Chord words `attached to` and `detachable` (not yet landed; the parser still has them), so `climbable to` copies `powered by`'s keyless entity-ref shape rather than leaning on `attached to`.
- `docs/architecture/adrs/adr-392-sensory-traits-and-the-trait-words-of-664.md` — D2 reuses the keyless single-value setting after an adjective, with a required article, which is the parse shape `climbable to` takes.
- `docs/architecture/adrs/adr-373-physical-state-attached-breakable-tying.md` — D1 is superseded by ADR-381; its Scope line lists the surfaces a Chord adjective change touches (EBNF and its pin, manifest, alias catalog, grammar log, loader, derived runner).
- `docs/architecture/adrs/adr-255-alias-catalog.md` — each climbing message has a curated override alias, and the bijection test fails on a new message without one; story-loader's map is edited by hand and the Chord catalog is regenerated.
- `docs/architecture/adrs/adr-349-the-location-heading-is-authored-and-composed-per-turn.md` — the location heading is emitted with a room description on movement, so an arrival that emits the description carries the heading with it.
- `docs/context/project-profile.md` — Chord tests assert diagnostic codes and IR fields; platform tests assert post-call WorldModel state, never "didn't throw"; builds go through `./repokit`.
- `docs/context/session-20261112-2115-main.md` — open items (#699, #700, #693, #695, #401) are tree-walker and claims work; none bears on this plan.
- `packages/stdlib/CLAUDE.md` — drive phases through the phase runner; assert world state; message ids only, no English in stdlib; a delegation is recorded in the lifecycle registry.
- `packages/lang-en-us/CLAUDE.md` — all player-facing text lives in lang-en-us; entity-valued parameters carry entity info for the formatter chain.
- `docs/proposals/code-documentation-sweep.md`, `docs/proposals/docs-consolidation.md`, `docs/proposals/publish-readiness-defects.md` — they hold accepted items not yet planned, but none concerns climbing or Chord adjectives; no proposal item is planned here.
- Product ADRs not consulted (no Scope intersection): none

## Open design points (David's rulings, taken in Phase 1)

1. **How a destination climb narrates the arrival, and which traversal rules apply.** Today the destination path moves the player and emits a bare moved event: it gives no room description, no darkness check, no first-visit prose, and it does not mark the room visited. Three shapes:
   - (a) **One home for arrival** (recommended): going's arrival halves move into one stdlib helper that going and the destination climb both call. Execute's half covers first-visit staging and marking and the region crossings. Report's half covers the actor exited, moved and entered events, the darkness line, the room description with its heading, and the contents and holder listings. Going's output does not change. Traversal's exit gates (hidden, blocked, door, `admits`) do not apply because a climb destination is not an exit. Arrival perception does apply (darkness, first-time prose). A room's `after the player entering` fires, because the moved event is going's. This is ADR-379 D2's one-home rule applied to arrival.
   - (b) **Delegate to going through a way**: the loader writes a hidden passage from the thing's room to the destination, and the climb delegates to going as climb up and climb down do. Every traversal gate and going's hooks come for free. The costs: a thing writes a room's exit (against ADR-378 D1), and the edge is wrong if the thing moves.
   - (c) **Climbing emits its own description**: a second copy of going's arrival, the drift ADR-379 D2 calls a defect (GH #326 first-visit prose and GH #338 holder listings were this kind of drift).
   - Sub-question: what a destination climb does when the player is aboard a vehicle or inside an enclosure. Today it moves the player alone.
2. **The destination climb's standard line.** It reuses `climbed_onto` today ("You climb onto the iron ladder."), which reads wrong for arriving in a room. Recommended: a new id `climbed_to` reading "{You} {climb} {the target}.", followed by the arrival heading and description. A clause's first phrase overrides this line as it does today. The new id is added in lang-en-us, its alias in story-loader's map, and the Chord catalog is regenerated by `./repokit aliases`.
3. **ADR or amendment.** Recommended: a new ADR (the next free number), with a dated note on ADR-218 §1a naming it. The ruling reaches past §1a's "default config": it adds a Chord adjective with a value, a new Chord error, and a stdlib arrival home that touches ADR-378 D0/D7 and ADR-379 D2.
4. **Does `climbable to` count as a way in world-index?** Reach (ADR-321 D4) and the map read only exits, so a room reached only by a ladder would be listed as unreached. Secret Letter's clause-driven moves are invisible to Reach for the same reason, so the gap exists today. `climbable to` is a static edge in the IR, so world-index can read it. Recommended: in scope for Phase 3, as a one-way thing-owned edge drawn like a passage. Otherwise file it as an issue.
5. **Surface details for the record**: the room-only error's name (recommended `analysis.climbable-to-not-room`), and whether `climbable to` beside `enterable` is an error. Execute lets the destination win.

## Phases

### Phase 1: Rule on the destination climb and record it
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: The decision record for a climb that arrives in a room: arrival's one home, the standard line, the `climbable to` surface and its error, world-index's reading.
- **Entry state**: David has approved this plan; no `packages/` edit has started.
- **Deliverable**: David's rulings on open design points 1 to 5, written down in the form point 3's ruling chooses. The recommended form is a new ADR in `docs/architecture/adrs/` with Context, Decision, Consequences and Session sections, `**Kind**: technical`, and a `**Scope**` line naming every package it reaches, plus a dated note in §1a of `docs/architecture/adrs/adr-218-chord-foundations.md`. An ADR gets `adr-review` before acceptance and the open questions ask (rule 11a). Phases 2 and 3 of this plan are revised wherever a ruling departs from the recommendation.
- **Files**: `docs/architecture/adrs/`, `docs/work/climbable-to/`
- **Exit state**: The record is ACCEPTED and has no Open Questions section, and ADR-218 §1a points at it. The Deliverables of Phases 2 and 3 match the rulings.
- **Demonstration**: Read the record: its Status line reads ACCEPTED with David's words and the date, and it has no Open Questions section. `grep -n "climbable to" docs/architecture/adrs/adr-218-chord-foundations.md` prints the dated §1a note.
- **Demonstrated**: 
- **Status**: ABANDONED

### Phase 2: A destination climb arrives in its room (stdlib)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: stdlib climbing's object path with a configured destination, the arrival it shares with going, and climbing's English line.
- **Entry state**: Phase 1's record is ACCEPTED.
- **Deliverable**:
  - The destination path in `packages/stdlib/src/actions/standard/climbing/climbing.ts` narrates the arrival from the home Phase 1 names. Under the recommendation, going's arrival halves move out of `packages/stdlib/src/actions/standard/going/going.ts` into one helper that both actions call, and going's events are unchanged.
  - The destination climb's primary line is the id Phase 1 rules (recommended `if.action.climbing.climbed_to`). It is added to climbing's requiredMessages and to `packages/lang-en-us/src/actions/climbing.ts`, and `climbed_onto` stays for a climb onto a thing.
  - Its alias goes into `packages/story-loader/src/message-alias-map.ts`, and `packages/chord/src/message-alias-catalog.ts` is regenerated by `./repokit aliases`, never edited by hand.
  - `packages/stdlib/src/actions/standard/climbing/climbing.ts#validateObjectClimbing` keeps David's 2026-07-20 ruling: a bare `climbable` refuses `climb_nowhere`, and an enterable supporter is still climbed onto.
  - A Behavior Statement for the changed execute and report and for the arrival helper; mutation-verification on the changed source.
  - Tests through the phase runner assert world state:
    - the player's location is the destination;
    - the destination is marked visited, and a room's first-time prose shows on that first arrival;
    - a dark destination gives the darkness line and no description;
    - the climbed line comes before the arrival description;
    - the destination test in `packages/stdlib/tests/unit/actions/climbing-golden.test.ts` asserts the new line and the arrival events.
  - Each new assertion is run once against the unchanged destination path, and its failure is recorded before the change lands.
- **Files**: `packages/stdlib/src/actions/`, `packages/stdlib/tests/`, `packages/lang-en-us/src/actions/climbing.ts`, `packages/story-loader/src/message-alias-map.ts`, `packages/chord/src/message-alias-catalog.ts`, `packages/sharpee/docs/genai-api/`, `stories/dungeo/src/version.ts`, `docs/architecture/adrs/`, `docs/work/climbable-to/`
- **Exit state**: A climb on a thing with a destination prints its line, then the room's heading and description as going prints them, and leaves the player in that room with the room marked visited. Going's suites pass unchanged, the alias bijection holds, and the Dungeo walkthrough chain moves no line.
- **Demonstration**:
  - `pnpm --filter '@sharpee/stdlib' test climbing` is green, including the new destination-arrival tests, and the recorded pre-change run of those tests shows them failing.
  - `pnpm --filter '@sharpee/stdlib' test going` is green, with no test edited.
  - `pnpm --filter '@sharpee/story-loader' test message-alias-map` is green.
  - After `./repokit build`, one run of `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` passes with no line moved.
- **Demonstrated**: 
- **Status**: ABANDONED

### Phase 3: Chord says where a climb arrives — `climbable to <the room>`
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The Chord language surface (parse, EBNF, the setting schema, the room-only check) and its lowering onto ClimbableTrait's destination, proven end to end through the real loader, engine and derived tier.
- **Entry state**: Phase 2 is DONE. The compile half of this phase does not depend on it, but the runtime and derived tests assert the arrival that Phase 2 narrates, so the order stands.
- **Deliverable**:
  - **Parser.** `packages/chord/src/parser.ts` lowers `climbable to <article> <name>` to the `climbable` composition with one keyless name value, the shape `powered by` takes at `packages/chord/src/parser.ts:4384`. A missing name raises `parse.climbable-to`. Bare `climbable` lowers byte-identically.
  - **EBNF.** `packages/chord/chord.ebnf` composition gains the `climbable` `to` ARTICLE name alternative. The website copy is regenerated by `./repokit ebnf`. The pin in `packages/chord/tests/language-version.test.ts` is re-recorded with a dated comment and no version bump.
  - **Setting schema.** `packages/story-loader/src/setting-schema.ts` gives `climbable` a destination entity-ref, and `packages/chord/src/stdlib-manifest.ts` is regenerated by `./repokit manifest`, so an unknown name raises the existing `analysis.setting-names-no-entity`.
  - **Room-only check.** `packages/chord/src/validate-ir.ts` refuses a destination that is not a room with the error Phase 1 names (recommended `analysis.climbable-to-not-room`). The message names the thing and says that a climb arrives in a room; the ADR is cited in a code comment, not in the message.
  - **Loader.** The `climbable` row in `packages/story-loader/src/build/trait-routes.ts` resolves the destination through the loader's entity-ref resolution and sets ClimbableTrait's destination.
  - **Records.** One dated row in `docs/architecture/chord-grammar-changes.md`, and a Landed note on Phase 1's record.
  - **world-index.** Reads the edge only if Phase 1 rules point 4 in.
  - **Chord tests.** `packages/chord/tests/climbable-to.test.ts` (new) asserts the lowered IR fields, `parse.climbable-to`, and the room-only error on a committed source naming a thing rather than a room.
  - **Real-path runtime tests.** `packages/story-loader/tests/climbable-to-runtime.test.ts` (new) boots the approved iron-ladder story through `packages/story-loader/tests/helpers/boot-turns.ts` and checks five cases:
    - "climb ladder" prints ladder-climbed, then the Loft's heading and description, and the player is in the Loft;
    - with the ladder loose, it prints ladder-shifts and the player stays in the Well House;
    - a `climbable to` thing with no clause prints the standard line, then the arrival;
    - `a supporter, climbable, enterable` is still climbed onto;
    - a bare `climbable` scenery thing still refuses `climb_nowhere`, and the player does not move.
  - **Derived tier.** `packages/branch-tester/tests/derived-climbable-to.test.ts` (new) runs the derived runner over `packages/branch-tester/tests/fixtures/derived/climbable-to.story` (new), and the clause's phrase row and refusal row pass. This is the obligation the four Secret Letter rows turned up. Beside it, the committed known-failing fixture `packages/branch-tester/tests/fixtures/derived/climbable-to-bare.story` (new) has the same clause on a bare `climbable` thing, and that row fails with `climb_nowhere`.
  - **Census.** Every story under `stories/`, `branch-stories/` and `test-stories/` is compiled, and none gains a diagnostic.
  - **Secret Letter.** Not edited. Its four rows stay failing until the port resumes and David's content adopts `climbable to`.
- **Files**: `packages/chord/src/`, `packages/chord/chord.ebnf`, `packages/chord/tests/`, `packages/story-loader/src/`, `packages/story-loader/tests/`, `packages/branch-tester/tests/`, `packages/world-index/`, `website/public/chord.ebnf`, `packages/sharpee/docs/genai-api/`, `stories/dungeo/src/version.ts`, `docs/architecture/chord-grammar-changes.md`, `docs/architecture/adrs/`, `docs/work/climbable-to/`
- **Exit state**: An author can write the approved iron-ladder example and it plays as intended. A non-room destination is a named Chord error. A bare `climbable` and an enterable supporter behave as before. The derived tier passes on a `climbable to` clause and fails on the bare shape. The census is clean, and the Dungeo walkthrough chain moves no line.
- **Demonstration**:
  - `pnpm --filter '@sharpee/chord' test climbable-to` is green.
  - `pnpm --filter '@sharpee/chord' test language-version` is green with the re-recorded pin.
  - `pnpm --filter '@sharpee/story-loader' test climbable-to-runtime` is green, asserting the player's location after each climb.
  - `pnpm --filter '@sharpee/branch-tester' test derived-climbable-to` is green, with the bare fixture's row reported failing as the test expects.
  - The census lists zero new diagnostics.
  - After `./repokit build`, one run of `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` passes with no line moved.
- **Demonstrated**: 
- **Status**: ABANDONED
