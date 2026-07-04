# Execution Log — "The Sharpee Author and Developer Manual" acceptance test

Fresh run started 2026-07-03 (prior log deleted at user request; book PDF was
updated). Tester: first-time Sharpee author following the book front to back,
exactly as written, in one project.

**Source note:** The task described "the markdown in ~/repos/book", but no such
directory exists. The only copy of the book available is
`~/repos/test-book/the-sharpee-book-v2.0.0.pdf` (334 pages, v2.0.0, pandoc/
WeasyPrint). This run tests that PDF. Text was extracted with
`pdftotext -layout` for reading; code was transcribed from the extracted text,
cross-checked against rendered page images where extraction looked suspect.

**Environment note:** This box is headless (no browser). Where the book plays
in a browser, verification is done per the run rules: the chapter's "Try it"
commands are written as a transcript test and run with the testing command the
book documents (a forward reference to the testing chapter — logged once here).
Chapters 24–27 are verified with Playwright-driven Chromium instead, per the
run instructions.

---
## Chapter 1 — Installing Sharpee: The CLI and Your First Project
STATUS: PASS-WITH-ISSUES

Executed: `node --version` (v22.23.1), `npm --version` (11.18.0);
`npm install -g @sharpee/devkit`; `sharpee init my-zoo -y`; `npm install`;
`sharpee build`; `sharpee init-browser`; `sharpee build`. Project at
`~/repos/test-book/my-zoo`. Scaffolded file list matched §1.5's listing
exactly (src/index.ts, package.json, tsconfig.json, .gitignore).

- (§1.4 "Installing the CLI") Book: `npm install -g @sharpee/devkit`.
  Actual: failed with "npm error The operation was rejected by your
  operating system. / It is likely you do not have the permissions to access
  this file as the current user"; succeeded with `sudo`. Environment-
  dependent (Linux global npm installs), but the book gives no hint that
  elevation may be needed on Linux/macOS.
- (§1.5/§1.6) The CLI's own "Next steps" output says `npm run build`, while
  the book teaches `sharpee build`. Both work; a first-timer is shown two
  different commands for the same step.
- (§1.6 "Building the story") Book: build "produces two things in dist/"
  (index.js and <id>.sharpee). Actual dist/ also contains `index.d.ts`.
  Trivial mismatch.
- (§1.7 "Playing it") Book sequence is `sharpee init-browser` then
  `sharpee build`. The CLI's output after init-browser instructs
  `npm install  # Install the browser runtime deps` first. In this run
  `sharpee build` succeeded without that extra install, but book and tool
  disagree about the required steps.
- (§1.7) HEADLESS SUBSTITUTION (logged once, applies to every chapter):
  cannot serve dist/web and play in a browser on this box. Verified instead
  with a transcript test (`> look`) run via `npx sharpee build --test` — the
  command the book documents in Chapter 29. Result: 1/1 PASS.

## Chapter 2 — Your First Room: Entities, Traits, and the World
STATUS: PASS

Replaced the scaffolded `src/index.ts` with the chapter's file (§2.3 imports/
config/class shell, §2.4 createPlayer, §2.5 initializeWorld, §2.7 exports),
transcribed exactly. `sharpee build` compiled clean. "Try it" (§2.8) verified
as a transcript test (look / examine sign / examine booth / take sign →
"fixed in place" / inventory): 5/5 PASS.

- (§2.3) PDF TYPOGRAPHY HAZARD: several single-line strings in the printed
  code are soft-wrapped mid-string by the page layout with no continuation
  marker (e.g. config's `'A small family zoo: Learn Sharpee one concept at a
  / time.'`, and the entrance description's `'…and a / small '`). Typed
  literally line-for-line they are TypeScript syntax errors; the reader must
  recognize page-width wrapping and re-join the string. (Where the author
  intends multi-line strings he uses explicit `+` concatenation, which makes
  the unmarked wraps extra confusing.) Re-joined them; compiles.
- (§2.3) The import block includes `SceneryTrait`, but no Chapter 2 code
  uses it (both scenery entities rely on `EntityType.SCENERY` only).
  Compiles as an unused import. Minor.
- (§2.8 "Try it") Expected results are given as margin comments, not exact
  output; asserted against the described behavior ("fixed in place") and it
  matched.

## Chapter 3 — The Play Loop: How a Turn Works
STATUS: PASS

Prose-only chapter ("You won't write any new code here"). Nothing to build
or verify; no issues. (The §3.2.4 `context.event(...)` snippet is explicitly
labeled illustrative — "the zoo has no brass key" — and was not typed in.)

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs
STATUS: PASS

Added `Direction` to the world-model import (§4.4) and replaced
`initializeWorld` with the chapter's complete four-room version ("It
replaces the single-room one from Chapter 2"). Build clean. "Try it" (§4.7):
7/7 PASS. Chapter 2 transcript still passes.

- (§4.1/§4.2) The teaching fragments (`entranceRoom.exits = …`) use variable
  names (`entranceRoom`, `mainPathRoom`) that never appear in the real §4.4
  listing; they are illustrative only and don't stand alone. The complete
  §4.4 listing supersedes them. No action needed, but a reader who types
  §4.2 in before reaching §4.4 writes code that has no home.
- (§4.4) Same PDF soft-wrap hazard as Ch 2: long strings inside the code
  block wrap mid-string without continuation markers (e.g. "…and a small
  ticket booth sits ' +" vs "…A cheerful ' +" on the previous line —
  the wrap point and the `+` splits don't coincide). Re-joined by reading
  the `+` positions; compiles.

## Chapter 5 — Scenery & Portable Objects
STATUS: PASS

Added the souvenir penny (§5.1) and the §5.7 block (iron fence, rabbits,
zoo map, bag of animal feed) to `initializeWorld`. Build clean. "Try it"
(§5.8, 12 commands): 12/12 PASS, including "fixed in place" refusals for
fence and goats. Prior transcripts still pass.

- (§5.7 "Putting it together") PLACEMENT AMBIGUITY: the chapter never says
  where inside `initializeWorld` the new blocks go relative to Chapter 4's
  numbered steps. Resolved by appending them after Step 3's scenery, before
  Step 4 (player placement). Worked, but a first-timer gets no anchor.
- (§5.2 vs §5.7) The iron-fence snippet appears twice, identical. Read as
  the same object shown twice; added once. No cross-reference in the text
  says so.
- (§5.7 plural note) Mentions "Authors using the object() builder write
  .plural() instead" — no object() builder has been introduced anywhere by
  this point. Dangling forward reference.

## Chapter 6 — Containers & Supporters: What Holds What
STATUS: PASS-WITH-ISSUES (needed a DEVIATION to compile)

Added backpack (§6.2), feed dispenser (§6.2.1), park bench (§6.3) to
`initializeWorld`. "Try it" (§6.6, 12 commands): 12/12 PASS after the
deviation below. Prior transcripts still pass.

- (§6.3 "SupporterTrait") BOOK BUG: the chapter's code uses
  `new SupporterTrait(...)`, but no chapter ever adds `SupporterTrait` to
  the import block (Ch 2 §2.3 established the imports; Ch 4 §4.4 added only
  `Direction`; Ch 6 says nothing about imports). Exact error:
  `src/index.ts(253,23): error TS2304: Cannot find name 'SupporterTrait'.`
- DEVIATION: added `SupporterTrait` to the existing `@sharpee/world-model`
  trait import — the minimal change the compiler named. The book never
  instructs the reader to import it.
- Placement ambiguity again: the chapter doesn't say where in
  `initializeWorld` the three blocks go. Appended after Chapter 5's objects.

## Chapter 7 — Openable Things, Locked Doors & Keys
STATUS: PASS

Added the three-trait import (§7.4 shows it as its own import block; typed
verbatim as a second `@sharpee/world-model` import), Supply Room, shelves,
keycard, staff gate, and via-routed exits (§7.4). "Try it" (§7.5, 8
commands): 8/8 PASS — locked gate blocks, unlock/open/walk-through works
both ways.

- (§7.4) "Replaces" ambiguity: the code comment says the new mainPath exits
  assignment "replaces the Main Path exits from Chapter 4", but the text
  never says whether to delete the old assignment or leave it (a second
  assignment would overwrite at runtime). Deleted the old one; worked.
- (§7.1.1/§7.1.2) The lunchbox/juice snippets are illustrative (no lunchbox
  is ever added to the zoo); not typed in.

## Chapter 8 — Light & Dark: What the Player Can See
STATUS: PASS

Added the `LightSourceTrait`/`SwitchableTrait` import (§8.7), flashlight
(§8.4, placed in the Supply Room), Nocturnal Animals Exhibit with
`isDark: true`, the rewired Supply Room exits, and the three animals (§8.7).
"Try it" (§8.8, 15 commands): 15/15 PASS — dark room blocks sight,
flashlight lifts it, switching off restores dark.

- (§8.7) Same "replaces exits" pattern as Ch 7: the new `supplyRoom` exits
  assignment supersedes Ch 7's ("This adds the south passage to the Supply
  Room exits from Chapter 7") without saying delete-vs-overwrite. Deleted
  the old assignment.
- (§8.5) Always-on/consumable/adjustable snippets are illustrative (gem,
  candle, lantern don't exist in the zoo); not typed in.

## Chapter 9 — The Map & Regions: Grouping Rooms
STATUS: PASS-WITH-ISSUES (ambiguous whether the code applies to the zoo)

Added `world.createRegion('reg-public'/'reg-staff', …)` at the top of
`initializeWorld` (§9.2: "Create regions in initializeWorld(), before the
rooms") and the six `world.assignRoom(...)` calls after the rooms exist.
Compiles; all 60 accumulated transcript assertions still pass.

- (§9.2 vs §9.6) CONTRADICTORY GUIDANCE: §9.2 walks through wiring the
  zoo's own rooms into two named regions (using the project's real variable
  names), but the Key takeaway says "The zoo is small enough to skip
  regions entirely." A literal reader cannot tell whether the region code
  belongs in the project. Applied it (the code is zoo-specific and
  imperative); nothing later broke.
- (§9.4) The `world.registerEventHandler('if.event.region_entered', …)`
  snippet has an empty illustrative body ("flavor, a warning, a scoring
  hook, whatever the moment calls for"); not typed in. No "Try it" exists
  in this chapter, so regions get no player-visible verification —
  nothing in the game exercises `ambientSmell` or region events.
- (§9.5) Nesting/query snippets are illustrative (reg-underground,
  reg-mine, optional @sharpee/queries package); not typed in.

## Chapter 10 — The Standard Actions: The Four-Phase Model
STATUS: PASS

Prose-only ("You won't write an action in this chapter"). The `someAction`
shape in §10.2 is illustrative; not typed in. No issues.

## Chapter 11 — Scope & Visibility: What the Player Can Reach
STATUS: PASS

Prose-only chapter; no code, no "Try it". The behavior it describes
(darkness collapsing scope) was already observed working in Chapter 8's
test.

## Chapter 12 — Readable Objects & Switchable Devices
STATUS: PASS-WITH-ISSUES

Added `ReadableTrait` import (§12.0), info plaque (§12.2), zoo brochure
(§12.3), radio (§12.4). "Try it" (§12.6): 16/16 PASS after one deviation.

- (§12.0) BOOK BUG (compile): the chapter's import line `import
  { ReadableTrait, SwitchableTrait } from '@sharpee/world-model';` typed
  verbatim fails, because Chapter 8 already imported SwitchableTrait.
  Exact errors: `src/index.ts(16,28): error TS2300: Duplicate identifier
  'SwitchableTrait'.` / `src/index.ts(17,25): error TS2300: Duplicate
  identifier 'SwitchableTrait'.` The book never addresses how chapter
  import listings accumulate in the single story file.
- DEVIATION: imported only `ReadableTrait`.
- (§12.6 "Try it") BOOK BUG (walkthrough): the line `> open gate; south`
  (two commands, semicolon-separated) is rejected by the engine. Actual
  output: `You can't see any such thing.` — the parser treats the whole
  line as one command, the gate never opens, and every later Supply Room
  step fails the same way. No other Try-it in Chs 1–12 uses semicolons; a
  player typing this line verbatim stalls here.
- DEVIATION: split `open gate; south` into two commands; 16/16 PASS.

## Chapter 13 — Event Handlers: Reacting to What Happens
STATUS: PASS-WITH-ISSUES

Added the §13.4 imports (`GameEngine`, `ISemanticEvent`, `IWorldModel`), the
`roomIds`/`entityIds` class fields, Gift Shop + souvenir press + Aviary exit
rewiring + ID recording in `initializeWorld`, and `onEngineReady` with both
chain handlers (§13.5 goats, §13.6 penny press). Build clean. "Try it"
(§13.7): 11/11 PASS — goats devour dropped feed exactly once, press converts
penny to pressed penny; both custom events verified with [EVENT:] assertions.

- (§13.7 "Try it") RECURRENCE of the §12.6 bug: first line is `> south;
  east` (semicolon compound), known from Ch 12 to fail with "You can't see
  any such thing." Split into two commands in the transcript.
- (§13.4) Placement of the Gift Shop block inside `initializeWorld` is again
  unanchored, and the aviary exits carry the same "replaces the Aviary exits
  from Chapter 4" delete-vs-overwrite ambiguity as Chs 7/8. Deleted the Ch 4
  assignment.
- (§13.4) The import listing shows `import { GameEngine } from
  '@sharpee/engine'` while Ch 2 already imports `Story, StoryConfig` from
  the same package — distinct symbols so a separate line compiles, but the
  book keeps printing per-chapter imports with no guidance on merging.

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs
STATUS: PASS-WITH-ISSUES

Added the two action objects (feed §14.2, photograph §14.3) as top-level
consts, camera in the Gift Shop (§14.3), and the three class methods
`getCustomActions` / `extendParser` / `extendLanguage` (§14.4–14.6).
"Try it" (§14.7): 11/11 PASS — feed works once then blocks, photograph
blocks without camera, works with it.

- (§14.5 "Teaching the parser") BOOK PRODUCTION BUG: all four
  `grammar.define(...)` lines run off the right edge of the printed page,
  truncated mid-identifier (verified on a rendered image of PDF page 120:
  the feed line ends `…withPriority(150).builo̸`, the photograph line ends
  `.withPriorit̸`, the photo line `.withPriority(15̸0̸`, the snap line
  `.withPriority(150)̸`). The reader cannot see how the lines end.
- DEVIATION: completed each truncated line with
  `.withPriority(150).build();` — implied by the visible fragments and
  §17.2's complete multi-line form. Compiles and parses correctly.
- (§14.0 imports) RECURRENCE: the chapter's import block repeats symbols
  already imported (`ISemanticEvent` from Ch 13; `IdentityTrait`,
  `IFEntity`, `EntityType` from Ch 2) — verbatim paste would fail with
  duplicate-identifier errors as in Ch 12. Typed in only the new imports
  (@sharpee/stdlib trio, type-imports of Parser / LanguageProvider).
- (§14.7 "Try it") RECURRENCE: `> south; east` and `> west; west; west`
  compound lines again (engine rejects semicolons; see Ch 12). Split.
- Note: Ch 14 types `extendParser(parser: Parser)` with `Parser` from
  '@sharpee/parser-en-us', while the Ch 1 scaffold stub imported `Parser`
  from '@sharpee/sharpee'. Both compile; inconsistent guidance.

## Chapter 15 — Capability Dispatch: One Verb, Many Rules
STATUS: PASS-WITH-ISSUES

Typed in the chapter's capability imports (§15.0, the 7 genuinely new
symbols), `PettableTrait` (§15.2.1), `pettingBehavior` (§15.2.2), the
`world.registerCapabilityBehavior` call (§15.2.3, at the end of
initializeWorld), the hand-written `pettingAction` (§15.3), its three
registrations, and the animals (§15.4: PettableTrait on goats/rabbits, new
parrot in the Aviary). Compiled clean on first build — the dispatch API
(`world.registerCapabilityBehavior`, `context.world.
getBehaviorForCapability`, `findTraitWithCapability`, `createEffect`) all
exist as the chapter shows. "Try it" (§15.6): 8/8 PASS (goats lean in,
rabbits soft, dispenser refused, parrot bites).

- (§15.3) RECURRENCE of the Ch 14 production bug: the two grammar lines
  (`pet :thing`, `stroke :thing`) are truncated at the right page margin
  (extraction shows `…withPriority(150).build` and `….bu`); completed with
  `.withPriority(150).build();` as in Ch 14.
- (§15.0 imports) RECURRENCE: block repeats `IFEntity`,
  `Action/ActionContext/ValidationResult`, `ISemanticEvent` from earlier
  chapters; typed only the new symbols to avoid duplicate-identifier
  errors.
- (§15.6 "Try it") RECURRENCE: `> south; east` and `> west; west`
  compound lines; split as before.

## Chapter 16 — Custom Traits & Behaviors: Data and Logic, Kept Apart
STATUS: PASS-WITH-ISSUES

Created `src/dispenser-trait.ts` (§16.2) and the behavior file (§16.3)
verbatim. Both compile; all 106 accumulated transcript assertions still
pass.

- (§16.3) The behavior file's NAME is never given. The import line
  `from './dispenser-trait.js'` fixes the trait file's name, but the file
  holding `DispenserBehavior` is unnamed; chose `src/dispenser-behavior.ts`.
- (§16.2/§16.4) The chapter never wires the pair into the zoo: the
  `dispenser.add(new DispenserTrait({ chargesRemaining: 5 }))` line has no
  stated placement, and §16.4's caller is a comment-marked hypothetical
  ("inside a custom 'operate dispenser' action's execute phase"). No
  "Try it" exists. Result: two orphan files nothing imports, and the feed
  dispenser never actually runs dry in the game. Left unwired, as written.

## Chapter 17 — Extending the Grammar
STATUS: PASS

Teaching chapter; its concrete snippets (feed/photograph/pet patterns) were
already typed in during Chs 14–15. §17.5 (`feed :food to :animal`) and
§17.6 (`.where` slot constraint) are "suppose"-style hypotheticals never
added to the zoo. Nothing new to build; grammar already verified.

- (§17.4) The same right-margin truncation as Ch 14 appears in this
  chapter's alias lines (`.withPri` / `.withPriority` cut at the page edge
  on PDF page 139) — but here the reader has §17.2's complete multi-line
  form to infer from.

## Chapter 18 — The Language Layer
STATUS: PASS

Prose chapter; its snippets restate Ch 14's extendLanguage code. Nothing
new to type. Message-ID lookup already verified (custom messages render;
no raw IDs seen in any transcript).

## Chapter 19 — The Phrase Algebra
STATUS: PASS

Prose chapter. All snippets are illustrative: §19.3/§19.9/§19.10 reference
identifiers that don't exist in the project (`ZooMessages.ADMIRED`,
`ZooMessages.GATE_STATUS`, `visible`, a `gate` variable in scope) and no
placement is given, so none were typed in. Verb agreement was already
observed working ("The pygmy goats are fixed in place" in the Ch 5 test).

- (§19.x, observed later in Ch 20 testing but claimed here and in §5.5)
  CONTRADICTED CLAIM: the Main Path room listing prints "You can see
  direction signs, a souvenir penny, a park bench, and a staff gate here."
  — (a) scenery (signs, bench, gate) IS listed after the room description,
  contradicting §5.5 "Scenery is not listed this way; it's expected to be
  named in the room's description prose"; (b) the plural "direction signs"
  (article: 'some' per Ch 4's code) is rendered with no article at all.

## Chapter 20 — Non-Player Characters: Actors That Take Turns
STATUS: PASS-WITH-ISSUES

Added NPC imports (§20.0, new symbols only), extended `roomIds` with
mainPath/aviary (§20.4 instructs this), `NpcTrait` on the parrot (§20.1.1),
the zookeeper entity (§20.1), `parrotBehavior` + `PARROT_PHRASES` (§20.3),
and the plugin/behavior registrations in `onEngineReady` (§20.4).
Compiles; @sharpee/plugin-npc resolves. Transcript: 8 steps PASS, parrot's
on-arrival emote ("The parrot ruffles its feathers…") appears as promised.

- (§20.5 "Try it") MISLEADING EXPECTATION: the walkthrough annotates `wait`
  with "Sam patrols on toward the petting zoo", implying visible movement.
  Actual output for `wait` is exactly "Time passes..." — the patrol emits
  no text. Verified the patrol DOES happen (after two waits the zookeeper
  is no longer listed in the Main Path room contents), but a reader
  following the Try-it sees nothing and would reasonably conclude the NPC
  is broken.
- (§20.4) MERGE AMBIGUITY: the chapter prints `onEngineReady` as a complete
  method body, but Ch 13 already put the two chainEvent registrations
  there. The text never says "add to your existing onEngineReady". Merged
  (plugin/NPC code first, chain handlers after); both features work.
- (§20.0) Import listing again repeats `GameEngine` (Ch 13); typed only
  new symbols.

## Chapter 21 — Scenes: Named Windows of Story Time
STATUS: PASS-WITH-ISSUES

Added the `SceneTrait` import (§21.2 calls it "the one symbol you import")
and the petting-zoo scene with `onBegin`/`onEnd` (§21.4 version) to
`initializeWorld`. No "Try it" in this chapter; wrote a scene-edge
transcript from the §21.4 callback text: entering the Petting Zoo prints
"A waft of hay and warm fur greets you.", leaving prints "The animal
sounds fade behind you.", re-entering (recurring) fires again. 4/4 PASS.

- (§21.2 vs §21.4) The same scene id is defined twice — first without,
  then with the onBegin/onEnd callbacks. Nothing says "replace the §21.2
  version"; typed only §21.4's. A literal reader could register the same
  scene twice.
- (§21.2) The `SceneTrait` import is only used by §21.5's illustrative
  storm scene, which is never added to the zoo — the project carries an
  unused import on the book's instruction.

## Chapter 22 — Turns, Timed Events & Daemons
STATUS: PASS

Added the SchedulerPlugin imports (new symbols only), `TimedMessages`, the
two daemon factories and the fuse factory (§22.2–22.4), scheduler
registration in `onEngineReady` (§22.1), and the six messages in
`extendLanguage` (§22.5). Verified with a fixed 15-turn transcript (15/15
PASS): PA announcement at turn 5 ("closes in three hours"), second at turn
10, feeding-time fuse fires at turn 11 — one turn late, exactly as §22.4's
"skips its first tick" warning says — goats bleat for three turns while
the player is present, and the bleating stops on its own even though the
goats were fed, as §22.6's note explains.

- (§22.6 "Try it") The walkthrough is loose ("repeat ~5 times", "repeat
  until") — reproduced as a fixed sequence. It also contains the
  `> south; east` compound line again (split as before).
- (§22.1) The import listing again repeats `ISemanticEvent` and
  `IdentityTrait` (imported since Chs 13/2); added only the scheduler
  imports.

## Chapter 23 — Scoring & Endgame: Winning the Game
STATUS: PASS-WITH-ISSUES (corrected after developer-side investigation)

Added the scoring tables (§23.2), `setMaxScore(75)` + zooMap/brochure ID
recording in `initializeWorld`, the three chainEvent scoring handlers and
victory-daemon registration in `onEngineReady` (§23.3/§23.4), awards inside
the petting behavior / feeding execute / photograph execute / penny-press
chain (§23.3), and the VICTORY message (§23.4). Build clean. Wrote the full
12-achievement walkthrough as a transcript: all 75 points are awardable —
final `score` prints "You have achieved a perfect score of 75 points!"

- (§23.4/§23.5) CORRECTION (found during developer-side follow-up): the
  victory daemon DOES fire and the game IS winnable — the victory text
  ("*** You have won ***") prints on the turn the 75th point is awarded
  (the final `south` into the Nocturnal Exhibit), exactly as §23.4's
  "scoring settles before the scheduler tick" note describes. The original
  BLOCKED finding was a tester error: the acceptance transcript asserted
  the victory on a later `wait` turn, induced by §23.5's Try-it placing
  "victory!" as the annotation of the `> score` line. REMAINING BOOK
  ISSUE: §23.5's Try-it is misleading about where victory appears — typing
  `score` at 75/75 prints only "You have achieved a perfect score of 75
  points!" (no "75 out of 75", no victory text); the win message appears
  one line earlier in the session, attached to the achieving turn. The
  tutorial's own v16 transcript has the same blind spot: it comments
  "check for win message" but then only asserts `score` contains "perfect
  score", so the victory line was never actually pinned by a test.
- (§23.3) READER-SUPPLIED CODE: four awards are given as fragments to
  "wire them up the same way": the feeding award's goats-vs-rabbits keying
  (`if (name.includes('goats'))…`) is never printed and had to be written
  by the reader following the report() pattern; likewise exact placement
  for the photograph and penny-press awards.
- (§23.5 "Try it") `score` output at maximum changes shape entirely to
  "You have achieved a perfect score of 75 points!" — there is no
  "75 out of 75" text to match the book's annotation. (At 0 the format
  "You have scored 0 out of 75…" does match "0 out of 75".)
- (§23.5) RECURRENCE: `> south; east` compound line again.
- Note: my first assembly attempt put the scoring chains before
  `const world = engine.getWorld()` in onEngineReady (TS2448); tester
  error, not a book bug — the book never anchors where in onEngineReady
  these go, so order is reader-chosen.

## Chapter 24 — Channels: The Universal UI Surface
STATUS: PASS-WITH-ISSUES (needed a DEVIATION to compile)

Added `AMBIENCE_BY_ROOM` and the `registerChannels` hook with the
`zoo.ambience` channel (§24.6), verbatim.

- (§24.6) BOOK BUG (compile): the hook's parameter type `IChannelRegistry`
  is never imported anywhere in the chapter and no package is named for
  it. Exact error: `src/index.ts(1106,30): error TS2304: Cannot find name
  'IChannelRegistry'.` Also `src/index.ts(1112,17): error TS7006:
  Parameter 'ctx' implicitly has an 'any' type.` — the book's own §17.6
  note says the scaffolded strict tsconfig flags untyped callbacks, yet
  §24.6 prints `produce: (ctx) =>` untyped.
- DEVIATION: added a local `type IChannelRegistry = any;` alias and
  annotated `(ctx: any)`. Compiles; channel behavior verified in the
  browser in Ch 25.
- (§24.6) The text mentions a "ch24-27-presentation/ snapshot" in the
  Family Zoo companion code; nothing in this or prior chapters told the
  reader such snapshots exist or where they live.

## Chapter 25 — The Web Client: A Framework-Free UI
STATUS: PASS

Added the §25.5 `zoo.ambience` renderer to `src/browser-entry.ts` after
`connectEngine` (the generated entry's own comment says story renderers go
"before `client.start()`"). §25.1's BrowserClient snippet was not typed in
— the chapter says the entry point is generated, and it was. Verified with
Playwright (real Chromium against dist/web served statically): page titled
"Family Zoo"; opening prose shows Zoo Entrance; typing `south` into
#command-input advances the game (status line "MAIN PATH"); the custom
channel renders "The air is alive with birdsong…" into #zoo-ambience in
the Aviary and clears to '' on leaving — §24.6's sparse-''-vs-undefined
behavior works as documented. Status line shows "Score: 5 | Turns: 4".
No console errors.

- (§25.5) Mild ambiguity: two renderer snippets are shown (score override,
  zoo.ambience); only the ambience one is tied to the zoo ("the
  zoo.ambience channel from the last chapter"). Read the score override as
  illustrative and did not add it.
- (§25.1) The §25.1 sample shows `defaultTheme: 'zoo-sunny'` and a themes
  array including Zoo Sunny — but the generated browser-entry.ts has
  `defaultTheme: 'modern-dark'` and only Modern Dark/Paper. The sample is
  presented as "a story's browser entry point"; a reader can't tell if
  they're expected to edit theirs to match (Ch 26 later adds the theme via
  package.json instead, and §25.1's own comment says the array is
  build-time metadata).

## Chapter 26 — Decoration & Theming
STATUS: PASS

Added `sharpee.themes` (modern-dark, paper, inline zoo-sunny) to
package.json (§26.4.2) and the `[data-theme="zoo-sunny"]` token block plus
the two flourish rules to `browser/my-zoo.css`. Build reported "Wired 3
theme(s): modern-dark, paper, zoo-sunny" and copied built-in theme CSS to
dist/web/themes/. Playwright: "Zoo Sunny" appears under Settings; selecting
it flips `data-theme="zoo-sunny"` and the body repaints to the token's warm
cream (rgb(255, 250, 240) = #fffaf0). Status line renders the
location/score/turn channels ("Score: 0 | Turns: 1").

- (§26.4.2) NAMING MISMATCH: the book says the author override stylesheet
  is `browser/<story-id>.css` and shows `browser/familyzoo.css`
  (config.id IS 'familyzoo'), but the scaffold created `browser/my-zoo.css`
  — named after the npm package, not the story id. Followed the scaffold's
  actual file; the build copied it and the theme worked. A reader creating
  the book's `familyzoo.css` would have two stylesheets and might edit the
  unlinked one.
- Note: `src/browser-entry.ts` still carries the generated hardcoded
  `themes: [modern-dark, paper]` / `defaultTheme: 'modern-dark'`, yet the
  menu shows Zoo Sunny (built from package.json). §25.1's claim that the
  array is generator-filled metadata holds, but the stale array in source
  is confusing.

## Chapter 27 — Media & Audio: Sight and Sound as Channels
STATUS: BLOCKED (zoo wiring cannot be completed from the text)

Typed in everything concretely printed: the `mediaEvent`/`emit` helpers
with the `Effect` import from @sharpee/event-processor, the AudioRegistry
atmosphere declarations, the engine-side
`registry.add(createAmbientChannel('environment'))` in registerChannels,
and the browser-side `createAmbientChannelRenderer` registration (§27.6 —
this revision does print both channel registrations with their imports).
All compile; all 162 transcript assertions still pass.

- (§27.6) BOOK GAPS, three in one section: (a) no import is ever printed
  for `AudioRegistry` — the package name (@sharpee/media) appears only in
  §27.3's prose note; wrote `import { AudioRegistry } from
  '@sharpee/media'` myself (it isn't in the scaffold's package.json
  dependencies, but resolves transitively — a reader can't know either
  fact); (b) the atmosphere snippet uses `aviaryId` / `nocturnalId`,
  variables never defined anywhere in the book (mapped to this project's
  `aviary.id` / `nocturnalExhibit.id`); (c) the room-entry handler that
  actually connects the registry to `media.ambient.play` events is
  "registered on the event processor" and shown only as fragments
  (undefined `effects`, `toRoom`) — no mechanism taught anywhere in
  Chs 1–27 accepts an Effect[]-returning handler (chainEvent returns
  events; registerEventHandler returns void). The media feature therefore
  cannot be wired as written; the helpers and atmosphere data sit
  compiled but dead.
- Playwright confirms the consequence: entering the Aviary (which has a
  declared atmosphere) fires no media/audio requests and no console
  errors — §27.4's "silent, not broken" claim holds, but only vacuously,
  because the events are never emitted at all.
- (§27.4) No assets/ directory was created: the book supplies no files
  and says sourcing them is the reader's job.
- No "Try it" exists anywhere in Chs 24–27; browser verification for this
  volume was done with Playwright-driven Chromium per the run
  instructions.

## Chapter 28 — The Multi-File Story: Putting It All Together
STATUS: BLOCKED (not executable from the book)

The chapter describes the seven-file split and the after-hours second act
but explicitly does not print the code: "All seven live in the companion
repository at tutorials/familyzoo/v2.0.0/src/ch28-multi-file/; this
chapter walks their structure rather than reprinting every line, so open
them on GitHub alongside as we go" (§28.2). Under this test's book-only
rule (and for any offline reader) the refactor cannot be performed: §28.3
prints only a fragmentary interface (`createZooMap` whose body is
comments), and the after-hours feature (§28.5) names code that never
appears in the book (`createAfterHoursDaemons`,
`parrotAfterHoursBehavior`, the behavior-swap daemon, the 25-point bonus
tier).
- CONSEQUENCE: the project remains single-file (src/index.ts, ~1,570 lines
  by now, plus the two Ch 16 orphan files). The after-hours act does not
  exist in this build, so Ch 29's [GOAL] suggestion and Ch 30's worked
  example (both keyed to after-hours) aren't reproducible for a book-only
  reader.

## Chapter 29 — Transcript Testing & Walkthroughs
STATUS: PASS-WITH-ISSUES

The testing tool has been exercised throughout this run (per the headless
rule); this chapter's specific features were now tested directly.
`npx sharpee build --test` and `--stop-on-failure` (§29.5) both work. Unit
transcripts in tests/transcripts/ and walkthroughs in walkthroughs/ are
discovered exactly as described. Walkthrough chaining works: wt-01 ends
with `$save wt-checkpoint-1`, wt-02 opens with `$restore wt-checkpoint-1`
and resumes in the Supply Room (10/10 PASS across the pair).
`[EVENT: true, type="..."]` assertions work for stdlib and custom events.

- (§29.1) BOOK EXAMPLE FAILS AS PRINTED: the sample "Feed the goats"
  transcript, run against the very game this book builds, fails at its
  first command. `> take feed` at game start → "You can't see any such
  thing." (the feed is in the Petting Zoo, not at the entrance), and
  `> south` goes to the Main Path, not the Petting Zoo (its assertion
  passed only because the Main Path prose happens to contain "petting
  zoo"), so `> feed goats` also fails. Front matter claims all examples
  are "real, compiled, and transcript-tested"; this one cannot have been
  run against the finished game.
- (§29.3) STATE ASSERTION SYNTAX WRONG AS PRINTED: `[STATE: true,
  player.inventory contains feed]` fails twice over — first `State
  assertion failed: … Entity "player" not found` (the tester resolves the
  entity by NAME; the book's own player is named 'yourself'), then, with
  the right entity, `yourself.inventory does not contain "feed"` (the item
  must be named by its full name). Working form: `[STATE: true,
  yourself.inventory contains bag of animal feed]`. Neither requirement is
  documented anywhere.
- (§29.2) The `entry: ch23-scoring` header option is described as how "the
  tutorial's own transcripts pin their chapter snapshot" — chapter
  snapshots are a companion-repo concept a book-only reader doesn't have.
- (§29.4) [GOAL]/[IF]/[WHILE]/[NAVIGATE TO] not exercised: the suggested
  use case is the after-hours act, which Ch 28 made unbuildable.

## Chapter 30 — Saving & Restoring: State Lives in the World
STATUS: PASS-WITH-ISSUES

Mostly prose. The getRunnerState/restoreRunnerState pattern was already
typed in via the Ch 22/23 daemons. Browser persistence (§30.3) verified
with Playwright: played two turns (take map, south), opened the page fresh
in the same browser context — the autosave restored the game mid-session
with no dialog (status line back at "MAIN PATH", inventory still holds the
zoo map). PASS.

- (§30.2) The chapter's worked example (the after-hours behavior-swap
  daemon with the `behaviorSwapped` closure flag) belongs to the
  ch28-multi-file snapshot, which a book-only reader cannot build (see
  Ch 28). The pattern itself was verifiable only through the Ch 22/23
  daemons.

## Chapter 31 — Building & Publishing
STATUS: PASS

All commands in §31.1–31.3 had already been run over the course of this
test and were re-confirmed: `sharpee build` emits dist/index.js and the
.sharpee bundle; `sharpee init-browser` + `sharpee build` emit dist/web/;
`python3 -m http.server -d dist/web` serves a fully playable static game
(index.html and game.js both 200; played end-to-end with Playwright in
Chs 25–26/30). dist/web is self-contained static files as claimed.

- (§31.1) Same trivial mismatch as Ch 1: "produces two things in dist/" —
  dist/ actually contains eleven files (d.ts declarations, version.js,
  browser-entry.js, the Ch 16 dispenser pair, web/) besides index.js and
  the .sharpee bundle.
- (§31.4/§31.5) Versioning prose and npm publishing not testable
  headlessly/anonymously; nothing instructs the reader to run anything.

---
# Run Summary

31 chapters executed front-to-back in one project
(`~/repos/test-book/my-zoo`), single-file as the book teaches through
Ch 27. Final state: 172 transcript assertions across 15 unit transcripts
plus a 2-part chained walkthrough, all green; browser client verified with
Playwright-driven Chromium (play, custom channel, theming, autosave).
Appendices A–E are reference-only; nothing to execute.

**Chapter statuses**
- PASS: 2, 3, 4, 7, 8, 10, 11, 17, 18, 19, 22, 25, 26, 31
- PASS-WITH-ISSUES: 1, 5, 6, 9, 12, 13, 14, 15, 16, 20, 21, 23*, 24, 29,
  30 (*Ch 23 originally logged BLOCKED; corrected — see its entry)
- BLOCKED: 27 (media wiring not teachable from the text), 28 (code lives
  only in the companion repo)

**The defects that matter most**
1. Ch 23 §23.5 (CORRECTED): the game IS winnable — victory prints on the
   turn the 75th point is awarded. But the Try-it annotates `> score`
   with "75 out of 75, victory!", which matches neither the score
   command's actual output ("You have achieved a perfect score of 75
   points!") nor where the victory text actually appears; both this
   run and the tutorial's own v16 transcript initially missed the win
   message because of it.
2. Ch 28: the multi-file refactor and the entire after-hours second act
   exist only in the companion GitHub repo; a book-only reader cannot
   build them, and Chs 29–30 then lean on that unbuildable version.
3. Ch 29 §29.1/§29.3: the flagship testing example fails as printed
   against the book's own game, and the [STATE:] assertion syntax is
   wrong as printed (entity must be 'yourself', item must be full name).
4. Chs 14/15/17 (production): grammar code lines run off the right page
   edge, truncated mid-identifier (verified on rendered page images);
   the reader must guess the line endings.
5. Chs 12/13/14/15/22/23 "Try it" blocks: semicolon-compound commands
   (`> open gate; south`, `> south; east`) are rejected by the engine
   ("You can't see any such thing.") — every walkthrough containing one
   stalls at that line.
6. Compile-stoppers a literal reader hits: Ch 6 uses SupporterTrait
   without ever importing it (TS2304); Ch 12's import line re-imports
   SwitchableTrait (TS2300 duplicate identifier); Ch 24 uses
   IChannelRegistry with no import or package named (TS2304) plus an
   untyped callback the strict tsconfig rejects (TS7006).

**Recurring frictions** — new code blocks never anchored to a location
inside `initializeWorld`/`onEngineReady`; per-chapter import listings that
re-import earlier symbols (verbatim paste = duplicate-identifier errors);
"replaces the exits from Chapter N" without saying delete-vs-overwrite;
§20.5 implying visible NPC patrol movement when the patrol is silent;
§5.5's "scenery is not listed" contradicted by actual room listings (and
"direction signs" listed with no article); §9.2 wires regions into the zoo
while §9.6 says to skip them; Ch 16 builds a trait/behavior pair that is
never wired into the game and has no Try-it.

**What genuinely works well** — every Try-it that avoids the semicolon
lines passes; the capability-dispatch chapter (broken in an earlier
edition) now compiles and runs exactly as printed; scene callbacks,
scheduler daemons/fuses (including the documented first-tick skip), NPC
patrol/emote, the channel/renderer/theming pipeline, walkthrough
checkpointing, and browser autosave all behave as the text describes.

