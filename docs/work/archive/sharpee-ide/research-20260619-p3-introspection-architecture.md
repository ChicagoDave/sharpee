# P3 Introspection Architecture — Findings

**Date:** 2026-06-19
**Question:** For the Sharpee-aware project view (P3) and its downstream consumers (P7 outline/problems, P6 trait hints), does project introspection belong **Node-side** (TS Compiler API static analysis, as the roadmap specced) or **Swift-side** (reuse the tree-sitter parse tree from ADR-182)?
**Short answer:** Neither as posed. The dichotomy is a false one. The real split is **semantics vs. source-positions**, and the right model is a hybrid that uses a *runtime* introspection helper (not static analysis) for semantics and tree-sitter for source positions.

---

## What the consumers actually need

| Consumer | Needs | Nature |
|---|---|---|
| **P3 project tree** | Entity list bucketed by category (Rooms/Objects/NPCs/Regions) + each entity's traits; click → open source | Semantic (what *is* a room) + coarse navigation (which file) |
| **P7 outline** | Per-active-file entity structure with **file:line** for jump-to | Source-position |
| **P7 problems/lints** | Trait composition per entity ("room with no exits", "lockable without openable") | Semantic |
| **P6 trait hints** | "Cursor is on a `RoomTrait` token" → hint bubble | Source-position (cursor) + curated data |

Two distinct demands: **semantic classification** (what an entity is and which traits it has) and **source positions** (where in the file a token/entity lives).

## Three findings that break the roadmap's assumption

The roadmap (decision #4, P3 scope) assumed it could *"identify each `.ts` file's primary export by trait composition (`RoomTrait` → Room)"* via the TS Compiler API. The actual story code defeats every part of that sentence:

1. **Entities are not exports.** They are local `const`s built imperatively inside functions:
   ```ts
   const nightstand = world.createEntity('nightstand', EntityType.ITEM);
   nightstand.add(new SceneryTrait());
   nightstand.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
   nightstand.add(new OpenableTrait({ isOpen: false }));
   ```
   One file (`objects/index.ts`) builds *many* entities via one exported `createObjects(world)` function. There is no "primary export" to classify.

2. **Trait identity is by constructor name, not type.** You know it's a container because of `new ContainerTrait(...)`, a syntactic token — the TS *type system* buys nothing here. The hard part is dataflow: tracking the local `const` through its subsequent `.add(new XTrait())` calls. That work is identical whether tree-sitter or the TS Compiler API holds the AST.

3. **Trait calls hide behind story-local wrappers.** The Alderman rooms go through `createRoom(world, name, desc)` — so `new RoomTrait()` never appears in `rooms/index.ts` at all. Static classification would have to recognize each story's bespoke helper, follow it across function boundaries, or give up.

4. **Category ≠ directory.** The Alderman happens to split source into `rooms/`, `objects/`, `npcs/` — but **Dungeo organizes by region**: `white-house.ts`, `coal-mine.ts` each create rooms, items, and NPCs together. The mock's categories cut across Dungeo's files. Convention-based categorization does not generalize.

## The decisive asymmetry

The world-model **already computes all of this correctly at runtime.** After `createObjects(world)` runs, the engine exposes:

```ts
world.getAllEntities()                  // every entity
e.hasTrait(TraitType.ROOM)              // category
e.getTrait(RoomTrait)                   // trait data (exits, etc.)
world.findWhere(e => e.hasTrait(...))   // bucketing
```

This is **ground truth** — immune to wrapper functions, import aliases, and runtime-string entity names, all of which defeat static analysis. Static analysis (either parser) would be *reimplementing the engine's own constructor logic, approximately.*

The one thing runtime introspection lacks is **source position**: a runtime entity does not know which file/line created it.

## The three real options

| | What it is | Semantics | Source positions | Defeated by |
|---|---|---|---|---|
| **A. Static AST (tree-sitter, Swift)** | Walk parse tree for `createEntity` + sibling `.add(new XTrait())` on same local | Approximate | ✅ native | wrappers, aliases, cross-function flow |
| **B. Static AST (TS Compiler API, Node)** | Same dataflow, with type info | Approximate (type info doesn't help — see finding 2) | ✅ | wrappers (unless followed), runtime-string names |
| **C. Runtime introspection (Node)** | Run the built story headless; dump `world.getAllEntities()` + traits as JSON | ✅ ground truth | ❌ none | needs a successful build |

**B — the roadmap's choice — is the weak middle.** It pays for a full TS program (slow, heavyweight) to do dataflow that the type system doesn't actually accelerate, and still only approximates what option C computes exactly.

## Recommendation: split by demand, not by language

- **Semantics (P3 categories + traits, P7 lints)** → **runtime introspection (option C).** Add a `sharpee --introspect {story}` entry that loads the built story, runs world construction, and emits an entity/trait JSON manifest. This *is* a "Node helper" (preserving roadmap decision #4's hybrid bridge), but a **runtime** one — running the engine — not a TS-Compiler-API static analyzer. The Play panel (P5) already hosts a live world in its WKWebView; the same introspection call can be exposed over the existing JS bridge for zero-subprocess refresh, with the headless CLI path as the build-independent fallback.

- **Source positions (P3 navigation, P7 outline jump-to-line, P6 trait-cursor)** → **tree-sitter, reusing the editor's existing tree** (ADR-182 already calls for this). A *light* name→location index — find `createEntity('<name>', …)` literals and `new XTrait()` tokens — joins the runtime manifest's entities back to file:line. This is shallow syntactic scanning, not the deep dataflow classification that defeats static analysis.

This **reframes roadmap decision #4** (Node helper = TS Compiler API) rather than discarding it: the helper stays Node-side and stays the long-running subprocess, but its job is *running the engine and reporting the world*, not *statically parsing trait composition*. It also **honors ADR-182's consequence** ("semantic data comes from the P3 helper; tree-sitter is syntactic only") — we're just clarifying that the helper's semantics come from runtime, not static, analysis.

## Open questions for David

1. **Build dependency.** Runtime introspection needs a successful build. Acceptable for the project tree to be empty/stale until first successful build, with WKWebView-live refresh thereafter? (Static analysis would work on broken source — but produces wrong answers, per findings above.)
2. **Manifest source of truth.** Headless CLI (`sharpee --introspect`) vs. live WKWebView bridge vs. both (CLI for cold open, bridge for live refresh)?
3. **ADR-worthy?** This reverses a recorded roadmap decision and constrains P6/P7 — likely yes. Supersedes/extends decision #4; complements ADR-182.
