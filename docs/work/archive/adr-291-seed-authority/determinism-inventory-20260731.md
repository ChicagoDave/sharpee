# Determinism inventory — what actually varies between two runs

**Date**: 2026-07-31
**Session**: 8a8dd0
**Purpose**: establish, by measurement, what ADR-291 has to change before its
acceptance criteria can pass. Written because three review passes over ADR-291 each
produced a scope correction, and the corrections all had the same root: the ADR was
scoped from a `packages/` grep while its acceptance criteria are measured on
`stories/dungeo`.

This document is evidence, not a plan. It ends with the decisions it forces, not with
a phase list.

---

## 1. Method

Swept `stories/dungeo/src` (335 non-test `.ts` files) first, because it is the
acceptance corpus, then `packages/**/src` (974 non-test `.ts` files), then the
remaining in-repo stories.

Counted mechanisms, not guesses. Every category below was grepped explicitly, and the
negative results are recorded alongside the positive ones — a category that came back
empty is a finding, because it bounds the work.

| Swept for | Rationale |
| --- | --- |
| `createSeededRandom()` | unowned RNG construction (ADR-291 D2/D5) |
| `Math.random()` | randomness outside the seam (D6) |
| `Date.now()` | clock in ids, timestamps, or state |
| `new Date()`, `toISOString`, `getTime` | wall-clock reaching data or text |
| `performance.now`, `process.hrtime`, `process.uptime` | monotonic clocks |
| `crypto.randomUUID`, `uuid` | non-seeded id sources |
| `process.env`, `process.cwd`, `os`, `fs` | environment-dependent values |
| `for…in`, `Object.keys/entries/values` | key-order dependence |
| `.sort()` without comparator | unstable or locale-dependent ordering |
| `Map`/`Set` iteration | insertion-order dependence |

Exclusions: `*.test.ts`, `tests/`, `dist/`, `dist-esm/`, `node_modules/`, and
comment-only lines. Counts are lines, and file counts are given where they differ
materially from line counts.

---

## 2. Dungeo — the acceptance corpus

335 non-test source files. **163 sites** vary run to run.

| Mechanism | Sites | Files | In ADR-291's scope? |
| --- | ---: | ---: | --- |
| `timestamp: Date.now()` on event construction | 105 | 43 | **not mentioned at all** |
| `id:` built from clock, no counter | 30 | 13 | no |
| local `generateEventId()` — clock + module-local counter | 19 | 19 | no |
| `Math.random()` — gameplay decisions | 4 | 4 | yes (Amendment A1.2) |
| `Math.random()` — inside id strings | 2 | 2 | yes |
| module-scope `createSeededRandom()` | 2 | 2 | yes (D5) |
| world state stamped with wall-clock | 1 | 1 | no |
| **Total** | **163** | | **ADR scoped 8** |

The id rows fold in three one-off variants: a media event counter, a GDT kill id, and
an endgame-darkness id, each clock-derived.

**ADR-291 scopes 8 of these 163.** The 8 are correct — they are the RNG half — but
they are 5% of what varies.

### 2.1 The gameplay RNG (4 sites, all verified reachable)

| Site | Decides | Route to a stream today |
| --- | --- | --- |
| `handlers/bat-handler.ts:75` | which room the bat drops you in | `SchedulerContext.random` — already in hand |
| `handlers/carousel-handler.ts:42` | machine room vs. tea room | same |
| `handlers/round-room-handler.ts:62` | which exit the round room takes | same |
| `npcs/dungeon-master/dungeon-master-trivia.ts:115` | which trivia question opens | none — `startTrivia(state)` is a pure helper |

Three of the four run inside scheduler daemons, and `SchedulerContext` has carried
`random: SeededRandom` all along (`plugin-scheduler/src/types.ts:25`). This is not
missing plumbing; it is code that had a stream available and did not use it.

### 2.2 The combat singletons (2 sites — the flake)

| Site | Used at | Route today |
| --- | --- | --- |
| `interceptors/melee-interceptor.ts:47` | `:348`, in `postExecute` | **none** — `ActionInterceptor`'s five hooks take no `SeededRandom` |
| `combat/melee-npc-attack.ts:45` | `:116` | **already receives** `_random: SeededRandom` at `:110` and discards it |

Both are constructed at import time and seeded from `Date.now()`. Both carry a header
comment saying they exist to avoid identical rolls inside one millisecond — a
workaround that documents the absent authority in as many words.

Dungeo contains no reference to `@sharpee/extensions-basic-combat` in source or
`package.json`. These two, not the extension's pair, are what the walkthrough chain
exercises.

---

## 3. What is clean

Every one of these came back **zero** in dungeo. This is the useful half of the
inventory: it bounds the problem to two mechanisms.

| Category | Result |
| --- | --- |
| `new Date()`, `toISOString`, `getTime()` | none |
| `performance.now`, `process.hrtime`, `process.uptime` | none |
| `crypto.randomUUID`, uuid | none |
| `process.env`, `process.cwd`, `os`, filesystem reads | none |
| `for…in` | none |
| `Object.keys` / `entries` / `values` | 38 sites — insertion-ordered in JS, deterministic |
| `Map` / `Set` iteration | insertion-ordered in JS, deterministic |
| `.sort()` without comparator | 2 sites, both string arrays in GDT debug commands — lexicographic, deterministic |

**Dungeo varies by clock and by RNG. Nothing else.** ADR-291's two-mechanism
assumption is correct; only its volume estimate is wrong.

---

## 4. Platform

974 non-test source files under `packages/**/src`.

| Mechanism | Sites |
| --- | ---: |
| `Date.now()` — all forms | 172 |
| of which `timestamp: Date.now()` | 79 (across 46 files) |
| `Math.random()` | 35 |
| of which id generation | 32 |
| of which gameplay (audio registry) | 3 |
| unowned `createSeededRandom()` | 4 (2 engine, 2 fallbacks) |
| module-scope `createSeededRandom()` | 2 (`basic-combat`) |

Largest single id cluster: `parser-en-us/src/english-parser.ts`, 9 sites.

---

## 5. Other in-repo stories

| Story | Clock sites | `Math.random()` |
| --- | ---: | ---: |
| `family-zoo-tutorial` | 15 | 0 |
| `cloak-of-darkness` | 4 | 1 |
| `armoured` | 0 | 1 |
| `thealderman` | 0 | 1 |
| `channel-service-test` | 0 | 0 |
| `concealment-test` | 0 | 0 |

`armoured`'s single site is a d20 combat roll (`src/combat/combat-utils.ts:83`);
`thealderman`'s is a generic array pick; `cloak-of-darkness`'s scuffs a message.

---

## 6. Tree totals

| | Clock sites | `Math.random()` |
| --- | ---: | ---: |
| `packages/**/src` | 172 | 35 |
| `stories/**/src` | 179 | 9 |
| **Total** | **351** | **44** |

ADR-291 scopes 34 `Math.random()` id sites, 3 audio calls, and 4 module singletons. It
scopes **no clock sites except those embedded inside id templates**.

---

## 7. The category ADR-291 misses entirely

`ISemanticEvent.timestamp` is a **required field** — `packages/core/src/events/types.ts:22`,
`timestamp: number`. It is stamped `Date.now()` at **184 sites tree-wide** (79 platform,
105 dungeo), and `engine/src/save-restore-service.ts:333,383` serializes
`event.timestamp` directly into the save file.

ADR-291's D6 is written entirely about event **ids**. The word "timestamp" appears
nowhere in its decisions.

**Consequence: Acceptance 7 — "two runs at the same seed produce byte-identical save
files" — cannot pass no matter how many ids are made deterministic.** 184 wall-clock
milliseconds ride into the serialized event source on every run.

Compounding it, three further clock reads sit in the save path itself:

| Site | What it stamps |
| --- | --- |
| `save-restore-service.ts:235` | the save's own metadata timestamp |
| `save-restore-service.ts:333` | per-event fallback when `event.timestamp` is absent |
| `save-restore-service.ts:429` | turn record fallback |

A save file that records when it was written can never be byte-identical to one
written a millisecond later. Whether that field is excluded from the comparison, made
deterministic, or dropped is a decision ADR-291 never raises.

### 7.1 What this does *not* affect

Grepped `packages/lang-en-us/src`, `packages/text-blocks/src`, and the engine prose
pipeline for `timestamp`: **zero hits**. No timestamp reaches rendered text.

`packages/transcript-tester/src` uses timestamps only to name output files
(`reporter.ts:293,319,347`), never in comparison.

So event timestamps are invisible to rendered-output comparison. They matter for saves
and only for saves.

---

## 8. What each acceptance criterion actually requires

This is the finding that should drive the decision.

| AC | Requires | Scope |
| --- | --- | --- |
| 1. byte-identical rendered output | RNG determinism only | **small** |
| 2. dungeo chain stable at a pinned seed | RNG determinism only | **small** |
| 3. new stream doesn't shift others | the authority | **small** |
| 4. save/restore every stream | D4 persistence | **small** |
| 5. pre-ADR save reads forward | D4 reader | **small** |
| 6. gate fails on `Math.random()` in both roots | 44 sites converted | **medium** |
| 7. **byte-identical save files** | **351 clock sites + 44 random + a save-metadata ruling** | **large** |
| 8. no nondeterministic token in rendered output | via AC-1 | **small** |
| 9. seed reported in all four modes | the runner | **small** |
| 10. `--sweep N` per-seed results | the runner | **small** |
| 11. `--play` seed round-trips | runner + engine | **small** |
| 12. rejections are named failures | the authority | **small** |
| 13. `stream()` idempotence, snapshot round-trip | the authority | **small** |

**Twelve of thirteen criteria are reachable without touching a single timestamp.**

Acceptance 7 alone requires the 351-site sweep, and Acceptance 6 requires 44 of them.
Everything else needs the authority, the persistence change, the runner flags, and
eight dungeo edits.

---

## 9. The decision this forces

ADR-291 currently bundles two efforts of very different size and very different value,
and the bundling is what turned every review pass into a scope correction.

**Effort A — reproducible execution.** The authority, named streams, D4 persistence,
retiring 6 singletons/fallbacks, 8 dungeo edits, the runner flags, seed reporting,
`[SEED: N]`. Satisfies AC 1–5 and 8–13. Delivers the thing the ADR was written for: a
walkthrough chain that stops swinging 892 → 982 → 11533, and a seed that reproduces a
reported failure.

**Effort B — byte-identical artifacts.** Deterministic ids and timestamps across 351
clock sites and 44 random sites in two roots, the `Math.random()` gate, and a ruling on
the save file's own metadata stamp. Satisfies AC 6 and 7.

B is roughly an order of magnitude more mechanical churn than A, and A does not depend
on it. A's value is immediate and is what unblocks ADR-290's successor. B's value is a
testing technique — byte-comparable saves — that nothing currently needs.

**Recommendation: split them.** Land A as ADR-291. Move AC 6 and 7, D6's id rule, and
the gate into a successor ADR scoped by this inventory. That successor can then be
written with the real number in front of it rather than discovering it in phase 3.

If they stay bundled, the honest thing is to restate D6 and Acceptance 7 at 351 sites
and accept that ADR-291 is a multi-week sweep before the flake it names gets fixed.

---

## 10. Incidental finding — a dungeo bug, unrelated to ADR-291

`stories/dungeo/src/actions/ring/ring-action.ts:141`:

```ts
world.setStateValue('dungeo.exorcism.bell_rung_turn', Date.now());
```

A value named `_turn` holding a wall-clock millisecond. It is written to world state,
so it serializes into saves, and any comparison against a real turn number is wrong by
roughly 13 orders of magnitude. Should be filed separately — it is a correctness bug
today, not a determinism concern.

---

## 11. Open decisions

Carried from the review passes, unresolved, and now informed by the numbers above.

1. **Split or bundle** (§9). The only decision that changes what gets built next.
2. **B3 — acquire or receive?** D5 says dungeo's combat sites acquire
   `story:dungeo/melee`; D2a's table says they receive a stream as a parameter. These
   imply different independence properties: a received stream is the caller's
   (engine `npc`), so an NPC behavior that draws once would shift every melee roll —
   the coupling D3 exists to prevent. Likely resolution is setup-time wiring that
   passes an acquired stream downward, but it needs to be stated.
3. **The scheduler stream is shared.** Three of dungeo's four gameplay coins would land
   on `SchedulerContext.random`, shared with every daemon and fuse. Deterministic, but
   adding a daemon that draws shifts the bat's destination. Accept, or per-daemon
   streams?
4. **The save's own metadata timestamp** (§7). Excluded from comparison, made
   deterministic, or dropped — only matters if Effort B proceeds.
5. **Where the per-session id counter lives**, if Effort B proceeds. 19 dungeo
   generators hold module-local counters that never reset; 20 story-local generator
   functions would all need to reach a shared one.

---

## Appendix — reproducing these counts

```bash
# dungeo clock sites by shape
find stories/dungeo/src -name "*.ts" ! -name "*.test.ts" \
  | xargs grep -h "Date\.now()" \
  | grep -v "^\s*\*" | grep -v "^\s*//" \
  | sed 's/^ *//; s/Date\.now()/CLOCK/g' | sort | uniq -c | sort -rn

# platform clock sites
find packages -path "*/src/*" -name "*.ts" ! -name "*.test.ts" \
  ! -path "*/node_modules/*" ! -path "*/dist*" \
  | xargs grep -h "Date\.now()" | grep -v "^\s*\*" | grep -v "^\s*//" | wc -l

# Math.random by file, both roots
grep -rn "Math\.random()" --include="*.ts" packages stories \
  | grep -v node_modules | grep -v "dist" | grep -v "\.test\." \
  | grep -vE "^[^:]+:[0-9]+: *(\*|//)" | sed 's/:.*//' | sort | uniq -c | sort -rn
```
