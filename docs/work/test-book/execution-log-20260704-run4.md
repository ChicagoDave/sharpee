# Execution Log — The Sharpee Author and Developer Manual v2.0.0

Documentation acceptance test. Environment: Linux (headless), Node v22.23.1, npm 11.18.0.
Project created at `~/repos/book-test/my-zoo` per Chapter 1.

---

## Chapter 1 — Installing Sharpee: The CLI and Your First Project

**STATUS: PASS-WITH-ISSUES**

All commands ran as printed: `npm install -g @sharpee/devkit`, `sharpee init my-zoo -y`,
`npm install`, `sharpee build`, `sharpee init-browser`, `sharpee build`, and serving
`dist/web` with `python3 -m http.server` (verified with an HTTP 200 on `index.html`;
headless box, so no interactive browser play). Build produced `dist/index.js`,
`dist/index.d.ts`, and `dist/my-zoo.sharpee` exactly as §1.6 describes.

Issues (all minor; nothing blocked):

- **§1.7 "Playing it"** — Book says `sharpee init-browser` "adds src/browser-entry.ts".
  Actually it created four things: `src/browser-entry.ts`, `src/version.ts`,
  `browser/my-zoo.css`, and it modified `package.json` ("✓ Updated package.json (deps +
  build:browser)"). The book never mentions `src/version.ts` or the `browser/` folder,
  which may confuse a reader who wonders whether they broke something.
- **§1.7 "Playing it"** — The CLI's own next-steps output after `init-browser` says
  `npm install            # Install the browser runtime deps`, a step the book omits.
  In practice the subsequent `sharpee build` succeeded without re-running `npm install`,
  so the book's flow works, but the tool and the book disagree about the required steps.
- **§1.5 "Creating a story project"** — The scaffolder's next-steps output says
  `npm run build` while the book teaches `sharpee build`. Both presumably work; a
  literal reader following the on-screen hints diverges from the book here. Also, the
  book says plain `sharpee init` "walks you through a short wizard"; not tested (used
  `-y` as instructed).
- **§1.2 / §1.8** — Book says bare `sharpee` "prints its help" / "see the current list".
  Confirmed: it prints a usage screen. Note the help screen documents
  `sharpee build [--browser]` as if `--browser` were needed for the web client, while
  the book (§1.7) says plain `sharpee build` "now also emits a web client" once
  `src/browser-entry.ts` exists. The book's claim is what actually happened (plain
  `sharpee build` built `dist/web/`), so the tool help is the confusing one.

## Chapter 2 — Your First Room: Entities, Traits, and the World

**STATUS: PASS-WITH-ISSUES**

Replaced the scaffold `src/index.ts` with the chapter's file (imports, config,
`FamilyZooStory` class, exports), created `tests/transcripts/first-room.transcript`
exactly as §2.9 shows, and ran `npx sharpee build --test`. Build compiled and all 5
transcript tests passed ("5 passed / ✓ All tests passed!"), matching the book's sample
output nearly verbatim.

- **Standing substitution (headless box):** wherever the book says to play in the
  browser, I verify via the chapter's Try-it commands expressed as a transcript test run
  with `npx sharpee build --test` (the mechanic the book itself introduces in §2.9).
  Chapter 2's own Test-it block covers its Try-it list, so no extra work was needed here.
- **§2.2 "Entities and traits"** — Book says "In this version we use five traits" and
  lists `SceneryTrait` ("marks an entity as fixed"). The chapter's code imports
  `SceneryTrait` but never constructs one; fixedness comes from `EntityType.SCENERY`
  instead. Compiles fine (unused import), but the prose misdescribes the code, and a
  literal reader expects a `sign.add(new SceneryTrait(...))` that never appears.
- **§2.9** — The book's sample test-run output omits the build's browser-client section
  and shows `Running: tests/transcripts/...` (relative path); actual output prints the
  absolute path and an extra "Unit tests: 1 files" line. Cosmetic only.

## Chapter 3 — The Play Loop: How a Turn Works

**STATUS: PASS**

Conceptual chapter; "You won't write any new code here." No commands, no Try it /
Test it block. Nothing to execute; no ambiguities encountered.

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs

**STATUS: PASS**

Added `Direction` to the world-model import (per §0.6, only the new name) and replaced
`initializeWorld` with the chapter's complete four-room listing. Created
`tests/transcripts/navigation.transcript` and ran `npx sharpee build --test`: 12/12
assertions pass across both transcripts.

- Minor observation, not a failure: the §4.1/§4.2 teaser snippets use variable names
  (`entranceRoom.exits`, `mainPathRoom.exits`) that never appear in the chapter's real
  listing (which uses `entrance.get(RoomTrait)!.exits`). The prose marks these as
  illustrative, and the full §4.4 listing supersedes them, so no ambiguity in practice.
- The §4.4 listing silently rewrites the ticket booth's description from Chapter 2's
  wording ("A sign in the window reads…" → "…window reading…"). The book says the method
  "replaces the single-room one," so I took the new listing verbatim; noted because a
  reader diffing their file against Chapter 2 may wonder if they made an error.

## Chapter 5 — Scenery & Portable Objects: Everything Is Portable by Default

**STATUS: PASS-WITH-ISSUES**

Added the souvenir penny (§5.1) and the §5.7 block (iron fence, rabbits, zoo map, animal
feed) to the end of `initializeWorld` before player placement, per §0.6. Created
`tests/transcripts/scenery-and-items.transcript`. `npx sharpee build --test`: 24/24
across 3 transcripts.

- **§5.7 "Putting it together"** — Ambiguity resolved in the reader's favor, but real:
  §5.7 says the fence "is the same one from the EntityType.SCENERY section above,
  repeated here so the whole version is in one listing" — yet the souvenir penny from
  §5.1 is NOT repeated in that listing. The reader must infer from the follow-up prose
  ("The souvenir penny from earlier in the chapter sits on the Main Path") that §5.1's
  snippet was also real code to add, not just an example. "The whole version in one
  listing" is therefore false. I added the penny; the Try-it/Test-it (`take penny`)
  fails without it.
- Placement of the new code is governed only by the general §0.6 convention (end of
  `initializeWorld`, before player placement); the chapter itself never says where the
  block goes relative to the Chapter 4 steps. Worked fine.

## Chapter 6 — Containers & Supporters: What Holds What

**STATUS: PASS**

Added `SupporterTrait` to the trait import (the book shows the full import with a
"// new this chapter" comment) and appended the backpack, feed dispenser, and park
bench to `initializeWorld`. Created `tests/transcripts/containers.transcript`.
`npx sharpee build --test`: 36/36 across 4 transcripts. No ambiguities; every snippet
states its room placement.

## Chapter 7 — Openable Things, Locked Doors & Keys: Gating the Way Through

**STATUS: PASS**

Added `OpenableTrait, LockableTrait, DoorTrait` to the world-model import, appended the
§7.4 listing (Supply Room, shelves, keycard, staff gate), and replaced the Main Path
exits table with the new one routing south `via` the gate (the listing's comment says
"This replaces the Main Path exits from Chapter 4", and §0.6 says delete the old
version — done). Created `tests/transcripts/locked-gate.transcript`.
`npx sharpee build --test`: 44/44 across 5 transcripts.

- Note: the §7.1 lunchbox/juice and §7.2 snippets are illustrative only (no lunchbox
  exists in the zoo yet); the chapter's real code is all in §7.4. Clear enough in
  context, but a very literal reader might try to type the lunchbox fragment and find
  no `lunchbox` variable exists.

## Chapter 8 — Light & Dark: What the Player Can See

**STATUS: PASS**

Added `LightSourceTrait, SwitchableTrait` to the import, appended the flashlight (§8.4)
and the §8.7 block (Nocturnal Animals Exhibit, exits, sugar gliders, bush babies, barn
owl), and replaced the Supply Room exits table from Chapter 7 with the new two-exit
version. Created `tests/transcripts/light-and-dark.transcript`.
`npx sharpee build --test`: 59/59 across 6 transcripts.

- Minor: §8.7's exit listing comment says it "adds the south passage to the Supply Room
  exits from Chapter 7" — it is in fact a full replacement of that table (per §0.6 you
  delete the old one). The listing itself repeats the north exit, so a careful reader is
  fine; a careless one could end up with two `supplyRoom...exits =` assignments (which
  would still work, the second winning, but only by accident of ordering).
- Illustrative-only snippets (gem, candle, lantern in §8.5) are clearly marked by
  context; not added.

## Chapter 9 — The Map & Regions: Grouping Rooms

**STATUS: PASS**

Added the two `world.createRegion` calls at the top of `initializeWorld` (§9.2:
"Create regions in initializeWorld(), before the rooms that belong to them") and the six
`world.assignRoom` calls near the end ("after the rooms exist"). No Try it / Test it in
this chapter; verified with a clean `npx sharpee build --test` (59/59 still green).

- Mild placement ambiguity: "after the rooms exist" doesn't say exactly where the
  assignRoom block goes; I used the §0.6 default (end of initializeWorld, before player
  placement). Compiled and ran fine.
- §9.4's `registerEventHandler` snippet has an empty body with a comment and no stated
  placement, and §9.2 says "nothing later depends on them [regions]"; treated as
  illustrative and did not add it.

## Chapter 10 — The Standard Actions: The Four-Phase Model

**STATUS: PASS**

Conceptual chapter: "You won't write an action in this chapter." No code to place, no
Try it / Test it. Nothing to execute.

## Chapter 11 — Scope & Visibility: What the Player Can Reach

**STATUS: PASS**

Conceptual chapter; no code, no commands, no Try it / Test it. Nothing to execute.

## Chapter 12 — Readable Objects & Switchable Devices: Things That Carry State

**STATUS: PASS**

Added `ReadableTrait` to the world-model import (chapter explicitly warns not to
re-import `SwitchableTrait` — good, precise instruction), appended the info plaque,
zoo brochure, and radio to `initializeWorld` ("The snippets below go in
initializeWorld, alongside the rooms you've built"). Created
`tests/transcripts/readables.transcript`. `npx sharpee build --test`: 75/75 across 7
transcripts. The §12.1 `plaque.add(...)` teaser is subsumed by the full §12.2 listing;
no ambiguity.

## Chapter 13 — Event Handlers: Reacting to What Happens

**STATUS: PASS**

Merged the three new imports (`GameEngine` into the engine import, new
`import { ISemanticEvent } from '@sharpee/core'`, `IWorldModel` into the world-model
import) per §0.6, added the two private ID-holding class fields, appended the Gift
Shop + souvenir press block, replaced the Aviary exits (listing comment says so
explicitly), recorded the five IDs, and added `onEngineReady` containing both
`chainEvent` registrations. Created `tests/transcripts/event-handlers.transcript`.
`npx sharpee build --test`: 86/86 across 8 transcripts — goats react, penny transforms.

- Minor: the Test-it transcript's `description:` header line wraps mid-sentence in the
  book ("...the press transforms the / penny"). Typed as printed (two lines) and the
  test runner accepted it, but a reader can't tell whether the wrap is a PDF line break
  or intentional.
- §13.2's illustrative `chainEvent` snippet references a bare `feedId` variable that
  doesn't exist at that point; the real §13.5 code defines it properly. Clear from
  context.

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs

**STATUS: PASS**

Added the three new import lines (`@sharpee/stdlib` names, `type Parser` from
`@sharpee/parser-en-us`, `type LanguageProvider` from `@sharpee/lang-en-us`; the
chapter helpfully lists the full set and says to add only what's missing). Typed the
two top-level action objects (`feedAction`, `photographAction`) before the class, added
the camera to the Gift Shop in `initializeWorld`, and added `getCustomActions`,
`extendParser`, `extendLanguage` to the class. Created
`tests/transcripts/custom-actions.transcript`. `npx sharpee build --test`: 97/97 across
9 transcripts.

- §14.1's sketch also declares `const feedAction` (with an undefined
  `hasRequiredItem`); a fully literal reader who types both §14.1 and §14.2 gets a
  duplicate-declaration compile error. Context makes clear §14.1 is a schematic, but the
  book doesn't say "don't type this one."
- Exact placement of the top-level consts ("top-level consts ... alongside
  initializeWorld" for the methods) is unstated; I put the consts between `config` and
  the class, which compiled fine.

## Chapter 15 — Capability Dispatch: One Verb, Many Rules

**STATUS: PASS**

Added the seven capability-dispatch names to the world-model import, typed
`PettableTrait`, `PetMessages`, `pettingBehavior`, and `pettingAction` as top-level
declarations (in the chapter's order), updated `getCustomActions`, added the two grammar
patterns and four messages, gave the goats and rabbits `PettableTrait`, created the
parrot in the Aviary, and put `registerCapabilityBehavior` at the end of
`initializeWorld` ("after the animals exist") as instructed. Created
`tests/transcripts/petting.transcript`. `npx sharpee build --test`: 105/105 across 10
transcripts.

- The chapter presents the registration snippet (§15.2.3) before saying where it goes;
  the placement instruction arrives later, at the end of §15.3 ("runs once at the end of
  initializeWorld, after the animals exist"). A reader typing in order has to hold that
  snippet in hand for two sections. Worked as instructed.
- `pettingAction` (defined in §15.3) references `PetMessages` (defined in §15.2.2), so
  typing the chapter's listings in book order is required; fine, but never stated.

## Chapter 16 — Custom Traits & Behaviors: Data and Logic, Kept Apart

**STATUS: PASS**

Created `src/dispenser-trait.ts` and `src/dispenser-behavior.ts` exactly as printed.
The chapter is explicit ("one honest note") that the pair is deliberately not wired to
any action, so there's no Try it / Test it; the files compile alongside the story.
`npx sharpee build --test`: clean, 105/105 still green. The `.js` extension requirement
on the relative import is called out in the prose — accurate and it compiled.

## Chapter 17 — Extending the Grammar: Teaching New Sentence Shapes

**STATUS: PASS**

Conceptual/reference chapter. Every concrete grammar block it shows is either code the
project already contains from Chapters 14–15 or an explicitly hypothetical "suppose"
example (`feed :food to :animal`, `.where` constraint). No new code mandated, no Try it
/ Test it. Nothing to execute; build remains green.

## Chapter 18 — The Language Layer: Messages & Message IDs

**STATUS: PASS**

Conceptual chapter; its `addMessage` examples are code the project already contains from
Chapter 14. No new code, no Try it / Test it. Nothing to execute.

## Chapter 19 — The Phrase Algebra: Grammar in the Template, Not the Text

**STATUS: PASS**

Reference chapter on template placeholders. All snippets (`nounPhraseFor`, `Optional`,
`Choice`, list params) are illustrative — several reference variables that don't exist
in the zoo at this point (`gate`, `ZooMessages`, `visible`), which confirms they're not
meant to be typed in. No Try it / Test it. Nothing to execute.

## Chapter 20 — Non-Player Characters: Actors That Take Turns

**STATUS: PASS**

Added the NPC imports (`NpcTrait` to world-model, `NpcPlugin` from
`@sharpee/plugin-npc` — already a dependency of the scaffold, no npm install needed;
`NpcBehavior, NpcContext, NpcAction, createPatrolBehavior` to the stdlib import), the
top-level `PARROT_PHRASES`/`parrotBehavior`, the zookeeper entity, the parrot's
`NpcTrait`, extended `roomIds` (type + recording) as the chapter instructs, and added
the plugin/behavior registrations at the top of the existing `onEngineReady`. Created
`tests/transcripts/npcs.transcript`. `npx sharpee build --test`: 112/112 across 11
transcripts — patrol announcement and parrot greeting both assert green.

- The chapter is precise about the two classic traps (behaviorId match, patrol factory
  id override) and about merging into the existing `onEngineReady`. No ambiguities.
- Placement of the zookeeper creation block in `initializeWorld` is unstated; used the
  §0.6 default (end, before player placement). Fine.

## Chapter 21 — Scenes: Named Windows of Story Time

**STATUS: PASS**

Added `SceneTrait` to the world-model import (§21.2 says it's "the one symbol you
import", even though only the illustrative storm example uses it — it sits unused in the
zoo, which is slightly odd but harmless) and typed the final §21.4 `createScene` listing
into `initializeWorld` (the chapter helpfully says the §21.2 bare version is replaced —
"type in only this final form"). Created `tests/transcripts/scenes.transcript`.
`npx sharpee build --test`: 116/116 across 12 transcripts; begin/end/recur lines all
assert green.

## Chapter 22 — Turns, Timed Events & Daemons: Giving the World a Clock

**STATUS: PASS**

Added the `@sharpee/plugin-scheduler` imports (value + type; already a scaffold
dependency), the `TimedMessages` table "near the top of the story module", the three
factory functions (PA daemon, bleating daemon, feeding-time fuse), the scheduler
registration appended inside the existing `onEngineReady`, and the six messages in
`extendLanguage`. Created `tests/transcripts/timed-events.transcript`.
`npx sharpee build --test`: 131/131 across 13 transcripts — every turn-by-turn timing
assertion (first PA at turn 5, FEEDING TIME at turn 11, bleats stopping) passed exactly
as the book's transcript predicts, which also confirms the "fuse skips its first tick"
note.

- Minor: placement of the three factory functions is never stated (they're shown as
  bare `function` declarations); put them top-level before the class. Compiled fine.

## Chapter 23 — Scoring & Endgame: Winning the Game

**STATUS: PASS-WITH-ISSUES**

Added the score tables and `createVictoryDaemon` top-level, `world.setMaxScore(75)` in
`initializeWorld`, extended `entityIds` with `zooMap`/`brochure` (type + recording, as
the parenthetical instructs), put the award calls in the petting behavior's `execute`,
the feeding action's `execute`, the photograph action's `execute`, and the penny-press
chain, added the three scoring `chainEvent`s to `onEngineReady`, registered the victory
daemon, and added the victory message. Created `tests/transcripts/scoring.transcript`
(28 assertions). `npx sharpee build --test`: 159/159 across 14 transcripts; victory
fires on the exact turn the 75th point lands, and `score` afterwards prints the
"perfect score" line the book promises.

- **§23.3** — The photograph award snippet reads `context.world.awardScore(...)` but the
  photograph action as typed in Chapter 14 declares its execute parameter `_context`
  (with a "cosmetic; nothing changes" body). The book never says to rename the
  parameter; a literal paste produces `context` referencing an undeclared name. I made
  the smallest mechanical adjustment (renamed `_context` → `context`, replaced the
  comment body). Same class of issue for the petting behavior: Chapter 15's execute
  had `_world`; §23.3's replacement shows `world`. The book shows the full replacement
  there, so that one is typeable, but the *photograph* one is only a fragment.
- **§23.3** — "in the penny-press chain (Chapter 13), the same shape as the map award"
  gives no exact insertion point within the handler. Placed it after handing the pressed
  penny to the player, before the return. Worked.
- **§23.6** — The book's transcript comment wraps across two lines in the PDF
  ("# The victory daemon fires on the turn the 75th point is awarded: / this move.");
  typed literally, the second line has no `#`. The runner tolerated the bare line, but a
  reader can't tell whether that's luck or design.

## Chapter 24 — Channels: The Universal UI Surface

**STATUS: PASS**

Added the `@sharpee/if-domain` type import, the `AMBIENCE_BY_ROOM` table, and the
`registerChannels` hook with the `zoo.ambience` channel exactly as §24.6 shows. Build
and all 159 transcript tests stayed green. No Try it / Test it in the chapter itself;
visual verification done together with Chapter 25 via Playwright (below).

- Placement note: the chapter never says where `AMBIENCE_BY_ROOM` goes (it's shown
  inside the same listing as the method but is a bare `const`); placed it top-level.
  Compiled fine.

## Chapter 25 — The Web Client: A Framework-Free UI

**STATUS: PASS-WITH-ISSUES**

Added the `zoo.ambience` renderer to `src/browser-entry.ts` (grabbing
`client.getChannelRenderer()` after `connectEngine`, before `client.start()`), rebuilt,
served `dist/web`, and verified with headless Chromium (Playwright): page loads with
"Zoo Entrance" prose; `#zoo-ambience` is empty at the entrance, paints "The air is
alive with birdsong and the rustle of wings." in the Aviary, and clears ("") back on
the Main Path — confirming §24.6's sparse-''-vs-undefined explanation; the status line
shows "Aviary" and "Score: 5 | Turns: 3"; zero JS console errors.

- **§25.5 "Overriding a renderer"** — The chapter never states which file the renderer
  registrations belong in. The reader must connect Chapter 24's aside ("its browser
  entry registers a renderer") with the scaffold's own comment in
  `src/browser-entry.ts` ("Add any story-specific channel/audio renderers before
  `client.start()`"). A literal reader could plausibly put `client.getChannelRenderer()`
  code in `index.ts`, where there is no `client`. Deserves one explicit sentence.
- §25.1's `BrowserClient` construction listing differs from what `sharpee init-browser`
  actually scaffolded (theme ids `zoo-sunny` vs `modern-dark`, `storagePrefix`
  `familyzoo-` vs `my-zoo-`); the prose does say "You rarely write this by hand," so I
  left the scaffold as-is. The score-renderer override was treated as expository and not
  added (nothing later depends on it).
- Headless substitution: browser play verified via Playwright-driven Chromium typing
  into `#command-input`, per the standing note in Chapter 2's entry.

## Chapter 26 — Decoration & Theming: Style Without HTML on the Wire

**STATUS: PASS**

Added the `[data-theme="zoo-sunny"]` token block and the two Family Zoo flourish rules
to `browser/my-zoo.css`, and the `sharpee.themes` entry to `package.json` exactly as
§26.4.2 shows. `sharpee build` reported "✓ Wired 3 theme(s): modern-dark, paper,
zoo-sunny". Playwright verification: the theme menu (Settings → Theme) lists Classic /
Modern Dark / Paper / Zoo Sunny; clicking Zoo Sunny flips `data-theme="zoo-sunny"` on
`<html>`, the body background computes to rgb(255, 250, 240) (the book's #fffaf0 "warm
cream"), and the choice survives a reload via localStorage. No JS errors.

- The decoration bracket syntax (§26.1–26.2) is expository here; no story prose in the
  zoo uses `[em:...]` yet, so nothing to type or verify for that half of the chapter.

## Chapter 27 — Media & Audio: Sight and Sound as Channels

**STATUS: PASS**

Added `AudioRegistry` (from `@sharpee/media`) and `Effect` (type, from
`@sharpee/event-processor`) imports — both packages resolve without a new npm install —
the top-level `audio` registry and `mediaEvent`/`emit` helpers, the two
`audio.atmosphere(...)` declarations in `initializeWorld` after the rooms, the
effect-returning `actor_moved` handler in `onEngineReady`, the engine-side
`createAmbientChannel('environment')` in `registerChannels`, and the browser-side
`createAmbientChannelRenderer` registration in `src/browser-entry.ts`. No assets shipped
(the chapter explicitly blesses wiring first, assets later). Build + 159/159 tests
green. Playwright verification: walking Entrance → Main Path → Aviary triggers a fetch
of `audio/aviary-birdsong.mp3` which 404s exactly as §27.4 predicts ("silent, not
broken"); zero JS errors.

- Placement of the helper snippet (`mediaCounter`/`mediaEvent`/`emit`) is unstated
  beyond "two small helpers"; placed top-level. The `audio.atmosphere` block's comment
  says "in initializeWorld, after the rooms are created" — placed with the other
  end-of-method code. Both compiled and ran.
- The feed-crunch / shutter-click / closing-music examples are described as living in
  the companion snapshot, not printed as typeable listings; skipped accordingly.

## Chapter 28 — The Multi-File Story: Putting It All Together

**STATUS: PASS**

Explicitly the book's "one read-along chapter": "there is nothing to type in this
chapter", the seven-file split lives in the companion repository, and "your own
single-file zoo keeps working exactly as it is for every chapter that follows".
Followed as written — no changes made. (Under this test's amnesia rules I did not
browse the companion repo; the chapter is self-consistent and requires nothing from it
for later chapters.)

## Chapter 29 — Transcript Testing & Walkthroughs: Proving the Game Still Works

**STATUS: PASS**

Reference chapter; no new files are mandated (the §29.1 "Feed the goats" transcript is
an example of the shape, not an "Add tests/..." instruction, and the after-hours [GOAL]
bracket is explicitly to be skipped by single-file readers: "skip this bracket if you
stayed single-file"). Ran both documented commands; `npx sharpee build --test
--stop-on-failure` passes 159/159.

- Pleasant accuracy check: the chapter opens "by now npx sharpee build --test replays
  fourteen recorded sessions" — my `tests/transcripts/` holds exactly 14 files after
  following every Test-it block. The book's bookkeeping is correct.
- Not verified: `[EVENT:]`/`[STATE:]` assertions, `[GOAL]`/`[IF]`/`[WHILE]`/
  `[NAVIGATE TO]` directives, `$save`/`$restore` chaining, and the `entry:` header —
  the chapter documents them but never has the reader exercise them, so a literal
  reader leaves this chapter without ever having run one.

## Chapter 30 — Saving & Restoring: State Lives in the World

**STATUS: PASS**

Conceptual chapter; its code listings (`behaviorSwapped`, the runner-state hooks) belong
to the read-along multi-file snapshot, and the single-file zoo already implemented the
same hooks in Chapter 22's PA daemon. Nothing to type. Verified the chapter's concrete
browser claim with Playwright: take map, walk south, reload the page — the autosave
restores mid-game (location "Main Path", zoo map still in inventory). Matches §30.3
exactly.

## Chapter 31 — Building & Publishing: The Single-Player Browser Client

**STATUS: PASS**

All commands in this chapter (`npm install -g @sharpee/devkit`, `sharpee init`,
`sharpee build`, `sharpee init-browser`, `python3 -m http.server -d dist/web`) were
already executed and verified in Chapter 1 and throughout. Additionally verified the
chapter's strongest claim — "no server, no build step... open index.html and the game
runs" — by loading `dist/web/index.html` over `file://` in headless Chromium: the game
boots ("Zoo Entrance" prose renders), accepts commands (`south` → status line "Main
Path"), zero JS errors.

- Tiny nit: §31.3's comment says "then open the printed http://localhost:8000" —
  `python3 -m http.server` does print the port, so this is accurate, though earlier
  chapters used the same command without mentioning the port.

## Appendices A–E

**STATUS: PASS (reference only)**

Architecture map, action catalog (67 actions), trait catalog, message-ID reference, and
grammar reference. Pure lookup material; nothing to execute. Not systematically
cross-checked against the platform (out of scope for a front-to-back execution test),
but every appendix item the chapters relied on (e.g. Appendix B verbs `take`, `switch
on`, `read`; the traits used in Volume II) behaved as cataloged during the run.

---

# Summary

**Environment:** headless Linux, Node v22.23.1, npm 11.18.0, `@sharpee/devkit` 2.1.x,
platform `@sharpee/*` ^2.0.0. Project: `~/repos/book-test/my-zoo` (single file
`src/index.ts` throughout, as the book intends).

**End state:** all 31 chapters executed front to back in one project. Final suite:
**159 assertions in 14 transcripts, all passing** (`npx sharpee build --test`). Browser
chapters (24–27) plus save/publish claims (30–31) verified with Playwright-driven
headless Chromium: ambience channel, theme switching + persistence, ambient-audio
pipeline (404-tolerant), autosave-on-reload, and serverless `file://` play all work as
documented.

**Chapter statuses:** 1 PASS-WITH-ISSUES · 2 PASS-WITH-ISSUES · 3 PASS · 4 PASS ·
5 PASS-WITH-ISSUES · 6 PASS · 7 PASS · 8 PASS · 9 PASS · 10 PASS · 11 PASS · 12 PASS ·
13 PASS · 14 PASS · 15 PASS · 16 PASS · 17 PASS · 18 PASS · 19 PASS · 20 PASS ·
21 PASS · 22 PASS · 23 PASS-WITH-ISSUES · 24 PASS · 25 PASS-WITH-ISSUES · 26 PASS ·
27 PASS · 28 PASS · 29 PASS · 30 PASS · 31 PASS. **No chapter was BLOCKED; no
DEVIATION beyond one parameter rename forced by Chapter 23 (logged there).**

**Where the book most risks failing a literal reader** (details in the per-chapter
entries):

1. **Ch 23 §23.3 (worst offender):** the photograph-action award fragment references
   `context` inside a method whose printed Chapter-14 signature is `_context`; pasting
   the fragment as-is does not compile. The petting-behavior parallel is handled
   correctly (full replacement shown) — the photograph one is not.
2. **Ch 5 §5.7:** claims "the whole version is in one listing" but omits the souvenir
   penny; the Try-it/Test-it fails unless the reader realizes §5.1's snippet was real
   code.
3. **Ch 25 §25.5:** never names the file (`src/browser-entry.ts`) where renderer
   registrations go; a literal reader can put them where no `client` exists.
4. **Ch 2 §2.2:** "we use five traits" but `SceneryTrait` is only imported, never
   constructed, in that chapter's code.
5. Recurring low-grade friction: teaser/schematic snippets that would not compile if
   typed (Ch 4 §4.1–4.2, Ch 13 §13.2, Ch 14 §14.1), unstated placement for top-level
   declarations (Chs 14, 20, 22, 24, 27 — all resolvable via the §0.6 conventions), and
   PDF line-wrap artifacts inside transcript blocks (Ch 13, Ch 23).

**What the book gets impressively right:** every Test-it transcript passes verbatim,
including exact turn-timing assertions (Ch 22) and the 75th-point victory turn (Ch 23);
the "fourteen recorded sessions" count in Ch 29 matches reality; import-dedup warnings
(§0.6, Ch 12, Ch 14) are precise; and every browser-behavior claim tested (themes,
autosave, file://, missing-asset tolerance) held.
