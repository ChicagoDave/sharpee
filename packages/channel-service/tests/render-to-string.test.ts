/**
 * Tests for renderToString and renderStatusLine.
 *
 * Verifies block flattening with smart joining, ANSI color output,
 * status block filtering, and block-level styling.
 *
 * Ported from `@sharpee/text-service/tests/cli-renderer.test.ts` per
 * ADR-174 Phase 2 sub-phase 2.1 (2026-05-10).
 *
 * @see ADR-174 — Decoration Architecture and Engine-Internal Prose Pipeline
 */

import { describe, it, expect } from 'vitest';
import type { ITextBlock } from '@sharpee/text-blocks';
import { renderToString, renderStatusLine } from '../src/render-to-string';

const ANSI = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  ITALIC: '\x1b[3m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
} as const;

function makeBlock(key: string, text: string): ITextBlock {
  return { key, content: [text] };
}

function makeDecoratedBlock(
  key: string,
  parts: Array<string | { className: string; content: string[] }>,
): ITextBlock {
  return { key, content: parts };
}

/** Each test in `renderToString` is `blocks → expected string` ± options. */
type RenderCase = {
  name: string;
  blocks: ITextBlock[];
  expected: string;
  options?: Parameters<typeof renderToString>[1];
};

describe('renderToString', () => {
  describe('basic rendering', () => {
    it.each<RenderCase>([
      { name: 'empty array → empty string', blocks: [], expected: '' },
      {
        name: 'single block → its text',
        blocks: [makeBlock('action.result', 'You open the chest.')],
        expected: 'You open the chest.',
      },
    ])('$name', ({ blocks, expected, options }) => {
      expect(renderToString(blocks, options)).toBe(expected);
    });
  });

  describe('smart joining', () => {
    it.each<RenderCase>([
      {
        name: 'consecutive same-key blocks join with single newline',
        blocks: [makeBlock('action.result', 'Taken.'), makeBlock('action.result', 'Taken.')],
        expected: 'Taken.\nTaken.',
      },
      {
        name: 'different-key blocks join with double newline',
        blocks: [
          makeBlock('room.name', 'West of House'),
          makeBlock('room.description', 'You are standing in an open field.'),
        ],
        expected: 'West of House\n\nYou are standing in an open field.',
      },
      {
        name: 'custom blockSeparator overrides the default',
        blocks: [makeBlock('room.name', 'Cellar'), makeBlock('room.description', 'A damp cellar.')],
        options: { blockSeparator: '\n---\n' },
        expected: 'Cellar\n---\nA damp cellar.',
      },
      {
        name: 'mixed block types use smart joining',
        blocks: [
          makeBlock('action.result', 'You open the chest.'),
          makeBlock('action.result', 'Inside you see a sword.'),
          makeBlock('room.description', 'The room is dimly lit.'),
        ],
        expected: 'You open the chest.\nInside you see a sword.\n\nThe room is dimly lit.',
      },
    ])('$name', ({ blocks, expected, options }) => {
      expect(renderToString(blocks, options)).toBe(expected);
    });
  });

  describe('whitespace filtering', () => {
    it.each<RenderCase>([
      {
        name: 'excludes blocks with whitespace-only content',
        blocks: [
          makeBlock('action.result', 'Hello.'),
          makeBlock('action.result', '   '),
          makeBlock('action.result', 'World.'),
        ],
        expected: 'Hello.\nWorld.',
      },
      {
        name: 'returns empty string when all blocks are whitespace',
        blocks: [makeBlock('action.result', '  '), makeBlock('action.result', '\n')],
        expected: '',
      },
    ])('$name', ({ blocks, expected }) => {
      expect(renderToString(blocks)).toBe(expected);
    });
  });

  describe('status block filtering', () => {
    it('excludes status blocks by default', () => {
      const blocks = [
        makeBlock('action.result', 'You go north.'),
        makeBlock('status.room', 'Kitchen'),
        makeBlock('status.score', '5'),
      ];
      expect(renderToString(blocks)).toBe('You go north.');
    });

    it('includes status blocks when includeStatus is true', () => {
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
      ['sharpee-em', 'brightly', '*brightly*'],
      ['sharpee-strong', 'important', '**important**'],
      ['sharpee-item', 'the sword', 'the sword'],
    ])('should render %s decoration as %j in plain text', (className, text, expected) => {
      const blocks = [
        makeDecoratedBlock('action.result', [{ className, content: [text] }]),
      ];
      expect(renderToString(blocks)).toBe(expected);
    });
  });

  describe('ANSI decoration rendering', () => {
    it.each([
      ['sharpee-em', 'emphasis', ANSI.ITALIC],
      ['sharpee-strong', 'bold text', ANSI.BOLD],
      ['sharpee-item', 'the sword', ANSI.CYAN],
      ['sharpee-npc', 'the troll', ANSI.MAGENTA],
    ])(
      'should render %s decoration with correct ANSI code',
      (className, text, code) => {
        const blocks = [
          makeDecoratedBlock('action.result', [{ className, content: [text] }]),
        ];
        expect(renderToString(blocks, { ansi: true })).toBe(
          `${code}${text}${ANSI.RESET}`,
        );
      },
    );

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

    it('should render unknown decoration class without styling', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          { className: 'custom-unknown', content: ['some text'] },
        ]),
      ];
      expect(renderToString(blocks, { ansi: true })).toBe('some text');
    });

    it('should use story-defined hex color for custom decoration class', () => {
      const blocks = [
        makeDecoratedBlock('action.result', [
          { className: 'magic', content: ['sparkles'] },
        ]),
      ];
      const result = renderToString(blocks, {
        ansi: true,
        colors: { magic: '#0000FF' },
      });
      expect(result).toContain('sparkles');
      expect(result).toContain(ANSI.RESET);
      expect(result.length).toBeGreaterThan('sparkles'.length);
    });
  });
});

describe('renderStatusLine', () => {
  it.each<{ name: string; blocks: ITextBlock[]; expected: string }>([
    {
      name: 'returns empty string when no status blocks',
      blocks: [makeBlock('action.result', 'You go north.')],
      expected: '',
    },
    {
      name: 'renders room name only',
      blocks: [makeBlock('status.room', 'West of House')],
      expected: 'West of House',
    },
    {
      name: 'renders all three standard status blocks in order',
      blocks: [
        makeBlock('status.room', 'Kitchen'),
        makeBlock('status.score', '5'),
        makeBlock('status.turns', '3'),
      ],
      expected: 'Kitchen | Score: 5 | Turns: 3',
    },
    {
      name: 'maintains fixed order regardless of input order',
      blocks: [
        makeBlock('status.turns', '10'),
        makeBlock('status.score', '25'),
        makeBlock('status.room', 'Cellar'),
      ],
      expected: 'Cellar | Score: 25 | Turns: 10',
    },
    {
      name: 'omits missing standard blocks',
      blocks: [makeBlock('status.room', 'Attic'), makeBlock('status.turns', '7')],
      expected: 'Attic | Turns: 7',
    },
    {
      name: 'appends custom status blocks after standard ones',
      blocks: [
        makeBlock('status.room', 'Forest'),
        makeBlock('status.score', '0'),
        makeBlock('status.health', '100 HP'),
      ],
      expected: 'Forest | Score: 0 | 100 HP',
    },
    {
      name: 'ignores non-status blocks',
      blocks: [
        makeBlock('action.result', 'You go north.'),
        makeBlock('status.room', 'Kitchen'),
        makeBlock('room.description', 'A warm kitchen.'),
      ],
      expected: 'Kitchen',
    },
  ])('$name', ({ blocks, expected }) => {
    expect(renderStatusLine(blocks)).toBe(expected);
  });
});
