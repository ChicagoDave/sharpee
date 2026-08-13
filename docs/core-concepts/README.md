# Sharpee Core Concepts Quick Reference

## Overview
Sharpee is an interactive fiction (IF) engine that uses a trait-based entity system, event-driven architecture, and a four-phase action pattern (validate/execute/report/blocked) for handling player commands.

Authors write stories in **Chord**, Sharpee's story language (`.story` files), which compiles to a Story IR that the platform interprets. Stories can also be written directly in TypeScript against the same packages.

### Where the work is

**The platform is now secondary to the Chord language and the IDE.** The engine, world model, stdlib, and the rest of `packages/` are the mature layer underneath; the active product is Chord — what an author actually writes — and the macOS IDE, where they write it.

Secondary does not mean subordinate. **Sharpee and Chord need to align as elegantly as possible**, and that is a two-sided obligation: a platform concept that Chord cannot express cleanly is as much a platform problem as a language one, and the fix belongs on whichever side makes the seam simpler. The recurring failure is a capability that exists in the engine with no natural way to say it in a `.story` file — a channel whose value is a record while `define channel` can only describe a scalar, say — which leaves authors reaching around the language for something the platform already does.

So the test for a `packages/` change is not "did Chord ask for this." It is whether the change makes the platform and the language fit together more elegantly than they did before. A change that does neither — that serves the platform's own internal tidiness while the seam stays where it was — is a change to question rather than a detail to sort out later.

## The Packages

Thirty-two packages under `packages/`. Grouped by what they are for, not by dependency order.

### Contracts and types

**`@sharpee/core`** — Foundation data structures everything else builds on: the event system (`ISemanticEvent`, the `EventDataRegistry` other packages merge into), IFID utilities, story metadata, shared types. Every package depends on it; it depends on none of them.

**`@sharpee/if-domain`** — The shared domain contracts: domain events, the `Parser` interface, `LanguageProvider`, and the types engine, stdlib, and parsers all agree on. Pure types, so it sits under Node and browser packages alike without dragging a runtime along.

**`@sharpee/if-services`** — Runtime *service* interfaces that need access to the world model, deliberately separated from `if-domain`'s pure domain types. `IPerceptionService` lives here: the interface the engine accepts and stdlib implements.

**`@sharpee/text-blocks`** — Interfaces only for structured text output — `ITextBlock`, `IDecoration`, and type guards — with no runtime dependencies. It is the shape the engine's prose pipeline produces and every client consumes.

**`@sharpee/media`** — Audio and media type definitions (ADR-138), types-only beyond `@sharpee/core`. Importing it activates TypeScript declaration merging so audio event keys join core's `EventDataRegistry`.

**`@sharpee/ide-protocol`** — Wire types for the IDE's project-introspection manifest (ADR-184), the single source of truth shared by the `--introspect` CLI emitter and the Play-panel bridge. Types only, so the Node emitter and the browser bridge both import it cleanly.

**`@sharpee/story-runtime-baseline`** — The manifest (ADR-178) declaring the canonical set of packages a `.sharpee` story bundle may import. A host installs the baseline transitively from it and the story build validates bundles against it; bumping it is an amendment to ADR-178.

### World and engine

**`@sharpee/world-model`** — Entities, traits, and behaviors: the world's state and the rules for changing it. Behaviors own every mutation, and the capability registry (ADR-090) lives here, letting a trait claim action ids and supply its own validate/execute/report/blocked.

**`@sharpee/engine`** — The runtime: turn cycle, command execution, event dispatch, save/restore, and the prose pipeline that turns turn-end events into `ITextBlock[]`. `GameEngine` takes `{ world, player, parser, language, perceptionService?, config? }` and owns the master seed every random stream derives from (ADR-293).

**`@sharpee/event-processor`** — Applies semantic events to the world model through registered handlers, bridging event-producing actions and actual state mutation. It also hosts the effects system (ADR-075).

**`@sharpee/stdlib`** — The standard actions (taking, going, opening, and the rest) written in the four-phase pattern, plus scope resolution, command validation, capability schemas, and the `PerceptionService` implementation. Each action is a directory of six files rather than a single module.

**`@sharpee/plugins`** — The contracts for turn-cycle extensibility: `TurnPlugin`, `TurnPluginContext`, `PluginRegistry`. It also carries the banded-scalar crossing engine (ADR-262) for narrating threshold crossings.

**`@sharpee/plugin-npc`** — NPC behaviors and the NPC turn phase (ADR-070, ADR-120). It plugs into the turn cycle rather than being built into the engine.

**`@sharpee/plugin-scheduler`** — Daemons and fuses (ADR-071, ADR-120), the recurring and delayed events a story schedules, plus its own seeded random source.

**`@sharpee/plugin-state-machine`** — Declarative puzzle and narrative orchestration (ADR-119, ADR-120): states, guards, and effects, with a guard evaluator and an effect executor.

### Language

**`@sharpee/parser-en-us`** — Turns typed English into structured commands; `EnglishParser` implements `if-domain`'s `Parser` interface. Grammar patterns (ADR-087) live here, and stories extend them rather than forking the parser.

**`@sharpee/lang-en-us`** — All user-facing English: vocabulary, message templates, action patterns and messages, NPC messages, formatting and lemmatization. If a player can read it, the text belongs here and not in an action.

### Chord — the story language

**`@sharpee/chord`** — The Chord compiler (ADR-210): lexer, indentation-aware parser, semantic analysis, Story IR wire types, and diagnostics carrying source spans. It is deliberately browser-safe and must never depend on platform-runtime packages.

**`@sharpee/story-loader`** — The Story IR interpreter (ADR-210): constructs a generic `Story` from compiled IR, covering world building, phrase registration, custom vocabulary, endings, event rules, expression evaluation, and seeded RNG. Language-neutral by design — it consumes IR, never Chord syntax.

### Authoring conveniences

**`@sharpee/helpers`** — Fluent entity builders for authors (ADR-140); `createHelpers(world)` returns builders bound to that world. Author-facing only: ADR-237 D1 forbids any platform package from depending on it.

**`@sharpee/queries`** — A LINQ-style chainable query API over entities (ADR-150). Importing it augments `WorldModel` with entry points like `w.rooms` and `w.contents()` — the augmentation is on the concrete class, not the `IWorldModel` interface.

**`@sharpee/character`** — A fluent builder for NPCs with rich internal state (ADR-141). Authors describe a character in words and the builder compiles that to trait data `CharacterModelTrait` consumes at runtime.

### Channels and clients

**`@sharpee/channel-service`** — The channel-I/O wire producer (ADR-163), the universal surface carrying every story→UI signal: prose, status, media, layout. It runs in-process wherever the engine runs — Node CLI, multi-user server, browser.

**`@sharpee/platform-browser`** — Browser client infrastructure: `BrowserClient`, a renderer per channel, and managers for save/restore, themes, menus, dialogs, input, and display. Framework-free, with `lz-string` as its only runtime dependency.

**`@sharpee/runtime`** — A headless engine runtime for embedding in an iframe, talking to the parent frame over postMessage. It shares its Sharpee API surface with `bridge` via `@sharpee/sharpee/runtime-surface` and adds only the postMessage transport.

**`@sharpee/bridge`** — The same engine surface exposed as a Node subprocess speaking newline-delimited JSON over stdin/stdout (ADR-135), for native hosts. Only the transport differs from `runtime`.

**`@sharpee/interpreter`** — RETIRED 2026-08-13, archived at `packages/_archive/interpreter`. The legacy Tauri story runner; ADR-180 had already dropped it from the build. The `zifmia` name it carried is retired with it — the multi-user product is archived at `tools/_archive/zifmia`. The ADRs that decided all of this stay as written; only the live docs moved on.

### Build, test, and tooling

**`@sharpee/bootstrap`** — The single story-loading implementation: resolves a story module (entry-aware) and assembles engine, world, player, parser, language, and perception, wired to the channel-packet output path. transcript-tester, the CLI bundle, and devkit all call it rather than hand-copying the wiring (ADR-180).

**`@sharpee/devkit`** — The `sharpee` author CLI (ADR-180, ADR-187): scaffold, build, test, verify, compose, and introspect an author's own story project. In-repo platform builds deliberately use a separate tool, `repokit`.

**`@sharpee/transcript-tester`** — Transcript-based testing: the `.transcript` parser and its matched canonical serializer, the runner, golden recordings, coverage, outcome search, and watch mode. It owns the transcript grammar, so parser and serializer ship as a pair pinned by their own tests.

**`@sharpee/sharpee`** — The umbrella package aggregating the others for consumption. It deliberately does not re-export everything (ADR-178); the baseline sub-packages remain the import contract.

**`@sharpee/map-editor`** — A visual map and region editor for stories, and the one package that is not a library: an Electron application with a React and Vite front end.

## The Command Lines

Three different things carry the name `sharpee` or sit next to it, and confusing them wastes real time. They are split by audience (ADR-180, ADR-187).

**`./sharpee` — the author tool.** A repo-local bash shim over `packages/devkit/dist/cli.js`, the published `@sharpee/devkit` engine. It builds, tests, verifies, and scaffolds *an author's own story project*, project-relative, and it is what an outside author installs. In-repo it is only a wrapper; a globally installed `sharpee` command is ADR-180 Phase U2. Passing a workspace story to `./sharpee build` redirects to `./repokit`, because building the platform is not devkit's job.

**`./repokit` — the in-repo platform build.** A repo-local shim over `tools/repokit/dist/cli.js` (`@sharpee/repokit`), which lives in `tools/`, not `packages/`, and is never published. It is devkit's platform-side counterpart: it builds the platform packages, the CLI bundle, `verify`, `test:npm`, and the in-repo example stories, so `./repokit build dungeo` is the command for all platform and story work in this repository. Use `--skip <pkg>` to resume a build rather than rebuilding the tree.

**`dist/cli/sharpee.js` — the platform bundle.** The esbuild output produced by `./repokit build`, and the thing to run for transcript testing and interactive play: `--test`, `--chain`, `--play`, `--exec`. It loads in roughly 170ms against about five seconds for the equivalent package-by-package path, which is why it is the required entry point for all in-repo transcript testing. It is a testing and development surface, not an authoring product.

The short version: **`./sharpee` is for authors, `./repokit` builds the platform, and `dist/cli/sharpee.js` runs the tests.**

## Publishing to npm

**Publishing is not a local command.** Running `tsf publish` from a workstation fails with `npm error code EOTP`. The npm account requires two-factor authentication to publish, and npm does that through a browser handshake — it prints a `https://www.npmjs.com/auth/cli/…` URL and waits for approval — so it needs an interactive terminal, which `tsf publish` shelling out once per package across 33 packages is not. There is no token to fix in `~/.npmrc` and no `--otp` code to pass; neither is the route.

**The release path is the `Publish to npm` GitHub Actions workflow** (`.github/workflows/publish-npm.yml`), dispatched by hand. It authenticates by OIDC trusted publishing (`id-token: write`), so no npm credential exists anywhere in the repository or the runner. The `dry_run` input defaults to `true`, which packs and validates without publishing:

```bash
gh workflow run publish-npm.yml --ref main -f dry_run=true    # pack and validate only
gh workflow run publish-npm.yml --ref main -f dry_run=false   # the real publish
gh run list --workflow=publish-npm.yml --limit 1              # watch it
```

**Versions must be committed before dispatch.** The workflow stamps versions with `./repokit build --no-genai` and then runs `git diff --exit-code`, so if stamping changes a tracked file the run fails rather than shipping a version the repository does not record. It uses the repokit build specifically because `pnpm run build` is `turbo run build` and does not stamp — that gap is how `@sharpee/stdlib@3.6.0` once shipped a stale `ENGINE_VERSION`.

**`tsf publish --changed` carries no `--tag`, so everything lands on `latest`.** That is the channel every published release has used. `--changed` also means only packages whose version is ahead of the registry ship, which makes a re-dispatch after a partial failure safe: it resumes where the last run stopped instead of erroring on conflicts.

**`./repokit verify` is the local pre-flight, not the publish.** It runs `tsf build --npm` plus a publish dry-run and answers "would this pack and validate," which is worth knowing before spending seven minutes of CI. Note that its dry-run passes `--tag beta`; that is a verification detail with no bearing on the release channel, and reading it as one has cost a session before.

### First publish of a new package

**A brand-new package cannot ride a CI release until it has been published once by hand.** Trusted publishing is configured per package at `npmjs.com/package/<name>/access`, and that page only exists for a package that already exists — so under OIDC the first publish of a new package fails with:

```
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/@sharpee%2f<name>
```

**No dry run catches this.** A dry run never issues the `PUT`, so a never-published package packs, validates, and reports `+ @sharpee/<name>@x.y.z` locally, then fails only against the live registry. `./repokit verify` being green says nothing about it.

**Worse, it fails mid-release.** `tsf publish` runs in dependency order and stops on the first error, so an unbootstrapped package strands every package behind it while the ones ahead of it are already live. That is how 4.5.0 shipped 28 of 33 packages and left `@sharpee/sharpee` resolving to the previous version.

The one-time bootstrap, done **before** the package is first included in a release:

1. **Stage the artifact** — `./repokit verify` (or `pnpm exec tsf build --npm`) writes it to `~/.tsf-publish/sharpee/<name>/`, with `workspace:*` dependencies rewritten to real version ranges.

2. **Publish it once by hand, from a real interactive terminal:**
   ```bash
   npm publish ~/.tsf-publish/sharpee/<name> --access public --tag latest
   ```
   `npm publish` packs the directory. There is no `--otp` code to pass — npm prints a `https://www.npmjs.com/auth/cli/…` URL, waits, and continues once you approve it in the browser. **This step needs a TTY**: run from a script, a tool call, or CI, npm cannot wait on that round-trip and exits `EOTP` immediately, which looks like a credential problem and is not one.

3. **Register its trusted publisher** at `npmjs.com/package/@sharpee/<name>/access` → Trusted Publisher → GitHub Actions:

   | Field | Value |
   | --- | --- |
   | Organization or user | `ChicagoDave` |
   | Repository | `sharpee` |
   | Workflow filename | `publish-npm.yml` |
   | Environment name | *(leave empty)* |
   | Allowed actions | `npm publish` |

   All fields are case-sensitive and must match exactly; mistakes surface at publish time, not at setup time.

4. **Tick it off** in the `npm-ci.md` Part C checklist, so the next person can tell registered from merely-published.

5. **Re-dispatch the workflow.** `--changed` republishes nothing and ships only what is behind the registry.

**Expect the registry to 404 the package for a few minutes afterward.** `npm view @sharpee/<name>` reads the CDN packument, which lags a first publish; `npm access get status @sharpee/<name>` reads the auth layer and answers immediately. A `public` there means the publish landed regardless of what `npm view` says.

This is a **seventh registration point** for a new publishable package, on top of the six in the workspace config, and the only one that lives outside the repository. Full detail, including the release this was learned from, is in `docs/publish/npm-ci.md` §10.2.

## Entity System

### Entity Creation
Entities are the fundamental building blocks representing everything in the game world.

```typescript
// Entity creation
const entity = world.createEntity(displayName: string, type?: string, opts?: { defaultTraits?: boolean })
```

**Default traits by type (ADR-189):** `createEntity` consults a default-trait
registry and gives the entity the traits its type implies. Today the only mapping is
`scenery` → `SceneryTrait`, so an `EntityType.SCENERY` entity is non-takeable by
construction (no separate `SceneryTrait` add needed). Pass `{ defaultTraits: false }`
to skip this. To configure a defaulted trait, just `add()` your own afterward; `add()`
is replace-on-same-type, so the later one wins. See ADR-189.

**Key Properties:**
- `id`: Unique identifier (auto-generated)
- `type`: Entity type (room, item, actor, etc.)
- `attributes`: Key-value pairs for entity data
- `relationships`: Entity relationships (e.g., parent-child)
- `traits`: Map of trait instances
- `on`: Event handlers for custom logic

**Location:** `/packages/world-model/src/entities/if-entity.ts`

### Entity Types
Common entity types with auto-generated ID prefixes:
- `room` (r_) - Game locations
- `door` (d_) - Connections between rooms
- `item` (i_) - Portable objects
- `actor` (a_) - NPCs and player
- `container` (c_) - Objects that can hold other objects
- `supporter` (s_) - Objects that can support other objects
- `scenery` (y_) - Fixed decorative objects
- `exit` (e_) - Room exits

## Trait System

Traits add behaviors and properties to entities through composition.

### Core Traits
Located in `/packages/world-model/src/traits/`:

- **Identity** - Basic entity properties (name, description)
- **Container** - Can hold other entities (inventory, boxes)
- **Room** - Represents a location
- **Openable** - Can be opened/closed (doors, containers)
- **Lockable** - Can be locked/unlocked
- **Wearable** - Can be worn by actors
- **Edible** - Can be eaten
- **Switchable** - Can be turned on/off
- **Pushable** - Can be pushed
- **Pullable** - Can be pulled
- **Supporter** - Can have objects placed on top
- **LightSource** - Provides illumination
- **Scenery** - Fixed in place, can't be taken
- **Actor** - Represents player or NPCs
- **Door** - Connects two rooms

### Using Traits
```typescript
// Check if entity has a trait
if (entity.has(TraitType.CONTAINER)) { }

// Get a typed trait
const container = entity.get(TraitType.CONTAINER)
if (container && container.capacity > 0) { }

// Add a trait
entity.add(new ContainerTrait({ capacity: 10 }))

// Remove a trait
entity.remove(TraitType.WEARABLE)
```

## Action System (Four-Phase Pattern)

Actions follow a strict four-phase pattern as defined in ADR-051/052:

### Phase 1: Validate
Check if the action can be performed.
```typescript
validate(context: ActionContext): ValidationResult {
  // Check preconditions
  // Return { valid: true } or { valid: false, error: 'error_code' }
}
```

### Phase 2: Execute
Perform the actual world mutations.
```typescript
execute(context: ActionContext): void {
  // IMPORTANT: Execute should be minimal - delegate to behaviors
  // Store data in context.sharedData for report phase
  // NO event emission here - that's for report phase
  
  const result = SomeBehavior.doThing(entity, world);
  context.sharedData.result = result;
}
```

**Key Principle**: The execute phase should be minimal. Complex logic belongs in behaviors (see Behaviors vs Actions section). Execute only coordinates behaviors and stores results.

### Phase 3: Report
Generate events for output and game logic.
```typescript
report(context: ActionContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  
  // Always emit world event first
  events.push(context.event('if.event.something_happened', { ... }));
  
  // Then add success/error messages
  events.push(context.event('action.success', { ... }));
  
  // Return all events together - no early returns
  return events;
}
```

### Phase 4: Blocked
Generate events when `validate()` refused. This phase runs *instead of* execute and report, never alongside them.
```typescript
blocked?(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
  // Turn the ValidationResult's error code into the action's own
  // blocked message. Optional — omitting it falls back to a standard
  // 'action.blocked' event.
}
```

**Why it is a phase and not an error return**: each action owns the wording of its own refusals, so a blocked attempt is reported through the same event path as a successful one rather than through a thrown error or a bare string. `blocked` is optional on the interface (`enhanced-types.ts`); the default implementation covers actions with nothing special to say.

### Action Structure
Each action lives in `/packages/stdlib/src/actions/standard/[action-name]/` with:
- `[action-name].ts` - Main action implementation
- `[action-name]-events.ts` - Event type definitions
- `[action-name]-data.ts` - Data builder configuration
- `[action-name]-messages.ts` - Message ids the action can emit
- `[action-name]-types.ts` - Action-specific types (including its sharedData shape)
- `index.ts` - Barrel

### Action Categories

#### World-Mutating Actions
Actions that change game state:
- **taking/dropping** - Pick up/put down objects
- **opening/closing** - Open/close containers and doors
- **going** - Move between rooms
- **entering/exiting** - Enter/exit containers
- **putting/inserting** - Put objects in/on containers
- **giving** - Give objects to actors
- **wearing/removing** - Wear/remove clothing
- **eating/drinking** - Consume edibles
- **pushing/pulling** - Manipulate pushable/pullable objects
- **switching** - Turn devices on/off
- **locking/unlocking** - Lock/unlock lockable objects

#### Query Actions
Actions that only read state:
- **examining** - Look at objects
- **looking** - Examine current location
- **inventory** - List carried items

#### Meta-Actions (Signal Actions)
Actions that emit signals without world interaction:
- **about** - Display game information
- **help** - Show available commands
- **save/restore** - Game state management
- **quit** - Exit the game

Meta-actions typically have:
- `validate()` that always succeeds
- Empty `execute()` phase
- `report()` that emits a simple signal event

## ActionContext

The context object passed to all action phases, providing access to world state and utilities.

### Key Properties
- `world`: WorldModel instance for querying/mutating
- `player`: The player entity
- `currentLocation`: Player's current room
- `command`: Parsed and validated command
- `scopeResolver`: Determines what's perceivable
- `action`: The action being executed
- `sharedData`: Type-safe data storage for passing data between phases

### Using sharedData (Type-Safe Pattern)
```typescript
// Define typed interface for your action's shared data
interface AttackingSharedData {
  targetId?: string;
  weaponId?: string;
  wasBlindAttack?: boolean;
  attackResult?: AttackResult;  // Result from behavior
}

// In execute phase - minimal!
execute(context: ActionContext): void {
  const sharedData = context.sharedData as AttackingSharedData;
  const target = context.command.directObject!.entity!;
  
  // Just call behavior and store result
  const result = AttackBehavior.attack(player, target, weapon, world);
  sharedData.attackResult = result;
  sharedData.targetId = target.id;
}

// In report phase - all events
report(context: ActionContext): ISemanticEvent[] {
  const sharedData = context.sharedData as AttackingSharedData;
  const events: ISemanticEvent[] = [];
  
  // Generate events based on shared data
  events.push(context.event('if.event.attacked', { ... }));
  events.push(context.event('action.success', { ... }));
  
  return events;
}
```

**Important**: 
- Never use `(context as any)._*` patterns - this is context pollution
- Execute stores behavior results, report generates all events
- sharedData is the ONLY way to pass data between phases

### Helper Methods
- `canSee(entity)`: Check visibility
- `canReach(entity)`: Check reachability
- `canTake(entity)`: Check if takeable
- `isInScope(entity)`: Check if in scope
- `getVisible()`: Get all visible entities
- `getInScope()`: Get all entities in scope
- `event(type, data)`: Create semantic events

**Location:** `/packages/stdlib/src/actions/enhanced-types.ts`

## World Model

The central game state manager.

### Key Methods

**Entity Management:**
- `createEntity(displayName, type?)`: Create new entity
- `getEntity(id)`: Get entity by ID
- `removeEntity(id)`: Remove entity
- `getAllEntities()`: Get all entities

**Spatial Management:**
- `getLocation(entityId)`: Get entity's container
- `getContents(containerId)`: Get container contents
- `moveEntity(entityId, targetId)`: Move entity
- `getContainingRoom(entityId)`: Find containing room

**Queries:**
- `findByTrait(traitType)`: Find entities with trait
- `findByType(entityType)`: Find entities by type
- `getVisible(observerId)`: Get visible entities
- `canSee(observerId, targetId)`: Check visibility

**State:**
- `getState()`: Get world state dictionary
- `setState(state)`: Set world state
- `getPlayer()`: Get player entity
- `setPlayer(entityId)`: Set player entity

**Location:** `/packages/world-model/src/world/WorldModel.ts`

## Event System

Sharpee uses **domain events** for event sourcing and text rendering. Understanding the distinction between domain events and event handlers is crucial.

### Domain Events (Event Sourcing)

Domain events (`if.event.*`) are **records of what happened** in the game world. They are NOT traditional pub/sub events to be "fired and handled" - they're event sourcing records written to event sources.

**Key characteristics:**
- Describe completed actions in past tense (taken, dropped, opened)
- Written to one of THREE event sources: **game**, **debug**, **platform**
- Consumed by the engine's **prose pipeline** at turn end for rendering
- Carry both domain data (what happened) and rendering data (messageId + params)

**Domain event structure (ADR-097 pattern):**
```typescript
context.event('if.event.taken', {
  // Rendering data (the prose pipeline uses these)
  messageId: 'if.action.taken.success',
  params: { item: 'brass lamp' },

  // Domain data (event sourcing / handlers can use these)
  itemId: lamp.id,
  actorId: player.id,
  previousLocation: room.id
});
```

### Event Sources

The Engine maintains three event sources:
- **game**: Domain events from player actions and world changes
- **debug**: Diagnostic events for development/testing
- **platform**: System events (save, restore, quit)

At turn end, events are popped from these sources and handed to the engine's
**prose pipeline** (`packages/engine/src/prose-pipeline/`).

### Text Rendering Flow

**Actions NEVER emit text directly.** The flow is:

1. Actions emit **domain events** with `messageId` and `params`
2. Events are written to the appropriate event source
3. At turn end, the engine's **prose pipeline** consumes the events
4. The prose pipeline resolves each `messageId` against the language layer
   (`@sharpee/lang-en-us`) and renders `ITextBlock[]` ("blocks")
5. The blocks — plus status, media, and other per-turn signals — are delivered to
   the client over **channels** (`@sharpee/channel-service`, ADR-163); a per-client
   `Renderer` (ADR-165) turns each channel's payload into what the player sees

> **Note:** the former `@sharpee/text-service` package was removed (ADR-174).
> Turn-end rendering is now the engine-internal prose pipeline; channel-IO carries
> the output to clients.

```typescript
// CORRECT: Emit domain event with messageId
events.push(context.event('if.event.taken', {
  messageId: 'if.action.taken.success',
  params: { item: noun.name },
  itemId: noun.id,
  actorId: actor.id
}));

// WRONG: Never emit text directly
events.push({ text: 'Taken.' });  // DON'T DO THIS
```

This separation enables:
- Internationalization (different languages)
- Customizable prose styles
- Story-specific message overrides
- Consistent output formatting
- Event replay and debugging

### Domain Event Types

- **World Events** (`if.event.*`): What happened in the game world
  - `if.event.taken`: Object picked up
  - `if.event.dropped`: Object dropped
  - `if.event.opened`: Container opened
  - `if.event.pushed`: Object pushed
  - etc.

- **Platform Events** (`platform.*`): System operations
  - `platform.save_completed`: Game saved
  - `platform.restore_completed`: Game restored

- **Game Events** (`game.*`): Game lifecycle
  - `game.started`: Game began
  - `game.message`: System message

### Event Handlers (ADR-052)

Event handlers are a **separate mechanism** that lets stories react to domain events. When a domain event is recorded, registered handlers can execute custom logic.

**Entity-level handlers:**
```typescript
const redBook = {
  on: {
    'if.event.pushed': (event) => {
      // React when this book is pushed
      // This runs as the domain event is being processed
    }
  }
}
```

**Story-level handlers (daemons):**
```typescript
world.registerEventHandler('if.event.pushed', (event, world) => {
  // React to any push event globally
})
```

**Important distinction:**
- Domain events are **records** written to event sources
- Event handlers **react** to those records during processing
- Handlers can return additional events or modify world state

## Perception System

The perception system filters events based on what the player can perceive, handling darkness, blindness, and other sensory restrictions.

### PerceptionService (ADR-069)

The PerceptionService sits between action execution and the prose pipeline, transforming events that describe things the player cannot perceive into appropriate alternative events.

**Location:**
- Interface: `/packages/if-services/src/perception-service.ts`
- Implementation: `/packages/stdlib/src/services/PerceptionService.ts`

### Basic Usage

```typescript
import { PerceptionService } from '@sharpee/stdlib';

// Create service
const perceptionService = new PerceptionService();

// Wire to engine
const engine = new GameEngine({
  world,
  player,
  parser,
  language,
  perceptionService,  // Enable perception filtering
  config              // optional (seed, narrative settings)
});
```

### How It Works

1. Action generates events (room description, contents list, etc.)
2. PerceptionService filters events before they reach the prose pipeline
3. Visual events are blocked or transformed when player can't see
4. Non-visual events (action.failure, game.message) pass through unchanged

### Sense Types

```typescript
type Sense = 'sight' | 'hearing' | 'smell' | 'touch';
```

Currently only `sight` is fully implemented. Other senses are extension points for future features.

### Checking Perception

```typescript
// Check if actor can perceive
const canSee = perceptionService.canPerceive(actor, location, world, 'sight');

// Perception checks (for sight):
// 1. Is actor blind? (future)
// 2. Is actor blindfolded? (future)
// 3. Is location dark? (via VisibilityBehavior)
```

### Event Filtering

The service filters these visual event types when the player can't see:
- `if.event.room.description` → `if.event.perception.blocked`
- `if.event.contents.listed` → `if.event.perception.blocked`
- `action.success` with `messageId: 'contents_list'` → `if.event.perception.blocked`

The blocked event contains:
```typescript
interface PerceptionBlockedData {
  originalType: string;  // What was blocked
  reason: PerceptionBlockReason;  // Why (darkness, blindness, blindfolded)
  sense: Sense;  // Which sense was blocked
  originalData?: unknown;  // Original event data for debugging
}
```

### Story Integration Example

```typescript
// In story setup
const bar = world.createEntity('Dark Bar', EntityType.ROOM);
bar.add(new RoomTrait({ isDark: true }));  // Dark until lit

// When player enters while carrying cloak (absorbs light):
// - Room description is filtered to perception.blocked
// - "Blundering in dark" message still appears (game.message)
// - Action failures still appear

// When cloak is hung (bar becomes lit):
roomTrait.isDark = false;
// Now room description shows normally
```

### Prose Pipeline Handling

The prose pipeline handles blocked perception events:
```typescript
case 'if.event.perception.blocked':
  // Show "It's pitch dark, and you can't see a thing."
  return this.languageProvider.getMessage('perception.blocked.darkness');
```

## Command Processing Flow

1. **Parse**: Text → ParsedCommand (parser)
2. **Validate**: ParsedCommand → ValidatedCommand (validator)
3. **Execute**: ValidatedCommand → Events (the action's four phases)
   - validate(): Check preconditions
   - execute(): Mutate world (only if validate passed)
   - report(): Generate events (only if validate passed)
   - blocked(): Generate refusal events instead, if validate failed
4. **Process**: Events → Output (event processor)

## Behaviors vs Actions

- **Behaviors** (`/packages/world-model/src/behaviors/`): 
  - Pure game logic for manipulating traits and state
  - **Handle ALL world mutations** - behaviors own the state changes
  - Can call other behaviors (composition)
  - Return minimal data for reporting
  - Example: `BreakableBehavior.break(entity, world)`
  
- **Actions** (`/packages/stdlib/src/actions/`):
  - Handle player commands
  - **Coordinate behaviors** - actions don't mutate directly
  - Store results in sharedData between phases
  - Generate events for output in report phase

**Key Insight**: If your execute phase is complex, you're doing it wrong. Move the logic to a behavior.

## Capability Dispatch (ADR-090)

Capability dispatch allows entities to handle generic actions (like "lower" or "raise") with entity-specific behaviors. Instead of having fixed action semantics, these actions delegate to behaviors registered for specific traits.

### How It Works

1. **Trait declares capabilities**: A trait lists which action IDs it can handle
2. **Behavior implements 4-phase pattern**: validate/execute/report/blocked
3. **Story registers behaviors**: Connect trait+capability to behavior
4. **Stdlib action dispatches**: Finds trait, delegates to behavior

### Example: Basket Elevator

```typescript
// 1. Trait declares capabilities
class BasketElevatorTrait implements ITrait {
  static readonly type = 'dungeo.trait.basket_elevator';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'];

  position: 'top' | 'bottom' = 'top';
  topRoomId: string;
  bottomRoomId: string;
}

// 2. Behavior implements the logic
const BasketLoweringBehavior: CapabilityBehavior = {
  validate(entity, world, actorId): CapabilityValidationResult {
    const trait = entity.get(BasketElevatorTrait);
    if (trait.position === 'bottom') {
      return { valid: false, error: 'if.lower.already_down' };
    }
    return { valid: true };
  },

  execute(entity, world, actorId): void {
    const trait = entity.get(BasketElevatorTrait);
    trait.position = 'bottom';
  },

  report(entity, world, actorId): CapabilityEffect[] {
    return [
      createEffect('if.event.lowered', { targetId: entity.id }),
      createEffect('action.success', {
        actionId: 'if.action.lowering',
        messageId: 'if.lower.lowered',
        params: { target: entity.name }
      })
    ];
  },

  blocked(entity, world, actorId, error): CapabilityEffect[] {
    return [
      createEffect('action.blocked', {
        actionId: 'if.action.lowering',
        messageId: error,
        params: { target: entity.name }
      })
    ];
  }
};

// 3. Register behavior at story initialization
import { registerCapabilityBehavior, hasCapabilityBehavior } from '@sharpee/world-model';

if (!hasCapabilityBehavior(BasketElevatorTrait.type, 'if.action.lowering')) {
  registerCapabilityBehavior(
    BasketElevatorTrait.type,
    'if.action.lowering',
    BasketLoweringBehavior
  );
}
```

### Creating Capability-Dispatch Actions

The stdlib provides `createCapabilityDispatchAction()` for creating these actions:

```typescript
import { createCapabilityDispatchAction } from '@sharpee/stdlib';

export const loweringAction = createCapabilityDispatchAction({
  actionId: 'if.action.lowering',
  group: 'manipulation',
  noTargetError: 'if.lower.no_target',
  cantDoThatError: 'if.lower.cant_lower_that'
});
```

### When to Use Capability Dispatch

Use capability dispatch when:
- The same verb can mean different things for different objects (lower basket vs lower blinds)
- Story-specific objects need custom handling for generic verbs
- You want to avoid littering stdlib actions with special cases

Don't use when:
- The action has fixed, universal semantics (taking, dropping)
- All objects handle the verb the same way

### Key Files

- Registry: `/packages/world-model/src/capabilities/capability-registry.ts`
- Helpers: `/packages/world-model/src/capabilities/capability-helpers.ts`
- Dispatch factory: `/packages/stdlib/src/actions/capability-dispatch.ts`

## Scope System

Determines what entities are perceivable to the player.

### Scope Levels
- `VISIBLE`: Can be seen
- `REACHABLE`: Can be physically touched
- `AUDIBLE`: Can be heard
- `CARRIED`: In player's inventory
- `WORN`: Being worn by player
- `IN_ROOM`: In current room

### Parser Scope vs Action Validation
```typescript
// In parser grammar - be permissive
grammar
  .define('attack :target')
  .where('target', scope => scope.touchable())  // NOT visible()
  .mapsTo('if.action.attacking')
  
// In action validation - check specifics
validate(context: ActionContext): ValidationResult {
  if (!context.canReach(target)) {
    return { valid: false, error: 'not_reachable' };
  }
  // Allow blind attacks - don't check canSee()
}
```

**Key Principle**: Parser scope should be permissive (touchable, not visible) to allow actions like attacking in darkness. Let the action decide if visibility is truly required.

### Scope Resolution
The scope resolver determines which entities are available for commands based on the action's requirements and the player's current context.

## Testing Patterns

### Unit Tests
- Test individual action phases
- Mock ActionContext and entities
- Located in `packages/[package]/tests/unit/`

### Integration Tests
- Test complete action execution
- Use real world model
- Located in `packages/[package]/tests/integration/`

### Golden Tests
- Compare action output against expected results
- Files like `opening-golden.test.ts`
- Ensure consistent behavior

### World State Verification (CRITICAL)

**Actions must be tested for actual world state changes, not just events.**

The "dropping bug" revealed that actions can appear to work (good messages, correct events) while failing to actually change state. All mutation actions must include tests that verify the world state changed.

**Test Pattern:**
```typescript
test('should actually move item to player inventory', () => {
  const { world, player, room } = setupBasicWorld();
  const ball = world.createEntity('ball', 'object');
  world.moveEntity(ball.id, room.id);

  // PRECONDITION: Verify initial state
  expect(world.getLocation(ball.id)).toBe(room.id);

  const context = createRealTestContext(takingAction, world, command);
  takingAction.validate(context);
  takingAction.execute(context);

  // POSTCONDITION: Verify state actually changed
  expect(world.getLocation(ball.id)).toBe(player.id);
});
```

**Helper Utilities** (in `packages/stdlib/tests/test-utils/index.ts`):
```typescript
// Location verification
expectLocation(world, ball.id, player.id);
expectLocationChanged(world, ball.id, room.id, player.id);

// Trait property verification
expectTraitValue(door, TraitType.OPENABLE, 'isOpen', true);
expectTraitChanged(door, TraitType.OPENABLE, 'isOpen', false, true);

// State snapshots for debugging
const before = captureEntityState(world, item.id);
action.execute(context);
const after = captureEntityState(world, item.id);
```

**Required Tests by Action Type:**

| Action Type | Required Verification |
|-------------|----------------------|
| Movement (take, drop, put) | `world.getLocation()` changed |
| Property (open, lock, switch) | Trait property changed |
| Consumption (eat, drink) | Servings/amount decremented |
| Player movement (go, enter, exit) | Player location changed |

## Common Patterns

### Checking Entity Capabilities
```typescript
// Check single trait
if (entity.has(TraitType.CONTAINER)) { }

// Check multiple traits
if (entity.hasAll(TraitType.OPENABLE, TraitType.LOCKABLE)) { }

// Get trait and check property
const container = entity.get(TraitType.CONTAINER)
if (container?.open) { }
```

### World Queries
```typescript
// Find all doors
const doors = world.findByTrait(TraitType.DOOR)

// Get room contents
const items = world.getContents(room.id)

// Check visibility
if (world.canSee(player.id, target.id)) { }
```

### Creating Events
```typescript
// In report phase
return [
  context.event('if.event.taken', { item: noun.name }),
  context.event('action.success', { 
    actionId: IFActions.TAKING,
    messageId: 'taken' 
  })
]
```

## File Structure

For the full package inventory see [The Packages](#the-packages) above. The internal
layout of the three packages you will touch most:

```
packages/
  world-model/        # Core world representation
    src/
      entities/       # Entity system
      traits/         # Trait definitions
      behaviors/      # Pure game logic
      capabilities/   # Capability registry + helpers (ADR-090)
      world/          # World model implementation

  stdlib/             # Standard library
    src/
      actions/        # Action implementations
        standard/     # Standard IF actions (one directory each)
        base/         # Base action types
      scope/          # Scope resolution
      validation/     # Command validation
      channels/       # Channel keys and standard channel definitions

  engine/             # Game engine
    src/
      command-executor.ts        # Orchestrates action execution
      action-context-factory.ts  # Creates ActionContext
      game-engine.ts             # Main game loop
      prose-pipeline/            # Turn-end events → ITextBlock[]
```

## Key Interfaces

### ISemanticEvent
```typescript
interface ISemanticEvent {
  type: string          // Event type (e.g., 'if.event.taken')
  data: any            // Event-specific data
  timestamp?: number   // When event occurred
  turn?: number        // Game turn number
}
```

### ValidationResult  
```typescript
interface ValidationResult {
  valid: boolean       // Can action proceed?
  error?: string      // Error code if invalid
  params?: Record<string, any>  // Error parameters
}
```

### Action
```typescript
interface Action {
  id: string           // Action identifier
  validate(context: ActionContext): ValidationResult
  execute(context: ActionContext): void
  report(context: ActionContext): ISemanticEvent[]
  blocked?(context: ActionContext, result: ValidationResult): ISemanticEvent[]
}
```

## Extensibility Patterns

### Story Handler Pattern
Stories can add custom logic by reacting to domain events:

```typescript
// React to domain events to implement consequences
world.registerEventHandler('if.event.taken', (event, world) => {
  // A treasure WAS taken - update score as a consequence
  if (isTreasure(event.data.itemId)) {
    updateScore(10);
  }
});

// Entity-level handler for specific object
lever.on = {
  'if.event.pulled': (event) => {
    // The lever WAS pulled - open door as consequence
    secretDoor.get(TraitType.OPENABLE).isOpen = true;
    return { message: 'A door grinds open nearby.' };
  }
};
```

See ADR-106 for the distinction between domain events (facts) and handlers (reactions).

### Signal Action Pattern
For meta-actions that don't mutate world state:

```typescript
export const metaAction: Action = {
  validate(): ValidationResult {
    return { valid: true } // Usually always succeeds
  },
  execute(): void {
    // Empty - no world mutations
  },
  report(): ISemanticEvent[] {
    return [{ type: 'if.action.meta', data: {} }]
  }
}
```

This pattern enables maximum flexibility - the action just signals intent, allowing stories to handle it however they want.

## Development Workflow

1. **Adding a new trait**: Create in `/packages/world-model/src/traits/`
2. **Adding a new action**: Create in `/packages/stdlib/src/actions/standard/`
3. **Custom game logic**: Add event handlers to entities or story
4. **Testing**: Write unit and integration tests

## Important Notes

- Actions MUST follow the four-phase pattern (validate/execute/report/blocked)
- World mutations ONLY in execute phase
- Event generation ONLY in report phase
- Use `context.sharedData` to pass data between phases
- Never use `(context as any)._*` patterns (context pollution)
- Traits are data + behaviors, not just flags
- Events drive both output and game logic
- Not all actions need data builders - signal actions don't transform state
- Keep actions simple - complexity belongs in behaviors or event handlers