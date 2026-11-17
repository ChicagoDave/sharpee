# Phase 5 — Build, publish, and the hatch tier boundary: `esbuild-wasm`

**Plan**: `docs/work/web-ide-evaluation/plan.md`
**Run**: 2026-09-15, session 989482, macOS 26.6.2, Edge 153.0.4234.32 (`esbuild-wasm` 0.27.2)
**Spike code**: `/Users/david/repos/spikes/web-ide/src/publish.ts`, `make-platform-asset.mjs`, `app/publish.html`, `fixtures/fernhill/spike-hatch.{story,ts}` (outside this repository)
**Evidence in repo**: `evidence/phase-5/` — eight JSON readouts, the `file://` DOM dump, and the `file://` screenshot

**Verdict: PASS on every deliverable, including the one the plan wrote as a genuine unknown.** `esbuild-wasm` bundles the real platform in the page in **759 ms**, producing a 1.88 MB `game.js` that zips to **490 KB** — and that zip, extracted and opened from `file://`, **plays**. The hatch question closes the way the plan hoped but did not assume: a TypeScript hatch transpiles, evaluates, and bundles into a working `game.js` entirely in the browser. **Hatches are not a tier boundary for this shape.**

## 1. `esbuild-wasm`: the cold-start and size numbers (deliverable 1)

Loaded lazily at the moment of Publish. The import URL is computed at runtime specifically so the page's own bundler cannot inline it — "lazy" has to mean a real fetch at that moment, not a bigger first load. The page's own bundle is 737 KB and carries no esbuild at all, which is the check that it worked.

```json
"version": "0.27.2",
"jsShimImportMs": 2.5,
"wasmBytes": 13509049, "wasmMB": 12.88,
"wasmFetchMs": 16, "initializeMs": 18, "coldStartMs": 36
```

**12.88 MB of WebAssembly**, against the options doc's estimate of ~10 MB — **29% larger than assumed**. That is the number to carry into the decision record, because it is the entire marginal cost of Publish in this shape: nothing else the IDE does needs a bundler.

The timings are honest but flattering and must be read as such: 16 ms to fetch and 18 ms to instantiate is localhost with `cache: reload`, so it measures decode and compile, **not** network transfer. On a real connection the 12.88 MB is the cost, mitigated only by compression (the wasm compresses well, but this phase did not measure a served, compressed transfer and does not claim a figure for it) and by the fact that it is paid **once, on first Publish, and never during writing, playing or testing**. A first-time author who never publishes never pays it.

## 2. The platform payload (deliverable 2, first half)

An in-page bundler needs the platform on hand. `make-platform-asset.mjs` builds that payload:

```json
"files": 1127, "rawBytes": 5523855,
"zipBytes": 1873702 → 1.95 MB zipped (after the extensions were added),
"unpackMs": 40
```

**Twenty-one `@sharpee/*` packages, five `@sharpee/ext-*` extensions, three third-party runtime dependencies** (`eventemitter3`, `fflate`, `lz-string`) — 5.89 MB of JavaScript raw, **1.95 MB zipped**, unpacked into a `Map` in 40 ms.

What it carries is each package's **`dist/` (CJS), not `dist-esm/`** — because the shipped browser build passes `--conditions=require`, so that is what the real build resolves and therefore what the in-page build must resolve to produce the same output. The plan's framing ("prebuilt platform ESM") named the wrong half of the pair; the finding is small but it decides what the versioned static asset actually contains.

**Three things the payload only learned by failing**, each worth recording because a host would hit them in the same order:

1. `.cjs` and `.mjs` count. fflate's `require` condition resolves to `lib/browser.cjs`; a payload carrying only `.js` failed on it.
2. Third-party layouts cannot be guessed. `lz-string` keeps its main in `libs/`, which a hand-listed set of subdirectories missed; the fix is to walk the package.
3. **The extension packages are not optional.** `@sharpee/story-loader` requires `@sharpee/ext-chapters`, `ext-basic-combat`, `ext-hunger` and `ext-scoring` unconditionally — `evaluator.ts:45` and the four `extensions/*.ts` modules import them at module scope, not behind a story's `use` declaration. A payload without them fails to resolve even for a story that uses none. That is a real fact about the runtime's shape, not a packaging detail, and it is filed as **#465** — not for its size (~49 KB) but because `use scoring` in a `.story` reads like it decides whether scoring is in the build, and it does not.

Writing the resolver is the other cost. esbuild in the browser has no filesystem, so the host supplies one: a plugin with `onResolve`/`onLoad` over the payload, plus roughly eighty lines reimplementing the parts of Node resolution the platform actually uses — the `exports` map under the `require` condition, `main` fallback, relative paths, and extension probing. It is not hard, but it is **not free and not provided**: an in-page build means the host owns module resolution.

## 3. The bundle (deliverable 2, second half)

The options are the shipped build's, verbatim (`browser-core.ts`): `bundle`, `platform: browser`, `target: es2020`, `format: iife`, `globalName: SharpeeGame`, `conditions: ['require']`, the three `process.env` defines, `minify`. The four generated entry files — `browser-entry.ts` (from the platform's own template, tokens filled), `story-ir.ts`, `version.ts`, `hatch-modules.ts` — are generated exactly as that build generates them.

```json
"ok": true, "buildMs": 759,
"gameJsBytes": 1921850, "gameJsKB": 1877,
"gameJsSha256": "977a193969d763aa",
"warnings": 0, "errors": 0,
"startsWithIife": "var SharpeeGame=(()=>{var MJ=Object.crea"
```

**759 ms, zero warnings, zero errors.** For scale, the Node build's own `game.js` for fernhill is 1,548,133 bytes against this build's 1,921,850 — about 24% larger. The two are not a controlled comparison (the Node artifact was built on 2026-09-13 from a different working tree, and this build omits the source map the real build emits), so the difference is reported and not explained; it is the kind of gap a real adoption would want to close, not a blocker.

## 4. The publish artifact, and it plays from `file://` (deliverable 3)

The `dist/web/<id>/` equivalent, assembled and zipped in the page:

| File | Bytes |
| --- | --- |
| `index.html` | 6,435 |
| `game.js` | 1,921,850 |
| `base.css` | 9,030 |
| `engine.css` | 10,084 |
| `decorations.css` | 4,077 |
| **archive** | **501,803 (490 KB)**, `sha256 b0ea7a8b0a4c0c1f…` |

Written into the story folder through Phase 4's adapter and read back to confirm it landed.

**The acceptance bar, met.** The archive was decoded outside the browser, extracted, and the extracted `index.html` loaded from a real `file://` URL in Edge 153 — `--headless=new --virtual-time-budget=8000 --dump-dom`. The DOM that came back is playing fernhill:

> The Folly at Fernhill · Story v0.3.0 · One cold winter night to find the deed that keeps Fernhill in the family. · By The Sharpee Project · **Iron Gates** · The cab is already grinding away down the lane, its lamps swallowed by the dark. An auction notice is nailed to the left-hand gate, ruffling in the wind: FERNHILL HOUSE AND GROUNDS, BY ORDER OF THE ESTATE, AT DAWN. · The wind comes off the downs and worries at the bare limes.

The screenshot (`evidence/phase-5/file-play.png`) shows the whole page: title bar, File/Settings/Help menus, the status line reading `IRON GATES — Score: 0 | Turns: 1`, the banner, the opening prose, the scheduler's first daemon tick ("Far off in the village, the church bell counts another quarter hour gone"), and a live prompt. **A story written, built and published entirely in a browser, running with no server and no install.**

Two honest qualifications. The page is the **platform default template**, not fernhill's own `browser/index.html`, so there are no themes and no story CSS — the custom-page path (ADR-253 D3) was not exercised and would not change what is under test here. And the last inch of "download" is not a browser save dialog: the archive left the page through the evidence sink, because a download needs a user gesture this self-driving page does not have. The zipping, the bytes, the extraction and the `file://` load are all real; only the save click is stood in for.

## 5. The hatch question, answered (deliverable 4)

The plan asked for the real outcome either way — closing brainstorm §6's Option 1, or stating the tier boundary plainly as Option 2. It closes Option 1, and on more than the narrow question.

A real hatched story was written for this (`spike-hatch.story` + `spike-hatch.ts` in the spike fixture; fernhill has `hatchCount: 0`, so it could not answer this). The `.ts` uses TypeScript that must be erased to run: an interface, a type alias, an `as const`, a generic function, parameter and return annotations. It compiles clean through the real compiler, declaring one text hatch.

**Transpile** — `hatch-transpile.ts`'s own options (`bundle`, `packages: external`, `platform: node`, `format: cjs`, `target: node18`, unminified, inline source map) and a browser-ESM variant, both through `esbuild-wasm`:

```json
"node-cjs (hatch-transpile.ts's own options)":  ok, 4307 bytes, 0 warnings
"browser-esm (what a browser could actually load)": ok, 3207 bytes, 0 warnings
```

**Evaluate** — the browser-ESM output was turned into a blob URL and dynamically imported, so the claim is not "it produced text":

```json
"imported": true, "exportNames": ["doubleIt", "weather"], "calledDoubleIt": 42
```

The module loaded and its exported function returned 42 for 21. TypeScript erased, `chord.*` namespace clean.

**Bundle end to end** — the question that actually matters, because transpiling a file is not publishing a hatched story. The whole pipeline ran in the page: compile the story, generate `hatch-modules.ts` with the author's `from "…"` path as the key and the module resolved relative to the entry (`stampHatchModules`'s exact shape), bundle unminified (the loader's bind-time `chord.` lint reads function source and is documented unreliable against minified code):

```json
"built": true, "error": null, "gameJsBytes": 4213097,
"carriesAuthorCode": true, "hatchFunctionPresent": true,
"typescriptErased": true, "warnings": 0
```

The author's own prose and their hatch's phrases are **in** the bundle, `function weather` survives, the interface does not. **The ruling: hatched stories do not need Chord Writer for Mac on account of the build.** brainstorm §6's Option 2 — "hatched stories need the Mac app" — is not the answer for this shape.

One boundary that remains, and is a different one: this proves the browser can **build** a hatched story. It does not prove the browser should be where an author **writes** one — a hatch is TypeScript, and a TypeScript editing experience (types, completion, diagnostics) is a separate question this evaluation has not touched. Whether hatches *should* ship this way is David's call, as the plan says; what the technical half can no longer claim is that it cannot work.

## 6. What this phase did not establish

- **No compressed-transfer measurement.** The 12.88 MB wasm was fetched over localhost. The real first-Publish cost on a real connection is unmeasured, and the record gives no figure for it.
- **The 24% `game.js` size gap** against the Node build is reported, not explained; the two artifacts were not built from the same tree on the same day.
- **The custom-page path was not exercised** (ADR-253 D3): the published page is the platform template, so themes, story CSS and asset copying are untested in this shape.
- **No `sharpee publish` parity check.** The real publish command excludes `index-testing.html` by name and does other work this page does not reproduce; what was built here is the `dist/web/<id>/` equivalent, not a byte-equal `publish` output.
- **Edge only.** Unlike Phase 4, this phase ran in one browser. `esbuild-wasm` is not obviously engine-sensitive, but that is an assumption, not a measurement.

## 7. Nothing in the repository was written

`git status --short branch-stories/fernhill` empty throughout; the tracked `fernhill.tests.json` and the spike fixture copy both still hash `069f424d…fe4de6`. The published archive went to the OPFS store and to the evidence sink; the `file://` test ran out of a scratch directory. `esbuild-wasm@0.27.2` was installed into the spike's own `node_modules` (`--no-save`), matching the repository's esbuild version so the comparison is like for like; nothing was installed into the repository, and nothing an author would install is implied — the wasm is a static asset the page fetches, which is the whole point of the shape.

## Integration Reality Statement (rule 13a)

**In-page build and publish with `esbuild-wasm`**

- **OWNED**: `esbuild-wasm` (the bundler this phase is named for); the platform payload — 21 `@sharpee/*` packages, 5 `@sharpee/ext-*` extensions — resolved and bundled from this repository's own `dist/`; the platform's own `chord-browser-entry.ts.template` and `index.html` template; `@sharpee/chord`'s compiler; `fflate`; the four generated entry files, produced to `browser-core.ts`'s exact shapes.
- **EXTERNAL**: Edge 153's WebAssembly, Worker, blob-URL and `file://` implementations — the browser, which this repository does not ship.
- **REAL-PATH TEST**: `5-4-bundle.json` — the real `esbuild-wasm` bundling the real platform with the shipped build's own options, 0 errors, 0 warnings, correct IIFE preamble. `5-5-publish.json` plus `file-play-dom.html` and `file-play.png` — the produced archive extracted **outside the browser** and loaded from a real `file://` URL in a real Edge, rendering fernhill's real opening prose, its status line and its scheduler tick. `5-6-hatch.json` — the transpiled hatch **imported and executed** (`doubleIt(21) === 42`), not merely emitted. `5-7-hatched-build.json` — a hatched story bundled end to end, with the author's code verified present in the output. No injection, no override, no stub of the bundler, the compiler or the runtime.
- **STUB JUSTIFICATION**: none for the bundler or the runtime — both are real throughout. Two stand-ins are named rather than hidden: the archive leaves the page through the evidence sink instead of a browser download (a user gesture this page does not have — the bytes, the extraction and the `file://` load are all real), and the published page is the platform default template rather than fernhill's custom page, which changes what the artifact *looks* like and not whether it boots. The node-builtin shims from Phase 3 are not in this page's bundle at all.
