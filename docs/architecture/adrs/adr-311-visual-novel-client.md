# ADR-311: The Visual Novel Client — a Renderer of Character State, Not a Second Platform

**Status**: DRAFT (2026-08-11, session c86356 — six open questions below.
Consumes ADR-310, which is itself DRAFT; this ADR is not implementable ahead of
it. No implementation authorized.)
**Date**: 2026-08-11 (session c86356)
**Consumes**: ADR-310 (the character model in Chord)
**Builds on**: ADR-137 (input modes), ADR-138 (audio), ADR-163 (channel service),
ADR-165 (renderer architecture), ADR-170 (browser client vocabulary),
ADR-239 (topic tables), ADR-250 (phrasebooks)

---

## Context

An author wants to write a visual novel: character art that reacts, backgrounds,
music, dialogue attributed to a speaker, and choices rather than a parser prompt.

The reflex is to treat that as a different product. It is not, and the reason is
ADR-310. A visual novel's entire visual grammar is **a character's interior
state made visible** — the portrait that hardens when she stops trusting you, the
sprite that looks away when he is lying. Sharpee now has that state as a first-
class model, and ADR-310 D12 established how it reaches the player: the author
declares a voice per psychological state, and the runtime selects it.

A portrait is a phrasebook in another medium.

**What already exists**, which is most of it:

- **Channels** (ADR-163) carry every story→UI signal, and Chord declares them:
  `define channel clock / mode replace / gated by sidebar / return "…" from …`.
- **Media is already declarable** in Chord today: `define sound night-wind from
  "audio/night-wind.wav"`, `define music dawn-theme from …`, `define image
  folly-photograph from "images/folly-photograph.png"` — all three in Fernhill.
- **Renderers** (ADR-165) are a defined seam: per-client presentation over the
  same packet stream.
- **Input modes** (ADR-137) are first-class, and the ADR's own table already
  names a **Conversation Mode** whose available commands are "dialogue choices."
- **The browser client is author-customizable** by design: the platform ships UI
  defaults per channel and surface; authors override per story; the wire stays
  data-only and never assumes a client's choices.

So the question this ADR answers is not "can Sharpee do visual novels." It is
"what is the smallest set of additions that makes a visual novel a *client*
rather than a fork."

## Decision

### D1. A visual novel is a renderer. There is no VN story format.

One `.story` file, one compiler, one engine, one channel stream. The visual
novel client is a renderer (ADR-165) that subscribes to the same packets the
text client does and draws them differently.

The test this must pass: **the same story runs in both clients.** In the browser
text client it reads as prose with a parser prompt; in the VN client it reads as
portraits, backgrounds and choices. Neither is a degraded mode of the other, and
neither requires a story-file change to switch.

If a proposed feature cannot be expressed as a channel signal that the text
client is free to ignore, it is out of scope for this ADR.

### D2. Portraits are declared per psychological state, in the shape phrasebooks already use.

ADR-310 D12 gives the author a voice per state. This gives them a face per state,
with deliberately parallel syntax:

```chord
define portraits for the Colonel from "art/colonel/"
  neutral: "neutral.png"
  while panicked: "cornered.png"
  while it feels hates toward the player: "cold.png"
  while lying: "away.png"
end portraits
```

`while` takes the same entity-scoped predicate ADR-310 D12 introduces for
phrasebooks — one predicate language, now five places it is used. An author who
has learned to gate prose has already learned to gate art.

**Fallback is mandatory and silent.** `neutral` is required; any state without a
declared portrait renders neutral. A missing expression is never an error at
runtime and never a blank frame — a VN with a hole in its art is still a working
story.

### D3. The wire carries state, not filenames.

The engine emits *which character is speaking and what state they are in*. It
does not emit `cornered.png`.

```
portrait: { entity: 'colonel', speaking: true, state: ['panicked'] }
```

Resolution to an asset happens in the renderer, from the story's declarations.
Three reasons, all of which this project has already paid for once: the text
client can ignore a packet it has no use for; an author can restyle or replace
art without the engine knowing; and a future client — an illustrated parser
game, a Twine-like, something nobody has thought of — reads the same stream.

This is ADR-163's rule, not a new one. It is restated because a VN client is
exactly where the temptation to shortcut it is strongest.

### D4. Choices are an input mode, not a replacement for the parser.

ADR-137 already defines what this needs. The VN client runs in a choice-driven
input mode; the parser remains available and remains the platform's spine.

**The choices come from the story's existing structures**, not a new one.
ADR-239's topic tables already enumerate what can be asked of a character —
that is a choice list with a different renderer. A story that declares topics
gets choices for free.

An author who wants a hybrid — parser for the world, choices in conversation —
gets it by switching modes, which ADR-137 was designed for. A VN is that hybrid
with the parser mode rarely entered.

### D5. Backdrops, music and sound reuse what Chord already declares.

`define image`, `define music` and `define sound` exist and are in shipping use.
The VN client needs no new declaration syntax for them — it needs channels that
say *which backdrop is current* and *what is playing*, and a renderer that treats
a backdrop as a full-bleed layer rather than an inline figure.

Where the text client renders `define image folly-photograph` as a figure in the
prose, the VN client renders it as a scene. Same declaration, same packet,
different renderer. That is the whole architecture working as intended.

### D6. The platform ships no art, and one sample story.

No portrait set, no backgrounds, no music. What ships is the renderer, the
declaration syntax, and a sample story with enough art to prove the pipeline —
placeholder-quality and clearly labelled as such.

The alternative — shipping a default cast — would make every Sharpee visual novel
look like the same visual novel, which is the opposite of the point.

### D7. ADR-310 D11 still holds, and is easier to violate here.

The player never sees or senses the mechanics. In a text client that mostly
means "do not print the mood word." In a VN client the temptations are richer
and worse: an affection meter, a relationship screen, a portrait border that
tints with disposition, a stat readout behind a menu.

None of them. The portrait *is* the disclosure, and it discloses the way a face
does — by looking different, not by being labelled. If an author wants a visible
relationship meter, that is a story mechanic they build and narrate, not a
platform surface.

### D8. Accessibility is a first-class requirement, not a later pass.

A client whose primary channel is an image has an obligation the text client did
not. Every portrait declaration carries alternative text; ADR-139's speech work
is a consumer of the same packets; and the story must remain **completable with
the art turned off**. If a puzzle depends on noticing an expression, the prose
must carry it too.

This is stated as a decision rather than a consequence because it constrains D2's
syntax: alt text is part of the declaration, not an optional attribute.

## Consequences

- **`@sharpee/character` gets its second consumer**, and its first that makes the
  interior state *visible*. The VN client is the strongest argument for ADR-310
  being worth implementing, because it converts an invisible model into the
  thing on screen.
- **The renderer count goes from one to two**, which turns ADR-165's seam from a
  design into a tested boundary. Anything the VN client needs that cannot be got
  through that seam is a finding about the seam.
- **Asset pipeline is new work.** Sharpee has never shipped a story with
  meaningful binary assets. Publishing (ADR-284) copies `assets/` flat; a VN's
  art directory is larger, structured, and wants at minimum a size budget and a
  missing-asset report at build time rather than at play time.
- **Testing needs a story about images.** The tree-document test model (ADR-307)
  records what the story *said*. A VN's claims include what it *showed*, and
  nothing in the current harness asserts on a portrait state.
- **Two clients means two default stylesheets** and a real risk of divergence in
  the `.sharpee-*` component vocabulary (ADR-170). The VN client should extend
  that vocabulary, not start a second one.
- **This is a product decision as much as a technical one.** A visual novel
  client invites an audience that has never used a parser, and their first
  question will be why the tool is called a parser IF platform. That is a
  positioning question this ADR does not answer and should not pretend to.

## Open Questions

1. **What does a VN do with the world model?** Visual novels are usually not
   spatial — no inventory, no rooms to walk. Sharpee's engine is built around a
   world. Does a VN story declare rooms it never describes, or does the VN client
   present a spatial story non-spatially, or is there a third thing? This is the
   deepest question here and it may want its own ADR.

2. **Sprite composition: one image or layers?** D2 declares whole portraits.
   Real VN production tends toward layered sprites — body, expression, accessory
   — because the combinatorics of whole images get expensive fast. Layering is
   more capable and considerably more syntax. Which does the first version ship?

3. **Do choices exhaust, and who tracks it?** VN convention greys out or removes
   used options. Topic tables (ADR-239) have no notion of exhaustion. Adding one
   affects the parser client too, which may be a benefit or a leak.

4. **Where does save/load live?** VN players expect multiple slots, and often
   rewind. Sharpee has save/restore and the testing tree already models branching
   play. Those two facts sit suspiciously close together and nobody has looked at
   whether they are the same mechanism.

5. **Is the character model required, or optional?** D2 gates portraits on
   ADR-310 state. An author who wants a visual novel with no psychological model
   should still be able to write one, switching portraits from ordinary story
   state. Confirm the syntax degrades that way rather than requiring a character
   model to show a face.

6. **Does this want a different name in the product?** "Visual novel mode" is
   understood by the audience it targets and invisible to everyone else. Whether
   Chord Writer grows a VN project type, or the client is simply another publish
   target, is a Chord Writer question this ADR defers.

## Session

Session c86356 (2026-08-11). Written directly after ADR-310, at David's request,
as its first consumer: an author wanting to build a visual novel, and the
recognition that a portrait reacting to a character's interior state is the same
mechanism as a phrasebook reacting to it.
