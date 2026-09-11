# Gate coverage audit — what no check in this repository can observe

**Date**: 2026-09-10 (session 6682ed, `main`)
**Origin**: ledger item I-52e228-1, "a check structurally incapable of observing what
broke" — six recorded instances across five sessions. This audit stops counting instances
and maps the gaps that produce them.
**Method**: every command, config, and script is named below with the output it produced
on 2026-09-10. Nothing here is inferred from an ADR or a prior summary.

## The gate inventory

Five things in this repository are treated as gates. Here is what each one actually sees.

| Gate | Command | Typechecks | Runs | Blind to |
| --- | --- | --- | --- | --- |
| Root typecheck | `pnpm typecheck` → `tsc --noEmit` | **zero files** | — | everything |
| Turbo typecheck | `turbo run typecheck` | nothing — the task has no implementors | — | everything |
| Package build | `./repokit build`, or `test:ci`'s `dependsOn: ["build"]` | each package's `src/**/*` | — | all test files; 4 packages; 2 stories; 1 tool |
| Test sweep | `pnpm exec turbo run test:ci` (67 tasks) | nothing of its own | 33 packages' vitest suites | type errors everywhere; 7 packages' suites |
| Bundle + transcripts | `node dist/cli/sharpee.js --test --chain` | nothing | runtime behaviour of Dungeo | anything no transcript reaches |

The consequence, stated plainly: **`src/**/*` of a built package is the only TypeScript in
this repository that any routine command typechecks.** Everything else — every test file,
four packages, two stories, one tool — is compiled by nothing.

## Findings

### F1 — `pnpm typecheck` compiles zero files

`tsconfig.json` at the root is `{"files": [], "references": [...4 packages...]}`. Project
references are only followed by `tsc --build`; plain `tsc --noEmit` honours `files: []` and
compiles nothing.

```
$ npx tsc --noEmit --listFiles | wc -l
0
```

It exits 0 unconditionally, and has done so for every session that has cited it as evidence.
The audit that opened this session reported the gate as "clean, caveat: only 4 project
references" — the caveat understates it. There are not four packages in the gate. There are
zero files.

### F2 — the `typecheck` task turbo declares has no implementors

`turbo.json` defines a `typecheck` task. Zero of the 46 workspace packages define a
`typecheck` script, so `turbo run typecheck` has nothing to run. (It does not report that:
turbo 2.7.2 crashes with "Oops! Turbo has crashed" on `turbo run typecheck --dry=json`.)

The one package that has the check under another name is `tools/vscode-ext`
(`"lint": "tsc --noEmit"`), which is outside the workspace and therefore never reached.

### F3 — test files are typechecked by nothing: 1,574 errors in 260 files

Every package's `tsconfig.json` sets `include: ["src/**/*"]`; 24 of them additionally list
`**/*.test.ts` in `exclude`. vitest transpiles through esbuild and does not typecheck. So no
command in this repository has ever compiled a test file.

Typechecking them under the repository's own `tsconfig.base.json` strictness, with
`vitest/globals` and the `vitest.shared.ts` source aliases supplied so the run matches what
vitest actually resolves:

| Package | Test files | Files with errors | Errors | Top codes |
| --- | --- | --- | --- | --- |
| `packages/stdlib` | 127 | 87 | 914 | TS2353×639, TS2339×85, TS2722×27 |
| `packages/world-model` | 86 | 25 | 217 | TS7006×48, TS2561×32, TS2322×32 |
| `packages/engine` | 83 | 39 | 138 | TS2353×45, TS2345×17, TS2724×12 |
| `packages/story-loader` | 123 | 42 | 75 | TS2345×23, TS2353×15, TS2305×13 |
| `packages/character` | 54 | 14 | 47 | TS2339×27, TS2345×9, TS7053×4 |
| `packages/parser-en-us` | 25 | 12 | 32 | TS18048×12, TS7006×5, TS2353×4 |
| `packages/queries` | 2 | 1 | 32 | TS2339×30, TS7006×2 |
| `packages/channel-service` | 9 | 3 | 20 | TS7031×10, TS7006×7, TS2741×3 |
| `packages/chord` | 77 | 10 | 20 | TS7006×20 |
| `packages/platform-browser` | 19 | 3 | 14 | TS2561×6, TS2345×6, TS2739×1 |
| `packages/media` | 3 | 3 | 13 | TS18046×5, TS7006×3, TS2571×3 |
| `packages/transcript-tester` | 25 | 1 | 13 | TS2345×12, TS2353×1 |
| `packages/core` | 13 | 2 | 10 | TS2339×5, TS2322×3, TS2558×1 |
| `packages/if-domain` | 6 | 2 | 10 | TS7006×5, TS2741×3, TS2459×1 |
| `packages/event-processor` | 6 | 5 | 5 | TS2724×3, TS2416×1, TS7006×1 |
| `packages/lang-en-us` | 28 | 2 | 4 | TS7006×4 |
| `packages/devkit` | 28 | 1 | 2 | TS2300×2 |
| `packages/bootstrap` | 6 | 1 | 1 | TS2561×1 |
| `packages/extensions/basic-combat` | 2 | 1 | 1 | TS2722×1 |
| `packages/extensions/hunger` | 1 | 1 | 1 | TS2741×1 |
| `packages/extensions/scoring` | 1 | 1 | 1 | TS2741×1 |
| `packages/helpers` | 5 | 1 | 1 | TS2352×1 |
| `packages/world-index` | 12 | 1 | 1 | TS2322×1 |
| `stories/channel-service-test` | 1 | 1 | 1 | TS2741×1 |
| `tools/repokit` | 10 | 1 | 1 | TS2322×1 |
| **Total** | **781** | **260** | **1,574** | |

Clean: `branch-tester`, `extensions/chapters`, `extensions/testing`, `ide-protocol`,
`plugins`, `story-runtime-baseline`, `stories/dungeo`.

**Zero of the 1,574 are in `src/`** — which is the proof that package builds do their half of
the job, and that the entire gap is the half nobody checks.

These are not stylistic. A representative one, verified by reading both files:

- `packages/stdlib/tests/channels/standard.test.ts:319` builds a decoration as
  `{ type: 'em', content: ['hi'] }`.
- `IDecoration` (`packages/text-blocks/src/types.ts:54`) is `{ className, content }`. There
  is no `type` field and there has not been since the span+class wire shape landed.

The test passes because `produce()` flattens `content` and never reads the other key. It is
pinning a wire shape the platform abandoned, and it will keep passing after the shape
changes again.

Other confirmed drift of the same kind: `packages/engine/tests/fixtures/index.ts:6` and
`command-executor.test.ts:12` import `ActionResult` from `@sharpee/stdlib`, which exports
`ActResult`; `tests/fixtures/mock-parser.ts:10-13` imports three symbols stdlib does not
export and declares a `MockParser` missing the `tokenize` method its interface requires.

### F4 — test suites no sweep runs

`turbo run test:ci` covers the 33 packages that declare a `test:ci` script. These declare
tests and are not in it:

| Package | Test files | Has `test` | Has `test:ci` | Runnable at all? |
| --- | --- | --- | --- | --- |
| `packages/if-domain` | 6 | no | no | **no** — no script and no vitest config |
| `stories/dungeo` | 11 | yes (watch) | no | by hand only |
| `packages/extensions/basic-combat` | 2 | yes (watch) | no | by hand only |
| `packages/extensions/chapters` | 1 | yes (watch) | no | by hand only |
| `packages/extensions/hunger` | 1 | yes (watch) | no | by hand only |
| `packages/extensions/scoring` | 1 | yes (watch) | no | by hand only |
| `packages/extensions/testing` | 1 | yes (watch) | no | by hand only |

`packages/if-domain` is the sharpest case: six test files under `tests/`, a package with no
`test` script, no `test:ci`, and no `vitest.config.ts`. There is no command that runs them.

The inverse also exists: `stories/family-zoo-tutorial` declares `test:ci` and has zero test
files (it passes via `--passWithNoTests`).

### F5 — 20 packages' `test` script is bare `vitest`, which is watch mode

`channel-service, character, chord, core, engine, event-processor, extensions/conversation,
helpers, ide-protocol, lang-en-us, media, parser-en-us, platform-browser, stdlib,
story-loader, world-index, world-model, stories/channel-service-test, stories/dungeo,
stories/family-zoo-tutorial`.

Run non-interactively — by an agent, a script, or a hook — each hangs rather than reporting.
`test:ci` is the one that ends, which is why every instruction in the repository says to use
`--run`. The scripts themselves still say otherwise.

### F6 — four packages, two stories and one tool are compiled by no routine command

`repo.ts`'s `PLATFORM_PACKAGES` (`tools/repokit/src/repo.ts:18-62`) lists 34 packages.
`turbo run test:ci` builds the 33 with a `test:ci` script. Outside both:

| Path | In `PLATFORM_PACKAGES`? | In `test:ci`? | In the pnpm workspace? | Built by |
| --- | --- | --- | --- | --- |
| `packages/bridge` | no | no | yes | nothing |
| `packages/runtime` | no | no | yes | nothing |
| `packages/extensions/conversation` | no | no | yes | nothing |
| `packages/world-index` | no | yes | yes | `test:ci`'s build dep only |
| `stories/concealment-test` | n/a | n/a | **no** | nothing |
| `tools/vscode-ext` | n/a | n/a | **no** | nothing |

`bridge` and `runtime` matter most: `bridge` is the Node subprocess host the native IDE
talks to (ADR-135), and both were edited two commits ago by ADR-345 Phase 2
("fix(engine,bridge,runtime): narrow lifecycle optionals"). Both compile clean today —
verified `npx tsc -p packages/bridge/tsconfig.json --noEmit` and
`npx tsc -p packages/runtime/tsconfig.json`, both exit 0 — which is luck, not coverage.

`stories/concealment-test` is outside `pnpm-workspace.yaml` entirely and was edited today by
the ADR-344 Phase 5 sweep. It also compiles clean, by the same luck.

### F7 — `stories/dungeo` typechecks its tests and ships them

Dungeo's `tsconfig.json` includes `src/**/*` and excludes only `node_modules`, `dist`,
`src/browser-entry.ts`, `src/react-entry.tsx`. Its 11 `*.test.ts` files sit under `src/`, so
`tsc` compiles them — which is why Dungeo is one of the seven clean rows in F3 — and emits
them: `stories/dungeo/dist/` holds 12 `.test.js` files.

Accidentally the best-gated story in the repository, and the only one shipping its tests.

### F8 — the browser entry is excluded from its own story's typecheck

`stories/dungeo/tsconfig.json` excludes `src/browser-entry.ts` (6,158 bytes, edited
2026-09-10) because the story config lacks `lib: ["DOM"]`. This is the gap ADR-344 Phase 1's
exit grep missed: both stories' browser entries fabricated a stray player actor and no check
could see it.

The 2026-09-10 session added `stories/dungeo/tsconfig.browser-check.json` and the armoured
equivalent to make the file checkable. **No command runs either one.** They are documented
as hand-run (`npx tsc -p stories/<story>/tsconfig.browser-check.json`), which means the guard
holds exactly as long as someone remembers it exists.

Separately, `src/react-entry.tsx` is in that `exclude` list and in repokit's `EXCLUDED_SRC`
(`tools/repokit/src/commands/test-npm.ts:22`). It does not exist.

### F9 — the root `package.json` `workspaces` array is fiction

pnpm reads `pnpm-workspace.yaml`; the `workspaces` array in `package.json` is inert. It
currently lists six paths that do not exist (`packages/forge`, `packages/ext-daemon`,
`packages/cli`, `packages/web-client`, `packages/dev-tools`, `packages/platforms/*`) and
omits 18 that do (`bootstrap`, `branch-tester`, `bridge`, `chord`, `devkit`, `helpers`,
`if-services`, `media`, `plugin-scheduler`, `plugin-state-machine`, `plugins`, `queries`,
`runtime`, `story-loader`, `transcript-tester`, `world-index`, `platform-browser`,
`map-editor`).

It is not a gate, but it is the file a reader checks to answer "what is in this repository,"
and it answers wrong in both directions.

## What this says about I-52e228-1

The pattern is not six unlucky coincidences. It is one structural fact with six faces:
**the repository's only working typecheck is a side effect of building, and building only
ever looks at `src/`.** Every recorded instance — root `tsc`'s scope, the vitest-green /
bundle-red case, `test:ci` read as resume-path coverage, the browser-entry player actor —
is a thing that lives outside a `src/` directory of a package on the build list.

That is why adding one more check after each instance has not stopped the instances.

## Issues filed

Umbrella: **#408** — Gate coverage audit (2026-09-10).

| Finding | Issue |
| --- | --- |
| F1, F2 | #400 — `pnpm typecheck` compiles zero files; turbo's `typecheck` task has no implementors |
| F3 | #401 — test files are typechecked by nothing: 1,574 errors across 260 files |
| F4 | #402 — seven packages' test suites are outside the `test:ci` sweep |
| F5 | #403 — 20 packages' `test` script is bare `vitest` (watch mode) |
| F6 | #404 — `bridge`, `runtime`, `extensions/conversation`, `concealment-test`, `vscode-ext` are built by nothing |
| F7 | #405 — `stories/dungeo` compiles its test files into `dist/` |
| F8 | #406 — the `tsconfig.browser-check.json` guards are wired to no command |
| F9 | #407 — root `package.json` `workspaces` array is stale fiction |

Already open, same root cause: #399 (revive seam has no real-path test — the sixth recorded
instance of I-52e228-1), #398 (real-path gates check artifact presence, not freshness), #224
(familyzoo tutorial no longer typechecks against the platform).

**Suggested order**: #400 first — it decides where the typecheck gate lives, and #401, #404
and #406 all hang off that answer. #403 and #407 are independent and small. #401's burn-down
is the long tail and can proceed package by package once the gate exists.
