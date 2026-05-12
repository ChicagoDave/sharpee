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

  it('preserves decorations as <span class="..."> elements (post-ADR-174)', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue(
      [
        [
          'You see ',
          { className: 'sharpee-item', content: ['a brass lamp'] },
          '.',
        ],
      ],
      MAIN_DEF,
    );
    const p = slot.querySelector('p')!;
    expect(p.textContent).toBe('You see a brass lamp.');
    const item = p.querySelector('span.sharpee-item');
    expect(item).not.toBeNull();
    expect(item?.textContent).toBe('a brass lamp');
  });

  it('renders em/strong as <span class="sharpee-em|sharpee-strong"> (no semantic tags on the wire)', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue(
      [
        [
          { className: 'sharpee-em', content: ['italic'] },
          ' ',
          { className: 'sharpee-strong', content: ['bold'] },
        ],
      ],
      MAIN_DEF,
    );
    expect(slot.querySelector('span.sharpee-em')?.textContent).toBe('italic');
    expect(slot.querySelector('span.sharpee-strong')?.textContent).toBe('bold');
    // No semantic tags — ADR-174 mandates span+class only.
    expect(slot.querySelector('em')).toBeNull();
    expect(slot.querySelector('strong')).toBeNull();
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

  it('accepts MainEntry-object entries (new shape)', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue(
      [
        { content: ['Header'] },
        { content: ['Body line one'], tight: true },
        { content: ['Body line two'], tight: true },
      ],
      MAIN_DEF,
    );
    const ps = slot.querySelectorAll('p');
    expect(ps.length).toBe(3);
    expect(ps[0].textContent).toBe('Header');
    expect(ps[0].classList.contains('main-entry--tight')).toBe(false);
    expect(ps[1].textContent).toBe('Body line one');
    expect(ps[1].classList.contains('main-entry--tight')).toBe(true);
    expect(ps[2].classList.contains('main-entry--tight')).toBe(true);
  });

  it('accepts the legacy TextContent[] array shape (backward compat)', () => {
    const r = createMainChannelRenderer(slot);
    r.onValue([['Legacy entry']], MAIN_DEF);
    const ps = slot.querySelectorAll('p');
    expect(ps.length).toBe(1);
    expect(ps[0].textContent).toBe('Legacy entry');
    expect(ps[0].classList.contains('main-entry--tight')).toBe(false);
  });
});
