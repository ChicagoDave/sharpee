/**
 * lexer-server.ts — the real Chord lexer as a line-oriented service.
 *
 * Reads one JSON request per line on stdin, writes one JSON response per line on
 * stdout. The point is that the tokens a natively-drawn editor colors come from
 * `packages/chord/src/lexer.ts` — the same lexer `sharpee compose` runs — rather
 * than from a second, hand-written definition of Chord syntax (ADR-341 D4/AC-5).
 *
 * Request:  {"id":1,"text":"story …"}
 * Response: {"id":1,"tokenCount":8545,"lineCount":1756,"lexMs":3.2,"tokens":[k,l,c,el,ec, …],"commentLines":[…]}
 *
 * Tokens are a flat number array, five entries each — kind index into KINDS,
 * 1-based line, 1-based column, end line, end column — because a token array of
 * objects for a 1755-line file is a quarter of a megabyte of JSON per keystroke.
 *
 * Public interface: stdin/stdout NDJSON. Owner context: Avalonia ("O6") spike, Phase 3.
 */
import { createInterface } from 'node:readline';
import { lex } from '@chord/lexer.js';
import { DiagnosticBag } from '@chord/diagnostics.js';

/** Kind order the C# side indexes into; append only. */
const KINDS = [
  'word', 'number', 'string', 'colon', 'comma', 'lparen', 'rparen',
  'lbracket', 'rbracket', 'lbrace', 'rbrace', 'compare', 'punct',
] as const;

const kindIndex = new Map<string, number>(KINDS.map((k, i) => [k, i]));

process.stdout.write(JSON.stringify({ ready: true, kinds: KINDS, lexer: 'packages/chord/src/lexer.ts' }) + '\n');

createInterface({ input: process.stdin }).on('line', line => {
  if (line.length === 0) return;
  let request: { id: number; text: string };
  try {
    request = JSON.parse(line);
  } catch (error) {
    process.stdout.write(JSON.stringify({ id: -1, error: String(error) }) + '\n');
    return;
  }

  const started = performance.now();
  const lines = lex(request.text, new DiagnosticBag());
  const lexMs = performance.now() - started;

  const tokens: number[] = [];
  const commentLines: number[] = [];
  let tokenCount = 0;
  for (const sourceLine of lines) {
    // Comment lines (indent-0 `##`, ADR-249) carry no tokens and are colored
    // whole, the way SyntaxHighlighter.swift colors them.
    if (sourceLine.comment) { commentLines.push(sourceLine.lineNo); continue; }
    for (const token of sourceLine.tokens) {
      tokens.push(
        kindIndex.get(token.kind) ?? KINDS.length - 1,
        token.span.line, token.span.column,
        token.span.endLine, token.span.endColumn,
      );
      tokenCount++;
    }
  }

  process.stdout.write(JSON.stringify({
    id: request.id,
    tokenCount,
    lineCount: lines.length,
    lexMs: Math.round(lexMs * 1000) / 1000,
    tokens,
    commentLines,
  }) + '\n');
});
