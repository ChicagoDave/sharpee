/**
 * Tests for renderToString and renderStatusLine
 *
 * Verifies block rendering with smart joining, ANSI color output,
 * status block filtering, and block-level styling.
 *
 * @see ADR-096 Text Service Architecture
 */

import { describe, it, expect } from 'vitest';
import { renderToString, renderStatusLine } from '../src/cli-renderer.js';
import { makeBlock, makeDecoratedBlock } from './test-helpers.js';

const ANSI = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  ITALIC: '\x1b[3m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
} as const;

describe('renderToString', () => {
  describe('basic rendering', () => {
    it('should return empty string for empty array', () => {
      expect(renderToString([])).toBe('');
    });

    it('should render a single block', () => {
      expect(renderToString([makeBlock('action.result', 'You open the chest.')])).toBe(
        'You open the chest.',
      );
    });
  });

  describe('smart joining', () => {
    it('should join consecutive same-key blocks with single newline', () => {
      const blocks = [
        makeBlock('action.result', 'Taken.'),
        makeBlock('action.result', 'Taken.'),
      ];
      expect(renderToString(blocks)).toBe('Taken.\nTaken.');
    });

    it('should join different-key blocks with double newline', () => {
      const blocks = [
        makeBlock('room.name', 'West of House'),
        makeBlock('room.description', 'You are standing in an open field.'),
      ];
      expect(renderToString(blocks)).toBe(
        'West of House\n\nYou are standing in an open field.',
      );
    });

    it('should respect custom blockSeparator', () => {
      const blocks = [
        makeBlock('room.name', 'Cellar'),
        makeBlock('room.description', 'A damp cellar.'),
      ];
      expect(renderToString(blocks, { blockSeparator: '\n---\n' })).toBe(
        'Cellar\n---\nA damp cellar.',
      );
    });

    it('should use smart joining for mixed block types', () => {
      const blocks = [
        makeBlock('action.result', 'You open the chest.'),
        makeBlock('action.result', 'Inside you see a sword.'),
        makeBlock('room.description', 'The room is dimly lit.'),
      ];
      expect(renderToString(blocks)).toBe(
        'You open the chest.\nInside you see a sword.\n\nThe room is dimly lit.',
      );
    });
  });

  describe('whitespace filtering', () => {
    it('should exclude blocks with whitespace-only content', () => {
      const blocks = [
        makeBlock('action.result', 'Hello.'),
        makeBlock('action.result', '   '),
        makeBlock('action.result', 'World.'),
      ];
      expect(renderToString(blocks)).toBe('Hello.\nWorld.');
    });

    it('should return empty string when all blocks are whitespace', () => {
      const blocks = [makeBlock('action.result', '  '), makeBlock('action.result', '\n')];
      expect(renderToString(blocks)).toBe('');
    });
  });

  describe('status block filtering', () => {
    it('should exclude status blocks by default', () => {
      const blocks = [
        makeBlock('action.result', 'You go north.'),
        makeBlock('status.room', 'Kitchen'),
        makeBlock('status.score', '5'),
      ];
      expect(renderToString(blocks)).toBe('You go north.');
    });

    it('should include status blocks when includeStatus is true', () => {
      const blocks = [
        makeBlock('action.result', 'You go north.'),
        makeBlock('status.room', 'Kitchen'),
      ];
      const result = renderToString(blocks, { includeStatus: true });
      expect(result).toContain('You go north.');
      expect(result).toContain('Kitchen');
    });
  });

  describe('plain-text decoration rendering (ansi: false)', () => {
    it.each([
      ['em', 'brightly', '*brightly*'],
      ['strong', 'important', '**important**'],
      ['item', 'the sword', 'the sword'],
    ])('should render %s decoration as %j in plain text', (type, text, expected) => {
      const blocks = [makeDecoratedBlock('action.result', [{ type, content: [text] }])];
      expect(renderToString(blocks)).toBe(expected);
    });
  });

  describe('ANSI decoration rendering', () => {
    it.each([
      ['em', 'emphasis', ANSI.ITALIC],
      ['strong', 'bold text', ANSI.BOLD],
      ['item', 'the sword', ANSI.CYAN],
      ['npc', 'the troll', ANSI.MAGENTA],
    ])('should render %s decoration with correct ANSI code', (type, text, code) => {
      const blocks = [makeDecoratedBlock('action.result', [{ type, content: [text] }])];
      expect(renderToString(blocks, { ansi: true })).toBe(`${code}${text}${ANSI.RESET}`);
    });

    it('should wrap room.name block in bold yellow', () => {
      expect(renderToString([makeBlock('room.name', 'West of House')], { ansi: true })).toBe(
        `${ANSI.BOLD}${ANSI.YELLOW}West of House${ANSI.RESET}`,
      );
    });

    it.each(['action.blocked', 'error'])(
      'should wrap %s block in red',
      (key) => {
        expect(renderToString([makeBlock(key, 'Blocked.')], { ansi: true })).toBe(
          `${ANSI.RED}Blocked.${ANSI.RESET}`,
        );
      },
    );

    it('should render unknown decoration type without styling', () => {
      const blocks = [makeDecoratedBlock('action.result', [{ type: 'custom-unknown', content: ['some text'] }])];
      expect(renderToString(blocks, { ansi: true })).toBe('some text');
    });

    it('should use story-defined hex color for custom decoration type', () => {
      const blocks = [makeDecoratedBlock('action.result', [{ type: 'magic', content: ['sparkles'] }])];
      const result = renderToString(blocks, { ansi: true, colors: { magic: '#0000FF' } });
      expect(result).toContain('sparkles');
      expect(result).toContain(ANSI.RESET);
      expect(result.length).toBeGreaterThan('sparkles'.length);
    });
  });
});

describe('renderStatusLine', () => {
  it('should return empty string when no status blocks', () => {
    expect(renderStatusLine([makeBlock('action.result', 'You go north.')])).toBe('');
  });

  it('should render room name only', () => {
    expect(renderStatusLine([makeBlock('status.room', 'West of House')])).toBe('West of House');
  });

  it('should render all three standard status blocks in order', () => {
    const blocks = [
      makeBlock('status.room', 'Kitchen'),
      makeBlock('status.score', '5'),
      makeBlock('status.turns', '3'),
    ];
    expect(renderStatusLine(blocks)).toBe('Kitchen | Score: 5 | Turns: 3');
  });

  it('should maintain fixed order regardless of input order', () => {
    const blocks = [
      makeBlock('status.turns', '10'),
      makeBlock('status.score', '25'),
      makeBlock('status.room', 'Cellar'),
    ];
    expect(renderStatusLine(blocks)).toBe('Cellar | Score: 25 | Turns: 10');
  });

  it('should omit missing standard blocks', () => {
    const blocks = [makeBlock('status.room', 'Attic'), makeBlock('status.turns', '7')];
    expect(renderStatusLine(blocks)).toBe('Attic | Turns: 7');
  });

  it('should append custom status blocks after standard ones', () => {
    const blocks = [
      makeBlock('status.room', 'Forest'),
      makeBlock('status.score', '0'),
      makeBlock('status.health', '100 HP'),
    ];
    expect(renderStatusLine(blocks)).toBe('Forest | Score: 0 | 100 HP');
  });

  it('should ignore non-status blocks', () => {
    const blocks = [
      makeBlock('action.result', 'You go north.'),
      makeBlock('status.room', 'Kitchen'),
      makeBlock('room.description', 'A warm kitchen.'),
    ];
    expect(renderStatusLine(blocks)).toBe('Kitchen');
  });
});
