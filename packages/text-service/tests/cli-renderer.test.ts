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
import type { ITextBlock } from '@sharpee/text-blocks';

/** Create a plain text block */
function makeBlock(key: string, text: string): ITextBlock {
  return { key, content: [text] };
}

/** Create a block with a decoration object */
function makeDecoratedBlock(
  key: string,
  parts: Array<string | { type: string; content: string[] }>,
): ITextBlock {
  return { key, content: parts };
}

describe('renderToString', () => {
  describe('basic rendering', () => {
    it('should return empty string for empty array', () => {
      expect(renderToString([])).toBe('');
    });

    it('should render a single block', () => {
      const blocks = [makeBlock('action.result', 'You open the chest.')];

      expect(renderToString(blocks)).toBe('You open the chest.');
    });

    it('should render plain text content directly', () => {
      const blocks = [makeBlock('room.description', 'A dark, foreboding cave.')];

      expect(renderToString(blocks)).toBe('A dark, foreboding cave.');
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

      const result = renderToString(blocks);

      expect(result).toBe(
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
      const blocks = [
        makeBlock('action.result', '  '),
        makeBlock('action.result', '\n'),
      ];

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
    it('should render em decoration as *text*', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          'The lamp glows ',
          { type: 'em', content: ['brightly'] },
          '.',
        ]),
      ];

      expect(renderToString(blocks)).toBe('The lamp glows *brightly*.');
    });

    it('should render strong decoration as **text**', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          'This is ',
          { type: 'strong', content: ['important'] },
          '.',
        ]),
      ];

      expect(renderToString(blocks)).toBe('This is **important**.');
    });

    it('should render other decoration types as plain text', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          'You take ',
          { type: 'item', content: ['the sword'] },
          '.',
        ]),
      ];

      expect(renderToString(blocks)).toBe('You take the sword.');
    });
  });

  describe('ANSI rendering', () => {
    const RESET = '\x1b[0m';
    const BOLD = '\x1b[1m';
    const ITALIC = '\x1b[3m';
    const YELLOW = '\x1b[33m';
    const RED = '\x1b[31m';
    const CYAN = '\x1b[36m';
    const MAGENTA = '\x1b[35m';

    it('should render em decoration with italic ANSI', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          { type: 'em', content: ['emphasis'] },
        ]),
      ];

      expect(renderToString(blocks, { ansi: true })).toBe(
        `${ITALIC}emphasis${RESET}`,
      );
    });

    it('should render strong decoration with bold ANSI', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          { type: 'strong', content: ['bold text'] },
        ]),
      ];

      expect(renderToString(blocks, { ansi: true })).toBe(
        `${BOLD}bold text${RESET}`,
      );
    });

    it('should render item decoration with cyan ANSI', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          { type: 'item', content: ['the sword'] },
        ]),
      ];

      expect(renderToString(blocks, { ansi: true })).toBe(
        `${CYAN}the sword${RESET}`,
      );
    });

    it('should render npc decoration with magenta ANSI', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          { type: 'npc', content: ['the troll'] },
        ]),
      ];

      expect(renderToString(blocks, { ansi: true })).toBe(
        `${MAGENTA}the troll${RESET}`,
      );
    });

    it('should wrap room.name block in bold yellow', () => {
      const blocks = [makeBlock('room.name', 'West of House')];

      expect(renderToString(blocks, { ansi: true })).toBe(
        `${BOLD}${YELLOW}West of House${RESET}`,
      );
    });

    it('should wrap action.blocked block in red', () => {
      const blocks = [makeBlock('action.blocked', 'You cannot do that.')];

      expect(renderToString(blocks, { ansi: true })).toBe(
        `${RED}You cannot do that.${RESET}`,
      );
    });

    it('should wrap error block in red', () => {
      const blocks = [makeBlock('error', 'Something went wrong.')];

      expect(renderToString(blocks, { ansi: true })).toBe(
        `${RED}Something went wrong.${RESET}`,
      );
    });

    it('should render unknown decoration type without styling', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          { type: 'custom-unknown', content: ['some text'] },
        ]),
      ];

      expect(renderToString(blocks, { ansi: true })).toBe('some text');
    });

    it('should use story-defined hex color for custom decoration type', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          { type: 'magic', content: ['sparkles'] },
        ]),
      ];

      const result = renderToString(blocks, {
        ansi: true,
        colors: { magic: '#0000FF' },
      });

      // Should contain ANSI codes (hex blue approximates to BRIGHT_BLUE)
      expect(result).toContain('sparkles');
      expect(result).toContain(RESET);
      expect(result.length).toBeGreaterThan('sparkles'.length);
    });
  });
});

describe('renderStatusLine', () => {
  it('should return empty string when no status blocks', () => {
    const blocks = [makeBlock('action.result', 'You go north.')];

    expect(renderStatusLine(blocks)).toBe('');
  });

  it('should render room name only', () => {
    const blocks = [makeBlock('status.room', 'West of House')];

    expect(renderStatusLine(blocks)).toBe('West of House');
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
    const blocks = [
      makeBlock('status.room', 'Attic'),
      makeBlock('status.turns', '7'),
    ];

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
