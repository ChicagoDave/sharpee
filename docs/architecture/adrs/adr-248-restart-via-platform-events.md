# ADR-248: RESTART delegates through platform events — client reboot, not in-place rebuild

## Status: ACCEPTED (2026-07-20 — all four Open Questions resolved via interview, session 171837; adr-review gaps folded in with David's OK)

## Date: 2026-07-20

## Parent: `docs/work/platform-issue-sweep/restart-chord-path-proposal.md` (supersedes its fix A; carries its fix B forward). Related: ADR-035-family platform events (QUIT/SAVE/RESTORE delegation pattern), session 17e36e batch-transcript lifecycle fix (`purgeStoryModuleCache`, fresh-engine-per-transcript discipline), `docs/context/session-20260720-1730-chord-foundations.md`.

## Context

`GameEngine.restartGame()` (`packages/engine/src/game-engine.ts:891`) is the
one lifecycle operation where the engine mutates the world itself instead of
delegating outward. QUIT already works the other way: hook → `stop('quit')` →
completion event → the *client* owns what happens next. RESTART uses the same
request/hook/completion scaffolding, then bypasses the seam and does an
in-place rebuild: `world.clear()` → reset ~8 pieces of engine bookkeeping →
`setStory(this.story)` → `start()`.

That in-place rebuild imposes an **undocumented re-entrancy contract** on
stories — "all per-world state is derived fresh per `initializeWorld` call" —
and that contract is a proven trap, twice:

- **ChordStory violates it**: `worldIds` (`packages/story-loader/src/loader.ts:179`)
  keeps first-build entity ids; pass 1 skips every already-mapped IR entity
  after `world.clear()`, so nothing is recreated and region wiring throws
  `assignRoom: room 'r01' not found` — surfaced to the player as
  "I don't understand that." (fernhill, reproduced 2026-07-19).
- **TS stories only survive by coincidence**: module-level daemon `let`s
  (troll-daemon `trollId`, sword-glow, balloon…) keep first-build ids across
  restart and keep working only because `world.clear()` resets id counters so
  rebuilt ids happen to coincide. The same disease class caused the
  batch-transcript failures fixed in session 17e36e.

The rebuild also maintains a hand-curated reset list (pronoun context, turn
events, pending platform ops, sound buffer, undo snapshots, plugin registry,
`hasEmittedInitialized`…) that must be extended every time the engine grows
state — a drift-prone approximation of what a fresh boot gives for free.

**Client landscape (2026-07-20)**: platform-browser is the only player client.
The CLI is a test harness (plus blind-user TTS) and already boots fresh
engines per transcript via `LoadedGame` + `purgeStoryModuleCache`. Zifmia is
back in design stage and would inherit whichever pattern this ADR picks.

**Browser boot path today** (`stories/dungeo/src/browser-entry.ts:66`):
`start()` creates world/parser/language → `new GameEngine` →
`client.connectEngine` → `engine.setStory(story)` → hooks →
`client.start()`. Note `BrowserClient.start()` restores the autosave when one
exists — a restart reboot must take the new-game branch, not the
restore branch.

**Story export contract today**: TS stories export a singleton
(`export const story = new DungeoStory()`, `stories/dungeo/src/index.ts:842`).
Node clients can purge the require cache to get a fresh module; a browser ESM
bundle cannot — a fresh story instance in the browser requires a factory.
ChordStory needs no factory ceremony: it is built from IR by the
story-loader, and rebuilding from the bundled IR is pure and cheap.

## Decision

RESTART becomes a delegated lifecycle operation, symmetric with QUIT:

1. **Engine — delete the in-place rebuild.** On confirmed restart
   (`onRestartRequested` hook true, or no hook), the engine's final packet
   renders the player-visible restart acknowledgment, then it stops with
   reason `'restart'` (Q2 resolved 2026-07-20: **ack, stop, reboot**). The
   `stop()` reason union (`game-engine.ts:839`) gains `'restart'`. The
   acknowledgment text is the restarting action's existing lang-en-us
   message (`game_restarting`, "The story restarts." —
   `packages/lang-en-us/src/actions/restarting.ts`), emitted through the
   normal report path as the final packet; no new text. The engine does NOT
   touch the world, the story, or its own bookkeeping, and it does NOT emit
   a pre-emptive `restart_completed(true)` — the new boot's opening banner
   IS the success signal, so the completion claim can never precede (or
   contradict) the reboot it describes; a failed reboot shows the real error
   per decision 4. `restartGame()` and its reset list are deleted. The
   `initializeWorld` re-entrancy contract is deleted with it:
   `initializeWorld` runs at most once per story instance, ever. A declined
   restart still emits `restart_completed(false)` as today (nothing was torn
   down; the turn pipeline is intact).

2. **Client — restart = re-run its own boot path.** The trigger is the
   client's own `onRestartRequested` hook (it is client code): the hook
   returns true, then the client awaits the engine's turn completion — the
   final packet, carrying the acknowledgment, is flushed — before acting.
   The `'restart'` stop reason is bookkeeping/observability, not the signal.
   platform-browser then handles restart by disposing the engine and
   re-running the
   same boot sequence that started the game (fresh world, fresh engine, fresh
   story instance, reconnect, `client.start()`), forced onto the **new-game
   branch** (no autosave restore). Restart can never drift from boot because
   it IS boot. **The autosave envelope is deleted the moment restart is
   confirmed, before the reboot** (Q1 resolved 2026-07-20): a page reload at
   any point after restart boots a fresh game — no window where the
   discarded session can resurrect. Named saves are untouched.

3. **Story export contract — factory only.** (Q3 resolved 2026-07-20.)
   `export function createStory(): Story` is the story module's sole story
   export; the client calls it per boot. The named `story`, `config`, and
   default exports are deleted — consumers read config off the instance
   (`Story` already requires `.config`, `packages/engine/src/story.ts:180`).
   Story-mutable state lives in the story instance or in closures created
   during `initializeWorld` — module-level mutable state is prohibited
   because a browser bundle cannot re-evaluate modules; dungeo's module-level
   daemon `let`s move into instance fields or `initializeWorld` closures.
   Devkit/author-tool templates, the `Story` interface docs, and dungeo
   migrate in the same change (no backward compat). ChordStory satisfies the
   contract natively: the loader rebuilds it from bundled IR.

4. **Honest failure surfacing (proposal fix B, relocated).** A failed reboot
   is a client-visible error: the client displays the real load/build error
   text. The engine's remaining restart path has nothing left to throw
   through the turn pipeline, so the "world-build crash rendered as parse
   failure" class is structurally gone.

5. **Harness support is in scope.** (Q4 resolved 2026-07-20.) The
   CLI/transcript-tester gets its reboot-on-restart handler in the same
   change, reusing the `LoadedGame` fresh-boot machinery from the batch fix —
   the fernhill (Chord path) and dungeo (TS path) restart transcripts are
   runnable acceptance tests, so the ADR ships verified on the real path.

## Consequences

- The re-entrancy trap class is eliminated, not patched: no self-healing
  `worldIds` filter, no per-story discipline about reassigning ids per call.
  ChordStory's restart bug is fixed without touching the story-loader's
  build passes.
- `restartGame()`'s hand-maintained reset list is deleted; future engine
  state additions cannot silently break restart.
- Undo snapshots, plugin registry, channel service, pronoun context reset for
  free (new engine).
- Every client owns a restart handler. Today that is one client
  (platform-browser); zifmia adopts the pattern at design time; the CLI
  harness reuses its existing fresh-boot machinery.
- TS stories migrate: factory export + moving module-level daemon `let`s
  into instance/closure state (dungeo is the known offender). This also
  retires the id-counter-coincidence hazard noted in the proposal.
- Transcript coverage: fernhill `restart` transcript (Chord path) and a
  dungeo restart transcript (TS path) are the acceptance tests, runnable
  because harness reboot-on-restart support lands in the same change
  (decision 5).
- Required boundary/rejection tests beyond the acceptance transcripts:
  (a) autosave envelope is gone immediately after restart is confirmed
  (before reboot completes); (b) declined restart leaves the world intact
  and emits `restart_completed(false)`; (c) a failed reboot displays the
  real load/build error text, not a parse fallback.
- The piped-REPL observation that dungeo `restart` prints nothing gets
  re-checked against the new flow (was possibly a pipe artifact).

## Session

- Investigated and drafted: session 171837 (2026-07-20), from David's
  question "why aren't we just nullifying the engine instance and reloading
  the engine?" → "isn't this why we have platform events?" — yes, it is.
- Prior investigation: session 17e36e (restart-chord-path-proposal.md).
