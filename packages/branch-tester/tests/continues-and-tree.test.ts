/**
 * continues-and-tree.test.ts — ADR-302 D1/D2/D4/D11: the parent pointer and
 * whole-tree assembly.
 *
 * Covers **AC-2** (no interior addressing exists — a `continues:` carrying a
 * turn reference, a path, or an extension is rejected by name) and **AC-6**
 * (a malformed tree reports every defect together and executes nothing).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript, validateTranscript } from '../src/parser.js';
import { serializeTranscript } from '../src/serializer.js';
import { assembleTree, rootToLeafPaths, stemOf } from '../src/tree.js';
import type { Transcript } from '../src/types.js';

const BODY = '---\n\n> look\n[OK: contains "room"]\n';

/** Parse a transcript and give it a filename, as a file on disk would have. */
function at(stem: string, header: string): Transcript {
  const transcript = parseTranscript(`title: ${stem}\n${header}${BODY}`);
  (transcript as { filePath: string }).filePath = `/story/${stem}.transcript`;
  return transcript;
}

const errorsFor = (header: string) =>
  validateTranscript(parseTranscript(`title: T\n${header}${BODY}`));

describe('`continues:` grammar (ADR-302 D1, AC-2)', () => {
  it('accepts a bare filename stem', () => {
    const transcript = parseTranscript(`title: T\ncontinues: doormat\n${BODY}`);
    expect(validateTranscript(transcript)).toEqual([]);
    expect(transcript.header.continues).toBe('doormat');
  });

  it('accepts stems with dots, dashes and underscores', () => {
    for (const stem of ['wt-01-torch', 'quest_a', 'v1.5-open']) {
      expect(errorsFor(`continues: ${stem}\n`), stem).toEqual([]);
    }
  });

  it('AC-2 — rejects a turn reference, naming interior addressing', () => {
    const errors = errorsFor('continues: doormat at 4\n');
    expect(errors.join('\n')).toMatch(/addresses a point inside the parent/);
    expect(errors.join('\n')).toMatch(/whole file/);
    // The fix is named, not just the rule.
    expect(errors.join('\n')).toMatch(/split the parent at that point/);
  });

  it('AC-2 — rejects the other interior spellings the same way', () => {
    for (const value of ['doormat#4', 'doormat:4']) {
      expect(errorsFor(`continues: ${value}\n`).join('\n'), value).toMatch(
        /addresses a point inside the parent/,
      );
    }
  });

  it('AC-2 — rejects a `.transcript` extension, showing the stem to use', () => {
    const errors = errorsFor('continues: doormat.transcript\n').join('\n');
    expect(errors).toMatch(/carries a file extension/);
    expect(errors).toMatch(/continues: doormat/);
  });

  it('AC-2 — rejects a path, naming the same-story scope', () => {
    for (const value of ['tests/doormat', './doormat', 'other\\doormat']) {
      expect(errorsFor(`continues: ${value}\n`).join('\n'), value).toMatch(/carries a path/);
    }
  });

  it('rejects an empty value, naming both ways out', () => {
    const errors = errorsFor('continues:\n').join('\n');
    expect(errors).toMatch(/has no value/);
    expect(errors).toMatch(/remove the field to make this a root/);
  });

  it('a transcript with no `continues:` is a root, not an error', () => {
    const transcript = parseTranscript(`title: T\n${BODY}`);
    expect(validateTranscript(transcript)).toEqual([]);
    expect(transcript.header.continues).toBeUndefined();
  });
});

describe('tree assembly (ADR-302 D2, D4, D11)', () => {
  it('a transcript nobody points at is a root', () => {
    const tree = assembleTree([at('doormat', ''), at('inside', 'continues: doormat\n')]);
    expect(tree.defects).toEqual([]);
    expect(tree.roots.map((r) => r.stem)).toEqual(['doormat']);
  });

  it('D2 — a branch is two children of one parent, derived not declared', () => {
    const tree = assembleTree([
      at('doormat', ''),
      at('take-key', 'continues: doormat\n'),
      at('leave-key', 'continues: doormat\n'),
    ]);

    expect(tree.defects).toEqual([]);
    const doormat = tree.byStem.get('doormat')!;
    // Nothing declared a branch; it exists because two children point at one
    // parent, and that is the only way it can exist.
    expect(doormat.children.map((c) => c.stem)).toEqual(['leave-key', 'take-key']);
  });

  it('D3 — a chain is the linear case of the same mechanism', () => {
    const tree = assembleTree([
      at('one', ''),
      at('two', 'continues: one\n'),
      at('three', 'continues: two\n'),
    ]);

    expect(tree.defects).toEqual([]);
    expect(rootToLeafPaths(tree).map((p) => p.map((n) => n.stem))).toEqual([
      ['one', 'two', 'three'],
    ]);
  });

  it('every root-to-leaf path is enumerated, sharing its prefix', () => {
    const tree = assembleTree([
      at('root', ''),
      at('spine', 'continues: root\n'),
      at('alpha', 'continues: spine\n'),
      at('beta', 'continues: spine\n'),
    ]);

    expect(rootToLeafPaths(tree).map((p) => p.map((n) => n.stem))).toEqual([
      ['root', 'spine', 'alpha'],
      ['root', 'spine', 'beta'],
    ]);
  });

  it('resolves ancestry root-first, inclusive of the node', () => {
    const tree = assembleTree([
      at('root', ''),
      at('spine', 'continues: root\n'),
      at('leaf', 'continues: spine\n'),
    ]);
    expect(tree.byStem.get('leaf')!.ancestry.map((n) => n.stem)).toEqual([
      'root',
      'spine',
      'leaf',
    ]);
  });

  it('AC-6 — a missing parent, a cycle and a cross-story pointer report together', () => {
    // The whole point of eager validation: one run names every defect. "Fix
    // this, run again, find the next" is what D11 exists to avoid.
    const tree = assembleTree(
      [
        at('root', ''),
        at('orphan', 'continues: nosuchparent\n'),
        at('loop-a', 'continues: loop-b\n'),
        at('loop-b', 'continues: loop-a\n'),
      ],
      'fernhill',
    );

    const kinds = tree.defects.map((d) => d.kind).sort();
    expect(kinds).toEqual(['cross-story', 'cycle', 'cycle']);

    const text = tree.defects.map((d) => d.message).join('\n');
    expect(text).toMatch(/nosuchparent/);
    expect(text).toMatch(/story "fernhill"/);
    expect(text).toMatch(/loop-a → loop-b → loop-a|loop-b → loop-a → loop-b/);
  });

  it('AC-6 — a defective tree exposes no runnable path', () => {
    // "Executes nothing" is enforced by there being nothing to execute: a node
    // in a cycle is not reachable from any root.
    const tree = assembleTree([at('loop-a', 'continues: loop-b\n'), at('loop-b', 'continues: loop-a\n')]);
    expect(tree.defects.length).toBeGreaterThan(0);
    expect(tree.roots).toEqual([]);
    expect(rootToLeafPaths(tree)).toEqual([]);
  });

  it('reports every member of a cycle, not one arbitrary entry point', () => {
    const tree = assembleTree([
      at('a', 'continues: c\n'),
      at('b', 'continues: a\n'),
      at('c', 'continues: b\n'),
    ]);
    expect(tree.defects.map((d) => d.stem).sort()).toEqual(['a', 'b', 'c']);
  });

  it('rejects a self-parent by name', () => {
    const tree = assembleTree([at('solo', 'continues: solo\n')]);
    expect(tree.defects[0].kind).toBe('self-parent');
    expect(tree.defects[0].message).toMatch(/cannot be its own parent/);
  });

  it('rejects two files claiming one stem — the stem is the identity', () => {
    const a = at('doormat', '');
    const b = at('doormat', '');
    (b as { filePath: string }).filePath = '/story/nested/doormat.transcript';
    const tree = assembleTree([a, b]);
    expect(tree.defects[0].kind).toBe('duplicate-stem');
    expect(tree.defects[0].message).toMatch(/ADR-302 D14/);
  });

  it('a diamond is unrepresentable — one parent per transcript, by construction', () => {
    // Two `continues:` lines cannot both survive: the header is a map, so the
    // second replaces the first. There is nothing to check at tree level.
    const transcript = parseTranscript(`title: T\ncontinues: alpha\ncontinues: beta\n${BODY}`);
    expect(transcript.header.continues).toBe('beta');
  });

  it('an empty story assembles to an empty tree without defects', () => {
    const tree = assembleTree([]);
    expect(tree.defects).toEqual([]);
    expect(tree.roots).toEqual([]);
  });

  it('the canonical serializer round-trips `continues:` in identity position', () => {
    // The field has to survive a parse → serialize → parse cycle, or the
    // editor tier (ADR-300 D3) would silently drop parentage on save.
    const text = serializeTranscript(
      parseTranscript(`title: T\ncontinues: doormat\nauthor: A\n${BODY}`),
    );
    expect(text).toMatch(/^title: T\ncontinues: doormat\nauthor: A\n/);
    expect(parseTranscript(text).header.continues).toBe('doormat');
  });

  it('stemOf strips the extension and the directory', () => {
    expect(stemOf('/a/b/wt-01-torch.transcript')).toBe('wt-01-torch');
    expect(stemOf('doormat.transcript')).toBe('doormat');
  });
});
