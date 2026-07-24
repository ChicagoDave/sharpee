# ADR-265: The standard library in readable Chord form

## Status: ACCEPTED (2026-07-24) — the **entire** standard library is rendered in readable Chord form as a **reference artifact**, carrying explicit, machine-checkable notation that it is reference-only and **not** the implementation. The real stdlib stays TypeScript (Sharpee). This resolves the parked A/B/C question in favor of **C (a Chord-form rendering/reference)** applied to all of core stdlib, and firmly rejects **B (implementing stdlib in Chord)**. Owner decision (2026-07-24), superseding the 2026-07-24 PARKED status below. Not implemented.

## Parent: none. Prompted by author feedback (`docs/feedback/intfiction-20260724.txt`, Nathaniel Lindell). Relates to the Sharpee↔Chord parity goal, ADR-215 (extensions add grammar — the per-capability readable surface), ADR-261/263 (bespoke Chord surfaces over TS engines) and ADR-262 (the banded engine those surfaces sit on), ADR-264 (the Chord numeric-counter primitive — a language addition, not a stdlib action, so out of this reference's scope), ADR-228 (`ActionLifecycleDescriptor` — the action metadata a generator reads), ADR-255 (`override message` — one of the documented change mechanisms), ADR-090 (capability-dispatch interceptors), ADR-052 (event handlers), ADR-258 (the IDE, a natural home for the index).

## Date: 2026-07-24

## Context

Author feedback on intfiction.org: *"it's not readily apparent how to change existing logic or
sequence of play that the library defines, nor do we have the library in readable Chord form."* The
second clause is the durable one — an author who writes Chord cannot read the *standard* library
(`taking`, `dropping`, `opening`, …) in Chord; it is TypeScript, and there is no Chord-shaped artifact
to point at.

The phrase "library in readable Chord form" hides three distinct ideas:

- **A — self-host the *compiler*** (Chord compiler written in Chord). The bootstrap brain-breaker.
  Buys an IF tool nothing. **Off the table.**
- **B — implement the *stdlib* in Chord** (`taking` as a `define action` block, etc.). Possible but
  impractical: it **inverts the layering** — Chord becomes load-bearing platform code, so every stdlib
  change becomes a grammar change (EBNF pin, language-version bump, manifest churn), and Chord must
  grow constructs for all of stdlib's plumbing (four-phase lifecycle, ADR-228 entity-slot consultation,
  interceptor ordering) that authors do not want to see. Dragging the platform's guts into the author
  language to make it "readable" makes it less readable. **Rejected.**
- **C — a readable Chord *rendering/reference* of the library** — show what each standard action does
  in Chord-shaped form, without it being the implementation. **This is the decision.**

**Why B is not *needed*, not merely not-worth-it:** the grammar-extension model already delivers
readable Chord surface *per capability* — `use scoring`/`rank`, `combatant with health 20`, hunger/
sanity (ADR-263) — each a clean Chord face over a TS engine. That is "the library in readable Chord
form," concept by concept, with implementations staying in TS. The parity goal
("100% Sharpee == 100% Chord") is a claim about **surface** capability, not implementation, satisfied
by bespoke grammar + `override message` + interceptors + event handlers. So the ability to add grammar
is the reason B is unneeded.

**The real gap** is narrow: the *core* standard actions have no bespoke Chord surface (they just work)
and no Chord-form artifact to read. Extension capabilities are already readable; the always-on core is
not. This ADR fills that gap — for the whole core — with a reference, not a reimplementation.

## Decision

### D1 — The entire core stdlib is rendered in Chord form

Every standard action (`taking`, `dropping`, `opening`, `going`, `putting`, `eating`, …) gets a
readable, Chord-shaped view: its verb(s), the trait slots it consults, its messages, and its default
behavior — the whole standard library, not a curated subset. An author reading it sees "here is what
`taking` does" in the language they write, next to "here is how you change it" (the D4 change
mechanisms).

### D2 — It is explicitly, machine-checkably REFERENCE ONLY

This is the load-bearing constraint. The rendering is a **reference, never the implementation** — the
real `taking` is `packages/stdlib/src/actions/standard/taking/`, in TypeScript. Every rendered
artifact carries a **prominent, machine-detectable marker** — a `reference-only` header banner in the
file plus a structural flag the tooling can read — stating: *this is a Chord-form rendering of the
standard library for reading; it is NOT the source of truth; the implementation is Sharpee/TypeScript.*

The marker is enforced, not decorative: the story-loader / CLI **refuse to load a reference artifact as
a real story** (a hard error naming the marker), so no one can mistake the reference for the library or
accidentally ship it as one. A reference file that lost its marker is a build error. The point of the
notation is to make the "this is not the real thing" fact impossible to miss and impossible to bypass.

### D3 — Generated from stdlib metadata, not hand-written

Because it must cover the *entire* stdlib and stay honest as stdlib evolves, the rendering is
**generated** from the platform's own action metadata (ADR-228 `ActionLifecycleDescriptor`, the
`*-messages.ts` ids, the grammar/verb tables), not hand-authored. Hand-written prose reads slightly
better but drifts silently the moment an action changes; a generator keeps the reference true by
construction and emits the D2 reference-only marker automatically. A regeneration step runs with the
build so the reference cannot fall behind the TS it describes.

### D4 — Paired with the real change mechanisms

The rendering answers "what does it do"; it is paired with "how do I change it" — the existing,
already-real seams: `override message <alias>` (ADR-255), capability-dispatch interceptors (ADR-090),
and event handlers (ADR-052). So an author who reads the `taking` reference finds, beside it, the
supported ways to alter its messages, guard its execution, or react to it — none of which require the
reference to be executable.

### D5 — The real stdlib stays TypeScript; this adds a projection, not a port

This ADR does **not** move any implementation into Chord (that is B, rejected). It adds a
read-only projection out of the TS stdlib. The layering is unchanged: TS is the implementation, Chord
is the author surface, and this reference is a generated view bridging the two for readability.

## Acceptance

1. A generated Chord-form reference exists for **every** core standard action, each showing verbs,
   consulted trait slots, message ids, and default behavior.
2. Every reference artifact carries the D2 reference-only marker (banner + structural flag).
3. The story-loader / CLI **refuse** to load a reference artifact as a real story, with an error that
   names the marker; a reference file missing its marker fails the build.
4. The reference is **generated** from action metadata and regenerates with the build; a change to a
   standard action's messages/slots is reflected without hand-editing (a drift check fails if stale).
5. Each action's reference links the D4 change mechanisms (`override message` alias, interceptor slot,
   event id) that actually apply to it.
6. No implementation moves into Chord — the TS stdlib remains the sole source of truth (a test/asserts
   the reference is never on the load path).

## Consequences

**Gained.** The core-library readability gap Nathaniel named is closed for the whole stdlib, in the
author's own language, without the layering inversion of B. "How do I change play that the library
defines" gets a documented, per-action answer next to "what it does." Generation keeps it honest.

**Lost / cost.** A generator to build and keep in the build pipeline, reading ADR-228 metadata +
message ids + grammar. The reference-only guard is real surface (marker emission + loader refusal +
drift check) that must be maintained. The generated Chord may read a little more mechanically than
hand-authored prose — the accepted price of never drifting.

**Rejected alternatives.** B (stdlib implemented in Chord) — inverts the layering, makes every stdlib
change a grammar change, and drags four-phase/interceptor plumbing into the author language. A
(self-hosting the compiler) — off the table.

**Not addressed.** The exact artifact location and format (a `docs/reference/` set vs. an IDE-hosted
index per ADR-258 vs. the website stdlib docs) — a follow-up once the generator exists; the generator's
precise rendering template for slots/lifecycle; whether any *core* action should additionally gain a
real bespoke Chord surface the way scoring did (a per-action question, out of scope here — this ADR is
reference, not new grammar).

## Session

Session of 2026-07-24. Un-parked at the owner's request: the parked A/B/C analysis (below, retained as
rationale) already concluded C was the practical target and B unneeded; the owner turned that into a
decision — render the **entire** stdlib in Chord as a reference, with **explicit reference-only
notation** because the real library is and stays Sharpee/TypeScript. The distinctive commitment beyond
the parked note is D2's enforced marker: the readable Chord stdlib must never be mistakable for the
implementation.

---

## Prior status — PARKED (2026-07-24, session 7f133e)

Retained for history. The original parking recorded the A/B/C distinction and the "grammar path makes B
unneeded" reasoning so a future session would not re-litigate "should we rewrite stdlib in Chord" from
scratch, and would not mistake the readability ask for a self-hosting mandate. It listed open
sub-questions — generated vs hand-written, where it lives, rendering-only vs. new bespoke surfaces — and
set the un-park trigger as "the IDE far enough along to host an index, or a second author reporting the
gap." The owner un-parked it directly instead; D3 resolves generated-vs-hand-written (generated), and
the location question is carried forward under Not addressed.
