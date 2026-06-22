# Sharpee Book — End-to-End Execution Log

Executing *The Sharpee Author and Developer Manual* from the beginning, following
the book exactly, building the Family Zoo example and testing each chapter's
"Try it" via Playwright/Chromium against the built web client.

Platform: `@sharpee/devkit@1.1.0` (reinstalled at session start), `@sharpee/sharpee@1.1.0`.

**Re-verification run (2026-06-22, platform → 1.1.1):** After the Ch 20/21 issues were
taken back to the platform repo, `@sharpee/*` were bumped to **1.1.1** (devkit reinstalled
globally; fresh `npm install` in `my-zoo`). The book was rebuilt and §21 (Scenes) was
rewritten. Per method [[execute-book-exactly-no-fixits]], Ch 20 and Ch 21 were re-transcribed
from the current book and re-tested. **Both issues are now RESOLVED** — see the ✅ notes in
the Ch 20 and Ch 21 sections below.

Convention: ✅ = chapter executed and verified against the book; ⚠️ = issue recorded.

---

## Ch 1 — Installing Sharpee & the CLI ✅
- `sharpee init my-zoo` (used `-y`; the bare command is interactive — book shows it without flags, minor).
- `npm install`, `sharpee build`, `sharpee init-browser`, `sharpee build` → `dist/web/` all succeeded.
- Playwright/Chromium harness (`harness/play.mjs`) drives the web client; starter story plays.
- Env note (not a book issue): npm global bin `/home/node/.npm-global/bin` is not on PATH in this sandbox, so `sharpee` is invoked with PATH prepended.

## Ch 2 — Your First Room ✅
- Wrote `src/index.ts` exactly per §2.3–2.7 (imports from `@sharpee/engine` + `@sharpee/world-model`). Compiled clean.
- "Try it" all match the book:
  - `look` → room description + visible scenery
  - `examine sign` / `examine booth` → their descriptions
  - `take sign` → "The welcome sign is fixed in place." (book: can't, it's scenery)
  - `inventory` → "You aren't carrying anything at all."

## Ch 3 — The Play Loop ✅ (conceptual, no code)

## Ch 4 — Rooms & Navigation ✅
- Four rooms wired with paired exits; `Direction` import added. Compiled clean.
- "Try it" (south, examine signs, east, west, west, east, north) — all rooms/exits correct, map matches §4.6.

## Ch 5 — Scenery & Portable Objects ✅
- Added penny, iron fence, rabbits, zoo map, bag of feed. Compiled clean.
- "Try it" all match: take/drop/inventory work; carried items travel; `take fence` → fixed; `take goats` → "The pygmy goats **are** fixed in place." (plural agreement correct).

## Ch 6 — Containers & Supporters ✅
- Added backpack (portable container), feed dispenser (fixed container), park bench (supporter). Compiled clean.
- "Try it" all match: put in/on, look in, contents ride along in inventory, `take dispenser` → fixed.

## Ch 7 — Openable Things, Locked Doors & Keys ✅
- Added Supply Room, shelves, keycard, staff gate (DOOR w/ 5 traits), re-wired exits with `via`. Compiled clean.
- "Try it" all match: locked gate blocks, unlock-with-keycard → open → walk through → return. Puzzle works end to end.

## Ch 8 — Light & Dark ✅
- Added Nocturnal Exhibit (isDark), sugar gliders/bush babies/barn owl, flashlight (Switchable + LightSource). Compiled clean.
- "Try it" all match: dark room blocks (grue message), switch on → lit room reveals animals, switch off → dark again.

## Ch 9 — The Map & Regions ✅ (conceptual; book says zoo is small enough to skip regions — no code added)

## Ch 10 — Standard Actions & Four-Phase Model ✅ (conceptual, no code)

## Ch 11 — Scope & Visibility ✅ (conceptual, no code)

## Ch 12 — Readable Objects & Switchable Devices ✅
- Added info plaque (readable scenery), brochure (readable item), radio (switchable scenery). Compiled clean.
- "Try it" all match: `read` ≠ `examine`; radio toggles on/off; `take radio` → fixed.
- Cosmetic note (not a book defect): single `\n` in ReadableTrait text renders as a blank line (double-spaced) in the web client; book says text is shown "as-is". Content correct.

## Ch 13 — Event Handlers ✅
- Added Gift Shop, souvenir press, `roomIds`/`entityIds` fields, and `onEngineReady` with two `world.chainEvent` handlers. Compiled clean.
- "Try it" all match: drop feed in petting zoo → goats react (chain text appended after "Dropped."); put penny in press → transformation (penny removed, pressed penny created & given to player); inventory confirms.
- `onEngineReady(engine)` IS invoked by the engine; chain events fire and append text without replacing the action message.

## Ch 14 — Custom Actions ✅
- Added feed & photograph actions (4-phase), camera in gift shop, `getCustomActions`/`extendParser`/`extendLanguage`. Compiled clean.
- Note: book's grammar snippets are truncated at the PDF margin (`.build` cut off); reconstructed as `.withPriority(150).build();` — obviously intended.
- "Try it" all match: `feed goats` → FED_GOATS text; repeat → ALREADY_FED; `photograph goats` w/o camera → blocked; after taking camera, `photograph press` → "Click! ...souvenir press..." ({target} param substituted).

## Ch 15 — Capability Dispatch ✅
- Added PettableTrait, pettingBehavior, pettingAction, registration; goats/rabbits/parrot pettable. Compiled clean.
- "Try it" all match: `pet goats`/`pet rabbits`/`pet parrot` each give distinct outcome; `pet dispenser` → "You can't pet that." (no trait).

## Ch 16 — Custom Traits & Behaviors ✅ (illustrative; no "Try it")
- Created `src/dispenser-trait.ts` + `src/dispenser-behavior.ts` exactly as written; compiled clean. Confirms the `.js`-extension relative-import claim. Not wired into the playable zoo (book presents them as a pattern).

## Ch 17–19 — Grammar / Language Layer / Formatter Chain ✅ (conceptual, no new zoo code, no "Try it")
- Claims already exercised: custom grammar patterns + aliases (`feed`/`photo`/`snap`/`pet`/`stroke`) work (Ch 14–15); message IDs + `{param}` substitution work; formatter plural-agreement ("The pygmy goats **are** fixed in place") verified empirically in Ch 5.

## Ch 20 — Non-Player Characters ⚠️ ISSUE FOUND — STOPPED HERE
Built exactly per §20.1–20.4: zookeeper (patrol NPC via `createPatrolBehavior`, id overridden to `zoo-keeper-patrol`), parrot promoted to NPC with custom `parrotBehavior` (`onTurn` + `onPlayerEnters`), `NpcPlugin` registered in `onEngineReady`, behaviors registered with the service. Compiled clean.

**What works:**
- `examine zookeeper` shows Sam; zookeeper appears in Main Path room contents.
- Patrol movement works: after waiting in Main Path, Sam is gone from Main Path and present in Petting Zoo on the next stop (route Main Path → Petting Zoo → Aviary, looping).
- Parrot `onTurn` works: entering/waiting in the Aviary, the parrot randomly squawks one of the 5 `PARROT_PHRASES` via a `speak` action (`npc.speech`). ~50% per turn, as written.

**⚠️ The issue — `onPlayerEnters` greeting never fires (emote action not rendered):**
- Book §20.3 states `onPlayerEnters` is "Called once when the player walks into the parrot's room," and the parrot's hook returns an `emote` action with text "The parrot ruffles its feathers and eyes you with interest." §20.5 "Try it" implies this greeting on `> west` into the Aviary.
- Observed: across ~4 separate entries into the Aviary, the "ruffles its feathers" greeting **never** appears. Only the random `onTurn` squawk shows.
- Ruled out masking: on an entry where the random `onTurn` squawk stayed silent (no phrase that turn), the greeting still produced **no** output — so it's not being overwritten by the squawk.
- Likely root cause (for repo investigation): either the NPC service does not invoke `onPlayerEnters`, or `emote`-type `NpcAction`s are not rendered (note the working squawk uses `type: 'speak'`; the non-appearing greeting uses `type: 'emote'`). A targeted test would be to emit an `emote` from `onTurn` and/or a `speak` from `onPlayerEnters` to isolate which axis fails — not done here to stay faithful to the book.

**Minor observation (not necessarily a defect):** NPC room changes are silent — no "Sam walks off east" / "Sam arrives" message; the player only notices Sam moved by `look`ing. The book's "Try it" comments are descriptive and don't promise such text, so flagging only for author confirmation.

### Stopped at Ch 20 per instruction (record issues, don't power through).

**✅ RESOLVED on 1.1.1 (re-verified 2026-06-22).** Book §20 text is unchanged on 1.1.1; the
fix was in the platform (`@sharpee/plugin-npc` + ADR-186 first-class lifecycle callbacks). The
existing Ch 20 code (byte-identical to the rebuilt book) was rebuilt and replayed. On entering
the Aviary (`> west`), the parrot's `onPlayerEnters` **`emote` now renders**:
"The parrot ruffles its feathers and eyes you with interest." — appearing alongside the random
`onTurn` `speak` squawk that same turn. Patrol movement (Sam relocates across rooms) and the
`onTurn` squawk continue to work. Ch 20 now passes end to end.

## Ch 21 — Scenes ⚠️ ISSUE FOUND — STOPPED HERE
Built exactly per §21.2 + §21.4: `world.createScene('scene-petting-zoo', { name, begin, end, recurring: true })`
in `initializeWorld()`, and the two `world.registerEventHandler('if.event.scene_began' / 'scene_ended', …)`
edge handlers from §21.4 (comment-only bodies, as printed).

**What works:**
- The scene state machine is correct. A control probe (a registered handler on the real `if.event.actor_moved`
  event, logging `world.isSceneActive(...)`) shows the scene flips **inactive → active** on entering the Petting
  Zoo and **active → inactive** on leaving; `hasSceneHappened` becomes `true`. `createScene` + the auto-registered
  `SceneEvaluationPlugin` (engine registers it at construction, game-engine.js:182) tick correctly.
- `registerEventHandler` itself works — the control `actor_moved` handler fired on every move.

**⚠️ Issue 1 (primary) — §21.4 handlers never fire.** The `scene_began` / `scene_ended` handlers the book tells
you to register are **never invoked**, across a full enter → wait → exit of the Petting Zoo (proven: a
`console.error` inside both bodies never printed, while the control `actor_moved` handler printed every turn and
confirmed the scene was transitioning). Root cause: scene events are emitted by `SceneEvaluationPlugin.onAfterAction`
and routed through the engine's `processPluginEvents()` (game-engine.js:1589), which adds them to the turn's render
list and the event bus but **does not dispatch them to `world.registerEventHandler()` handlers** — that dispatch
(ADR-086, game-engine.js:153) is wired only for action events. So §21.4's "Reacting to transitions" pattern, exactly
as written, does nothing. Net player-visible effect of Chapter 21: **nothing** — entering/leaving the scene produces
no text.

**⚠️ Issue 2 — §21.4 code does not compile as printed.** The snippet writes `event.data.sceneId` with no cast;
`ISemanticEvent.data` is typed `unknown`, giving `error TS18046: 'event.data' is of type 'unknown'`. The book's own
Ch 13 handlers cast `event.data as Record<string, any>`; §21.4 omits it. Copy-pasted verbatim, Chapter 21 fails to build.

**⚠️ Issue 3 (design contradiction) — even if dispatched, the handler is the silent kind.** §13.8 and the body of
Ch 13 (lines 3511-3512, 3732-3733) state plainly: "`registerEventHandler()` … runs silently for state bookkeeping;
the player never sees" it, and you must use `chainEvent()` "when something visible should happen." Yet §21.4 routes
the scene's player-visible atmosphere ("a waft of hay and warm fur", "the sounds of the animals fade behind you")
through `registerEventHandler`. By the book's own rule this could not render text even if it were invoked. §21 never
shows a `chainEvent`-based path for the scene events.

**Suggested repo investigation:** either (a) have `processPluginEvents()` run plugin-emitted events through the same
registered-handler dispatch as action events, and/or (b) fix §21.4 to use `chainEvent('if.event.scene_began', …)`
returning a `{ data: { text } }` event — and verify chainEvent is actually invoked for plugin events (likely the same
routing gap applies to chainEvent, since both live in the world event system that `processPluginEvents` bypasses).

### Stopped at Ch 21 per instruction (record issues, don't power through). Chapters 22–32 not yet executed.

**✅ RESOLVED on 1.1.1 (re-verified 2026-06-22) — chapter rewritten.** §21 was rewritten for
1.1.1 (ADR-186). Author reactions to scene edges no longer go through `registerEventHandler`;
they are now **first-class `onBegin` / `onEnd` callbacks passed to `createScene`**, each
returning the text to show (`{ text }` or `{ messageId }`). §21.4 now states plainly: the engine
still emits `if.event.scene_began` / `scene_ended` as observable facts, but *author reactions go
through `onBegin` / `onEnd`, not the event-handler bus* — directly addressing all three issues
from the prior run (dead handlers, the missing cast, and the silent-handler contradiction; the
old §21.4 `registerEventHandler` snippet is gone). Re-transcribed the petting-zoo scene with
`onBegin`/`onEnd`; compiles clean against 1.1.1. Replay: entering the Petting Zoo prints
"A waft of hay and warm fur greets you." and leaving prints "The animal sounds fade behind you.",
**on every entry/exit** (`recurring: true` confirmed across two round-trips). Ch 21 now produces
player-visible output and passes.

**Minor observation (not a defect):** §21.2 says "the one symbol you import is `SceneTrait`,"
but the petting-zoo scene (the only scene wired into the zoo) never uses it — `SceneTrait` is
needed only for the §21.5 "Common shapes" *storm* example (`activeTurns`), which is illustrative
and not part of the playable zoo. Per the established method (cf. Ch 16's pattern-only trait
files), the storm scene and the `SceneTrait` import were not added.

## Ch 22 — Turns, Timed Events & Daemons ✅
Transcribed §22.1–22.5 into `my-zoo/src/index.ts` against platform 1.1.1:
- Imports: `SchedulerPlugin` (value) + `Daemon, Fuse, SchedulerContext` (types) from
  `@sharpee/plugin-scheduler@1.1.1`. `ISemanticEvent` and `IdentityTrait` were already imported.
- `TimedMessages` table declared near the top of the module (§22.1).
- Three factories added before the story class: `createPAAnnouncementDaemon` (§22.2, closure
  state + `getRunnerState`/`restoreRunnerState`), `createGoatBleatingDaemon` (§22.3, conditional
  on world state), `createFeedingTimeFuse` (§22.4, `repeat`/`originalTurns`).
- Registered in the existing `onEngineReady`, alongside the NPC plugin (§22.1): new
  `SchedulerPlugin`, registered via `getPluginRegistry().register()`, then
  `registerDaemon`/`setFuse`/`registerDaemon`.
- Six `TimedMessages` lines added to the single `extendLanguage` (§22.5).
- Compiles clean against 1.1.1 (no errors/warnings). The book's code matches the installed
  API exactly (`SchedulerContext`, `Daemon`, `Fuse`, `getScheduler()`, etc.).

**Verified via the Playwright harness (§22.6 "Try it"):**
- **PA daemon** — fires every 5th turn: closing-in-3-hours at turn 5, two-hours at turn 10,
  walking through the announcement sequence. ✅
- **Feeding-time fuse** — first fires at **turn 11** (matches the book's note that a `turns: 10`
  fuse skips its first tick, firing ~11 ticks after registration), then re-arms and fires again
  at **turn 19** — confirming `repeat: true` with `originalTurns: 8`. ✅
- **Goat-bleating daemon** — primed by the fuse (`bleat_turns_remaining: 3`); bleats on turns
  12, 13, 14 then self-silences by clearing `zoo.feeding_time_active`. ✅
- **Location gating** — the bleating message renders **only when the player is in the Petting
  Zoo**: at the entrance (first run) the fuse/daemon still ran but produced no bleat text;
  standing in the Petting Zoo (second run) the bleats appeared. ✅ (The `return []` "ran but
  silent" path from §22.3 works as described.)

No defects. Chapter 22 passes end to end on 1.1.1.

## Ch 23 — Scoring & Endgame ✅
Transcribed §23.1–23.4 into `my-zoo/src/index.ts` against platform 1.1.1:
- **Score tables (§23.2)** — module-level `MAX_SCORE = 75`, `ScoreIds`, `ScorePoints`,
  `ROOM_SCORE_MAP`, `ScoreMessages`, exactly as printed.
- **`world.setMaxScore(MAX_SCORE)`** in `initializeWorld()`; recorded `this.entityIds.zooMap`
  and `.brochure` alongside the existing feed/penny/press ids (the §13 pattern).
- **Awards at the point of achievement (§23.3):**
  - Pet → `world.awardScore(PET_ANIMAL …)` in the petting behavior's `execute()` (book's exact code).
  - Room visits → `if.event.actor_moved` chainEvent, looking the destination up in `ROOM_SCORE_MAP`,
    returning `null` (silent). Book's exact code.
  - Map collect → `if.event.taken` chainEvent; brochure read → `if.event.read` chainEvent. Book's exact code.
- **Victory daemon (§23.4)** — `createVictoryDaemon()` at `priority: 100`, watching `getScore() >= MAX_SCORE`,
  setting `game.victory`/`game.ended` and emitting `ScoreMessages.VICTORY`. Registered alongside the Ch 22
  daemons. Book's exact code.
- **Victory message** added to `extendLanguage` (§23.4).
- API verified against installed 1.1.1: `awardScore(id, points, description): boolean`, `setMaxScore`,
  `getScore`, `getMaxScore` all present in `WorldModel.d.ts`; event payload fields (`actor_moved` →
  `toRoom`/`destination`, `taken` → `itemId`, `read` → `targetId`) match the book's accessors.

**Applied (not verbatim) — the three awards the book demonstrates by pattern, not by code.**
The §23.2 table totals 75 and §23.5's "Try it" reaches 75/75, so the chapter's stated outcome
("a complete, winnable game") requires all twelve awards wired. The book gives explicit code for
pet / visits / map / brochure / victory and says of the rest "Hang awards wherever the achievement
happens." Following that instruction, three awards were added using the same `awardScore` shape:
`FEED_GOATS`/`FEED_RABBITS` in the feed action's `execute()`, `PHOTOGRAPH_ANIMAL` in the photograph
action's `execute()`, and `COLLECT_PRESSED_PENNY` in the existing penny-press `put_in` chainEvent.
This is transcription of the demonstrated pattern, not a fix-it.

**Verified via the Playwright harness:**
- `score` at start → "0 out of 75, … rank of Novice." ✅
- Incremental awards (§23.5): Petting Zoo visit +5 → 5; feed goats +10 → 15; feed rabbits +10 → 25
  (rank flips to "Amateur"). ✅
- **Full winning playthrough** (take/read map+brochure, visit all five exhibits, feed both, pet, press
  a penny, photograph, collect map): score climbs 5→10→15→25→35→40→45→50→60→65→70→**75**. On the move
  that crosses 75 (entering the Nocturnal Exhibit, turn 26) the **victory daemon fires the same turn**,
  narrating "Congratulations! You've earned your JUNIOR ZOOKEEPER badge … *** You have won ***". ✅
- **Idempotency** confirmed: re-entering already-scored rooms (Aviary, Main Path on the return leg)
  added no further points. ✅

No defects. Chapter 23 passes end to end on 1.1.1 — the zoo is now a complete, winnable game.
This closes the "mechanics" volumes; Ch 24 (Channels) begins VOLUME VII — Presentation.

## Ch 24 — Channels — the Universal UI Surface ✅ (code transcribed; see Ch 25 for the visibility gap)
Mostly conceptual. The one concrete deliverable is §24.6 — define a story channel in the
`registerChannels` hook. Transcribed into `my-zoo/src/index.ts`:
- `AMBIENCE_BY_ROOM` table (Aviary + Nocturnal lines) and a `registerChannels(registry)` method
  registering `zoo.ambience` (`contentType:'text'`, `mode:'replace'`, `emit:'sparse'`) with the
  book's `produce` closure.
- `IChannelRegistry` imported (type-only) from `@sharpee/if-domain` — the canonical home; engine's
  own `story.d.ts` imports it from there. API matches the book exactly (`IOChannel`,
  `ChannelProduceContext` with `world`/`events`/`blocks`/`turn`/`prevValue`).
- Compiles clean and the closure logic is correct (Aviary → birdsong line, Nocturnal → red-dark
  line, everywhere else → `undefined`).

**Minor (book code doesn't compile as printed under 1.1.1).** §24.6 prints
`world.getEntity(world.getLocation(world.getPlayer()!.id))`. Under 1.1.1, `getLocation()` returns
`string | undefined`, but `getEntity()` takes `string` → `TS2345`. Resolved with a non-null
assertion in the book's *own* `getPlayer()!` idiom: `...getLocation(getPlayer()!.id)!`. Same class
as the Ch 21.4 "missing cast" friction — a stricter signature than the printed snippet assumes.

**The catch (this is the real story — see Ch 25):** a channel only emits *data*; nothing is
player-visible until a *renderer* paints it. With no renderer, `zoo.ambience` falls to the
Renderer's JSON-tree fallback, which `BrowserClient` wires to `console.log` (`BrowserClient.js`
constructs `new Renderer({ fallbackWarn: () => undefined })` with no `fallbackOutput`, so the
default console sink applies). So after Ch 24 alone, the mood lines go to the dev console, never
to the page. §24.6 says "Family Zoo v18 ships exactly this … its browser entry registers a
renderer that paints the line into a dedicated page element," deferring the visible result to Ch 25.

## Ch 25 — The Web Client & Framework-Free UI ⚠️ BOOK FLAW — STOPPED HERE
Conceptual chapter (no "Try it"). Its one actionable code block is §25.5 "Overriding a renderer":
`client.getChannelRenderer().registerRenderer(id, { onValue })`. The API is real and matches the
book (`getChannelRenderer(): IRenderer` in `platform-browser`; `registerRenderer(channelId,
ChannelRenderer)` with required `onValue(value, channel)` in `@sharpee/channel-service`).

**The flaw: following the book, a story-defined channel cannot be made player-visible.** Both
§24.6 and §25.5 promise the `zoo.ambience` mood line painted "into a dedicated page element," but
the book never supplies the three things needed to do it, and the platform blocks the obvious
workaround:

1. **No renderer code for the running example.** The only renderer the book prints is a *score-badge*
   illustration (writes `★ N` to `#score-badge`). The `zoo.ambience` renderer it repeatedly refers
   to ("its browser entry registers a renderer…") is never shown. Writing one would be invention,
   not transcription.
2. **No page element, and no supported way to add one.** Every renderer in the book writes into an
   element it *assumes* exists — §25.5 itself: "the element only exists if your host page adds it,"
   "This assumes your host page has a `<span id="score-badge">`." But the host page is **platform-owned
   and regenerated from the devkit template on every build**: `build-browser.js` — "Platform-owned
   page + CSS + theme fonts: always copied fresh from devkit" — overwrites `dist/web/index.html` each
   build; `init-browser.js` — "CSS … and index.html are pulled fresh from devkit at build" — never
   drops an editable copy in the project. The template's only author substitution is the override-CSS
   `<link>`; it has `#status-line`/`#main-window`/`#text-content`/save dialogs but **no ambience
   element and no injection placeholder**. The sole documented author seam is the override stylesheet
   (`my-zoo.css`), and CSS cannot create a DOM node addressable by id for a renderer's `onValue` to
   write into. The book never mentions the alternative web-native path (a renderer that
   `document.createElement`s and appends into a platform container); its guard-the-lookup examples
   point the reader the other way.

**Demonstrated, not just argued.** Transcribed the §25.5 score-badge override verbatim into
`browser-entry.ts` (the generated entry literally invites "Add any story-specific channel/audio
renderers before `client.start()`"), rebuilt, and played:
- It **compiles** against 1.1.1.
- The rebuilt `dist/web/index.html` contains **0** occurrences of `score-badge`/`ambience` — the
  target element is absent and the build regenerated the page, so a hand-added element would be
  clobbered anyway.
- Nothing renders: standing in the Aviary, no badge and no `zoo.ambience` line appear on the page.
- **Worse — it regresses a working feature.** Because `registerRenderer` is last-write-wins,
  overriding `'score'` with a renderer aimed at the missing `#score-badge` *replaced* the platform's
  score renderer. The status line then froze at **Score: 0** in the Aviary (which awards +5 and
  correctly showed updating scores through Ch 23); only the turn counter kept moving. So the book's
  verbatim example is not merely invisible — copy-pasted as printed it silently breaks the score
  display.

Per the established method ([[execute-book-exactly-no-fixits]]), I did **not** paper over this by
inventing an ambience renderer or hacking a custom element into the platform page (both would be
clobbered on rebuild and neither is in the book). **Reverted** the score-badge override from
`browser-entry.ts` (it broke the score display); rebuilt and confirmed the score line works again
(Aviary → Score: 5). **Kept** the Ch 24 `zoo.ambience` channel registration — it compiles, is
harmless, and is correct as far as the book's code goes; it simply has no player-visible renderer.

**Scope.** The flaw is specific to **author-defined channels** needing a custom DOM mount. The
*standard* channels (`main`, `location`, `score`, `turn`, media) ship platform-default renderers
and work — so Ch 26 (Theming, via the override CSS + theme system) and Ch 27 (Media, via default
media renderers) likely have working visible paths and can be executed. **Stopping here to surface
the Ch 24/25 gap before proceeding**, consistent with the Ch 20/21 "record, don't power through"
discipline. Awaiting direction: take this to the book authors, or continue to Ch 26 noting the
scoped, unresolved Ch 25 gap.
