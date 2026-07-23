# Implementation Plan — ADR-259 (Chord browser build supports hatch modules)

**Status**: Phase A CURRENT (the open decision was ruled 2026-07-23 — see Phase A)
**Source ADR**: `docs/architecture/adrs/adr-259-chord-browser-build-hatch-modules.md` (ACCEPTED,
verified unimplemented 2026-07-23)
**Written**: 2026-07-23, session 7f133e
**Execution context**: Docker container, safe mode off, on a branch.

---

## Relationship to the scoring track

**Independent of ADR-260/261.** Different subsystems: this is the devkit browser build and the
friendly-zoo directory; scoring is the ledger, stdlib's action, the extension registry, and the
Chord grammar. The one shared file is `packages/story-loader/src/loader.ts`, and even there the
regions differ — this track touches nothing, scoring touches `onEngineReady` and the lowering near
`:518`. Two branches can run in parallel; expect at most a trivial merge in that file.

## Verified starting state

All three load-bearing changes are absent:

- `packages/devkit/src/standalone/browser-core.ts:449` still throws on `result.ir.hasHatches`, with
  the *"does not support hatch modules yet"* wording D1 says should cease to exist.
- `packages/devkit/templates/browser/chord-browser-entry.ts.template:51` still calls
  `createStory(result.ir)` — no options object, no `hatchModules`, no generated imports.
- `stories/friendly-zoo/` still holds `zoo.story` *and* `src/`, `package.json`, `tsconfig*.json`,
  `dist/`, `node_modules/` — the D8 split has not happened.

---

## Phase A — Give the CLI the esbuild transpile (D6 amendment)

**Goal**: hatches load from `.ts` source on the CLI path, exactly as the browser build will.
**This precedes the split**, because the split is what removes friendly-zoo's `tsc` — doing it in
the other order leaves the seven transcripts broken in between.

**Files** — all three implementations of the compiled-JS policy:
- `packages/devkit/src/standalone/author-game.ts:34` (`requireHatchModule`), consumed at `:119`
- `packages/devkit/src/commands/compose.ts:102` (call site)
- `scripts/bundle-entry.js:231` — the platform bundle's own copy, and **the path every transcript
  test takes**, since `dist/cli/sharpee.js` is the mandated runner

**Build**: replace the `dist/<base>.js` → `<base>.js` lookup with an esbuild transpile of the
authored `.ts` to a Node-loadable CJS module, then load that. This is the same second pass D5
specifies for the bind check — one mechanism, two callers.

**Packaging consequence, must not be skipped**: `esbuild` is a **root devDependency**
(`package.json:65`), not a devkit dependency and not a runtime one. Transpiling at CLI load makes it
a runtime dependency of the author tool, so `@sharpee/devkit`'s manifest must declare it for authors
installing globally (ADR-180 Phase U2). ADR-252 D2's "no `package.json`, no `node_modules`" promise is
untouched — that promise is about the *story*, not the toolchain.

**AC**: friendly-zoo's 7 transcripts pass through `dist/cli/sharpee.js` **before** anything moves,
with no hand-run `tsc` and with `stories/friendly-zoo/dist/` renamed or emptied to prove the compiled
artifact is no longer what's being loaded.

**Revert safety**: self-contained; the browser build is untouched.

---

## Phase B — Split friendly-zoo (D8)

**Goal**: turn `stories/friendly-zoo/` into a clean hatched Chord story, so it can serve as this
ADR's end-to-end acceptance vehicle. **Everything downstream depends on this**; there is no other
hatched story in the repo.

**The authored path is currently wrong, and the split is what fixes it.** `zoo.story:788-789`
declares `from "./chord-extras.ts"` — resolving to `stories/friendly-zoo/chord-extras.ts` — but the
file lives at `stories/friendly-zoo/src/chord-extras.ts`. The move is not tidying; it makes the
declaration true.

**The hatch is cleanly separable.** `chord-extras.ts` has exactly one import —
`import type { Choice, Literal, PhraseProducer } from '@sharpee/if-domain'` — type-only, so it
depends on none of the tutorial's nine sibling files and erases entirely at transpile.

**Moves**:

| Destination | Contents |
| --- | --- |
| `stories/friendly-zoo/` (stays) | `zoo.story`, `chord-extras.ts` (up from `src/`), `tests/transcripts/` (7), `walkthroughs/`, `saves/` |
| `stories/family-zoo-tutorial/` (new — name is a plan-level choice, not an ADR decision) | `package.json`, `tsconfig*.json`, `vitest.config.ts`, `src/**` minus `chord-extras.ts`, `dist/`, `node_modules/` |

**Nothing is deleted.** The v17 tutorial is live content, not scaffolding.

**Decision, ruled 2026-07-23**: the CLI/D8 contradiction is resolved by **giving the CLI the esbuild
transpile** (Phase A, now an amendment to ADR-259 D6) rather than keeping a per-story `tsc`. With
Phase A landed, the split has nothing left to break: the CLI resolves `./chord-extras.ts` to the
source sitting beside the `.story`, which is exactly where D8 puts it.

The rejected alternatives, for the record: a minimal `package.json`/`tsconfig` retained in
friendly-zoo purely to emit one file, and committing the compiled `chord-extras.js` beside its
source (a generated artifact in version control, free to drift).

**AC**: the 7 transcripts pass through `dist/cli/sharpee.js`; the CLI resolves the hatch from beside
the `.story` with no build step; the tutorial builds in its own directory; nothing deleted.

---

## Phase C — The build route (D1, D2, D6 browser resolver)

**Goal**: a hatched `.story` produces a browser bundle.

**Files**: `packages/devkit/src/standalone/browser-core.ts` (the `:449` throw, `generateEntry` near
`:388-395`, entry emission at `:500`), `packages/devkit/templates/browser/chord-browser-entry.ts.template`.

**Build**:
- Delete the `hasHatches` throw. `hasHatches` selects a route; it does not fail the build.
- Generate, per hatch module, a static import plus a map entry, and pass
  `createStory(result.ir, { hatchModules })`.
- **The import specifier and the map key are deliberately different strings** — the single way to get
  this wrong:
  - **map key** = the `modulePath` **verbatim** (`'./chord-extras.ts'`), because `loader.ts:282`
    looks up exactly what the author wrote;
  - **import specifier** = that module resolved against the `.story`'s directory and emitted so it
    resolves from the generated entry's location — `<esbuildCwd>/dist/.browser-entry/<storyId>/`
    (`browser-core.ts:500`), *not* beside the `.story`. A naive `'./chord-extras.ts'` in the entry
    resolves against the scratch dir and fails.

**AC**: the D2 criterion — asserted for a story whose hatch sits beside the `.story`, which is
precisely the case a naive specifier breaks. (Phase B guarantees friendly-zoo is that case.)

---

## Phase D — The bind check (D5)

**Goal**: a hatch that does not bind fails the **build**, not the player's browser.

**Files**: `packages/devkit/src/standalone/browser-core.ts` (second esbuild pass + bind).

**Build**:
- A second esbuild pass emitting **CJS, unminified, Node-loadable** copies into the build scratch
  dir — from the same source as the shipped bundle, so the hatch that binds is the hatch that ships.
- Construct the story in Node via `createStory(ir, { hatchModules })` and fail the build on a bind
  error, surfacing the loader's own message and the hatch's `.story` span (`loader.ts:305-330`).
- **No `tsc`, no `tsconfig`, no `typescript` dependency** anywhere in this path. Typechecking is the
  wrong instrument: types erase, so type errors usually still transpile; the errors that break a
  hatched story are contract errors, which the loader already rejects atomically with a better
  message than `tsc` would give.
- Unminified matters beyond readability: the loader's `chord.*` namespace lint uses
  `findChordLiteral`, which inspects function source and is documented unreliable against minified
  code.

**AC**: missing module, missing export, and export-of-wrong-kind each fail the build separately;
a `chord.*` namespace violation fails the build; no `tsc`/`tsconfig`/`typescript` appears in the
hatched build path.

---

## Phase E — Trust reporting and the pure-IR guard (D3, D4)

**Goal**: state what a hatched bundle contains, and prove the strict profile still refuses one.

**Build**:
- The build reports that a hatched bundle contains **author-written executable code, not merely
  story data** (D3). Note the ADR's own correction here: per-story bundles are *already*
  story-specific — `generateEntry` interpolates title, theme, and storage prefix — so
  "story-agnostic vs specific" is not the line. Trust is.
- `profile: 'pure-ir'` continues to refuse a hatch-bearing story **before** binding
  (`loader.ts:274`), asserted by test. No code change expected — this phase proves D4 rather than
  implementing it.

---

## Phase F — REAL-PATH validation

**Goal**: prove it in a running browser and across both hosts.

- **Browser**: `sharpee build stories/friendly-zoo/zoo.story` → `dist/web/<id>/` plays, with the
  bound producer's output asserted **in the running app** — in the spirit of ADR-252's byte-identical
  parity test, not a unit test of the generated entry's text (rule 13a).
- **Host parity (D6)**: the same hatched story yields the same text through CLI and browser, despite
  resolving the hatch differently — compiled JS beside the `.story` for the CLI, `.ts` source through
  esbuild for the browser.

---

## Risk register

| Risk | Phase | Mitigation |
| --- | --- | --- |
| CLI loses its hatch compile in the split | A→B | Resolved: Phase A lands the CLI transpile **before** the split removes friendly-zoo's `tsc`. Reversing the order breaks all 7 transcripts in between |
| `esbuild` becomes a runtime dep of the author tool | A | Declare it in `@sharpee/devkit`'s manifest; it is currently root-only (`package.json:65`) |
| The 7 transcripts break on moved paths | B | Named in the ADR as a must-verify; run the full set before calling B done |
| Import specifier vs map key conflated | C | The ADR calls this the one way to get D2 wrong; assert both strings distinctly |
| Bind check run against minified output | D | Unminified CJS copies; `findChordLiteral` is unreliable otherwise |
| `tsc` creeping back in | D | Grep the hatched build path for `typescript`/`tsconfig` as an AC |

## Out of scope

Typechecking hatch bodies (deferred to TS 7.1's programmatic API, ADR-259 D5's
toolchain note); any ADR-252 D1 amendment (D7: none needed).

## References consulted

ADR-259 (ACCEPTED, all decisions), ADR-252 (build contract this amends), ADR-210 §5.6 (hatches),
ADR-094 (`define chain` hatch), ADR-258 D3/D5 (why text-scraping diagnostics were removed),
root `CLAUDE.md`.
