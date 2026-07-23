/**
 * emit-payload.test.ts — ADR-216 payloaded `emit`, compile side: dotted
 * event types (previously mangled to `media . sound . play` — fixed),
 * `with <field> <value> [and …]` flat payloads, `[ … ]` arrays and
 * `{ … }` nested objects (comma-separated inside brackets), value
 * expressions, and the `when` suffix riding after a payload. REAL-PATH:
 * every case drives the real parse → analyze pipeline.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, IRStatement } from '../src';

const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'emit-payload.story'), 'utf8');

describe('payloaded emit (ADR-216)', () => {
  const result = compile(FIXTURE);
  const body = () => result.ir.story.onClauses[0].body as Extract<IRStatement, { kind: 'emit' }>[];

  it('compiles the fixture clean with dotted event types intact', () => {
    expect(result.diagnostics).toEqual([]);
    expect(body().map((s) => s.event)).toEqual([
      'media-sound-play',
      'media-image-show',
      'chord-debug-whereabouts',
    ]);
  });

  it('flat payload fields carry literals verbatim', () => {
    const sound = body()[0];
    expect(sound.payload).toEqual([
      { key: 'src', value: { kind: 'literal', value: 'chime.ogg', valueType: 'string' } },
      { key: 'channel', value: { kind: 'literal', value: 'sfx', valueType: 'string' } },
    ]);
  });

  it('arrays nest objects, and object fields resolve entity references', () => {
    const image = body()[1];
    const hotspots = image.payload!.find((f) => f.key === 'hotspots')!;
    expect(hotspots.value.kind).toBe('array');
    const spot = (hotspots.value as { items: Array<{ kind: string; fields: unknown[] }> }).items[0];
    expect(spot.kind).toBe('object');
    expect(spot.fields).toEqual([
      { key: 'id', value: { kind: 'literal', value: 'well', valueType: 'string' } },
      { key: 'target', value: { kind: 'value', value: { kind: 'entity', id: 'well' } } },
    ]);
  });

  it('value expressions resolve (player ref, possessive world-state read)', () => {
    const debug = body()[2];
    expect(debug.payload).toEqual([
      { key: 'holder', value: { kind: 'value', value: { kind: 'player' } } },
      { key: 'room', value: { kind: 'value', value: { kind: 'field', base: { kind: 'player' }, field: 'location' } } },
    ]);
  });

  it('`when` still rides after a payload; an emit without `with` has no payload field', () => {
    const gated = compile(`story "T" by "T"
  id: t
  version: 0.0.1
  states: calm, stormy

  on every turn
    emit sky-crack with volume 11 when stormy
    emit petted
  end on

create the Hall
  a room

  A hall.
`);
    expect(gated.diagnostics).toEqual([]);
    const statements = gated.ir.story.onClauses[0].body as Extract<IRStatement, { kind: 'emit' }>[];
    expect(statements[0].stmtWhen).toEqual({ kind: 'story-state', state: 'stormy' });
    expect(statements[0].payload).toEqual([
      { key: 'volume', value: { kind: 'literal', value: '11', valueType: 'number' } },
    ]);
    expect(statements[1].payload).toBeUndefined();
    expect(statements[1].event).toBe('petted');
  });
});
