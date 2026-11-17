# Execution Log — The Sharpee Author and Developer Manual (v2.0.0)

Acceptance test run: literal front-to-back execution of the book, one project,
no outside knowledge. Started 2026-07-04.

Environment: Linux (headless container), Node/npm as found on box.

---

## Chapter 1 — Installing Sharpee: The CLI and Your First Project

**STATUS: PASS**

Executed as written: `node --version` (v22.23.1), `npm --version` (11.18.0),
`npm install -g @sharpee/devkit`, `sharpee init my-zoo -y`, `cd my-zoo`,
`npm install`, `sharpee build`, `sharpee init-browser`, `sharpee build`.
All succeeded; `dist/my-zoo.sharpee` and `dist/web/` produced; `python3 -m
http.server -d dist/web` serves index.html (HTTP 200).

- (§1.7 "Playing it") Book: after `sharpee init-browser`, go straight to
  `sharpee build`. Actual: `init-browser` output says "Next steps: npm install
  # Install the browser runtime deps" — an extra step the book never mentions.
  The build succeeded anyway in this run, so possibly a stale CLI message, but
  a literal reader sees the tool and the book disagree.
- (§1.5 "Creating a story project") The scaffold file listing in the book has a
  wrapped/garbled comment: "package.json  # pinned to the platform version devkit
  shipped with" — reads as a PDF layout glitch.
- (§1.6) Book says dist/ contains .d.ts files "alongside" the two artifacts —
  actual dist/ after first build: index.d.ts, index.js, my-zoo.sharpee. Matches.
- (§1.8) CLI help output additionally mentions repokit/monorepo notes and
  "Reserved (later): test, play" — not in the book's table, harmless.
- Environment note: this box is headless; browser "play" steps are verified by
  serving dist/web and, from Ch 2 on, by transcript tests (substitution logged
  at first use in Ch 2).

---

## Chapter 2 — Your First Room: Entities, Traits, and the World

**STATUS: PASS**

Replaced the scaffold src/index.ts with the chapter's file (imports/config/class
shell §2.3, createPlayer §2.4, initializeWorld §2.5, exports §2.7). Created
tests/transcripts/first-room.transcript verbatim (§2.9). `npx sharpee build
--test` compiled and ran 5/5 transcript assertions PASS, output matching the
book's sample run almost line-for-line.

- (§2.9 "Prove it") Book switches to `npx sharpee build --test` after Ch 1 used
  the global `sharpee`. Works, but the `--test` flag is absent from the Ch 1
  CLI table (§1.8) and from `sharpee` help (which lists "Reserved (later):
  test"). A literal reader can't discover `--test` anywhere except this one
  command block. Cosmetic inconsistency; no failure.
- (§2.3 "The shape of the file") The import block includes SceneryTrait, but no
  Ch 2 code constructs it (§2.2 even explains SceneryTrait; §5 says
  EntityType.SCENERY suffices). Compiles fine (no noUnusedLocals error) — noted
  as a reader ambiguity only.
- Verification note (first use): headless box — the book's browser play loop
  can't be exercised; the "Try it" list is fully covered by the chapter's own
  transcript test, which was used as verification. This substitution applies to
  all later chapters' Try-it blocks.

---

## Chapter 3 — The Play Loop: How a Turn Works

**STATUS: PASS**

Conceptual chapter; the book says explicitly "You won't write any new code
here." Nothing to execute. The §3.2.4 event snippet is labeled illustrative and
was not added to the project. No issues.

---

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs

**STATUS: PASS**

Added `Direction` to the world-model import (§4.4) and replaced initializeWorld
with the chapter's complete method. Added tests/transcripts/navigation.transcript
(§4.8). `npx sharpee build --test`: 12/12 PASS across both transcripts.

- (§4.2 "Two rules that trip up everyone") The illustrative snippet mixes
  variable names: it assigns `entranceRoom.exits` / `mainPathRoom.exits` but the
  destinations reference `mainPath.id` / `entrance.id` — neither pair is ever
  declared together, and the complete method (§4.4) uses a different pattern
  (`entrance.get(RoomTrait)!.exits`). Harmless because §4.4 is complete, but a
  reader who types §4.2 literally has undeclared names.
- (§4.4) The ticket booth's description silently changes from Chapter 2's
  wording ("...window. A sign in the window reads \"Self-Guided...\"") to
  "...window reading \"Self-Guided...\"" with no mention. The Ch 2 test only
  asserts on "Self-Guided Tours", so it still passes.

---

## Chapter 5 — Scenery & Portable Objects

**STATUS: PASS**

Added the souvenir penny (§5.1) and the §5.7 listing (iron fence, rabbits, zoo
map, animal feed) to initializeWorld; added tests/transcripts/scenery-and-
items.transcript (§5.9). `npx sharpee build --test`: 24/24 PASS across 3
transcripts.

- (§5.1 / §5.7 placement ambiguity) Neither section says *where inside
  initializeWorld* the new code goes. §5.7's comment says only "Fill each room
  with scenery... then scatter a few takeable items." Resolved by inserting the
  penny + §5.7 block after the Ch 4 scenery and before the player placement;
  this compiled and passed. A literal reader must guess the insertion point.
- (§5.7) Book helpfully notes the fence listing is a repeat of §5.2 ("add it
  once") — good; no issue.

---

## Chapter 6 — Containers & Supporters

**STATUS: PASS**

Added SupporterTrait to the trait import (§6.3), the backpack (§6.2), feed
dispenser (§6.2.1), and park bench (§6.3) to initializeWorld; added
tests/transcripts/containers.transcript (§6.7). `npx sharpee build --test`:
36/36 PASS across 4 transcripts.

- (placement ambiguity, same as Ch 5) The chapter never states where in
  initializeWorld the three new objects go; inserted before the player
  placement. Worked.

---

## Chapter 7 — Openable Things, Locked Doors & Keys

**STATUS: PASS**

Added OpenableTrait/LockableTrait/DoorTrait import (§7.4) and the full §7.4
listing (Supply Room, shelves, keycard, staff gate, exits with `via` on both
sides); added tests/transcripts/locked-gate.transcript (§7.6). Build + tests:
44/44 PASS.

- (§7.4 "Wiring it all together") The listing's comment says the new Main Path
  exits block "replaces the Main Path exits from Chapter 4", but the new block
  references `supplyRoom`, which is created later in the method than the Ch 4
  Step-2 wiring. A literal reader must figure out that "replace" means: delete
  the Ch 4 assignment and let the new assignment live further down (or keep
  both and let the later one win). Resolved by deleting the Ch 4 mainPath exits
  assignment; compiled and passed.
- (§7.1) The lunchbox/juice snippets (§7.1.1, §7.1.2) are illustrative — no
  lunchbox is ever added to the zoo. Clear enough in context; not added.

---

## Chapter 8 — Light & Dark

**STATUS: PASS**

Added LightSourceTrait/SwitchableTrait import (§8.7), the flashlight (§8.4,
placed in the Supply Room), and the nocturnal exhibit block (§8.7); added
tests/transcripts/light-and-dark.transcript (§8.9). Build + tests: 59/59 PASS.

- (§8.7) Same "replaces/adds to earlier exits" pattern as Ch 7: the new Supply
  Room exits assignment supersedes the Ch 7 one. Kept both assignments (the
  later wins) — compiled and passed, but the book never says whether to delete
  the earlier assignment. Ambiguity noted.
- (§8.5) Always-on gem / candle / lantern snippets are illustrative and not
  added (no gem/candle/lantern exist in the zoo). Clear from context.

---

## Chapter 9 — The Map & Regions

**STATUS: PASS**

Added the two createRegion calls at the top of initializeWorld ("before the
rooms", §9.2) and the six assignRoom calls near the end ("after the rooms
exist"). No Try-it/Test-it in this chapter; `npx sharpee build --test` still
59/59 PASS.

- (§9.2) "after the rooms exist" doesn't pin an exact spot — rooms are created
  at three different points in the method by now. Placed the assignments after
  the last room's scenery, before player placement. Compiled fine.
- (§9.4, §9.5) The region_entered handler and nesting/query snippets are
  illustrative (empty handler body; reg-underground isn't part of the zoo) —
  not added. The chapter is explicit that nothing later depends on regions.

---

## Chapter 10 — The Standard Actions: The Four-Phase Model

**STATUS: PASS**

Conceptual chapter — no instructions to type anything (the Action shape in
§10.2 is a contract illustration). Nothing executed; suite still green.

---

## Chapter 11 — Scope & Visibility

**STATUS: PASS**

Conceptual chapter; no code to type, no Try-it/Test-it. Nothing executed.

---

## Chapter 12 — Readable Objects & Switchable Devices

**STATUS: PASS**

Added the ReadableTrait import (chapter intro), the info plaque (§12.2,
Petting Zoo), zoo brochure (§12.3, entrance), and radio (§12.4, Supply Room);
added tests/transcripts/readables.transcript (§12.7). Build + tests: 75/75
PASS.

- (chapter intro) Good explicit note not to re-import SwitchableTrait —
  prevented a real duplicate-identifier error. No issues found.

---

## Chapter 13 — Event Handlers: Reacting to What Happens

**STATUS: PASS**

Added GameEngine/ISemanticEvent/IWorldModel imports and the roomIds/entityIds
class fields (§13.4), the Gift Shop + souvenir press block with the replaced
Aviary exits and the ID bookkeeping (§13.4), and onEngineReady with both
chainEvent handlers (§13.5, §13.6). Added tests/transcripts/event-
handlers.transcript (§13.8). Build + tests: 86/86 PASS.

- (§13.4) Same "replaces the Aviary exits from Chapter 4" pattern: deleted the
  old assignment and let the new block (later in the method, after giftShop
  exists) carry the full wiring. Ambiguity as in Ch 7/8, resolved identically.
- (§13.4) The gift-shop block's placement inside initializeWorld is again
  unstated; placed before the region assignments. The ID-recording lines
  reference entities from Chs 5/13, so any placement after those works.
- (§13.8) The transcript's description line wraps oddly in the PDF
  ("...transforms the / penny"); typed as one line.

---

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs

**STATUS: PASS-WITH-ISSUES**

Added the stdlib/parser/lang imports, the feedAction and photographAction
top-level consts (§14.1–14.3), the camera in the Gift Shop (§14.3), and the
getCustomActions/extendParser/extendLanguage members (§14.4–14.6). Added
tests/transcripts/custom-actions.transcript (§14.8). Build + tests: 97/97 PASS.

- (chapter intro import block) The book's import block re-lists
  `ISemanticEvent` from @sharpee/core and `IdentityTrait, IFEntity, EntityType`
  from @sharpee/world-model — all already imported in this same file since
  Chs 2/13. Typed literally, this is a TS duplicate-identifier compile error.
  Chapter 12 warned about exactly this for SwitchableTrait, but Ch 14 gives no
  such caveat. Resolved by adding only the genuinely new names (Action,
  ActionContext, ValidationResult, Parser, LanguageProvider); compiled fine.
- (§14.1) The `feedAction` sketch in §14.1 (with `hasRequiredItem` etc.) is a
  shape illustration that would not compile (`hasRequiredItem` is never
  declared); §14.2 then gives the real action in full. Reasonably clear, but
  the two consts share the same name — a reader must understand §14.2 replaces
  §14.1, not follows it.
- (placement) Where the top-level action consts go relative to the class is
  stated ("top-level consts"); placed them above the class. Registration
  methods placed after onEngineReady. Worked.

---

## Chapter 15 — Capability Dispatch: One Verb, Many Rules

**STATUS: PASS**

Added the capability-dispatch imports (only new names; the block again re-lists
IFEntity/Action/ActionContext/ValidationResult/ISemanticEvent — same duplicate-
import hazard as Ch 14), PettableTrait, PetMessages, pettingBehavior,
PETTING_ACTION_ID + pettingAction (§15.2–15.3), the pettable animals + parrot
+ registerCapabilityBehavior at the end of initializeWorld (§15.4), and the
three registrations (§15.3). Added tests/transcripts/petting.transcript
(§15.7). Build + tests: 105/105 PASS.

- (chapter intro) Import block re-lists already-imported identifiers (IFEntity,
  Action, ActionContext, ValidationResult, ISemanticEvent) — literal paste
  would be a duplicate-identifier error. Same pattern as Ch 14; resolved the
  same way.
- (§15.4) "The goats (from Chapter 4) and rabbits (from Chapter 5)" — the
  in-scope variable names (`goats`, `rabbits`) do match earlier chapters'
  code, so the add() lines drop in cleanly. No issue.

---

## Chapter 16 — Custom Traits & Behaviors

**STATUS: PASS**

Created src/dispenser-trait.ts (§16.2) and src/dispenser-behavior.ts (§16.3)
verbatim. The book is explicit (§16.4) that the zoo does NOT wire the pair up,
so index.ts was not touched. Build + tests: 105/105 PASS; both files compile
alongside the story.

- (§16.2) The line `dispenser.add(new DispenserTrait({ chargesRemaining: 5 }))`
  is shown as "how you'd add it", but §16.4 says the zoo doesn't wire this up.
  A literal reader could go either way; I did not add the trait to the
  dispenser entity. The honest note in §16.4 mostly resolves this, but it comes
  two sections after the add() snippet.

---

## Chapter 17 — Extending the Grammar

**STATUS: PASS**

Conceptual consolidation of what Chs 14–15 already wired in. The §17.5
two-slot pattern ('feed :food to :animal') and §17.6 .where constraint are
"suppose"-style illustrations, not instructions; nothing added. No
Try-it/Test-it. Suite still green.

## Chapter 18 — The Language Layer

**STATUS: PASS**

Conceptual; re-explains extendLanguage already in the project. Nothing to
execute.

## Chapter 19 — The Phrase Algebra

**STATUS: PASS**

Conceptual; all snippets (nounPhraseFor, Optional/Choice, verbatim) are
illustrative — none are placed into the zoo by the chapter's prose. Nothing to
execute. Note: §19.9 quietly introduces imports from '@sharpee/if-domain' and
a ZooMessages constant that exist nowhere in the project — fine as
illustration, but a reader who types it has undeclared names.

---

## Chapter 20 — Non-Player Characters

**STATUS: PASS**

Added the NPC imports, PARROT_PHRASES + parrotBehavior (top-level, §20.3), the
zookeeper entity (§20.1), the parrot's NpcTrait (§20.1.1), extended
roomIds (type + recording) per §20.4's instruction, and the plugin/behavior
registrations at the top of the existing onEngineReady (§20.4). Added
tests/transcripts/npcs.transcript (§20.6). Build + tests: 112/112 PASS —
including the turn-pinned "wait → The zookeeper leaves to the east" assertion.

- (§20 intro) `@sharpee/plugin-npc` is not in the scaffolded package.json
  dependencies; the import only resolves because the package happens to be in
  node_modules as a transitive dependency. The book never says to install it.
  Works here, but is a latent hazard for a reader (e.g. with strict/pnpm-style
  hoisting or a future dependency change).
- (§20 intro) The import block again re-lists GameEngine (already imported
  since Ch 13) — same duplicate-import hazard as Chs 14/15; added only new
  names.
- (§20.1) Placement of the zookeeper entity creation inside initializeWorld is
  unstated (again); placed after the parrot block. Worked.

---

## Chapter 21 — Scenes

**STATUS: PASS**

Added the SceneTrait import (§21.2 says it's "the one symbol you import",
though the zoo's scene never uses it — the storm example in §21.5 that reads
activeTurns is illustrative), and the final §21.4 createScene (the book is
helpfully explicit that this replaces the §21.2 bare version — "type in only
this final form"). Added tests/transcripts/scenes.transcript (§21.7). Build +
tests: 116/116 PASS.

- (§21.2) The SceneTrait import ends up unused in the actual zoo code; compiles
  fine, but a reader may wonder why they imported it. Minor.
- (placement) createScene "in initializeWorld()" — exact spot unstated; placed
  after the zookeeper block (it needs pettingZoo in scope). Worked.

---

## Chapter 22 — Turns, Timed Events & Daemons

**STATUS: PASS**

Added SchedulerPlugin + Daemon/Fuse/SchedulerContext imports (the block again
re-lists ISemanticEvent and IdentityTrait — same duplicate-import hazard;
added only new names), TimedMessages near the top of the module, the three
factory functions (PA daemon §22.2, bleating daemon §22.3, feeding fuse
§22.4), scheduler registration appended inside onEngineReady (§22.1), and the
six messages in extendLanguage (§22.5). Added tests/transcripts/timed-
events.transcript (§22.7) — all 15 turn-pinned commands PASS (131/131 total).

- (§22.1) The order of scheduler registrations in the book's onEngineReady
  snippet lists the PA daemon, fuse, then bleating daemon; kept exactly. The
  turn-by-turn assertions (first DING DONG on turn 5, FEEDING TIME on turn 11,
  bleat countdown ending before "One hour") all matched the engine's actual
  timing — impressive precision for a book transcript.
- (placement) The three factory functions' file position is unstated beyond
  "TimedMessages… near the top of your story module"; placed them above
  PARROT_PHRASES. Worked.

---

## Chapter 23 — Scoring & Endgame

**STATUS: PASS-WITH-ISSUES**

Added MAX_SCORE/ScoreIds/ScorePoints/ROOM_SCORE_MAP/ScoreMessages (§23.2),
setMaxScore(75) in initializeWorld (§23.1), the pet/feed/photograph awards in
their actions, the pressed-penny award in the Ch 13 chain, three scoring
chainEvent handlers in onEngineReady (§23.3), extended entityIds with
zooMap/brochure, the victory daemon + registration + message (§23.4). Added
tests/transcripts/scoring.transcript (§23.6): all 28 commands PASS, victory
fires on the exact turn the book promises. Full suite: 159/159.

- (§23.3 "inside the feeding action's execute()") The snippet re-declares
  `const target = context.sharedData.feedTarget as IFEntity;` — but the Ch 14
  execute() already declares `const target`. Pasted literally it's a
  duplicate-declaration compile error; a reader must merge by hand (I kept the
  existing declaration and added only the name/award lines). The book gives no
  merge guidance.
- (§23.3) The photograph award snippet requires changing Ch 14's
  `execute(_context...)` parameter name to `context` — again unstated;
  mechanical but a literal paste breaks.
- (§23.3) Similarly the petting-behavior award changes `_world` to `world` in
  the §15 behavior signature. Unstated rename.
- (§23.6) The transcript contains a `# comment` line — comment syntax in
  transcripts is never introduced anywhere before this; it happens to work.

---

## Chapter 24 — Channels: The Universal UI Surface

**STATUS: PASS**

Added the @sharpee/if-domain type import, AMBIENCE_BY_ROOM, and the
registerChannels hook with the zoo.ambience channel (§24.6). Build + full
transcript suite still 159/159.

- Verification note (first use for Vol VII): Chs 24–27 have no Try-it/Test-it
  blocks; per the run plan these chapters are verified with Playwright driving
  the built dist/web bundle in headless Chromium.
- (§24.6) Playwright: #zoo-ambience is empty at the Entrance/Main Path, shows
  "The air is alive with birdsong and the rustle of wings." in the Aviary, and
  clears (empty string, exactly the §24.6 sparse-replace semantics) on leaving.

## Chapter 25 — The Web Client

**STATUS: PASS**

The scaffolded src/browser-entry.ts matches §25.1's description
(initialize/connectEngine/start, storagePrefix, themes metadata). Added the
§25.5 zoo.ambience renderer after connectEngine (the scaffold's own header
comment confirms placement: "Add any story-specific channel/audio renderers
before client.start()"). Playwright: renderer creates #zoo-ambience inside
#main-window and paints/clears it; status line renders location ("Aviary") and
score/turns ("Score: 5 | Turns: 3"); no console/page errors.

- (§25.5) The score-renderer override ("★") is presented as a how-to example,
  not zoo code; only the zoo.ambience renderer is shipped per §24.6's closing
  note. A literal reader can't be fully sure whether to type the score
  override; I did not. Logged as ambiguity.
- (§25.1) Book's BrowserClient sample shows defaultTheme 'zoo-sunny' and a
  themes array including it, while the scaffold has 'modern-dark'/'paper' —
  the book says the array "is metadata the generator fills in", leaving unclear
  whether the reader should hand-edit it in Ch 26. Deferred to Ch 26.

---

## Chapter 26 — Decoration & Theming

**STATUS: PASS**

Added `sharpee.themes` (modern-dark, paper, inline zoo-sunny) to package.json
(§26.4.2) and the [data-theme="zoo-sunny"] token block + two flourish rules to
browser/my-zoo.css. Rebuild wired 3 themes ("✓ Wired 3 theme(s): modern-dark,
paper, zoo-sunny"). Playwright verification:
- Settings → Theme submenu lists Classic, Modern Dark, Paper, Zoo Sunny —
  generated from package.json exactly as §26.4 describes.
- Clicking Zoo Sunny flips data-theme="zoo-sunny"; body background becomes
  rgb(255,250,240) (= #fffaf0 from the token block) and text rgb(47,42,36).
- Choice persists in localStorage ("my-zoo-theme": "zoo-sunny") per §26.3.

- (§25.1 vs §26.4) The scaffolded browser-entry's `themes:` array and
  `defaultTheme` still say modern-dark/paper; the book never says to hand-edit
  them, and the menu comes out right anyway (built from package.json). The
  §25.1 sample showing defaultTheme 'zoo-sunny' therefore doesn't match what a
  literal reader's project contains — cosmetic inconsistency; the default
  theme on first load here is modern-dark, not zoo-sunny.

---

## Chapter 27 — Media & Audio

**STATUS: PASS**

Added AudioRegistry/Effect/createAmbientChannel imports and the `audio`
registry + mediaEvent/emit helpers (top-level), the two atmosphere
declarations in initializeWorld (§27.6), the effect-returning actor_moved
handler in onEngineReady, `registry.add(createAmbientChannel('environment'))`
in registerChannels, and the ambient:environment renderer in browser-entry.
Build + transcripts still 159/159. Playwright: after the first command unlocks
audio, walking into the Aviary fires a network request for
audio/aviary-birdsong.mp3 — the full chain works; with no asset shipped it
404s silently ("silent, not broken", §27.4 confirmed). No page errors.

- (§27.6) `@sharpee/media` and `@sharpee/event-processor` are (like plugin-npc
  in Ch 20) not in package.json dependencies — imports resolve only via
  transitively-installed node_modules. Book never says to install them.
- (§27.6) The helpers' placement ("Two small helpers keep the body readable")
  and the audio const ("Declare the registry as a top-level const") are clear
  enough; the mention that the snapshot's feed/photograph actions also emit
  crunch/shutter sounds and an after-hours music daemon is descriptive only —
  no code shown, so not typed. A reader comparing against the snapshot will
  find their project missing those.

---

## Chapter 28 — The Multi-File Story

**STATUS: PASS (read-along; not executable under test constraints)**

The chapter states explicitly: "this is the book's one read-along chapter…
there is nothing to type in this chapter", and the single-file zoo "keeps
working exactly as it is for every chapter that follows". Nothing was changed;
the suite stays green.

- The chapter directs the reader to the companion repository on GitHub
  (tutorials/familyzoo/v2.0.0/src/ch28-multi-file/). Under this run's
  amnesia/no-web rules that material could not be read, so the seven-file
  structure itself was not verified — only that skipping it leaves the project
  intact, which the book promises and which held true.

## Chapter 29 — Transcript Testing & Walkthroughs

**STATUS: PASS**

Conceptual/consolidation chapter; no new required files (the §29.1 "Feed the
goats" transcript is a shape recap, and §29.4's [GOAL] bracket for after-hours
explicitly says "skip this bracket if you stayed single-file", which this
project did). Ran both documented commands: `npx sharpee build --test` and
`npx sharpee build --test --stop-on-failure` — both green.

- Nice verification: the chapter says the suite now replays "fourteen recorded
  sessions" — the project has exactly 14 transcripts at this point. The book's
  bookkeeping is accurate.
- (§29.3) EVENT/STATE assertion syntax and $save/$restore walkthrough
  checkpoints are described but never exercised by an instruction in the
  single-file track; untested in this run.

## Chapter 30 — Saving & Restoring

**STATUS: PASS**

Conceptual for the single-file zoo (the behaviorSwapped daemon lives in the
ch28 snapshot; our Ch 22/23 daemons already carry getRunnerState/
restoreRunnerState as typed from the book). Verified §30.3's autosave claim
with Playwright: played 4 turns (take map, south, east — Score 10, Petting
Zoo), reloaded the page, and the autosave restored location, score, turn count
and inventory ("zoo map" still carried) with zero story code. Exactly as
documented.

## Chapter 31 — Building & Publishing

**STATUS: PASS**

All §31.1–31.3 commands were exercised over the course of the run (`npm
install -g @sharpee/devkit`, `sharpee init`, `npm install`, `sharpee build`,
`sharpee init-browser`, serving dist/web with python3 http.server → HTTP 200
and a fully playable page per the Vol VII Playwright runs). dist/ contains
index.js, my-zoo.sharpee, and dist/web/ as described.

- (§31.5) Publishing as an npm package was not executed (external/outward
  action; also no real registry target). Described-only.
- The client About box / version stamping (§31.4) not separately verified
  beyond version.ts being generated by init-browser.

## Appendices A–E

Reference material only (architecture map, action/trait/message-ID/grammar
catalogs). Nothing to execute.

---

# Run Summary

**30 of 31 chapters executed as written; no chapter was BLOCKED.** The final
project builds clean, all 14 transcript suites pass (159 assertions), and the
browser client was verified end-to-end with Playwright (channels, renderer,
theming, media, autosave).

Recurring issues a literal reader will hit, in rough order of severity:

1. **Duplicate-import hazard (Chs 14, 15, 20, 22).** Chapter-opening import
   blocks re-list identifiers already imported in earlier chapters. Pasted
   literally into the single accumulated file they are TS duplicate-identifier
   errors. Ch 12 warns about this once (SwitchableTrait); the later chapters
   don't.
2. **Snippet-merge collisions (Ch 23).** The feeding-action award snippet
   re-declares `const target` already present in the Ch 14 execute(); the
   photograph/petting award snippets silently require renaming `_context`/
   `_world` parameters. Literal pasting breaks compilation.
3. **"Replaces the exits from Chapter N" pattern (Chs 7, 8, 13).** The new
   exits blocks reference rooms created later in the method than the original
   assignment, so "replace" can't mean "edit in place" — the reader must
   delete the old assignment and rely on the block's later position (or keep
   both and depend on last-write-wins). Never spelled out.
4. **Undeclared dependencies (Chs 20, 27).** @sharpee/plugin-npc,
   @sharpee/media, @sharpee/event-processor are imported by book code but are
   not in the scaffolded package.json; they resolve only as transitive
   node_modules. Fragile against hoisting changes.
5. **Placement ambiguity (nearly every world-building chapter).** The book
   almost never says where inside initializeWorld a new block goes. Every
   guess worked here, but a reader gets no confirmation signal beyond the
   next Test-it.
6. **Minor:** `--test` flag undocumented outside one Ch 2 code block (help
   says "Reserved (later): test"); Ch 1 init-browser's "npm install" next-step
   not mentioned by the book; §25.1 sample shows defaultTheme 'zoo-sunny'
   which never ends up in a literal reader's browser-entry; transcript `#`
   comments first used in Ch 23 but only explained in Ch 29; booth description
   silently changes between Chs 2 and 4.

What was NOT testable in this run: the Ch 28 seven-file companion snapshot
(no-web rule), walkthrough chaining / EVENT / STATE assertions (never
required by an instruction), npm publishing (§31.5).
