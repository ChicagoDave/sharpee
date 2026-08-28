# Session Summary: 2026-08-26 11:50 - feat/adr-321-world-index

## Goals
- ADR-327 **Phase 3** — D9 + D10, the player role: assignment, reassignment, and the start block.

## Phase Context
- **Plan**: `docs/work/adr-327-explicit-references/plan.md` — Phase 3 (Large, 400 tool-call budget).
- **Shape doc**: `docs/work/adr-327-explicit-references/phase-3-role-shape.md`.

## Rulings taken this session (David)
- **D10 runtime = (C)** — flip `setStory`'s order so `initializeWorld` runs before `createPlayer`.
  The shape doc had called C "not viable"; that was a mis-measurement, corrected by counting call
  sites (7 TS files place the player during `initializeWorld`, not "every TS story").
  C dissolves design (A)'s static role read, `ir.initialPlayer`, and the pass-1 skip.
- **Q1 WITHDRAWN** (C removes the reason for it — a conditional opening PC is legal; the unfilled
  case is a load-time `LoadError`).
- **Q2 YES** — `switchPlayer` moves `me`/`myself`/`self` to the new PC.
- **Q3 YES** — start block takes effect statements only; `phrase`/`emit` → `analysis.start-block-narration`.
- **Q4 YES** — a `playable` character gets `ContainerTrait{ maxItems: 10 }`.
- **Q5 YES** — `IREntity.isPlayer` deleted, `IR_FORMAT` → `story language 4`, Chord stays 4.0.0.

## Completed — the Chord compiler half (`packages/chord`, 69 files / 1042 passing)
- `ast.ts` — `StartBlockDecl`, `ChangePlayerStmt`.
- `ir.ts` — `IREntity.isPlayable` replaces `isPlayer`; `StoryIR.startBlock`; `change-player`
  statement; `IR_FORMAT` → `story language 4`.
- `parser.ts` — `before` joins `TOP_KEYWORDS` + `parseStartBlock`; `parse.removed-create-player`
  with the D10 fix-it; `change the player to <name-ref>` recognized ahead of the generic `change`
  target parse (the tail is a name ref, not a single state word).
- `analyzer.ts` — `playable` consumed as a reserved bare composition ahead of
  profile/personality/trait routing (`analysis.playable-non-person`); `buildStartBlock` with
  `analysis.start-block-missing` / `-duplicate` / `-no-role` / `-narration`; `change-player`
  lowering with `analysis.player-target-not-person` / `-not-playable`; `resolveEntityId` returns
  the `'player'` sentinel unconditionally (the role, not an entity).
- **Deleted with the player block**: `analysis.player-kind`, `analysis.player-behavior`,
  `analysis.character-line-player`, `analysis.personality-player`.
- `chord.ebnf` — `playable` create-line, `start-block` production, `change the player to` row;
  hash re-pinned `525b5c8e…` in `tests/language-version.test.ts` (same 4.0.0 major, per D6).
- `src/version.ts` — D9/D10 landing recorded.
- `docs/architecture/chord-grammar-changes.md` — row added.
- **Fixture migration**: ~90 files (25+ `.story` fixtures, ~48 test files with inline sources,
  10 golden snapshots re-recorded and diff-reviewed: format 3→4, `isPlayer`→`isPlayable`,
  `player`→`alex`, `startBlock` added — nothing else).

## Key Decisions (implementation findings)
1. **`analysis.start-block-missing` fires only on a file with a `story` header.** A grammar file
   carries no story; a headerless fragment is not a story either. Both are compiled all over the
   test suites and neither has a role to fill.
2. **`analysis.player-target-unknown` dropped.** `resolveEntityValue` already fires the standard
   unknown-entity gate; two diagnostics for one miss reads as two problems.
3. **`on the player …` inside a character block is legal.** It names the ROLE, which some other
   character may hold — so `analysis.head-actor-is-owner` can only fire on the by-name form
   (`on Alex …` inside Alex's block). Phase 1's tests for the player-block case were rewritten.
4. **A timer must belong to whoever the bare reference resolves against.** `define timer waiting
   for the player` + a bare `restart waiting` inside Alex's block is now a genuine mismatch
   (`player` sentinel vs `alex`); the fixture says `for Alex`.

## Completed — the runtime half

### `packages/story-loader` (635 passing; 2 red = `zoo-pure-ir`, the corpus reader Phase 4 owns)
- `loader.ts`: pass 1 builds the role-holder like any entity (the player skip is gone);
  `playable` persons get `ContainerTrait{ maxItems: 10 }` (Q4); `createPlayer` is a LOOKUP that
  stamps `ActorTrait.isPlayer` and the role vocabulary, with two named `LoadError`s (world not
  built; role never assigned); `finalizePlayer` → `finalizeRoleHolder` — maps the `player`
  sentinel in `worldIds`, keeps the ADR-289 D4 first-room fallback, equips `carries`/`wears`,
  runs `applyCharacterBlocks`; the `!irEntity.isPlayer` NpcTrait guard deleted (D9).
- `runtime.ts`: `runStartBlock` with an `inStartBlock` flag; the `change-player` effect
  (assignment inside the block, `if.event.player.switch_requested` outside it); D9 role gates
  ahead of the presence gate on entity and trait every-turn daemons (`holdsPlayerRole`);
  `playerCarriesClauses` and the bind-time player special case retired.

### `packages/stdlib` (1637 passing) / `packages/world-model` (1492 passing)
- `canNpcAct(npc, world)` returns false for `world.getPlayer()?.id`; five call sites threaded.
- New `traits/actor/playerRole.ts` — `PLAYER_ROLE_ALIASES`, `addPlayerRoleVocabulary`,
  `movePlayerRoleVocabulary`. Shared because the loader stamps the opening PC and the engine
  moves the set on every switch; duplicating a three-word constant across that seam is how it
  drifts.

### `packages/engine` (637 passing)
- `setStory` order flipped: `initializeWorld` then `createPlayer`. `registerConcealedVisibilityBehavior`
  deliberately did NOT travel with `createPlayer` — it stays ahead of the world build so a story's
  own binding still wins last (ADR-207). `ListenerTrait` attachment moved after `createPlayer`.
- `drainPlayerSwitch(turn)` — `switchPlayer`'s first caller, at the turn boundary;
  `runtime.double-player-switch` names every target when a turn carries more than one request.
- `switchPlayer` moves `me`/`myself`/`self` to the new PC (Q2).

### Stories and harnesses
- Seven TS `Story` implementations re-ordered (dungeo, cloak-of-darkness, family-zoo-tutorial,
  concealment-test, channel-service-test, minimal-test-story, complex-world-test-story), plus
  four engine inline test stories and both `bootstrap` test stories (50 passing).

### New tests
- `packages/chord/tests/adr-327-phase3.test.ts` — 22 compile-side tests.
- `packages/bootstrap/src/adr-327-phase3-role.test.ts` — 9 REAL-PATH tests (rule 13a) through
  `assembleGame`: a real compiled Chord story on a real engine. Bootstrap is the only package
  that has both the loader and a parser — the engine cannot see the loader, and the loader has
  no parser.

## Key Decisions — the runtime half
5. **The two-moment split keys on the start block, not on the world.** The shape doc proposed
   discriminating `change the player to` on whether `world.getPlayer()` is defined. `bootstrap`
   seeds a placeholder player before `setStory`, so the world's answer says nothing about
   whether the story has opened. The runtime carries an `inStartBlock` flag instead.
6. **The switch REQUEST rides the reports pass.** A mutations-pass event is recorded and
   dropped — which is exactly where the request went missing on the first run. The assignment
   (a real state change) stays in the mutations pass.
7. **`analysis.player-kind` / `-behavior` are gone, deliberately.** An NPC behavior adjective on
   a `playable` character is legitimate: it drives them for as long as they are not the
   role-holder. That is D9 Scenario B, and the old gate made it unstatable.

## Completed — Phase 4 (corpus migration sweep, D6)

David ruled fernhill and ides-of-march are **test stories** whose content may be adjusted
for tests. Secret Letter needed no invention: the PC's name is the game's own title and
already sat in the player block's description — **Jack** (Jacqueline Toresal, per the 2009
detail design). PCs: Wren, Nick Bray, Jack, and `Alex` for the thirteen demo/test stories.

- **16 player blocks**, **82 `it`-heads**, **113 `it`/`its` sites**. The `it` half was
  driven off the compiler's own `analysis.it-removed` diagnostic — its message names the
  owner and its span says where — so `define trait` and `define condition` carrier scopes
  were never touched, because they never raise the diagnostic. A regex could not have
  known the enclosing block's owner, and ~508 corpus lines contain the English word "it"
  in authored prose that must not move.
- One genuine semantic find: `define timer waiting for the player` with a bare `restart
  waiting` in Jack's block. Under D10 the timer belongs to the ROLE and the bare reference
  resolves against the character — so the reference became `restart the player's waiting`,
  matching the spelling the corpus already used at its two other call sites. The timer
  stayed on the role; retargeting it to Jack would have been the wrong fix.
- Package fixtures: devkit (incl. `story language 2`→`4` pins and the story template),
  character, platform-browser, world-index. IDE: five test fixtures + the frozen fernhill.
  The 47 generated docs-tab HTML pages are reference surface — Phase 5.
- **`zoo-pure-ir` went green**, closing the accepted red Phase 2 exited with.

### Phase 4 gates
chord 1064 · story-loader 637 · stdlib 1637 · engine 637 · world-model 1492 · bootstrap 52
· devkit 172 · world-index 169 · character 567 · platform-browser 138 · IDE testing-surface
91 · repo `tsc --noEmit` clean. Story trees: secret-letter **160 cards / 209 assertions**,
fernhill 36/40, ides-of-march 39/48, thealderman 4/9. Dungeo rebuilt, walkthrough chain
**952 passing / 17 transcripts** — the baseline, unmoved by the engine order flip.

### Two traps worth remembering
1. **A stale `tsconfig.esm.tsbuildinfo` survives `rm -rf dist-esm`.** The incremental build
   then reports success and emits nothing, and the failure surfaces much later as an
   esbuild "No matching export" against a half-built `dist-esm`. Delete the buildinfo with
   the directory.
2. **`npx tsc` fails from inside several package dirs** (`node_modules/node_modules/...`);
   the repo-root `node_modules/.bin/tsc` works.

## Open Items
- **Phase 5** (paper trail) is next: `zoo-pure-ir` (2 red here) and world-index's
  fernhill-driven suites are its work, exactly as the plan's Sequencing note predicted.
- Five implementation findings are in the shape doc's **Landing notes**, owed to ADR-327 as
  Phase 5 amendments — notably that D1's `analysis.head-actor-is-owner` now narrows to the
  by-name form, since `on the player …` in a character's block names the role.
- Not committed at time of writing.

---

## Session Metadata
- **Status**: COMPLETE — Phases 3 and 4 landed
- **Blocker**: N/A
- **Rollback Safety**: safe to revert (not yet committed; `feat/adr-321-world-index` not merged)

## Test Coverage Delta
- Tests added: 31 (22 chord compile-side, 9 bootstrap REAL-PATH).
- After: chord 1064, story-loader 635/637, stdlib 1637, engine 637, world-model 1492,
  bootstrap 52. Repo `npx tsc --noEmit` clean.
- Known untested here: the corpus (Phase 4); D7 non-player heads (Phase 6, blocked on ADR-328).

## Mutation Audit
- `mutation-verification` graded every mutation GREEN except one: `canNpcAct`'s new role gate
  (`npc-service.ts:436`) had no test that could take its branch — stdlib's unit suite mocks
  `getPlayer()` as a fixed `'player'` id and never makes an NPC the PC, and the real-path NPC
  fixture's characters are never the PC either.
- Closed the same session: `adr-327-phase3-role.test.ts` now carries a `wanderer with
  move-chance 100` composed on a **playable** character — she stays put across two turns while
  holding the role, and walks the turn after the role moves to Alex.
- Falsifiability checked, not assumed: with the gate commented out the new test fails (1 failed
  | 8 passed); restored, 9 passed. The assertion is on `world.getLocation(viola.id)`, a state
  read, not on an event or a non-throw.
