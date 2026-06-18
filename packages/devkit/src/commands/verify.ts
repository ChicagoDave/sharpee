/**
 * verify.ts — `devkit verify`: publish verification.
 *
 * Owner context: @sharpee/devkit (ADR-180 Phase 3d). Replaces the dead `publish:beta`
 * chain: builds the npm output via tsf and dry-runs the publish, so the staged
 * packages are proven installable/publishable without releasing.
 *
 * Public interface: runVerify(opts) -> void.
 */
import { execFileSync } from 'node:child_process';
import { findRepoRoot, tsfBin } from '../repo';

export interface VerifyOptions {
  root?: string;
  quiet?: boolean;
}

/** Build the npm staging (`tsf build --npm`) and dry-run the beta publish. */
export function runVerify(opts: VerifyOptions = {}): void {
  const root = opts.root ?? findRepoRoot();
  const tsf = tsfBin(root);
  const log = (m: string) => !opts.quiet && console.log(m);
  const stdio = opts.quiet ? 'ignore' : 'inherit';

  log('=== devkit verify: tsf build --npm ===');
  execFileSync(tsf, ['build', '--npm'], { cwd: root, stdio });
  log('=== devkit verify: tsf publish --tag beta --dry-run ===');
  execFileSync(tsf, ['publish', '--tag', 'beta', '--dry-run'], { cwd: root, stdio });
  log('verify: npm build + publish dry-run OK');
}
