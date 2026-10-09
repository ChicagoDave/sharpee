# ADR-360: A region declares its rooms

**Status**: **ACCEPTED** (2026-10-08, session 8d348c, at David's "accept it", with no open questions). Not yet implemented. Written 2026-10-08, session 1a5de8. The shape is David's: a region declares how many rooms it has instead of listing them in `containing` lines, and "if there are two room names, that has to fall out somehow (with two kinds of rooms?)" — answered here by room groups, which he approved ("way better"). The detailed rules (group syntax, what a group body may hold, the exit table, how a one-off room joins) are Claude's drafting, made below with reasons, for his review. No open questions. Reviewed against this shape by `adr-review` (9/14 NEEDS WORK, fixes applied) and by David on 2026-10-08 (session 8d348c), whose review ruled that the Secret Letter's nested regions flatten to `or` guards (D5) and folded five fixes: this line, the article on created names (D1, D3), a matching reverse exit stays legal (D3a), a thing placed in a region (D4), and why a group's heading arms are copied but its description is shared (D8). A second, adversarial review the same session found that a shared description cannot keep one cycling position for the group as D8 then claimed; David ruled per-room cycling (D8), and its seven other findings were folded: the book chapter and the `--introspect` script that teach or emit nesting (Scope, D5, AC-5), the landing order with ADR-362 (Parent), test fixtures that D7's warning reaches (D7, Consequences), `analysis.region-memberless` (D5), the region-placement error's name (D5), blocked exits and `first time` text in a group (D2, D3), and the range's leading zeros and size (D1).

**Scope**: `packages/chord` (the `rooms` group, the region exit table, the `in the <region>` membership line, the gates and the warning, the text-source fields in the IR, `chord.ebnf`, the language version), `packages/story-loader` (region wiring without `parentRegionId`), `packages/world-model` (`RegionTrait` and the region queries lose nesting; `LocationHeadingBehavior.resolve` loses its region walk), `packages/ide-protocol` (`story-ir.ts`), `tools/repokit` (`repokit protocol` regenerates the Swift and C# types), `tools/ide` (the generated types, a room lens in the Index tab, and the lexer golden, `SharpeeIDETests/ChordLexerGoldenTests.swift`, AC-12; the editors' lexers serve the real Chord lexer and need no change), `tools/vscode-ext/src/world-explorer.ts` (reads `parentRegionId`), `scripts/bundle-entry.js` (the `--introspect` manifest's region rows emit `parentRegionId`, `:812-824`), `docs/book/v2.0.0` (chapter 9's "Nesting and querying" section, `parts/part-2/09-the-map-and-regions.md:81,120-132`, and its snippet `code-snippets/ch09-the-map-and-regions/04-nesting-and-querying.ts`; v2.0.0 is the edition that tracks HEAD, and v1.5.0 stays pinned as written), `docs/architecture/chord-grammar-changes.md`, and a migration of every `containing` line in the corpus (`branch-stories/fernhill/fernhill.story`; `branch-stories/secret-letter/{night-journey,backdrops,jail,red-gate}.chord`), plus the Secret Letter's one nested region and its guard in `maiden-house.chord` (D5).

**Scope amendment** (2026-10-09, session 2d87ad, David): the platform side of D5 and D6 reaches four places the Scope above does not name.
- `packages/if-domain/src/channels/types.ts`: `HeadingPart.role` loses `'region'` (D6). The type moved there from world-model before this ADR was implemented.
- `packages/stdlib/src/actions/standard/going/going.ts`: `RegionCrossings` becomes `{ exited?: string; entered?: string }`, because a move now leaves at most one region and enters at most one. Going emits at most one `region_exited` and one `region_entered`, with the same payloads as before. David chose this shape over keeping the arrays after a review of both (2026-10-09).
- Five source comments that described nesting: `PerceptionService.ts`, story-loader's `evaluator.ts`, `event-contract.ts` and `runtime/scheduler-constructs.ts`, and `tools/repokit/src/commands/protocol-projection.ts`.
- The story-loader now refuses rogue IR whose region member is not a room with a `LoadError`, replacing the parent-first region pass and its cycle check.

`packages/lang-en-us` was checked and left unchanged: its heading realizer joins part texts and never reads the role.

## Date: 2026-10-08

## Parent

- **Supersedes ADR-236 D1–D3** as they concern membership: the `containing` line and nested regions. Region daemons, entering and leaving reactions, and landing lines are untouched.
- **Supersedes ADR-349 D4, D4b and D16a** (a region contributes a heading part of its own): a region contributes nothing to a heading. A room's heading is its own `room name`, and a room created by a group takes the group's as its own. The rest of ADR-349 stands.
- **Shares ground with ADR-361** (hatches are removed) **and ADR-362** (room blocks fold), written the same session. All three are Chord changes on one language-version bump, which is major because D1 and D5 remove valid syntax (ADR-257 D2). ADR-361 and this ADR both regenerate the IDE protocol and both change the IDE's story index; whichever lands second regenerates once more and checks the other's fields are intact. ADR-362's `exits:` line and this ADR's exit table are the same exit syntax in two places, and must stay so. **This ADR does not wait for ADR-362.** Its examples use ADR-362's folded `create the Maze, a region` head because that is how the language will read, but every acceptance criterion here is written against unfolded heads (`create the Maze` with `a region` on its own line, and the same for rooms), which compile today, so either ADR may land first.
- **Related**: ADR-358 (its new-story starter is a room with no description, which D7 keeps legal), ADR-322 D8 (the IDE consumes derivations and does not rebuild them), ADR-234 (exits, `, one-way`), GH #568 (`in`/`out` are missing from exits).

## Context

**The Underground port could not write its rooms.** Porting UNDERGROUND (1979) to Chord (`~/repos/underg`) stopped at gap G9 (`underg/docs/work/port-underground-v1-chord/chord-gap-g9.md`, 2026-09-14): Chord cannot give two entities the same printed name, and 27 of the game's 87 rooms share one. Eleven are the maze (61–71, "You are in a maze of twisty little passages, all alike."), five are its dead ends (72–76, "Dead end."), and the rest are pairs and triples such as `Mine` and `Closet`.

**ADR-349 split identity from display but was never written in Chord.** Its `room name` block lets `the Maze 61` … `the Maze 71` be distinct entities with one heading, and its Q-1 ruling let a region add a heading part of its own. Written out, that fails the maze: the dead ends sit among the maze rooms, and as members they would render "Dead end., You are in a maze of twisty little passages, all alike.", because a region can only add a part. A first revision of this ADR made the region a default that each room could override; David replaced that with the shape below.

**Identical rooms are a set, and Chord has no way to say so.** Every maze room repeats the same heading, the same description and the same kind line, and its name is invented only to be unique. The one thing that differs is its exits, which in a maze are irregular by design and are the puzzle.

**Membership is written twice.** A region lists its members in `containing` lines and each member has its own block, so every name appears twice, and a room's block does not say which region it is in.

**A placement line on a room means nothing today.** A room block carrying `in the Maze` compiles with no diagnostic; the IR records `placement: {relation: 'in', place: 'maze'}` on the room (checked 2026-10-08 with `compile` from `packages/chord/dist`), and nothing checks it.

**Plain exits infer their reverse.** Only `, one-way` stops the loader inferring the opposite exit (`chord-grammar-changes.md`, 2026-09-03). The 1979 maze does not reciprocate, so a port written with plain exits gains phantom exits.

**Rooms may have no description, on purpose.** No analyzer gate requires one (checked 2026-10-08), because an optional description is what lets a story start from a template (David, 2026-10-08); ADR-358's starter relies on it. Nothing tells an author when a room is left empty by accident.

**One story nests regions.** `parentRegionId` is read and written only by `world-model`, the story-loader, the Chord IR, `tools/vscode-ext`, and their tests (2026-10-08). The one corpus use is the Secret Letter port: `the Secret Way` contains the regions `the Tunnels` and `the Lord's Keep` (`branch-stories/secret-letter/night-journey.chord:105-107`) and carries the every-turn daemon that brings Bobby along (`:109`), and `maiden-house.chord` tests all three separately (`:144` `not in the Secret Way`, `:171` `in the Lord's Keep`, `:172` `in the Tunnels`). An earlier draft of this paragraph said nothing nests regions; David's review found the case.

## Decision

**D1 — A region declares its identical rooms as groups.** Inside a region block, `rooms <stem> <first> to <last>` creates one room for each whole number from `<first>` to `<last>`, inclusive, named `<stem> <n>`: `rooms Maze 61 to 71` creates `the Maze 61` … `the Maze 71`. The range is both the count and the names, so there is no pluralizing ("11 maze rooms") and no English morphology in the compiler; a port keeps its original numbers, and a new story writes `rooms Maze 1 to 12`. The created names are ordinary entity names: exits, placements, GO TO, the map, test claims and `--introspect` all use them. **The stem is written without an article, and each created room is exactly the room `create the <stem> <n>` would make**: it takes the definite article, so it is written `the Maze 61` wherever it is named, in exit table rows (D3) as everywhere else. A group cannot create rooms with no article or a proper name; a room that needs one is not identical and joins by D4. A created name that collides with any other entity is the existing `analysis.duplicate-entity` error. `<first>` greater than `<last>` is `analysis.room-group-range`. So is a number written with a leading zero (`rooms Maze 01 to 11`), because the created name would have to choose between `Maze 01` and `Maze 1` and either choice surprises someone; and so is a range of more than 1000 rooms, which is a guard against a typo (`1 to 10000` for `1 to 100`), not a limit any story is expected to reach. The 1000 is a number in the analyzer, not a language rule, and can move without an ADR.

```ebnf
room-group   = "rooms" stem NUMBER "to" NUMBER NL >>> { group-line } ;
stem         = WORD { WORD } ;          (* the words before the last two numbers;
                                           the `to` that separates the range is the
                                           one between them, so `rooms Road to Ruin
                                           1 to 3` creates `Road to Ruin 1` …
                                           `Road to Ruin 3` *)
group-line   = composition { "," composition } NL   (* trait adjectives only; no
                                                       kind noun *)
             | "aka" alias { "," alias } NL
             | room-name-block
             | "first" "time" NL >>> prose-paragraph   (* chord.ebnf:475, Z1;
                                                          bound per room to
                                                          RoomTrait.initialDescription *)
             | description ;
NUMBER       = digit { digit } ;
```

`room-group` is a create-line legal only in a region block (`analysis.room-group-owner` elsewhere). The created names end in a number, so `chord.ebnf`'s `name` production, which today admits only `WORD`s beginning with a letter (`chord.ebnf:43`, `:1674`), is corrected to allow a trailing `NUMBER`. The parser already accepts such names (`create the Mine 25` compiles clean, checked 2026-10-08); the grammar file has not caught up, and groups depend on it.

**D2 — A group's body is what its rooms share.** Indented under the `rooms` line, a group body may hold a composition line of trait adjectives (`dark`; the kind is always `room` and is not written), an `aka` line, a `room name` block (ADR-349, `while` arms included), and a description paragraph. Each created room gets all of them as its own. A `first time` description is allowed too; like the description it is one shared phrase, and it prints on the first visit to each room, so each room has its own first time (D8). Anything else in a group body (an exit, a blocked exit, a clause, a placement, `states`, a score) is `analysis.room-group-line`, because a group is for rooms that are genuinely the same: a room that needs its own clause or text is not one of them (D4). Two groups in one region are two kinds of room, each with its own heading and description, and nothing overrides anything.

**D3 — A region's exit table connects its rooms.** An `exits` block in a region, or `exits, one-way` for a table whose exits do not reciprocate, holds one row per room: `<room>: <exit>, <exit>, …`, the row's room written with its article as any reference is (`the Maze 61: east to the Maze 62`), where each `<exit>` is `<direction> to <room> [through <door>]`, the same exit syntax as a room's own exit lines and ADR-362's `exits:` line. A row's room must be a member of this region (`analysis.exit-row-not-member`). A region may have one table of each kind. Rooms outside the region connect in with ordinary exit lines (`north to the Maze 61`). A room created by a group has no block, so its exits are written only in the table; a one-off member (D4) may use the table or its own block. **A table row holds only exits that lead somewhere.** A blocked exit (`east is blocked: dock-sealed`, `north is blocked while not bodyguarded: …`) has no place in a row, and writing one there is a parse error at the row. A created room that needs a blocked exit is therefore not identical, and joins by D4 with the blocked exit in its own block.

```ebnf
exit-table   = "exits" [ "," "one-way" ] NL >>> { exit-row } ;
exit-row     = name ":" exit { "," exit } NL ;
exit         = DIRECTION "to" name [ "through" name ] ;   (* shared with ADR-362's
                                                              `exits:` line *)
```

**The table and ADR-362's line are told apart by the colon and by the block.** `exits` with no colon, followed by indented rows, is the table, and is legal only in a region block; `exits:` with a colon and exits on the same line is ADR-362's line, and is legal only in a room block. Each in the other's block is an error (`analysis.exit-table-owner`, `analysis.exit-line-owner`). Both use the one `exit` production above, so they cannot drift.

**D3a — Two exits in one direction are an error** (GH #569). Today Chord accepts a room with two exits in the same direction, and an explicit exit that contradicts another room's inferred reverse, with no diagnostic (both checked 2026-10-08). With exits now writable in a table, in a room's block, as single lines and (ADR-362) on `exits:` lines, the analyzer gains `analysis.duplicate-exit`: a room with two exits in one direction, from any mix of those places, and an explicit exit that contradicts an inferred reverse, are errors naming both lines. The fix-it for the second suggests `, one-way` on the line that infers the reverse. **A reverse that agrees is not a contradiction**: when `the Hall` has `east to the Den` and `the Den` has an explicit `west to the Hall`, the explicit line matches the inferred one, compiles clean and produces one exit, because stories routinely write both directions. Only an explicit exit in the inferred direction that leads somewhere else is an error. The gate is diagnostics only, and it lands with this ADR or before it, since it fixes a defect that exists today.

**D4 — A room that is not identical joins the region from its own block.** A room with its own description, clause, objects-by-clause or anything else a group body refuses is written as an ordinary `create` block with a placement line `in the <region>`, which makes it a member. If it was one of a numbered set, the group is split around it (`rooms Maze 61 to 63`, `rooms Maze 65 to 71`, and a block for `the Maze 64`). Objects need no split: `in the Maze 64` places a thing in a created room, because the name is real. Gates: `in the <X>` on a room where `<X>` is not a region is `analysis.room-in-non-region`, which closes today's silent case; two `in` lines on one room is `analysis.room-two-regions`; and `in the <region>` on anything that is not a room (a thing, a person, a door) is `analysis.thing-in-region`, because a region holds rooms, not objects, and the fix-it asks which of the region's rooms was meant.

**D5 — The `containing` line is removed, and regions do not nest.** Membership comes only from groups (D1) and `in` lines (D4), so `containing` becomes a parse error whose fix-it names both. A region block takes no placement (already the compile error `analysis.region-placement`, checked 2026-10-08) and a group creates only rooms, so a region can never be a member of another: nesting is gone by construction. `RegionTrait.parentRegionId`, the ancestry walk behind `isInRegion` and `getRegionCrossings`, the IR field, the loader wiring, `tools/vscode-ext`'s read of it, and the `parentRegionId` field of the `--introspect` manifest's region rows (`scripts/bundle-entry.js:822`) are removed. Book v2.0.0's chapter 9 drops "Nesting and querying" in favour of a section on one region per room, and its snippet is rewritten to match, so the book keeps compiling against HEAD. A room's region is a single lookup of `RoomTrait.regionId`. The analyzer builds each region's member list from groups and `in` lines, after imports are spliced so a member may live in another fragment. The existing `analysis.region-memberless` error, which today counts `containing` lines, counts that list instead: a region with no group and no room naming it `in` is still an error. The IR keeps the region entity's `containing` list and the loader's membership wiring is otherwise unchanged.

**A nested region flattens to `or` guards** (David, 2026-10-08). The outer region is removed; the inner regions keep their members; every condition on the outer region becomes a named condition over the inner ones. In the Secret Letter (Context), the migration is:

```chord
define condition on-the-secret-way: the player is in the Tunnels or the player is in the Lord's Keep

create the Tunnels
  a region
  …
  on every turn while on-the-secret-way and Bobby is returning and Bobby is not here
    move Bobby here
    phrase bobby-follows
  end on
```

`maiden-house.chord:144`'s `the player is not in the Secret Way` becomes `not on-the-secret-way`. The daemon moves to `the Tunnels` unchanged apart from its guard, because a region daemon fires wherever the player is and its guard alone decides when it acts (probed 2026-09-04, `night-journey.chord:55-57`), so its host region does not change when it runs. Named conditions with `or` and `not <condition>` already compile in the same story (`backdrops.chord:113`, `night-journey.chord:314`). The migration changes only structure, never the story's text or mechanics.

**D6 — A region contributes no heading.** A `room name` block is legal on a room, on an enterable enclosure (ADR-349 D5), and in a group body; on a region block it is `analysis.room-name-owner` again. In ADR-349's terms the heading has at most a place part and an enclosure part; `HeadingPart.role` loses `'region'`; `resolve` loses its region walk. A region's own description describes the region and is not inherited by anything.

**D7 — A room left with no description is a compile warning** (David: "a room description is not required, but it should have a warning of some sort"). The analyzer warns `analysis.room-no-description` on a room block with no prose, and once on a group's `rooms` line when the group has no description, never once per created room. The message names the room or group and says what the player will see, for example: "`the Hall` has no description, so LOOK there shows only its name." It is a warning so templates still compile without errors, and their empty rooms appear in the Problems list as remaining work.

**The warning reaches test fixtures, not the corpus.** Every room in the eleven corpus stories has a description (census 2026-10-08, compiling each `.story` with its imports), so no story gains a warning. Test fixtures are different: 59 tests in `packages/chord`, `packages/story-loader` and `tools/ide/editor-bridge` assert that a compile produced no diagnostics at all (2026-10-08), and any of them whose fixture has a room with no prose will fail. Each such fixture gets a line of description. A test is never changed to filter the warning out, because that would also hide the next warning that matters.

**D8 — Every room's text source is computed once and carried in the IR** (David: "this is a lens the IDE would re-use"). The analyzer expands each group into ordinary IR room entities, and writes two fields on every room:

```ts
// packages/chord/src/ir.ts — on IREntity, present on rooms only
interface IRTextSource {
  /** Where the room's text comes from. */
  readonly from: 'own' | 'group' | 'none';
  /** The region whose group created the room; present only when `from` is 'group'. */
  readonly regionId?: string;
  /** The group's first and last created names, for display; present only when `from` is 'group'. */
  readonly group?: readonly [first: string, last: string];
}
readonly descriptionSource?: IRTextSource;
readonly roomNameSource?: IRTextSource;
```

A created room's `descriptionKey` is its group's one shared key, and its `room name` arms are emitted under its own `<id>.room-name[.n]` keys as copies of the group's, so ADR-349's registry and the story-loader read it like any room. The readers take the fields and never re-derive them: D7's warning reads `from: 'none'`; the IDE shows each room's heading and description as a lens, naming the group when the text is shared and marking the warning's case. The Swift IDE reads the compiled story as `ComposeStoryIR` (`tools/ide/SharpeeIDE/Compose/StoryIndex.swift:66`) and does not import `packages/chord`, so the fields reach it through `ide-protocol` and `repokit protocol`'s generated Swift and C#.

**A group's description is one phrase, and each room keeps its own place in it** (David, 2026-10-08). A strategy on the description (`cycling`, `first-time`, …) advances per room: the first visit to the Maze 61 and the first visit to the Maze 70 each print the first variant, and each room cycles on from there. That is what the runtime already does, because a Choice counter is keyed by the entity being described and the message key together (`packages/lang-en-us/src/assembler/english-assembler.ts:591-604`), and a description snippet's counter is keyed by room and marker (`packages/stdlib/src/actions/standard/looking/snippet-resolver.ts:23,145`). Sharing the key shares the text; it was never going to share the position, and no new mechanism is added to make it. Each room's counters survive save and restore as any room's do.

**The heading arms are copied and the description is shared, and the two behave the same.** Copying the arms under each room's own keys lets ADR-349's registry stay keyed by room id. A `room name` arm holds no position at all: it takes no strategy and no variants (`analysis.room-name-variants`, `packages/chord/src/analyzer.ts:3690-3697`), only `while` conditions, which every copy evaluates the same way. The description shares one key and its positions are per room. So every created room shows the same heading and walks the same description on its own, whichever way the text is stored.

### The cases in Chord

UNDERGROUND's maze, rooms 61–76, from `underg/extracted/world.json`. Not yet valid Chord; the folded `create … , a region` head is ADR-362 D1.

```chord
create the Maze, a region
  rooms Maze 61 to 71
    room name:
      Maze

    You are in a maze of twisty little passages, all alike.

  rooms Dead End 72 to 76
    room name:
      Dead end.

    Dead end.

  exits, one-way
    the Maze 61: east to the Maze 62, west to the Maze 63, south to the Sphere Room 34
    the Maze 62: north to the Maze 63, east to the Dead End 73, west to the Maze 61, south to the Dead End 72
    the Dead End 72: north to the Maze 62

create the Sphere Room 34, a room
  room name:
    Sphere room
  north to the Maze 61, one-way

  This room has the shape of a giant sphere, with holes in all of the
  major directions.
```

Sixteen rooms, two kinds, one block. Every maze room shows the heading "Maze" and the maze sentence; every dead end shows "Dead end." for both. The table is one-way throughout, as the 1979 maze is. (In the 1979 data, room 61's heading is the full sentence; "Maze" is the heading a new story would choose, and a faithful port puts the sentence in `room name:` instead. Room 72's `out` exit is omitted pending GH #568. The table shows three of its sixteen rows.)

A maze room that is not identical — say Maze 64 holds a clause — splits its group:

```chord
create the Maze, a region
  rooms Maze 61 to 63
    …
  rooms Maze 65 to 71
    …

create the Maze 64, a room
  in the Maze
  room name:
    Maze
  on the player dropping …

  You are in a maze of twisty little passages, all alike.
```

## Acceptance Criteria

1. **AC-1 (D1/D2, groups).** "The cases in Chord", written with unfolded heads (`create the Maze` / `a region`, and likewise each room's `a room` on its own line) so it does not depend on ADR-362, completed to sixteen rows, with the Sphere Room's other exits stubbed, compiles to sixteen room entities named `the Maze 61` … `the Dead End 76`, each with its group's heading arms under its own keys and its group's shared `descriptionKey`; LOOK in Maze 61 and in Maze 70 prints the same heading and description, and LOOK in Dead End 72 prints "Dead end." for both. Per-room positions (D8): with the maze group's description given two `cycling` variants, the first LOOK in Maze 61 and the first LOOK in Maze 70 both print the first variant, and a second LOOK in Maze 61 prints the second; the same holds after a save and restore between the looks. **MECHANICAL**, REAL-PATH through an assembled engine turn, against a dedicated test story (never Dungeo or a real story).
2. **AC-2 (D1/D2, refusals).** `rooms Maze 71 to 61`, `rooms Maze 01 to 11` and `rooms Maze 1 to 1001` each fail with `analysis.room-group-range`, while `rooms Maze 1 to 1000` compiles; a group creating `the Maze 61` beside a `create the Maze 61` block fails with `analysis.duplicate-entity`; an exit line, a blocked exit, a clause and a placement in a group body each fail with `analysis.room-group-line`; a blocked exit in an exit table row is a parse error at the row; a region with no group and no room placed `in` it fails with `analysis.region-memberless`. **NEGATIVE.**
3. **AC-3 (D3, the exit table).** In the loaded world, `exits, one-way` gives Maze 61 an east exit to Maze 62 and gives Maze 62 no inferred west exit back; a plain `exits` table row infers the reverse; a row naming a room outside the region fails with `analysis.exit-row-not-member`. **MECHANICAL**, on the loaded world.
4. **AC-4 (D4, one-off members).** The split example, with unfolded heads, compiles; Maze 64 is a member of the Maze (`isInRegion` true, and the region's entering reaction fires on a real `go` into it); `in the Hall` on a room where the Hall is a room fails with `analysis.room-in-non-region`; two `in` lines fail with `analysis.room-two-regions`; `in the Maze` on a thing fails with `analysis.thing-in-region`, while `in the Maze 64` on the same thing compiles and places it in that room. **MECHANICAL, NEGATIVE**, REAL-PATH for the reaction.
5. **AC-5 (D5, no `containing`, no nesting).** A `containing` line is a parse error naming groups and `in` lines; `grep -rn "parentRegionId" packages tools scripts docs/book/v2.0.0 --include='*.ts' --include='*.js' --include='*.swift' --include='*.cs' --include='*.md'` returns nothing outside `dist` and `node_modules`; the `--introspect` manifest of a story with a region carries no `parentRegionId`; and book v2.0.0's chapter 9 snippets compile. **MECHANICAL, NEGATIVE.**
6. **AC-6 (D6, no region heading).** A `room name` block on a region block fails with `analysis.room-name-owner`; a member room's heading has exactly one place part, its own. **MECHANICAL.** Replaces ADR-349 AC-13.
7. **AC-7 (D7, the warning).** A room block with no prose compiles with exactly one `analysis.room-no-description` warning and no error; a group with no description compiles with exactly one warning, on its `rooms` line, however many rooms it creates; a room or group with prose compiles with no warning. **MECHANICAL**, probed in both directions.
8. **AC-8 (D8, the IR fields).** Maze 61 carries `descriptionSource` and `roomNameSource` `{from: 'group', regionId: <the Maze>, group: ['the Maze 61', 'the Maze 71']}`; Maze 64 carries `own` for both; a room with no prose carries `descriptionSource {from: 'none'}`. The regenerated `ComposeStoryIR` decodes both fields in the IDE's tests. **MECHANICAL.**
9. **AC-9 (D8, derived once).** No code outside the analyzer decides where a room's text comes from: the warning, the loader and the IDE lens read the IR fields. **STRUCTURAL**, in the shape of ADR-349 AC-3.
10. **AC-10 (D3/D3a, exits in two places).** A one-off member with `east to the Den` in its own block and an `east to the Attic` row in the table fails with `analysis.duplicate-exit` naming both lines; so does a room with two `east` lines in its own block, and an explicit `west to the Attic` on `the Den` when `the Hall`'s plain `east to the Den` already infers the Den's west exit back to the Hall. The positive pair: an explicit `west to the Hall` on `the Den` in that same world compiles with no diagnostic and the loaded world has exactly one west exit from the Den. An `exits` table in a room block fails with `analysis.exit-table-owner`; an `exits:` line in a region block fails with `analysis.exit-line-owner`. **NEGATIVE.**

11. **AC-11 (reserved surface).** No line in the corpus, the manual or the docs begins with `rooms` or a bare `exits` as anything other than these forms, checked before the words are reserved (the ADR-267 audit precedent); `rooms Road to Ruin 1 to 3` creates `Road to Ruin 1` … `Road to Ruin 3`. **MECHANICAL.**

12. **AC-12 (tooling).** A lexer-golden corpus file using a group and both exit tables is added, the golden is regenerated with the existing streams unchanged, and `ChordLexerGoldenTests` passes with `ChordLexer.swift` and `SyntaxHighlighter.swift` untouched. `rooms` and `exits` are not added to the highlighter's keyword set, which leaves out words common in prose (ADR-258 D7), and both are. Completion of the group and table positions is ADR-358's, which is DRAFT and unbuilt, and is not an AC here. **MECHANICAL**, in the IDE suite. *(Amended 2026-10-08, session 8d348c, during ADR-362's review: the earlier text required completion that does not exist and keyword colouring against the highlighter's own policy, and named editor-bridge, which only serves the real lexer's tokens.)*

13. **AC-13 (D5, migration).** Fernhill and the four Secret Letter fragments compile with their `containing` lines replaced by `in` lines on each member, and the Secret Letter's `the Secret Way` flattened to the `on-the-secret-way` condition as D5 shows, its daemon on `the Tunnels` and `maiden-house.chord:144` guarded by `not on-the-secret-way`. Their test trees report exactly what they did before, line for line, including Bobby following the player through both the Tunnels and the Lord's Keep. **MECHANICAL**, the verification ADR-359's cutover used.

## Consequences

- **A maze is one block.** Identical rooms are declared once, with their count, and only what differs, their exits, is written per room.
- **Created rooms have no block of their own.** Nothing about them can be said except in the group, the exit table, or by placing objects in them by name. Anything more makes the room a one-off and splits its group. That is the boundary that keeps groups free of override rules.
- **A room's region is always visible where the room is written:** in the group it was created by, or on its own `in` line.
- **The IR is larger than the source.** Sixteen room entities from one block, with copied heading arms; the IR stays the flat, uniform shape every consumer already reads.
- **Built code moves.** `LocationHeadingBehavior.resolve` loses its region parts and walk; ADR-349's Phase 2 gate that allowed `room name` on a region is reversed; the tests that encoded both are rewritten.
- **Templates now produce warnings**, one per empty room or group. That is intended.
- **Test fixtures with empty rooms need a description** where their tests assert no diagnostics (D7). The corpus itself needs nothing.

## Session

Session 1a5de8, 2026-10-08, on `main`. David revisited ADR-349 after asking whether the same-name rooms problem had been fixed. This ADR went through three shapes in the session: a region that contributes to headings (ADR-349 as accepted), a region that is the default its rooms override (this ADR's first draft, reviewed at 8/14 BLOCKED and then fixed), and the region that declares its rooms, which David chose. The rulings came while writing the Underground maze out in Chord for the first time. `adr-review` of this shape, the same session, scored 9/14 NEEDS WORK; the fixes added EBNF for the group and the table, the rule separating the table from ADR-362's `exits:` line, D3a's duplicate-exit gate (the review found that no such gate exists, filed as GH #569), the editor tooling to Scope, the `name` production's trailing number, and AC-10 to AC-12.

David reviewed it in session 8d348c, 2026-10-08. The review found that the Secret Letter port nests regions, which the Context had said nothing does; David ruled that nesting flattens to `or` guards (D5, AC-13). It also folded the article on created names (D1, D3), the agreeing reverse exit (D3a, AC-10), `analysis.thing-in-region` (D4, AC-4), and the reason a group's heading arms may be copied while its description is shared (D8).
