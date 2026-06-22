# Book-aligned Family Zoo tutorial

These files are a 1:1 companion to *The Sharpee Author and Developer Manual*
(`docs/book/`). Each is a complete, cumulative `Story` snapshot of the zoo as the
**book** has built it up to and including that chapter — in the book's reading
order, with the book's code.

This **is** the Family Zoo tutorial. The original `v01`–`v18` versions are kept as
the historical record under `docs/archive/tutorial/`. The set was rebuilt to the
book's order because the book **reorders the curriculum** relative to the version
numbers (notably: NPCs are taught late, at Chapter 20, *after* capability dispatch
at Chapter 15); following the book against `vNN.ts` hit an ordering mismatch, which
this set removes.

`index.ts` re-exports the most complete snapshot (`ch24-27-presentation`), so a
default build runs the finished game.

## File ↔ chapter map

| File | Chapter | Provenance |
|---|---|---|
| `ch02-first-room.ts` | 2 | written to match the book (≈ v01) |
| `ch04-navigation.ts` | 4 | ≡ v02 |
| `ch05-scenery-items.ts` | 5 | ≡ v04 |
| `ch06-containers.ts` | 6 | ≡ v05 |
| `ch07-doors-keys.ts` | 7 | ≡ v07 |
| `ch08-light-dark.ts` | 8 | ≡ v08 |
| `ch12-readables.ts` | 12 | ≡ v10 |
| `ch13-event-handlers.ts` | 13 | v12 with NPCs removed |
| `ch14-custom-actions.ts` | 14 | v13 with NPCs removed |
| `ch15-capability-dispatch.ts` | 15 | v14 with NPCs removed; **parrot kept as a static pettable actor** |
| `ch20-npcs.ts` | 20 | ≡ v14 (the full version: dispatch + NPCs) |
| `ch22-timed-events.ts` | 22 | ≡ v15 |
| `ch23-scoring.ts` | 23 | ≡ v16 |
| `ch28-multi-file/` | 28 | ≡ v17 |
| `ch24-27-presentation/` | 24–27 | ≡ v18 |

(Chapters 1, 3, 9–11, 16–19 add no new entities/code, so they get no snapshot.)

## The one structural difference from the v-versions: the parrot

In the v-versions the parrot is a full NPC from **v11** (before capability
dispatch). The book introduces it later and in two steps:

- **Chapter 15** (`ch15-capability-dispatch.ts`): the parrot is a **static
  `ACTOR`** with `IdentityTrait` + `ActorTrait` + `PettableTrait` — enough for
  `pet parrot` to work via capability dispatch, no NPC machinery.
- **Chapter 20** (`ch20-npcs.ts`): the parrot is promoted to a full NPC
  (`NpcTrait` + `parrotBehavior`), and the zookeeper NPC is added.

So `ch13`/`ch14`/`ch15` have **no NPCs**; `ch20` and everything after it do.

## Standalone-build note (`.js` extensions)

The multi-file snapshots (`ch28-multi-file/`, `ch24-27-presentation/`) use `.js`
extensions on their relative imports (`from './zoo-map.js'`). The `vNN` originals
omit them, which is fine in the monorepo (`commonjs`/`node` resolution) but **fails
in a standalone `sharpee init` project**, whose tsconfig is **NodeNext ESM** and
requires explicit extensions. TypeScript maps `./zoo-map.js` → the `.ts` source
under both resolutions, so the extensions are safe everywhere. This is the one place
the copies differ from `v17`/`v18`.

## Verifying — built standalone from the published npm packages

Validated end-to-end as a real author would: a standalone project outside the repo,
`npm install @sharpee/* @1.0.8`, then `sharpee build` (published devkit 1.0.8):

- `ch02`, `ch15`, `ch23` (single-file) → build clean, emit `dist/zoo.sharpee`.
- `ch28` (multi-file, with the `.js` extensions above) → builds clean.

This also confirmed the devkit #148 fix: the published 1.0.8 `sharpee` CLI runs and
builds with no `MODULE_NOT_FOUND`.
