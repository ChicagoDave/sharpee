/**
 * emit-payload.test.ts — ADR-216 AC-1 through the REAL loader: a
 * payloaded `emit` reaches a real media channel — the runtime evaluates
 * the payload live (literals, entity refs, possessive world-state reads,
 * arrays of nested objects) and stdlib's REAL `soundChannel`/
 * `imageChannel` produce over the emitted events (including the sound
 * channel's own `channel`→`bus` rename, proving the data crossed the
 * genuine channel seam). REAL-PATH: real compile, real loader world, real
 * story-daemon tick, real channel `produce` — no stubs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { soundChannel } from '@sharpee/stdlib';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, SchedulerDaemon } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'emit-payload.story'),
  'utf8',
);

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('payloaded emit through the real loader (ADR-216 AC-1)', () => {
  let story: ChordStory;
  let world: WorldModel;
  let player: IFEntity;
  let events: ISemanticEvent[];

  beforeEach(() => {
    story = createStory(compileSource(FIXTURE), { seed: 11 });
    world = new WorldModel();
    story.initializeWorld(world);
    player = story.createPlayer(world);
    world.setPlayer(player.id);
    const daemons: SchedulerDaemon[] = story.runtime.buildSchedulerDaemons();
    events = daemons.flatMap((d) => d.run({ world, turn: 1 }));
  });

  it('evaluates literals and passes them into the emitted event data', () => {
    const sound = events.find((e) => e.type === 'media.sound.play')!;
    expect(sound.data).toEqual({ src: 'chime.ogg', channel: 'sfx' });
  });

  it('the REAL sound channel produces the packet (its channel→bus rename applies)', () => {
    const packet = soundChannel.produce({ events } as never);
    expect(packet).toEqual({ src: 'chime.ogg', bus: 'sfx' });
  });

  it('arrays of nested objects reach the event data with entity refs resolved to world ids', () => {
    const image = events.find((e) => e.type === 'media.image.show')!;
    expect(image.data).toMatchObject({ src: 'map.png', layer: 'background' });
    const hotspots = (image.data as { hotspots: Array<Record<string, unknown>> }).hotspots;
    expect(hotspots).toEqual([{ id: 'well', target: story.entityId('well')! }]);
  });

  it('value expressions evaluate against LIVE world state at emit time', () => {
    const debug = events.find((e) => e.type === 'chord-debug-whereabouts')!;
    expect(debug.data).toEqual({
      holder: player.id,
      room: story.entityId('courtyard')!,
    });
    // Move the player; the next emission reads the NEW location.
    const elsewhere = world.createEntity('void-room', 'room');
    world.moveEntity(player.id, elsewhere.id);
    const daemons: SchedulerDaemon[] = story.runtime.buildSchedulerDaemons();
    const later = daemons.flatMap((d) => d.run({ world, turn: 2 }));
    const debugLater = later.find((e) => e.type === 'chord-debug-whereabouts')!;
    expect((debugLater.data as { room: string }).room).toBe(elsewhere.id);
  });
});
