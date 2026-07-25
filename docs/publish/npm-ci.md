# Publishing Sharpee to npm from CI

**Status**: proposal — nothing here has been implemented yet.
**Audience**: David (the only person who can do the npmjs.com steps).
**Goal**: replace the manual publish (with npm's 5-minute web-auth link) with a
CI publish you trigger by hand, while keeping version decisions entirely local.

---

## 1. Why we're doing this

Two npm changes force the issue, and one long-standing repo problem makes it worth
doing properly rather than patching.

### 1.1 npm is retiring 2FA-bypass tokens

From the [npm changelog, 2026-07-08](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/):

| Date | What happens to granular access tokens configured to bypass 2FA |
| --- | --- |
| **Early August 2026** | Lose account-management rights: creating/deleting tokens, changing password/email/2FA, package access and maintainer changes, org/team management. Publishing still works. |
| **January 2027** | Can no longer publish directly. Limited to reading private packages and staging. Release requires human 2FA approval. |

Sharpee's token only publishes, so August is a non-event. January ends the current
workflow.

### 1.2 npm v12 install-time defaults — not our problem

The same changelog announced that dependency lifecycle scripts (`preinstall`,
`install`, `postinstall`), implicit `node-gyp` builds, git dependencies, and
remote-URL dependencies are all now blocked by default.

Checked against this repo — **no action needed**:

- No `@sharpee/*` package declares any install lifecycle script.
- No git or remote-URL dependencies anywhere in the workspace.
- The root `~/.npmrc` already sets `ignore-scripts=true`.
- Installs use pnpm 10.13.1, which gates build scripts through its own
  `onlyBuiltDependencies` mechanism rather than npm's.

Consumers running `npm install @sharpee/sharpee` will not be prompted to approve
scripts on our account. This section exists only so nobody re-investigates it.

### 1.3 The CI publish job has never run

`.github/workflows/beta-release.yml` has a `publish-npm` job, but it is dead code:

- The workflow triggers only on pushes to the `beta-release` branch, or tags
  matching `v*-beta*` / `v*-alpha*`.
- The job additionally gates on `if: startsWith(github.ref, 'refs/tags/v')`.
- Releases are now `chore(release): bump platform to X.Y.Z` commits on `main`.
  The last tag is `v2.2.0` (2026-07-21) while the platform is at **3.6.0** —
  3.0.0, 3.2.0, 3.3.0, 3.5.0 and 3.6.0 all shipped untagged.
- Even the tags that were cut (`v2.2.0`, `v1.0.0`) don't match `v*-beta*` or
  `v*-alpha*`, so they wouldn't have fired it either.

It also publishes a **hardcoded list of 16** packages
(`for pkg in core if-domain media …`), which misses `bootstrap`, `chord`,
`devkit`, `ide-protocol`, `platform-browser`, all three `plugin-*`, `queries`,
`story-loader`, `story-runtime-baseline`, `transcript-tester`, and every package
under `packages/extensions/`. Meanwhile `scripts/publish-npm.sh` discovers
packages by globbing and filtering on `publishConfig`, so the two paths publish
different sets.

That divergence is why every release has been manual.

### 1.4 The manual publish has already shipped a wrong artifact

This is not hypothetical. The 3.6.0 release is live on npm with a stale constant
baked into it.

`@sharpee/stdlib@3.6.0` ships `ENGINE_VERSION = '3.5.0'`. The package manifest
says `3.6.0`, but the compiled constant in the published tarball
(`package/actions/standard/version/engine-version.js:8`) says `3.5.0`. Verified by
downloading the tarball on 2026-07-25.

The cause is a missing step, not a bug. `stampVersions()`
(`tools/repokit/src/commands/build.ts:75-101`) regenerates
`packages/stdlib/src/actions/standard/version/engine-version.ts` from
`packages/sharpee/package.json` on every `./repokit build`. The 3.6.0 release
bumped the 32 manifests and published, but never ran a stamping build, so stdlib
compiled against the previous value.

The user-visible effect is narrow but real. Per the comment at `build.ts:85-88`,
that constant is the fallback version banner for Chord `.story` stories, which
carry no stamped `src/version.ts` of their own. Authors on published 3.6.0 see
`3.5.0` when they run `version` in a Chord story. TypeScript stories, which have
their own stamped `version.ts`, are unaffected.

A related gap surfaced in the same check. `packages/sharpee/package.json` declares
`"files": ["dist", "docs"]`, but the published `@sharpee/sharpee@3.6.0` tarball
contains 10 files and no `docs/` directory at all, so `docs/genai-api/` is not
reaching authors despite both `CLAUDE.md` and the generator's own header stating
that it ships with the package. The tarball paths are flattened
(`package/index.js`, not `package/dist/index.js`), which shows tsf publishes from a
rewritten staging manifest rather than packing the source directory, so the source
`files` array is not what governs the result. The exact staging behavior has not
been traced yet. See §10.5.

Both problems share one root cause: a human assembles the release by remembering
which steps to run. That is precisely what moving the build into CI fixes, provided
the workflow runs the stamping build rather than a bare compile. See §7 Part B.

---

## 2. What stays under your control

This is the design constraint, stated up front so no step violates it.

| Decision | Who / where | Changed by this proposal? |
| --- | --- | --- |
| What the version number is | You, locally: `tsf version X.Y.Z --condition publish` | **No** |
| When a version bump is committed | You, as a `chore(release):` commit | **No** |
| Which packages get published | tsf discovery (`publishConfig`), same as today | **No** |
| Whether a publish happens at all | You, pressing "Run workflow" in the GitHub UI | **No** |
| How the publish authenticates to npm | Was: your token + a 5-minute link. Becomes: a short-lived OIDC credential minted for the workflow run. | **Yes — this is the only change** |

CI never bumps a version, never decides to release, and never runs on its own. It
publishes exactly the versions you already committed, when you tell it to. The
only thing being automated is the part you cringe at.

---

## 3. How trusted publishing works (the 90-second version)

Today `npm publish` proves who you are with a long-lived token stored in
`~/.npmrc`, plus a 2FA challenge — the web link that expires in 5 minutes.

With trusted publishing, GitHub Actions mints a short-lived, cryptographically
signed OIDC token that states: *"this is run N of workflow `publish-npm.yml` in
repo `ChicagoDave/sharpee`."* npm verifies that signature against a trusted
publisher you registered ahead of time, and if it matches, allows the publish.

No token is stored anywhere. Nothing to leak, rotate, or paste. The credential is
worthless outside that one workflow run. npm waives the 2FA challenge because the
identity is the workflow itself, verified by GitHub — a stronger guarantee than a
link typed in under time pressure.

**Bonus**: npm automatically attaches a provenance attestation — a public,
verifiable record linking each published tarball to the exact commit and workflow
run that built it. This requires no flag and happens only for public repos and
public packages. `ChicagoDave/sharpee` is public and all `@sharpee/*` packages are
public, so we get it for free.

---

## 4. Requirements and constraints

Verified against [npm's trusted publishers documentation](https://docs.npmjs.com/trusted-publishers):

| Requirement | Status here |
| --- | --- |
| npm CLI ≥ **11.5.1** | ⚠️ **Action needed.** `setup-node` with `node-version: '22'` ships npm 10.x. The workflow must run `npm install -g npm@latest`. (Local machine is on npm 11.11.0 — fine.) |
| Node ≥ **22.14.0** | ✅ `node-version: '22'` resolves to the latest 22.x. |
| `id-token: write` permission | ✅ Already present on the existing `publish-npm` job. |
| Public repo + public packages (for provenance) | ✅ `ChicagoDave/sharpee` is PUBLIC; all packages publish with `--access public`. |
| GitHub-hosted runner | ✅ `ubuntu-latest`. Self-hosted runners are **not supported**. |
| Workflow filename matches exactly | ⚠️ Case-sensitive, including extension. Registering `publish-npm.yml` and having the file named `publish-npm.yaml` fails **at publish time**, not at setup. |
| One trusted publisher per package | ✅ Fine — one workflow publishes everything. |
| `npm whoami` under OIDC | ❌ **Explicitly unsupported.** Only `npm publish` and `npm stage publish` accept OIDC. This breaks tsf — see §5. |

---

## 5. The tsf blocker

`tsf publish` gates on a login check before publishing anything
(`/Users/david/repos/tsf/src/cli/publish.ts:129-138`):

```ts
// Check npm login (skip for dry-run)
if (!options.dryRun) {
  try {
    const user = execSync('npm whoami', { stdio: 'pipe' }).toString().trim();
    logger.info(`Logged in to npm as ${user}`);
  } catch {
    logger.error('Not logged in to npm. Run `npm login` first.');
    process.exit(1);
  }
}
```

Under trusted publishing there is no token and no logged-in user, so `npm whoami`
fails and tsf exits **before** reaching the publish it would have succeeded at.

Everything else in tsf is already compatible. It packs with `npm pack --json` and
publishes with plain `npm publish <tarball> --access public --tag <tag>`
(`publish.ts:187-199`) — exactly the invocation OIDC hooks into. No `--provenance`
flag is needed; npm adds it automatically.

### 5.1 Sequencing problem

tsf is consumed from npm, not built from source. `@davidcornelson/tsf@1.0.0` is in
Sharpee's `devDependencies` and `pnpm-lock.yaml`, so CI's existing `pnpm install`
already pulls it — no cloning or building required.

But your local `tsf` is a shell alias to `/Users/david/repos/tsf/dist/cli/index.js`,
and that repo has **two commits after the 1.0.0 publish** with no version bump:

- `dffd580` — fix(publish): drop "type" from publish manifest
- `821d1e6` — fix(publish): honor configured publish-import style in npm builds

npm's 1.0.0 predates both, and the `whoami` gate is confirmed present in the
published artifact (`node_modules/@davidcornelson/tsf/dist/cli/publish.js:143`).

**So tsf needs a 1.0.1 release before Sharpee's CI can use it — and that release
is one last manual publish with the link.** After that, never again.

§8 offers a fallback that skips the tsf release entirely if you'd rather not.

---

## 6. Target flow

```
LOCAL (you, unchanged)                        CI (new)
──────────────────────                        ────────
tsf version 3.7.0 --condition publish
git commit -m "chore(release): bump to 3.7.0"
git push
                                              ── you press "Run workflow" ──
                                              pnpm install
                                              build platform packages
                                              tsf build --npm
                                              tsf publish --changed
                                                → OIDC handshake, no link
                                                → provenance attached
```

`--changed` makes the job idempotent: tsf compares each package's local version
against `npm view <pkg> version` and skips anything already published
(`publish.ts:107-122`). Re-running after a partial failure republishes only what's
missing, instead of erroring on "version already exists."

---

## 7. Step-by-step

### Part A — Release tsf 1.0.1

In `/Users/david/repos/tsf`:

- [x] **A1.** Relax the login gate. Replace the block at `src/cli/publish.ts:129-138`:

  ```ts
  // Check npm login (skip for dry-run and for OIDC/trusted publishing).
  // Under trusted publishing there is no logged-in user: npm whoami does not
  // accept OIDC credentials, only `npm publish` does. GitHub Actions sets
  // ACTIONS_ID_TOKEN_REQUEST_URL when id-token: write is granted.
  const usingOidc = !!process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  if (!options.dryRun && !usingOidc) {
    try {
      const user = execSync('npm whoami', { stdio: 'pipe' }).toString().trim();
      logger.info(`Logged in to npm as ${user}`);
    } catch {
      logger.error('Not logged in to npm. Run `npm login` first.');
      process.exit(1);
    }
  } else if (usingOidc) {
    logger.info('OIDC credentials detected — skipping npm whoami check');
  }
  ```

  Dropping the check is safe: if auth is genuinely broken, `npm publish` fails
  loudly on the first package and tsf's existing error path exits non-zero.

- [x] **A2.** Bump tsf to `1.0.1` and commit. This also ships the two unreleased
      publish fixes (`dffd580`, `821d1e6`).
- [x] **A3.** Publish tsf to npm. **This is the last publish that needs the
      5-minute link.** *(1.0.1 verified live on npm, 2026-07-25.)*
- [x] **A4.** In Sharpee, update the dependency to `^1.0.1`, run `pnpm install`,
      and commit the lockfile change. Verify:
      `node -p "require('./node_modules/@davidcornelson/tsf/package.json').version"`
      *(Done 2026-07-25: verify prints 1.0.1, and the installed `dist/cli/publish.js`
      contains the `ACTIONS_ID_TOKEN_REQUEST_URL` OIDC skip from A1.)*

> Optional, later: give tsf its own trusted publisher so *its* releases are also
> link-free. Not required for Sharpee — skipping it just means the occasional tsf
> release still uses the link.

### Part B — Add the publish workflow

In `sharpee_v2`:

- [x] **B1.** Create `.github/workflows/publish-npm.yml`. A dedicated file is
      better than reusing `beta-release.yml`, because npm binds the trusted
      publisher to a specific filename and that file should do one thing.

  ```yaml
  name: Publish to npm

  on:
    workflow_dispatch:
      inputs:
        dry_run:
          description: 'Dry run (pack and validate, publish nothing)'
          type: boolean
          default: true

  jobs:
    publish:
      runs-on: ubuntu-latest
      permissions:
        contents: read
        id-token: write        # required for OIDC — do not remove

      steps:
        - uses: actions/checkout@v5

        - uses: pnpm/action-setup@v4
          with:
            version: 10.13.1

        - uses: actions/setup-node@v5
          with:
            node-version: '22'
            cache: 'pnpm'
            registry-url: 'https://registry.npmjs.org'

        # setup-node ships npm 10.x with Node 22; trusted publishing needs >= 11.5.1
        - name: Upgrade npm
          run: npm install -g npm@latest

        - name: Verify npm version
          run: npm --version

        - name: Install dependencies
          run: pnpm install

        # MUST be the repokit build, not `pnpm run build`. See B2 below:
        # `pnpm run build` is `turbo run build` and does not stamp versions,
        # which is how @sharpee/stdlib@3.6.0 shipped a stale ENGINE_VERSION.
        - name: Build platform packages (stamps versions first)
          run: ./repokit build

        - name: Fail if stamping changed a tracked file
          run: git diff --exit-code

        - name: Build npm artifacts
          run: pnpm exec tsf build --npm

        - name: Validate
          run: pnpm exec tsf validate

        - name: Publish (dry run)
          if: inputs.dry_run
          run: pnpm exec tsf publish --changed --dry-run

        - name: Publish
          if: ${{ !inputs.dry_run }}
          run: pnpm exec tsf publish --changed
  ```

  Note there is **no `NODE_AUTH_TOKEN`**. That absence is the point.

- [x] **B2.** Use `./repokit build` as the build entry point, **not**
      `pnpm run build`. This is the fix for §1.4 and it is not optional.

      The root `build` script is `turbo run build`, which compiles packages but
      never calls repokit's `stampVersions()`. Under that entry point, CI compiles
      whatever `engine-version.ts` happens to be committed, so a release whose bump
      commit did not include a stamping build publishes a stale constant. That is
      exactly how 3.6.0 shipped `ENGINE_VERSION = '3.5.0'`. Automating the publish
      without changing this step would automate the bug rather than fix it.

      Ordering matters: stamping must precede compilation. `runBuild()`
      (`build.ts:214-237`) already guarantees this by calling `stampVersions()`
      first, which is the second reason to invoke repokit rather than assemble the
      steps by hand in YAML.

      The `git diff --exit-code` step that follows is the safety net. If stamping
      changed a tracked file, the release commit was incomplete and the job should
      fail loudly rather than publish an artifact that disagrees with the repo.
      Expect this to fire the first time; the fix is to commit the stamp and re-run,
      not to delete the check.

- [ ] **B2a.** Confirm `./repokit build` works from a clean CI checkout. It is
      normally run against a warm tree, and the cold-build ordering has bitten us
      before, so this needs one verification run before the first real publish. If
      it fails cold, fix the ordering rather than falling back to `turbo run build`.
- [x] **B3.** Delete the dead `publish-npm` job from `beta-release.yml`, along with
      the now-unused `NPM_TOKEN` reference. Leave the build/test/release jobs alone.
      *(Done 2026-07-25: `beta-release.yml` now has only build/release/notify; no
      `NPM_TOKEN` reference remains under `.github/`.)*

### Part C — Register trusted publishers on npmjs.com

This is the tedious part, and only you can do it — it requires a 2FA login.
**32 packages**, each configured identically.

For each package, go to `https://www.npmjs.com/package/<name>/access`, find the
**Trusted Publisher** section, click **GitHub Actions**, and enter:

| Field | Value |
| --- | --- |
| Organization or user | `ChicagoDave` |
| Repository | `sharpee` |
| Workflow filename | `publish-npm.yml` |
| Environment name | *(leave empty)* |
| Allowed actions | `npm publish` |

All fields are **case-sensitive and must match exactly**. Mistakes surface at
publish time, not at setup time.

- [x] `@sharpee/bootstrap`
- [x] `@sharpee/channel-service`
- [x] `@sharpee/character`
- [x] `@sharpee/chord`
- [x] `@sharpee/core`
- [x] `@sharpee/devkit`
- [x] `@sharpee/engine`
- [x] `@sharpee/event-processor`
- [x] `@sharpee/ext-basic-combat`
- [x] `@sharpee/ext-hunger`
- [x] `@sharpee/ext-scoring`
- [x] `@sharpee/ext-testing`
- [x] `@sharpee/helpers`
- [x] `@sharpee/ide-protocol`
- [x] `@sharpee/if-domain`
- [x] `@sharpee/if-services`
- [x] `@sharpee/lang-en-us`
- [x] `@sharpee/media`
- [x] `@sharpee/parser-en-us`
- [x] `@sharpee/platform-browser`
- [x] `@sharpee/plugin-npc`
- [x] `@sharpee/plugin-scheduler`
- [x] `@sharpee/plugin-state-machine`
- [x] `@sharpee/plugins`
- [x] `@sharpee/queries`
- [x] `@sharpee/sharpee`
- [x] `@sharpee/stdlib`
- [x] `@sharpee/story-loader`
- [x] `@sharpee/story-runtime-baseline`
- [x] `@sharpee/text-blocks`
- [x] `@sharpee/transcript-tester`
- [x] `@sharpee/world-model`

All 32 are published at 3.6.0 today, so every one has a settings page to configure.

**Excluded**: `@sharpee/extension-conversation` has `publishConfig` and is not
private, but is stale at `0.9.112` and **has never been published**. tsf's
discovery would try to publish it. Decide before the first real run — see §10.

### Part D — First run

- [x] **D1.** Bump one low-risk package locally (`@sharpee/ext-hunger` is a good
      candidate — small, few dependents) and commit the bump.
      *(Done 2026-07-25: ext-hunger 3.6.0 → 3.6.1, commit `e0ea9e7d`, pushed.)*
- [ ] **D2.** Trigger the workflow with `dry_run: true`. Confirm it reaches the
      publish step and that tsf's `--changed` filter selects only that package.
- [ ] **D3.** Trigger again with `dry_run: false`. Confirm:
      - No 5-minute link appears anywhere.
      - `npm view @sharpee/ext-hunger version` shows the new version.
      - The npm package page shows a green **Provenance** badge linking to the
        workflow run.
- [ ] **D4.** Verify the stamp actually landed in the published artifact, since
      this is the failure §1.4 documents and a version number on the manifest does
      not prove it. Download the tarball and read the constant directly:

      ```bash
      npm pack @sharpee/stdlib@<version>
      tar -xzf sharpee-stdlib-<version>.tgz
      grep ENGINE_VERSION package/actions/standard/version/engine-version.js
      ```

      It must match the published version. Checking `npm view` alone would have
      reported 3.6.0 as healthy.

- [ ] **D5.** Only after that succeeds, do a full lockstep release through CI.

### Part E — Close the door

Once a full release has gone through CI cleanly:

- [ ] **E1.** On npmjs.com, set **"Require two-factor authentication and disallow
      tokens"** for the `@sharpee` scope. This blocks token-based publishing
      outright while trusted publishing keeps working, and makes the January 2027
      deadline a non-event.
- [ ] **E2.** Revoke the granular access token in `~/.npmrc`
      (`//registry.npmjs.org/:_authToken=`).
- [ ] **E3.** Update `scripts/publish-npm.sh` — either delete it or add a header
      pointing at the CI workflow, so nobody reaches for it out of habit. Note it
      still hardcodes `VERSION="0.9.64-beta"` and a WSL-era tsf path
      (`/mnt/c/repotemp/tsf/dist/cli/index.js`), so it's already stale.

Do **not** do Part E until Part D has succeeded — E2 removes your ability to fall
back to a manual publish.

---

## 8. Fallback: skip the tsf release

If you'd rather not cut a tsf 1.0.1 right now, the workflow can use tsf for
building and staging only, and call `npm publish` directly. `tsf build --npm`
writes each package to a staging directory; the job walks it and publishes each in
turn:

```yaml
- name: Build npm artifacts
  run: pnpm exec tsf build --npm

- name: Publish from staging
  run: |
    for dir in <staging-root>/@sharpee/*/; do
      npm publish "$dir" --access public
    done
```

This trades one manual tsf publish for a hand-rolled loop that can drift from tsf's
own logic — it would skip tsf's dependency-order publishing, its `workspace:`
protocol leak validation (`publish.ts:152-173`), and the `--changed` idempotency.

**Recommendation: don't.** Those safeguards are worth more than avoiding one
publish, and re-introducing a hand-maintained loop is the exact problem §1.3
describes. This is documented only as an escape hatch. The `<staging-root>` path
needs to be read out of the tsf config before this would even run.

---

## 9. Rollback

Nothing here is one-way until Part E.

| If this fails | Recovery |
| --- | --- |
| Workflow errors before publishing | Nothing published. Fix and re-run. |
| Publishes some packages, then fails | Re-run with `--changed`; already-published packages are skipped. |
| OIDC rejected by npm | Check the workflow filename matches the registered value exactly, case included. Publish manually with the link in the meantime. |
| Want to abandon entirely | Restore the `publish-npm` job in `beta-release.yml` and keep using `scripts/publish-npm.sh`. Do not do Part E and the token stays valid. |

---

## 10. Open decisions

1. **`@sharpee/extension-conversation`** — has `publishConfig`, never published,
   stale at `0.9.112` while everything else is at `3.6.0`. tsf discovery will pick
   it up. Either mark it `"private": true`, remove its `publishConfig`, or bring it
   into the lockstep version and register a trusted publisher for it. Needs your
   call; I'd guess it's dead, but I'm not assuming.

2. **Trusted publishing for a never-published package** — npm's documentation does
   not state whether a trusted publisher can be registered before a package's first
   publish. Only relevant if a *new* package is added later, or if
   extension-conversation is kept. Worth a probe before it matters.

3. **`--no-git-checks`** — tsf passes this to `npm publish` (`publish.ts:199`), but
   it's a pnpm flag, not an npm one. npm should warn and ignore it. Harmless, but
   worth cleaning up in the tsf 1.0.1 release while you're in there.

4. ~~**Republishing 3.6.0**~~ — **decided 2026-07-25: leave it.** The live
   `@sharpee/stdlib@3.6.0` keeps the stale `ENGINE_VERSION = '3.5.0'` described in
   §1.4, and 3.7.0 corrects it in the normal course. The alternative, a stdlib-only
   3.6.1, would break the lockstep versioning everything else relies on, which is
   not worth it for a misreported version banner in Chord stories. No action.

   The repo itself is already correct: `engine-version.ts` was stamped to `3.6.0`
   and committed in `7dc2275b`, so 3.7.0 will publish the right value as long as
   the CI flow in Part B is in place by then.

5. ~~**`docs/genai-api/` is not reaching npm**~~ — **decided 2026-07-25: keep them
   out.** The IDE ships this reference to authors, so npm does not need to carry
   1.3 MB of generated markdown in every install. No tsf change required; the
   documentation that claimed otherwise was corrected instead.

   Traced for the record, since the `files` field misleads here. tsf deletes
   `files` from the publish manifest outright (`sync/package-json.js:143`), so
   `"files": ["dist", "docs"]` never governed the tarball. What ships is exactly
   what lands in staging, and the orchestrator
   (`orchestrator/index.js:220-250`) stages only four things: compiled output, the
   generated manifest, README/LICENSE from a hardcoded list, and the globs in the
   package's own `ts-forge.json` `assets` array. `packages/sharpee/ts-forge.json`
   is `{"assets": []}`, and the copy loop is gated on `assets?.length`, so nothing
   under `docs/` was ever copied. Shipping them would have been a one-line change
   to `["docs/**"]`, which is how `packages/devkit` ships its templates.

   Cleaned up in the same pass: the dead `docs` entry in `files`, the `genai`
   manifest field (which survived into the published tarball pointing at both a
   `./docs/genai-api/` that is not shipped and a `./GENAI.md` that does not exist
   anywhere), and the "ships with the npm package" claims in `CLAUDE.md`,
   `packages/sharpee/CLAUDE.md`, and the generator header.

6. **Auto-publish on version-bump commits** — deliberately excluded. Could be added
   later by triggering on pushes to `main` that change
   `packages/sharpee/package.json`. That surrenders the "you decide when" property,
   so it should be a separate decision after the manual path is proven.

---

## 11. Summary

| # | Task | Where | Who |
| --- | --- | --- | --- |
| A | Skip `npm whoami` under OIDC, release tsf 1.0.1 | `repos/tsf` | Claude writes, David publishes |
| B | Add `publish-npm.yml`, remove the dead job | `sharpee_v2` | Claude |
| C | Register 32 trusted publishers | npmjs.com | **David only** |
| D | Dry run, then one real publish, then a full release | GitHub UI | David |
| E | Require 2FA + disallow tokens, revoke the local token | npmjs.com | **David only** |

After Part D, releasing is: bump the version locally, commit, push, press a button.
No token, no link.
