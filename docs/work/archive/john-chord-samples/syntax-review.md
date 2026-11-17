# No Signal Home — Chord syntax review

Reviewed 2026-09-08 against Chord 3.6.0 (the compiler in `packages/chord`, the loader in `packages/story-loader`, and the corpus story `branch-stories/fernhill/fernhill.story`). Line numbers refer to `no-signal-home.story` in this directory, which is the pasted listing with its line-number gutter stripped.

## The headline

The story compiles clean. Zero errors, zero warnings:

```
$ node compile-john.cjs docs/work/john-chord-samples/no-signal-home.story
ok: true diagnostics: 0 chord version: 3.6.0
```

So nothing below is a parse error. Every item is a place where the language accepted what was written but the story does not do what the text implies, or where the corpus idiom is simpler than what was written. Each item shows the line as written, what actually happens (with the command that proves it), and the form the language wants.

Everything was probed with the platform bundle at a pinned seed:

```
node dist/cli/sharpee.js --exec "<commands separated by />" \
  --story docs/work/john-chord-samples/no-signal-home.story --seed 1
```

## How to run these checks on Windows

This is the official test path for a Chord author without the Mac IDE. Everything below was run on 2026-09-08 against this story with the same `sharpee` CLI that ships to authors: `@sharpee/devkit` 5.3.0 on npm, bin name `sharpee`, installed with `npm install -g @sharpee/devkit`. No IDE is involved. The `dist/cli/sharpee.js --exec` transcripts quoted in the sections below are the platform's in-repo harness and are not part of the author install; the three commands here are the author's equivalents, and every probe in this review reproduces through them.

**1. The compile gate.** Run from the story directory:

```
sharpee compose no-signal-home.story --check
```

Today's result:

```
compose: Chord 3.6.0 — no-signal-home.story is gate-clean (--check: IR not emitted)
```

"Gate-clean" is the same verdict as the zero-diagnostics compile at the top of this review. Any parse or analysis error prints here with its line and, where the language has one, a fix-it.

**2. Playing a probe.** `sharpee play .` starts the story's REPL. It reads standard input, so a text file of commands reproduces a probe exactly:

```
sharpee play .                      (interactive)
type probe.txt | sharpee play .     (cmd.exe)
Get-Content probe.txt | sharpee play .   (PowerShell)
```

Today's run of `s`, `push button`, `x controls` through the REPL printed the cockpit, the alarm-dies paragraphs, and the controls memory line exactly as the bundle transcripts in this review do. One caveat: `play` takes no seed, so anything drawn from chance (Lis's wandering, the order the cycling `alarm-nag` variants appear in) can differ between runs. Everything in this review that matters is deterministic and does not.

**3. Pinning a result as a test.** `sharpee test .` runs the story's tree document, `no-signal-home.tests.json`, which lives beside the `.story` file (ADR-307). The first run creates it with two cards, an opening card checking the title and description and a boot card checking the first room's text. That file is now in this directory from today's run:

```
Tree document: no-signal-home.tests.json (seed 42, 1 line(s))

✓ opening-tug-cargo-hold
2 cards passing, 4 assertions passing
```

Tree documents are normally recorded from the IDE's Testing tab, which is the piece Windows does not have yet (ADR-341 is the Windows Chord Writer, in progress). The document is plain JSON and runs fine hand-written. A `turn` card is a command plus what its output must contain; cards run in order at the document's pinned seed. Three cards added by hand to a copy of today's document, pinning the first two findings in this review:

```json
{ "type": "turn", "command": "activate flashlight",
  "assertions": { "contains": ["That is not something with an override."] } },
{ "type": "turn", "command": "s",
  "assertions": { "contains": ["Tug Cockpit"] } },
{ "type": "turn", "command": "push button",
  "assertions": { "contains": ["The alarm stops."] } }
```

```
✓ opening-tug-cargo-hold
5 cards passing, 7 assertions passing
```

A card whose text stops matching fails by name, which is how a fix to any item below gets checked without the IDE: write the card for the behavior you want, watch it fail, change the story, watch it pass.

This is the official CLI test of the tree document (David, 2026-09-08). ADR-307's acceptance criterion AC-2 requires that the Testing tab and `sharpee test` consume the same `<story-id>.tests.json`, and that a suite authored in the tab runs green in the CLI with identical labels and failure citations. A Windows author has only the CLI side of that pair, so a document that runs here is the standing check that the CLI consumer needs nothing the tab supplies. Today's evidence: the two cards `sharpee test` created on first run, plus three turn cards written by hand, all pass under the CLI with named labels (`opening-tug-cargo-hold`), and the same document format is what the tab would have recorded.

## 1. Custom actions that re-claim a standard verb with a bare slot

Lines 1011 and 1025:

```
define action overriding
  grammar
    override the target
    activate the target
    engage the target

define action launching
  grammar
    launch the target
    board the target
    take the target to space
```

`activate the target` and `board the target` have exactly the shape of two standard rules: `activate :device` (switching on) and `board :vehicle` (entering). Story grammar outranks standard grammar by tier before anything else is considered (ADR-268 D2), so the story's shape now wins for every object in the game, not just the panel and the pod.

```
> activate flashlight
That is not something with an override.

> board crates
That is not going anywhere.
```

The flashlight is `switchable`; `activate` used to switch it on. Now every `activate X` runs `overriding`, misses the trait, and lands on `otherwise refuse cant-override`.

How it should be done: only claim shapes the standard library does not own, or add a literal that makes the story shape distinct. `override`, `engage`, `launch` are free; `activate` and `board` are not.

```
define action overriding
  grammar
    override the target
    engage the target
  the target must be reachable
  otherwise refuse cant-override

define action launching
  grammar
    launch the target
    take the target to space
  the target must be reachable
  otherwise refuse cant-launch
```

The same applies to `check pressure` and `check seal` (lines 366, 367). Standard `check :target` is examining, so `check seal` now runs the pressure check instead of examining the docking seal. That is probably what was meant, but it is worth knowing it is a shadowing, not an addition.

## 2. A plain exit is two-way, so one side's line can overwrite the other's

Lines 538 and 661:

```
create the Maintenance Shaft
  ...
  south to the Engine Room

create the Engine Room
  ...
  north to the Aft Corridor
  east to the Reactor Room
```

A plain `<direction> to <room>` line wires both directions at load: the loader calls `connectRooms`, and `WorldModel.connectRooms` sets the opposite exit on the far room unless the line says `, one-way` (`packages/story-loader/src/loader.ts:567`, `packages/world-model/src/world/WorldModel.ts:1894`). The Shaft's line therefore stamps Engine Room `north → Maintenance Shaft`. The Engine Room's own `north to the Aft Corridor` then overwrites it. Whichever line the loader reaches last wins, silently.

```
> s              (from the Maintenance Shaft)
Engine Room
> n
Aft Corridor
```

The shaft is a trapdoor. Two correct spellings, depending on intent:

```
  south to the Engine Room, one-way
```

if the drop is meant to be one-way (ADR-234 D4), or a direction pair that is free on both rooms, declared on both sides the way every other exit in the story is:

```
create the Maintenance Shaft
  west to the Forward Corridor
  down to the Engine Room

create the Engine Room
  north to the Aft Corridor
  east to the Reactor Room
  up to the Maintenance Shaft
```

The same two-way rule is why the mirrored door lines are redundant. Lines 83 and 458 both say the pressure hatch:

```
create the Tug Cockpit
  south to the Airlock through the pressure hatch

create the Airlock
  north to the Tug Cockpit through the pressure hatch
```

A `through the <door>` line wires the door on both rooms; the only legal second reference is the exact mirror, and it adds nothing (the analyzer refuses anything else). The corpus writes a door once, on one side (`fernhill.story:124, 167, 182`). The same holds for the cargo bulkhead (lines 569, 594) and the bridge door (lines 776, 819).

## 3. Entity-tier topic rows only match while the thing is in scope

Lines 1092 and 1098:

```
define topics for Reed
  about the pressure hatch: phrase reed-hatch

define topics for Vasik
  about the data chip: phrase vasik-chip
```

An `about <entity>:` row is matched through the parser's topic resolution, and that resolution is quiet and scope-bound: the typed words are resolved against what the player can currently see (`packages/stdlib/src/validation/command-validator.ts:643-652`). If the entity is not in scope, no entity id reaches the row, and the runtime falls through to the quoted rows (`packages/story-loader/src/runtime.ts:1212-1228`). The pressure hatch is at the airlock; Reed is in the engine room; the row can never fire there.

```
> ask reed about hatch
Reed says, "I don't know anything about that."
> ask reed about pressure hatch
Reed says, "I don't know anything about that."
```

The quoted tier does not have this problem. `"the hold"` and `"soms"` both match even though `hold` and `soms` are aliases of entities elsewhere on the map, because the runtime tries the entity tier, finds no entity row, and then compares the typed text:

```
> ask reed about soms
"It's helpful." Reed says the word the way you would say a diagnosis. ...
> ask reed about hold
"Industrial samples, the manifest said." ...
```

How it should be done: use the entity tier for things that will be in the room or in the player's hands during the conversation, and the quoted tier for everything remote.

```
define topics for Reed
  about "the hatch", "the collar", "the airlock": phrase reed-hatch
  about "the cargo", "the hold": phrase reed-cargo
  about "the ai", "soms": phrase reed-soms
end topics
```

The data chip row is fine only if the player is expected to be carrying the chip when they ask; add a quoted alias beside it if they might ask before finding it.

## 4. Doors already open and lock themselves; a key has to exist somewhere

Line 449:

```
create the pressure hatch
  a door, openable
  starts open
```

`a door` composes scenery plus openable-closed on its own (`packages/story-loader/src/loader.ts:1886-1896`). `openable` on a door is a no-op. `starts open` is the whole override:

```
create the pressure hatch
  a door
  starts open
  aka hatch
```

Line 585:

```
create the cargo bulkhead
  a door, lockable with the cargo access code
```

A lockable door starts locked by default (kind-scoped rule, `loader.ts:2106-2111`; other lockables start unlocked). That part is right. But the key, `the cargo access code` (line 973), is created with no `in` line, so it is offstage from turn one and nothing ever moves it into play:

```
> open bulkhead
The cargo bulkhead is locked.
> unlock bulkhead
What do you want to unlock it with?
```

The Cargo Hold is unreachable. In Chord a `lockable with <thing>` key is an entity the player must hold, so either give the code a place (`in the makeshift camp`, say) or, since it is a keypad, drop `lockable with` and write the code entry as a story action on the bulkhead. Which one is a design choice; the language fact is that `lockable with` names a key object, and a key object needs a location.

## 5. A trait owns the states it changes

Lines 929-935 and 979-987:

```
create the captain's desk
  a container, openable, lockable with the multi-tool, pryable
  starts locked
  ...
  states: intact, forced

define trait pryable
  on the player prying
    refuse when it is forced: already-pried
    the player must hold the multi-tool: pry-bare-hands
    change it to forced
    move the bridge keycard to the Captain's Cabin
    phrase drawer-pried
  end on
end trait
```

The trait reads and sets `forced`, but the states are declared on the desk. That compiles because the analyzer resolves `it` against the one carrier, but it means `pryable` only works on an entity that happens to also declare `intact, forced`. A `define trait` block may carry its own `states:` line, and that is where the corpus puts them (`fernhill.story:522-525`, `define trait feedable` with `states: peckish, fed`):

```
define trait pryable
  states: intact, forced

  on the player prying
    refuse when it is forced: already-pried
    the player must hold the multi-tool: pry-bare-hands
    change it to forced
    phrase drawer-pried
  end on
end trait
```

There is also one lock with two keys here. `lockable with the multi-tool` plus `starts locked` already lets the platform open the drawer, and `pryable` is gated on the same multi-tool. Both routes run, and they contradict each other in play:

```
> pry desk
... a magnetic keycard slides out onto the deck ...
> unlock desk with multi-tool
You unlock the captain's desk with the multi-tool.
> open desk
You open the captain's desk, which is empty.
> pry desk
The drawer is already open to persuasion. Just open it.
```

Pick one. If prying is the puzzle, drop `lockable with the multi-tool` and `starts locked`, and move the keycard reveal onto the desk's own block so the trait stays reusable:

```
create the captain's desk
  a container, openable, pryable
  starts closed
  ...

  on the player prying
    move the bridge keycard to the Captain's Cabin
  end on
```

If the platform lock is the puzzle, drop the trait and the `states:` line entirely; `unlock desk with multi-tool` then `open desk` already delivers the keycard.

## 6. The tool gate is declared twice on the cables

Lines 546 and 557:

```
create the trunk cables
  scenery, plural, cuttable with the cable snips
  ...
  on the player cutting
    refuse when the trunk cables is severed: cables-already
    the player must hold the cable snips: cable-wrong
    ...
```

`cuttable with the cable snips` already tells the cutting action to require the snips; the platform refuses on its own with `You need the cable snips to cut the trunk cables.` (`packages/lang-en-us/src/actions/cutting.ts:22`). The `must hold` line in the clause runs first, so in play the story's wording wins:

```
> cut cables
You need cable snips for that.
```

That works, but it is the gate written twice. The corpus declares the tool once and leaves the clause to the outcome (`fernhill.story:604`, the fuse: `cuttable with the garden shears` and an `on the player cutting` with no tool line). If the platform sentence is the only objection, reword it instead of re-gating:

```
override message cutting-needs-tool
  You need cable snips for that.
end override
```

The `refuse when ... severed` line is correct usage. The platform does not track an already-cut cuttable, so that refusal is the story's to write, and it fires:

```
> cut cables
The trunk is already in two pieces, and the light has gone out of it.
```

## 7. `{br}{br}` where a blank line already means a paragraph

Lines 115-116, and the same pattern at 289-290, 960-969, 1207-1208, 1214-1215, 1219-1220:

```
    phrase alarm-dies
      You hit it hard enough to hurt. The alarm stops.{br}
      {br}
      The silence is worse. Your ears ring in it. ...
```

A blank line inside a phrase body is a paragraph break. That holds for an inline `phrase` body under an `on` clause, even inside a `create` block, and for an entry in `define phrases en-US`. Verified with a test story on 2026-09-08: both forms render exactly as `{br}{br}` does:

```
> push button
First paragraph of an inline body.

Second paragraph after a blank line.

> read sign
Entry one, first paragraph.

Entry one, second paragraph after a blank line.
```

So the pair is written the way the language already reads a blank line:

```
    phrase alarm-dies
      You hit it hard enough to hurt. The alarm stops.

      The silence is worse. Your ears ring in it. And now that nothing is
      screaming, you can see what the alarm was screaming about: a hull,
      filling the viewport, close enough to read the weld seams.
```

The single `{br}` is a different thing and is used correctly where it appears: it is a line break with no paragraph break, and it is the only way to get one, since a body's lines are otherwise joined with spaces. The nav readout (lines 171-172), the manifest header (287-289), the biohazard sign (505-506), the signage (703-704), and the seal-critical readout (473) all want exactly that:

```
  It has already tagged the thing outside and put a name on it:{br}
  STILLWATER — MERIDIAN SOLUTIONS — STATUS: DERELICT{br}
  SALVAGE VALUE: HIGH
```

Rule of thumb: `{br}` for a line break inside a paragraph, a blank line for a new paragraph, never `{br}{br}`.

## 8. Smaller points

`aka me, myself, self` on the salvager (line 1114). The validator already resolves `me`, `myself`, `self`, and `yourself` to whoever holds the player role (`command-validator.ts:61`). The line is harmless and unnecessary; the corpus player (`fernhill.story`, Wren) has no `aka`.

`*** THE END ***` and `(Ending: ...)` typed into the ending phrases (lines 1166-1169, 1186-1189). `win ending-escape-alone` prints the phrase once and stops the engine; the ending kind travels on the wire as data for the client (`loader.ts:1725-1738`). The typed banner is a leftover from the TypeScript port. It prints as two more paragraphs, nothing more, so it is a taste call, but the corpus ends on prose alone (`fernhill.story:1100`, `fernhill-saved`).

Refusal text split across two homes. The docking actions keep their phrases in their own `phrases en-US` block (line 316 onward), while `cant-pry`, `cant-override`, `cant-launch`, `pry-bare-hands`, `already-pried` and the rest live in the story-wide `define phrases en-US` at line 1191. Both are legal. The corpus keeps an action's refusals in the action (`fernhill.story:544-552`), so the reader finds the words beside the gate.

`a room, dark` on one line versus `a room` then `dark` (lines 535, 632). Both parse; the corpus writes the kind on its own line and the adjectives on the next, which reads better once `with` settings appear.

## 9. Declared states nothing ever sets

Not a syntax point, but `states:` is a promise, and this list is what a reader of the source will expect the story to drive. Generated from the source on 2026-09-08:

| Entity | States declared | Ever set by a `change` | Never set |
|---|---|---|---|
| the story (header) | adrift, boarded, waking, converging | boarded | adrift, waking, converging |
| the elevator | broken, running | none | broken, running |
| Reed | steady, glitching, lucid, turned | none | all |
| Vasik | guarded, trading, desperate | none | all |
| Okafor | territorial, wary, allied | none | all |
| Lis | present, drifting, spoken-through | none | all |
| the soms terminal | helpful, manipulative, fragmenting, conflicted | fragmenting | helpful, manipulative, conflicted |

The first-listed state is the initial one, so "never set" on the initial state is expected (screaming, dark, approach, cold, idle, holding, live, intact are all fine). The rows above are the ones with no transition at all. The elevator parts (line 853) and fabricator parts (line 862) likewise have no action that consumes them.

## What is done right

Worth saying, because these are the parts most new Chord authors get wrong.

The docking sequence (lines 305-400) is the entity-less action form exactly as the language wants it: a `grammar` block with no slot, `must` lines as the gate, a body of `change` and `phrase` statements, and per-action `phrases en-US`. That form exists precisely for verbs with no object (ADR-275 D1).

`after the player examining, once` with an inline `phrase` body (lines 140-145 and throughout the tug) is the memory idiom, and `first time` on rooms (line 70) is used correctly.

`define sequence` with a `when <entity> becomes <state>` anchor followed by `N turns later` (lines 411-441), and `kill the player <key> when <condition>` inside it, is the right shape for a clock.

The region block's `after the player entering, once` (line 43) driving the story state, the score, and the arrival text is idiomatic. So is the `before the game starts` block with `change the player to the salvager`.

`extend action going` with `fore` / `means direction north` (lines 1306-1323) is the correct way to add direction vocabulary; nothing else was needed.

`concealed` on the data chip works with the standard `search`:

```
> search
Hidden here, you discover: a data chip.
```

The `## comment` runs are all top-level and blank-delimited, which is the one placement rule the comment grammar has.
