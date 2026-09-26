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
 * The last describe runs against the real secret-letter document, so the
 * counts quoted in ADR-353 are asserted rather than remembered.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deserializeTreeDocument, type TreeDocument } from '@sharpee/branch-tester/tree-document';
import { outlineOf } from '../src/outline';

const turn = (command: string, extra: Record<string, unknown> = {}) =>
  ({ type: 'turn' as const, command, ...extra });

const doc = (cards: unknown[]): TreeDocument =>
  ({ version: 2, story: 'mini', seed: 42, cards } as TreeDocument);

const at = (location: string) => ({ assertions: { states: [`player.location = ${location}`] } });

/** A fork of sibling command lists, as the document nests them. */
const forkOf = (...branches: string[][]) => ({
  branches: branches.map((commands, i) => ({
    branch: i + 1,
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
  const path = resolve(__dirname, '../../../../../branch-stories/secret-letter/secret-letter.tests.json');
  const read = deserializeTreeDocument(readFileSync(path, 'utf8'));
  if (read.status !== 'ok') {
    // Not a soft skip: these criteria exist to hold the real tree's numbers,
    // and a tree that will not parse falsifies them rather than excusing them.
    throw new Error(`secret-letter.tests.json did not read: ${read.status} — ${read.message}`);
  }
  const document = read.document;

  it('turns 61 lines and 53 sibling chips into 19 fork points', () => {
    const outline = outlineOf(document);
    expect(outline.lineCount).toBe(61);
    expect(outline.forks).toHaveLength(19);
  });

  it('keeps the fan small: median 2 lines per fork, 10 at the worst', () => {
    const counts = outlineOf(document).forks.map(f => f.lines.length).sort((a, b) => a - b);
    expect(counts[Math.floor(counts.length / 2)]).toBe(2);
    expect(counts[counts.length - 1]).toBe(10);
  });

  it('gives 52 of 60 branches a distinctive command and the rest a shape', () => {
    const lines = outlineOf(document).forks.flatMap(f => f.lines);
    expect(lines).toHaveLength(60);
    expect(lines.filter(l => l.nameKind === 'distinctive')).toHaveLength(52);
    expect(lines.filter(l => l.nameKind === 'shape')).toHaveLength(8);
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

  it('leaves 25 branches with no destination rather than inheriting one', () => {
    const lines = outlineOf(document).forks.flatMap(f => f.lines);
    expect(lines.filter(l => l.destination === undefined)).toHaveLength(25);
  });
});
