# Phase 3 (ADR-252) — Implementation Design

> `.story` as a first-class browser build input; one shared build core.
> Researched session 448562 (2026-07-22); to implement next session. This is a
> build-infrastructure refactor: high blast radius (changes how every story
> builds for the browser), verified only by running real browser builds.

## Grounding (verified this session)

Two copy-drifted browser builds exist and must collapse to one (D5):
- **devkit author build** — `packages/devkit/src/standalone/build-browser.ts` (453 lines). `getProjectInfo()` reads `package.json`/`src/index.ts` (→ `process.exit(1)` for a bare `.story`, the bug). Resolves platform-browser via `require.resolve('@sharpee/platform-browser', {paths:[projectDir]})`; templates via `TEMPLATES_DIR` relative to devkit dist; esbuild resolves `@sharpee/*` from the project's `node_modules` (no alias).
- **repokit in-repo build** — `tools/repokit/src/commands/browser.ts` (258 lines). `readThemes()` tolerates a missing `package.json` (`return []`). Hard-codes in-repo paths: `packages/platform-browser/dist/index.js` (esbuild `--alias`), `templates/browser`, `packages/platform-browser/styles`. Also mirrors output into `website/public/web/<story>/`.

The two share, nearly verbatim: `WiredTheme`, `BuiltinThemeEntry`, `resolveWiredThemes`, `copyWiredThemes`, `injectThemes`, `escapeHtml`, and the esbuild invocation. **This duplication is the rule-8b violation the ADR targets.**

## D5 — where the shared core lives

**Decision: the core lives in `@sharpee/devkit`; repokit imports and delegates to it.** (ADR-252 D5 + ADR-187: devkit is the author tool, repokit is the in-repo entry that delegates.) repokit already depends on the workspace; it calls the devkit core instead of reimplementing.

The two callers differ only in **resolution mode**. Factor that into a small injected resolver so the core owns all build *logic* and the caller owns *where things resolve*:

```ts
// new: packages/devkit/src/standalone/browser-core.ts
export interface BrowserBuildEnv {
  stylesDir: string;                 // platform-browser styles/ (engine CSS + themes/)
  templatesDir: string;              // templates/browser (index.html, entry template)
  esbuildAlias?: string;             // in-repo: platform-browser/dist/index.js; author: undefined
  esbuildCwd: string;                // author: projectDir; in-repo: repo root
  mirror?: (outDir: string) => void; // in-repo website/public mirror; author: undefined
}
export async function buildBrowser(storyDir: string, meta: BrowserMeta, env: BrowserBuildEnv, opts): Promise<void>
```

- **author env**: `stylesDir = resolveEngineStylesDir(projectDir)`, `templatesDir = devkit TEMPLATES_DIR`, no alias, `esbuildCwd = projectDir`, no mirror.
- **in-repo env**: `stylesDir = packages/platform-browser/styles`, `templatesDir = templates/browser`, `esbuildAlias = packages/platform-browser/dist/index.js`, `esbuildCwd = root`, `mirror = website/public/web/<id>`.

`resolveWiredThemes`/`copyWiredThemes`/`injectThemes`/`escapeHtml` move into the core once; both callers drop their copies.

## D1 — `.story` dispatch

`sharpee build <target>`:
- `target` ends in `.story` → **Chord path** (this ADR).
- `target` is a directory → detect kind via `findStoryFile(dir)` (already used) + `existsSync(src/index.ts)`:
  - `.story` present, no `src/index.ts` → Chord path.
  - `src/index.ts` present, no `.story` → **TS path (existing, unchanged)**.
  - **both** → build-time error (hybrid, D1 rejection case).
  - neither → the existing "not a Sharpee project" error.
- **No `--browser`/`--platform-*` flag on the Chord path.** Browser is the default client; `client:` header selects otherwise. Today only `browser` is producible → any other `client:` value is a clear error naming the field (D1/rejection).

## D2 — metadata from the IR

On the Chord path, after the compile gate, derive `BrowserMeta` from `result.ir.meta` — **not** `package.json`:

| field | IR source |
|---|---|
| storyId | `meta.fields.id` |
| storyTitle | `meta.title` |
| author | `meta.author` |
| version | `meta.fields.version` |
| blurb | `meta.fields.blurb` |

`getProjectInfo`'s package.json/src/index.ts reads are removed from the Chord path only (TS path keeps them). Output dir is `dist/web/<meta.fields.id>/` (D1) — note repokit currently keys the dir on the *story name* arg; unify to the IR id (same for fernhill: `fernhill`).

## D3 — client config from header fields

Read from `meta.fields` (already populated — `parser.ts:482-486` captures any `key:` header line; **no grammar/IR change**):

| field | meaning | default |
|---|---|---|
| `client` | client target | `browser` |
| `theme` | theme *package* (ADR-188) | none (classic only) |
| `template` | template/layout *package* (ADR-253) | none (default layout) |
| `themes` | comma-split menu ids | `[]` |
| `default-theme` | boot theme | declared `theme:`, else `classic` |
| `storage-prefix` | storage key prefix | `meta.fields.id` |

`themes` split on commas + trim. This retires `package.json` `sharpee.themes` + `readThemes` for the Chord path.

**Unrecognized-key warning (D3 rejection case).** Maintain `KNOWN_HEADER_KEYS = {id, version, blurb, client, theme, template, themes, default-theme, storage-prefix}` (extend with any legit story-meta keys found in fernhill/friendly-zoo headers — audit before finalizing). Any `meta.fields` key outside the set → `warn("unrecognized header field 'X' — ignored")`, so `tempate:` is visible, not dropped.

## D4 — generated entry, hand-written escape hatch

- If `src/browser-entry.ts` exists → **use it** (fernhill's `clock`-renderer entry stays; escape hatch).
- Else → generate the entry from a devkit template parameterized by `BrowserMeta` + client config (fetch `story.story` → `compile` → `createStory` → `BrowserClient({storyInfo from IR, storagePrefix, themes, defaultTheme})` → wire engine), write to a build-scratch path, bundle that.
- **fernhill keeps its hand-written entry this phase** (retired in Phase 4/ADR-253), so the generated-entry template is exercised by a *scaffold-shape* story fixture, not fernhill.

## D3-amendment — template validation (mostly forward-looking)

When `template:` is declared: resolve the template package, read its declared required-channel ids, cross-check against the story's `define channel` set (`result.ir.channels`). Error on required-but-missing (name it); warn on story-channel-not-placed. **Template packages (ADR-253 D3) do not exist yet** → guard this so it is a no-op until a `template:` names a resolvable package. Do NOT block Phase 3 on ADR-253.

## Migration sweep

Remove `--browser`/`--platform-*` from the **Chord** build path only:
- `packages/devkit/src/cli.ts` — build dispatch + USAGE.
- devkit `init.ts` hint (if it suggests `--browser`).
- `CLAUDE.md` `--browser` examples that refer to the author/`.story` path.
- **Out of scope**: `./repokit build dungeo --browser` (TS/package kind, distinct path) — untouched.

## Testing

**Unit (fast):**
- metadata-from-IR maps each field correctly.
- header-field parsing + every default (omitted client/theme/themes/default-theme/storage-prefix).
- hybrid-project error; unknown-`client:` error; unrecognized-key warning; uncompilable-`.story` fails before emit (diagnostics surfaced).

**REAL-PATH (Integration Reality — the acceptance gate):**
- `sharpee build stories/fernhill/fernhill.story` → `dist/web/fernhill/` with non-empty `game.js`, `index.html`, engine CSS; **no `package.json`, no `src/index.ts`** in the dir.
- `./repokit build --browser` (fernhill) → same output **modulo build stamp** (version/BUILD_DATE). Diff the two trees; assert identical except the stamp.
- fernhill transcripts stay green (runtime path unchanged by the build refactor).

## Risks / gotchas

- fernhill has **no `package.json`** today; repokit's `readThemes` returned `[]`, so it currently ships no themes. After D3, themes come from `fernhill.story` header fields — **audit `fernhill.story`'s header** first; if it declares none, themes stay `[]` (classic only) and output is unchanged, which makes the identical-modulo-stamp AC clean.
- fernhill's entry imports `./version` (stampVersion) + the `clock` renderer — keep the stamp + entry-detection working.
- Output-dir key changes from *story-name* to *IR id* in the in-repo path — same for fernhill, but confirm no other in-repo consumer hard-codes `dist/web/<name>`.
- esbuild `--alias` (in-repo) vs project-`node_modules` resolution (author) is the one genuine behavioral fork — the `env.esbuildAlias` seam must be threaded through the single esbuild invocation.

## Suggested implementation order (keep the build green at each step)

1. Extract the shared helpers (`WiredTheme` et al.) into `browser-core.ts`; have BOTH callers import them (no behavior change) — verify `./repokit build --browser` fernhill still builds.
2. Add the `.story` metadata reader (IR → BrowserMeta) + header-field config, unit-tested, unused by callers yet.
3. Route the devkit author path through the core with the author env + `.story` dispatch (D1/D2/D3); verify `sharpee build fernhill.story` builds.
4. Route repokit through the core with the in-repo env; delete its duplicated helpers; verify identical-modulo-stamp.
5. Flag-removal sweep + rejection tests + generated-entry template (scaffold fixture).
6. Full verify: both builds, fernhill transcripts, unit suites.
