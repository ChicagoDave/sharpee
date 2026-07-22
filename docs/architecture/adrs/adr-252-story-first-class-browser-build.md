# ADR-252: `.story` as a first-class browser build input

## Status: ACCEPTED (2026-07-22 — all decisions ruled by David directly, session 74219a. Shape: a bare `.story` builds to a browser app with no flag and no `package.json`; all metadata from the compiled Story IR; client config as `story`-header `key:` lines; one build core across devkit + repokit; generated browser entry with a hand-written escape hatch retired by ADR-253. Open-questions interview complete (same session): no build flag / browser default / `client:` field for non-default clients; TS and `.story` are distinct mutually-exclusive project kinds; omitted `default-theme` → `classic` always. No Open Questions remain. adr-review same session: 12/15 clean → four minor edits folded before the flip (D3 grammar hedge resolved to confirmed no-change + unknown-key warning; rejection-cases list added; byte-equivalent AC softened to identical-modulo-build-stamp; `--browser` migration surface enumerated). **Amended 2026-07-22 (same session):** D3 gains `theme:` and `template:` header fields — Chord-native declaration of the theme and template/layout *packages*, reconciling pre-Chord ADR-188 (which declared them via `package.json`) into the package.json-free `.story` world; the build validates a declared `template:` against the story's channels (error on a channel the template requires but the story lacks; warn on a story channel the template does not place); `default-theme:` now defaults to a declared `theme:` before `classic`. Not implemented.)

## Date: 2026-07-22

## Parent: ADR-210 (Chord `.story` author language; interpreter-primary, IR-centric — the compiled Story IR is the single product of a `.story`). Honors ADR-187 (devkit = author tool, repokit = in-repo platform build), ADR-188 (platform-browser owns the engine CSS + built-in themes), ADR-180 (the `sharpee` author CLI). Child: ADR-253 (declarative channel renderers — retires the last hand-written `browser-entry.ts`).

## Context

A Chord author writes a single `.story` file. The `.story` header already
declares everything an app needs to identify itself — grounded against
`stories/fernhill/fernhill.story` and `packages/chord/src/ir.ts` (2026-07-22):

```
story "The Folly at Fernhill" by "The Sharpee Project"
  id: fernhill
  version: 0.1.0
  blurb: One winter night to find the deed that keeps Fernhill in the family.
```

The compiler emits this into `IRMeta { title, author, fields: { id,
version, blurb, ... } }` (`ir.ts:71`). The compiled Story IR is, by ADR-210,
the single product of a `.story` — everything the header declares is already
in hand after `compile()`.

Yet the browser build ignores all of it. The state of the two build paths
(verified against source, 2026-07-22):

1. **The author tool cannot build a Chord story at all.**
   `devkit/standalone/build-browser.ts` calls `getProjectInfo()`
   (line 240), which reads `package.json` or falls back to a TypeScript
   `src/index.ts`. `stories/fernhill/` has **neither** — so the author path
   hits `process.exit(1)`. A `.story` is a first-class citizen of the
   interpreter but a non-citizen of the build.

2. **fernhill's "--browser build clean" only ever ran through a second,
   divergent implementation.** `tools/repokit/src/commands/browser.ts` is a
   copy-drifted sibling of the devkit build. The two already disagree on the
   `package.json` question: devkit hard-requires it, repokit's `readThemes`
   tolerates its absence (`return []`). This is exactly the duplicated build
   core rule 8b (co-located wire-type sharing) exists to prevent.

3. **Metadata is sourced from the wrong place.** Title/id/version/themes come
   from `package.json` (`sharpee.themes`, `pkg.name`, `pkg.description`) or a
   TS `src/index.ts` — both TypeScript-story assumptions. The `.story` header,
   the true source of truth, is never read.

4. **The browser entry is ~150 lines of boilerplate.** `browser-entry.ts`
   (fetch → `compile` → `createStory` → wire `BrowserClient` + engine) is
   identical for any Chord story save exactly one story-specific line:
   fernhill's `clock` channel renderer. Every author would copy this wall.

**A bare `.story` file should be a complete, sufficient browser build input.**
No `package.json`. No `src/index.ts`. No project scaffold. This ADR makes that
true; ADR-253 removes the last reason to hand-write TypeScript at all.

## Decision

### D1 — `.story` is a first-class build target: `sharpee build <file>.story` (browser by default)

`sharpee build` accepts a bare `.story` **file path** as its target, alongside
the existing project-dir and registered-name forms. Given a `.story`, the build
requires no `package.json`, no `src/index.ts`, and no surrounding project
scaffold. **There is no `--browser`/`--platform-*` flag** — the browser is the
default client, so `sharpee build foo.story` emits the self-contained web app
into `dist/web/<id>/`, where `<id>` is the story id from the IR
(`meta.fields.id`). A story that wants a **different** client declares it in the
`.story` (the `client:` header field, D3); the build produces whatever the story
declares, defaulting to browser when the field is absent. The build path is:
compile the `.story` → read the Story IR → generate entry + HTML from templates
→ bundle → emit.

**A Chord `.story` project and a TypeScript project are distinct, mutually
exclusive project kinds — both supported, never together.** The build
dispatches on kind: a `.story` present → the Chord path of this ADR
(IR-derived metadata, no `package.json`); a TS project (`package.json` +
`src/index.ts`, no `.story`) → the existing TS build path unchanged. A single
project never carries both; a directory holding a `.story` *and* a
`src/index.ts` is a build-time error, not a merged story.

### D2 — All browser-app metadata is derived from the compiled Story IR, never from `package.json`

The build reads identity from `IRMeta`, not from `package.json` or
`src/index.ts`:

| App field        | IR source                    |
| ---------------- | ---------------------------- |
| title            | `meta.title`                 |
| story id / slug  | `meta.fields.id`             |
| version          | `meta.fields.version`        |
| author(s)        | `meta.author`                |
| blurb / desc     | `meta.fields.blurb`          |

The HTML template tokens (`{{STORY_ID}}`, `{{STORY_TITLE}}`, …) are filled
from these. `getProjectInfo`'s `package.json` / `src/index.ts` reads are
removed from the `.story` build path entirely.

### D3 — Client config is `story`-header `key:` lines

The **client target** and its configuration — which client, plus themes,
default theme, storage prefix — are carried by **header `key:` lines inside the
`story` block**, beside `id:`, `version:`, and `blurb:`. No new block keyword;
the config travels with the story as the single source of truth, in the place
identity already lives:

```
story "The Folly at Fernhill" by "The Sharpee Project"
  id: fernhill
  version: 0.1.0
  blurb: One winter night to find the deed that keeps Fernhill in the family.
  client: browser        # default; omittable
  theme: parchment       # the theme PACKAGE the story uses (ADR-188)
  template: estate-layout # the template/layout PACKAGE (named elements, ADR-253)
  themes: parchment, paper
  default-theme: parchment
  storage-prefix: fernhill
```

`client:` names the client (D1 defaults it to `browser` when absent);
`theme`/`template`/`themes`/`default-theme`/`storage-prefix` are the browser
client's config and apply when `client` is `browser`. These parse through the
existing story-header-field production and land in `IRMeta.fields` (`ir.ts:75`),
exactly as `id`/`version`/`blurb` do today — so **no new IR schema is required**.
The build reads them straight from `meta.fields`: `themes` split on commas, the
rest as-is. This retires `package.json`'s `sharpee.themes` and the `readThemes`
helper for the Chord path.

**Theme and template PACKAGE declaration (amendment, 2026-07-22).** ADR-188
(themes-as-plugins) predates Chord: it declares a story's theme/template
*packages* through `package.json` (a dependency + `sharpee.themes`). A `.story`
project has no `package.json`, so it declares them as header fields instead:
- `theme:` — the theme package the story uses (`@sharpee/theme-<name>`, named by
  id, e.g. `parchment`) — CSS/tokens.
- `template:` — the template/layout package the story uses — the ADR-253 D3
  package that contributes the named elements channels render into.

These are the Chord-native replacement for ADR-188's `package.json`-based
declaration; the build resolves each named package the same way ADR-188's build
resolves `sharpee.themes`. `themes:`/`default-theme:` are unchanged — the
in-client theme **menu** (selectable ids) and the **boot** default; the story's
own `theme:` is implicitly among the selectable themes.

**No grammar or IR change is required — confirmed against source.**
`parser.ts:482-486` captures *any* `key: value` line in the story header into
`fields[key]` (value = the raw text after the colon, trimmed). So `client:`,
`themes:`, `default-theme:`, and `storage-prefix:` already parse today and land
in `IRMeta.fields`; `themes: modern-dark, paper` arrives as the string
`"modern-dark, paper"` for the build to comma-split. Because the parser accepts
*any* key, an unrecognized field is silently kept and ignored — so **the build
validates the known client keys and emits a warning on an unrecognized one**
(e.g. a `tempate:` misspelling of `template:`), rather than letting it vanish.

**Defaults when a field is omitted:**
- `client:` → `browser` (D1).
- `default-theme:` → the story's `theme:` package when one is declared,
  otherwise the engine's `classic` theme. (Amends the original rule: with a
  `theme:` present, that theme should boot rather than being ignored in favor of
  `classic`; only a story that declares no theme falls to `classic`.) A story
  that wants to boot a *different* selectable theme names it explicitly
  (`default-theme: paper`). `classic` is always present, so the no-theme
  fallback is always valid.
- `theme:` / `template:` → none pulled in; the client uses its built-in default
  layout + `classic`.
- `storage-prefix:` → the story id (`meta.fields.id`).
- **No client config at all**: a bare `.story` with none of these fields still
  builds — no theme/template package, `classic` only, booting `classic`, the
  default layout, storage keyed by the story id.

**Template validation (build-time).** When a `template:` package is declared,
the build **cross-checks the template against the story's channels** — the
channel-id ↔ element-name convention (ADR-253 D2) verified ahead of runtime.
A template package declares the channels it renders (the named elements it
provides); the build then:
- **errors** if the template requires a channel the story does not define —
  naming the missing channel, so a template built for a different story fails
  loudly rather than rendering blanks;
- **warns** for a story channel the template does not place — it will fall to
  the generic panel at runtime (D4), which is valid but may be unintended.

This needs no new Chord syntax: "required channels" are the ones the template
package itself names, checked against the story's `define channel` set. A
template/story mismatch is caught at build time, not discovered at play time.

### D4 — The browser entry is generated from a template; a hand-written `src/browser-entry.ts` is an opt-in escape hatch (retired by ADR-253)

The boilerplate entry (fetch shipped `.story` source → `compile` → `createStory`
→ construct `BrowserClient` with `storyInfo` from the IR → wire the engine) is a
devkit template the build instantiates, parameterized by D2 metadata and the D3
`client` config. The **only** reason fernhill hand-writes its entry today is its
story-specific `clock` channel renderer — deferred to ADR-253. Until ADR-253
lands, if a project ships its own `src/browser-entry.ts` it wins (the current
fernhill shape is preserved, not broken).

### D5 — One build core; devkit and repokit both call it

The divergent `devkit/standalone/build-browser.ts` and
`tools/repokit/src/commands/browser.ts` collapse to a single build core (rule
8b). repokit's in-repo fernhill build and devkit's author build call the same
implementation, so the `package.json`-required-vs-tolerated drift cannot recur.
repokit stays the in-repo entry (ADR-187); it delegates the browser build to the
shared core rather than reimplementing it.

## Acceptance

**Worked example.** A bare `fernhill.story` carrying its client config as
header fields (D3), with **no `package.json` and no `src/index.ts`** in the
directory:

```
sharpee build stories/fernhill/fernhill.story
```

→ produces `dist/web/fernhill/` — a self-contained single-player web app (the
default client, no flag) whose title, id, version, author, and blurb all come
from the story header, whose themes come from the story's header fields, and
whose entry the build generated. Opening it compiles the shipped `.story` at
boot (ADR-210) and plays.

**Done when:**
- `sharpee build <file>.story` builds fernhill to a browser app with no
  `package.json`, no `src/index.ts`, and no build flag.
- No app metadata is read from `package.json` on the `.story` path — title,
  id, version, author, blurb, and themes all trace to the IR.
- devkit and repokit browser builds are one core (D5); fernhill's in-repo
  build and the author-tool build produce **identical output modulo the build
  stamp** (version, `BUILD_DATE`) for the same input.
- fernhill still plays end-to-end (its transcripts remain green; its `clock`
  renderer still works via the D4 escape hatch until ADR-253).

**Rejection cases** (each a rejection test):
- **Hybrid project** — a directory holding both a `.story` and a `src/index.ts`
  is a build-time error (D1), not a merged story.
- **Unknown client** — `client:` naming a client the build cannot produce is a
  clear error naming the field, not a silent fallback to browser.
- **Unrecognized client key** — an unknown header key in the client-config set
  (e.g. `theme:` for `themes:`) builds but emits a warning (D3), so the typo is
  visible rather than dropped.
- **Uncompilable `.story`** — a `.story` whose `compile()` returns error
  diagnostics fails the build with those diagnostics, before any emit.

## Consequences

- **A Chord author needs exactly one file to ship a browser game.** The
  `.story` is the whole project. This is the parity end state: no TypeScript,
  no `package.json`, no scaffold.
- **`sharpee.themes` and the `getProjectInfo` `package.json`/`src/index.ts`
  reads are retired for the Chord path.** The TS project kind keeps them; only
  the `.story` kind goes config-file-free. The two kinds are mutually exclusive
  (D1), so there is no ambiguity about which reader runs.
- **The two browser builds stop drifting** because they become one (D5). The
  bug where the author tool cannot build fernhill is fixed as a side effect.
- **fernhill keeps its hand-written entry** only for the `clock` renderer, and
  only until ADR-253; nothing about fernhill breaks in the interim.
- **The new client config reuses the story-header-field seam** (D3) rather
  than adding a block or an IR type: three more `key:` lines landing in
  `IRMeta.fields`. The only possible grammar touch is widening a header-field
  key whitelist, if one exists — no IR schema bump.
- **New Chord authors get a template entry**, so the ~150-line boilerplate is
  never copied. The template lives in devkit and is versioned with the build.
- **ADR-188's package model is reconciled into Chord** (amendment). A `.story`
  declares its theme and template/layout packages as `theme:`/`template:` header
  fields instead of `package.json` — the pre-Chord ADR never had to make this
  bridge because it predates the package.json-free `.story`. Build-time template
  validation (a declared `template:` cross-checked against the story's channels)
  turns a template/story mismatch into a build error, not a blank panel at play
  time.
- **The `--browser` flag removal has a migration surface to sweep** (on the
  `.story` path only). Live call sites: `CLAUDE.md` build examples, devkit's
  `sharpee build --browser` / `build-browser` command wiring, and reference
  docs. Historical session summaries under `docs/context/` are records, not
  callers — left as-is. **Out of scope:** `./repokit build dungeo --browser` is
  the **TS/package** project kind (D1), a distinct path; this ADR does not
  change its flag. Whether the TS path also drops the flag is a separate call.

## Session

Session 74219a (2026-07-22, branch chord-foundations). Direction and the two
shaping decisions (D3 client-block location; renderers-in-Chord → ADR-253) ruled
by David directly. Grounded against `stories/fernhill/fernhill.story`,
`packages/chord/src/ir.ts`, `packages/devkit/src/standalone/build-browser.ts`,
and `tools/repokit/src/commands/browser.ts`. All four open questions resolved by
David directly in the same session's interview (client config = story-header
`key:` lines; no build flag, browser default, non-default client declared via
`client:`; TS and `.story` are distinct mutually-exclusive project kinds;
omitted `default-theme` → `classic` always).
