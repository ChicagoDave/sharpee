## 10. Meta & system actions

The actions every story gets for free — no traits, no eligibility, and
(deliberately) no interceptor surface: there is no entity to hang an
`on`/`after` clause on, so none of these consult one. One small fixture
serves the whole chapter — a story header, a room, and a single scored
item:

<!-- fixture: meta/long-watch.story -->
```story
story "The Long Watch" by "Sharpee Docs"
  id: stdlib-ref-meta
  version: 1.2.0
  blurb: One night in a lighthouse, told a turn at a time.
  score found-the-flare worth 10

create the Lamp Gallery
  a room

  The top of the lighthouse, glass on every side.

create the signal flare
  aka flare
  in the Lamp Gallery

  A stubby red signal flare, sealed in wax paper.

  after taking it
    award found-the-flare
  end after

create the player
  starts in the Lamp Gallery
```

### 10.1 Information: about, help, inventory, scoring, version

**about** (`about`, `info`, `credits`) renders the story's own
metadata — for a Chord story, simply the header: title, author,
`version:` and `blurb:` flow straight through (the platform materializes
them into the story-info trait, §11.1). A TypeScript story can add
credits, ported-by, and build fields. One overridable message:
`if.action.about.success`.

**version** (`version`) prints a one-line story stamp (title and
version) plus the engine's own version line.

**help** (`help`, `?`, `commands`) renders the platform's general help;
a first-time asker gets `first_time`. Topic help (`help movement`) is
implemented in the action but unreachable — the core pattern takes no
topic slot (flagged, with `save <name>` in the same boat).

**inventory** (`inventory`, `inv`, `i`) splits what you carry from what
you wear; empty hands pick a random empty-message variant. The
abbreviations set a `brief` flag in the event for clients that care.
Burden/weight messages exist but are dormant.

**score** (`score`, `points`) reads the platform score ledger — exactly
where Chord's `score <name> worth N` / `award <name>` system deposits
(chord-language.md §2.8, §4.5): max score is summed from the declared
worths at load, awards are idempotent, and SCORE works with zero extra
setup. Ranks fall back to a computed ladder (Novice → Master); a story
can override rank, moves, and achievements through the scoring
capability (TypeScript today). `no_scoring` covers score-free stories.

The player sees:

<!-- transcript: meta/long-watch.story -->
```transcript
> about
The Long Watch
Version 1.2.0
By Sharpee Docs

One night in a lighthouse, told a turn at a time.

> score
You have scored 0 out of 10, earning you the rank of a Novice.

> take the flare
Taken.

> score
You have achieved a perfect score of 10 points!

> inventory
You are carrying:

a signal flare
```

The header alone powers ABOUT, its one `score … worth` line set the
maximum, and the flare's `award` flipped SCORE from Novice to
perfect — no scoring setup beyond those two lines.

| | Refusals | Renders |
|---|---|---|
| **about** (`if.action.about.*`) | — | `success` (title, version, author, blurb in one message) |
| **help** (`if.action.help.*`) | — | `general` · `first_time` (first ask) · `unknown_topic` (topic help — unreachable) |
| **inventory** (`if.action.inventory.*`) | — | `carrying` · `wearing` · `carrying_and_wearing`, with `holding_list` / `worn_list` lines; empty hands: one of `empty` · `inventory_empty` · `nothing_at_all` · `hands_empty` · `pockets_empty`, at random |
| **score** (`if.action.scoring.*`) | `no_scoring` | `score_with_rank` · `perfect_score` (at max) |

### 10.2 Saving state: saving, restoring, restarting, quitting

These four are signals, not implementations: each emits a platform
event that the engine processes after the turn through
client-registered hooks — the client owns persistence and the
confirmation UI. Verbs that parse: `save`/`save game`,
`restore`/`load`/`load game`/`restore game`, `quit`/`q`/`exit game`,
`restart`. Named saves are dormant (no slot in the grammar). Quit asks
for confirmation through a client query — but with no client hook
registered it auto-confirms and stops; restart computes whether
confirmation is warranted (unsaved progress, more than a few moves) and
leaves honoring it to the hook.

The player sees (in a client that registers no hooks, like the bare
test harness — the signal side is all there is):

<!-- transcript: meta/long-watch.story -->
```transcript
> save
Save failed.

> restore
No saved games found.
```

"Save failed." is the engine reporting an unhandled
`platform.save_requested`; a real client's hook would have completed
it. Quit and restart print nothing of their own here for the same
reason.

| | Refusals | Platform event |
|---|---|---|
| **save** | `save_not_allowed` · `save_in_progress` · `invalid_save_name` | `platform.save_requested` |
| **restore** | `restore_not_allowed` · `no_saves` | `platform.restore_requested` |
| **restart** | — | `platform.restart_requested` |
| **quit** | — | `platform.quit_requested` |

### 10.3 Turns and undo: waiting, sleeping, again, undoing

**wait** (`wait`, `z`) is the canonical "let a turn pass": a full,
snapshot-taking, daemon-ticking turn in which nothing else happens —
N waits let N rounds of scheduled behavior (§12.2) play out. One
message, `time_passes` (the lang file's twelve wait variants are dead
inventory — flagged). Stories react to `if.event.waited`, or gate
things on turns passing.

**sleep** (`sleep`, `nap`, `doze`, `rest`, `slumber` — all five parse
since ADR-230 D2/D4). Flavor-only: one message (`slept`), no turns
skipped beyond its own, no health interaction — give it story meaning
with story logic if a story needs real sleep. `z` remains a wait.

**again** (`again`, `g`) re-runs the last successful non-meta command by
re-parsing its original text — so the repeat is honest: it can fail
where the original succeeded if the world changed. Meta commands (undo,
save, again itself) never enter history, so they can't be repeated;
`nothing_to_repeat` covers an empty history.

**undo** (`undo`) rolls back one full-world snapshot, taken before
every substantive turn (looks, examines, inventory, and the metas don't
burn a slot). Depth is an engine setting, default 10; consecutive undos
work to that depth. There is no per-story undo veto, and no
undo-after-death — once the defeat ending lands the game has stopped
(§9.1's veto window is the story's chance).

The player sees:

<!-- transcript: meta/long-watch.story -->
```transcript
> wait
Time passes...

> sleep
You sleep for a while.

> take the flare
Taken.

> again
You already have the signal flare.

> undo
Previous turn undone.

> undo
Previous turn undone.

> score
You have scored 0 out of 10, earning you the rank of a Novice.
```

AGAIN's repeat is honest — the re-parsed take refuses where the
original succeeded — and two UNDOs peel back first that failed repeat,
then the take itself, the score award reverting with it. For Chord
stories, everything the language tracks — states, occurrence counters,
`once` flags, sequence progress, awards — lives in world state, so undo
(and save/restore) cover it with no author effort (ADR-210 AC-6,
transcript-pinned).

| | Refusals | Success |
|---|---|---|
| **wait** (`if.action.waiting.*`) | — | `time_passes` (event `if.event.waited`) |
| **sleep** (`if.action.sleeping.*`) | — | `slept` |
| **again** (`if.action.again.*`) | `nothing_to_repeat` | renders whatever the repeated command renders |
| **undo** (`if.action.undoing.*`) | `nothing_to_undo` · `undo_failed` | `undo_success` |
