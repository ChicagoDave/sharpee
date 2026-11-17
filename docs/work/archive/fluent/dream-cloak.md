# Dream Cloak — the acid test for the author layer

**Status:** Design exercise (2026-07-10). No implementation. Companion to `research-ideas.md`.

## Purpose

Write the Cloak of Darkness file we *wish* authors could write, then audit every
construct against principle 6 of `research-ideas.md` ("no magic": a reader can predict
the WorldModel calls it produces). Constructs that can't compile to today's platform
are findings, not failures — principle 7 says fluent gaps signal platform gaps.

Baseline for comparison: `stories/cloak-of-darkness/src/index.ts` — **785 lines**,
raw platform API (predates helpers, standard darkness, standard `reading`, and
`RoomTrait.blockedExits`). The dream file below reproduces the same observable
behavior (including the garbled-message embellishment) with two deliberate
divergences, noted in §4.

## 1. The dream file

Hypothetical package name `@sharpee/author` used throughout — naming is an open
question (§6). **~90 lines** including prose.

```typescript
import { story, say } from '@sharpee/author';

export default story({
  id: 'cloak-of-darkness',
  title: 'Cloak of Darkness',
  author: 'Roger Firth (Sharpee implementation)',
  version: '1.0.0',
  description: 'A basic IF demonstration - hang up your cloak!',
}, ({ room, object, connect, player, defineState, when, verb, end }) => {

  // --- Story state ---------------------------------------------------------

  const state = defineState({ disturbances: 0 });
  const WINNING_TEXT = 'You have won!';

  // --- Rooms ---------------------------------------------------------------

  const foyer = room('Foyer of the Opera House')
    .aliases('foyer', 'hall', 'entrance')
    .description('You are standing in a spacious hall, splendidly decorated in red and gold, with glittering chandeliers overhead. The entrance from the street is to the north, and there are doorways south and west.');

  const cloakroom = room('Cloakroom')
    .aliases('cloakroom')
    .description('The walls of this small room were clearly once lined with hooks, though now only one remains. The exit is a door to the east.');

  const bar = room('Foyer Bar')
    .aliases('bar')
    .description("The bar, much rougher than you'd have guessed after the opulence of the foyer to the north, is completely empty. There seems to be some sort of message scrawled in the sawdust on the floor.");

  connect(foyer, 'west', cloakroom);
  connect(foyer, 'south', bar);
  foyer.blockedExit('north', "You've only just arrived, and besides, the weather outside seems to be getting worse.");

  // --- The player and their cloak -------------------------------------------

  player.description('As good-looking as ever.').in(foyer);

  const cloak = object('velvet cloak')
    .aliases('cloak')
    .description('A handsome cloak, of velvet trimmed with satin, and slightly splattered with raindrops. Its blackness is so deep that it almost seems to suck light from the room.')
    .wearable()
    .wornBy(player);

  object('brass hook')
    .aliases('hook', 'peg')
    .description("It's just a small brass hook, screwed to the wall.")
    .scenery()
    .supporter({ maxItems: 1 })
    .in(cloakroom);

  // --- Darkness: the bar is dark while the cloak is on the player -----------

  bar.darkWhen(() => player.has(cloak));

  // --- The message in the sawdust --------------------------------------------

  const message = object('message in the sawdust')
    .aliases('message', 'sawdust', 'floor', 'writing')
    .scenery()
    .in(bar)
    .description(() =>
      state.disturbances === 0 ? 'The message, neatly marked in the sawdust, reads...'
      : state.disturbances < 3 ? 'The message has been carelessly trampled, making it difficult to read.'
      : 'The message has been completely obliterated.')
    .readable(() =>
      state.disturbances === 0 ? WINNING_TEXT
      : state.disturbances < 3 ? 'You can just make out: ' + garble(WINNING_TEXT, state.disturbances)
      : 'The message is too trampled to read.');

  // --- Rules ------------------------------------------------------------------

  // Blundering into the dark bar tramples the sawdust.
  when(player.enters(bar))
    .if(() => bar.isDark())
    .do(() => { state.disturbances++; },
        say("Blundering around in the dark isn't a good idea!"));

  // Reading the message ends the game.
  when(player.reads(message)).do(() => {
    if (state.disturbances === 0) end.victory(WINNING_TEXT);
    else if (state.disturbances >= 3) end.defeat('The message has been trampled beyond recognition. You have lost!');
  });

  // --- Vocabulary ---------------------------------------------------------------

  verb('hang', 'hook').means('put :item on :supporter');
});

/** Replace a share of characters with dots, proportional to trampling. */
function garble(text: string, level: number): string {
  return text.split('').map(c =>
    c !== ' ' && Math.random() < level * 0.2 ? '.' : c).join('');
}
```

## 2. What vanished, and why

| In the 785-line original | Lines | In the dream file | Why it's gone |
|---|---|---|---|
| Two hand-written `IScopeRule` objects for darkness | ~75 | — | Standard darkness handles visibility in dark rooms today; only the *condition* is custom (`darkWhen`) |
| Custom `READ` action with 4 branches | ~90 | — | `reading` is a standard action now; message text is dynamic via `.readable(() => ...)` |
| `updateMessage()` state synchronizer | ~30 | — | Dynamic text pulls from state at render time; nothing to synchronize |
| Outside room + exit wiring | ~30 | 1 line | `RoomTrait.blockedExits` already exists; canonical Cloak blocks north with a message |
| `createPlayer()` (26 lines, two branches) | ~50 | 1 line | Default player + a `player` handle to configure |
| Per-entity factory methods, trait constructors | ~200 | builder chains | ADR-140 helpers, extended |
| Manual ID bookkeeping (`roomIds`, `hookId`, `cloakId`) | scattered | — | Lexical scope: entities are `const`s; rules close over them |
| 3× `eventProcessor.registerHandler` with snapshot spelunking | ~90 | 2 `when()` rules | Typed event selectors compile to handler registration |
| `getCustomVocabulary()` object | ~12 | 1 line | Sugar over the same mechanism |
| `extendLanguage()` message registration + IDs | ~10 | — | Inline prose (dual-mode, ADR-107); IDs generated internally |
| `isComplete()` + hand-rolled victory/defeat event literals | ~40 | `end.victory()` / `end.defeat()` | Endings as a provided effect |

## 3. No-magic audit — what each construct compiles to

| Construct | Compiles to | Exists today? |
|---|---|---|
| `story(config, fn)` | A `Story` object: `config`, generated `createPlayer`, `initializeWorld` running `fn`, `onEngineReady` wiring rules, `isComplete` backed by the endings state | Sugar only |
| `room()` / `object()` chains | ADR-140 builders + `RoomTrait`/`IdentityTrait`/`SceneryTrait`/`SupporterTrait`/`WearableTrait`/`ReadableTrait` | Builders exist; need `.supporter()`, `.wearable()`, `.readable()`, `.wornBy()`, `.blockedExit()`, thunk-valued text |
| `connect(a, dir, b)` | `world.connectRooms(a.id, b.id, dir)` | **Exists** |
| `foyer.blockedExit('north', msg)` | `RoomTrait.blockedExits.north = msg` | **Exists** |
| `player` handle | `world.getPlayer()` + default creation | Sugar only |
| `defineState({...})` | Proxy over `get/setStateValue` under a story-namespaced key prefix; save/restore/undo come free because it *is* world state | Sugar only |
| `bar.darkWhen(fn)` | A turn-end rule: evaluate `fn`, write `RoomTrait.isDark` | Sugar via scheduler/turn hook — **decision needed** (§5.1) |
| `when(player.enters(bar))` | `eventProcessor.registerHandler('if.event.actor_moved', ...)` with the actor/destination predicate compiled in | Sugar over ADR-052/075; kin to ADR-057 rulebooks |
| `when(player.reads(message))` | Handler on `if.event.read` filtered to the entity | `reading` action **exists** |
| `say(text)` | `game.message` effect with literal text (dual-mode content, ADR-107) | **Exists** |
| `.description(() => ...)` / `.readable(() => ...)` | ADR-196 dynamic-text producer bound to the entity's text | Mechanism exists; builder binding is new |
| `verb('hang', 'hook').means(...)` | `CustomVocabulary` verb entry mapping to `if.action.putting` + preposition | **Exists** |
| `end.victory(text)` / `end.defeat(text)` | Emit `story.victory`/`story.defeat` + set completion state consumed by `isComplete` | Convention today; worth making first-class (§5.3) |

Nothing in the file requires a platform *change* to be faithful — `darkWhen` can compile
to a turn-end rule. Two places want platform *blessing* to avoid being conventions:
derived properties and endings.

## 4. Behavior divergences from the current implementation

1. **Outside room dropped** in favor of a blocked north exit with the same message.
   This matches Firth's canonical spec; the current transcript would need one
   expectation updated.
2. **Re-darkening:** `darkWhen` makes the bar go dark again if the player retrieves
   the cloak, which is canonical. The current implementation lights the bar
   permanently on first hang. The dream behavior is *more* faithful, and falls out
   of the declarative form for free — a point in its favor.

## 5. Discovered design questions (the lens working as intended)

1. **Derived room properties.** `darkWhen` needs a re-evaluation policy. Options:
   (a) turn-end rule that recomputes and writes `isDark` — sugar-only, predictable,
   one-turn staleness never observable in practice; (b) a platform "derived property"
   concept with dependency tracking — more magic, more correct. Recommend (a) first.
2. **The event-selector vocabulary.** `player.enters(room)`, `player.reads(thing)`,
   `thing.movesTo(place)` require a curated map from author verbs to `if.event.*`
   names and payload shapes. This map is the author layer's real contract, and its
   gaps will be the growth edge. It should be generated or verified against stdlib's
   actual event emissions, not hand-maintained.
3. **Endings.** `end.victory`/`end.defeat` should probably be a small platform-blessed
   service (event type + completion flag) rather than a per-story convention.
4. **Closure discipline.** Rule and text thunks must read only world/state (no
   captured mutable locals), or save/restore breaks. `defineState` exists precisely so
   authors never need a mutable local. Document as a rule; lint later.
5. **Inline prose vs. localization.** `say('...')` and literal descriptions are
   sanctioned by ADR-107 dual-mode content. An optional `.id('cloak.stumble')` escape
   hatch preserves the message-ID path for stories that need localization.

## 6. Open questions carried forward

- **Package identity:** grow `@sharpee/helpers`, or new package (`@sharpee/author`,
  `@sharpee/fluent`, or revive the *Forge* name)? The dream file assumes one import.
- **Eager builders:** the file drops `.build()` (factories create immediately; chains
  configure). ADR-140 builders require `.build()`. Mixing dialects in one story is
  confusing — if we go eager, helpers should follow.
- **Rule ordering:** does `when()` need priorities/rulebook stages (ADR-057) from day
  one, or add when a story demands it?
- **Next acid test:** Cloak exercises world+rules+text but not custom actions, NPCs,
  or daemons. A "dream zoo" (petting/feeding/photograph actions, parrot behavior
  swap, PA daemon) is the natural second exercise before committing an API shape.

## 7. Scorecard

- 785 lines → ~90 lines (~8.7×), with zero custom actions, zero scope rules, zero
  message-ID maps, zero manual IDs, zero hand-built event literals.
- Every construct passes the no-magic audit; two conventions (derived darkness,
  endings) are flagged for platform blessing.
- The exercise validates the reordered slice priorities from the 2026-07-10 session:
  story shape, rules/effects, typed state, and dynamic-text binding did the heavy
  lifting; region/map machinery was never missed at this scale.
