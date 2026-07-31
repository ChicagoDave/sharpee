/**
 * consumer-gen.test.ts — unit tests for the drift-free consumer-package generator.
 * Derived from the Behavior Statements for computeClosure and generateConsumer.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  computeClosure,
  scanStaging,
  readSharpeeSeed,
  declaredSharpeeDeps,
  stagingDepsOf,
  assertVendoredClosureComplete,
  generateConsumer,
  packFilenameFrom,
} from './consumer-gen';

describe('computeClosure', () => {
  it('returns the full transitive set including the seed', () => {
    const deps: Record<string, string[]> = {
      '@sharpee/engine': ['@sharpee/core', '@sharpee/world-model'],
      '@sharpee/world-model': ['@sharpee/core'],
      '@sharpee/core': [],
    };
    const closure = computeClosure(['@sharpee/engine'], (n) => deps[n] ?? []);
    expect([...closure].sort()).toEqual(['@sharpee/core', '@sharpee/engine', '@sharpee/world-model']);
  });

  it('terminates on cycles', () => {
    const deps: Record<string, string[]> = {
      '@sharpee/a': ['@sharpee/b'],
      '@sharpee/b': ['@sharpee/a'],
    };
    const closure = computeClosure(['@sharpee/a'], (n) => deps[n] ?? []);
    expect([...closure].sort()).toEqual(['@sharpee/a', '@sharpee/b']);
  });
});

describe('assertVendoredClosureComplete', () => {
  it('accepts a set whose declared @sharpee deps are all vendored', () => {
    const declared: Record<string, string[]> = {
      '@sharpee/engine': ['@sharpee/core'],
      '@sharpee/core': [],
    };
    expect(() =>
      assertVendoredClosureComplete(['@sharpee/engine', '@sharpee/core'], (n) => declared[n] ?? []),
    ).not.toThrow();
  });

  it('throws naming the unvendored dep and the package that requires it', () => {
    // The #201 shape: transcript-tester is vendored, its bootstrap dep is not, so npm
    // would resolve bootstrap from the registry and fail install with ETARGET.
    const declared: Record<string, string[]> = {
      '@sharpee/transcript-tester': ['@sharpee/core', '@sharpee/bootstrap'],
      '@sharpee/core': [],
    };
    expect(() =>
      assertVendoredClosureComplete(
        ['@sharpee/transcript-tester', '@sharpee/core'],
        (n) => declared[n] ?? [],
      ),
    ).toThrow(/@sharpee\/bootstrap \(required by @sharpee\/transcript-tester\)/);
  });
});

describe('packFilenameFrom', () => {
  it('reads the array shape emitted by npm <= 11', () => {
    const stdout = JSON.stringify([
      { id: '@sharpee/core@4.3.0', name: '@sharpee/core', filename: 'sharpee-core-4.3.0.tgz' },
    ]);
    expect(packFilenameFrom(stdout, '@sharpee/core')).toBe('sharpee-core-4.3.0.tgz');
  });

  it('reads the package-keyed object shape emitted by npm 12', () => {
    const stdout = JSON.stringify({
      '@sharpee/core': {
        id: '@sharpee/core@4.3.0',
        name: '@sharpee/core',
        version: '4.3.0',
        filename: 'sharpee-core-4.3.0.tgz',
        files: [],
      },
    });
    expect(packFilenameFrom(stdout, '@sharpee/core')).toBe('sharpee-core-4.3.0.tgz');
  });

  it('names npm pack and the package when neither shape yields a filename', () => {
    // The pre-fix failure was a bare "Cannot read properties of undefined (reading 'filename')",
    // which named neither the tool nor the package (#199).
    expect(() => packFilenameFrom('{}', '@sharpee/core')).toThrow(
      /npm pack --json: unexpected output shape — no entry with a filename for @sharpee\/core/,
    );
    expect(() => packFilenameFrom('[]', '@sharpee/engine')).toThrow(/for @sharpee\/engine/);
    expect(() => packFilenameFrom(JSON.stringify([{ name: 'x' }]), '@sharpee/engine')).toThrow(
      /unexpected output shape/,
    );
  });

  it('rejects non-JSON stdout, naming the package', () => {
    expect(() => packFilenameFrom('npm warn tarball mismatch\n', '@sharpee/stdlib')).toThrow(
      /npm pack --json: output was not valid JSON .* for @sharpee\/stdlib/,
    );
  });
});

describe('staging-backed generation', () => {
  let root: string;
  let staging: string;
  let storyPkg: string;

  /** Build a fake staging dir + story package.json. */
  const writePkg = (dir: string, name: string, deps: string[]) => {
    mkdirSync(dir, { recursive: true });
    const dependencies = Object.fromEntries(deps.map((d) => [d, '*']));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0', dependencies }));
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'devkit-gen-'));
    staging = join(root, 'staging');
    writePkg(join(staging, 'core'), '@sharpee/core', []);
    writePkg(join(staging, 'world-model'), '@sharpee/world-model', ['@sharpee/core']);
    writePkg(join(staging, 'engine'), '@sharpee/engine', ['@sharpee/core', '@sharpee/world-model']);
    // Mirrors the real graph (#201): transcript-tester's deps are mostly covered by any
    // story's runtime closure, except bootstrap — which no story imports at runtime.
    writePkg(join(staging, 'bootstrap'), '@sharpee/bootstrap', ['@sharpee/core']);
    writePkg(join(staging, 'transcript-tester'), '@sharpee/transcript-tester', [
      '@sharpee/engine',
      '@sharpee/bootstrap',
    ]);
    storyPkg = join(root, 'story-package.json');
    writeFileSync(
      storyPkg,
      JSON.stringify({ name: 'story', dependencies: { '@sharpee/engine': 'latest', fflate: '^0.8.0' } }),
    );
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('scanStaging maps @sharpee package names to their staging dirs', () => {
    const map = scanStaging(staging);
    expect(map['@sharpee/engine']).toBe('engine');
    expect(map['@sharpee/transcript-tester']).toBe('transcript-tester');
  });

  it('readSharpeeSeed returns only the @sharpee deps', () => {
    expect(readSharpeeSeed(storyPkg)).toEqual(['@sharpee/engine']);
  });

  it('generateConsumer (registry) declares only the seed deps, pinned (npm resolves transitive)', () => {
    const out = join(root, 'consumer-package.json');
    const result = generateConsumer({
      mode: 'registry',
      storyPkgPath: storyPkg,
      stagingDir: staging,
      vendorDir: join(root, 'vendor'),
      outPkgPath: out,
      registryVersion: '0.9.113',
    });
    expect(result.closure).toEqual(['@sharpee/engine']);
    expect(result.haveTranscriptTester).toBe(true);

    const pkg = JSON.parse(readFileSync(out, 'utf8'));
    // Only the story's direct @sharpee seed is declared; npm pulls core/world-model transitively.
    expect(pkg.dependencies).toEqual({ '@sharpee/engine': '0.9.113' });
    // transcript-tester is a dev dep (supplies the bin), not a runtime dep.
    expect(pkg.devDependencies['@sharpee/transcript-tester']).toBe('0.9.113');
    expect(pkg.dependencies['@sharpee/transcript-tester']).toBeUndefined();
    // Third-party deps are NOT declared as @sharpee deps.
    expect(pkg.dependencies.fflate).toBeUndefined();
  });

  it('declaredSharpeeDeps reports unstaged deps; stagingDepsOf filters them out', () => {
    writePkg(join(staging, 'engine'), '@sharpee/engine', ['@sharpee/core', '@sharpee/ghost']);
    const map = scanStaging(staging);
    expect(declaredSharpeeDeps(staging, map, '@sharpee/engine')).toEqual([
      '@sharpee/core',
      '@sharpee/ghost',
    ]);
    expect(stagingDepsOf(staging, map, '@sharpee/engine')).toEqual(['@sharpee/core']);
  });

  // Real-path (rule 13a): drives the production `npm pack` subprocess, no stub.
  it('generateConsumer (local) vendors transcript-tester\'s own closure as dev deps', () => {
    const out = join(root, 'consumer-package.json');
    const vendor = join(root, 'vendor');
    mkdirSync(vendor, { recursive: true });
    const result = generateConsumer({
      mode: 'local',
      storyPkgPath: storyPkg,
      stagingDir: staging,
      vendorDir: vendor,
      outPkgPath: out,
    });

    // The story's runtime closure is unchanged — bootstrap is not a runtime dep.
    expect(result.closure).toEqual(['@sharpee/core', '@sharpee/engine', '@sharpee/world-model']);
    // bootstrap is vendored solely for transcript-tester (#201: it used to be omitted,
    // so npm fell through to the registry and failed install with ETARGET).
    expect(result.devClosure).toEqual(['@sharpee/bootstrap']);

    const pkg = JSON.parse(readFileSync(out, 'utf8'));
    expect(pkg.dependencies['@sharpee/bootstrap']).toBeUndefined();
    expect(pkg.devDependencies['@sharpee/bootstrap']).toBe('file:vendor/sharpee-bootstrap-1.0.0.tgz');
    expect(pkg.devDependencies['@sharpee/transcript-tester']).toBe(
      'file:vendor/sharpee-transcript-tester-1.0.0.tgz',
    );
    // Every file: ref resolves to a tarball that actually exists on disk.
    const tarballs = new Set(readdirSync(vendor));
    for (const ref of [
      ...Object.values(pkg.dependencies as Record<string, string>),
      ...Object.values(pkg.devDependencies as Record<string, string>),
    ]) {
      if (ref.startsWith('file:vendor/')) expect(tarballs.has(ref.slice(12))).toBe(true);
    }
    // Runtime closure + bootstrap + transcript-tester, each packed once.
    expect(tarballs.size).toBe(5);
  }, 30_000);

  it('generateConsumer (local) throws before packing when a vendored dep is unstaged', () => {
    // transcript-tester declares a dep that staging does not have: previously this was
    // silently skipped and only surfaced as an ETARGET at `npm install`.
    writePkg(join(staging, 'transcript-tester'), '@sharpee/transcript-tester', ['@sharpee/ghost']);
    const vendor = join(root, 'vendor');
    mkdirSync(vendor, { recursive: true });
    expect(() =>
      generateConsumer({
        mode: 'local',
        storyPkgPath: storyPkg,
        stagingDir: staging,
        vendorDir: vendor,
        outPkgPath: join(root, 'consumer-package.json'),
      }),
    ).toThrow(/@sharpee\/ghost \(required by @sharpee\/transcript-tester\)/);
    // "before packing": nothing was written to the vendor dir.
    expect(readdirSync(vendor)).toEqual([]);
  });

  it('generateConsumer (registry) reports an empty devClosure — npm resolves transitives', () => {
    const result = generateConsumer({
      mode: 'registry',
      storyPkgPath: storyPkg,
      stagingDir: staging,
      vendorDir: join(root, 'vendor'),
      outPkgPath: join(root, 'consumer-package.json'),
      registryVersion: '4.3.0',
    });
    expect(result.devClosure).toEqual([]);
  });

  it('generateConsumer (local) throws when a seed dep is absent from staging', () => {
    writeFileSync(storyPkg, JSON.stringify({ name: 'story', dependencies: { '@sharpee/ghost': 'latest' } }));
    expect(() =>
      generateConsumer({
        mode: 'local',
        storyPkgPath: storyPkg,
        stagingDir: staging,
        vendorDir: join(root, 'vendor'),
        outPkgPath: join(root, 'consumer-package.json'),
      }),
    ).toThrow(/absent from local staging/);
  });

  it('scanStaging throws when the staging dir does not exist', () => {
    expect(() => scanStaging(join(root, 'nope'))).toThrow(/staging not found/);
  });
});
