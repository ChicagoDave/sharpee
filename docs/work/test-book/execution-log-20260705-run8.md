# Sharpee Book Acceptance Test — Execution Log

Book: The Sharpee Author and Developer Manual (the-sharpee-book-v2.0.0.pdf)
Tester: literal first-time reader (amnesia rules). Project: ~/repos/book-test/my-zoo
Date started: 2026-07-05

---

## Chapter 1 — Installing Sharpee: The CLI and Your First Project

**STATUS: PASS**

- All commands ran as written: `node --version` (v22.23.1), `npm install -g @sharpee/devkit`, `sharpee init my-zoo -y`, `npm install`, `sharpee build`, `sharpee init-browser`, `npm install` (init-browser output suggested it; §1.7 says to do so), `sharpee build`.
- Build artifacts matched §1.6 exactly: `dist/index.js`, `dist/my-zoo.sharpee`, plus `.d.ts` as the book says. After init-browser, `sharpee build` also emitted `dist/web/` as §1.7 says.
- **Headless substitution (logged once, applies to the whole run):** this box has no browser. Where the book says to serve `dist/web/` and play in a browser, I verified the server instead (`python3 -m http.server -d dist/web` serves `index.html` with HTTP 200, all assets present). From Chapter 2 onward, "Try it" blocks are verified as transcript tests using the testing mechanic the book itself introduces in §2.9, run with the command the book documents. Chapters 24–27 will use Playwright against the served web client.
- CLI "Next steps" hints differ from book commands (`npm run build` vs `sharpee build`) — pre-acknowledged by §1.7's follow-the-book rule; not a defect, noted only for completeness.

## Chapter 2 — Your First Room: Entities, Traits, and the World

**STATUS: PASS**

- Typed the chapter's file exactly as shown (imports, config, `FamilyZooStory` class with `createPlayer`/`initializeWorld`, `export const story: Story = new FamilyZooStory(); export default story;`), replacing the scaffolded `src/index.ts` as §2.3's prose says ("in the next chapter you'll replace it with the first room of the zoo", Ch.1 §1.5).
- Created `tests/transcripts/first-room.transcript` exactly as §2.9 shows.
- `npx sharpee build --test` compiled clean and all 5 transcript steps PASS, matching the book's sample output verbatim.
- No ambiguities. The book's note that the scaffold stub differs from the book file (§2.3) accurately described what I found in the scaffold.

## Chapter 3 — The Play Loop: How a Turn Works

**STATUS: PASS**

- Conceptual chapter; the book says "You won't write any new code here" and flags its one snippet as illustrative ("That snippet is illustrative; the zoo has no brass key"). Nothing to type, nothing to build. No issues.

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs

**STATUS: PASS**

- Added `Direction` to the `@sharpee/world-model` import per §4.4 (import rule); replaced Chapter 2's `initializeWorld` with the complete four-room version per §4.4's "It replaces the single-room one from Chapter 2" (replacement rule).
- Created `tests/transcripts/navigation.transcript` exactly as §4.8 shows.
- `npx sharpee build --test`: compiled clean; both transcripts pass (12/12). Chapter 2's booth assertion ("Self-Guided Tours") still passes against Chapter 4's reworded booth description — the book kept it compatible.
- §4.1/§4.2's fragment listings (`entranceRoom.exits = …`) use variable names that don't appear in the final §4.4 listing; §4.4 supersedes them, and the prose ("Here is the complete initializeWorld… It replaces…") makes that clear enough. Not typed in separately.

## Chapter 5 — Scenery & Portable Objects

**STATUS: PASS**

- Added the souvenir penny (§5.1) and the §5.7 block (iron fence, rabbits, zoo map, bag of animal feed) at the end of `initializeWorld` before player placement, per the placement rule. §5.7's parenthetical correctly warned the fence appears twice in the chapter and to add it once, and that the penny is not re-shown — no ambiguity.
- Created `tests/transcripts/scenery-and-items.transcript` as §5.9 shows.
- `npx sharpee build --test`: clean compile, 24/24 across all three transcripts.

## Chapter 6 — Containers & Supporters

**STATUS: PASS**

- Added `SupporterTrait` to the trait import (§6.3), then the backpack (§6.2), feed dispenser (§6.2.1), and park bench (§6.3) at the end of `initializeWorld` per the chapter's explicit placement-rule callout.
- Created `tests/transcripts/containers.transcript` as §6.7 shows.
- `npx sharpee build --test`: clean compile, 36/36 across four transcripts.

## Chapter 7 — Openable Things, Locked Doors & Keys

**STATUS: PASS**

- §7.1's lunchbox listings are explicitly flagged illustrative ("a demonstration prop, not part of the zoo; nothing to type until the puzzle listing") — skipped as instructed.
- Added `OpenableTrait, LockableTrait, DoorTrait` to the world-model import (§7.4), added the full puzzle block (supply room, shelves, keycard, staff gate, exits with `via`) at the end of `initializeWorld`, and deleted Chapter 4's Main Path exits assignment per the chapter's explicit replacement-rule instruction.
- Created `tests/transcripts/locked-gate.transcript` as §7.6 shows.
- `npx sharpee build --test`: clean compile, 44/44 across five transcripts.

## Chapter 8 — Light & Dark

**STATUS: PASS**

- Added `LightSourceTrait, SwitchableTrait` to the import (§8.7), the flashlight at the end of `initializeWorld` (§8.4, "starts life in the Supply Room… where supplyRoom is already in scope"), then the §8.7 block (nocturnal exhibit, new Supply Room exits replacing Chapter 7's per the replacement rule, three animals).
- §8.5's gem/candle/lantern listings are illustrative patterns (no zoo variables) — nothing typed; the chapter's "Other light-source patterns" framing made that clear.
- Created `tests/transcripts/light-and-dark.transcript` as §8.9 shows.
- `npx sharpee build --test`: clean compile, 59/59 across six transcripts.

## Chapter 9 — The Map & Regions

**STATUS: PASS**

- Typed the §9.2 pair as instructed ("Type this pair into your project"): `world.createRegion(…)` calls placed at the top of `initializeWorld` per "Create regions in initializeWorld(), before the rooms that belong to them"; the six `world.assignRoom(…)` calls placed at the end (after all rooms exist, before player placement).
- Minor ambiguity, resolved: §9.2 says assignments go "after the rooms exist" without an exact anchor. Since `supplyRoom`/`nocturnalExhibit` are only in scope at the end of the method, the end (placement rule) is the only placement that compiles. Worked fine.
- §9.4 handler and §9.5 nesting listings are explicitly illustrative ("a preview of that volume, not part of the zoo") — nothing typed.
- No Try it/Test it in this chapter; `npx sharpee build --test` still clean, 59/59.

## Chapter 10 — The Standard Actions: The Four-Phase Model

**STATUS: PASS**

- Conceptual chapter; "You won't write an action in this chapter." The one listing (`const someAction: Action = {…}`) shows the contract shape only. Nothing typed, nothing to test. No issues.

## Chapter 11 — Scope & Visibility

**STATUS: PASS**

- Conceptual chapter, no listings to type, no Try it/Test it. No issues.

## Chapter 12 — Readable Objects & Switchable Devices

**STATUS: PASS**

- Added only `ReadableTrait` to the import as the chapter explicitly instructs ("don't paste a second SwitchableTrait"); added the info plaque, zoo brochure, and radio at the end of `initializeWorld` per the chapter's placement note.
- §12.1's bare `plaque.add(…)` fragment is superseded by the full §12.2 listing — typed once via the full listing.
- Created `tests/transcripts/readables.transcript` as §12.7 shows.
- `npx sharpee build --test`: clean compile, 75/75 across seven transcripts.

## Chapter 13 — Event Handlers: Reacting to What Happens

**STATUS: PASS**

- Added the three §13.4 imports (`GameEngine` merged into the existing `@sharpee/engine` line per the import rule; new lines for `@sharpee/core` and `IWorldModel`), the two private ID-field declarations on the class, the Gift Shop + souvenir press block and ID-recording lines at the end of `initializeWorld`, deleted Chapter 4's Aviary exits per the chapter's replacement-rule instruction, and added `onEngineReady` containing both `chainEvent` registrations (§13.5, §13.6).
- §13.2's two short handler listings are shape demonstrations superseded by §13.5/§13.6's full versions — typed once via the full versions.
- Created `tests/transcripts/event-handlers.transcript` as §13.8 shows.
- `npx sharpee build --test`: clean compile, 86/86 across eight transcripts. Goats devour the feed once; the press transforms the penny.

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs

**STATUS: PASS**

- Added the chapter's import block (only missing names, per the chapter's own reminder): `Action, ActionContext, ValidationResult` from `@sharpee/stdlib`, `import type { Parser }` from `@sharpee/parser-en-us`, `import type { LanguageProvider }` from `@sharpee/lang-en-us`.
- Typed `feedAction` and `photographAction` (+ their ID/message constants) as top-level consts before the class, per "The action objects below are top-level consts."
- §14.1's skeleton is explicitly flagged illustrative ("hasRequiredItem is a stand-in that exists nowhere… nothing to type") — skipped.
- Added the camera to the gift shop in `initializeWorld`, and the `getCustomActions`/`extendParser`/`extendLanguage` members to the class.
- Created `tests/transcripts/custom-actions.transcript` as §14.8 shows.
- `npx sharpee build --test`: clean compile, 97/97 across nine transcripts. Both moods verified: feed works then refuses ("already fed"), photograph blocks without the camera and fires with it.

## Chapter 15 — Capability Dispatch: One Verb, Many Rules

**STATUS: PASS**

- Added the capability-dispatch imports (only names not already present, per the import rule), `PettableTrait`, `PetMessages`, `pettingBehavior`, and `pettingAction` as top-level declarations; §15.4's trait assignments + parrot in `initializeWorld`; the `registerCapabilityBehavior` call at the end of `initializeWorld` after the animals, per "the registration block… runs once at the end of initializeWorld, after the animals exist"; updated `getCustomActions`, added pet/stroke grammar and the four messages.
- Created `tests/transcripts/petting.transcript` as §15.7 shows.
- `npx sharpee build --test`: clean compile, 105/105 across ten transcripts. Goats lean in, rabbits are soft, dispenser refuses, parrot bites.

## Chapter 16 — Custom Traits & Behaviors

**STATUS: PASS**

- Created `src/dispenser-trait.ts` (§16.2) and `src/dispenser-behavior.ts` (§16.3) exactly as shown, including the `.js` extension on the relative import the chapter explains. The `dispenser.add(new DispenserTrait(…))` line and §16.4's caller are flagged illustrative; the chapter's "honest note" says the pair stays unwired — nothing changed in `index.ts`.
- No Try it/Test it (the chapter says so explicitly). `npx sharpee build --test`: both files compile alongside the story; suite still 105/105.

## Chapter 17 — Extending the Grammar

**STATUS: PASS**

- Conceptual chapter. Its listings restate the `extendParser` code already typed in Chapters 14–15; §17.5 ("Suppose feeding should name both…") and §17.6 (`.where` constraint) are framed as suppositions, so per the illustrative rule nothing was typed. No Try it/Test it. Suite unchanged.

## Chapter 18 — The Language Layer

**STATUS: PASS**

- Conceptual chapter; listings restate Chapter 14's `extendLanguage` code. Nothing new to type, no Try it/Test it. No issues.

## Chapter 19 — The Phrase Algebra

**STATUS: PASS**

- Conceptual chapter. All listings (`nounPhraseFor`, `Optional`/`Choice` values referencing nonexistent `ZooMessages`, the storm scene, etc.) are shapes shown outside any zoo anchor point — per the illustrative rule nothing was typed. The chapter never says "add this". No Try it/Test it. No issues.

## Chapter 20 — Non-Player Characters

**STATUS: PASS**

- Added the NPC imports (`NpcTrait`, `NpcPlugin` from `@sharpee/plugin-npc`, and the four stdlib NPC names), the zookeeper entity and the parrot's `NpcTrait` in `initializeWorld`, `PARROT_PHRASES` + `parrotBehavior` as top-level consts, widened `roomIds` to the four-field declaration exactly as §20.4 shows, added the two ID-recording lines, and inserted the plugin/behavior registration at the top of the existing `onEngineReady` per "add the plugin code below at the top of that existing method; don't declare a second one."
- Note: `@sharpee/plugin-npc` is not in the scaffold's own package.json but resolves transitively — pre-acknowledged in the test brief; import succeeded, not reported as a defect.
- Created `tests/transcripts/npcs.transcript` as §20.6 shows.
- `npx sharpee build --test`: clean compile, 112/112 across eleven transcripts. Sam's departure line and the parrot's greeting both fire on the exact turns the book predicts.

## Chapter 21 — Scenes: Named Windows of Story Time

**STATUS: PASS**

- Typed only the final `createScene` form with `onBegin`/`onEnd`, per §21.4's explicit "This listing replaces the bare version above… type in only this final form." Placed in `initializeWorld` (end; `pettingZoo` in scope). The `ctx.totalTurns` variant, storm scene, and `SceneTrait` import are flagged illustrative — skipped.
- Created `tests/transcripts/scenes.transcript` as §21.7 shows.
- `npx sharpee build --test`: clean compile; scene begins, ends, and recurs exactly as asserted (116/116).

## Chapter 22 — Turns, Timed Events & Daemons

**STATUS: PASS**

- Added the `@sharpee/plugin-scheduler` imports (only new names; `ISemanticEvent`/`IdentityTrait` already imported per the chapter's own note), `TimedMessages` near the top of the module, the three factory functions as top-level declarations, the scheduler block in `onEngineReady` directly below the NPC registration (the chapter explicitly overrides the placement rule and says to follow the listing's position), and the six messages appended to the existing `extendLanguage`.
- `@sharpee/plugin-scheduler` resolves transitively — pre-acknowledged, not a defect.
- Created `tests/transcripts/timed-events.transcript` as §22.7 shows.
- `npx sharpee build --test`: clean compile, 131/131. The PA fires on turn 5 exactly, feeding time on turn 11 (matching the book's "skips its first tick" warning — the test is written for that timing and passes), bleating stops on the daemon's own countdown.

## Chapter 23 — Scoring & Endgame

**STATUS: PASS**

- Added `MAX_SCORE`, `ScoreIds`, `ScorePoints`, `ROOM_SCORE_MAP`, `ScoreMessages`, and `createVictoryDaemon` as top-level declarations; `world.setMaxScore(75)` in `initializeWorld`; the pet-award in `pettingBehavior.execute` (renaming `_world` → `world` as the listing shows); feed/rabbit awards in `feedAction.execute` after its existing `const target` line; the photograph award (renaming `_context` → `context` as the chapter instructs); the pressed-penny award inside the Chapter 13 chain; three new `chainEvent` scoring handlers in `onEngineReady`; widened `entityIds` and added the two recording lines; registered the victory daemon; added the victory message.
- §23.1's `awardScore`/`getScore` listing is demonstration ("awarded === true the first time…") — only the `setMaxScore` line it instructs for `initializeWorld` was typed.
- Created `tests/transcripts/scoring.transcript` as §23.6 shows (28 steps).
- `npx sharpee build --test`: clean compile, 159/159 across fourteen transcripts. Victory fires on the exact move the 75th point lands, and `score` afterwards reports the perfect-score line — both exactly as the book describes.

## Chapter 24 — Channels: The Universal UI Surface

**STATUS: PASS**

- Added the `@sharpee/if-domain` type import, `AMBIENCE_BY_ROOM`, and the `registerChannels` hook with the `zoo.ambience` channel. The chapter's closing note ("Family Zoo's ch24-27-presentation snapshot ships exactly this zoo.ambience channel… The chapters ahead build on that concrete example") plus "this chapter adds one import" makes clear this is zoo code to type, not illustration.
- `@sharpee/if-domain` resolves transitively — pre-acknowledged, not a defect.
- Clean compile; transcript suite unchanged (159/159). Browser verification below with Chapter 25.

## Chapter 25 — The Web Client: A Framework-Free UI

**STATUS: PASS**

- §25.1's `BrowserClient` entry listing is explicitly illustrative ("your scaffolded src/browser-entry.ts already contains its own version, and that one stays as it is") — scaffold left untouched, including its `modern-dark` default theme, exactly as the chapter says to.
- §25.5's score-star renderer is flagged "nothing to type"; typed only the `zoo.ambience` renderer into `src/browser-entry.ts` after `connectEngine` and before `client.start()` — the scaffold's file-header comment names this spot exactly as the book claims.
- **Playwright verification (headless substitution for browser play):** served `dist/web`, drove the client. Page title "Family Zoo", opening prose shows Zoo Entrance; after `south`, `west` the `#zoo-ambience` element reads "The air is alive with birdsong and the rustle of wings."; after `east` it clears to "" (the sparse-replace '' -vs- undefined behavior §24.6 explains). Status line updates to "Main Path". No page errors.

## Chapter 26 — Decoration & Theming

**STATUS: PASS**

- Added the `[data-theme="zoo-sunny"]` token block to `browser/my-zoo.css` (the file existed under exactly the name §26.4.2 predicts — package name, not story id) and the `sharpee.themes` list to package.json as shown.
- Ambiguity, resolved: the two "flourish" rules are introduced with "If you want to push past the tokens (Family Zoo, for instance, deliberately puts its green on the title and menu bars…)" — conditional phrasing, but stated as what Family Zoo does. I typed them in since we are building Family Zoo; they are harmless either way. A stricter reader might skip them; the chapter would benefit from an explicit "add this"/"nothing to type" marker here.
- `sharpee build` reported "Wired 3 theme(s): modern-dark, paper, zoo-sunny" — matching §26.4's description of the build.
- **Playwright verification:** theme menu contains Classic/Modern Dark/Paper/Zoo Sunny; clicking Zoo Sunny flips `data-theme` from `modern-dark` to `zoo-sunny`, body background repaints from rgb(30,30,46) to rgb(255,250,240) (the `--theme-bg: #fffaf0` token), the menu item gains `--checked`, and `my-zoo-theme=zoo-sunny` lands in localStorage. All exactly as §26.3–26.4 describe. No page errors.

## Chapter 27 — Media & Audio

**STATUS: PASS**

- Added `AudioRegistry` (top-level const), the two atmosphere declarations in `initializeWorld` after the rooms, the `mediaCounter`/`mediaEvent`/`emit` helpers, the effect-returning `if.event.actor_moved` handler via `engine.getEventProcessor().registerHandler` in `onEngineReady`, `registry.add(createAmbientChannel('environment'))` in `registerChannels`, and the `ambient:environment` renderer in the browser entry. Imports: `@sharpee/media`, `@sharpee/event-processor` (type), `createAmbientChannel` (stdlib), `createAmbientChannelRenderer` (platform-browser) — the first two resolve transitively (pre-acknowledged).
- No asset files created: the chapter says sourcing files is the author's job and "a story that declares a soundscape but ships no audio is silent, not broken. Wire the channels first and drop the real assets in later." Followed that literally.
- Clean compile; transcript suite unchanged (159/159).
- **Playwright verification:** walking into the Aviary drives the full chain — the browser requests `/audio/aviary-birdsong.mp3` (404, as predicted for a missing asset) and the AudioManager logs a play attempt; no page errors. The channel wiring demonstrably works end to end.

## Chapter 28 — The Multi-File Story

**STATUS: PASS** (read-along chapter)

- The chapter states up front it is the book's one read-along chapter: the seven-file project lives in the companion repository, "there is nothing to type in this chapter," and the single-file zoo keeps working as-is. Per the test brief this GitHub dependency is accepted by design and not reported. Nothing executed; suite unchanged.

## Chapter 29 — Transcript Testing & Walkthroughs

**STATUS: PASS**

- Created `tests/transcripts/feed-the-goats.transcript` (§29.1) and the two walkthrough files `walkthroughs/wt-01-into-the-zoo.transcript` / `wt-02-feeding-time.transcript` (§29.5) exactly as shown, including the `[EVENT: true, type=…]` and `[STATE: true, yourself.inventory contains bag of animal feed]` assertions and the `$save`/`$restore` checkpoint pair.
- §29.1's claim that the suite by now holds "fourteen recorded sessions" matched my project exactly (14 unit transcripts before this chapter added the 15th).
- `npx sharpee build --test`: output shape matches the book's sample ("Walkthroughs: 2 files (chained)" ahead of the unit block); the chain passes — the bag crosses the file boundary via `$restore`, the `zoo.event.fed` event asserts, and `score` reads exactly "20 out of 75". Full suite: 169/169.
- Note: the `[STATE:]` expression with `yourself` and `bag of animal feed` works on the installed devkit 2.1.1 (per the brief, resolved by the 2.1.1 republish; the book's use of exact created names is valid).
- §29.4's `[GOAL:]` bracket for the after-hours act is explicitly conditional ("The single-file zoo has no second act yet, so skip this bracket if you stayed single-file") — skipped as instructed.

## Chapter 30 — Saving & Restoring

**STATUS: PASS**

- Nothing to type: the chapter's `behaviorSwapped` daemon listings belong to the read-along `ch28-multi-file/` snapshot; the `getRunnerState`/`restoreRunnerState` hooks it teaches were already typed into this project's daemons in Chapters 22–23 as the book had me do.
- **Playwright verification of §30.3's autosave claim:** played to Main Path, took the penny, reloaded the page — the client restored mid-game with no dialog: location still "Main Path", penny still in inventory. "Re-open the page and the autosave restores you mid-game" holds.

## Chapter 31 — Building & Publishing

**STATUS: PASS**

- The chapter's toolchain commands (`npm install -g @sharpee/devkit`, `sharpee init`, `npm install`, `sharpee build`, `sharpee init-browser`, `python3 -m http.server -d dist/web`) are the same ones exercised throughout the run; all work. `dist/web/` is a fully static, self-contained client (confirmed by every Playwright session in this log — served by a bare Python file server with no build step).
- §31.5 (publishing to npm) describes an optional outward-facing step ("If instead you want to distribute…"); not executed, as it would publish externally and the chapter gives no command to run anyway.

## Appendices A–E

**STATUS: PASS** (reference material)

- Architecture map, action catalog, trait catalog, message-ID reference, grammar reference. Nothing to execute. Spot-consistency: the actions and traits the book taught (taking/going/switching; Identity/Room/Container/Openable/Lockable/etc.) all appear in the catalogs.

---

# Run Summary

**All 31 chapters PASS. Zero BLOCKED chapters. Zero deviations.**

- Final state: `npx sharpee build --test` → 169 assertions across 15 unit transcripts + a 2-file walkthrough chain, all green; browser client verified with Playwright (channels, custom renderer, theming, ambient-audio wiring, autosave).
- Environment: Node v22.23.1, npm 11.18.0, @sharpee/devkit 2.1.1 (book PDF is v2.0.0).
- One standing substitution (logged at Chapter 1): headless box, so browser play was verified via transcript tests and, for Volume VII+ and Chapter 30, via Playwright against the served `dist/web`.
- Minor notes for the author (none rise to defects):
  - Ch.4: §4.1/§4.2 fragments use variable names (`entranceRoom`, `mainPathRoom`) that never appear in the final code; §4.4 supersedes them, but a literal reader pauses there.
  - Ch.9: "after the rooms exist" has no exact anchor for the `assignRoom` block; only the end-of-method placement compiles, so the placement rule saves it.
  - Ch.26: the theme "flourish" rules sit between "optional polish" and "Family Zoo does this" — an explicit add-this/nothing-to-type marker would remove the ambiguity.
- Items on the accepted-by-design lists observed and not reported as defects: CLI "Next steps" hint drift (Ch.1), transitive resolution of `@sharpee/plugin-npc`, `plugin-scheduler`, `media`, `if-domain`, `event-processor` (Chs. 20, 22, 24, 27), Chapter 28's GitHub dependency.
