# Sharpee Book — End-to-End Execution Log

Executing *The Sharpee Author and Developer Manual* from the beginning, following
the book exactly, building the Family Zoo example and testing each chapter's
"Try it" via Playwright/Chromium against the built web client.

Platform: `@sharpee/devkit@1.1.0` (reinstalled at session start), `@sharpee/sharpee@1.1.0`.

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
