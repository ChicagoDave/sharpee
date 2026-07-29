/**
 * consumer-gen.test.ts — unit tests for the drift-free consumer-package generator.
 * Derived from the Behavior Statements for computeClosure and generateConsumer.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  computeClosure,
  scanStaging,
  readSharpeeSeed,
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
    writePkg(join(staging, 'transcript-tester'), '@sharpee/transcript-tester', []);
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
