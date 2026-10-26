/**
 * claim-fragment-gate.test.ts — the claims fragment's canonical gate
 * (ADR-367 D4, AC-5): the lock's own output passes, the repository's two
 * fragments pass, and each departure from the lock's shape is named by block
 * and line. Not a reformatter: nothing here rewrites.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkCanonicalFragment } from '../src/claims/claim-fragment-gate.js';
import { claimsFragmentWith, spliceClaimIntoFragment } from '@sharpee/chord';

const BLOCK = '  claim the deed box is open\n    the deed box is open\n    needs rooms: the Folly\n    needs things: the deed box\n    needs verbs: open\n';
const SECOND = '  never the deed box leaves the Folly\n    the deed box is not in the Folly\n    needs rooms: the Folly\n';

const problemsOf = (text: string) => {
  const check = checkCanonicalFragment(text);
  return check.status === 'canonical' ? [] : check.problems.map((p) => `${p.where}:${p.line}: ${p.message}`);
};

describe('the lock\'s own output is canonical', () => {
  it('a fresh fragment, a spliced second lock, a shared set, and comments between blocks', () => {
    const fresh = claimsFragmentWith('Fernhill', BLOCK);
    expect(checkCanonicalFragment(fresh)).toEqual({ status: 'canonical' });
    const spliced = spliceClaimIntoFragment(fresh, SECOND);
    expect(checkCanonicalFragment(spliced)).toEqual({ status: 'canonical' });
    const shared = `claims\n  needs rooms: the Folly\n  needs verbs: open\n\n${BLOCK}\n## a note between blocks\n\n${SECOND}end claims\n`;
    expect(checkCanonicalFragment(shared)).toEqual({ status: 'canonical' });
    expect(checkCanonicalFragment('')).toEqual({ status: 'canonical' });
  });

  it('the repository\'s fragments pass', () => {
    for (const file of ['fernhill/fernhill.claims.chord', 'upps/upps.claims.chord']) {
      const path = resolve(__dirname, '..', '..', '..', 'branch-stories', file);
      if (!existsSync(path)) continue;
      expect(problemsOf(readFileSync(path, 'utf8'))).toEqual([]);
    }
  });
});

describe('departures are named by block and line', () => {
  it('needs out of order, twice, before the predicate, or empty', () => {
    expect(problemsOf(`claims\n  claim x\n    the deed box is open\n    needs things: the deed box\n    needs rooms: the Folly\nend claims\n`))
      .toEqual(['claim x:5: `needs rooms` after `needs things`; the lock writes rooms, things, verbs']);
    expect(problemsOf(`claims\n  claim x\n    the deed box is open\n    needs rooms: a\n    needs rooms: b\nend claims\n`))
      .toEqual(['claim x:5: `needs rooms` twice']);
    expect(problemsOf(`claims\n  claim x\n    needs rooms: a\n    the deed box is open\nend claims\n`))
      .toEqual(['claim x:3: `needs rooms` before the predicate line']);
    expect(problemsOf(`claims\n  claim x\n    the deed box is open\n    needs verbs:\nend claims\n`))
      .toEqual(['claim x:4: `needs verbs` names nothing; the lock omits an empty list']);
  });

  it('blank lines between blocks: none, or two', () => {
    expect(problemsOf(`claims\n${BLOCK}${SECOND}end claims\n`))
      .toEqual(['claim the deed box is open:7: the next block follows without a blank line']);
    expect(problemsOf(`claims\n${BLOCK}\n\n${SECOND}end claims\n`))
      .toEqual(['never the deed box leaves the Folly:9: 2 blank lines before the block; the lock writes exactly one']);
  });

  it('indentation, tabs, trailing whitespace, a missing newline, a missing end', () => {
    expect(problemsOf(`claims\n   claim x\n    the deed box is open\nend claims\n`))
      .toEqual(['the fragment:2: a line at 3 spaces outside any block: claim x', 'the fragment:3: a line at 4 spaces outside any block: the deed box is open']);
    expect(problemsOf(`claims\n  claim x\n      the deed box is open\nend claims\n`))
      .toEqual(['claim x:3: a line at 6 spaces inside `claim x`; the lock indents the body by four', 'claim x:2: the block has no predicate line']);
    expect(problemsOf(`claims\n\tclaim x\n    the deed box is open\nend claims\n`)[0]).toContain('a tab character');
    expect(problemsOf(`claims\n  claim x \n    the deed box is open\nend claims\n`)[0]).toBe('the fragment:2: trailing whitespace');
    expect(problemsOf(`claims\n${BLOCK}end claims`)).toEqual(['the fragment:7: the file does not end with a newline']);
    expect(problemsOf(`claims\n${BLOCK}`)).toEqual(['the fragment:6: no `end claims` line']);
  });
});
