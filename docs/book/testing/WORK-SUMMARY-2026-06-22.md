# Work Summary — Sharpee Book End-to-End Execution

**Date:** 2026-06-22
**Repo:** `test-book` (not a standard DevArch repo — no `docs/context`; summary placed at root)
**Author run by:** david.cornelson@gmail.com

## Objective
"Execute" *The Sharpee Author and Developer Manual* (`the-sharpee-book.pdf`, 325 pp, 32 chapters)
from the beginning: follow the book exactly, build the Family Zoo example chapter by chapter,
and test each chapter's "Try it" walkthrough in headless Chromium via Playwright. Record any
place the book's guidance doesn't work and **stop** (don't power through), so issues can be
taken back to the platform repo for repair.

## What was done
- Reinstalled the CLI: `@sharpee/devkit` **1.0.10 → 1.1.0** (platform `@sharpee/sharpee@1.1.0`).
- Scaffolded `my-zoo` (`sharpee init -y`), `npm install`, `sharpee build`, `sharpee init-browser`,
  rebuilt the self-contained web client (`dist/web/`).
- Built a Playwright/Chromium test harness (`harness/play.mjs`) that serves `dist/web`, drives
  `#command-input`, and captures `#text-content` + status line. Wrapper: `run.sh`.
- Implemented the Family Zoo incrementally in `my-zoo/src/index.ts`, one chapter at a time,
  rebuilding and replaying each chapter's "Try it" against the browser build.
- Kept a running chapter-by-chapter record in `EXECUTION-LOG.md`.

## Result: executed Ch 1–19 clean; reproducible issues at Ch 20 (NPCs) and Ch 21 (Scenes)

> **Update (continuation run):** Ch 20 logged; continued into **Ch 21 — Scenes**, which has its own
> reproducible defect (details in `EXECUTION-LOG.md` Ch 21). Briefly: the scene state machine works
> (`createScene` + auto-registered `SceneEvaluationPlugin` correctly flip `isSceneActive` on enter/exit),
> but §21.4's `registerEventHandler('if.event.scene_began'/'scene_ended', …)` handlers **never fire** —
> scene events go through the engine's `processPluginEvents()`, which never dispatches to
> `registerEventHandler` handlers. Plus the §21.4 snippet doesn't compile as printed (`event.data` is
> `unknown`, no cast), and even if dispatched it uses the "silent" handler kind that Ch 13 says the player
> never sees. Net: Chapter 21 produces no player-visible output. Stopped at Ch 21; Ch 22–32 not yet run.

### Verified against the book (all "Try it" outputs matched)
- **Ch 1–3** — install/scaffold/build, browser client, play loop.
- **Ch 4–9 (Volume II)** — rooms & paired exits, scenery vs. portable, containers/supporters,
  locked-gate puzzle (DoorTrait + `via`), light/dark (flashlight + grue), regions (book says skip).
- **Ch 10–16** — four-phase model; readable/switchable; **event handlers** (`onEngineReady`
  chain events: goats react on drop, penny→pressed-penny transform); **custom actions**
  (feed/photograph, grammar + language + `{param}`); **capability dispatch** (pet goats/rabbits/
  parrot, refuse non-pettable); custom trait/behavior files compile (`.js`-extension ESM import).
- **Ch 17–19** — conceptual; claims already exercised (plural verb agreement confirmed in Ch 5).

### ⚠️ Issue found — Ch 20 Non-Player Characters (stop point)
Built exactly per §20.1–20.4; compiles clean. **Works:** `examine zookeeper`, Sam's patrol
movement (relocates across rooms over turns), parrot `onTurn` random squawks (`type: 'speak'`).
**Broken:** the parrot's **`onPlayerEnters`** greeting — an `emote` action ("The parrot ruffles
its feathers and eyes you with interest.") — **never renders** across ~4 Aviary entries. Ruled out
the random squawk masking it (greeting absent even on turns where `onTurn` stayed silent).

**Likely axis for repo investigation:** either the NPC service never invokes `onPlayerEnters`,
or `emote`-type `NpcAction`s are not rendered (working path uses `speak`; broken path uses `emote`).
Suggested isolation test (not run, to stay faithful to the book): emit an `emote` from `onTurn`
and/or a `speak` from `onPlayerEnters` to determine which axis fails.

**Minor note (not flagged as defect):** NPC room changes are silent (no "Sam walks off east" /
"arrives" text); the book's "Try it" comments don't promise such messages.

## Environment notes (not book defects)
- npm global bin `/home/node/.npm-global/bin` is not on `PATH` in this sandbox, so `sharpee` is
  invoked with `PATH` prepended.
- `sharpee init` with no flags is interactive; used `-y` for non-interactive defaults.
- Cosmetic: single `\n` in `ReadableTrait` text renders as a blank line (double-spaced) in the
  web client (book says text is shown "as-is"). Content correct.

## Artifacts
- `EXECUTION-LOG.md` — full chapter-by-chapter results.
- `my-zoo/` — the built story through Ch 20 (`src/index.ts`, `dist/web/`).
- `harness/play.mjs`, `run.sh` — Chromium test harness + wrapper.
- `book-text.txt` — extracted PDF text (working file).

## Next step
Take **two** issues back to the platform repo:
1. Ch 20 — `onPlayerEnters`/`emote` NPC greeting never renders.
2. Ch 21 — scene-transition events (`if.event.scene_began` / `scene_ended`) are not delivered to
   `world.registerEventHandler()` handlers (engine `processPluginEvents()` bypasses that dispatch), so
   §21.4's "Reacting to transitions" pattern does nothing; also the §21.4 snippet needs the Ch 13
   `event.data as Record<string, any>` cast to compile, and likely should use `chainEvent` (a visible
   handler) rather than the silent `registerEventHandler`.

After fixes, resume from Ch 22 and continue through Ch 22–32 (Timed Events & Daemons, Scoring, Channels,
Web Client, Theming, Media, multi-file story, transcript testing, saving, publishing, Zifmia).
