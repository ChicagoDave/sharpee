/**
 * zifmia.ts — `devkit build --zifmia`: build the corrected multi-user server
 * (ADR-177) at tools/zifmia/ (build.sh build_zifmia_server, 996-1032).
 *
 * Owner context: @sharpee/devkit (ADR-180 Phase 3c). devkit invokes the zifmia
 * package's own build verbatim (`pnpm --filter @sharpee/zifmia build`) — it does
 * not reimplement it. Per ADR-180 the `.sharpee` story bundle is deferred, so this
 * target does not build one.
 *
 * Public interface: buildZifmiaServer(root, opts) -> void.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ZifmiaBuildOptions {
  quiet?: boolean;
}

/**
 * Build the zifmia server and surface the Story Runtime Baseline version (for the
 * operator's `docker build --build-arg BASELINE_VERSION=`).
 * @throws if tools/zifmia is absent or the build produces no dist/.
 */
export function buildZifmiaServer(root: string, opts: ZifmiaBuildOptions = {}): void {
  const log = (m: string) => !opts.quiet && console.log(m);
  const zifmiaDir = join(root, 'tools', 'zifmia');
  if (!existsSync(zifmiaDir)) throw new Error('tools/zifmia not found');

  log('=== Building zifmia (multi-user server, ADR-177) ===');
  execFileSync('pnpm', ['--filter', '@sharpee/zifmia', 'build'], {
    cwd: root,
    stdio: opts.quiet ? 'ignore' : 'inherit',
  });

  // ADR-178 §AC-3: surface the baseline version sourced from the built manifest.
  const baselineMod = join(root, 'packages', 'story-runtime-baseline', 'dist', 'index.js');
  if (existsSync(baselineMod)) {
    try {
      const ver = execFileSync('node', ['-p', `require(${JSON.stringify(baselineMod)}).BASELINE_VERSION`], {
        cwd: root,
        encoding: 'utf8',
      }).trim();
      if (ver) {
        log(`Story Runtime Baseline: v${ver}`);
        log(`  (docker build expects --build-arg BASELINE_VERSION=${ver}; docker-compose.yml does this automatically)`);
      }
    } catch {
      /* baseline version is informational only — never fail the build over it */
    }
  }

  // Invariant: assert the server dist exists (no silent success).
  const dist = join(zifmiaDir, 'dist');
  if (!existsSync(dist)) throw new Error('zifmia build produced no tools/zifmia/dist/');
  log('Output: tools/zifmia/dist/');
}
