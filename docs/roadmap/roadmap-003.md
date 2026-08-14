# 003 — Visual novel client

**Status**: DRAFT
**Built?**: none — but most of its substrate exists (channels, media declarations, renderers, input modes)
**Created**: 2026-08-11
**Target date**: TBD
**Target Sharpee version**: TBD
**Target Chord version**: TBD
**Traces to**: ADR-311 · consumes [002](./roadmap-002.md) (ADR-310) · builds on ADR-137, ADR-138, ADR-163, ADR-165, ADR-170, ADR-239, ADR-250

---

## What it is

Character art that reacts, backgrounds, music, dialogue attributed to a speaker, and choices
rather than a parser prompt — as a **renderer over the existing platform**, not a second
product.

The argument for that framing: a visual novel's visual grammar is a character's interior
state made visible — the portrait that hardens when she stops trusting you, the sprite that
looks away when he is lying. ADR-310 makes that state first-class, and a portrait is then a
phrasebook in another medium.

## What already exists

- **Channels** (ADR-163) carry every story→UI signal and are declarable in Chord.
- **Media is already declarable**: `define sound`, `define music`, and `define image` all
  work today — Fernhill uses all three.
- **Renderers** (ADR-165) are a defined seam: per-client presentation over one packet stream.
- **Input modes** (ADR-137) are first-class, and that ADR's own table already names a
  Conversation Mode whose available commands are dialogue choices.
- **The browser client is author-customizable** by design.

## Where it stands

DRAFT with six open questions. **Not implementable ahead of [002](./roadmap-002.md)**, which
is itself DRAFT — ADR-311 states this as a hard dependency, not a preference.

## Related

Overlaps item [007](./roadmap-007.md) at the choice-presentation seam: both need a way to
offer the player options instead of a parser prompt, and neither has decided whether that is
one mechanism or two.
