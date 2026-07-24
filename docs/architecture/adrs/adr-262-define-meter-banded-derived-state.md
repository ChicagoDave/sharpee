# ADR-262: The banded-scalar crossing engine — scoring, generalized

## Status: ACCEPTED (2026-07-24, session 7f133e) — an internal platform engine for *banded derived state over a continuous scalar*: derive a band from a value by ascending thresholds, detect crossings, and announce them under four verbosity modes. It is **not** an authoring construct — each metering *concept* keeps its own bespoke Chord surface (scoring's `use scoring`/`rank` is the first) and lowers to this engine. Scoring's hand-rolled rank-watcher is refactored onto it, fixing a shipped multi-band bug. Open Questions resolved via `adr-interview`; `adr-review` 10/16 → **16/16** after five fixes (the engine's home module named — `bandOf` in world-model, watcher factory shared; a generic `if.event.band_crossed` event replacing the scoring-specific `rank_risen`; combat health dropped from acceptance #1 as it contradicted D8's own scoping; duplicate-threshold rejection restored; backward-compat named). Awaiting the ACCEPTED flip. Not implemented.

## Parent: ADR-261 (`use scoring` + `ranks`) — the rank ladder is a banded scalar; its watcher becomes this engine's first consumer. Relates to ADR-260 (the scoring extension refactored here), ADR-119 (state machines — the tool for the *discrete* concepts this engine deliberately does **not** cover, D8), ADR-120 (the TurnPlugin model this rides), ADR-190 (list formatter, for `combined`). **ADR-263** is the first library of new consumers (hunger, sanity). **Amends ADR-261 D7** (D3).

## Date: 2026-07-24

## Context — verified, not assumed

Scoring's rank ladder is the platform's first *banded derived stat with a crossing announcement*, and
building it hand-rolled machinery that wants to be shared — but only among a narrow, well-defined set.

**The shipped rank-watcher is duplicated and collapses multi-band jumps.** The watcher
(`extensions/scoring/src/rank-watcher-plugin.ts:41-81`) and the Chord promotion narrator
(`story-loader/src/loader.ts:807-864`) carry near-identical `onAfterAction` bodies, and both emit a
single `rank_risen` on a multi-band jump — a *tested* choice (`rank-watcher-plugin.test.ts:97`,
"skips intermediate rungs"). The owner has since ruled the opposite: **a single accumulation crossing
several bands must report each elevation.**

**The engine's scope is exactly the concepts with a continuous number underneath.** A rank derives
from the score; a health band from hp — the band is recomputed, never stored, so a state machine
(which *stores* and *transitions* a state, `plugin-state-machine/src/state-machine-runtime.ts:73-115`)
is the wrong tool and correctly unused. But **not every "banded" concept has a continuous scalar.**
Personality (introvert / ambivert / extrovert) and named reputation standings are *discrete states*:
you `change` between them on events, nothing sweeps, and `define machine`'s `onEnter` effect already
speaks the transition line (`plugin-state-machine/src/types.ts:35,202`). Verified: Chord's `states:`
(language ref §2.7) plus `onEnter` messages already express those today. **This engine is only for
the continuous case** — score, hunger, sanity — where crossings happen *implicitly* as a number moves,
which is precisely what multi-band iteration is for.

**There is no generic authoring construct, by owner decision.** A generic `define meter … band … over …`
read like configuration and named a thing that, today, only scoring uses. Each metering concept
instead gets domain-native Chord vocabulary over this shared engine (`use scoring`/`rank` is the
model; hunger and sanity follow in ADR-263). The engine is internal; concepts are the surface.

## Decision

### D1 — The engine is internal machinery, not a Chord construct

The platform provides a banded-scalar crossing engine in two **named** pieces:

- **`bandOf(value, ascending-thresholds)`** — a pure lookup, homed in world-model beside `ScoreLedger`
  (ADR-129), replacing the ascending-threshold walk in scoring's `getRank`.
- **the crossing watcher** — a `TurnPlugin` factory in a shared location (`@sharpee/plugins`, or a
  small sibling) that both `@sharpee/story-loader` and `@sharpee/ext-scoring` import. It holds the
  last-announced band, computes the span on each change, and renders it under the D3 modes.

**No `define meter`, no `band`/`over` grammar.** Each concept exposes its own bespoke Chord surface
and lowers to the engine by **registering a watcher via a generic contract**: it supplies a scalar
accessor, the ordered bands, an announce mode, and a phrase lookup. Scoring's rank-watcher is the
first instance of that contract; hunger and sanity (ADR-263) are the next. What an author writes is
always concept-specific (`rank … at … says …`); what runs underneath is always this one engine.

### D2 — One full-span crossing event; "report each elevation" is a data-layer invariant

On a turn the value changes band, the engine emits **one** event carrying the whole path:

The event id is the generic **`if.event.band_crossed`**, discriminated by its `concept` field —
hunger and sanity emit the *same* event, not their own:

```ts
{ concept: 'rank', from: 'amateur' | null, to: 'master',
  bandsCrossed: ['expert', 'master'], value: 550 }
```

`bandsCrossed` lists every band entered this turn, in order. So *every elevation is reported at the
event layer in every mode* — story `on`/`after` logic reading the event sees each crossing regardless
of what is spoken. This replaces the shipped lossy `{fromRank, toRank}` payload of
`if.event.rank_risen` (`if-domain/src/events.ts:132`), which is **retired**: verified nothing consumes
its payload at runtime (only two tests, see Consequences), so `band_crossed` supersedes it rather than
aliasing it.

### D3 — Four verbosity modes govern narration only; silence is explicit (amends ADR-261 D7)

A consumer selects how the one event is *rendered*. Same 0→starving jump across
`peckish`→`hungry`→`starving`:

| Mode | Renders |
|---|---|
| **all** | each crossed band's phrase, in order (default) |
| **collapsed** | only the terminal band's phrase |
| **combined** | one span message from a concept-level phrase (D4) |
| **silent** | nothing — the event still fires; the stat is tracked for logic/examination only |

**Every mode speaks by default**: where the author gave no phrase, the platform renders an
overridable fallback line (a lang-en-us message id, `override message`-able, as combat's
`combat.health.*` are). Silence is therefore never accidental — it comes only from `silent`, which
makes that mode earn its place and the four symmetric. **This amends ADR-261 D7** (which chose
silence-by-default and rejected a lang-en-us default): because ranks run on this engine (D7), a rank
rung without a phrase now speaks the fallback, and the rank-promotion default D7 rejected must exist.
ADR-261 gets a matching amendment.

### D4 — `combined` draws on a concept-level span phrase; the enumerated superset

`all`/`collapsed` speak per-band phrases. `combined` speaks one *span* message from a distinct
concept-level phrase, always author-written and inherently custom, receiving the full span as params
it may use or ignore: `{from}`, `{to}`, `{count}`, `{bands}` (crossed names, joined via the list
formatter, ADR-190). One slot spans bare endpoints ("from {from} to {to}") to full enumeration
("{bands}"). With no phrase, `combined` renders the platform fallback naming the crossed bands.

### D5 — One-directional and derive-not-stored

The engine announces on a **rise** through bands (scoring's rule); a fall is silent. Every continuous
consumer in view — score, hunger severity, madness — ramps one way toward its extreme, so this fits
without a direction axis. (Bidirectional/recovery announcements are a possible later addition; no
current concept forces one — the only bipolar concept, personality, is discrete and out of scope,
D8.) The band is **derived on every read**, never stored; the sole persisted state is the
last-announced band id, for crossing edge-detection across save/restore
(`rank-watcher-plugin.ts:83-91`).

### D6 — The multi-band collapse is fixed on `hatch-scoring`; the old behavior becomes `collapsed`

The shipped watcher's collapse (Context) is corrected: it iterates each band and emits the full-span
event (D2). The old behavior is not deleted — it survives as the **`collapsed`** mode (D3), now a
deliberate choice. `rank-watcher-plugin.test.ts:97` is rewritten to expect the full span, with cases
per mode. This ships regardless of the rest, because the shipped behavior contradicts the owner's
ruling.

### D7 — Scoring is consumer #1; `use scoring`/`rank` stays as sugar

`rank "<name>" at <n> says <key>` (ADR-261) *is* a band over the score scalar. `use scoring` and its
rungs stay as scoring-specific sugar and lower to this engine — kept, not retired, because
`use scoring` also carries the enablement/`no_scoring` meaning the engine has no notion of (ADR-261
D3). The watcher and narrator are rebuilt on the shared engine (D6). Concept surfaces expose the D3
modes their own way (`use scoring, announce <mode>`); the modes themselves are engine-level.

### D8 — What the engine covers, and what stays in existing syntax

The engine is for **continuous scalars only**. The test: *is there a number underneath that moves,
so band crossings happen implicitly?* If yes (score, hunger, sanity) → this engine, via a bespoke
concept surface. If no — the concept is discrete named states you `change` on events (personality,
named reputation) → **existing `states:` / `define machine`**, whose `onEnter` message is the
transition announcement. Nothing new is built for the discrete concepts; ADR-263 documents the
pattern. This is the boundary that keeps the engine small and per-entity out of scope: a per-NPC
discrete stat is `states:` on that entity natively, needing no engine support.

## Acceptance

1. `bandOf(value, ascending-thresholds)` returns the right band across boundaries, and scoring's
   `getRank` is refactored to call it. Combat's `getHealthStatus` is **not** in scope — its thresholds
   are descending (`combat-service.ts:266`) and per-entity, and D8 scopes health out; it may adopt
   `bandOf` later over an inverted scalar, but that is neither required nor gated here.
1a. The engine rejects a band set with **duplicate thresholds** at registration — silently keeping one
   would make the resolved band depend on array order.
2. A value change crossing N bands in one turn emits **one** event whose `bandsCrossed` lists all N.
3. Each mode renders D3 for a 3-band jump — `all` 3 lines, `collapsed` 1, `combined` 1 span line,
   `silent` 0 — and in **every** mode the event from #2 still fires.
4. A band with no phrase speaks the overridable fallback (D3), not silence; `silent` is the only route
   to no output.
5. Derive-not-store: drop the scalar a band, assert the band fell with no stored-band write;
   save/restore mid-range preserves only the last-announced band and does not re-announce.
6. Scoring runs on the engine: a multi-band score jump reports each elevation (D6);
   `rank-watcher-plugin.test.ts` asserts the full span, not the collapsed top rung.
7. **REAL-PATH**: ADR-263's hunger meter — a genuinely different scalar — runs on this engine through
   `dist/cli/sharpee.js`, proving the engine is not score-shaped. (263 is the forcing function.)

## Consequences

**Gained.** The multi-band decision is made once, correctly, in one engine instead of re-derived per
stat. Scoring stops being unique — it is a banded scalar whose value is the ledger. `bandOf`
de-duplicates scoring's and combat's threshold walks. The continuous/discrete boundary (D8) keeps the
engine small and sends personality/reputation to machinery that already exists.

**Lost / cost.** The platform now ships an overridable fallback crossing line (amending ADR-261 D7's
"no platform sentence" stance) so silence is explicit; lang-en-us gains fallback prose, and **ADR-261
needs a matching amendment**. The engine is load-bearing for scoring; a bug in it is a bug in every
consumer.

**Backward compatibility.** The `if.event.rank_risen` → `if.event.band_crossed` id-and-payload change
has **no runtime consumer** (verified). Two tests move: `story-loader/tests/rank-ladder.test.ts:160`
and `extensions/scoring/tests/rank-watcher-plugin.test.ts:69`. The `RANK_RISEN` constant in
`if-domain/src/events.ts:132` is removed in favor of a `BAND_CROSSED` id.

**Constrained going forward.** Continuous banded state has one home; a second `currentIndex ≤ lastIndex`
is a review smell. Discrete banded concepts use `states:`/`define machine`, not this. Per-entity
continuous meters, bidirectional/recovery announcements, and combat-health crossing announcements are
all deferred — none is forced by a current concept.

## Session

Session 7f133e (2026-07-24). Grew from ADR-260/261's review and a long design conversation: an
initial generic `define meter` construct was rejected by the owner as genericizing a broad concept
with one real consumer, in favor of bespoke syntax per concept over a shared engine. Working through
candidate concepts (hunger, sanity, reputation, personality) surfaced the continuous/discrete
dividing line (D8), which dissolved the per-entity and bidirectional questions the generic framing had
raised — leaving the engine as scoring generalized to an arbitrary continuous scalar. The four modes
and "report each elevation" were owner requirements; they exposed the shipped multi-band collapse
(D6) this corrects.
