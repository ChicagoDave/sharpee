/**
 * `renderToString` and `renderStatusLine` — flatten an `ITextBlock[]`
 * to a single display string.
 *
 * Owner context: `@sharpee/channel-service`. Block-flattening helpers
 * consumed by transcript tooling, chat overlays, and dev scripts.
 * Channel-service is downstream of engine and upstream of clients —
 * the right dependency position for a helper that walks ITextBlock[]
 * for display.
 *
 * Public interface:
 *  - `renderToString(blocks, options?)` — flatten blocks to a joined
 *    string with smart separators between same-key vs different-key
 *    block transitions. Decorations translate to ANSI codes when
 *    `options.ansi === true`, or to bracket-stripped plain text
 *    otherwise.
 *  - `renderStatusLine(blocks, options?)` — render `status.*` blocks
 *    to a single pipe-separated line for status-bar display.
 *  - `CLIRenderOptions` — option shape (ansi, blockSeparator,
 *    colors, includeStatus). Name preserved from the prior
 *    `@sharpee/text-service` home; not CLI-specific in practice
 *    (zifmia uses `renderToString` for browser chat bubbles).
 *
 * Ported from `@sharpee/text-service/src/cli-renderer.ts` per ADR-174
 * Phase 2 (OQ-1 resolution, 2026-05-10). The original file remains
 * compilable in text-service through Phase 2 for zifmia's sake; Phase
 * 3 deletes the package.
 *
 * @see ADR-174 — Decoration Architecture and Engine-Internal Prose Pipeline
 * @see ADR-163 — Channel-Service Platform
 */

import type { ITextBlock, TextContent, IDecoration } from '@sharpee/text-blocks';
import { isStatusBlock } from '@sharpee/text-blocks';

/**
 * CLI render options
 */
export interface CLIRenderOptions {
  /** Enable ANSI color codes (default: false) */
  ansi?: boolean;

  /** Separator between blocks (default: '\n\n') */
  blockSeparator?: string;

  /** Story-defined color mappings */
  colors?: Record<string, string>;

  /** Include status blocks in output (default: false) */
  includeStatus?: boolean;
}

/**
 * ANSI escape codes
 */
const ANSI = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  ITALIC: '\x1b[3m',
  UNDERLINE: '\x1b[4m',
  STRIKETHROUGH: '\x1b[9m',

  // Colors
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',

  // Bright colors
  BRIGHT_RED: '\x1b[91m',
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_YELLOW: '\x1b[93m',
  BRIGHT_BLUE: '\x1b[94m',
  BRIGHT_MAGENTA: '\x1b[95m',
  BRIGHT_CYAN: '\x1b[96m',
  BRIGHT_WHITE: '\x1b[97m',
};

/**
 * Map decoration class names to ANSI codes. Keys are the final
 * `IDecoration.className` strings emitted by the parser — the
 * `sharpee-`-prefixed platform vocabulary names plus a couple of
 * legacy bare names retained for transitional safety.
 */
const DECORATION_ANSI: Record<string, string> = {
  'sharpee-em': ANSI.ITALIC,
  'sharpee-strong': ANSI.BOLD,
  'sharpee-item': ANSI.CYAN,
  'sharpee-room': ANSI.YELLOW,
  'sharpee-npc': ANSI.MAGENTA,
  'sharpee-command': ANSI.GREEN,
  'sharpee-direction': ANSI.WHITE,
  'sharpee-u': ANSI.UNDERLINE,
  'sharpee-st': ANSI.STRIKETHROUGH,
  'sharpee-code': ANSI.WHITE,
};

/**
 * Approximate hex colors to ANSI by extracting the dominant channel
 * (or detecting a balanced mix) and mapping to the closest ANSI hue.
 */
function hexToAnsi(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return pickPrimaryAnsi(r, g, b) ?? pickMixedAnsi(r, g, b) ?? ANSI.WHITE;
}

/** One channel dominates the other two — return its hue, or null. */
function pickPrimaryAnsi(r: number, g: number, b: number): string | null {
  if (r > g && r > b) return r > 180 ? ANSI.BRIGHT_RED : ANSI.RED;
  if (g > r && g > b) return g > 180 ? ANSI.BRIGHT_GREEN : ANSI.GREEN;
  if (b > r && b > g) return b > 180 ? ANSI.BRIGHT_BLUE : ANSI.BLUE;
  return null;
}

/** Two or three channels are roughly equal and bright — pick the mix. */
function pickMixedAnsi(r: number, g: number, b: number): string | null {
  if (r > 200 && g > 200) return ANSI.BRIGHT_YELLOW;
  if (r > 200 && b > 200) return ANSI.BRIGHT_MAGENTA;
  if (g > 200 && b > 200) return ANSI.BRIGHT_CYAN;
  if (r > 180 && g > 180 && b > 180) return ANSI.BRIGHT_WHITE;
  return null;
}

/**
 * Render TextContent to string
 */
function renderContent(
  content: ReadonlyArray<TextContent>,
  options: CLIRenderOptions
): string {
  return content
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      // IDecoration
      return renderDecoration(item, options);
    })
    .join('');
}

/**
 * Render a decoration to string
 */
function renderDecoration(decoration: IDecoration, options: CLIRenderOptions): string {
  // ADR-183 void breaks map to terminal line breaks. Non-web clients have no CSS,
  // so the renderer maps the class to behavior directly (independent of ansi).
  if (decoration.className === 'sharpee-br') return '\n';
  if (decoration.className === 'sharpee-p') return '\n\n';

  const innerText = renderContent(decoration.content, options);

  if (!options.ansi) {
    // Plain text fallback
    if (decoration.className === 'sharpee-em') return `*${innerText}*`;
    if (decoration.className === 'sharpee-strong') return `**${innerText}**`;
    return innerText;
  }

  // ANSI rendering
  let ansiCode = DECORATION_ANSI[decoration.className];

  // Check for story-defined color, keyed on the final class name.
  if (!ansiCode && options.colors?.[decoration.className]) {
    const hex = options.colors[decoration.className];
    if (hex.startsWith('#')) {
      ansiCode = hexToAnsi(hex);
    }
  }

  if (ansiCode) {
    return `${ansiCode}${innerText}${ANSI.RESET}`;
  }

  // Unknown decoration class name - render without styling
  return innerText;
}

/**
 * Render a single block to string
 */
function renderBlock(block: ITextBlock, options: CLIRenderOptions): string {
  const text = renderContent(block.content, options);

  // Apply block-level styling
  if (options.ansi) {
    if (block.key === 'room.name') {
      return `${ANSI.BOLD}${ANSI.YELLOW}${text}${ANSI.RESET}`;
    }
    if (block.key === 'action.blocked' || block.key === 'error') {
      return `${ANSI.RED}${text}${ANSI.RESET}`;
    }
  }

  return text;
}

/**
 * Render `ITextBlock[]` to string for display.
 *
 * Uses smart joining: single newline between consecutive blocks of the
 * same key, double newline (or `options.blockSeparator`) between blocks
 * of different keys. This keeps related output together (e.g., multiple
 * "Taken." messages) while separating distinct sections.
 *
 * @example
 * const output = renderToString(blocks, { ansi: true });
 * console.log(output);
 */
export function renderToString(
  blocks: ITextBlock[],
  options: CLIRenderOptions = {}
): string {
  const opts: CLIRenderOptions = {
    ansi: false,
    blockSeparator: '\n\n',
    includeStatus: false,
    ...options,
  };

  // Filter out status blocks unless explicitly included
  const filteredBlocks = opts.includeStatus
    ? blocks
    : blocks.filter((b) => !isStatusBlock(b));

  // Render each block and pair with its key for smart joining
  const rendered = filteredBlocks
    .map((block) => ({ key: block.key, text: renderBlock(block, opts) }))
    .filter((item) => item.text.trim());

  if (rendered.length === 0) return '';

  // Smart join: \n between same block types, \n\n between different types
  const parts: string[] = [rendered[0].text];
  for (let i = 1; i < rendered.length; i++) {
    const prev = rendered[i - 1];
    const curr = rendered[i];
    // Use single newline for consecutive same-type blocks, double for different
    const separator = prev.key === curr.key ? '\n' : opts.blockSeparator;
    parts.push(separator + curr.text);
  }

  return parts.join('');
}

/**
 * Render status blocks to a single line (for status bar display).
 *
 * @example
 * const status = renderStatusLine(blocks);
 * // "West of House | Score: 0 | Turns: 1"
 */
export function renderStatusLine(
  blocks: ITextBlock[],
  options: CLIRenderOptions = {}
): string {
  const statusBlocks = blocks.filter(isStatusBlock);

  const parts: string[] = [];

  // Render in specific order
  const roomBlock = statusBlocks.find((b) => b.key === 'status.room');
  if (roomBlock) {
    parts.push(renderContent(roomBlock.content, options));
  }

  const scoreBlock = statusBlocks.find((b) => b.key === 'status.score');
  if (scoreBlock) {
    parts.push(`Score: ${renderContent(scoreBlock.content, options)}`);
  }

  const turnsBlock = statusBlocks.find((b) => b.key === 'status.turns');
  if (turnsBlock) {
    parts.push(`Turns: ${renderContent(turnsBlock.content, options)}`);
  }

  // Add any custom status blocks
  const knownKeys = new Set(['status.room', 'status.score', 'status.turns']);
  const customBlocks = statusBlocks.filter((b) => !knownKeys.has(b.key));
  for (const block of customBlocks) {
    parts.push(renderContent(block.content, options));
  }

  return parts.join(' | ');
}
