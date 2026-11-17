# Execution Log — The Sharpee Author and Developer Manual (v2.0.0 PDF)

Acceptance test run as a first-time Sharpee author. Book is the only source of
truth. Environment: Linux (headless), Node v22.23.1, npm 11.18.0.
Resolved packages: `@sharpee/devkit@2.1.1` (global), platform `@sharpee/*@2.1.1`
(project pins `^2.0.0`). Project: `~/repos/book-test/my-zoo`.

---

## Chapter 1 — Installing Sharpee: The CLI and Your First Project

**STATUS: PASS**

Everything in the chapter worked exactly as written:

- §1.3: `node --version` (v22.23.1) and `npm --version` (11.18.0) both ≥ the
  required v18.
- §1.4: `npm install -g @sharpee/devkit` succeeded; `sharpee` on path.
- §1.5: `sharpee init my-zoo -y`, `cd my-zoo`, `npm install` produced exactly
  the layout the book describes (`src/index.ts`, `package.json`,
  `tsconfig.json`, `.gitignore`).
- §1.6: `sharpee build` compiled and emitted `dist/index.js` and
  `dist/my-zoo.sharpee`, matching the described artifacts.
- §1.7: `sharpee init-browser` created `src/browser-entry.ts`,
  `src/version.ts`, `browser/my-zoo.css` and updated `package.json`, as the
  book says. Its output suggested `npm install`; per the book's instruction I
  ran it. `sharpee build` then also emitted the web client to `dist/web/`.
  `python3 -m http.server -d dist/web` served the page (verified with
  HTTP GET → 200, index.html delivered; headless box, so no browser play).
- §1.2/§1.8: plain `sharpee` prints help, exit 0.

Notes (not defects):

- CLI "Next steps" hints say `npm run build` where the book says
  `sharpee build` — pre-acknowledged drift (book §1.7), not reported per test
  instructions.

## Chapter 2 — Your First Room: Entities, Traits, and the World

**STATUS: PASS**

- Replaced the scaffold stub `src/index.ts` with the chapter's file (imports,
  `config`, `FamilyZooStory` class with `createPlayer` / `initializeWorld`,
  `export const story: Story` + default export), typed exactly as printed.
  The book (§2.3) explicitly acknowledges the scaffold stub differs from the
  book's class form and says to use the book's — no ambiguity.
- §2.9: created `tests/transcripts/first-room.transcript` exactly as printed;
  `npx sharpee build --test` compiled and ran it: **5 passed, all green**,
  output matches the book's trimmed sample.
- Verification substitution (logged once, applies to the whole run): this box
  is headless, so "Try it" blocks are verified via the book's own transcript
  mechanic (§2.9 / Ch. 29) instead of browser play. Chapter 2's Test-it
  transcript covers its Try-it commands one for one, so nothing was lost.

## Chapter 3 — The Play Loop: How a Turn Works

**STATUS: PASS**

- Conceptual chapter; the book says "You won't write any new code here."
  The one code listing (§3.2.4, `context.event(...)`) is explicitly marked
  illustrative ("the zoo has no brass key"), consistent with the illustrative
  rule. Nothing to execute; nothing failed.

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs

**STATUS: PASS**

- §4.4: added `Direction` to the `@sharpee/world-model` import (import rule)
  and replaced Chapter 2's `initializeWorld` with the complete four-room
  version, typed exactly as printed (replacement rule; the book states "It
  replaces the single-room one from Chapter 2").
- Note: the Chapter 4 listing quietly revises the ticket-booth description and
  the sign's aliases from Chapter 2 (booth text becomes one sentence:
  "...sliding glass window reading \"Self-Guided Tours...\""). Because the
  chapter prints the *complete* method and says nothing is abbreviated, a
  literal reader is fine — noted only as a curiosity, not an issue. The
  Chapter 2 test's `contains "Self-Guided Tours"` assertion still holds.
- §4.8: created `tests/transcripts/navigation.transcript` as printed;
  `npx sharpee build --test` → **12 tests in 2 transcripts, all passed**.

## Chapter 5 — Scenery & Portable Objects

**STATUS: PASS**

- §5.1: added the souvenir penny at the end of `initializeWorld` before player
  placement (placement rule, explicitly cited by the chapter).
- §5.7: added iron fence, rabbits, zoo map, bag of animal feed exactly as
  printed. The chapter's parenthetical is clear about the fence appearing
  twice ("add it once") and the penny not being re-shown ("it stays where you
  typed it") — no ambiguity.
- §5.9: `tests/transcripts/scenery-and-items.transcript` as printed;
  `npx sharpee build --test` → **24 tests in 3 transcripts, all passed**.

## Chapter 6 — Containers & Supporters

**STATUS: PASS**

- §6.3: added `SupporterTrait` to the trait import as printed.
- §§6.2–6.3: added backpack (entrance), feed dispenser (Petting Zoo, fixed),
  park bench (Main Path, fixed) at the end of `initializeWorld` — the chapter
  explicitly cites the placement rule for all three blocks.
- §6.7: `tests/transcripts/containers.transcript` as printed;
  `npx sharpee build --test` → **36 tests in 4 transcripts, all passed**.
- §7.1's lunchbox snippets seen so far are illustrative (the lunchbox is
  created in Ch. 7 proper); nothing typed from them yet.

## Chapter 7 — Openable Things, Locked Doors & Keys

**STATUS: PASS**

- §7.4: added the `OpenableTrait, LockableTrait, DoorTrait` import; added the
  full puzzle block (Supply Room, shelves, keycard, staff gate, exits wired
  `via` the gate on both sides) at the end of `initializeWorld`; deleted the
  Chapter 4 Main Path exits assignment as the chapter instructs (replacement
  rule, cited explicitly).
- Ambiguity resolved (worked as read): §7.1's `lunchbox` snippets reference an
  entity never created in the zoo. Per the illustrative rule they read as
  shape-only ("You want the lunchbox to start closed..." is a supposition),
  and §7.4's "Here is the whole puzzle" confirms the real code. A very literal
  reader could still wonder — the chapter never says "nothing to type" for
  the lunchbox, which §0.6 promised it would ("the chapter says 'nothing to
  type' wherever one could pass for real code").
- §7.6: `tests/transcripts/locked-gate.transcript` as printed;
  `npx sharpee build --test` → **44 tests in 5 transcripts, all passed**.

## Chapter 8 — Light & Dark

**STATUS: PASS**

- §8.7: added `LightSourceTrait, SwitchableTrait` import; added the flashlight
  (§8.4, placed in the Supply Room) and the full Nocturnal Animals Exhibit
  block; replaced Chapter 7's Supply Room exits assignment (replacement rule,
  cited explicitly by the chapter).
- §8.5 listings (gem, candle, lantern) are clearly framed as patterns, not
  zoo code — nothing typed.
- §8.9: `tests/transcripts/light-and-dark.transcript` as printed;
  `npx sharpee build --test` → **59 tests in 6 transcripts, all passed**.

## Chapter 9 — The Map & Regions

**STATUS: PASS**

- §9.2: "Type this pair into your project" — added `world.createRegion` for
  `reg-public` / `reg-staff` at the top of `initializeWorld` ("before the
  rooms that belong to them") and the six `world.assignRoom` calls at the end
  ("after the rooms exist"; exact position not specified, resolved via the
  placement rule — worked as read).
- §9.4 handler sketch and §9.5 nesting/query listings are explicitly marked
  illustrative ("a preview of that volume, not part of the zoo (the
  illustrative rule); ... nothing to type in this chapter") — nothing typed.
- No Test-it block in this chapter; `npx sharpee build --test` after the edits
  → **59 tests, all passed** (compiles clean; `createRegion` / `assignRoom`
  exist as documented).

## Chapter 10 — The Standard Actions: The Four-Phase Model

**STATUS: PASS**

- Conceptual; "You won't write an action in this chapter." The `someAction`
  shape listing is clearly illustrative. Nothing to execute.

## Chapter 11 — Scope & Visibility

**STATUS: PASS**

- Conceptual; no code listings to type. Nothing to execute.

## Chapter 12 — Readable Objects & Switchable Devices

**STATUS: PASS**

- Added `ReadableTrait` import (the chapter explicitly warns not to re-import
  `SwitchableTrait` — import rule).
- §§12.2–12.4: added info plaque (Petting Zoo), zoo brochure (entrance), radio
  (Supply Room) at the end of `initializeWorld` as instructed. §12.1's bare
  `plaque.add(...)` snippet is subsumed by §12.2's full listing (clear in
  context).
- §12.7: `tests/transcripts/readables.transcript` as printed;
  `npx sharpee build --test` → **75 tests in 7 transcripts, all passed**.

## Chapter 13 — Event Handlers

**STATUS: PASS**

- §13.4: added `GameEngine` / `ISemanticEvent` / `IWorldModel` imports, the
  two private ID fields, the Gift Shop + souvenir press block at the end of
  `initializeWorld`, the ID recording, and deleted Chapter 4's Aviary exits
  assignment (replacement rule, cited explicitly).
- §§13.5–13.6: `onEngineReady` with both `chainEvent` handlers typed exactly
  as printed. §13.2's earlier `chainEvent` snippet references an undeclared
  `feedId` but is clearly superseded by §13.5's full version — read as
  illustrative, worked fine.
- §13.8: `tests/transcripts/event-handlers.transcript` as printed (the
  transcript's `description:` header line wraps across two lines in the PDF;
  joined to one line — pure PDF layout, not a defect);
  `npx sharpee build --test` → **86 tests in 8 transcripts, all passed**.

## Chapter 14 — Custom Actions

**STATUS: PASS**

- Added the chapter's import block minus names already imported (import rule,
  which the chapter itself restates). New: `Action, ActionContext,
  ValidationResult` from `@sharpee/stdlib`, `type Parser` from
  `@sharpee/parser-en-us`, `type LanguageProvider` from `@sharpee/lang-en-us`.
- §14.1's skeleton is explicitly marked illustrative ("typed literally it
  would not compile ... nothing to type") — good, clear.
- §§14.2–14.3: `feedAction` / `photographAction` as top-level consts (the
  chapter says "The action objects below are top-level consts"; exact position
  unspecified — placed between `config` and the class, which compiles).
  Camera added to the Gift Shop in `initializeWorld`.
- §§14.4–14.6: `getCustomActions`, `extendParser`, `extendLanguage` added as
  class members.
- §14.8: `tests/transcripts/custom-actions.transcript` as printed;
  `npx sharpee build --test` → **97 tests in 9 transcripts, all passed**.

## Chapter 15 — Capability Dispatch

**STATUS: PASS**

- Added the capability-dispatch import block (minus already-imported
  `IFEntity`, `Action`, etc. — import rule); `PettableTrait`, `PetMessages`,
  `pettingBehavior`, `PETTING_ACTION_ID`, `pettingAction` as top-level
  declarations; updated `getCustomActions`; added `pet`/`stroke` grammar and
  the four pet messages; made goats/rabbits pettable, added the parrot, and
  registered the behavior at the end of `initializeWorld` ("after the animals
  exist") — all exactly as printed.
- Minor ordering note: the book presents `pettingBehavior` (§15.2.2) before
  `PETTING_ACTION_ID` is declared (§15.3); as top-level consts this compiles
  fine since nothing dereferences early. No issue in practice.
- §15.7: `tests/transcripts/petting.transcript` as printed;
  `npx sharpee build --test` → **105 tests in 10 transcripts, all passed**.

## Chapter 16 — Custom Traits & Behaviors

**STATUS: PASS**

- §§16.2–16.3: created `src/dispenser-trait.ts` and `src/dispenser-behavior.ts`
  exactly as printed. The chapter is admirably explicit that the pair stays
  unwired ("nothing in index.ts changes in this chapter"), that the
  `dispenser.add(...)` line is shape-only, and that §16.4's caller is
  illustrative.
- `npx sharpee build --test` → compiles clean, **105 tests, all passed**.

## Chapter 17 — Extending the Grammar

**STATUS: PASS**

- Conceptual chapter re-explaining the `extendParser` grammar already typed in
  Chapters 14–15. §§17.5–17.6 listings are framed as suppositions ("Suppose
  feeding should name both..."), so nothing typed. No Try-it/Test-it. Build
  remains green.

## Chapter 18 — The Language Layer

**STATUS: PASS**

- Conceptual; re-presents `extendLanguage` code already in the file. Nothing
  new to type; no Try-it/Test-it. Build remains green.

## Chapter 19 — The Phrase Algebra

**STATUS: PASS**

- Conceptual; all listings (hint tables, `nounPhraseFor`, `Optional`/`Choice`
  values) are illustrative shapes referencing entities that aren't declared in
  scope (`gate`, `ZooMessages`) — consistent with the illustrative rule.
  Nothing typed; no Try-it/Test-it. Build remains green.

## Chapter 20 — Non-Player Characters

**STATUS: PASS**

- Added the four-package import block (minus already-imported `GameEngine` —
  import rule). `@sharpee/plugin-npc` resolved transitively (pre-accepted).
- §20.1: zookeeper NPC created in `initializeWorld` (placement rule) and
  parrot promoted with `NpcTrait`, both exactly as printed.
- §20.3: `PARROT_PHRASES` + `parrotBehavior` as top-level consts, as directed.
- §20.4: widened the `roomIds` field, added the two ID-recording lines, and
  added the plugin/behavior registration at the top of the existing
  `onEngineReady` — chapter is explicit ("add the plugin code below at the top
  of that existing method; don't declare a second one").
- §20.6: `tests/transcripts/npcs.transcript` as printed;
  `npx sharpee build --test` → **112 tests in 11 transcripts, all passed**
  (including the turn-sensitive "leaves to the east" assertion).

## Chapter 21 — Scenes

**STATUS: PASS**

- §21.4: typed only the final `createScene` form as instructed ("This listing
  replaces the bare version above ... type in only this final form"), placed
  in `initializeWorld` (chapter says scenes are created there; exact spot via
  placement rule). §21.3 queries and §21.5 storm are illustrative (storm
  explicitly "nothing to type").
- §21.7: `tests/transcripts/scenes.transcript` as printed — begin, end, and
  recurrence lines all matched. All green.

## Chapter 22 — Turns, Timed Events & Daemons

**STATUS: PASS**

- Added `SchedulerPlugin` + `Daemon/Fuse/SchedulerContext` imports (the
  chapter's import block re-lists `ISemanticEvent` and `IdentityTrait`, which
  the import rule says to skip — done). `@sharpee/plugin-scheduler` resolved
  transitively (pre-accepted).
- `TimedMessages` "near the top of your story module"; three factory
  functions as module-level functions (position unspecified — placed before
  the class); scheduler block added directly below the Chapter 20 NPC
  registration in `onEngineReady`, exactly where the chapter says; six
  messages appended to the existing `extendLanguage`.
- §22.7: `tests/transcripts/timed-events.transcript` as printed (its
  `description:` header wraps in the PDF; joined to one line);
  `npx sharpee build --test` → **131 tests in 13 transcripts, all passed** —
  including the exact turn timing of PA announcements, the fuse's
  first-fire-at-turn-11 behavior, and the bleating countdown.

## Chapter 23 — Scoring & Endgame

**STATUS: PASS**

- §23.1: `world.setMaxScore(75)` at the top of `initializeWorld` (the snippet's
  comment names the location); the `awardScore`/`getScore` sample lines around
  it are clearly illustrative.
- §23.2: scoring tables (`MAX_SCORE`, `ScoreIds`, `ScorePoints`,
  `ROOM_SCORE_MAP`, `ScoreMessages`) as top-level constants "up front".
- §23.3: room-visit / take-map / read-brochure `chainEvent` handlers added to
  `onEngineReady`; `entityIds` widened and two recording lines added, exactly
  as directed. The four remaining awards were wired into the petting
  behavior's `execute`, the feeding action's `execute` ("after its existing
  `const target = ...` line"), the photograph action's `execute` (renaming
  `_context` to `context` as instructed), and the penny-press chain — all
  placements spelled out by the chapter.
- §23.4: victory daemon + registration + victory message as printed.
- §23.6: `tests/transcripts/scoring.transcript` as printed (28 steps);
  `npx sharpee build --test` → **159 tests in 14 transcripts, all passed**,
  including victory firing on the exact turn the 75th point lands and the
  "perfect score of 75 points" response.

## Chapter 24 — Channels: The Universal UI Surface

**STATUS: PASS**

- §24.6: added the `@sharpee/if-domain` type import, the `AMBIENCE_BY_ROOM`
  const, and the `registerChannels` hook with the `zoo.ambience` channel,
  exactly as printed. Compiles clean; suite stays green.
- Verified in-browser (Playwright, headless Chromium — logged substitution for
  Volume VII's browser verification): the channel emits the Aviary mood line
  and blanks it (empty-string transition, exactly the §24.6 subtlety) when
  leaving.

## Chapter 25 — The Web Client

**STATUS: PASS**

- §25.1: left the scaffolded `browser-entry.ts` values as-is, per the
  chapter's explicit instruction (the `BrowserClient` listing is marked
  illustrative).
- §25.5: added the `zoo.ambience` renderer to `src/browser-entry.ts` after
  `connectEngine` / before `client.start()` (the spot the scaffold header
  names, as the chapter says).
- Ambiguity resolved (worked as read): the ambience renderer listing uses a
  `renderer` variable that is only declared in the *preceding* score example
  — which the chapter marks "nothing to type". A literal reader must still
  take its `const renderer = client.getChannelRenderer();` line to make the
  ambience listing compile. Minor, but a strict reading of the illustrative
  rule leaves `renderer` undefined.
- Playwright: prose pane renders, status line shows location/score/turns,
  mood line paints above the prose. No page errors.

## Chapter 26 — Decoration & Theming

**STATUS: PASS**

- §26.4.2: added the `[data-theme="zoo-sunny"]` token block to
  `browser/my-zoo.css` and the `sharpee.themes` list (modern-dark, paper,
  zoo-sunny) to `package.json` as printed. Build reports "Wired 3 theme(s):
  modern-dark, paper, zoo-sunny". The flourish rules are conditional ("If you
  want to push past the tokens") — not typed.
- Playwright: `data-theme` applied on load; "Zoo Sunny" present in the
  generated theme menu; flipping `data-theme="zoo-sunny"` repaints the body
  to the warm-cream token value (#fffaf0). Status line = location/score/turn
  channels, as §26.5 describes.

## Chapter 27 — Media & Audio

**STATUS: PASS**

- §27.6: added `AudioRegistry` (`@sharpee/media`), the two room atmospheres
  in `initializeWorld`, the `mediaEvent`/`emit` helpers and the
  effect-returning `if.event.actor_moved` handler in `onEngineReady`, the
  engine-side `createAmbientChannel('environment')` in `registerChannels`,
  and the browser-side `createAmbientChannelRenderer` registration — all as
  printed. `@sharpee/media` and `@sharpee/event-processor` resolved
  transitively (pre-accepted).
- No audio assets shipped (the book says sourcing files is the author's job
  and that missing files 404 harmlessly). Playwright confirms exactly that:
  entering the Aviary fires a request for `audio/aviary-birdsong.mp3` (404),
  the page keeps working, no errors — "silent, not broken", as §27.4
  promises.

## Chapter 28 — The Multi-File Story

**STATUS: PASS** (read-along by design)

- The chapter states up front it is the book's one read-along chapter:
  "there is nothing to type in this chapter"; its seven-file project lives in
  the companion GitHub repository. Pre-accepted trade-off — not reported as an
  issue. The single-file zoo "keeps working exactly as it is", which the green
  suite confirms.

## Chapter 29 — Transcript Testing & Walkthroughs

**STATUS: PASS**

- §29.1: `tests/transcripts/feed-the-goats.transcript` as printed (its
  `description:` wraps in the PDF; joined to one line).
- §29.5: created `walkthroughs/` with `wt-01-into-the-zoo.transcript` and
  `wt-02-feeding-time.transcript` exactly as printed — including typing
  wt-02 *without* a `---` header separator, exactly as the book prints it.
  The chain ran correctly anyway: `$restore at-the-pens` resumed wt-01's
  state (the `feed goats` turn could only succeed because the bag crossed
  the file boundary) and `score` reported "20 out of 75" as asserted. The
  known header-separator quirk did not bite in this instance.
- `[EVENT:]` and `[STATE: yourself.inventory contains bag of animal feed]`
  assertions passed on the published 2.1.1 packages.
- `npx sharpee build --test` → **169 tests in 17 transcripts (2 walkthrough
  files chained + 15 unit files), all passed**, output matching §29.5's
  trimmed sample.

## Chapter 30 — Saving & Restoring

**STATUS: PASS**

- Conceptual chapter. Its one code listing (the behavior-swap daemon with
  `getRunnerState`/`restoreRunnerState`) belongs to the Chapter 28 multi-file
  snapshot and is presented read-along; the single-file zoo already exposes
  the same hooks on its PA and victory daemons (typed in Chapters 22–23).
  Nothing new to type. Save/restore itself was exercised end-to-end by the
  Chapter 29 walkthrough chain (`$save`/`$restore`) and, browser-side, the
  autosave/startup dialog seen in the Playwright session.

## Chapter 31 — Building & Publishing

**STATUS: PASS**

- §31.1–31.2 re-run the Chapter 1 commands (already done; re-verified
  `sharpee build` emits `dist/index.js`, `dist/my-zoo.sharpee`, and
  `dist/web/`).
- §31.3: ran the printed local-hosting check (`sharpee build` +
  `python3 -m http.server -d dist/web`) → HTTP 200; `dist/web/` is the
  self-contained static deliverable (index.html, game.js, CSS, themes/).
- §§31.4–31.5 are informational (versioning, npm publishing) — nothing to
  execute.

## Appendices A–E

**STATUS: PASS**

- Reference material only (architecture map, action/trait catalogs,
  message-ID reference, grammar reference). Nothing to execute. Spot-reads
  were consistent with behavior observed during the run.

---

# Run Summary

**Result: CLEAN. All 31 chapters PASS. Zero BLOCKED. Zero deviations.**

- Final state: `npx sharpee build --test` → **169 tests in 17 transcripts
  (15 unit + 2 chained walkthrough files), all passed**; browser build
  (945 KB game.js + 3 wired themes) verified interactively via Playwright.
- Environment: Node v22.23.1, `@sharpee/devkit@2.1.1`, platform
  `@sharpee/*@2.1.1` (book v2.0.0 PDF).
- Every issue found was either pre-accepted (CLI hint drift; Ch. 28
  read-along; transitive package resolution) or a minor ambiguity a literal
  reader can resolve from the book's own conventions, logged per chapter.
  The two worth an editor's eye, neither blocking:
  1. **Ch. 7 §7.1** — the `lunchbox` snippets read as illustrative but are
     never flagged with the promised "nothing to type" marker (§0.6 says the
     chapter will say so "wherever one could pass for real code").
  2. **Ch. 25 §25.5** — the to-be-typed `zoo.ambience` renderer listing
     depends on `const renderer = client.getChannelRenderer();`, a line that
     appears only inside the preceding example explicitly marked "nothing to
     type."
- The known transcript-header quirk (missing `---` in the printed wt-02) did
  not manifest: the chain ran and its directives were honored.
