/**
 * outline.test.ts — the tree read as a manifest of lines (ADR-353).
 *
 * Pins the two judgements the column rests on while the document remains a
 * bundle of whole paths rather than a choice tree. A line is NAMED by the
 * command its siblings are least likely to have, because both obvious
 * alternatives fail on the real tree: the first command names nine of one
 * fork's ten lines `se`, and the first point of divergence names a
 * seven-wait branch "wait". A line's DESTINATION is reported only where it
 * asserts one, because inheriting the fork's room printed `Alley` against
 * branches that walk away from Alley.
 *
 * Both are compensation for the document's shape. If secret-letter's tree is
 * ever prefix-factored so siblings differ at command 1, the naming rule
 * becomes unnecessary and these tests should go with it.
 *
 * The last describe runs against the real secret-letter document. It checks
 * the outline against an independent walk of that tree, not fixed counts:
 * the tree grows as the author records (61 lines when ADR-353 quoted its
 * numbers, 106 by 2026-09-29).
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assembleTree,
  TREE_DOCUMENT_VERSION,
  type TreeBranch,
  type TreeCard,
  type TreeDocument,
  type TreeFiles,
} from '@sharpee/branch-tester/tree-document';
import { outlineOf } from '../src/outline';

const turn = (command: string, extra: Record<string, unknown> = {}) =>
  ({ type: 'turn' as const, command, ...extra });

const doc = (cards: unknown[]): TreeDocument =>
  ({ version: TREE_DOCUMENT_VERSION, story: 'mini', seed: 42, id: 'root0000', cards } as TreeDocument);

const at = (location: string) => ({ assertions: { states: [`player.location = ${location}`] } });

/** A fork of sibling command lists, as the document nests them. */
const forkOf = (...branches: string[][]) => ({
  branches: branches.map((commands, i) => ({
    id: `branch${String(i + 1).padStart(2, '0')}`,
    cards: commands.map((c) => turn(c)),
  })),
});

describe('outlineOf — structure', () => {
  it('reads the root line from the main line\'s own cards', () => {
    const outline = outlineOf(doc([
      { type: 'opening' },
      { type: 'boot' },
      turn('take lamp'),
      turn('north'),
    ]));

    expect(outline.root.start).toBe('take lamp');
    expect(outline.root.end).toBe('north');
    expect(outline.root.turns).toBe(2);
    expect(outline.forks).toEqual([]);
    expect(outline.lineCount).toBe(1);
  });

  it('groups branches at the card they fork from', () => {
    const outline = outlineOf(doc([
      turn('take lamp', forkOf(['east', 'open door'], ['west'])),
      turn('north'),
    ]));

    expect(outline.forks).toHaveLength(1);
    expect(outline.forks[0].command).toBe('take lamp');
    expect(outline.forks[0].depth).toBe(0);
    expect(outline.forks[0].lines.map(l => l.turns)).toEqual([2, 1]);
    expect(outline.lineCount).toBe(3);
  });

  it('counts depth from the fork, so a nested fork is deeper', () => {
    const outline = outlineOf(doc([
      turn('north', {
        branches: [{ branch: 1, cards: [turn('east', forkOf(['up']))] }],
      }),
    ]));

    expect(outline.forks.map(f => [f.command, f.depth])).toEqual([['north', 0], ['east', 1]]);
  });

  it('yields a root and no forks for an empty document', () => {
    const outline = outlineOf(doc([]));
    expect(outline.forks).toEqual([]);
    expect(outline.lineCount).toBe(1);
    expect(outline.root.turns).toBe(0);
  });
});

describe('outlineOf — naming a line', () => {
  it('names a line by the command its siblings do not have', () => {
    const outline = outlineOf(doc([
      turn('north', forkOf(
        ['se', 'wait', 'ne', 'attack mercenaries'],
        ['se', 'wait', 'ne', 'kick mercenaries'],
      )),
    ]));

    expect(outline.forks[0].lines.map(l => l.name))
      .toEqual(['attack mercenaries', 'kick mercenaries']);
    expect(outline.forks[0].lines.map(l => l.nameKind))
      .toEqual(['distinctive', 'distinctive']);
  });

  it('does not name a line by its first command when siblings share it', () => {
    const outline = outlineOf(doc([
      turn('north', forkOf(['se', 'take rope'], ['se', 'north'], ['se', 'climb'])),
    ]));

    const names = outline.forks[0].lines.map(l => l.name);
    expect(names).toEqual(['take rope', 'north', 'climb']);
    expect(names).not.toContain('se');
  });

  it('prefers the later of two equally rare commands, being more specific', () => {
    const outline = outlineOf(doc([
      turn('north', forkOf(
        ['open hatch', 'descend', 'light lamp'],
        ['wait', 'wait'],
        ['wait', 'wait', 'wait'],
      )),
    ]));

    expect(outline.forks[0].lines[0].name).toBe('light lamp');
  });

  it('describes the SHAPE of a line with nothing rare in it', () => {
    const outline = outlineOf(doc([
      turn('north', forkOf(
        ['se', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait'],
        ['se', 'wait', 'wait', 'ne', 'wait'],
        ['se', 'wait', 'ne', 'wait'],
      )),
    ]));

    const first = outline.forks[0].lines[0];
    // Naming it "wait" would be accurate and useless; naming it by its first
    // command would be "se", which every sibling is.
    expect(first.nameKind).toBe('shape');
    expect(first.name).toBe('se › wait ×7');
  });

  it('elides a long shape rather than filling the pill', () => {
    const outline = outlineOf(doc([
      turn('north', forkOf(
        ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        // Contains every command the first line does, so nothing in that line
        // is rare and it must fall back to its shape.
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'a'],
      )),
    ]));

    expect(outline.forks[0].lines[0].name).toBe('a › b › c › d › e …');
    expect(outline.forks[0].lines[0].nameKind).toBe('shape');
  });

  it('says so plainly when a line has no turns yet', () => {
    const outline = outlineOf(doc([turn('north', forkOf([]))]));
    const line = outline.forks[0].lines[0];
    expect(line.nameKind).toBe('empty');
    expect(line.name).toBe('(no turns yet)');
    expect(line.turns).toBe(0);
  });
});

describe('outlineOf — destinations', () => {
  it('reports a destination the line asserts', () => {
    const outline = outlineOf(doc([
      turn('north', {
        ...at('Garden'),
        branches: [{
          branch: 1,
          cards: [turn('east', at('Shed')), turn('look', at('Loft'))],
        }],
      }),
    ]));

    expect(outline.forks[0].lines[0].destination).toBe('Loft');
  });

  it('reports NO destination when the line asserts none, rather than the fork\'s', () => {
    const outline = outlineOf(doc([
      turn('north', {
        ...at('Garden'),
        branches: [{ branch: 1, cards: [turn('ne'), turn('ne'), turn('ne')] }],
      }),
    ]));

    // Three moves north-east from Garden. Inheriting "Garden" here is the
    // wrong-room bug this absence exists to prevent.
    expect(outline.forks[0].lines[0].destination).toBeUndefined();
  });

  it('still carries the location in force onto the fork heading', () => {
    const outline = outlineOf(doc([
      turn('north', { ...at('Garden') }),
      turn('east', forkOf(['up'])),
    ]));

    expect(outline.forks[0].location).toBe('Garden');
    expect(outline.forks[0].locationAsserted).toBe(false);
  });
});

describe('outlineOf against the real secret-letter tree', () => {
  // Read-only: the real tree's files are read, never written.
  const directory = resolve(__dirname, '../../../../../branch-stories/secret-letter/secret-letter.tests');
  const files: TreeFiles = {};
  for (const name of readdirSync(directory)) {
    if (!name.startsWith('.')) files[name] = readFileSync(resolve(directory, name), 'utf8');
  }
  const read = assembleTree(files);
  if (read.status !== 'ok') {
    // Not a soft skip: these criteria exist to hold the real tree's numbers,
    // and a tree that will not parse falsifies them rather than excusing them.
    throw new Error(`secret-letter.tests/ did not read: ${read.status} — ${read.message}`);
  }
  const document = read.document;

  // The tree grows as the author records, so these assert against an
  // independent walk of the document rather than counts that go stale.
  const branches: TreeBranch[] = [];
  let forkCards = 0;
  const collect = (cards: readonly TreeCard[]): void => {
    for (const card of cards) {
      if (!card.branches?.length) continue;
      forkCards += 1;
      for (const branch of card.branches) {
        branches.push(branch);
        collect(branch.cards);
      }
    }
  };
  collect(document.cards);
  const commandsOf = (branch: TreeBranch): string[] =>
    branch.cards.filter(c => c.type === 'turn').map(c => c.command ?? '');
  const branchById = new Map(branches.map(b => [b.id, b]));

  it('has one line per branch plus the main line, and one fork per branching card', () => {
    const outline = outlineOf(document);
    expect(branches.length).toBeGreaterThan(0);
    expect(outline.lineCount).toBe(branches.length + 1);
    expect(outline.forks).toHaveLength(forkCards);
    expect(outline.forks.flatMap(f => f.lines.map(l => l.lineId)).sort())
      .toEqual(branches.map(b => b.id).sort());
  });

  it('names every branch by one of its own commands, or by its shape', () => {
    for (const line of outlineOf(document).forks.flatMap(f => f.lines)) {
      const commands = commandsOf(branchById.get(line.lineId)!);
      expect(line.name).not.toBe('');
      if (line.nameKind === 'distinctive') expect(commands).toContain(line.name);
      else expect(line.nameKind).toBe('shape');
    }
  });

  it('names all ten of the fork that reads `alley · d` today', () => {
    const fork = outlineOf(document).forks.find(f => f.command === 'd' && f.lines.length === 10);
    expect(fork).toBeDefined();
    const names = fork!.lines.map(l => l.name);
    expect(new Set(names).size).toBe(10);
    expect(names).toContain('attack mercenaries');
    expect(names).toContain('kick mercenaries');
    expect(names).toContain('se › wait ×7');
  });

  it('gives a branch the last location it asserts, and none rather than inheriting one', () => {
    const lines = outlineOf(document).forks.flatMap(f => f.lines);
    for (const line of lines) {
      const asserted = branchById.get(line.lineId)!.cards
        .filter(c => c.type === 'turn')
        .flatMap(c => c.assertions?.states ?? [])
        .map(s => /^\s*player\.location\s*=\s*(.+?)\s*$/.exec(s)?.[1])
        .filter((l): l is string => l !== undefined);
      expect(line.destination).toBe(asserted.at(-1));
    }
    // Both halves occur on the real tree, so neither is vacuous.
    expect(lines.some(l => l.destination === undefined)).toBe(true);
    expect(lines.some(l => l.destination !== undefined)).toBe(true);
  });
});
