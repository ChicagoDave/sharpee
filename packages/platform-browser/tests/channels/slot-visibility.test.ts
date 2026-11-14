/**
 * slot-visibility.test.ts — what a story shows is visible (GH #718).
 *
 * The sidebar and media slots start hidden on the default page. These
 * cases drive a real `Renderer` (channel-service) through the default
 * browser stack — manifest → packets → DOM — and assert on the slots'
 * `hidden` state and contents: a slot is shown while it holds content and
 * concealed again when emptied; a slot the page shows on its own is never
 * hidden; an appending channel keeps its list in an author's named
 * element; and the platform's `audibility` channel draws no panel.
 *
 * Owner context: platform-browser test suite.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { CmgtPacket, TurnPacket } from '@sharpee/if-domain';
import { createRenderer, type Renderer } from '@sharpee/channel-service';
import {
  mountDefaultLayout,
  registerDefaultBrowserRenderers,
  type BrowserDefaultLayout,
} from '../../src/channels';

const MANIFEST: CmgtPacket = {
  kind: 'cmgt',
  protocol_version: 1,
  channels: [
    { id: 'image:main', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'image:overlay', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'clock', contentType: 'json', mode: 'replace', emit: 'sparse' },
    { id: 'tide', contentType: 'json', mode: 'replace', emit: 'sparse' },
    { id: 'workings', contentType: 'json', mode: 'append', emit: 'sparse' },
    { id: 'audibility', contentType: 'json', mode: 'append', emit: 'sparse' },
  ],
};

const turn = (payload: Record<string, unknown>): TurnPacket =>
  ({ kind: 'turn', turn_id: 1, payload } as unknown as TurnPacket);

let renderer: Renderer;
let layout: BrowserDefaultLayout;

/** Mount the default layout the way the default page presents it: both slots hidden. */
function mount(options: { slotsHidden: boolean }): void {
  document.body.innerHTML = '';
  const root = document.createElement('div');
  document.body.appendChild(root);
  layout = mountDefaultLayout(root);
  layout.sidebar.hidden = options.slotsHidden;
  layout.media.hidden = options.slotsHidden;
  renderer = createRenderer({ warn: () => {}, fallbackOutput: () => {} });
  registerDefaultBrowserRenderers(renderer, layout, { audio: { handleAudioEvent() {} } });
  renderer.applyCmgt(MANIFEST);
}

describe('a hidden sidebar is shown while it holds a panel', () => {
  beforeEach(() => mount({ slotsHidden: true }));

  it('stays hidden until a channel has a value, then shows', () => {
    expect(layout.sidebar.hidden).toBe(true);
    renderer.applyTurnPacket(turn({ clock: { hour: 'evening' } }));
    expect(layout.sidebar.hidden).toBe(false);
    expect(layout.sidebar.querySelector('#channel-panel-clock')).not.toBeNull();
  });

  it('stays shown while another panel remains, and hides when the last one goes', () => {
    renderer.applyTurnPacket(turn({ clock: { hour: 'evening' }, tide: { state: 'ebbing' } }));
    renderer.applyTurnPacket(turn({ clock: null }));
    expect(layout.sidebar.querySelector('#channel-panel-clock')).toBeNull();
    expect(layout.sidebar.hidden).toBe(false);

    renderer.applyTurnPacket(turn({ tide: null }));
    expect(layout.sidebar.querySelector('.sharpee-channel-panel')).toBeNull();
    expect(layout.sidebar.hidden).toBe(true);
  });

  it('shows again when a value arrives after it was emptied', () => {
    renderer.applyTurnPacket(turn({ clock: { hour: 'evening' } }));
    renderer.applyTurnPacket(turn({ clock: null }));
    expect(layout.sidebar.hidden).toBe(true);
    renderer.applyTurnPacket(turn({ clock: { hour: 'midnight' } }));
    expect(layout.sidebar.hidden).toBe(false);
  });
});

describe('a hidden media slot is shown while it holds an image layer', () => {
  beforeEach(() => mount({ slotsHidden: true }));

  it('stays hidden until an image is shown, then shows with the image inside', () => {
    expect(layout.media.hidden).toBe(true);
    renderer.applyTurnPacket(turn({ 'image:main': { src: 'images/lantern.png' } }));
    expect(layout.media.hidden).toBe(false);
    expect(layout.media.querySelector('#img-layer-main img')!.getAttribute('src')).toBe('images/lantern.png');
  });

  it('stays shown while another layer remains, and hides when the last one goes', () => {
    renderer.applyTurnPacket(
      turn({ 'image:main': { src: 'images/lantern.png' }, 'image:overlay': { src: 'images/fog.png' } }),
    );
    renderer.applyTurnPacket(turn({ 'image:main': null }));
    expect(layout.media.querySelector('#img-layer-main')).toBeNull();
    expect(layout.media.hidden).toBe(false);

    renderer.applyTurnPacket(turn({ 'image:overlay': null }));
    expect(layout.media.querySelector('.image-layer')).toBeNull();
    expect(layout.media.hidden).toBe(true);
  });
});

describe('a slot the page shows on its own is never hidden', () => {
  beforeEach(() => mount({ slotsHidden: false }));

  it('the sidebar stays shown after its last panel is removed', () => {
    renderer.applyTurnPacket(turn({ clock: { hour: 'evening' } }));
    renderer.applyTurnPacket(turn({ clock: null }));
    expect(layout.sidebar.querySelector('.sharpee-channel-panel')).toBeNull();
    expect(layout.sidebar.hidden).toBe(false);
  });

  it('the media slot stays shown after its last image is hidden', () => {
    renderer.applyTurnPacket(turn({ 'image:main': { src: 'images/lantern.png' } }));
    renderer.applyTurnPacket(turn({ 'image:main': null }));
    expect(layout.media.querySelector('.image-layer')).toBeNull();
    expect(layout.media.hidden).toBe(false);
  });
});

describe('an appending channel keeps its list in an author-named element', () => {
  beforeEach(() => mount({ slotsHidden: true }));

  const named = (tag: string, id: string): HTMLElement => {
    const el = document.createElement(tag);
    el.id = id;
    layout.status.appendChild(el);
    return el;
  };

  it('adds one list item per value to a list, across turns', () => {
    const list = named('ul', 'workings');
    renderer.applyTurnPacket(turn({ workings: 'unbind: releases a ward' }));
    renderer.applyTurnPacket(turn({ workings: 'hush: stills a bell' }));
    const items = Array.from(list.querySelectorAll('li.sharpee-channel-entry'));
    expect(items.map((item) => item.textContent)).toEqual(['unbind: releases a ward', 'hush: stills a bell']);
    expect(document.getElementById('channel-panel-workings')).toBeNull();
    expect(layout.sidebar.hidden).toBe(true);
  });

  it('adds one classed span per value to any other element, and takes several values in one turn', () => {
    const box = named('div', 'workings');
    renderer.applyTurnPacket(turn({ workings: ['unbind: releases a ward', 'hush: stills a bell'] }));
    const entries = Array.from(box.children);
    expect(entries.map((entry) => entry.tagName)).toEqual(['SPAN', 'SPAN']);
    expect(entries.map((entry) => entry.className)).toEqual(['sharpee-channel-entry', 'sharpee-channel-entry']);
    expect(entries.map((entry) => entry.textContent)).toEqual(['unbind: releases a ward', 'hush: stills a bell']);
  });

  it('a replacing channel still writes its value as the named element text', () => {
    const span = named('span', 'clock');
    renderer.applyTurnPacket(turn({ clock: 'evening' }));
    renderer.applyTurnPacket(turn({ clock: 'midnight' }));
    expect(span.textContent).toBe('midnight');
    expect(span.children).toHaveLength(0);
  });

  it('a structured value still goes to the panel, leaving the named element alone', () => {
    const list = named('ul', 'workings');
    renderer.applyTurnPacket(turn({ workings: [{ name: 'unbind' }] }));
    expect(list.children).toHaveLength(0);
    expect(document.getElementById('channel-panel-workings')).not.toBeNull();
  });
});

describe('the audibility channel draws nothing', () => {
  beforeEach(() => mount({ slotsHidden: true }));

  it('leaves no panel and leaves the sidebar hidden when a sound is heard', () => {
    renderer.applyTurnPacket(
      turn({ audibility: [{ sourceRoomId: 'undercroft', kind: 'tolling', audibilityTier: 'full', turn: 14 }] }),
    );
    expect(document.getElementById('channel-panel-audibility')).toBeNull();
    expect(layout.sidebar.children).toHaveLength(0);
    expect(layout.sidebar.hidden).toBe(true);
  });
});
