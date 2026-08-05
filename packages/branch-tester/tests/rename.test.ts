/**
 * rename.test.ts — ADR-302 D14: rename is a harness operation.
 *
 * Covers **AC-8** — renaming updates the transcript, every child's
 * `continues:`, the golden, and the divergence save together; renaming to a
 * stem already taken in that story leaves every file byte-identical.
 *
 * Every case runs against real files in a temp directory, through the real
 * parser, serializer and tree assembly. A rename that "works" in memory but
 * leaves the filesystem inconsistent is exactly the failure this operation
 * exists to prevent, so nothing here is mocked.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseTranscriptFile } from '../src/parser.js';
import { assembleTree } from '../src/tree.js';
import { planRename, renameTranscript } from '../src/rename.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-rename-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const file = (name: string) => path.join(dir, name);
const read = (name: string) => fs.readFileSync(file(name), 'utf-8');
const exists = (name: string) => fs.existsSync(file(name));

/** Write a canonical transcript so a rename's re-serialization is a no-op. */
function transcript(stem: string, header: string) {
  fs.writeFileSync(
    file(`${stem}.transcript`),
    `title: ${stem}\n${header}---\n\n> look\n[OK: contains "ok"]\n`,
    'utf-8',
  );
}

/** A recording whose provenance names its transcript, as a real one does. */
function golden(stem: string, suffix = '.golden') {
  fs.writeFileSync(
    file(`${stem}${suffix}`),
    [
      '# sharpee golden v1',
      `transcript: ${stem}.transcript`,
      'story: teststory',
      'seed: 42',
      'derivation: 1',
      'save-format: 3.0.0',
      'channels: (none)',
      'events: false',
      'locale: en-US',
      'forces: (none)',
      '---',
      '> look',
      'ok',
      '',
    ].join('\n'),
    'utf-8',
  );
}

/** Assemble the tree from whatever is on disk right now. */
function tree() {
  const transcripts = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.transcript'))
    .map((n) => parseTranscriptFile(file(n)));
  return assembleTree(transcripts, 'teststory');
}

describe('renameTranscript (ADR-302 D14, AC-8)', () => {
  it('AC-8 — the transcript, its children, its golden and its divergence move together', () => {
    transcript('doormat', '');
    transcript('inside', 'continues: doormat\n');
    transcript('outside', 'continues: doormat\n');
    golden('doormat');
    fs.writeFileSync(file('doormat.divergence.json'), '{"token":"x"}', 'utf-8');

    renameTranscript(tree(), 'doormat', 'porch');

    expect(exists('porch.transcript')).toBe(true);
    expect(exists('doormat.transcript')).toBe(false);

    expect(read('inside.transcript')).toMatch(/^continues: porch$/m);
    expect(read('outside.transcript')).toMatch(/^continues: porch$/m);

    expect(exists('porch.golden')).toBe(true);
    expect(exists('doormat.golden')).toBe(false);
    // The recording's provenance moves with it — `transcript:` is checked
    // against the basename on every replay, so leaving it would make the very
    // next run report a stale recording.
    expect(read('porch.golden')).toMatch(/^transcript: porch\.transcript$/m);

    expect(exists('porch.divergence.json')).toBe(true);
    expect(exists('doormat.divergence.json')).toBe(false);
  });

  it('AC-8 — renaming to a taken stem leaves every file byte-identical', () => {
    transcript('doormat', '');
    transcript('porch', '');
    transcript('inside', 'continues: doormat\n');
    golden('doormat');

    const before = fs
      .readdirSync(dir)
      .sort()
      .map((name) => [name, read(name)] as const);

    expect(() => renameTranscript(tree(), 'doormat', 'porch')).toThrow(/already a transcript/);

    const after = fs
      .readdirSync(dir)
      .sort()
      .map((name) => [name, read(name)] as const);
    expect(after).toEqual(before);
  });

  it('the renamed transcript keeps its OWN parent pointer', () => {
    // Renaming a child changes its identity, not its parentage.
    transcript('root', '');
    transcript('mid', 'continues: root\n');
    renameTranscript(tree(), 'mid', 'middle');
    expect(read('middle.transcript')).toMatch(/^continues: root$/m);
  });

  it('the tree re-assembles cleanly afterwards', () => {
    transcript('root', '');
    transcript('kid', 'continues: root\n');
    transcript('grandkid', 'continues: kid\n');

    renameTranscript(tree(), 'kid', 'child');

    const after = tree();
    expect(after.defects).toEqual([]);
    expect(after.byStem.get('grandkid')!.parent!.stem).toBe('child');
    expect(after.byStem.get('child')!.parent!.stem).toBe('root');
  });

  it('carries every per-seed matrix recording, not only the plain one', () => {
    transcript('matrix', '');
    golden('matrix', '.1.golden');
    golden('matrix', '.2.golden');

    renameTranscript(tree(), 'matrix', 'grid');

    expect(exists('grid.1.golden')).toBe(true);
    expect(exists('grid.2.golden')).toBe(true);
    expect(exists('matrix.1.golden')).toBe(false);
    expect(exists('matrix.2.golden')).toBe(false);
  });

  it('works when there is no golden and no divergence save', () => {
    transcript('lonely', '');
    renameTranscript(tree(), 'lonely', 'solo');
    expect(exists('solo.transcript')).toBe(true);
  });

  it('rejects an unknown stem, writing nothing', () => {
    transcript('doormat', '');
    const plan = planRename(tree(), 'nosuch', 'porch');
    expect(plan.problems.join('\n')).toMatch(/no transcript named "nosuch"/);
    expect(plan.edits).toEqual([]);
    expect(exists('doormat.transcript')).toBe(true);
  });

  it('rejects an illegal target stem, naming why it has to be legal', () => {
    transcript('doormat', '');
    const plan = planRename(tree(), 'doormat', 'sub/dir');
    expect(plan.problems.join('\n')).toMatch(/not a legal stem/);
    // The reason is given, not just the rule: the stem becomes a pointer value.
    expect(plan.problems.join('\n')).toMatch(/continues:/);
  });

  it('refuses to plan against a defective tree', () => {
    transcript('loop-a', 'continues: loop-b\n');
    transcript('loop-b', 'continues: loop-a\n');
    const plan = planRename(tree(), 'loop-a', 'renamed');
    expect(plan.problems.join('\n')).toMatch(/structural defect/);
    expect(plan.edits).toEqual([]);
  });

  it('reports every problem together rather than the first', () => {
    transcript('doormat', '');
    transcript('porch', '');
    const plan = planRename(tree(), 'nosuch', 'porch');
    expect(plan.problems.length).toBeGreaterThan(1);
  });

  it('refuses to overwrite an unrelated file standing in the way', () => {
    transcript('doormat', '');
    golden('doormat');
    // A stray recording already occupying the target name.
    golden('porch');
    fs.unlinkSync(file('porch.golden'));
    fs.writeFileSync(file('porch.golden'), 'stray', 'utf-8');

    const plan = planRename(tree(), 'doormat', 'porch');
    expect(plan.problems.join('\n')).toMatch(/would overwrite an existing file/);
    expect(read('porch.golden')).toBe('stray');
    expect(exists('doormat.golden')).toBe(true);
  });

  it('a plan is inert until applied', () => {
    transcript('doormat', '');
    transcript('inside', 'continues: doormat\n');
    const before = read('inside.transcript');

    const plan = planRename(tree(), 'doormat', 'porch');
    expect(plan.problems).toEqual([]);
    expect(plan.edits.length).toBeGreaterThan(0);

    // Planning touched nothing.
    expect(exists('doormat.transcript')).toBe(true);
    expect(read('inside.transcript')).toBe(before);
  });
});
