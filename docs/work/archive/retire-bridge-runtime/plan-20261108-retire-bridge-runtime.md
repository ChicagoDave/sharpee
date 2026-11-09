# Session Plan: Retire @sharpee/bridge and @sharpee/runtime to packages/_archive

**Created**: 2026-11-08
**Plan Status**: DONE
**Overall scope**: Archive `packages/bridge` and `packages/runtime` the way `packages/interpreter` was retired on 2026-08-13 (commit a01ca3701 `git mv`; commit 14d398b5e annotated the ADRs). Lantern, the private authoring tool both were built for, is dead; neither package has an in-repo consumer, npm publish, bundle step, or test. David's ruling, 2026-11-08. Do not expand the touch list below.
**Bounded contexts touched**: N/A — repository housekeeping / retirement (infrastructure, docs)
**Key domain language**: retired package, `packages/_archive/`, RETIRED block, runtime-surface

## References consulted
- `docs/architecture/adrs/adr-135-native-engine-bridge-protocol.md` — the bridge protocol ADR; gets a RETIRED block, stands as written.
- `docs/architecture/adrs/adr-392-sensory-traits-and-the-trait-words-of-664.md` — highest current ADR; the new ADR is 393.
- `docs/core-concepts/README.md` — `@sharpee/interpreter` RETIRED entry is the style to copy.
- Historical mentions needing no edit (records of what was true when written): ADR-342 line 19, ADR-344 lines 132 and 278, ADR-345 lines 11, 102 and 126, ADR-387 line 9.
- Product ADRs not consulted (no Scope intersection): none consulted; this plan touches no product-kind Scope path.

## Phases

### Phase 1: Retire bridge and runtime
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: repository packaging; archive convention (`packages/_archive/`)
- **Entry state**: main clean; `packages/bridge`, `packages/runtime` in place; `pnpm-workspace.yaml` already excludes `!packages/_archive/**`.
- **Deliverable**:
  1. `git mv packages/bridge packages/_archive/bridge` and `git mv packages/runtime packages/_archive/runtime`; add a comment in `pnpm-workspace.yaml` beside the interpreter one naming the retirement.
  2. Delete `packages/sharpee/src/runtime-surface.ts`; remove the `"./runtime-surface"` export from `packages/sharpee/package.json`; check `packages/sharpee/tsconfig.json` and any `typesVersions` for a matching entry.
  3. Remove `packages/runtime/src/index.ts,packages/bridge/src/index.ts` from the cpd exclusions at `sonar-project.properties:14`.
  4. `docs/core-concepts/README.md` lines 87-89: replace both entries with a one-line RETIRED note in the style of the interpreter entry (line 92); fix the package count at line 28 if it changes.
  5. Add a RETIRED block under Status in `docs/architecture/adrs/adr-135-native-engine-bridge-protocol.md` (stands as written; Lantern dead; archive path `packages/_archive/bridge`). ADR-342/344/345/387 are historical and are not edited.
  6. `pnpm install` to refresh `pnpm-lock.yaml` (entries near lines 158 and 918 go).
  7. New ADR `docs/architecture/adrs/adr-393-retire-bridge-and-runtime.md` (new): Kind process; Context/Decision/Consequences/Session. Decision: both retired; a future out-of-process engine host is a thin transport over `@sharpee/bootstrap` (ADR-180), never a hand-copied engine assembly; ADR-135 stands as written.
  8. After the commit lands, close GH #409 and #475 (tsf validate skipping them) with evidence comments.
- **Files**: `packages/bridge/`, `packages/runtime/`, `packages/_archive/bridge/` (new), `packages/_archive/runtime/` (new), `pnpm-workspace.yaml`, `packages/sharpee/src/runtime-surface.ts`, `packages/sharpee/package.json`, `packages/sharpee/tsconfig.json`, `sonar-project.properties`, `docs/core-concepts/README.md`, `docs/architecture/adrs/adr-135-native-engine-bridge-protocol.md`, `docs/architecture/adrs/adr-393-retire-bridge-and-runtime.md` (new), `pnpm-lock.yaml`
- **Exit state**: both packages live only under `packages/_archive/`; no live reference remains outside historical ADR lines; ADR-393 written; lockfile refreshed; change committed locally; #409 and #475 closed.
- **Demonstration**: `./repokit build dungeo` exits 0; root `npx tsc --noEmit` is clean; the sharpee umbrella build (pnpm filter "@sharpee/sharpee", build) is clean; and a ripgrep for "@sharpee/bridge|@sharpee/runtime|runtime-surface" across the repo (excluding node_modules, dist*, docs/unofficial, docs/context, docs/work, packages/_archive, tools/_archive) returns only the historical ADR lines (342, 344, 345, 387). The Dungeo transcript chain is not run: the move touches no story or engine code.
- **Demonstrated**: 2026-11-08, session 72d34d. `./repokit build dungeo` exit 0 (bundle dist/cli/sharpee.js 5,311,030 bytes). Root `npx tsc --noEmit` exit 0. `pnpm --filter '@sharpee/sharpee' build` (tsc + tsc -p tsconfig.esm.json) clean. Ripgrep for `@sharpee/bridge|@sharpee/runtime|runtime-surface` with the plan's exclusions returned, beyond the files this phase wrote (ADR-393, ADR-135 annotation, core-concepts README, pnpm-workspace.yaml), only ADR-334 line 33 and ADR-342 line 20 (as-built notes) and ADR-152 line 192 (the unrelated `@sharpee/runtime-host` name); the earlier path grep for `packages/bridge|packages/runtime` found only ADR-342/344/345/387, all historical. `pnpm install` dropped both lockfile importers. Out of scope: `stories/dungeo/src/version.ts` (build stamp). Items 1–7 landed; item 8 (#409, #475) closes after the phase commit. The pre-move real-path probe (`node packages/bridge/dist/bridge-entry.js`, Dungeo via `storyPath`) returned `ready 1.0.0` then `start failed: Cannot find tsconfig file "stories/dungeo/src/tsconfig.json"`, recorded in ADR-393's Context. [verified: build passed, 2026-11-09T03:21:51Z, after the last source edit at 03:21:07Z; tsc, umbrella build, ripgrep and the pre-move probe: reported by session, unverified]
- **Status**: DONE
