# Save and Restore in Sharpee 5.5.1

**Written**: 2026-10-30, session d96e6d, from the code at `f7aaf68fd` (the 5.5.1 release commit).
**Decision record**: ADR-388, "Persisted identity for Chord saves", accepted 2026-10-29. Its five implementation phases landed in commits `b504f4652`, `f19cc68c7`, `bb3c0a89c` and `402a6bdd0`, and ship in 5.5.1.
**Scope**: Chord stories. A TypeScript story such as Dungeo saves and restores exactly as before; nothing below changes it.

## The problem 5.5.1 solves

A Sharpee save is a full snapshot of the world plus some metadata. Restoring one replaces the live world wholesale, then hands control back to the story. For a Chord story, everything the runtime needs to remember between turns (which state an entity is in, how many times a clause has fired, which chapter is current, where a timer is) lives in that snapshot as ordinary world state under `chord.*` keys.

Before 5.5.1 those saves were robust to platform upgrades and fragile to story edits. Several of the keys were derived from an item's position in the author's source: a clause's firing counter was keyed by its 1-based position among the owner's clauses, a select's id carried a statement path, the current chapter was stored as an ordinal, a timer's position was a step count, and every world entity id was a per-type counter in build order. Inserting one clause, chapter, named turn or entity ahead of another shifted every later one. A `, once` clause that had fired would fire again, an unfired one would be suppressed, a save would resume in the wrong chapter, and after an entity was inserted the loader's maps named the wrong rooms.

Nothing read the save's `storyVersion` on restore, so none of this was detected. The player just got a quietly wrong game.

## What changed, in one sentence

Every persisted key is now derived from a name the author wrote or from content, the compiler emits a manifest of every identity a story can persist plus a content hash over it, the save records that hash, and a restore whose hash differs from the installed story's reconciles the save against the manifest instead of trusting it.

## The pieces

### 1. Keys are names, not positions

The rule is the first invariant in the header of `packages/story-loader/src/state-keys.ts`: a key, and every positional field inside a record, names the thing by what the author called it, never by an index into a list the author edits.

| Family | Key in 5.5.1 | Derived from |
| --- | --- | --- |
| Entity state | `chord.state.<entity-id>` | the entity's name |
| Story phase | `chord.story.state` | fixed |
| Gone flag | `chord.gone.<entity-id>` | name |
| Visited flag | `chord.visited.<room-world-id>` | name (world id is the name now, see below) |
| Counters | `chord.counter.<name>` or `chord.counter.<owner>.<name>` | name |
| RNG cursor | `chord.rng` | fixed |
| Clause occurrence | `chord.occurrence.clause.<clause-id>` | the clause's head |
| Select occurrence | `chord.occurrence.select.<clause-id>.select#<k>` | the clause's head plus select index |
| Chapter current and announced | `chord.chapter.current`, `chord.chapter.announced` | the chapter's name as the value |
| Timer | `chord.timer.<qualified>` with `{ phase, turn, startedTurn }` | the named turn as the value |
| Landing | `chord.landing.<region>` with `{ rooms, cursor, seed, authored }` | region name; re-seeded on reconcile |
| Scheduler daemons | `chord.entity-turn.<clause-id>` and kin | the clause id |

**Clause ids.** The compiler assigns every `on` and `after` clause an id built from its head alone: owner, kind, action, and the optional actor, role, value, counterpart and sound tails. Two examples: `troll.on-attacking-by-player`, `story.on-every-turn`. A trait's clause begins with `trait.<name>` and is keyed per carrying entity. When two or more clauses on one root have the same head (several `after the player entering` on one room differing only by guard or `, once`), they are numbered `#1`, `#2` in source order. That `#n` is the single position left in the scheme, and it bites only when a clause is inserted between two identical heads. The composer is `clauseHeadId` in `packages/chord/src/clause-ids.ts`.

**Select ids.** A `select-strategy` inside a clause body is `<clause-id>.select#<k>`, where `k` counts selects across the whole body in document order. Inserting a non-select statement shifts nothing. Selects under non-clause roots (sequence steps, machine states, action bodies, the start block, a timer's `meanwhile`) keep their older path ids; ADR-388 D2 records that as residue, since no corpus story keeps a counted select there.

**World entity ids.** This one went a layer below the `chord.*` keys and was found during Phase 5. `WorldModel.createEntity` now accepts an explicit `opts.id` (refused when empty or already taken, at `packages/world-model/src/world/WorldModel.ts:1044`), and the loader passes the IR id for every Chord entity. A Chord room named `hall` has world id `hall`. TypeScript stories keep the generated counters.

### 2. The compiler emits an identity manifest and a stamp

The last analysis pass, `emitIdentity` in `packages/chord/src/identity.ts`, writes `identity: IRIdentity` into the IR:

```ts
export interface IRIdentity {
  stamp: string;        // SHA-256 over the JSON of everything below
  entities: { id: string; kind: string; states: string[]; startsIn: string | null }[];
  exits: { room: string; direction: string; destination: string }[];
  clauses: { id: string; once: boolean }[];
  selects: string[];
  chapters: string[];   // declared order
  timers: { qualified: string; turns: string[] }[];
  landings: { region: string; rooms: string[] }[];
  counters: { name: string; owner: string | null }[];
}
```

Properties that matter for authors:

- The manifest is built from names and structure only, never from spans or prose. A prose edit leaves the stamp unchanged.
- Families whose order carries no meaning (entities, exits, clauses, selects, timers, landings, counters) are sorted, so reordering two blocks leaves the stamp unchanged. Chapters, a timer's turns and a landing's rooms keep declared order because order is their meaning.
- A new exit, a new clause, a changed state list, reordered chapters or a renamed counter all change the stamp.
- The author's `version:` line is carried beside the stamp for display and is never compared. Forgetting to bump it changes nothing.

The hash is a dependency-free SHA-256 in `packages/chord/src/sha256.ts`, because `crypto.subtle` is asynchronous and `node:crypto` is not browser-safe. `IR_FORMAT` moved to `story language 6`; the loader's backstop `assertIdentity` in `packages/story-loader/src/select-ids.ts` refuses IR that claims that format without a manifest or with an empty stamp.

### 3. The save records the stamp

`ISaveMetadata` in `packages/core/src/types/save-data.ts` gains an optional `identityStamp`. `SaveRestoreService.createSaveData` copies `Story.identityStamp` into it when the installed story declares one (`packages/engine/src/session/save-restore-service.ts:261`). A TypeScript story declares none and its saves carry no field.

### 4. Restore compares stamps and reconciles on a mismatch

`SaveRestoreService.loadSaveData` builds an `IRestoreIdentity` (`savedStamp`, `currentStamp`, `matches`) and passes it as the third argument of the story's `onWorldRestored` hook (`save-restore-service.ts:392-399`). A story with no stamp always matches. A save with no stamp restored into a stamped story does not.

Equal stamps skip the reconciler: the story is the same story and restore is what it always was. Unequal stamps run `ChordStory.reconcileRestoredWorld` (`packages/story-loader/src/loader.ts:1147`) before the runtime's own `resetAfterRestore`. It does five things, in this order:

1. **Add what is new.** Every entity the manifest declares and the restored world lacks is built and wired exactly as at load, through the same `wireEntity` the loader uses, and placed at its start placement. A clause, select, counter or timer new in the manifest needs no action, since an absent key reads as never fired, zero or idle.
2. **Wire new exits** on rooms the save already holds, through `wireExit`, only for a direction the room has nothing under.
3. **Drop what is orphaned.** A `chord.*` key under a family the reconciler knows whose identity the manifest no longer declares is removed (`orphanedKeys` in `packages/story-loader/src/reconcile.ts`). A removed clause's counter and a renamed chapter's `fired` mark go this way. Keys under families the reconciler does not know (visited facts, conversation threads, the RNG cursor) are never touched.
4. **Re-seed landing lists** the author never `set` from the current IR, with the cursor clamped and the seed kept. A landing an author replaced with `set <region>'s landing to <room>` is marked `authored` and left alone.
5. **Report what it cannot map, and leave it.** A stored chapter name, timer turn, entity state word or story state that the current manifest does not declare is never coerced to a nearest match. It is reported with the key, the saved value and the declared values (`unmappableValues`), and the key stays exactly as it was.

The reconciler is idempotent: a second pass over the same world adds, drops and re-seeds nothing. It does not delete entities the restored world holds that the manifest lacks. Removing an author's entity from a player's game is a guess about intent, so a removed entity stays, offstage or not.

The save carries only the stamp, not its own manifest. Every rule above needs the current manifest and the restored world alone, so the save stays small.

### 5. Who hears about it

The hook returns an `IRestoreReconciliation` (`addedEntities`, `addedExits`, `droppedKeys`, `reseededLandings`, `unmappable`, both stamps). The platform dispatcher delivers it after `platform.restore_completed` as a `platform.save_reconciled` event on every reconcile (`packages/engine/src/turn/platform-dispatcher.ts:198-205`).

Two audiences:

- **The author** sees the full report on a new author-gated `diagnostics` channel in stdlib (`packages/stdlib/src/channels/diagnostics.ts`, append mode, sparse). The IDE's Play surface and the CLI read it. It is written on every reconcile, including one that mapped everything.
- **The player** sees one line, only when something was unmappable, as a `game.message` under `core.save_reconciled`. The text lives in `packages/lang-en-us/src/platform-messages.ts`: "This story has been updated since that game was saved, and some of your progress could not be carried over." It never names a key.

## What this means for an author

A patch release that adds a missing exit, a new room, a new object or a new clause now fixes a player's saved game on its next restore. The new content is present, the orphaned counters are gone, the landing draws the new room.

What still breaks a save, and now says so instead of guessing:

- Renaming an entity, a chapter or a timer turn. The old name has no identity in the new manifest. A renamed chapter's `fired` mark is dropped and its `current` value is reported and left; the chapters plugin then reads the unknown name as no chapter begun and starts whichever row the saved facts satisfy, so play resumes under the new name on the restore turn. An unmappable timer turn holds the timer where it is.
- Inserting a clause between two clauses that share a head. The `#n` numbering shifts and both counters reset.
- Adding variants to a `cycling` or `sticky` phrase. The stored count is name-keyed and survives, but it may now land on a different variant. ADR-388 D1 records this as accepted drift, not a defect.

Two residues the reconciler records rather than hides: an NPC behavior for a character the edit added is not registered until the next load, because `onEngineReady` ran before the restore; and the exit-admits and pushing-way stamps are not re-run for an added room.

## One measured side effect

A `randomly` phrase picks its variant by hashing the speaking entity's world id. When Chord world ids became names, every such draw re-rolled once. Secret Letter's tree moved by exactly one pinned card (`tbekp9rw.json`, card `zzzedq2t`, one of Pieter's five bodyguard lines). It was reported, not re-recorded; the ruling is open as issue 636.

## The one-shot cutover

No old-key reader ships and none is owed. No story has released a save into the wild, and save-format versioning is dormant by David's 2026-09-11 ruling. The pre-ADR-289 retired-select sweep (`RETIRED_SELECT_KEY`, `sweepRetiredSelectKeys`) was deleted with its key space; the reconciler's orphan drop is its general form. The save-format version did not move. The arrange and claim spelling in tree documents changed from `clause <n> occurrence` to the head as the author would say it (`the troll on attacking occurrence = 2`), rewritten once across the corpus.

## Where the tests are

Each is a real path through the actual `GameEngine` save and restore, not a stub.

| Test | What it pins |
| --- | --- |
| `packages/chord/tests/clause-ids.test.ts` | ids are head-derived, unique, prefix-stable, never bare digits |
| `packages/chord/tests/identity.test.ts` | manifest contents; two compiles are byte-identical; prose and reorder leave the stamp; structure changes it |
| `packages/story-loader/tests/adr-388-save-edit-restore.test.ts` | inserting a clause ahead of a counted one keeps its count across a real restore |
| `packages/story-loader/tests/adr-388-keys-by-name.test.ts` | chapter and timer resume by name after a chapter and a turn are inserted ahead |
| `packages/story-loader/tests/adr-388-identity-stamp.test.ts` | the save records the stamp; IR without a manifest is refused |
| `packages/story-loader/tests/adr-388-reconcile.test.ts` | the full add, drop, re-seed, report flow through the real `restore` command, and idempotence |
| `packages/story-loader/tests/reconcile.test.ts` | the pure helpers |
| `packages/world-model/tests/unit/world/create-entity-id.test.ts` | explicit entity ids |
| `packages/engine/tests/platform-operations.test.ts` | event ordering, the player-line rule, the matching verdict |
| `packages/stdlib/tests/channels/diagnostics.test.ts` | the diagnostics channel |

The floor held through every phase: Dungeo's walkthrough chain at 952 passing in 17 transcripts, Fernhill's tree at 86 cards and 107 assertions, byte-identical before and after.

## Amended by reference

ADR-289 D2 (select id shape, retired-key sweep), ADR-356 D2 (clause identity and the pin spelling), ADR-325 Consequences "Persistence" (no save-format bump for the timer re-key), ADR-330 D2 (chapter stored by name), and ADR-276 D5 (the reconciliation report added to the residue list) each carry a note written by the phase that landed it. No Status line flipped.
