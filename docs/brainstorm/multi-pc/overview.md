# Multi-PC Stories — Brainstorm Stub

**Status**: STUB — captured 2026-04-19, no exploration yet
**Distinct from**: multiuser server (ADR-153) — that work is about multiple *users* sharing one PC in one story instance. This is about multiple *player characters* within a single story, each with their own view of the world.

## Seed Idea

A Sharpee story could support multiple player characters, each experiencing the world from their own perspective. Player switches between PCs (or PCs act in parallel, or hot-seat, or networked — all open).

## Open Questions (do not answer here, just record)

- **World model**: One shared `WorldModel` with per-PC scope filters, or separate `WorldModel` instances synchronized at boundaries?
- **Author surface**: Does the story declare its PCs up front (`story.playerCharacters = [...]`), or are PCs created dynamically?
- **Turn cycle**: Hot-seat (one PC at a time, explicit handoff), simultaneous (all PCs act per turn), async (each PC has independent turn counter)?
- **Player input**: One human controlling all PCs, or one-human-per-PC (which collides with the multiuser server)?
- **Save/restore**: One save file per story, or per-PC saves that can diverge?
- **Visibility / knowledge**: PC-A sees something; does PC-B know about it? How does the engine track per-PC knowledge state?
- **Narration / text service**: Whose POV is the narration written from when multiple PCs are co-present in a room?
- **NPC perception**: Does an NPC react to "the player" generically, or does it differentiate between PCs?
- **Interaction with regions/scenes (ADR-149)**: Do scenes fire per-PC or globally? What if PC-A enters a scene that PC-B has already triggered?

## Why a stub, not an ADR

ADR-152 jumped to "decision" before the shape of multiuser was clear and had to be abandoned. ADR-153 worked because brainstorm preceded it. This idea is at the same pre-brainstorm stage — capturing it here so it isn't lost, but no design work until/unless David promotes it.

## When to revisit

Not before the multiuser server (ADR-153) reaches a stable Phase 11+. Crossing the wires of "multiple users" and "multiple PCs" mid-build would muddy both.
