# ADR-265: The standard library in readable Chord form

## Status: PARKED (2026-07-24, session 7f133e) — a captured idea, **not a decision**. Records the question, the analysis that narrows it, and the trigger for picking it up. No work is authorized by this ADR.

## Parent: none yet. Prompted by author feedback (`docs/feedback/intfiction-20260724.txt`, Nathaniel Lindell). Relates to the Sharpee↔Chord parity goal, ADR-215 (extensions add grammar), ADR-261/262/263 (bespoke Chord surfaces over TS engines), ADR-258 (the IDE, where an index/reference would live).

## Date: 2026-07-24

## Context

Author feedback on intfiction.org: *"it's not readily apparent how to change existing logic or
sequence of play that the library defines, nor do we have the library in readable Chord form."* The
second clause is the durable one — an author who writes Chord cannot read the *standard* library
(`taking`, `dropping`, `opening`, …) in Chord; it is TypeScript, and there is no Chord-shaped artifact
to point at.

The phrase "library in readable Chord form" hides three distinct ideas, and only one is worth doing:

- **A — self-host the *compiler*** (Chord compiler written in Chord). The bootstrap brain-breaker.
  Buys an IF tool nothing. **Off the table.**
- **B — implement the *stdlib* in Chord** (`taking` as a `define action` block, etc.). Possible but
  impractical: it **inverts the layering** — Chord becomes load-bearing platform code, so every stdlib
  change becomes a grammar change (EBNF pin, language-version bump, manifest churn), and Chord must
  grow constructs for all of stdlib's plumbing (four-phase lifecycle, ADR-228 entity-slot consultation,
  interceptor ordering) that authors do not want to see. Dragging the platform's guts into the author
  language to make it "readable" makes it less readable. **Not recommended.**
- **C — a readable Chord *rendering/reference* of the library** — show what each standard action does
  in Chord-shaped form, without it being the implementation. **This is the practical target.**

**Why B is not *needed*, not merely not-worth-it:** the grammar-extension model already delivers
readable Chord surface *per capability* — `use scoring`/`rank`, `combatant with health 20`, and (this
session) hunger/sanity — each a clean Chord face over a TS engine. That is "the library in readable
Chord form," concept by concept, with implementations staying in TS. The parity goal
("100% Sharpee == 100% Chord") is a claim about **surface** capability, not implementation, and is
satisfied by bespoke grammar + `override message` + interceptors + event handlers. So the ability to
add grammar is the reason B is unneeded.

**The real gap** is narrow: the *core* standard actions have no bespoke Chord surface (they just work)
and no Chord-form artifact to read. Extension capabilities are already readable; the always-on core is
not.

## Candidate direction, if revived (C)

A **Chord-form reference of the standard actions** — for each action, a readable Chord-shaped view of
its verb(s), its consulted trait slots, its messages, and its default behavior — paired with the
existing *change* mechanisms (`override message`, capability-dispatch interceptors, event handlers) so
"how do I change this" has a documented answer next to "here's what it does."

Open sub-questions for that future work (recorded, not resolved):

- **Generated or hand-written?** Generated from action metadata (`ActionLifecycleDescriptor`,
  message ids, grammar) stays honest as stdlib evolves; hand-written reads better but drifts.
- **Where does it live?** The website's stdlib doc set exists; the IDE (ADR-258) is where an index
  would live — this reference is index-adjacent.
- **Is it a *rendering* only, or does any core action gain a real bespoke Chord surface** (the way
  scoring did) — and if so, which, and by what criterion?

## Consequences of parking

None operational — nothing is built. The value is that the three-way distinction (A/B/C) and the
"grammar path makes B unneeded" reasoning are recorded, so a future session does not re-litigate
"should we rewrite stdlib in Chord" from scratch, and does not mistake Nathaniel's readability ask for
a self-hosting mandate.

## Trigger to un-park

Pick this up when the IDE (ADR-258) is far enough along to host an index/reference, or when a second
author independently reports the core-library-readability gap — whichever first. Until then it waits.

## Session

Session 7f133e (2026-07-24). Captured at the owner's request after working through the feedback: the
owner's instinct that self-hosting is impractical and possibly unneeded held up, and the analysis
distinguishing A/B/C is the reason. Parked rather than pursued because it is IDE-adjacent product work,
not part of the current scoring/meters arc.
