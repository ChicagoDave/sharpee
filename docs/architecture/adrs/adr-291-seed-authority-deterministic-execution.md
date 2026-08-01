# ADR-291: One seed authority, many named streams — deterministic execution as a testable property

## Status: SUPERSEDED IN PLACE by [ADR-293](adr-293-choice-points-per-point-streams.md) (2026-08-01, session 9f136f) — **do not implement.** Nothing here was built. ADR-293 carries forward, in substance: one master seed governing a run (D1), the frozen versioned derivation (D2), stream state riding the save behind a version reader (D4), `--seed` / `[SEED: N]` / always-report-the-seed and the author-visible/player-silent rule (D8–D10), and randomness outside the sanctioned path as a build-visible defect (D6). What it replaces: per-domain named streams, which become per-point streams, and the `SeedAuthority` interface shape. The four amendments below are retained as the record of how this document failed to converge — four review passes oscillating between 12/16 and 14/16 — which is the history ADR-293 was written to end.

## Historical status: ACCEPTED (2026-07-31, session b3834b) — drafted from the working tree, interviewed (all six open questions resolved), then `adr-review`ed twice: 9/16 with two BLOCKER and four SMALL findings folded, then 16/16. Accepted by David on the clean review. **Re-cut to Effort A by Amendment A3** (2026-07-31, session 9f136f). **Platform change**: `packages/core`, `packages/engine`, `packages/stdlib`, `packages/media`, `packages/world-model` (the `ActionInterceptor` hook signatures — added by A1, re-purposed by A2, relocated by A3), `packages/extensions/basic-combat`, `packages/transcript-tester`. **Story change** (added by A1): `stories/dungeo`, `stories/armoured`, `stories/thealderman`, `stories/cloak-of-darkness`. See Implementation touchpoints.

## Scope: Effort A — reproducible execution

**This ADR delivers reproducible execution. It does not deliver byte-identical
artifacts.** The boundary was ratified by Amendment A3 and is the ADR's most important
sentence, because every review pass before A3 spent its findings on work that lives on
the far side of it.

| | In scope (Effort A) | Out of scope (Effort B) |
| --- | --- | --- |
| **Property** | the same seed and command sequence reproduce the same *run* | two runs at one seed produce byte-identical *save files* |
| **Randomness** | all of it — the authority, named streams, the singletons, the gameplay draws, the `Math.random()` ban | — |
| **The clock** | **no clock-derived value reaches rendered output** — plus seed entry (`--vary`), which is not execution | every remaining clock read: ~49 clock-only ids, the clock half of 32 more, 184 event timestamps, the save's own metadata stamp |
| **Acceptance** | 1–6 and 8–13 | **7 only** |

**The clock row is a real Effort A obligation, not a formality** (A4). Acceptance 8
forbids a `Date.now()`-derived token in rendered output and Acceptance 1 proves it by
diffing two runs. Before the re-cut, ids lost their clocks outright, so this was true
by construction and cost nothing to claim. It is no longer: ids keep their clocks
through Effort A, and the Context section says in as many words that whether an id or
timestamp reaches rendered text is *"**not established**; it is assumed not to, which
is not the same thing."*

So Effort A carries a narrow version of the clock problem — **rendered output only**,
not saves — and it is the one place where Effort A can fail for a reason whose fix
lives in Effort B. **Establish it first, not last**: run Acceptance 1 over the corpus
as an early spike, before the D5/D6 work, so a clock-bearing id reaching rendered text
is found while the scope line can still be renegotiated. Discovering it at the end of
Effort A is the failure mode this note exists to prevent.

Effort B is **deferred, not rejected**, and nothing in ADR-292 needs it (ADR-292
Consequences). It is not scheduled here and must not be re-litigated inside this ADR;
if it is taken up, it is its own ADR with its own corpus.

**Amendment A2** (2026-07-31, session 9f136f) folded the two BLOCKERs A1's second review
left open: B3 (story stream access) and B4 (id determinism). **Amendment A3** (same
session) re-cut the ADR to the scope above after a three-ADR review found the split
already decided in ADR-292, and moved naming *resolution* to ADR-292, which owns it.

**Amended 2026-07-31, session 8a8dd0**, before implementation began, after re-verifying
the Context claims against the tree and re-reviewing the result. Six findings, four of
them material: D5 named the wrong singletons for the dungeo flake; the D6 gate's scope
excluded the very corpus Acceptance 1 and 2 run over; D2a's story-access clause covered
four different shapes and described none; and D5's dungeo half turned out to depend on a
world-model interface change no section listed. See **Amendment A1** at the foot of this
document for the full record of what changed and why.

## Date: 2026-07-31

## Parent: ADR-231 (D6 ruled the dedicated action stream and rejected stream-sharing — this ADR preserves that ruling and generalizes it), ADR-227 (AC-2, the precedent for persisting a stream's seed across save/restore), ADR-224 (the deadly-room probabilistic hazard, one of the streams), ADR-290 (the test-creation redesign this unblocks — a blessed expected-response is meaningless without reproducible execution), ADR-277/ADR-282 (the capture format whose `[OK: any]` default exists to dodge the problem this ADR closes).

## Context — verified, not assumed

Every claim below was read out of the working tree on 2026-07-31, not taken
from ADR text. Line numbers are as of this session.

**The mechanism already exists and is good.** `packages/core/src/random/seeded-random.ts`
defines `SeededRandom` — `next/int/chance/pick/shuffle` plus `getSeed()`/`setSeed()` —
over an LCG with glibc constants. `packages/plugin-scheduler/src/seeded-random.ts`
is a re-export of it, not a second implementation. The "never `Math.random()`"
discipline is already written into headers in stdlib
(`actions/enhanced-types.ts:142`, `death/probabilistic-death.ts:8`), world-model
(`traits/deadly-room/deadlyRoomTrait.ts:40`), plugins
(`turn-plugin-context.ts:35`), lang-en-us (`assembler/english-assembler.ts:20`),
and engine (`action-context-factory.ts:134`). The interface is threaded into the
action context, the NPC context, the plugin turn context, weapon behavior,
deadly-room behavior, probabilistic death, and the scheduler.

**What is missing is an owner.** There are ten construction sites and no
authority over them (the count was recorded as seven before Amendment A1; the two
dungeo sites were missed, and the original count did not match its own table):

| Site | Seeded by caller? | Reachable to seed? |
| --- | --- | --- |
| `plugin-scheduler/src/scheduler-service.ts:84` | yes — `createSeededRandom(seed)` | yes |
| `story-loader/src/evaluator.ts:103` | yes — `createSeededRandom(seed)` | yes |
| `engine/src/game-engine.ts:306` (`this.random`) | **no** | instance |
| `engine/src/game-engine.ts:309` (`this.actionRandom`) | **no** | instance |
| `engine/src/action-context-factory.ts:82` (fallback) | **no** | transient |
| `stdlib/src/actions/enhanced-context.ts:60` (fallback) | **no** | transient |
| `extensions/basic-combat/src/basic-combat-interceptor.ts:23` | **no** | **module scope** |
| `extensions/basic-combat/src/basic-npc-resolver.ts:22` | **no** | **module scope** |
| `stories/dungeo/src/interceptors/melee-interceptor.ts:47` | **no** | **module scope** |
| `stories/dungeo/src/combat/melee-npc-attack.ts:45` | **no** | **module scope** |

An unseeded `createSeededRandom()` falls through to `currentSeed = seed ?? Date.now()`.
So the engine's two streams are time-seeded on every construction, and **nothing
in the system can set them** — not an engine option, not `StoryConfig`
(`packages/engine/src/story.ts:16`, which has no randomness surface at all), not
a CLI flag. `packages/transcript-tester/src` contains zero occurrences of the
string "seed".

**The four module-scope singletons are the worst case, and two of them are the
flake.** Each is constructed at *import* time, seeded from `Date.now()`, and
exposes no instance to reach:

| Singleton | Package | Drives |
| --- | --- | --- |
| `combatRandom` (`basic-combat-interceptor.ts:23`) | `extensions/basic-combat` | PC→NPC combat for stories that load the extension |
| `npcCombatRandom` (`basic-npc-resolver.ts:22`) | `extensions/basic-combat` | NPC→NPC combat, same |
| `meleeRandom` (`melee-interceptor.ts:47`) | `stories/dungeo` | PC→NPC melee — **the dungeo thief and troll** |
| `npcMeleeRandom` (`melee-npc-attack.ts:45`) | `stories/dungeo` | NPC→NPC melee, same |

**The dungeo pair, not the `basic-combat` pair, is what the walkthrough chain
exercises** (corrected by Amendment A1; the original draft attributed the flake to
`basic-combat`). Verified 2026-07-31: `stories/dungeo` contains no reference to
`basic-combat` in source or `package.json` — it reaches the extension through
neither `story-loader`'s `extension-registry.ts` nor a direct import. Dungeo ships
its own combat entirely. `basic-combat` is real and its singletons are equally
unreachable, but a change confined to it would leave the dungeo chain exactly as
nondeterministic as it is today, and Acceptance 2 would still fail.

Both dungeo singletons carry a header comment stating they exist *specifically* to
avoid identical rolls when several attacks resolve inside one `Date.now()`
millisecond — a workaround that documents the absence of a seed authority in as
many words, and that a per-stream authority makes unnecessary.

The walkthrough chain's observed behavior is consistent with exactly this: a total
test count that swings 892 → 982 → 11533 between runs of an identical bundle is a
retry loop whose branch count varies per run, not a fixed suite. That flake has
been re-run and re-attributed across several sessions; it has a named cause here.

**Persistence is asymmetric.** `save-restore-service.ts:230` persists exactly one
stream — `actionRngSeed: provider.getActionRandom().getSeed()` — and `:299`
restores it, falling back to `setSeed(Date.now())` at `:301` when the field is
absent. `this.random` is not persisted at all. That stream is not idle: it feeds
the deadly-room transformer (`game-engine.ts:349`) and the NPC context
(`game-engine.ts:1150`, `random: this.random`). So a restored save continues
action rolls exactly and silently re-randomizes NPC behavior and hazard rolls.

**Randomness also leaks outside the seam.** Counted 2026-07-31 over `src`
directories only, excluding tests, `dist`, and commented-out code (Amendment A1
replaces the draft's "~35 sites"; the true shape is 35 in platform source *plus* a
story-level population the draft did not count at all):

| Where | Live `Math.random()` | Kind |
| --- | --- | --- |
| `packages/**/src`, excluding the audio registry | 32 | event/entity id generation |
| `packages/media/src/audio/audio-registry.ts` | 3 | gameplay — pool pick (`:206`), volume jitter (`:211`), pitch jitter (`:212`) |
| `stories/**/src` | 2 | id generation (dungeo) |
| `stories/**/src` | 7 | **gameplay** — see below |

(35 in `packages/**/src` and 9 in `stories/**/src`; the first two rows partition the
platform total rather than nesting, which the draft of this table left ambiguous.)

The id population's largest single cluster is
`parser-en-us/src/english-parser.ts` at 9 sites; `world-model`'s
`roomBehavior.ts` and `switchableBehavior.ts` carry 3 each as
`` `${Date.now()}-${Math.random()}` ``; and `core/src/events/event-system.ts:77`
mixes a counter with `Math.floor(Math.random() * 1000)`.

**Stories roll gameplay dice outside the seam** (found by Amendment A1). These are
not ids — they decide what happens:

| Site | Decides |
| --- | --- |
| `stories/dungeo/src/handlers/bat-handler.ts:75` | which room the bat drops you in |
| `stories/dungeo/src/handlers/carousel-handler.ts:42` | machine room vs. tea room |
| `stories/dungeo/src/handlers/round-room-handler.ts:62` | which exit the round room takes |
| `stories/dungeo/src/npcs/dungeon-master/dungeon-master-trivia.ts:115` | which trivia question opens |
| `stories/armoured/src/combat/combat-utils.ts:83` | a d20 combat roll |
| `stories/thealderman/src/randomization.ts:43` | a generic array pick |
| `stories/cloak-of-darkness/src/index.ts:524` | which characters of the scuffed message survive |

This matters because **the acceptance corpus is dungeo**. Acceptance 1 (byte-identical
output across two processes at one seed) and Acceptance 2 (a stable chain at a pinned
seed) are both evaluated against a story that flips four gameplay coins per run outside
any stream. Retiring every construction site in `packages/` would leave both criteria
failing, for reasons entirely inside `stories/`. D6's scope is amended accordingly.

Whether any id or timestamp reaches rendered text is **not established**; it is
assumed not to, which is not the same thing.

**The downstream cost is already being paid.** ADR-277 D5's capture default is
`[OK: any]` — presence-only — and its header says why in as many words: it
"replays green despite RNG-varied story text." The strongest assertion the IDE
can offer today is weakened by default because execution is not reproducible.
ADR-290's blessed-expected-response model cannot be built on that.

## Decisions

### D1. The engine owns one root seed, and one number reproduces a session

A single root seed is settable **from the CLI and the IDE only**. Live play
defaults to a time-based seed; nothing else does. Given the same root seed and
the same command sequence, a story produces the same rendered output.

This is the decision the rest serve. It is what makes execution an assertable
property rather than a hope.

**`StoryConfig` gains no seed field** (ruled by David, 2026-07-31). ADR-231 D6
closes with "Routing only — story-level RNG policy is untouched (never
seed/disable story randomness)", and an authored seed would make a published game
play identically for every player — precisely what D6 declined. Seed is a
runner/IDE concern. A puzzle-box story that genuinely wants authored determinism
is a real case, but it is an amendment to D6 and must be made as one, not
introduced as a config field in a testing ADR.

### D2. Randomness is acquired from a seed authority; direct construction is retired

Consumers stop calling `createSeededRandom()`. They ask the authority for a
**named stream** — `actions`, `scheduler`, `combat`, `npc`, `chord`,
`deadly-room` — and the authority derives that stream's seed from the pair
`(rootSeed, name)`.

`createSeededRandom` remains the underlying generator. What is withdrawn is the
right of arbitrary code to mint an unowned, unreachable, time-seeded instance.

**The derivation is a hash mix, frozen and versioned** (ruled by David,
2026-07-31). The stream name is hashed (FNV-1a) and mixed into the root seed;
ordinal or additive derivation is rejected outright, because core's LCG
(`currentSeed = (a * currentSeed + c) % 2^31`) produces visibly correlated
sequences from nearby seeds — `rootSeed + 1`, `rootSeed + 2` would couple the
very streams D3 exists to keep independent.

The function is a **compatibility surface, not an implementation detail**: it
carries a `SEED_DERIVATION_VERSION` constant and is pinned by a test holding
hardcoded expected seeds. Changing it requires a version bump and a reader — the
same discipline D4 applies to the save format. Without the version constant the
only options on a bad mix would be a silent break or living with it; with it, a
transcript still pins one number rather than N.

**Registration is open, and names are namespaced** (ruled by David, 2026-07-31).
Platform, extensions, and stories may all register streams. Extension and story
streams carry a namespace prefix drawn from the package or story id
(`ext:basic-combat/combat`), so two extensions cannot collide on a bare name like
`combat`.

A closed, platform-owned set was rejected: `basic-combat` is an extension and D5
already requires it to own streams on day one, so closing the set would force
extensions to share one — reinstating precisely the coupling D3 and ADR-231 D6
exist to prevent, where installing `hunger` shifts every combat roll.

Opening this to stories does not contradict D1. **Registering a stream is not
seeding one**: the root seed still governs it, so a story gains isolation for its
own puzzle randomness without gaining authored determinism, and ADR-231 D6's
"never seed/disable story randomness" stands.

Adding a stream is free by D3. **Renaming one is a save-format change**, since
D4 persists streams by name; D4's reader already covers the case by reseeding
unknown or missing streams from the root.

### D2a. Where the authority lives, what it exposes, and what it refuses

**The interface lives in `@sharpee/core`, beside `SeededRandom`. The instance is
owned by the engine.**

This split is forced by an existing boundary, not chosen for taste. ADR-231 D6
kept `WeaponBehavior.calculateDamage` on parameter injection precisely because
"world-model stays engine-free", and deadly-room is the same precedent. A rule
that told every consumer to "ask the authority" would instruct world-model to
import the engine. So:

- **Ask the authority directly**: engine, stdlib, extensions, story-loader, and
  story *setup* code — anything holding an engine reference at wiring time.
- **Receive a stream as a parameter**: world-model behaviors, unchanged from
  ADR-231 D6's precedent. The caller resolves the stream and passes it in.

`packages/core` gains the interface only — no instance, no registry state — so
nothing about the dependency direction changes.

**How story code reaches a stream** (added by Amendment A1, finding B2). "Stories
ask the authority" was one clause covering four materially different situations.
Surveyed in the tree 2026-07-31, dungeo's randomness arrives four ways, and three of
them already have a route:

| Shape | Example | Contract |
| --- | --- | --- |
| Already receives a `SeededRandom` parameter and discards it | `melee-npc-attack.ts:110` takes `_random`, then overrides it with the module singleton at `:116` | **Use the parameter.** The seam exists; the code opted out of it |
| Runs inside a scheduler daemon or fuse | `bat-handler.ts`, `carousel-handler.ts`, `round-room-handler.ts` — `SchedulerContext` already carries `random: SeededRandom` (`plugin-scheduler/src/types.ts:25`) | **Use `context.random`.** The scheduler's stream is authority-minted under D2 |
| Runs inside an action interceptor | `melee-interceptor.ts:348`, in `postExecute` | **Receive it as a parameter**, with the name derived by the registrar from the binding's `(traitType, actionId)` — requires the world-model hook change in B1 |
| A pure helper with no context at all | `dungeon-master-trivia.ts:115`, `startTrivia(state)` | **Take a `SeededRandom` parameter**; the caller, which does have a context, supplies it |

The rule underneath all four (**restated by A2, scoped by A3**): **story code never
names a stream.** It receives one, or reads one off a context it was already given.

A1 wrote this rule with a carve-out — "only story *setup* may acquire a stream by
name, and only to hand it downward." **A2 withdrew the carve-out**, because it was
expressible in TypeScript and inexpressible in Chord, whose entire randomness surface
is `one chance in <n>` (`chord/src/parser.ts:4511`), the `randomly` phrase and
`select` strategies (`parser.ts:121`), and `move-chance` on the wanderer trait
(`stdlib-manifest.ts:121`). None of the three names an entropy source, and Chord has
no setup block, lifecycle hook, or factory at all. A rule only a TypeScript story
could obey would have been one contract on paper and two in practice.

**The runtime rule is stated here; the authoring surface belongs to ADR-292** (A3,
narrowed by A4). Two different things were being conflated, and A3's first pass handed
both away, which left this ADR unable to implement Effort A without a DRAFT one:

- **Runtime resolution — this ADR, self-contained.** Every stream name reaching the
  authority is fully qualified. Whoever hands a stream to story code resolves the name
  first, and D2a's unnamespaced-name refusal fires on that **resolved** name. Effort A
  needs nothing beyond this: dungeo is TypeScript, and its two D5 sites are reached by
  the two mechanisms below.
- **Authoring surface — ADR-292 D11.** How an author *writes* a name, and how a
  compiler turns `melee` into `story:dungeo/melee` from the declared `id:`, is ADR-292's
  decision. It also states there that this ADR's refusal "must fire on the resolved
  name, never on what the author typed" — consistent with the rule above, which is why
  no amendment to this ADR is needed when ADR-292 lands.

A2 derived a *second* resolution mechanism from registration identity; A3 withdrew it
as duplicating ADR-292. What survives is the division above: the runtime invariant is
this ADR's, the surface that produces names is ADR-292's, and Effort A depends on the
first only.

The two mechanisms Effort A actually uses:

- **the stream is resolved by the hook's invoker**, never by the registry. The
  interceptor registry is a private `Map` on `WorldModel`
  (`world/WorldModel.ts:553`, written at `:782`) — world-model, not engine, despite
  ADR-208's "engine-owned per world", which governs lifetime rather than location.
  World-model cannot ask the authority (D2a's own rule), so the component that
  *dispatches* the hook — stdlib or engine, both permitted — resolves the stream from
  the binding identity it already holds and passes it in. `WorldModel` stores
  bindings and knows nothing about streams.

Extensions are platform-side TypeScript with no authoring surface, and keep direct
acquisition under `ext:<pkg>/` (D2). Stories do not need it.

This keeps a story on the same footing as world-model without needing D2a's
engine-free rule to extend to it: nothing in a story's path acquires randomness,
so nothing in it can mint an unowned stream, which is what D2 withdraws.

**Interface shape** (the contract, not the implementation):

```ts
interface SeedAuthority {
  /** Register and acquire a named stream. Idempotent per name. */
  stream(name: string): SeededRandom;
  /** The session's root seed — what D10 displays and D8 pins. */
  rootSeed(): number;
  /** Name → current seed, for D4's save map. */
  snapshot(): Record<string, number>;
  /** Reseed registered streams from a save; unknown names are reseeded from root. */
  restore(snapshot: Record<string, number>): void;
}
```

**Refusals** — each is a named failure, never a silent fallback:

| Condition | Behavior |
| --- | --- |
| root seed not an integer, or outside `[0, 2^31)` | reject at entry (CLI, IDE, or `[SEED:]`) naming the value and the valid range |
| `stream(name)` called twice with the same name | returns the **same** stream; registration is idempotent, so two consumers of one name share draws deliberately rather than by accident |
| `stream(name)` with an empty or unnamespaced extension/story name | reject naming the required `ext:<pkg>/` or `story:<id>/` prefix |
| `restore()` given a name never registered | reseed from root and continue — a save may predate a stream (D4) |
| `restore()` missing a name that *is* registered | reseed that stream from root; this is D4's forward-read path |

The LCG's modulus is `2^31`, so a seed outside that range is not merely unusual —
it aliases onto another seed and would make two different `--seed` values
silently identical.

### D3. Named streams stay independent — ADR-231 D6 preserved, not overturned

Deriving each stream from `(rootSeed, name)` means adding a new stream never
shifts an existing stream's sequence.

D6 rejected sharing one stream because "interleaved draws would let any new
plugin shift every subsequent action roll." That reasoning is correct and gets
*stronger* under ADR-290: with blessed expected text, a shared stream would mean
adding one NPC behavior that draws once invalidates every blessed transcript in
the suite through a change that touched none of them. D3 keeps D6's isolation
and makes it structural rather than a per-subsystem convention.

### D4. Every registered stream is persisted and restored, symmetrically

The save format carries a map of stream name → seed, replacing the single
`actionRngSeed` field. Restore reseeds every registered stream, so a restored
save continues *all* rolls where they left off rather than only the action
stream.

**This is a save-format change and it ships with a version reader**, not a hard
break: a save written before this ADR carries `actionRngSeed` alone, and the
reader maps it onto the `actions` stream and reseeds the rest from the root
seed. The standing preference after the v3→v4 hard break is that save-format
changes add a reader rather than another break-and-delete.

### D5. Module-scope RNG singletons are retired — all four, extensions and stories alike

**Amended by A1**: the draft named only `basic-combat`'s pair. There are four.

`basic-combat`'s `combatRandom` and `npcCombatRandom` become streams acquired
from the authority when the extension registers, under D2's `ext:basic-combat/`
namespace.

`stories/dungeo`'s `meleeRandom` (`melee-interceptor.ts:47`) and `npcMeleeRandom`
(`melee-npc-attack.ts:45`) become streams **supplied to** those sites under D2's
`story:dungeo/` namespace — the name derived by the platform from the registration
identity rather than written by the story (Amendment A2 corrects the draft's
"acquired"). D2 already opened registration to stories and already gave them a
prefix, so this needs no new mechanism — only the recognition that dungeo is where
the flake actually lives.

Both pairs are non-negotiable for Acceptance 2, and the *dungeo* pair is the one
that criterion actually measures. Retiring the extension's pair alone would produce
a change that is correct, ships green on its own tests, and moves the chain flake
not at all.

A story *using* a stream is not a story seeding one — the root seed still governs
it (D2), so ADR-231 D6's "never seed/disable story randomness" is untouched. What
dungeo gains is reachability: an authority that can reseed the melee stream on
restore, and a `--seed` that reaches it.

No module-scope randomness survives anywhere in the tree — `packages/` or
`stories/`.

### D6. Randomness outside the authority is a build-visible defect

The audio registry's source pick and its volume and pitch jitter move onto the
authority as an **`audio` named stream** (ruled by David, 2026-07-31).

This is not a presentation-layer concession — the code settles it.
`AudioRegistry.resolvePool` (`audio-registry.ts:205-215`) does not jitter at
playback; it bakes the random values into an event payload:
`createTypedEvent('audio.sfx', { src, volume, rate, duck })`. Audio rides
channels, so those numbers enter the event source, serialize into saves, and are
assertable content anywhere the IDE observes channel packets. They are three
`Math.random()` calls deciding gameplay-visible values, so the gate takes them on
its own terms (Acceptance 6) and Acceptance 1 would catch any that reached rendered
output. They would *also* have blocked byte-identical saves, which is how the draft
argued it — but that is Acceptance 7, now Effort B (A3), and the audio stream does
not depend on it. (The draft cited "Acceptance 6a", which does not exist; the
criteria are 1–13 with no sub-items. Corrected by Amendment A1.)

Determinism here does not flatten anything: a stream's successive draws still
differ, so footsteps still vary shot to shot. The same *seed* simply replays the
same sequence of variations.

A gate fails the build when `Math.random()` appears in gated source. **The
allowlist is empty** (ruled by David, 2026-07-31): event-id generation becomes
deterministic rather than carve-out territory.

**Gate scope, stated once so a linter's default does not decide it** (Amendment
A1, resolving the first "Deferred, not decided" item and extending it to stories):

**Exclusions win over inclusions** — the rows below overlap, and the precedence is
stated here rather than left to the linter (Amendment A1, finding S3). It is not
hypothetical: dungeo keeps test files *inside* `src/`
(`src/combat/melee-npc-attack.test.ts`, `src/handlers/grue-handler.test.ts`), so a
path can match a gated root and an excluded pattern at once.

| Path | Gated? | Why |
| --- | --- | --- |
| `packages/**/src` | **yes** | platform source; the original scope |
| `stories/**/src` | **yes** | the acceptance corpus lives here (see Context) |
| `**/*.test.ts`, `**/tests/**` — **anywhere, including inside a gated `src`** | no | a test may construct a generator directly; that is what pins a seed |
| `tools/**` | no | author tooling, not execution — `vscode-ext/src/new-story-wizard.ts` generates a scaffold id at authoring time, never during play |
| `**/dist`, `**/dist-esm`, `node_modules` | no | build output |

Two clarifications the scope needs:

- **The gate bans `Math.random()`, not `Date.now()`.** `--vary` (D9) reads the
  clock to *choose* a root seed, which is seed entry, not randomness during
  execution. `packages/transcript-tester` is gated like any other platform package
  and stays compliant, because choosing a seed from the clock uses no
  `Math.random()` call. The draft deferred this question on the assumption the two
  were entangled; they are not.
- **`Date.now()` in an id is Effort B, and leaves this ADR** (A3). A2 restated the id
  rule as a containment invariant — *an event id holds a static prefix and a
  per-session monotonic counter and nothing else* — which is the right formulation and
  now belongs to Effort B, whose Acceptance 7 is the only criterion that needs it.
  **The gate takes the random half; the clock half goes with AC-7.** Splitting the rule
  this way is what lets the gate switch on inside Effort A: the 32 `Math.random()` id
  sites lose their random half here, keeping their clock, which is invisible to
  Acceptance 1 (rendered output) and visible only to Acceptance 7 (save bytes).

An in-repo story is gated but a *published* story is not: the gate is a build step
in this repository, and D1 leaves authors free to write whatever randomness they
like. Nothing here reaches an author's own project.

The sites building ids as `` `evt_${Date.now()}_${Math.random()...}` `` — including
`core/src/events/event-system.ts:77`, which already mixes a counter with a random —
**lose their `Math.random()` call here**, which is what the gate requires. That form is
**30 in `packages/**/src` and 2 in `stories/dungeo`, 32 in total.** (A2 corrects A1.3,
which read the tree-wide 32 as a platform-only figure and then added the 2 dungeo sites
on top of it. A1.3 had already replaced the draft's "~35", which counted the 3 audio
calls — gameplay, not ids.)

Replacing the random half with a per-session monotonic counter is sufficient for the
gate and for Acceptance 6. Removing the **clock** half — in these 32 and in the ~49
further sites that carry a clock and no randomness at all (roughly 33 in
`stories/dungeo`, 16 in `packages/**/src`, shaped like
`` id: `mirror-pole-raised-${Date.now()}` ``) — is **Effort B**, and is enumerated in
`docs/work/adr-291-seed-authority/determinism-inventory-20260731.md` rather than here.

Worth recording for whoever picks up Effort B, because it is the trap A2 found: an id
rule phrased as "replace the `` `${Date.now()}_${Math.random()}` `` form" reaches none
of the ~49, because that enumeration came from grepping for `Math.random()`. Effort B
must be scoped by the containment invariant, not by a form.

Two reasons this is worth the mechanical churn. A gate with no exceptions cannot
erode, while a gate with one always does — and the single carve-out would sit
exactly where D7's audit is blind. And **event ids reach saved games**:
`save-restore-service.ts` serializes the event source into the save, so today two
runs at an identical seed produce byte-different saves. Deterministic ids make
byte-identical saves at a fixed seed possible, which is a testing technique the
current scheme forecloses.

Cross-session id uniqueness was checked and is not required — zifmia does not key
on engine event ids (verified 2026-07-31, no `event.id` usage in
`tools/zifmia/src`), so a per-session counter collides with nothing. Had it been
required, the prefix would have had to derive from the root seed rather than a
clock.

### D7. "No nondeterministic token reaches rendered output" is proven, not assumed

Neither an RNG-derived nor a `Date.now()`-derived token appears in rendered text,
and this is established by mechanism rather than by inspection.

**The mechanism is Acceptance 1**: run the same story at the same root seed in
two separate processes and diff the rendered output. Any surviving
nondeterministic token — an id, a timestamp, an unseeded draw — differs between
the two runs and shows up in the diff. A grep for suspicious-looking strings
would be a weaker test that also required knowing what to look for.

The corpus is the dungeo walkthrough chain plus the unit transcripts, which
between them exercise every action in stdlib. The standing test is Acceptance 1
run over that corpus, not a one-time audit.

Without this, a verbatim bless is a promise the platform has not checked it can
keep — and the failure mode is a test that passes at authoring time and fails
forever after.

### D8. A transcript may pin the seed it was captured under

A transcript declares its own seed with a **`[SEED: N]` directive**, in the shape
the format already uses for `[OK: …]` and `[ENSURES: …]`. The directive is parsed
by `packages/transcript-tester`, which owns the transcript grammar (ADR-287 owns
the fenced-payload half of it); the Swift side mirrors it the way
`Rebless.swift` mirrors the block grammar, pinned by tests that run the real
parser over what the IDE writes.

A transcript is self-contained: replaying it reproduces the world that produced
its assertions regardless of runner defaults. `[SEED: N]` overrides the D9
default and is itself overridden by an explicit `--seed`, so a reported failure
can always be reproduced without editing the file. In a chain, only the **first**
transcript's `[SEED:]` is honoured — the chain is one session (D9) — and a
`[SEED:]` on a later member is a loud parse error rather than a silent no-op.

This is the hook ADR-290's successor needs. A skein thread stores one number at
its root, and "play to here" replays exactly. Without D8, every captured thread
depends on an ambient default that a later change can move.

### D9. The runner pins by default, varies on request, and always reports the seed

**The seed belongs to a session, not to a file.** A lone transcript is one
session; a `--chain` run is one session spanning many files, with one engine, one
world, and an RNG stream that does not reset at a file boundary. A per-file seed
would be meaningless inside a chain — there is no point at which the second
file's seed could take effect.

So: absent a flag, the runner derives the **session's** seed from the session's
identity — a lone transcript's own path, or for a chain, its **first member's**
path. Paths are resolved **relative to the story directory**, not the working
directory, so a run is reproducible from anywhere in the tree.

**That derivation is the same function D2 froze, and carries the same version**
(added by A3, review finding B-2). The path string is hashed with D2's FNV-1a mix and
reduced into `[0, 2^31)` so it satisfies D2a's own root-seed refusal, and it is pinned
by the same hardcoded-expectation test under the same `SEED_DERIVATION_VERSION`. D2
made stream derivation a compatibility surface for a stated reason — change it and
every pinned seed silently means something else — and a second, unversioned derivation
sitting beside it would reintroduce exactly that failure for every default-mode run in
the repo. One function, one constant, two callers.

Each session is therefore reproducible in isolation while the suite as a whole
spans many roll sequences. One global constant would make every test in the repo
exercise a single sequence forever, so a defect reachable only on a different
sequence would be permanently invisible.

**Variation is a first-class mode, not an accident** (ruled by David,
2026-07-31). Four modes, each operating on sessions:

| Mode | Seed | Use |
| --- | --- | --- |
| default | derived from session identity | reproducible regression runs |
| `--seed N` | pinned to `N` | replaying a specific reported failure |
| `--vary` | time-based | deliberately exploring other sequences |
| `--sweep N` | N seeds, N sessions | hunting sequence-dependent defects |

`--sweep N` runs the session N times at N derived seeds: N runs of a lone
transcript, or N runs of a whole chain. It never varies seeds *within* a session.

**The load-bearing rule across all four: the seed is always reported, and every
failure carries the seed that produced it.** A variation run that finds a defect
it cannot name the seed for has produced noise rather than a finding. This is
what makes exploration convertible — a `--vary` or `--sweep` failure becomes a
pinned regression test by copying its seed into a `--seed` run or into the
transcript itself under D8.

A test suite whose randomness varies *silently* per run is the situation this ADR
exists to end. Varying it deliberately, reportably, and on request is the
opposite of that, not a relapse into it.

### D10. The seed is visible to authors, silent to players

Live play pins one root seed per session — that falls out of D1, replacing
today's two independent `Date.now()` draws at `game-engine.ts:306` and `:309`.
This decision governs where that number is *shown* (ruled by David, 2026-07-31):

- **Automatic on author surfaces**: the IDE's Play pane displays the session
  seed, and `--play` prints it at startup.
- **On demand anywhere**: an author/debug meta command reports the current root
  seed, in the shape the repo already uses for `$`-prefixed author commands.
- **Silent in a published game** unless the author opts in. Nothing appears in
  the opening banner by default.

The point is the bug-report path: an author who hits something odd on turn 200
hands over one number rather than a save file, and the reader reproduces it with
`--seed`. Putting it in a player-facing banner was rejected — it is noise for a
player and invites seed-fishing in a published work.

## Implementation touchpoints

Every module the decisions reach, including transitive impacts. Line numbers are
as of 2026-07-31.

**Core — the interface (D2a)**
- `core/src/random/seeded-random.ts` — `SeedAuthority` interface added beside
  `SeededRandom`; `SEED_DERIVATION_VERSION` and the FNV-1a mix (D2)
- `core/src/random/index.ts` — barrel
- `core/src/events/event-system.ts:77` — id generation loses clock and randomness (D6)
- `core/src/events/game-events.ts:274`, `platform-events.ts:181`,
  `query/query-manager.ts:190` — same (D6)

**Engine — the instance and its lifecycle (D1, D4, D10)**
- `engine/src/game-engine.ts:306,309` — the two unseeded constructions replaced
  by authority-minted `npc`/`deadly-room` and `actions` streams; root seed accepted
  as an engine option; `:349` and `:1150` follow the renamed streams
- `engine/src/action-context-factory.ts:82` — unseeded fallback removed
- `engine/src/save-restore-service.ts:230,299,301` — `actionRngSeed` replaced by
  the stream map plus the forward-reading reader (D4)
- `engine/src/turn-event-processor.ts:31`, `game-engine.ts:2170` — id generation (D6)

**stdlib**
- `stdlib/src/actions/enhanced-context.ts:60` — unseeded fallback removed
- `stdlib/src/npc/npc-service.ts:139`, `query-handlers/restart-handler.ts:216`,
  `query-handlers/quit-handler.ts:215`, `validation/command-validator.ts:1617` — ids (D6)

**world-model — parameter injection preserved (D2a)**
- No behavior acquires a stream directly. `traits/room/roomBehavior.ts:91,121,164`,
  `traits/switchable/switchableBehavior.ts:151,167,197`,
  `world/WorldEventSystem.ts:281`, `world/WorldModel.ts:612` change only for ids (D6)
- `capabilities/action-interceptor.ts:345,371,393,436,473` — **added by Amendment A1,
  finding B1.** The five `ActionInterceptor` hooks (`preValidate`, `postValidate`,
  `postExecute`, `postReport`, `onBlocked`) each take
  `(entity, world, actorId, sharedData)` and no `SeededRandom`. They gain an optional
  `random?: SeededRandom` parameter, supplied by **the component that dispatches the
  hook** — stdlib or engine, both permitted to ask the authority. Parameter injection
  per D2a: world-model still acquires nothing and imports nothing new.

  **Corrected by A3 (review finding B-1).** A1 and A2 both said this parameter came
  from "the engine-side interceptor registry (ADR-208, engine-owned per world)". There
  is no engine-side registry: bindings live in a private `Map` on `WorldModel`
  (`:553`), written directly by `registerActionInterceptor` (`:782`). ADR-208's
  ownership language is about lifetime — per world, garbage-collected with it — not
  location. Had the ADR been implemented as written, the registry would have had to
  reach the authority from inside world-model, which D2a forbids.

  This is the **only interface change D5's dungeo half requires**, and it is a
  world-model edit, so it lands *before* the story edit rather than alongside it.
  Without it `melee-interceptor.ts:348` has no route to a stream and D5 cannot be
  completed for the site that Acceptance 2 actually measures. The draft named neither
  the file nor the dependency; A1's first pass added the story site without it.

  **Which stream arrives (A2 finding B3, relocated by A3).** The dispatcher resolves
  it from the binding's `(traitType, actionId)` — the pair `registerActionInterceptor`
  keys on (`world/WorldModel.ts:316`), both static strings, and registration is
  idempotent and overwrites on repeat (`:778-780`), so the pair is unique per world and
  the resolved name is stable across runs. The interceptor does **not** receive the
  caller's `actions` stream: that would interleave dungeo melee with every other
  action draw, which is exactly what ADR-231 D6 rejected and D3 preserves. Nor does
  the story name the stream itself; see D2a, and ADR-292 D11 for how a name resolves.

  A2 considered retiring this interface change instead, by converting
  `MeleeInterceptor` (`melee-interceptor.ts:291`, an object literal registered at
  `stories/dungeo/src/index.ts:571`) into a factory closed over a story-acquired
  stream. That route works in TypeScript — it needs the registration moved from
  `initializeWorld(world)` (`index.ts:208`, no engine reference) to
  `onEngineReady(engine)` (`index.ts:825`, which already holds both) — and it is
  unavailable in Chord. **Keeping the hook change is what makes both languages
  behave identically**, which is why A2 kept it rather than trading it for a
  story-local factory. `melee-interceptor.ts` is, as of 2026-07-31, the only
  `ActionInterceptor` *implementation* in the tree that draws randomness (the other
  files matching `ActionInterceptor` alongside RNG are the dispatch sites
  `engine/src/game-engine.ts` and `world/WorldModel.ts`), so the interface change
  serves one call site today and the contract for every story later.

**Extensions**
- `extensions/basic-combat/src/basic-combat-interceptor.ts:23` and
  `basic-npc-resolver.ts:22` — module singletons retired (D5)
- `extensions/testing/src/annotations/store.ts:13` — ids (D6)

**Stories — added by Amendment A1; the draft listed none**

Sized per D2a's story-access table. **Four of the six dungeo edits are one-liners** —
the seam is already plumbed and the code opted out of it:

| Site | D5/D6 | Work |
| --- | --- | --- |
| `combat/melee-npc-attack.ts:45,116` | D5 | **one line** — delete the singleton, use the `_random` parameter the function already receives at `:110` |
| `handlers/bat-handler.ts:75` | D6 | **one line** — pass `context.random` into `getRandomDropLocation` |
| `handlers/carousel-handler.ts:42` | D6 | **one line** — same, into `getRandomDestination` |
| `handlers/round-room-handler.ts:62` | D6 | **one line** — same, into `getRandomExit` |
| `interceptors/melee-interceptor.ts:47,348` | D5 | **blocked on the world-model hook change above (B1)**; then use the new parameter |
| `npcs/dungeon-master/dungeon-master-trivia.ts:115` | D6 | `startTrivia(state)` gains a `SeededRandom` parameter; its caller supplies it |

- The two D5 sites retire onto `story:dungeo/melee` and `story:dungeo/npc-melee`.
  Both names are **resolved by the platform**, not written in the story (D2a; ADR-292
  D11 owns resolution); they appear here to name the streams under discussion, not as
  literals for an author to type.
  **This is the Acceptance 2 change**; the `basic-combat` pair above does not touch
  the dungeo chain
- `stories/dungeo/src/combat/melee-npc-attack.ts:49`,
  `actions/gdt/gdt-input-handler.ts:27` — the 2 clock-plus-random ids lose their
  random half (D6). Their clock half is Effort B
- `stories/armoured/src/combat/combat-utils.ts:83` (a d20 roll),
  `stories/thealderman/src/randomization.ts:43`,
  `stories/cloak-of-darkness/src/index.ts:524` — gameplay `Math.random()` onto
  story streams (D6). Not on the acceptance path, but inside the gate's scope,
  so they land in the same phase as the gate or the gate cannot be switched on

**Media**
- `media/src/audio/audio-registry.ts:205-215` — `resolvePool` takes the `audio`
  stream (D6)

**Parser / grammar / scheduler / story-loader**
- `parser-en-us/src/english-parser.ts` (9 id sites),
  `if-domain/src/grammar/grammar-engine.ts:164`,
  `event-processor/src/effects/effect-processor.ts:245`,
  `plugin-scheduler/src/scheduler-service.ts:69` — ids (D6)
- `plugin-scheduler/src/scheduler-service.ts:84` and
  `story-loader/src/evaluator.ts:103` — already seeded by caller; the caller now
  passes an authority stream rather than a bare number

**Runner and surfaces (D8, D9, D10)**
- `packages/transcript-tester/src/cli.ts:61` — `--seed`, `--vary`, `--sweep`
  alongside the existing flags; seed reporting in all modes
- `packages/transcript-tester` parser — the `[SEED: N]` directive
- `tools/ide/SharpeeIDE` — Play pane seed display; the Swift mirror of `[SEED:]`

## Acceptance

1. The same root seed and command sequence produce **byte-identical** rendered
   output across two separate processes — asserted by a test that spawns the
   bundle twice and diffs, not by inspecting seeds. This is also the mechanism
   D7's audit rests on: byte-identical output *is* the proof that no
   nondeterministic token reached it.
2. The dungeo walkthrough chain, run repeatedly at a pinned seed, produces an
   identical total test count and identical results every time.
3. Registering a **new** named stream leaves every existing stream's draw
   sequence unchanged — pinned by a test that records draws, adds a stream, and
   re-records.
4. Save → restore → continue matches an unbroken run for **every** registered
   stream, not only `actions`.
5. A pre-ADR save (carrying `actionRngSeed` alone) restores without error, with
   its action stream continuing exactly and the remaining streams reseeded from
   the root.
6. The build fails when `Math.random()` is introduced anywhere in gated source —
   `packages/**/src` **or** `stories/**/src` — and the gate carries no allowlist.
   Asserted by introducing a call in each of the two roots and observing two
   failures, and by confirming the gate stays green over `tests`, `tools`, and
   `dist` (Amendment A1: the second root and the negative cases are new).
7. **DEFERRED TO EFFORT B — not a criterion of this ADR** (A3). Two runs at the same
   seed produce **byte-identical save files**, which requires event ids to be free of
   both clock and randomness, and requires the 184 event `timestamp` fields and the
   save's own metadata stamp to be settled. Retained here, struck, so the criterion is
   not silently lost and so a later reader can see where the scope line falls.
   Nothing in ADR-292 depends on it.
8. No RNG-derived or `Date.now()`-derived token appears in rendered output,
   asserted over a corpus via criterion 1 rather than argued.
9. Every run reports the seed it used, in all four D9 modes, and a failing
   transcript's output names the seed that produced the failure — asserted by
   running `--vary` against a transcript rigged to fail and parsing the seed back
   out of the report, then reproducing the same failure with `--seed`.
10. `--sweep N` over the dungeo chain runs the **whole chain** N times and
    reports per-seed results rather than a single aggregate verdict, so a
    sequence-dependent failure is attributable.
11. The seed reported by `--play` and by the meta command, fed back through
    `--seed`, reproduces the session — asserted end to end, not by comparing the
    displayed string to `getSeed()`. A published-game run shows no seed anywhere
    unless opted in.
12. **Rejections** (D2a), each asserted as a named failure rather than a
    fallback: a non-integer or out-of-`[0, 2^31)` seed from any entry point
    (`--seed`, IDE, `[SEED:]`) is refused naming the value and the range; an
    unnamespaced extension or story stream name is refused naming the required
    prefix; a `[SEED:]` on a non-first member of a chain is a parse error.
13. `stream(name)` called twice returns the same instance, and a save round-trips
    through `snapshot()`/`restore()` with unknown and missing names both reseeded
    from root rather than throwing.

## Consequences

- **The `[OK: any]` default becomes a choice rather than a necessity.** ADR-277
  D5 weakened the default assertion because text varied per run. After this,
  verbatim assertions are viable, which is the precondition for ADR-290's model.
- **Transcripts that currently pass by retry-luck may deterministically fail.**
  A suite that reaches green through "enough attack commands" is not passing for
  the reason it appears to. Pinning the seed converts intermittent passes into
  stable passes *or* stable failures, and the failures were always there. This
  is a surfacing, not a regression, and it should be expected to produce work.
- **`basic-combat`'s internals change shape** — module singletons become
  injected streams. The extension's public surface is otherwise untouched.
- **`ActionInterceptor` gains a parameter** (A1, B1). Its five hooks take an optional
  `random?: SeededRandom`. Optional, so existing interceptors compile unchanged; but
  it is a world-model public-surface change and the first this ADR makes, so it
  belongs in the same release note as the save format.
- **Dungeo's combat and hazard code changes** — four one-line edits plus the
  interceptor, none of them behavioural at a fixed seed. What changes is that the
  chain stops varying run to run, which is Acceptance 2 and the point of the exercise.
- **Save format changes** (D4), with a reader rather than a break.
- **The seed derivation joins the save format as a versioned compatibility
  surface** (D2). Two constants now gate upgrades rather than one, and a
  derivation change invalidates blessed transcripts unless read forward — which
  is why it is versioned rather than merely documented.
- **ADR-231 D6's `actionRngSeed` field is subsumed**, and its ruling is
  preserved. D6 is generalized here, not amended.
- **ADR-290's successor depends on D1 and D8.** The skein cannot store a
  reproducible thread until a thread's seed is a thing that exists.
- **Renaming or moving a transcript changes its default seed**, and therefore
  which roll sequence it exercises. Paths anchor to the story directory (D9), so
  a move within it is a semantic change to the test — a blessed assertion can
  flip on a rename that touched no content. Pin the seed with `[SEED: N]` (D8) on
  any transcript whose sequence matters.
- **`world-model` stays engine-free** (D2a). Behaviors continue to receive a
  stream as a parameter rather than acquiring one, so this ADR adds no dependency
  edge out of world-model — ADR-231 D6's precedent is carried, not reversed.
- Live play still varies run to run, by default. Determinism is a property the
  runner and the IDE opt into, not a change to how a published game plays.

## Deferred, not decided

Points the second `adr-review` surfaced and acceptance did not resolve. Recorded so
they are not mistaken for oversights by whoever implements this.

- ~~**The D6 gate's scope.**~~ **Resolved by Amendment A1**, which writes the scope
  table into D6 and separates the `Math.random()` ban from `Date.now()` seed entry.
  `packages/transcript-tester` is gated and stays compliant, because `--vary` reads
  a clock rather than calling `Math.random()`. The two were assumed entangled; they
  are not.
- **IDE seed entry has no touchpoint.** D1 permits the IDE to set a root seed and
  D10 requires the Play pane to display one, but Implementation lists only the
  display. The entry surface is unspecified. **Still open** — A1 did not touch it.
- ~~**Story stream naming is unspecified below the prefix**~~ (opened by A1).
  **Resolved by Amendment A2 (B3)**: a story neither declares nor mints stream names.
  The platform derives them from the identity of the thing being registered, so there
  is no naming surface left to specify — which is also what makes the rule stateable
  in Chord, where an author has no way to write a name at all.
- ~~**The split is undecided**~~ (opened by A2, closed the same session).
  **Ratified by A3**: this ADR is Effort A. See the Scope section at the head of the
  document, which is now the authority on what is in and out.
- **Effort B has no ADR** (new, A3). Deferring it is a decision; leaving it
  undocumented is not. Its scope — the ~49 clock-only ids, the clock half of 32 more,
  the 184 event `timestamp` fields (`core/src/events/types.ts:22`), the three clock
  reads in the save path including the save's own metadata stamp
  (`save-restore-service.ts:235`) — is enumerated in
  `docs/work/adr-291-seed-authority/determinism-inventory-20260731.md` §7–§9. If it is
  taken up it needs its own ADR; the inventory is the input, not the decision.

## Tracked work

No issues are filed for this ADR yet. The walkthrough-chain flake has been
recorded in several session summaries as an unattributed RNG symptom; if it is
filed, it should cite D5 as the cause and Acceptance 2 as the gate — and name
`stories/dungeo/src/interceptors/melee-interceptor.ts:47` and
`combat/melee-npc-attack.ts:45` specifically, **not** the `basic-combat` pair the
ADR originally pointed at (Amendment A1).

## Amendment A1 — 2026-07-31, session 8a8dd0

Made **before any implementation**, from a re-verification of the Context section
against the tree, then an `adr-review` pass over the result. The draft's Context was
written from a grep of `packages/`; A1 extends that sweep to `stories/` and re-checks
the flake attribution (A1.1–A1.3), and the review that followed found two missing
contracts on the story side (A1.4–A1.5) plus the sizing correction (A1.6).

The common root: every one of these is a place where the draft reasoned about
`stories/` from inside `packages/`.

**A1.1 — D5 named the wrong singletons (material).** The draft attributed the
walkthrough-chain flake to `basic-combat`'s `combatRandom` and `npcCombatRandom`,
reasoning that they "drive PC→NPC and NPC→NPC combat resolution — which is the
dungeo thief." Verified false: `stories/dungeo` contains no reference to
`basic-combat` in source or `package.json`. Dungeo ships its own combat with its
own pair of module-scope, clock-seeded singletons at `melee-interceptor.ts:47` and
`melee-npc-attack.ts:45`. D5 now covers all four. Without this, D5 could have been
implemented to the letter, passed its own tests, and left Acceptance 2 failing for
the original reason.

**A1.2 — the D6 gate excluded its own acceptance corpus (material).** The gate was
scoped to "platform source" while Acceptances 1 and 2 evaluate the dungeo chain,
which flips four gameplay coins per run at `bat-handler.ts:75`,
`carousel-handler.ts:42`, `round-room-handler.ts:62`, and
`dungeon-master-trivia.ts:115`. Three more in-repo stories do the same. D6 now
carries a scope table covering `packages/**/src` and `stories/**/src`, and
Acceptance 6 asserts both roots plus the exclusions.

**A1.3 — counts corrected (bookkeeping).** "Seven construction sites" listed eight;
the true figure is ten with dungeo included. "~35 sites generate event ids" was 32
ids plus the 3 audio calls in `packages/**/src`, with 9 more in `stories/**/src`
the draft did not count. `event-processor/.../observation-handlers.ts:27` is a
commented-out line and is no work at all.

**A1.4 — the story→authority boundary was one clause covering four shapes
(`adr-review` finding B2).** D2a's "stories ask the authority directly" implied a
mechanism no story site uses. Surveying dungeo found four distinct access shapes,
three already plumbed. D2a now carries the table and the rule underneath it: story
code never calls `authority.stream()` at play time — only story *setup* does, and
only to hand a stream downward. (**The setup carve-out was withdrawn by A2.1**; the
table survives, its interceptor row rewritten. Retained here as the record of what
A1 decided.)

**A1.5 — D5's dungeo half depends on a world-model interface change
(`adr-review` finding B1).** `melee-interceptor.ts:348` reads its singleton inside
`postExecute`, and `ActionInterceptor`'s five hooks
(`action-interceptor.ts:345,371,393,436,473`) take no `SeededRandom`. Since D2a
forbids world-model from asking the authority, the stream must arrive as a parameter
— a world-model edit that neither the draft nor A1's first pass listed. Added to
Implementation, and sequenced *before* the story edit. This is the finding that would
have surfaced mid-implementation as "D5 cannot be finished," at the one site
Acceptance 2 measures.

**A1.6 — story work is smaller than A1 first made it look.** Four of the six dungeo
edits are one line each: `melee-npc-attack.ts` already *receives* a `SeededRandom` at
`:110` and discards it at `:116`, and the bat, carousel, and round-room daemons all
run with `SchedulerContext.random` in hand (`plugin-scheduler/src/types.ts:25`). The
gameplay `Math.random()` calls in dungeo are not missing plumbing; they are code that
had a stream available and did not use it.

**Also resolved.** The first "Deferred, not decided" item (the gate's scope versus
`--vary`'s clock read) closes as part of A1.2: the gate bans `Math.random()`, and
seeding from `Date.now()` is neither that call nor randomness during execution. One
new deferral opens in its place (story stream naming below the `story:<id>/`
prefix), and the IDE seed-entry deferral is untouched.

**Review record.** A1 was `adr-review`ed once at 14/16 — two BLOCKERs (B1, B2) and
four SMALL findings (the stale "~35" in D6, an ambiguous Context table, the gate
table's missing exclusion precedence, and a Status line that predated the amendment),
all folded above. No decision was reversed by the review either; both BLOCKERs were
missing contracts, not wrong ones.

**Not changed.** No decision was reversed. D1–D4, D7–D10, the `SeedAuthority`
interface, the refusal table, and the derivation ruling all stand as accepted. A1
widens D5's and D6's scope, adds the story-access contract to D2a, adds one
world-model interface change to Implementation, and corrects the Context all of them
rest on.

## Amendment A2 — 2026-07-31, session 9f136f

Made **before any implementation**, resolving the two BLOCKERs left unfolded by A1's
second `adr-review` pass. Both were ruled by David after the findings were re-verified
against the tree; neither was accepted as the review phrased it.

**A2.1 — B3: the story→stream route was a contradiction, and both candidate
answers were wrong.** A1 left D5 saying dungeo's combat sites *acquire* a named
stream while D2a said story code *receives* one, with acquisition allowed only in
story setup. The review asked which. Applying the elegance requirement — the
resulting decisions must hold for Sharpee **and** Chord — dissolved the question:

- *Acquire by name* is inexpressible in Chord. Its randomness surface is three
  constructs (`one chance in <n>`, the `randomly` phrase/`select` strategies,
  `move-chance`), none of which names an entropy source, and it has no setup block,
  lifecycle hook, or factory at all.
- *Receive the caller's stream* means the shared `actions` stream, interleaving
  dungeo melee with every other action draw — precisely what ADR-231 D6 rejected and
  what D3 exists to preserve structurally.

**Ruled: the stream is derived from the registration identity and supplied by the
registrar.** For an interceptor that is the `(traitType, actionId)` pair
`registerActionInterceptor` already binds on (`world/WorldModel.ts:316`). The author
names nothing, in either language, and Chord's compiler emits the same registration
and gets identical treatment for free.

This **simplifies D2a rather than extending it.** Three of its four rows — scheduler
daemons reading `context.random`, `meleeNpcResolver` receiving a parameter, the trivia
helper taking one from a caller that has context — were already derive-don't-declare.
Only the interceptor row and the story-setup carve-out broke the pattern, and both go.
It also keeps A1.5's world-model hook change in scope, but changes what that change is
*for*: not a five-hook accommodation serving one call site, but the mechanism that
makes TypeScript and Chord stories behave the same. See Implementation touchpoints for
the story-local factory alternative and why it was rejected.

**A2.2 — B4: id determinism was enumerated from the wrong set.** D6's substantive
rule was phrased as replacing the `` `${Date.now()}_${Math.random()}` `` *form*, an
enumeration produced by grepping for `Math.random()`. Verified against the tree: ~49
further id sites carry a clock and **no** randomness (~33 in `stories/dungeo`, ~16 in
`packages/**/src`), which that phrasing reaches not at all, while Acceptance 7 requires
every one of them — event ids serialize into the save.

**Ruled: state the rule as a containment invariant** — an event id holds a static
prefix and a per-session monotonic counter and nothing else — which is closed over
sites nobody enumerated. This is the same root A1 corrected in the Context: reasoning
about a population from a grep that could not see it.

B4 is a correctness-of-statement fix, not a scheduling decision. **When** the ~49
sites are paid down was left open by A2 and **settled by A3**: they are Acceptance 7
work, so they belong to Effort B and leave this ADR.

**A2.3 — count correction (bookkeeping).** A1.3's "32 platform sites ... plus the 2 in
`stories/dungeo`" double-counted: 32 is the tree-wide total, comprising 30 in
`packages/**/src` and 2 in `stories/dungeo`. Third correction in this lineage, and the
reason A2.2 prefers an invariant to a count.

**Review record.** A2 has **not** been through `adr-review`. A1's second pass (12/16)
raised B3 and B4; this amendment resolves both, but the amended document has not been
re-reviewed.

**Not changed.** No decision was reversed. D1–D4, D7–D10, the `SeedAuthority`
interface, the refusal table, and the derivation ruling all stand. A2 restates D2a's
underlying rule and withdraws its story-setup carve-out, corrects D5's "acquired",
restates D6's id rule as an invariant and widens its site population, and re-purposes
A1.5's world-model change without removing it. The open split question (Effort A
versus Effort B) is untouched and still open.

## Amendment A3 — 2026-07-31, session 9f136f

Made **before any implementation**, after a three-ADR review (290, 291, 292) run
because the ADR had stopped converging: 16/16 at acceptance, then 14/16, then 12/16,
then 12/16 with three fresh BLOCKERs, each pass finding roughly two new ones. A3 is a
re-cut rather than another fold, because the review found the cause was structural.

**A3.1 — the scope split was already decided, in ADR-292.** A2 recorded the Effort A /
Effort B split as an open question gating implementation. ADR-292's Consequences
already stated it as settled: *"ADR-291 Effort A becomes the gating dependency and
Effort B (byte-identical saves) becomes clearly optional — nothing here needs it."*
A3 ratifies that, adds the **Scope** section at the head of the document, and defers
Acceptance 7. Every review pass before this one spent findings on Effort B work sitting
inside an Effort A ADR, which is most of why the score never converged.

**A3.2 — the gate belongs to Effort A, which the inventory's recommendation had
wrong.** The inventory put "the gate" in Effort B alongside the clock sweep. That
cannot be right: ADR-292's T1 is checked by this gate, and ADR-292 depends on Effort A.
The resolution is that D6's rule splits cleanly along the halves it already named —
**the `Math.random()` ban is Effort A, the clock removal is Effort B.** The 32 id sites
lose their random half here and keep their clock, which is invisible to Acceptance 1
and visible only to Acceptance 7. So Acceptance 6 moves into Effort A and only
Acceptance 7 leaves.

**A3.3 — naming resolution moves to ADR-292, which already owned it.** A2 derived a
mechanism for resolving stream names from registration identity. ADR-292 D11 had
already ruled the same principle a session earlier, by a different mechanism (the Chord
compiler prefixes `story:<id>/` from the declared `id:`), and had already stated that
this ADR's unnamespaced-name refusal "must fire on the resolved name, never on what the
author typed." Two mechanisms for one rule in two ADRs is the drift that made every
insight get folded backward into the ACCEPTED document instead of forward into the one
that owns the subject. D2a now states only what Effort A needs at runtime and cites
ADR-292 for resolution.

**A3.4 — B-1: the interceptor registry is not where two amendments said it was.** A1
and A2 both had the `SeededRandom` parameter supplied by "the engine-side interceptor
registry (ADR-208, engine-owned per world)". Verified: bindings are a private `Map` on
`WorldModel` (`world/WorldModel.ts:553`, written at `:782`); ADR-208's ownership
language is about lifetime, not location. As written, world-model would have had to
reach the authority, which D2a forbids. **Ruled: the hook's dispatcher resolves and
supplies the stream; `WorldModel` stores bindings and knows nothing about streams.**

**A3.5 — B-2: a second, unversioned seed derivation.** D2 froze stream derivation
behind `SEED_DERIVATION_VERSION` for a stated reason. D9 then introduced a path →
root-seed derivation with no function, no version, no test, and no guarantee of landing
inside the `[0, 2^31)` range D2a's own refusal requires. Ruled: one function, one
constant, two callers.

**Not folded, deliberately.** Three findings from the same review are left for the
ADRs that own them, rather than fixed here: ADR-290 does not know it depends on this
ADR (X-1); ADR-292's T5 borrows Acceptance 4, which tests save/restore rather than the
fork path T5 actually needs (X-4); and the ledger's persistence across the 291/292 seam
is unowned (X-5). Folding those into this document is the exact mistake A3.3 diagnoses.

**Review record.** The three-ADR review scored this document 12/16 before the re-cut.
**A3 has not been re-reviewed**, and the re-cut is substantial enough that it should be
before implementation starts.

**Not changed.** No decision was reversed. D1–D5, D7–D10, the `SeedAuthority`
interface, the refusal table, and the derivation ruling all stand. A3 narrows scope,
relocates two rules to the ADRs that own them, and corrects two factual errors about
where code lives.

## Amendment A4 — 2026-07-31, session 9f136f

Two corrections to A3, from the review re-run over all three ADRs. Both are defects A3
introduced; neither existed before the re-cut. Recorded as their own amendment rather
than folded silently into A3, because "the re-cut also broke two things" is exactly the
kind of fact a later reader needs and a tidy edit would erase.

**A4.1 — Y-1: the re-cut removed what made Acceptance 8 true and left the criterion in
scope.** Ids keep their clocks under A3's scope line, while Acceptance 8 still forbids a
`Date.now()`-derived token in rendered output and Acceptance 1 still proves it by diff.
Before the re-cut this was true by construction, because ids lost their clocks outright;
after it, the property rests on the Context section's own admission that whether an id
or timestamp reaches rendered text is "not established". A3's Scope table then described
Effort A's relationship to the clock as "seed entry only", which was simply wrong.
**Ruled: Effort A owns a narrow clock obligation — nothing clock-derived reaches
rendered output — and it is established by an early Acceptance 1 spike rather than
discovered at the end.** This is the one place Effort A can fail for a reason whose fix
lives in Effort B, which is why it is checked first.

**A4.2 — Y-2: A3 made an ACCEPTED ADR depend on a DRAFT one.** A3 wrote "who resolves a
name is ADR-292's decision, not this one," while ADR-292's own Acceptance 1 reads
"Depends on ADR-291 landing first." The sequencing graph across the three ADRs was
acyclic before A3 and mutual after it, with the dependency running through an unaccepted
document carrying unapproved platform changes. The overcorrection was handing away the
*runtime* rule along with the *authoring* surface. **Ruled: the runtime invariant — every
name reaching the authority is fully qualified, and the refusal fires on the resolved
name — is stated here and is self-contained. ADR-292 D11 owns only the surface that
produces names.** Effort A depends on the runtime half alone and can implement it today.

**Review record.** The re-run scored this document 14/16 before A4, up from 12/16, with
both remaining failures introduced by A3. **A4 has not been re-reviewed.**

**Not changed.** No decision was reversed. A4 corrects a scope statement and restores
this ADR's independence. The Effort A/B split, the gate placement, and D1–D10 all stand
as A3 left them.

## Session

Drafted 2026-07-31, session b3834b, after the ADR-290 re-examination turned on
mirroring Inform 7's Skein/Transcript model, where blessed expected output and
replay-to-a-node both assume reproducible execution. David's framing: "we need
to create a central end point that provides randomness that can be set static
for testing." The refinement to *one authority minting many isolated streams*,
rather than one shared stream, comes from ADR-231 D6's rejection of sharing,
which this session re-read rather than assumed.

All six open questions were resolved by interview the same session. Two answers
changed the ADR's shape rather than filling a blank: D9 gained `--vary`/`--sweep`
and the seed-always-reported rule from David's "we need a way to trigger the
variations", and D6's allowlist emptied to zero once event ids were traced into
the save file. Two questions were settled by reading code mid-interview rather
than by argument — zifmia's lack of any `event.id` dependency (freeing the
deterministic-id ruling) and `AudioRegistry.resolvePool` baking random values
into an event payload rather than applying them at playback (making the audio
stream a correctness matter, not a presentation preference).
