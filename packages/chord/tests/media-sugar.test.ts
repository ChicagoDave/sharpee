/**
 * media-sugar.test.ts — ADR-216 AC-2 compile side: typed media sugar
 * lowers at analysis onto payloaded `media.*` emits (no runtime surface),
 * declared assets are typo-checked data references (never hatches), and
 * the never-guess gates fire (unknown asset + suggestion, kind mismatch,
 * duplicates). REAL-PATH: real parse → analyze pipeline throughout.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, IRStatement } from '../src';

const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'media-sugar.story'), 'utf8');

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const story = (body: string, defines: string) => `story "Orchestra" by "T"
  id: orchestra
  version: 0.0.1

  on every turn
${body}  end on

create the Hall
  a room

  A hall.

${defines}`;

describe('media sugar + declared assets (ADR-216 AC-2)', () => {
  it('lowers every sugar form onto payloaded media.* emits with resolved src paths', () => {
    const result = compile(FIXTURE);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.hasHatches).toBe(false); // assets are DATA, never hatches
    const body = result.ir.story.onClauses[0].body as Extract<IRStatement, { kind: 'emit' }>[];
    expect(body.map((s) => [s.event, s.payload])).toEqual([
      ['media.sound.play', [{ key: 'src', value: { kind: 'literal', value: 'audio/chime.ogg', valueType: 'string' } }]],
      [
        'media.music.play',
        [
          { key: 'src', value: { kind: 'literal', value: 'audio/overture.ogg', valueType: 'string' } },
          { key: 'loop', value: { kind: 'value', value: { kind: 'symbol', name: 'true' } } },
        ],
      ],
      [
        'media.image.show',
        [
          { key: 'src', value: { kind: 'literal', value: 'img/map.png', valueType: 'string' } },
          { key: 'layer', value: { kind: 'literal', value: 'background', valueType: 'string' } },
        ],
      ],
      ['media.sound.play', undefined] as never, // placeholder — replaced below
      ['media.transition', [{ key: 'kind', value: { kind: 'literal', value: 'fade', valueType: 'string' } }]],
    ].map((entry, i) => (i === 3 ? ['media.ambient.play', [{ key: 'src', value: { kind: 'literal', value: 'audio/rain.ogg', valueType: 'string' } }]] : entry)));
  });

  it('stop/hide/clear forms lower to their bare events, `when` composes', () => {
    const result = compile(
      story(
        `    stop music
    hide image
    stop ambient
    clear when stormy
`,
        '',
      ).replace('  version: 0.0.1\n', '  version: 0.0.1\n  states: calm, stormy\n'),
    );
    expect(result.diagnostics).toEqual([]);
    const body = result.ir.story.onClauses[0].body as Extract<IRStatement, { kind: 'emit' }>[];
    expect(body.map((s) => s.event)).toEqual(['media.music.stop', 'media.image.hide', 'media.ambient.stop', 'media.clear']);
    expect(body[3].stmtWhen).toEqual({ kind: 'story-state', state: 'stormy' });
  });

  it('an unknown asset → analysis.unknown-asset with a nearest-match suggestion', () => {
    const result = compile(story('    play sound chimes\n', 'define sound chime from "audio/chime.ogg"\n'));
    const diagnostic = result.diagnostics.find((d) => d.code === 'analysis.unknown-asset')!;
    expect(diagnostic).toBeDefined();
    expect(diagnostic.message).toContain('chime');
  });

  it('a kind mismatch → analysis.asset-kind', () => {
    expect(
      errorCodes(story('    play sound map\n', 'define image map from "img/map.png"\n')),
    ).toEqual(['analysis.asset-kind']);
  });

  it('a duplicate asset name → analysis.duplicate-asset', () => {
    expect(
      errorCodes(
        story('    play sound chime\n', 'define sound chime from "a.ogg"\ndefine image chime from "b.png"\n'),
      ),
    ).toEqual(['analysis.duplicate-asset']);
  });
});
