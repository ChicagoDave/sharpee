# ADR-352: How the protocol types are generated

**Status**: **ACCEPTED** — implemented and verified in session 33ba00, 2026-09-16, on `main`. This document records how ADR-341 D5's ruling was carried out, not whether to carry it out; D5 already decided that the native shells' protocol types are generated rather than hand-mirrored, and every decision below is a shape question that ruling left open. No Open Questions section: nothing here is waiting on an answer.

**Scope**: `tools/repokit/src/commands/protocol*` (the generator), `tools/ide/SharpeeIDE/Generated/` and `tools/ide/PaneHost/Generated/` (its targets), and the hand-written code beside each target. **No `packages/` change** — the generator reads `packages/ide-protocol` and `packages/chord` and writes nothing to either.

## Date: 2026-09-16

## Parent

ADR-341 (Chord Writer for Windows — **D5** rules that protocol types are generated, not hand-mirrored, with Swift as the first target and `tools/ide/SharpeeIDE` as the first consumer). **Related**: ADR-184 (the project-introspection manifest, one of the two contracts emitted), ADR-258 D5/D6 (the `compose --json` payload, the other), ADR-210 Interface Contract 1 (`@sharpee/chord` owns the Story IR schema), ADR-351 D3 (the three web panes each shell serves — the reason the run-event stream has no native target), DevArch rule 8b (one definition of a wire type; generated across a language boundary).

## Context

Two shells decode Sharpee's wire contracts and neither can import them. `tools/ide/SharpeeIDE` is Swift, `tools/ide/PaneHost` is C#, and the contracts are TypeScript in `@sharpee/ide-protocol`. Until this session the Swift app answered that by hand-writing `Codable` mirrors — 332 lines across two files — and the C# host answered it by decoding nothing at all.

The hand-written answer failed in the way rule 8b predicts. Nothing compiled the mirror against the contract, so the mirror drifted and no build noticed: `ProjectManifest.hatchContextVersion` and `Span.file` were on the wire and in neither mirror. A session memory recorded the sharper version of the same failure — *"a chord IR rename breaks `ComposeDiagnostics.swift` silently"* — as something to remember rather than something fixable. ADR-341 D5 ruled the fix: generate them, with a freshness gate beside the grammar and manifest gates, Swift first because the generator needs a real consumer before it gets a second target.

Executing that ruling turned out to hinge on a problem D5 did not have to name. `ComposeJsonPayload.ir` is typed `StoryIR`, which is 1,700 lines of recursive discriminated unions in `@sharpee/chord`. The shells decode about twenty fields of it. A generator that emitted the whole schema would produce a thousand lines of Swift no shell reads, needing hand-synthesised decoders for union arms nothing decodes; a generator that emitted a subset needed to be told *which* subset, by something a type checker could check. That is the question the decisions below mostly answer.

## Decision

- **D1 — One command, one gate, and the gate is where the other derivations already are.** `repokit protocol` regenerates every target; `repokit protocol --check` regenerates and diffs, exit 1 on drift. `repokit verify` runs the check beside the ADR-269 grammar gate, the ADR-276 manifest gate and the ADR-335 alias gate, because a stale generated artifact is the same class of defect whatever generated it. The generator reads the protocol's TypeScript **source**, never a built `.d.ts`: a stale `dist/` would otherwise let the gate report freshness against yesterday's contract, which is the failure the gate exists to prevent.

- **D2 — One model, per-language emitters.** The generator reads the TypeScript into a small language-neutral model (structs, enums, field types, optionality) and each target renders that model. Swift and C# are rendered in the same run from the same model, so the two shells cannot drift from each other, and a third target is an emitter rather than a second reader. Nothing language-specific reaches the model: an emitter may spell a type differently, but it may not decide what the type *is*.

- **D3 — The IDE's Story IR projection is declared in TypeScript, and it lives in the build tool.** `tools/repokit/src/commands/protocol-projection.ts` declares `IdeStoryIR` — the ~20 fields the shells decode — and asserts at compile time that the real `StoryIR` satisfies it. A field renamed in `@sharpee/chord` fails `tsc` in the same commit.

  **It is not a wire type, which is why it is not in `@sharpee/ide-protocol`.** The platform emits the whole `StoryIR`; no platform code produces or consumes the projection, and a type in a published package that nothing imports is weight without a reader. Narrowing is a consumer-side concern, and it belongs with the generator that serves those consumers. This keeps ADR-341's Scope true as written — "no `packages/` change beyond the generator's read of `ide-protocol`" — rather than true by a waiver.

- **D4 — The generated file carries wire shapes only.** Schema-version gates, `decode(from:)`, and every reading convenience (`allEntities`, `hasKind`, `defaultLocaleNames`) stay hand-written beside the generated file, in Swift extensions and, when C# grows them, partials. The split is not tidiness: it is what lets the wire half be regenerated without touching a call site. A convenience in the generated file would have to be re-derived by the generator on every contract change, and the generator has no way to know what the app finds convenient.

- **D5 — The reader refuses rather than drops.** Every construct the model does not cover — an unexpected index signature, a union that is neither optionality nor a closed string set, a `typeof` over a non-literal, a type reachable from a root but absent from the emission spec — throws, naming the type and the field, and nothing is written. A generator that silently omits what it cannot translate produces a decoder wrong in exactly the way hand-mirroring was, and hides it behind a green gate. Three of these refusals are pinned by test.

- **D6 — Naming differences between targets belong to the target language.** Swift keeps the nesting its call sites already spell (`ComposeStoryIR.Meta`); C# flattens it (`ComposeStoryIRMeta`), because C# forbids a nested type and a property sharing a name and most of these shapes are named after the property carrying them. Two renames (`Span` → `DiagnosticSpan`, `DiagnosticSeverity` → `ComposeSeverity`) are recorded in the emission spec because the shipping shells already call them that; renaming ~40 call sites to match the TypeScript would be churn for nothing. Every such difference is a line in the spec, never an inference the emitter makes.

## Consequences

**The memory note this repository carried about silent IR drift is retired.** Renaming a projected field now fails `npx tsc -p tools/repokit/tsconfig.json --noEmit` with `Type 'boolean' is not assignable to type '{ PROJECTION_IS_NOT_A_NARROWING_OF: StoryIR; }'`. That was demonstrated, not argued: the rename was made, the failure observed, the rename reverted, the clean run observed.

**Adding a field to a wire contract is now a three-step change with a gate at the end**: change the TypeScript, run `repokit protocol`, commit the regenerated targets. Forgetting the middle step fails `repokit verify` rather than shipping a shell that ignores the field.

**Adding a new native target is an emitter plus an output path** — roughly the size of `protocol-csharp.ts` — and it inherits the whole contract, the whole gate, and the same fixture-level proof the existing targets have.

**The emission spec is now a decision record of its own.** What gets emitted, under what name, with what nesting, and which index signatures are deliberately ignored — all of it is in `protocol-spec.ts` rather than spread across two hand-written files in two languages. A reader asking "does the IDE see this field?" reads one list.

**Two contracts in `@sharpee/ide-protocol` deliberately have no native target.** The run-event stream (`run-events.ts`) and the deprecated test-result records (`test-results.ts`) are consumed by the Testing tab, which is a TypeScript surface that imports the wire directly under rule 8b; `TestRunner` hands it raw lines and decodes nothing. ADR-351 D3 keeps the panes web-built in every shell, so this is not a gap waiting on a target — a native decoder in front of that surface could only be a second opinion that drifts.

**ADR-341 AC-6 was met with one recorded deviation.** `SharpeeIDETests` passes at 593 tests, 0 failures — the same count as before the migration — but two test sites needed a change, not zero: the phrasebook is now the map the wire actually carries, so a phrase key is a dictionary key rather than a struct field. The alternative was generating a shim that preserved the old call shape and re-introduced the custom decoder this work removed. The deviation is recorded in `docs/work/chord-writer-avalonia-production/evidence/phase-2a-protocol-generator.md` rather than waived.

**This ADR authorizes no further implementation.** ADR-341 D8's sequence continues at D3's host contract and the shell; nothing here advances it.

## Session

Session 33ba00, 2026-09-16, on `main`. Plan: `docs/work/chord-writer-avalonia-production/plan.md`, Phase 2a — a phase added in the previous session when Phase 2 found that the generator it was told to point at did not exist. David gave the sign-off to start, which is the platform-change discussion CLAUDE.md requires, and approved the two test-site edits before each was made. Evidence, with every command and result inline: `docs/work/chord-writer-avalonia-production/evidence/phase-2a-protocol-generator.md`.
