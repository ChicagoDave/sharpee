import { describe, it, expect, beforeEach } from 'vitest';
import type { ChannelDefinition } from '@sharpee/if-domain';
import {
  createAnimationChannelRenderer,
  createAnimateChannelRenderer,
  createTransitionChannelRenderer,
  createLayoutChannelRenderer,
  createClearChannelRenderer,
} from '../../src/channels/animation';

const eventJson: ChannelDefinition = { id: 'x', contentType: 'json', mode: 'event' };
const replaceJson: ChannelDefinition = { id: 'x', contentType: 'json', mode: 'replace' };

describe('animation renderer', () => {
  let slot: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
    slot = document.createElement('div');
    document.body.appendChild(slot);
  });

  it('adds animation-${name} class to slot', () => {
    const r = createAnimationChannelRenderer(slot);
    r.onValue({ name: 'shake' }, eventJson);
    expect(slot.classList.contains('animation-shake')).toBe(true);
  });

  it('targets a sibling element when target id is present', () => {
    const target = document.createElement('div');
    target.id = 'target-el';
    document.body.appendChild(target);
    const r = createAnimationChannelRenderer(slot);
    r.onValue({ name: 'pulse', target: 'target-el' }, eventJson);
    expect(target.classList.contains('animation-pulse')).toBe(true);
    expect(slot.classList.contains('animation-pulse')).toBe(false);
  });
});

describe('animate renderer', () => {
  let slot: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
    slot = document.createElement('div');
    document.body.appendChild(slot);
  });

  it('applies inline properties + duration', () => {
    const r = createAnimateChannelRenderer(slot);
    r.onValue(
      { properties: { opacity: '0.5', color: 'red' }, duration: 250 },
      eventJson,
    );
    expect(slot.style.opacity).toBe('0.5');
    expect(slot.style.color).toBe('red');
    expect(slot.style.transitionDuration).toBe('250ms');
  });
});

describe('transition renderer', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('adds transition-${kind} class to root', () => {
    const r = createTransitionChannelRenderer(root);
    r.onValue({ kind: 'fade', durationMs: 100 }, eventJson);
    expect(root.classList.contains('transition-fade')).toBe(true);
  });
});

describe('layout renderer', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('writes the configuration to data-layout', () => {
    const r = createLayoutChannelRenderer(root);
    r.onValue({ rows: ['status', 'main', 'input'] }, replaceJson);
    expect(root.getAttribute('data-layout')).toBe(
      JSON.stringify({ rows: ['status', 'main', 'input'] }),
    );
  });

  it('null clears the data-layout attribute', () => {
    const r = createLayoutChannelRenderer(root);
    r.onValue({ a: 1 }, replaceJson);
    expect(root.hasAttribute('data-layout')).toBe(true);
    r.onValue(null, replaceJson);
    expect(root.hasAttribute('data-layout')).toBe(false);
  });
});

describe('clear renderer', () => {
  it('toggles clear-active class for one frame', () => {
    document.body.innerHTML = '';
    const root = document.createElement('div');
    document.body.appendChild(root);
    const r = createClearChannelRenderer(root);
    r.onValue({ target: 'main' }, eventJson);
    expect(root.classList.contains('clear-active')).toBe(true);
  });
});
