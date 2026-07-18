/**
 * media-sugar.test.ts — ADR-216 AC-2 through the REAL loader: sugar
 * statements (lowered at compile onto payloaded emits) drive stdlib's
 * REAL media channels — sound, music (with the looping flag), and a real
 * layer-scoped image channel — from a real story-daemon tick. REAL-PATH:
 * no stubs anywhere; assertions are on the channels' produced packets.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { createImageChannel, musicChannel, soundChannel } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { createStory, SchedulerDaemon } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'media-sugar.story'),
  'utf8',
);

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('media sugar through the real loader and channels (ADR-216 AC-2)', () => {
  const load = (): ISemanticEvent[] => {
    const story = createStory(compileSource(FIXTURE), { seed: 11 });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    const daemons: SchedulerDaemon[] = story.runtime.buildSchedulerDaemons();
    return daemons.flatMap((d) => d.run({ world, turn: 1 }));
  };

  it('the real sound channel produces the declared asset path', () => {
    const events = load();
    expect(soundChannel.produce({ events } as never)).toEqual({ src: 'audio/chime.ogg' });
  });

  it('the real music channel produces src + the looping flag as a boolean', () => {
    const events = load();
    expect(musicChannel.produce({ events } as never)).toEqual({ src: 'audio/overture.ogg', loop: true });
  });

  it('a real layer-scoped image channel produces the shown image', () => {
    const events = load();
    const background = createImageChannel('background');
    expect(background.produce({ events } as never)).toMatchObject({ src: 'img/map.png', layer: 'background' });
  });
});
