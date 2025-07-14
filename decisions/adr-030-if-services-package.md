# ADR-030: Introduction of if-services Package

Date: 2025-01-15

## Status

Accepted

## Context

During the refactoring of language and text services, we discovered that the `TextService` interface in the `@sharpee/if-domain` package creates problematic dependencies:

1. `TextService` needs `WorldModel` from `@sharpee/world-model`
2. `TextService` needs `LanguageProvider` from `@sharpee/if-domain`
3. `TextService` needs to query events and game state

This violates the principle that `if-domain` should be a pure domain package with minimal dependencies. The if-domain package should define contracts and domain concepts, not runtime service interfaces that require implementation details.

Further analysis revealed that TextService is not alone - future services like AudioService, GraphicsService, AnalyticsService, and HintService would all need similar access to world state and events, creating the same dependency problems.

## Decision

We will create a new package `@sharpee/if-services` that serves as the home for runtime service interfaces that need access to multiple system components.

### Package Dependencies
```json
{
  "dependencies": {
    "@sharpee/core": "workspace:*",
    "@sharpee/if-domain": "workspace:*",
    "@sharpee/world-model": "workspace:*"
  }
}
```

### What Goes in if-services
1. Service interfaces that need world model access
2. Service interfaces that need event querying capabilities
3. Common base interfaces and types for services
4. Service-related type definitions and contracts

### What Stays in if-domain
1. Pure domain contracts (LanguageProvider)
2. Domain events and types
3. Sequencing and change tracking interfaces
4. Any interface that doesn't need implementation-specific types

## Consequences

### Positive
- **Clean Architecture**: if-domain remains a pure domain package with no implementation dependencies
- **Proper Dependencies**: Service interfaces can properly declare their needs without circular dependencies
- **Extensibility**: Clear home for future service interfaces (audio, graphics, analytics, etc.)
- **Discoverability**: Developers know where to look for service contracts
- **Testability**: Service implementations only need to depend on a lightweight interfaces package, not the entire engine
- **Single Responsibility**: Each package has a clear, focused purpose

### Negative
- **Additional Package**: One more package to maintain and version
- **Migration Work**: Existing code needs to update imports
- **Cognitive Load**: Developers need to understand the distinction between domain contracts and service contracts

### Neutral
- Service implementations will need to update their imports from `@sharpee/if-domain` to `@sharpee/if-services`
- The engine will need to import from both if-domain and if-services

## Implementation Notes

The initial if-services package will contain:
- `TextService` interface (moved from if-domain)
- `TextServiceContext` interface with proper WorldModel typing
- Related types like `TextOutput`, `TextOutputJSON`, etc.

Future additions may include:
- `AudioService` for sound effect and music management
- `GraphicsService` for visual representation updates
- `AnalyticsService` for telemetry and player behavior tracking
- `HintService` for adaptive hint generation
- Base interfaces that these services share

## Alternatives Considered

1. **Keep in if-domain**: Would violate domain purity and create dependency issues
2. **Move to engine**: Would create heavy coupling and make testing difficult
3. **Move to event-processor**: Would overload that package's responsibility
4. **Create runtime-contracts package**: Similar solution but less specific naming

## Related

- ADR-024: Score Data Storage (established capability pattern)
- ADR-022: Extension Architecture (defines how services plug in)
- ADR-016: Event-driven Architecture (services react to events)
