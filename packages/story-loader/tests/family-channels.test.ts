/**
 * family-channels.test.ts — ADR-241 AC-3 through the REAL loader: declared
 * family channels (`define ambient wind`, `define layer floorplan`) and the
 * implied `main` bed register on stdlib's REAL StdlibChannelRegistry via the
 * REAL stdlib builders (capability gates inherited — `sound` / `images`),
 * their `produce` projects the REAL emitted media events, and the bare
 * `stop ambient` stops ONLY the default bed — the named bed keeps playing
 * (AC-3's explicit negative case). REAL-PATH: no stubs of any owned
 * dependency; events come from the loader's own statement machinery run
 * through the real scheduler daemon.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { StdlibChannelRegistry } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { createStory, SchedulerDaemon } from '../src';

const SOURCE = `story "Beds" by "T"
  id: beds
  version: 0.0.1

  on every turn
    play ambient rain in wind
    play ambient rain
    stop ambient
    show image map in floorplan
  end on

create the Hall
  a room

  A hall.

create the player
  starts in the Hall

  You.

define sound rain from "audio/rain.wav"
define image map from "img/map.png"
define ambient wind
define layer floorplan
`;

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const load = () => {
  const story = createStory(compileSource(SOURCE), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  story.onEngineReady({ getPluginRegistry: () => ({ register: () => {} }) });
  const registry = new StdlibChannelRegistry();
  story.registerChannels(registry);
  const daemons: SchedulerDaemon[] = story.runtime.buildSchedulerDaemons();
  const events: ISemanticEvent[] = daemons.flatMap((d) => d.run({ world, turn: 1 }));
  return { registry, events };
};

describe('family channel registration (ADR-241 AC-3, REAL-PATH)', () => {
  it('registers the declared bed, the implied main bed, and the declared layer with inherited gates', () => {
    const { registry } = load();

    const wind = registry.get('ambient:wind')!;
    expect(wind).toBeDefined();
    expect(wind.mode).toBe('replace');
    expect(wind.gatedBy).toBe('sound'); // inherited from createAmbientChannel, no new gating logic

    // The implied main bed — used bare, never declared — auto-registers.
    const main = registry.get('ambient:main')!;
    expect(main).toBeDefined();
    expect(main.gatedBy).toBe('sound');

    const floorplan = registry.get('image:floorplan')!;
    expect(floorplan).toBeDefined();
    expect(floorplan.gatedBy).toBe('images'); // inherited from createImageChannel
  });

  it('the named bed produces its play emit — the bare stop does NOT stop it', () => {
    const { registry, events } = load();
    // events: play(wind), play(main), stop(main), image.show(floorplan)
    const value = registry.get('ambient:wind')!.produce({ events } as never);
    expect(value).toMatchObject({ src: 'audio/rain.wav', channel: 'wind' });
  });

  it('the bare stop stops the default bed only — ambient:main reads null (stop wins)', () => {
    const { registry, events } = load();
    const value = registry.get('ambient:main')!.produce({ events } as never);
    expect(value).toBeNull();
  });

  it('without the stop, the main bed produces its own play emit — beds never cross', () => {
    const { registry, events } = load();
    const beforeStop = events.filter((e) => e.type !== 'media.ambient.stop');
    const value = registry.get('ambient:main')!.produce({ events: beforeStop } as never);
    expect(value).toMatchObject({ src: 'audio/rain.wav', channel: 'main' });
    // And the wind play is invisible to main (channel filter, not event-type filter).
    const windOnly = events.filter(
      (e) => e.type === 'media.ambient.play' && (e.data as { channel?: string }).channel === 'wind',
    );
    expect(registry.get('ambient:main')!.produce({ events: windOnly } as never)).toBeUndefined();
  });

  it('the declared layer projects the real show emit through the image-layer channel', () => {
    const { registry, events } = load();
    const value = registry.get('image:floorplan')!.produce({ events } as never);
    expect(value).toMatchObject({ src: 'img/map.png', layer: 'floorplan' });
  });
});
