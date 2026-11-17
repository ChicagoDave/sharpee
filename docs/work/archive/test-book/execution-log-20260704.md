# Execution Log — The Sharpee Author and Developer Manual (v2.0.0)

**Tester role:** first-time Sharpee author, executing the book literally, front to back, in one project.
**Book:** `~/repos/test-book/the-sharpee-book-v2.0.0.pdf` (347 pp). Text extracted with `pdftotext -layout` for reading; code was cross-checked against the PDF pages when extraction looked ambiguous.
**Environment:** Linux (headless container), no browser.

---
## Chapter 1 — Installing Sharpee: The CLI and Your First Project
**STATUS: PASS-WITH-ISSUES**

- **Environment note (not a book defect):** `npm install -g @sharpee/devkit` (§1.4) failed in this container with `npm error The operation was rejected by your operating system … permissions` because the default global prefix `/usr/local` is root-owned. Worked around with a user-level prefix (`npm config set prefix ~/.npm-global`). The book might warn that global installs can need elevated permissions, but this is standard npm behavior.
- **§1.7 "Playing it":** the book says `sharpee init-browser  # adds src/browser-entry.ts`. The command actually creates *four* things — `src/browser-entry.ts`, `src/version.ts`, `browser/my-zoo.css`, and edits to `package.json` — and its own output tells you to run `npm install` again ("Install the browser runtime deps"), which the book never mentions. In practice `sharpee build` succeeded without the extra `npm install`, so no breakage, but the book's description of what the command does is incomplete.
- **§1.6 vs. CLI output:** `sharpee init` prints "Next steps: … `npm run build`" while the book teaches `sharpee build`. Both exist; a literal reader may wonder which is canonical.
- Everything else matched: `sharpee init my-zoo -y` scaffolded exactly the four files listed in §1.5; `sharpee build` produced `dist/index.js` and `dist/my-zoo.sharpee`; after `init-browser`, build emitted `dist/web/` with a static `index.html`. Plain `sharpee` prints help as §1.2/§1.8 claim.
- **Headless substitution (applies to whole run):** this box has no browser, so "serve `dist/web/` and play" steps are verified via transcript tests instead, using the testing mechanic the book introduces in Chapter 2 (§2.9). Logged once here per test protocol. (Chapters 24–27 will use Playwright per the run instructions.)

## Chapter 2 — Your First Room: Entities, Traits, and the World
**STATUS: PASS**

- Replaced the scaffolded `src/index.ts` with the chapter's file (imports, config, `FamilyZooStory` class, exports) exactly as printed. `sharpee build` compiled clean. The book's §2.3 aside accurately describes how the scaffold stub differs from the book's file.
- Wrote `tests/transcripts/first-room.transcript` verbatim (§2.9) and ran `npx sharpee build --test`: all 5 commands PASS, output matches the book's sample run almost word for word.
- Minor cross-reference gap: `build --test` (introduced §2.9) is absent from the §1.8 "CLI at a glance" table, and `sharpee`'s own help lists `test` under "Reserved (later)" even though `build --test` works today. Not blocking, but a literal reader scanning §1.8 or the help won't find the testing flag documented.
- Note: the chapter imports `SceneryTrait` but this version never constructs one (scenery is done via `EntityType.SCENERY`); compiles fine, and §5.3 later explains when the trait is added by hand.

## Chapter 3 — The Play Loop: How a Turn Works
**STATUS: PASS**

- Conceptual chapter; the text itself says "You won't write any new code here." Nothing to execute or test. The one code block (§3.2.4) is explicitly labeled illustrative. No issues.

## Chapter 4 — Rooms & Navigation: Exits Wired in Pairs
**STATUS: PASS**

- Replaced `initializeWorld` with the chapter's complete listing (§4.4) and merged `Direction` into the world-model import as instructed. Compiled first try; `navigation.transcript` (§4.8) passed 7/7, and the Chapter 2 test still passes (12/12 total).
- The full listing changes the ticket booth's description wording from Chapter 2 ("…window reading \"Self-Guided Tours…\"" vs. Chapter 2's two-sentence version) without calling it out, but both transcript assertions still pass, so no reader harm.
- Ambiguity resolved (harmless): the illustrative snippets in §4.1/§4.2 use variable names (`entranceRoom`, `mainPathRoom`) that never appear in the final §4.4 listing. I treated them as illustrative only, which the chapter's flow supports.

## Chapter 5 — Scenery & Portable Objects
**STATUS: PASS**

- Added the souvenir penny (§5.1) and the §5.7 listing (iron fence, rabbits, zoo map, animal feed) at the end of `initializeWorld` before player placement, per the §0.6 convention. The chapter helpfully flags that the fence appears twice (once in §5.2, once in §5.7) and says "add it once" — followed that.
- `scenery-and-items.transcript` (§5.9): 12/12 PASS; whole suite 24/24.
- Ambiguity resolved (minor): the penny's placement is only shown inside the §5.1 code block (`world.moveEntity(penny.id, mainPath.id)`) and §5.7's prose confirms "the souvenir penny from earlier in the chapter sits on the Main Path", but the §5.7 "putting it together" listing itself omits the penny. A literal reader assembling only from the §5.7 listing would miss it and the `> take penny` test would fail. I included the §5.1 block.

## Chapter 6 — Containers & Supporters: What Holds What
**STATUS: PASS**

- Added `SupporterTrait` to the trait import (§6.3) and the backpack, feed dispenser, and park bench code blocks at the end of `initializeWorld`. Compiled clean; `containers.transcript` (§6.7) 12/12 PASS; suite 36/36.
- No ambiguities: each code block states its room, and the §0.6 placement convention covers the rest.

## Chapter 7 — Openable Things, Locked Doors & Keys
**STATUS: PASS**

- Added `OpenableTrait, LockableTrait, DoorTrait` to the import (§7.4) and the full puzzle listing (supply room, shelves, keycard, staff gate, exits). Per §0.6 and the listing's own comment ("This replaces the Main Path exits from Chapter 4"), deleted the old Main Path exits assignment. `locked-gate.transcript` (§7.6) 8/8 PASS; suite 44/44.
- Ambiguity resolved (minor): the keycard block places the key at the entrance, but the "Try it" starts with `> take keycard` at the entrance — consistent, no issue. The §7.1 lunchbox/juice code is illustrative (no lunchbox exists in the zoo); the chapter never asks you to add it. A literal reader could wonder; the prose context ("Here's a wrinkle you'll hit") makes it example-only.

## Chapter 8 — Light & Dark: What the Player Can See
**STATUS: PASS**

- Added `LightSourceTrait, SwitchableTrait` imports (§8.7), the flashlight (§8.4, placed in the Supply Room by its own `moveEntity`), the nocturnal exhibit, the Supply Room exits replacement (old Chapter 7 assignment deleted per §0.6), and the three animals. `light-and-dark.transcript` (§8.9) 16/16 PASS; suite 59/59.
- Ambiguity resolved (same shape as Chapter 5): the flashlight's code lives only in the §8.4 body text, not in the §8.7 "wiring it into the zoo" listing; §8.7's closing prose ("The flashlight from earlier in the chapter sits in the Supply Room") tells you it must be added. A reader who types only the §8.7 listing would miss it. This "code introduced mid-chapter, referenced by the assembly section" pattern works but relies on careful reading.

## Chapter 9 — The Map & Regions: Grouping Rooms
**STATUS: PASS**

- Typed in the `createRegion` pair at the top of `initializeWorld` ("before the rooms", §9.2) and the six `assignRoom` calls after the rooms exist (placed at the end of world-building per §0.6, since §9.2 only says "after the rooms exist"). Compiled clean; full suite still 59/59. No Try-it/Test-it in this chapter.
- Ambiguity resolved: §9.4's `registerEventHandler` snippet has an empty body and the prose says you react to region events "exactly the way you'll react to any event in Volume IV" — treated it as illustrative and did not add it. If the author intended it to be typed in, the chapter should say so explicitly.

## Chapter 10 — The Standard Actions: The Four-Phase Model
**STATUS: PASS**

- Conceptual chapter ("You won't write an action in this chapter"). The one code block is the illustrative Action shape. Nothing to execute; suite still green. No issues.

## Chapter 11 — Scope & Visibility: What the Player Can Reach
**STATUS: PASS**

- Conceptual chapter, no code to type, no Try-it/Test-it. No issues.

## Chapter 12 — Readable Objects & Switchable Devices
**STATUS: PASS**

- Added the `ReadableTrait` import (chapter intro explicitly warns not to re-import `SwitchableTrait` — good catch by the author), then the plaque, brochure, and radio blocks in `initializeWorld`. `readables.transcript` (§12.7) 16/16 PASS; suite 75/75.
- No ambiguities: the intro states the snippets "go in initializeWorld, alongside the rooms you've built since Chapter 4" and names the room variables used.

## Chapter 13 — Event Handlers: Reacting to What Happens
**STATUS: PASS**

- Added class ID fields, gift shop + souvenir press (Aviary exits replaced per the listing's comment; old assignment deleted per §0.6), ID recording, and `onEngineReady` with both `chainEvent` handlers. `event-handlers.transcript` (§13.8) 11/11 PASS; suite 86/86.
- Ambiguity resolved (per §0.6): §13.4 shows `import { GameEngine } from '@sharpee/engine';` as a separate line, but the file already imports from `@sharpee/engine`; merged `GameEngine` into the existing import as the conventions instruct. Same for `IWorldModel` (world-model). `ISemanticEvent` from `@sharpee/core` is genuinely new — first mention of the `@sharpee/core` package outside Under-the-Hood boxes; it compiles, but the package's existence as a direct dependency is assumed rather than stated.
- Note: §13.4's skeleton comment says "createPlayer / initializeWorld / onEngineReady …" which is the only placement guidance for where `onEngineReady` sits in the class; combined with §0.6 ("registrations go at the end of onEngineReady") this was enough.

## Chapter 14 — Custom Actions: Teaching the Parser New Verbs
**STATUS: PASS**

- Added the stdlib/parser/language imports (`ISemanticEvent`, `IdentityTrait`, `IFEntity`, `EntityType` were already imported — merged per §0.6), the two action consts at top level as instructed, the camera in the gift shop, and the three registration methods on the class. `custom-actions.transcript` (§14.8) 11/11 PASS; suite 97/97.
- Ambiguity resolved: §14.1's `feedAction` skeleton references an undefined `hasRequiredItem` — clearly illustrative, since §14.2 opens "Here's the feed action in full." A very literal reader might type the §14.1 block first and hit a compile error; the chapter never explicitly says "don't type this one".
- Note: the chapter uses `import type` for `Parser`/`LanguageProvider` from `@sharpee/parser-en-us`/`@sharpee/lang-en-us` — first appearance of both packages and of the `import type` syntax (not covered in the Chapter 1 primer). Compiled fine.

## Chapter 15 — Capability Dispatch: One Verb, Many Rules
**STATUS: PASS**

- Added the capability-dispatch imports (merged into the existing world-model import per §0.6), `PettableTrait`, `PetMessages`, `pettingBehavior`, `PETTING_ACTION_ID`, `pettingAction` at top level; updated `getCustomActions`; added pet/stroke grammar; added the four pet messages; gave goats/rabbits `PettableTrait`, created the parrot, and registered the behavior at the end of `initializeWorld` as §15.3 instructs. `petting.transcript` (§15.7) 8/8 PASS; suite 105/105.
- Ambiguity resolved (ordering): §15.3 defines `PETTING_ACTION_ID` *after* §15.2.2's behavior but *before* the action that uses it; the registration snippet in §15.2.3 also references it before its definition appears. Top-level `const` hoisting rules make file order matter for module-init-time references, but since all uses are inside functions it compiles in any order. A literal reader pasting blocks in chapter order ends up fine, but the chapter never states a required file order for these five top-level declarations.

## Chapter 16 — Custom Traits & Behaviors: Data and Logic, Kept Apart
**STATUS: PASS**

- Created `src/dispenser-trait.ts` and `src/dispenser-behavior.ts` exactly as printed (including the `.js` extension on the relative import, which the chapter explains). Build clean; suite still 105/105. The chapter's "honest note" (§16.4) explicitly says the pair isn't wired into the zoo, so no Try-it/Test-it — appreciated candor.
- Ambiguity resolved (minor): §16.2 shows `dispenser.add(new DispenserTrait({ chargesRemaining: 5 }))` as "how you'd add it", but since §16.4 says the zoo doesn't wire this up, I did not add that line to `initializeWorld` (doing so would also require an import into index.ts the book never shows). A literal reader could go either way; the chapter would benefit from one sentence saying "don't add it to the dispenser yet."

## Chapter 17 — Extending the Grammar: Teaching New Sentence Shapes
**STATUS: PASS**

- Explanatory chapter; every snippet re-shows grammar the project already registered in Chapter 14 (`feed :thing`, the photograph aliases) or presents hypotheticals ("Suppose feeding should name both…", §17.5; the `.where` variant, §17.6). Nothing new to type; suite unchanged and green.
- Ambiguity resolved: §17.5/§17.6 snippets define alternative feeding patterns (`feed :food to :animal`, `feed :animal` with `.where`) that would coexist with Chapter 14's `feed :thing` if typed in. The "Suppose…"/"You can…" framing signals illustration, but a literal reader might add them; the chapter never says "don't add these to the zoo."

## Chapter 18 — The Language Layer: Messages & Message IDs
**STATUS: PASS**

- Explanatory chapter; both code blocks re-show text already registered in Chapter 14. Nothing to type or test. No issues.

## Chapter 19 — The Phrase Algebra
**STATUS: PASS**

- Explanatory chapter; all snippets are illustrative (they reference `animal`, `gate`, `ZooMessages`, and an `Optional`/`Choice` wiring that exists nowhere in the zoo project). Nothing to type; suite unchanged and green.
- Note for the author: a literal reader can't run any of §19.9's `Optional`/`Choice` code without inventing a `ZooMessages` object and a `GATE_STATUS` template that the book never defines. Fine as a reference chapter, but it's the third chapter in a row (17–19) where "type this" vs. "read this" is implicit only.

## Chapter 20 — Non-Player Characters: Actors That Take Turns
**STATUS: PASS**

- Added the NPC imports (`NpcTrait` → world-model, `NpcPlugin` → new `@sharpee/plugin-npc` package, behavior types → stdlib), `PARROT_PHRASES`/`parrotBehavior` as top-level consts, the zookeeper entity, the parrot's `NpcTrait`, extended `roomIds` (type + recording block) exactly as §20.4's prose instructs, and the plugin block at the top of the existing `onEngineReady`. `npcs.transcript` (§20.6) 7/7 PASS (including the timing-sensitive "wait → The zookeeper leaves to the east"); suite 112/112.
- Good chapter for a literal reader: it explicitly says where each piece goes ("top-level const", "at the top of that existing method; don't declare a second one") and warns about the patrol id override. The `@sharpee/plugin-npc` package resolved without any npm install, so the scaffold's dependency set covers it.

## Chapter 21 — Scenes: Named Windows of Story Time
**STATUS: PASS**

- Added the final `createScene('scene-petting-zoo', …)` form with `onBegin`/`onEnd` to `initializeWorld` — the chapter is explicit that this replaces the bare §21.2 version ("type in only this final form"), which prevented a duplicate-registration mistake. `scenes.transcript` (§21.7) 4/4 PASS; suite 116/116.
- The `SceneTrait` import mentioned in §21.2 is only needed for the illustrative storm example (§21.5), which the zoo never builds — did not add it (nothing in the typed-in code references it; adding it would create an unused import). Slightly confusing that the chapter says "the one symbol you import is SceneTrait" when the project code needs no import at all.

## Chapter 22 — Turns, Timed Events & Daemons
**STATUS: PASS**

- Added the `@sharpee/plugin-scheduler` imports (value + type), `TimedMessages` "near the top of your story module", the three factory functions, the scheduler registration in `onEngineReady` (after the NPC block, as the snippet's placeholder comment implies), and the six messages in the existing `extendLanguage` (the chapter reminds you a story has just one — good). `timed-events.transcript` (§22.7) 15 commands / 18 assertions all PASS, including the fuse's skip-first-tick timing the book warns about; suite 131/131.
- Ambiguity resolved (minor): the chapter never says where the three `function create…()` declarations go. Function hoisting makes any placement work; I put them at top level after `TimedMessages`. One sentence ("top-level functions, like the action consts") would remove the doubt.

## Chapter 23 — Scoring & Endgame: Winning the Game
**STATUS: PASS-WITH-ISSUES**

- All wiring done: scoring tables + victory daemon at top level, `setMaxScore(75)` in `initializeWorld`, `entityIds` extended with `zooMap`/`brochure` (the chapter says to record them "the same way Chapter 13 stored the feed and penny ids" — type extension is left to the reader), awards added to petting/photograph/feeding executes and the penny-press chain, three scoring chain handlers and `createVictoryDaemon()` registered in `onEngineReady`, victory text in `extendLanguage`. `scoring.transcript` 28 commands / 32 assertions all PASS — the game is winnable at exactly 75; suite 159/159.
- **Issue (reader must compose code):** §23.3 prints only a fragment for the feeding award ("`// inside the feeding action's execute(), keyed on which animal was fed:`" plus the goat call and a comment saying do the rabbits "the same way"). The reader must write the goats/rabbits branch themselves; the victory depends on it (miss it and the game caps below 75 — the book admits this). First time in the book that required, load-bearing code is not printed in full. I composed it by mirroring the `report()` phase's `name.includes(...)` branching.
- **Issue (leaked editorial notes in a printed listing):** the §23.6 transcript listing contains stray comment lines that read like the author's own revision notes, not reader-facing content: `# press a penny, read ..."); expanded to the full 12 achievements.` and `# "> south; east" compound split as before.` (garbled, unbalanced quotes), plus a mid-file comment saying the victory fires "not on the later `score` command as the book's Try-it annotation implies" — i.e., the test file contradicts the chapter's own §23.5 Try-it. I omitted the two garbled header lines, kept the rest; everything passed.
- Minor: §23.5's Try-it shows `> score` replying "You have achieved a perfect score of 75 points!" — actual output does contain "perfect score of 75 points", so the assertion passes; the quoted reply is close but not verbatim-checkable from the Try-it alone.

## Chapter 24 — Channels: The Universal UI Surface
**STATUS: PASS**

- Added the `@sharpee/if-domain` type import, `AMBIENCE_BY_ROOM`, and the `registerChannels` hook with the `zoo.ambience` channel. Build clean; transcript suite unaffected (159/159).
- **Playwright substitution (headless):** verified in Chromium against `dist/web` served with `python3 -m http.server` — the channel emits and the mood line appears in the Aviary ("The air is alive with birdsong…") and blanks (`''`) on leaving, exactly the sparse-replace semantics §24.6 explains. No console errors.
- No Try-it/Test-it in the chapter itself; it defers the visible half to Chapter 25 ("its browser entry registers a renderer… The chapters ahead build on that concrete example").

## Chapter 25 — The Web Client: A Framework-Free UI
**STATUS: PASS**

- Added the `zoo.ambience` renderer registration to `src/browser-entry.ts` after `connectEngine` / before `client.start()` — the scaffold's own header comment ("Add any story-specific channel/audio renderers before `client.start()`") plus §25.5's "available from connectEngine onward" pins the spot. Build clean.
- **Playwright verification:** page boots (prose shows Zoo Entrance; status line shows ZOO ENTRANCE / Score: 0 | Turns: 1), commands flow through the input box, and the custom `#zoo-ambience` element is created and painted by the override renderer. No page errors.
- Ambiguity resolved: §25.1's `BrowserClient` listing differs from the scaffolded `browser-entry.ts` (`zoo-sunny` theme, `authors: 'You'`, `familyzoo-` prefix vs. the scaffold's `modern-dark`/`my-zoo-`). §25.1 says "You rarely write this by hand", so I treated the listing as descriptive and left the scaffold untouched except for the renderer. A literal reader might instead rewrite their entry to match the listing — which references a `zoo-sunny` theme that won't exist until Chapter 26 defines themes.
- Ambiguity resolved: the §25.5 `score` renderer override (★ display) is presented as the "replace an existing channel" example; nothing marks it as zoo code and no later test depends on it, so I did not add it.

## Chapter 26 — Decoration & Theming
**STATUS: PASS**

- Added the `zoo-sunny` token block and the two flourish rules to `browser/my-zoo.css` (the file the chapter correctly notes is named after the package name, not the story id), and the `sharpee.themes` entry to `package.json`. Build reports "Wired 3 theme(s): modern-dark, paper, zoo-sunny".
- **Playwright verification:** Settings → Theme menu lists Classic / Modern Dark / Paper / Zoo Sunny; selecting Zoo Sunny sets `data-theme="zoo-sunny"`, body background becomes `rgb(255, 250, 240)` (#fffaf0) and `--theme-accent` resolves to `#4a9d52`; choice persists across a reload via localStorage, all exactly as §26.3–§26.4 describe.
- No issues. The decoration bracket syntax (§26.1–26.2) has no zoo exercise; informational only.

## Chapter 27 — Media & Audio: Sight and Sound as Channels
**STATUS: PASS**

- Added `AudioRegistry` (+ top-level `audio` const), the two atmosphere declarations in `initializeWorld`, the `mediaEvent`/`emit` helpers, the effect-returning `if.event.actor_moved` handler in `onEngineReady`, `createAmbientChannel('environment')` in `registerChannels`, and the `ambient:environment` renderer in the browser entry. Build clean; transcript suite 159/159.
- **Playwright verification:** walking into the Aviary causes the browser to request `/audio/aviary-birdsong.mp3` — the full engine→channel→renderer→AudioManager pipeline fires. No asset shipped, so it 404s exactly as §27.4 promises ("silent, not broken"). No page errors.
- Ambiguity resolved (placement, same pattern as Ch22): the `mediaCounter`/`mediaEvent`/`emit` helpers have no stated home; put them at top level. Also merged `createAmbientChannel` into the existing stdlib import per §0.6 rather than adding the separate import line the chapter prints.
- Note: §27.6's closing paragraph describes snapshot features (feed crunch, shutter click, after-hours music) whose code is never printed; a reader cannot reproduce those from the book. Informational, but the boundary between "the snapshot has this" and "you just built this" blurs here.

## Chapter 28 — The Multi-File Story: Putting It All Together
**STATUS: BLOCKED**

- **The chapter cannot be executed from the book alone.** §28.2 says outright: "this chapter walks their structure rather than reprinting every line, so open them on GitHub alongside as we go." The seven-file split's actual code lives only in the companion repository (`tutorials/familyzoo/v2.0.0/src/ch28-multi-file/`). The printed fragments are skeletons with elided bodies (`// create rooms, wire exits, add scenery`) — nowhere near enough to perform the refactor by typing.
- **The after-hours second act (§28.5) is entirely un-printed:** `createAfterHoursDaemons`, `parrotAfterHoursBehavior`, the behavior-swap daemon (`npcService.removeBehavior(...)`), and the 25-point bonus tier are all described but no code is given. A reader without the repo cannot build any of it.
- **DEVIATION:** kept the single-file `src/index.ts` project as-is (no split, no after-hours act). This is the null deviation — nothing was changed — but it means: (a) the project stays at 75 max points, not 100; (b) Chapter 29's suggested after-hours `[GOAL]` bracket can't be exercised; (c) any later reference to the seven-file layout or Act 2 is untestable in this run.
- Recommendation for the author: either print the split (even abridged) or explicitly label Chapter 28 a read-only tour. As written it breaks the book's own §0.5 promise that "anything you read here, you can run."

## Chapter 29 — Transcript Testing & Walkthroughs
**STATUS: PASS-WITH-ISSUES**

- Pleasant surprise: §29.0 claims "by now npx sharpee build --test replays fourteen recorded sessions" — my suite had exactly 14 transcripts at that point. The book's bookkeeping is accurate.
- Added the one printed transcript (§29.1, "Feed the goats") — the chapter gives no filename, so I chose `tests/transcripts/feed-goats.transcript` (ambiguity logged). Suite now 163 assertions / 15 transcripts, all green.
- **Issue (features taught but never exercised):** the `[EVENT: …]` / `[STATE: …]` assertion layers (§29.3), `[FAIL:]`/`[SKIP]`/`[TODO:]`, the control-flow directives (§29.4), the `entry:` header, `$save`/`$restore`, and walkthrough chaining (`walkthroughs/wt-*.transcript`) are all described but the book never has the reader write or run one. In this literal run they remain unverified. The §29.4 after-hours `[GOAL]` example additionally depends on the un-buildable Chapter 28 act.
- `npx sharpee build --test --stop-on-failure` (§29.5) accepted without error.

## Chapter 30 — Saving & Restoring: State Lives in the World
**STATUS: PASS**

- No code to type for the single-file project: the chapter's one listing (the `behaviorSwapped` runner-state hooks) belongs to the ch28 multi-file snapshot, which Chapter 28 already established is repo-only. Our own daemons (Ch22/23) already implemented `getRunnerState`/`restoreRunnerState` as printed.
- **Playwright verification of §30.3:** after `take map` + `south`, localStorage holds `my-zoo-save-autosave` (plus `my-zoo-theme`, `my-zoo-saves-index`); reopening the page restores mid-game — location MAIN PATH, zoo map still in inventory — with zero story code, exactly as claimed.

## Chapter 31 — Building & Publishing: The Single-Player Browser Client
**STATUS: PASS**

- All commands (§31.1–31.3) had already been run in Chapters 1–2 and re-verified here: `sharpee build` emits `dist/index.js` + `dist/my-zoo.sharpee` + `dist/web/`; `python3 -m http.server -d dist/web` serves it.
- **Playwright verification of the §31.2 claim** "no server, no build step, no runtime dependency: open index.html and the game runs": loaded `file:///…/dist/web/index.html` directly — game boots, prose renders, no page errors. Claim holds.
- §31.4/§31.5 (versioning, npm publishing) are descriptive; nothing executable for a reader without publishing intent. No issues.

## Appendices A–E
**STATUS: PASS (reference only)**

- Architecture map, action catalog, trait catalog, message-ID reference, grammar reference. No executable instructions (verified by scan); not exercised beyond what the chapters already covered.

---

# Run Summary

**Environment:** headless Linux container, Node v22.23.1, npm 11.18.0, `@sharpee/devkit` (installed to a user prefix). One project (`~/repos/my-zoo`) carried front to back. Browser chapters verified with Playwright + Chromium against `dist/web`.

**Final state:** the single-file Family Zoo builds clean, all **163 transcript assertions in 15 transcripts pass**, the game is winnable at exactly 75 points, and the web client boots (server and `file://`), themes, autosaves/restores, renders the custom channel, and fires the ambient-audio pipeline.

## Chapter scoreboard

| Ch | Status | Ch | Status |
|----|--------|----|--------|
| 1 | PASS-WITH-ISSUES | 17 | PASS |
| 2 | PASS | 18 | PASS |
| 3 | PASS | 19 | PASS |
| 4 | PASS | 20 | PASS |
| 5 | PASS | 21 | PASS |
| 6 | PASS | 22 | PASS |
| 7 | PASS | 23 | PASS-WITH-ISSUES |
| 8 | PASS | 24 | PASS |
| 9 | PASS | 25 | PASS |
| 10 | PASS | 26 | PASS |
| 11 | PASS | 27 | PASS |
| 12 | PASS | 28 | **BLOCKED** |
| 13 | PASS | 29 | PASS-WITH-ISSUES |
| 14 | PASS | 30 | PASS |
| 15 | PASS | 31 | PASS |
| 16 | PASS | App. A–E | PASS (reference) |

## Where the book fails a literal reader (ranked)

1. **Chapter 28 is un-executable from the text** — the seven-file split and the entire after-hours second act exist only in the companion GitHub repo; the printed fragments are skeletons. Chapters 29–30 then reference that act (`[GOAL]` example, the behavior-swap daemon) as if the reader has it. This is the single hard break in an otherwise remarkably executable book.
2. **Chapter 23 asks the reader to compose required code** — the goats/rabbits feeding award is given as a fragment plus "wire them up the same way"; get it wrong and the game is silently unwinnable. Also, the printed §23.6 test listing contains leaked editorial comments (garbled quotes) and a comment contradicting the chapter's own Try-it timing note.
3. **The "code introduced mid-chapter, omitted from the assembly listing" pattern** (penny in Ch5, flashlight in Ch8) — the final listings don't include items the Try-it/Test-it require; only a prose sentence points back at them. A skimming reader's tests fail.
4. **Illustrative vs. type-this is implicit throughout** — §14.1's skeleton won't compile if typed (`hasRequiredItem` undefined); §16.2's `dispenser.add(...)`, §17.5/17.6's alternative grammar, §9.4's empty handler, and §25.5's score override all invite a literal reader to type code the project shouldn't contain. Nothing broke in this run, but each required a judgment call (all logged in the chapter entries).
5. **Small doc/tool drift in Chapter 1** — `init-browser` creates four things (book says one) and suggests an `npm install` the book omits; `build --test` is absent from the §1.8 CLI table and listed as "Reserved" in the CLI's own help.
6. **Chapter 29 teaches assertion layers and walkthrough chaining it never has the reader exercise** — `[EVENT:]`, `[STATE:]`, control flow, `$save`/`$restore` are all unverified by a literal read-through.

## What held up impressively

- Every Test-it transcript in Chapters 2–27 passed **verbatim on first run** — 163 assertions, zero failures across the whole run, including timing-sensitive scheduler tests and the 75-point victory walkthrough.
- The §0.6 conventions (merge imports, end-of-initializeWorld placement, replace-old-listings) resolved nearly every placement question they were designed for.
- The book's self-bookkeeping is accurate (e.g., "fourteen recorded sessions" matched the actual suite exactly at Chapter 29).
- All browser-facing claims verified true under Playwright: channel manifest/packet flow, custom renderers, theme tokens + persistence, autosave-per-turn, ambient audio request, `file://` bootability.
