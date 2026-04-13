# VS Code Extension — Tier 3: Reference Panels

**Created**: 2026-04-14
**Status**: Proposal — not yet scoped into phases

## Concept

Replace the tree-based World Explorer (Tier 2 Phase 3) with a set of HTML reference panels rendered via VS Code `WebviewPanel`. Modeled on the Inform IDE's Index pages, these panels provide a live, generated reference to the compiled story — organized by how authors think about the game, not by file structure.

Each panel distinguishes **platform** (stdlib/engine) content from **story-specific** content, serving as both a platform reference ("what can I use?") and a story audit ("what did I add?").

## Reference Panels

### 1. World Index

Rooms grouped by region, with connection diagrams and per-room contents listings.

- Room connection visualization (graph or grid layout by region)
- Each room shows: name, ID, dark flag, exits, contained entities
- Region grouping (requires `--world-json` to emit region data, or infer from source structure)
- Highlights dead ends, one-way exits, disconnected rooms

### 2. Entity Index

Entities organized by trait/type rather than by location.

- **Platform section**: entities using only stdlib traits (containers, supporters, light sources, etc.)
- **Story section**: entities with custom traits or story-specific configurations
- Group by trait category: all containers, all light sources, all treasures, all wearables
- Each entity shows: name, ID, location, trait list, key property values

### 3. Actions Index

All actions with their verbs, grammar patterns, and action groups.

- **Platform section**: stdlib actions (43 standard actions) with verb aliases and slot constraints
- **Story section**: story-specific actions (SAY, INCANT, RING, etc.) with their grammar patterns
- Each action shows: ID, group, registered verbs, pattern syntax
- Links to source file where the action is defined

### 4. Traits Index

Every trait type in the system with properties, usage, and capability registrations.

- **Platform section**: stdlib/world-model traits (OpenableTrait, ContainerTrait, LockableTrait, etc.)
- **Story section**: story-defined traits (TrollAxeTrait, BasketElevatorTrait, etc.)
- Each trait shows: type ID, properties with types, which entities have it, registered capabilities
- Cross-reference to Behaviors Index for capability dispatch

### 5. Behaviors Index

Capability behaviors and their registrations.

- **Platform section**: stdlib behaviors (standard action dispatch)
- **Story section**: story-registered capability behaviors
- Each behavior shows: trait type it's registered on, action ID it handles, four-phase entry points (validate/execute/report/blocked)
- Cross-reference to Traits Index and Actions Index

### 6. Language Index

All message IDs and their default text from the language layer (`lang-en-us`).

- The extension detects which language package the current story uses (from story config or package dependencies — e.g., `lang-en-us`, `lang-es`, a custom lang package) and shows that language's messages
- **Platform section**: default messages from the detected language package — organized by action/category (taking messages, dropping messages, container messages, error messages, etc.)
- **Story section**: story-overridden messages and story-defined message IDs
- Each message shows: message ID, default text (or template function signature), which action produces it, whether the story overrides it
- Highlights missing story overrides (message IDs that exist in stdlib but have no mapping in the active language package)
- Useful for: finding the right message ID to override, checking consistency of voice/tone across all output, auditing which default messages a story still relies on
- If the story uses a custom or partial language package, clearly flags message IDs with no registered text

## Platform Changes Required

The current `--world-json` output provides rooms, entities, and NPCs with basic trait type names. A full reference panel system would need richer introspection:

1. **Trait definitions**: Property names and types for each trait, not just the trait type string
2. **Actions registry**: All registered actions with their IDs, groups, verb patterns
3. **Capability registrations**: Which behaviors are registered for which trait/action pairs
4. **Grammar patterns**: Registered verb patterns and slot constraints
5. **Language registry**: All registered message IDs with their default text/template functions
6. **Story language overrides**: Which message IDs the story has replaced or added
7. **Region metadata**: Which rooms belong to which region (currently only in source structure)
8. **Source hints**: File paths where entities/traits/actions are defined (for click-to-navigate)

This would likely mean evolving `--world-json` into a broader `--introspect` flag (or multiple flags) that serializes the full runtime registry state.

## Open Questions

- Should this be a single webview with tabs, or separate webview panels per index?
- Should the HTML be generated once per build, or on-demand when the panel is opened?
- How much of the trait/behavior introspection can be extracted from the runtime vs. requiring static analysis of source?
- Should the panels be interactive (filter/search/click-to-navigate) or static reference pages?
- The Tier 2 tree view (Phase 3) should be replaced by the webview World Index — the tree doesn't scale to large stories like Dungeo

## Relationship to Tier 2

- Tier 2 Phase 3 (World Explorer tree view) gets removed — it doesn't scale to large stories. The webview World Index replaces it entirely
- Tier 2 Phase 4 (Entity Autocomplete) remains useful — it operates on the same cached data
- The Activity Bar sidebar container registered in Tier 2 can be repurposed as a launcher for the webview panels, or removed if panels are opened via commands only
