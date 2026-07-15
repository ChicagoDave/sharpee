# ADR-225: The Standard IF Parser / Meta-Verb Layer

## Status: ACCEPTED (2026-07-15 — all three open questions resolved via interview, accepted by David; adr-review clean)

> Child of ADR-214 (parity). A **SHARPEE-GAP** (platform-side) surfaced by the
> 2026-07-15 Dungeo capability audit (`sharpee-chord-capability-matrix.md`, row
> #20): a cluster of standard IF parser conveniences and meta-verbs that MDL Zork
> has and the platform lacks. These are **not** Chord-language questions — they
> live in `stdlib` / `parser-en-us` / `engine` / `lang-en-us` and benefit **every**
> story on both authoring Ways. Grouped into one ADR per ADR-222's related-seams
> rule.

## Date: 2026-07-15

## Context

The vocabulary auditor tested MDL Zork's player-facing verbs and parser behavior
empirically against `--play` and found a coherent set the platform is missing.
None are story content; all are platform:

- **`take everything` is a bug.** `lang-en-us/language-provider.ts` declares
  `allWords: ['all','everything','every']`, but the parser consumer
  (`entity-slot-consumer.ts`) hardcodes the literal `'all'` — the declared
  synonyms are never read. Small, and a correctness fix, not a feature.
- **Postposed particles** — `pick mat up`, `put mat down` both fail; only the
  prefix forms (`pick up X`) are defined. The grammar compiler already supports
  literal-after-slot, so these are additive patterns.
- **`FIND` / `WHERE IS`** — no locate-across-scope meta-action exists (the
  `searching` action is search-inside/under, different).
- **`OOPS`** — no retention of the last-rejected token, no splice-and-re-dispatch.
- **Missing-object orphaning** — `take` → "Take what?" → answer completes the
  command. Only multi-candidate disambiguation exists today (`AMBIGUOUS_ENTITY`).
- **`VERBOSE` / `BRIEF` / `SUPERBRIEF`** — the IDs are *reserved* in the stdlib
  meta-registry but no grammar wires them and no room-description-verbosity logic
  exists; the real cost is visited-room tracking + description suppression.
- **`comma-address`** — `ROBOT, GO EAST` can't be expressed: a grammar pattern
  can't start with a slot (the engine anchors verb semantics to the first token).

Per ADR-214 §1a these are SHARPEE-GAPs on the platform side: fixing them makes
both the Sharpee Way and the Chord Way (and every story) better at once.

## Decision

Implement the standard IF meta-verb / parser-ergonomics layer as platform work,
by owning layer:

- **`lang-en-us` (wiring / bug):** thread `allWords` into the parser consumer so
  `everything`/`every` work (fixes `take everything`).
- **`parser-en-us` (grammar + grammar-engine):** postposed-particle patterns
  (additive, small); slot-initial patterns for **comma-address** — the *grammar*
  half only (verb anchoring must tolerate an address prefix); the command *routing*
  stays ADR-223's commandable-NPC surface (Q-1 resolved 2026-07-15 — 225 provides
  the form, 223 receives the order), so there's no duplicate order-routing path
  (medium-large); the `OOPS` last-token retention.
- **`stdlib` (meta-actions):** `FIND`/`WHERE IS` locate meta-action;
  `VERBOSE`/`BRIEF`/`SUPERBRIEF` mode-setting actions.
- **`engine`:** missing-object orphaning (a new query source that stores a partial
  command and completes it from the answer — the disambiguation resume path is a
  partial precedent); `VERBOSE`/`BRIEF` visited-room tracking + room-description
  suppression (the real cost of that item). **Semantics (Q-3, 2026-07-15 — modern
  deterministic):** BRIEF = long on first visit, short on revisit; VERBOSE = always
  long; SUPERBRIEF = always short. No RNG in room display (transcript/replay-safe);
  MDL's ~20%-random-long-on-revisit is a story-level override, not the platform
  default.

These have **no Chord-language surface** — they are the platform's standard
parser behavior, available to any story regardless of authoring Way.

## Consequences

- **Every story benefits**, on both Ways — this is platform polish, not Dungeo
  completion.
- Blast radius varies: `take everything` (small/bug), postposed particles + FIND
  (small), OOPS + orphaning (medium, engine), VERBOSE/BRIEF (medium-large, visited
  tracking), comma-address (medium-large, grammar-engine). **Priority order** (Q-2,
  2026-07-15): `take everything` → postposed particles → FIND → OOPS → orphaning →
  VERBOSE/BRIEF → comma-address (naturally last — gated on ADR-223's routing). The
  exact v1/v2 cut is an **implementation-plan decision, not ADR-level**.
- Platform change under CLAUDE.md's stdlib/parser/engine discussion gate; no code
  authorized. ACs land as tests when implemented.

## Acceptance Criteria

Inherits ADR-214 AC-1..4 (both Ways / every story benefits). Concrete ACs, landing
as tests when implemented:

- **AC-1 (`take everything` — the bug).** `take everything` and `take every` select
  the same set as `take all`; the declared `allWords` synonyms are consulted, not
  the hardcoded `'all'`.
- **AC-2 (postposed particles).** `pick mat up` and `put mat down` parse to the same
  actions as `pick up mat` / `put down mat`.
- **AC-3 (`OOPS`).** After "I don't know the word 'X'," `oops <word>` re-runs the
  prior command with the correction spliced in.
- **AC-4 (verbosity, deterministic).** Under BRIEF a room prints its long
  description on first visit and short on revisit; VERBOSE always long; SUPERBRIEF
  always short — and the same transcript run twice yields identical output (no RNG).
- **AC-5 (comma-address, cross-ADR).** `ROBOT, GO EAST` parses via the 225
  slot-initial grammar and routes to the robot through ADR-223's commandable-NPC
  surface — one order-routing path, not a duplicate.

## Session

Session 5c4f8a (2026-07-15). Surfaced by the Dungeo MDL capability audit
(`docs/work/schism/sharpee-chord-capability-matrix.md` #20, PLATFORM-5). Parent:
ADR-214 (§1a, SHARPEE-GAP class). Precedent: ADR-213. Related: ADR-087 (grammar
patterns), ADR-223 (comma-address may re-home here — OQ-1).
