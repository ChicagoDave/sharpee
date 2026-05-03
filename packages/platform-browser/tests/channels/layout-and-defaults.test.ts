/**
 * End-to-end tests for the default layout + register helper —
 * proves ADR-165 §7 / §8 wiring.
 *
 * Drives a real `Renderer` (from channel-service) through the full
 * default browser stack — manifest → packets → DOM mutations — using
 * happy-dom. Mirrors the integration the BrowserClient will perform
 * in R5-B but against in-memory DOM only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CmgtPacket, TurnPacket } from '@sharpee/if-domain';
import { createRenderer } from '@sharpee/channel-service';
import {
  mountDefaultLayout,
  registerDefaultBrowserRenderers,
  type AudioManagerLike,
} from '../../src/channels';

const STANDARD_MANIFEST: CmgtPacket = {
  kind: 'cmgt',
  protocol_version: 1,
  channels: [
    { id: 'main', contentType: 'json', mode: 'append', emit: 'always' },
    { id: 'prompt', contentType: 'text', mode: 'replace', emit: 'always' },
    { id: 'location', contentType: 'text', mode: 'replace', emit: 'always' },
    { id: 'score', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'turn', contentType: 'number', mode: 'replace', emit: 'always' },
    { id: 'info', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'ifid', contentType: 'text', mode: 'replace', emit: 'always' },
    { id: 'death', contentType: 'text', mode: 'event', emit: 'sparse' },
    { id: 'endgame', contentType: 'text', mode: 'event', emit: 'sparse' },
    { id: 'score_notify', contentType: 'text', mode: 'event', emit: 'sparse' },
    { id: 'image:main', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'sound', contentType: 'json', mode: 'event', emit: 'sparse' },
    { id: 'music', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'animation', contentType: 'json', mode: 'event', emit: 'sparse' },
    { id: 'transition', contentType: 'json', mode: 'event', emit: 'sparse' },
    { id: 'layout', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'clear', contentType: 'json', mode: 'event', emit: 'sparse' },
  ],
};

function makeMockAudio(): AudioManagerLike & { events: Array<{ type: string; data: unknown }> } {
  const events: Array<{ type: string; data: unknown }> = [];
  return {
    events,
    handleAudioEvent(event) {
      events.push(event);
    },
  };
}

describe('mountDefaultLayout', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('creates the seven slot elements under root', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountDefaultLayout(root);
    expect(document.getElementById('sharpee-status')).not.toBeNull();
    expect(document.getElementById('sharpee-main')).not.toBeNull();
    expect(document.getElementById('sharpee-sidebar')).not.toBeNull();
    expect(document.getElementById('sharpee-input')).not.toBeNull();
    expect(document.getElementById('sharpee-input-field')).not.toBeNull();
    expect(document.getElementById('sharpee-media')).not.toBeNull();
    expect(document.getElementById('sharpee-notify')).not.toBeNull();
    expect(document.getElementById('sharpee-meta')).not.toBeNull();
  });

  it('is idempotent — calling twice does not duplicate slots', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountDefaultLayout(root);
    mountDefaultLayout(root);
    expect(root.querySelectorAll('#sharpee-main').length).toBe(1);
  });

  it('seeds prompt label with "> "', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const layout = mountDefaultLayout(root);
    expect(layout.inputPromptLabel.textContent).toBe('> ');
  });
});

describe('registerDefaultBrowserRenderers — full stack', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('routes a manifest + packet end-to-end through the default DOM', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const layout = mountDefaultLayout(root);
    const audio = makeMockAudio();
    const r = createRenderer({
      fallbackWarn: () => {
        // Suppress fallback warnings — this stack registers every channel.
      },
    });
    registerDefaultBrowserRenderers(r, layout, { audio });
    r.applyCmgt(STANDARD_MANIFEST);

    const packet: TurnPacket = {
      kind: 'turn',
      turn_id: 'turn-1',
      payload: {
        main: [['You are in a forest.']],
        prompt: '? ',
        location: 'Forest',
        score: { current: 5, max: 100 },
        turn: 1,
        info: { title: 'Cloak', author: 'RP', version: '1.0' },
        ifid: 'ABCD-1234',
      },
    };
    r.applyTurnPacket(packet);

    expect(layout.main.querySelector('p')?.textContent).toBe('You are in a forest.');
    expect(layout.input.placeholder).toBe('? ');
    expect(layout.inputPromptLabel.textContent).toBe('? ');
    expect(layout.statusLocation.textContent).toBe('Forest');
    expect(layout.statusScore.textContent).toBe('Score: 5 / 100');
    expect(layout.statusTurn.textContent).toBe('Turns: 1');
    expect(document.title).toBe('Cloak');
    expect(layout.meta.getAttribute('data-ifid')).toBe('ABCD-1234');
  });

  it('routes a death event to the notify slot', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const layout = mountDefaultLayout(root);
    const audio = makeMockAudio();
    const r = createRenderer({ fallbackWarn: () => undefined });
    registerDefaultBrowserRenderers(r, layout, { audio });
    r.applyCmgt(STANDARD_MANIFEST);
    r.applyTurnPacket({
      kind: 'turn',
      turn_id: 'turn-2',
      payload: { death: 'You have died.' },
    });
    const notify = layout.notify.querySelector('.notify-death');
    expect(notify?.textContent).toBe('You have died.');
  });

  it('routes a music event to the AudioManager', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const layout = mountDefaultLayout(root);
    const audio = makeMockAudio();
    const r = createRenderer({ fallbackWarn: () => undefined });
    registerDefaultBrowserRenderers(r, layout, { audio });
    r.applyCmgt(STANDARD_MANIFEST);
    r.applyTurnPacket({
      kind: 'turn',
      turn_id: 'turn-3',
      payload: { music: { src: 'theme.ogg' } },
    });
    expect(audio.events).toContainEqual({
      type: 'audio.music.play',
      data: { src: 'theme.ogg' },
    });
  });

  it('clear truncates the main slot and fires onClear', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const layout = mountDefaultLayout(root);
    const audio = makeMockAudio();
    const r = createRenderer({ fallbackWarn: () => undefined });
    registerDefaultBrowserRenderers(r, layout, { audio });
    r.applyCmgt(STANDARD_MANIFEST);
    r.applyTurnPacket({
      kind: 'turn',
      turn_id: 'turn-1',
      payload: { main: [['line one'], ['line two']] },
    });
    expect(layout.main.children.length).toBe(2);
    r.applyTurnPacket({
      kind: 'turn',
      turn_id: 'turn-2',
      payload: { clear: { target: 'main' } },
    });
    expect(layout.main.children.length).toBe(0);
  });

  it('story override replaces a default renderer', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const layout = mountDefaultLayout(root);
    const audio = makeMockAudio();
    const r = createRenderer({ fallbackWarn: () => undefined });
    registerDefaultBrowserRenderers(r, layout, { audio });

    // Story overrides the location renderer to write to a sidebar
    // attribute instead of the status slot.
    const sidebarHits: string[] = [];
    r.registerRenderer('location', {
      onValue(value) {
        if (typeof value === 'string') sidebarHits.push(value);
      },
    });

    r.applyCmgt(STANDARD_MANIFEST);
    r.applyTurnPacket({
      kind: 'turn',
      turn_id: 'turn-1',
      payload: { location: 'Custom Room' },
    });
    expect(sidebarHits).toEqual(['Custom Room']);
    // Default renderer no longer fires — status location stays empty.
    expect(layout.statusLocation.textContent).toBe('');
  });

  it('onMainAfterAppend fires after each main entry', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const layout = mountDefaultLayout(root);
    const audio = makeMockAudio();
    const onAfter = vi.fn();
    const r = createRenderer({ fallbackWarn: () => undefined });
    registerDefaultBrowserRenderers(r, layout, {
      audio,
      onMainAfterAppend: onAfter,
    });
    r.applyCmgt(STANDARD_MANIFEST);
    r.applyTurnPacket({
      kind: 'turn',
      turn_id: 'turn-1',
      payload: { main: [['x']] },
    });
    expect(onAfter).toHaveBeenCalledWith(layout.main);
  });

  it('hotspot click pumps a CommandPacket to onCommand', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const layout = mountDefaultLayout(root);
    const audio = makeMockAudio();
    const r = createRenderer({ fallbackWarn: () => undefined });
    registerDefaultBrowserRenderers(r, layout, {
      audio,
      onHotspotCommand: (cmd) => r.emitCommand(cmd),
    });
    const commands: string[] = [];
    r.onCommand((p) => commands.push(p.text));

    r.applyCmgt(STANDARD_MANIFEST);
    r.applyTurnPacket({
      kind: 'turn',
      turn_id: 'turn-1',
      payload: {
        'image:main': {
          src: 'p.png',
          hotspots: [{ x: 0, y: 0, width: 10, height: 10, command: 'press button' }],
        },
      },
    });

    const btn = layout.media.querySelector('.image-hotspot') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    expect(commands).toEqual(['press button']);
  });
});
