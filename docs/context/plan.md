# Session Plan: ADR-136 — Context-Driven Action Menus

**Created**: 2026-03-28
**Branch**: `adr-136-context-actions`
**Overall scope**: Implement the hybrid auto-compute + author-override action menu system described in ADR-136. The core is an authoring tool: the engine computes available actions from grammar × scope × traits, the author reviews and refines via an `actions.yaml` config file, and the build compiles those decisions into entity annotations. A browser-based editor provides a visual workflow for refining actions during play.
**Bounded contexts touched**: N/A — infrastructure/platform (engine, bridge, protocol, build system, browser client); no domain behavior change
**Key domain language**: N/A

## Constraints and Approach

- **Build flag gate**: `./build.sh --include-context-actions` injects `globalThis.INCLUDE_CONTEXT_ACTIONS=true` via esbuild `--define:`. When flag absent, `false` is injected and the computation module is tree-shaken from the bundle.
- **Capability gate at runtime**: Even when compiled in, the engine skips computation if `ClientCapabilities.actionMenu` is `false` (text-only clients are zero-overhead).
- **Author-driven depth**: Caps, categories, sort order, and which intransitive actions appear are all configurable per-story via `actions.yaml`. The computation engine has no hardcoded editorial decisions.
- **Single source of truth**: `actions.yaml` in the story directory holds all author overrides. The build compiles it into entity annotations. Authors never need to write `entity.annotate()` calls for action menu purposes.

---

## Phases

### Phase 1: Build Flag + Core Types
- **Tier**: Small
- **Budget**: 100
- **Entry state**: Branch `adr-136-context-actions` created; `build.sh` has flag parsing at lines 134-194; no `ContextAction` type exists; `INCLUDE_CONTEXT_ACTIONS` not defined
- **Deliverable**:
  - `build.sh` updated: `--include-context-actions` flag parsed; esbuild `--define:globalThis.INCLUDE_CONTEXT_ACTIONS=true` when present, `false` when absent
  - `ContextAction` interface defined (location TBD — `packages/if-domain/src/` or `packages/core/src/`)
  - `ActionsMessage` interface added to `packages/bridge/src/protocol.ts`
  - `ClientCapabilities` extended with `actionMenu?: boolean` and `maxActions?: number`
  - `actions.yaml` schema defined: top-level story config (defaults for caps, categories, intransitives) and per-entity overrides (suppress, hints, labels, conditions)
  - `./build.sh -s dungeo` passes (no regression)
  - `./build.sh -s dungeo --include-context-actions` passes (flag accepted)
- **Exit state**: Types exist and are importable; build flag gates compilation; YAML schema documented; no runtime behavior changed yet
- **Status**: DONE

### Phase 2: ActionMenuComputer Module
- **Tier**: Medium
- **Budget**: 250
- **Entry state**: Phase 1 complete; core types exist; grammar engine exposes `getRules()` / `getRulesForAction()`; scope methods available on `WorldModel`
- **Deliverable**:
  - New module (location TBD based on import structure)
  - `ActionMenuComputer` class: `compute(world, actorId, grammarEngine, config?): ContextAction[]`
  - Computation logic:
    - Collects entities by scope level (carried, reachable/touchable, visible)
    - Iterates grammar rules; for each rule with a `:target` slot, checks `traitFilters` against entity traits
    - Extracts verb label from pattern string
    - Produces direction actions from `RoomTrait` exits
    - Produces intransitive actions (configurable list from `actions.yaml`, not hardcoded)
    - Deduplicates by `(actionId, targetId)` pair
    - Applies suppressions and hints from compiled `actions.yaml` config
    - Categorizes, sorts, and caps per config (all configurable, no hardcoded defaults beyond sensible fallbacks)
  - Module body guarded for tree-shaking when flag is false
  - Unit tests:
    - Basic computation: room with portable item and openable entity produces expected actions
    - Alias dedup: "take" and "get" collapse to one entry
    - Suppression removes matching entry
    - Hint with true/false condition appears/hidden
    - Config-driven caps respected
  - Package tests pass
- **Exit state**: `ActionMenuComputer` is standalone and tested; not yet wired into turn cycle
- **Status**: DONE

### Phase 3: Engine Integration + Bridge Flush
- **Tier**: Small
- **Budget**: 100
- **Entry state**: Phase 2 complete; `ActionMenuComputer` tested; bridge has `ActionsMessage` type
- **Deliverable**:
  - `game-engine.ts` updated: after text processing, if `INCLUDE_CONTEXT_ACTIONS` and `ClientCapabilities.actionMenu`, call `ActionMenuComputer.compute()` and attach to turn output
  - Bridge `flushTurn()` updated: flush order becomes blocks → events → status → actions
  - `actions.yaml` loader: reads story-level config at engine init, passes to computer each turn
  - Integration test: enable `actionMenu`, run a turn, assert `actions` message contains movement + interaction entries
  - `./build.sh -s dungeo` passes (no regression)
  - `./build.sh -s dungeo --include-context-actions` passes
  - Unit transcripts and walkthrough chain unaffected
- **Exit state**: Engine produces `ActionsMessage` each turn through the bridge; text-only clients unaffected
- **Status**: DONE

### Phase 4: `--show-actions` CLI Preview Mode
- **Tier**: Small
- **Budget**: 100
- **Entry state**: Phase 3 complete; engine computes actions each turn
- **Deliverable**:
  - New CLI flag `--show-actions` for `--play` mode
  - After each turn's normal output, dumps the computed action menu in a readable format (grouped by category, showing command, verb, target, scope, priority)
  - Author can play through their story and see exactly what actions would surface at each point
  - Format designed for quick scanning: category headers, indented actions, suppressed actions shown as struck-through or marked
  - Works with `--test` mode too: after each transcript turn, appends the action list (useful for reviewing a walkthrough's action coverage)
- **Exit state**: Author can preview action menus during play and transcript testing
- **Status**: DONE

### Phase 5: `actions.yaml` Compiler
- **Tier**: Medium
- **Budget**: 250
- **Entry state**: Phase 4 complete; author can see computed actions via `--show-actions`; YAML schema defined in Phase 1
- **Deliverable**:
  - YAML parser reads `stories/{story}/actions.yaml`
  - Schema supports:
    - Story-level defaults: max actions, per-entity max, intransitive list, category definitions, sort order
    - Per-entity overrides keyed by entity name or ID: suppress (by action ID or command text), hints (command, label, priority, category, condition)
    - Conditions reference trait state (same model as ADR-124 annotation conditions)
  - Compiler runs at build time: reads YAML, resolves entity references, produces annotation data that the engine loads at init
  - Seed generator: `--generate-actions-yaml` flag runs the game through a set of rooms (or a transcript) and outputs a starter `actions.yaml` with all auto-computed actions as comments, ready for the author to uncomment and edit
  - Tests: YAML with suppressions/hints produces correct annotation data; malformed YAML produces clear error messages
- **Exit state**: Author edits a single YAML file; build compiles it; engine applies it at runtime
- **Status**: DONE

### Phase 6: Reference Client — Action Sidebar
- **Tier**: Medium
- **Budget**: 250
- **Entry state**: Phase 5 complete; engine produces refined `ActionsMessage` each turn
- **Deliverable**:
  - Browser client updated to receive and render `ActionsMessage`
  - Action sidebar panel: groups by category with section headers
  - Each action is a clickable button that submits the `command` text as player input
  - Movement actions rendered as direction buttons (compass rose or grid)
  - Toggle: show/hide action panel
  - Author `label` used when present; auto-generated verb + target otherwise
  - `./build.sh -s dungeo -c browser --include-context-actions` produces working browser client with sidebar
- **Exit state**: Browser client has functional action sidebar
- **Status**: DONE

### Phase 7: Browser Action Editor
- **Tier**: Medium
- **Budget**: 250
- **Entry state**: Phase 6 complete; browser client renders action sidebar; `actions.yaml` schema and compiler exist
- **Deliverable**:
  - Editor mode in browser client (toggled via UI button or keyboard shortcut)
  - In editor mode, each action in the sidebar has controls: suppress toggle, priority slider, custom label field, category dropdown
  - Changes are tracked as a diff against the auto-computed baseline
  - Export button: writes the author's editorial decisions as `actions.yaml` content (download or copy to clipboard)
  - Import: loads existing `actions.yaml` and shows its overrides applied to the current computed actions
  - Author workflow: play game → see actions → click to refine → export YAML → paste into story directory → rebuild
- **Exit state**: Full authoring loop — compute, preview, edit visually, export config, rebuild with config applied
- **Status**: DONE
