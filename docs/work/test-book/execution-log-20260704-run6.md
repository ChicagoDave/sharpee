# Execution Log — The Sharpee Author and Developer Manual (v2.0.0)

Acceptance test run as a first-time author. Book is the only source of truth.
Environment: Linux (headless), Node v22.23.1, npm 11.18.0.
Project: `~/repos/book-test/my-zoo` (single project carried through all chapters).

**Standing substitution (headless box):** where the book says to play in a
browser, I instead verify the build artifacts and/or serve `dist/web/` and
check it responds over HTTP; "Try it" blocks are reproduced as transcript
tests run with the testing command the book documents (first used in Ch 2).

---

## Chapter 1 — Installing Sharpee: The CLI and Your First Project

**STATUS: PASS**

Everything the chapter instructs worked as written: `node`/`npm` present
(v22.23.1 ≥ v18), `npm install -g @sharpee/devkit` succeeded, `sharpee init
my-zoo -y` scaffolded exactly the four files listed in §1.5 (`src/index.ts`,
`package.json`, `tsconfig.json`, `.gitignore`), `npm install` succeeded,
`sharpee build` compiled and produced `dist/index.js` + `dist/my-zoo.sharpee`
(plus `index.d.ts`, as §1.6 says). `sharpee init-browser` created
`src/browser-entry.ts`, `src/version.ts`, `browser/my-zoo.css` and updated
`package.json` as §1.7 describes; its output did suggest `npm install`, which
the book anticipates ("If its output suggests running npm install, do so").
After that, `sharpee build` also emitted `dist/web/`, which serves fine over
`python3 -m http.server` (HTTP 200 on index.html).

Minor observations (not failures):

- (§1.5 "Creating a story project") The CLI's "Next steps" hint says
  `npm run build` where the book's flow uses `sharpee build`. The book
  explicitly warns in §1.7 that CLI hints can drift and to follow the book,
  so this is anticipated — noting it for completeness. Both presumably work;
  I followed the book's `sharpee build`.
- (§1.8 "The CLI at a glance") The book's table lists `sharpee build --test`
  ("Build, then replay the project's transcript tests"). Running plain
  `sharpee` prints help as the book promises, but that help does not mention
  `--test` anywhere and ends with "Reserved (later): test, play". Whether
  `build --test` actually works will be exercised in Chapter 2's transcript
  test; flagged here because §1.8 claims to be "the full set" while the CLI's
  own help disagrees.
- (§1.8) `sharpee list` works as documented ("No registered stories. Use
  `sharpee register <location>`.").

## Chapter 2 — Your First Room: Entities, Traits, and the World

**STATUS: PASS**

Typed the file exactly as §§2.3–2.7 present it (imports, `config`, class with
`createPlayer` and `initializeWorld`, `export const story: Story = new
FamilyZooStory(); export default story;`), replacing the scaffolded stub as
Chapter 1 said I would. Created `tests/transcripts/first-room.transcript`
verbatim from §2.9 and ran `npx sharpee build --test`: compile clean, all
5 transcript commands PASS, "✓ All tests passed!". Output shape matches the
book's trimmed sample (per-command PASS lines, a totals block).

Notes / ambiguities resolved (none blocked me):

- (§2.9 "Prove it") **Headless substitution, logged once as required:** the
  §2.8 "Try it" block is meant to be played in the browser; on this headless
  box I verified it via the §2.9 transcript test instead, which encodes the
  exact same five commands. This is the substitution I'll use for all later
  "Try it" blocks.
- (§2.2 / §2.3) The book knowingly imports `SceneryTrait` without using it
  ("it sits in the import block because Chapter 5 puts it to work"). The
  project's tsconfig accepted the unused import — no `noUnusedLocals` error.
- (§1.8 follow-up) `sharpee build --test` (run as `npx sharpee build --test`
  per §2.9) works exactly as the book's table claimed, despite being absent
  from the CLI's own help text.

## Chapter 3 — The Play Loop: How a Turn Works

**STATUS: PASS**

Conceptual chapter; the text says explicitly "You won't write any new code
here." No commands, no code placement, nothing to verify beyond reading.
The illustrative `context.event(...)` snippet in §3.2.4 is labeled
illustrative by the book itself ("the zoo has no brass key"), so it was not
typed into the project.

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs

**STATUS: PASS**

Added `Direction` to the `@sharpee/world-model` import as §4.4 shows, and
replaced the Chapter-2 `initializeWorld` with the chapter's complete
four-room version (the book says explicitly it "replaces the single-room one
from Chapter 2" and that "nothing is abbreviated"). Created
`tests/transcripts/navigation.transcript` verbatim from §4.8. `npx sharpee
build --test`: compile clean, 12/12 assertions pass across both transcripts
(the Chapter-2 test still passes against the reworded booth description,
which still contains "Self-Guided Tours").

Notes:

- (§4.1/§4.2) The snippets there use variables (`entranceRoom`,
  `mainPathRoom`) that don't appear in the final §4.4 code — clearly
  illustrative fragments, not placement instructions. No ambiguity in
  practice since §4.4 supplies the full method.

## (Front matter) How to Read This Book

Read for the named conventions the chapters cite: the **import rule** (add
only names not already imported), the **placement rule** (new world-building
code goes at the end of `initializeWorld`, before the player is placed; new
registrations at the end of `onEngineReady`), and the **replacement rule**
(a replacing listing deletes its predecessor). These resolved placement for
every chapter so far and are followed for the rest of the run.

## Chapter 5 — Scenery & Portable Objects

**STATUS: PASS**

Added the souvenir penny (§5.1) and the §5.7 block (iron fence, rabbits, zoo
map, bag of animal feed) at the end of `initializeWorld` before player
placement, per the placement rule. §5.7's parenthetical explicitly resolves
the fence duplication ("add it once") and the penny ("not re-shown; it stays
where you typed it"). Created `tests/transcripts/scenery-and-items.transcript`
verbatim from §5.9. `npx sharpee build --test`: 24/24 pass across 3
transcripts, including "fixed in place" for fence/goats and plural agreement
for the goats.

No issues.

## Chapter 6 — Containers & Supporters: What Holds What

**STATUS: PASS**

Added `SupporterTrait` to the trait import (per the import rule; the book
even marks it "new this chapter"), then the backpack, feed dispenser, and
park bench blocks at the end of `initializeWorld` per the placement rule,
which §6.2 restates explicitly. Created `tests/transcripts/
containers.transcript` verbatim from §6.7. `npx sharpee build --test`:
36/36 pass across 4 transcripts. The `[OK: not contains "can't"]` assertion
form (first seen here) works.

No issues.

## Chapter 7 — Openable Things, Locked Doors & Keys

**STATUS: PASS**

Added `OpenableTrait, LockableTrait, DoorTrait` to the world-model trait
import (import rule), typed the §7.4 block (Supply Room, shelves, keycard,
staff gate, and both `via`-routed exit tables) at the end of
`initializeWorld`, and deleted the Chapter-4 Main Path exits assignment —
the chapter invokes the replacement rule by name for exactly this. Created
`tests/transcripts/locked-gate.transcript` verbatim from §7.6. `npx sharpee
build --test`: 44/44 pass across 5 transcripts (locked blocks, unlock → open
→ walk works, round trip back through the gate).

Notes:

- (§7.1–§7.2) The lunchbox/juice and the early `staffGate` snippets are
  illustrative fragments (no lunchbox exists in the zoo; `supplyRoom` isn't
  defined yet at that point). §7.4 supplies the real, complete block, so no
  ambiguity in practice — but a very literal reader could try to type §7.2's
  `staffGate.add(...)` when it first appears and find `keycard`/`staffGate`
  undefined. The prose does signal the final wiring comes later ("Here is
  the whole puzzle, in order").
- (§7.4) One ordering wrinkle: the chapter's replacement Main Path exits
  assignment lives *inside* the end-of-file block, meaning the file briefly
  has two `mainPath...exits =` assignments if you type first and delete
  second. Deleting the Chapter-4 assignment (replacement rule) resolves it;
  the rule's existence makes this a non-issue.

## Chapter 8 — Light & Dark: What the Player Can See

**STATUS: PASS**

Added `LightSourceTrait, SwitchableTrait` to the import (§8.7), the
flashlight block (§8.4) and the nocturnal-exhibit block (§8.7) at the end of
`initializeWorld`, and replaced Chapter 7's Supply Room exits table with the
new one adding the south passage (replacement rule, invoked by name).
Created `tests/transcripts/light-and-dark.transcript` verbatim from §8.9.
`npx sharpee build --test`: 59/59 across 6 transcripts. Darkness behaves as
described: entering unlit shows a dark message, lit flashlight reveals the
room, switching off restores darkness.

Notes:

- (§8.5 "Other light-source patterns") The gem/candle/lantern snippets are
  illustrative (no such entities exist); not typed. The prose makes this
  clear enough.

## Chapter 9 — The Map & Regions: Grouping Rooms

**STATUS: PASS**

Typed the two `world.createRegion(...)` calls at the top of
`initializeWorld` (the chapter overrides the placement rule: "Create regions
in initializeWorld(), before the rooms that belong to them") and the six
`world.assignRoom(...)` calls after all rooms exist (placed at the end,
before the player, per the default placement rule). Build clean; the full
59-test suite still passes. No Try it / Test it in this chapter, so the
green suite is the verification.

Notes:

- (§9.2) "after the rooms exist, assign each one to its region" doesn't say
  exactly where; end-of-initializeWorld satisfies it and the placement rule
  covers the default. Minor ambiguity, resolved by the front-matter rule.
- (§9.4/§9.5) The `registerEventHandler` skeleton and nesting examples are
  illustrative; not typed (the handler body is an empty comment).

## Chapter 10 — The Standard Actions: The Four-Phase Model

**STATUS: PASS**

Conceptual chapter: "You won't write an action in this chapter, because the
standard library already covers the zoo." Nothing to execute; the
`someAction` skeleton in §10.2 is a contract illustration, not code to add.

## Chapter 11 — Scope & Visibility

**STATUS: PASS**

Conceptual chapter; no code to type, no Try it / Test it. Its claims about
darkness and scope were already exercised de facto by Chapter 8's transcript.

## Chapter 12 — Readable Objects & Switchable Devices

**STATUS: PASS**

Added `ReadableTrait` to the world-model import (the chapter itself warns
not to re-import `SwitchableTrait` — the import rule again), then the info
plaque, brochure, and radio blocks at the end of `initializeWorld` (§12.0
states the placement explicitly). Created `tests/transcripts/
readables.transcript` verbatim from §12.7. `npx sharpee build --test`:
75/75 across 7 transcripts; read vs. examine distinction verified on both
plaque and brochure, radio toggles, scenery refuses taking.

No issues.

## Chapter 13 — Event Handlers: Reacting to What Happens

**STATUS: PASS**

Added `GameEngine` to the engine import, a new `@sharpee/core` import for
`ISemanticEvent`, and `IWorldModel` to the world-model import (§13.4 shows
all three; merged per the import rule). Added the two private ID-field
declarations to the class, the Gift Shop / souvenir press block plus ID
recording at the end of `initializeWorld`, deleted Chapter 4's Aviary exits
(replacement rule, invoked by name), and created `onEngineReady` containing
both `world.chainEvent` registrations (§13.5, §13.6 — the book says both
"live inside it"). Created `tests/transcripts/event-handlers.transcript`.
`npx sharpee build --test`: 86/86 across 8 transcripts. Goats react to the
dropped feed, the press destroys the penny and creates the pressed penny in
inventory.

Notes:

- (§13.8 "Test it") The transcript's `description:` header line wraps across
  two lines in the printed book ("...the press transforms the\npenny"). I
  typed it as a single header line; a reader typing a literal two-line
  description might confuse the transcript parser. Worked as one line.
- (§13.4) The `import { GameEngine } from '@sharpee/engine';` line is shown
  as a standalone import block even though the file already imports from
  `@sharpee/engine`; the front-matter import rule resolves this (merge, don't
  duplicate), but the chapter doesn't restate it here.

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs

**STATUS: PASS**

Added the chapter's import block (only the missing names, as the chapter
itself instructs): `Action, ActionContext, ValidationResult` from
`@sharpee/stdlib`, `import type { Parser } from '@sharpee/parser-en-us'`,
`import type { LanguageProvider } from '@sharpee/lang-en-us'`. Typed
`feedAction` (§14.2) and `photographAction` (§14.3) as top-level consts
before the class (the chapter says "top-level consts"; exact position isn't
specified — before the class is required since the class methods reference
them). Added the camera to the gift shop in `initializeWorld`, and the three
class methods `getCustomActions`, `extendParser`, `extendLanguage` verbatim.
Created `tests/transcripts/custom-actions.transcript`. `npx sharpee build
--test`: 97/97 across 9 transcripts — feed works, refuses a second feeding,
blocks without a camera, `{the target}` placeholder renders ("Click!" line
passes).

Notes:

- (§14.1 "The four-phase action") The skeleton `feedAction` references an
  undefined `hasRequiredItem` variable — it would not compile if typed. It's
  superseded two pages later by §14.2's complete version ("Here's the feed
  action in full"), so I treated §14.1 as illustrative and typed only §14.2.
  A literal reader could be tripped: nothing in §14.1 says "don't type this
  yet" as explicitly as earlier chapters do.
- (§14.3) Camera placement says "Add it to the gift shop... in
  initializeWorld"; `giftShop` is a local const in the Chapter-13 block, so
  the camera block must go after it. The placement rule (end of
  initializeWorld) handles this, but only implicitly.

## Chapter 15 — Capability Dispatch: One Verb, Many Rules

**STATUS: PASS**

Added the seven new world-model names to the import (the chapter's block
re-lists already-imported names; merged per the import rule). Typed
`PettableTrait`, `PetMessages`, `pettingBehavior`, `PETTING_ACTION_ID`, and
`pettingAction` as top-level code before the class; added `pettingAction` to
`getCustomActions`, the pet/stroke grammar to `extendParser`, the four
messages to `extendLanguage`; gave the goats and rabbits `PettableTrait`s,
created the parrot in the Aviary (§15.4), and put the
`registerCapabilityBehavior` call at the end of `initializeWorld` as §15.3
directs. Created `tests/transcripts/petting.transcript`. `npx sharpee build
--test`: 105/105 across 10 transcripts — per-animal outcomes all correct,
dispatch falls through to "can't pet" on the dispenser.

Notes:

- (§15.2.2/§15.3) The chapter presents `pettingBehavior` (which references
  `PetMessages`) before `PETTING_ACTION_ID`/`pettingAction`; any top-level
  ordering compiles since references are inside function bodies, but the
  book never says where the trait class and behavior live relative to the
  actions. I placed the whole §15.2/§15.3 group after `photographAction`.
  Minor placement ambiguity, resolved without incident.
- (§15.4) The goats/rabbits `add(new PettableTrait(...))` lines reference
  the `goats`/`rabbits` consts from Chapters 4–5, so they must go after
  those blocks; the placement rule (end of `initializeWorld`) covers it.

## Chapter 16 — Custom Traits & Behaviors: Data and Logic, Kept Apart

**STATUS: PASS**

Created `src/dispenser-trait.ts` and `src/dispenser-behavior.ts` verbatim
(§16.2, §16.3 — the first multi-file step; the `.js` extension on the
relative import is explained by the text). Build clean; suite still 105/105.
The chapter states explicitly there is no Try it: "the zoo doesn't wire this
pair up. The two files compile alongside your story."

Notes / ambiguity:

- (§16.2) The line `dispenser.add(new DispenserTrait({ chargesRemaining: 5
  }));` is shown after "You add it to an entity the same way you add any
  trait:" — it's genuinely ambiguous whether to type this into
  `initializeWorld`. I did NOT, because §16.4's honest note says nothing
  calls the behavior and the chapter never shows the `DispenserTrait` import
  being added to `index.ts`. A literal reader could reasonably go either
  way; the book should say "don't add this yet" or show the import.

## Chapter 17 — Extending the Grammar

**STATUS: PASS**

No new project code: the chapter generalizes the `extendParser` work already
typed in Chapters 14–15. The §17.5 (`feed :food to :animal`) and §17.6
(`.where(...)`) snippets are prefaced with "Suppose..." / "You can..." and
were treated as illustrative; nothing in the chapter says to modify the
existing grammar, and no Try it / Test it exists. Suite still green.

## Chapter 18 — The Language Layer

**STATUS: PASS**

Conceptual; re-presents `extendLanguage`/`addMessage` code already in the
project verbatim. Nothing new to type; no Try it / Test it.

## Chapter 19 — The Phrase Algebra

**STATUS: PASS**

Conceptual/reference chapter on template placeholders. All snippets
(`Optional`/`Choice` builders, `nounPhraseFor`) reference entities that
don't exist at top level (`gate`, `parrot.id` outside any method) and carry
no placement instructions — clearly illustrative. Nothing typed; no Try it /
Test it. Its claims about verb agreement were already exercised (goats "are
fixed in place" passed in Chapter 5's transcript).

## Chapter 20 — Non-Player Characters: Actors That Take Turns

**STATUS: PASS**

Applied exactly as instructed: merged the four-package import block (only
new names: `NpcTrait`, `NpcPlugin` from `@sharpee/plugin-npc`, and the four
stdlib NPC names); typed `PARROT_PHRASES`/`parrotBehavior` as top-level
consts; created the zookeeper and added the parrot's `NpcTrait` at the end
of `initializeWorld`; widened the `roomIds` field declaration exactly as
§20.4 shows (a replacement the chapter spells out); added the two
ID-recording lines to the Chapter-13 block; and added the plugin/behavior
registration at the top of the existing `onEngineReady` (the chapter
explicitly says "add the plugin code below at the top of that existing
method; don't declare a second one" — excellent placement clarity). Created
`tests/transcripts/npcs.transcript`. `npx sharpee build --test`: 112/112
across 11 transcripts — Sam's patrol announcement fires on the exact turn
the book predicts, parrot greets on arrival.

Notes:

- `@sharpee/plugin-npc` was already a dependency of the scaffolded project —
  no install step was needed, and the book never mentions one. Fine here,
  but worth confirming the scaffold always ships it.
- (§20.4) The full `onEngineReady` listing shows only the NPC code (with
  the chain handlers elided); the prose instruction is what makes the
  placement unambiguous. Followed the prose.

## Chapter 21 — Scenes: Named Windows of Story Time

**STATUS: PASS**

Typed only the final `world.createScene` form with `onBegin`/`onEnd` — §21.4
explicitly says the listing "replaces the bare version above... type in only
this final form" (good literal-reader guardrail). Placed at the end of
`initializeWorld` (§21.2: scenes are created in `initializeWorld()`). No new
imports needed, as the chapter states. Created
`tests/transcripts/scenes.transcript`. All 4 commands pass; `recurring:
true` verified by re-entry.

No issues.

## Chapter 22 — Turns, Timed Events & Daemons

**STATUS: PASS**

Added the `@sharpee/plugin-scheduler` imports (value + type; `ISemanticEvent`
and `IdentityTrait` from the shown block were already imported — import
rule), declared `TimedMessages` "near the top of your story module" (placed
just before `FEED_ACTION_ID`), typed the three factory functions
(`createPAAnnouncementDaemon`, `createGoatBleatingDaemon`,
`createFeedingTimeFuse`) as top-level functions before the class, appended
the scheduler registration to `onEngineReady`, and added the six messages to
`extendLanguage` (§22.5 explicitly says to add to the existing one). Created
`tests/transcripts/timed-events.transcript` verbatim (15 commands, including
the off-by-one fuse timing the book warns about). `npx sharpee build
--test`: 131/131 across 13 transcripts — PA fires on turn 5, FEEDING TIME on
the predicted turn, bleating counts down and stops on its own.

Notes:

- (§22.1) The `onEngineReady` sketch shows the scheduler code right after
  "the NPC plugin registration from Chapter 20 stays here", eliding the
  Chapter-13 chain handlers entirely. Where the scheduler goes relative to
  the chain handlers is unstated; I used the front-matter placement rule
  ("new registrations go at the end of onEngineReady"). Either position
  works, but a literal reader gets two conflicting hints (snippet order vs.
  placement rule).
- (§22.1) The factory functions' placement ("The daemons and fuse below")
  is never explicitly stated; top-level before the class is forced by usage.

## Chapter 23 — Scoring & Endgame: Winning the Game

**STATUS: PASS**

Applied all twelve award wirings: scoring tables (`MAX_SCORE`, `ScoreIds`,
`ScorePoints`, `ROOM_SCORE_MAP`, `ScoreMessages`) as top-level consts
("declare all the IDs and point values up front"); `world.setMaxScore(75)`
in `initializeWorld`; petting award in the capability behavior's
`execute()`; feed-goats/rabbits awards in the feeding action's `execute()`
("after its existing `const target = ...` line"); photograph award in the
photograph action's `execute()` (renamed `_context` → `context` as
instructed); pressed-penny award in the Chapter-13 chain; the three scoring
`chainEvent`s (room visits, take-map, read-brochure) in `onEngineReady`;
widened `entityIds` per the shown replacement plus the two recording lines;
`createVictoryDaemon()` top-level and registered alongside the others; and
the VICTORY message in `extendLanguage`. Created
`tests/transcripts/scoring.transcript` (28 commands). `npx sharpee build
--test`: 159/159 across 15 transcripts. Victory fires exactly on the move
the 75th point lands, as the book predicts, and `score` then reports the
perfect-score line.

Notes:

- (§23.1) The first code block mixes a real instruction
  (`world.setMaxScore(75)` — "Set the maximum in initializeWorld()") with
  illustrative `awardScore` usage (comments like "awarded === true the first
  time"). I typed only the `setMaxScore` line; the visit award shown there
  is actually implemented later via the room-visit chain, and typing it
  literally would double-register nothing (idempotent) but also not compile
  at top level. Mildly confusing block for a literal reader.
- (§23.3) The three chain handlers have no explicit placement sentence;
  the front-matter placement rule ("new registrations go at the end of
  onEngineReady") plus their use of `this.entityIds` resolves it.
- (§23.6) The transcript includes a `# Victory fires...` comment line —
  first appearance of comments in transcript syntax, never documented. The
  test runner accepted it.

## Chapters 24–27 — Volume VII: Presentation (verified with Playwright)

**Substitution note:** these chapters have no Try it / Test it blocks and
their behavior is browser-visible, so per the run instructions I verified
them with a Playwright script driving the built `dist/web/` client
(10 checks, all PASS).

### Chapter 24 — Channels

**STATUS: PASS**

Added the `@sharpee/if-domain` type import, the `AMBIENCE_BY_ROOM` const,
and the `registerChannels` hook with the `zoo.ambience` channel to the Story
class, exactly as §24.6 shows. Build clean; suite still 159/159. Playwright:
the mood line appears in the Aviary and clears (empty string) in unlisted
rooms — the sparse/replace semantics behave exactly as §24.6's "subtlety"
paragraph describes.

- Placement note: §24.6 shows `registerChannels` as a bare method; the class
  placement is implied by it being "the hook" on the story. Unambiguous in
  practice.

### Chapter 25 — The Web Client

**STATUS: PASS**

Mostly read-along: §25.1's `BrowserClient` listing is explicitly NOT to be
typed ("Your own scaffolded entry will differ... leave the scaffold's values
as they are"). Typed the `zoo.ambience` renderer registration into
`src/browser-entry.ts` after `connectEngine` and before `client.start()` —
the spot the chapter names, and the scaffold's header comment does indeed
say "Add any story-specific channel/audio renderers before client.start()"
as the book claims. Playwright: client boots, prose renders, commands flow,
the custom renderer creates and reuses its own `#zoo-ambience` element.

- Ambiguity: §25.5 presents TWO renderer examples (score "★" override and
  the zoo.ambience renderer). Chapter 24's closing paragraph says the zoo
  snapshot ships the ambience renderer, so I typed that one; the score
  override reads as a hypothetical ("To change how it looks...") and Chapter
  26 re-poses it as optional ("Want the score as a star badge instead?"), so
  I did not type it. The book never says explicitly which of the two belongs
  in the zoo.

### Chapter 26 — Decoration & Theming

**STATUS: PASS**

Added the `[data-theme="zoo-sunny"]` token block and the two flourish rules
to `browser/my-zoo.css` (the chapter correctly notes the file is named after
the package name, `my-zoo.css`, not the story's `config.id`), and the
`sharpee.themes` entry to `package.json` verbatim from §26.4.2. Rebuild
copied `modern-dark.css`/`paper.css` into `dist/web/themes/` and generated
the menu. Playwright: menu lists Zoo Sunny / Modern Dark / Paper; clicking
Zoo Sunny flips `data-theme="zoo-sunny"`; computed body background becomes
the token's warm cream `rgb(255, 250, 240)`; platform decoration CSS
(`.sharpee-em`) is shipped.

- Minor tension: the Ch25 listing showed `defaultTheme: 'zoo-sunny'` and a
  themes array naming Zoo Sunny inside `BrowserClient`, but Ch25's prose
  says to leave the scaffold's values alone (scaffold default is
  `modern-dark`). Following the prose, I left the scaffold; the theme still
  appears in the menu because the build generates it from `sharpee.themes`.
  A literal reader may wonder whether to reconcile the two.

### Chapter 27 — Media & Audio

**STATUS: PASS**

Added `AudioRegistry` (from `@sharpee/media`) and `Effect` (type, from
`@sharpee/event-processor`) imports plus `createAmbientChannel` to the
stdlib import; the top-level `audio` registry and `mediaEvent`/`emit`
helpers; the two `atmosphere(...)` declarations in `initializeWorld`; the
effect-returning `if.event.actor_moved` handler in `onEngineReady`; the
engine-side `registry.add(createAmbientChannel('environment'))` in
`registerChannels`; and the browser-side `createAmbientChannelRenderer`
registration in the browser entry. No assets shipped, as the book allows
("silent, not broken. Wire the channels first"). Build clean, 159/159.
Playwright: entering the Aviary triggers a network request for
`audio/aviary-birdsong.mp3` (404s harmlessly, exactly the degraded mode
§27.4 describes).

- Note: `@sharpee/media`, `@sharpee/plugin-npc`, `@sharpee/plugin-scheduler`,
  `@sharpee/if-domain`, `@sharpee/event-processor`, and `@sharpee/core` are
  none of them in the scaffolded `package.json` dependencies; they resolve
  as transitive dependencies in `node_modules`. Everything compiles, but the
  book never has you add them, so a stricter package manager (pnpm) or a
  future dependency shuffle could break a literal reader here.

## Chapter 28 — The Multi-File Story

**STATUS: PASS**

The book is explicit: "this is the book's one read-along chapter... you read
it there rather than typing it in" and "Your own single-file zoo keeps
working exactly as it is." Nothing typed; the single-file project is
retained for the remaining chapters as the book allows. (Per the amnesia
rule I did not browse the companion repository, so the seven-file snapshot
itself is untested by this run.)

## Chapter 29 — Transcript Testing & Walkthroughs

**STATUS: PASS**

Saved `tests/transcripts/feed-the-goats.transcript` verbatim from §29.1 and
ran the suite — all pass (now 163 tests across 15 transcripts). Also ran the
§29.5 variant `npx sharpee build --test --stop-on-failure`, which works.
Two nice accuracy points: §29.0 says the suite has "fourteen recorded
sessions" by this chapter, and my `tests/transcripts/` had exactly 14 before
this chapter's addition; and §29.1 retroactively documents the `#` comment
syntax that Chapter 23's transcript already used.

Notes:

- (§29.2 / §29.4) Walkthroughs (`walkthroughs/wt-*.transcript`), event/state
  assertions, and control-flow directives are described but never exercised
  by an instruction in this chapter ("Save it as..." applies only to the
  §29.1 unit test). §29.4 explicitly tells single-file readers to skip the
  after-hours [GOAL] bracket. So those features remain untested by a literal
  read-through — a gap a reader can't fill without inventing their own test.

## Chapter 30 — Saving & Restoring

**STATUS: PASS**

Conceptual; the `behaviorSwapped` runner-state code belongs to the
read-along ch28 snapshot, and the single-file zoo's daemons already carry
`getRunnerState`/`restoreRunnerState` from Chapters 22–23. Nothing to type.
Verified the chapter's browser claim with Playwright: took the map, walked
south, reloaded the page — autosave restored the game mid-session (location
"Main Path" and the zoo map still in inventory). PASS.

## Chapter 31 — Building & Publishing

**STATUS: PASS**

The chapter's commands are the Chapter-1 loop repeated (install, init,
build, init-browser, serve); on the existing project I re-ran `sharpee
build` and served `dist/web/` with `python3 -m http.server -d dist/web`
(HTTP 200 on the book's port 8000). `dist/web/` is fully static as claimed
(index.html, game.js, CSS, themes/). §31.5 (npm publishing) is descriptive,
no commands to run.

## Appendices A–E

Reference material (architecture map, action/trait catalogs, message-ID and
grammar references). No executable content; not exercised beyond confirming
they exist. Chapter-body cross-references to them (e.g. "the full catalog
lives in Appendix B") resolve correctly.

---

# Run Summary

**All 31 chapters executed; none BLOCKED, no DEVIATIONS required.** The
Family Zoo builds and plays at every chapter boundary; the final suite is
163 transcript assertions across 15 files, all green, plus 10 Playwright
browser checks for Volume VII and an autosave check for Chapter 30.

The book survives a literal reader remarkably well. Every "Try it"/"Test
it" behaved exactly as printed, including turn-precise timing claims (Sam's
patrol, the fuse's first-tick skip, victory firing on the 75th point). The
named front-matter conventions (import/placement/replacement rules) resolve
nearly all placement questions, and chapters usually invoke them by name at
exactly the right moments.

Issues worth an editor's attention, in rough priority order:

1. (Ch 16 §16.2) The `dispenser.add(new DispenserTrait(...))` line: genuinely
   ambiguous whether to type it; no import path into index.ts is shown.
2. (Ch 25 §25.5) Two renderer examples, but only one (zoo.ambience) is part
   of the zoo per Chapter 24's prose; the score "★" override's status is
   unstated.
3. (Ch 25/26) The Ch25 `BrowserClient` listing shows `defaultTheme:
   'zoo-sunny'` while the prose says to keep the scaffold's values
   (`modern-dark`) — two hints in tension.
4. (Ch 14 §14.1) The skeleton action references an undefined
   `hasRequiredItem`; typed literally it won't compile, and the "don't type
   this" signal is weaker than in other chapters.
5. (Vol VII generally) Several packages the code imports
   (`@sharpee/plugin-npc`, `@sharpee/plugin-scheduler`, `@sharpee/media`,
   `@sharpee/if-domain`, `@sharpee/event-processor`, `@sharpee/core`) are
   absent from the scaffold's package.json and resolve only transitively.
6. (Ch 1 §1.8) The CLI's own help omits `build --test` ("Reserved (later):
   test, play") while the book's table lists it; the flag works.
7. (Ch 22 §22.1) Scheduler registration placement: snippet order vs. the
   placement rule give different (functionally equivalent) answers.
8. (Ch 29) Walkthroughs, [EVENT]/[STATE] assertions, and control-flow
   directives are documented but never exercised by any instruction.

Headless substitutions used (logged where first applied): browser "Try it"
blocks verified via the book's own transcript-test mechanism; Chapters
24–27 and 30 verified with Playwright against the served `dist/web/`.
