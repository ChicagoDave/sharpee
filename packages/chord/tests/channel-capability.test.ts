/**
 * channel-capability.test.ts — ADR-216 compile side: `define channel`
 * (spelling A, ratified 2026-07-18) as a data projection with its gates,
 * and the `client has <capability>` predicate bound to the closed
 * platform flag set (Chord hyphen words → camelCase platform keys).
 * REAL-PATH: real parse → analyze pipeline throughout.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'compass.story'), 'utf8');

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const story = (extra: string) => `story "T" by "T"
  id: t
  version: 0.0.1

create the Hall
  a room

  A hall.

${extra}`;

describe('define channel (ADR-216, spelling A)', () => {
  it('compiles the compass fixture: mode, camelCase gate, source event, projection', () => {
    const result = compile(FIXTURE);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.channels).toEqual([
      {
        name: 'compass',
        family: 'data', // ADR-241: every data projection reads as family 'data'
        mode: 'replace',
        gatedBy: 'images',
        fromEvent: 'chord.compass.updated',
        take: ['heading', 'target'],
        span: expect.anything(),
      },
    ]);
    expect(result.ir.hasHatches).toBe(false); // declaration is pure IR
  });

  it('a bad mode → analysis.channel-mode', () => {
    expect(
      errorCodes(story('define channel c\n  mode sideways\n  from event a.b\n  take x\nend channel\n')),
    ).toEqual(['analysis.channel-mode']);
  });

  it('a missing `from event` → analysis.channel-from', () => {
    expect(errorCodes(story('define channel c\n  mode event\n  take x\nend channel\n'))).toEqual([
      'analysis.channel-from',
    ]);
  });

  it('a missing `take` → analysis.channel-take', () => {
    expect(errorCodes(story('define channel c\n  mode event\n  from event a.b\nend channel\n'))).toEqual([
      'analysis.channel-take',
    ]);
  });

  it('an unknown gate capability → analysis.unknown-capability with a suggestion', () => {
    const result = compile(
      story('define channel c\n  mode event\n  gated by sonud\n  from event a.b\n  take x\nend channel\n'),
    );
    const diagnostic = result.diagnostics.find((d) => d.code === 'analysis.unknown-capability')!;
    expect(diagnostic).toBeDefined();
    expect(diagnostic.message).toContain('sound');
  });

  it('a duplicate channel name → analysis.duplicate-channel', () => {
    const channel = 'define channel c\n  mode event\n  from event a.b\n  take x\nend channel\n';
    expect(errorCodes(story(channel + channel))).toEqual(['analysis.duplicate-channel']);
  });
});

describe('client has <capability> (ADR-216)', () => {
  it('lowers to the camelCase platform key, hyphen words included', () => {
    const result = compile(
      story(`create the lamp
  in the Hall

  A lamp.

  on every turn
    phrase wide when client has split-pane
  end on

define phrase wide
  The view stretches wide.
end phrase
`),
    );
    expect(result.diagnostics).toEqual([]);
    const lamp = result.ir.entities.find((e) => e.id === 'lamp')!;
    const stmt = lamp.onClauses[0].body[0] as { stmtWhen?: unknown };
    expect(stmt.stmtWhen).toEqual({ kind: 'client-has', capability: 'splitPane' });
  });

  it('an unknown capability → analysis.unknown-capability', () => {
    expect(
      errorCodes(
        story(`create the lamp
  in the Hall

  on every turn
    phrase wide when client has widescreen
  end on

define phrase wide
  Wide.
end phrase
`),
      ),
    ).toEqual(['analysis.unknown-capability']);
  });
});
