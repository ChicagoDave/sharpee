/**
 * channel-capability.test.ts — ADR-216 AC-3/AC-4 through the REAL loader:
 * a declared channel registers on stdlib's REAL StdlibChannelRegistry and
 * projects only its `take` fields from the last matching event;
 * `client has sound` runs against two REAL capability objects (one
 * sound-capable, one text-only) — the capable run emits the media event,
 * the text-only run emits the fallback phrase (AC-3's explicit
 * dual-capability requirement). REAL-PATH: no stubs of any owned
 * dependency; the engine-capabilities getter is exercised via
 * onEngineReady's structural surface exactly as GameEngine provides it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { StdlibChannelRegistry } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { createStory, SchedulerDaemon } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'compass.story'),
  'utf8',
);

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

const load = (capabilities?: Record<string, unknown>) => {
  const story = createStory(compileSource(FIXTURE), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  story.onEngineReady({
    getPluginRegistry: () => ({ register: () => {} }),
    ...(capabilities ? { getClientCapabilities: () => capabilities } : {}),
  });
  const registry = new StdlibChannelRegistry();
  story.registerChannels(registry);
  const daemons: SchedulerDaemon[] = story.runtime.buildSchedulerDaemons();
  const events = daemons.flatMap((d) => d.run({ world, turn: 1 }));
  return { story, world, registry, events };
};

const SOUND_CLIENT = { text: true, sound: true, images: true };
const TEXT_ONLY = { text: true, sound: false, images: false };

describe('custom channels + client has (ADR-216 AC-3/AC-4, REAL-PATH)', () => {
  it('the declared channel registers on the real registry with its gate and projects only its take fields', () => {
    const { story, registry, events } = load(SOUND_CLIENT);
    const compass = registry.get('compass')!;
    expect(compass).toBeDefined();
    expect(compass.mode).toBe('replace');
    expect(compass.gatedBy).toBe('images');
    const packet = compass.produce({ events } as never);
    expect(packet).toEqual({ heading: 'north', target: story.entityId('well')! });
    // `windspeed` was emitted but NOT taken — the projection is real.
  });

  it('produces nothing when no matching event occurred this turn', () => {
    const { registry } = load(SOUND_CLIENT);
    const compass = registry.get('compass')!;
    expect(compass.produce({ events: [] } as never)).toBeUndefined();
  });

  it('AC-3: a sound-capable client gets the media event, not the text fallback', () => {
    const { events } = load(SOUND_CLIENT);
    expect(events.some((e) => e.type === 'media.sound.play')).toBe(true);
    expect(messageIdsOf(events)).not.toContain('roar-text');
  });

  it('AC-3: a text-only client gets the fallback phrase, not the media event', () => {
    const { events } = load(TEXT_ONLY);
    expect(events.some((e) => e.type === 'media.sound.play')).toBe(false);
    expect(messageIdsOf(events)).toContain('roar-text');
  });

  it('with NO capability source at all, gateable flags read false (text-only default)', () => {
    const { events } = load(undefined);
    expect(events.some((e) => e.type === 'media.sound.play')).toBe(false);
    expect(messageIdsOf(events)).toContain('roar-text');
  });
});
