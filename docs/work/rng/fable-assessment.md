# RNG Normalization — Fresh-Eyes Assessment (Fable 5)

**Date:** 2026-07-31
**Method:** Full-repo sweep of every randomness generation and consumption point in `packages/` and `stories/`, read from the code as-built. ADRs 290–292 deliberately not consulted. Code comments referencing older ADRs (227, 231, 264) are cited as code facts only.

**Goal being assessed against:** normalize RNG usage so that (1) deterministic testing is possible against Dungeo, and (2) an author can play-test in a way that reaches every point where randomization occurs, without combinatorial explosion.

---

## 1. What exists today

### 1.1 The core primitive

`packages/core/src/random/seeded-random.ts` defines `SeededRandom` (LCG, glibc constants) with `next / int / chance / pick / shuffle / getSeed / setSeed`. Properties that matter:

- **State = seed.** `getSeed()` returns the *current* internal state, and `setSeed()` overwrites it. This is what makes mid-stream persistence work (save the "seed", restore it, the stream resumes). It also means "seed" in the codebase means two different things — the initial seed an author would type, and the evolving stream state — and the API doesn't distinguish them.
- **Time-seeded by default.** `createSeededRandom()` with no argument seeds from `Date.now()`. Every call site that omits the seed is deterministic *within* a run but different *across* runs.
- **No stream derivation.** There is no way to fork a child stream from a parent seed. Every independent stream is constructed independently.
- **LCG quality is fine for IF** (we're picking exits, not doing crypto), but note `int()` is built on the full-period float, so it's acceptable; nothing uses raw modulo on low bits.

`packages/plugin-scheduler/src/seeded-random.ts` is just a re-export of core — not a duplicate implementation. Good.

### 1.2 The streams that exist (as-built)

There are **five independent RNG stream owners**, plus a deterministic non-RNG text-variation system:

| # | Owner | Created | Seedable from outside? | Persisted in save? | Consumers |
|---|-------|---------|------------------------|--------------------|-----------|
| 1 | `GameEngine.random` (master) | `game-engine.ts:306`, time-seeded | **No** — constructor/`EngineConfig` have no seed option | **No** — save-restore does not touch it | Deadly-room transformer (`game-engine.ts:349`), `TurnPluginContext.random` (`game-engine.ts:1150`) → plugin-npc → stdlib `npc-service` → Dungeo thief/troll/cyclops behaviors |
| 2 | `GameEngine.actionRandom` | `game-engine.ts:309`, time-seeded | **No** | **Yes** — `IEngineState.actionRngSeed` (`save-restore-service.ts:230,296-301`; restore fallback is `Date.now()`) | `ActionContext.random` via `createActionContext` → stdlib actions (throwing, attacking, inventory, inserting), story actions |
| 3 | `SchedulerService.random` | `scheduler-service.ts:84` | **Constructor accepts a seed** (`SchedulerPlugin(seed?)`) — but Dungeo constructs it bare: `new SchedulerPlugin()` (`orchestration/index.ts:114`) | **Yes** — `randomSeed` in scheduler plugin state (`scheduler-service.ts:357,363`) | Daemons/fuses via tick context (`forest-daemon.ts`), Dungeo grue death transformer (`command-transformers.ts:149`) |
| 4 | Chord `Evaluator.rng` | `evaluator.ts:103` | **Yes** — `StoryLoaderOptions.seed` (`loader.ts:164,267`) | **Yes** — advancing state stored in world state under `chord.rng` (`state-keys.ts:21`, `evaluator.ts:504-520`) | Chord `random`/`pick` expressions |
| 5 | **Module-level RNGs in combat code** (see §2.1) | at module load, time-seeded | **No** | **No** | Dungeo melee, basic-combat extension |
| — | lang-en-us assembler | n/a | n/a | text-state capability | `random`/`sticky` message variation is **not RNG** — deterministic `hash(salt + counter)` (`english-assembler.ts:20,552`), counters persisted via `TEXT_STATE` capability (ADR-196). This is the best-behaved "randomness" in the system. |

So the architecture *intends* seeded determinism — the interfaces (`ActionContext.random`, `TurnPluginContext.random`, behavior signatures like `WeaponBehavior.calculateDamage(weapon, rng)`, `AttackBehavior.attack(..., rng)`, `rollLethal(probability, rng)`, `DeadlyRoomBehavior.checkVerb(t, verb, rng?)`) all thread a `SeededRandom` explicitly, and several doc comments say "never `Math.random()`". The plumbing is real. What's missing is (a) a single seed authority behind the streams, (b) an injection surface, and (c) enforcement — several call sites defected.

---

## 2. The defects (ranked by damage to determinism)

### 2.1 Module-level time-seeded RNGs in combat — the worst offenders

These *look* seeded (they use `SeededRandom`) but are constructed at module load with no seed, are unreachable from outside, and are never persisted:

- `stories/dungeo/src/interceptors/melee-interceptor.ts:47` — `const meleeRandom: SeededRandom = createSeededRandom();` (player-side melee). The comment at line 43 explains *why*: "Creating a new SeededRandom per attack causes identical rolls when [attacks happen in the same millisecond]" — i.e., the module-level singleton is a workaround for the time-based default seed, not a design.
- `stories/dungeo/src/combat/melee-npc-attack.ts:45` — `const npcMeleeRandom = createSeededRandom();` and the resolver's injected parameter is named `_random` (line 109) — **the injected RNG is accepted and ignored**. The test file (`melee-npc-attack.test.ts:11`) documents this: "The resolver draws from a module-level time-seeded RNG (not the injected [one])". The interface for determinism exists and is bypassed at the one place Dungeo's combat actually rolls.
- `packages/extensions/basic-combat/src/basic-combat-interceptor.ts:23` and `basic-npc-resolver.ts:22` — same pattern in the platform extension (`combatRandom`, `npcCombatRandom`).

Consequences: combat is non-reproducible across runs regardless of any future seed flag; save/restore does not round-trip combat state; two engine instances in one process (test suites, zifmia) **share** these streams and perturb each other. This is exactly why the walkthrough guidance is "combat randomness is handled by having enough attack commands (6 is usually sufficient)" and why thief walkthroughs are flakey and get re-run.

### 2.2 Raw `Math.random()` in gameplay logic

Story-narrative outcomes drawn from the ambient global RNG:

| Site | What it decides |
|------|-----------------|
| `stories/dungeo/src/handlers/round-room-handler.ts:62` | Which exit the Round Room spins you to |
| `stories/dungeo/src/handlers/bat-handler.ts:75` | Which room the bat drops you in |
| `stories/dungeo/src/handlers/carousel-handler.ts:42` | Carousel Room destination (50/50) |
| `stories/dungeo/src/npcs/dungeon-master/dungeon-master-trivia.ts:115` | First trivia question (0–7) |
| `stories/cloak-of-darkness/src/index.ts:524` | Message-disturbance character corruption |
| `stories/armoured/src/combat/combat-utils.ts:83` | d20 roll |
| `stories/thealderman/src/randomization.ts:43` | Generic array pick |

The Dungeo four are the ones that matter for the stated goal. Notably these are all **event-handler / daemon-side** code, where the natural stream (`scheduler.getRandom()` or a handler context RNG) is either available or one wiring step away — the grue handler and forest daemon in the *same directory* already do it right.

### 2.3 Silent fallback constructions

`random ?? createSeededRandom()` appears wherever the RNG is optional:

- `packages/engine/src/action-context-factory.ts:82`
- `packages/stdlib/src/actions/enhanced-context.ts:60`
- `save-restore-service.ts:301` — restore of a save with no `actionRngSeed` re-seeds from `Date.now()`

These mean a missed wiring never fails loudly — it silently degrades to time-seeded. For a determinism guarantee, optional-RNG signatures are a liability; the parameter should be required (or the fallback should throw in test mode).

### 2.4 No seed injection surface at all

- `GameEngine` constructor options and `EngineConfig` (`engine/src/types.ts:226`) have **no seed field**; `this.random` and `this.actionRandom` are unconditionally time-seeded. There is a getter (`getActionRandom()`) but no setter for the master stream and no story/CLI path to either.
- **No `--seed` CLI flag** anywhere (`grep -- --seed` across packages/tools: zero hits).
- **Transcript-tester has no seed concept.** Its answer to randomness is behavioral: the navigator retries up to 50 times to absorb "random outcomes" (`navigator.ts:18`), and `[ENSURES:]` postconditions plus surplus attack commands paper over combat variance. The harness fights randomness instead of controlling it.
- The one externally seedable platform stream, `SchedulerPlugin(seed?)`, is not exercised: Dungeo passes nothing.
- Chord is the exception: `StoryLoaderOptions.seed` exists and its comment even states the intent ("A fixed seed makes repeated runs byte-identical").

### 2.5 Master stream not persisted

`GameEngine.random` (stream #1) is excluded from save/restore. After a restore, deadly-room rolls and all plugin/NPC randomness resume from a *different* stream than the save point. `actionRandom`, the scheduler, and Chord all persist; the master stream is the odd one out.

### 2.6 Stream-sharing / draw-order coupling

Even where seeding works, consumers share streams broadly:

- Stream #1 serves *both* the deadly-room transformer *and* every turn plugin (NPC movement, thief steal rolls, band-crossing...). Adding one NPC or one extra `chance()` call anywhere shifts every subsequent draw for every other consumer. A seeded golden transcript would be invalidated by any unrelated content change — technically deterministic, practically brittle.
- Stream #2 similarly serves all actions; an extra roll inside `throwing` shifts the next `attacking` roll.

This is the difference between "reproducible" and "*stably* reproducible under content evolution". For regression testing against Dungeo it matters: per-domain (or per-system) streams keep a change in the thief from invalidating the carousel's expected outcomes.

### 2.7 Nondeterministic noise outside gameplay

Not narrative-affecting, but worth a decision because it blocks *byte-identical artifact* comparison (event logs, saved transcripts with event dumps, debug output):

- **Event/entity ID generation** via `Date.now() + Math.random()` in ~15 places: `core/events/*` (`event-system.ts:77`, `game-events.ts:274`, `platform-events.ts:181`), `query-manager.ts:190`, `parser-en-us/english-parser.ts` (9 sites), `world-model` (`roomBehavior.ts`, `switchableBehavior.ts`, `WorldEventSystem.ts:281`, `WorldModel.ts:612`), `stdlib` (`command-validator.ts:1617`, `quit/restart-handler.ts`, `npc-service.ts:139`), `engine` (`turn-event-processor.ts:31`, `game-engine.ts:2170`, `action-context-factory.ts:108`), `plugin-scheduler/scheduler-service.ts:69`, `if-domain/grammar-engine.ts:164`, `event-processor/effect-processor.ts:245`, Dungeo `gdt-input-handler.ts:27`, `melee-npc-attack.ts:50`, and `character/tick-phases.ts:189` (`crypto.randomUUID`).
  - Recommended treatment: **don't** route these through the gameplay RNG (they'd pollute the streams — this is the classic mistake). Replace with a monotonic per-engine counter (`evt-<turn>-<n>`). That's more readable in debugging anyway, and free of both `Date.now` and `Math.random`.
- **`packages/media/src/audio/audio-registry.ts:206-212`** — sound-pool pick + volume/pitch jitter via `Math.random`. Presentation-layer, client-side; legitimately outside the determinism boundary, but should be *declared* outside it (and it runs in the browser client, so it never affects transcripts).
- `event-processor/observation-handlers.ts:27` is commented-out code; ignore.
- `stdlib/tests/test-utils` and `extensions/testing/annotations/store.ts` are test tooling; ignore.

---

## 3. What "normalized" needs to mean (requirements, derived from the code)

1. **One seed authority.** A single story-run seed (from CLI flag, transcript directive, engine option, or time if absent) from which every stream derives: `derive(masterSeed, streamName)` — e.g. `hash(masterSeed, 'combat')`. The five stream owners stop inventing their own seeds. `SeededRandom` needs one addition for this: construct-from-(seed, name) or a `fork(name)` — cheap to add to the LCG.
2. **Named streams per domain, not per object.** Suggested minimum set for Dungeo-scale content: `action`, `npc`, `combat`, `daemon`/`ambience`, `story` (handler rolls: round room, bat, carousel, trivia), `chord`. This bounds the draw-order coupling of §2.6: content changes only invalidate expectations within their own stream.
3. **All stream states ride the save.** One map `{ streamName → state }` in `IEngineState`, replacing the current patchwork (actionRngSeed yes, master no, scheduler separately, chord in world state). Restore fallbacks must not be `Date.now()` when a run-seed is set.
4. **No module-level RNG state, ever.** The four combat singletons (§2.1) move to injected streams; `melee-npc-attack` starts honoring its `_random` parameter. The "same-millisecond identical rolls" problem that motivated the singletons disappears once streams derive from the seed authority instead of the clock.
5. **No raw `Math.random` in packages/stories except declared-exempt presentation code** (media audio). Enforceable with a lint rule or a grep gate in `repokit verify` — given the no-CI preference, a local check.
6. **Required, not optional, RNG parameters** on the context factories (§2.3), so a wiring miss is a compile error, not silent nondeterminism.
7. **Injection surface:** `--seed <n>` on the CLI (play + test modes), a transcript directive (e.g. `[SEED: 12345]` header line), and `EngineConfig.seed`. Transcript-tester records the seed used (even when time-derived) in its output so any flakey run is replayable.
8. **ID generation decoupled** from both clock and RNG (counter scheme, §2.7) so two runs with the same seed produce byte-identical event streams.

With 1–8, `--seed 42 --chain wt-*.transcript` twice produces identical output, which is the determinism gate: run it against the existing Dungeo walkthrough chain as the acceptance test.

---

## 4. Author play-testing: hitting every randomization point

The second half of the request: an author should be able to reach every point where randomization occurs. Two distinct capabilities hide in that sentence, and separating them is what avoids the combinatorial explosion.

### 4.1 The choice-point registry (observability first)

Every *gameplay* draw goes through a named choice point — a thin layer over the stream API:

```
rng.chance('thief.steal', 0.33)          // instead of context.random.chance(0.33)
rng.pick('roundroom.exit', exits)
```

The name buys four things, cheap-to-build in this order:

1. **Trace** — a per-turn log of `(point, distribution, outcome)`. Immediately answers "what did the RNG decide this turn?" during play-testing. (The GDT debug verb family in Dungeo is a natural home for surfacing it.)
2. **Coverage report** — after a walkthrough run: which registered points fired, which never fired, which *outcomes* of each point were never seen. This is the author-facing "did my testing reach every randomization point" answer.
3. **Forcing** — an override table consulted before the stream: `force thief.steal=true`, `force roundroom.exit=north` (as a debug command, CLI flag, or transcript directive). Forced points don't draw, so the stream stays aligned for everything else.
4. **Enumeration metadata** — each point declares its outcome space (boolean, index-into-N, weighted table), which is what makes coverage *measurable* rather than observed-only.

Registration can be implicit (first use registers the name) so the authoring burden is near zero; Dungeo has on the order of **~25 gameplay choice points** total (thief ×8, troll ×2, cyclops ×1, combat tables ×~6, grue, deadly-room, round room, bat, carousel, trivia, forest ambience, stdlib throwing ×5, npc wander) — small enough that a registry is genuinely enumerable by a human.

### 4.2 Combinatorial explosion — and why it mostly isn't one

The explosion only exists if the goal is *path* coverage (every combination of every outcome across a run: the round room's 8 exits × the bat's ~30 rooms × every combat roll sequence × thief movement — effectively infinite). No one needs that. The minimization strategies, in order of leverage:

1. **Outcome coverage, not path coverage.** Target: each *outcome class* of each choice point observed at least once. That's `Σ outcomes-per-point` — for Dungeo roughly 60–80 cases, linear, not exponential. This is branch coverage, and it's the right default author-facing metric.
2. **Collapse numeric ranges into semantic classes.** A damage roll `int(1,6)` is not 6 outcomes; it's the classes the code branches on (miss / hit / kill / critical). The choice-point declaration names the classes; coverage counts classes. This is the single biggest de-explosion step for combat.
3. **Forcing makes cases independent.** To test "bat drops you in the coal mine," the author forces that one point and plays; every other point stays on the seeded stream. One pinned variable per test, so N cases cost N short sessions (or N transcript files), never N×M.
4. **Exploit stream independence.** Points on different streams can't interact through the RNG, so there is no reason to test their combinations — the only combinations worth enumerating are within a deliberately identified interaction cluster (e.g., one full combat exchange vs. one NPC). Pairwise/all-pairs generation is available as a tool if a cluster is genuinely suspected, but for Dungeo I don't see a cluster that needs it.
5. **Seed search as a fallback for un-forceable paths.** If some outcome is awkward to force (deep in a sequence), a driver can iterate seeds until the trace shows the target outcome, then record that seed in the transcript header. `melee-npc-attack.test.ts` already does exactly this by hand (`createSeededRandom(i)` in a loop) — it generalizes.
6. **Transcripts gain determinism directives instead of retry loops.** `[SEED: n]` plus optional `[FORCE: point=outcome @ turn]` replaces "6 attack commands is usually enough" and the navigator's 50-attempt retry — walkthroughs become exact, and the flakey-thief re-run policy becomes obsolete.

The honest residual: forced outcomes bypass the stream, so a forced run is not a pure seeded replay (it's a *conditioned* one). For regression baselines, prefer recorded seeds (strategy 5); use forcing for authorial exploration. Both belong in the tool; they answer different questions.

### 4.3 What stays random-feeling for players

Nothing in this design changes shipped-game behavior: with no seed given, the master seed comes from the clock exactly once, at the top, and play is as varied as today — but every session *could* be replayed if the engine logs its seed, which is also the bug-report story ("seed 173442 + this command list reproduces it").

---

## 5. Suggested normalization order (test-against-Dungeo at every step)

Each phase is independently landable and verifiable with the existing walkthrough chain.

- **Phase 0 — stop the bleeding (platform + story, small):** delete the four module-level combat RNGs; make `melee-npc-attack` use its injected parameter; thread scheduler/action streams into melee-interceptor and basic-combat. Verify: walkthrough chain still passes (it already tolerates variance).
- **Phase 1 — story handler cleanup (story-only, autonomous per project rules):** round room, bat, carousel, trivia → `scheduler.getRandom()` (same as grue). Cloak/armoured/thealderman likewise when touched.
- **Phase 2 — seed authority + injection (platform, needs discussion):** `EngineConfig.seed`, derived named streams replacing the five independent owners, unified stream-state persistence, CLI `--seed`, transcript `[SEED:]` directive, seed echoed in test output. Acceptance: same-seed chain run twice → byte-identical transcripts (requires the ID-counter change from §2.7, which can land here).
- **Phase 3 — choice-point layer (platform + story):** named draws, trace, coverage report, forcing. Acceptance: coverage report over the full walkthrough chain enumerates every Dungeo choice point; a forced-outcome transcript exercises a never-covered outcome.
- **Phase 4 — retire the workarounds:** navigator retry loop shrinks, surplus attack commands come out of walkthroughs, "run flakey walkthroughs twice" policy ends.

Phase 2 is the one requiring real platform design discussion (stream naming, derivation function, save format for stream states — note the standing preference for a versioned save reader rather than a hard break).

---

## 6. Open questions for David

1. **Stream granularity:** per-domain streams as in §3.2, or finer (per-NPC)? Per-NPC maximizes golden-transcript stability but multiplies save-state entries; per-domain is my recommendation for now.
2. **Byte-identical transcripts as the acceptance bar** (forces the ID-generation change), or is turn-outcome equivalence enough for phase 2?
3. **Forcing surface:** debug verbs in-game (GDT-style), transcript directives, CLI flags — all three, or a subset first?
4. **Does the choice-point registry belong in core/engine or stdlib?** It wraps `SeededRandom` and wants engine save/trace integration, which argues engine; but the vocabulary of points is stdlib/story.
5. **Chord:** fold `chord.rng` into the unified stream map, or leave it (it's already correct and persisted) and only align its seed derivation?
