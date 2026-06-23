/**
 * verify.ts — `repokit verify`: publish verification (ADR-187, ported from devkit).
 *
 * Builds the npm output via tsf and dry-runs the publish, so the staged packages
 * are proven installable/publishable without releasing.
 *
 * Public interface: VerifyCommand.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */
import { execFileSync } from 'node:child_process';
import { findRepoRoot, tsfBin } from '../repo';
import { Command } from './command';

export class VerifyCommand implements Command {
  readonly name = 'verify';
  readonly summary = 'tsf build --npm + publish dry-run';

  run(args: string[]): number {
    const quiet = args.includes('--quiet');
    const root = findRepoRoot();
    const tsf = tsfBin(root);
    const log = (m: string) => !quiet && console.log(m);
    const stdio = quiet ? 'ignore' : 'inherit';

    log('=== repokit verify: tsf build --npm ===');
    execFileSync(tsf, ['build', '--npm'], { cwd: root, stdio });
    log('=== repokit verify: tsf publish --tag beta --dry-run ===');
    execFileSync(tsf, ['publish', '--tag', 'beta', '--dry-run'], { cwd: root, stdio });
    log('verify: npm build + publish dry-run OK');
    return 0;
  }
}
