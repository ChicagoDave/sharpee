# ADR-184: IDE project introspection via runtime world model

## Status: ACCEPTED

## Date: 2026-06-19

## Context

P3 of the Sharpee IDE replaces the raw filesystem tree with a **Sharpee-aware project
view** — virtual categories (Rooms · Objects · NPCs · Regions · Grammar · Story Settings)
instead of folders. Two later phases build on the same data: P7 (outline + problems/lints)
and P6 (trait hints). All three need to answer "what entities does this story define, and
what traits does each carry?"

The phase plan (`plan-20260509-phases.md`, decision #4) specced this as a **Node-side helper
using the TypeScript Compiler API** that would *"identify each `.ts` file's primary export by
trait composition (`RoomTrait` → Room)."* ADR-182 then adopted tree-sitter for the editor and
noted in its consequences that "trait-position detection should reuse the parse tree" while
"semantic, type-aware data still comes from the P3 Node helper." That left an unresolved
question: **does trait-composition classification come from static source analysis (TS
Compiler API, or the tree-sitter tree), or from somewhere else?**

Investigation of the actual story sources (`stories/thealderman`, `stories/dungeo`) showed the
static-analysis framing is unworkable. Findings (full write-up:
`docs/work/sharpee-ide/research-20260619-p3-introspection-architecture.md`):

1. **Entities are not exports.** They are local `const`s built imperatively inside functions
   (`world.createEntity('nightstand', EntityType.ITEM)` then `.add(new SceneryTrait())`,
   `.add(new ContainerTrait(...))`). One file builds many entities via one exported
   `createObjects(world)`; there is no "primary export" to classify.
2. **Trait identity is the constructor name, not the type.** You know an entity is a container
   from `new ContainerTrait(...)` — a syntactic token. The TS *type system* contributes
   nothing; the work is dataflow (track the local `const` through its `.add()` calls), which is
   identical whether tree-sitter or the TS Compiler API holds the AST.
3. **Trait calls hide behind story-local wrappers.** The Alderman's rooms go through
   `createRoom(world, name, desc)`, so `new RoomTrait()` never textually appears in
   `rooms/index.ts`. Static classification would have to recognize each story's bespoke helper
   or follow it across function boundaries.
4. **Category is not directory.** The Alderman splits source into `rooms/`/`objects/`/`npcs/`,
   but Dungeo organizes by **region** (`white-house.ts`, `coal-mine.ts` each build rooms,
   items, and NPCs together). The mock's categories cut across Dungeo's files; convention-based
   categorization does not generalize.

The decisive asymmetry: the world model **already computes all of this exactly at runtime**.
After construction runs, the engine exposes `world.getAllEntities()`,
`entity.hasTrait(TraitType.ROOM)`, `entity.getTrait(RoomTrait)`, and
`world.findWhere(predicate)`. This is ground truth — immune to wrapper functions, import
aliases, and runtime-string entity names, all of which defeat static analysis. The only thing
runtime introspection lacks is **source position**: a runtime entity does not know which
file/line created it.

## Decision

**Split introspection by demand: runtime world model for semantics, tree-sitter for source
positions.**

### Semantics — runtime introspection (the "Node helper" is a runtime helper)

- The projection logic, **`buildManifest(world, story, generatedFrom)`**, lives in
  **`@sharpee/bootstrap`** — the shared loader/assembly layer (ADR-180) already imported by the
  bundle CLI, transcript-tester, and devkit. It walks `world.getAllEntities()` and emits an
  **entity/trait JSON manifest** (schema below). bootstrap is the right home because it already
  owns world construction (`resolveStoryModulePath` + `assembleGame`) and depends on world-model.
- The CLI surface is an **`--introspect {story}`** flag on the **platform-bundle CLI**
  (`scripts/bundle-entry.js`, compiled into `dist/cli/sharpee.js` — the entry that already owns
  `--play`/`--test`/`--world-json`), **not** the devkit `./sharpee` build CLI (ADR-180) and **not**
  a new engine binary. The flag handler loads the story via bootstrap's loader and calls
  `bootstrap.buildManifest(...)`, writing the JSON to stdout (status to stderr).
- **Entry-point rationale:** introspection *runs a story* — the same capability `--play`/`--test`
  already provide from this CLI. The devkit `./sharpee` CLI orchestrates *builds*; it does not load
  a world. Keeping the projection in bootstrap (next to `assembleGame`) and the flag in the bundle
  entry keeps "run the engine and report the world" in one place, reused by every consumer.
- This preserves phase-plan decision #4's hybrid bridge — the helper stays Node-side and stays
  the long-running subprocess — but **reframes its job**: it *runs the engine and reports the
  world*, it does **not** statically parse trait composition. Decision #4 is hereby amended to
  "runtime introspection," superseding "TS Compiler API static analysis."
- The manifest is ground truth and is the **only** source of semantic classification and
  lint input (P7). No static-analysis classifier is built.

### Source positions — tree-sitter, reusing the editor tree (ADR-182)

- A **light name→location index** scans source for `world.createEntity('<name>', …)` string
  literals and `new XTrait()` constructor tokens, recording file:line. This is shallow
  syntactic scanning over the tree-sitter tree already present in the editor (ADR-182) — **not**
  the deep dataflow classification that the findings show static analysis cannot do reliably.
- The index **joins** the runtime manifest's entities back to source by name, giving the
  project tree click-to-open and P7 its outline jump-to-line. P6 trait-cursor detection
  ("cursor is on a `RoomTrait` token") is the same tree-sitter token lookup.

### Two manifest paths, one schema

The manifest is produced two ways against a **single shared schema**:

- **Headless CLI** (`sharpee --introspect`) — for cold open and any time no Play session is
  live. Build-independent of the WKWebView.
- **Live WKWebView bridge** — the P5 Play panel already hosts a live world; expose the same
  introspection call over the existing JS bridge so the tree refreshes from the running world
  with zero subprocess.

The Swift side consumes one manifest shape regardless of source. Per the co-located wire-type
rule (DEVARCH 8b), the manifest schema lives **once** in a new types-only package
**`@sharpee/ide-protocol`** (modeled on `@sharpee/text-blocks`: `types.ts` + `guards.ts` +
`index.ts`, **no runtime-specific types** — no `Buffer`/`fs`/DOM), imported by **both** emitters:
the platform-bundle CLI (`--introspect`) and the JS bridge (story `browser-entry`). The Swift
`Codable` structs mirror it (the TS↔Swift language boundary precludes a direct import; the shared
TS file is the single source of truth and the Swift mirror tracks it). A schema change thus breaks
both JS emitters in the same compile, and the Swift decode test guards the mirror.

### Build dependency (accepted)

Semantic introspection requires a **successful build**. The project tree is empty (or shows
last-known-good) until the first successful build, then refreshes live via the WKWebView bridge
on subsequent builds/edits. This is accepted: static analysis could run on broken source, but
findings 1–4 show it would produce *wrong* answers — a correct-when-available tree beats a
wrong-always tree.

### Manifest schema

Defined in `@sharpee/ide-protocol`. The manifest is a flat entity list plus a build-status
header; the IDE buckets into categories client-side from `category`. Traits are reported as a
record of trait-type → the small set of fields the IDE actually consumes (not the full trait
object — the manifest is a projection, not a world dump).

```ts
/** Wire contract between `--introspect` / Play bridge and the IDE. No runtime-specific types. */
export interface ProjectManifest {
  schemaVersion: 1;                 // bump on any breaking shape change
  story: string;                    // story id (from StoryConfig)
  generatedFrom: 'cli' | 'bridge';  // which path produced this manifest
  entities: EntityNode[];
}

export type EntityCategory = 'room' | 'object' | 'npc' | 'region';

export interface EntityNode {
  id: string;                       // world entity id
  displayName: string;              // IdentityTrait name (authored text) — for the tree label
  category: EntityCategory;         // derived from the trait set (see rules)
  traits: TraitSummary;             // trait-type → IDE-relevant fields
  source?: SourceRef;               // file:line from the tree-sitter name index; absent if unresolved
}

export interface SourceRef {
  file: string;                     // workspace-relative path
  line: number;                     // 1-based; the createEntity('<name>', …) site
  resolution: 'exact' | 'scope';    // 'exact' = unique match; 'scope' = name occurs at multiple sites, first reported
}

/** Only the fields the IDE renders/lints on. Sparse: a key is present only if the entity has that trait. */
export interface TraitSummary {
  identity?: { description?: string };
  room?:     { exits: string[] };                 // exit directions present — drives the "room with no exits" lint
  container?: { openable: boolean; lockable: boolean };  // co-trait lint inputs
  [traitType: string]: Record<string, unknown> | undefined;  // forward-compatible: unknown traits pass through
}
```

**Category derivation** (single rule, runtime trait set — order matters, first match wins):

| Test (on the runtime entity) | `category` |
|---|---|
| `hasTrait(TraitType.REGION)` | `region` |
| `hasTrait(TraitType.ROOM)`   | `room`   |
| `hasTrait(TraitType.ACTOR)`  | `npc`    |
| otherwise (has `IdentityTrait`) | `object` |

Doors/exits are not top-level categories (they surface under their room's `exits`). Grammar and
story settings are not entities and are not in this manifest — the project tree sources those
separately (filesystem for grammar files, `package.json` for settings/deps).

**JSON example** (one room via The Alderman's `createRoom` wrapper, one openable object):

```json
{
  "schemaVersion": 1,
  "story": "thealderman",
  "generatedFrom": "cli",
  "entities": [
    { "id": "r01", "displayName": "Great Room", "category": "room",
      "traits": { "identity": { "description": "This is the grand foyer…" }, "room": { "exits": ["south","east","southeast","west"] } },
      "source": { "file": "stories/thealderman/src/rooms/index.ts", "line": 54, "resolution": "exact" } },
    { "id": "i07", "displayName": "nightstand", "category": "object",
      "traits": { "identity": {}, "container": { "openable": true, "lockable": false } },
      "source": { "file": "stories/thealderman/src/objects/index.ts", "line": 129, "resolution": "exact" } }
  ]
}
```

Note the room is correctly `category: "room"` despite `new RoomTrait()` never appearing in
`rooms/index.ts` (it's inside `createRoom`) — because the category comes from the *runtime* trait
set, not source. The `source` line points at the `createEntity`/wrapper call site from the
tree-sitter name index, joined by `displayName`.

## Consequences

- **The platform gains a public introspection surface.** `bootstrap.buildManifest`, the
  `--introspect` flag on the platform-bundle CLI, and the equivalent bridge-exposed call become a
  supported, versioned output — a `packages/` change (`@sharpee/bootstrap` projection + the new
  `@sharpee/ide-protocol` wire types + `scripts/bundle-entry.js` flag + the story `browser-entry`
  bridge), discussed and approved before implementation. The manifest schema is now an interface the
  IDE depends on; changing it is a wire-contract change gated by `schemaVersion`.
- **A new types-only package, `@sharpee/ide-protocol`.** Adds one workspace package (and its six
  registration points per the new-package checklist). It carries only the manifest wire types —
  no runtime deps — so both the Node emitter and the browser bridge import it cleanly.
- **No static trait classifier is ever built.** P7 lints ("room with no exits", "lockable
  without openable") read the runtime manifest's trait data, not a parsed approximation. This
  removes an entire class of "the analyzer disagrees with the engine" bugs.
- **tree-sitter's role is bounded to syntax/positions.** It supplies file:line for navigation
  and cursor-token identity (P6), never semantic classification. This sharpens ADR-182's
  "tree-sitter is syntactic only" into a hard line.
- **The project tree is build-gated.** Authors see an empty/stale tree on a story that has
  never built. Acceptable per the decision above; surfaced in the UI as a "build to populate"
  affordance rather than an error.
- **Story-author freedom is preserved.** Because classification is runtime, authors may build
  entities however they like — wrappers, loops, data-driven factories — and the tree stays
  correct. A static classifier would have constrained authoring style to stay analyzable.
- **The name→location join can be imperfect.** Two entities created from the same name string, or a
  name built by concatenation, may not resolve to a unique line. The tree still lists the entity (from
  the manifest); only the jump-to-source degrades — a name with multiple matching sites reports the
  **first** site flagged `scope` (ambiguous), and a name with none simply carries no `source`.

## Acceptance

- `node dist/cli/sharpee.js --introspect --story {story}` runs the **real built story** (via
  bootstrap's loader → `bootstrap.buildManifest`) and emits a `ProjectManifest` (`schemaVersion: 1`)
  whose entity set and per-entity trait set match what the engine constructs (no stub of the world
  model; the system under test is the engine). **[VERIFIED 2026-06-19 against Dungeo — exit 0.]**
- The manifest validates against the `@sharpee/ide-protocol` guards; `category` follows the
  derivation table (a `createRoom`-wrapped Alderman room reports `category: "room"`); unknown
  traits pass through `TraitSummary`'s index signature without dropping the entity. **[VERIFIED —
  `isProjectManifest(emitted)` is true.]**
- For Dungeo, the manifest buckets rooms, items, NPCs, and regions correctly **across**
  region-organized files (finding 4), and for The Alderman classifies wrapper-created rooms as
  rooms (finding 3) — neither achievable by static directory/export analysis. **[Dungeo VERIFIED —
  175 rooms / 155 objects / 15 regions / 6 npcs across per-region files; player and door/exit
  excluded. Alderman pending a story build.]**
- The name→location index resolves The Alderman's named objects and Dungeo's
  `createEntity('<name>', …)` sites to the correct file:line (`resolution: 'exact'`); a name matching
  multiple sites resolves to the first, flagged `'scope'`; an unresolved name carries no `source` —
  in every case the entity stays in the tree.
- The Swift side decodes the manifest from both the CLI path and the WKWebView bridge path
  through one schema; a schema mismatch fails the type/decode check on both sides.
- P3 project tree renders the manifest's categories; full IDE suite green.

## Alternatives rejected

- **TS Compiler API static classification (phase-plan decision #4 as written).** Heavyweight
  (a full TS program) to perform dataflow the type system does not accelerate (finding 2),
  defeated by wrappers (finding 3) and runtime-string names (finding 1), and still only
  *approximates* what the runtime computes exactly. The one capability it adds over tree-sitter
  — type resolution — is not the bottleneck.
- **tree-sitter AST classification (Swift-side semantics).** Same dataflow limits as the TS
  Compiler API, with less ability to follow cross-function wrappers. Keeps tree-sitter in its
  lane (positions) and nothing more.
- **Convention-based categorization (directory = category).** Works for The Alderman, breaks on
  Dungeo's region-organized source (finding 4). Not general.
- **Runtime-only, no source index.** Correct semantics but no click-to-open / jump-to-line;
  fails P7's navigation requirement. The light tree-sitter index is the minimum addition that
  restores navigation without reintroducing static classification.

## Session

Produced 2026-06-19 (session `822214`) on `main`, following the P2 merge (PR #133). Revised the
same session after a `/adr-review` (182/183/184) flagged the manifest schema as prose-only: added
the `## Manifest schema` section (concrete `ProjectManifest`/`EntityNode` types + category table +
JSON example), pinned the shared wire-type home (`@sharpee/ide-protocol`, DEVARCH 8b), and fixed
the entry point to the platform-bundle CLI rather than the devkit build CLI or a new engine binary.
Research: `docs/work/sharpee-ide/research-20260619-p3-introspection-architecture.md`.

**Implemented same session.** `@sharpee/ide-protocol` shipped (wire types + guards, 11 tests).
`buildManifest` landed in **`@sharpee/bootstrap`** (corrected from the review's "transcript-tester
cli" placement once the ADR-180 consolidation was recalled — the shared loader/assembly layer is
the right home, and the real bundle CLI entry is `scripts/bundle-entry.js`, not
`transcript-tester/cli.ts`). The `--introspect` flag was wired into `scripts/bundle-entry.js`
calling `bootstrap.buildManifest`. Verified end-to-end through `dist/cli/sharpee.js` against
Dungeo (exit 0; 351 entities bucketed across per-region files; output passes
`isProjectManifest`). Complements ADR-182 (tree-sitter syntax foundation); amends phase-plan
decision #4 (`docs/work/sharpee-ide/plan-20260509-phases.md`). Source-position index (tree-sitter)
and the WKWebView bridge path remain to implement.
