/**
 * dynamic-channels.test.ts — ADR-241 D4 client leg (AC-4; AC-5
 * package-level precursor): manifest-driven family renderer binding
 * (`ambient:*` → AudioManager, `image:*` → image layers beyond the
 * hard-coded three) and the generic panel for everything else — one
 * labelled box per channel id, hidden until its first value, with
 * replace/append/event mode behavior; exact-id story renderers
 * registered AFTER the defaults win and the panel never double-renders.
 *
 * Drives a real `Renderer` (channel-service) through the full default
 * browser stack — manifest → packets → DOM — like
 * layout-and-defaults.test.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { CmgtPacket, TurnPacket } from '@sharpee/if-domain';
import { createRenderer, type Renderer } from '@sharpee/channel-service';
import {
  mountDefaultLayout,
  registerDefaultBrowserRenderers,
  type AudioManagerLike,
  type BrowserDefaultLayout,
} from '../../src/channels';

const DYNAMIC_MANIFEST: CmgtPacket = {
  kind: 'cmgt',
  protocol_version: 1,
  channels: [
    { id: 'ambient:wind', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'image:floorplan', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'clock', contentType: 'json', mode: 'replace', emit: 'sparse' },
    { id: 'discoveries', contentType: 'json', mode: 'append', emit: 'sparse' },
    { id: 'pulse', contentType: 'json', mode: 'event', emit: 'sparse' },
  ],
};

const turn = (payload: Record<string, unknown>): TurnPacket =>
  ({ kind: 'turn', turn_id: 1, payload } as unknown as TurnPacket);

function makeMockAudio(): AudioManagerLike & { events: Array<{ type: string; data: unknown }> } {
  const events: Array<{ type: string; data: unknown }> = [];
  return {
    events,
    handleAudioEvent(event) {
      events.push(event);
    },
  };
}

let renderer: Renderer;
let layout: BrowserDefaultLayout;
let audio: ReturnType<typeof makeMockAudio>;

beforeEach(() => {
  document.body.innerHTML = '';
  const root = document.createElement('div');
  document.body.appendChild(root);
  layout = mountDefaultLayout(root);
  renderer = createRenderer({ warn: () => {}, fallbackOutput: () => {} });
  audio = makeMockAudio();
  registerDefaultBrowserRenderers(renderer, layout, { audio });
});

describe('family binding from the manifest (ADR-241 D4)', () => {
  it('an ambient:<id> channel with no exact renderer binds to the AudioManager ambient renderer', () => {
    renderer.applyCmgt(DYNAMIC_MANIFEST);
    renderer.applyTurnPacket(turn({ 'ambient:wind': { src: 'audio/night-wind.wav', channel: 'wind' } }));
    expect(audio.events).toEqual([
      { type: 'audio.ambient.play', data: { channel: 'wind', src: 'audio/night-wind.wav' } },
    ]);
  });

  it('a null ambient value stops that bed', () => {
    renderer.applyCmgt(DYNAMIC_MANIFEST);
    renderer.applyTurnPacket(turn({ 'ambient:wind': null }));
    expect(audio.events).toEqual([{ type: 'audio.ambient.stop', data: { channel: 'wind' } }]);
  });

  it('an image:<layer> channel beyond the hard-coded three mounts its <img> in the media slot', () => {
    renderer.applyCmgt(DYNAMIC_MANIFEST);
    renderer.applyTurnPacket(turn({ 'image:floorplan': { src: 'images/floorplan.png' } }));
    const img = layout.media.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('images/floorplan.png');
  });
});

describe('generic panel (ADR-241 D4, AC-4)', () => {
  it('is hidden until the first value arrives, then shows one labelled box with key/value rows', () => {
    renderer.applyCmgt(DYNAMIC_MANIFEST);
    expect(document.getElementById('channel-panel-clock')).toBeNull(); // hidden until first value

    renderer.applyTurnPacket(turn({ clock: { hour: 'evening' } }));
    const box = document.getElementById('channel-panel-clock')!;
    expect(box).not.toBeNull();
    expect(layout.sidebar.contains(box)).toBe(true);
    expect(box.querySelector('.sharpee-channel-panel-title')!.textContent).toBe('clock');
    const rows = box.querySelectorAll('.sharpee-channel-panel-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('hour');
    expect(rows[0].textContent).toContain('evening');
  });

  it('replace mode overwrites the rows', () => {
    renderer.applyCmgt(DYNAMIC_MANIFEST);
    renderer.applyTurnPacket(turn({ clock: { hour: 'evening' } }));
    renderer.applyTurnPacket(turn({ clock: { hour: 'past midnight' } }));
    const rows = document.getElementById('channel-panel-clock')!.querySelectorAll('.sharpee-channel-panel-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('past midnight');
    expect(rows[0].textContent).not.toContain('evening');
  });

  it('append mode appends rows', () => {
    renderer.applyCmgt(DYNAMIC_MANIFEST);
    renderer.applyTurnPacket(turn({ discoveries: [{ found: 'the tarnished key' }] }));
    renderer.applyTurnPacket(turn({ discoveries: [{ found: 'the diary page' }] }));
    const rows = document
      .getElementById('channel-panel-discoveries')!
      .querySelectorAll('.sharpee-channel-panel-row');
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain('the diary page');
  });

  it('event mode shows the latest value', () => {
    renderer.applyCmgt(DYNAMIC_MANIFEST);
    renderer.applyTurnPacket(turn({ pulse: { beat: 1 } }));
    renderer.applyTurnPacket(turn({ pulse: { beat: 2 } }));
    const rows = document.getElementById('channel-panel-pulse')!.querySelectorAll('.sharpee-channel-panel-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('2');
  });
});

describe('override precedence (ADR-241 AC-5 precursor)', () => {
  it('an exact-id story renderer registered after the defaults wins — the panel never renders that channel', () => {
    const seen: unknown[] = [];
    renderer.registerRenderer('clock', {
      onValue(value) {
        seen.push(value);
      },
    });
    renderer.applyCmgt(DYNAMIC_MANIFEST);
    renderer.applyTurnPacket(turn({ clock: { hour: 'evening' } }));
    expect(seen).toEqual([{ hour: 'evening' }]);
    expect(document.getElementById('channel-panel-clock')).toBeNull(); // no double-render
  });
});
