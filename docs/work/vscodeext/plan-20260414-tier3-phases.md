# Session Plan: VS Code Extension — Tier 3: Reference Panels

**Created**: 2026-04-14
**Branch**: feature/vscode-ext-tier3
**Overall scope**: Replace the Tier 2 tree-based World Explorer with HTML webview panels modeled on the Inform IDE's Index pages. Six reference panels planned: World, Entity, Actions, Traits, Behaviors, Language. Work begins with a POC — proven webview scaffolding and a World Index panel — before expanding platform data extraction or building the remaining panels.
**Bounded contexts touched**: N/A — tooling only. Phases 2, 3, 4, and 5 each require platform package changes that must be discussed before implementation.
**Key domain language**: N/A

---

## Constraint: POC First

Per user direction: start with mock webviews and expand data extraction incrementally. Do not jump to full implementation of all six panels before the webview pattern is proven and the data pipeline is tested end-to-end.

## Constraint: Platform vs. Story Segregation from Day One

Every data structure and HTML template must distinguish **platform** (stdlib/engine/world-model) content from **story-defined** content from Phase 1 onward. This is not a Phase 3+ concern — it shapes the data model, the CLI output schema, and the panel rendering. Each panel renders two sections: platform items first, then story items. The data loader tags each item with an `origin: 'platform' | 'story'` field. For Phase 1 (World Index), rooms and entities are all story-defined, but the per-entity trait list should already split stdlib traits from custom traits visually.

## Platform Change Notices

**Phase 2** requires changes to platform packages (`lang-en-us`, `world-model`, engine/CLI):
- Add `getAllMessages()` to `EnglishLanguageProvider`
- Call `getAllCapabilityBindings()` from CLI output
- Include all registered actions (stdlib + story) in CLI output
- Evolve `--world-json` to `--introspect` or add a supplemental flag

These are changes to `packages/` and **must be discussed and approved before implementation**.

**Phase 5** requires the heaviest platform change:
- Add optional `static properties` schema to `ITraitConstructor`
- Annotate stdlib traits with property schemas

This also **requires discussion before implementation**.

---

## Phases

### Phase 1: POC — Webview Infrastructure and World Index Panel
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — tooling/extension infrastructure
- **Entry state**: Tier 2 extension ships a `WorldExplorerProvider` tree view that doesn't scale to large stories like Dungeo; `--world-json` already emits rooms (id, name, aliases, isDark, exits), entities (id, name, location, trait type names), and NPCs (id, name, location, traits, behaviorId); webview infrastructure does not yet exist in `tools/vscode-ext/`
- **Deliverable**:
  - New `src/webview/` directory in `tools/vscode-ext/` containing:
    - `webview-panel-manager.ts` — opens/reveals named `vscode.WebviewPanel` instances, handles disposal, manages message-passing bridge (extension ↔ webview)
    - `world-index-panel.ts` — builds the World Index HTML from `--world-json` data; renders rooms grouped by inferred region (group by common name prefix or exit graph clustering), with exits, contents, and dark-room flag per room; CSS layout suitable for large stories (scrollable, structured, not a raw JSON dump)
    - `panel-data-loader.ts` — runs `node dist/cli/sharpee.js --world-json` as a child process and parses the JSON output; caches result per build; exposes the data object to panel builders; tags each item with `origin: 'platform' | 'story'` (for Phase 1: rooms/entities are story, trait types are classified against a known stdlib trait list)
  - New command `sharpee.openWorldIndex` — "Sharpee: Open World Index" — registered in `package.json` and `extension.ts`; opens the World Index panel in a new editor column
  - Tier 2 `WorldExplorerProvider` tree view **removed** from the sidebar; the Activity Bar icon now opens the World Index panel command instead (or is removed if panels are command-only)
  - The panel HTML uses a proper CSS layout: region headers, room cards with exit lists and contents, dark-room visual indicator; no raw JSON output visible to the user
  - Entity trait badges in the World Index visually distinguish stdlib traits (neutral) from story-custom traits (highlighted) — establishes the platform/story visual language used by all later panels
  - Panel reloads when a new build completes (listens for the build-complete event already emitted by the Tier 2 build provider)
  - `vsce package` produces a valid `.vsix`; manual install and `sharpee.openWorldIndex` renders the Dungeo world without errors
- **Exit state**: Webview pattern is proven; World Index panel renders live Dungeo data; message-passing bridge works; tree view is gone; the POC is the canonical world browsing experience
- **Status**: CURRENT

### Phase 2: Expand CLI Introspection Output (PLATFORM CHANGES — discuss first)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — platform CLI output and registry exposure
- **Entry state**: Phase 1 complete; webview pattern proven; `--world-json` exposes rooms/entities/NPCs but not behaviors, language messages, or action registry; platform changes have been discussed and approved
- **Deliverable**:
  - `EnglishLanguageProvider` gains a public `getAllMessages(): Map<string, string>` method (or equivalent read-only accessor) — the private `messages` Map is already populated at startup
  - CLI output (via `--world-json` or a new `--introspect` flag — implementation choice resolved during discussion) includes:
    - `behaviors`: output of `getAllCapabilityBindings()` from `capability-registry.ts` — array of `{ traitType, actionId, hasFourPhases }` entries
    - `actions`: all registered actions (stdlib + story) with `{ id, group, verbs }` — verbs sourced from grammar registration where available
    - `messages`: all message ID → text mappings from the active language provider
  - `panel-data-loader.ts` updated to parse and expose the new fields
  - No panel rendering changes in this phase — data is loaded and accessible but not yet displayed
  - Platform package tests pass (`pnpm --filter '@sharpee/world-model' test`, `pnpm --filter '@sharpee/sharpee' test`)
  - Full walkthrough chain passes unchanged
- **Exit state**: CLI output contains behaviors, actions, and language messages; panel data loader exposes all fields; platform tests green; approved platform changes are merged or ready to merge before Phase 3 begins
- **Status**: PENDING

### Phase 3: Entity Index and Actions Index Panels
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — tooling
- **Entry state**: Phase 2 complete; expanded introspect data available (behaviors, actions, messages); webview panel manager and World Index panel are the established pattern to follow
- **Deliverable**:
  - `entity-index-panel.ts` — Entity Index HTML panel:
    - Entities grouped by trait type (all containers, all light sources, all treasures, etc.)
    - Platform section (entities using only stdlib traits) vs. story section (entities with custom traits)
    - Each entity card: name, ID, location (linked to World Index room), trait list, key property values
  - `actions-index-panel.ts` — Actions Index HTML panel:
    - Platform section: stdlib actions with verb aliases and slot constraints
    - Story section: story-specific actions with grammar patterns
    - Each action row: ID, group, registered verbs, pattern syntax
  - New commands `sharpee.openEntityIndex` and `sharpee.openActionsIndex` registered in `package.json` and `extension.ts`
  - Both panels use the same CSS design language as the World Index panel
  - `vsce package` produces a valid `.vsix`; both panels render Dungeo data without errors
- **Exit state**: Entity Index and Actions Index panels are functional and visually consistent with World Index; three of six planned panels are complete
- **Status**: PENDING

### Phase 4: Behaviors Index and Language Index Panels
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — tooling
- **Entry state**: Phase 3 complete; all six panels' data sources are available (behaviors and messages from Phase 2, trait/entity data from Phase 3)
- **Deliverable**:
  - `behaviors-index-panel.ts` — Behaviors Index HTML panel:
    - Platform section (stdlib capability registrations) vs. story section (story-registered behaviors)
    - Each row: trait type it's registered on, action ID it handles, four-phase entry points present (validate/execute/report/blocked)
    - Cross-reference links to Entity Index (traits) and Actions Index (action IDs) — links open the relevant panel scrolled to the matching entry where feasible
  - `language-index-panel.ts` — Language Index HTML panel:
    - Detects active language package from story config or package dependencies
    - Platform section: default messages from the language package, grouped by action/category
    - Story section: story-overridden message IDs and story-defined additions
    - Each row: message ID, text (or function signature for template messages), which action produces it, whether the story overrides it
    - Visual flag for message IDs with no registered text (missing overrides)
  - New commands `sharpee.openBehaviorsIndex` and `sharpee.openLanguageIndex` registered
  - Both panels use consistent CSS design language
  - `vsce package` produces a valid `.vsix`; both panels render Dungeo data without errors
- **Exit state**: Five of six panels are functional; only Traits Index (requiring schema infrastructure) remains
- **Status**: PENDING

### Phase 5: Traits Index (PLATFORM CHANGES — discuss first)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: N/A — platform trait introspection infrastructure plus tooling
- **Entry state**: Phase 4 complete; five panels functional; platform trait schema changes have been discussed and approved; `ITraitConstructor` does not yet have an optional `static properties` field
- **Deliverable**:
  - Platform changes (packages/world-model):
    - `ITraitConstructor` interface gains `static properties?: TraitPropertySchema[]` where `TraitPropertySchema = { name: string; type: string; description?: string }`
    - All stdlib traits in `packages/world-model/src/traits/` annotated with `static properties` arrays covering their significant fields (OpenableTrait: isOpen, isLocked, openDescription, closedDescription; ContainerTrait: isTransparent, capacity; LightSourceTrait: isLit, litDescription, unlitDescription; etc.)
    - CLI introspect output includes trait schema data: `{ traitType, properties: TraitPropertySchema[] }` for all registered traits
  - `traits-index-panel.ts` — Traits Index HTML panel:
    - Platform section: stdlib/world-model trait definitions with property tables
    - Story section: story-defined traits
    - Each trait card: type ID, property list with types, which entities currently have this trait (count + names), registered capability behaviors (cross-reference to Behaviors Index)
  - New command `sharpee.openTraitsIndex` registered
  - Platform package tests pass including new trait schema tests
  - Full walkthrough chain passes unchanged
  - `vsce package` produces a valid `.vsix`; Traits Index renders Dungeo trait data without errors
- **Exit state**: All six reference panels are functional; trait schema infrastructure is in platform; the extension is complete for Tier 3
- **Status**: PENDING
