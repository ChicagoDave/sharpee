# ADR-263: Standard meters — hunger and sanity (and the state pattern for personality & reputation)

## Status: ACCEPTED (2026-07-24, session 7f133e) — two first-party *continuous-meter* systems, **hunger** and **sanity**, each a trusted extension with domain-native Chord syntax lowering to the ADR-262 crossing engine; and a documented recommendation that the *discrete* stats — **personality**, **named reputation** — use existing `states:` / `define machine`, needing no new construct. Hunger is ADR-262's real-path forcing function. Q-1 resolved (hunger ships first as 262's real-path gate; sanity is a fast-follow, not blocking). Q-2 resolved (hunger's surface is thin — `use hunger` + plain `<band> at <n> says <key>` rungs; flavor lives in the author's band names and phrases). Q-3 resolved (eating reuses stdlib's `if.event.eaten` + `nutrition` via an event handler; missing nutrition = zero). Q-4 resolved (sanity's madness is a numeric counter — a new Chord primitive spun off to **ADR-264** — with `use sanity` the concept surface over it; A + B compose). All Open Questions resolved via `adr-interview`; `adr-review` 11/15 → **15/15** after six fixes (extension homes + registry/manifest/gate named in a new D4; hunger's decay and `fatal` re-pointed to the existing `on every turn` daemon and `kill the player` statement rather than invented; the decay-daemon vs 262-watcher conflation split; severity save/restore added; sanity acceptance #4 marked ADR-264-gated; `fatal` clarified as a raw trigger, not a band). Awaiting the ACCEPTED flip. Not implemented.

## Parent: ADR-262 (the banded-scalar crossing engine) — hunger and sanity are its second and third consumers; scoring was the first. Follows ADR-215 (trusted extensions, `use`-gated), ADR-119 (state machines — the tool D3 points personality/reputation to), ADR-261 (the `use scoring`/`rank` sugar these mirror), ADR-254 (kebab story keys). ADR-262 D8 draws the continuous/discrete line this ADR applies. **ADR-264** (generic numeric counters) is spun off from this ADR's Q-4 and is a prerequisite for the *sanity* fast-follow (not for hunger).

## Date: 2026-07-24

## Context — verified, not assumed

ADR-262 D8 splits banded concepts by whether a continuous number moves underneath. Applying it to the
owner's list:

- **Continuous** (a scalar sweeps, band crossings are implicit): **hunger** (satiety/severity moves
  every turn), **sanity** (madness accrues from events). These want a first-party system *and* the
  ADR-262 engine, and none exists — an author wanting hunger today drops to a TypeScript hatch.
- **Discrete** (named states, changed on events, nothing sweeps): **personality** (introvert /
  ambivert / extrovert), **named reputation** (unreliable / mercurial / reliable / …). Verified
  already expressible: `states:` on the owner (Chord language ref §2.7) or `define machine`, whose
  `onEnter` effect emits the transition line (`plugin-state-machine/src/types.ts:35,202`). These need
  **no new construct** (D3).

This ADR builds the two that are missing and documents the two that are not.

## Decision

### D1 — `use hunger`: a depleting satiety meter over the ADR-262 engine

A trusted extension (ADR-215, `use`-gated). The surface is deliberately **thin — `use hunger` plus
plain threshold lines**; the flavor lives entirely in the author's band names and `says` phrases, not
in bespoke keywords:

```story
use hunger
  grows 1 each turn                     # severity accrues; the daemon ADR-262 rides on
  peckish  at 30 says feeling-peckish
  hungry   at 60 says stomach-growls
  starving at 90 says the-gnawing
  fatal at 100
```

The rungs are plain — `<band> at <n> [says <key>]`, the same shape as a `rank` rung minus the leading
keyword. Severity is modelled **rising** (worse = higher `at`), so the bands read worsening top-to-bottom
and the ADR-262 rise-only announce fits without inverting. What makes `use hunger` hunger rather than a
generic meter is *not* vocabulary — it is two mechanics beyond banding, **each lowering to an existing
Chord construct, not a new one** (the same reuse discipline as eating):

- **`grows N each turn`** lowers to an **`on every turn` daemon** (language ref §3). This daemon is a
  *distinct* plugin from the ADR-262 crossing watcher: the daemon **moves** the severity counter, then
  the watcher **observes** the crossing and announces — the engine never drives decay.
- **`fatal at N`** lowers to the existing **`kill the player when <severity ≥ N>`** statement (§4.7).
  `fatal` is a raw-value death trigger, **not** a band — it sits above the top band (`starving at 90`,
  `fatal at 100`), so reaching it kills rather than announces.

The exact mechanic words (`grows`, `fatal`) are plain-functional, not a flavor decision — the author's
`peckish` / `the-gnawing` carry the voice. The **severity counter is save state**: `use hunger`
persists it via the extension's `getState`/`setState`, so a reload does not reset the player to full.

**Eating reuses stdlib, no keyword.** `use hunger` registers an event handler (ADR-052) on
`if.event.eaten` — the event stdlib's eating action already emits, carrying `nutrition?: number`
(`eating-events.ts:18,60`) — and lowers severity by that amount. Eating a 40-nutrition ration drops
hunger 40; the author's only job is marking food with nutrition, which is existing stdlib content, so
hunger recovery composes with any food the story defines without the meter knowing specific items.
**Missing `nutrition` counts as zero** — unmarked food does not fill you, an honest, visible symptom
rather than an invented portion.

Recovery is a *fall* — silent under ADR-262 D5's rise-only default, which is usually right (you do not
announce every bite); an explicit "you feel better" is the author's `on` clause.

### D2 — `use sanity`: an event-driven madness meter over the same engine

```story
use sanity
  starts sound                          # no per-turn decay; madness accrues from triggers only
  shaken  at 30 says unsettled
  reeling at 60 says grip-slipping
  broken  at 90 says the-abyss
```

Sanity differs from hunger in its *source*: it does not ebb on a clock; the author raises it from `on`
clauses when horrors are witnessed. That author-driven raise surfaced a real gap — **Chord has no
generic numeric counter** (`award` is dedup-by-identity, not additive; `change` moves named states;
nothing raises a plain number). So sanity's madness is a **numeric counter — a new Chord primitive,
spun off to ADR-264 (B)** — and the author raises it with that primitive's generic mechanism
(`raise madness by 15`); `use sanity` (A) is the concept surface — bands, `fatal`/effects — over that
counter. A and B compose: B is the number, A is the meter on it. This also means hunger's severity,
the score, and madness are the same kind of thing underneath.

Otherwise sanity is identical to hunger: bands over the ADR-262 engine, the four announce modes,
`silent` common (a hidden sanity meter that only gates endings). Bottom-band effects (unreliable
narration, locked actions) are the author's `on broken …` handlers over ADR-262's crossing event —
not built here.

### D3 — Personality and reputation are documented patterns, not new constructs

Both are discrete named states. The recommended, already-working expression:

```story
create the innkeeper
  states: introvert, ambivert, extrovert     # discrete; onEnter/after-change speaks the shift
  after chatting with the player
    change to extrovert when the innkeeper is ambivert
    phrase warms-up                            # the transition announcement
```

Reputation standings (`unreliable` / `mercurial` / `reliable` / …) the same way. **When the concept
is really an accumulating number** — reputation earned point-by-point across many interactions until
it crosses a threshold — the author instead builds it as a `use scoring`-style meter over the
ADR-262 engine; the dividing test is ADR-262 D8. This ADR does not add `use personality` or
`use reputation`; it records why they are unnecessary and shows the pattern in author docs.

### D4 — Homes and plumbing, mirroring `use scoring`

Each meter is a trusted extension following ADR-215 / ADR-261 D1 — the machinery, spelled out:

- **Package**: `packages/extensions/hunger` and `packages/extensions/sanity`, siblings of
  `basic-combat` / `scoring` / `conversation` (verified the directory).
- **Registry**: an `EXTENSION_REGISTRY` entry in `@sharpee/story-loader`. `registerWorld` installs the
  `if.event.eaten` handler and the `kill the player` death hook; `registerPlugin` installs both the
  `every turn` decay daemon and the ADR-262 crossing watcher (two plugins, D1).
- **Manifest + gate**: a chord-side `HUNGER_MANIFEST` / `SANITY_MANIFEST` (no trait adjectives), pinned
  to the registry by the manifest-conformance test; `use hunger` / `use sanity` gates the construct, and
  the rungs/mechanics without the `use` are a parse/load error — the two-layer shape of `define machine`
  and `use scoring`.
- **Version**: `use hunger` / `use sanity` are new grammar, so `chord.ebnf` changes → the EBNF pin +
  Chord language bump (ADR-261 D8), in one commit.

### D5 — Hunger is ADR-262's forcing function and real-path test

Hunger's scalar is nothing like the score — it decays via an `on every turn` daemon, is bounded, ties
to eating, and kills via `kill the player` (D1) — so a working `use hunger` played through
`dist/cli/sharpee.js` proves the ADR-262 engine is genuinely scalar-agnostic, not score-shaped (ADR-262
acceptance #7).

**Build order: hunger first, sanity as a fast-follow in this ADR.** This ADR *specifies* both so the
design is coherent and sanity is not an afterthought, but hunger builds and ships first (it is
ADR-262's real-path gate), and sanity follows. Sanity's only genuinely-new part is its raising
primitive (Q-4), so hunger's build **does not block on Q-4** — that question may stay open a beat
longer without holding up the engine's validation.

## Acceptance

1. `use hunger` compiles behind its gate; its bands lower to the ADR-262 engine; severity accrues per
   turn and reaching a band announces per the selected mode.
2. A single large accrual (a starvation spell) crossing multiple hunger bands reports each elevation
   (ADR-262 D2/D6) — the multi-band invariant, exercised on a non-score scalar.
3. Eating a food item emits `if.event.eaten`; the hunger handler lowers severity by its `nutrition`
   (missing = zero), and the fall does not announce (rise-only, D1); crossing back up later announces
   again.
4. `use sanity` compiles; madness raised from an `on` clause crosses bands and announces; `silent`
   mode tracks it with no output while `on broken` logic still fires. **(Depends on ADR-264's
   `raise … by N`; not attempted before 264 lands.)**
4a. Hunger's severity survives save/restore: raise it, save, load into a fresh session, assert the
   severity and current band are unchanged (D1's `getState`/`setState`).
4b. `fatal at N` kills: drive severity to N and assert `kill the player` fires (not a band
   announcement).
5. Personality-as-`states:` announces a transition via `onEnter`/`phrase` with **no** new construct —
   asserted as the documented pattern, not platform code.
6. **REAL-PATH**: a story with a `use hunger` meter builds and plays through `dist/cli/sharpee.js`;
   the player starves across bands and each elevation prints (satisfies ADR-262 #7).

## Consequences

**Gained.** Survival and horror IF become writable in pure Chord — no TS hatch for a hunger or sanity
meter. Two real consumers keep the ADR-262 engine honest and scalar-agnostic. The discrete stats are
sent to machinery that already exists, so the library stays two systems, not four.

**Lost / cost.** Two new gated extensions to build, document, and version (Chord grammar → EBNF pin +
language bump). Hunger's decay daemon and `eating` tie-in are genuinely new mechanics, not just
banding — real surface beyond the engine.

**Spun off.** Sanity's raising surfaced that Chord has no generic numeric counter — **ADR-264** now
owns that primitive (declaration, `raise … by N`, save/restore, use in conditions). Sanity's fast-follow
build depends on it; hunger does not (its counter is system-internal). 264 is a foundational language
addition and gets its own design/interview, not a fold here.

**Not addressed.** Thirst/fatigue/warmth (further survival meters — same shape as hunger, deferred
until wanted); per-NPC continuous meters; reputation-as-accumulator's exact surface; bidirectional
recovery announcements (ADR-262 D5).

## Session

Session 7f133e (2026-07-24). The owner's concept list (hunger, sanity, reputation, personality),
sorted by ADR-262 D8's continuous/discrete line, split cleanly: two need building, two already work.
Kept in one ADR per the owner's "these should all live in one ADR," with personality and reputation
present as documented patterns rather than constructs.
