# ADR-178: Story Runtime Baseline — Platform-Declared Peer Set

## Status: ACCEPTED

## Date: 2026-05-13 (accepted 2026-05-13)

## Context

Zifmia (ADR-177) ships as a self-contained Docker image. Operators
drop `.sharpee` story bundles into the image's `/stories` volume and
the engine loads them per-turn. The image is the runtime; stories are
opaque content.

This works until the bundle dynamically imports a package the image
doesn't ship. The failure surfaced concretely during ADR-177 Phase 8
Docker validation on 2026-05-13: dungeo's `.sharpee` bundle imported
`@sharpee/plugin-scheduler`, `@sharpee/plugin-npc`,
`@sharpee/plugin-state-machine`, `@sharpee/event-processor`,
`@sharpee/queries`, and `lz-string`. None were declared in
`tools/zifmia/package.json`, so `pnpm deploy --prod` excluded them
and the engine threw `ERR_MODULE_NOT_FOUND` on the first command.

The patch landed in the same session: those packages were added to
zifmia's `package.json` dependencies. That makes dungeo run today
but is **not** a durable answer:

- The list is dungeo's transitive plugin set, copy-pasted. Any other
  story may need a different set.
- A story author has no specification telling them which packages
  they may import.
- A Zifmia operator has no way to know whether a given `.sharpee`
  file will run before dropping it in.
- There's no validation step that catches drift between what stories
  use and what the image ships.

Two architectural answers exist.

### Option A — stories bundle their deps

Each `.sharpee` bundle inlines its entire `@sharpee/*` dependency
graph. Zifmia ships only the core engine; everything else rides in
the bundle.

- **Pros:** authors free to use any package; one self-contained file.
- **Cons:**
  - Bundles balloon — a typical story would carry tens of MB of
    duplicated platform code.
  - Two stories on the same Zifmia could ship two different
    `@sharpee/stdlib` versions, with no way for the platform to
    notice or enforce consistency.
  - Patches to platform packages require every story author to
    rebuild; operators can't hot-patch a vulnerability centrally.
  - Story-bundled code may carry security-relevant logic that the
    platform can't audit or override.

### Option B — platform declares a Story Runtime Baseline

The Sharpee platform declares a versioned, explicit list of packages
every Zifmia instance ships. Stories may import only from that list.
Bundles that reference anything outside it fail to build (or fail to
load).

- **Pros:**
  - One source of truth for the story↔platform contract.
  - Stories stay small — they're content, not runtimes.
  - Operators patch the image; every story on it gets the patch
    instantly.
  - Authors know exactly what surface they may use.
- **Cons:**
  - The baseline locks stories to a specific platform version.
    Bumping it is a coordinated event.
  - New plugins must be **promoted to baseline status** before any
    story may use them.
  - The image ships every package on the baseline whether a given
    story uses it or not.

## Decision

**Adopt Option B.** The Sharpee platform declares a versioned **Story
Runtime Baseline** that names every package a `.sharpee` bundle may
import. Bumping the baseline is an ADR-amendment to this one.

### v1 baseline

Three groups, all shipped together by every Zifmia image.

**Core platform (always present, never optional):**

- `@sharpee/core`
- `@sharpee/engine`
- `@sharpee/event-processor`
- `@sharpee/if-domain`
- `@sharpee/if-services`
- `@sharpee/lang-en-us`
- `@sharpee/media`
- `@sharpee/parser-en-us`
- `@sharpee/platform-browser`
- `@sharpee/queries`
- `@sharpee/stdlib`
- `@sharpee/text-blocks`
- `@sharpee/world-model`

**Plugins (story-opt-in but always shipped):**

- `@sharpee/plugin-npc`
- `@sharpee/plugin-scheduler`
- `@sharpee/plugin-state-machine`

**Third-party (vendored at baseline because stories rely on it):**

- `lz-string`

### Single source of truth: `@sharpee/story-runtime-baseline`

The baseline is published as a manifest package. Its `package.json`
declares every package in the list above as a `dependencies` entry
pinned to the workspace's current version. Both the Zifmia Dockerfile
and the story build pipeline depend on this manifest — so the list
exists in exactly one place and drift is mechanically prevented.

The manifest package exports a single constant:

```ts
export const STORY_RUNTIME_BASELINE: ReadonlyArray<string> = [
  '@sharpee/core',
  '@sharpee/engine',
  // ...
];
export const BASELINE_VERSION = 1;
```

### Enforcement

**Build-time (story author):** the `.sharpee` build process
imports `STORY_RUNTIME_BASELINE`, walks the bundled module graph,
and fails if any external module reference is not in the list. The
error message names the offending import and the file it came from.

The validation runs as a **post-bundle step** in the story build
pipeline (`scripts/bundle-entry.js` or successor), not as an esbuild
plugin. The step reads the produced bundle's module-resolution
metadata, intersects it with `STORY_RUNTIME_BASELINE`, and exits
non-zero on any non-baseline reference. esbuild stays free of
business logic; the validator owns the contract.

**Boot-time (Zifmia operator):** the existing `StoryHealth.validate()`
hook (ADR-177 §7) already does a one-shot engine instantiation. It
catches `ERR_MODULE_NOT_FOUND` and surfaces the offending package
name in `GET /api/stories/:slug/health` (currently planned, not yet
wired). A story that fails health does not appear in the public
story list.

**Lifecycle:** every Zifmia release records its baseline version in
the image label `org.sharpee.story-runtime-baseline=<n>`. The web
client's `/api/stories` response includes the version so authors and
operators can audit at a glance.

## Invariants

1. The **story-facing baseline** is declared in exactly one package
   (`@sharpee/story-runtime-baseline`). Zifmia depends on that
   package to guarantee every baseline entry is installed; this
   dependency is the contract that stories may rely on. Zifmia's
   own direct deps on packages it imports from its server source
   are a separate concern and may overlap with baseline entries —
   the baseline manifest is the source of truth for *which packages
   stories may use*, not for *zifmia's own declared imports*. Drift
   between the manifest and what Zifmia ships is a packaging bug,
   not a story-author concern.
2. Stories may **only** import from packages in the current
   baseline. No exceptions. A story that needs something new must
   wait for a baseline bump.
3. Baseline bumps **only add**. A baseline never removes a package
   without a major-version bump and a deprecation window (TBD by
   the ADR amendment that does it).
4. Third-party packages on the baseline are minimal and audited.
   `lz-string` is the v1 exception, included because it's load-bearing
   for save-file compression. Future additions need ADR-level
   justification — "I want X" is not sufficient.
5. There is **one baseline per Zifmia instance**. Multi-version
   coexistence (some rooms on baseline v2, others on v1) is out of
   scope.

## Acceptance Criteria

- **AC-1: manifest exists.** `packages/story-runtime-baseline/`
  exists with a `package.json` whose `dependencies` list is exactly
  the v1 baseline above, plus an exported `STORY_RUNTIME_BASELINE`
  constant and `BASELINE_VERSION = 1`.
- **AC-2: Zifmia ships the baseline via the manifest.** Zifmia's
  `package.json` depends on `@sharpee/story-runtime-baseline` to pull
  in the full baseline transitively. Zifmia MAY additionally declare
  direct dependencies on packages it imports from its own server
  source (`@sharpee/core`, `@sharpee/engine`, `@sharpee/stdlib`,
  etc.); these are not duplicates of the baseline declaration but a
  separate direct-import contract. Zifmia MUST NOT directly declare
  story-only packages (e.g., `@sharpee/plugin-*`) — those flow
  exclusively through the manifest. The Docker image has every
  baseline package resolvable from `node_modules`.
- **AC-3: image label.** Every Zifmia image carries the
  `org.sharpee.story-runtime-baseline=<n>` label.
- **AC-4: API surface.** `GET /api/stories` includes a top-level
  `baseline_version: number` field. Per-story rows do NOT include it
  (it's a server-wide constant).
- **AC-5: build-time validation.** The story build (`build.sh -s
  <story>`) fails with a clear error if any module reference in the
  resulting `.sharpee` bundle is not in the baseline. The error names
  the import and the source file.
- **AC-6: boot-time validation.** A `.sharpee` bundle that imports a
  non-baseline package fails its `StoryHealth.validate()` step at
  Zifmia boot with a clear, actionable error in the logs and is
  excluded from `GET /api/stories`. This requires extending
  `StoryHealthReport` in `tools/zifmia/src/engine/story-health.ts`
  with structured failure fields — `reason` becomes a discriminated
  union over known failure kinds (`'missing_package'`,
  `'manifest_emission_failed'`, `'unknown'` as fallback) with
  per-kind extra fields (e.g., `package: string` when
  `reason === 'missing_package'`). The extension is additive —
  existing report consumers keep working; the boot log and any
  future `/health` endpoint can present the offending package name
  without parsing free-text error strings.
  ([ADR-177] §7 names `StoryHealth` as the validation point;
  ADR-178 extends its report contract to surface the kind/data the
  baseline check needs.)
- **AC-7: amendment process.** Adding or removing a package from the
  baseline is an amendment to this ADR. The amendment names the
  package, the reason, and the new `BASELINE_VERSION`.

[ADR-177]: ./adr-177-multiuser-corrected.md

## Tests required for AC closure

- `packages/story-runtime-baseline/__tests__/exports.test.ts` —
  asserts `STORY_RUNTIME_BASELINE` is a frozen array, contains every
  package the manifest's `dependencies` lists (no drift between the
  TS constant and the package.json deps), and that `BASELINE_VERSION`
  is a positive integer.
- `scripts/__tests__/baseline-validation.test.ts` — given a bundle
  whose module-resolution metadata includes an out-of-baseline
  package, the validator exits non-zero with stderr naming the
  package and source file. Given a bundle that uses only baseline
  packages, the validator exits zero.
- `tools/zifmia/tests/story-health.test.ts` — given a `.sharpee` file
  that imports a non-installed package, `StoryHealth.validate()`
  returns `{ ok: false, reason: 'missing_package', package: '...' }`
  and the story is excluded from `GET /api/stories`.
- `tools/zifmia/tests/e2e/ac-baseline.spec.ts` — `GET /api/stories`
  includes `baseline_version: number` at the top level (REAL-PATH
  against a spawned `node dist/main.js`, mirroring the ADR-177
  Phase 8 e2e harness).

## Constrains Future Sessions

- Any new `@sharpee/*` package that stories should be able to import
  requires an ADR amendment to this one before it can ship in a
  baseline bump.
- New zifmia features that need a runtime dep on `@sharpee/*` should
  prefer making that dep part of zifmia's own surface, not the
  baseline. The baseline is what **stories** see; if zifmia itself
  needs a helper package, declare it on zifmia and not on the
  baseline.
- Story authors writing for "any Zifmia ≥ baseline N" gain a stable
  contract. Authors writing against unpublished baseline candidates
  ship at their own risk.

## Out of Scope

- **Operator-provided plugins.** An operator running their own Zifmia
  might want to load custom plugins not in the baseline. v1 says no —
  the baseline is the only surface. A later ADR can introduce
  operator-side extension if demand emerges, but the threat model
  there (untrusted code running in-process) is its own ADR.
- **Story-private packages.** A story might want a tiny custom helper
  package not on the baseline. v1 says no — either upstream the
  helper to a baseline package or inline its code into the story
  itself. The bundle's own source code is unconstrained; only its
  external module references are.
- **Multi-baseline coexistence.** One Zifmia, one baseline. Operators
  who need a story on a different baseline run a separate Zifmia
  instance with that image.
- **Versioning the baseline at finer granularity than package level.**
  The baseline pins which packages may be imported; it does not pin
  exact versions story-side. The versions are whatever the Zifmia
  image happens to ship. Stories that need a specific version of
  `@sharpee/stdlib` need to publish their compatibility against a
  specific `BASELINE_VERSION`, not a specific package version.

## Prior Art

- **Node.js core-module list.** Node ships a fixed set of built-in
  modules (`fs`, `path`, `http`, ...) that user code may import.
  Adding to it is a deliberate platform event. The baseline applies
  the same idea to Sharpee's plugin surface.
- **WordPress plugin ecosystem (negative example).** WordPress lets
  any plugin ship arbitrary PHP code. The result is that no two
  WordPress installs are alike at runtime, security patches require
  per-plugin updates, and compatibility breaks unpredictably across
  versions. The baseline approach deliberately avoids this dynamic.
- **Browser web platform.** Browsers expose a fixed Web API surface
  per spec; pages can't load arbitrary native modules. Stories on
  Zifmia get the same shape: a known set of APIs to write against.

## Consequences

### Positive

- One source of truth for the story↔platform contract. Authors,
  operators, and the platform all reference the same manifest.
- Smaller `.sharpee` bundles (content only; no inlined plugin code).
- Operators patch the platform once; every story benefits.
- The list of baseline packages is auditable and ADR-tracked.

### Negative

- Story authors are locked to whatever the current baseline ships.
  Wanting a new plugin requires waiting for a baseline bump.
- The Zifmia image ships every baseline package even on operators
  who only run one story. v1 baseline is 17 packages (16 `@sharpee/*`
  plus `lz-string`); this is a few MB of image size and is acceptable.
- The baseline becomes a governance choke point. Adding a package
  requires platform-level review — by design — but that adds friction
  to plugin authoring.

### Migration from current state (2026-05-13)

- **Today:** `tools/zifmia/package.json` lists 16 `@sharpee/*` packages
  plus `lz-string`. Most are used by zifmia's own server source
  (`@sharpee/core`, `@sharpee/engine`, `@sharpee/if-domain`,
  `@sharpee/if-services`, `@sharpee/lang-en-us`, `@sharpee/media`,
  `@sharpee/parser-en-us`, `@sharpee/platform-browser`,
  `@sharpee/stdlib`, `@sharpee/text-blocks`, `@sharpee/world-model`);
  the remainder (`@sharpee/plugin-npc`, `@sharpee/plugin-scheduler`,
  `@sharpee/plugin-state-machine`, `@sharpee/event-processor`,
  `@sharpee/queries`, `lz-string`) are pulled in solely because
  dungeo's `.sharpee` bundle imports them at engine load.
- **After this ADR ships:** `packages/story-runtime-baseline/`
  becomes the source of truth. Zifmia keeps direct dependencies on
  the packages it imports in its own server source, and adds a
  dependency on `@sharpee/story-runtime-baseline` to pull in the
  story-only set transitively. Net effect: story-only deps move from
  zifmia's direct list to the manifest's; zifmia's own runtime deps
  stay where they belong (zifmia's own `package.json`).
- Existing stories that imported anything in the v1 baseline keep
  working unchanged. Any story that imported something outside the
  baseline (none known) would need to either drop the import or
  petition for a baseline bump.

## Open Questions

- **Manifest distribution to external authors.** Story authors
  working outside the monorepo need to install
  `@sharpee/story-runtime-baseline` for build-time validation to run.
  Resolution path TBD — npm publish, GitHub release artifact, or a
  vendored copy under `vendor/`. Pick one before story authoring
  opens to third parties; this ADR does not block on it but the
  AC-5 implementation must.
- **Semver vs. `BASELINE_VERSION` relationship.** Whether the
  package's npm-style semver and the integer `BASELINE_VERSION` move
  together or independently. Recommended: `BASELINE_VERSION` bumps
  whenever the entry list changes (add or remove); package semver
  follows normal rules (patch for bugfix, minor for new optional
  surface, major for breaking removal). The two coordinate at the
  contract level (a baseline-bump amendment publishes a new minor
  or major) but are not 1:1.
- **Image-label population mechanism.** AC-3 requires the
  `org.sharpee.story-runtime-baseline=<n>` label but does not say
  how it lands in the image. Candidates:
  (a) `LABEL` directive in `tools/zifmia/Dockerfile` hardcoded;
  (b) Docker build arg read from the manifest at image-build time;
  (c) build-step in `build.sh -c zifmia` that injects the label.
  Recommended: (b) — a single source of truth (the manifest) feeds
  both the runtime peer set and the label. Resolution lands in
  implementation.

## Session

ADR-178 emerged 2026-05-13 from the Phase 8 Docker validation pass on
ADR-177. The four-bug validation surfaced this as a follow-up worth
its own decision rather than continuing to patch zifmia's package.json
piecemeal. Per-ADR review on the same day flagged a migration-paragraph
correction, three open questions worth surfacing, and added a Tests
subsection with concrete test paths.
