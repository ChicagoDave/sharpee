# Sharpee Book Execution Log

**Book:** The Sharpee Author and Developer Manual, Version 2, Revision 2 (file: the-sharpee-book-v2.0.0.pdf)
**Tester:** first-time Sharpee author (amnesia rules: book is the only source of truth)
**Date started:** 2026-07-10
**Environment:** Linux (headless container), Node.js + npm preinstalled

Title page verified: reads "Version 2, Revision 2" — not a stale artifact.
Installed platform check: `npm ls @sharpee/sharpee` → **2.2.0** (matches the version this run expects; not a stale registry).

---

## Chapter 1 — Installing Sharpee: The CLI and Your First Project

**STATUS: PASS**

- Ran as written: `node --version` (v22.23.1), `npm --version` (11.18.0), `npm install -g @sharpee/devkit`, `sharpee init my-zoo -y`, `cd my-zoo`, `npm install`, `sharpee build`, `sharpee init-browser`, `npm install` (init-browser output suggested it; §1.7 says "If its output suggests running npm install, do so"), `sharpee build`, `npx serve dist/web`. All succeeded. `dist/index.js`, `dist/my-zoo.sharpee`, and `dist/web/` produced as described.
- **VERIFICATION SUBSTITUTION (logged once, applies to all chapters):** this box is headless, so "play it in the browser" steps cannot be performed literally. For Chapter 1 (§1.7 Playing it) I served `dist/web` with `npx serve` and verified over HTTP that `index.html` and `game.js` both return 200. From Chapter 2 onward, browser "Try it" blocks are verified by writing the Try-it commands as a transcript test and running them with the testing command the book documents (`sharpee build --test`).

---

## Chapter 2 — Your First Room: Entities, Traits, and the World

**STATUS: PASS**

- Replaced the scaffold `src/index.ts` with the chapter's file exactly as shown (imports, `config`, `FamilyZooStory` class with `createPlayer` and `initializeWorld` placed where the class-body comments sit, `export const story: Story = new FamilyZooStory(); export default story;`). §2.3's note that the stub differs from the book's file (barrel import, object literal) matched what I found in the scaffold — accurate.
- Compiled cleanly with `sharpee build`.
- §2.9: created `tests/transcripts/first-room.transcript` exactly as printed; `npx sharpee build --test` → all 5 commands PASS ("5 passed", "✓ All tests passed!"), matching the book's trimmed sample output.
- No ambiguities. The book's Try-it list (look / examine sign / examine booth / take sign / inventory) is exactly covered by the chapter's own transcript test.

---

## Chapter 3 — The Play Loop: How a Turn Works

**STATUS: PASS**

- Concept chapter; the text says "You won't write any new code here" and delivers on that. The single code snippet (§3.2.4, `context.event('if.event.taken', …)`) is explicitly marked illustrative ("That snippet is illustrative; the zoo has no brass key"), matching the illustrative rule from §0.6. Nothing to type, nothing to build, no Try it / Test it. Project unchanged; suite still green from Chapter 2.

---

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs

**STATUS: PASS**

- §4.1–4.3 fragments are explicitly flagged as illustrative ("shapes to read, not code to type") — nothing typed from them; clear.
- §4.5: added `Direction` to the Chapter 2 world-model import line as instructed, and replaced `initializeWorld` with the chapter's complete listing (replacement rule). The listing is complete as promised ("nothing is abbreviated").
- Note: the complete listing quietly rewords the ticket booth description and extends the welcome-sign aliases relative to Chapter 2 (booth: "…sliding glass window reading \"Self-Guided Tours…\"" vs Ch2's two-sentence version). Since the whole method is replaced, this is fine, and Chapter 2's transcript assertion ("Self-Guided Tours") still passes. Not a defect — logged as an observation only.
- §4.9: created `tests/transcripts/navigation.transcript` as printed; `npx sharpee build --test` → 12/12 PASS across both transcripts ("✓ All tests passed!").
- Aviary `initialDescription` behavior is the accepted-by-design varying room text; not reported.

---

## Chapter 5 — Scenery & Portable Objects: Everything Is Portable by Default

**STATUS: PASS**

- Added the souvenir penny (§5.1), the §5.7 block (iron fence, rabbits, zoo map, bag of animal feed), the `{snippet:rabbits}` marker in the Petting Zoo description (§5.8, replacement rule), and the snippet map after the scenery code. All per the placement rule.
- Ambiguity resolved (reading worked): §5.8→5.8.2 shows three successive forms of the same `snippets` map (plain string → list of texts → object with `texts` + `mentions`). The chapter never says outright which form ships; I applied the §0.6 replacement rule and kept only §5.8.2's final `texts` + `mentions` form. The §5.8.1 long-form `selector: 'random'` fragment contains `/* ... */` so it's a shape, not typed. Result compiled and the chapter's own snippet test passed, so this reading is presumably intended — but a one-line "this final form is the one the zoo keeps" would save a literal reader the doubt.
- §5.2's fence listing is re-shown in §5.7 and the book explicitly says "add it once" — clear, added once.
- §5.10: both transcripts (`scenery-and-items.transcript`, `room-snippets.transcript`) created as printed; `npx sharpee build --test` → 29/29 PASS across 4 transcripts ("✓ All tests passed!"). The rabbits cycle asserts (hop → doze → absent → wrap) all held, matching §5.8.1's determinism claim.

---

## Chapter 6 — Containers & Supporters: What Holds What

**STATUS: PASS**

- §6.3: added `SupporterTrait` to the Chapter 2 trait import as instructed ("the one new trait this chapter uses"). Accurate — it was not previously imported (Chapter 2's imported-for-later trait was `SceneryTrait`). No issue.
- Added backpack (§6.2), feed dispenser (§6.2.1), park bench (§6.3) at the end of `initializeWorld` per the placement rule, in the order the chapter presents them.
- §7.1's lunchbox forward-reference aside: nothing else ambiguous. The §6.1 `put map in backpack` transcript block is sample play, not a listing — clear from §0.6 conventions.
- §6.7: `containers.transcript` created as printed; `npx sharpee build --test` → 41/41 PASS across 5 transcripts ("✓ All tests passed!").

---

## Chapter 7 — Openable Things, Locked Doors & Keys: Gating the Way Through

**STATUS: PASS**

- §7.1–7.2 lunchbox/staff-gate fragments correctly flagged ("demonstration prop… nothing to type until the puzzle listing"; illustrative rule). Nothing typed from them.
- §7.4: added the import (`OpenableTrait, LockableTrait, DoorTrait`) and the complete puzzle block (Supply Room, shelves, keycard, staff gate, exits with `via` on both sides) at the end of `initializeWorld`; deleted the Chapter 4 Main Path exits assignment per the replacement rule, exactly as the chapter instructs.
- §7.6: `locked-gate.transcript` created as printed; `npx sharpee build --test` → 49/49 PASS across 6 transcripts ("✓ All tests passed!").
- No ambiguities.

---

## Chapter 8 — Light & Dark: What the Player Can See

**STATUS: PASS**

- §8.1–8.3 one-liners and §8.5 patterns (gem, candle, lantern) are shapes, not typed; the chapter says the real room is built at the end. Clear.
- §8.7: added `LightSourceTrait, SwitchableTrait` import, the flashlight block (§8.4, placed at end of `initializeWorld` where `supplyRoom` is in scope, as the prose says), and the nocturnal exhibit block; replaced Chapter 7's Supply Room exits table per the replacement rule (the chapter calls this out explicitly).
- §8.9: `light-and-dark.transcript` created as printed; `npx sharpee build --test` → 64/64 PASS across 7 transcripts ("✓ All tests passed!"). All darkness assertions held, including dark-room lockout and the lit-room `moonlight` text.
- No ambiguities.

---

## Chapter 9 — The Map & Regions: Grouping Rooms

**STATUS: PASS**

- §9.2: typed the `createRegion` pair at the top of `initializeWorld` ("before the rooms that belong to them") and the `assignRoom` block at the end (placement rule, as the prose directs). The chapter is explicit that regions are optional for the zoo but should be typed in ("Type this pair into your project") — clear.
- §9.4's `registerEventHandler` sketch and §9.5's nesting/query listings are explicitly illustrative (comment-only body / "a preview of that volume") — nothing typed.
- No Try it / Test it in this chapter (matches the TOC). Verified by building: TypeScript compiled successfully, suite still 64/64 PASS.
- No ambiguities.

---

## Chapter 10 — The Standard Actions: The Four-Phase Model

**STATUS: PASS**

- Concept chapter: "You won't write an action in this chapter." The `someAction` shape in §10.2 is a contract listing with comment-only bodies (illustrative rule). Nothing typed; suite still green.

## Chapter 11 — Scope & Visibility: What the Player Can Reach

**STATUS: PASS**

- Concept chapter; no code listings to type at all, no Try it / Test it. Nothing to execute; suite still green.

## Chapter 12 — Readable Objects & Switchable Devices

**STATUS: PASS**

- Added `ReadableTrait` import (chapter is explicit not to re-import `SwitchableTrait` — matches the import rule) and the three blocks (info plaque, brochure, radio) at the end of `initializeWorld`. §12.1's `plaque.add(...)` fragment precedes the real §12.2 listing that contains it — the prose sequencing makes clear only §12.2–12.4 are typed; no ambiguity in practice.
- §12.7: `readables.transcript` created as printed; `npx sharpee build --test` → 80/80 PASS across 9 transcripts ("✓ All tests passed!"). read-vs-examine distinction verified on both plaque and brochure.

---

## Chapter 13 — Event Handlers: Reacting to What Happens

**STATUS: PASS**

- §13.2's two handler snippets are teaching shapes (the chain example references `feedId` before it exists); the real registrations are §13.5/§13.6. Typed only the real ones — the chapter's flow makes this clear enough.
- §13.4: added the three imports (`GameEngine`, `ISemanticEvent`, `IWorldModel`), the two private ID-map class fields, the Gift Shop + souvenir press block at the end of `initializeWorld`, deleted Chapter 4's Aviary exits per the explicit replacement note, recorded the five IDs, and added `onEngineReady` containing both `chainEvent` registrations exactly as printed.
- §13.5's snippet-rewrite aside is explicitly "a shape to read, not code to type" — skipped.
- §13.8: `event-handlers.transcript` created as printed; `npx sharpee build --test` → 91/91 PASS across 10 transcripts ("✓ All tests passed!"). Goats reaction and penny transformation both verified.
- No ambiguities.

---

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs

**STATUS: PASS**

- Chapter opener gives the complete import set and correctly notes which names are already present (import rule); added only `Action/ActionContext/ValidationResult` (stdlib), `type Parser` (parser-en-us), `type LanguageProvider` (lang-en-us).
- §14.1's skeleton is explicitly illustrative ("`hasRequiredItem` is a stand-in that exists nowhere… typed literally it would not compile") — clear, skipped.
- Typed `feedAction` + `photographAction` as top-level consts before the class (prose says "top-level consts"), the camera in the Gift Shop, and the three class methods (`getCustomActions`, `extendParser`, `extendLanguage`) exactly as printed.
- §14.8: `custom-actions.transcript` created as printed; `npx sharpee build --test` → 102/102 PASS across 11 transcripts ("✓ All tests passed!"). All three moods verified (works / "already fed" / camera-blocked).
- No ambiguities. Note: `feed goats` and the Ch13 drop-feed handler coexist as the book intends (different triggers), and both tests stay green.

---

## Chapter 15 — Capability Dispatch: One Verb, Many Rules

**STATUS: PASS**

- Added the capability-dispatch imports (only names not already present, per the import rule), `PettableTrait`, `PetMessages`, `pettingBehavior`, and `pettingAction` as top-level code before the class, in chapter order.
- Ambiguity resolved (reading worked): the chapter never states explicitly where the `PettableTrait` class goes in the file; Chapter 14 established "action objects are top-level consts", so I placed the trait/behavior/action all top-level before the class. Compiled and ran; presumably intended, but a placement sentence like Ch14's would help a literal reader.
- §15.2.1's `goats.add(new PettableTrait('goats'))` line appears mid-explanation and again in §15.4's real listing — typed once, per §15.4. The registration snippet in §15.2.3 is likewise re-anchored by §15.3's closing line ("the registration block … runs once at the end of initializeWorld, after the animals exist") — typed once there.
- Replaced `getCustomActions` return (replacement rule), added pet/stroke grammar and the four messages, added the parrot to the Aviary.
- §15.7: `petting.transcript` created as printed; `npx sharpee build --test` → 110/110 PASS across 12 transcripts ("✓ All tests passed!"). All four outcomes verified (goats lean in / rabbits soft / dispenser refused / parrot bites).

---

## Chapter 16 — Custom Traits & Behaviors: Data and Logic, Kept Apart

**STATUS: PASS**

- Created `src/dispenser-trait.ts` and `src/dispenser-behavior.ts` exactly as printed. The chapter's "honest note" states the pair is deliberately left unwired (no changes to index.ts, no Try it / Test it) — accurate and appreciated; a literal reader is not left hunting for a missing walkthrough.
- §16.2's `dispenser.add(new DispenserTrait(...))` line and §16.4's caller fragment are both explicitly illustrative — skipped.
- Verified: `npx sharpee build --test` → "TypeScript compiled successfully", 110/110 PASS (both new files compile alongside the story as promised).
- No ambiguities.

---

## Chapter 17 — Extending the Grammar: Teaching New Sentence Shapes

**STATUS: PASS**

- Reference chapter. §17.2/§17.4 re-show the feed/photograph patterns already typed in Chapter 14 (in expanded formatting); §17.5 is framed as "Suppose feeding should name both…" and §17.6 as "You can narrow it" — shapes, not instructions. Nothing typed; no Try it / Test it (matches TOC). Suite still green (110/110).

## Chapter 18 — The Language Layer: Messages & Message IDs

**STATUS: PASS**

- Concept chapter; both listings re-show Chapter 14 code (`context.event` shape, `extendLanguage` messages already in the file). Nothing typed; no Try it / Test it. Suite still green.

## Chapter 19 — The Phrase Algebra: Grammar in the Template, Not the Text

**STATUS: PASS-WITH-ISSUES**

- Nothing typed; no Try it / Test it (matches TOC); suite still green (110/110).
- **Issue (ambiguity, resolved without failure):** (a) Ch19 §19.3 "Pass a noun phrase, not a name", §19.9 "Branching stays in code", and §19.10. (b) §0.6's illustrative rule promises "the chapter says 'nothing to type' wherever one could pass for real code." (c) §19.9's `Optional`/`Choice` listings are complete, compilable-looking code with their own `import` block — they could easily pass for real code, yet the chapter never says "nothing to type." The tell is that they reference names that don't exist in the project (`ZooMessages.ADMIRED`, `ZooMessages.GATE_STATUS`, a `gate` variable — the zoo's is `staffGate`) and no prose anchor says where they'd go. I resolved this as illustrative (typing them literally could not compile), and the suite stayed green — but a literal reader on the §0.6 contract could burn time here. Suggest adding the "nothing to type" marker to §19.3/§19.9/§19.10.

---

## Chapter 20 — Non-Player Characters: Actors That Take Turns

**STATUS: PASS**

- Added the four-package import block (only missing names, per import rule; `GameEngine` already present), `PARROT_PHRASES` + `parrotBehavior` as top-level consts (chapter states this placement explicitly), the zookeeper entity and the parrot's `NpcTrait` at the end of `initializeWorld`, widened the `roomIds` field declaration (chapter shows the replacement — replacement rule), added the two ID-recording lines, and inserted the NPC plugin/behavior registration at the top of the existing `onEngineReady` exactly as instructed ("add the plugin code below at the top of that existing method; don't declare a second one").
- The chapter's care about pitfalls (behaviorId match, patrol factory default id override, announcesMovement default) all checked out in play.
- §20.6: `npcs.transcript` created as printed; `npx sharpee build --test` → 117/117 PASS across 13 transcripts ("✓ All tests passed!"). Sam's "leaves to the east" fired on the exact turn the book predicts (waitTurns timing note is accurate); parrot's greeting emote appeared on entering the Aviary.
- `@sharpee/plugin-npc` resolved transitively — accepted by design, not reported as an issue.
- No ambiguities.

---

## Chapter 21 — Scenes: Named Windows of Story Time

**STATUS: PASS**

- Typed only §21.4's final `createScene('scene-petting-zoo', …)` with `onBegin`/`onEnd` — the chapter says explicitly "This listing replaces the bare version above… type in only this final form." Placed at the end of `initializeWorld` per §21.2 ("Scenes are created in initializeWorld()") and the placement rule. The §21.4 `onEnd: (ctx) => …` variant and §21.5 storm are clearly flagged as shapes ("The storm is a shape, not part of the zoo; nothing to type").
- The chapter correctly notes no new import is needed for the zoo's scene (SceneTrait only if you type the illustrative timed example — I didn't).
- §21.7: `scenes.transcript` created as printed; `npx sharpee build --test` → 121/121 PASS across 14 transcripts ("✓ All tests passed!"). Begin, end, and recurring re-entry lines all appeared exactly as asserted.
- No ambiguities.

---

## Chapter 22 — Turns, Timed Events & Daemons: Giving the World a Clock

**STATUS: PASS**

- Added scheduler imports (only the new names; `ISemanticEvent`/`IdentityTrait` already imported as the chapter acknowledges), `TimedMessages` "near the top of your story module", the scheduler block in `onEngineReady` directly below the NPC registration (the chapter explicitly invokes its own "says otherwise" override of the placement rule — nice touch), and the six messages in `extendLanguage` (chapter reminds you to merge into the existing method — clear).
- Minor ambiguity resolved (reading worked): the chapter never says where the three factory functions (`createPAAnnouncementDaemon`, `createGoatBleatingDaemon`, `createFeedingTimeFuse`) go. They're presented as free-standing `function` declarations, so I placed them top-level before the class, next to `TimedMessages`. Compiled and ran; a placement sentence would remove the doubt.
- §22.7: `timed-events.transcript` created as printed; `npx sharpee build --test` → 136/136 PASS across 15 transcripts ("✓ All tests passed!"). The whole clock choreography held: first PA at turn 5, FEEDING TIME on schedule, bleating three turns then silent, "One hour" at turn 15.
- `@sharpee/plugin-scheduler` resolved transitively — accepted by design, not reported.

---

## Chapter 23 — Scoring & Endgame: Winning the Game

**STATUS: PASS**

- Typed the score tables (`MAX_SCORE`, `ScoreIds`, `ScorePoints`, `ROOM_SCORE_MAP`, `ScoreMessages`) "up front, as constants" (top-level), the victory daemon factory, its registration "alongside the others", the victory text in `extendLanguage`, widened `entityIds` (replacement shown in full), the two new recording lines, the pet/feed/photograph awards inside their actions (including renaming `_context` → `context` exactly as instructed), the penny-press award, and the three scoring `chainEvent` registrations in `onEngineReady`.
- Ambiguity resolved (reading worked): §23.1's opening listing mixes one real instruction (`world.setMaxScore(75)` with the comment "Set the maximum in initializeWorld()") with demonstration lines (`const awarded = world.awardScore(…)` — typing THAT literally into `initializeWorld` would award 5 points at startup and break the chapter's own "0 out of 75" test). I typed only the `setMaxScore` line into `initializeWorld` (end, placement rule). The listing isn't marked illustrative and contains a live instruction — a literal reader could paste the whole block and fail the first assertion of §23.6. Suggest splitting the `setMaxScore` instruction from the API-demonstration lines.
- Minor: the three scoring `chainEvent` listings have no explicit "goes at the end of onEngineReady" anchor; the placement rule ("new registrations go at the end of onEngineReady") covers it, and it worked.
- §23.6: `scoring.transcript` created as printed (28 commands incl. the `#` comment line, which the runner accepted); `npx sharpee build --test` → 164/164 PASS across 17 transcripts ("✓ All tests passed!"). Victory fired exactly on the 75th-point move, and `score` reported the perfect-score line.

---

**VERIFICATION SUBSTITUTION for Volume VII (logged once):** Chapters 24–27 have no Try it / Test it blocks and their behavior is browser-visible. Per the run instructions, I verified them with Playwright (headless Chromium) against `dist/web` served locally, driving the real client: typing commands into `#command-input`, reading the DOM, watching network requests, and operating the menus.

## Chapter 24 — Channels: The Universal UI Surface

**STATUS: PASS**

- Typed the `if-domain` type import, `AMBIENCE_BY_ROOM`, and the `registerChannels` hook with the `zoo.ambience` channel ("this chapter adds one import" + the snapshot note make it clear this is real zoo code). Minor placement ambiguity (where `AMBIENCE_BY_ROOM` lives; where `registerChannels` sits in the class) resolved via convention — top-level const, method on the class. Compiled; suite stayed 164/164.
- Playwright: entering the Aviary painted the mood line ("The air is alive with birdsong and the rustle of wings."); leaving cleared it to blank — exactly the sparse-replace `''`-vs-`undefined` behavior §24.6 teaches.

## Chapter 25 — The Web Client: A Framework-Free UI

**STATUS: PASS**

- §25.1's `BrowserClient` entry listing is explicitly illustrative ("your scaffolded src/browser-entry.ts already contains its own version, and that one stays as it is") — scaffold left untouched, including `defaultTheme: 'modern-dark'` (the chapter explicitly blesses this pre-Ch26 value). §25.5's star-score renderer is explicitly "nothing to type."
- Added the `zoo.ambience` renderer to `src/browser-entry.ts` after `connectEngine` / before `client.start()` — the scaffold's file-header comment names this exact spot, as the book claims it does. Accurate.
- Playwright: opening turn rendered prose ("Zoo Entrance"); the renderer created its own `#zoo-ambience` element and painted/cleared it; zero page JS errors.

## Chapter 26 — Decoration & Theming: Style Without HTML on the Wire

**STATUS: PASS-WITH-ISSUES**

- Typed the `zoo-sunny` token block + the two flourish rules into `browser/my-zoo.css` (the chapter's naming note — package name `my-zoo.css`, not the story's `config.id` — matched the scaffold exactly), and the final `sharpee.themes` list into package.json (§26.4.1's built-ins-only list superseded by §26.4.2's, per the replacement rule).
- Build wired all three themes ("✓ Wired 3 theme(s): modern-dark, paper, zoo-sunny"); `themes/modern-dark.css` and `themes/paper.css` are copied and linked, and zoo-sunny's CSS rides `my-zoo.css` linked last — all exactly as §26.4 describes.
- Playwright: theme menu shows Classic/Modern Dark/Paper/Zoo Sunny; selecting Zoo Sunny flips `data-theme="zoo-sunny"`, body repaints warm cream (`rgb(255,250,240)` = the token block's `#fffaf0`), and the choice persists across reload via localStorage — all as taught.
- **Issue (prose/code mismatch):** (a) Ch26 §26.4.2, "Flourish rules push past the tokens…" (b) The book says "Family Zoo does: it deliberately puts its green on the title and menu bars instead of the engine's default, the status bar," and gives two flourish rules: `.sharpee-menu-bar { background: var(--theme-menu-bg); }` and `.sharpee-status-bar { background: var(--theme-bg-alt); }` under `[data-theme="zoo-sunny"]`. (c) The zoo-sunny token block sets only `--theme-bg/--theme-text/--theme-accent/--theme-font`, so both flourish variables resolve to the engine's classic `:root` defaults: observed computed `background` of `.sharpee-menu-bar` under zoo-sunny is `rgb(0, 0, 170)` (#0000aa classic blue; engine.css also gives `--theme-bg-alt: #000088`). The zoo green (`#4a9d52`) lands on neither bar — the flourishes as printed paint both bars classic blue over the cream page, contradicting the prose. Either the token block needs `--theme-menu-bg`/`--theme-bg-alt` values or the flourish rules should reference the accent.

## Chapter 27 — Media & Audio: Sight and Sound as Channels

**STATUS: PASS**

- Typed: `AudioRegistry` import + top-level `const audio`, the two `atmosphere(...)` declarations in `initializeWorld` after the rooms exist, the `Effect` type import, the `mediaEvent`/`emit` helpers (placement unstated — put top-level; compiled), the `if.event.actor_moved` effect-handler in `onEngineReady`, `createAmbientChannel('environment')` in `registerChannels`, and the `createAmbientChannelRenderer` registration in the browser entry. All compiled; suite stayed 164/164.
- No assets shipped (the book: "a story that declares a soundscape but ships no audio is silent, not broken" — and sourcing files "is your job"). Verified exactly that with Playwright: entering the Aviary triggered a network request for `audio/aviary-birdsong.mp3` (404s harmlessly; page keeps working, no JS errors). The full channel path — event → engine-side channel → packet → browser renderer → AudioManager fetch — demonstrably fired.
- `@sharpee/media` and `@sharpee/event-processor` resolved transitively — accepted by design, not reported.

---

## Chapter 28 — The Multi-File Story: Putting It All Together

**STATUS: PASS**

- The book's one read-along chapter, clearly labeled up front ("there is nothing to type in this chapter"; "Your own single-file zoo keeps working exactly as it is for every chapter that follows"). Code lives in the companion GitHub repository — accepted by design for an offline reader, not reported. Read in full; nothing executed; single-file zoo retained as the chapter permits. Suite still green.

## Chapter 29 — Transcript Testing & Walkthroughs: Proving the Game Still Works

**STATUS: PASS**

- §29.1's claim "by now npx sharpee build --test replays fourteen recorded sessions" — my suite had 17 unit transcripts at this point (the book's own Test it blocks produced 17 files across Chapters 2–23, or 16 before this chapter's `feed-the-goats`). Off-by-a-few in the prose count; harmless, logged as observation only since no command depends on it.
- Created `tests/transcripts/feed-the-goats.transcript` (§29.1) and the two walkthrough files `walkthroughs/wt-01-into-the-zoo.transcript` / `wt-02-feeding-time.transcript` (§29.5) exactly as printed, including `$save`/`$restore`, `[EVENT:]`, and `[STATE:]` assertions.
- `npx sharpee build --test` → "Walkthroughs: 2 files (chained)" ran ahead of the unit block exactly as the book's trimmed output shows; **174 passed, ✓ All tests passed!** The `[STATE: true, yourself.inventory contains bag of animal feed]` assertion resolved via created names as §29.3 teaches (works on the 2.1.1+ republished packages, as expected for this run). The wt-02 chain resumed state across the file boundary and `score` read exactly "20 out of 75".
- §29.4's `[GOAL:]` bracket for the after-hours act is explicitly "skip this bracket if you stayed single-file" — skipped. (The known all-versions quirks about `[REQUIRES:]/[ENSURES:]` placement and `--stop-on-failure` were not exercised; not reported per instructions.)

## Chapter 30 — Saving & Restoring: State Lives in the World

**STATUS: PASS**

- Concept/read-along chapter: its two listings (`behaviorSwapped` daemon and its `getRunnerState`/`restoreRunnerState` hooks) belong to the ch28-multi-file companion snapshot ("the ch28-multi-file/ snapshot already walks into it on purpose"), not the single-file zoo. Nothing to type; no Try it / Test it. Autosave/manual-save behavior was already observed working in the Chapter 24–27 Playwright pass (startup dialog offers the autosave on reopen). Suite still green.

## Chapter 31 — Building & Publishing: The Single-Player Browser Client

**STATUS: PASS**

- The chapter's commands recap the toolchain already exercised since Chapter 1 (`npm install -g @sharpee/devkit`, `sharpee init`, `sharpee init-browser`, `sharpee build`). Re-ran `sharpee build`: TypeScript compiled, `dist/my-zoo.sharpee` (12.3 KB) emitted, browser bundle built with all 3 themes wired, "Build complete!".
- §31.3 local hosting check: `npx serve dist/web` → `index.html` 200, `game.js` 200 (headless substitution per the Chapter 1 note).
- §31.2's snippet-map lint: the zoo has no stray snippet entry, so no warning was expected and none appeared. Not separately testable without deviating from the book's code (NO R&D) — noted, not exercised.
- No ambiguities.

## Appendices A–E

**STATUS: PASS (reference only)**

- Architecture Map, Action Catalog (67 actions), Trait Catalog, Message-ID Reference, Grammar Reference. Pure reference material; nothing to execute. Spot-consistency: everything the book taught (traits, action IDs, message IDs used in the zoo) matches what these catalogs list, as far as exercised by the running project.

---

# Run Summary

**Every chapter: PASS or PASS-WITH-ISSUES. Zero BLOCKED. Zero deviations.**

Final state: 174 transcript assertions green (17 unit transcripts + a 2-file chained walkthrough), full browser client built with 3 themes, Playwright-verified presentation layer, `dist/my-zoo.sharpee` and `dist/web/` produced.

Issues found (all logged in place above):

1. **Ch 19 (PASS-WITH-ISSUES)** — §19.3/§19.9/§19.10 listings could pass for real code but carry no "nothing to type" marker, breaking §0.6's own promise. Resolvable (they reference nonexistent names like `ZooMessages`), but a literal reader could waste time.
2. **Ch 26 (PASS-WITH-ISSUES)** — prose/code mismatch: the text says the zoo-sunny flourish "puts its green on the title and menu bars," but the printed flourish rules read `--theme-menu-bg`/`--theme-bg-alt`, which the printed token block never sets, so both bars render the classic-blue root defaults (observed `.sharpee-menu-bar` = `rgb(0,0,170)` under zoo-sunny). The theme otherwise works exactly as taught.
3. Minor ambiguities that resolved cleanly (logged per-chapter): final form of the Ch5 snippet map (§5.8 vs §5.8.2), Ch15 `PettableTrait` file placement, Ch22 factory-function placement, Ch23 §23.1's mixed instruction/demonstration listing (typing it literally would break §23.6's own first assertion), Ch29's "fourteen recorded sessions" count.

Accepted-by-design items encountered and not reported as defects: Ch28 GitHub dependency; CLI "Next steps" hint drift; transitive resolution of `@sharpee/plugin-npc`, `plugin-scheduler`, `media`, `event-processor`, `if-domain`; Aviary `initialDescription` and Petting Zoo snippet cycling (both taught features, verified deterministic).

Environment checks passed: title page reads "Version 2, Revision 2"; npm resolved `@sharpee/*` **2.2.0** (Chapter 5 snippets, `initialDescription`, and `[STATE:]` name resolution all worked on it).
