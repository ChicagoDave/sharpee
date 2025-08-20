# ADR-055: NPM Publishing Strategy

## Status
Proposed

## Context
The Sharpee interactive fiction engine is reaching a state where it can be published to npm for public use. Currently, the project is structured as a monorepo with multiple packages, but before publishing we need to:

1. Provide a standard client implementation that users can immediately use
2. Include a default text service for basic text rendering
3. Define a clear publishing strategy for the modular architecture

The current structure has:
- Core engine packages (core, world-model, engine, stdlib, etc.)
- Multiple client implementations (cli, web-client)
- Multiple text services (text-service-basic, and platform-specific ones)
- Platform-specific bundles (platform-cli-en-us)

## Decision

### Package Structure for Publishing

1. **Main Package (`@sharpee/sharpee`)**
   - Aggregates all core functionality
   - Includes a default client and text service
   - Provides everything needed to run IF games out of the box
   - Version: 1.0.0 (remove alpha when ready)

2. **Core Packages to Publish**
   - `@sharpee/core` - Core interfaces and types
   - `@sharpee/world-model` - World modeling system
   - `@sharpee/engine` - Game engine
   - `@sharpee/stdlib` - Standard library of actions
   - `@sharpee/event-processor` - Event handling
   - `@sharpee/parser-en-us` - English parser
   - `@sharpee/lang-en-us` - English language support
   - `@sharpee/text-services` - Text service interfaces

3. **Default Implementations**
   - Create `@sharpee/client-default` - A basic, universal client implementation
   - Use `@sharpee/text-service-basic` as the default text service
   - These will be included as dependencies in `@sharpee/sharpee`

4. **Optional Packages**
   - `@sharpee/client-cli` - CLI-specific client
   - `@sharpee/client-web` - Web-specific client
   - Platform bundles remain private/examples

### Publishing Workflow

1. **Pre-publish Checklist**
   - [ ] All tests passing (`pnpm test:ci`)
   - [ ] TypeScript builds clean (`pnpm typecheck`)
   - [ ] Linting passes (`pnpm lint`)
   - [ ] Documentation updated
   - [ ] Version bumped appropriately
   - [ ] CHANGELOG updated

2. **Build Process**
   ```bash
   # Clean and build all packages
   pnpm clean
   pnpm build
   
   # Run final validation
   pnpm test:ci
   ```

3. **Publishing Commands**
   ```bash
   # Publish all public packages
   pnpm -r publish --access public
   
   # Or use Lerna for coordinated release
   pnpm lerna publish
   ```

### Package.json Configuration

Each publishable package should have:
```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "prepublishOnly": "npm run clean && npm run build"
}
```

### User Installation

After publishing, users can install:
```bash
# Full package with defaults
npm install @sharpee/sharpee

# Or specific packages for custom implementations
npm install @sharpee/engine @sharpee/client-web
```

### Example Usage

```typescript
import { GameEngine, Parser, TextService } from '@sharpee/sharpee';

// Everything works out of the box with defaults
const engine = new GameEngine({
  story: myStory,
  // Default client and text service are automatically configured
});

engine.start();
```

## Consequences

### Positive
- Single npm install for basic usage
- Modular architecture allows advanced users to pick specific packages
- Clear separation between core and optional functionality
- Default implementations provide immediate usability

### Negative
- Need to maintain backward compatibility once published
- Default implementations may not suit all use cases
- Additional maintenance burden for published packages
- Version coordination across multiple packages

### Mitigation
- Use semantic versioning strictly
- Maintain clear upgrade guides
- Keep default implementations simple and extensible
- Use Lerna or Changesets for coordinated releases
- Consider using `workspace:*` protocol during development, but fixed versions for publishing

## Implementation Steps

1. Create `@sharpee/client-default` package with basic client implementation
2. Ensure `@sharpee/text-service-basic` is production-ready
3. Update `@sharpee/sharpee` to include default client and text service
4. Add proper README files to all publishable packages
5. Set up automated publishing workflow (GitHub Actions)
6. Create npm organization (@sharpee)
7. Test installation in fresh environment before public release