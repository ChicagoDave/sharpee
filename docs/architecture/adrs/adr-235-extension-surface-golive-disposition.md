# ADR-235: Extension Surface — Go-Live Disposition (adopts ADR-215/216) & Behavior-Hatch Resolution

## Status: ACCEPTED (2026-07-17 — all three open questions ruled by David, session 615882; adr-review 14/14 pre-flip)

## Date: 2026-07-17

## Parent: ADR-233 (go-live gate G1, Q-2 ruled in-gate 2026-07-17). Adopts: ADR-215 (extension-use surface & combat, ACCEPTED), ADR-216 (emit payload & media, ACCEPTED).

## Context

ADR-233's Q-2 ruling put the extension/plugin opt-in surface IN the
go-live gate: "its child ADR ... is drafted and interviewed before
launch. Implementation scope is decided by that child ADR, not
assumed here."

The 2026-07-17 parity audit (Part 3) established the current facts:

- **The design already exists and is ruled.** ADR-215 (ACCEPTED
  2026-07-14, six questions interviewed) specifies the whole opt-in
  mechanism: top-level `use <extension>` (one per shipped extension),
  static vocabulary manifests merged into the catalog at compile time
  (analyzer stays platform-free), `combatant`/`weapon` adjectives with
  typed `with`-stats, NPC plugin auto-wired as core (no `use npcs`),
  `use state-machines` gating only the ADR-119 depth, a runtime-bundled
  trusted registry (a `use`-only story stays pure IR), and the
  channel+renderer contribution leg that closes ADR-216's renderer
  caveat. ADR-216 (ACCEPTED) covers emit payloads, media sugar, and
  custom-channel declaration.
- **Zero implementation has landed** for either ADR. Today the loader
  registers only `SchedulerPlugin` (and only when daemons exist);
  `NpcPlugin` and `StateMachinePlugin` are never registered for a
  Chord story; there is no `use` token anywhere in the
  lexer/parser/EBNF; systemic combat (`registerBasicCombat`) is
  unreachable; every media/audio channel is unreachable (dotted event
  types don't even lex).
- **Defect D2 (audit): the behavior hatch is dead code.**
  `define behavior <name> from "<module>"` parses, binds, and
  shape-validates into `boundBehaviors` — which nothing ever reads. It
  cannot fire, and structurally never could: the declaration carries
  only a NAME — no trait key and no action id — so the loader has
  nothing to register it under (ADR-090 registration needs both). The
  binding half of the design was never specified.

Re-drafting the extension surface would re-litigate ADR-215's six
resolved questions. What the gate actually needs from this child ADR
is **disposition**: adopt the accepted design, resolve D2, decide how
much implementation go-live requires, and record the adjacent gaps
that are explicitly NOT this surface.

## Decision

### D1 — ADR-215/216 stand as the design; this ADR adds none

ADR-215's rulings are adopted unchanged for the gate; nothing here
reopens them. Re-verified against the refreshed audit: the audit's
Part 3 findings change nothing in kind — they confirm the gap
ADR-215 was written to close (NPC auto-wire ruled but undelivered;
`use` absent; combat unreachable). The single design-level delta
since ADR-215 is favorable: scripted narrative combat (`on attacking
it`) was verified live, so `use combat` gates only *systemic* combat,
exactly as designed.

### D2 — The behavior hatch is REMOVED (resolves audit Defect D2; ruled by David 2026-07-17, session 615882)

`define behavior <name> from "<module>"`
leaves the grammar — a parse error with a fix-it naming the two live
paths: in-language `define trait <name>` with `on <verb> it` clauses
(pure IR, the audit's "strong CAN story" — including the
capability-dispatch verbs via `define action <verb>` shadowing), or a
full `define action <name> from "<module>"` hatch (ADR-210 AC-4
impure profile) when real TypeScript is required. Rationale:

- It has never worked and never had a complete design (no binding
  surface), so removal breaks nothing — zero stories, zero fixtures.
- Both hatch-legitimacy shapes (design.md §5.6) stay covered:
  Sharpee-API hatches still exist (`define text from`, `define action
  from`); systemic trait/behavior bundles are exactly what ADR-215
  `use` extensions deliver without author code.
- Completing it instead would mean designing the missing binding
  grammar (`define behavior X for <trait> on <verb> from …`) for a
  need no story has exhibited — speculative surface, against Given 7's
  economy.

The removal is a ratchet entry (this ADR carries the draft; lands
with implementation).

### D3 — Implementation scope for the go-live gate: **S3, the full adopted design** (ruled by David 2026-07-17, session 615882)

Go-live requires the WHOLE adopted design implemented and green:

- **The `use` mechanism**: `use` token, static-manifest merge into the
  catalog, trusted runtime registry, pure-IR preservation — proven by
  `use combat` end-to-end (ADR-215 AC-1..AC-3: systemic combat with
  `combatant`/`weapon` + typed `with`-stats).
- **NPC auto-wire** (ADR-215 AC-4): `a person` gains NpcTrait; the
  behavior library (`guard`, `wanderer`, `follower`, `patrol`) becomes
  composable vocabulary with its `with`-data params; existing stories
  compile unchanged. `use state-machines` admits the ADR-119 depth.
- **The ADR-216 emit/channel leg**: dotted event types lex, `emit`
  carries payloads, media sugar, custom-channel declaration, and the
  extension renderer-contribution leg.

Considered slices S0 (design-only) / S1 (use+combat) / S2 (+NPC) were
rejected — the gate takes the full surface. This is the largest
remaining go-live workstream; it needs its own implementation plan
(multi-session), sequenced ahead of ADR-233 G4.

### D4 — Adjacent gaps that are NOT this surface (recorded, not closed)

- **Off-stage/regional recurring daemons** (audit Part 2 finding: no
  story-global daemon surface exists today; every recurring clause is
  entity-owned and presence-gated). David's direction (2026-07-17,
  session 615882): implement **areas** — a named list of rooms that
  can carry an attached daemon, so regional simulation (weather over
  the outdoor rooms, a background clock in the mansion) belongs to
  the area. A story-level daemon is NOT ruled out — the author
  creating one remains an open design possibility for the same
  conversation. The platform already ships the structural half of
  areas (ADR-149 regions: `RegionTrait` with nesting + ambient data,
  `createRegion`/`assignRoom`/`isInRegion`/`getRegionCrossings`,
  dungeo + going.ts as live consumers); what doesn't exist is any
  Chord surface for regions and the daemon-attachment leg (presence
  semantics over a room set — or the whole story). **Ruled IN the
  go-live gate, design AND implementation** (David, 2026-07-17,
  session 615882): areas get their own child ADR (+ interview) and
  follow-on implementation plan, sequenced before ADR-233 G4 — but
  the design itself is that ADR's work, not this one's (not
  extension-shaped). Recorded in ADR-233 G1.
- **Topic surface for asking/telling** (audit ⚠️): a conversation
  design question on the core language, not extension-shaped;
  explicitly out of this ADR, needs its own design conversation.
- **Scheduler imperative gaps** (Part 2's seven standing items:
  cancel, inline delay, data-driven delays, period timers, reschedule,
  auto-cleanup, priority): out of scope here; the audit records them.
- **Third-party/author-supplied extensions**: stay deferred per
  ADR-215's own scope ruling.

### D5 — Acceptance criteria

- AC-1: the behavior hatch removal lands in code — the parse error +
  fix-it exists, `boundBehaviors` and its binding path are deleted,
  and the ratchet entry is logged.
- AC-2: the full S3 slice is implemented and green per the adopted
  ADRs' own ACs — ADR-215 AC-1..AC-4 and ADR-216's acceptance
  criteria — before ADR-233 G4 (release) runs.
- AC-3: the audit's Part 3 rows are updated to the post-ruling state
  (no row left claiming "no opt-in surface" once one ships, no row
  silently upgraded before it does).

## Consequences

- G1's design-heavy remainder line is fully dispositioned: doors
  (ADR-234), extension surface (this ADR adopting ADR-215/216), and
  the mechanical shortlist (closed 2026-07-17) cover everything Q-1/
  Q-2 ruled in-gate.
- The behavior hatch's removal shrinks the hatch surface to `text` +
  `action` — both legitimacy shapes intact, one dead form gone, and
  the hatch-count language-gap metric stops carrying a phantom entry.
- The go-live implementation burden for extensions becomes an explicit
  ruled slice — **S3, the full ADR-215/216 design** — instead of an
  ambient "215/216 someday"; ADR-233 G4 (release) sequences after it.
- The gate GREW by David's rulings: two new launch workstreams exist —
  the ADR-215/216 implementation plan (S3) and the areas child ADR +
  implementation plan (D4). Both are multi-session; G4 waits on both.

## Session

Drafted 2026-07-17, session 615882 (chord-go-live plan Phase 5), from
ADR-233's Q-2 ruling (session f5c22c). Code grounding this session:
loader hatch binding (`boundBehaviors` write-only), SchedulerPlugin
conditional registration, absence of `use` in lexer/parser, ADR-215/216
full re-read, design.md §5.6 hatch-legitimacy contract, audit Parts
2–4 (2026-07-17 re-run).
