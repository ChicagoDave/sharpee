# ADR-233: Chord Go-Live Gate — what "ready for outside authors" means

## Status: ACCEPTED (2026-07-17 — all four open questions ruled by David, session f5c22c; adr-review passed post-fix)

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
  traits) via a child ADR — **ADR-234 (chord door loading), ACCEPTED
  2026-07-17, session 615882**; implementation is its own follow-on
  plan. [Q-1 resolved 2026-07-17, session f5c22c]:
  - Two authoring forms ship in the gate: placement on the door
    (`a door between the Kitchen and the Hall`) and exit-line sugar
    (`north to the Hall through the oak door` — reverse side
    inferred, no matching line needed in the far room).
    **[Superseded 2026-07-17, session 615882: David struck the
    `between` placement form while reviewing the ADR-234 draft —
    "between leaves too much inferred (directions)." ONE form ships:
    the exit-line sugar, direction explicit, reverse = opposite
    cardinal. ADR-234 D1 records the ruling.]**
  - Invariant: the door entity's own declaration is identical
    whichever form is used (`a door, lockable with the iron key`) —
    traits stay orthogonal to the two-room relationship.
  - `with key` is dropped from the lockable composition clause as
    redundant (`lockable with the iron key`, not `lockable with key
    the iron key`) — a composition-clause ratchet entry the child ADR
    carries; existing fixtures update when it lands.
  - The general cross-room primitive (`between` on arbitrary
    entities — windows, bridges, pass-throughs) is explicitly NOT in
    the child ADR: David ruled it needs more thinking and gets its
    own design conversation later. The door design must not foreclose
    that generalization (door `between` should remain a compatible
    special case of whatever the future primitive becomes).
- The audit's mechanical quick wins are closed or individually ruled
  out by David — no silent deferrals. Per the 2026-07-17 refreshed
  audit, the mechanical shortlist is: `drinkable`, `concealed`,
  a hiding-spot adjective, bare `cut`/`dig` grammar (SHARPEE-GAP),
  the pushable/pullable loader cases (defect D1), openable tool
  config (D3), and the turning lifecycle row. (`enterable`/
  `climbable` were already closed pre-ADR by ADR-218 §1a.)
- Design-heavy remainder — dispositioned [Q-2 resolved 2026-07-17,
  session f5c22c, ruled on the refreshed audit's numbers]:
  - Capability-dispatch verb exposure largely closed itself: the
    2026-07-17 audit verified `define action <verb>` + `define trait
    … on <verb> it` is the live, loader-recommended Chord path
    (lowering/raising now CAN). `turning` needs one mechanical
    lifecycle-registry row — quick-win class, not design work.
  - **The extension/plugin opt-in surface is IN-GATE**: its child
    ADR (design for `use <extension>`-class opt-in admitting an
    extension's traits/verbs into the composable vocabulary —
    systemic combat, NPC library, channel registration) is drafted
    and interviewed before launch. Implementation scope is decided
    by that child ADR, not assumed here. — **ADR-235 (extension
    surface go-live disposition), ACCEPTED 2026-07-17, session 615882:
    adopts ADR-215/216 (the design already existed, ACCEPTED
    2026-07-14) rather than re-drafting; carries the behavior-hatch
    (audit D2) resolution and the implementation-slice ruling.**
  - **[Added 2026-07-17, session 615882 — ADR-235 interview rulings]**:
    behavior hatch REMOVED (D2); implementation slice = **S3, the
    full ADR-215/216 design implemented before launch**; and a new
    in-gate item: **AREAS** — a Chord surface for the ADR-149 region
    system (named room lists) with attached daemons (story-level
    daemons not excluded) — ruled in-gate, design AND implementation,
    via its own child ADR + follow-on plan, sequenced before G4. —
    **ADR-236 (chord regions), ACCEPTED 2026-07-17, session d2863f:
    `region` kind noun (David: reuse the platform name — "areas" was
    the working name) + `containing` membership/nesting + region-owned
    `on every turn` daemons + crossing reactions both sides + the
    story-owned every-turn clause (the story-level daemon, designed
    in); implementation is its own follow-on plan.**

### G2 — Outside-author pipeline

- A user on a clean machine (no repo checkout) can install the author
  tool, scaffold a story, write `.story` source, build, and play it in
  the browser client — the ADR-180 Phase U2 delivery, proven by a
  scripted end-to-end run in CI or a documented manual protocol
  executed at least once per release.

### G3 — Launch tutorial

- One narrative Chord tutorial exists (reference ≠ tutorial) and is
  linked from the existing site nav.
- [Q-3 resolved 2026-07-17, session f5c22c] The tutorial is a **new
  story written for Chord** — not a Family Zoo port — and bigger than
  a minimal teaching story: it should exercise as many complex IF
  logic patterns as practical. The work is pattern-first, in three
  steps: (1) catalog the complex IF logic patterns candidates
  (containers/locks, NPCs, daemons/fuses, multi-room puzzles, state
  machines, and the rest — the catalog itself is the first
  deliverable), (2) David selects which patterns the tutorial must
  include, (3) design the new story around the selected set. This is
  larger than one session — it gets its own plan.
- [Amended 2026-07-17, session f5c22c] David ruled the website
  restructure (ADR-232) and the playground (ADR-191 Phase 1) are NOT
  launch requirements — both are post-launch work on their own
  schedules. Explicit disposition recorded per the no-scope-reduction
  rule; this resolves former Q-4.

### G4 — Release hygiene

- Version bumped; `repokit verify` fully green including the publish
  dry-run; the published npm packages are the ones the tutorial
  references. (Playground reference dropped 2026-07-17 — out of the
  gate per the Q-4 ruling.)

**Explicitly NOT in the gate:** the Chord-Zork completeness matrix
(P1–P33 + melee) — that remains the post-launch north star; go-live
needs a door to open, not a dungeon to finish.

## Consequences

- Go-live work decomposes into: audit re-run (done 2026-07-17), a
  door ADR (child of this one), an extension-surface ADR (child,
  in-gate per Q-2), mechanical quick wins + defect fixes (ratchet/
  defect entries), U2 delivery, the pattern-first tutorial (own
  plan), and a release. Each is plannable independently; this ADR is
  the umbrella and is never implemented directly (ADR-first policy) —
  children carry the work.
- ADR-232 (site restructure) and ADR-191 (playground) are post-launch
  work: ruled out of the gate 2026-07-17. ADR-232 stays parked as a
  fuller design conversation; ADR-191 stays PROPOSED with its own
  open questions.
- Until all gates hold, public positioning stays "Chord is coming" —
  no announcement that invites outside authors into the unproven
  pipeline.

## Session

Session 1befbd (2026-07-17, chord-foundations). Drafted from the
go-live assessment David requested after ADR-231's completion; door
LoadError and audit staleness verified live before drafting.
All four open questions ruled by David in session f5c22c (2026-07-17):
Q-4 by direct ruling, Q-1/Q-3 via /devarch:adr-interview, Q-2 after
the Phase 2 audit re-run per its deferral trigger.

