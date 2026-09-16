/**
 * protocol-spec.ts — what the protocol generator emits, and under what names.
 *
 * ADR-341 D5 rules that the native shells' protocol types are generated from
 * the TypeScript source rather than hand-mirrored. This spec is the generator's
 * only input list: the TS files it loads, the exported types it emits, the
 * native names and nesting it emits them under, and the two narrow escape
 * hatches (float fields, permitted index signatures). Anything reachable from a
 * root and not covered here is a hard error — the generator never silently
 * drops a field or a type.
 *
 * Public interface: PROTOCOL_SPEC, ProtocolSpec, RootSpec.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 *
 * References:
 * - ADR-341 D5 — generated, not hand-mirrored; Swift is target one.
 * - ADR-184 — the project-introspection manifest (`types.ts`).
 * - ADR-258 D5/D6 — the `compose --json` payload (`compose-diagnostics.ts`).
 */

/** One type to emit, with its native name and nesting. */
export interface RootSpec {
  /** Exported TypeScript type name. */
  ts: string;
  /** Native name; defaults to `ts`. */
  as?: string;
  /** Emit nested inside this native type, as the shells refer to it. */
  nestUnder?: string;
}

/** The generator's complete input. */
export interface ProtocolSpec {
  /** TS files loaded as program roots, repo-root-relative. */
  sources: string[];
  /**
   * Every type to emit, in emission order. Emission order is the order the
   * shells' call sites read most naturally, not dependency order — the emitter
   * resolves references itself.
   */
  roots: RootSpec[];
  /**
   * `"<TsType>.<field>"` paths whose TypeScript `number` is a floating-point
   * value. Every other `number` emits as a 64-bit integer: the protocol carries
   * line numbers, columns and schema versions, and guessing wrong in the other
   * direction would decode a float into an Int and throw at runtime.
   */
  doubleFields: string[];
  /**
   * Wire type name -> the type the shells actually decode in its place. The
   * one case is `StoryIR`: `ComposeJsonPayload.ir` is typed as the whole
   * 1,700-line schema, and every shell decodes the projection in
   * `protocol-projection.ts` instead. A substitution is a decision recorded
   * here, never an inference the reader makes.
   */
  substitutions: Record<string, string>;
  /**
   * TS types whose index signature (`[k: string]: …`) is deliberately not
   * emitted — the wire's forward-compatibility escape hatch, which a native
   * struct ignores by design. Any other index signature is an error.
   */
  indexSignatureIgnoredOn: string[];
}

/**
 * The Swift/C# emission list. `Span` becomes `DiagnosticSpan` and
 * `DiagnosticSeverity` becomes `ComposeSeverity` because that is what the
 * shipping shells already call them; renaming the shells instead would churn
 * ~40 call sites to no end.
 */
export const PROTOCOL_SPEC: ProtocolSpec = {
  sources: [
    'packages/ide-protocol/src/types.ts',
    'packages/ide-protocol/src/compose-diagnostics.ts',
    'tools/repokit/src/commands/protocol-projection.ts',
  ],
  roots: [
    // ADR-184 — the project-introspection manifest.
    { ts: 'ProjectManifest' },
    { ts: 'EntityCategory' },
    { ts: 'EntityNode' },
    { ts: 'SourceRef' },
    { ts: 'TraitSummary' },
    // ADR-258 D5 — the `compose --json` payload.
    { ts: 'DiagnosticSeverity', as: 'ComposeSeverity' },
    { ts: 'Span', as: 'DiagnosticSpan' },
    { ts: 'ComposeDiagnosticRecord' },
    { ts: 'ComposeJsonPayload' },
    // ADR-258 D6 — the IR projection the shells decode, nested under the
    // payload's IR type exactly as the shipping Swift nests it.
    { ts: 'IdeStoryIR', as: 'ComposeStoryIR' },
    { ts: 'IdeIRMeta', as: 'Meta', nestUnder: 'ComposeStoryIR' },
    { ts: 'IdeIRStoryFields', as: 'Fields', nestUnder: 'ComposeStoryIR' },
    { ts: 'IdeIRGrammarFile', as: 'GrammarFile', nestUnder: 'ComposeStoryIR' },
    { ts: 'IdeIREntity', as: 'Entity', nestUnder: 'ComposeStoryIR' },
    { ts: 'IdeIRKind', as: 'Kind', nestUnder: 'ComposeStoryIR' },
    { ts: 'IdeIRContainedMember', as: 'ContainedMember', nestUnder: 'ComposeStoryIR' },
    { ts: 'IdeIRActionDef', as: 'ActionDef', nestUnder: 'ComposeStoryIR' },
    { ts: 'IdeIRHatch', as: 'Hatch', nestUnder: 'ComposeStoryIR' },
    { ts: 'IdeIRPhrases', as: 'PhraseBook', nestUnder: 'ComposeStoryIR' },
    { ts: 'IdeIRPhraseName', as: 'PhraseEntry', nestUnder: 'ComposeStoryIR' },
  ],
  doubleFields: [],
  substitutions: { StoryIR: 'IdeStoryIR' },
  // ADR-184: `TraitSummary`'s index signature keeps an unknown trait from
  // dropping the entity on the wire. A native struct achieves the same by
  // ignoring unknown keys at decode time, so the signature itself emits nothing.
  indexSignatureIgnoredOn: ['TraitSummary'],
};
