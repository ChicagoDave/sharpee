/**
 * announce-mode.test.ts — ADR-262 D3: the `use scoring, announce <mode>`
 * suffix. Parse + analyze: the mode reaches `ir.announceModes`, an unknown
 * mode is `analysis.invalid-announce-mode`, and absence leaves the default
 * (the loader supplies `all`).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (headerBody: string) => `story
  title: The Folly
  authors: T
  id: folly
  story-version: 0.0.1
${headerBody}
create the Lawn
  a room

  A lawn.

create the player
  starts in the Lawn

  You.
`;

const compileOk = (headerBody: string) => {
  const r = compile(story(headerBody));
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  return { ir: r.ir, errors };
};

const LADDER =
  '  score lamp worth 200\n' +
  '  use scoring, announce collapsed\n' +
  '    rank "Curious Visitor" at 0\n' +
  '    rank "Attentive Guest" at 40\n';

describe('use scoring, announce <mode> (ADR-262 D3)', () => {
  it('carries the announce mode into ir.announceModes', () => {
    const { ir, errors } = compileOk(LADDER);
    expect(errors).toEqual([]);
    expect(ir.announceModes).toEqual({ scoring: 'collapsed' });
  });

  it('accepts each of the four modes', () => {
    for (const mode of ['all', 'collapsed', 'combined', 'silent']) {
      const { ir, errors } = compileOk(
        `  score lamp worth 200\n  use scoring, announce ${mode}\n    rank "A" at 0\n`,
      );
      expect(errors, mode).toEqual([]);
      expect(ir.announceModes.scoring, mode).toBe(mode);
    }
  });

  it('rejects an unknown mode with analysis.invalid-announce-mode', () => {
    const { errors } = compileOk(
      '  score lamp worth 200\n  use scoring, announce loudly\n    rank "A" at 0\n',
    );
    expect(errors.map((e) => e.code)).toContain('analysis.invalid-announce-mode');
  });

  it('leaves announceModes without a scoring key when no announce is given', () => {
    const { ir, errors } = compileOk(
      '  score lamp worth 200\n  use scoring\n    rank "A" at 0\n',
    );
    expect(errors).toEqual([]);
    expect(ir.announceModes.scoring).toBeUndefined();
  });

  it('flags a malformed suffix (comma without announce) at parse time', () => {
    const { errors } = compileOk(
      '  score lamp worth 200\n  use scoring, collapsed\n    rank "A" at 0\n',
    );
    expect(errors.map((e) => e.code)).toContain('parse.use-announce');
  });
});
