/**
 * Playwright global setup — fail fast if the production bundles are
 * missing.
 *
 * Owner: zifmia e2e harness.
 *
 * We do not spawn a long-lived server here. Each spec spawns its own
 * via `spawnZifmiaServer` so cross-spec state (rooms, identities,
 * stories on disk) stays isolated and SIGHUP rescans don't perturb
 * a sibling spec.
 *
 * What this hook does:
 *   - Verifies `tools/zifmia/dist/main.js` exists.
 *   - Verifies `tools/zifmia/dist/web/index.html` exists (browser
 *     specs need the bundle served from /).
 *   - Verifies the repo's `dist/stories/dungeo.sharpee` exists so the
 *     seed-stories helper has something to copy.
 *
 * Failure mode: throw with a clear instruction. Per CLAUDE.md "Never
 * auto-retry failed builds": the instruction tells the user to run
 * the build, but we do not run it automatically.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ZIFMIA_DIR = resolve(__dirname, '..', '..');
const REPO_ROOT = resolve(ZIFMIA_DIR, '..', '..');

const REQUIRED = [
  {
    path: resolve(ZIFMIA_DIR, 'dist', 'main.js'),
    fix: 'pnpm --filter @sharpee/zifmia build'
  },
  {
    path: resolve(ZIFMIA_DIR, 'dist', 'web', 'index.html'),
    fix: 'pnpm --filter @sharpee/zifmia build'
  },
  {
    path: resolve(REPO_ROOT, 'dist', 'stories', 'dungeo.sharpee'),
    // .sharpee bundle building is deferred (ADR-180); use an existing dungeo.sharpee
    // until a `devkit bundle:story` command lands.
    fix: 'provide dist/stories/dungeo.sharpee (a prebuilt bundle)'
  }
];

export default async function globalSetup(): Promise<void> {
  const missing = REQUIRED.filter((r) => !existsSync(r.path));
  if (missing.length === 0) return;

  const lines = ['Zifmia E2E preflight failed — missing build artifacts:'];
  for (const m of missing) {
    lines.push(`  - ${m.path}`);
    lines.push(`    fix: ${m.fix}`);
  }
  throw new Error(lines.join('\n'));
}
