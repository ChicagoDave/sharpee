# Session Summary: 2026-06-23 - fix/platform-issues-book-qa

## Goals
- Triage the 2026-06-23 book execution log (`docs/book/testing/execution-log-20260623.md`)
  into GitHub issues.
- Fix the platform defects it found, one at a time, discussing each before touching `packages/`.

## Phase Context
- **Plan**: None at session start; `plan-159-npc-movement-announce.md` written this session.
- **Phase executed**: Issue triage → sequential platform fixes (#154, #155, #158) → design+plan for #159.
- **Phase outcome**: 3 platform fixes committed with tests; #159 fully planned (awaiting implement).

## Completed

### Filed 11 GitHub issues (#152–#162)
From the execution log's 11 findings. Split by label: `bug` for the 5 platform
defects (#154, #155, #158, #159, #162), `documentation` for the 6 book-text
issues (#152, #153, #156, #157, #160, #161). Each body links back to the log.

### #154 — player not examinable (commit 488d7c12)
`examine me/myself/self/yourself` all failed despite a full IdentityTrait.
Root cause: `command-validator.ts` excluded the player from all three
candidate-finders (`getEntitiesByName/BySynonym/ByAdjective`) via
`entity.id === getPlayer()?.id`. **No** pronoun fallback exists (`RECOGNIZED_PRONOUNS`
is only it/them/him/her + neopronouns), so the player was unreachable.
Fix: lifted the player exclusion (kept the room exclusion). Added a
reproduction test in `command-validator-golden.test.ts`. The AWARE
broad-search (hear/smell) player exclusion was left untouched.

### #155 — registered event handlers fire twice (commit d2112c3d)
Region boundary events (and any `world.registerEventHandler` handler) double-fired.
Root cause: `EventProcessor.processSingleEvent` invokes handlers through BOTH
`world.applyEvent()` (the `eventHandlers` Map, directly) AND `invokeEntityHandlers()`
(the same handler wired into the processor's `storyHandlers` by ADR-086). This is
exactly the double-processing ADR-086 explicitly rejected (Alternative #3).
`chainEvent` handlers never doubled (applyEvent doesn't invoke them) — matching the
log's observation that Ch.13 chains worked but the Ch.9 region probe doubled.
Fix (chosen): `WorldEventSystem.applyEvent` now only validates + records history;
the EventProcessor is the sole dispatcher. Updated the two world-model
event-sourcing tests to the new contract; new reproduction test in event-processor.

### #158 — room contents list lacked the Oxford "and" (commit a751c407)
Lists rendered comma-only ("A, B, C here") though the lang layer has a list
formatter. Root cause: three emitters (`looking-data.ts`, `going.ts` auto-look,
`switching_on.ts`) pre-joined names with `.join(', ')` into a string, so the
`{items}` placeholder substituted it verbatim — and this put English list grammar
in stdlib. Fix: emit `items` as an array; templates use `{list:items}` (note: the
placeholder syntax is `{formatter:name}`, name LAST — `{items:list}` was wrong and
silently no-op'd). Routes through the existing `listFormatter`. New formatter test.
The dead `eventMessageFunctions.formatRoomDescription` helper (no runtime caller)
was left untouched.

### #159 — silent NPC movement: PLANNED (not implemented)
Plan: `docs/work/book-qa-platform-issues/plan-159-npc-movement-announce.md`.
Resolved as an **author-controlled, opt-in** feature (David's call), not a platform
default. The lang templates (`npc.leaves/enters/arrives/departs`), stdlib message
IDs, and `getOppositeDirection` already exist — `executeMove` just never emitted
them. Design: `NpcTrait.announcesMovement` (default false) + per-NPC
`movementMessages` override map (+ global override via `extendLanguage`). Bare
`npc.moved` is retained for data/handlers.

**Plan revised this session (devarch review pass):** the original "darkness degrades
the visual line to sound, keyed off a `data.movement` flag" model was replaced —
David rejected the degrade implication (it treated sight as primary, hearing as a
lossy fallback). New model: **per-sense rendering selection**. The emitter pushes a
sense-neutral `npc.moved.witnessed` fact carrying `data.renderings:
PerSenseRenderings` (`{ sight, hearing }`); `PerceptionService.filterEvents` selects
`renderings[sense]` by `SENSE_PRECEDENCE` (sight ▸ hearing ▸ smell ▸ touch). No
sense is canonical; `PerceptionService` imports no NPC message IDs (emitter owns
them). See memory `perception-renderings-pattern`.

## Key Decisions

1. **Discuss-first honored for every platform fix.** Used AskUserQuestion to pick the
   approach for #154 (lift exclusion) and #155 (applyEvent stops dispatching) before editing.
2. **#155: applyEvent stops dispatching** rather than de-wiring handlers or deduping in
   the processor — matches ADR-086's "EventProcessor = single source of truth".
3. **#158: list grammar belongs in lang, not stdlib** — stdlib passes arrays; the
   `{list:items}` formatter owns the conjunction (book §19.6 = Oxford comma).
4. **#159 is authoring, not a platform default** — `announcesMovement` flag + override
   map. Discovered NPC/plugin events bypass `eventProcessor.processEvents()`, so
   `registerEventHandler` does NOT fire for them today; the behavior is the real seam.
5. **#159 darkness → sound via PerceptionService** — perception layer owns the
   sense selection; the NPC service stays perception-agnostic.
6. **#159 uses per-sense renderings, not degrade-to-sound** (revised after devarch
   plan-review). Sight/hearing are co-equal projections of one fact; emitter owns
   the message IDs so `PerceptionService` is feature-agnostic. Shared wire-type
   `Rendering`/`PerSenseRenderings` in `@sharpee/core` (rule 8b — imported both
   sides, not redeclared).
7. **Two ADR amendments written** (2026-06-23): ADR-070 (NPC emission lives in
   stdlib `NpcService`, not engine — original table was stale) and ADR-069
   (per-sense rendering selection supersedes type-matching for witnessable events).
   Both ran through `devarch:adr-review` — one BLOCKER (undefined shared wire-type)
   + four SMALL contract gaps, all resolved in the ADR + plan.

## Next Phase
- **Implement #159** per the revised plan: `@sharpee/core` shared type (§3.0),
  world-model trait fields, npc-service emits `npc.moved.witnessed` with a
  `renderings` map, `PerceptionService.filterEvents` per-sense selection, 2 new
  heard templates + stdlib IDs. Two tracked non-blockers: verify `canPerceive`
  handles `'hearing'`; confirm the `npc.moved.witnessed` type name on wiring.
  Then **#162** (ambience channel stale-mood / `emit:'sparse'` + undefined).
- **Entry state**: on branch `fix/platform-issues-book-qa`, 3 commits ahead; deps
  installed; tests runnable via the corepack pnpm shim (see Notes).

## Open Items

### Short Term
- #159 implementation (planned, NOT STARTED).
- #162 (last platform issue) not started.
- 6 documentation issues (#152, #153, #156, #157, #160, #161) are book-text fixes,
  unaddressed (separate from platform work).

### Long Term (noted in #159 plan §7, out of scope)
- Route NPC/plugin events through `eventProcessor.processEvents()` so
  `registerEventHandler`/`chainEvent` work for them (the "deeper" half of #159).
- Reconcile `wanderer`/`follow` `announceEntry` emotes with the new flag.
- Per-NPC override of the *heard* (dark) variant; degrading `npc.emoted`/`npc.spoke` in dark.
- Reconcile the dead `formatRoomDescription` helper ("A, B and C", no Oxford comma)
  with `listFormatter` if it's ever revived.

## Files Modified

**stdlib** (#154, #158):
- `packages/stdlib/src/validation/command-validator.ts` — lift player exclusion (3 sites)
- `packages/stdlib/tests/unit/validation/command-validator-golden.test.ts` — new player self-ref test
- `packages/stdlib/src/actions/standard/looking/looking-data.ts` — emit `items` array
- `packages/stdlib/src/actions/standard/switching_on/switching_on.ts` — emit `items` array
- `packages/stdlib/src/actions/standard/going/going.ts` — emit `items` array

**world-model** (#155):
- `packages/world-model/src/world/WorldEventSystem.ts` — applyEvent no longer dispatches handlers
- `packages/world-model/tests/unit/world/world-model.test.ts` — updated 2 tests + new wiring test

**event-processor** (#155):
- `packages/event-processor/tests/unit/handler-double-dispatch.test.ts` — NEW reproduction test

**lang-en-us** (#158):
- `packages/lang-en-us/src/actions/looking.ts` — `{list:items}` (you_see + contents_list)
- `packages/lang-en-us/src/actions/going.ts` — `{list:items}` (contents_list)
- `packages/lang-en-us/tests/formatters.test.ts` — new contents_list render test

**ADRs** (#159 design, amendments only — no original-decision edits):
- `docs/architecture/adrs/adr-070-npc-system.md` — amendment: NPC emission in stdlib + sense-neutral fact
- `docs/architecture/adrs/adr-069-perception-event-filtering.md` — amendment: per-sense rendering selection + normative Contract

**Plans / context**:
- `docs/work/book-qa-platform-issues/plan-159-npc-movement-announce.md` — NEW, then
  revised to the renderings model (§3.0 shared type, §4 Behavior Statements, §5 test 0
  state-mutation assertion, `npc.moved.witnessed` rename)
- `docs/context/session-20260623-1620-fix-platform-issues-book-qa.md` — NEW (this file)

## Notes
- **Build/test env**: repo had no `node_modules`; ran `pnpm install --frozen-lockfile`.
  `pnpm` is not on PATH — use the corepack shim:
  `export PATH="$PATH:/usr/local/lib/node_modules/corepack/shims"`.
- **Pre-existing failures (NOT regressions):** stdlib `test:ci` shows 5 failed *files*
  (channels/parser-factory) all from `Failed to resolve entry for "@sharpee/text-blocks"`
  (unbuilt workspace dep on a fresh install). engine `historical-accuracy` "turn number"
  test fails on baseline too (confirmed by reverting). Verified via stash that none are
  caused by this session's changes.
- **Verification totals after fixes**: world-model 1285✓, event-processor 18✓,
  lang-en-us 224✓, stdlib 1177✓ (0 assertion regressions), engine 435✓ (1 pre-existing fail).

## Session Metadata
- **Status**: IN PROGRESS — 3 of 5 platform issues fixed; #159 planned; #162 pending.
- **Blocker**: None.
- **Rollback Safety**: all changes on branch `fix/platform-issues-book-qa`, 3 isolated
  commits; safe to revert individually.

## Mutation Audit
- State-changing logic modified: `WorldEventSystem.applyEvent` (#155, removed handler
  dispatch — behavior change, covered by reproduction + updated unit tests);
  command-validator candidate-finders (#154, resolution only, no world mutation);
  list emitters (#158, event payload shape only).
- Tests verify the change: yes — reproduction tests for #154 and #155 fail-before/pass-after;
  #158 covered by a formatter-render test.
