# Prerequisites

What must already be true before a build, a test run, a commit, or a publish can succeed
in this repository — and the check for each.

**The one rule.** A green result on one machine is not evidence about another. Not across
platforms, not between a warm clone and a cold one, not between a workstation and CI.

An unmet prerequisite here never announces itself as one. It arrives as `ENOENT`, as
`exit 127`, as a module that cannot be resolved, as a 404 page, or as a build that emits
nothing and returns zero.

---

## 1. Machine toolchain

| Need | Check | Notes |
| --- | --- | --- |
| **Node** ≥ 18 | `node --version` | 27 packages declare `>=18.0.0`; CI runs **22** (`.github/workflows/publish-npm.yml:27`); **24.19.0** is verified good. Nothing pins it locally — no `.nvmrc`, no root `engines` — so a new machine gets whatever is installed. |
| **pnpm** exactly **10.13.1** | `pnpm --version` | Declared as `packageManager` in `package.json:6`. Install with **`corepack enable`**, which reads that field and pins it. Not `npm i -g pnpm`, which pins nothing. Unmet: `pnpm: command not found`, exit 127 — and the commit gate stops with it. |
| **git** | `git --version` | — |
| **jq** ≥ 1.7 | `jq --version` | Required by the three hooks in `.claude/hooks/` and by DevArch's harness, including `git-assess.sh`, which the commit gate runs. Its absence is **silent** — see §5. |

**Windows, for `tools/winide` (Chord Writer) work only:** .NET SDK 10.x; Visual Studio
(Community suffices) with ManagedDesktop + Universal workloads; the WebView2 runtime
(usually already present on Windows 11). `makeappx.exe` and `signtool.exe` arrive
transitively via the **`Microsoft.Windows.SDK.BuildTools` NuGet package** — do not install
the Windows Kits SDK for them.

---

## 2. A cold clone builds nothing until three steps run, in order

```bash
corepack enable                          # pins pnpm to the declared version
pnpm install
npx tsf build                            # platform packages; emits the .d.ts repokit's tsc needs
pnpm --filter @sharpee/repokit build     # tsf does NOT build repokit (not in ts-forge.config.json)
./repokit build dungeo                   # only now does ./repokit exist and work
```

Skipping to a story build produces an error that reads like a broken dependency graph and
is not one:

```
@sharpee/story-concealment-test#build — cannot resolve @sharpee/engine,
  @sharpee/parser-en-us, @sharpee/lang-en-us, @sharpee/world-model     (exit 2)
```

**`pnpm build` is not a substitute for `tsf build`.** It is `turbo run build`; it misses
roughly 12 packages including `engine` and `devkit`, and dies on `platform-browser` with
`TS2307`. Once repokit exists, use `./repokit build` for everything (ADR-187).

**After pulling Mac work, the same order applies — `tsf build` first.** `packages/*/dist`
is from the old base until you rebuild it, and repokit's typecheck resolves `@sharpee/*`
types from those `dist/*.d.ts` files. Measured 2026-09-12 after a rebase onto ten new
commits: `pnpm --filter @sharpee/repokit typecheck` failed with two errors that looked like
a bad merge (`engineVersion` missing from `BrowserBuildEnv`, `version` unknown on
`PlaygroundBuildEnv`) and were actually new repokit source checked against stale devkit
types. `npx tsf build` first, then repokit, then `./repokit build`.

**Never `git add -A` after a Windows build.** `./repokit build` regenerates
`packages/sharpee/docs/genai-api/*.md` and restamps `stories/dungeo/src/version.ts`. On
Windows the generator emits OS-native separators into the committed docs — every
path-derived heading becomes `### install\story` (317 lines across 11 files, 2026-09-12;
GH issue filed) — and the restamp is date churn. Discard both after a Windows build:
`git checkout -- packages/sharpee/docs/genai-api stories/dungeo/src/version.ts`. The fix
for the generator belongs on the Mac.

---

## 3. Before tests, before a commit

| Need | Check | Without it |
| --- | --- | --- |
| **`dist/cli/sharpee.js` exists** | `ls dist/cli/sharpee.js` | Every transcript test and `pnpm test:scripts` spawns this bundle rather than importing packages. `./repokit build` produces it, so it inherits every prerequisite above. |
| **A story is named** | — | There is no default story (removed 2026-07-19). `--test` infers it from the transcript path's `stories/<name>/` prefix; `--play` and `--exec` require an explicit `--story`. |

Do not use `2>&1` with `pnpm` commands.

**The commit gate runs the suite (DevArch rule 14), so every prerequisite above is also a
commit prerequisite** — including on a docs-only diff with no TypeScript in it. That is
not hypothetical: a documentation commit was blocked twice in one session, first by a
missing `pnpm` and then by an unbuilt clone, neither related to the diff.

---

## 4. Before a publish

| Need | Notes |
| --- | --- |
| **Publish from the workflow, never locally** | `tsf publish` from a workstation fails `EOTP` — npm's 2FA needs a browser handshake and an interactive terminal. No token or `--otp` fixes it. Dispatch `.github/workflows/publish-npm.yml`; it uses OIDC trusted publishing. |
| **Versions committed before dispatch** | The workflow stamps with `./repokit build --no-genai`, then runs `git diff --exit-code`. |
| **A brand-new package hand-published once first** | Trusted publishing is configured per package at `npmjs.com/package/<name>/access`, a page that does not exist until the package does. **No dry run catches this** — a dry run never issues the `PUT` — and it fails *mid-release*, stranding every package behind it in dependency order. Procedure: `docs/core-concepts/README.md`, "First publish of a new package". |

---

## 5. Two failure modes that are silent

Worth separating from the rest, because nothing reports them.

**jq's absence disables hooks without a word.** Every call site swallows the error and
reads the empty result as "nothing to do": `post-tool-use.sh:16-18` exits 0 on an empty
`TOOL_NAME`, so the rule 17 budget banner stops appearing; `boundary-check.sh:35-39` falls
to `*) exit 0`, so the rule 8a advisory stops firing. The session looks entirely normal
with two of three hooks switched off.

**jq writes CRLF on Windows**, which survives into multi-line output and breaks any
`while read` consuming it. The mechanism, the `-b` version floor, and the central fix live
in DevArch: `../devarch/docs/prerequisites.md`, and the incident in the header of
`~/.claude/hooks/jq-compat.sh`. One copy, one owner. **This repository's own exposure:**
none of the three hooks in `.claude/hooks/` sources `jq-compat.sh`. They are safe today
only because every jq call is a single-line `$(… | jq -r …)`, the one shape MSYS rescues.
The first multi-line jq call added there breaks on Windows, quietly. Use `jq-compat.sh` —
or Node, already a prerequisite and LF everywhere.

---

## 6. Ordering inside the build

`./repokit build` satisfies these itself; they bite only when package builds are run by
hand, out of order.

- The standard grammar's registration module is generated from Chord source **before**
  `parser-en-us` compiles (ADR-269 D7).
- The stdlib manifest is generated from stdlib **source** — no dist needed — **before**
  `chord` compiles, because the analyzer imports it (ADR-276 D2).

Both are committed and freshness-gated in `./repokit verify`.

---

## 7. Cross-platform: what "works on macOS" does not tell you

Node-ecosystem CLIs are executables on macOS and **`.CMD` shims on Windows**. Measured on
Windows 11 / Node v24.19.0:

```
execFileSync('pnpm', ['--version'])                    -> ENOENT
execFileSync('<abs>/node_modules/.bin/tsf', [...])     -> ENOENT   (the POSIX shim)
execFileSync('<abs>/node_modules/.bin/tsf.CMD', [...]) -> EINVAL   (CVE-2024-27980 hardening)
execFileSync('<abs>/node_modules/.bin/tsf.ps1', [...]) -> EFTYPE
```

A `.cmd` can only be launched through a shell, but passing an args array *with*
`shell: true` is deprecated in Node 24 (`DEP0190`) and emits a stderr warning per call —
which the AC-13 CLI real-path test treats as failure noise — besides leaving arguments
unescaped. The working shape is one pre-quoted command line with no args array.

**Subprocess code in this repository goes through `tools/repokit/src/proc.ts` (`runTool`),
not `node:child_process` directly.** That module is the one place this difference is
handled, and it carries these measurements in its header.

**Test suites carry the same exposure.** `tools/repokit/src/commands/build.test.ts` passed
on macOS for its whole life while asserting a POSIX-only call shape, and failed only once
the code under test began working correctly on Windows. A suite that has never run on a
second platform has not been tested there.

---

## Verification

```bash
node --version && pnpm --version && git --version && jq --version
jq -b -n 0 >/dev/null && echo "jq -b: OK" || echo "jq -b: TOO OLD — need 1.7+"
ls dist/cli/sharpee.js                   # transcript tests need this
```

---

## See also

- `docs/core-concepts/README.md` — concepts, package inventory, the three command lines,
  and the full npm publishing procedure
- `../devarch/docs/prerequisites.md` — the DevArch harness's own machine-global list
- `.claude/skills/repokit-build/` — the `./repokit` command and flag reference
- `docs/core-concepts/transcript-testing.md` — transcript syntax, assertions, CLI flags
