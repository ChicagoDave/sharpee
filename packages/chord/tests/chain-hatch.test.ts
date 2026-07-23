/**
 * chain-hatch.test.ts — ADR-094 `define chain <name> from "<module>"`: the TS
 * chain hatch that replaces a stdlib event chain. REAL-PATH: real parse → analyze.
 * Frontend only — the alias is validated against the curated `STDLIB_CHAIN_NAMES`
 * (platform-free); @sharpee/story-loader owns the alias → platform-key binding.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import { STDLIB_CHAIN_NAMES } from '../src/catalog';

const story = (tail: string) => `story "T" by "T"
  id: t
  version: 0.0.1

create the Hall
  a room

  A hall.

create the player
  starts in the Hall

${tail}`;

const errorCodes = (src: string) =>
  compile(src).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

describe('define chain hatch (ADR-094)', () => {
  it('parses to an IR hatch of kind `chain` and flips hasHatches', () => {
    const r = compile(story('define chain opened-revealed from "./reveal.ts"'));
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.ir.hatches).toEqual([
      { name: 'opened-revealed', modulePath: './reveal.ts', hatchKind: 'chain', span: expect.anything() },
    ]);
    expect(r.ir.hasHatches).toBe(true); // a chained story is not browser-pure
  });

  it('rejects an alias that is not a replaceable stdlib chain → analysis.unknown-chain', () => {
    expect(errorCodes(story('define chain not-a-chain from "./x.ts"'))).toEqual(['analysis.unknown-chain']);
  });

  it('a dotted chain name is a parse.dotted-key (ADR-254)', () => {
    expect(errorCodes(story('define chain stdlib.chain.opened-revealed from "./x.ts"'))).toContain(
      'parse.dotted-key',
    );
  });

  it('a missing `from "<module>"` → parse.hatch-from', () => {
    expect(errorCodes(story('define chain opened-revealed'))).toContain('parse.hatch-from');
  });

  it('the curated alias set contains the one stdlib chain', () => {
    expect(STDLIB_CHAIN_NAMES.has('opened-revealed')).toBe(true);
  });
});
