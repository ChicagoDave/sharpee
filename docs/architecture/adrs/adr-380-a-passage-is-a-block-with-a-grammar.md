# ADR-380: A passage is a block with a grammar, and a flight's trip time is its pace

**Status**: **ACCEPTED** (David, 2026-10-21, session 1588df: "yes", after the open questions interview resolved Q-1 → D2a and `adr-review` returned 22/22 with four fixes folded: the block's inner-line order, the Cloak citation and the meaning of a used slot, persistence, and the supersession notes). Written 2026-10-21, session 1588df, on `chord-4-0`, at Phase 0 of `docs/work/chord-4-0/plan-20261021-alignment-fixes.md`, from David's rulings in that session: "we need a way better way to define phrase commands"; "articles have to be optional and allowed"; "keep end passage (as long it's consistent, I'm cool)"; "yes write the ADR, and P for Q4". Supersedes ADR-378 D1's line form (`passage <words> { or <words> } to <Room>`) and its `passage <words> is blocked:` / `is deadly:` lines; ADR-378 D1a, D1b, D2's gate, D3's meaning of `while`, D5 and the rest of that record stand. Amends ADR-366 D5d (`passage:` on a flight vehicle). No implementation is authorized; every `packages/` change is gated on its plan phase (Phase 7, after Phase 5's F5).

## Date: 2026-10-21

**Kind**: technical

**Scope**: `packages/chord` (the passage block, the grammar pattern rule for articles, the flight vehicle's `pace:` line, `chord.ebnf`), `packages/story-loader` (the passage block's lowering; the article handling it does today moves out), `packages/parser-en-us` (articles optional in typed input for every pattern), `packages/world-model/src/traits/vehicle/` (the flight model's `passage` field becomes `pace`), `branch-stories/upps` (the Cable Trench and the courier ship), `stories/vehicles` (the Sparrow), `docs/architecture/chord-grammar-changes.md`, the Chord guide and the IDE Docs tab.

## Parent

- **ADR-378** (passages and pushing between rooms): D1's line form is what this record replaces; D2 (a passage's words are grammar only where the passage is, gated), D3 (`while` means the exit exists only while the condition holds) and D5 (grammar rules carry gates) are kept as written.
- **ADR-267** (grammar pattern constructs): the `grammar` block's pattern language — one command per line, `or` joining words (D8), `[optional]` elements, `the <name>` as the one slot spelling (D15). This record makes it the only pattern language a story writes.
- **ADR-366 D5d, D5f** (free flight; `pace:` is how many turns a step takes, and "the types share one machine and differ only in what a step is … the destination after the passage").
- **The sweep and ledger**: `docs/work/chord-4-0/ddd-sweep-20261021.md` D1 (`passage` names two concepts) and D23 (two pattern languages for typed commands, raised 2026-10-21 in Phase 0); `alignment-ledger.md` F5 (articles stripped by the language-neutral loader).

## Context — measured, not assumed

**Chord has two pattern languages for the words a player types.** The `grammar` block (`define action`, `extend action`, `remove from action`) writes one command per line; `or` joins two words into one alternation element (`slide the target with or using the item`, `branch-stories/secret-letter/aerial-runway.chord:299-310`; `chord/src/parser.ts:5927-5935`); `[…]` marks an optional element; `the <word>` is always a slot (`parser.ts:5919-5926`). The `passage` line (`parser.ts:2912-2995`) writes every command on one line; `or` separates whole commands (`passage follow the cables or crawl along the cables to the Sorting Room while the Cable Trench is not dark`, `branch-stories/upps/upps.story:344`); `the` is a literal word; there is no optional element; the gate rides the end of the same line; and a blocked or deadly passage is a second line that repeats the first command's words to name it (`passage <words> is blocked: …`), because the key is minted from them (`passage:<first form, hyphenated>`, `parser.ts:2963`). The same author typing `or` gets two meanings depending on which construct they are in, and one line carries the words, their alternatives, the destination, the gate and an implicit key.

**Articles are stripped by the wrong layer.** The loader registers each passage form as written and again with `a`/`an`/`the` removed (ADR-378 D2; `story-loader/src/loader.ts:1765`, `ARTICLES` at `:3040`), so the language-neutral loader knows English articles (ledger F5).

**`passage` names two concepts.** `passage: 3 turns` is a flight vehicle's time between destinations (IR `IRVehicle.passage: number`, `chord/src/ir.ts:273-274`; `VehicleTrait`'s flight model `passage`, `world-model/src/traits/vehicle/vehicleTrait.ts:115-119`; required by `analysis.flight-no-passage`, `chord/src/analyzer/entity/vehicle.ts:599`), and `passage <words> to <Room>` is an exit reached by its own words (IR `IRExit.passage: string[]`, `ir.ts:1038-1042`). Both arrived on `chord-4-0`. The flight's line is the one that is not a new concept: every other moving type says `pace:` for turns per step (`IRVehicle.pace`, `ir.ts:268-269`, "turns per step (`line` under `control`, `compass`)"), and ADR-366 D5f names a flight's step as the trip.

**Every block nested in a `create` closes with `end`.** `on … end on`, `position … end position` (`parser.ts:1994`, `stories/vehicles/vehicles.story:49-52`), `pushing … end pushing` (`parser.ts:2042`, `upps.story:214-216`). Top-level `define action` and its `grammar` sub-block close by indentation.

## Decision

**D1 — A passage is a block the room owns.** A room block takes:

```
passage to <Room | outside> [ through <door> ]
  grammar
    <pattern>
    <pattern> …
  [ while <condition> ]
  [ blocked [ while <condition> ]: <phrase> ]
  [ deadly: <phrase> ]
end passage
```

- The head names where it leads, with `through <door>` as on any exit line (ADR-234 D1). It takes no `admits` and no `, one-way`: a passage is one-way by construction and nothing is pushed through it (ADR-378 D1, D6, unchanged).
- `grammar` is the same sub-block `define action` carries, closing by indentation as it does there. Each line is one command the player may type; ADR-267's elements apply (`or` joins words, `[…]` is optional).
- `while <condition>`: the passage exists only while the condition holds; while false its commands are not grammar and the input falls through to the standard grammar or to not-understood (ADR-378 D2, D3, unchanged in meaning).
- `blocked [while <condition>]: <phrase>`: the passage exists and refuses with the author's phrase (ADR-240's blocked exit). `deadly: <phrase>`: as on a compass exit (ADR-227). Both live inside the block; nothing outside it refers back to a passage.
- **Order and number.** `grammar` is the block's first line. After it, in any order: at most one `while`, at most one `blocked … :`, at most one `deadly:`. A second of any is `analysis.passage-line-duplicate`; anything else in the block is `parse.passage-line`. A passage that is both hidden (`while` false) and blocked is hidden: existence is read before blocking (ADR-378 D3, unchanged).
- `end passage` closes it, as every other block nested in a `create` closes (David, 2026-10-21: "keep end passage (as long it's consistent, I'm cool)").
- **No name.** Nothing outside the block refers to a passage, so it carries none; the exit key (`passage:<first grammar line, hyphenated>`) and the map label come from the first grammar line, as today.
- Gates: a passage with no `grammar` line; a slot in a passage pattern (D2); two passages in one room sharing a command (`analysis.duplicate-exit`, ADR-360 D3a, as today); `admits` or `, one-way` on the head (today's `analysis.passage-one-way` and the `admits` hint, `parser.ts:2902`).

The UPPS trench becomes:

```
create the Cable Trench
  a room, dark
  up to the Loading Dock

  passage to the Sorting Room
    grammar
      follow the cables
      crawl along the cables
    while the Cable Trench is not dark
  end passage

  A trench under the dock floor, just deep enough to stand in, where
  power cables run in bundles along both walls. …
```

**D2 — Articles are allowed for the author and optional for the player.** `the <word>` is a slot only where the block takes a noun. A passage takes none, so every `a`, `an` and `the` in its patterns is a word the author may write (`follow the cables`). In typed input, an article is optional against every pattern, a passage's and an action's alike: `follow cables` reaches `follow the cables`. That is the English parser's work; the loader's article list and its second registration per form go (ledger F5).

**D2a — In a block that takes nouns, `[the]` writes a literal article, and a slot nothing uses is a diagnostic** (David, 2026-10-21, open questions interview Q-1: "A"). In an action pattern `the <word>` stays the slot (ADR-267 D15). A fixed noun beside a slot writes its article in brackets: `shoot [the] arrow at the target`, `hook the item on [the] hook`. Inside `[…]` an article is a literal word, optional for the player as every article is (D2). A slot is **used** when a line of its block constrains it (`must be`), refuses on it (`refuse without`), types it (`is an instrument`, `takes the rest of the line`) or reads it in the action's body; in an `extend action` every slot is used, because the extension's slots bind the nouns of the action it extends (`story-loader/src/loader.ts:1566-1583`; the extension's own patterns are its slot universe, `chord/src/analyzer.ts:3538-3547`). A `define action` slot that is not used is `analysis.slot-unused`, a warning naming the slot, with the fix-it "for the word, write `[the] <word>`". Measured 2026-10-21 by compiling the corpus: `shoot the arrow at the target` (`branch-stories/wumpus/wumpus.story:222`) lowers as `shoot <slot arrow> at <slot target>`, with no line using `arrow`, so `shoot rock at wumpus` binds `arrow` to the rock; it is rewritten `shoot [the] arrow at the target` in the same change. `hook the item on the hook` (`stories/cloak-of-darkness/cloak.story:90`) also lowers `hook` as a slot, but in an `extend action putting` that slot is putting's second noun and works; whether Cloak means the word (`on [the] hook`) is that story's call, not this record's. Rejected: deciding slot-or-word from whether the block declares the name elsewhere (implicit; a later constraint line would silently turn a word into a slot), and leaving it unchanged (authors keep writing `the arrow` and keep getting slots).

**D3 — A flight vehicle's trip time is `pace:`.** `movement: flight` takes `pace: <n> turn[s]`, the line `line` under `control`, `compass` and `open` already take, because a step is how many turns a step takes and a flight's step is the trip (ADR-366 D5f). `passage:` on a vehicle is retired; its absence on a flight is `analysis.vehicle-missing-pace`, and `analysis.flight-no-passage` goes. The flight's timing is kept as landed: under way, the vehicle is nowhere for exactly `n` turns (ADR-366 D5e landed note). `IRVehicle.passage` folds into `IRVehicle.pace`; `VehicleTrait`'s flight model field `passage` becomes `pace`. After this, `passage` in Chord names only D1's block.

**D4 — The retired forms.** `passage <words> { or <words> } to <Room> …`, `passage <words> is blocked …: …` and `passage <words> is deadly: …` are removed, not deprecated; each is a parse error whose fix-it shows the block. No backward compatibility (CLAUDE.md); the corpus is rewritten in the same change.

## Consequences

- One pattern language for typed commands: an author who has written a `define action` already knows how to write a passage's commands, and `or` means one thing in every block.
- A passage's facts sit in one place, with no key spelled twice; adding a blocked or deadly line no longer means repeating the command.
- The loader stops knowing English articles; any later language's parser owns its own.
- `passage` names one concept in Chord, and the movement table gains no per-type word for "turns per step" (ledger F19's table carries one fact fewer).
- The IR's `IRExit.passage: string[]` is unchanged in shape (the grammar lines, first canonical); `IRVehicle.passage` is removed. `IR_FORMAT` does not move (no version David tracks).
- Corpus: `upps.story:344` becomes a block; `upps.story:270` and `stories/vehicles/vehicles.story:282` change `passage:` to `pace:`. No player-visible text changes; the UPPS and vehicles trees are re-recorded only where a card's command or a timing would differ, which D3's kept timing should prevent.
- An action pattern's fixed noun is written `[the] <word>`; a `define action` slot nothing uses warns at compile time (D2a), so the silent-slot mistake in `wumpus.story:222` cannot recur unseen. That line is rewritten; the Wumpus tree confirms `shoot the arrow at the Wumpus` still plays. `cloak.story:90` is left as written (D2a).
- **Persistence.** `VehicleTrait`'s flight-model field `passage` becomes `pace`, which changes saved trait data. No story is released and save-format versioning is dormant, so no version reader or shim is written; the rename is a one-shot cutover.
- `chord.ebnf`, the grammar-changes log, the guide's exits and vehicle pages and the IDE Docs tab follow; the `--check` gates (ebnf, grammar, manifest, aliases) regenerate.

## Acceptance criteria

- **AC-1 (D1, D4, Chord)**: compile tests: the block lowers to the same `IRExit` (key, forms, condition, door) today's line produces for the same content; each gate fires on its line and nowhere else, `analysis.passage-line-duplicate` and `parse.passage-line` included; a hidden-and-blocked passage refuses as hidden (story-loader real-path); each retired form is a parse error carrying the block as its fix-it.
- **AC-2 (D2, parser-en-us and story-loader)**: a passage pattern written with articles matches input with and without them; an action pattern's slot accepts an article as today; the loader holds no article list (grep for `ARTICLES` in `packages/story-loader/src` returns nothing).
- **AC-2a (D2a, Chord)**: `[the] arrow` lowers to an optional literal `the` and the word `arrow`, not a slot; `analysis.slot-unused` fires on a slot no line uses and not on a constrained or read one; it does not fire on an `extend action` slot (`cloak.story:90` compiles clean); the corpus compiles with no `analysis.slot-unused` once `wumpus.story:222` is rewritten; `shoot rock at wumpus` no longer matches the arrow pattern (story-loader real-path test).
- **AC-3 (D3)**: a flight vehicle with `pace:` compiles and arrives after exactly `n` turns nowhere (a story-loader real-path test through `bootTurns`); without `pace:` it is `analysis.vehicle-missing-pace`; `passage:` on a vehicle is a parse error; `IRVehicle` has no `passage` field.
- **AC-4 (REAL-PATH, demonstration)**: `./sharpee test branch-stories/upps/upps.story` passes with the trench written as a block, the passage working by each command with and without articles and not understood in the dark; `stories/vehicles` passes with the Sparrow on `pace:`; the `adr-378-passages-runtime` suite passes against the block form.
- **AC-5**: `./repokit build dungeo` clean; Dungeo chain one run (Dungeo declares no passage and builds no flight vehicle, grep of `stories/dungeo/src` 2026-10-21, so its text cannot move).

## Amendment (2026-10-22, session 51f88b, at implementation)

Implementation settled five points the record left open or worded otherwise; the decisions above stand.

- **A passage's patterns expand to their commands.** Each grammar line's `or` and `[ ]` are expanded by the parser into the plain commands they admit, the line as written first, so `IRExit.passage` keeps its `string[]` shape as Consequences says, now holding every command, and carries no parser-pattern syntax into the IR. The block lowers at parse time to the exit, blocked-exit and deadly-exit declarations a room's other exits use, which is how AC-1's "same `IRExit`" holds by construction.
- **The block's duplicate-line code is `parse.passage-line-duplicate`**, not `analysis.`, matching `parse.position-duplicate`, `parse.pushing-duplicate` and `parse.landmarks-duplicate`: the parser sees the second line. A retired one-line form is `parse.passage-line-form`; `analysis.passage-unknown` is removed, since nothing outside a block names a passage.
- **D2a's bracket rule, exactly:** `[the]` (the bracket closing right after `the`) is the optional article; `[the target]` is still ADR-267 D9's optional slot. A bracket holds one element, so the two never overlap.
- **D2a's "used" includes the primary slot.** An action's first entity slot (`primarySlotOf`, chord `ir.ts`, the rule the loader's dispatch already applied) binds the noun whose `on <actor> <action>` clauses the action consults and whose `otherwise refuse` fires, so it is used by construction; `buy the target` with no body is not a warning. This is what made the 2026-10-21 measurement (only `wumpus.story:222`) come out true.
- **D2's article is optional after a pattern's verb, not as its verb.** The parser skips a literal article the player left out, at no confidence cost, everywhere but a pattern's first word: Dungeo's GDT code `an :arg...` is a verb spelled like an article. Any other skipped optional word still costs the match 0.9 (ADR-268 D2's confidence-first order), which is a separate question.

## Supersession notes

The session that marks this record ACCEPTED adds, in the same commit, a one-line note naming ADR-380 to each record it changes: ADR-378 D1 (the line form and the `passage <words> is blocked:`/`is deadly:` lines, replaced by D1 here) and D2 (the loader's article stripping, replaced by D2 here; the gate stands); ADR-366 D5d and its movement table row (`passage:` on a flight, replaced by D3's `pace:`); ADR-267 D15 (an article inside `[…]` is a literal, D2a). No Status line on those records changes; each stays ACCEPTED with the note.

## Session

Written in session 1588df (2026-10-21) on `chord-4-0`, at Phase 0 of the alignment-fixes plan, from David's rulings recorded in that plan's Answers (Q4, D23) and the code cited in Context; no implementation.
