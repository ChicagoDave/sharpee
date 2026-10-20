# Phase 16 proposal — Propose the necessary set from a played line (the lock, CLI side)

**Date**: 2026-10-20 · **Session**: e28264 · **Plan**: `plan-20261013-chord-4-0.md` Phase 16 (Medium, 250) · **Status**: LANDED 2026-10-20 (David: "go"). Deviations: the `## locked from` comment is not written (ADR-249 admits no comment inside a block; GH #608); the duplicate-name refusal was added after the mutation audit; the label convenience is the line's first typed command, not the derived label (which needs a boot to compute)

ADR-367 decides the shape; this proposal is the `packages/` discussion `CLAUDE.md` requires before building it. It covers D1, D2, D3, D4, D5, D7 (the CLI half) and D8. D6 (the broken-claim report, the failed card), the Testing tab gesture and AC-4/AC-6 are Phase 17 as the plan has them.

## What exists today (measured 2026-10-20)

- `packages/branch-tester/src/claims/` is six modules: `claim-set.ts` (gate), `claim-predicates.ts` (`claimHolds(claim, ctx)` over world, snapshot, events, `entityIdByIr`, `clauseKeysByFired`), `claim-candidates.ts`, `claims-game.ts` (`ClaimsGame` = `{ world, engine, executeCommand }`, which bootstrap's `LoadedGame` satisfies), `claims-walk.ts` (the fork walk; `claimCone` called once per claim at `claims-walk.ts:197`), `claims-runner.ts` (`runClaims`, `formatClaimsRun`).
- The runner has no memory of lines: every positive claim is walked, every run. Fernhill's `sharpee test` spends about 100 s on the one walk that proves victory (ADR-365 Consequences).
- `compileClaims(storySource, fragmentSource, { importResolver, claimsFile })` (`packages/chord/src/claims.ts:114`) parses a fragment, resolves names (exact name, alias, in-order word subset), lowers each predicate to an `IRClaim`, and reports the D12 cone finding. It is the only place a fact sentence becomes a predicate. The lock reuses it unchanged: a candidate block is compiled through it, which validates the sentence and lowers it in one step.
- The tree card grammar is closed (`tree-document.ts:929`, keys `id, type, command, assertions, skip, ending`); `TREE_DOCUMENT_VERSION = 3`; "additive fields arrive with a version bump, never silently" (header invariant). Fourteen `manifest.json` files in the repository carry `"version": 3` (seven stories, five fixtures, one sample, one prototype). The Testing tab imports `tree-document.ts` source directly (rule 8b note in its header), so the IDE follows a bump with no second edit; nothing in `tools/ide/Sources` or `scripts/check-test-trees.mjs` carries the number.
- The walker reads the game after each card inside its `onCommandResult` wrapper (`tree-walker.ts:470`): `noteRoom()` and `attachCause()` already run there with the game in hand. That is the seam the floor hooks.
- `LoadedGame.lastTurnResult` carries `validatedCommand` (`engine/src/types.ts:143`), whose `actionId`, `directObject.entity`, `indirectObject.entity` and `instrument.entity` are the entities a turn resolved to. That is what "every entity a command on the line resolved to" (D2) reads; nothing is inferred from prose.
- Line labels are derived and not unique: fernhill's run prints `gravel-drive · north` twice and `greenhouse · x vine` twice. A line's identity is its segment id (ADR-355 D5), which is the file name (`hpjuaufx.json`).
- The claims tier runs after the tree and derived tiers (`test-tree-document.ts:290`), compiling the fragment only then. The floor needs the claims before the tree runs, so the order moves.
- `candidateCommands` never emits `wait`, `board`, `set X to Y` or `switch on` (it says `turn on` for `switchable`), so a UPPS claim past the fold is unreachable by walk today. That is the case D5's floor exists for: the line proves it.
- Baselines: fernhill 86 cards, 106 assertions, 11 lines; UPPS 244 cards, 358 assertions, 11 lines; both green.

## The shape

### One function, in branch-tester (D3)

`packages/branch-tester/src/claims/claim-lock.ts` — `proposeLock()` and `renderLock()`, filesystem-free like the rest of the package; devkit (and later the tab's sidecar) do the reading and writing.

```ts
proposeLock(input: {
  ir: StoryIR; document: TreeDocument; lineId: string; turn?: number;   // turn defaults to the line's last card
  fact?: string;                                                        // a Chord predicate sentence; absent = offer only
  loadGame: ClaimsGameLoader; compileCandidate: (block: string) => ClaimsCompileResult;
}): Promise<LockProposal>
```

`LockProposal` carries: the line (id, label), the card id, the turn number, the **offer** (D1), and when a fact was given the **claim** (lowered), the **set** (rooms, things, verbs), the **trimmed** things with the cone's reasons, and the rendered Chord block.

The line is read once: boot at the tree's seed, replay the prefix and the line's cards through the card, and after every typed turn record the player's room, the validated command's action id and resolved entities, and a world snapshot. Turn numbers count typed turns from the root, prefix included, boot look excluded, so "turn 41" is what the player played.

### The offer (D1)

Facts true at the card that were not true at boot, each as a sentence `compileClaims` accepts: `the player is in <room>`, `the player has <thing>` per thing in hand, `<thing> is <state>` per Chord state that changed, `<thing> is open|closed|locked|unlocked|on|off|lit|unlit|worn|unworn|read` per platform flag that changed, `<thing> has been <participle>` per `on` clause whose counter rose, `the story ends in victory|defeat` when the line ended. Any other sentence the author types is accepted if it compiles and holds at the card; a sentence that compiles but is false at the card is refused by name, and nothing is written.

### The set (D2, D8)

- **rooms**: every room the player stood in through the card, boot room first, in first-visit order.
- **things**: the union of every entity a validated command resolved to (direct, indirect, instrument) and every entity whose place, Chord state or stateful trait flag differs between consecutive snapshots (the walk's own `STATEFUL_TRAITS` list, plus `readable`), minus rooms and the player, in first-touch order.
- **verbs**: for each turn with an action id, the words of the typed command before its first resolved noun (`turn on`, `ask`, `give`), deduplicated; a turn whose action is going by direction adds no verb, since the candidate filter treats exits separately. Not trimmed (D8).
- The things then pass through `claimCone(ir, claim, set)` for the chosen predicate; the inert ones are dropped from the written line and listed as trimmed, with each kept thing's first reason available under `--verbose`.

### The writer (D4)

A splice, never a reformat: the block is inserted before the fragment's `end claims` line, two-space indented, preceded by one blank line and `## locked from line <id> "<label>" at turn <n>, <date>`. The rest of the file's bytes do not move, so a hand edit and a lock never fight. The claim's name defaults to the fact sentence; `--name` overrides it. Names are written as the story declares them (the article kept for common nouns, none for proper names), which is the form the resolver takes exactly.

With no `claims` key in the manifest: `<story-id>.claims.chord` is created beside the story with a two-line header comment and a `claims … end claims` block holding only the new claim (its needs on the claim, the shared set empty), and the manifest gains the key through `segmentTree()`, the tree's own writer.

### The floor and the pin (D5)

- **The pin**: `locks?: string[]` on `TreeCard`, written through `segmentTree()`. `TREE_DOCUMENT_VERSION` stays 3 (David, 2026-10-20: "tree version still doesn't matter — there is no legacy material to worry about"). The header's version history and its "additive fields arrive with a version bump" line are replaced by one line: the version is dormant until a released story exists (David, same day: "the tree can v1 - there is no legacy (yet)"), the same ruling as the save format; the number stays as it is because changing it would touch fourteen manifests for nothing.
- **The floor**: `claim-floor.ts` — `createClaimFloor(ir, claimSet)` returns a `TreeLineObserver.onCard` hook and a `reached()` reading. The walker gains that optional hook (`onCard({ line, card, turn, game })`), called from the existing wrapper at `tree-walker.ts:470` after `noteRoom()`. At each card the floor evaluates every positive claim not yet reached (`claimHolds`, one snapshot per card) and records the first line and turn that reached it; at a card carrying `locks`, it evaluates each named claim there and records held or not held, and `lock-unknown-claim` for a name the fragment lacks.
- **The tier**: `test-tree-document.ts` compiles the fragment before the tree runs, hands the floor to the walker, and passes `reached()` to `runClaimsTests`, which walks only the positive claims no line reached, and every `never` as today. The report vocabulary: `HELD  <name> — by line <id> "<label>" at turn <n>` for the floor, `held, by walk` as today for the rest, `not reached by any line` before a walk result, and for a pin that failed: `pinned at line <id> turn <n> — NOT held there` beside the claim. Exit code untouched (ADR-365 D9).
- **Deferred to Phase 17 (D6)**: a failed pin failing its card and the run. In Phase 16 the pin is written and evaluated and its failure is loud in the claims report, but it does not move the exit code and does not ride the run-event wire. ADR-367 puts AC-4 in Phase 17; this is that line.

### The CLI (D7)

```
sharpee claim <line> ["<fact>"] [--at <turn>] [--name "<claim name>"] [--propose] [--story <file.story>|<dir>]
```

`<line>` is a segment id, or a derived label when exactly one line carries it; an ambiguous label is refused listing each id with its first command. No fact: prints the offer and exits 0. A fact: prints the proposed set as the ADR example shows it, writes the claim and the pin, and reports the files written; `--propose` prints and writes nothing. Exit 2 for a line, turn, or fact the command cannot use; 3 when the story will not boot.

## Changes

**`packages/branch-tester`**
- new `src/claims/claim-lock.ts` (the line reading, the offer, the set, the cone trim, the Chord block, the fragment splice), new `src/claims/claim-floor.ts` (D5), new tests for each (fixture story plus fernhill and UPPS real-path runs, `SHARPEE_TRANSCRIPT_CORPUS` gated like `claims-fernhill.test.ts`).
- `src/tree-document.ts`: `locks` on `TreeCard`, validated as an array of non-empty strings, written in key order; version unchanged, header invariant amended.
- `src/tree-walker.ts`: `TreeLineObserver.onCard`, one call site.
- `src/index.ts`: exports.

**`packages/devkit`**
- new `src/commands/claim.ts`; `src/cli.ts` dispatch and USAGE line.
- `src/commands/test-tree-document.ts`: compile claims first, build the floor, pass `reached()`; `src/commands/test-claims.ts`: take the floor's reading, skip reached claims, the new report lines.
- tests: the claims-tier fixture gains a lock test (fresh fragment, manifest key, second lock appends).

**Not changed**: `packages/chord` (compileClaims and claimCone as they are), `packages/ide-protocol` (the tree schema the ADR's Scope line places there lives in branch-tester's `tree-document.ts`, which the tab imports; nothing to add there this phase), `tools/ide` (Phase 17).

**Trees and stories** (story-level, no gate): `fernhill.claims.chord` gains one locked claim and one card gains `locks`; `branch-stories/upps/upps.claims.chord` is created by the first lock, its manifest gains `claims`, one card gains `locks`.

## Demonstration (the plan's)

1. `./sharpee claim hpjuaufx "the deed box is open" --at 1 --story branch-stories/fernhill/fernhill.story` — the line through `open deed box with locket`. Expected: rooms are the nine of the winning line; things include the sherry bottle and Mrs Kettle from the prefix (`fq9jgq16`: `give sherry to kettle`) and the cone trims both (AC-2's fernhill case, measured once built); verbs from the line; written, pinned.
2. `./sharpee claim a366titn "the player is in the Kraken Landing" --story branch-stories/upps/upps.story` — the drop line's last card, far past any walk (AC-3a). Expected: `upps.claims.chord` created, manifest key added, pin written.
3. `./sharpee test` on both, story unchanged: both locked claims `HELD — by line … at turn …`, no walk run for them; fernhill's nine other claims unchanged; trees green at 86 and 244 cards. A second `sharpee test` is byte-identical (deterministic at the pinned seed).
4. `pnpm --filter @sharpee/branch-tester test` and `pnpm --filter @sharpee/devkit test` green; `./repokit build dungeo` clean; Dungeo chain unaffected (no `packages/` path it reads changes).

## Points for David

1. ~~Version bump~~ — ruled out by David 2026-10-20: no legacy material, version stays 3.
2. **Line addressing by segment id** with a unique label as a convenience, since labels repeat in both trees today.
3. **The failed pin stays a report line in Phase 16** and becomes a failed card in Phase 17 with D6's report, where ADR-367 places AC-4.
