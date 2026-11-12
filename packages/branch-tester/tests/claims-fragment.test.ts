/**
 * claims-fragment.test.ts — the lodge's claims fragment, selected by its test
 * tree's manifest, compiles to the same claim set the JSON beside it
 * declares (ADR-365 D7, AC-6).
 *
 * The manifest names the fragment; the fragment is compiled against the
 * story by `@sharpee/chord`'s `compileClaims`; the result is normalized by
 * this package's gate and compared, claim for claim, with the JSON the
 * real-path test walks (`claims-real-path.test.ts`), so the two cannot
 * drift apart. The story is the test story `test-stories/lodge` (its test
 * set: OB-17 to OB-19). Skipped when the test stories are not configured.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, compileClaims } from '@sharpee/chord';
import { assembleTree, TREE_MANIFEST_FILE_NAME, type TreeFiles } from '../src/tree-document.js';
import { normalizeClaimSet } from '../src/claims/claim-set.js';

const testStories = process.env.SHARPEE_TEST_STORIES;
const STORY = testStories ? resolve(testStories, 'lodge/lodge.story') : undefined;
const TREE = testStories ? resolve(testStories, 'lodge/lodge.tests') : undefined;
const FIXTURE = testStories ? resolve(testStories, 'lodge/lodge.claims.json') : '';

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

describeWithCorpus('the lodge\'s claims fragment through the manifest (ADR-365 D7, AC-6)', () => {
  it('the manifest names the fragment', () => {
    const read = assembleTree(treeFiles(TREE!));
    expect(read.status).toBe('ok');
    if (read.status === 'ok') expect(read.document.claims).toBe('lodge.claims.chord');
    expect(JSON.parse(treeFiles(TREE!)[TREE_MANIFEST_FILE_NAME])).toHaveProperty('claims', 'lodge.claims.chord');
  });

  it('the fragment compiles against the story to exactly the claim set the walked test reads', () => {
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
    const fromJson = normalizeClaimSet(JSON.parse(readFileSync(FIXTURE, 'utf8')), 'lodge.claims.json');
    expect(fromChord.set).toEqual(fromJson.set);
    expect(fromChord.claims).toEqual(fromJson.claims);
  });

  it('AC-6: the story compiles to the same IR whether or not the fragment is read, and the IR carries no claim', () => {
    const storyDir = dirname(STORY!);
    const source = readFileSync(STORY!, 'utf8');
    const plain = compile(source, { importResolver: fsResolver(storyDir) });
    const withClaims = compileClaims(source, readFileSync(resolve(storyDir, 'lodge.claims.chord'), 'utf8'), { importResolver: fsResolver(storyDir) });
    expect(plain.ok && withClaims.ok).toBe(true);
    expect(JSON.stringify(withClaims.ir)).toBe(JSON.stringify(plain.ir));
    expect(Object.keys(plain.ir)).not.toContain('claims');
    expect(JSON.stringify(plain.ir)).not.toContain('the strongbox leaves the Vault');
  });
});
