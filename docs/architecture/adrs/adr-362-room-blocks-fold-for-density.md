# ADR-362: Blocks fold for density

**Status**: DRAFT (2026-10-08, session 1a5de8). A proposal to assess. David asked for "some way to tighten the syntax" and chose folding lines inside the existing block over a separate one-line room form ("yes, write the fold ADR"). The specific rules are Claude's drafting, made below with reasons, for his review. Region membership, first drafted here, moved to ADR-360 when David chose regions that declare their rooms. No open questions. Not yet reviewed (`adr-review` has not run).

**Scope**: `packages/chord` (parser, `chord.ebnf`), `docs/architecture/chord-grammar-changes.md` (a row per decision), and the editor tooling that knows Chord's line forms (`tools/ide/editor-bridge`'s lexer and completion services, and the macOS editor's Swift lexer, ADR-258 D7).

## Date: 2026-10-08

## Parent

- **Shares ground with ADR-360** (a region declares its rooms) **and ADR-361** (hatches are removed), written the same session; all three ride one language-version bump. This ADR is additive on its own (D4). **ADR-360's region exit table uses this ADR's exit syntax**: a row of the table and an `exits:` line list exits the same way, and must stay the same.
- **Keeps ADR-359 D1** (every block names its kind, and the kind leads the block): D1 folds the kind line, it does not make it optional.
- **Related**: ADR-234 (exit lines, `through <door>`, `, one-way`), ADR-358 (completion offers the next line, and must learn the folds), GH #568 (`in`/`out` are missing from exits; when added they fold like any direction).

## Context

**Density matters for ports and not for prose.** A story written in prose — UPPS, Fernhill, Secret Letter — has rooms whose bodies are mostly description. A port of a period game is the opposite: UNDERGROUND (1979) has 87 rooms and 231 exits (`underg/extracted/world.json`), and most of its rooms are a heading, a sentence and a list of exits. ADR-360 handles the identical rooms; the rest are ordinary blocks, and in today's Chord a block spends a line on its kind and a line on every exit.

**Ports need exact exits.** A plain Chord exit infers its reverse; only `, one-way` stops it (`chord-grammar-changes.md`, 2026-09-03). The 1979 data lists every exit per room and many do not reciprocate, so a faithful port writes `, one-way` on every line.

**A separate one-line room form was rejected** (David, 2026-10-08). `room the Maze 61 in the Maze: east the Maze 62, …` is dense, but it is a second way to make a room: a room would change form the moment it gained a description, and completion, the index and diagnostics would each need a second path.

## Decision

**D1 — The kind line may fold onto the `create` line.** `create <name>, <composition line>` means exactly `create <name>` followed by that composition line as the block's first line: `create the Mine 25, a room`, `create the brass lamp, a thing, lightable`, `create the Maze, a region`. Only the first composition line folds, because it is the kind line ADR-359 D1 requires first. It applies to every kind. A name cannot contain a comma, so the first comma ends the name.

```ebnf
create       = "create" name [ "," composition { "," composition } ] NL
               >>> { create-line } ;   (* the folded compositions are the block's
                                          first composition line; the kind noun
                                          must lead them, as ADR-359 D1 requires
                                          of an unfolded kind line *)
```

**D2 — A block's exits may collect onto one `exits:` line.** `exits: <exit>, <exit>, …` means the same exits written one per line, where each `<exit>` is `<direction> to <room> [through <door>]`. `exits, one-way: …` makes every exit on the line one-way, which is how a port says "these are the only exits". A per-exit `, one-way` is not allowed inside an `exits:` line, because a comma there already separates exits; a room that mixes the two writes an `exits:` line and an `exits, one-way:` line, or single exit lines. `<direction> is blocked …` lines do not fold: they carry a condition and a phrase key. A block may mix `exits:` lines and single exit lines.

```ebnf
exits-line   = "exits" [ "," "one-way" ] ":" exit { "," exit } NL ;
exit         = DIRECTION "to" name [ "through" name ] ;   (* shared with ADR-360's
                                                              region exit table *)
```

The `exits:` line is legal only in a room block (`analysis.exit-line-owner` elsewhere). ADR-360's region exit table is `exits` with no colon, followed by indented rows, and is legal only in a region block; the colon and the block tell them apart, and both use the one `exit` production. Two exits in one direction, from any mix of `exits:` lines, single exit lines and ADR-360's table, are ADR-360 D3a's `analysis.duplicate-exit` (GH #569).

**D3 — Nothing else folds.** Placement could (`create the Maze 64, a room in the Maze`), and other lines could join with commas, but every fold is another spelling of the same block for authors, completion and diagnostics to learn. The kind line every block has, and the exit lines a port has many of, are where density comes from. Further folds need their own case.

**D4 — A folded block compiles to the same IR as its unfolded form.** Folding is parsing only, so it is additive and changes no existing story. Spans point at the folded text: a diagnostic on a folded exit lands on that exit inside the `exits:` line.

### Before and after

UNDERGROUND's room 24, with its 1979 heading and description verbatim (the port's rule is that the original's text, typos included, stands). The names of its neighbours are illustrative. Today:

```chord
create the Mine Entrance 24
  a room
  room name:
    Mine enterance
  northeast to the Tunnel 22, one-way
  southeast to the Tunnel 21, one-way
  up to the Mine 25, one-way
  down to the Mine 25, one-way

  You are at the enterance to an abandoned mine. Exits go NW and SW,
  and a dark mine corridor is below.
```

Folded (not yet valid Chord):

```chord
create the Mine Entrance 24, a room
  room name:
    Mine enterance
  exits, one-way: northeast to the Tunnel 22, southeast to the Tunnel 21, up to the Mine 25, down to the Mine 25

  You are at the enterance to an abandoned mine. Exits go NW and SW,
  and a dark mine corridor is below.
```

Eight structural lines become four, and `one-way` is said once.

UPPS's Sorting Room (`branch-stories/upps/upps.story:15-24`), a prose room, today and folded:

```chord
create the Sorting Room
  a room
  aka depot, sorting
  east is blocked: dock-sealed

  Pigeonholes climb every wall of the depot, …
```

```chord
create the Sorting Room, a room
  aka depot, sorting
  east is blocked: dock-sealed

  Pigeonholes climb every wall of the depot, …
```

One line saved, and nothing else changes. A prose story can ignore the folds; the unfolded form stays valid.

## Acceptance Criteria

1. **AC-1 (D4, same IR).** Each corpus story compiled before and after a mechanical fold (D1 on every block, D2 on every block with two or more plain exits) produces identical IR apart from spans. **MECHANICAL**, and the main guard that folding is only parsing.
2. **AC-2 (D1).** `create the brass lamp, a thing, lightable` compiles to the same entity as its two-line form; `create the brass lamp, lightable` fails with ADR-359's `analysis.missing-kind-noun`, as the unfolded form does. **MECHANICAL, NEGATIVE.**
3. **AC-3 (D2, one-way).** In a loaded world, `exits, one-way: east to the B` gives the room an east exit and B no inferred west exit; `exits: east to the B` gives B a west exit. **MECHANICAL**, on the loaded world.
4. **AC-4 (D2, what doesn't fold).** `exits: east to the B, one-way` is a parse error naming the `exits, one-way:` form; a `north is blocked: …` inside an `exits:` line is a parse error; an `exits:` line in a region block fails with `analysis.exit-line-owner`; `exits: east to the B` beside a single `east to the C` line fails with `analysis.duplicate-exit`. **NEGATIVE.**
5. **AC-5 (D4, diagnostics).** An unknown room named in the middle of an `exits:` line reports its span on that exit, not on the whole line. **MECHANICAL.**
6. **AC-6 (tooling).** The editor's completion offers `exits:` and `exits, one-way:` where an exit line may go, and after `create <name>, ` offers the kind nouns; the macOS and editor-bridge lexers colour `exits` as a keyword. **MECHANICAL**, in the editor-bridge and IDE suites.
7. **AC-7 (reserved surface).** No line in the corpus, the manual or the docs begins with `exits` as anything other than this form, checked before the word is reserved (the ADR-267 audit precedent). **MECHANICAL.**

## Consequences

- **Two spellings for two things.** A kind line and a run of exit lines can each be written two ways. That is the price of density, kept to the two places it pays.
- **Ports get exact exits in one word.** `exits, one-way:` per room transcribes a port's exit table directly, with no phantom reverse exits.
- **Completion and the lexers learn new forms.** ADR-358's completion is line by line; the `exits:` line and the folded head are new positions it must offer.

## Session

Session 1a5de8, 2026-10-08, on `main`. David asked for a way to tighten Chord's syntax after setting aside a maze macro; Claude proposed a one-line room form (rejected) and folding (chosen). The first draft also moved region membership onto the room; that moved to ADR-360 when David chose regions that declare their rooms. `adr-review` the same session scored 10/12 NEEDS WORK; the fixes added EBNF for both folds and the rule separating the `exits:` line from ADR-360's table, and tied mixed exits to ADR-360 D3a's duplicate-exit gate (GH #569).
