# ADR-299: Play–Skein–Bless — the IDE's Testing Paradigm Adopts the Inform 7 Skein

**Status**: **SUPERSEDED** (2026-08-04, session c42886) by **ADR-300**, which
retires the `.skein` artifact and the second verification engine. What is
superseded is the *artifact and verification* model — `.skein`, blessing scopes,
all-paths invariance, `SkeinVerifier`, findings, locks, trims, and the exporter.
What carries forward — now held by [ADR-301](adr-301-sharpee-transcript-editor.md), which is TBD — is the interaction design: play
authors the transcript (by promotion from a session log rather than this ADR's
append-to-an-open-artifact mechanism), replay to a point, branch columns
re-pointed one-per-file, and the card-per-turn reading surface. Phases 3, 4, 7,
8 and 9 are substantially retracted; Phases 1–2 and 5–6 survive as that carried
interaction, recorded as ideas rather than as a decided design. The evidence is ADR-300's: `SkeinExporter` reaches only `[OK]` and
`[SKIP]`, 0.16 % and 0.13 % of the assertions authors write, while the
`contains` family is 92.6 % and unreachable from a skein.

*Prior status*: ACCEPTED (2026-08-03, session 83abc1) — drafted, fully
interviewed (seven questions resolved into D2–D10), adr-review findings
folded, and accepted by David the same day. Supersedes ADR-282's
interaction model (per-turn record/bless in the Play pane); ADR-282's
serialization and grammar work (literal text blocks, transcript emission)
carries forward unchanged. ADR-282's Status flipped in the same edit, per
the ownership clause below. Never implemented beyond session dd4189's UX work.

**Parent**: ADR-282 (play-to-test tagging — superseded interaction, retained
serialization), ADR-293 (choice points, per-point streams, forcing — the
shipped substrate; also carries forward, in substance, ADR-292's
playthrough-as-tree model and real-engine forking), ADR-294 (golden
transcripts — the export target and test contract; positions the
`@sharpee/skein` outcome explorer, planned not shipped). Lineage: ADR-292
(SUPERSEDED IN PLACE by ADR-293 — never accepted, nothing built; cited here
as design lineage only). Inspiration: Inform 7's Skein/bless model, this
time adopted rather than simplified.

**Supersession ownership**: when this ADR flips to ACCEPTED, the same commit
edits ADR-282's Status to SUPERSEDED (interaction model; serialization
retained) citing ADR-299. Owner: whoever performs the acceptance flip.

## Context

ADR-282 shipped the Play pane's record/bless paradigm as a deliberate
double simplification of Inform 7's Skein: per-turn tags instead of a tree,
and no negative verdict. Since then the substrate a real skein needs has
been built and shipped: deterministic execution at a pinned seed (ADR-291),
choice-point enumeration, per-point streams, and outcome forcing
(`forces:`/`point-seed:` headers — ADR-293 Phase C), and the rebuilt
transcript tester those artifacts feed (ADR-294 Phases A–D). Two further
pieces exist as accepted design, not code: the playthrough-as-tree model
with real-engine forking (ADR-292's substance, carried forward by ADR-293)
and the `@sharpee/skein` bounded outcome explorer (ADR-294 — no
`packages/skein` exists yet). The cleanup was done *for a skein paradigm*;
the record/bless panel is the interim that outlived its moment (David,
2026-08-03). This ADR records the intent the muddled process never wrote
down: the right panel's testing surface becomes play–skein–bless.

## Decision

**D1 — Adopt the Inform 7 Skein model as the baseline.** Copy the proven
model rather than re-simplify it; improve only where Sharpee's substrate
makes an improvement free or obviously right (David's ruling, 2026-08-03).
The baseline, stated so drift is visible:

- Playing always grows the skein — there is no record toggle. Every typed
  command becomes a node (command + the output it produced); following an
  existing path walks the tree, diverging from it branches.
- Any node can be replayed to: the IDE re-runs root→node and leaves the
  story live at that point.
- Bless approves a node's output as expected. Replays through a blessed
  node diff actual against blessed; differences surface per node.
- Unbless withdraws approval; there is no negative verdict (ADR-282's
  ruling survives — absence of bless, not presence of curse).

**D2 — Paths are author-taggable.** A story has multiple paths through it,
and the author tags each accordingly (David, 2026-08-03) — a thread through
the skein carries an author-given tag naming what it is ("golden path",
"garden exploration", "troll death"), not just an anonymous branch. Motivating
metaphor (explanatory, not a modeling requirement — see the Q-6 resolution
in Consequences): most IF stories are figure eights — expand for open-world
exploration, contract for puzzle→progress resolution, repeat. Paths braid
through the same progress chokepoints; tags are how the author names them.

**D3 — Bless has scope.** Some blessings are independent of the figure
eight (David, 2026-08-03): output that is invariant at a story position no
matter which tagged thread arrives there (a room description that never
mentions carried state) can hold one blessing that covers every thread
through that position. Other output is legitimately path-dependent (the
thief encounter differs with the egg in hand) and blesses per thread.
Blessing is therefore not uniformly per-thread (I7) nor uniformly
per-position — scope is a property of the blessing. A path-independent
blessing doubles as an invariance claim: a thread that arrives and diffs
against it has surfaced a state leak, which is the skein working as a test
instrument, not noise.

**D4 — Scope is declared, then verified** (David, 2026-08-03). At bless
time the author chooses: plain bless (this thread) or bless-for-all-paths
(invariant at this position). The all-paths form is a checkable assertion:
every replay of any thread through that position enforces it, and a
violation is a first-class finding ("the cellar description mentions the
egg this thread doesn't have"), not diff noise. The author's intent becomes
an assertion the skein tests — aligned with the testing-intelligence
product surface (ADR-294 D13–D16).

**D5 — One seed per skein; forced choice-points are first-class branches**
(David, 2026-08-03). The whole skein runs at one pinned seed (ADR-291), so
every thread replays byte-identically and any cross-thread difference at a
shared position is caused by the paths differing — the property D4's
invariance checking depends on. Exploring behavior under different
randomness is not a different seed: it is a forced branch. A node with a
choice point can grow a sibling branch that forces a specific outcome
(ADR-293 Phase C — "force: the thief's ambush fails"), making the
counterfactual a visible, playable, blessable thread. A forced branch is
just a thread with a forcing annotation on one node — tagging (D2), bless
scope (D4), and golden-transcript export (the existing `forces:` header)
apply unchanged. This is the one place this skein is categorically beyond
I7's: randomness is explored, not merely survived.

**D6 — Replay-to-node is transcript re-execution; forking is a later
optimization** (David, 2026-08-03). Clicking a node re-runs root→node at the
skein's pinned seed — the semantic definition of replay, identical in
meaning to executing the thread's golden-transcript export. Real-engine
forking (ADR-292's substance via ADR-293) may later accelerate deep skeins
without changing that meaning — forking is accepted design, not shipped
code, and this ADR does not depend on it. Source edits invalidate replay
state whole, same ruling as the Play surface.

**D7 — The skein is a committed, self-contained project artifact; tests
are minted explicitly** (David, 2026-08-03). The skein lives at
`stories/<name>/play-testing/<name>.skein`, surfaced as a top-level **Play
Testing** group in the project tree beside ADR-280's Transcript Tests and
Walkthroughs groups, and committed like walkthroughs — blessings and tags
are authored judgment. The file is self-contained I7-style: tree (commands,
forcing annotations, tags), pinned seed, and blessings with scope and
blessed output inline — readable without cross-referencing. The format
carries a `schemaVersion` and the reader rejects an unknown version loudly
(the house wire-contract pattern, ADR-258 D5). Export is an
explicit author act: "Save thread as test" writes an ADR-294 golden
transcript (seed/`forces:` headers) into the existing test groups; the
skein never silently mints tests (consistent with ADR-292 Q-5 — the author
chooses what ships). The test-side contract is unchanged: runners consume
transcripts and never learn what a skein is.

**D8 — The I7 split: Skein and Transcript as sibling views** (David,
2026-08-03). The right panel carries two views: **Skein** — the tree,
click-to-replay (D6), branch/force/tag affordances — and **Transcript** —
the current thread linearized as prose, actual vs. blessed per node, where
blessing happens (blessing is a reading activity). The Play header reduces
to Restart (now "new thread from root") and "Play after build"; Record dies
with D1 (playing always grows the skein), and Bless/Checkpoint move into
the Transcript/Skein surfaces where node context lives.

**D9 — All I7 refinements ship in v1** (David, 2026-08-03: "all of it").
Changed-output badges (the bless feedback loop and D4 findings surface),
explicit trimming (a skein you cannot prune becomes a junk drawer), node
locking (protects a subtree from trimming), and node annotations (freeform
notes, distinct from D2's thread tags). Nothing auto-trims; trimming is
always an explicit author act, and locking guards against exactly that act.

**D10 — Explorer findings propose; the author adopts** (David, 2026-08-03).
This decision binds to ADR-294's explorer *contract*, ahead of its
implementation (`@sharpee/skein` is planned there — batch, CLI-first; no
package exists yet). When the explorer lands, its findings surface in a
list under the Play Testing group, each carrying the run's budget report
(ADR-294's honesty contract: "none found within N states / depth D"). A
finding's repro — commands + forced outcomes at the skein's pinned seed —
is exactly a D5 thread, so one click adopts it into the skein as a
machine-grown, origin-badged thread; from there it is ordinary (taggable,
blessable, trimmable, lockable), and bless + export makes the regression
test. The explorer never writes the skein unasked — the D7 principle
applied symmetrically: machine proposes, author adopts. Until the explorer
ships, the findings list and adoption flow are absent, and nothing else in
this ADR depends on them.

## Consequences

- The Play pane's record/bless affordances (Record toggle, per-turn bless
  tags) are replaced by the skein surface; recorded-transcript save flows
  (ADR-277/280) become skein-thread exports.
- ADR-282's serialization contract (literal text blocks, transcript grammar)
  is unchanged — blessed threads must still export to ADR-294 golden
  transcripts so the test-side contract holds.
- The IDE gains a committed per-story artifact (`play-testing/<name>.skein`)
  and a new top-level Play Testing project-tree group (D7).
- The skein data model stays a pure I7 tree. Convergence is neither modeled
  nor drawn — the figure eight was a metaphor to understand the tool, not a
  modeling requirement (David, 2026-08-03, resolving Q-6); it informed
  D3/D4 and ends there. The worked Dungeo scenario (egg before or after
  entering the house, both orderings contracting at the cellar trap door)
  lives on only as D4's motivating example of a cross-path invariance claim.
- Implementation lands in `tools/ide` (panel, skein file, adoption flow) and
  `@sharpee/skein` (explorer surfacing seam); the engine substrate
  (ADR-291/292/293) is consumed, not changed.

## Implementation

All in `tools/ide` (SharpeeIDE) unless noted; the engine substrate is
consumed, never modified.

- **Skein model + store** — the in-memory tree, the versioned `.skein`
  file reader/writer (D7), and the Play Testing group's classifier entry
  (extends ADR-280's folder→group mapping in `Project/`).
- **Skein view** — the tree surface (D8): click-to-replay, branch, force
  (D5), tag (D2), trim/lock/annotate (D9), changed-output and origin
  badges.
- **Transcript view** — the linearized thread (D8): actual vs. blessed per
  node, bless/unbless with scope choice (D4).
- **Replay driver** — root→node re-execution (D6) over the existing
  bundle-runner machinery (`Test/TestRunner` lineage); D4 invariance
  verification runs here.
- **Exporter** — blessed thread → ADR-294 golden transcript with
  seed/`forces:` headers (D7), reusing ADR-282's retained serialization.
- **Retirements** — Play header Record toggle and per-turn bless flow
  (ADR-282 interaction); `RecordingSession` absorbed into the skein store.
- **Deferred with the explorer** (`@sharpee/skein`, ADR-294): findings
  list, budget report display, adoption flow (D10).

## Acceptance Criteria

- **AC-1 (play grows the skein)**: playing turns in the Play pane
  produces/extends `play-testing/<name>.skein`; restarting and typing a
  different command at a shared prefix yields two threads in the file.
- **AC-2 (replay determinism)**: clicking any node re-executes root→node
  at the skein's pinned seed and the replayed outputs are byte-identical
  to the stored ones (clean source, unchanged build).
- **AC-3 (scope verification)**: an all-paths blessing at a position, plus
  a second thread whose output at that position differs (a seeded state
  leak), produces a first-class finding on that thread's replay — not a
  silent diff, not noise on the blessing thread.
- **AC-4 (forced branches)**: forcing an outcome at a choice-point node
  grows a sibling branch; its exported transcript carries the `forces:`
  header and passes under `node dist/cli/sharpee.js --test`.
- **AC-5 (explicit minting)**: "Save thread as test" writes a golden
  transcript into the existing test folders and that transcript passes;
  no transcript is ever written without the explicit act.
- **AC-6 (refinements)**: trimming an unlocked subtree removes it from
  file and view; trimming a locked subtree is refused; annotations and
  tags round-trip through save/load.
- **AC-7 (format gate)**: a `.skein` file with an unknown `schemaVersion`
  is rejected loudly (visible error state, no partial load).
- **AC-8 (deferred, explorer)**: adopting a finding materializes its repro
  as an origin-badged thread — lands with `@sharpee/skein`, not v1.

## Session

- 2026-08-03, session 83abc1 — created and fully interviewed in one sitting.
  D1 anchored by David ("copy the Inform 7 model and if there's space for
  improvement, great"); seven interview questions resolved into D2–D10.
  adr-review findings folded same session: ADR-292 lineage corrected
  (superseded in place, nothing built), explorer future-tensed, `.skein`
  schema versioning committed, Implementation and Acceptance Criteria
  sections added, ADR-282 flip ownership named.
