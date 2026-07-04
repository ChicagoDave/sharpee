# Execution Log — "The Sharpee Author and Developer Manual" acceptance test

Run started 2026-07-03. Tester: first-time Sharpee author following the book
front to back, exactly as written, in one project.

**Source note:** The task described "the markdown in ~/repos/book", but no such
directory exists. The only copy of the book available is
`~/repos/test-book/the-sharpee-book-v2.0.0.pdf` (318 pages, v2.0.0). This run
tests the PDF. Text was extracted with `pdftotext` for reading; code was
transcribed from the extracted text.

**Environment note:** This box is headless (no browser). Per the run rules,
wherever the book says to play in a browser, verification is done by writing
the chapter's "Try it" commands as a transcript test and running it with the
book's testing command instead. This is a forward reference to Chapter 29
(the only place the book teaches testing); noted once here.

---
## Chapter 1 — Installing Sharpee: The CLI and Your First Project
STATUS: PASS-WITH-ISSUES

Executed: `node --version` (v22.23.1) / `npm --version` (11.18.0);
`npm install -g @sharpee/devkit`; `sharpee init my-zoo -y`; `npm install`;
`sharpee build`; `sharpee init-browser`; `sharpee build`. All succeeded.
Verified headlessly with a `> look` transcript test run via
`npx sharpee build --test` (command from Ch 29): PASS.

- (§1.4 "Installing the CLI") Book: `npm install -g @sharpee/devkit`. Actual:
  failed with "npm error The operation was rejected by your operating system…
  permissions"; succeeded with `sudo`. Environment-dependent (Linux global
  installs), not strictly a book error, but the book gives no hint about
  permissions on Linux/macOS.
- (§1.5 "Creating a story project") Book's post-init file listing shows
  `src/index.ts`, `package.json`, `tsconfig.json`. Actual scaffold also
  created `.gitignore` (CLI output: "✓ Created .gitignore"). Trivial mismatch.
- (§1.5/§1.6) The CLI's "Next steps" text says `npm run build`, while the book
  teaches `sharpee build`. Both work; a first-timer sees two different
  instructions.
- (§1.6 "Building the story") Book: build "produces two things in dist/":
  `dist/index.js` and `dist/<id>.sharpee`. Actual dist/ also contains
  `index.d.ts`. Trivial mismatch.
- (§1.7 "Playing it") Book sequence is `sharpee init-browser` then
  `sharpee build`. The CLI's own output after init-browser says to run
  `npm install` first ("✓ Updated package.json (deps + build:browser)" …
  "npm install  # Install the browser runtime deps"). In this run
  `sharpee build` succeeded without the extra npm install, but the book and
  the tool disagree about the required steps.
- (§1.7) Headless verification deviation (see header note): couldn't serve
  and play in a browser; verified via transcript test instead.

## Chapter 2 — Your First Room: Entities, Traits, and the World
STATUS: PASS

Replaced the scaffolded `src/index.ts` with the chapter's Family Zoo v01 file
(imports, config, `FamilyZooStory` class with `createPlayer` /
`initializeWorld`, exports), transcribed exactly. `sharpee build` compiled
clean. "Try it" (§2.8) verified as a transcript test (`look`, `examine sign`,
`examine booth`, `take sign` → "fixed in place", `inventory`): 5/5 PASS.

- (§2.3 "The shape of the file") The import block includes `SceneryTrait`,
  but no Chapter 2 code ever uses it (both scenery entities rely only on
  `EntityType.SCENERY`). Compiles fine; just an unused import until Ch 5.
  Minor ambiguity, no action needed.
- (§2.8 "Try it") The book gives expected behaviors as margin comments, not
  exact output. Assertions were written against the described behavior
  ("fixed in place" for `take sign`), and matched actual output.

## Chapter 3 — The Play Loop: How a Turn Works
STATUS: PASS

Prose-only chapter ("You won't write any new code here"). The one snippet
(§3.2.4 `context.event(...)`) is explicitly labeled illustrative and was not
added to the project. Nothing to build or verify; no issues.

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs
STATUS: PASS

Added `Direction` to the world-model import (§4.4) and replaced
`initializeWorld` with the chapter's complete four-room version. Build clean.
"Try it" (§4.7) as transcript test (south / examine signs / east / west /
west / east / north): 7/7 PASS; Ch 2 transcript still passes.

- (§4.2 vs §4.4) The teaching snippet in §4.2 writes `entranceRoom.exits =`
  against a variable obtained earlier, and references `destination:
  entrance.id` — fragments that don't stand alone. The complete §4.4 listing
  supersedes them; used it verbatim as instructed by "It replaces the
  single-room one from Chapter 2." No problem, just noting the fragments are
  not independently runnable.

## Chapter 5 — Scenery & Portable Objects
STATUS: PASS

Added the souvenir penny (§5.1), iron fence (§5.2/§5.7), rabbits, zoo map,
and bag of animal feed (§5.7) to `initializeWorld`. Build clean. "Try it"
(§5.8, 12 commands) as transcript test: 12/12 PASS, including "fixed in
place" refusals for fence and goats. Prior chapters' transcripts still pass.

- (§5.7 "Putting it together") Placement ambiguity: the chapter never says
  where inside `initializeWorld` the new blocks go relative to Ch 4's
  numbered steps. Resolved by appending them after the Ch 4 scenery (end of
  "Step 3"), before player placement. Worked, but a first-timer gets no
  explicit anchor.
- (§5.2 vs §5.7) The iron-fence snippet appears twice (identical). Read as
  the same object shown twice, added once. Fine, but worth a cross-reference
  in the text.
- (§5.7 note) Mentions "Authors using the object() builder write .plural()
  instead" — the object() builder has not been introduced anywhere yet, and
  never is in Chs 1-5. Dangling forward reference.

## Chapter 6 — Containers & Supporters: What Holds What
STATUS: PASS-WITH-ISSUES (needed a DEVIATION to compile)

Added backpack (§6.2), feed dispenser (§6.2.1), park bench (§6.3) to
`initializeWorld`. "Try it" (§6.6, 12 commands) as transcript test: 12/12
PASS after the deviation below. Prior transcripts still pass.

- (§6.3 "SupporterTrait") BOOK BUG: the chapter's code uses
  `new SupporterTrait(...)`, but no chapter ever adds `SupporterTrait` to the
  import block (Ch 2 §2.3 established the imports; Ch 4 §4.4 added only
  `Direction`; Ch 6 says nothing about imports). Exact error:
  `src/index.ts(249,23): error TS2304: Cannot find name 'SupporterTrait'.`
- DEVIATION: added `SupporterTrait` to the existing `@sharpee/world-model`
  trait import — the minimal change the compiler named. The book forced this;
  it never instructs the reader to import the trait.
- (§6.6 "Try it") `put map in backpack` / `put penny on bench`: book §6.1
  shows expected outputs "You put zoo map in backpack." / "You put souvenir
  penny on park bench." — actual output matched the pattern (asserted
  loosely; PASS).
- Placement ambiguity again: chapter doesn't say where in `initializeWorld`
  the three new blocks go. Appended after Ch 5's objects; worked.

## Chapter 7 — Openable Things, Locked Doors & Keys
STATUS: PASS

Added the three-trait import block (§7.4), the Supply Room, shelves, keycard,
staff gate, and via-routed exits (§7.4). Removed Ch 4's `mainPath` exits
assignment because §7.4's code comment says "This replaces the Main Path
exits from Chapter 4". Build clean. "Try it" (§7.5, 8 commands): 8/8 PASS —
locked gate blocks, unlock/open/walk-through works both ways.

- (§7.4) "Replaces" ambiguity: the book says the new `mainPath...exits`
  assignment replaces Chapter 4's, but doesn't say whether to delete the old
  assignment or leave it (a second assignment would merely overwrite it at
  runtime). Deleted the old one; worked. Harmless either way, but the text
  could say which.
- (§7.1.1/§7.1.2) The lunchbox/juice snippets are illustrative (no lunchbox
  is ever added to the zoo); not typed in. The chapter only builds the gate
  puzzle. Fine, but §7.1's example object never exists in the game.
- (§7.4) Import style ambiguity: §7.4 shows a standalone import block for
  the three new traits rather than extending the existing one. Added it
  verbatim as a third import statement from '@sharpee/world-model'; compiles.

## Chapter 8 — Light & Dark: What the Player Can See
STATUS: PASS

Added the `LightSourceTrait`/`SwitchableTrait` import (§8.7), flashlight
(§8.4), Nocturnal Animals Exhibit with `isDark: true`, rewired Supply Room
exits, and the three animals (§8.7). "Try it" (§8.8, 15 commands): 15/15
PASS — dark room blocks sight, flashlight lifts it, switch-off restores dark.

- (§8.7) Same "replaces exits" pattern as Ch 7: the new `supplyRoom` exits
  assignment supersedes Ch 7's. Removed the old assignment; the text says
  "adds the south passage" without saying to delete the previous wiring.
  (Kept the pattern: full-replacement assignment as printed.)
- (§8.5) Always-on/consumable/adjustable snippets are illustrative (gem,
  candle, lantern don't exist in the zoo); not typed in.

## Chapter 9 — The Map & Regions: Grouping Rooms
STATUS: PASS-WITH-ISSUES (ambiguous whether to apply)

Added `world.createRegion('reg-public'/'reg-staff', …)` at the top of
`initializeWorld` (§9.2 "Create regions in initializeWorld(), before the
rooms") and the six `world.assignRoom(...)` calls after the rooms exist.
Compiles and runs; all 59 accumulated transcript assertions still pass.

- (§9.2 vs §9.6) CONTRADICTORY GUIDANCE: §9.2 walks through wiring the zoo's
  own rooms into two named regions (using the project's real variable names),
  but the Key takeaway says "The zoo is small enough to skip regions
  entirely." A reader cannot tell if the region code belongs in the project.
  Applied it (the code is zoo-specific and imperative); nothing later broke.
- (§9.4) `world.registerEventHandler('if.event.region_entered', …)` snippet
  has an empty illustrative body; not typed in. No "Try it" section exists in
  this chapter, so regions have no player-visible verification — nothing in
  the game exercises `ambientSmell` or region events at this point.
- (§9.5) Nesting/query snippets are illustrative (reg-underground, reg-mine,
  optional @sharpee/queries package); not typed in.

## Chapter 10 — The Standard Actions: The Four-Phase Model
STATUS: PASS

Prose-only ("You won't write an action in this chapter"). The `someAction`
shape in §10.2 is illustrative; not typed in. No issues.

## Chapter 11 — Scope & Visibility: What the Player Can Reach
STATUS: PASS

Prose-only chapter; no code to type, no "Try it". Behavior it describes
(darkness collapsing scope) was already observed working in Ch 8's test.

## Chapter 12 — Readable Objects & Switchable Devices
STATUS: PASS-WITH-ISSUES

Added `ReadableTrait` import, info plaque (§12.2), zoo brochure (§12.3),
radio (§12.4). Build clean. "Try it" (§12.6): after one deviation, 16/16 PASS
— read vs examine distinction works, radio toggles, scenery refusals work.

- (§12.6 "Try it") BOOK BUG: the walkthrough line `> open gate; south` (two
  commands on one line, semicolon-separated) is not accepted by the engine.
  Actual output: `You can't see any such thing.` — the parser treats the
  whole line as one command, the gate never opens, and every subsequent
  Supply Room step fails ("You can't see any such thing." for radio
  commands). No other Try-it list in Chs 1-12 uses a semicolon; as printed,
  a player typing this line verbatim stalls.
- DEVIATION: split `open gate; south` into `open gate` then `south` in the
  transcript; everything then passed (16/16).
- (§12.0) Import shown as one combined line `import { ReadableTrait,
  SwitchableTrait }` though SwitchableTrait was already imported in Ch 8;
  adding it verbatim would duplicate the identifier. Added only
  `ReadableTrait` (TypeScript would reject a duplicate import of
  SwitchableTrait in a second block). Minor ambiguity for a reader who
  pastes the line as-is: `error TS2300: Duplicate identifier` would result.

## Chapter 13 — Event Handlers: Reacting to What Happens
STATUS: PASS-WITH-ISSUES

Added imports (§13.4: `GameEngine`, `ISemanticEvent`, `IWorldModel`), the
`roomIds`/`entityIds` class fields, Gift Shop + souvenir press + aviary exit
rewiring + ID recording in `initializeWorld`, and `onEngineReady` with both
chain handlers (§13.5 goats, §13.6 penny press). Build clean. "Try it"
(§13.7): 11/11 PASS — goats devour dropped feed exactly once, press converts
penny to pressed penny in inventory.

- (§13.7 "Try it") RECURRENCE of the §12.6 bug: first line is `> south; east`
  (semicolon compound). Known from Ch 12 to fail with "You can't see any such
  thing."; split into two commands in the transcript. The book keeps using a
  syntax its engine rejects.
- (§13.4) The import snippet shows `import { GameEngine } from
  '@sharpee/engine'` as part of a combined listing with the class fields;
  the book already imports `Story, StoryConfig` from '@sharpee/engine' in
  Ch 2 — same could-be-duplicate concern as Ch 12; added as separate import
  lines of distinct symbols, compiles fine.
- (§13.4) Placement of "add the Gift Shop west of the Aviary" inside
  initializeWorld is again unanchored; same "replaces the Aviary exits from
  Chapter 4" replace-vs-overwrite ambiguity as Ch 7/8. Deleted the Ch 4
  assignment.
- (§13.5/§13.6) Handler snippets reference `this.entityIds` values captured
  into local consts inside `onEngineReady` — the book shows these as bare
  code blocks ("the two reaction sections that follow both live inside it");
  order of assembly is left to the reader but works as described.

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs
STATUS: PASS-WITH-ISSUES

Added the two action objects (feed §14.2, photograph §14.3) as top-level
consts, camera in the Gift Shop, and the three class methods
`getCustomActions` / `extendParser` / `extendLanguage` (§14.4–14.6). Build
clean. "Try it" (§14.7): 11/11 PASS — feed works once then blocks, photograph
blocks without camera, works with it.

- (§14.5 "Teaching the parser: extendParser") BOOK PRODUCTION BUG: all four
  `grammar.define(...)` lines run off the right edge of the printed page and
  are visibly truncated in the PDF (verified by rendering the page as an
  image). E.g. the photograph line ends mid-identifier at `.withPriorit`.
  The reader cannot see how the lines end.
- DEVIATION: completed each truncated line with `.withPriority(150).build();`
  — the first line's visible `.build` plus the surrounding prose implies
  this. Compiles and parses correctly.
- (§14.0 imports) The chapter's import listing repeats symbols already
  imported in earlier chapters (`ISemanticEvent`, `IdentityTrait`,
  `IFEntity`, `EntityType`). Typed in only the genuinely new imports
  (`Action`/`ActionContext`/`ValidationResult` from @sharpee/stdlib, type
  imports of `Parser` from @sharpee/parser-en-us and `LanguageProvider` from
  @sharpee/lang-en-us) to avoid duplicate-identifier compile errors. The book
  never addresses how chapter imports accumulate in one file.
- (§14.7 "Try it") RECURRENCE: `> south; east` and `> west; west; west`
  compound lines again (engine rejects semicolon compounds; see Ch 12).
  Split into single commands in the transcript.
- Note: Ch 14's `extendParser(parser: Parser)` type comes from
  '@sharpee/parser-en-us' while the Ch 1 scaffold stub imported `Parser` from
  '@sharpee/sharpee'. Both compile; inconsistent guidance across chapters.

## Chapter 15 — Capability Dispatch: One Verb, Many Rules
STATUS: BLOCKED (as written) — unblocked by DEVIATION; Try-it then passes

Typed in the chapter exactly: capability imports (§15.0), `PettableTrait`
(§15.2.1), `pettingBehavior` (§15.2.2), registration guard (§15.2.3),
hand-written `pettingAction` (§15.3), the three registrations, and the
animals/parrot (§15.4).

- (§15.0 imports) BOOK BUG — the chapter's import block does not compile.
  Three symbols are not exported by @sharpee/world-model:
  `src/index.ts(28,3): error TS2724: '"@sharpee/world-model"' has no exported
  member named 'registerCapabilityBehavior'. Did you mean
  'CapabilityBehavior'?` — same TS2724 for `hasCapabilityBehavior`, and
  `error TS2305: ... has no exported member 'getBehaviorForCapability'`.
  The other seven imports (ITrait, CapabilityBehavior,
  CapabilityValidationResult, CapabilitySharedData, CapabilityEffect,
  createEffect, findTraitWithCapability) resolve fine.
- DEVIATION: removed the three broken imports and defined local stand-in
  functions implementing exactly the registry semantics §15.2.2's note
  describes ("one behavior per trait type + capability"). This is a stub to
  keep compiling, not the platform API.
- ENGINE EVIDENCE that the real API exists elsewhere: at test start the
  engine prints `Universal dispatch: trait "zoo.trait.pettable" claims
  "zoo.action.petting" but no behavior registered. Falling back to stdlib
  action.` — i.e., the platform has its own dispatch registry that the
  book's imports were meant to feed; with the local stub it never gets fed,
  and the game only works because the hand-written pettingAction consults
  the stub. A reader following the book cannot reach the real registration
  API from anything the book teaches.
- (§15.3) The two grammar lines (`pet :thing`, `stroke :thing`) are again
  truncated at the right page margin in the PDF (`.build` / `.bu`);
  completed with `.withPriority(150).build();` as in Ch 14.
- (§15.6 "Try it") RECURRENCE: `> south; east` and `> west; west` compound
  lines; split as before. After the deviation: 8/8 PASS (goats lean in,
  rabbits soft, dispenser refused, parrot bites).

## Chapter 16 — Custom Traits & Behaviors: Data and Logic, Kept Apart
STATUS: PASS-WITH-ISSUES

Created `src/dispenser-trait.ts` (§16.2) and the behavior file (§16.3)
verbatim. Both compile; all 105 accumulated transcript assertions still pass.

- (§16.3) The behavior file's NAME is never given. The import line
  `from './dispenser-trait.js'` fixes the trait file's name, but the file
  holding `DispenserBehavior` is unnamed; chose `src/dispenser-behavior.ts`.
- (§16.2/§16.4) The chapter never wires the pair into the zoo: the
  `dispenser.add(new DispenserTrait({ chargesRemaining: 5 }))` line has no
  stated placement, and §16.4's caller is a comment-marked hypothetical
  ("inside a custom 'operate dispenser' action's execute phase"). No Try-it
  section exists. Result: two orphan files that nothing imports, and the
  feed dispenser never actually runs dry in the game. Left unwired, as
  written. If a later chapter assumes the dispenser has charges, it will
  surface there.

## Chapter 17 — Extending the Grammar
STATUS: PASS

Teaching chapter; its concrete snippets (feed/photograph patterns) were
already typed in during Ch 14. §17.5 (`feed :food to :animal`) and §17.6
(`.where` slot constraint) are "suppose"-style hypotheticals never added to
the zoo. Nothing new to build; grammar already verified by Ch 14/15 tests.

## Chapter 18 — The Language Layer
STATUS: PASS

Prose chapter; snippets restate Ch 14's `extendLanguage` code. Nothing new
to type. Message-ID lookup behavior already verified (custom messages render,
no raw IDs seen in any transcript).

## Chapter 19 — The Formatter Chain
STATUS: PASS

Prose chapter; formatter examples ({the:item}, {is:item}, {list:items}) are
illustrative, none added to the project. Indirect verification: Ch 5's
plural scenery ("The rabbits/goats are fixed in place" agreement) passed in
earlier transcripts ("take goats" reported plural agreement correctly).

## Chapter 20 — Non-Player Characters: Actors That Take Turns
STATUS: PASS-WITH-ISSUES

Added NPC imports (§20.0), extended `roomIds` with mainPath/aviary (§20.4
tells you to), `NpcTrait` on the parrot (§20.1.1), the zookeeper entity
(§20.1), `parrotBehavior` + `PARROT_PHRASES` (§20.3), and the plugin/behavior
registrations in `onEngineReady` (§20.4). Compiles; @sharpee/plugin-npc
resolves. Transcript: 12 steps PASS.

- (§20.5 "Try it") MISLEADING EXPECTATION: the walkthrough annotates `wait`
  with "Sam patrols on toward the petting zoo", implying visible movement.
  Actual output for `wait` is only "Time passes..." — the patrol emits no
  text at all. Verified the patrol DOES happen (a `look` after three waits
  no longer lists the zookeeper in the room), but a reader following the
  Try-it sees nothing of it and would reasonably conclude the NPC is broken.
  The parrot's on-arrival emote ("The parrot ruffles its feathers…") does
  appear as promised.
- (§20.4) MERGE AMBIGUITY: the chapter prints `onEngineReady` as a complete
  method body, but Ch 13 already put the two chainEvent registrations there.
  The text never says "add to your existing onEngineReady". Merged them
  (plugin/NPC code first, chain handlers after); compiles and both features
  work.
- (§20.0) Import listing again repeats `GameEngine` (already imported in
  Ch 13); typed in only new symbols.

## Chapter 21 — Scenes: Named Windows of Story Time
STATUS: PASS-WITH-ISSUES

Added the `SceneTrait` import (§21.2 says it's "the one symbol you import")
and the petting-zoo scene with `onBegin`/`onEnd` (§21.4 version) to
`initializeWorld`. Verified with a transcript: entering the Petting Zoo
prints "A waft of hay and warm fur greets you.", leaving prints "The animal
sounds fade behind you.", and re-entering (recurring) fires again. 4/4 PASS.

- (§21.2 vs §21.4) The same scene is defined twice — first without, then
  with the onBegin/onEnd callbacks. Nothing says "replace the §21.2 version";
  typed in only the §21.4 version. A literal reader could register the same
  scene id twice.
- (§21.2) The `SceneTrait` import is only used by §21.5's illustrative storm
  scene, which is never added to the zoo — so the project carries an unused
  import on the book's instruction.
- No "Try it" in this chapter; wrote a scene-edge transcript from the §21.4
  callback text.

## Chapter 22 — Turns, Timed Events & Daemons
STATUS: PASS

Added the SchedulerPlugin imports, `TimedMessages`, the two daemon factories
and the fuse factory (§22.2–22.4), scheduler registration in `onEngineReady`
(§22.1), and the six messages in `extendLanguage` (§22.5). Build clean.
Try-it behavior verified by transcript (16/16 PASS): PA announcement at turn
5 ("closes in three hours"), second at turn 10, feeding-time fuse fires at
turn 11 — one late, exactly as §22.4's "skips its first tick" warning says —
goats bleat while the countdown runs, and the bleating stops on its own
after three turns even though the goats were fed, as §22.6's note explains.

- (§22.6 "Try it") The walkthrough is loose ("repeat ~5 times", "repeat
  until"); wrote it as a fixed 16-step transcript. Includes the semicolon
  compound `> south; east` again (split as before).
- (§22.1) The import listing again repeats `ISemanticEvent` and
  `IdentityTrait` (imported since Ch 13/Ch 2); added only the scheduler
  imports.

## Chapter 23 — Scoring & Endgame: Winning the Game
STATUS: BLOCKED (endgame unreachable as written)

Added the scoring tables (§23.2), `setMaxScore(75)` + zooMap/brochure ID
recording in `initializeWorld`, the three chainEvent scoring handlers and
victory-daemon registration in `onEngineReady` (§23.3/23.4), awards inside
the petting behavior / feeding execute / photograph execute / penny-press
chain (§23.3), and the VICTORY message (§23.4). Build clean. Wrote the full
12-achievement walkthrough as a transcript: all 75 points are awardable
(final `score`: "You have achieved a perfect score of 75 points!").

- (§23.4 "The victory daemon") BOOK BUG: with the score at 75/75, the
  victory daemon NEVER fires — not on the turn the score completes, nor on
  any later turn. The scheduler itself is running (the feeding-time fuse
  re-fires during the same waits), and the daemon is registered exactly like
  the working ones. The book's Try-it line `> score  … 75 out of 75,
  victory!` cannot be reproduced; the game cannot be won. No compiler or
  runtime error is shown to the author. Could not investigate further under
  test rules (no platform-source reading).
- (§23.3) READER-SUPPLIED CODE: the four remaining awards ("wire them up the
  same way") are given as fragments without the surrounding
  goats-vs-rabbits keying; had to write the `if (name.includes('goats'))`
  branch myself following the feeding action's existing report() pattern.
- (§23.5 "Try it") `score` output format differs from the book: book shows
  "0 out of 75"; actual is "You have scored 0 out of 75, earning you the
  rank of a Novice." and, at maximum, changes shape entirely to "You have
  achieved a perfect score of 75 points!" (no "75 out of 75" text).
- OBSERVED while walking through (belongs to Chs 5/19 claims): in the
  Nocturnal Exhibit the room listing prints "You can see a sugar gliders, a
  bush babies, and a barn owl here." — (a) scenery IS listed, contradicting
  §5.5 "Scenery is not listed this way", and (b) the plural/mass entities get
  article "a" ("a sugar gliders"), contradicting §19.6's claim that the list
  formatter picks correct articles from entity metadata (these two have
  `article: 'some'` set as the book instructed in §8.7).
- (§23.5) RECURRENCE: `> south; east` compound line again.

## Chapter 24 — Channels: The Universal UI Surface
STATUS: PASS-WITH-ISSUES (needed a DEVIATION to compile)

Added `AMBIENCE_BY_ROOM` and the `registerChannels` hook with the
`zoo.ambience` channel (§24.6), verbatim.

- (§24.6) BOOK BUG: the hook's parameter type `IChannelRegistry` is never
  imported anywhere in the chapter and no package is named for it. Exact
  error: `src/index.ts(1058,30): error TS2304: Cannot find name
  'IChannelRegistry'.` Also `error TS7006: Parameter 'ctx' implicitly has an
  'any' type.` — the book's own §17.6 note admits the strict tsconfig flags
  untyped callbacks, yet §24.6's `produce: (ctx) =>` is printed untyped.
- DEVIATION: added a local `type IChannelRegistry = any;` alias and annotated
  `(ctx: any)`. Compiles; the channel works (verified in browser below).

## Chapter 25 — The Web Client: A Framework-Free UI
STATUS: PASS

Added the §25.5 `zoo.ambience` renderer to `src/browser-entry.ts` (after
`connectEngine`; the generated entry's own comment confirms placement).
§25.1's BrowserClient snippet was not typed in — the chapter says the entry
point is generated, and it was. Verified with Playwright (real Chromium
against dist/web served statically): page loads titled "Family Zoo"; opening
prose shows Zoo Entrance; typing `south` into #command-input advances the
game; the custom channel renders "The air is alive with birdsong…" into
#zoo-ambience in the Aviary and clears to '' on leaving (§24.6's
sparse-''-vs-undefined behavior works as documented).

## Chapter 26 — Decoration & Theming
STATUS: PASS

Added `sharpee.themes` (modern-dark, paper, inline zoo-sunny) to
package.json (§26.4.2) and the `[data-theme="zoo-sunny"]` token block + two
flourish rules to `browser/my-zoo.css`. Build copied theme CSS into
dist/web/themes/ and put "Zoo Sunny" in Settings → Theme. Playwright:
selecting Zoo Sunny flips `data-theme="zoo-sunny"` and the body repaints to
the token's warm cream (rgb(255, 250, 240) = #fffaf0). Status line renders
the location/score/turn channels ("Score: 0 | Turns: 2").

- (§26.4.2) Naming mismatch: book says the override stylesheet is
  `browser/<story-id>.css` (and shows browser/familyzoo.css; config.id IS
  'familyzoo'), but the scaffold created `browser/my-zoo.css` — named after
  the npm package, not the story id. Followed the scaffold file; worked.
- Note: `src/browser-entry.ts` still carries the generated hardcoded
  `themes: [modern-dark, paper]` / `defaultTheme: 'modern-dark'`; the menu
  nevertheless showed Zoo Sunny (built from package.json), so §25.1's "this
  array is metadata the generator fills in" describes generation time only —
  the array goes stale and is apparently unused afterward. Confusing but
  harmless here.

## Chapter 27 — Media & Audio: Sight and Sound as Channels
STATUS: BLOCKED (zoo wiring cannot be completed from the text)

Added what is concretely printed: the `mediaEvent`/`emit` helpers with the
`Effect` import from @sharpee/event-processor (§27.6) and the AudioRegistry
atmosphere declarations. Both compile (`@sharpee/media` exports
AudioRegistry with the fluent builder shown).

- (§27.6) BOOK GAPS, three in one section: (a) no import is ever given for
  `AudioRegistry` — the package name appears only in prose; (b) the
  atmosphere snippet uses `aviaryId` / `nocturnalId`, variables never defined
  anywhere in the book (mapped to this project's `aviary.id` /
  `nocturnalExhibit.id`); (c) the room-entry handler is "registered on the
  event processor" and shown only as a fragment (undefined `effects`,
  `toRoom`), but the book NEVER shows how to register anything on the event
  processor — no mechanism taught in Chs 1–27 accepts an Effect[]-returning
  handler (chainEvent returns events; registerEventHandler returns void).
  The media features therefore cannot be wired as written; the helpers and
  atmosphere data sit compiled but dead.
- Playwright confirms no media requests fire in the browser (consistent with
  the handler being unwirable) and no console errors — §27.4's "silent, not
  broken" claim holds, if only vacuously.
- No "Try it" in Chs 24–27; per instruction, browser verification for this
  volume used Playwright (installed with npm + `npx playwright install
  chromium`, plus `install-deps` for system libraries).

## Chapter 28 — The Multi-File Story: Putting It All Together
STATUS: BLOCKED (not executable from the book)

The chapter describes the seven-file split and the after-hours second act
but explicitly does not print the code: "All seven live in the companion
repository … this chapter walks their structure rather than reprinting every
line, so open them on GitHub alongside as we go" (§28.2). Under this test's
book-only rule (and for any offline reader), the refactor cannot be
performed: §28.3 prints only a fragmentary interface (`createZooMap` with a
body that is comments), and the after-hours feature (§28.5) names functions
(`createAfterHoursDaemons`, `parrotAfterHoursBehavior`, the behavior-swap
daemon, the 25-point bonus tier) whose code never appears in the book.
- CONSEQUENCE: the project remains single-file (index.ts, ~1,200 lines by
  now, plus the two Ch 16 orphan files). The after-hours act does not exist
  in this build, so Ch 30's v17 example (behaviorSwapped) is not reproducible
  either, and Ch 29's "two acts" framing doesn't apply to what a book-only
  reader has.

## Chapter 29 — Transcript Testing & Walkthroughs
STATUS: PASS-WITH-ISSUES

The testing tool itself has been exercised throughout this run (per the
headless rule); this chapter's specific features were now tested directly.
`npx sharpee build --test` and `--stop-on-failure` (§29.5) both work.
Unit transcripts in tests/transcripts/ and walkthroughs in walkthroughs/
are discovered exactly as described. Walkthrough chaining works: wt-01 ends
with `$save wt-checkpoint-1`, wt-02 opens with `$restore wt-checkpoint-1`
and resumes in the Supply Room (8/8 PASS). `[EVENT: true, type="..."]`
assertions work for both stdlib (if.event.taken) and custom (zoo.event.fed)
events.

- (§29.1) BOOK EXAMPLE FAILS AS PRINTED: the sample "Feed the goats"
  transcript, run against the very game this book builds, fails at its first
  command. `> take feed` at game start gives "You can't see any such thing."
  (the feed is in the Petting Zoo, not at the entrance), and `> south` goes
  to the Main Path, not the Petting Zoo. Front matter claims all examples
  are "real, compiled, and transcript-tested"; this one cannot have been.
- (§29.3) STATE ASSERTION SYNTAX WRONG AS PRINTED: `[STATE: true,
  player.inventory contains feed]` fails twice over — first `State
  assertion failed: … Entity "player" not found` (the tester resolves the
  entity by its NAME; the book's own player is named 'yourself'), then,
  with the right entity, `yourself.inventory does not contain "feed"` (the
  item must be named by its full name, 'bag of animal feed', not an alias).
  Working form: `[STATE: true, yourself.inventory contains bag of animal
  feed]`. Neither requirement is documented.
- (§29.6 Key takeaway) mentions walkthroughs are "run with --chain", a flag
  §29.5 never introduces; plain `--test` chained them fine.
- (§29.4) [GOAL]/[IF]/[WHILE]/[NAVIGATE TO] not exercised: the suggested
  use case is the after-hours act, which Ch 28 made unbuildable.

## Chapter 30 — Saving & Restoring: State Lives in the World
STATUS: PASS-WITH-ISSUES

Mostly prose. The getRunnerState/restoreRunnerState pattern was already
typed in via Chs 22-23 daemons. Browser persistence (§30.3) verified with
Playwright: played two turns (take map, south), opened the page fresh in the
same browser context — the autosave restored the game mid-session (status
line back at "Main Path", inventory still holds the zoo map). PASS.

- (§30.2) The chapter's worked example (the after-hours behavior-swap
  daemon) belongs to v17, which a book-only reader cannot build (see Ch 28).
  The pattern itself was verifiable only through the Ch 22/23 daemons.

## Chapter 31 — Building & Publishing
STATUS: PASS

All commands in §31.1-31.3 had already been run over the course of this
test and were re-confirmed: `sharpee build` emits dist/index.js and the
.sharpee bundle; `sharpee init-browser` + `sharpee build` emit dist/web/;
serving dist/web with a static file server yields a fully playable game
(verified end-to-end with Playwright in Chs 25-26/30). dist/web is
self-contained static files as claimed.

- (§31.1) Same trivial mismatch as Ch 1: "produces two things in dist/" —
  dist/ also contains index.d.ts and web/.
- (§31.4/§31.5) Versioning prose and npm publishing not testable headlessly/
  anonymously; not attempted (no instruction to run anything).

---
# Run Summary

31 chapters executed front-to-back in one project (`~/repos/test-book/my-zoo`),
single-file as the book teaches through Ch 27. Final state: 175+ transcript
assertions across 15 unit transcripts + a 2-part chained walkthrough, all
green; browser client verified with Playwright (play, channels, theming,
autosave). Appendices A/B are reference-only; nothing to execute.

**Chapter statuses**
- PASS: 3, 4, 7, 8, 10, 11, 17, 18, 19, 22, 25, 26, 31
- PASS-WITH-ISSUES: 1, 2*, 5, 6, 9, 12, 13, 14, 16, 20, 21, 24, 29, 30
  (*Ch 2 logged as PASS with minor notes)
- BLOCKED: 15 (imports don't exist — deviation unblocked), 23 (victory
  daemon never fires; game unwinnable as written), 27 (media wiring not
  teachable from the text), 28 (code lives only in the companion repo)

**The five defects that matter most**
1. Ch 23: the victory daemon never fires at 75/75 — the game cannot be won.
   The book's central promise ("a complete, winnable game") fails.
2. Ch 15: three imports (`registerCapabilityBehavior`,
   `hasCapabilityBehavior`, `getBehaviorForCapability`) are not exported by
   @sharpee/world-model; the chapter cannot compile, and the engine's
   "Universal dispatch … no behavior registered" warning shows the real
   registration API is unreachable from the book.
3. Ch 28: the multi-file refactor and the entire after-hours act exist only
   on GitHub; a book-only reader cannot build v17, which Chs 29-30 then
   assume.
4. Ch 14/15 (production): grammar code lines run off the right page edge and
   are truncated mid-identifier in the PDF.
5. Ch 12/13/14/15/22/23 ("Try it" blocks): semicolon-compound commands
   (`> south; east`) are rejected by the engine ("You can't see any such
   thing.") — every walkthrough using them stalls at that line.

**Recurring frictions** — never saying where new code goes inside
`initializeWorld` / `onEngineReady`; import listings that re-import symbols
from earlier chapters (verbatim paste = duplicate-identifier errors);
"replaces the exits from Chapter N" without saying delete-vs-overwrite;
§29.3's STATE-assertion syntax wrong as printed; §20.5 implying visible NPC
patrol movement when it is silent; §5.5/§19.6 contradicted by scenery
listings with wrong articles ("a sugar gliders").

