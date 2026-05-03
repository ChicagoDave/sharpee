import { describe, it, expect, beforeEach } from 'vitest';
import type { ChannelDefinition } from '@sharpee/if-domain';
import { createMainChannelRenderer } from '../../src/channels/main';

const MAIN_DEF: ChannelDefinition = {
  id: 'main',
  contentType: 'json',
  mode: 'append',
  emit: 'always',
};

describe('mainChannelRenderer', () => {
  let slot: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    slot = document.createElement('div');
    document.body.appendChild(slot);
  });

  it('appends one <p> per entry to the slot', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue([['Hello.'], ['Second line.']], MAIN_DEF);
    const ps = slot.querySelectorAll('p');
    expect(ps.length).toBe(2);
    expect(ps[0].textContent).toBe('Hello.');
    expect(ps[1].textContent).toBe('Second line.');
  });

  it('preserves decorations as nested elements', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue(
      [['You see ', { type: 'item', content: ['a brass lamp'] }, '.']],
      MAIN_DEF,
    );
    const p = slot.querySelector('p')!;
    expect(p.textContent).toBe('You see a brass lamp.');
    const item = p.querySelector('[data-deco="item"]');
    expect(item).not.toBeNull();
    expect(item?.classList.contains('deco-item')).toBe(true);
  });

  it('maps em/strong to semantic tags', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue(
      [
        [
          { type: 'em', content: ['italic'] },
          ' ',
          { type: 'strong', content: ['bold'] },
        ],
      ],
      MAIN_DEF,
    );
    expect(slot.querySelector('em')?.textContent).toBe('italic');
    expect(slot.querySelector('strong')?.textContent).toBe('bold');
  });

  it('ignores empty arrays without erroring', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue([], MAIN_DEF);
    expect(slot.children.length).toBe(0);
  });

  it('ignores non-array values defensively', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue('not an array', MAIN_DEF);
    expect(slot.children.length).toBe(0);
  });

  it('onClear empties the slot', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue([['a'], ['b']], MAIN_DEF);
    expect(slot.children.length).toBe(2);
    r.onClear?.('main');
    expect(slot.children.length).toBe(0);
  });

  it('invokes onAfterAppend after each onValue call', () => {
    const calls: HTMLElement[] = [];
    const r = createMainChannelRenderer(slot, {
      onAfterAppend: (s) => calls.push(s),
    });
    r.onValue([['x']], MAIN_DEF);
    expect(calls).toEqual([slot]);
  });
});
