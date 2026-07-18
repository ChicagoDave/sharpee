# ADR-233: Chord Go-Live Gate — what "ready for outside authors" means

## Status: DRAFT (4 open questions)

## Date: 2026-07-17

## Context

David asked whether Chord is ready to go live (session 1befbd, after
ADR-231 closed the player-surface contracts). Assessment: the language
core is launch-quality — refusals render as authored, dotted keys at
every key site, `starts <state>`, word-level matching, free-text
topics, all fixture/harness-verified (phrasebook 68/68 byte-identical,
chord-language harnesses 45/45 + 64/64, friendly-zoo runs as a full
Chord story). The product around the language is not ready:

1. **Parity holes.** Verified live 2026-07-17: `create the oak door /
   a door` still throws a LoadError — the most basic IF furniture
   fails to load. The availability audit
   (`docs/work/stdlib-reference/chord-availability-audit.md`) stood at
   42/49 actions reachable and is stale in both directions (several
   gaps closed by ADR-230/231, others untouched); its parts 2–4
   (daemons, plugins, browser emits) were never audited.
2. **No outside-author path.** The globally-installed `sharpee` for
   authors outside this repo (ADR-180 Phase U2) was never delivered;
   the outside pipeline (install → write `.story` → build → play) is
   unproven.
3. **No front door.** The site is TS-first (ADR-232 DRAFT, parked as a
   larger design effort), the playground (ADR-191, amended
   Chord-default) is unbuilt, and no Chord *tutorial* exists —
   chord-language.md is a reference; the only narrative on-ramp
   (Family Zoo) teaches TypeScript.
4. **Release hygiene.** `repokit verify`'s publish dry-run is blocked
   pending the next version bump (known parked item).

## Decision

**Chord goes live when the four gates below all hold.** Each gate is
assertable; no gate may be satisfied by narrowing its claim (the
no-scope-reduction rule of the parity north star applies).

### G1 — Parity floor

- The availability audit is re-run against the current platform (all
  four parts: actions, daemons, plugins, browser emits) and committed
  as the refreshed parity map.
- `a door` loads from Chord and behaves (open/close/lock via existing
  traits) — design-heavy, expected to need its own child ADR.
- The audit's mechanical quick wins (trait adjectives on the
  closed-list model: `enterable`, `climbable`, drinkable-class) are
  closed or individually ruled out by David — no silent deferrals.
- Design-heavy remainder (capability-dispatch verb exposure, the
  extension surface) is explicitly dispositioned: in-gate, or
  ruled post-launch by David with the ruling recorded here.

### G2 — Outside-author pipeline

- A user on a clean machine (no repo checkout) can install the author
  tool, scaffold a story, write `.story` source, build, and play it in
  the browser client — the ADR-180 Phase U2 delivery, proven by a
  scripted end-to-end run in CI or a documented manual protocol
  executed at least once per release.

### G3 — Author-facing front door

- ADR-232 (Chord-first site restructure) executed.
- ADR-191 Phase 1 (Chord playground, no-wasm) live on the site.
- One narrative Chord tutorial exists (reference ≠ tutorial) and is
  linked from the front door.

### G4 — Release hygiene

- Version bumped; `repokit verify` fully green including the publish
  dry-run; the published npm packages are the ones the playground and
  tutorial reference.

**Explicitly NOT in the gate:** the Chord-Zork completeness matrix
(P1–P33 + melee) — that remains the post-launch north star; go-live
needs a door to open, not a dungeon to finish.

## Consequences

- Go-live work decomposes into: audit re-run (session-sized), a door
  ADR (child of this one), quick-win trait adjectives (ratchet
  entries), U2 delivery, ADR-232 execution, playground Phase 1, one
  tutorial, and a release. Each is plannable independently; this ADR
  is the umbrella and is never implemented directly (ADR-first
  policy) — children carry the work.
- ADR-232 stops being fully parked: it is now gated work, on whatever
  schedule David sets for it.
- Until all gates hold, public positioning stays "Chord is coming" —
  no announcement that invites outside authors into the unproven
  pipeline.

## Session

Session 1befbd (2026-07-17, chord-foundations). Drafted from the
go-live assessment David requested after ADR-231's completion; door
LoadError and audit staleness verified live before drafting.

## Open Questions

### Q-1: Door loading design — child ADR scope?
- **Why it matters**: doors are cross-room entities (two-sided
  placement, exit binding) — the design decides Chord's syntax for
  the two-room relationship and what the loader builds.
- **Blocks**: G1's door criterion.

### Q-2: Capability-dispatch verbs and the extension surface — in-gate or post-launch?
- **Why it matters**: lowering/raising/wave-class verbs and `use
  <extension>` exposure are the design-heavy half of parity; ruling
  them post-launch shrinks the gate materially without breaking the
  no-scope-reduction rule only if David rules it explicitly.
- **Blocks**: G1's disposition line.

### Q-3: What is the launch tutorial?
- **Why it matters**: a Chord port of Family Zoo (canon exists,
  transcripts exist) vs a new small story written for teaching — cost
  and voice differ.
- **Blocks**: G3.

### Q-4: Is the playground a hard G3 gate or a fast-follow?
- **Why it matters**: ADR-191 Phase 1 is small but nonzero; launching
  with reference + tutorial and adding the playground a week later is
  a defensible sequencing if David prefers speed.
- **Blocks**: G3's final shape.
