# Execution Log — The Sharpee Author and Developer Manual (v2.0.0)

Acceptance test run, literal front-to-back execution. Environment: headless
Linux container, Node v22.23.1, npm 11.18.0. Project: `~/repos/book-test/my-zoo`.

---

## Chapter 1 — Installing Sharpee: The CLI and Your First Project

**STATUS: PASS**

- All commands ran as written: `npm install -g @sharpee/devkit`, `sharpee init
  my-zoo -y`, `npm install`, `sharpee build`, `sharpee init-browser`,
  `npm install` (init-browser output suggested it, book §1.7 says to do so),
  `sharpee build` (emitted `dist/web/`).
- §1.7 "Playing it": this box is headless, so instead of opening the page in a
  browser I verified `python3 -m http.server -d dist/web` serves `index.html`
  (HTTP 200; a non-default port was used to avoid conflicts). Interactive
  browser play will be substituted throughout by transcript tests using the
  testing mechanic the book introduces in Chapter 2 (substitution logged once
  here, per test protocol).

## Chapter 2 — Your First Room: Entities, Traits, and the World

**STATUS: PASS**

- Typed the full `src/index.ts` exactly as assembled in §2.3–§2.7 (replacing
  the scaffold stub, as §2.3's prose anticipates). Created
  `tests/transcripts/first-room.transcript` per §2.9.
- `npx sharpee build --test` compiled and ran the transcript: 5/5 PASS,
  matching the book's printed output exactly.

## Chapter 3 — The Play Loop: How a Turn Works

**STATUS: PASS**

- Conceptual chapter; the text says "You won't write any new code here."
  Nothing to execute. The one code snippet (§3.2.4) is explicitly flagged
  illustrative.

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs

**STATUS: PASS**

- Added `Direction` to the world-model import (§4.4), replaced
  `initializeWorld` with the chapter's complete listing (replacement rule),
  created `tests/transcripts/navigation.transcript` (§4.8).
- `npx sharpee build --test`: 12/12 PASS (first-room 5, navigation 7).

## Chapter 5 — Scenery & Portable Objects

**STATUS: PASS**

- Added the souvenir penny (§5.1) and the §5.7 block (fence, rabbits, zoo map,
  animal feed) at end of `initializeWorld` per the placement rule. §5.7's
  parenthetical correctly warns the fence appears twice in the chapter, add it
  once. Created `scenery-and-items.transcript`.
- `npx sharpee build --test`: 24/24 PASS.

## Chapter 6 — Containers & Supporters

**STATUS: PASS**

- Added `SupporterTrait` to the trait import (§6.3), added backpack (§6.2),
  feed dispenser (§6.2.1), park bench (§6.3) at end of `initializeWorld`.
  Created `containers.transcript`.
- `npx sharpee build --test`: 36/36 PASS.

## Chapter 7 — Openable Things, Locked Doors & Keys

**STATUS: PASS**

- Added `OpenableTrait, LockableTrait, DoorTrait` imports (§7.4); typed the
  §7.4 puzzle block (Supply Room, shelves, keycard, staff gate, exits via
  gate) at end of `initializeWorld`; deleted the Chapter 4 Main Path exits
  assignment per the replacement rule as instructed. Lunchbox snippets
  (§7.1–7.2) correctly flagged illustrative. Created `locked-gate.transcript`.
- `npx sharpee build --test`: 44/44 PASS.

## Chapter 8 — Light & Dark

**STATUS: PASS**

- Added `LightSourceTrait, SwitchableTrait` imports (§8.7), the flashlight
  (§8.4) and nocturnal exhibit block (§8.7) at end of `initializeWorld`;
  replaced Chapter 7's Supply Room exits table per the replacement rule.
  Created `light-and-dark.transcript`.
- `npx sharpee build --test`: 59/59 PASS.

## Chapter 9 — The Map & Regions

**STATUS: PASS**

- Typed the `createRegion` pair at the start of `initializeWorld` ("before
  the rooms that belong to them", §9.2) and the `assignRoom` block at the end
  (placement rule). §9.4 handler and §9.5 nesting/query snippets are
  illustrative — nothing typed. No Try it/Test it in this chapter.
- `npx sharpee build --test`: still 59/59 PASS.

## Chapter 10 — The Standard Actions

**STATUS: PASS**

- Conceptual; "You won't write an action in this chapter." Action-shape
  listing is illustrative. Nothing to execute.

## Chapter 11 — Scope & Visibility

**STATUS: PASS**

- Conceptual; no code to type, no Try it/Test it.

## Chapter 12 — Readable Objects & Switchable Devices

**STATUS: PASS**

- Added `ReadableTrait` import (chapter intro), typed the info plaque (§12.2),
  brochure (§12.3), and radio (§12.4) at end of `initializeWorld`. §12.1
  snippet is the shape-only preview of the plaque, not typed separately.
  Created `readables.transcript`.
- `npx sharpee build --test`: 75/75 PASS.

## Chapter 13 — Event Handlers

**STATUS: PASS**

- Added `GameEngine` / `ISemanticEvent` / `IWorldModel` imports (§13.4),
  the two private ID class fields, the Gift Shop + souvenir press block at
  end of `initializeWorld` (deleting Chapter 4's Aviary exits per the
  replacement rule), and `onEngineReady` with both `chainEvent` handlers
  (§13.5, §13.6). §13.2 sketches are shape-previews of §13.5's real code.
  Created `event-handlers.transcript`.
- `npx sharpee build --test`: 86/86 PASS.

## Chapter 14 — Custom Actions

**STATUS: PASS**

- Added the missing imports from the chapter's import block (`Action,
  ActionContext, ValidationResult` from stdlib; `Parser` from parser-en-us;
  `LanguageProvider` from lang-en-us). Typed `feedAction` (§14.2) and
  `photographAction` (§14.3) as top-level consts, the camera in the gift shop,
  and the three registration methods (§14.4–14.6) as class members. §14.1
  skeleton correctly flagged as non-compiling schematic — not typed. Created
  `custom-actions.transcript`.
- `npx sharpee build --test`: 97/97 PASS.

## Chapter 15 — Capability Dispatch

**STATUS: PASS**

- Added the capability-dispatch imports (chapter intro), `PettableTrait`,
  `PetMessages`, `pettingBehavior`, `pettingAction` as top-level code,
  extended `getCustomActions`/`extendParser`/`extendLanguage` (§15.3), added
  the animals + parrot + `registerCapabilityBehavior` at end of
  `initializeWorld` (§15.3–15.4). Created `petting.transcript`.
- Ambiguity (minor, resolved): §15.2.3 says registration happens "in
  initializeWorld" with the snippet shown before the animals exist, while
  §15.3 says it "runs once at the end of initializeWorld, after the animals
  exist" — I placed it after the §15.4 animal block, which works.
- `npx sharpee build --test`: 105/105 PASS.

## Chapter 16 — Custom Traits & Behaviors

**STATUS: PASS**

- Created `src/dispenser-trait.ts` (§16.2) and `src/dispenser-behavior.ts`
  (§16.3). Chapter explicitly leaves the pair unwired ("nothing in index.ts
  changes in this chapter"); §16.2's `dispenser.add(...)` line and §16.4
  caller are illustrative. Both files compile alongside the story.
- `npx sharpee build --test`: 105/105 PASS.

## Chapter 17 — Extending the Grammar

**STATUS: PASS**

- Conceptual review of grammar already typed in Chapters 14–15; new snippets
  (`feed :food to :animal`, `.where` constraint) are framed as "suppose"/"you
  can" shapes, not zoo additions — nothing typed. No Try it/Test it.

## Chapter 18 — The Language Layer

**STATUS: PASS**

- Conceptual; snippets restate text already registered in Chapter 14.
  Nothing typed. No Try it/Test it.

## Chapter 19 — The Phrase Algebra

**STATUS: PASS**

- Conceptual; Optional/Choice examples reference entities (`gate`,
  `ZooMessages`) framed as illustrations, with no "add this" instruction and
  no Try it/Test it — nothing typed.

## Chapter 20 — Non-Player Characters

**STATUS: PASS**

- Added the chapter's imports (NpcTrait; NpcPlugin; NpcBehavior/NpcContext/
  NpcAction/createPatrolBehavior), widened `roomIds` and added the two
  recording lines (§20.4), created the zookeeper and promoted the parrot
  (§20.1), typed `parrotBehavior` top-level (§20.3), and added the plugin +
  behavior registrations at the top of the existing `onEngineReady` (§20.4).
  Created `npcs.transcript`.
- `npx sharpee build --test`: 112/112 PASS, including the turn-timing
  assertions ("leaves to the east" on the exact wait turn; parrot greeting
  on entry).

## Chapter 21 — Scenes

**STATUS: PASS**

- Typed the final `createScene` form with `onBegin`/`onEnd` (§21.4 — the
  chapter explicitly says to type only this replacement of §21.2's bare
  version) at end of `initializeWorld`. Storm example illustrative. Created
  `scenes.transcript`.
- `npx sharpee build --test`: 116/116 PASS.

## Chapter 22 — Turns, Timed Events & Daemons

**STATUS: PASS**

- Added scheduler imports, `TimedMessages` near the top of the module,
  the three factory functions, the scheduler registration block directly
  below the NPC registration in `onEngineReady` (as §22.1 instructs), and
  the six messages in `extendLanguage`. Created `timed-events.transcript`.
- `npx sharpee build --test`: 131/131 PASS, including the exact PA timing
  and the bleating-daemon countdown turns.

## Chapter 23 — Scoring & Endgame

**STATUS: PASS**

- Typed the scoring tables and `createVictoryDaemon` top-level, widened
  `entityIds` (+ two recording lines), `world.setMaxScore(75)` in
  `initializeWorld`, the awardScore additions inside the petting behavior /
  feeding action / photograph action (renamed `_context`→`context` as
  instructed) / penny-press chain, the three scoring `chainEvent` handlers at
  the end of `onEngineReady`, the daemon registration, and the victory
  message. Created `scoring.transcript` (capstone walkthrough).
- `npx sharpee build --test`: 159/159 PASS — victory fires on the exact turn
  the 75th point lands, and `score` afterwards reports the perfect-score line
  the book asserts.

## Chapter 24 — Channels

**STATUS: PASS**

- Added the `@sharpee/if-domain` type import, `AMBIENCE_BY_ROOM`, and the
  `registerChannels` hook with the `zoo.ambience` channel (§24.6 — the text
  confirms the zoo ships exactly this channel). Compiles; verified in-browser
  under Chapter 25 below.

## Chapter 25 — The Web Client

**STATUS: PASS**

- Added the `zoo.ambience` renderer to `src/browser-entry.ts` after
  `connectEngine` / before `client.start()` (§25.5); left the scaffolded
  BrowserClient config as-is per §25.1's explicit instruction. Score-star
  renderer correctly flagged "nothing to type".
- Verified with Playwright (headless substitute for browser play): opening
  prose and status line render; typed commands flow through the input box;
  the ambience line appears in the Aviary and clears on unlisted rooms;
  score/turn status updates ("Score: 5 | Turns: 4").

## Chapter 26 — Decoration & Theming

**STATUS: PASS**

- Added the `zoo-sunny` token block + two flourish rules to
  `browser/my-zoo.css` (§26.4.2) and `sharpee.themes` (modern-dark, paper,
  zoo-sunny inline entry) to package.json. Build emitted
  `dist/web/themes/{modern-dark,paper}.css`.
- Playwright: theme menu lists Classic | Modern Dark | Paper | Zoo Sunny;
  selecting Zoo Sunny flips `data-theme="zoo-sunny"` and the page background
  becomes the warm cream `#fffaf0` from the token block.

## Chapter 27 — Media & Audio

**STATUS: PASS**

- Added `AudioRegistry` (+ top-level `audio` const), the two atmosphere
  declarations in `initializeWorld`, `mediaEvent`/`emit` helpers, the
  effect-returning `if.event.actor_moved` handler in `onEngineReady`,
  `createAmbientChannel('environment')` in `registerChannels`, and the
  `ambient:environment` renderer in the browser entry (§27.6).
- No audio files shipped (the book supplies none; §27.4 says a missing src
  "fails to load... silent, not broken"). Playwright confirms the wiring:
  entering the Aviary fires a request for `audio/aviary-birdsong.mp3`
  (404s as the book predicts).

## Chapter 28 — The Multi-File Story

**STATUS: PASS**

- The book's declared read-along chapter: "there is nothing to type in this
  chapter"; code lives in the companion repository (accepted by design — this
  offline run keeps the single-file zoo, which the chapter says "keeps working
  exactly as it is for every chapter that follows").

## Chapter 29 — Transcript Testing & Walkthroughs

**STATUS: PASS**

- Added `tests/transcripts/feed-the-goats.transcript` (§29.1) and the two
  walkthrough files `wt-01-into-the-zoo` / `wt-02-feeding-time` (§29.5) in a
  new `walkthroughs/` folder. §29.1's claim that the suite holds "fourteen
  recorded sessions" by this point is exactly right (14 unit files before this
  chapter's addition).
- `npx sharpee build --test`: walkthroughs run chained first, then 15 unit
  files; 169/169 PASS. `$save`/`$restore` carries state across the file
  boundary; `[EVENT: type="zoo.event.fed"]` and `[STATE: yourself.inventory
  contains bag of animal feed]` both pass, and wt-02's "20 out of 75" total
  is correct.

## Chapter 30 — Saving & Restoring

**STATUS: PASS**

- Conceptual; the behavior-swap daemon and its `getRunnerState`/
  `restoreRunnerState` fix live in the read-along ch28 multi-file snapshot,
  not the single-file zoo. Nothing to type. (The same hook pair was already
  typed into this project's PA and victory daemons in Chapters 22–23.)
  Autosave/restore was implicitly exercised by the Playwright session (the
  client autosaves per turn without story code).

## Chapter 31 — Building & Publishing

**STATUS: PASS**

- §31.1–31.3 commands re-run as written: `sharpee build` completes;
  `python3 -m http.server -d dist/web` serves `index.html` (HTTP 200; a
  non-default port used, headless box). `dist/` contains `index.js`,
  `my-zoo.sharpee`, and the self-contained `dist/web/`.

## Appendices A–E

- Reference material; nothing to execute.

---

# Summary

**All 31 chapters PASS. Zero BLOCKED. Zero deviations.**

Final state: `~/repos/book-test/my-zoo` builds clean; `npx sharpee build
--test` runs the 2-file walkthrough chain plus 15 unit transcripts —
**169/169 assertions pass**, exactly matching every "Test it" block in the
book, including turn-exact NPC/daemon timing and the 75-point victory.
Chapters 24–27 verified headlessly with Playwright (9/9 checks): channel
rendering, the story-registered ambience line, theme menu + `zoo-sunny`
reskin, and the ambient-audio wiring.

Only two ambiguities were encountered, both resolvable from the book's own
conventions and logged in place (Ch. 15 registration placement; Ch. 1
headless-play substitution). No issue outside the accepted-by-design lists
was found.
