# ADR-352: IF Elements — the semantic vocabulary of what a work emits

**Status**: **DRAFT** (2026-09-15, session c35f3d, on `main`). Raised by David mid-way through ADR-349's Phase 5, when the auto-assertion refusal (ADR-349 D14) turned out to need a fact — "this heading can vary" — that no writer on the wire could see. The narrow fix was a boolean on one payload. David's reply was that location name is not a special case: *"I'm thinking about IF Elements and location name is one of them. Location Description is an IF Element. Score is an IF Element."*

**Not accepted, and deliberately so.** Four decisions are settled below. The question that would let the rest be written — whether an Element's cardinality is part of its definition — is **seminal and gets its own ADR and its own discussion** (David, same session). Most of this ADR's Open Questions are downstream of that one; writing them first would be guessing.

**Scope**: undetermined. The concept sits above `packages/if-domain/src/channels/` and reaches every client, but which packages change is a question for the ADRs that follow.

## Date: 2026-09-15

## Parent

**Depends on** ADR-163 (channels as the universal UI surface — the transport this layer sits above) and ADR-300 D9 (`preferred-layout`, which is already a half-step toward letting the client decide presentation). **Revisits** nothing yet; it adds a layer rather than moving one. **Related**: ADR-349 (the location heading — the first Element built the way this ADR describes, though it was not called one at the time), ADR-165 (a renderer per channel), ADR-174 (decorations, the span-and-class wire shape a client styles against).

## Context — verified, not assumed

### The question that produced this

ADR-349 D14 says a heading that can vary is never auto-pinned: the `room-name-and-description` policy refuses to synthesize an assertion for a room whose `room name` carries a `while` arm, and the test is static because a conditional arm is an IR property known before a turn runs.

The refusal has to live in one place — `synthesizePolicyAssertions` (`packages/transcript-tester/src/assertion-core.ts:663`), which `branch-tester` re-exports and which both the runner and the IDE's Testing tab call, because a second spelling of the synthesis is drift (`branch-tester/src/auto-assertion.ts` header). Its signature is `(policy, actualOutput, channelValues)`: no world, no IR.

Two of its callers can supply the missing fact. `command-core.ts:574` holds `engine.world`; the branch-tester runner reaches the same function through `runCommand` (`runner.ts:245,259`). The third cannot: `tools/ide/web/testing-surface/src/compose.ts:131` runs in a web bundle whose only input is a `FeedRecord` (`main.ts:60-68`) carrying turn, command, output, channel captures, events, and a world digest of `{kind, id, name, token, location}`. There is no IR there and no per-entity heading metadata, so under the plan as written the IDE's recording path would have kept auto-pinning varying headings — the exact failure D14 exists to prevent.

**Correction to the record**: ADR-349's Phase 5 entry state named `synthesizeOpeningAssertions` as the third of "three writers that pin a room name under a policy". It is not one. It synthesizes the prologue and the `info` channel's title and description (`auto-assertion.ts:132-175`) and carries no room-name claim. There are two writers.

So the immediate options were a `varies` boolean on the `location` payload, or a new field on the IDE's feed wire. Both are the same mistake at different addresses: a per-case annotation for a fact that belongs to a category.

### The layering, in David's terms

**Channels are TCP/IP. IF Elements are HTML.** Channels get bytes to a surface reliably and neither know nor care what is in them. Elements are the semantic vocabulary of what a work is made of — this is a location name, this is a location description, this is a score. Neither layer references the other, which is the point: HTML does not reference TCP, and TCP does not parse HTML.

Two things follow that the channel layer alone cannot give.

**One fact, one Element, however many surfaces.** After ADR-349, the location heading is one value carried by two channels — `location` for the status surface and `room-name` for the scrollback — and D3a says they may never differ. Under this layering that is not a fact with two transports needing a rule to keep them in step; it is one `location-name` Element, and whether it appears in a status bar, above the room description, or both is the client's decision, the way a browser decides what `<h1>` looks like. The engine is currently making a presentation decision that is not its to make.

**A client can render a story it has never seen.** This is the payoff that is larger than D14, and it is the reason the Z-machine status line worked across dozens of interpreters: the vocabulary was fixed, so an interpreter did not need to know the game. A standard Element vocabulary is how a third-party client, a screen reader, the IDE's Play pane, and the web client all work from one contract instead of each learning Sharpee's channel ids by hand.

### Where the analogy strains

HTML is a document: authored once, then static. An Element's value changes every turn. The closer analogue may be the DOM — a live tree that mutates, where a turn is a mutation batch rather than a new document. Which of those it is decides what a turn puts on the wire, and it is the seminal question this ADR does not answer.

## Decision

**D1 — An IF Element is anything emitted for the player to read.** Location name, location description, room contents, score, turn count, action results, blocked messages, errors, the banner, the prologue, the ending. Narration is not excluded: an action result is as much an Element as a score. The boundary is the player's reading, not the shape of the value or the mode of its delivery.

Two narrower readings were offered and rejected. "A fact with a current value at all times" would have excluded every piece of narration and made Element a synonym for replace-mode. "A fact the status surface can show" — the direct FyreVM lineage — would have excluded the location description, which David named as an Element in the sentence that raised the concept.

**D2 — Elements sit above channels, and the two layers do not reference each other.** An Element is *what* is emitted; a channel is *how it travels*. This is not a rename of `IOChannel`: the location heading is already one Element on two channels, and `action-result` is already one channel carrying many different messages, so the two layers do not correspond one-to-one in either direction. ADR-163's transport stays underneath as plumbing; what a *manifest* declares is settled separately by ADR-353 D9, which moves it from channels to Elements.

**D3 — The vocabulary is open with a standard core, and the standard core is the set the platform ships client support for.** Authors may declare their own Elements. The standard set carries no special ontological status — it is, in David's words, "really just the ones we choose to implement". This is where `define channel` already sits, one layer down.

**D4 — An author who declares a non-standard Element provides the client change that hosts it.** The platform enables the declaration and stops there. There is **no platform fallback rendering** for an unknown Element — no generic-text rendering, no degraded display. A client that does not know an Element does not render it.

**Ignored is not silent.** An unrecognized Element is reported as a console warning naming it. Rendering nothing and saying nothing are different things: the first is the decision, the second is a story emitting into a void with no way to find out. The warning is what turns "this client does not host that Element" from a mystery into a one-line diagnosis, and it costs nothing at runtime because it fires once per unrecognized name rather than per turn.

Hosting an author's own Element in a client is the author's job, and outside the standard vocabulary it is not the platform's problem — but telling them it was dropped is.

The consequence is deliberate and worth stating plainly: "any client renders any story" holds for the standard vocabulary and only for it. A story that mints its own Elements has narrowed the set of clients that can show it completely, and that is the author's trade to make.

## Acceptance Criteria

None. Nothing is implemented, and the criteria that would test D1-D4 depend on decisions this ADR does not yet carry — principally cardinality, which determines what a turn emits and therefore what any test would read.

## Consequences

- **The two-channels-one-fact shape in ADR-349 becomes a symptom rather than a design.** D3a's "the two surfaces may never differ" is a rule holding together something that, under D2, should never have been two things. Whether ADR-349's wire is revisited is a question for the ADRs that follow, not a change this one makes.
- **`define channel` is now one layer below where an author is thinking.** An author declaring a `tide-state` is declaring an Element and getting a channel because that is what exists. What the authoring surface becomes is an open question below.
- **D4 puts a real cost on minting an Element.** An author who declares one and writes no client support has emitted something nothing displays, silently. Whether that is a diagnostic or an accepted consequence is undecided.
- **The concept is retrospective as well as prospective.** ADR-349 built one Element correctly — a single derivation, consumed by every surface — without the vocabulary to say so. Anything this layer decides has to account for the fact that at least one Element already exists in the shape it describes.

## Open Questions

**Q-1 — Is an Element's cardinality part of its definition? ANSWERED by ADR-353 D1** (David, 2026-09-15): every Element has both a state reading and an occurrence reading, and one mechanical test — does the thing exist between turns? — decides which are populated. Cardinality is not a property to fix; it is two readings a client chooses between. The original framing is kept below because the question was mis-stated and the record should show how. In HTML, `<h1>` does not choose whether it is a heading; its nature is fixed by the vocabulary, which is exactly why a browser can render a page it has never seen. Sharpee makes the equivalent choice per registration today: `IOChannel.mode` is `replace | append | event`, picked at the definition site, so the location heading is replace on one transport and append on the other — D3a's drift showing up one layer down. Three readings were on the table when the question was split out: cardinality fixed by the vocabulary for every Element; left as a per-registration choice as `mode` is today; or fixed for standard Elements and chosen for author-declared ones, which is the consistent extension of D3 and D4. The sub-question that made it seminal: may a story override a *standard* Element's cardinality — narrate every location change as prose rather than replacing a field — or is that the boundary at which they mint their own Element? This question also decides whether a turn emits a mutation batch or a document, which is the strain named in the Context.

**Q-2 — Does an Element own its derivation?** ADR-349 D3 says one function computes the location heading and every consumer calls it, and D11 gives that function a home. Generalized, this would say every Element has exactly one derivation and no surface may compute its own. It is the property that made ADR-349 worth doing, and it is largely independent of Q-1 — but it is not free: score, turn count, and the story's title reach their surfaces by three different routes today.

**Q-3 — What does an Element carry besides its value? ANSWERED by ADR-353 D4.** Not a per-Element `varies` flag, which is what this question was raised to justify, and not nothing either: an emitted value carries **per-run provenance** — whether that run of text was selected from alternatives by consulting world state. It is a property of the text emitted this turn rather than of the Element, it applies uniformly to every Element, and it is what lets auto-assertion pin a value's stable segments and skip its chosen ones. **ADR-349 AC-11 is discharged by ADR-353 AC-10.**

**Q-4 — What is the authoring surface?** Whether `define channel` becomes `define element`, whether the two coexist, and what a Chord author writes to override a standard Element's text. Now unblocked: Q-1 is answered.

**Q-5 — What happens to the standard channels that exist?** Twenty-one standard channels ship today (counted 2026-09-15, not fourteen as first written). Which become Elements, which stay pure transport, and whether the mapping is mechanical or case-by-case. Now unblocked, and ADR-353 D1's three kinds give the mapping most of its shape.

## What would falsify this

**D1 falsifies** if a thing the player reads turns out to need to be outside the vocabulary to work — if the boundary "anything emitted for the player to read" forces something into the Element layer that has no business there.

**D2 falsifies** if the Element layer and the channel layer turn out to correspond one-to-one after all, in every case including the location heading. The concept would then be a rename, and a rename is not worth an ADR.

**D3 and D4 falsify** together if author-declared Elements go unused because the client cost is too high, or if they are used widely enough that "a client can render any story" stops being true in practice and the interoperability claim in the Context is worth less than the flexibility that cost it.

## Session

Session c35f3d, 2026-09-15, on `main`. Raised while implementing ADR-349 Phase 5 and paused there; ADR-349 Phase 5 is blocked on Q-3, which is blocked on Q-1.
