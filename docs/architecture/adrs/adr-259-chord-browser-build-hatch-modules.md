# ADR-259: The Chord browser build supports hatch modules (full compile route)

## Status: ACCEPTED (2026-07-23, session 341218) — the Chord browser build gains a hatch route: `hasHatches` selects it rather than failing (D1), modules reach the browser through story-loader's existing injection seam by static import (D2), and a build-time bind check replaces typechecking (D5). Open Questions resolved by `adr-interview`; `adr-review` 11/14 → **14/14** after three fixes (D2's import-specifier/map-key split, D5's Node-loadable bind copies, D3's false story-agnostic premise). Not implemented.

## Parent: ADR-252 (`.story` first-class browser build) — amends its build contract. Relates to ADR-210 §5.6 (hatches; the loader's filesystem-free contract), ADR-094 (`define chain` hatch), ADR-251 (`import` fragments in the browser bundle). **ADR-258 depends on this**: the IDE builds and plays every `.story`, and cannot do so for a hatched story until this route exists.

## Date: 2026-07-23

## Context — verified, not assumed

A Chord story may declare TypeScript hatches — `define text flavor from "./chord-extras.ts"`
(ADR-210 §5.6), `define action … from`, `define chain … from` (ADR-094). The
authoring surface, the compiler, and the runtime all support them. **No build does.**

**The runtime seam already exists and is browser-shaped by design.** `story-loader`
is explicitly filesystem-free — *"No filesystem access: hatch modules arrive
pre-loaded via options"* (`loader.ts:17`). Modules are injected, keyed by the
`.story`'s own module-path string:

```ts
hatchModules?: Record<string, Record<string, unknown>>;   // loader.ts:145
const module = options.hatchModules?.[hatch.modulePath];  // loader.ts:282
export function createStory(ir: StoryIR, options: StoryLoaderOptions = {}) // loader.ts:167
```

Nothing here wants a filesystem or a `require`. A browser host can satisfy this
contract exactly as a Node host does — by handing over a map. **The architecture
anticipated this; only the build never caught up.**

**What is missing is entirely in the build and the generated entry.** The generated
browser entry fetches the `.story` source, compiles it *in the browser*, and calls:

```ts
// templates/browser/chord-browser-entry.ts.template
// "Hatch modules are not supported in the browser scaffold (the build
//  refuses hatched stories before shipping); pure-IR stories load here."
return createStory(result.ir) as unknown as Story;   // ← no options, no hatchModules
```

The options parameter is simply never passed. Upstream, the build refuses first:

```ts
if (result.ir.hasHatches) {                    // browser-core.ts:449
  throw new Error('this story declares TypeScript hatches … the browser build
    does not support hatch modules yet. Remove the hatches, or use the
    TypeScript project form.');
}
```

That *"yet"* is a placeholder for work never done — not a considered limitation.

**A second, independent wall exists but is not the hatch wall.** `build-browser.ts:156`
rejects any directory holding both a `.story` and `src/index.ts` (ADR-252 D1, "never
both"). A *clean* hatched story — hatch source beside the `.story`, no `src/index.ts` —
passes this check and dies at `browser-core.ts:449`. Only a story that is *also* a
legacy TypeScript project hits the exclusion first.

**friendly-zoo is that story, and it is the only hatched story in the repo.** It
carries `zoo.story` (hatches at lines 788–789) *and* a full TypeScript project —
`src/index.ts`, `package.json`, `tsconfig.json`, `node_modules/`, `dist/`. Its hatch
`src/chord-extras.ts` is compiled to `dist/chord-extras.js` by plain `tsc`
(`package.json` → `"build": "tsc"`), which is how `requireHatchModule`
(`author-game.ts:34`, resolving `dist/<base>.js` then `<base>.js`) finds anything at
all. That compilation is a TypeScript-project build sitting next to a `.story` — no
`sharpee` command performs it. Consequently `sharpee build` cannot build friendly-zoo
by either target form: it exits at the ADR-252 D1 exclusion before reaching the hatch
throw.

So the honest summary: **hatches were designed, implemented at runtime, and are green
in tests** (friendly-zoo's 71 transcript tests exercise the bound producers), **while
no Sharpee build has ever compiled a hatch module.** The one story that uses them
survives on scaffolding that predates ADR-252 and that ADR-252 outlawed.

## Decision

### D1 — `hasHatches` selects a build route; it does not fail the build

`browser-core.ts`'s hatch throw is removed. A hatched `.story` builds to a browser app
like any other; the difference is the route taken to produce the bundle, not whether
one is produced. The *"does not support hatch modules yet"* error ceases to exist
rather than being reworded.

### D2 — Hatch modules reach the browser by static import + injection, not a `require` shim

The browser has no `require`, and the loader does not want one. The generated entry
(ADR-252 D4) gains, for each hatch module the build-time compile reports, a static
import plus a map entry:

```ts
import * as hatch0 from '/abs/path/to/stories/friendly-zoo/chord-extras.ts';
…
return createStory(result.ir, {
  hatchModules: { './chord-extras.ts': hatch0 },   // ← key is what the AUTHOR wrote
});
```

**The import specifier and the map key are deliberately different strings**, and
conflating them is the one way to get this wrong:

- The **map key** is the hatch's `modulePath` **verbatim** — `'./chord-extras.ts'` —
  because `loader.ts:282` looks up exactly what the author wrote and the IR carries.
- The **import specifier** is that module resolved against the `.story`'s directory
  and emitted as a path that resolves *from the generated entry's location*.

That distinction is forced by where the entry actually lives: `browser-core.ts:500`
writes it to `<esbuildCwd>/dist/.browser-entry/<storyId>/`, a build-scratch directory
chosen so `@sharpee/*` resolves from the env's `node_modules` — **not** beside the
`.story`. A naive `'./chord-extras.ts'` in the entry would resolve against that scratch
directory and fail.

With the specifier resolved, esbuild — already the bundler for this path — pulls the
author's TypeScript into `game.js` alongside the entry. No new module system, no
runtime resolution, no filesystem in the browser: the existing injection seam is
finally used.

The build-time compile is what enumerates the hatches; the browser's runtime compile
of the same shipped source yields the same `modulePath` strings, so the generated map
and the runtime IR agree by construction.

### D3 — A hatched bundle contains author-written executable code, and the build says so

Every per-story bundle is *already* story-specific: `generateEntry`
(`browser-core.ts:388–395`) interpolates `STORY_TITLE`, `DEFAULT_THEME`,
`THEMES_JSON`, and `STORAGE_PREFIX` into the entry before esbuild runs. The genuinely
story-agnostic artifact is the separate playground build (`buildPlayground` →
`dist/playground/`), a different command. So "story-agnostic vs story-specific" is not
the line between a pure and a hatched bundle, and this ADR does not pretend it is.

The distinction that *does* matter is trust: **a hatched bundle contains
author-written executable code, not merely story data.** That is the property worth
stating — it is why the `pure-ir` profile exists (D4), why the playground must keep
refusing hatched stories rather than bundling them, and what anyone reviewing,
hosting, or redistributing a bundle needs to know. The build reports it in its output
so the difference in kind is never a surprise.

### D4 — The loader profile stays `devkit`; `pure-ir` keeps refusing hatches

The browser gains hatch support by supplying modules, not by weakening the profile
contract. `profile: 'pure-ir'` continues to refuse hatch-bearing stories *before*
binding (`loader.ts:274`), which remains the correct guarantee for hosts that must not
execute author code — the playground being the obvious one.

### D5 — The build transpiles hatches and gates them with a bind check, not a typecheck

esbuild transpiles the author's hatch TypeScript; **no `tsc`, no `tsconfig`, no
`typescript` dependency**. ADR-252 D2's "no `package.json`, no `node_modules`" promise
therefore survives for hatched stories too — the toolchain dependency that made this
question hard turns out not to be needed at all.

Typechecking is the wrong instrument here. TypeScript types are erased, so a type
error inside a hatch body usually still transpiles to working JavaScript. The errors
that actually break a hatched story are **contract** errors — a missing export, an
export of the wrong shape — and `story-loader` already rejects those at bind time,
atomically, with the hatch's `.story` span (`loader.ts:305–330`):

> ``Hatch `flavor` in `./chord-extras.ts` is missing — expected a dynamic-text producer export.``

That is a better diagnostic than `tsc` would produce, and it already exists. The only
defect is *when* it fires: at load, which for a browser build is the player's browser.

**So the build performs the bind itself.** It constructs the story in Node with its
hatch modules — `createStory(ir, { hatchModules })` — and fails the build if binding
fails, surfacing the loader's own message and span. This is the **load-proof**
`compose`'s default mode already performs, applied where it was missing. A hatched
story cannot ship with a hatch that does not bind.

Node cannot `require` the author's TypeScript, and `requireHatchModule` expects
pre-compiled JS — the very dependency this decision removes. So the bind check loads
**Node-loadable copies** of the hatch modules, produced by a second esbuild pass to
CJS in the build scratch directory. Browser bundle and bind-check copies are built
from the same source in the same build, so **the hatch that binds in the check is the
hatch that ships**.

The check runs against those unminified copies, not the minified browser bundle — which
also keeps the loader's `chord.*` source lint meaningful, since `findChordLiteral`
inspects function source and is documented as unreliable against minified code.

The build gate covers everything the loader checks: missing module, missing export,
wrong kind (text/action/chain), and the `chord.*` loader-private namespace lint. It
does not cover type errors within a hatch body, which is stated in author docs rather
than left to be discovered.

**Toolchain note (recorded 2026-07-23; future state, deliberately not acted on).**
TypeScript 7.0 — the Go rewrite — went GA on 2026-07-08, roughly 10x faster than 6.0,
shipping as the ordinary `typescript` package rather than the
`@typescript/native-preview`/`tsgo` preview. It ships **without a stable programmatic
API**; a new one is expected in **7.1**, projected 3–4 months out. **Sharpee cannot
adopt any of it yet**: this repo is on `typescript ^5.2.2` (root) / `^5.3.3` (devkit),
two majors back, and `@davidcornelson/tsf` — the compiler orchestrator every platform
build runs through — itself needs 7.1. TS 7 adoption is deferred repo-wide, so D5 is
decided against TS 5.x.

This does not change D5, and would not have: 7.0 would have softened the *cost* of a
`tsc` gate without touching the *dependency* objection, and the bind check turns out
to be the better instrument regardless. What 7.1 would enable is narrower and worth
remembering — `tsc` emits text, not structured diagnostics, so hatch **type** errors
cannot join Chord's `analysis.*` diagnostics in the IDE's Problems panel (ADR-258 D5)
without either scraping `tsc` prose — precisely what ADR-258 D3 deletes — or waiting
for 7.1's API. D5 forecloses neither: adding an opt-in typecheck later is additive to
a transpile-and-bind build. Migration also looks unobstructed when it comes; the
packages 7.0's missing API breaks (`ts-node`, `ts-jest`, `ts-loader`,
`typescript-eslint`, Volar-based checkers) appear in neither the root nor the devkit
manifest.

### D6 — A hatch `modulePath` names the author's source; each host resolves it its own way

`from "./chord-extras.ts"` means the TypeScript **source file**, relative to the
`.story`. The author writes one honest path and never names a build artifact.

Each host then resolves that string as suits it, and they are allowed to differ:

| Host | Resolves `"./chord-extras.ts"` to |
|---|---|
| Browser build (D2) | the `.ts` **source**, handed to esbuild, bundled into `game.js` |
| CLI (`sharpee test`/`play`) | compiled JS — `dist/chord-extras.js`, else `chord-extras.js` (`requireHatchModule`, `author-game.ts:34`) |

`requireHatchModule` is therefore **unchanged**; the browser route adds a resolver
rather than rewriting the Node one. The two agree on the authored string, which is the
only thing the IR carries and the only thing `loader.ts:282` keys on.

*Consequence, stated plainly*: the CLI path still expects the author's hatch TypeScript
to have been compiled by some means outside the Sharpee toolchain, exactly as
friendly-zoo does today with its own `tsc`. This ADR closes that gap for the **browser**
build only; closing it for the CLI is separate work.

### D7 — ADR-252 D1's `.story`/`src/index.ts` exclusion is unchanged

No amendment. The exclusion (`build-browser.ts:156`) tests for `src/index.ts`
specifically — a TypeScript **story entry** — so hatch modules at `./chord-extras.ts`
or `src/chord-extras.ts` never trip it. The rule bans two *story kinds* sharing a
directory, and a hatch module is not a story. A clean hatched Chord story is legal
under ADR-252 D1 today and always was; only a directory that is *also* a legacy
TypeScript story collides, which is a property of that directory, not of hatches.

### D8 — friendly-zoo's directory is split; both stories survive

`stories/friendly-zoo/` currently holds two complete stories: the Chord `zoo.story`
and the multi-file **"Family Zoo Tutorial — Version 17"** TypeScript story rooted at
`src/index.ts`. That is what trips ADR-252 D1, and it is a property of this directory
rather than anything to do with hatches (D7).

The two are separated, and **nothing is deleted**:

| Directory | Contents |
|---|---|
| `stories/friendly-zoo/` | `zoo.story`, its hatch module beside it, `tests/transcripts/` (7), `walkthroughs/` |
| a sibling directory | the v17 TypeScript tutorial — `package.json`, `tsconfig*.json`, `src/**` |

Each then builds by its own route with no exclusion to trip, and the hatch module sits
beside the `.story` it belongs to — the convention D6 names. friendly-zoo becomes a
**clean hatched Chord story** and therefore this ADR's end-to-end acceptance vehicle:
the one in-repo story that proves a hatched `.story` builds, binds, bundles, and plays.

Two things this must not break, both verified before the split is called done: the 7
transcript files (paths and any story-relative references) and the CLI hatch
resolution, which after the move looks for `chord-extras.js` beside the story rather
than under the TypeScript project's `dist/` (D6's CLI row). The tutorial's own build
and the exact naming of the sibling directory are execution details for the plan, not
decisions this ADR makes.

## Acceptance

**Worked example.** `stories/friendly-zoo/zoo.story` — declaring
`define text flavor from "./chord-extras.ts"` (D8's split put the hatch beside it) —
builds with `sharpee build stories/friendly-zoo/zoo.story`, and the resulting
`dist/web/<id>/` plays in a browser with the hatch's producer staging real text. No
`require`, no filesystem, no hand-written entry, no `tsc`.

**Done when:**
- `sharpee build` on a hatched `.story` produces a working browser app; the
  `hasHatches` throw is gone from `browser-core.ts` (D1).
- The generated entry static-imports each hatch module by a specifier that resolves
  from the scratch entry dir, while the `hatchModules` key stays the **verbatim**
  `modulePath` — asserted for a story whose hatch sits beside the `.story`, which is
  precisely the case a naive `'./…'` specifier would break (D2).
- The build states that a hatched bundle contains author-written executable code (D3).
- The build's bind check fails the **build** — with the loader's own message and the
  hatch's `.story` span — for a missing module, a missing export, and an export of the
  wrong kind. Each asserted separately; none reaches the player's browser (D5).
- No `tsc`, `tsconfig`, or `typescript` dependency appears anywhere in the hatched
  build path (D5).
- The bound producer's output is asserted in the **running browser app** — a real-path
  test in the spirit of ADR-252's byte-identical parity test, not a unit test of the
  generated entry's text (rule 13a).
- `profile: 'pure-ir'` still refuses a hatch-bearing story before binding (D4),
  asserted by test.
- The bind check runs against unminified Node-loadable copies built from the same
  source as the shipped bundle, and a `chord.*` namespace violation in a hatch fails
  the build (D5).
- CLI (`sharpee test`/`play`) and browser agree: the same hatched story produces the
  same text through both hosts, despite resolving the hatch differently (D6).
- After the D8 split: friendly-zoo's 7 transcript files pass, the CLI resolves its
  hatch from beside the `.story`, the TypeScript tutorial still builds in its own
  directory, and **nothing was deleted**.

## Consequences

- **The `.story` promise narrows honestly.** ADR-252 D2's "no `package.json`, no
  `node_modules`" holds for pure stories. A hatched story ships author TypeScript, and
  D5 keeps that promise intact — no `tsc`, no `tsconfig` — at the cost of not
  typechecking hatch bodies. This should be stated in author docs rather than
  discovered.
- **ADR-258's premise is restored.** The IDE can build and play every `.story` it can
  edit, with no degraded surface for hatched stories and no carve-out in its swap
  table.
- **The playground stays safe.** D4 keeps `pure-ir` refusing hatches, so a host that
  must not execute author code is unaffected by this ADR.
- **Bundles now differ in kind, not just content** (D3): a hatched bundle carries
  author-written executable code. Any tooling that hosts, reviews, or redistributes
  bundles — the playground above all, which `pure-ir` already protects (D4) — must
  treat that as a distinct category rather than assuming every bundle is inert story
  data.
- **The build gains a second esbuild pass** (D5) — CJS copies for the bind check
  alongside the browser bundle. Modest build-time cost, paid only by hatched stories,
  in exchange for a shipped-artifact guarantee.
- **The last unbuildable story becomes buildable** (D8). friendly-zoo is currently
  maintained by a `tsc` invocation no Sharpee command knows about; after the split its
  Chord half builds through the toolchain like any other story.
- **The CLI hatch gap stays open** (D6). This ADR closes the build gap for the
  *browser* only. `sharpee test`/`play` still expect hatch TypeScript compiled by some
  outside means — after D8's split, `chord-extras.js` beside the `.story`. Closing that
  too (transpile-on-demand in the CLI, the option declined in Q-2) is separate work and
  is the obvious follow-up.
- **The repo gains a second stories directory** (D8) whose only purpose is the v17
  TypeScript tutorial. Worth revisiting once the Chord tutorial line is complete, but
  not by deleting it here.

## Session

Session 341218 (2026-07-23, branch main). Surfaced while reviewing ADR-258: David
noted hatches must remain available in the IDE, which exposed that the IDE's build
command rejects them. Tracing that led to the larger finding — the hatch *runtime* is
complete and green while the hatch *build* was never written, and the only hatched
story in the repo compiles its hatch through a `tsc` invocation outside the Sharpee
toolchain entirely. David's ruling: hatched stories must still deploy to the browser,
with the build taking the full compile route rather than the IR-only path. An earlier
statement in that discussion — that a hatched story hits the `.story`/`src/index.ts`
exclusion first — was imprecise and is corrected in Context: only friendly-zoo does,
because it is also a legacy TypeScript story.

Q-1–Q-3 were resolved by interview in the same session, and each shrank the ADR:

- **Q-1** (typecheck vs transpile) **dissolved** rather than trading off. The loader
  already enforces the hatch contract at bind time with better diagnostics than `tsc`
  would give (`loader.ts:305–330`); the real defect was only *when* it fires. Moving
  that bind into the build (D5) needs no `tsc`, no `tsconfig`, and no `typescript`
  dependency, so ADR-252 D2's promise survives for hatched stories. David asked that
  the TypeScript 7.0/7.1 findings be **recorded, not acted on** — TS 7 is deferred
  repo-wide because `tsf` needs the 7.1 API — so they sit in D5 as a toolchain note.
- **Q-2** was half-decided by fact: `build-browser.ts:156` tests for `src/index.ts`
  specifically, so hatch modules never trip ADR-252 D1 and no amendment was needed
  (D7). Only the resolver question was a real choice (D6).
- **Q-3** revealed `src/index.ts` to be a live multi-file TypeScript tutorial, not
  dead weight. David chose to split the directory so both stories survive (D8) —
  nothing deleted, and friendly-zoo becomes the acceptance vehicle this ADR otherwise
  lacked.

`adr-review` then scored the result **11/14 — NEEDS WORK**, with three blockers, none
of which was visible from reading the ADR for coherence — each came from checking a
claim against source:

1. **D2's generated import would not have resolved.** The entry is written to
   `dist/.browser-entry/<storyId>/` (`browser-core.ts:500`), not beside the `.story`,
   so the illustrated `'./chord-extras.ts'` specifier would fail. D2 now separates the
   *import specifier* (resolved from the scratch dir) from the *map key* (verbatim
   `modulePath`, what `loader.ts:282` keys on).
2. **D5's bind check had an unstated step.** Node cannot `require` the author's
   TypeScript, and `requireHatchModule` wants pre-compiled JS — the dependency D5
   removes. D5 now specifies a second esbuild pass producing Node-loadable CJS copies
   from the same source as the shipped bundle.
3. **D3 rested on a false premise.** "Pure bundles are story-agnostic" is untrue —
   `generateEntry` interpolates title, theme, and storage prefix into *every* per-story
   entry; the story-agnostic artifact is the separate playground build. D3 is rewritten
   around the distinction that actually holds: a hatched bundle contains author-written
   executable code, which is what `pure-ir` and the playground care about.

All three left the decisions intact and only stated them accurately.
