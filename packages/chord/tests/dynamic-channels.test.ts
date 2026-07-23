/**
 * dynamic-channels.test.ts — ADR-241 compile side (AC-2 and the D2–D4
 * compile contracts): `define ambient <word>` / `define layer <word>`
 * declare named family channels; the ambient forms take an optional
 * `in <channel-word>` tail (default bed `main`); channel words beyond the
 * implied defaults must be declared — `analysis.unknown-channel` with a
 * nearest-match suggestion; lowering stamps `channel` onto the
 * media.ambient.* payloads; `ir.channels` carries the additive `family`
 * discriminator. REAL-PATH: real parse → analyze pipeline throughout.
 */
import { describe, expect, it } from 'vitest';
import { compile, IRStatement } from '../src';

const story = (body: string, defines: string) => `story "Estate" by "T"
  id: estate
  version: 0.0.1

  on every turn
${body}  end on

create the Hall
  a room

  A hall.

${defines}`;

const SOUND = 'define sound rain from "audio/rain.wav"\n';
const IMAGE = 'define image map from "img/map.png"\n';

const emits = (source: string) => {
  const result = compile(source);
  expect(result.diagnostics).toEqual([]);
  return {
    ir: result.ir,
    body: result.ir.story.onClauses[0].body as Extract<IRStatement, { kind: 'emit' }>[],
  };
};

const payloadField = (stmt: Extract<IRStatement, { kind: 'emit' }>, key: string) =>
  stmt.payload?.find((f) => f.key === key)?.value;

describe('ambient channel words (ADR-241 D3)', () => {
  it('a declared bed round-trips: play/stop `in wind` stamp the bed word on the payload', () => {
    const { ir, body } = emits(
      story('    play ambient rain in wind\n    stop ambient in wind\n', `${SOUND}define ambient wind\n`),
    );
    expect(body.map((s) => s.event)).toEqual(['media-ambient-play', 'media-ambient-stop']);
    for (const stmt of body) {
      expect(payloadField(stmt, 'channel')).toEqual({ kind: 'literal', value: 'wind', valueType: 'string' });
    }
    expect(ir.channels).toEqual([{ name: 'wind', family: 'ambient', span: expect.anything() }]);
  });

  it('bare play/stop resolve to the implied `main` bed — no declaration required', () => {
    const { ir, body } = emits(story('    play ambient rain\n    stop ambient\n', SOUND));
    for (const stmt of body) {
      expect(payloadField(stmt, 'channel')).toEqual({ kind: 'literal', value: 'main', valueType: 'string' });
    }
    // The implied bed joins the channel manifest exactly once.
    expect(ir.channels).toEqual([{ name: 'main', family: 'ambient', span: expect.anything() }]);
  });

  it('`in main` is the explicit spelling of the default bed, not a second channel', () => {
    const { ir } = emits(story('    play ambient rain in main\n', SOUND));
    expect(ir.channels).toEqual([{ name: 'main', family: 'ambient', span: expect.anything() }]);
  });

  it('a declared `main` bed produces one manifest entry, not an implied duplicate', () => {
    const { ir } = emits(story('    play ambient rain\n', `${SOUND}define ambient main\n`));
    expect(ir.channels).toEqual([{ name: 'main', family: 'ambient', span: expect.anything() }]);
  });

  it('AC-2: an undeclared bed word is analysis.unknown-channel with a nearest-match suggestion', () => {
    const result = compile(story('    play ambient rain in wnd\n', `${SOUND}define ambient wind\n`));
    const diagnostic = result.diagnostics.find((d) => d.code === 'analysis.unknown-channel')!;
    expect(diagnostic).toBeDefined();
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.message).toContain('`wnd` names no declared ambient bed');
    expect(diagnostic.message).toContain('wind'); // the nearest-match suggestion
    expect(diagnostic.message).toContain('define ambient wnd'); // the fix spelling
  });

  it('an undeclared bed on the stop form gates identically', () => {
    const result = compile(story('    stop ambient in wind\n', SOUND));
    expect(result.diagnostics.map((d) => d.code)).toEqual(['analysis.unknown-channel']);
  });
});

describe('image layer words (ADR-241 D3)', () => {
  it('the pre-registered layers are implied — background/main/overlay need no declaration', () => {
    const { ir, body } = emits(
      story('    show image map in background\n    show image map in overlay\n    show image map in main\n', IMAGE),
    );
    expect(body).toHaveLength(3);
    expect(ir.channels).toEqual([]); // pre-registered platform-side; nothing to register
  });

  it('a declared layer beyond the implied three compiles and joins the manifest', () => {
    const { ir, body } = emits(story('    show image map in floorplan\n', `${IMAGE}define layer floorplan\n`));
    expect(payloadField(body[0], 'layer')).toEqual({ kind: 'literal', value: 'floorplan', valueType: 'string' });
    expect(ir.channels).toEqual([{ name: 'floorplan', family: 'layer', span: expect.anything() }]);
  });

  it('AC-2: an undeclared layer word is analysis.unknown-channel with a suggestion', () => {
    const result = compile(story('    show image map in floorplna\n', `${IMAGE}define layer floorplan\n`));
    const diagnostic = result.diagnostics.find((d) => d.code === 'analysis.unknown-channel')!;
    expect(diagnostic).toBeDefined();
    expect(diagnostic.message).toContain('`floorplna` names no declared image layer');
    expect(diagnostic.message).toContain('floorplan');
  });
});

describe('family channel declarations (ADR-241 D2)', () => {
  it('duplicate declarations in one family gate; the same word across families is legal', () => {
    const dup = compile(story('    play ambient rain in wind\n', `${SOUND}define ambient wind\ndefine ambient wind\n`));
    expect(dup.diagnostics.map((d) => d.code)).toEqual(['analysis.duplicate-channel']);

    const cross = compile(
      story(
        '    play ambient rain in wind\n    show image map in wind\n',
        `${SOUND}${IMAGE}define ambient wind\ndefine layer wind\n`,
      ),
    );
    expect(cross.diagnostics).toEqual([]);
    expect(cross.ir.channels).toEqual([
      { name: 'wind', family: 'ambient', span: expect.anything() },
      { name: 'wind', family: 'layer', span: expect.anything() },
    ]);
  });

  it('a family channel name does not collide with a data channel name (separate namespaces)', () => {
    const result = compile(
      story(
        '    play ambient rain in wind\n    emit estate-weather with strength 3\n',
        `${SOUND}define ambient wind\ndefine channel wind
  mode replace
  return strength from estate-weather
end channel
`,
      ),
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.channels).toMatchObject([
      { name: 'wind', family: 'ambient' },
      { name: 'wind', family: 'data', mode: 'replace', fromEvent: 'estate-weather', returns: { kind: 'field', field: 'strength' } },
    ]);
  });

  it('the one-liner parses strictly: missing name and trailing text are parse.channel-name', () => {
    expect(compile(story('    play ambient rain\n', `${SOUND}define ambient\n`)).diagnostics.map((d) => d.code))
      .toContain('parse.channel-name');
    expect(
      compile(story('    play ambient rain\n', `${SOUND}define layer floor plan\n`)).diagnostics.map((d) => d.code),
    ).toContain('parse.channel-name');
  });

  it('a declared-but-unused family channel still joins the manifest (declaration is intent)', () => {
    const { ir } = emits(story('    play ambient rain\n', `${SOUND}define ambient cellar-hum\n`));
    expect(ir.channels).toEqual([
      { name: 'cellar-hum', family: 'ambient', span: expect.anything() },
      { name: 'main', family: 'ambient', span: expect.anything() },
    ]);
  });
});
