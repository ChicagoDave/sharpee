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
import { findControlBytes, formatControlByteFailure } from './control-bytes';
import { checkDocsBlocksModule, checkGrammarModule } from './grammar';
import { checkManifestModule } from './manifest';
import { checkRandomGate, formatRandomGateFailure } from './random-gate';
import { join } from 'node:path';

export class VerifyCommand implements Command {
  readonly name = 'verify';
  readonly summary = 'tsf build --npm + publish dry-run';

  run(args: string[]): number {
    const quiet = args.includes('--quiet');
    const root = findRepoRoot();
    const tsf = tsfBin(root);
    const log = (m: string) => !quiet && console.log(m);
    const stdio = quiet ? 'ignore' : 'inherit';

    // ADR-269 D7 freshness gate: a stale generated grammar module is a build
    // error, never a silent divergence.
    log('=== repokit verify: grammar --check ===');
    if (!checkGrammarModule(root)) {
      console.error(
        'verify: parser-en-us/src/grammar.ts is STALE against grammar/standard-en-us.story — run `repokit grammar` and commit.',
      );
      return 1;
    }
    // ADR-272 D5: the docs data module rides the same gate.
    if (!checkDocsBlocksModule(root)) {
      console.error(
        'verify: website grammar-blocks.ts is STALE against grammar/standard-en-us.story — run `repokit grammar` and commit.',
      );
      return 1;
    }
    // ADR-276 D2 / ADR-310 Phase 3: a stale generated manifest is a build
    // error, never silent drift.
    if (!checkManifestModule(root)) {
      console.error(
        'verify: chord/src/stdlib-manifest.ts or character-manifest.ts is STALE against the platform sources — run `repokit manifest` and commit.',
      );
      return 1;
    }

    // ADR-289 D7: a raw control byte in source is a build error. Nothing else
    // in the toolchain can see one — tsc compiles it, tests pass, and search
    // silently reports no matches for the whole file — so nothing else can
    // gate it.
    log('=== repokit verify: control bytes ===');
    const controlBytes = findControlBytes(root);
    if (controlBytes.length > 0) {
      console.error(formatControlByteFailure(controlBytes));
      return 1;
    }

    // ADR-293 D6 (A1 ruling 1): the split entropy gate — strict path check
    // for createSeededRandom(), checked-in allowlist for Math.random() /
    // crypto.randomUUID(). Only NEW entropy fails.
    log('=== repokit verify: ADR-293 D6 entropy gate ===');
    const randomGateFailures = checkRandomGate(
      root,
      join(root, 'tools', 'repokit', 'entropy-allowlist.txt'),
    );
    if (randomGateFailures.length > 0) {
      console.error(formatRandomGateFailure(randomGateFailures));
      return 1;
    }

    log('=== repokit verify: tsf build --npm ===');
    execFileSync(tsf, ['build', '--npm'], { cwd: root, stdio });
    log('=== repokit verify: tsf publish --tag beta --dry-run ===');
    execFileSync(tsf, ['publish', '--tag', 'beta', '--dry-run'], { cwd: root, stdio });
    log('verify: npm build + publish dry-run OK');
    return 0;
  }
}
