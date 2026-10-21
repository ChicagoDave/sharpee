/**
 * claim-fragment-gate.ts — the claims fragment's canonical gate (ADR-367
 * D4, AC-5): does every claim block read back as the lock would write it?
 *
 * Purpose: the lock writes one shape — a `claim`/`never` head at two spaces,
 *   its predicate at four, then `needs rooms`, `needs things`, `needs verbs`
 *   in that order, each at most once, and one blank line between blocks.
 *   A hand edit that keeps the shape passes; one that reorders, re-indents
 *   or doubles a line is named by block, so the next lock never fights a
 *   second formatting and the fragment is one writer's text. Not a
 *   reformatter: it reports, it does not rewrite. Top-level comments
 *   (`##`) and blank lines around them are free (ADR-249); a shared set at
 *   two spaces before the first block is free. Browser-safe.
 *
 * Public interface: `checkCanonicalFragment`, `FragmentCanonicalCheck`,
 *   `FragmentProblem`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

/** One place the fragment departs from the lock's shape. */
export interface FragmentProblem {
  /** The block's head (`claim the deed box is open`), or `the fragment` for a file-level problem. */
  readonly where: string;
  /** 1-based line. */
  readonly line: number;
  readonly message: string;
}

/** What the gate found — never an exception. */
export type FragmentCanonicalCheck =
  | { status: 'canonical' }
  | { status: 'non-canonical'; problems: readonly FragmentProblem[] };

const NEEDS_ORDER = ['rooms', 'things', 'verbs'] as const;

/**
 * Check a fragment's text against the lock's shape.
 *
 * @param text the fragment, whole
 * @returns `canonical`, or every problem by block and line
 */
export function checkCanonicalFragment(text: string): FragmentCanonicalCheck {
  const problems: FragmentProblem[] = [];
  const file = (line: number, message: string) => problems.push({ where: 'the fragment', line, message });
  if (text.length > 0 && !text.endsWith('\n')) file(text.split('\n').length, 'the file does not end with a newline');
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();

  let inClaims = false;
  let seenEnd = false;
  let blockHead: string | undefined;
  let blockLine = 0;
  let predicateSeen = false;
  let needsSeen: string[] = [];
  let blocks = 0;
  let blankSinceLastBlock = 0;
  let lastBlockEnded = false;

  const closeBlock = () => {
    if (blockHead !== undefined && !predicateSeen) problems.push({ where: blockHead, line: blockLine, message: 'the block has no predicate line' });
    if (blockHead !== undefined) { lastBlockEnded = true; blankSinceLastBlock = 0; }
    blockHead = undefined;
    predicateSeen = false;
    needsSeen = [];
  };

  for (const [index, raw] of lines.entries()) {
    const line = index + 1;
    if (raw.includes('\t')) file(line, 'a tab character; the lock indents with spaces');
    if (raw !== raw.trimEnd()) file(line, 'trailing whitespace');
    const trimmed = raw.trim();
    if (trimmed === '') {
      // The blank line that closes a block is the one the lock writes.
      if (blockHead !== undefined) { closeBlock(); blankSinceLastBlock = 1; }
      else if (lastBlockEnded) blankSinceLastBlock += 1;
      continue;
    }
    if (trimmed.startsWith('##')) {
      // A comment closes a block too (ADR-249: comments are top level), and
      // the blank lines around a comment are the author's — the one-blank
      // rule binds two blocks that touch, not a block and a note.
      if (blockHead !== undefined) closeBlock();
      lastBlockEnded = false;
      blankSinceLastBlock = 0;
      continue;
    }
    if (seenEnd) { file(line, 'text after `end claims`'); continue; }
    if (!inClaims) {
      if (trimmed === 'claims' && raw === 'claims') { inClaims = true; continue; }
      file(line, 'expected `claims` (or a `##` comment) before the first block');
      continue;
    }
    if (raw === 'end claims') { closeBlock(); seenEnd = true; continue; }
    const indent = raw.length - raw.trimStart().length;
    if (indent === 2) {
      const head = /^(claim|never) (.+)$/.exec(trimmed);
      if (head) {
        if (blockHead !== undefined) problems.push({ where: blockHead, line, message: 'the next block follows without a blank line' });
        else if (lastBlockEnded && blankSinceLastBlock !== 1) problems.push({ where: trimmed, line, message: `${blankSinceLastBlock} blank lines before the block; the lock writes exactly one` });
        closeBlock();
        lastBlockEnded = false;
        blockHead = trimmed;
        blockLine = line;
        blocks += 1;
        continue;
      }
      const shared = /^needs (rooms|things|verbs):/.exec(trimmed);
      if (shared && blocks === 0 && blockHead === undefined) continue;   // the shared set, before any block
      file(line, shared ? 'a shared `needs` line after the first block' : `unexpected line at two spaces: ${trimmed}`);
      continue;
    }
    if (indent === 4 && blockHead !== undefined) {
      const needs = /^needs (rooms|things|verbs): ?(.*)$/.exec(trimmed);
      if (needs) {
        const key = needs[1];
        if (!predicateSeen) problems.push({ where: blockHead, line, message: `\`needs ${key}\` before the predicate line` });
        if (needsSeen.includes(key)) problems.push({ where: blockHead, line, message: `\`needs ${key}\` twice` });
        const last = needsSeen[needsSeen.length - 1];
        if (last !== undefined && NEEDS_ORDER.indexOf(key as typeof NEEDS_ORDER[number]) < NEEDS_ORDER.indexOf(last as typeof NEEDS_ORDER[number])) {
          problems.push({ where: blockHead, line, message: `\`needs ${key}\` after \`needs ${last}\`; the lock writes rooms, things, verbs` });
        }
        if (needs[2].trim().length === 0) problems.push({ where: blockHead, line, message: `\`needs ${key}\` names nothing; the lock omits an empty list` });
        needsSeen.push(key);
        continue;
      }
      if (predicateSeen) problems.push({ where: blockHead, line, message: `a second predicate line: ${trimmed}` });
      predicateSeen = true;
      continue;
    }
    if (blockHead === undefined) file(line, `a line at ${indent} spaces outside any block: ${trimmed}`);
    else problems.push({ where: blockHead, line, message: `a line at ${indent} spaces inside \`${blockHead}\`; the lock indents the body by four` });
  }
  if (blockHead !== undefined) closeBlock();
  if (inClaims && !seenEnd) file(lines.length, 'no `end claims` line');
  if (!inClaims && text.trim().length > 0) file(1, 'no `claims` block');

  return problems.length === 0 ? { status: 'canonical' } : { status: 'non-canonical', problems };
}
