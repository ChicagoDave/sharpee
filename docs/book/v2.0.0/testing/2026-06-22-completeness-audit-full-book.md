# Full-book completeness audit — every lesson must have explicit steps and complete code

**Date:** 2026-06-22
**Scope:** all 32 chapters + front/back matter of *The Sharpee Author and Developer Manual*
**Method:** 8 parallel audits (one per volume), each chapter cross-checked against its reference
`tutorials/familyzoo/src/vNN.ts` and against live platform source for API claims.
**Trigger:** the ch4 `examine signs` defect — collapsed code hiding required objects. This audit
finds the same class everywhere.

## The one systemic defect

The tutorial-grounded chapters **teach by showing excerpts of the reference `vNN.ts`**, but the
"Try it" transcripts exercise the **full** reference file. A reader following a chapter literally
cannot assemble a compilable, runnable result, and several "Try it" commands target objects the
chapter never creates. Concretely, the recurring omissions are:

1. **No import block** — code uses traits/APIs (`SceneryTrait`, `EntityType`, `ISemanticEvent`, …)
   with no `import { … } from '@sharpee/…'` ever shown.
2. **No enclosing frame** — snippets shown as bare methods/statements, never wrapped in
   `class FamilyZooStory implements Story { … }` or stated to live inside
   `initializeWorld` / `onEngineReady` / `extendLanguage`.
3. **Elided code** — `// ...as before`, `the same way`, `exactly as the previous chapter` standing
   in for **required** entity creation (the ch4 flagship; also ch2 ticket booth, ch15 pet wiring,
   ch23 map/brochure scoring).
4. **Dangling "Try it"** — commands reference objects/aliases/NPCs the shown code never creates.
5. **Missing `extendLanguage` registrations** — emitted `messageId`s never registered, so output is
   raw IDs (ch14 partial, ch15, ch22, ch23).
6. **Missing constant definitions** — `PHOTOGRAPH_ACTION_ID`, `PhotoMessages`, `TimedMessages`,
   `ScoreMessages`, `ROOM_SCORE_MAP` referenced but never defined.
7. **Behavior/handler with no entity** — ch20 writes & registers `parrotBehavior` for a parrot NPC
   it never creates; ch13 handlers target a souvenir press / gift shop never built in-chapter.

**Good news:** no chapter is a "to be written" stub — every "new/stub" chapter (3, 9, 10, 11, 16, 17,
18, 19, 21, 24–32) is a complete written lesson. Volume V (ch17–19) and ch26, ch30 are essentially
clean. The problem is uniform and mechanical: complete the code each chapter shows.

## Per-chapter findings (blockers = breaks literal reproduction)

| Ch | File | Blockers | Key items |
|----|------|---------:|-----------|
| Preface/Intro/How-to-Read | frontmatter/* | 0 | clean |
| 01 Installing | part-1/01 | verify | Teaches global `sharpee init/build/…`. devkit@1.0.8 IS published with a `sharpee` bin (standalone works now); in-repo it's `./sharpee`. Add mode caveat; verify each subcommand. |
| 02 Your First Room | part-1/02 | 4 | no imports; no `config`/`StoryConfig` literal; no `class … implements Story` wrapper; no `export`; **ticket booth elided** (`// ...built the same way`) → `examine booth` dangles. |
| 03 Play Loop | part-1/03 | 0 | conceptual ("no new code"); 1 nit (illustrative brass key). |
| 04 Rooms & Navigation | part-2/04 | 4 | **`// ...scenery and player placed exactly as before`** hides all 6 scenery + player; `examine signs` dangles; `SceneryTrait` forward-referenced (v02 vs ch5). |
| 05 Scenery & Portable | part-2/05 | 2 | `take feed`, `take goats` reference objects not in shown code; "Putting it together" shows only fence + map. |
| 06 Containers & Supporters | part-2/06 | 3 | backpack/dispenser/bench each created but **never `moveEntity`'d into a room**; dispenser also lacks `IdentityTrait`. |
| 07 Doors & Keys | part-2/07 | 5 | no imports; keycard/supplyRoom/gate-placement missing; `EntityType.SCENERY` should be `DOOR` (per v07); missing return exit; `examine shelves` dangles. |
| 08 Light & Dark | part-2/08 | 3 | no imports; nocturnal room has no `IdentityTrait`/exits (unreachable); `supplyRoom` undefined; `fuelRemaining`/`fuelConsumptionRate` on `LightSourceTrait` **unverified**. |
| 09 Map & Regions | part-2/09 | 0 | complete concept; region APIs verified real; `world.rooms` (queries pkg) used in passing. |
| 10 Standard Actions | part-3/10 | 0 | conceptual; deliberate signature sketches. |
| 11 Scope & Visibility | part-3/11 | 0 | conceptual; signposted forward refs. |
| 12 Readables & Switchables | part-3/12 | 2 | no imports; `pettingZoo`/`entrance`/`supplyRoom` undefined in-chapter. |
| 13 Event Handlers | part-4/13 | 5 | handlers shown without `onEngineReady` frame / `world`; no `entityIds` field; press/gift-shop/penny/feed not created; no imports. |
| 14 Custom Actions | part-4/14 | 6 | **`photographAction` never shown** though grammar/`getCustomActions`/Try-it use it; `PHOTOGRAPH_ACTION_ID`/`PhotoMessages` undefined; partial `extendLanguage`; no imports/frame; camera not created. |
| 15 Capability Dispatch | part-4/15 | 5 | pet grammar + all message text elided as "exactly as previous chapter"; no imports; parrot **NPC** must get `PettableTrait` (not the flock); registration location unstated. |
| 16 Custom Traits & Behaviors | part-4/16 | 0 | complete concept; `DispenserTrait`/`DispenserBehavior` exist in no buildable version (label illustrative or add to a version). |
| 17 Extending Grammar | part-5/17 | 0 | all grammar APIs verified; 1 frame flow-note. |
| 18 Language Layer | part-5/18 | 0 | all APIs verified. |
| 19 Formatter Chain | part-5/19 | 0 | **CLEAN** — every formatter/chain verified. |
| 20 NPCs | part-6/20 | 6 | no imports/frame; `roomIds` missing; **parrot NPC entity never created** (behavior has no actor); `npc.speech`/`npc.emote` built-in status unstated. |
| 21 Scenes | part-6/21 | 1 | complete concept; `SceneTrait` import/source unnamed; registration story unstated. |
| 22 Timed Events & Daemons | part-6/22 | 4 | no `ISemanticEvent`/`IdentityTrait` imports; `TimedMessages` const not shown; `extendLanguage` text missing → daemons emit raw IDs; `onEngineReady` framing. |
| 23 Scoring & Endgame | part-6/23 | 4 | no imports; `ScoreMessages`+victory text missing; `ROOM_SCORE_MAP` not shown; map/brochure/penny handlers elided ("the same shape covers…"). |
| 24 Channels | part-7/24 | 0 | concept; example calls invented `ambienceFor()` (real v18 uses `AMBIENCE_BY_ROOM`), no imports. |
| 25 Web Client | part-7/25 | 2 | `storyInfo` uses `'…'` for **required** `engineVersion`/`buildDate` (ships literal ellipsis); `#score-badge!` throws (element never added); `elements` literal/import omitted. |
| 26 Decoration & Theming | part-7/26 | 0 | accurate; "ship your own theme" is prose-only (show the `themes` config + a `[data-theme]` rule). |
| 27 Media & Audio | part-7/27 | 1 | **correct `media.*` vocabulary** (no `audio.*` mis-teach); invented `emit()` helper diverges from real `{ type:'emit', event: mediaEvent(...) }` Effect; `aviaryId`/`crunchSfx` undefined. |
| 28 Multi-File Story | part-8/28 | 0 | walkthrough-of-v17 by design; elides `RoomIds`/bodies; should cite `src/v17/` path inline; "four hooks" vs six methods. |
| 29 Transcript Testing | part-8/29 | 2 | **malformed assertion** `[OK: not contains "don't have")]` (stray `)`); dead example paths (`stories/familyzoo/` doesn't exist — zoo is `tutorials/familyzoo/`, no `wt-*` walkthroughs); `build --test` is standalone-only (throws in monorepo). |
| 30 Saving & Restoring | part-8/30 | 0 | strong; all APIs verified; reproduces v17 runner-state exactly. |
| 31 Building & Publishing | part-8/31 | 0 | runnable for standalone authors (devkit@1.0.8 published); qualify global-`sharpee` vs in-repo `./sharpee`; "you've used `sharpee` throughout" is retroactively off (tutorials used `./build.sh`, now deleted). |
| 32 Multi-User Zifmia | part-8/32 | 0 | concept accurate; `docker compose up -d` (not `--build`) for the published-image compose; reconcile `devkit` vs `sharpee` CLI naming with ch31. |

**Totals:** ~18 chapters with blockers; ~60 blocker-level items; remainder flow-notes. Concentrated in
the version-grounded chapters (Vols I–IV, VI).

## Recommended remediation

The fix is mechanical and uniform — for each version-grounded chapter:

1. **Open with an anchor**: "This chapter builds on Chapter N's world. New imports:" + the actual
   import block, and state which Story method each snippet belongs to.
2. **Show the complete new code** the reference version adds — every entity (with `IdentityTrait`
   *and* `moveEntity`), constant, message registration, and the behavior/handler's target entity —
   not an excerpt. Eliminate every `// ...as before` / "the same way" that hides required code.
3. **Make "Try it" self-consistent**: every command's noun/verb must resolve against objects the
   chapter's shown code creates (build the created-name+alias set, check each command).
4. **Fix the concrete API/CLI errors**: ch7 `EntityType.DOOR`; ch8 verify `LightSourceTrait` fuel
   props; ch25 real `storyInfo` values + guard `#score-badge`; ch27 real `mediaEvent`/`Effect`;
   ch29 the malformed assertion + real transcript paths + monorepo/standalone `--test` note;
   ch31/32 CLI-name + docker-flag + global-vs-`./sharpee` caveats.
5. **Settle the chapter↔version mismatch** (ch4/ch5 `SceneryTrait`): either teach `SceneryTrait`
   where it first appears (ch4) or re-split the version so each chapter introduces only what it shows.

Lowest-risk sequencing: fix in reading order (Vol I → VIII) so each chapter's "builds on Chapter N"
anchor is true as we go, re-running the book build after each volume.
