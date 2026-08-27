---
name: repokit-build
description: Build the Sharpee platform and in-repo stories with ./repokit — cold-start bootstrap for a fresh clone, the full command and flag reference, build outputs, and the version-stamping rules. Use when building, cleaning, verifying, or bundling anything in this repository.
user_invocable: true
---

# Building with `./repokit`

> Scoped to in-repo platform and story builds. The two-CLI rule, the "use `./repokit build`,
> not manual `pnpm build`" directive, and the `pnpm build` gotcha live in the root `CLAUDE.md`
> and are always loaded — this file is the reference detail behind them.

## Cold start (fresh clone only)

Two bootstrap steps before `./repokit` exists:

```bash
pnpm install
npx tsf build                            # platform packages; emits the .d.ts repokit's tsc needs
pnpm --filter @sharpee/repokit build     # tsf does NOT build repokit (not in ts-forge.config.json)
./repokit build dungeo
```

Once `./repokit` is built these steps are never needed again — `./repokit clean
&& ./repokit build dungeo` rebuilds the whole tree unaided (verified
2026-07-28). `clean` preserves repokit's own `dist/`, and repokit loads
`@sharpee/devkit` only for `--browser`/`--playground`.

## Commands

```bash
# Show help
./repokit

# Common platform workflows (in-repo)
./repokit build dungeo               # Build platform + story, then bundle
./repokit build dungeo --browser     # + self-contained browser client (dist/web/dungeo/)
./repokit build dungeo --skip stdlib # Resume the platform build from stdlib
./repokit clean                      # Remove dist/, dist-esm/, tsbuildinfo
./repokit verify                     # tsf build --npm + publish dry-run
```

Use `--skip <pkg>` to resume a platform build and avoid slow full rebuilds.

## Outputs

- `dist/cli/sharpee.js` — Platform bundle (CLI, testing). Always use this for testing —
  much faster than loading individual packages.
- `dist/web/{story}/` — Self-contained single-player browser client (`--browser`)

## Version system

- Versions use plain `X.Y.Z` — no `-beta` suffix, no timestamp (the npm `beta` DIST-TAG is
  separate from the version string)
- Version stamping runs FIRST, before any compilation

## Multi-user (zifmia) — RETIRED 2026-08-13

The name was misused and the tool was never in active development; `repokit`'s `--zifmia` flag
and its `zifmia` command are removed, and the source is archived at `tools/_archive/zifmia`,
outside the pnpm workspace. Its two real-path test suites were pinned to the `.sharpee` bundle
format, which is itself deprecated. `tools/shite` — the same server under a second name, which
is the misuse being retired — is archived alongside it at `tools/_archive/shite`. The legacy
Tauri `--runner` was dropped earlier (ADR-180).
