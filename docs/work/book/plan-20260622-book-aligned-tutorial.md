# Plan — Book-aligned Family Zoo tutorial set

**Date:** 2026-06-22
**Decision:** Keep `tutorials/familyzoo/src/v01–v18` as the historical record. Add a
fresh, book-1:1 tutorial under `tutorials/familyzoo/src/book/`, one cumulative
compilable snapshot per code-bearing chapter, matching the book's reading order and
its exact code (including the parrot ordering: static pettable actor at ch15,
promoted to NPC at ch20).

## Why
The book reorders the curriculum vs the v-versions (NPCs late, at ch20, after
capability dispatch at ch15). The v-versions introduce NPCs at v11. A reader
comparing the book to `vNN.ts` hits that mismatch. A book-aligned set makes them 1:1
without bending either.

## Structure
`tutorials/familyzoo/src/book/` — cumulative snapshots, each a complete `Story`:

| File | Chapter | Cumulative state (≈ v-version, with deltas) |
|---|---|---|
| `ch02-first-room.ts` | 2 | single room + sign + booth (≈ v01, drop unused `Direction`) |
| `ch04-navigation.ts` | 4 | + 3 rooms, exits, room scenery, player (≈ v02) |
| `ch05-scenery-items.ts` | 5 | + rabbits, fence, map, penny, feed (≈ v03+v04) |
| `ch06-containers.ts` | 6 | + backpack, dispenser, bench (≈ v05) |
| `ch07-doors-keys.ts` | 7 | + supply room, shelves, keycard, gate (≈ v06+v07) |
| `ch08-light-dark.ts` | 8 | + nocturnal exhibit, flashlight, 3 animals (≈ v08) |
| `ch12-readables.ts` | 12 | + plaque, brochure, radio (≈ v09+v10) |
| `ch13-event-handlers.ts` | 13 | + gift shop, press, handlers, entityIds/roomIds **(no NPCs)** |
| `ch14-custom-actions.ts` | 14 | + feed/photograph actions, camera **(no NPCs)** |
| `ch15-capability-dispatch.ts` | 15 | + PettableTrait, pet action, **static pettable parrot** |
| `ch20-npcs.ts` | 20 | + zookeeper, **promote parrot to NPC**, NpcPlugin, parrotBehavior |
| `ch22-timed-events.ts` | 22 | + daemons, fuses (≈ v15) |
| `ch23-scoring.ts` | 23 | + scoring, victory daemon (≈ v16) |
| `ch28-multi-file/` | 28 | multi-file refactor (≈ v17 layout) |
| `ch24-27-presentation/` | 24–27 | presentation channels/media (≈ v18) |

(Vol V ch17–19 and Vol III ch10/11 add no entities — no snapshot needed.)

## The one real reconstruction: NPC region (ch13–15, ch20)
The v12/v13/v14 cumulative files contain the v11 NPC parrot + zookeeper. The
book-aligned ch13/14/15 must **omit** NPCs:
- Remove: zookeeper entity, parrot's `NpcTrait`, `NpcPlugin` registration,
  `parrotBehavior`, `createPatrolBehavior`, NPC imports.
- ch15 introduces the parrot as a static `ACTOR` + `ActorTrait` + `PettableTrait`.
- ch20 then adds the zookeeper, promotes the parrot (`parrot.add(new NpcTrait(...))`),
  registers `NpcPlugin` + behaviors.
- ch22/23 and the v17/v18-derived snapshots are *after* ch20, so they keep NPCs
  (cumulative) and align with the v-versions naturally.

## Verification
After each file: compile the tutorial package (tsc over `src/`, which now includes
`src/book/`). Each snapshot must type-check clean. Do **not** wire any into the
default `index.ts` (that stays on v18); these are reference sources, like the
v-versions. A later step can add transcripts if desired.

## Status — COMPLETE (2026-06-22)
- [x] ch02 (written fresh; type-checks clean)
- [x] ch04–ch12 (≡ v02/v04/v05/v07/v08/v10)
- [x] ch13–ch15 (NPC-stripped from v12/v13/v14; ch15 keeps static pettable parrot; all type-check clean)
- [x] ch20 (≡ v14, full dispatch + NPCs)
- [x] ch22–ch23 (≡ v15/v16)
- [x] ch28 (≡ v17 dir), ch24–27 (≡ v18 dir)
- [x] `src/book/README.md` documents the set, the map, and the parrot decision

All under `tutorials/familyzoo/src/book/`; none wired into `index.ts` (reference
sources). The 4 new files verified with `tsc --moduleResolution bundler`; the rest
are byte-identical to building v-versions.
