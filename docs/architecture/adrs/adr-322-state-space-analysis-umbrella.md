# ADR-322: State-Space Analysis (umbrella) — the layer split, the annotation rules, and the soundness contract

**Status**: **DRAFT** (2026-08-20, session c5bc96) — proposed, not accepted. No
platform work is authorized by this document.
**Date**: 2026-08-20 (session c5bc96)
**Supersedes**: ADR-294 D20 (the explorer), ADR-303 (convergent paths and
unwinnable states) — both unbuilt, neither retiring running code.
**Depends on**: ADR-321 (the World Index — consumed, not extended), ADR-302 D17
(fork by re-execution), ADR-293 (determinism, forcing), ADR-276
(source-authoritative errors).
**Working document**: `docs/proposals/state-space-analysis.md` — the check
catalog, metrics, syntax sketches, staging and open questions live there and are
deliberately not decided here.

---

## Context

Exhaustively sweeping a Chord story's reachable state space would answer a class
of questions no static pass can: whether a state exists from which no ending is
reachable, what action created it, and how far back a player would have to go.

Three prior attempts at this exist and none shipped. ADR-292 specified a searcher
and was superseded in place by ADR-293 (*"do not implement"*, `@sharpee/skein`
never built). ADR-294 D20 specified the explorer and was accepted 2026-08-01,
unbuilt. ADR-303 specified a probe and was superseded 2026-08-20, unbuilt. Each
was drafted without knowing the previous one existed; ADR-303's fifth amendment,
written the day it was superseded, was a reconciliation with a decision three
weeks its senior.

That history is the reason this ADR is an umbrella and is thin. **The recurring
failure is not bad design — it is scope: each attempt tried to decide the whole
feature at once, and the parts with different reversibility dragged each other
down.** What follows is only the set of constraints that a future session must not
re-litigate. The catalog of checks, the metrics, and every syntax proposal stay in
the proposal document, where being wrong is cheap.

---

## Decision

**D1 — Four layers, and no two of them are conflated.**

| Layer | Name | Nature | Failure mode if wrong |
|---|---|---|---|
| L1 | The sweep | Enumerates reachable states, classifies terminals, derives the dependency graph | Wrong analysis |
| L2 | Attribution & reporting | Source spans, witness minimization, ranking, severity | Correct findings nobody acts on |
| L3 | Chord declarations | *Descriptive* — "this is what my game is" | Silently wrong analysis |
| L4 | Chord claims | *Prescriptive* — "this must be true" | Loud build failure |

L2 is a layer, not a polish pass. A finding without a source span and a minimized
witness is not usable no matter how fast L1 computed it.

**D2 — A declaration reinterprets; a claim asserts; no construct does both.** A
declaration cannot fail — if it is wrong, the analysis is silently wrong, which is
the dangerous case. A claim fails the build when violated — if it is wrong, you
find out at once, which is the safe case. **A single construct that both
reinterprets a structure and asserts a property destroys the meaning of a green
build**, because passing no longer distinguishes *verified* from *suppressed*.

**D3 — Declare only where identical structure carries different intent;
otherwise infer.** Every required annotation is a tax on the author. A deliberate
ratchet-to-doom is byte-for-byte indistinguishable from an accidental unwinnable
cascade, so intent there *must* be declarable. The state signature is not
ambiguous — the IR determines it from what conditions actually read — so it must
*not* require declaration. **When a proposed annotation fails this test, the
answer is inference, not syntax.**

**D4 — No annotation may only suppress.** Marking a doom state intentional must
also assert that it remains reachable. A suppression-only marker rots the moment
an unrelated edit makes the suppressed thing impossible, and nothing tells you;
this is the observed failure mode of every lint-suppression system ever shipped.
**Every L3 declaration carries an L4 obligation.**

**D5 — Syntax is decided last.** It is the least reversible layer. L3 and L4
grammar is added only when real stories demonstrate that inference cannot
distinguish intent — not in anticipation of it.

**D6 — The performance budget is a constraint this project picks, not a
measurement it awaits.** Under ~2 seconds on a real story. The budget is chosen
because it changes what the feature *is*: above ten seconds this is a batch tool
authors run twice a year; under two it runs on every save and becomes a **compiler
diagnostic**, reported through ADR-276's source-authoritative error channel.
Designs that cannot hold the budget are the wrong designs, and instrumentation
exists to say which mitigation is needed now rather than to adjudicate the target.

**D7 — The soundness contract holds at any speed**, carried from ADR-294 D20
unchanged: **findings are real** — a reported finding reproduces by construction —
and **absence is not proof**. The tool never reports that no unwinnable states
exist. It reports that none were found within a stated budget, and **the budget
and the pruning rule are part of every report.** Speed makes that line a formality
on small stories; it does not make it optional.

**D8 — Consume ADR-321's derivations; do not rebuild them.** Reach is a static IR
pass, obstacle-aware, iterated to a fixed point, already recomputed on every build.
It ships unreachable rooms and things, exits resolving to no room,
blocked-with-reason, undescribed things, unnamed tools, and — in `lifted`, with
each obstacle's `pass` and `requires` — **the puzzle dependency graph**. Anything
here that needs a dependency DAG consumes that one.

*The cheap alternative is already refuted, by measurement.* ADR-321 D14 implemented
a static scan against Fernhill and rejected it: the two chains are the same size
and a different set, the scan inventing two doors that gate nothing and missing
both machine triggers. **Wrong in both directions at once, which is worse than
under-counting, because the count looks right.**

**D9 — The finding vocabulary stays open.** A small closed severity set; an open
category namespace. Fixing the taxonomy early makes the L4 claims block
unretrofittable, because canned checks are meant to become a standard library of
claims rather than hard-coded passes. **L2 is designed against an open vocabulary
from day one, while only built-in checks exist.**

**D10 — This umbrella decides no checks.** It decides the layering, the annotation
rules, the budget, the soundness contract, and what is consumed. Which analyses
ship, in what order, with what output, is the working document's business and its
children's.

---

## Non-goals

- **Not a quality metric.** The sweep can establish that a failure is reachable,
  how far back it diverged, and whether the player could have known. It cannot
  establish whether the failure is *good*.
- **Not cruelty reduction.** The goal is deliberateness, not mercy — cruel games
  need this more, not less, because a large deliberate doom surface is where an
  accidental one hides.
- **Not a replacement for playtesting.** It reports what is structurally true.
- **Not a fixed list of analyses** (D9).

---

## Consequences

**The children are staged by reversibility, not by value.** Expected: *where the
sweep lives and what its result contract is* (the only child blocking code —
`packages/` placement is CLAUDE.md-gated and undecided); *L3 declarations*, when
and only when inference demonstrably fails; *the L4 claims block*, once D9's
vocabulary has settled under real use.

**D6 and D7 pull against each other, deliberately.** A two-second budget invites
treating the result as complete; D7 forbids saying so. Both survive: the budget
governs the design, the contract governs the report.

**D8 makes this feature a dependent of ADR-321** rather than a peer. If Reach's
fixed point changes shape, the dependency graph consumed here changes with it.
That coupling is preferred to a second implementation that would drift.

**Three superseded attempts is the thing to notice.** ADR-292, ADR-294 D20 and
ADR-303 each specified this feature and each was written without the previous. The
countermeasure is that this document is the one place to look, and that it stays
small enough to stay true.

---

## Acceptance

- **AC-1** — No shipped construct both reinterprets a structure and asserts a
  property (D2). Checkable by inspection of each L3/L4 construct as it is proposed.
- **AC-2** — Every L3 declaration has a stated L4 obligation (D4). A declaration
  proposed without one is rejected at review.
- **AC-3** — Every finding report names its budget and its pruning rule (D7). A
  report that omits either fails, regardless of what it found.
- **AC-4** — No dependency-graph derivation exists outside ADR-321's `lifted`
  (D8). Checkable by absence.
- **AC-5** — The severity set is closed and the category namespace is open (D9);
  adding a category requires no change to L2.

---

## Session

Session c5bc96, 2026-08-20, branch `feat/adr-321-world-index`. Written after a day
that produced five amendments to ADR-303 and then discarded them: the review loop
kept finding defects in the previous amendment rather than asking whether the
document should exist, and the discovery that ADR-294 D20 had specified the same
feature three weeks earlier only came out of an unrelated errand.

The analysis this umbrella governs was written in parallel by David and Claude
Desktop as `docs/proposals/state-space-analysis.md`, which is both broader and
better-layered than the ADR-303 work; the contribution from this session's side was
the prior art it had been written without, folded into that document in a second
pass. **The thinness of this ADR is the lesson from the day, not modesty.**
