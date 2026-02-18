# Contributing to Sharpee

Thank you for your interest in contributing to Sharpee! This guide covers what you need to know.

## Prerequisites

- Node.js 18+
- pnpm 8+
- Git
- TypeScript knowledge

## Development Setup

```bash
git clone https://github.com/ChicagoDave/sharpee.git
cd sharpee
pnpm install

# Build everything (platform + Dungeon story)
./build.sh -s dungeo

# Run unit tests
pnpm test

# Run transcript tests (uses the fast bundle)
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript

# Run walkthrough chain
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

### Build Script

Always use `./build.sh` instead of manual `pnpm build` commands.

```bash
./build.sh                    # Show help
./build.sh -s dungeo          # Build platform + story
./build.sh -s dungeo -c browser   # Include browser client
./build.sh --skip stdlib -s dungeo # Resume from stdlib (faster)
```

## Repository Structure

```
packages/
├── core/                  # Event system, types, utilities
├── if-domain/             # Domain model and contracts
├── if-services/           # Runtime service interfaces
├── engine/                # Game loop, turn cycle, command processor
├── world-model/           # Entity system with traits and behaviors
├── stdlib/                # 48 standard IF actions
├── event-processor/       # Applies semantic events to world model
├── parser-en-us/          # English natural language parser
├── lang-en-us/            # English language messages
├── text-service/          # Template resolution, text formatting
├── text-blocks/           # Structured text output interfaces
├── plugins/               # Plugin contracts
├── plugin-npc/            # NPC behaviors and turn processing
├── plugin-scheduler/      # Daemons and fuses (timed events)
├── plugin-state-machine/  # Declarative puzzle orchestration
├── extensions/
│   ├── basic-combat/      # Skill-based combat system
│   └── testing/           # Debug tools (/debug, /trace, $teleport)
├── transcript-tester/     # Transcript-based testing framework
├── platform-browser/      # Browser client infrastructure
├── sharpee/               # Umbrella package and CLI
└── zifmia/                # Tauri desktop runner
stories/
├── dungeo/                # Mainframe Zork (~191 rooms, 750 points)
├── cloak-of-darkness/     # Classic IF demo
└── armoured/              # Trait composition demo
```

## Key Architecture Concepts

Before contributing, understand these patterns:

### Four-Phase Action Pattern

Every stdlib action follows validate/execute/report/blocked:

```typescript
const myAction: Action = {
  id: 'if.action.example',
  validate(context) { /* can we do this? */ },
  execute(context) { /* mutate world state */ },
  report(context) { /* return events for rendering */ },
  blocked(context, result) { /* return events when validation fails */ },
};
```

### Language Layer Separation

Code never emits English strings directly. Actions return semantic events with message IDs. The language layer (`lang-en-us`) maps message IDs to prose.

### Traits and Behaviors

Entities are composed of traits (data) and behaviors (logic). Traits survive serialization as plain objects — never put methods on trait classes that you need after save/restore.

### Capability Dispatch

Verbs with standard semantics (TAKE, DROP, OPEN) use stdlib actions. Verbs with entity-specific semantics (TURN, WAVE, LOWER) use capability dispatch — the entity's trait declares which actions it responds to, and a registered behavior implements the four-phase logic.

See the [ADR index](./docs/architecture/adrs/README.md) for the full set of architectural decisions.

## How to Contribute

### Finding Work

- Check [GitHub Issues](https://github.com/ChicagoDave/sharpee/issues) for `good first issue` or `help wanted` labels
- Review the [Roadmap](./README.md#roadmap) for planned features
- Open ADRs in the [ADR index](./docs/architecture/adrs/README.md#open-adrs-roadmap) describe future work

### Creating Issues

Before creating an issue, search existing issues. Include:
- Clear title and description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Code samples if applicable

### Pull Request Process

1. **Create an issue first** for significant changes
2. **Discuss platform changes** — any changes to `packages/` must be discussed before implementation. Story-level changes (`stories/`) can proceed more freely.
3. **Branch naming**: `feature/description`, `fix/description`, `docs/description`
4. **Commit messages** — follow conventional commits:
   ```
   feat: add spell casting action
   fix: correct inventory display bug
   docs: update extension guide
   refactor: simplify event handling
   test: add parser edge cases
   ```
5. **Open a PR** with a clear description of what and why
6. **All tests must pass** before merge

## Testing

### Transcript Testing (Primary Method)

Transcript tests are the main way to verify story behavior. They live in `stories/{story}/tests/transcripts/*.transcript`:

```
> look
[CONTAINS: West of House]

> open mailbox
[CONTAINS: leaflet]

> take leaflet
[CONTAINS: Taken]
```

Run them with the bundle (fast, ~170ms load time):

```bash
# Single transcript
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/rug-trapdoor.transcript

# All unit transcripts
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript

# Walkthrough chain (state persists between files)
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

### Unit Tests

Package-level unit tests use vitest:

```bash
pnpm --filter '@sharpee/stdlib' test
pnpm --filter '@sharpee/world-model' test
```

### Important Testing Rules

- Always verify **world state changes**, not just events. An action can emit correct events while failing to actually mutate state.
- Do NOT use `2>&1` with pnpm commands.
- Always use `dist/cli/sharpee.js` for transcript testing — it's 30x faster than loading individual packages.

## Adding a New Action

1. Create directory in `packages/stdlib/src/actions/standard/{action-name}/`
2. Implement the four-phase pattern: `action.ts`, `action-events.ts`, `action-data.ts`
3. Add grammar patterns in `packages/parser-en-us/src/grammar.ts`
4. Add messages in `packages/lang-en-us/src/`
5. Write transcript tests verifying both output text and world state
6. Register the action in stdlib's action registry

### Story-Specific Actions

For verbs that only exist in one story (e.g., INCANT, RING, PRAY), create the action in `stories/{story}/src/actions/` instead. Register it in the story's `extendParser()` method.

## Adding a New Trait

1. Create trait class in `packages/world-model/src/traits/`
2. Define the trait interface with a static `type` string
3. If using capability dispatch, declare `static capabilities` listing which actions the trait responds to
4. Create behavior class if needed
5. Register in the trait system
6. Add tests

Remember: trait methods don't survive serialization. Use static behavior methods or direct property access for logic that runs after save/restore.

## Publishing

Publishing is handled by maintainers using [tsf](https://github.com/ChicagoDave/tsf):

```bash
tsf build --npm    # Build all packages for npm
tsf publish        # Publish to npm registry
```

All 20 packages are published under the `@sharpee` npm scope.

## Getting Help

- [Documentation](https://sharpee.net/docs/)
- [Architecture Decision Records](./docs/architecture/adrs/)
- [GitHub Issues](https://github.com/ChicagoDave/sharpee/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
