# ADR-260: Scoring is a trusted extension; the platform keeps only the ledger and a thin SCORE

## Status: ACCEPTED (2026-07-23, session 7f133e) — the scoring capability is deleted rather than repaired (D1), scoring state consolidates on the ADR-129 ScoreLedger with absolute-points ranks that no ceiling change can move (D2), `if.action.scoring` is gutted to a ledger reader with no rank logic and no English literals (D3–D4), and scoring becomes a new `@sharpee/ext-scoring` trusted extension that enables via `registerWorld` and announces promotions via `registerPlugin`'s first live use (D5–D6). Open Questions resolved by `adr-interview`; `adr-review` 7/16 → **16/16** after four blocker fixes (the `registerWorld` signature could not carry the ladder, D7 contradicted D3's `no_scoring` path, "ranks persist for free" was false against `ScoreLedger.toJSON`, and the schema was live in test infrastructure). **Amended twice on 2026-07-23 (same session)**: (1) from `adr-review` of ADR-261 — D6 fixes promotion *rendering* as a loader-registered story reaction rather than a platform renderer, so `RankDefinition` stays free of phrase keys; (2) from the three-ADR review of 259/260/261 — D6's `registerPlugin` call site moves from the `registerWorld` loop to `onEngineReady`, since no plugin registry exists at world-build time. Not implemented.

## Parent: ADR-129 (treasure scoring to the story layer — the ScoreLedger this ADR consolidates on). Supersedes ADR-085 (scoring system) outright, and ADR-076 with it: both designed a capability-backed ScoringService that the codebase never registered. Follows ADR-215's extension contract (`registerWorld`/`registerPlugin`) and ADR-207/208's per-world registration discipline. **ADR-261 depends on this**: Chord's `use scoring` and `ranks` syntax lower onto the seams decided here.

## Date: 2026-07-23

## Context — verified, not assumed

Chord authors can declare scores and award them. They cannot define ranks, and they cannot
control what SCORE says. Tracing that gap found a subsystem where the designed half and the
running half never met.

**Chord's authoring surface is complete on the award side.** `score <name> worth N` attaches a
scoring identity to any of four owners — story header, `create`, `define trait`, `define action`
(`packages/chord/src/ast.ts:76`, `ir.ts:469`, `docs/reference/chord.ebnf:156`) — and `award <name>`
grants it, resolving owner-first. The analyzer flattens all four owners into one owner-qualified
list (`analyzer.ts:491`), and the loader sums every declared `worth` into the ceiling:

```ts
if (this.ir.scores.length > 0) {
  world.setMaxScore(this.ir.scores.reduce((sum, s) => sum + s.worth, 0));  // loader.ts:518
}
```

**The word `rank` appears nowhere in the language.** Not in the lexer, parser, AST, IR, EBNF, or
`chord-language.md` — only as a substring of message-alias names. There is no author syntax for a
rank ladder in any form.

**Ranks are hardcoded in stdlib, in English.** The scoring action computes them from fixed
percentage bands and interpolates the literal string into `{rank}`:

```ts
function computeRank(score: number, maxScore: number): string {   // scoring.ts:52-60
  if (maxScore === 0) return 'Beginner';
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'Master';
  if (percentage >= 75) return 'Expert';
  ...
}
```

Five English words emitted from stdlib. The root `CLAUDE.md` rule is explicit — *"Never hardcode
English strings in stdlib (or engine, world-model)"* — so this is a standing language-layer
violation, independent of Chord.

**The documented escape hatch does not exist.** `scoring.ts:99` reads `scoringData?.rank`, and
`scoring.ts:87` branches on `scoringData?.enabled === false`. **Neither field is in the schema.**
`ScoringCapabilitySchema` (`packages/stdlib/src/capabilities/scoring.ts:11-42`) declares
`scoreValue`, `maxScore`, `moves`, `achievements`, `scoreHistory`, `scoredTreasures` — no `rank`,
no `enabled`. Both branches are unreachable through the declared contract.

**And the schema constant reaches no production path — only test infrastructure.**
`ScoringCapabilitySchema` is listed in the `StandardCapabilitySchemas` table
(`packages/stdlib/src/capabilities/index.ts:54-61`), which feeds
`registerStandardCapabilities()` (`:68`). That helper **is** called — but only from
`packages/stdlib/tests/test-utils/index.ts:34` (the shared setup behind stdlib action tests),
`packages/stdlib/tests/unit/capabilities/capability-refactoring.test.ts`, and
`packages/engine/tests/integration/query-events.test.ts:32`. No engine, loader, or story code calls
it: the engine registers only COMMAND_HISTORY, TEXT_STATE, and storyInfo
(`game-engine.ts:234-459`), and the story-loader registers no capability at all — so
`world.getCapability(SCORING)` is `undefined` for **every Chord story**.

The consequence is worth stating plainly: **stdlib's own action tests exercise a
capability-present path that no shipped story has.** The tested configuration and the shipped
configuration differ, which is why the dead branches at `scoring.ts:87`/`:99` were never noticed.

**Exactly one story registers the capability, and it bypasses the schema:**

```ts
world.registerCapability(StandardCapabilities.SCORING, {   // stories/dungeo/src/index.ts:233
  initialData: { moves: 0, deaths: 0 }
});
```

`deaths` is not in the schema either. Dungeo writes it from a state machine
(`death-penalty-machine.ts:40-42`) and reads `moves` nowhere the score display sees. The one live
consumer of the capability uses it as private story bookkeeping, not as the scoring contract.

**What *does* work is the ledger.** ADR-129 moved score onto `ScoreLedger`, and it is complete and
persistent: `awardScore`/`revokeScore`/`hasScore`/`getScore`/`getScoreEntries`/`setMaxScore`/
`getMaxScore` (`WorldModel.ts:1324-1350`), serialized through `toJSON`/`loadJSON`
(`:1354`, `:1371`). Awards dedupe by identity, which is why Chord's `award` is idempotent.

**So ADR-129 half-superseded ADR-085 and left the remainder in the tree.** Score and maxScore moved
to the ledger; rank, enabled, achievements, and moves stayed in a capability nothing registers. The
scoring action still reads both halves, and only the ledger half answers.

**Two visible symptoms follow.** A story that declares no scores answers SCORE with *"Your score is
0 points"* — because `enabled` is unreachable, the honest *"This isn't that kind of game"* branch
(`no_scoring`) can never fire. And `rank_novice` … `rank_master`
(`packages/lang-en-us/src/actions/scoring.ts:27-31`) plus the entire `scoringSystemMessages` block
(`:60-78`, including all eight `if.rank.*` entries) are never emitted by anything — the action only
ever selects `score_simple`, `score_display`, `score_with_rank`, or `perfect_score`, and
`scoringSystemMessages` is imported by no module in the repo.

**The extension precedent is the shape this wants.** Combat — the only real extension — contributes
**no verbs at all**:

```ts
export function registerBasicCombat(world: IWorldModel): void {   // extensions/basic-combat/src/index.ts:47
  world.registerActionInterceptor(TraitType.COMBATANT, 'if.action.attacking', BasicCombatInterceptor);
  registerNpcCombatResolver(basicNpcResolver);
}
```

ATTACK stays in stdlib; the extension supplies the behavior behind it. `ExtensionRegistration`
offers three slots — `registerWorld`, `registerPlugin`, `registerChannels`
(`story-loader/src/extension-registry.ts:88-101`) — and none contribute actions, grammar, or
messages. **Scoring fits this exactly**: awards already ride other verbs' interceptors, which is how
Chord lowers them today. SCORE-the-verb never needs to move.

**Rank changes, unlike awards, are turn-shaped.** An award fires inside an action's execute/report.
A *promotion* — crossing a threshold — is an after-the-fact observation, which is precisely what
`TurnPlugin.onAfterAction` is for (`packages/plugins/src/turn-plugin.ts:13-28`). Sharpee cannot
currently announce a promotion at all.

## Decision

### D1 — The scoring capability is deleted, not repaired

`ScoringCapabilitySchema` and its `ScoringData` interface are removed from
`packages/stdlib/src/capabilities/scoring.ts`, along with the `StandardCapabilities.SCORING` entry
in the `StandardCapabilitySchemas` table (`capabilities/index.ts:55`). The capability was designed by
ADR-085, never registered by any production path, and superseded in its working half by ADR-129's
ledger. Repairing it would mean reviving a contract whose only registered consumers are tests.

Removing the table entry changes what `registerStandardCapabilities()` installs by default, which is
a test-visible change with named migration sites (D7).

`StandardCapabilities.SCORING` the *identifier* survives in world-model for stories that want a
private bookkeeping capability under that name — dungeo's `moves`/`deaths` is exactly that, and it
keeps working untouched (D7). What dies is the platform's claim that this capability is the scoring
contract.

### D2 — The ScoreLedger is the single home for scoring state

All scoring state lives on `ScoreLedger`, reached through the `WorldModel` methods that already
front it. It gains three things:

- `setRanks(ranks: RankDefinition[])` / `getRanks()` — the rank ladder, per world. `setRanks` sorts
  ascending on receipt, so callers need not; an empty array is legal and means "scoring on, no
  ladder"; two rungs sharing a threshold is a caller error the setter throws on, since silently
  keeping one would make the resolved rank depend on array order.
- `getRank(): RankDefinition | undefined` — the current rank, derived on every call (below).
  `undefined` when no ladder is installed.
- `isScoringEnabled()` — true once a scoring registration has installed itself, false otherwise.
  Default **false**. Note that installing an *empty* ladder still enables scoring: enablement is
  the registration, not the ladder.

`RankDefinition` is `{ id: string; name: string; threshold: number }`, ordered ascending, resolved
by highest threshold not exceeding the current score.

**`threshold` is absolute points, never a percentage of max.** This is an invariant, not a
preference: **a change to maxScore must never move a rank boundary.** Dungeo raises the ceiling from
616 to 650 at runtime when the thief dies (`melee-interceptor.ts:210`, ADR-078's hidden max points).
Under percentage thresholds that call would silently re-rank every player — someone holding a fixed
480 points is 78% of 616 but 74% of 650, so killing the thief would *demote* them having earned
nothing and lost nothing. Absolute thresholds make the ceiling and the ladder independent, so
`setMaxScore` stays a free operation at any time. ADR-085's own custom-rank example already used
absolute points (`threshold: 0 / 50 / 200 / 400 / 616`), so dungeo's ladder ports without
conversion.

**The current rank is always derived, never stored.** `getRank()` computes from `getScore()` and the
ladder on each call. Stored rank can drift from stored score across a revoke, a maxScore change, or
a save/restore; derived rank cannot.

**Per-world, not module-level.** ADR-207 and ADR-208 moved interceptor and capability-behavior
registration off module-level registries onto per-world binding maps, and
`packages/stdlib/CLAUDE.md` states the rule for interceptors as *"never a module-level registry."*
The rank ladder follows that discipline. This rules out the alternative of a module-level
`registerRankResolver` mirroring `registerNpcCombatResolver` (`stdlib/src/npc/npc-service.ts:42`,
still module-level) — that seam is a survivor of the older pattern, not a model to copy.

**Ranks are configuration, not state — they are not serialized.** `ScoreLedger.toJSON()` returns a
fixed literal, `{ scoreLedger, scoreMaxScore }` typed by `ScoreLedgerData`
(`ScoreLedger.ts:23-26`, `:120-125`), so a new field is not persisted unless deliberately added.
It should not be added. A ladder is installed at load by the story's scoring registration and is
identical on every load of the same story; persisting it would put configuration in a save file and
create a load-order conflict — restored ranks overwriting freshly registered ones, or the reverse,
depending on whether `fromJSON` runs before or after registration. Excluding them makes the ordering
question disappear.

Consequences of that choice, both deliberate: `ScoreLedgerData` is unchanged, so **existing saves
load without migration**; and `clear()` (`ScoreLedger.ts:144-147`) resets entries and maxScore but
leaves the ladder installed, because clearing gameplay state must not uninstall the story's
configuration.

### D3 — `if.action.scoring` becomes a ledger reader with no rank logic

The action keeps its id, its grammar (`parser-en-us/src/grammar.ts:353`, `:862`), and its
`group: "meta"`. Its execute phase reduces to:

1. `world.isScoringEnabled()` false → emit `no_scoring`. **This is the fix for the "0 points"
   default**: a story that installs no scoring says so honestly.
2. Otherwise read `getScore()`, `getMaxScore()`, `getRank()` from the ledger.
3. No ladder → `score_simple` / `score_display` as today. Ladder present → `score_with_rank`, or
   `perfect_score` at the ceiling.

Deleted from the action: every `world.getCapability(SCORING)` read, the `moves`/`achievements`
plumbing that only ever read `undefined`, and `computeRank` entirely (D4).

`moves` and `achievements` do not move to the ledger. Nothing on the platform produces either —
`moves` was always `0` and `achievements` always `[]` at the display. A story that wants them keeps
them in its own capability and overrides the message (§5.2 `override message scoring-*`).

**The progress messages go with them.** Today the action computes a `progressMessage` from the score
percentage — `early_game` / `mid_game` / `late_game` / `game_complete` (`scoring.ts:126-134`). These
are percentage-band prose by another name, the same pattern D4 removes for ranks, and a ladder
expresses the intent better and in the author's own words. They are deleted along with
`with_achievements` / `no_achievements`, which no reachable path emitted once `achievements` is gone.

The surviving message set is exactly five: `no_scoring`, `score_simple`, `score_display`,
`score_with_rank`, `perfect_score`. `scoring_not_enabled` — the legacy duplicate of `no_scoring`
(`lang-en-us/src/actions/scoring.ts:18`) — is deleted too; one way to say it is enough.

### D4 — Rank names are author content; stdlib emits no rank prose

`computeRank`'s five English literals are deleted with the function. Rank display text comes from
the author's `RankDefinition.name`, the same way entity names do — author-supplied strings, carried
as a template parameter, never invented by stdlib.

Deleted as dead: `rank_novice` … `rank_master` (`lang-en-us/src/actions/scoring.ts:27-31`) and the
whole `scoringSystemMessages` export (`:60-78`) — verified imported by no module in the repo.

**The ACL catalog is pruned to the five surviving messages** (D3). Of the eighteen `scoring-*`
aliases at `chord/src/message-alias-catalog.ts:556-573`, thirteen are deleted — the five
`scoring-rank-*`, the four progress aliases, both achievement aliases, `scoring-scoring-not-enabled`,
and nothing else. `scoring-no-scoring`, `scoring-score-simple`, `scoring-score-display`,
`scoring-score-with-rank`, and `scoring-perfect-score` survive. An alias for a deleted message would
be a live `override message` target that silently overrides nothing, which is worse than its absence:
`analysis.unknown-message-alias` tells the author the truth.

The matching entries in `story-loader/src/message-alias-map.ts:553-570` are pruned identically —
the two tables are parallel and drift between them is a live-alias/dead-target bug.

### D5 — `@sharpee/ext-scoring` is a new trusted extension, shaped exactly like combat

A new package under `packages/extensions/scoring/` exporting:

```ts
export function registerScoring(world: IWorldModel): void;   // no options — see below
```

It flips `isScoringEnabled()` and registers the rank-watcher plugin (D6). It contributes **no action,
no grammar, no messages** — matching `registerBasicCombat`, and matching what
`ExtensionRegistration` can actually carry.

**Enabling scoring and installing the ladder are separate steps, and must be.** An earlier draft had
`registerScoring(world, { ranks })`, which cannot work: `ExtensionRegistration.registerWorld` is
typed `(world: WorldModel) => void` (`extension-registry.ts:90`) and `EXTENSION_REGISTRY` is a
module-level `const` map, so a registry entry has no access to the story's IR and cannot close over
its ranks. The only way to force it would be for the loader to special-case the name `scoring` and
pass ranks in — precisely what this ADR's own acceptance criteria forbid.

So the ladder travels the generic path instead: the loader lowers `ir.ranks` through
`world.setRanks(...)` beside the `setMaxScore` call it already makes (`loader.ts:518`), with no
knowledge of which extension consumes it. `registerWorld` stays story-data-free, exactly like
combat's.

TypeScript stories call `registerScoring(world)` from `initializeWorld()` — as they call
`registerBasicCombat` — and then `world.setRanks([...])` with their own ladder. Chord stories reach
the same two steps through `use scoring` and a `ranks` block (ADR-261).

`ext-scoring` joins `ext-basic-combat` as a static import in the registry
(`extension-registry.ts:18`), so it links into every `story-loader` consumer regardless of whether a
story enables it — the same as combat, and unremarkable at this size.

### D6 — Rank promotions are announced by a TurnPlugin, registered through `registerPlugin`

`ext-scoring` registers a `TurnPlugin` that, in `onAfterAction`, compares the derived rank against
the last rank it announced and emits a promotion event when it has risen. Its `getState`/`setState`
carry only that last-announced rank id, so promotions survive save/restore without re-firing.

The event is **`if.event.rank_risen`**, past-tense per rule 10, with payload
`{ fromRank: string | null; toRank: string; score: number }` carrying rank *ids*, not display names
— a renderer resolves names through `getRanks()`. `fromRank` is `null` on the first rank the player
ever reaches.

This decision fixes the event's identity and shape only. What a promotion *says* is ADR-261 D7:
a per-rung authored phrase, with no platform sentence anywhere — so nothing in stdlib, lang-en-us,
or `ext-scoring` renders this event by default, and a story that names no phrase is silent by
design.

> **Amendment (2026-07-23, session 7f133e, from `adr-review` of ADR-261).** Rendering is a
> **story-side reaction registered by the loader**, not a platform renderer. `RankDefinition`
> (D2) deliberately carries no phrase key or message id: a phrase key is a Chord concept a
> TypeScript story cannot supply, and adding one would put story vocabulary in a language-neutral
> platform type. The Chord loader holds the IR, so it registers a reaction mapping
> `if.event.rank_risen`'s `toRank` id to the rung's phrase (ADR-261 D7). This is why the event
> payload carries rank **ids** rather than display names — the id is the join key between a
> platform event and story-owned text. A consumer that renders nothing is correct behavior, not a
> missing default.

**It registers through `ExtensionRegistration.registerPlugin`, and is that slot's first real user.**
The slot is declared at `extension-registry.ts:95` and — verified — occurs nowhere else in the
repository: no call site, no implementation, one line of contract with nothing behind it. This ADR
adds the missing call site.

**The call site is in `onEngineReady`, not beside the `registerWorld` loop.** A plugin registry
exists only once an engine does: the loader receives one at `onEngineReady` (`loader.ts:679`), which
`GameEngine` invokes from `setStory` (`game-engine.ts:515-516`). The `registerWorld` loop
(`loader.ts:369-376`) runs at world-build time, before any engine exists, so no plugin can be
registered there. The new call site iterates `ir.uses` inside `onEngineReady`:

```ts
for (const name of this.ir.uses ?? []) {
  EXTENSION_REGISTRY.get(name)?.registerPlugin?.(engine.getPluginRegistry());
}
```

This is generic — it names no extension — so it satisfies the no-special-casing rule in D5 and
Acceptance #6 while making the slot live.

**Why `state-machines` did not use the slot, correctly stated.** Two reasons, and the structural one
dominates: plugin registration is only possible at `onEngineReady` in the first place, and that
extension additionally must retain the plugin *instance* so every `define machine` block can be
lowered into its registry (`loader.ts:708-717`). Only the second reason fails to apply to scoring —
the rank-watcher needs nothing lowered into it after construction, since the ladder reaches the world
through `setRanks` (D2). So scoring is the clean case for the slot, but it lives in the same engine
hook every other loader-registered plugin does; it is not an earlier-phase alternative to that hook.

Rejected: registering the rank-watcher directly in `onEngineReady` the way NPC, scheduler, and
state-machine plugins are, which would work but would leave `registerPlugin` a declared-and-
unreachable seam with a third extension declining it; and deleting `registerPlugin` outright, which
forecloses the contract's third part on evidence that turns out to be about *timing* rather than
about the slot being wrong.

This is the one genuinely turn-shaped part of scoring, and the reason a plugin belongs here at all:
an *award* is not turn-shaped (it happens inside an action's execute/report, and plugins are
documented not to run for meta-commands or failed actions), but a *promotion* is.

Demotion is silent by default — a revoke that drops the player below a threshold changes
`getRank()`'s answer but emits nothing. Announcing demotions is a story concern.

### D7 — Migration is enumerated, not assumed

- **dungeo** keeps `registerCapability(StandardCapabilities.SCORING, { moves, deaths })`
  (`index.ts:233`) unchanged as private story bookkeeping, and keeps `setMaxScore(616)` / `(650)`
  and `getScore()` (`index.ts:599`, `melee-interceptor.ts:105`, `:210`). It **must** gain
  `registerScoring(world)` plus `world.setRanks([...])` in `initializeWorld()`. This migration is
  mandatory, not an enhancement: without the registration `isScoringEnabled()` is false, so SCORE
  emits `no_scoring` — *"This isn't that kind of game"* — in a 616-point game. Dungeo's canonical
  ladder is ADR-085's `dungeo.rank.*` table, whose thresholds are already absolute points and port
  verbatim.
- **Test infrastructure**: `packages/stdlib/tests/test-utils/index.ts:34` calls
  `registerStandardCapabilities`, so every stdlib action test currently gets a SCORING capability
  that D1 removes; `packages/stdlib/tests/unit/capabilities/capability-refactoring.test.ts:18,28`
  asserts the SCORING entry exists and has the old field shape and must be updated;
  `packages/engine/tests/integration/query-events.test.ts:32` also calls the helper. These are the
  concrete breakages of D1 and the reason the schema looked live.
- **`scoringSystemMessages`** and the `rank_*` messages are deleted (D4); no importer exists.
- **The 15 `.story` files that declare `score`/`award`** — `stories/fernhill/fernhill.story`,
  `stories/friendly-zoo/zoo.story`, 4 chord test fixtures, 9 doc fixtures — are unaffected by this
  ADR. Whether they need a `use scoring` line is ADR-261's gate question.
- **Tests**: `packages/stdlib/tests/unit/actions/meta-registry.test.ts` and
  `tests/integration/meta-commands.test.ts` reference `if.action.scoring`; both assert meta
  registration, not rank output, and should survive. New coverage per Acceptance.

## Acceptance

1. `grep -rn "ScoringCapabilitySchema\|computeRank\|scoringSystemMessages"` over `packages/` returns
   no hits outside deleted files.
2. A story with no scoring installed answers SCORE with `no_scoring` — asserted on the emitted
   message id, not the prose.
3. A story with a ladder installed answers SCORE with `score_with_rank` and the author's rank name
   as `{rank}`, asserted against a name that appears in no platform source (proving stdlib invented
   nothing).
4. `getRank()` is derived: award to cross a threshold, assert the rank rose; `revokeScore` back
   below it, assert the rank fell — with no explicit rank write between.
5. **Score survives a save round-trip and ranks come from registration, not the save**: award,
   `toJSON`, then load into a world whose ladder was installed by registration alone, and assert both
   the score and `getRank()` are correct. `ScoreLedgerData` is unchanged by this ADR — asserted by a
   test that loads a save written before it.
5a. **A maxScore change does not move a rank** (D2's invariant): install a ladder, award to a fixed
   score, read the rank, call `setMaxScore` with a larger ceiling, assert the rank is identical.
   Dungeo's 616 → 650 thief-death transition is the real-world case and is covered by #7.
5b. `clear()` empties entries and maxScore but leaves the ladder installed (D2).
5c. `setRanks` rejects duplicate thresholds and sorts unsorted input — asserted by giving it a
   descending ladder and reading `getRanks()` back ascending.
6. The promotion plugin fires once per threshold crossing: two awards inside one rank band emit one
   `if.event.rank_risen`, not two; and a save/restore between them does not re-fire. Its payload
   carries rank ids with `fromRank: null` on the first promotion. The plugin reaches the registry via
   `ExtensionRegistration.registerPlugin` — asserted by a test that loads a `use scoring` story and
   finds the plugin registered, with no loader-side special-casing of the `scoring` name (D5).
7. **REAL-PATH**: dungeo runs its walkthrough chain with `registerScoring` installed and its SCORE
   line renders a dungeo rank name — exercised through `dist/cli/sharpee.js`, not a stubbed world.
   The chain must cross the thief's death, with SCORE read before and after, proving the 616 → 650
   ceiling change leaves the rank untouched.

## Consequences

**Gained.** One home for scoring state instead of two. The language-layer violation is gone. The
`no_scoring` branch becomes reachable, so "this isn't that kind of game" is finally sayable. Rank
promotion announcements become possible for the first time. Ranks persist for free on the ledger.

**Lost.** Percentage-band ranks stop being automatic: a story that installs no ladder gets no rank
at all, where today it gets `Novice`/`Amateur`/`…` for free. That default was English-in-stdlib and
uncustomizable, but it *was* a default, and dungeo depends on it (D7). The four progress messages go
the same way (D3) — eight of the eighteen scoring messages the platform shipped are deleted rather
than replaced, on the grounds that all of them were percentage-band prose stdlib had no business
inventing. Any story relying on that free narration must now write a ladder.

**Constrained going forward.** Scoring state must not re-accrete onto a capability — the ledger is
the home. Rank prose is author content; no future stdlib message may name a rank. Any new scoring
depth (achievements, per-region scores, score events) belongs in `ext-scoring`, not stdlib.
`registerPlugin` becomes live contract rather than a reserved slot (D6), so a later extension may
use it without adding platform surface — and `state-machines` gains an obvious migration target,
though this ADR does not migrate it.

**Not addressed.** `moves` and `achievements` are dropped from the platform display with no
replacement; a story wanting them overrides the message. Demotion announcements are out of scope
(D6). Whether `ext-scoring` should eventually own an ACHIEVEMENTS verb is a separate question, and
would need the extension-contributes-a-verb capability that ADR-215's contract does not currently
have.

## Session

Session 7f133e (2026-07-23). Originated from the question "did we create the syntax for ranks and
what SCORE emits?" — which found the award half complete, the rank half absent, and the capability
half dead. Owner rulings during the session: breaking changes are not a concern; scoring should not
live in stdlib; scoring should be an extension rather than a bare plugin. The plugin-versus-extension
question was settled by reading `TurnPlugin` (cannot own a verb, does not run for meta-commands) and
`registerBasicCombat` (extensions layer behind stdlib verbs and contribute no grammar).
