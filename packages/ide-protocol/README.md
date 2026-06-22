# @sharpee/ide-protocol

Wire types for the Sharpee IDE project-introspection manifest (ADR-184).

## Installation

```bash
npm install @sharpee/ide-protocol
```

## Overview

The single source of truth for the manifest contract between the platform's introspection emitters and the Sharpee IDE:

- **Types only** - No runtime dependencies and no runtime-specific types (`Buffer`, `fs`, DOM), so both the Node `--introspect` CLI emitter and the browser Play-panel bridge import it cleanly (DEVARCH 8b).
- **`ProjectManifest`** - A flat list of introspected entities plus a build-status header; the IDE buckets entities into categories client-side.
- **`EntityNode` / `EntityCategory`** - One world entity per node, with `id`, `displayName`, `category` (`room` | `object` | `npc` | `region`), a `TraitSummary`, and an optional `SourceRef`.
- **`SourceRef`** - Resolved `file:line` of the entity's `createEntity(...)` site (`exact` or `scope` resolution).
- **`SCHEMA_VERSION`** plus type guards (`isProjectManifest`, `isEntityNode`, …) for validating manifests on receipt.

## Usage

The platform emits a `ProjectManifest` by running a story's world construction and projecting the resulting entities. The IDE consumes it to render a Sharpee-aware project tree. The Swift IDE mirrors these shapes as `Codable` structs.

```typescript
import {
  isProjectManifest,
  SCHEMA_VERSION,
  type ProjectManifest,
} from '@sharpee/ide-protocol';

function handleManifest(payload: unknown): ProjectManifest {
  if (!isProjectManifest(payload)) {
    throw new Error('Not a Sharpee project manifest');
  }
  if (payload.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported manifest schema ${payload.schemaVersion}`);
  }
  return payload;
}
```

### Key interfaces

| Type | Role |
|------|------|
| `ProjectManifest` | Top-level payload: `schemaVersion`, `story`, `generatedFrom`, `entities` |
| `EntityNode` | One introspected entity (id, display name, category, traits, source) |
| `TraitSummary` | Sparse, trait-keyed projection of the IDE-relevant fields |
| `SourceRef` | Resolved `file:line` of the entity's creation site |
| `EntityCategory` | `'room' \| 'object' \| 'npc' \| 'region'` |

## Related Packages

- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Source of the entities and traits the manifest projects
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle (hosts the introspection emitter)

## License

MIT
