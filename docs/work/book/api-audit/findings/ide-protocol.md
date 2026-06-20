# Findings — @sharpee/ide-protocol

## Author-relevance
Platform-internal (IDE-only). Wire contract between the platform's introspection emitters (`--introspect` CLI, Play-panel WKWebView bridge) and the Sharpee IDE that renders the project tree (ADR-184). Authors never import this; the Swift IDE mirrors these shapes as Codable structs. **Not Part VII (Presentation) material** — it belongs to an IDE/tooling appendix at most, not the programmer-layer chapters. Recommend the book treat it as "internal — n/a" for the main narrative.

## Naming
Clean. `ProjectManifest`, `EntityNode`, `EntityCategory`, `SourceRef`, `TraitSummary` are spelled out, no abbreviations. `SCHEMA_VERSION` SCREAMING_CASE const, consistent. No `I`-prefix — self-consistent within the package. Type-guard names follow a uniform `is<Type>` pattern (`isProjectManifest`, `isEntityNode`, `isEntityCategory`, `isSourceRef`).

## Should-be-internal
None obvious *within its intended scope* — but the whole package is implementation/tooling detail relative to the book's author audience. Every export is a legitimate part of the IDE wire contract; nothing is mis-exported. The package as a whole is "should-be-absent-from-the-book," not "should-be-internal."

## API shape
- Type guards correctly take `value: unknown` and return `value is T` predicates — exactly right for a decode-boundary validator.
- `TraitSummary` carries an index signature `[traitType: string]: Record<string, unknown> | undefined` — intentional forward-compat (unknown traits pass through). The only `unknown` in the surface and well-justified.
- `SCHEMA_VERSION: 1` and `ProjectManifest.schemaVersion: typeof SCHEMA_VERSION` — precise literal-typed versioning; good.
- `generatedFrom: 'cli' | 'bridge'`, `EntityCategory` union, `SourceRef.resolution: 'exact' | 'scope'` — all tight string-literal unions. No loose types. Clean shape overall.

## Documentation (TSDoc)
Excellent for its size — 100% of exports documented, including the DEVARCH 8b rationale (shared wire type, no runtime-specific types) and per-field comments explaining IDE lint inputs (e.g. "drives the 'room with no exits' lint"). `@packageDocumentation` + `@see ADR-184` on both files.

## Book highlights
n/a — internal IDE tooling wire contract. If the book has a tooling/IDE appendix, cite `ProjectManifest` / `EntityNode` / `TraitSummary` and `SCHEMA_VERSION` as the introspection-manifest shape; otherwise omit entirely from the programmer-layer (Part VII) chapters.
