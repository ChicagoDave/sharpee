/**
 * Prose channel renderers (ADR-300 D8/D9).
 *
 * Every case drives the renderers the way the dispatcher does — each prose
 * channel's `onValue`, then `preferred-layout`'s — because the flush is what
 * turns buffered per-channel entries into ordered DOM. Feeding one channel
 * and skipping the layout renders nothing, which is the contract, not a bug.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ChannelDefinition } from '@sharpee/if-domain';
import { PREFERRED_LAYOUT_CHANNEL, PROSE_CHANNEL_IDS } from '@sharpee/if-domain';
import { createProseChannelRenderers } from '../../src/channels/prose';

const proseDef = (id: string): ChannelDefinition => ({
  id,
  contentType: 'json',
  mode: 'append',
  emit: 'sparse',
});

const LAYOUT_DEF: ChannelDefinition = {
  id: PREFERRED_LAYOUT_CHANNEL,
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
};

describe('createProseChannelRenderers', () => {
  let slot: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    slot = document.createElement('div');
    document.body.appendChild(slot);
  });

  const build = (opts = {}) => createProseChannelRenderers(slot, PROSE_CHANNEL_IDS, opts);

  /** Drive one turn through the dispatcher's call sequence. */
  const turn = (
    prose: ProseChannelRenderersHandle,
    payload: Record<string, unknown[]>,
    layout: string[],
  ) => {
    for (const id of PROSE_CHANNEL_IDS) {
      prose.byChannelId.get(id)!.onValue(payload[id], proseDef(id));
    }
    prose.byChannelId.get(PREFERRED_LAYOUT_CHANNEL)!.onValue(layout, LAYOUT_DEF);
  };

  type ProseChannelRenderersHandle = ReturnType<typeof createProseChannelRenderers>;

  it('appends one <p> per entry in preferred-layout order', () => {
    const prose = build();
    turn(
      prose,
      { 'room-name': [['Cave']], 'action-result': [['You go north.']] },
      ['action-result', 'room-name'],
    );
    const ps = slot.querySelectorAll('p');
    expect(ps.length).toBe(2);
    // Payload key order would have put the room name first; the layout wins.
    expect(ps[0].textContent).toBe('You go north.');
    expect(ps[1].textContent).toBe('Cave');
  });

  it('tags each entry with the channel that produced it', () => {
    const prose = build();
    turn(prose, { 'room-name': [['Cave']] }, ['room-name']);
    const p = slot.querySelector('p')!;
    expect(p.classList.contains('main-entry')).toBe(true);
    expect(p.classList.contains('prose-room-name')).toBe(true);
  });

  it('interleaves repeated entries from one channel with another channel', () => {
    const prose = build();
    turn(
      prose,
      { 'game-message': [['First.'], ['Second.']], 'room-name': [['Cave']] },
      ['game-message', 'room-name', 'game-message'],
    );
    const ps = slot.querySelectorAll('p');
    expect([...ps].map((p) => p.textContent)).toEqual(['First.', 'Cave', 'Second.']);
  });

  it('preserves decorations as <span class="..."> elements (post-ADR-174)', () => {
    const prose = build();
    turn(
      prose,
      {
        'room-contents': [
          ['You see ', { className: 'sharpee-item', content: ['a brass lamp'] }, '.'],
        ],
      },
      ['room-contents'],
    );
    const p = slot.querySelector('p')!;
    expect(p.textContent).toBe('You see a brass lamp.');
    const item = p.querySelector('span.sharpee-item');
    expect(item).not.toBeNull();
    expect(item?.textContent).toBe('a brass lamp');
  });

  it('renders em/strong as <span class="sharpee-em|sharpee-strong"> (no semantic tags on the wire)', () => {
    const prose = build();
    turn(
      prose,
      {
        'game-message': [
          [
            { className: 'sharpee-em', content: ['italic'] },
            ' ',
            { className: 'sharpee-strong', content: ['bold'] },
          ],
        ],
      },
      ['game-message'],
    );
    expect(slot.querySelector('span.sharpee-em')?.textContent).toBe('italic');
    expect(slot.querySelector('span.sharpee-strong')?.textContent).toBe('bold');
    // No semantic tags — ADR-174 mandates span+class only.
    expect(slot.querySelector('em')).toBeNull();
    expect(slot.querySelector('strong')).toBeNull();
  });

  it('renders nothing for a turn that produced no prose', () => {
    const prose = build();
    turn(prose, {}, []);
    expect(slot.children.length).toBe(0);
  });

  it('ignores non-array channel values defensively', () => {
    const prose = build();
    prose.byChannelId.get('room-name')!.onValue('not an array', proseDef('room-name'));
    prose.byChannelId.get(PREFERRED_LAYOUT_CHANNEL)!.onValue(['room-name'], LAYOUT_DEF);
    expect(slot.children.length).toBe(0);
  });

  it('drops a stale buffer when a turn emits an empty layout', () => {
    // A prose channel that emitted while the layout says nothing reads is a
    // packet that disagrees with itself; the layout is authoritative, and the
    // buffer must not leak into the NEXT turn.
    const prose = build();
    prose.byChannelId.get('room-name')!.onValue([['Orphan']], proseDef('room-name'));
    prose.byChannelId.get(PREFERRED_LAYOUT_CHANNEL)!.onValue([], LAYOUT_DEF);
    expect(slot.children.length).toBe(0);

    turn(prose, { 'game-message': [['Next turn.']] }, ['game-message']);
    const ps = slot.querySelectorAll('p');
    expect(ps.length).toBe(1);
    expect(ps[0].textContent).toBe('Next turn.');
  });

  it('onClear empties the slot', () => {
    const prose = build();
    turn(prose, { 'game-message': [['a'], ['b']] }, ['game-message', 'game-message']);
    expect(slot.children.length).toBe(2);
    prose.byChannelId.get('game-message')!.onClear?.('game-message');
    expect(slot.children.length).toBe(0);
  });

  it('clear() empties the slot and drops a half-buffered turn', () => {
    const prose = build();
    prose.byChannelId.get('room-name')!.onValue([['Buffered']], proseDef('room-name'));
    prose.clear();
    prose.byChannelId.get(PREFERRED_LAYOUT_CHANNEL)!.onValue(['room-name'], LAYOUT_DEF);
    expect(slot.children.length).toBe(0);
  });

  it('invokes onAfterAppend once per flushed turn', () => {
    const calls: HTMLElement[] = [];
    const prose = build({ onAfterAppend: (s: HTMLElement) => calls.push(s) });
    turn(prose, { 'room-name': [['Cave']], 'room-description': [['Dark.']] }, [
      'room-name',
      'room-description',
    ]);
    expect(calls).toEqual([slot]);
  });

  it('does not invoke onAfterAppend for a turn with no prose', () => {
    const calls: HTMLElement[] = [];
    const prose = build({ onAfterAppend: (s: HTMLElement) => calls.push(s) });
    turn(prose, {}, []);
    expect(calls).toEqual([]);
  });

  it('reports the turn text composed and joined, not per channel', () => {
    const texts: string[] = [];
    const prose = build({ onEntriesText: (t: string) => texts.push(t) });
    turn(
      prose,
      {
        'room-name': [{ content: ['Cave'] }],
        'room-description': [{ content: ['It is dark.'], tight: true }],
      },
      ['room-name', 'room-description'],
    );
    // One string for the whole turn, with `tight` read against its composed
    // predecessor — which lives on a different channel.
    expect(texts).toEqual(['Cave\nIt is dark.']);
  });

  it('accepts ProseEntry-object entries and threads `tight`', () => {
    const prose = build();
    turn(
      prose,
      {
        'room-name': [{ content: ['Header'] }],
        'room-description': [
          { content: ['Body line one'], tight: true },
          { content: ['Body line two'], tight: true },
        ],
      },
      ['room-name', 'room-description', 'room-description'],
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
    const prose = build();
    turn(prose, { 'game-message': [['Legacy entry']] }, ['game-message']);
    const ps = slot.querySelectorAll('p');
    expect(ps.length).toBe(1);
    expect(ps[0].textContent).toBe('Legacy entry');
    expect(ps[0].classList.contains('main-entry--tight')).toBe(false);
  });

  it('ADR-300 AC-5 — reordering preferred-layout changes what the player sees', () => {
    // The falsifiable half of AC-5. Identical channel payloads, two different
    // layouts, two different reading orders on screen. Nothing about the
    // engine's output changed between the two renders — only the preference.
    const payload = {
      'room-name': [['Cave']],
      'room-description': [['It is dark.']],
      'action-result': [['You go north.']],
    };

    const first = build();
    first.renderPayload({
      ...payload,
      [PREFERRED_LAYOUT_CHANNEL]: ['action-result', 'room-name', 'room-description'],
    });
    const asEmitted = [...slot.querySelectorAll('p')].map((p) => p.textContent);

    slot.remove();
    slot = document.createElement('div');
    document.body.appendChild(slot);

    const second = build();
    second.renderPayload({
      ...payload,
      [PREFERRED_LAYOUT_CHANNEL]: ['room-name', 'room-description', 'action-result'],
    });
    const reordered = [...slot.querySelectorAll('p')].map((p) => p.textContent);

    expect(asEmitted).toEqual(['You go north.', 'Cave', 'It is dark.']);
    expect(reordered).toEqual(['Cave', 'It is dark.', 'You go north.']);
    expect(reordered).not.toEqual(asEmitted);
  });

  it('ADR-300 AC-5 — no renderer treats its channel as "the whole prose window"', () => {
    // A prose channel's renderer contributes its entries and nothing else:
    // driven alone, with no layout to place them, it renders nothing. That is
    // what "no channel means the prose window" has to mean at the DOM.
    const prose = build();
    for (const id of PROSE_CHANNEL_IDS) {
      prose.byChannelId.get(id)!.onValue([['orphan']], proseDef(id));
    }
    expect(slot.children.length).toBe(0);
  });

  it('renderPayload composes a whole stored turn in one call', () => {
    const prose = build();
    prose.renderPayload({
      'room-name': [['Cave']],
      'action-result': [['You go north.']],
      [PREFERRED_LAYOUT_CHANNEL]: ['action-result', 'room-name'],
    });
    const ps = slot.querySelectorAll('p');
    expect([...ps].map((p) => p.textContent)).toEqual(['You go north.', 'Cave']);
  });
});
