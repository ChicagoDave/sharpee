# Execution Log — The Sharpee Author and Developer Manual

**Artifact:** `~/repos/book-test/the-sharpee-book-v2.0.0.pdf` — title page reads "Version 2, Revision 2" (matches expectation; not stale).
**Run date:** 2026-07-10
**Reader profile:** first-time Sharpee author, book-only knowledge, executing front to back in one project.

---

## Chapter 1 — Installing Sharpee: The CLI and Your First Project
**STATUS: PASS**

- Executed: `node --version` (v22.23.1) / `npm --version` (11.18.0); `npm install -g @sharpee/devkit`; `sharpee init my-zoo -y`; `cd my-zoo`; `npm install`; `sharpee build`; `sharpee init-browser`; `npm install` (init-browser output suggested it, per §1.7); `sharpee build`.
- Environment gate: `@sharpee/devkit@2.2.0`, `@sharpee/sharpee@2.2.0`, `@sharpee/world-model@2.2.0` — expected 2.2.0 confirmed.
- All commands succeeded. `dist/my-zoo.sharpee` and `dist/web/` (index.html, game.js, css) produced as §1.6–1.7 describe.
- **Headless substitution (logged once, applies to the whole run):** this box has no browser/display, so `npx serve dist/web` + play-in-browser steps are verified instead by writing each chapter's "Try it" commands as a transcript test and running `npx sharpee build --test` (the testing command the book documents in §2.9). Chapters 24–27 will use Playwright against the built web client.
- CLI "Next steps" hints say `npm run build` where the book says `sharpee build` — accepted by design (CLI hint drift), not reported as an issue; the book's commands themselves all worked.

## Chapter 2 — Your First Room: Entities, Traits, and the World
**STATUS: PASS**

- Replaced scaffolded `src/index.ts` with the chapter's file (imports, config, `FamilyZooStory` class with `createPlayer` + `initializeWorld`, `export const story` / `export default story`), exactly as printed in §2.3–2.7.
- Created `tests/transcripts/first-room.transcript` as printed in §2.9; ran `npx sharpee build --test`.
- Result: 5/5 PASS, "All tests passed!" — matches the book's expected output (book pre-acknowledges the real run adds absolute paths and build steps).
- Note (not an issue): `SceneryTrait` is imported but not constructed; §2.2 explicitly says it "sits in the import block because Chapter 5 puts it to work." Build accepts it.

## Chapter 3 — The Play Loop: How a Turn Works
**STATUS: PASS**

- Conceptual chapter; the text states "You won't write any new code here." The one code block (§3.2.4 event shape) is explicitly illustrative ("the zoo has no brass key"), so nothing typed per the illustrative rule.
- No Try it / Test it block. Nothing to build. Project still green from Chapter 2.

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs
**STATUS: PASS**

- §4.1–4.3 fragments are explicitly illustrative ("shapes to read, not code to type") — nothing typed there.
- Applied §4.5: added `Direction` to the world-model import line; replaced `initializeWorld` with the complete four-room listing (replacement rule).
- Created `tests/transcripts/navigation.transcript` per §4.9. `npx sharpee build --test`: 12/12 PASS across both transcripts (first-room + navigation).
- Ambiguity resolved without incident: the Petting Zoo description line renders in print as `visitors\''` at page-edge; the PDF text layer confirms `visitors\' '` (escaped apostrophe + trailing space). Typed as printed; compiled fine.
- Note: Chapter 4's booth description drops Chapter 2's "A sign in the window reads" phrasing for "reading …" — Chapter 2's transcript assertion (`contains "Self-Guided Tours"`) still passes, so the suites stay green as the book intends.

## Chapter 5 — Scenery & Portable Objects: Everything Is Portable by Default
**STATUS: PASS**

- Added the souvenir penny (§5.1) at end of `initializeWorld` per the placement rule; added the §5.7 listing (iron fence, rabbits, zoo map, bag of animal feed) after it; fence typed once as §5.7 instructs.
- §5.8: replaced the Petting Zoo description with the `{snippet:rabbits}` marker version (replacement rule) and added the snippet map after the chapter's scenery code.
- Ambiguity (resolved, worked): §5.8 first shows a plain-string snippet map, §5.8.1 a bare-list one, §5.8.2 the `texts` + `mentions` form; §5.8.2 states the final form "is the version the zoo keeps; the plain string and the bare list above were stepping stones." Read as successive replacements — file keeps only the final form. The intermediate forms were not separately build-tested.
- Created `scenery-and-items.transcript` (§5.10) and `room-snippets.transcript`; `npx sharpee build --test`: 29/29 PASS across 4 transcripts, including the cycle → quiet → wrap sequence.

## Chapter 6 — Containers & Supporters: What Holds What
**STATUS: PASS**

- Added `SupporterTrait` to the Chapter 2 trait import (§6.3 shows the full replacement block).
- Added backpack (entrance), feed dispenser (Petting Zoo, Container+Scenery), park bench (Main Path, Supporter+Scenery) at end of `initializeWorld` per placement rule (§6.2–6.3).
- §6.4 capacity fragment is illustrative — nothing typed.
- Created `containers.transcript` (§6.7). `npx sharpee build --test`: 41/41 PASS across 5 transcripts.

## Chapter 7 — Openable Things, Locked Doors & Keys
**STATUS: PASS**

- §7.1–7.3 lunchbox/staffGate fragments are explicitly illustrative ("nothing to type until the puzzle listing later in the chapter").
- Added the §7.4 import (`OpenableTrait, LockableTrait, DoorTrait`) and the full puzzle listing at end of `initializeWorld`: Supply Room, metal shelves, staff keycard (entrance), staff gate (DOOR, five traits), exits routed `via` on both sides. Deleted the Chapter 4 Main Path exits assignment per the replacement rule.
- Created `locked-gate.transcript` (§7.6). `npx sharpee build --test`: 49/49 PASS across 6 transcripts.

## Chapter 8 — Light & Dark: What the Player Can See
**STATUS: PASS**

- Added `LightSourceTrait, SwitchableTrait` import (§8.7); flashlight block at end of `initializeWorld` (§8.4); Nocturnal Animals Exhibit + animals listing (§8.7), with the Supply Room exits table replacing Chapter 7's (old assignment deleted per replacement rule).
- §8.1–8.3 and §8.5 fragments (lunchbox-style gem/candle/lantern) are illustrative — nothing typed.
- Created `light-and-dark.transcript` (§8.9). `npx sharpee build --test`: 64/64 PASS across 7 transcripts.

## Chapter 9 — The Map & Regions: Grouping Rooms
**STATUS: PASS**

- Typed the §9.2 pair: `world.createRegion('reg-public'…)` / `('reg-staff'…)` at the top of `initializeWorld` ("before the rooms that belong to them"), and the six `world.assignRoom` calls at the end (placement rule, as §9.2 instructs).
- §9.4 handler sketch and §9.5 nesting examples are explicitly illustrative ("not part of the zoo… nothing to type in this chapter").
- No Try it / Test it block in this chapter; verified by rebuild: 64/64 PASS.

## Chapter 10 — The Standard Actions: The Four-Phase Model
**STATUS: PASS**

- Conceptual chapter ("You won't write an action in this chapter"). The `someAction` shape in §10.2 is a contract illustration — nothing typed. No Try it / Test it.

## Chapter 11 — Scope & Visibility: What the Player Can Reach
**STATUS: PASS**

- Conceptual chapter; no code blocks to type, no Try it / Test it.

## Chapter 12 — Readable Objects & Switchable Devices
**STATUS: PASS**

- Added `import { ReadableTrait } from '@sharpee/world-model';` (§12.0 shows exactly this single-name import; SwitchableTrait deliberately not re-imported, as the text warns).
- Added info plaque (Petting Zoo), zoo brochure (entrance), radio (Supply Room) at end of `initializeWorld` (§12.2–12.4). §12.1 `plaque.add` fragment is illustrative shape only.
- Minor ambiguity (cosmetic): the brochure's ReadableTrait exhibit lines have ambiguous leading-space width in the PDF (2–3 spaces depending on extraction); typed 2 spaces. No assertion touches it.
- Created `readables.transcript` (§12.7). `npx sharpee build --test`: 80/80 PASS across 8 transcripts.

## Chapter 13 — Event Handlers: Reacting to What Happens
**STATUS: PASS**

- Added the §13.4 imports (`GameEngine`, `ISemanticEvent`, `IWorldModel`), the two private ID class fields, the Gift Shop + souvenir press block and ID recording at end of `initializeWorld`, deleting Chapter 4's Aviary exits assignment (replacement rule).
- Added `onEngineReady` with both chain handlers (§13.5 goats-eat-feed, §13.6 penny-press) exactly as printed.
- §13.2 handler examples and the §13.5 "retune room prose" box are shapes to read, not typed.
- Created `event-handlers.transcript` (§13.8). `npx sharpee build --test`: 91/91 PASS across 9 transcripts.

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs
**STATUS: PASS**

- Added the missing names from the §14.0 import block (`Action, ActionContext, ValidationResult` from `@sharpee/stdlib`; `import type { Parser }` from `@sharpee/parser-en-us`; `import type { LanguageProvider }` from `@sharpee/lang-en-us`) per the import rule; both transitive imports resolved (accepted-by-design item 3).
- §14.1 skeleton (`hasRequiredItem`) explicitly not typed. Typed the real `feedAction` and `photographAction` as top-level consts before the class; camera added to the Gift Shop in `initializeWorld`; `getCustomActions` / `extendParser` / `extendLanguage` added as class methods.
- Minor ambiguity (worked): the book says the action objects are "top-level consts" and the three registrations are class members "alongside initializeWorld", but doesn't say where in the file to put the consts; placed them above the class so the methods can reference them.
- Created `custom-actions.transcript` (§14.8). `npx sharpee build --test`: 102/102 PASS across 10 transcripts.

## Chapter 15 — Capability Dispatch: One Verb, Many Rules
**STATUS: PASS**

- Added the missing names from the §15.0 import block (`ITrait`, `CapabilityBehavior`, `CapabilityValidationResult`, `CapabilitySharedData`, `CapabilityEffect`, `createEffect`, `findTraitWithCapability`) per the import rule.
- Typed `PettableTrait`, `PetMessages`, `pettingBehavior`, `PETTING_ACTION_ID`, `pettingAction` as top-level code before the story class (as §15.2.1 instructs); §15.4 animals block (goats/rabbits get traits, new parrot ACTOR in Aviary) and the `registerCapabilityBehavior` call at end of `initializeWorld`; updated `getCustomActions` (replacement), added pet/stroke grammar, added the four PetMessages texts.
- Created `petting.transcript` (§15.7). `npx sharpee build --test`: 110/110 PASS across 11 transcripts.

## Chapter 16 — Custom Traits & Behaviors: Data and Logic, Kept Apart
**STATUS: PASS**

- Created `src/dispenser-trait.ts` (§16.2) and `src/dispenser-behavior.ts` (§16.3) exactly as printed, including the `./dispenser-trait.js` ESM relative import the text explains.
- Per the chapter's honest note, the pair is deliberately left unwired: "nothing in index.ts changes in this chapter and there is no import to add there." The `dispenser.add(...)` line and §16.4 caller are shapes only.
- No Try it / Test it (explicitly). Both files compile alongside the story: `npx sharpee build --test` still 110/110.

## Chapter 17 — Extending the Grammar: Teaching New Sentence Shapes
**STATUS: PASS**

- No new code: §17.2/§17.4 re-present the extendParser patterns already typed in Chapters 14–15 (formatting differs — one call per line vs. chained — but content identical); §17.5 is a "Suppose…" and §17.6 a "You can…" example, so per the illustrative rule nothing was typed.
- No Try it / Test it. Rebuild still green (110/110).

## Chapter 18 — The Language Layer: Messages & Message IDs
**STATUS: PASS**

- No new code: §18.2's `extendLanguage` block re-presents registrations already typed in Chapter 14. Conceptual otherwise; no Try it / Test it. Build still green.

## Chapter 19 — The Phrase Algebra
**STATUS: PASS**

- The chapter states up front: "this is a reference chapter, and its listings are shapes to read, not code to type… nothing in this chapter changes your project." Nothing typed; no Try it / Test it. Build still green.

## Chapter 20 — Non-Player Characters: Actors That Take Turns
**STATUS: PASS**

- Added imports (`NpcTrait`; `NpcPlugin` from `@sharpee/plugin-npc` — transitive, resolved; `NpcBehavior, NpcContext, NpcAction, createPatrolBehavior` from stdlib).
- Added zookeeper (Main Path) with NpcTrait, promoted the Chapter 15 parrot with its own NpcTrait, typed `PARROT_PHRASES` + `parrotBehavior` as top-level consts, widened `roomIds` (replacement) and added the two recording lines, and added the plugin/behavior registration at the top of the existing `onEngineReady` as §20.4 instructs.
- Created `npcs.transcript` (§20.6). `npx sharpee build --test`: 117/117 PASS across 12 transcripts.

## Chapter 21 — Scenes: Named Windows of Story Time
**STATUS: PASS**

- Typed only the final `world.createScene('scene-petting-zoo', …)` form with `onBegin`/`onEnd` (§21.4 explicitly replaces the bare §21.2 version: "type in only this final form"); placed in `initializeWorld` per §21.2/placement rule. §21.3 queries, the `onEnd(ctx)` variant, and the §21.5 storm are illustrative.
- Created `scenes.transcript` (§21.7; chapter has no Try-it by design). `npx sharpee build --test`: 121/121 PASS across 13 transcripts — including recurring re-entry.

## Chapter 22 — Turns, Timed Events & Daemons
**STATUS: PASS**

- Added `SchedulerPlugin` + type imports from `@sharpee/plugin-scheduler` (transitive, resolved). Declared `TimedMessages` near the top of the module; typed the three factory functions before the story class; added the scheduler block in `onEngineReady` directly below the NPC registration as §22.1 instructs; extended `extendLanguage` with the six timed messages (§22.5).
- Created `timed-events.transcript` (§22.7). `npx sharpee build --test`: 136/136 PASS across 14 transcripts — the turn-by-turn PA/fuse/daemon clock behaves exactly as printed.

## Chapter 23 — Scoring & Endgame: Winning the Game
**STATUS: PASS**

- Typed `world.setMaxScore(75)` at end of `initializeWorld` (the one "real project code" line of §23.1; the awardScore/getScore block is a stated shape). Declared `MAX_SCORE`, `ScoreIds`, `ScorePoints`, `ROOM_SCORE_MAP`, `ScoreMessages` up front (§23.2).
- §23.3: added the room-visit / take-map / read-brochure chain handlers in `onEngineReady`; widened `entityIds` (replacement) + two recording lines; added the four in-action awards (feeding execute, photograph execute — renamed `_context` to `context` as instructed, petting behavior execute — renamed `_world` to `world` per the printed signature, penny-press chain).
- §23.4: `createVictoryDaemon` typed, registered alongside the others; VICTORY text added in `extendLanguage`.
- Created `scoring.transcript` (§23.6, the capstone). `npx sharpee build --test`: 164/164 PASS across 15 transcripts — victory fires on the turn the 75th point lands, and `score` reports the perfect-score line.

## Chapter 24 — Channels: The Universal UI Surface
**STATUS: PASS**

- Added the §24.6 `import type { IChannelRegistry, ChannelProduceContext } from '@sharpee/if-domain'` (transitive, resolved), the `AMBIENCE_BY_ROOM` map, and the `registerChannels` hook with the `zoo.ambience` sparse-replace channel.
- Ambiguity (worked): the listing shows the const and the hook together without saying where each goes; placed the const top-level with the other tables and `registerChannels` as a story-class method (it's described as a hook, like the other hooks).
- No Try it / Test it. `npx sharpee build --test` still 164/164. Browser verification below (with Chapter 25).

## Chapter 25 — The Web Client: A Framework-Free UI
**STATUS: PASS**

- §25.1 entry listing and §25.5 score-renderer are explicitly illustrative ("your scaffolded src/browser-entry.ts… stays as it is"; "this one is nothing to type"). Typed only the `zoo.ambience` renderer into `src/browser-entry.ts` after `connectEngine` / before `client.start()`, at the exact spot the scaffold's file-header comment names ("Add any story-specific channel/audio renderers before `client.start()`") — comment present in the scaffold as the book promises.
- Playwright verification (headless substitution): served `dist/web`, played `south`/`west` — `#zoo-ambience` shows "The air is alive with birdsong and the rustle of wings." in the Aviary and blanks (`''`) back on the Main Path, exactly the sparse-replace behavior §24.6 teaches; location and score channels update (`Score: 5 | Turns: 4`).

## Chapter 26 — Decoration & Theming: Style Without HTML on the Wire
**STATUS: PASS**

- Added the `[data-theme="zoo-sunny"]` token block plus the three flourish rules to `browser/my-zoo.css` (§26.4.2, named after the package name exactly as the text specifies), and listed the theme in `package.json` → `sharpee.themes` (final §26.4.2 list, superseding the §26.4.1 built-ins example).
- Left the scaffold's `defaultTheme: 'modern-dark'` alone, as Chapter 25 explicitly instructs.
- Build copies built-in theme CSS to `dist/web/themes/` and generates the menu. Playwright verification: initial `data-theme="modern-dark"`; theme menu contains "Zoo Sunny"; selecting it flips `data-theme="zoo-sunny"`, body background becomes `rgb(255,250,240)` (#fffaf0 warm cream) and the menu bar `rgb(74,157,82)` (#4a9d52 zoo green flourish). All as printed.

## Chapter 27 — Media & Audio: Sight and Sound as Channels
**STATUS: PASS**

- Added `AudioRegistry` (from `@sharpee/media`, transitive — resolved), `Effect` type (from `@sharpee/event-processor`, transitive — resolved), `createAmbientChannel` (stdlib), and `createAmbientChannelRenderer` (platform-browser). Typed: top-level `audio` registry + `mediaEvent`/`emit` helpers; the two `atmosphere(...)` declarations in `initializeWorld` after the rooms; the event-processor handler in `onEngineReady`; the engine-side channel in `registerChannels`; the browser-side renderer in `browser-entry.ts`.
- No asset files shipped, which the chapter blesses: "a story that declares a soundscape but ships no audio is silent, not broken."
- No Try it / Test it. Build: 164/164. Playwright verification: walking into the Aviary made the client request `audio/aviary-birdsong.mp3` (404s silently, no page errors) — the media.* → channel → renderer pipeline demonstrably fires end-to-end.

## Chapter 28 — The Multi-File Story: Putting It All Together
**STATUS: PASS**

- The book's single read-along chapter: "there is nothing to type in this chapter"; the seven-file project lives in the companion GitHub repository. Per the run's accepted-by-design item 1, the offline reader having nothing to run here is the known trade-off and is not reported as a defect.
- The single-file zoo "keeps working exactly as it is for every chapter that follows" — confirmed, suite still 164/164.

## Chapter 29 — Transcript Testing & Walkthroughs
**STATUS: PASS**

- Created `feed-the-goats.transcript` (§29.1), `walkthroughs/wt-01-into-the-zoo.transcript` and `wt-02-feeding-time.transcript` (§29.5) exactly as printed, exercising `[EVENT: …]`, `[STATE: …]`, `$save` / `$restore`.
- `npx sharpee build --test`: "Walkthroughs: 2 files (chained)" then 4 + 2 PASS, matching the book's expected output; full suite 174/174 across 18 transcripts.
- The `[STATE: true, yourself.inventory contains bag of animal feed]` expression using exact created names resolved correctly on 2.2.0 (carried-over behavior noted in the run brief; not a defect).
- §29.4 control-flow directives are descriptive here (the `[GOAL:]` bracket is explicitly for the multi-file zoo: "skip this bracket if you stayed single-file" — we did).

## Chapter 30 — Saving & Restoring: State Lives in the World
**STATUS: PASS**

- Conceptual chapter; the behavior-swap daemon and `getRunnerState` listings are the ch28 multi-file snapshot's code, shown to explain the one save trap — nothing to type into the single-file zoo. No Try it / Test it.
- Save/restore machinery already exercised: walkthrough `$save`/`$restore` chain (Chapter 29) passes, and the browser autosave was implicitly active in the Playwright sessions. Suite still 174/174.

## Chapter 31 — Building & Publishing: The Single-Player Browser Client
**STATUS: PASS**

- No new code; §31.1–31.3 re-run the toolchain already exercised: `sharpee build` (compiled story + `dist/my-zoo.sharpee` bundle + `dist/web/`), `sharpee init-browser` (done in Chapter 1), `npx serve dist/web` (verified: HTTP 200 from the static folder — same server used for the Playwright checks).
- Full suite as final gate: 174/174 PASS across 18 transcripts (16 unit + 2 chained walkthroughs).
- The §31.2 unused-snippet-entry build warning was not independently triggered — doing so would require deliberately corrupting the snippet map, which is outside execute-as-is scope. Not a finding.

## Appendices A–E
**STATUS: PASS (reference only)**

- All five present (Architecture Map, Action Catalog, Trait Catalog, Message-ID Reference, Grammar Reference). No executable steps; nothing to test. Spot-consistency with the run: every action/trait/message the chapters used appears in the catalogs.

---

# Run Summary

**Result: CLEAN.** 31/31 chapters PASS, 0 BLOCKED, 0 DEVIATIONS.

- Final state: one project (`~/repos/book-test/my-zoo`), single-file story of ~1,900 lines plus the Chapter 16 trait/behavior pair, 16 unit transcripts + 2 chained walkthroughs — **174/174 assertions passing** on `@sharpee/*` 2.2.0.
- Browser client verified headlessly with Playwright: ambience channel (Ch 24–25), Zoo Sunny theme flip (Ch 26), media pipeline firing an asset request on room entry (Ch 27).
- Every issue encountered was either an ambiguity a literal reader could resolve from the book's own conventions (each logged in its chapter entry: §5.8 stepping-stone snippet forms, §14 top-level const placement, §24.6 const-vs-hook placement, §12 brochure leading spaces, §4 page-edge apostrophe rendering) or on the accepted-by-design list (CLI hint drift, transitive imports, Chapter 28 read-along, varying room text). No book command failed; no listing failed to compile when placed per the placement/replacement/import/illustrative rules.
