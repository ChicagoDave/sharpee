/**
 * lexer.ts — the Chord line lexer.
 *
 * Purpose: split `.story` source into logical lines, each carrying its
 * indentation, its raw text (prose stays opaque to the parser — design.md
 * §5.2), and a token stream for lines the parser reads as code. Block
 * structure (dedent/`end` termination) is the parser's job; the lexer only
 * measures indents.
 *
 * Public interface: lex(), Line, Token, TokenKind.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 *
 * Invariants:
 * - Every non-blank source line yields exactly one Line, in source order.
 * - `Line.raw` is the untrimmed source text — prose reconstruction never
 *   loses characters the tokenizer didn't understand.
 * - Indentation is spaces only; a tab in leading whitespace is an error
 *   (reported once per line) and is measured as one column.
 */
import { DiagnosticBag } from './diagnostics';
import { Span, spanOf } from './span';

export type TokenKind =
  | 'word' // identifiers, keywords, hyphenated keys, contractions
  | 'number' // 1, 20, 1.0.0
  | 'string' // "double-quoted"
  | 'colon'
  | 'comma'
  | 'lparen'
  | 'rparen'
  | 'punct'; // any other single non-space character (prose punctuation)

export interface Token {
  kind: TokenKind;
  /** Exact source text (for strings, WITHOUT the surrounding quotes). */
  text: string;
  span: Span;
}

/** One non-blank logical line of source. */
export interface Line {
  /** 1-based source line number. */
  lineNo: number;
  /** Leading-space count (tabs count 1 and are reported as errors). */
  indent: number;
  /** Untrimmed source text. */
  raw: string;
  /** Token stream of the trimmed text. */
  tokens: Token[];
  /** True when a blank line (or start of file) immediately precedes this line. */
  afterBlank: boolean;
}

const WORD_RE = /^[A-Za-zÀ-ɏ][A-Za-z0-9À-ɏ'_-]*/;
const NUMBER_RE = /^[0-9]+(?:\.[0-9]+)*/;

/**
 * Tokenize source into logical lines.
 * @param source full `.story` text
 * @param diagnostics receives lex errors (tabs in indentation, unterminated strings)
 * @returns non-blank lines in source order
 */
export function lex(source: string, diagnostics: DiagnosticBag): Line[] {
  const lines: Line[] = [];
  const rawLines = source.split(/\r\n|\n|\r/);
  let afterBlank = true; // start of file counts as a paragraph boundary

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const lineNo = i + 1;
    if (raw.trim() === '') {
      afterBlank = true;
      continue;
    }

    let indent = 0;
    let col = 0;
    while (col < raw.length && (raw[col] === ' ' || raw[col] === '\t')) {
      if (raw[col] === '\t') {
        diagnostics.error(
          'lex.tab-indent',
          'Tabs are not allowed in indentation — use spaces.',
          spanOf(lineNo, col + 1),
        );
      }
      indent++;
      col++;
    }

    lines.push({
      lineNo,
      indent,
      raw,
      tokens: tokenizeLine(raw, lineNo, col, diagnostics),
      afterBlank,
    });
    afterBlank = false;
  }

  return lines;
}

function tokenizeLine(raw: string, lineNo: number, start: number, diagnostics: DiagnosticBag): Token[] {
  const tokens: Token[] = [];
  let pos = start;

  while (pos < raw.length) {
    const ch = raw[pos];
    if (ch === ' ') {
      pos++;
      continue;
    }

    const column = pos + 1;
    if (ch === '"') {
      const close = raw.indexOf('"', pos + 1);
      if (close === -1) {
        diagnostics.error('lex.unterminated-string', 'Unterminated string — missing closing ".', spanOf(lineNo, column, raw.length - pos));
        tokens.push({ kind: 'string', text: raw.slice(pos + 1), span: spanOf(lineNo, column, raw.length - pos) });
        pos = raw.length;
      } else {
        tokens.push({ kind: 'string', text: raw.slice(pos + 1, close), span: spanOf(lineNo, column, close - pos + 1) });
        pos = close + 1;
      }
      continue;
    }

    const rest = raw.slice(pos);
    const word = WORD_RE.exec(rest);
    if (word) {
      tokens.push({ kind: 'word', text: word[0], span: spanOf(lineNo, column, word[0].length) });
      pos += word[0].length;
      continue;
    }
    const num = NUMBER_RE.exec(rest);
    if (num) {
      tokens.push({ kind: 'number', text: num[0], span: spanOf(lineNo, column, num[0].length) });
      pos += num[0].length;
      continue;
    }

    const single: Record<string, TokenKind> = { ':': 'colon', ',': 'comma', '(': 'lparen', ')': 'rparen' };
    tokens.push({ kind: single[ch] ?? 'punct', text: ch, span: spanOf(lineNo, column) });
    pos++;
  }

  return tokens;
}
