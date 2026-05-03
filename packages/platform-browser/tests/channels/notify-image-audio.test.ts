import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChannelDefinition } from '@sharpee/if-domain';
import {
  createDeathChannelRenderer,
  createEndgameChannelRenderer,
  createScoreNotifyChannelRenderer,
} from '../../src/channels/notify';
import {
  createImageChannelRenderer,
  createImagePreloadChannelRenderer,
} from '../../src/channels/image';
import {
  createSoundChannelRenderer,
  createMusicChannelRenderer,
  createAmbientChannelRenderer,
  type AudioManagerLike,
} from '../../src/channels/audio';

const eventText: ChannelDefinition = { id: 'x', contentType: 'text', mode: 'event' };
const replaceJson: ChannelDefinition = { id: 'x', contentType: 'json', mode: 'replace' };
const eventJson: ChannelDefinition = { id: 'x', contentType: 'json', mode: 'event' };

describe('notify renderers', () => {
  let slot: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
    slot = document.createElement('div');
    document.body.appendChild(slot);
  });

  it('death appends a notification with data-kind="death"', () => {
    const r = createDeathChannelRenderer(slot);
    r.onValue('You have died.', eventText);
    const notify = slot.querySelector('.notify-death');
    expect(notify).not.toBeNull();
    expect(notify?.textContent).toBe('You have died.');
    expect(notify?.getAttribute('data-kind')).toBe('death');
  });

  it('endgame appends a notification with data-kind="endgame"', () => {
    const r = createEndgameChannelRenderer(slot);
    r.onValue('Victory!', eventText);
    expect(slot.querySelector('.notify-endgame')?.textContent).toBe('Victory!');
  });

  it('score_notify appends with data-kind="score_notify"', () => {
    const r = createScoreNotifyChannelRenderer(slot, { dismissAfterMs: 0 });
    r.onValue('+5 points', eventText);
    expect(slot.querySelector('.notify-score_notify')?.textContent).toBe('+5 points');
  });

  it('multiple notifications stack', () => {
    const death = createDeathChannelRenderer(slot);
    const score = createScoreNotifyChannelRenderer(slot, { dismissAfterMs: 0 });
    death.onValue('died', eventText);
    score.onValue('+1', eventText);
    expect(slot.children.length).toBe(2);
  });
});

describe('image renderers', () => {
  let slot: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
    slot = document.createElement('div');
    slot.style.position = 'relative';
    document.body.appendChild(slot);
  });

  it('mounts an <img> at the layer wrapper', () => {
    const r = createImageChannelRenderer(slot, 'main');
    r.onValue({ src: 'pic.png', alt: 'a picture' }, replaceJson);
    const wrapper = slot.querySelector('#img-layer-main') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.getAttribute('data-layer')).toBe('main');
    const img = wrapper.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain('pic.png');
    expect(img.alt).toBe('a picture');
  });

  it('null hides the layer', () => {
    const r = createImageChannelRenderer(slot, 'overlay');
    r.onValue({ src: 'a.png' }, replaceJson);
    expect(document.getElementById('img-layer-overlay')).not.toBeNull();
    r.onValue(null, replaceJson);
    expect(document.getElementById('img-layer-overlay')).toBeNull();
  });

  it('z-index follows the conventional ordering', () => {
    const bg = createImageChannelRenderer(slot, 'background');
    const main = createImageChannelRenderer(slot, 'main');
    const ovr = createImageChannelRenderer(slot, 'overlay');
    bg.onValue({ src: 'bg.png' }, replaceJson);
    main.onValue({ src: 'm.png' }, replaceJson);
    ovr.onValue({ src: 'o.png' }, replaceJson);
    const zBg = (document.getElementById('img-layer-background') as HTMLElement).style.zIndex;
    const zMain = (document.getElementById('img-layer-main') as HTMLElement).style.zIndex;
    const zOvr = (document.getElementById('img-layer-overlay') as HTMLElement).style.zIndex;
    expect(Number(zBg)).toBeLessThan(Number(zMain));
    expect(Number(zMain)).toBeLessThan(Number(zOvr));
  });

  it('hotspots dispatch onHotspotCommand on click', () => {
    const onCommand = vi.fn();
    const r = createImageChannelRenderer(slot, 'main', { onHotspotCommand: onCommand });
    r.onValue(
      {
        src: 'p.png',
        hotspots: [{ x: 10, y: 20, width: 30, height: 30, command: 'press red button' }],
      },
      replaceJson,
    );
    const btn = slot.querySelector('.image-hotspot') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('data-command')).toBe('press red button');
    btn.click();
    expect(onCommand).toHaveBeenCalledWith('press red button');
  });

  it('preload creates a detached <img> without appending to slot', () => {
    const r = createImagePreloadChannelRenderer(slot);
    r.onValue({ src: 'preload.png' }, eventJson);
    // Detached — slot stays empty.
    expect(slot.children.length).toBe(0);
  });
});

describe('audio renderers', () => {
  function makeMockAudio(): AudioManagerLike & { events: Array<{ type: string; data: unknown }> } {
    const events: Array<{ type: string; data: unknown }> = [];
    return {
      events,
      handleAudioEvent(event) {
        events.push(event);
      },
    };
  }

  it('sound forwards to AudioManager as audio.sfx', () => {
    const audio = makeMockAudio();
    const r = createSoundChannelRenderer(audio);
    r.onValue({ src: 'beep.wav', bus: 'fx' }, eventJson);
    expect(audio.events).toEqual([
      { type: 'audio.sfx', data: { src: 'beep.wav', bus: 'fx' } },
    ]);
  });

  it('music object → audio.music.play; null → audio.music.stop', () => {
    const audio = makeMockAudio();
    const r = createMusicChannelRenderer(audio);
    r.onValue({ src: 'song.ogg' }, replaceJson);
    r.onValue(null, replaceJson);
    expect(audio.events).toEqual([
      { type: 'audio.music.play', data: { src: 'song.ogg' } },
      { type: 'audio.music.stop', data: {} },
    ]);
  });

  it('ambient renderer injects channel id in the play payload', () => {
    const audio = makeMockAudio();
    const r = createAmbientChannelRenderer(audio, 'wind');
    r.onValue({ src: 'w.ogg', volume: 0.5 }, replaceJson);
    r.onValue(null, replaceJson);
    expect(audio.events).toEqual([
      {
        type: 'audio.ambient.play',
        data: { channel: 'wind', src: 'w.ogg', volume: 0.5 },
      },
      { type: 'audio.ambient.stop', data: { channel: 'wind' } },
    ]);
  });
});
