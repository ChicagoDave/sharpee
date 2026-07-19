/**
 * standalone-build.test.ts — REAL-PATH gate for the standalone `sharpee build`
 * (ADR-180 U2). Stands up an out-of-workspace consumer project for the bundled
 * fixture, installs its `@sharpee` closure from the local `tsf build --npm` staging,
 * and runs the production CLI (`node dist/cli.js build`) in standalone mode — the
 * detection (no pnpm-workspace.yaml/packages/core above the temp dir) routes to the
 * standalone path. Asserts a `.sharpee` bundle is produced. No stubs.
 *
 * Gated (DEVKIT_INTEGRATION=1 + local staging present) for speed; executed as the
 * U2 standalone Integration-Reality gate.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateConsumer } from '../consumer-gen.js';

// Local tsf npm staging (was DEFAULT_STAGING in the since-removed test-npm command,
// now repokit's; this gate keeps its own constant — ADR-187 full separation).
const DEFAULT_STAGING = join(homedir(), '.tsf-publish', 'sharpee');
const integration = process.env.DEVKIT_INTEGRATION === '1' && existsSync(DEFAULT_STAGING);

/** Minimal consumer tsconfig (the standalone build runs `npx tsc` against it). */
const TSCONFIG = {
  compilerOptions: {
    target: 'ES2022',
    module: 'CommonJS',
    moduleResolution: 'node',
    lib: ['ES2022', 'DOM'],
    outDir: 'dist',
    rootDir: 'src',
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    declaration: false,
    resolveJsonModule: true,
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'dist', 'src/browser-entry.ts', 'src/**/*.test.ts'],
};

describe.skipIf(!integration)('standalone `sharpee build` (real-path)', () => {
  it('compiles an out-of-repo fixture project and emits a .sharpee bundle', () => {
    const fixture = join(__dirname, '..', '..', 'fixtures', 'basic-story');
    const cli = join(__dirname, '..', '..', 'dist', 'cli.js');
    const tmp = mkdtempSync(join(tmpdir(), 'devkit-standalone-'));
    try {
      // Consumer project (@sharpee closure from local staging tarballs).
      const vendor = join(tmp, 'vendor');
      mkdirSync(vendor, { recursive: true });
      generateConsumer({
        mode: 'local',
        storyPkgPath: join(fixture, 'package.json'),
        stagingDir: DEFAULT_STAGING,
        vendorDir: vendor,
        outPkgPath: join(tmp, 'package.json'),
      });
      cpSync(join(fixture, 'src'), join(tmp, 'src'), { recursive: true });
      writeFileSync(join(tmp, 'tsconfig.json'), JSON.stringify(TSCONFIG, null, 2));
      execFileSync('npm', ['install', '--no-fund', '--no-audit'], { cwd: tmp, stdio: 'ignore' });

      // Production CLI, standalone mode (temp dir is not the Sharpee monorepo).
      execFileSync('node', [cli, 'build'], { cwd: tmp, stdio: 'inherit' });

      const produced = readdirSync(join(tmp, 'dist')).filter((f) => f.endsWith('.sharpee'));
      expect(produced.length).toBeGreaterThan(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 600_000);
});
