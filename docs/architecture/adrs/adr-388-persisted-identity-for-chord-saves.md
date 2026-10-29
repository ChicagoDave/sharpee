# ADR-388: Persisted identity for Chord saves — every key is a name, and restore reconciles against the story

**Status**: **ACCEPTED** (David, 2026-10-29, session a927f6: "yes", after the open-questions interview resolved Q-1 "a" (content-hash stamp), Q-2 "a" (player line plus diagnostics channel), Q-3 "a" (identical heads legal and numbered, with the ruling that the cutover is a Chord patch bump), and `adr-review` 21/23 with both SMALL findings folded the same pass: `IRIdentity` typed, the trait-clause id and its per-carrier key spelled out, lang-en-us named as the message home, the corpus measurement given its method and date). Written 2026-10-29, session a927f6, on `main`, from David's assessment of the same day, "Sharpee Save Compatibility: Chord State Keys"; the three recommendations there are D1–D5 here. **Acceptance authorizes no implementation by itself**: each phase of `docs/work/chord-save-compat/plan.md` that touches `packages/` needs David's go.

## Date: 2026-10-29

**Kind**: technical

**Scope**: `packages/chord` (`src/analyzer.ts` clause and select id assignment, `src/ir.ts` the identity manifest and `IR_FORMAT`), `packages/story-loader` (`src/state-keys.ts`, `src/select-ids.ts`, `src/arrange.ts`, `src/pin-grammar.ts`, `src/loader.ts` `onWorldRestored`, `src/runtime/` the firing sites, `src/runtime/timers.ts`, `src/evaluator.ts` landings, `src/extensions/chapters.ts`), `packages/extensions/chapters` (`src/chapters-plugin.ts`), `packages/engine` (`src/session/save-restore-service.ts`), `packages/core` (`src/types/save-data.ts` `ISaveMetadata`), `packages/transcript-tester` (`src/assertion-core.ts`, `src/types.ts` `StoryStateKeys`), `packages/world-index` (`src/branches.ts`), `packages/branch-tester` (`src/claims/claim-predicates.ts`, `src/derived-runner.ts`, `src/runner.ts`). Nothing in `stories/`, the Chord grammar, or `chord.ebnf` changes; Dungeo is untouched.

## Parent

- **David's assessment, 2026-10-29**: saves are robust to platform changes and fragile to story updates, because Chord's runtime keys its state by position; make every key name- or content-derived, have the compiler emit an identity manifest with a story-version stamp, and check the stamp on restore.
- **ADR-289 D2**: selects carry a compiler-assigned stable id, never a line number; renaming a world-state key does not bump the save format; no migration reader ships. This record keeps every one of those rulings and amends the id's *shape*.
- **ADR-276**: compile is authoritative for every source-derivable error; the loader keeps a backstop that refuses rogue IR and never invents a fallback (D1); a new load-time error class needs a compile gate or an amendment to D5. D8 here is that amendment.
- **ADR-356 D2** (as amended 2026-10-11): the clause's identity is structural, "because a line number is not a name"; the assertion core composes the clause-occurrence key from `StoryStateKeys.clauseOccurrencePrefix` and imports nothing from the loader runtime (ADR-340 A1); the enumerator carries the identity in `ClauseRoot`/`clause`. This record changes what the identity is and keeps who composes it.
- **ADR-325 D3g, D5**: timers persist as a record under `chord.timer.<qualified>`; landings persist as a record under `chord.landing.<region>`. Its Consequences "Persistence" bullet is amended here (D9).
- **ADR-330 D1, D2**: a chapter has a name for code and a title for the reader; the current chapter is world state so saves carry it. The plugin stores the opener's *ordinal*; this record stores the name.
- **ADR-293**: the per-point RNG streams ride the save; untouched. The save-format version and its reader are dormant (David, 2026-09-11) and are not extended here.

## Context — verified, not assumed

Every line below was read this session at HEAD e9e6bc0cd.

**What a save is.** `SaveRestoreService` writes a full `WorldModel.toJSON()` snapshot, the RNG stream states, and `ISaveMetadata` (`packages/core/src/types/save-data.ts:28`): `storyId`, `storyVersion`, `turnCount`, `playTime`, `description`. `storyVersion` is filled from `story.config.version` (`save-restore-service.ts:257`), which the loader fills from the story header's `storyVersion` field or `'0.0.0'` (`loader.ts:609`). **No reader of it exists on the restore path** (a grep of `storyVersion` across `packages/engine/src` and `packages/story-loader/src` finds the one write). On restore the world is replaced wholesale by `loadJSON`, then `story.onWorldRestored(world, turnCount)` fires last (`save-restore-service.ts:381`), and the Chord loader's hook (`loader.ts:1291`) does two things: `sweepRetiredSelectKeys(world)` and `runtime.resetAfterRestore(turn)`. Behavior and phrases come from the newly compiled IR; the restored world and the new IR meet only through the `chord.*` keys.

**The key families, and what each is keyed by** (`packages/story-loader/src/state-keys.ts` unless noted):

| Family | Key | Keyed by | Breaks when the story is edited? |
| --- | --- | --- | --- |
| Entity state | `chord.state.<ir-id>` (`:14`) | the entity's name slug | No |
| Story phase | `chord.story.state` (`:60`) | fixed | No |
| Gone flag | `chord.gone.<ir-id>` (`:70`) | name | No |
| Visited flag | `chord.visited.<room-world-id>` (`:82`) | world id, from the name | No |
| Counters | `chord.counter.<name>[.<owner>]` (`:89`) | name | No |
| RNG cursor | `chord.rng` (`:54`) | fixed | No |
| Adjacent draw | `chord.adjacent.<mover-ir-id>` (`:180`), seed only | name | No |
| Runtime trait type | `chord.trait.<name>` (`:57`) — a trait *type* serialized on the entity, not a state key | name | No |
| **Clause occurrence** | `chord.occurrence.clause.<owner>[.<trait>].<n>` (`:27-50`) | **`<n>` = 1-based position in the root's `onClauses`** | **Yes.** Inserting a clause, or adding a gerund to a head that lists several (one clause per gerund, `ir.ts:1183`), shifts every later `<n>`: a fired `, once` refires, an unfired one is suppressed. |
| **Select occurrence** | `chord.occurrence.select.<id>[.<owner>]` (`:97-115`) | **`<id>` = `<owner>.<kind>-<gerund>-<clauseIndex>.<statement path>`** (`analyzer.ts:6202`, `:7028`); the path is the statement's index chain inside the body | **Yes.** The clause index is positional as above; the statement path shifts when a statement is inserted earlier in the same body. |
| **Chapter current** | `chord.chapter.current` (`chapters-plugin.ts:39`) | **the chapter's ordinal** (`chapters.ts:44`, `chapters-plugin.ts:126`); `chord.chapter.fired.<name>` is by name | **Yes.** Inserting a chapter moves a save into the wrong chapter. |
| **Timer** | `chord.timer.<qualified>` → `{phase, index, startedTurn}` (`:134-155`) | name; **`index` = steps taken, read as `def.states[index - 1]`** (`timers.ts:238-244`) | **Yes.** Adding a named turn before the saved position resumes one turn off. |
| **Landing** | `chord.landing.<region>` → `{rooms, cursor, seed}` (`:161-178`) | name; **`rooms` is a copy of the IR list taken on first touch** (`evaluator.ts:835-845`) | **Yes.** Rooms added to the landing are never drawn; rooms removed are still drawn. |
| Phrase variants | engine `textState` capability, `{[entityId]: {[messageKey]: number}}` (`render-context.ts:124`), a count for cycling/stopping/first-time/random or the picked index + 1 for sticky (`english-assembler.ts:598`) | name and message key | Only the *meaning* of the stored number: added variants change which one `cycling` or `sticky` resumes on. |

Six of twelve families carry a position. Entity names, state words, counter names, timer names and story action ids are author-named, so edits that keep the names keep the saves.

**What the two readers outside the loader compose.** The assertion core composes the clause-occurrence key from the prefix (`packages/transcript-tester/src/assertion-core.ts`, through `StoryStateKeys.clauseOccurrencePrefix` in `types.ts`); the arrange step writes it (`packages/story-loader/src/arrange.ts`); the pin grammar spells it `[the] <owner> [trait <t>] clause <n> occurrence = <k>` (`pin-grammar.ts`); the enumerator emits the identity as `ClauseRoot` plus `clause` (`packages/world-index/src/branches.ts:799`); branch-tester's claims walker, derived runner and runner read it. A grep of `clauseOccurrencePrefix|clauseOccurrenceKey|collectClauseBranches` names fifteen files across four packages. Any change to the identity moves all of them in one phase, or the derived tier composes a key no firing site writes.

**What ADR-289 D2 already settled, and left.** The compiler assigns the select id (never a line number, never bare digits, a strict prefix of every per-owner key — `select-ids.test.ts:139-175` pins each); the sweep `RETIRED_SELECT_KEY = /^chord\.occurrence\.select\.\d+$/` removes the pre-D2 line-number keys on load and on restore. The id's shape is positional in two places, which the ADR did not set out to fix: it fixed collisions, not drift.

**No story has shipped.** No released `.story` has a save in the wild; the save-format version and its v2 reader are interim and dormant (David, 2026-09-11: never extend the interim handling, never write a new shim). This is the cheap moment to change every key at once.

## Decision

### D1 — A persisted key is derived from a name the author wrote or from content, never from a position in a list

The rule, for every family in the table above and every family added later: the key, and every positional field inside a record, names the thing by what the author called it (an entity slug, a state word, a chapter name, a timer's turn name, a clause's head) or by a hash of its content. An index into a source-ordered list is never identity, because the author edits the list. The families already name-derived (entity state, story phase, gone, visited, counters, RNG, adjacent) are unchanged. The four that are not — clause occurrence, select occurrence, chapter current, timer position — move under D2 and D3. The landing list is re-seeded rather than re-keyed (D3). Phrase-variant counters are name-keyed already and keep their count encoding: a stored count that lands on a different variant after an edit is drift the author can see and no key scheme can prevent, and it is recorded as accepted, not fixed.

`state-keys.ts`'s header gains this rule as its first invariant, and AC-1 pins it with a test over the key builders.

### D2 — A clause's identity is its head, with an occurrence index only among identical heads; the compiler assigns it, and a select's id is its clause's id plus its index among the selects of the same body

**Clause id.** The analyzer assigns every `on`/`after` clause an `id` in the IR, additive to `IROnClause`, composed from the head alone, in this order and with these separators:

```
<owner>[.<trait>].<kind>-<action>[-<actor>][-<role>][-to-<value>][-with-<counterpart>][-<sound>][#<n>]
```

- `<owner>` is the entity's IR id, or `story`. For a clause declared on a trait the compiler's id begins with the trait's name (`glowing.on-rubbing`), because the compiler sees no carrier; the loader keys it per carrier as `chord.occurrence.clause.<carrier-ir-id>.<trait-clause-id>`, which is the `[.<trait>]` position above, so a trait clause still counts per composing entity as today.
- `<kind>` is `on` or `after`; `<action>` is the gerund as written, or `every-turn`.
- `<actor>` is `player`, or the named character's IR id; absent for `self` and `every-turn`. `<role>` is the role name for a role-bound head. `to-<value>`, `with-<counterpart>` and the sound name carry the ADR-371 D4, ADR-372 D1 and ADR-374 D6 tails when the head has them.
- `#<n>` is present **only when two or more clauses of one root have the same head**, and is their 1-based order among those identical heads, in source order. A story with no repeated heads has no `#` anywhere.

A `while <condition>` on the head and the `, once` modifier are **not** part of the identity: two heads that differ only in their guard are identical heads, numbered `#1` and `#2`, because a condition is an expression the author rewrites freely and a hash of it would re-key the clause on every edit. **Identical heads are legal and numbered in source order** (resolved 2026-10-29, Q-3, David: "a"), measured first (2026-10-29, session a927f6: a script compiling each `.story` through `packages/chord/dist/index.js` with a file-reading import resolver and grouping each root's `onClauses` by kind, action, actor, binding, role, value tail, counterpart and sound; its output is in the session file): across the 16 Chord stories in the repository, 1,031 clauses carry 27 identical-head groups in 8 stories, every one either several `after the player entering` clauses on one room differing by `, once` or a guard (Secret Letter has 17 such rooms, one with five) or several `on every turn` clauses on one root differing by guard (Wumpus has four on the story). A compile error would stop 8 of 16 stories compiling, Fernhill and Secret Letter among them; a guard hash would move the drift to guard edits. The `#<n>` is the one position left in the scheme, and it bites only when a clause is inserted between two identical heads.

The occurrence key becomes `chord.occurrence.clause.<clause-id>`, and `clauseOccurrenceKey(owner, clause, trait?)` is replaced by `clauseOccurrenceKey(clauseId: string)`. The nine firing sites keep writing one key through that one function. A head that lists several gerunds expands to one clause per gerund today (`ir.ts:1183`); each gets its own id with its own gerund, so adding a gerund to the list re-keys nothing that was already there.

**Select id.** A `select-strategy`'s `id` becomes `<clause-id>.select#<k>`, where `<k>` is the select's 1-based index **among the `select-strategy` statements of the same statement list**, counting the list the select is in and not the lists nested under it. Inserting a non-select statement earlier in the body shifts nothing; inserting an earlier select does, and that is the one edit this scheme accepts, because a select has no name of its own and its author chose not to give it one. For a select under a root that is not a clause — a sequence step, a machine state, a topic row, an action body, the start block, a timer's `meanwhile` — the prefix is the root's existing name-derived path (`sequence.<name>.step-<i>`, `machine.<name>.<state>.enter`, `action.<name>.body`, `start-block`, `timer.<qualified>.meanwhile`; `analyzer.ts:1410-8273`), which already names the root. The id still never takes the form of bare digits (ADR-289 D2's reservation stands as a property, AC-3), and it stays a strict prefix of every per-owner key.

**Two layers, per ADR-276.** The analyzer is the gate: it assigns the ids and refuses nothing an author can write (identical heads are legal and numbered, Q-3 pending). The loader is the backstop: a clause or select arriving without an id in IR that claims the new `IR_FORMAT` is rogue IR and raises a `LoadError` naming the compiler gate, exactly as `assertSelectIds` does today, and never computes a fallback from position.

### D3 — Chapters, timers and landings persist by name; the landing list is re-seeded on reconcile

- **Chapter current** holds the chapter's `name` (`chord.chapter.current = 'commerce'`), not its ordinal. The plugin's "a row later than the current chapter" comparison (`chapters-plugin.ts:118-126`) resolves the stored name to the current IR's ordinal at read time, so ordering still comes from the IR and a renumbered chapter list reads correctly. A stored name the IR no longer declares is an unmappable case for D5.
- **Timer position** replaces `index: number` with `turn: string | null` in `TimerRecord`: the named turn the timer is on, `null` when started and not yet stepped. Stepping finds the current turn in `def.states`, moves to the next name, and expires after the last; a stored name the definition no longer lists is unmappable (D5). `startedTurn` and `phase` are unchanged. The arrange floor's `has started` / `has expired` writes (ADR-356 D2 amendment 2026-09-27) write the new field.
- **Landing record** keeps `rooms` as world ids, because `set <region>'s landing to <room>` legitimately replaces the list and the stored list is then authored state, not a cache. What changes is that the record also keeps `authored: boolean` — `false` while the list is the IR's own, `true` once a `set` replaced it — so the reconciler (D5) can re-seed an un-set list from the current IR and leave a set one alone. `cursor` is clamped to the new length on re-seed; `seed` is kept.

### D4 — The compiler emits an identity manifest and a content stamp in the IR; the save records the stamp

The IR gains `identity: IRIdentity`, emitted by the analyzer from the resolved IR, listing every persistable identity the story can write and the structural facts a reconciler needs. The wire shape, in `ir.ts` beside the other IR types:

```ts
export interface IRIdentity {
  stamp: string;                                   // content hash over every field below
  entities: { id: string; kind: string; states: string[]; startsIn: string | null }[];
  exits: { room: string; direction: string; destination: string }[];
  clauses: { id: string; once: boolean }[];
  selects: string[];
  chapters: string[];                              // names, in order
  timers: { qualified: string; turns: string[] }[];
  landings: { region: string; rooms: string[] }[];
  counters: { name: string; owner: string | null }[];
}
```

In words:

- `entities`: every IR entity id with its kind, its declared states, and its start placement (location IR id or `offstage`);
- `exits`: every `(room, direction, destination)` triple;
- `clauses`: every clause id (D2), with `once`;
- `selects`: every select id (D2);
- `chapters`: the names in order; `timers`: each qualified key with its turn names; `landings`: each region with its IR room list; `counters`: each declared counter name and owner;
- `stamp`: a hash over the whole of the above, computed by the compiler, deterministic, independent of spans and prose.

**The stamp is the content hash, and only the hash decides** (resolved 2026-10-29, Q-1, David: "a"). `IRStoryFields.storyVersion` (the author's declared `version:` line) is carried beside the stamp for display and never folded into it, never compared: a prose edit leaves the stamp unchanged, a structural edit changes it, and whether the author remembered to bump the version line changes nothing. `ISaveMetadata` gains `identityStamp: string`; `storyVersion` stays. `IR_FORMAT` moves to `story language 6` (a required field is a wire-shape break, ADR-289 D2's precedent; the loader's gate at `loader.ts:600` refuses older compiled artifacts, which the build regenerates). The Swift and C# protocol types are regenerated through `./repokit protocol` (ADR-352).

The manifest is data the compiler already holds; it is emitted, never derived at load. A loader asked to restore under IR with no manifest refuses as rogue IR (the backstop).

### D5 — Restore compares stamps, and a mismatch runs the reconciler, which adds, drops, re-seeds and reports — and never guesses

`SaveRestoreService.restoreGame` compares the save's `identityStamp` with the installed story's. **Equal stamps skip the reconciler**: the story is the same story, every key maps, and restore is what it is today minus the retired sweep (D6). **Unequal stamps** pass the save's manifest and the current one to the loader's `onWorldRestored`, which runs the reconciler before `resetAfterRestore`:

1. **Add what is new.** An entity in the current manifest and not in the restored world is created from the IR and placed at its start placement; an exit in the current manifest and not on the restored room is wired; a clause, select, counter or timer new in the manifest needs no action — an absent key reads as never fired, zero, idle.
2. **Drop what is orphaned.** A `chord.*` key whose identity is in neither manifest, or in the old one only, is removed. This is the general form of ADR-289 D2's sweep.
3. **Re-seed landings** whose record is not `authored` from the current IR list (D3).
4. **Report what it cannot map, and leave it.** A stored chapter name, timer turn name, entity state word, or select id that the current manifest does not declare is never coerced to a nearest match: the key is left as it is, the case is reported with the key and both values, and play continues. **The report reaches both the player and the author** (resolved 2026-10-29, Q-2, David: "a"): the player sees one line on the restore turn, rendered by the prose pipeline under a new `core.save_reconciled` message id whose text lives in `packages/lang-en-us` like every other player-facing line, saying the story was updated and some progress could not be carried over, and never a key name; the full report, every unmappable key with its saved and current values, goes to the diagnostics channel (ADR-163), where the IDE's Play surface and the CLI show it to the author. A reconcile that maps everything emits no player line and still writes its summary to the diagnostics channel.

The reconciler mutates only through the behaviors and the loader's own key builders; it holds no state of its own, and it is idempotent, so a save reconciled twice is reconciled once (AC-6). It does not touch entities the restored world holds that the current manifest lacks — a removed entity stays, offstage or not, because deleting an author's entity from a player's game is a guess about intent.

### D6 — One-shot cutover: no old-key reader, and ADR-289's retired-key sweep is removed with its key space

The key scheme changes once, in Phase 2 and Phase 3 of the plan, and nothing reads the old spellings afterwards. `RETIRED_SELECT_KEY` and `sweepRetiredSelectKeys` are deleted: their one job was pre-D2 saves, no such save exists, and D5's orphan drop is the general mechanism that replaces them. The save-format version does not move (ADR-289 D2's reasoning holds: the format is structurally identical; the dormant reader is not extended). No test asserts that a pre-cutover save restores; the repository owes no such save.

### D7 — The pin grammar names a clause by its head, and every reader moves in the phase that moves the key

The arrange and claim spelling `[the] <owner> [trait <t>] clause <n> occurrence = <k>` is replaced by the head, as the author would say it:

```
the troll on attacking occurrence = 2
the troll on attacking #2 occurrence = 2
story after every-turn occurrence = 5
the lamp trait glowing on rubbing occurrence = 1
```

The grammar is the clause id of D2 with its separators spoken: `<owner> [trait <t>] <kind> <action> [by <actor>] [as <role>] [to <value>] [with <counterpart>] [#<n>] occurrence = <k>`. `collectClauseBranches` carries the clause id in place of `clause: number`; the assertion core composes the key from `clauseOccurrencePrefix` and the id, importing nothing from the loader (ADR-340 A1, unchanged); `arrange` writes it; branch-tester's claims walker, derived runner and runner read the id. All fifteen files move in Phase 2, and AC-4 is the test that the derived tier still arranges and asserts the ordinal rows it arranged before.

### D8 — The reconciler's report is ADR-276 D5 residue

ADR-276 D5 closes the set of load-time error classes to backstops, hatch errors, language-provider errors and profile/IR-format refusals, and forbids a new author-reachable class without a compile gate or an amendment. The reconciler's unmappable report has no compile gate by nature — it is about a save, which the compiler never sees. This record amends D5: the residue list gains "**restore reconciliation reports** (ADR-388 D5) — a save key the current story cannot map, reported and left in place." It is not a `LoadError` and never refuses the restore.

### D9 — Amendments by reference, written by the phase that lands them

| Touched | What this record does to it | Owner |
| --- | --- | --- |
| **ADR-289 D2** — id shape `<owner>.<clause-index>.<statement-path>`; the bare-digits sweep | D2 here re-shapes the id; D6 removes the sweep | Phase 2 writes a note beside ADR-289 D2 |
| **ADR-356 D2** (amendment 2026-10-11) — "the clause's 1-based position in its root's `onClauses`"; the `clause <n>` spelling | D2 and D7 here replace position with the head | Phase 2 writes a note beside the amendment |
| **ADR-325 Consequences, "Persistence"** — "The save-format version is bumped per the standing rule … with a test that a pre-bump save restores" | Stale since 2026-09-11; D3 and D6 here re-key the timer record with no bump and no pre-bump test | Phase 3 writes a note beside the bullet |
| **ADR-330** — the plugin stores the opener's ordinal | D3 here stores the name | Phase 3 writes a note beside D2 |
| **ADR-276 D5** — the closed residue list | D8 here adds one entry | Phase 5 writes the entry |

No Status line flips on account of this; a touched decision inside a document is not a superseded document.

## Consequences

- **A story patch reaches games in progress.** A bug-fix release that adds a missing exit, a new room, or a clause fixes a saved game on its next restore, which is what the assessment asked for. An edit that renames an entity, a chapter or a timer turn still breaks the save for that name, and the reconciler says so instead of guessing; that is the residual fragility, and it is visible.
- **`IR_FORMAT` moves to `story language 6`**, twice over (D2's required ids, D4's manifest), landed as one bump in Phase 4. The language version does not move (ADR-257 D3); `chord.ebnf`'s pin stands.
- **The arrange and claim grammar changes spelling.** Every tree document or claims file that wrote `clause <n> occurrence` is rewritten once; a grep of the corpus at Phase 2 finds each. Under the no-back-compat rule that is a one-shot repair.
- **Identical heads acquire a number.** A story with two `on the player attacking` clauses on one entity gets `#1` and `#2`; inserting a third between them re-keys the second. Legal by Q-3's ruling; the 27 groups in the corpus compile unchanged.
- **This is a Chord patch bump** (David, 2026-10-29, during the Q-3 interview: "this would be a patch bump"). ADR-289 paired its `IR_FORMAT` move with a language minor; this cutover moves `IR_FORMAT` and the pin-grammar spelling and ships as a patch, because no grammar changes and no story stops compiling. Versions move at publish, not per landing.
- **The reconciler is a new place that mutates the world outside a turn.** It runs inside `onWorldRestored`, which ADR-289 D2 placed last so that "the engine is fully restored when this runs"; the reconciler is the first consumer that takes that contract literally and mutates. Rule 12's Behavior Statement and rule 13a's real-path test (save, edit the story, restore through the bundle) are the gate on it, and `on-world-restored.test.ts`'s ordering contract is unchanged.
- **The retired-key sweep and `RETIRED_SELECT_KEY` are gone**, with the tests that pinned them (`select-ids.test.ts:221-288`); the orphan drop's tests replace them.
- **Every decision here is a `packages/` change.** Acceptance authorizes nothing; each plan phase touching `packages/` gets David's go under CLAUDE.md's platform rule.

## Acceptance criteria

Each names what decides it. All are **not met today**. Fixture stories are dedicated test stories, never real ones.

1. **AC-1 — No key builder takes a position.** A test over `state-keys.ts`'s exported builders asserts that every parameter is a string identity or a record, and that `TimerRecord` has no numeric position field. **SELF-VERIFYING** — it is D1 as an assertion.
2. **AC-2 — Inserting a clause ahead of a counted one keeps its count.** Real path: a fixture story with a `, once` clause is played until it fires and saved through the bundle; a copy of the story with a new clause inserted before it is compiled; the save restores into it; the clause does not refire, and a second `, once` clause that had not fired still fires. **SELF-VERIFYING** — the assertion reads the firing counter and the turn's events after a real restore.
3. **AC-3 — Ids are head-derived, unique, prefix-stable, never bare digits.** Over a fixture with repeated heads, nested bodies and a trait clause composed by two entities: every clause id and select id is unique, a select id begins with its clause id, no id is bare digits, and compiling twice gives byte-identical ids. **SELF-VERIFYING** — compared against the fixture's authored structure, not a previous run.
4. **AC-4 — The derived tier arranges and asserts ordinals by head.** `sharpee test` on fernhill and Secret Letter (as fixture data) arranges the same later-ordinal rows it arranged at the 2026-10-11 measurement (Secret Letter 959 exercised, 12 derived failures), with zero `occurrence` SKIPPED. **SELF-VERIFYING** — the counts are compared to the recorded baseline.
5. **AC-5 — Chapter and timer resume by name.** Real path: save mid-chapter and mid-timer; insert a chapter and a named turn before each saved position; restore; `during <chapter>` and `<timer> is <turn>` read the saved names. **SELF-VERIFYING** — the reads go through the evaluator after a real restore.
6. **AC-6 — The reconciler adds, drops, re-seeds, reports, and is idempotent.** Real path through the bundle: a fixture save restores into an edited story that adds a room, an exit and an entity, removes a clause, renames a chapter, and adds a landing room; the new room is reachable by the new exit, the new entity is at its start placement, the removed clause's key is gone, the renamed chapter is reported with both names and the old key is still present, the landing draws the added room, and restoring the same save a second time changes nothing. **SELF-VERIFYING** — every assertion reads world state or the report after the real restore.
7. **AC-7 — Equal stamps skip the reconciler; unequal stamps run it.** A spy on the reconciler, or its report count, is zero when the story is unchanged and non-zero when it is edited; the stamp of an unchanged story compiled twice is identical, and a one-word prose edit leaves it identical while a new exit changes it. **SELF-VERIFYING** — the stamp is compared across real compiles.
8. **AC-8 — The loader refuses IR without ids or without a manifest.** Hand-built IR claiming `story language 6` with an id-less clause, an id-less select, or no `identity` raises a `LoadError` naming the compiler gate, on the real `createStory` path. **SELF-VERIFYING** — it is ADR-276's backstop pattern as `select-ids.test.ts:177-201` already pins it.
9. **AC-9 — The floor holds.** The Dungeo walkthrough chain and the Chord stories' tree tests run byte-identically at their pinned seeds before and after each phase, through `dist/cli/sharpee.js` after `./repokit build`. **SELF-VERIFYING** — one run, any byte diff is a finding.

## Session

Written 2026-10-29, session a927f6, on `main`, as Phase 1 of `docs/work/chord-save-compat/plan.md`. Plan-review of the same day found two blocking items the plan now carries (the assertion core and enumerator move with the key; ADR-325's persistence bullet is stale) and five tensions, each of which is a decision above: the sweep (D6), `IR_FORMAT` (D4), the report as D5 residue (D8), the pin-grammar spelling (D7), and open issue #394 (D5's "add what is new" settles player identity through `installStory`'s one path and creates no second holder).
