# ADR-179: Zifmia — Published Container Image

## Status: PROPOSED

## Date: 2026-05-13 (PROPOSED), revised 2026-05-13 (4 blockers + 3 small findings from /adr-review)

## Context

ADR-177 specified Zifmia as a self-contained Docker container. ADR-178
made the Story Runtime Baseline a versioned contract that every image
records via the `org.sharpee.story-runtime-baseline` label. Both of
those treat the *image* as the unit of release — but neither says how
operators get the image.

Today (2026-05-13) the only documented install path is `git clone
sharpee && docker build -f tools/zifmia/Dockerfile .`. That's
acceptable for the maintainer's own deployments but bad for everyone
else:

- The full Sharpee monorepo (~hundreds of MB checked out, pnpm install
  pulls another large set) lands on every host that just wants to run
  the server. A VPS at 1 GB of disk wastes most of it on build inputs
  that vanish after the runtime image is produced.
- The first build is 3–8 minutes (compose Quick start) — a real wait
  for an operator who only wanted "I'd like to host an IF community
  for my friends."
- There's no canonical version operators can audit, depend on, or
  pin in a compose file. `:latest` from a registry pulls a known
  artifact; `git pull && docker build` pulls whatever `main`
  happens to look like the moment the operator types it.
- Story authors building against a specific `BASELINE_VERSION`
  (ADR-178) need a stable image to test against. "The build that
  came out of `main` on Tuesday" is not a stable target.
- Security: a published image gets a signed manifest, an SBOM, and
  an audit trail. A from-source build inherits the security posture
  of whatever pnpm + the host toolchain produces at build time.

Three publishing models exist for Docker images. The choice has
governance consequences (who decides what ships, when, and from
where).

### Option A — GitHub Container Registry (ghcr.io)

The repo lives on GitHub. GHCR is free for public repos, image
namespace matches the repo (`ghcr.io/chicagodave/zifmia`), and GitHub
Actions can build + push on a tag with no extra credentials.

- **Pros:** zero new accounts; tied to the source-of-truth git host;
  free egress for public images; supports image signing (cosign) and
  attestations.
- **Cons:** ghcr.io is a less-familiar registry than Docker Hub for
  the IF community; operators occasionally need to authenticate with
  a personal access token if they're also pulling private images from
  the same registry. Anonymous pulls for public images Just Work.

### Option B — Docker Hub

The conventional default. `docker pull sharpee/zifmia:1.0.0` Just
Works on every Docker install on Earth.

- **Pros:** universal familiarity; no `--registry` flag needed; rich
  ecosystem of automated build hooks.
- **Cons:** rate limits on anonymous pulls (100/6 h per IP; relevant
  if many operators in the same NAT pull at once); the Docker Hub org
  is a separate account to maintain; their TOS shifts over time
  (the 2020 retention-policy churn left a bad taste in the community).

### Option C — Self-hosted registry

`registry.sharpee.plover.net` or similar.

- **Pros:** total control; no third-party policy risk.
- **Cons:** the maintainer takes on registry uptime, storage, TLS,
  backup. A registry that goes down breaks every operator's
  `docker pull`. Defeats the point of "self-contained Docker
  container" by introducing a new infra dependency.

### What changes if we ship a published image

The DEPLOYMENT.md quick-start collapses from "git clone, docker
build" to:

```bash
docker pull ghcr.io/chicagodave/zifmia:1.0.0
docker run -d --name zifmia -p 3000:3000 \
    -v zifmia-data:/data -v zifmia-stories:/stories \
    ghcr.io/chicagodave/zifmia:1.0.0
```

The repo build path (`docker build -f tools/zifmia/Dockerfile .`)
stays available for contributors and forks — it's the published-image
build pipeline, just invoked manually instead of by CI.

## Decision

**Adopt Option A.** Publish Zifmia images to **GitHub Container
Registry** (`ghcr.io/chicagodave/zifmia`) on every release tag,
driven by a GitHub Actions workflow. The repo build path stays as the
canonical source build; the published image is the canonical
distribution.

### Registry: `ghcr.io/chicagodave/zifmia`

The image namespace follows the GitHub repo. The first-party path
is `ghcr.io/chicagodave/zifmia`; if the repo moves or is forked, the
namespace moves with it.

### Tagging convention

A release tag produces immutable + floating tags:

- `ghcr.io/chicagodave/zifmia:<semver>` (e.g. `:1.0.0`, `:1.0.1`) —
  immutable pin. Operators pin to this in production compose files.
- `ghcr.io/chicagodave/zifmia:<major>.<minor>` (e.g. `:1.0`) —
  floating pin that advances **only when** the newly-published
  `<X.Y.Z>` is the highest patch on `<X.Y>`.
- `ghcr.io/chicagodave/zifmia:<major>` (e.g. `:1`) — floating pin
  that advances **only when** the newly-published `<X.Y.Z>` is the
  highest version on the `<X>` line.
- `ghcr.io/chicagodave/zifmia:latest` — floating pin that advances
  **only when** the newly-published `<X.Y.Z>` is the highest version
  overall. Documented but discouraged for production.

The conditional advancement matters when patching an older major
line: publishing a hotfix `1.0.5` while `2.x` is the current line
must not regress `:1` or `:latest`. The workflow consults the
existing registry tag list to compute which floating tags it owns.

A separate `:edge` tag is published on every push to `main` that
modifies `tools/zifmia/` or its deps (so docs/comment-only commits
don't churn the registry). `:edge` is the *only* tag minted from a
non-release path; this preserves Invariant 1 ("image is the release"
for every other tag).

Image semver is `tools/zifmia/package.json`'s `version` field — the
build script already writes `SHARPEE_VERSION` there. That field is
the canonical source of truth for "what image is this."

### Trigger: GitHub Release tag

The workflow runs on every tag matching `zifmia-v*` (e.g.
`zifmia-v1.0.0`). The tag name is the only authoritative source of
the version; the workflow extracts it, verifies it matches
`tools/zifmia/package.json`, and fails the build if they diverge.
This is the *only* path that mints version-shaped tags and may
advance `:latest`.

### First release version

The first published image is **`ghcr.io/chicagodave/zifmia:1.0.0`**
(tag `zifmia-v1.0.0`). The repo's `tools/zifmia/package.json`
`version` field is bumped to `1.0.0` as part of the release-tag cut.
The earlier `0.9.x` series tracks the pre-public, build-from-source
era and is intentionally not republished. `1.0.0` marks Phase 8 of
ADR-177 plus ADR-178 v1 as the audit-clear inaugural release.

### First-time GHCR setup

GHCR requires three one-time steps for the namespace owner before
the first release:

1. Enable the `packages: write` workflow permission. Either set the
   repo default at *Settings → Actions → General → Workflow
   permissions → Read and write*, or scope it per-workflow with
   `permissions: { packages: write, contents: read }` in
   `zifmia-publish.yml`. The per-workflow scope is preferred — it
   keeps other workflows least-privilege.
2. After the first push, set the package visibility to **public**
   at `https://github.com/users/chicagodave/packages/container/zifmia/settings`.
   GHCR defaults newly-created packages to private; the public flip
   is a one-time UI action.
3. Confirm the workflow's `GITHUB_TOKEN` is the publisher. No
   personal access token is required for `ghcr.io` pushes from the
   same-repo workflow.

### Coexistence with existing CI

`zifmia-publish.yml` is a new, independent workflow. It does not
replace `beta-release.yml` (npm-package publishing) or
`build-platforms.yml`; the three run side by side on their own
triggers (tag globs for the two publishers, branch push for the
third). The shared pnpm + Node setup steps are duplicated rather
than abstracted — workflows are independent enough that shared
composite actions add more friction than they remove.

### Build context: monorepo root

The Dockerfile build context is the repo root (per ADR-177's
`COPY packages/` requirement). The Actions workflow checks out the
full repo, runs `docker buildx build -f tools/zifmia/Dockerfile .`,
and pushes. No build-context surgery; the existing Dockerfile is
unchanged.

### `BASELINE_VERSION` baked at image build

The workflow reads `BASELINE_VERSION` from the built manifest
package (`packages/story-runtime-baseline/dist/index.js`) and passes
it to `docker build --build-arg BASELINE_VERSION=<n>` — exactly what
`tools/zifmia/docker-compose.yml` does today. The published image
carries `org.sharpee.story-runtime-baseline=<n>` so operators auditing
the image know which baseline it ships before pulling.

### Multi-arch

Two architectures: `linux/amd64` and `linux/arm64`. Both are common
VPS targets (Hetzner, Digital Ocean, AWS Graviton). `linux/arm/v7`
is out of scope — Node 20 + better-sqlite3 on 32-bit ARM is not a
supported configuration.

`better-sqlite3` is a native C++ module compiled in the `deps`
stage. On the free `ubuntu-latest` runner, `linux/arm64` builds run
via QEMU emulation — `g++` compiles C++ inside an emulated arm64
userspace, which is realistically **25–45 minutes per release**, not
the often-quoted 10–20 minutes for non-native-deps images. v1
accepts this cost on free runners. If release cadence makes the wait
painful, the workflow moves to native ARM runners
(`buildjet-2vcpu-ubuntu-2204-arm` or GitHub's `ubuntu-24.04-arm`
once GA) in a follow-up amendment; switching is a one-line
`runs-on:` change.

### What does NOT ship in the published image

- Story bundles. Operators drop their own `.sharpee` files into
  `/stories`. ADR-177 §7 explicitly forbids the image bundling any
  story content.
- A `dungeo.sharpee` "demo bundle." Demos are a separate operator
  decision; bundling one in the image confuses authorship attribution
  and bloats every release with content most operators replace.
- Compose / config defaults specific to a hosting environment.
  `docker-compose.yml` is committed to the repo for reference, not
  baked into the image.

## Invariants

1. **The image is the release.** Version-shaped tags
   (`<X.Y.Z>`, `<X.Y>`, `<X>`, `latest`) are minted *only* by a
   `zifmia-v*` git tag push. The `:edge` tag (and only `:edge`) is
   minted from `main` pushes — it is the documented "the build that
   landed on `main` this morning" path, distinct from release tags.
2. **Reproducibility.** Given a release tag, any contributor can
   rebuild the same image bit-for-bit modulo timestamps.
   `pnpm-lock.yaml` is the dependency lockfile. Base-image digest
   pinning is enforced by AC-8.
3. **The published image carries the baseline label.** Every release
   has `org.sharpee.story-runtime-baseline=<n>` matching the manifest
   shipped in that image. Drift between label and shipped manifest
   is a release-pipeline bug, not an operator concern.
4. **Public images only.** `ghcr.io/chicagodave/zifmia` is public.
   Anonymous `docker pull` works without authentication. Operators
   who want a private mirror set their own up — that's outside the
   project's surface.
5. **Floating tags advance conditionally on monotonic semver.**
   Publishing `<X.Y.Z>` advances `:X.Y` only if `<X.Y.Z>` is the
   highest patch on `<X.Y>` in the registry; advances `:X` only if
   `<X.Y.Z>` is the highest version on the `<X>` line; advances
   `:latest` only if `<X.Y.Z>` is the highest version overall. A
   hotfix to an older major never regresses a newer floating tag.

## Acceptance Criteria

- **AC-1: workflow exists.** `.github/workflows/zifmia-publish.yml`
  exists with two triggers: (a) `push` of tags matching `zifmia-v*`
  mints all version-shaped tags and conditionally advances floating
  tags per Invariant 5; (b) `push` to `main` modifying
  `tools/zifmia/**` or `packages/**` mints *only* `:edge`. The two
  triggers share no tag namespace.
- **AC-2: tag-version match enforced.** The workflow fails if the
  tag's semver (stripped of the `zifmia-v` prefix) does not equal
  `tools/zifmia/package.json` `version` at the tagged commit.
- **AC-3: multi-arch push.** A successful release produces both
  `linux/amd64` and `linux/arm64` manifests under a single tag, and
  `docker manifest inspect ghcr.io/chicagodave/zifmia:<v>` lists
  both.
- **AC-4: baseline label present.** The published image carries
  `org.sharpee.story-runtime-baseline=<BASELINE_VERSION>` matching
  the manifest in the image's `node_modules`.
- **AC-5: floating tags advance conditionally.** After publishing
  `<X.Y.Z>`, the workflow queries the existing registry tag list
  and advances `:X.Y` / `:X` / `:latest` only when `<X.Y.Z>` is the
  highest patch / minor+patch / overall version respectively. A
  hotfix `1.0.5` published while `2.0.0` exists does NOT regress
  `:1` or `:latest`.
- **AC-6: pull-and-run works without the repo.** A fresh host with
  only Docker installed can run:
  ```bash
  docker run -d --name zifmia -p 3000:3000 \
      -v zifmia-data:/data -v zifmia-stories:/stories \
      ghcr.io/chicagodave/zifmia:<v>
  ```
  and reach `GET /api/stories` returning `{"baseline_version":1,"stories":[]}`.
- **AC-7: DEPLOYMENT.md updated.** The quick-start path leads with
  `docker pull` from ghcr.io; the from-source build path is
  documented as the contributor / fork path, not the default.
- **AC-8: base-image digest pinned.** Before the first release tag,
  both `FROM` lines in `tools/zifmia/Dockerfile` pin
  `node:20-bookworm-slim@sha256:<digest>`. The digest is updated
  deliberately on Node 20 / Debian security releases; automated
  pinning bots are appropriate but the digest must be a real,
  pulled, verified sha256 — not a `:latest` reference.

## Tests required for AC closure

- `.github/workflows/zifmia-publish.yml` workflow runs successfully
  on a test tag `zifmia-v0.0.0-test1` against a sandbox image name
  (e.g. `ghcr.io/chicagodave/zifmia-test`). Manual smoke test: pull
  the image on a fresh Ubuntu VM and run AC-6's command.
- A failing tag-version mismatch is detected: tag `zifmia-v9.9.9`
  against a commit whose `package.json` says `0.9.113` must fail
  the workflow with a clear error before any image push.
- The published image's baseline label round-trips: `docker pull
  …:<v> && docker inspect --format '{{index .Config.Labels
  "org.sharpee.story-runtime-baseline"}}'` returns the same integer
  as `STORY_RUNTIME_BASELINE`'s `BASELINE_VERSION` in the same
  image's `node_modules/@sharpee/story-runtime-baseline/dist/index.js`.
- **Hotfix-into-old-major scenario (AC-5).** Sandbox test that
  publishes `1.0.0`, then `2.0.0`, then `1.0.1` in sequence and
  asserts: after step 3, `:1.0.1` exists; `:1.0` points at `1.0.1`;
  `:1` points at `1.0.1`; `:latest` still points at `2.0.0`. The
  workflow must NOT regress `:latest` to `1.0.1`.
- **`:edge` isolation (AC-1 + Invariant 1).** A push to `main` that
  modifies `tools/zifmia/` updates `:edge` and only `:edge` — no
  version-shaped tag (`:1.x.x`, `:1.x`, `:1`, `:latest`) changes
  digest as a result. Verifiable by snapshotting `docker manifest
  inspect` for the four version tags before and after the push.

## Constrains Future Sessions

- Versioning Zifmia is now a deliberate event: a `zifmia-v*` tag.
  Day-to-day commits to `tools/zifmia/` or to baseline packages in
  `packages/` only update the `:edge` tag, never the pinned-semver
  tags or `:latest`.
- Image namespace is `ghcr.io/chicagodave/zifmia`. Moving the repo
  (fork, transfer) moves the canonical image path; consumers pinning
  to the old path break.
- Story authors building bundles intended for "any Zifmia >= v1.0"
  test against the published image, not against a local `docker build`.
- The Dockerfile's pinned base-image digest must be updated on every
  Node 20 / Debian security release. That's a deliberate maintenance
  beat; auto-renovate bots are appropriate.

## Out of Scope

- **Docker Hub mirror.** If operator demand emerges for
  `docker.io/sharpee/zifmia`, a future ADR can add a parallel push
  step. v1 is single-registry (ghcr.io) to keep the release pipeline
  simple.
- **Helm chart / Kubernetes manifests.** Zifmia is single-instance
  by design (one SQLite DB per server). Operators running it on
  Kubernetes can wrap the image themselves; the project doesn't
  ship cluster manifests.
- **Image signing / SBOM attestation.** GHCR supports cosign +
  attestations; adding them is straightforward but not load-bearing
  for v1. A later ADR amendment can require them once the publishing
  pipeline is otherwise stable.
- **A "stable" channel separate from version tags.** Some projects
  publish `:stable` lagging `:latest` by N days. Zifmia's semver tags
  are sufficient; operators who want stability pin to `:1.2.3`.
- **Pre-release / RC tags.** A future amendment can add
  `zifmia-v1.2.3-rc.1` workflows. v1 publishes only release tags
  (`zifmia-v<X.Y.Z>` with no suffix).
- **Image-content auditing.** Verifying the runtime image doesn't
  ship dev-only artefacts (`@types/*`, source maps, build tooling
  hanging off pnpm's store) is deferred. The Dockerfile's `pnpm
  deploy --prod --legacy` step is the current gate; tightening it
  with a content-scan step is a follow-up.

## Prior Art

- **Caddy** (`caddy:2-alpine`) — single-tag-per-version multi-arch
  image on Docker Hub. The Caddy repo's build pipeline is the model
  for "image is the release."
- **Linkwarden / Vaultwarden / Wallabag** — self-hosted apps that
  ship a primary GHCR image plus a Docker Hub mirror. The Vaultwarden
  release notes are a good template for the per-tag changelog Zifmia
  should produce.
- **node:20-bookworm-slim** — the existing base in
  `tools/zifmia/Dockerfile`. Pinning it to a sha256 digest is the
  AC-8 deliverable.

## Consequences

### Positive

- One-command install: `docker pull ghcr.io/chicagodave/zifmia:<v>`.
- Operators can pin to a known artifact and audit before pulling.
- Story authors have a stable target to test against per
  `BASELINE_VERSION`.
- Release events are visible (a git tag) and auditable (a workflow
  run with logs + an image digest).
- The repo build path remains the contributor surface; nothing about
  developing on Zifmia changes.

### Negative

- A release is now a 2-step event: commit the version bump as
  `chore: zifmia v<X.Y.Z>` (this updates `tools/zifmia/package.json`),
  then push the matching `zifmia-v<X.Y.Z>` tag. Forgetting either
  step produces no release. Documented in the maintainer release
  runbook.
- ghcr.io has occasional outages. Operators pinning to a specific
  digest survive them; operators pinning to `:latest` may see a
  transient pull failure during a registry hiccup.
- Image storage on ghcr.io accumulates layer history over time
  (each release's manifest references the layers it ships; old
  layers stay alive as long as any tag still points at them). Free
  public storage is generous, but periodic GC of unreferenced layers
  may be needed at scale.

### Migration from current state

- **Today:** the only install path is `git clone && docker build`.
- **First release:** `zifmia-v1.0.0` (see §First release version).
  `tools/zifmia/package.json` version bumps from `0.9.113` to
  `1.0.0`; the Dockerfile's two `FROM` lines gain sha256 digest pins
  (AC-8); the workflow `.github/workflows/zifmia-publish.yml` lands.
- **After this ADR ships:** the from-source path still works for
  contributors and fork operators. New operators follow the
  `docker pull ghcr.io/chicagodave/zifmia:1.0.0` path from
  DEPLOYMENT.md. The repo's `docker-compose.yml` switches from
  `build:` to `image: ghcr.io/chicagodave/zifmia:1.0.0` in a
  published example; the build path stays available for those who
  want it (`docker compose -f docker-compose.build.yml up`).

## Open Questions

- **GitHub Actions runner cost over time.** The free
  `ubuntu-latest` runner builds `linux/arm64` via QEMU emulation in
  ~25–45 minutes per release (see §Multi-arch). v1 accepts this.
  The threshold to switch to native ARM runners
  (`buildjet-2vcpu-ubuntu-2204-arm`, ~\$0.012/min; or GitHub's
  `ubuntu-24.04-arm` once GA) is "release cadence makes the wait
  painful." Revisit when there's signal — not preemptively.

## Session

ADR-179 emerged 2026-05-13 from a deployment-doc audit during the
post-ADR-178 cleanup. The doc revealed that the published-image
question was implicit in every other ADR (177, 178) but never
decided. This ADR closes that gap.
