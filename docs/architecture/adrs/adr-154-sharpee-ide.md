# ADR-154: Sharpee IDE — Purpose-Built Authoring Environment

## Status: PROPOSAL

## Date: 2026-04-20

## Context

Sharpee targets a **spectrum of authors**, not a single persona:

| Persona                 | Comfort with                    | Current fit                                               |
| ----------------------- | ------------------------------- | --------------------------------------------------------- |
| Developer-first author  | npm, pnpm, TypeScript, git      | Excellent — the existing workspace is exactly their tool  |
| VS Code-comfortable     | Any editor with extensions      | Good — VS Code + proposed Sharpee extension works         |
| Writer-first author     | Wants to _write_, not configure | **Poor** — VS Code is already too much                    |
| No-code author          | GUI tools, no text editing      | Out of scope for this ADR — see "Scope Boundary" below    |

The **writer-first author** is the gap. They are willing to type TypeScript (the `room({...})` / `scenery({...})` authoring idioms Sharpee already provides are close enough to prose-with-braces that this is not the barrier) — but they are not willing to learn VS Code's settings, marketplace, command palette, keybindings, git integration, terminal, and extension ecosystem just to write a story. A general-purpose editor is a full software-development environment pretending to be a writing tool. Every surface that isn't about writing IF is surface the writer has to learn to ignore.

The complementary packaging concern — how Sharpee's _runtime_ reaches the author's machine without an npm install — is covered by `docs/work/sharpee-standalone.md` and is not this ADR's scope. This ADR is about the **authoring tool**, not the runtime.

### Sharpee's project taxonomy

Three kinds of author-authored artifact exist in the Sharpee ecosystem — all runtime-level, serving different architectural layers:

1. **Story** — a playable piece of interactive fiction. Rooms, objects, NPCs, regions, a `story.ts`. This is what most people think of when they hear "writing for Sharpee."
2. **Extension** — a reusable package that adds _content and mechanics_ to the runtime: new traits, new grammar patterns, new behaviors, new actions, new message catalogs. Declarative in shape — "here is a Conversation trait and the grammar that drives it." Consumed by stories as library dependencies. Example shape: `@sharpee/ext-conversation`, `@community/ext-horror-kit`.
3. **Plugin** — a reusable package that implements a _turn-loop subsystem_: a `TurnPlugin` implementation with `id`, `priority`, an `onAfterAction` hook, and save/restore state. Imperative in shape — "here is something that runs every turn after the player acts." Already present in the codebase as `plugin-npc` (NPC turns), `plugin-scheduler` (daemons and fuses), `plugin-state-machine`. Consumed by stories at engine-composition time.

The difference between Extension and Plugin is architectural, not philosophical:

| Aspect             | Extension                              | Plugin                                  |
| ------------------ | -------------------------------------- | --------------------------------------- |
| Shape              | Declarative content / mechanics        | Imperative turn-loop participant        |
| Engine integration | Registers traits, grammar, actions     | Implements `TurnPlugin` interface       |
| Lifecycle          | Loaded at story compose time           | Runs every turn at its priority         |
| State              | Stateless (state lives on entities)    | Stateful (participates in save/restore) |
| Examples           | conversation, combat, horror toolkit   | plugin-npc, plugin-scheduler            |

These three project types are **distinct at the project level** — each has its own template, its own project manifest, its own validation rules — and they **compose at the story level**: a Story project consumes Extensions and Plugins as dependencies.

A general-purpose editor does not know about this taxonomy. It shows folders and files. The Sharpee IDE's organizing principle is the taxonomy — the author sees Stories, Extensions, and Plugins as first-class objects, not directories to be navigated.

## Decision

We will build a **dedicated Sharpee IDE**: a desktop application purpose-built for authoring Sharpee projects. It is distinct from (and complementary to) the planned Sharpee VS Code extension, which remains the recommendation for developer-first authors.

The IDE ships with the following architectural commitments:

### 1. Three project types — Story, Extension, Plugin

The IDE's project model recognizes exactly three kinds of project, matching the architectural shapes the platform already supports:

- **Story project** — an IF work-in-progress. Sidebar organized by conceptual units: Rooms, Objects, NPCs, Regions, Grammar, Story Settings. Also surfaces installed Extensions and Plugins as read-only sidebar sections (with "open in new window" links into their own projects).
- **Extension project** — a reusable content/mechanics package. Sidebar organized by what the extension provides: Traits, Behaviors, Actions, Grammar, Messages. Produces a package that Stories install as a dependency.
- **Plugin project** — a `TurnPlugin` subsystem. Sidebar organized by the plugin's shape: the TurnPlugin entry point, state types, turn-hook implementations, priority declaration. Produces a package that Stories install as a dependency.

On "New Project" the author picks one of the three; the IDE scaffolds the appropriate folder layout and manifest. All three are pure TypeScript packages consumed by the Sharpee runtime — the IDE's job is to present each in a form that matches its architectural role.

### 2. Extension vs Plugin — both runtime, different shapes

Both Extensions and Plugins are consumed by the Sharpee _runtime_. Neither is an IDE-level addition. They differ in architectural shape, not in where they run:

- **Extensions** register declarative content: traits, grammar patterns, behaviors, actions, messages. A story that installs `@sharpee/ext-conversation` gets new verbs, new traits, new NPC archetypes. Extensions don't participate in the turn loop directly; entities that use extension-provided traits are acted on by the existing action pipeline.
- **Plugins** implement `TurnPlugin` and run every turn. They have an `id`, a `priority` (ordering), an `onAfterAction(context)` hook, and optional state participating in save/restore. The existing `plugin-npc` gives NPCs their turn after the player acts; `plugin-scheduler` runs daemons and fuses; `plugin-state-machine` advances story state.

A "conversation system" is an Extension (it adds a trait and grammar). "NPCs that take turns" is a Plugin (it hooks the turn lifecycle). The same concept never fits both — the interface boundary (declarative registration vs. `TurnPlugin` implementation) decides it.

### 3. Story sidebar surfaces its Extensions and Plugins

When a Story project is open, its installed Extensions and Plugins appear as sidebar sections below the story's own content, making the runtime dependency graph visible at authoring time. They are:

- **Read-only in the story view** — the author cannot edit extension/plugin code from inside a story (that would break the dependency boundary).
- **Navigable** — each extension/plugin has an "open in new window" action that opens that extension or plugin as its own project in a second IDE window.
- **Version-aware** — the sidebar shows the installed version; an update indicator appears when a newer version is available.

This makes the runtime composition visible at-a-glance: an author can see every extension and plugin shaping their story's behavior without leaving the authoring surface.

### 4. Configure-once runtime — bundle or point-once

The author never runs `node` or `npm`. Two acceptable configuration models:

- **Bundled** — the IDE ships Node and `sharpee.js` internally. Zero author configuration. Larger download (see `docs/work/sharpee-standalone.md` option 5).
- **Point-once** — on first launch, the IDE asks the author to select (or auto-detect) a Node binary and a `sharpee.js` bundle, persists those paths, and never asks again.

The default is **bundled**. Point-once exists for authors who want to track a specific Sharpee build (alpha/beta testers).

### 5. Purpose-built surface — no general-editor features

The IDE deliberately excludes features that define general editors but that a writer-first author does not need:

- No integrated terminal
- No git UI (we may add export-to-git for publishing, but not a diff viewer, blame, branch manager)
- No editor-plugin marketplace — the IDE is not an extension platform for arbitrary general-purpose editor features. (Sharpee Extensions and Plugins are _runtime_ things the IDE displays, not IDE features.)
- No language-server support for languages other than TypeScript
- No per-keystroke debugger, no breakpoints in arbitrary code

What the IDE _does_ include:

- A TypeScript editor tuned for Sharpee — autocomplete knows about traits, behaviors, grammar patterns; snippets for common authoring moves ("new room," "new portable object," "new NPC with conversation")
- Play button — launches the embedded runtime with the current story
- Build button — produces publishable artifacts (browser, Zifmia, standalone)
- Story outline view — lists all rooms, objects, NPCs in one place
- Inline help — hover any trait name to see its documentation, its required/optional properties, and the actions that respond to it

### 6. TypeScript-on-disk, not opaque storage

The author's story, extension, or plugin remains a **folder of TypeScript files on disk** — the same folder a developer-first author would open in VS Code. The IDE does not introduce a proprietary project format.

Consequences:

- A story authored in the Sharpee IDE can be opened in VS Code, committed to git, and built by `build.sh` without modification.
- A developer-first collaborator can work on the same project without installing the IDE.
- The IDE is a _view_ of the folder, not a container for it.

The IDE may maintain an `.sharpee-ide/` subfolder for IDE-specific state (cursor positions, folded sections, per-file notes), the way VS Code uses `.vscode/`.

## Alternatives Considered

### A. VS Code extension only

Ship a rich Sharpee VS Code extension and point all authors there. Developer-first authors love it; writer-first authors hit the same "too much editor" wall.

**Rejected as sole solution** — VS Code is the right answer for developer-first authors (and we will still ship the extension for them). It is not the right answer for writer-first authors. This ADR does not replace the extension; it complements it.

### B. Web-based authoring tool

A browser-hosted authoring environment at, say, `author.sharpee.net`. Lower install friction (no download) but pulls every author into a SaaS model, requires ongoing hosting, and complicates offline authoring. File handling in browsers is still awkward (directory APIs are partial, save-to-disk flows are clunky).

**Rejected for v1** — the desktop IDE is a better match for the "writer opens a folder of files, edits them, plays the result" model. A web authoring surface may be worth revisiting later, particularly for collaboration, but is not the baseline.

### C. No dedicated IDE — document the VS Code path only

Accept the writer-first author gap and hope the community produces alternative tools.

**Rejected** — Sharpee's thesis includes making IF authoring approachable. Ceding the writer-first persona to "someone else will build it" contradicts the thesis. The IDE is the first-party answer.

### D. One project type ("Sharpee project")

Collapse Story, Extension, and Plugin into a single project type distinguished by a manifest flag. Simpler conceptually.

**Rejected** — the three project types have meaningfully different sidebars, different scaffold templates, and different validation rules. A Story's sidebar is rooms/objects/NPCs; an Extension's is traits/grammar/actions; a Plugin's is `TurnPlugin` hook + state. Collapsing them forces the IDE to probe the manifest at every turn and surface a union of all three views, which defeats the "organized by the thing you're working on" principle.

## Scope Boundary

This ADR defines the **authoring tool for authors willing to write TypeScript**. It does not commit to:

- **A no-code authoring tool** for authors who will not write code at all. That is a separate question. If Sharpee ever ships a Twine/RPG-Maker-style no-code surface, it would be a distinct product, likely a Plugin to this IDE (a "Visual Story Builder" plugin) or a separate app entirely.
- **A DSL on top of the TypeScript API.** The authoring API stays TypeScript. The IDE's job is to make that TypeScript pleasant to work with; it is not the IDE's job to present a different language.
- **A specific implementation technology** (Electron vs Tauri vs native). Implementation choice is deferred to the implementation plan.
- **The runtime distribution** — how Node and `sharpee.js` physically reach the author's machine is in `docs/work/sharpee-standalone.md`. The IDE consumes whatever that document lands on.

## Consequences

### Positive

- The writer-first author persona is served by a first-party tool tuned to their needs.
- The project taxonomy (Story / Extension / Plugin) becomes visible in tooling, reinforcing the mental model and guiding community contributions into the right bucket.
- Developer-first authors are unaffected — VS Code remains the recommended path for them.
- Extensions and Plugins get a marketplace-adjacent surface inside the IDE without Sharpee operating an actual marketplace.
- Stories remain plain folders of TypeScript, preserving interop with CI, git, `build.sh`, and developer-first collaborators.

### Negative

- Maintaining a desktop IDE is a non-trivial long-term commitment. Bugs in the IDE become Sharpee-project bugs.
- The IDE and the VS Code extension are two surfaces to keep feature-parity on for anything that matters to both personas (syntax highlighting, snippets, trait autocomplete).
- Bundled runtime means larger downloads (~80–90 MB per platform) and a release cadence tied to Node/Sharpee releases.
- Signing and notarization on macOS and Windows become ongoing operational work.

### Neutral

- Both the Extension system and the Plugin system (`TurnPlugin`) already exist in the codebase. The IDE is a new _view_ of existing concepts, not a new API surface. If the IDE exposes project-type validation or scaffolding rules that constrain what a "well-formed" Extension or Plugin looks like, those rules may need their own ADR if they diverge from the platform's current tolerance.

## Implementation Plan

(High level only — detailed plan in `docs/work/sharpee-ide/plan-*.md` once this ADR is accepted.)

1. **Phase 0 — prototype shell.** Pick implementation technology (Electron or Tauri). Build a window that opens a folder, lists its files in a tree, and edits one file.
2. **Phase 1 — Story project type.** Scaffolding, sidebar organized by rooms/objects/NPCs/regions, embedded Monaco editor with Sharpee-aware TypeScript support.
3. **Phase 2 — Play button.** Embed the standalone Sharpee runtime (per `docs/work/sharpee-standalone.md`). Launch a story, stream output back to a Play panel inside the IDE.
4. **Phase 3 — Build button.** Produce browser + Zifmia artifacts via `build.sh` pathways.
5. **Phase 4 — Extension project type.** Scaffold, validate, package. Consume `@sharpee/core`, `@sharpee/world-model`, `@sharpee/stdlib` the same way existing extensions do.
6. **Phase 5 — Plugin project type.** Scaffold a `TurnPlugin` implementation against `@sharpee/plugins`. Shape the sidebar around the plugin's turn-hook and state surface. Pattern after existing `plugin-npc` / `plugin-scheduler` layout.
7. **Phase 6 — Story sidebar surfaces Extensions and Plugins.** Dependency inspection from `package.json`, "open in new window" action, version-awareness.
8. **Phase 7 — Writer-first polish.** Inline trait help, snippet library, outline view, search, the niceties that make the IDE pleasant rather than merely functional.

## References

- `docs/work/sharpee-standalone.md` — runtime distribution options (prerequisite for IDE Phase 2)
- `docs/work/forge/` — LLM-assisted authoring (separate product, compatible with this IDE via Plugin API)
- ADR-070 — NPC System Architecture (embodied by `plugin-npc` — the canonical Plugin example)
- ADR-071 — Daemons and Fuses (embodied by `plugin-scheduler` — the second canonical Plugin example)
- ADR-153 — Multiuser Sharpee Server (unrelated product, no dependency)
- `packages/plugins/src/turn-plugin.ts` — the `TurnPlugin` interface that all Plugin projects implement
- Inform 7 IDE — the historical precedent for a purpose-built IF authoring environment (cited as conceptual influence, not a direct model — Sharpee's IDE edits TypeScript, not a natural-language DSL)

---

_Status: PROPOSAL — not yet accepted. Feedback welcome._
