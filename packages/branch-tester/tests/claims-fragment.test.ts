/**
 * claims-fragment.test.ts — Fernhill's claims fragment, selected by its test
 * tree's manifest, compiles to the same claim set the measured JSON corpus
 * declares (ADR-365 D7, AC-6).
 *
 * The manifest names the fragment; the fragment is compiled against the
 * story by `@sharpee/chord`'s `compileClaims`; the result is normalized by
 * this package's gate and compared, claim for claim, with the fixture the
 * real-path test runs. The translation from the sidecar to Chord was
 * mechanical, and this is what says so. Skipped, like the corpus sweeps,
 * when the repository's corpus is not configured.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, compileClaims } from '@sharpee/chord';
import { assembleTree, TREE_MANIFEST_FILE_NAME, type TreeFiles } from '../src/tree-document.js';
import { normalizeClaimSet } from '../src/claims/claim-set.js';

const corpus = process.env.SHARPEE_TRANSCRIPT_CORPUS;
const STORY = corpus ? resolve(corpus, 'fernhill/fernhill.story') : undefined;
const TREE = corpus ? resolve(corpus, 'fernhill/fernhill.tests') : undefined;
const FIXTURE = resolve(__dirname, 'fixtures/claims/fernhill.json');

const describeWithCorpus = STORY && existsSync(STORY) && TREE && existsSync(TREE) ? describe : describe.skip;

/** The tree directory as the reader takes it: file name to contents. */
function treeFiles(dir: string): TreeFiles {
  const files: TreeFiles = {};
  for (const name of readdirSync(dir)) files[name] = readFileSync(resolve(dir, name), 'utf8');
  return files;
}

function fsResolver(storyDir: string): (fragment: string) => string | null {
  return (fragment) => {
    const full = resolve(storyDir, fragment);
    return existsSync(full) ? readFileSync(full, 'utf8') : null;
  };
}

describeWithCorpus('Fernhill\'s claims fragment through the manifest (ADR-365 D7, AC-6)', () => {
  it('the manifest names the fragment', () => {
    const read = assembleTree(treeFiles(TREE!));
    expect(read.status).toBe('ok');
    if (read.status === 'ok') expect(read.document.claims).toBe('fernhill.claims.chord');
    expect(JSON.parse(treeFiles(TREE!)[TREE_MANIFEST_FILE_NAME])).toHaveProperty('claims', 'fernhill.claims.chord');
  });

  it('the fragment compiles against the story to exactly the claim set the measured corpus declares', () => {
    const read = assembleTree(treeFiles(TREE!));
    if (read.status !== 'ok') throw new Error(read.message);
    const storyDir = dirname(STORY!);
    const fragmentPath = resolve(storyDir, read.document.claims!);
    const result = compileClaims(readFileSync(STORY!, 'utf8'), readFileSync(fragmentPath, 'utf8'), {
      importResolver: fsResolver(storyDir),
      claimsFile: read.document.claims,
    });
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.code}: ${d.message}`)).toEqual([]);
    expect(result.ok).toBe(true);

    const fromChord = normalizeClaimSet(result.claims, read.document.claims!);
    const fromJson = normalizeClaimSet(JSON.parse(readFileSync(FIXTURE, 'utf8')), 'fernhill.json');
    expect(fromChord.set).toEqual(fromJson.set);
    expect(fromChord.claims).toEqual(fromJson.claims);
  });

  it('AC-6: the story compiles to the same IR whether or not the fragment is read, and the IR carries no claim', () => {
    const storyDir = dirname(STORY!);
    const source = readFileSync(STORY!, 'utf8');
    const plain = compile(source, { importResolver: fsResolver(storyDir) });
    const withClaims = compileClaims(source, readFileSync(resolve(storyDir, 'fernhill.claims.chord'), 'utf8'), { importResolver: fsResolver(storyDir) });
    expect(plain.ok && withClaims.ok).toBe(true);
    expect(JSON.stringify(withClaims.ir)).toBe(JSON.stringify(plain.ir));
    expect(Object.keys(plain.ir)).not.toContain('claims');
    expect(JSON.stringify(plain.ir)).not.toContain('the deed box leaves the Folly');
  });
});
