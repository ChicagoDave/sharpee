# ADR-330: Chapters in Chord — a `use chapters` extension of declared events, not statements

**Status**: **ACCEPTED** (David, 2026-08-29 — "accept and start"). David's syntax and semantics,
2026-08-29, session after eec23b — "chapters are events"; ruled an **extension**, not core
language, the same day ("extension"); reshaped to a `define chapters` block the same day. All
open questions resolved through the rule-11a interview 2026-08-29 (Q-1 triggers, Q-2 numeral →
voided by the block, Q-3 opening row mandatory, Q-4 stale triggers, Q-5 `during`/`before`/`after`,
Q-6 description on the wire, Q-7 IDE deferred, Q-8 prologue → a row); `adr-review` 19/19 after
eight clerical fixes (three link targets, the ADR-214 anchor attribution, the `while`/`during`
head pair, the save-format bump, the `story.chapter` key, one claim's inline evidence).
**IMPLEMENTED 2026-08-29** (plan `docs/work/archive/adr-330-chapters/plan.md`, five phases, one session): `@sharpee/ext-chapters` + the grammar in `packages/chord`, the loader lowering, the `story.chapter` channel and its browser title card, `during`/`before`/`after`; real path `packages/story-loader/tests/adr-330-chapters.test.ts` (10 on `GameEngine.executeTurn`); chord 1122, story-loader 1002, platform-browser 148 green; corpus baselines byte-identical; Secret Letter carries the block. Two amendments at implementation: D4 (no save-format bump — chapter state is world state; the opener is current before turn 1) and D5 (`during` at every `while` site).

**A trusted extension (ADR-215), `use`-gated — the shape `use scoring` (ADR-261) and `use
hunger` (ADR-263 D4) took.** Expected surfaces: `packages/chord/src/parser.ts` (one new
top-level declaration, admitted only under `use chapters`), `packages/chord/src/analyzer.ts`
(the `use` gate beside `usedExtensions`, numeral/title/trigger validation, ordering gates),
`packages/chord/src/ir.ts` (`ir.chapters`), a chord-side `CHAPTERS_MANIFEST` pinned to the
registry by the manifest-conformance test; **`packages/extensions/chapters`** — the runtime,
registered through `@sharpee/story-loader`'s `EXTENSION_REGISTRY`: `registerPlugin` installs
one TurnPlugin that watches the trigger moments, keeps the current chapter as loader-owned
world state, and emits the `story.chapter` packet; the `story.chapter`
channel definition lives in the extension and registers through the registry entry's
`registerChannels` slot (its first live use); the clients (a title-card renderer, ADR-165). EBNF rows (`use
chapters`, `define-chapters`, the `during`/`before`/`after` atoms) + `chord-grammar-changes.md` + ADR-257 version bump per the
usual paper trail. **No engine, world-model, or loader-core change** expected: the triggers
ride events the loader already handles (`before the game starts`, ADR-327 D10; the arrival
`entering` event, ADR-327 D5; ADR-325 timer expiry; the `when <owner> becomes <state>` sequence anchor, ADR-214), and a story
without `use chapters` is untouched even lexically — `chapter` stays a free word.

**Date**: 2026-08-29
**Related**: [ADR-163](adr-163-channel-service-platform.md) (channels carry every story→UI signal — a
chapter beginning is one), [ADR-165](adr-165-renderer-architecture.md) (the client decides how a
title card looks; the wire is data), [ADR-306](adr-306-testing-play-surface-revamp.md)
(ruled "chaptering" out of the Testing surface's split/merge — see Non-goals),
[ADR-325](adr-325-chord-presence-and-duration.md) D3e/D3h (the `when <x> expires` /
`when <x> moves` event-clause heads this declaration's triggers sit beside),
[ADR-327](adr-327-explicit-references.md) D10 (`before the game starts` — "the game starts"
is that moment), [ADR-298](adr-298-story-block-metadata.md) (the story header; chapters are not
header fields), [ADR-257](adr-257-chord-language-version.md)
**Issues**: none yet — the Secret Letter port is the driver (`docs/work/secret-letter-port/plan.md`,
Phase 6: "what ends Chapter 1 at Commerce Street")

## Context

*Jack Toresal and The Secret Letter* is written in chapters, and the port reached the end of
its first one on 2026-08-29: Jack walks out of Grubber's Market onto Commerce Street. Chord
had no way to say that a chapter had ended or a new one begun. The first proposal in that
session was imperative — `begin chapter 1 - <name>` / `end chapter 1` as statements inside
clauses, the way `win`/`lose`/`kill` are — and David overruled it the same hour:

> chapters are events: Chapter I - Grubber's Market begins when the game starts.
> Chapter II - Commerce Street begins when the player visits Commerce Street for the first time.

That is a different shape, and a better one for this language. A chapter is not something a
clause *does* on the way through; it is a fact about the story's structure that the author
*declares*, in one place, with the moment it begins. The runtime watches for the moment. The
author never writes `end` — a chapter ends when the next one begins — and never has to find
the right clause to hang a statement on. It is the same reading Chord already gives timers
(`when search expires`, ADR-325 D3e) and sequences (`when the strongbox becomes open`,
the ADR-214 sequence anchor): the event is named where the thing that owns it is declared.

## The block first

Secret Letter, Chapter 1 as built, with the chapter lines added. Every line marked `##
UNSHIPPED` is grammar this ADR proposes; nothing else in the block changes.

```chord
story
  title: Jack Toresal and The Secret Letter
  states: calm, hunted, chase
  use chapters                                                                ## UNSHIPPED

define chapters                                                               ## UNSHIPPED
  market - Chapter I: Grubber's Market
    A stolen apple, and a girl the whole city is about to start looking for.
    begins when the game starts
  commerce - Chapter II: Commerce Street
    begins when the player visits Commerce Street for the first time
end chapters

before the game starts
  change the player to Jack
end before

create Commerce Street
  a room
  aka commerce, the street
  west to the Eastern Junction
  first time
    (PLACEHOLDER — David's line. "You made it.")

  (PLACEHOLDER — David's line. Commerce Street, the chapter's way out.)
```

One block at the top level, beside the story header. Nothing in Commerce Street's own
block mentions a chapter: the room does not know it ends one. When Jack steps east from the
Eastern Junction, the arrival event fires, the runtime sees it is her first visit, `market`
is over and `commerce` has begun, and the client is told so — title and description included.

## Decision

### D1. Chapters are one `define chapters` block under `use chapters`: a name for code, a title for the reader, an optional description, and the moment each begins

(Shape ruled 2026-08-29, David: "a define chapters block with: name (used in code), title,
description (optional)" — replacing the one-line-per-chapter form and, with it, the Roman
numeral rule Q-2 had settled.)

`use chapters` in the story header admits the block (ADR-215's gate: `define chapters`
without it is a compile error with the fix-it naming the `use` line, exactly as `rank` without
`use scoring`). One block per story; one row per chapter:

```
define chapters
  <name> - <title>
    [<description>]          ← an indented prose paragraph, optional
    begins when <event>
end chapters
```

- **`<name>`** is the identifier — one kebab word, what conditions say (D5: `during market`).
  It is never printed.
- **`<title>`** is prose, spaces and all, and it is what the client prints. Numbering is the
  author's to write into the title or leave out — `Chapter I: Grubber's Market`, `Prologue`,
  `Coda` — the grammar parses nothing of it. There is no numeral rule.
- **`<description>`** is an optional paragraph in the phrase-body shape every other define
  block uses; it rides the wire with the title (D4).
- **`begins when <event>`** is the trigger (D2), required, last in the row.

Rows are in reading order and that order is the chapters' order; a repeated name is a compile
error. A prologue or an epilogue is simply a row (`prologue - Prologue: Maiden House …`); the
opening row is the one on `the game starts` (D2).

### D2. The trigger is an event, not a condition

`begins when` names a *moment*, the way `when search expires` does — never a standing
condition the runtime would poll. Two spellings are decided by David's own two lines:

- **`the game starts`** — the moment the start block has run and the first turn is about to
  begin (ADR-327 D10). **A story that says `use chapters` must open a chapter here, and only
  one** (resolved 2026-08-29, Q-3, David: "100% compile error"): `use chapters` with no
  chapter on `the game starts`, or with two, is a compile error naming the line. There is no
  "in no chapter yet" state for the plugin, the client, or a predicate (D5) to represent — an
  un-chaptered opening is spelled as a chapter (a prologue, D1). A story without `use
  chapters` is unchanged (ADR-310 D7's rule).
- **`the player visits <room> for the first time`** — the first arrival of the role-holder in
  the named room, whoever holds the role at the time (the role, not a character, ADR-327
  D9). Rides the same arrival event `after the player entering, once` rides.

Two more moments are legal (resolved 2026-08-29, Q-1, David: "go with your
recommendation"), because they are the moments a story *plans*:

- **`<timer> expires`** (ADR-325 D3e) — a row `ball - Chapter IV: The Ball` whose trigger is
  `begins when the bell expires`.
- **`<entity> becomes <state>`** and **`the story becomes <state>`** (the `define sequence`
  step anchor, ADR-214 — `sequence-step` in `chord.ebnf`) — a row `chase - Chapter III: The Chase` with `begins when the story becomes chase`
  would have opened this very chapter.

`<entity> moves` (ADR-325 D3h) is **not** a trigger until a story asks for it. The principle
stands: a trigger is drawn from the event vocabulary the language already has, never a new
one minted for chapters.

**"Visits" is any arrival, teleport included.** An authorial `move the player to <room>`
counts as the first visit exactly as it fires `after the player entering, once` and a room's
`first time` today (ADR-327 D5's move-arrival firing, implemented in commit f9e8fe3a, 2026-08-25, with
ADR-326's `a random adjacent room`); chapters draw no distinction the runtime does not
already draw. This is a premise of Acceptance 3, whose authorial-move case is the check that
establishes it on the real path.

### D3. A chapter ends when the next begins; there is no `end chapter`

The last declared chapter runs to the end of the game. A chapter's trigger firing while that
chapter or a later one is already running is **not a chapter change: the runtime ignores it
and raises the diagnostic `runtime.chapter-stale`, naming the row** (resolved 2026-08-29, Q-4,
David: "go with your recommendation") — ADR-329 D4's posture, a diagnostic rather than a
crash, telling the author something true about the story's shape. No compile-time gate
attempts to prove triggers fire in order; a first visit can happen at any time.

### D4. A chapter beginning is a story→UI signal, on its own channel

Per ADR-163 every story→UI signal is a channel; a chapter beginning is a packet on a
`story.chapter` channel (the dotted key convention `info.title` / `info.description`
follow) — name,
title, description (empty when the row has none), ordinal — emitted on the turn the trigger
fires, after that turn's prose (the arrival text is `market`'s last words, not `commerce`'s
first). That is the whole packet (resolved 2026-08-29, Q-6, by D1's shape: the description
IS the epigraph slot). The wire is data (ADR-165, and the
standing rule that the web client is author-customizable with a data-only wire); how a title
card looks is the client's. The current chapter and each row's fired flag are ordinary world state under `chord.chapter.*`
keys (the home of the story's own state, ADR-264's counters and ADR-325's timers), so
save/restore and undo carry them with **no save-format change** — amended 2026-08-29 at
implementation: a world-state key rides the existing snapshot, exactly as ADR-325's timer
records do (the 3.0.0 format bump was ADR-293's, commit 6705d090, not ADR-325's), and
Acceptance 5 passed on the real path without touching `SAVE_FORMAT_VERSION`. A save written
before chapters existed simply has no `chord.chapter.*` keys: the opening row fires on the
next turn as on a fresh game.

### D5. Chapters are structure the story states, not scope

A chapter row does not scope declarations, does not gate clauses by itself, and does not
change what any other construct means. It is **readable** (resolved 2026-08-29, Q-5, David:
"the author may use `during commerce` as a where clause"; spelling per the recommendation):

- **`during <name>`** — true while that chapter is the current one. A condition atom, usable
  wherever a condition is (`while`, `when`, `refuse when`, under `and`/`or`) — **and a head
  suffix in its own right**, standing beside `while` on an `on`/`after` head, so the line an
  author writes is `on the player talking during commerce`, never `… while during commerce`.
  (Amended at implementation, 2026-08-29: the suffix stands **wherever a line takes `while
  <condition>`** — `on`/`after` heads, blocked and deadly exits, `phrase … :` overrides and
  `define phrase` gates, phrasebook headers and `use phrasebook`, timer and move clauses, a
  composition's `while` — which is what this decision's own `phrase detail during market:`
  example needs; the plan-review tension on D5's scope resolved to the superset.)
  The opening chapter is current **before the first turn** (the loader seeds it at the
  ADR-327 D10 start moment; the plugin announces it on turn 1), so `during <opener>` holds
  while turn 1 renders. A chapter that begins on an arrival begins after that turn's prose
  (D4), so the arrival text itself still reads as the previous chapter.
  A head takes **one** of `while <condition>` or `during <name>`; both on one head is a parse
  error (`parse.head-while-during`) naming the composed form — `while during commerce and
  hunted` — so the pair is never ambiguous and `during` on a head is exactly sugar for
  `while during <name>`.
- **`before <name>`** and **`after <name>`** — the chapter has not begun / is over. Condition
  atoms only: `while before commerce`, `while after commerce`. `after` is already a clause
  head, so it never stands as a head suffix.

```chord
create the grocer
  on the player talking during commerce
    refuse no-time-to-chat
  end on

  phrase detail during market:
    The stallkeeper looks nervous and irritable.

on every turn while hunted and during market
  …
```

No parallel story state is needed for "this only happens in the market chapter" — which is
the reason to make chapters readable at all.

## Non-goals

- **Not a Testing-surface unit.** ADR-306 ruled chaptering out of the Testing tab's split/merge
  (its ruling 4). This ADR does not reopen that; a chapter beginning is a narrative event the
  tree can assert on like any other output, nothing more, unless a later ADR says otherwise.
- **Not a declaration scope, not an import boundary.** The import graph (ADR-251) is where a
  story is cut into files; chapters and files need not coincide.
- **Not a place for prose.** The title is a name. Chapter-opening text belongs to the room or
  the clause that fires it (`first time`, a phrase), not to the chapter line.
- **Not `begin`/`end` statements.** The imperative form proposed and withdrawn on 2026-08-29 is
  not a second spelling; neither is the one-line `chapter I - … begins when …` form the block
  replaced the same day.

## Consequences

- A new trusted extension — `packages/extensions/chapters`, a registry entry, a manifest and
  its conformance pin — and one `use`-gated top-level declaration in the grammar (ADR-257: an
  additive minor when it lands, or folded into the unpublished 3.5.0 set per D2 as amended).
  Stories that do not `use chapters` compile and run byte-identically.
- A new channel key (`story.chapter`), and every client (web, IDE Play, bridge hosts) decides what to do with a
  `chapter` packet — the platform default should be a title card, and a client that ignores it
  loses nothing but the card.
- The analyzer gains the ordering and uniqueness gates in D1–D3, in the same shape as the
  duplicate-timer and duplicate-greeting gates.
- The IDE's Index (ADR-258) gains a natural top-level grouping the moment the IR carries
  `chapters` — **not designed here** (resolved 2026-08-29, Q-7, David: "go with your
  recommendation"): `ir.chapters` is the seam, and the grouping — and any Testing-tab view,
  if ADR-306's ruling is ever revisited — gets its own IDE ADR on the IDE's timeline.

## Acceptance

1. **The block compiles** — the Secret Letter block above, `use chapters` and the
   `define chapters` block included, compiles with no diagnostics; `ir.chapters` carries two
   entries in order with name, title, description (one empty), and trigger. The same block
   without `use chapters` fails on `define chapters` with the fix-it; the manifest-conformance
   test pins `CHAPTERS_MANIFEST` to the registry entry.
2. **`market` begins at the start** — on `GameEngine.executeTurn` of the first command, the
   turn's channel output carries a `chapter` packet for `market` (title and description
   verbatim), after the start block has assigned the role. Real path, not a stub (rule 13a).
3. **`commerce` begins on first arrival, once** — walking east from the Eastern Junction emits
   the packet for `commerce` after that turn's arrival prose; walking away and back emits
   nothing; `move the player to Commerce Street` (authorial) counts as the visit too (D2). A
   chapter on `<timer> expires` and one on `the story becomes <state>` each fire on their
   moment, once.
4. **The gates hold** — two rows on `the game starts`, none on `the game starts` under `use
   chapters`, a repeated name, a row without `begins when`, or a second `define chapters`
   block is a compile error naming the line.
5. **Save/restore keeps the chapter** — a save taken in `commerce` restores into `commerce`,
   and no packet re-fires on restore (a pre-chapters save has no `chord.chapter.*` keys and
   opens the first row on its next turn, as a fresh game does).
6. **Nothing changes without chapters** — every existing corpus story compiles and runs
   identically (Dungeo chain, fernhill, ides, secret-letter baselines byte-identical).
7. **Chapters are readable** — `during market` holds through the market and not after;
   `before commerce` / `after commerce` flip at the arrival; `on the player talking during
   commerce` fires only then. A `during`/`before`/`after` naming a row that does not exist is
   a compile error.
8. **Paper trail** — EBNF `use chapters` and `define-chapters` productions plus the
   `during`/`before`/`after` condition atoms and the `during` head suffix,
   `chord-grammar-changes.md` row, the website grammar reference, and the version pin.

## Session

Written 2026-08-29 in the session that built Secret Letter's escape disguise and chase rails
(`docs/context/session-20260829-1710-feat-adr-321-world-index.md`), after David's ruling in
chat: "chapters are events: Chapter I - Grubber's Market begins when the game starts. Chapter
II - Commerce Street begins when the player visits Commerce Street for the first time."
