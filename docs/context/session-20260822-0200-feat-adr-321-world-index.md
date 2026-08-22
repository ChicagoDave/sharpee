# Session Summary: 2026-08-22 02:00 - feat/adr-321-world-index

## Goals
- Session start, then Chapter 1's two remaining open decisions, then Phase 6 of `docs/work/secret-letter-port/plan.md` — the Chapter 1 vertical slice.

## Phase Context
- **Plan**: Port *Jack Toresal and The Secret Letter* (Textfyre, 2009) to Chord — `docs/work/secret-letter-port/plan.md`.
- **Phases executed**: Phase 4 (ongoing, guided conversation) closed Chapter 1's last two opens; **Phase 6 started** (Large, 400 budget) and is CURRENT.

## Completed

### Chapter 1's last two decisions (Phase 4, David's)
Both measured against the source and put to David, both approved as recommended, both recorded in `change-document.md` (239 → 304 lines).
- **The stallkeeper tree — the calm walk carries it whole, `ST3` included.** The premise from last session was inverted by the source: `ST` is the generic stallkeeper rule (`story.ni:1881`), not one NPC's tree, and it is already calm-only — talking is refused outright with mercenaries present, in two flavours by their state (`1875-1879`). So `ST3` is the one quip that plants the mercenaries *before* the chase. Brings the patience counter (`1937-1949`) and `ST6`'s monkey seed (`1894`) with it, and converts without touching §3g's perceiver matrix (no pronoun anywhere in the nine quips).
- **The monkey — verbal-only in the calm walk, armed by the chase.** `EVENT_monkey` is armed by the `Monkey business` scene, which begins on **first entry to the Exotic Gems Stall** (`2698`) — a location trigger that was equivalent to a chase trigger only because 2009's opening was narrated. The cloak decides it: the chain ends in the disguise whose own text is written for a hunted Jack (`3050`), so a chain that can complete during the calm walk leaves the chase with nothing to be about. Trigger moves onto the start of the chase; `ST6` and `TE15` already do the seeding.

### `first-time` verified (was a Phase 6 blocker)
Chord expresses the first-time/subsequent variant directly, as the strategy **`first-time`** — which is why last session's prose grep of the reference doc missed it. Semantics match David's two-variant line exactly: variant 1 first, variant 2 thereafter, occurrence count persisted in world state (`packages/story-loader/src/runtime.ts:3329`, `:3765`). Three authoring positions (reusable `define phrase`, inline `select`, `first time` ordinal block); `once` is a retired spelling the parser rejects. Recorded into `vision.md` §3h, replacing the "[Phase 6 to verify]" flag.

### IFID — a new one (David)
Recorded under P-10 in `docs/proposals/secret-letter-port.md`. The identifier names a story file; this one shares no bytes with the 2009 Glulx build, runs on a different engine, and ships alongside a still-published original. The 2009 IFID is not in the landed corpus at all. And it is the zero-work path: since ADR-309 the IFID is tool-owned and minted at creation (`packages/chord/src/version.ts:129`) — the scaffold already carries `B4647034-34D8-40E3-B2F3-B590573387CB`. Lineage goes in the iFiction prose and landing page, not the identifier.

### Phase 6: Chapter 1's world is built and walkable
`branch-stories/secret-letter/secret-letter.story`, 46 → ~490 lines.
- **Seventeen rooms** — the alley, fourteen market locations, and the two stages of the centre post — with Gentry's room text carried over verbatim (`story.ni:1474, 2206-3005, 3623, 3666`). Geometry verified by walking every room in one run: all 17 reachable, every exit symmetric, matching the source's own prose.
- The player starts at the Northwest Junction wearing the old gray cloak, per the change document's "the player plays the market walk." Which square the walk starts on was not fixed by the change document; the junction is the market's entrance and the alley's doorstep, so the walk can end where the source's narration ended. Flagged in the file as a structural choice.

### P-8 spike ANSWERED — and it found a platform defect
The spike ran against Chapter 1's rooms and is now implemented (~190 lines).
- **A room-body field does not exist** (`packages/chord/src/parser.ts:1190-1420`).
- **A `define trait` cannot hold the text** — trait data types are `entity`, `number`, `name`, `flag` (`parser.ts:3360`); there is no text-valued field.
- **A phrase key wins by elimination**, and it must be a story-level named phrase rather than a per-room `phrase distant:` override: an override does register `<room-id>.distant`, but `phrase` statements take a **static** key (`parser.ts:6366`), so nothing can say "emit that room's distant phrase." The dispatch has to name every pair.
- Shape shipped: one `define action peering` with a `directions` block, fourteen target-room phrases (nine with the source's three random variants), and one `phrase … when the direction is … and the player is in …` line per pair. Flat, greppable, fully name-checked by the analyzer.
- **GH #285 filed.** A `directions` block whose canonicals are **compass words** binds a value that never compares equal, so every `when the direction is …` is silently false — no diagnostic, at compile time or run time, while the analyzer positively validates the lowercase canonical. `{the direction}` interpolates `NORTHEAST`, which is the tell. `stories/nautical` misses it because its direction words (`port`/`starboard`/`fore`/`aft`) are not compass words. Workaround in use: non-compass canonicals (`wayNE`) with the compass words as aliases.

## Key Decisions

### 1. The route clause is dropped from distant text — NEEDS DAVID'S RULING
The source's line ended "…to the [quick best route]". It is dropped, because the player has just supplied the direction and Chord cannot interpolate the canonical back as a compass word (it would read "wayNE"). Keeping the route means a per-pair phrase instead of a per-room one — roughly sixty phrases rather than fourteen. Flagged in the story file at the P-8 section.

### 2. No prose is drafted for this story
Per the withdrawn prose clearance, every line in the story file is either Gentry's carried over or a marked placeholder. Teisha's calm opener — which the change document names as David's to write — is not written here.

## Next Phase
- Phase 6 continues: Teisha's calm conversation as `define conversation` beats (the phase's named "at least one complete conversation"), the apple/alley transition, then the chase and the monkey chain.

## Open Items

### Short Term
- The route clause ruling above.
- Dead-end text (the source's two "nothing that way" lines) uses the same mechanism as the distant descriptions and is not yet wired.
- The Grocery Stall, the Alley, and the Base of the Center Post have no distant text **in the source** — carried as-is, not an omission.
- Teisha's calm opener is David's line; the conversation cannot be completed without it.

### Long Term
- GH #285 needs a platform fix; the port runs on the workaround until then.

## Files Modified
- `branch-stories/secret-letter/secret-letter.story` — Chapter 1's world, the player, and the P-8 layer.
- `docs/work/secret-letter-port/change-document.md` — two new Chapter 1 decision sections.
- `docs/work/secret-letter-port/vision.md` — §3h's verify flag replaced with the verified answer.
- `docs/work/secret-letter-port/plan.md` — Phase 6 marked CURRENT.
- `docs/proposals/secret-letter-port.md` — the IFID decision under P-10.

## Notes
Autonomous session — David went to bed after approving Phase 6 with "get as much done as you can."

---

## Session Metadata
- **Status**: IN PROGRESS
- **Blocker**: None. Two items need David's ruling but neither blocks the next increment.
- **Rollback Safety**: safe — no platform code touched; all changes are story content and planning docs.

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 4 confirms the change document covers Chapter 1; Phase 5's seeded-Vedd decision is on record.
- **Prerequisites discovered**: Chord's `first-time` strategy (verified, not assumed).

## Architectural Decisions
- None. GH #285 is a defect report, not a platform change; P-8's reopening clause says escalate rather than do inline platform work, and no `packages/` file was touched.

## Mutation Audit
- N/A — no side-effect source code written. Story content and documentation only.

## Test Coverage Delta
- Geometry verified by execution (all 17 rooms walked in one run); tree-document lines not yet recorded.
