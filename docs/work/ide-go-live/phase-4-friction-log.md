# Phase 4 — Transcript discovery friction log

Go-live plan: `docs/work/ide-go-live/plan-20260806-go-live.md` Phase 4.
Started 2026-08-07, session 6ad977, branch `feat/ide-go-live-phases-1-3`.

**The exercise.** Fernhill's 22 transcripts were moved out to
`docs/work/ide-go-live/fernhill-transcripts-baseline/` and are being written
again from scratch, working as an author, without reading the originals. This
file records what was reached for, what had to be looked up, what was got
wrong, and what was tedious — in the order it happened.

**Honest caveat** (carried from the plan): the person doing this knows the
codebase. This surfaces friction, not ignorance. It does not simulate a
first-time author.

---

## Before writing a single line

### F1 — The author-facing docs never show a transcript file

`website/src/app/chord-writer/building-playing-and-testing/content.mdx` is the
page an author lands on. It explains the Testing tab, explains *why* tests run
as a tree, and even carries a callout about running a `continues:` tree flat.
It never shows what a `.transcript` file looks like. Not one line of syntax, not
one example, no link to a page that has one.

So the very first thing an author needs — "what do I type into the file?" — has
no author-facing answer at all. I had to leave the author docs entirely.

**Weight:** high. This is the entry point.

### F2 — The reference doc that does have the format teaches removed grammar

`docs/reference/transcript-testing.md` is the only document in the repo with
the file format in it. It is not on sharpee.net and it is out of date in ways
that would actively break an author's first file:

| Doc teaches | Reality |
| --- | --- |
| `[OK: any]` — "The IDE's Play recorder writes this form" | **Removed**, ADR-294 D2. Parse error. |
| `[OK: matches /regex/i]`, with its own section | **Removed**, ADR-294 D2. Parse error. |
| `[EVENTS: 3]`, with its own section | **Removed**, ADR-300 D5. Parse error. |
| `[ENSURES: …]` (named in the fence error list) | **Removed**, ADR-294 D4. |
| Run with `node packages/transcript-tester/dist/cli.js <story> --all` | Not how an author runs anything; `--all` is not the tree entry point. |
| Transcripts live under `stories/<name>/tests/transcripts/` | Chord stories live under `branch-stories/<name>/`. |
| Header fields: `title`, `story`, `author`, `description` | Misses **`continues:`** — the field the whole tree is built on — plus `entry`, `seed`, `seeds`, `channels`, `events`, `locale`, `forces`, `point-seed`. |

An author following this document writes a file with `[OK: any]` in it, because
the document says the IDE itself writes that form, and gets a parse error whose
message tells them the form was removed. The document is not merely stale; the
parser has a named rejection for four of the things it teaches.

**Weight:** high. Wrong docs are worse than missing docs — F1 at least fails fast.

### F3 — The format's real spec is source code, in two copies

To get an authoritative list of header fields and assertions I read
`packages/branch-tester/src/parser.ts` and `packages/branch-tester/src/serializer.ts`.
`HEADER_ORDER` in the serializer is the closest thing to a canonical field list
that exists anywhere.

There are two parsers: `packages/transcript-tester/src/parser.ts` and
`packages/branch-tester/src/parser.ts`, the latter described in its own header as a
"D15 full-copy". `sharpee test --tree` uses the branch-tester one. An author who
finds the wrong copy is reading a spec for a runner they are not using — and
nothing in either file's opening comment tells a reader which one is theirs.

**Weight:** medium for the duplication, high for "the spec is source".

### F4 — `continues:` is the load-bearing concept and is documented nowhere an author reads

The Chord Writer page says the tree matters and warns that getting it wrong
"fails as a large number of ordinary-looking test failures." It never says the
field is called `continues:`, that its value is a **filename stem** with no
extension and no path, or that a file with no `continues:` is a root.

All of that lives in ADR-302 D1 and in `branch-tester/src/parser.ts`'s error
strings. The error strings are genuinely good — they name what the author
reached for and show the corrected line. But an author only sees them after
guessing wrong.

**Weight:** high.

---

## Getting a story to run at all

### F5 — The platform bundle cannot load the story it ships beside

First instinct, straight from `CLAUDE.md`: run the story through the fast bundle.

```
$ node dist/cli/sharpee.js --exec "look" --story branch-stories/fernhill/fernhill.story
Fatal error: Chord load-time gate failed (1 error(s)):
  fernhill.story:7:3 [parse.header-unknown-field] Unknown story-header field `publish-source:`
```

`dist/cli/sharpee.js` is stale against the story header — `publish-source:` (the
Phase 7 publish work) is not in its field list. Nothing says the bundle is
stale; it reads as a story error, and the error is confident and specific about
a field that is in fact valid. An author who hit this would go edit their story.

**Weight:** medium (in-repo staleness) but the *shape* is high — a stale
toolchain reports as an author mistake, with a line and column.

### F6 — `sharpee play` takes a directory, `sharpee build` takes a `.story` file

```
$ ./sharpee play branch-stories/fernhill/fernhill.story
play: '…/fernhill.story' is neither a directory nor a registered story
```

`sharpee build`, `publish` and `compose` all document `<file>.story`. `play`
documents `[name|path]` and rejects the `.story` path. `CLAUDE.md` says to pass
the `.story` FILE for Chord stories, which is right for `build` and wrong for
`play`. Passing the directory works.

**Weight:** low individually, but it is the second command an author types.

### F7 — `sharpee play` cannot be driven from a pipe: it runs one command and drops the rest

```
$ printf 'north\nnorth\n' | ./sharpee play branch-stories/fernhill
… only the first `north` runs …
```

Root cause is exact: `packages/devkit/src/commands/play.ts:71` is an
`rl.question(…, async (input) => { … await …; prompt(); })` loop. With a pipe,
readline delivers every line immediately, but only one is captured by the
outstanding `question`; the loop re-arms after the `await`, by which point EOF
has already fired `rl.on('close')` and resolved the promise. The remaining
commands are consumed and discarded silently — no error, exit code 0.

The consequence for authoring is the whole problem: **there is no author-facing
way to run a scripted sequence of commands and see what the game says.** Play is
interactive-only, and every launch restarts at turn 1. To derive expected text
for a thirty-command transcript, an author sits in a REPL and copies out of the
terminal by hand.

**Weight:** high. This is the single biggest obstacle to writing a transcript.

## Writing the first file

### F8 — An unpinned seed is a fresh random seed on every run, and nothing says so

A transcript with no `seed:` in its header runs under a new seed each time:

```
$ ./sharpee test branch-stories/fernhill --tree | grep Seed
Seed: 1786162001041 (arrival)
$ ./sharpee test branch-stories/fernhill --tree | grep Seed
Seed: 1786162001206 (arrival)
```

Fernhill fires `night-wind` at one chance in 6, `distant-bell` at one in 12 and
`clock-chime` at one in 8, so the atmospheric lines genuinely move between runs.
Any exact `[OK]` assertion written without `seed:` is a coin flip, and a
`contains` assertion is only safe by luck.

The runner *prints* the seed it chose on every run, which is exactly the right
information — and then says nothing about pinning it. The determinism the whole
grammar was rebuilt around (ADR-294 removed `[WHILE:]`, `[RETRY:]`, `[IF:]` on
the grounds that "output is deterministic at a pinned seed") is opt-in through
an undocumented header field.

**Weight:** high. Everything downstream — every removed-directive error message
— assumes a pinned seed the author was never told to pin.

### F9 — The failure message for an unasserted command names a flag that does not exist

A command with no assertion is a hard error, which is right. The message is:

```
Error: command "look" has no assertion and no recording exists —
record the transcript with --bless or add an assertion (ADR-294 D2)
```

```
$ ./sharpee test branch-stories/fernhill --tree --bless
test: unknown flag '--bless'
```

The one instruction the error gives cannot be followed from the author CLI. An
author reading this reasonably concludes recording exists and they have the
invocation slightly wrong, and goes looking for it.

**Weight:** high — it is a dead end presented as the recommended path.

### F10 — Two different help texts, and the useful flags are only in the second

`./sharpee` (top-level help) documents `test` as:

```
sharpee test [name|path] [transcripts…] [--tree|--chain] [--stop-on-failure] [--verbose]
```

`./sharpee test --badflag` (usage on error) documents it as:

```
usage: sharpee test [name|dir|file.story] [transcripts…] [--tree|--chain]
       [--stop-on-failure|-s] [--verbose|-v] [--json] [--coverage] [--capture-output]
```

`--json`, `--coverage` and `--capture-output` appear only in the second. They
are the three that matter most: `--coverage` is the testing-intelligence
surface, and `--capture-output --json` is the only usable probe (see F11).

**Weight:** medium, but it hides the good tools behind a wrong flag.

### F11 — The probe loop has to be invented, and `--verbose` is not it

`--verbose` prints each command's text output — and beneath it every event of
the turn, payload and all. One `north` in Fernhill emits an
`if.event.actor_moved` whose JSON serialises both rooms and the player's full
inventory: a single movement command produced ~4,000 characters of event JSON
around three lines of prose. Across a thirty-command transcript the text is
unreadable.

What actually works is a combination nothing points at:

- `[SKIP]` on a command still **executes** it (it suppresses the assertion, not
  the turn), so a file of `> cmd` / `[SKIP]` pairs is a runnable script; and
- `--capture-output --json` emits one `command-result` line per command with an
  exact `actualOutput` string.

I wrote a 60-line Node script around that pair to get a usable "run these
commands, show me what the game said" tool. It is the tool F7 should have been.
Every author writing a transcript needs this, and every author has to invent it.

**Weight:** high. This is the concrete Phase 5 ask.

## What the probing turned up in the story

### F12 — Entity topics silently degrade to the generic `ask` reply when out of scope

Fernhill's topic table mixes two forms:

```
define topics for tobias
  about the boiler:            ← entity reference
  about the silver locket:     ← entity reference
  about "the folly", "the fire":   ← string
  about "the bank":                ← string
```

The string topics fire anywhere Tobias is. The **entity** topics fire only where
the referenced entity is also in scope:

| Where | `ask tobias about the boiler` |
| --- | --- |
| Gravel Drive (boiler elsewhere) | "Tobias turns his head and spits…" — the generic `on asking it` |
| Boiler Shed, Tobias on patrol | "She's not dead, just cold. Fill her, set the valve, then light her…" |

Nothing distinguishes the two outcomes to the player or the author. The story
falls back to `on asking it`, which is a perfectly good reply, so the failure is
invisible: the topic table looks like it does not work rather than like it is
scoped.

The sharper case is `about the silver locket`. The locket has **no initial
location at all** — it is `move`d into the Greenhouse when the vine fruits — so
that topic is unreachable until the player is carrying it, and Tobias's patrol
route (`[the Gravel Drive, the Fountain Court, the Boiler Shed]`) never enters
the Greenhouse. The player must carry the locket out to him on his rounds.

Whether entity-topic scoping is correct is a platform question worth asking
separately. As a *test-authoring* finding it is unambiguous: the assertion an
author would naively write for the boiler topic passes against the wrong text.

**Weight:** high — and this is precisely the class of thing the rewrite exists
to surface.

---

### F13 — `first time` replaces the room description; the obvious assertion is wrong

The first `look` at the Iron Gates returns *only* the `first time` block. The
standing description ("Wrought-iron gates stand open on one hinge apiece…")
does not appear until the second look, in the same visit.

I wrote the natural assertion — first-time text *and* standing description on the
opening look — and it failed. Nothing in the story source suggests which of the
two happens; `first time` reads equally like "say this as well" and "say this
instead."

**Weight:** medium. One wrong guess, immediately corrected by the failure output,
but it is a semantics question the source cannot answer.

### F14 — Turn-indexed sequences make the parent's turn count load-bearing across files

`define sequence the long night` fires at turns 14, 70 and 130. `arrival` spends
12 turns, so `dusk-deepens` — "the last light goes out of the sky" and the
story's switch to `midnight` — lands on the **third command of `key`**, a file
about a doormat.

That assertion is now correct and completely misleading: it is in `key.transcript`
because of how long `arrival.transcript` is. Adding one command to the parent
moves it; removing one moves it back. Every descendant of a root inherits the
root's turn budget as a hidden input, and the `midnight` state flip changes which
phrasebook answers the weathervane for the whole subtree.

Nothing warns about this, and nothing reports a transcript's turn span. It is the
tree equivalent of a shared mutable global.

**Weight:** high. It is the failure mode most likely to make a green suite go red
for a reason unrelated to the change that caused it.

### F15 — `look under the doormat` is not understood, and the mat's own text points at it

The doormat "sits a little proud of the flagstone, as if something kept it from
lying flat." The reading that clue invites is `look under the doormat`:

```
> look under the doormat
I don't understand that.
```

`search the doormat` is the verb that works. `I don't understand that` is a
parser-level rejection, so this is not the story declining to implement a
synonym — the grammar has no `look under` at all.

**Weight:** medium as a platform question, high as a story-testing one: a
transcript that only tests `search` records that the puzzle works while the
phrasing the prose invites does not.

### F16 — The inline `contains` payload cannot hold a double quote, and the story is full of dialogue

`[OK: contains "…"]` is parsed as `"[^"]+"`, so a fragment containing a double
quote needs the fenced form. Fernhill's NPC replies are almost entirely quoted
speech — Mrs Kettle's `"The study is not for visitors,"`, Tobias's `"Bank?" He
snorts.` — so the most characteristic text in the story is exactly the text the
simple assertion cannot express.

Apostrophes are fine (`"You can't see any such thing"` works); I wrote around one
unnecessarily on the first attempt and the failure output made the mistake obvious
in one run.

**Weight:** low-medium. The fence exists and is documented; the friction is that
the common case for this story needs the uncommon form.

### F17 — `[STATE:]` accepts room and entity *names*, and it is the best thing here

`[STATE: true, player.location = Fountain Court]` and
`[STATE: true, player.inventory contains tarnished key]` both work. I had written
raw ids (`r01`, `r03`) first, out of the reference doc's example, and only tried
names on a hunch.

Recording it as a positive: this is the one part of the grammar that reads like
the story rather than like the engine, and it is the assertion that survives prose
edits. The reference doc's own examples use `r06` and `nowhere`, which teaches the
opposite habit.

**Weight:** n/a — a finding in the other direction, and an argument for what the
Phase 5 editor should offer first.

### F18 — The fence syntax in the reference doc does not exist in either parser

`docs/reference/transcript-testing.md` devotes a 40-line section to "Fenced
Literal Payloads": three-or-more backticks, a closing run of exactly the same
length, markdown's wrap-in-four rule, five named validation errors, and a
closing caveat claiming the collision window was "checked across all 183"
transcripts in the repository.

None of it is real. Both parsers define:

```
const BLOCK_OPEN = 'text';
const BLOCK_CLOSE = 'end text';
```

The actual syntax is a `text` … `end text` block (ADR-287 D1). I wrote the
backtick form for Mrs Kettle's quoted dialogue, straight from the document, and
got `[OK: contains] with no inline payload requires a text block on the next
line` — an error message that is correct, and that contradicts the only
documentation of the feature.

This is worse than F2's four removed forms. Those were features that existed and
were withdrawn. This is a full specification, with invented verification, for a
syntax that was never implemented in the shape described.

**Weight:** high.

### F19 — `[STATE:]` entity names must be a single token on the left, but not on the right

`[STATE: true, player.location = Fountain Court]` passes. A two-word room name
on the right-hand side is fine.

`[STATE: true, silver locket.location = Greenhouse]` does not parse:

```
✗ State assertion failed: Could not parse expression: silver locket.location = Greenhouse
```

The left-hand entity must be a single token. Most things in a Chord story have
two-word names, so this bites constantly. The workaround is to use an `aka`
alias (`locket`, `shears`, `lamp`), which works — but only if the story happens
to declare a single-word one. An entity with no single-word alias cannot appear
on the left of a state assertion at all.

The error says "Could not parse expression" and does not mention the rule.

**Weight:** medium-high — it silently pushes authors toward `contains` on prose,
which is the assertion that does not survive prose edits.

### F20 — Tool gates require the instrument to be named, and the failure is indistinguishable from not having it

This is the biggest *story-testing* finding of the exercise.

```
> cut the fuse                                  (holding the garden shears)
You need something to cut the fuse with.

> cut the fuse with the garden shears
The shears bite through the waxed cord.
```

Same for `open the deed box` vs `open the deed box with the silver locket`, and
`open the nailed crate` vs `… with the crowbar`. The story declares
`cuttable with the garden shears` and `openable with the silver locket`, which
reads as "this is the tool" — not as "the player must name this tool every
time."

The failure text is identical whether the player is holding the tool or not.
In `fuse-lose.transcript` that difference is the difference between winning and
dying: the player is carrying the shears, types the obvious command, is told
they need something to cut with, and the fireworks go up three turns later.

I found this only because I had already asserted `player.inventory contains
shears` two files earlier and could see the contradiction. Without that, the
natural reading of "You need something to cut the fuse with" is "go find the
shears" — and the player would go looking for an item they already have.

**Weight:** high, and it is a platform question, not a story one.

### F21 — Meta commands do not consume turns, and turn-counting transcripts depend on knowing which

`score` and `inventory` do not advance the turn. `wait`, and even a *refused*
action like the second `wind the case clock` ("It is wound and walking"), do.

Any transcript that has to land on a scheduled beat — turn 14's `dusk-deepens`,
the fuse's three-turn count, the clock's one-chance-in-8 chime — depends on this
distinction, and it is discoverable only by counting backwards from a run that
came out wrong. `phrasebooks.transcript` and `channels.transcript` are both
built around exact turn arithmetic, and both took a correction pass.

**Weight:** medium-high, and it compounds F14.

### F22 — A transcript cannot continue past an ending

After a `kill` or a `win`, every subsequent command returns `Error: Engine is
not running`, and the runner classifies that as a command **error** rather than
as output:

```
> look                                             FAIL
  Error: Engine is not running
```

So `[OK: contains "Error: Engine is not running"]` cannot pass — the assertion
never runs. A losing or winning branch is only expressible as a file whose last
command is the one that ends the story, and nothing says so until the run goes
red. It also means the aftermath of an ending — what a player actually sees if
they type anything after "you have died" — has no test coverage available to it.

**Weight:** high for the editor: the editor must know that the ending command
terminates the file, or it will offer to append commands that cannot pass.

### F23 — A `gated by` channel is silent in a transcript, and the failure reads like a sparse turn

`define channel clock / mode replace / gated by sidebar`. The case clock chimes,
`emit estate-clock with hour "past midnight" when midnight` sits directly under
that chime, and `[CHANNEL: clock, is present]` fails:

```
✗ Channel "clock" said nothing this turn, expected present
✗ Channel "clock" said nothing this turn — if that is the claim,
  write [CHANNEL: clock, is absent]
```

Verified by probe, not inferred: a 46-turn run with the clock ticking
throughout, asserting `[CHANNEL: clock, is absent]` on **every** turn, passes on
every turn. The channel never speaks once in the whole story.

`channels: clock` in the header declares which channels the run captures; it
does not open the gate. The message helpfully suggests the author write
`is absent` — which is the assertion that records the broken behaviour as
correct, in a story where the sidebar clock is one of the features being
demonstrated.

**Weight:** high. A guidance message that steers the author into pinning a bug.

### F24 — The `[CHANNEL:]` assertion family is documented nowhere

Six forms — `is present`, `is absent`, `contains "…"`, `not contains "…"`,
`is <scalar>`, `is not <scalar>` — plus dotted paths into a channel record
(`[CHANNEL: clock.hour, is "past midnight"]`). None of it appears in
`docs/reference/transcript-testing.md`, on the website, or in any ADR an author
would find. I found it by grepping `parser.ts` for `CHANNEL`.

For a platform whose central architectural claim is that channels carry all
story→UI signal, the assertion family for channels being undiscoverable is a
notable gap.

**Weight:** high.

### F25 — Text defects the rewrite surfaced by reading output closely

None of these break a test. They are what an author notices only when the exact
output is in front of them, which is what a transcript makes happen.

| Output | Problem |
| --- | --- |
| `The Smoke follows you.` | Definite article on a proper name (`create Smoke`). |
| `You can see a Smoke and a deed box here.` | Indefinite article on the same. |
| `You can see a garden shears and a sherry bottle here.` | `a` + plural noun. |
| `Inside the deed box you see deed.` | No article, where the sibling line two commands earlier says `a deed`. |
| `It is pitch dark. You are likely to be eaten by a grue.` | Dungeo's stock line, in a 1920s English country house. Platform default with no obvious override. |
| `a wide mantel, — and over it Verity's photograph` | `{mantel-hint}` interpolates on the wrong side of the comma. |

**Weight:** low individually; collectively they are the argument for goldens.

### F26 — Behaviour defects the rewrite surfaced

| What | Where |
| --- | --- |
| The winning paragraph prints **twice**, back to back, in the same response. | `win.transcript` |
| The fuse's per-turn hiss fires **after** the blast that killed the player, on the same turn. | `fuse-lose.transcript` |
| The vine describes itself as "barely more than a seedling" while in the `flowering` state the next command acts on. | `vine.transcript` |
| `take the deed` on the closed box silently takes the **box** (noun-prefix match), leaving the player believing they hold the deed. No disambiguation. | probe, `folly` |
| Entity topics (`about the boiler`) fall through to the generic `ask` reply when the entity is out of scope. | F12 |
| The folly door's custom refusal is bypassed by `north`, which gets the stock "The folly door is closed." | `folly.transcript` |
| `hiding-spot` changes nothing observable — same room text, same contents, no marker. | `concealment.transcript` |
| Smoke follows from the first Kitchen visit, unfed, so the entire crowbar → crate → opener → tin → kipper chain buys one sentence. | `containers.transcript` |
| The `clock` channel never speaks (F23). | `channels.transcript` |

**Weight:** this table is the return on the exercise. Nine defects, in a story
that had a green 22-file suite, found by writing 15 files against it.

### F27 — There is no count assertion, so "printed twice" cannot be asserted

The winning paragraph duplicating is invisible to `contains`, which passes
identically for one occurrence or two. Exact `[OK]` would catch it, but only by
pinning the atmospheric lines and the cat's follow line alongside it, which
makes the assertion break on any unrelated prose edit.

So the single clearest bug the exercise found is one the grammar cannot express
as a test.

**Weight:** medium-high.

---

## What the diff against the baseline says

Written before looking: 15 transcripts, 161 authored commands, 5 roots.
Baseline: 22 transcripts, 518 authored commands, and — read afterwards — a
structure that answers F14 directly.

**The baseline's roots are deliberately tiny.** `arrival` is **2 commands**.
`key` is **2 commands**. Fourteen of the 22 files hang off one of those two
stubs. My `arrival` is 12 commands and my `key` is 6, and the consequence
showed up immediately: turn 14's `dusk-deepens` landed in the middle of
`key.transcript`, a file about a doormat (F14).

The original author had clearly hit the same problem and solved it structurally
— keep the shared prefix as short as possible so descendants inherit almost no
turn budget. Nothing in any document says this. It is a load-bearing convention
that exists only in the shape of the files, and it was the single most useful
thing the diff taught me.

My tree is also much deeper (`machine → vine → folly → fuse-cut → win`, five
levels) where the baseline is nearly flat (two levels). Deep chains make each
file read as a story, and make every file downstream hostage to the turn budget
of everything above it.

### Covered by both

`arrival`, `key`, `cellar-dark`, `containers`, `concealment`, `frost-seal`,
`machine`, `npcs`, `phrasebooks`, `fuse` / `fuse-lose`, and the win — though the
baseline reaches the win as one 54-command spine (`the-long-night`) where mine
arrives through a five-file chain.

### Missed entirely

| Baseline file | What it covers | Why I missed it |
| --- | --- | --- |
| `recorded` | **Golden recordings** — `[OK]` + `text` block, byte-exact, `[SKIP]` for the opening turns | The whole assertion *mode*. F9 sent me looking for `--bless`, found nothing, and I never came back to it. The mechanism was expressible in the grammar I already had. |
| `dawn-lose` (115 cmds) | Turn 130 `lose dawn-comes` | I tested turn 14 and never went past it. 115 commands of waiting is a cost I did not pay. |
| `media-degrade` | Sound / music / image beats degrading legibly in text | Skipped for time; it is the `when client has …` surface, untested by me. |
| `restart` | `RESTART` meta command (ADR-248) | Never occurred to me to test a meta command. |
| `compass` | The full exit network, first-visit prose, region transitions | I tested exits incidentally, never systematically. |
| `doors` | The pantry door's **two-sidedness** (bolt on the pantry side) | I opened the pantry door and walked through without ever testing the bolt. |
| `timeline` | The long night's full schedule as its own file | Folded into `phrasebooks`, so the schedule is only tested at turn 14. |
| `tool-gates` | The keyless tool-gate chain as one file | Split across `machine` / `containers` / `fuse-cut`; I found F20 by accident rather than by testing the gates as a family. |
| `smoke` | `smoke-nose` in the Greenhouse once fed | Fed the cat, never walked it to the greenhouse. |
| `e-group` | Vine + wind + hot poker as one group | Split across three files. |

**The pattern in what I missed.** Everything above is either (a) a mode I never
found because discovery failed — goldens, meta commands — or (b) a beat that
costs many turns to reach, where I stopped at the first confirmation instead of
following the schedule to its end. Nothing was missed because the mechanic was
hard to test once found. That is a discoverability finding, not a competence
one, and it says the editor's job is to make modes and long-schedule beats
*visible*, not to make assertions easier to type.

---

## Suite as written

15 transcripts, 161 authored commands, all green
(`196 commands (161 authored + 35 replayed)`).

| Transcript | Continues | Cmds | Covers |
| --- | --- | --- | --- |
| `arrival` | (root) | 12 | Opening, `first time` semantics, blocked exit, evening phrasebook |
| `key` | `arrival` | 6 | `concealed`, `search`, scoring, turn-14 spill (F14) |
| `cellar-dark` | `key` | 10 | Lockable door, darkness, light source, `, once` |
| `containers` | `cellar-dark` | 17 | Tool-gate chain, authored trait (`feedable`), red herring |
| `npcs` | (root) | 16 | String topics, guard block, bribe, rank promotion, `text` blocks |
| `concealment` | `npcs` | 10 | Hiding spot, implicit take, diary-gated conditional detail |
| `machine` | (root) | 13 | State machine, ordered refusals, distant state change |
| `vine` | `machine` | 13 | Region re-entry, `select on its state`, `move` into a room |
| `folly` | `vine` | 9 | Conditional door refusal, `after entering, once`, sequence start |
| `fuse-cut` | `folly` | 7 | Named-instrument gates, winning branch |
| `fuse-lose` | `folly` | 3 | `kill`, ending terminates the file (F22) |
| `win` | `fuse-cut` | 5 | `win`, duplicate emission (F26) |
| `frost-seal` | (root) | 7 | Conditional blocked exit, stacked refusals |
| `phrasebooks` | (root) | 18 | ADR-250 book switching, per-book first-time counters |
| `channels` | (root) | 15 | `[CHANNEL:]` family, `windable`, gated-channel silence (F23) |
