# Session Plan: Fix ADR-274 — bundled CLI cannot cold-transpile a hatched story

**Created**: 2026-07-25
**Overall scope**: Two structural edits (mark esbuild external in the CLI bundle; turn a silent hang into a named error in the hatch transpile) plus cache-cold acceptance verification against the `friendly-zoo` transcript suites.
**Bounded contexts touched**: N/A — infrastructure/tooling (build/bundle plumbing in `tools/repokit`, standalone transpile helper in `packages/devkit`). Not domain-affecting; plain technical framing throughout.
**Key domain language**: N/A (see above). Platform terms used for precision: hatch module, cold/warm transpile path, bundle-external.

## References consulted
- `docs/architecture/adrs/adr-274-bundled-cli-cold-hatch-transpile.md` — ACCEPTED, all questions resolved; this plan implements its D1 (mark esbuild external in the CLI bundle) and D2 (named `HatchTranspileError` instead of an unbounded hang) verbatim, and its 4 Acceptance items are this plan's exit gate.
- `docs/architecture/adrs/adr-187-devkit-author-only-split-inrepo-build.md` — repokit owns the platform/CLI bundle build; devkit owns the author tool. D1's edit belongs in `tools/repokit/src/commands/bundle.ts`, not in devkit.
- `docs/architecture/adrs/adr-180-build-test-devkit.md` — devkit is the author tool (`./sharpee`), redirected to repokit for workspace stories; confirms `packages/devkit/src/standalone/hatch-transpile.ts` is the right (and only) place for the D2 error-path edit.
- `docs/architecture/adrs/adr-259-chord-browser-build-hatch-modules.md` — D6: `requireHatchModule` is the CLI-side resolver for a hatch module and must stay unchanged in *contract* (authored `.ts` resolves to source, cache keyed by content hash); this plan's D2 edit wraps the existing `buildSync` call, it does not change what gets transpiled or how the cache is keyed.
- `docs/architecture/adrs/adr-252-story-first-class-browser-build.md` — D2's "a story needs no `package.json`/`tsconfig`" promise is the reason the load-time transpile exists at all; ADR-274 explicitly does not reopen it, so this plan must not reintroduce a build-time compile step.
- `docs/architecture/adrs/adr-273-grammar-scope-resolver-world-api.md` — D3 (fail closed, but never silently) is the principle ADR-274's D2 explicitly reapplies one layer up; the named-error requirement in Phase 2 traces back to this precedent.
- `docs/context/project-profile.md` — confirms two build CLIs by design (ADR-187): `./repokit` for platform/bundle work (this plan's Phase 1), `./sharpee` for authors — do not conflate; esbuild is already a workspace build dependency (used for CLI/browser bundling), so marking it `--external` only changes *when* it resolves (runtime vs. bundle-inlined), not whether it's present.
- `docs/context/session-20260725-62d511-main.md` (most recent session by filename sort) — no open items or blockers bear on this plan's scope (that session's open items are npm-publish Part D/E and README follow-ups); noted only to confirm no conflicting in-flight work.

## Phases

### Phase 1: D1 — mark esbuild external in the CLI bundle, verify build.sh parity claim
- **Tier**: Small
- **Budget**: ~40 tool calls
- **Domain focus**: N/A (infrastructure). Owner: `tools/repokit` (ADR-187).
- **Entry state**: `tools/repokit/src/commands/bundle.ts` line 38 passes exactly one external (`--external:readline`); no `--external:esbuild` flag exists; `dist/cli/sharpee.js` currently inlines esbuild.
- **Deliverable**:
  - Add `'--external:esbuild'` to the `args` array in `runBundle` (`tools/repokit/src/commands/bundle.ts`), alongside the existing `--external:readline`.
  - Resolve the header comment's "byte-for-byte parity with build.sh (build_bundle, 580-630)" claim: confirmed this session that no repo-root `build.sh` exists (only unrelated `packages/core/build.sh` and `packages/if-domain/build.sh`) — the parity contract is historical/documentary, not a live second script to update. Update the header comment to say so plainly (or strike the now-stale line-number reference) so the next reader doesn't go looking for a `build.sh` that isn't there.
  - Rebuild the CLI bundle via `./repokit build` (or the narrower bundle step if repokit exposes one) so `dist/cli/sharpee.js` reflects the new external.
- **Exit state**: `dist/cli/sharpee.js` no longer inlines esbuild (`require('esbuild')` resolves at runtime from workspace `node_modules`); bundle.ts's header comment accurately describes the parity contract (or its absence); bundle rebuilt successfully via `./repokit build`.
- **Status**: DONE (2026-07-25)

### Phase 2: D2 — named HatchTranspileError on cold-transpile failure, no unbounded hang
- **Tier**: Small
- **Budget**: ~50 tool calls
- **Domain focus**: N/A (infrastructure). Owner: `packages/devkit/src/standalone/hatch-transpile.ts` (`requireHatchModule` / `transpileToCjs`).
- **Entry state**: Phase 1 complete (bundle no longer inlines esbuild). `transpileToCjs` (lines 40-75) does `require('esbuild')` at line 43 with no guard, then calls `esbuild.buildSync` at line 56 with no timeout/watchdog; the cache check (`existsSync(outPath)`, line 54) already runs before esbuild is touched and must not move or gain a second check.
- **Deliverable**:
  - Define `HatchTranspileError` (name `HatchTranspileError`) with the exact message contract from ADR-274 D2: `` Cannot transpile <file>: esbuild is not available to the CLI bundle. Run pnpm install in the workspace (or reinstall the sharpee CLI). ``, `<file>` = `sourcePath`.
  - Guard the `require('esbuild')` / `buildSync` path so unavailability or a dead worker throws `HatchTranspileError` instead of hanging — e.g. wrap the require in try/catch (module-not-found case) and, if a preflight is needed for the dead-worker case, add the minimal check ADR-274 allows ("a watchdog or preflight check around the sync call is acceptable; an unbounded `Atomics.wait` is not").
  - Do not touch the line-54 `existsSync` cache check or the cache-key derivation (ADR-259 D6 contract) — this phase only wraps the esbuild call itself.
  - Write a unit test (new or in an existing devkit test file, e.g. alongside `packages/devkit/tests/hatch-host-parity.test.ts`) asserting: (a) the warm path still costs exactly one `existsSync` and never touches esbuild; (b) simulated esbuild-unavailable throws an error named `HatchTranspileError` whose message contains the remedy text ("Run pnpm install in the workspace").
- **Exit state**: `HatchTranspileError` exists and is thrown (not a hang) when esbuild is unavailable; warm-path behavior unchanged (still one `existsSync`, still returns cached path without invoking esbuild); new unit test(s) green.
- **Status**: DONE (2026-07-25)

### Phase 3: Acceptance verification — cache-cold friendly-zoo regression set
- **Tier**: Small
- **Budget**: ~30 tool calls
- **Domain focus**: N/A (infrastructure/test verification).
- **Entry state**: Phases 1 and 2 complete; `dist/cli/sharpee.js` rebuilt with esbuild external and the D2 error path in place.
- **Deliverable**: Run the four ADR-274 Acceptance items against the rebuilt bundle:
  1. Delete `$TMPDIR/sharpee-hatch` (the cache dir), then run `node dist/cli/sharpee.js --test stories/friendly-zoo/tests/transcripts/*.transcript` cache-cold — all suites must complete green (no hang).
  2. Re-run the same command warm (cache populated from step 1) and confirm no regression to the cached path (one `existsSync`, no re-invocation of esbuild) — covered by the Phase 2 unit test, spot-checked here against the real bundle.
  3. Confirm the error path is reachable and correctly shaped: either via the Phase 2 unit test or, if feasible without fragile environment tampering, a targeted manual check that an esbuild-unavailable condition throws `HatchTranspileError` with the remedy message rather than hanging.
  4. Record `friendly-zoo`'s transcript suites (cache-cold) as the standing regression set for this defect class in the work summary.
  - Per CLAUDE.md: never auto-retry a failed build/test — if any of the above fails, report and wait rather than looping on fix-rebuild cycles.
- **Exit state**: All 4 ADR-274 Acceptance items verified and recorded; `HatchTranspileError` behavior and the cache-cold fix are confirmed against the real bundle, not just unit tests (Integration Reality: `dist/cli/sharpee.js` running `friendly-zoo` cache-cold is the real-path test for the OWNED esbuild-inlining dependency — no stub stands in for it).
- **Status**: DONE (2026-07-25)

