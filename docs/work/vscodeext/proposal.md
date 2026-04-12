# Sharpee VS Code Extension — Options & Proposal

## The Goal

Lower the barrier for IF authors. Today, writing a Sharpee story requires knowing TypeScript, the CLI, and the build system. A VS Code extension could make it feel like a creative tool, not a dev tool.

## Feature Options

### Tier 1: Low Effort, High Value

These are straightforward to implement and immediately useful.

**1. Transcript File Support**
- Syntax highlighting for `.transcript` files (commands, assertions, directives)
- Bracket matching for `GOAL/END GOAL`, `IF/END IF`, `WHILE/END WHILE`
- Hover tooltips for assertion syntax (`[OK: ...]`, `[EVENT: ...]`, `[STATE: ...]`)
- "Run Transcript" button in the editor gutter → executes `node dist/cli/sharpee.js --test <file>`
- Problem matcher: parse test output into VS Code diagnostics (red squiggles on failed assertions)

**2. Snippets for Story Authoring**
- `room` → full room builder with `world.helpers()`
- `object` → object builder with identity, aliases
- `container` → container with openable, capacity
- `door` → door between two rooms with lockable
- `actor` → NPC with NpcTrait and behavior registration
- `action` → four-phase action skeleton (validate/execute/report/blocked)
- `grammar` → parser extension pattern
- `message` → language.addMessage registration
- `daemon` → scheduler daemon skeleton
- `fuse` → scheduler fuse skeleton
- `trait` → custom trait with capabilities
- `behavior` → CapabilityBehavior skeleton

**3. New Story Wizard**
- Command palette: "Sharpee: New Story"
- Prompts for story title, author, ID, description
- Runs `npx @sharpee/sharpee init <name>` under the hood
- Opens the new project in a workspace

### Tier 2: Medium Effort, High Value

These require more work but significantly improve the authoring experience.

**4. Build & Play Integration**
- "Build Story" command (Ctrl+Shift+B default task)
- "Play Story" command → opens integrated terminal with `--play` mode
- "Play in Browser" command → builds with `-c browser` and opens `dist/web/`
- Build errors parsed into VS Code diagnostics
- Status bar: shows current story name, last build status

**5. World Explorer Panel**
- Tree view in the sidebar showing the game world after a build:
  - Rooms (with exits as child nodes)
  - Objects (grouped by location)
  - NPCs (with behavior names)
  - Custom actions
- Click a node → navigates to the source code that creates it
- Requires parsing the built story bundle or running a world-dump command

**6. Transcript Test Runner**
- Test explorer integration (VS Code's native test API)
- Discover all `.transcript` files in the workspace
- Run individual tests, run all, re-run failures
- Inline pass/fail markers in the transcript file
- Watch mode: re-run on file save

**7. Entity Autocomplete**
- When typing `world.helpers().room(`, suggest room names from the current story
- When typing `{ destination: `, suggest known room IDs
- When typing `keyId: `, suggest known item IDs
- Requires a lightweight language server that parses the story's `initializeWorld`

### Tier 3: High Effort, Very High Value

These are ambitious but would make Sharpee a standout authoring environment.

**8. Visual Map Editor**
- Webview panel showing rooms as nodes, exits as edges
- Drag to create new rooms, draw connections
- Click a room → edit its properties in a form
- Generates/updates TypeScript code in the story's map file
- Two-way: code changes update the visual, visual changes update the code

**9. Interactive Play Pane**
- Side panel that runs the game in real-time
- Type commands, see output — like a built-in terminal but styled
- Linked to the editor: when you change a room description and save, the game reloads
- Hot reload on save (rebuild + restart at last known state)

**10. Prose Preview**
- When cursor is on a `language.addMessage(...)` call, show the rendered text in a hover
- When cursor is on a room's description, show it formatted as the player would see it
- Parameter substitution preview (`{target}` → "velvet cloak")

**11. Guided Tutorial Mode**
- The Family Zoo tutorial steps as an interactive VS Code walkthrough
- Each step highlights the relevant code, explains the concept, and prompts the author to try it
- Uses VS Code's built-in walkthrough API
- "Next Step" button advances the tutorial

## What NOT to Build

- **A custom language/DSL.** Sharpee stories are TypeScript. TypeScript tooling is already excellent. Don't replace it.
- **A full IDE.** VS Code is the IDE. The extension adds Sharpee-specific features on top.
- **Anything that duplicates npm/CLI functionality.** The extension wraps existing commands, it doesn't replace them.

## Proposal: Start with Tiers 1 + 2

### Phase 1 — Foundation (Tier 1)
Ship an extension with transcript syntax highlighting, snippets, and the new story wizard. This is a weekend's worth of work and immediately useful.

**Deliverables:**
- `sharpee-vscode` extension package
- TextMate grammar for `.transcript` files
- 12+ snippets for common authoring patterns
- "Sharpee: New Story" command

### Phase 2 — Build Integration (Tier 2, items 4 + 6)
Add build/play commands and transcript test runner integration. This makes the edit-build-test loop seamless.

**Deliverables:**
- Build task provider with error diagnostics
- "Play" and "Play in Browser" commands
- Test explorer integration for transcripts
- Status bar indicator

### Phase 3 — World Explorer (Tier 2, items 5 + 7)
Add the world tree view and entity autocomplete. This requires a lightweight analysis of the story code.

**Deliverables:**
- Sidebar tree view of rooms, objects, NPCs
- Basic entity ID autocomplete in exit/key references

### Phase 4 — Visual (Tier 3, if there's appetite)
Map editor and interactive play pane. These are impressive but high-effort.

## Technical Notes

- Extension language: TypeScript (natural fit with Sharpee)
- Extension API: VS Code Extension API (well-documented, stable)
- Build integration: Task provider API + terminal API
- Test integration: Test Controller API (VS Code native test runner)
- World explorer: TreeDataProvider API
- Map editor: Webview API with a canvas library (e.g., d3-force, elkjs)
- Bundle size: keep it light — no heavy dependencies

## Naming

- Extension ID: `sharpee.sharpee-vscode` or `chicagodave.sharpee`
- Display name: "Sharpee — Interactive Fiction Authoring"
- Marketplace category: "Programming Languages" or "Other"

## Relationship to the Website

The website's "Getting Started" page should update to say: "Install the Sharpee extension for VS Code" as the primary path once the extension ships. The CLI remains available for authors who prefer it or don't use VS Code.
