# ADR-361: Chord's syntax is closed — hatches are removed

**Status**: DRAFT (2026-10-08, session 1a5de8). The decision is David's ("we decided to remove hatches to completely close the syntax"), restated this session. The conversation where it was first made is not on record anywhere in the repository: no ADR, issue, grammar-log row or session summary carries it, which is why this ADR exists. No open questions. Not yet reviewed (`adr-review` has not run) and not accepted.

**Scope**: `packages/chord` (parser, analyzer, IR, `chord.ebnf`, the language version), `packages/story-loader` (hatch binding, `src/runtime/bind.ts`), `packages/devkit` (the load-time hatch transpile, the browser build's hatch route, the hatch-bind check, `compose`), `packages/ide-protocol` (`story-ir.ts`), `tools/repokit` (the protocol projection, and `src/commands/bundle.ts`, whose `--external:esbuild` exists only for the hatch transpile, ADR-274 D1), `tools/ide` (the Swift and C# protocol types, `StoryIndex.swift`, `IndexView.swift`), `packages/sharpee/docs/genai-api/` (regenerated from the changed `.d.ts` files), `docs/architecture/chord-grammar-changes.md` (a REMOVAL row, in the shape of ADR-235 D2's), and two stories: `stories/cloak-of-darkness` and `stories/friendly-zoo`.

## Date: 2026-10-08

## Parent

- **Supersedes ADR-259** (the Chord browser build supports hatch modules): with no hatches there is no hatch route.
- **Makes ADR-274 obsolete** (the bundled CLI's cold hatch transpile): its fix stays correct for as long as hatches exist and is removed with them.
- **Supersedes the hatch legitimacy rule** in `docs/work/story-language/design.md` §5.6 (cited from ADR-210), and makes the `docs/work/hatch-context/proposal.md` design moot.
- **Completes ADR-235 D2**, which removed the behavior hatch (`define behavior … from`) on 2026-07-18 and pointed authors at the action hatch instead. This removes the rest.
- **Leaves ADR-215 alone.** `use <extension>` names an extension the platform ships and trusts; it is not author code, and it stays. **Leaves ADR-094 alone** as a platform mechanism: TypeScript stories keep event chains, and only Chord's `define chain … from` surface goes.
- **Related**: ADR-257 (the language version; a removal is a major change).
- **Shares ground with ADR-360** (a region declares its rooms) **and ADR-362** (blocks fold), written the same session. All three ride one language-version bump at the next publish. This ADR and ADR-360 both regenerate the IDE protocol (this removes the hatch fields, ADR-360 adds text-source fields) and both change the IDE's story index (hatch rows out, the room lens in). Whichever lands second regenerates once more and checks the other's fields are intact.

## Context

**Chord has three hatches.** Each binds a TypeScript module into a Chord story:

| Form | Binds | AST / IR |
|---|---|---|
| `define text <name> from "<module>"` | a `PhraseProducer` to a `{name}` marker | `DefineText`, `IRHatch.hatchKind: 'text'` |
| `define action <name> from "<module>"` | a full TS action | `DefineHatch`, `'action'` |
| `define chain <name> from "<module>"` | a handler replacing a stdlib event chain | `DefineHatch`, `'chain'` |

Any hatch sets `StoryIR.hasHatches`, which takes the story off the pure-IR path: the CLI transpiles the module at load time with esbuild (ADR-274), the browser build takes a separate route that bundles it (ADR-259), and the IDE lists hatches in its story index.

**A closed syntax means everything a Chord story does is written in Chord.** As long as a story can reach into TypeScript, the language has no edge: the compiler can't see what a story does, the IDE can't index or test it, a browser build needs a bundler, and "Chord can't say this" never gets answered because there's always a way around it. Closing the syntax makes every gap a language question, answered by the platform: new syntax is platform work, and ADR-215's trusted extensions are the platform's other way to add a capability.

**Almost nothing uses them.** Census, 2026-10-08 (`grep -rn -E 'define (action|text|chain) [a-z-]+ from "'` over `.story` and `.chord` files, excluding `dist/`):

- **Stories, three uses, all `define text`:**
  - `stories/cloak-of-darkness/cloak.story:104`: `garbled` returns the fixed literal `Y.u h..e w.n` (`src/extras.ts`).
  - `stories/friendly-zoo/zoo.story:800`: `flavor` returns a cycling choice of three parrot lines.
  - `stories/friendly-zoo/zoo.story:801`: `aside` returns a first-time choice whose second alternative is empty (`chord-extras.ts`).
- **No story uses `define action … from` or `define chain … from`.** They appear only in test fixtures: `packages/chord/tests/fixtures/traits-basic.story:68` (action) and the chain-hatch tests in `packages/chord` and `packages/story-loader`.
- **Test fixtures with text hatches:** `packages/chord/tests/fixtures/{zoo-phase-c,comments-golden,cloak}.story`, `gates/unbound-marker.story`, `malformed/unterminated-string.story`, `lexer-golden/story-core.story`, and `packages/devkit/tests/fixtures/hatch-bind/tiny.story`.

**Pure Chord already covers all three story uses.** Checked 2026-10-08 by compiling with `compile` from `packages/chord/dist` (compile only, not run): `define phrase flavor, cycling` with three `or` variants compiles with no diagnostics, and so does `define phrase aside, first-time` with one variant followed by an empty `or`. `garbled` is a fixed string and needs no phrase at all.

**The existing removal message points at what this removes.** `parse.removed-behavior-hatch` (`packages/chord/src/parser.ts:3420`) tells the author to "ship a full action with `define action <name> from "<module>"`", and names ADR-235 in the user-facing text.

## Decision

**D1 — The three hatch forms are removed.** `define text <name> from`, `define action <name> from` and `define chain <name> from` are parse errors. Each error names the form and gives a fix-it:

| Form | Code | Fix-it |
|---|---|---|
| `define text … from` | `parse.removed-text-hatch` | write the text as a `define phrase`, with a strategy (`cycling`, `first-time`, `randomly`, `sticky`, `stopping`) if it varies |
| `define action … from` | `parse.removed-action-hatch` | write the action as a `define action` block in Chord |
| `define chain … from` | `parse.removed-chain-hatch` | none in Chord; the message says the behavior needs support in the language |

Only the `from "<module>"` form of `define action` is removed: a `define action <name>` block with an indented body is untouched, and the parser tells the two apart by the `from` after the name, as it does today (`parseDefineAction`, `parser.ts:4039-4051`). The existing `parse.text-from`, `parse.text-module`, `parse.hatch-from`, `parse.hatch-module` and `parse.chain-hatch-name` errors retire with the forms they diagnosed.

`parse.removed-behavior-hatch` changes in the same way: its fix-it drops the `define action … from` suggestion and its text drops the ADR number, with the citation moved to a code comment above the throw.

**D2 — The IR has no hatches.** `StoryIR.hatches`, `StoryIR.hasHatches` and `IRHatch` are removed, along with the `DefineText` and `DefineHatch` AST nodes. Every Chord story is pure IR, so the pure-IR profile stops being a profile and is simply what a Chord story is. `ide-protocol`'s story-IR types and the generated Swift and C# types follow by regeneration (`repokit protocol`).

**D3 — The machinery that served hatches goes with them.** Removed: hatch binding in `packages/story-loader/src/runtime/bind.ts` and the loader; the load-time transpile in `packages/devkit` (and with it the CLI's runtime need for esbuild that ADR-274 arranged); the browser build's hatch route (ADR-259); the `hatch-bind` check; the hatch handling in `devkit compose`; and the hatch rows in the IDE's story index. No compatibility path is kept: removal is one-shot, as the repository's policy requires.

**D4 — When Chord can't say something, the platform answers.** A story need that Chord can't express is a language gap, closed by a new construct or a trusted `use` extension (ADR-215), each of which is a platform change discussed first. It is never closed by author TypeScript reaching the runtime. TypeScript stories (Dungeo and the like) are unaffected: they aren't Chord and never used hatches.

**D5 — The corpus migrates in the same change.** Cloak's `{garbled}` becomes the literal text in `message-trampled`. The Zoo's `{flavor}` becomes `define phrase flavor, cycling` and `{aside}` becomes `define phrase aside, first-time` with an empty second variant; `chord-extras.ts` and Cloak's `src/extras.ts` are then unused. Fixtures that use a hatch only incidentally are rewritten without one. Fixtures and tests that exist only to exercise hatches are deleted, after the list is shown to David and he confirms it (CLAUDE.md: no deletion without confirmation).

**D6 — This is a major language change.** Under ADR-257 D2, previously valid syntax that stops parsing is a major change. The version moves when the platform next publishes, not in this change.

## Acceptance Criteria

1. **AC-1 (D1, the errors).** Each of the three forms is a parse error with its D1 code (`parse.removed-text-hatch`, `parse.removed-action-hatch`, `parse.removed-chain-hatch`) and its D1 fix-it, and none of the messages names an ADR. A `define action <name>` block with a body still compiles. `parse.removed-behavior-hatch` no longer suggests `define action … from`. **MECHANICAL**, one test per form plus the block.
2. **AC-2 (D2, the IR).** `grep -rn -E "hasHatches|IRHatch|DefineHatch|DefineText\b" packages tools --include='*.ts' --include='*.swift' --include='*.cs'` returns nothing outside `dist`, and `repokit protocol` regenerates the IDE types with no hatch fields. **MECHANICAL.**
3. **AC-3 (D3, the machinery).** The story-loader, devkit and IDE build and their suites pass with the hatch code removed, no esbuild call remains on the story-load path, and `tools/repokit/src/commands/bundle.ts` no longer passes `--external:esbuild` (the CLI bundle has no runtime use for it). **MECHANICAL.**
4. **AC-4 (D5, Cloak).** Cloak's transcripts pass unchanged with `{garbled}` replaced by the literal: the trampled message reads exactly as before. **REAL-PATH**, through the CLI bundle.
5. **AC-5 (D5, the Zoo).** The Zoo's transcripts pass unchanged with the two phrases: the parrot's line cycles through its three variants in the same order, the plaque aside appears on the first examination only, and both positions survive a save and restore. **REAL-PATH**, through the CLI bundle. This is the check that the compile-only probe in the Context does not make.
6. **AC-6 (D2, every story is pure).** Every Chord story in the repository builds for the browser by the pure-IR route, and no other route exists to select. **MECHANICAL.**

## Consequences

- **Some things Chord stories could do, they now can't.** Replacing a stdlib event chain, and any TS action, have no Chord equivalent. Nothing in the corpus does either, so nothing breaks, but the next story that needs one waits for the language.
- **The build gets simpler.** One browser route instead of two, no load-time transpile, and no esbuild on the CLI's story path.
- **Everything a story does is visible.** The compiler, the IDE's index and lenses, and the testing tools see the whole story, because there is nothing outside the IR to see.
- **Language gaps become platform work.** The cost of closing the syntax is that every "Chord can't do this" lands on the platform as a request. That is the intent.

## Session

Session 1a5de8, 2026-10-08, on `main`. Written at David's request ("write the hatch ADR too") after he restated the decision during the ADR-349 revisit. The census and the pure-Chord probes were run this session. `adr-review` the same session scored 12/14 NEEDS WORK; the fixes named D1's three error codes and the errors they retire, kept the `define action` block form explicitly, and added the grammar log, the genai-api regeneration and `bundle.ts` to Scope and AC-3.
