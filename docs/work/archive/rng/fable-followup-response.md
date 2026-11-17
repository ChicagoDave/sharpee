# RNG Normalization — Response to Follow-up (round 2)

**Date:** 2026-08-01
**Answers:** `fable-followup.md`, in its stated priority order (Q5, Q1, Q8, Q7, 6.1),
except that Q7 is taken **first** because its answer is what makes Q1 answerable at all.
Chord stays out of scope per the ground rules. The requested concrete API, worked
against the round-room handler, `resolveBlow`, and a thief draw, is §6.

---

## 0. The audio correction is accepted

Verified at `media/src/audio/audio-registry.ts:205-215`: `resolvePool` draws `src`,
`volume`, and `rate` with three `Math.random()` calls and bakes them into a
`createTypedEvent('audio.sfx', {...})` return value. The assessment's "presentation-layer,
outside the boundary" ruling was wrong; the values enter the event source and serialize.
Audio moves onto a stream like everything else.

It also usefully forces a distinction the assessment lacked, which §3 below relies on:
**not every draw is a coverage point.** Pitch jitter is a continuous cosmetic draw with no
enumerable outcome classes; nobody play-tests "every pitch." So the design needs two
tiers — *choice points* (named, declared outcome classes, coverage-counted, forceable)
and *plain draws* (named, seeded, traced, but no classes and no coverage row). Audio
jitter is the canonical plain draw. With that distinction, there is no "declared exempt"
list at all: everything is on a stream; only class-bearing points participate in coverage.

---

## 1. Q7 first — granularity goes to per-point, and that decision carries the rest

The follow-up's push is correct: a shared `combat` stream reproduces §2.6's failure one
level down (a new thief draw shifts every troll outcome). The assessment's per-domain
recommendation predated the choice-point registry; once the registry exists, names exist,
and names are exactly what stream derivation needs. So:

- **Every named point (and plain draw) gets its own stream**, derived lazily:
  `state = mix(masterSeed, pointName)` on first draw, cached, advanced per draw.
- **Save format:** one map `{ pointName → streamState }` containing only points that have
  drawn. Concrete Dungeo count: ~25–30 gameplay points + a handful of plain draws
  (audio, message-variant picks) → **≤ ~40 u32 entries**, a few hundred bytes. Derivation
  cost is one hash per point per session. There is no meaningful cost argument against
  per-point.
- **Dynamic instances** (per-NPC wander, if ever needed) are parameterized names —
  `npc.wander:<entityId>` — bounded by entity count, still lazily derived.

The payoff that matters here: **draw-count coupling becomes internal to a point.** No
other point can observe how many draws a point consumed, because no other point reads its
stream. That is the fact that makes multi-draw forcing coherent.

## 2. Q1 — multi-draw forcing: force classes, consume zero draws

The claim "forced points don't draw, so the stream stays aligned for everything else" is
indeed false on a shared stream — and becomes true by construction on per-point streams.
The resolution:

1. **Forcing operates on declared outcome classes, never on draws.** A point is a
   function `stream → (class, value)`. A force replaces the function's result.
2. **A forced firing consumes zero draws.** The only state it perturbs is the same
   point's *own* later sequence (its stream didn't advance). Cross-point desync is
   impossible.
3. **The determinism contract is `run = f(masterSeed, forceTable)`** — reproducible and
   exact. Alignment with the *unforced* run is explicitly not promised, and per §4.2's
   honest residual it never was; anyone needing an unconditioned replay uses a recorded
   seed (or a per-point seed override, §5.3) instead of a force.
4. "Consume the same number of draws as the unforced path" is rejected for the reason
   the follow-up gives — the count is branch-dependent and unknowable without running the
   sample, at which point you didn't force anything.

**The mechanism for multi-draw points:** the point wraps its randomness in a single
`resolve(point, sample, materialize)` call. `sample(draw)` runs the real logic — any
number of internal draws (the `int()` table lookup *and* the conditional
`chance(0.25)` in `resolveBlow` are one point, not two). `materialize(class)` is the
forced path: given a class, produce a deterministic representative value (for
table-driven combat: the first table row in that class, follow-up flag implied by the
class). This is the true cost of forcing — **every forceable point must be able to
construct a representative outcome per class** — and for Dungeo's shapes it is trivial;
§6.2 shows it.

Deterministic short-circuits (`def < 0` auto-kill at `melee.ts:197`, `def === 0`) sit
*before* the `resolve` call, outside the point. They draw nothing today and stay that
way; a force on the point does not fire when a short-circuit returns first — which,
combined with Q2's unfired-force error, correctly turns "author forces KILLED on an
already-dead defender" into a loud failure instead of a lie.

## 3. Q5 — the registry tension: declaration is the capability to draw

The tension is real and the fix is to remove implicit registration entirely, without
giving up the near-zero burden:

- **`definePoint(...)` returns a handle, and the draw API accepts only handles.** Story
  and stdlib gameplay code never sees a raw `SeededRandom`. You cannot write a draw
  without having declared its point, so the catalog is complete **by construction** — no
  static scan, no lint, no never-registered gap.
- Declarations are one line at module scope (`export const ThiefSteal =
  definePoint('dungeo.thief.steal')`) — static, immutable metadata, registered in a
  catalog as a side effect of import, idempotent. The engine snapshots the catalog at
  story start. **Never-fired = catalog − fired.** The load-bearing column works.
- The burden argument survives because the declaration line *replaces* nothing smaller:
  today's call site already exists; the delta is one export per point, ~30 lines across
  all of Dungeo.
- Plain draws (§0) also use handles (`defineDraw('media.sfx.jitter')`) because streams
  need names — they're simply excluded from coverage by *kind*, not by omission.

**Q6 (contextual class sets):** when the reachable class set differs by caller context,
**declare separate points** — `dungeo.melee.blow.hero` and `dungeo.melee.blow.villain`
(and, if desired, `.vsUnconscious` for the remap branch, whose reachable set is only
`{HESITATE, SITTING_DUCK}`). The shared tables in `melee-tables.ts` are an implementation
detail behind both. This is two extra declaration lines; per-context class-set machinery
on a single point is strictly more design for the same information, and coverage reports
become ambiguous ("blow: KILLED never seen" — by whom?). Split points make the
follow-up's own observation (`kill` unreachable for villains) *visible in the catalog*
instead of buried in `melee.ts:248`.

## 4. Q2/Q3/Q4 — force semantics

- **Q2 — unfired forces fail loudly.** In test mode (transcripts), a force that hasn't
  fired by end-of-transcript is a **hard error**, same severity as a failed `[ENSURES:]`.
  In interactive play, it's an end-of-session report line, not an error (an author may
  force a point and then wander off — that's exploration, not a failed test). The
  legitimate never-fire case is handled by mode, not by softening the default:
  - `once` (transcript default): must fire exactly once; zero or duplicate = error.
  - `sticky` (play-mode default): applies on every reach, may fire 0..n times, count
    reported.
- **Q3 — composition.** The force table is keyed by point name plus optional occurrence
  index (`dungeo.thief.steal#3` = third firing only). Duplicate keys in one transcript
  are a **load error**, not last-wins. Force vs seed: the force wins *at that point*;
  the seed governs everything else, including that point's other (unforced) firings. A
  `once` force on a point reached twice: first reach forced, second draws naturally.
  Every firing — forced or drawn — lands in the trace with its provenance, so any
  combination is reportable.
- **Q4 — forces are session state, never save state.** A force is a testing instrument
  aimed at future events, not world truth; a save that behaves differently because of an
  invisible embedded override table is a debugging trap, and the save format shouldn't
  carry a debug artifact. Saves carry **stream states only**. Within a live session,
  restore keeps the session's force table (the author retrying a sequence still wants
  their force). Across sessions, the transcript/harness is the durable record and
  reapplies. This also keeps the save-format change small — one map, versioned reader
  per the standing preference.

## 5. Q8, 6.1, 6.2, 6.3 — sequencing and scope corrections

### 5.1 Q8 — Phase 0 is a prerequisite, not a flake fix. The follow-up is right.

What Phase 0 fixes *immediately and by itself*:

- **Unit-test determinism.** `melee-npc-attack.test.ts` currently loops seeds into a
  parameter the resolver ignores; honoring injected RNG makes combat unit tests
  controllable for the first time.
- **Cross-instance contamination** — module singletons shared by every engine in a
  process (test suites, zifmia).
- **Combat joins save/restore round-tripping** (module state is unpersisted today).

What it does **not** fix: transcript flake. Combat lands on `actionRandom`, which is
time-seeded per run; two chain runs still differ. And no — the 892 → 982 → 11533 spread
is **not** attributable to cross-instance sharing specifically: sharing changes *which*
nondeterministic sequence a later transcript sees, not the fact that it's
nondeterministic. The spread is the retry loops amplifying time-seed variance; expect
Phase 0 to leave it visibly unchanged.

**Sequencing consequence, accepted:** stop selling Phase 0 as "stop the bleeding" and
fold it into Phase 2 as its first commit — it is the prerequisite (a seed cannot reach a
module singleton). Revised order:

1. **Phase A = old 0+2:** kill the four singletons, honor injected RNG, introduce the
   seed authority + per-point streams + unified stream-state persistence + `--seed` +
   `[SEED:]` directive + seed echoed in all test output. Flake dies here or nowhere.
2. **Phase B = old 1:** story `Math.random` cleanup (round room, bat, carousel, trivia,
   audio) — mechanical once the service exists.
3. **Phase C = old 3:** classes, coverage report, forcing.
4. **Phase D = old 4:** retire navigator retries, surplus attacks, run-twice policy.

### 5.2 — 6.1: the acceptance bar splits into three artifacts, and then the answer is easy

The clock census (49 clock-only ID sites, 184 `timestamp` stamps, required
`ISemanticEvent.timestamp`) settles open question 2 by splitting it:

- **Byte-identical *rendered transcript text*** — the Phase A gate. The clock population
  doesn't render: event IDs and timestamps never appear in prose output. Reachable
  without touching any of the 184+49 sites, and strictly stronger than "turn-outcome
  equivalence" while costing the same.
- **Byte-identical *event streams / save blobs*** — **explicitly deferred.** Requires
  the ID-counter scheme plus a timestamp policy, and nothing consumes it today (6.2's
  zifmia check confirms no consumer keys on event IDs). It becomes a separate,
  optional track ("golden event logs"), not an acceptance bar for normalization.
- Turn-outcome equivalence — subsumed by the first bullet; drop it as a category.

One flag for that deferred track, since the census surfaced it: a **required wall-clock
`timestamp` on every semantic event is a design smell independent of RNG.** Turn number
is the honest timebase for IF semantics; wall-clock belongs in save *metadata* and
platform events. That's its own discussion; it is off this critical path.

**6.2** folds into the same deferral: when the ID track runs, the scheme is a per-engine
monotonic sequence (`evt-<seq>`), not turn-keyed — parser IDs then need no turn context,
and session-wide ordering comes free.

### 5.3 — 6.3: the benchmark bounds search, and per-point streams add a better tool

The measured wall (≈623 snapshots/sec, fine at depth 2, ~27 min at thief-depth 10)
confirms forcing-first. Line placement: **forcing (or per-point seed override, below) for
everything authored; whole-run seed search only as an offline, shallow instrument** for
discovering a natural golden-run seed once, which is then recorded — never as an
in-loop testing mechanism.

Per-point streams also dissolve most of what made search exponential: since points don't
share streams, you can search **one point's stream in isolation** for a desired natural
outcome and pin it with a per-point seed override (`[POINT-SEED: dungeo.thief.steal=n]`).
Expected tries are per-outcome-probability (≈4 for a 25% branch), not per-path. This
gives regression baselines a middle instrument the assessment's §4.2 residual wanted:
the draw **really happens** — the run is a pure seeded replay under
`(masterSeed, pointSeedOverrides)`, no conditioning — while forcing remains the
exploration tool. Deep joint outcomes across many turns remain forcing-only territory.

---

## 6. The concrete API, worked against three real sites

### 6.0 Shape

```ts
// @sharpee/core — static metadata only; no stream state lives here
export interface ChoicePoint<C extends string = string> {
  readonly name: string;              // 'dungeo.melee.blow.hero'
  readonly classes?: readonly C[];    // absent ⇒ plain draw (traced, not coverage-counted)
}
export function definePoint<C extends string>(
  name: string, opts?: { classes: readonly C[] }
): ChoicePoint<C>;                    // registers in the immutable catalog; idempotent

// engine — RandomService replaces SeededRandom on ActionContext, TurnPluginContext,
// scheduler tick context, and NPC context. Owns: per-point stream derivation + cache,
// force table lookup, trace, coverage counters, save/restore of stream states.
export interface RandomService {
  chance(p: ChoicePoint<'yes' | 'no'>, probability: number): boolean;
  int(p: ChoicePoint, min: number, max: number): number;               // plain draw
  pick<T>(p: ChoicePoint, items: readonly T[], label?: (t: T) => string): T;
  resolve<C extends string, R>(
    p: ChoicePoint<C>,
    sample: (draw: SeededRandom) => { cls: C; value: R },   // real path; N internal draws
    materialize: (forced: C) => R                            // forced path; zero draws
  ): { cls: C; value: R };
}
```

`definePoint` and the types live in **core**; the service lives in **engine** (it needs
save, trace, and force integration) — settling the assessment's open question 4.
Declarations live with their owners: stdlib declares its ~8 points (throwing ×5,
inventory variant pick, npc move + exit), stories declare theirs.

### 6.1 Site 1 — round-room handler (single draw, runtime outcome space)

```ts
// declarations.ts
export const RoundRoomExit = definePoint('dungeo.roundRoom.exit');

// round-room-handler.ts — replaces getRandomExit's Math.random (:62)
const dest = ctx.rng.pick(RoundRoomExit, destinations, (d) => d);
```

The outcome space is the runtime candidate list (8 compass destinations, duplicates
preserved — the MDL-faithful 2/8 Engravings Cave bias survives untouched because `pick`
is uniform over the *list*, not the distinct set). Force `[FORCE:
dungeo.roundRoom.exit=<roomId>]` matches by label at fire time; a label not among the
candidates is a hard error. Coverage for pick-points reports observed labels against the
candidate set seen at each firing — weaker than a declared-class point, which is honest:
the topology, not the author, defines this space.

### 6.2 Site 2 — `resolveBlow` (multi-draw, class-collapsed, context-split)

```ts
// declarations.ts — Q6: split by reachable class set, tables stay shared
const BLOW_CLASSES = ['MISSED','UNCONSCIOUS','KILLED','LIGHT_WOUND',
                      'SERIOUS_WOUND','STAGGER','LOSE_WEAPON'] as const;
export const HeroBlow    = definePoint('dungeo.melee.blow.hero',    { classes: BLOW_CLASSES });
export const VillainBlow = definePoint('dungeo.melee.blow.villain', { classes: BLOW_CLASSES });
export const BlowVsUnconscious =
  definePoint('dungeo.melee.blow.vsUnconscious', { classes: ['HESITATE','SITTING_DUCK'] as const });

// melee.ts — short-circuits stay OUTSIDE the point (no draw today, none after)
if (def < 0)   return killedResult(def);      // auto-kill; a pending force does not fire
if (def === 0) return missedResult();

const point = isTargetUnconscious ? BlowVsUnconscious
            : isHeroAttacking     ? HeroBlow : VillainBlow;

const { value: outcome } = ctx.rng.resolve(point,
  (draw) => {                                  // real path: both draws, one point
    const table = getResultTable(att, def);
    let o = table[draw.int(0, table.length - 1)];
    if (isTargetUnconscious) o = (o === MeleeOutcome.STAGGER)
      ? MeleeOutcome.HESITATE : MeleeOutcome.SITTING_DUCK;
    if (o === MeleeOutcome.STAGGER && draw.chance(0.25)) o = MeleeOutcome.LOSE_WEAPON;
    return { cls: className(o), value: o };
  },
  (forced) => materializeBlow(forced));        // forced path: zero draws

// materialize is the per-class representative — table-trivial:
//   LOSE_WEAPON → STAGGER row + follow-up true; STAGGER → STAGGER row + follow-up false;
//   anything else → that outcome directly. Strength/stagger/kill effects then flow
//   through the existing switch on `outcome`, unchanged.
```

This answers Q1 concretely: the `int` and the conditional `chance` are **one** point;
forcing `LOSE_WEAPON` consumes zero draws and desynchronizes nothing but this point's own
stream; the branch-varying draw count (1 or 2) is invisible outside `sample`. The
follow-up's `melee.ts:248` observation is now catalog-visible: `KILLED` appears in
`VillainBlow`'s declared classes only if villains can actually reach it through the
tables — deciding that is a one-time table read at declaration time, and if it's
unreachable, leaving it out makes the coverage report stop asking for it.

### 6.3 Site 3 — thief steal (single boolean, probability from a constant)

```ts
export const ThiefSteal = definePoint('dungeo.thief.steal');   // implicit classes yes/no

// thief-behavior.ts:264
if (playerTreasures.length > 0 && props.stealCooldown <= 0
    && ctx.rng.chance(ThiefSteal, STEAL_CHANCE)) { ... }
```

Probability stays at the call site (stdlib's per-NPC move chances need that), classes are
fixed. Force: `[FORCE: dungeo.thief.steal=yes]`, mode `once` in a transcript — if the
thief never gets a steal opportunity before the transcript ends, the run **fails**, which
is precisely the "looked like it tested the case and didn't" bug from Q2, made loud.

Trace output for a turn, all three shapes:

```
turn 42  dungeo.thief.steal          yes        (forced, once #1)
turn 42  dungeo.melee.blow.villain   STAGGER    (drawn, 2 draws)
turn 43  dungeo.roundRoom.exit       'engravings-cave'  (drawn, 1 draw, 8 candidates)
```

---

## 7. What this round leaves open

1. **`VillainBlow`'s exact reachable class set** — one table-reading session against
   `melee-tables.ts` windows; decides two declaration lines.
2. **Directive syntax bikeshed** — `[SEED:]` / `[FORCE:]` / `[POINT-SEED:]` spellings and
   whether occurrence indexing (`#n`) ships in v1 or waits for a need.
3. **Naming convention** for point names (`dungeo.thief.steal` style used throughout —
   dotted, story-prefixed, no abbreviations) — needs a one-paragraph rule before stdlib
   declares its points.
4. **The RandomService signature change** on the four contexts is the platform-discussion
   item; everything in §6 is story-side except that seam.
5. Deferred track, separately triggered: ID counters + timestamp policy (§5.2), only if
   golden event logs ever become a requirement.
