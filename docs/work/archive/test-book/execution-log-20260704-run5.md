# Execution Log — "The Sharpee Author and Developer Manual" v2.0.0 acceptance test

Environment: Linux (headless), Node v22.23.1, npm 11.18.0. Tester is a first-time
Sharpee author following the book literally, front to back, in one project
(`~/repos/book-test/my-zoo`). The book PDF is the only source of truth.

---

## Chapter 1 — Installing Sharpee: The CLI and Your First Project

STATUS: PASS

- (§1.3) `node --version` / `npm --version` — v22.23.1 / 11.18.0, meets "v18.0.0 or newer".
- (§1.4) `npm install -g @sharpee/devkit` succeeded; `sharpee` is on PATH.
- (§1.5) `sharpee init my-zoo -y`, `cd my-zoo`, `npm install` — all succeeded. Scaffold
  matched the book's file listing (src/index.ts, package.json, tsconfig.json, .gitignore).
- (§1.6) `sharpee build` succeeded, producing dist/index.js, dist/index.d.ts, and
  dist/my-zoo.sharpee — matching the book's description.
- (§1.7) `sharpee init-browser` created src/browser-entry.ts, src/version.ts,
  browser/my-zoo.css and updated package.json, exactly as the book lists. Its output
  suggested `npm install`; ran it per the book's instruction. `sharpee build` then also
  emitted dist/web/. Served with `python3 -m http.server -d dist/web` — index.html
  returned HTTP 200. (Headless box: could not visually play in a browser; noted for
  later chapters where transcript tests substitute.)
- Minor observation, not a failure (§1.5/§1.7): the CLI's "Next steps" hints say
  `npm run build` / `npm run build:browser` where the book teaches `sharpee build`.
  The book explicitly warns in §1.7 that CLI hints may drift and to follow the book,
  so this is pre-acknowledged. Both routes exist.
- Minor observation (§1.8): the book's CLI table says running `sharpee` with no
  arguments shows "the current list" (of registered stories); actually it prints usage
  help (which includes command descriptions but not the registered-story list —
  `sharpee list` does that). §1.2 says plain `sharpee` "prints its help", which matches.
  The two statements in the book are slightly inconsistent; behavior matches §1.2.

---

## Chapter 2 — Your First Room: Entities, Traits, and the World

STATUS: PASS

- Typed the chapter's code exactly as printed (imports, config, class,
  createPlayer, initializeWorld, exports), replacing the scaffolded src/index.ts as
  Chapter 1 (§1.5) said would happen ("in the next chapter you'll replace it").
- (§2.9) Created tests/transcripts/first-room.transcript exactly as printed and ran
  `npx sharpee build --test`. Build compiled clean; all 5 transcript commands PASS.
  Output format matched the book's trimmed example (including "5 passed" and
  "✓ All tests passed!").
- Minor observation (§2.9): the test command is shown as `npx sharpee build --test`,
  though Chapter 1 installed the CLI globally and used plain `sharpee build`. Both
  invocations work; the switch to `npx` is unexplained but harmless. Note also that
  the `--test` flag does not appear in Chapter 1's "CLI at a glance" table (§1.8) or
  in `sharpee`'s own usage help, but it works.
- Ambiguity resolved (§2.2/§2.3): SceneryTrait is imported but never constructed in
  this chapter; the book explicitly says it "sits in the import block because Chapter 5
  puts it to work," so the unused import is intentional. It compiled without warnings.
- Note: the chapter's "Try it" (§2.8) is identical ground to the transcript test
  (§2.9), which passed, so headless verification required no substitution here.

---

## Chapter 3 — The Play Loop: How a Turn Works

STATUS: PASS

- Conceptual chapter; the book states "You won't write any new code here." Read in
  full; nothing to execute or test. No issues.

---

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs

STATUS: PASS

- (§4.4) Added `Direction` to the world-model import as instructed and replaced
  initializeWorld with the chapter's complete listing, typed verbatim.
- (§4.8) Created tests/transcripts/navigation.transcript as printed; ran
  `npx sharpee build --test`. All 7 new assertions PASS; Chapter 2's first-room test
  still passes (12/12 total). Note the chapter's rewritten ticket-booth description
  still contains "Self-Guided Tours", so the Chapter 2 test keeps passing — the book
  clearly kept this compatible.
- No ambiguities: the chapter says the listing "replaces the single-room one from
  Chapter 2" and prints the complete method, so placement was unambiguous.

---

## Chapter 5 — Scenery & Portable Objects

STATUS: PASS

- Added the souvenir penny (§5.1) and the §5.7 block (iron fence, rabbits, zoo map,
  animal feed) verbatim, at the end of initializeWorld before the player is placed,
  per the §0.6 convention. §5.7's parenthetical ("the fence is the same one from the
  earlier section, add it once; the penny... stays where you typed it") made
  placement unambiguous.
- (§5.9) Created tests/transcripts/scenery-and-items.transcript as printed; all 12
  assertions PASS. Whole suite: 24/24 across 3 transcripts.

---

## Chapter 6 — Containers & Supporters: What Holds What

STATUS: PASS

- Added SupporterTrait to the trait import (§6.3, shown explicitly) and typed the
  backpack (§6.2), feed dispenser (§6.2.1), and park bench (§6.3) blocks verbatim at
  the end of initializeWorld per the §0.6 convention. The prose states where each
  lives (backpack → entrance is in the code; bench → Main Path and dispenser →
  Petting Zoo are both stated and in the code), so placement was unambiguous.
- (§6.7) Created tests/transcripts/containers.transcript as printed; all 12
  commands PASS (including the `not contains "can't"` assertions). Whole suite:
  36/36 across 4 transcripts.

---

## Chapter 7 — Openable Things, Locked Doors & Keys

STATUS: PASS

- (§7.4) Added the three new trait imports as shown, typed the full puzzle block
  (Supply Room, shelves, keycard, staff gate, exits with `via`) verbatim at the end
  of initializeWorld. Per the listing's own comment ("This replaces the Main Path
  exits from Chapter 4") and the §0.6 convention, deleted the Chapter 4 Main Path
  exits assignment from Step 2. Placement of the replacement was mildly ambiguous —
  the new exits assignment appears inside the chapter's end-of-method block rather
  than back in Step 2 where the original lived; I kept it in the chapter block as
  printed, which works since it runs later.
- (§7.6) Created tests/transcripts/locked-gate.transcript as printed; all 8 commands
  PASS. Whole suite: 44/44 across 5 transcripts.

---

## Chapter 8 — Light & Dark: What the Player Can See

STATUS: PASS

- (§8.7) Added LightSourceTrait and SwitchableTrait to the import as shown; typed
  the flashlight (§8.4) and the nocturnal-exhibit block (§8.7) verbatim at the end
  of initializeWorld. Replaced the Chapter 7 Supply Room exits table with the new
  one (the listing includes north + south), deleting the old per §0.6.
- Ambiguity resolved (§8.4): the flashlight listing appears mid-chapter with no
  explicit placement prose; §8.7 later says it "sits in the Supply Room" and the
  code's moveEntity targets supplyRoom, so placing the block at the end of
  initializeWorld (where supplyRoom is in scope) worked.
- (§8.9) Created tests/transcripts/light-and-dark.transcript as printed; all 15
  commands PASS (17 assertions). Whole suite: 59/59 across 6 transcripts.

---

## Chapter 9 — The Map & Regions: Grouping Rooms

STATUS: PASS

- (§9.2) Typed the createRegion pair at the top of initializeWorld ("Create regions
  in initializeWorld(), before the rooms that belong to them") and the six
  assignRoom calls after all rooms exist (end of the method, before player
  placement). Compiled clean; full suite still 59/59.
- Ambiguity resolved (§9.4): the registerEventHandler example for
  if.event.region_entered has a comment-only body and the prose frames it as a
  Volume IV preview ("exactly the way you'll react to any event in Volume IV"), so
  I did NOT add it to the project. Nothing later in the chapter depends on it. A
  literal reader could plausibly type it in; the book never says "add this," but it
  also never says it's illustrative-only (contrast §3.2.4, which does).
- No Try it / Test it in this chapter; verified by clean build + green suite.

---

## Chapter 10 — The Standard Actions: The Four-Phase Model

STATUS: PASS

- Conceptual chapter (action anatomy); no code to type, no Try it/Test it. The
  action-shape listing is a schematic (`const someAction: Action = {...}` with
  comment bodies), clearly not meant to be added. No issues.

---

## Chapter 11 — Scope & Visibility: What the Player Can Reach

STATUS: PASS

- Conceptual chapter; no code, no Try it/Test it. No issues.

---

## Chapter 12 — Readable Objects & Switchable Devices

STATUS: PASS

- Added ReadableTrait to the import (the chapter explicitly warns not to re-import
  SwitchableTrait — good catch by the book). Typed the info plaque, brochure, and
  radio blocks verbatim; prose says they "go in initializeWorld, alongside the rooms
  you've built since Chapter 4," and each block's moveEntity names its room, so
  placement at the end of initializeWorld was unambiguous.
- (§12.7) Created tests/transcripts/readables.transcript as printed; all 16 commands
  PASS. Whole suite: 75/75 across 7 transcripts.

---

## Chapter 13 — Event Handlers: Reacting to What Happens

STATUS: PASS

- (§13.4) Added GameEngine / ISemanticEvent / IWorldModel imports (merged into
  existing import lines per the §0.6 "add only the names you're missing" rule),
  the two private ID-holding class fields, the Gift Shop + souvenir press block,
  and the ID-recording lines, all verbatim. The Gift Shop listing replaces the
  Chapter 4 Aviary exits (its comment says so); deleted the old table.
- (§13.4–13.6) Created onEngineReady(engine) with both chainEvent registrations
  typed verbatim inside it, as the prose directs ("The two reaction sections that
  follow both live inside it").
- (§13.8) Created tests/transcripts/event-handlers.transcript as printed; all 11
  commands PASS. Whole suite: 86/86 across 8 transcripts.
- Minor placement ambiguity (§13.4): the class-fields skeleton shows
  "// createPlayer / initializeWorld / onEngineReady …" so field placement was
  clear; where inside initializeWorld the Gift Shop block goes is only governed by
  the global §0.6 convention (end of method, before the player is placed). That
  reading worked.

---

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs

STATUS: PASS

- Added the chapter's import block (only missing names, per its own instruction):
  Action/ActionContext/ValidationResult from @sharpee/stdlib, type-only Parser from
  @sharpee/parser-en-us, type-only LanguageProvider from @sharpee/lang-en-us.
- Typed feedAction (§14.2) and photographAction (§14.3) as top-level consts, the
  camera into the Gift Shop in initializeWorld, and getCustomActions /
  extendParser / extendLanguage as class members — all placements stated
  explicitly by the chapter. All code verbatim.
- (§14.8) Created tests/transcripts/custom-actions.transcript as printed; all 11
  commands PASS (including both blocked paths). Whole suite: 97/97 across 9
  transcripts.
- Note: §14.1's feedAction skeleton (with undeclared `hasRequiredItem`) is clearly
  schematic; §14.2 provides the real listing. Not typed in. No issues.

---

## Chapter 15 — Capability Dispatch: One Verb, Many Rules

STATUS: PASS

- Added the capability-dispatch imports (merged missing names into the world-model
  import), PettableTrait, PetMessages, pettingBehavior, and pettingAction as
  top-level code, all verbatim. Wired the three registrations exactly as shown:
  pettingAction added to getCustomActions, pet/stroke grammar in extendParser, four
  addMessage calls in extendLanguage. Added PettableTrait to goats/rabbits, created
  the parrot in the Aviary, and placed registerCapabilityBehavior at the end of
  initializeWorld after the animals, as §15.3 directs.
- (§15.7) Created tests/transcripts/petting.transcript as printed; all 8 commands
  PASS (goats lean in, rabbits soft, dispenser refused, parrot bites). Whole suite:
  105/105 across 10 transcripts.

---

## Chapter 16 — Custom Traits & Behaviors: Data and Logic, Kept Apart

STATUS: PASS

- Created src/dispenser-trait.ts and src/dispenser-behavior.ts verbatim (the
  chapter names both file paths explicitly). The book is explicit that the pair is
  deliberately NOT wired up ("the zoo doesn't wire this pair up... no action calls
  DispenserBehavior.dispense yet"), so the illustrative add/dispense snippets were
  not typed into the story. Both files compile alongside the story; suite still
  105/105.

---

## Chapter 17 — Extending the Grammar

STATUS: PASS

- Conceptual chapter revisiting grammar the project already registered in Chapters
  14–15. The two-slot pattern (§17.5, "Suppose feeding should name both...") and the
  .where constraint (§17.6) are framed as hypotheticals, so nothing was added. No
  Try it/Test it. No issues.

---

## Chapter 18 — The Language Layer: Messages & Message IDs

STATUS: PASS

- Conceptual chapter; all listings restate code already typed in Chapter 14. No
  Try it/Test it. No issues.

---

## Chapter 19 — The Phrase Algebra

STATUS: PASS

- Conceptual chapter on template placeholders; its snippets (nounPhraseFor, Optional,
  Choice) are illustrative fragments referencing entities not in any method scope
  (e.g. bare `gate`, `ZooMessages`), so they cannot be typed in as-is and are clearly
  not meant to be. No Try it/Test it. No issues.

---

## Chapter 20 — Non-Player Characters: Actors That Take Turns

STATUS: PASS

- Added the NPC imports (NpcTrait merged into world-model; NpcPlugin from
  @sharpee/plugin-npc; NpcBehavior/NpcContext/NpcAction/createPatrolBehavior from
  stdlib). @sharpee/plugin-npc resolved without any install step — the scaffold's
  dependencies evidently include it; the book never says to install it, which would
  be a gap if it weren't already present.
- Typed the zookeeper entity, the parrot's NpcTrait, PARROT_PHRASES +
  parrotBehavior (top-level, as instructed), and the plugin/behavior registration
  at the top of the existing onEngineReady ("add the plugin code below at the top
  of that existing method; don't declare a second one") — all verbatim.
- DEVIATION-ADJACENT (instructed but not shown): §20.4 says to extend the roomIds
  field type and recording block to add mainPath and aviary but shows no code for
  it. I wrote the two-line type extension and two recording lines myself in the
  book's established style. A literal reader must compose this code unaided — the
  only place in the book so far where required code is described but not printed.
- (§20.6) Created tests/transcripts/npcs.transcript as printed; all 8 commands PASS,
  including the turn-sensitive "leaves to the east" assertion and the parrot's
  arrival emote. Whole suite: 112/112 across 11 transcripts.

---

## Chapter 21 — Scenes: Named Windows of Story Time

STATUS: PASS

- (§21.4) Typed the final createScene listing (the chapter says the onBegin/onEnd
  version "replaces the bare version above... type in only this final form") into
  initializeWorld. Added SceneTrait to the import because §21.2 says "the one
  symbol you import is SceneTrait" — though the zoo's own scene never uses it (it's
  only needed by the illustrative storm example), so the import sits unused. Mild
  inconsistency: the book instructs an import the typed-in code doesn't need.
- (§21.7) Created tests/transcripts/scenes.transcript as printed; all 4 commands
  PASS including the recurring re-entry. Whole suite: 116/116 across 12 transcripts.

---

## Chapter 22 — Turns, Timed Events & Daemons

STATUS: PASS

- Added SchedulerPlugin imports as shown, TimedMessages near the top of the module
  ("declare it once, near the top of your story module"), the three factory
  functions (PA daemon, goat-bleating daemon, feeding-time fuse) as top-level
  functions, the scheduler registration in the existing onEngineReady after the NPC
  registration ("lives in the same onEngineReady, alongside the NPC registration"),
  and the six addMessage lines in extendLanguage — all verbatim.
- (§22.7) Created tests/transcripts/timed-events.transcript as printed; all 15
  commands PASS, including the exact turn-by-turn PA cadence and the bleating
  countdown. Whole suite: 131/131 across 13 transcripts.
- Note: the chapter's import block re-lists ISemanticEvent and IdentityTrait, which
  the file already imports; per §0.6 only the scheduler names were added.

---

## Chapter 23 — Scoring & Endgame: Winning the Game

STATUS: PASS

- Typed the scoring constants (§23.2), victory daemon (§23.4), the three chainEvent
  scoring handlers (§23.3), and the in-place award calls into the feeding action's
  execute, the photograph action's execute (renaming `_context` to `context` exactly
  as the book instructs), the petting behavior's execute (renaming `_world` to
  `world` — shown in the listing), and the penny-press chain — all verbatim.
  Registered the victory daemon and added the VICTORY message.
- Added `world.setMaxScore(75);` to initializeWorld per §23.1's snippet comment;
  the rest of that snippet (awardScore/getScore examples) is illustrative.
- DEVIATION-ADJACENT (instructed but not shown, same pattern as Chapter 20): §23.3's
  parenthetical says this.entityIds.zooMap and .brochure "are recorded in
  initializeWorld when you create those items, the same way Chapter 13 stored the
  feed and penny ids." No code is printed; I extended the entityIds field type and
  added the two recording lines myself in the book's style.
- Placement ambiguity resolved: the feeding-action snippet says to insert "after its
  existing `const target = ...` line"; done literally (before the fed-flag if-block).
  Worked.
- (§23.6) Created tests/transcripts/scoring.transcript as printed (28 commands,
  including a `#` comment line, which the runner accepted); ALL PASS — the victory
  fires on the exact turn the book claims, and `score` afterwards prints "perfect
  score of 75 points". Whole suite: 159/159 across 14 transcripts.

---

## Chapters 24–27 — Volume VII, Presentation (Channels, Web Client, Theming, Media)

VERIFICATION SUBSTITUTION (logged once, per test protocol): this box is headless, so
"open it in a browser and play" was verified with Playwright (Chromium) driving the
served dist/web bundle: typing commands into the real input box and asserting on the
live DOM/network. Playwright was installed in the scratchpad, not the project.

### Chapter 24 — Channels: The Universal UI Surface

STATUS: PASS

- Typed the IChannelRegistry/ChannelProduceContext type import, AMBIENCE_BY_ROOM,
  and the registerChannels hook with the zoo.ambience channel verbatim (the chapter
  states the Family Zoo snapshot "ships exactly this zoo.ambience channel").
- Browser-verified: the mood line renders in the Aviary and clears to '' on the
  moodless Main Path — the sparse/replace semantics behave exactly as §24.6 warns.

### Chapter 25 — The Web Client: A Framework-Free UI

STATUS: PASS

- Per §25.1, left the scaffolded browser-entry values untouched ("leave the
  scaffold's values as they are"); the chapter's BrowserClient listing is the zoo
  snapshot's, not something to copy over the scaffold.
- (§25.5) Registered the zoo.ambience renderer in src/browser-entry.ts after
  connectEngine and before client.start(). The scaffold's marker for the spot is
  the file-header comment ("Add any story-specific channel/audio renderers before
  `client.start()`") rather than an inline comment at the exact line — findable,
  but §25.5's "the scaffolded entry marks the spot with a comment" slightly
  oversells it.
- Ambiguity resolved: §25.5's score-star renderer example reads as illustrative
  ("To change how it looks...") and was not typed in; only the zoo.ambience
  renderer, which Chapter 24 says the zoo actually ships, was added.
- Browser-verified: opening prose renders, typed commands move the player, status
  line location and score/turns update per turn (Score: 5 | Turns: 4 after the
  south/west walk — room-visit scoring from Ch23 visible in the status bar).

### Chapter 26 — Decoration & Theming

STATUS: PASS

- Added the [data-theme="zoo-sunny"] token block and the two Family Zoo flourish
  rules to browser/my-zoo.css (the chapter explicitly names this file for the
  tutorial project), and the sharpee.themes list ("modern-dark", "paper",
  {id:"zoo-sunny", name:"Zoo Sunny"}) to package.json, verbatim.
- Browser-verified: build copied dist/web/themes/modern-dark.css and paper.css and
  linked them after the engine CSS with my-zoo.css last (cascade order as
  documented); the theme menu lists "Zoo Sunny"; setting data-theme="zoo-sunny"
  paints the body the token's warm cream (rgb(255,250,240)).

### Chapter 27 — Media & Audio: Sight and Sound as Channels

STATUS: PASS

- Typed the AudioRegistry const, the two atmosphere declarations in
  initializeWorld, the mediaEvent/emit helpers, the effect-returning
  if.event.actor_moved handler in onEngineReady, the engine-side
  createAmbientChannel('environment') registration in registerChannels, and the
  browser-side createAmbientChannelRenderer registration — all verbatim. No assets
  shipped, exercising the book's "silent, not broken" claim.
- Browser-verified: entering the Aviary triggers a network request for
  audio/aviary-birdsong.mp3 (404s harmlessly; page keeps playing) — the
  media.ambient.play → channel → AudioManager chain works end to end.
- Minor placement ambiguity: the mediaEvent/emit helpers' listing has no stated
  location ("Two small helpers keep the body readable"); placed top-level next to
  the AudioRegistry const, which compiled and worked.
- Full transcript suite still green after all Volume VII changes: 159/159.

---

## Chapter 28 — The Multi-File Story

STATUS: PASS (read-along; not executable under test constraints)

- The book is explicit this is its "one read-along chapter": the seven-file project
  lives in the companion repository and "there is nothing to type in this chapter";
  the single-file zoo "keeps working exactly as it is for every chapter that
  follows." My single-file project was left untouched and kept building.
- Not verified: the chapter directs the reader to browse the code on GitHub, which
  the amnesia rules of this test forbid (no web). A reader without internet access
  cannot follow this chapter at all — worth noting as a distribution consideration,
  not a defect in the text.

---

## Chapter 29 — Transcript Testing & Walkthroughs

STATUS: PASS-WITH-ISSUES

- Accuracy note (§ intro): the chapter says "by now npx sharpee build --test replays
  fourteen recorded sessions" — my suite indeed had exactly 14 transcripts at this
  point. The book's bookkeeping is correct for a literal reader.
- Ambiguity (§29.1): the "Feed the goats" transcript is a complete runnable listing
  followed by "Run it and the tester drives those commands...", but no file path is
  given (every earlier Test it block named one). I saved it as
  tests/transcripts/feed-the-goats.transcript (inferred name) and it passes; suite
  now 163/163 across 15 transcripts. A literal reader has to invent the filename.
- (§29.5) Ran both printed commands; `npx sharpee build --test --stop-on-failure`
  works (all green, flag accepted).
- Not exercised: walkthrough chaining ($save/$restore, wt-*), [EVENT:]/[STATE:]
  assertions, and [GOAL]/[IF]/[WHILE]/[NAVIGATE TO] directives are described but
  the chapter never instructs adding any to the single-file project (the after-hours
  [GOAL] example explicitly says "skip this bracket if you stayed single-file"), so
  their documented behavior remains untested by this run.

---

## Chapter 30 — Saving & Restoring

STATUS: PASS

- Conceptual chapter; the behavior-swap daemon listing belongs to the ch28
  multi-file snapshot, not the single-file zoo, so nothing was typed. The
  getRunnerState/restoreRunnerState hooks it teaches were already typed in
  Chapters 22–23 as instructed there.
- Browser-verified (Playwright, same substitution as Vol. VII): §30.3's claim
  "Re-open the page and the autosave restores you mid-game" holds — after `take
  map` + `south`, a reload restored the player on the Main Path with the zoo map
  still in inventory, no story code involved.

---

## Chapter 31 — Building & Publishing

STATUS: PASS

- Every command in the chapter had already been run over the course of the book
  (global devkit install, init, npm install, build, init-browser, http.server) and
  each behaved as described. dist/ contains index.js + my-zoo.sharpee; dist/web/ is
  fully static and served correctly all through the Playwright sessions.
- §31.5 (publishing to npm) was not performed — outward-facing and out of scope for
  an acceptance test.

---

## Appendices A–E

STATUS: PASS (reference-only)

- Architecture map, action catalog (67 actions), trait catalog, message-ID
  reference, grammar reference. Pure reference tables; nothing to execute. Spot
  consistency with the run: verbs used throughout (pet/stroke were story-added;
  touch/pat/stroke exist in the core grammar at unstated priority — the book's
  advice to use withPriority(150) for story patterns explains why `stroke` reached
  the story action) — no contradictions observed.

---

# FINAL SUMMARY

All 31 chapters and appendices were executed or read as the book directs, in one
project, front to back. Final state: 163/163 transcript assertions green across 15
transcripts; browser build verified end-to-end with Playwright (channels, renderers,
theming, media requests, autosave restore).

**Verdict: the book survives a literal reader remarkably well.** Every Try it /
Test it block passed exactly as printed — including turn-sensitive assertions (NPC
patrol timing, PA-announcement cadence, victory firing on the exact turn the 75th
point lands). No chapter was BLOCKED; no compiler error was ever hit; zero
deviations were needed to keep the project compiling.

Issues a literal reader will hit, in rough order of severity:

1. **Code instructed but not printed (Ch 20 §20.4, Ch 23 §23.3).** Twice the book
   requires the reader to compose code it only describes: extending the roomIds
   field/recording block (Ch 20) and recording zooMap/brochure ids (Ch 23). Both are
   two-to-four-line edits in an established pattern, but they are the only places a
   beginner must write unshown TypeScript to proceed.
2. **Unnamed test file (Ch 29 §29.1).** The "Feed the goats" transcript is meant to
   be run but is the only transcript in the book with no file path given.
3. **Minor internal inconsistencies.** §1.8 says bare `sharpee` shows "the current
   list" (it prints usage help, as §1.2 correctly says); §21.2 instructs importing
   SceneTrait though the typed-in code never uses it; §25.5 says the scaffolded
   browser entry "marks the spot with a comment" — the marker is the file-header
   comment, not an inline one.
4. **Unexplained npx switch (Ch 2 §2.9).** The book installs the CLI globally in
   Ch 1 (`sharpee build`) then switches to `npx sharpee build --test` from Ch 2 on,
   and `--test` appears in neither §1.8's CLI table nor the CLI's own help. Both
   invocations work.
5. **Placement relies on the §0.6 conventions.** Many listings (Ch 5–8, 12–13)
   give no explicit in-method position and depend entirely on the front-matter
   convention ("end of initializeWorld, before the player is placed"); a reader
   who skipped How to Read This Book would be lost. Where it mattered, the
   convention always produced working code.
6. **Untestable-offline chapter (Ch 28).** The one read-along chapter requires
   GitHub access; fine as designed, but a fully offline reader gets nothing from it.
7. **Described-but-never-exercised test features (Ch 29).** Event/state assertions,
   walkthrough chaining, and control-flow directives are documented without any
   instructed usage in the single-file track, so the book never proves them to the
   reader (or to this test).

Chapters 3, 10, 11, 17, 18, 19 are purely conceptual and contain nothing
executable; all of their inline snippets are clearly framed as illustrative.
