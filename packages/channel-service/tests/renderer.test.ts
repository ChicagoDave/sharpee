/**
 * Tests for the `Renderer` host class — ADR-165 §1 through §7,
 * AC-1 through AC-9.
 *
 * Pure unit tests against mock `ChannelRenderer` instances. No DOM,
 * no engine, no transport.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type {
  CmgtPacket,
  TurnPacket,
  ChannelDefinition,
} from '@sharpee/if-domain';
import {
  Renderer,
  createRenderer,
  type ChannelRenderer,
} from '../src';

function makeManifest(...channels: ChannelDefinition[]): CmgtPacket {
  return { kind: 'cmgt', protocol_version: 1, channels };
}

function makeTurn(payload: Record<string, unknown>, turn = 1): TurnPacket {
  return { kind: 'turn', turn_id: `turn-${turn}`, payload };
}

function makeRecorderRenderer() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const renderer: ChannelRenderer = {
    onValue(value, channel) {
      calls.push({ method: 'onValue', args: [value, channel] });
    },
    onClear(target) {
      calls.push({ method: 'onClear', args: [target] });
    },
    onCmgt(channel, manifest) {
      calls.push({ method: 'onCmgt', args: [channel, manifest] });
    },
    onDestroy() {
      calls.push({ method: 'onDestroy', args: [] });
    },
  };
  return { renderer, calls };
}

// ────────────────────────────────────────────────────────────────────
//  AC-1 — interface defined and exported
// ────────────────────────────────────────────────────────────────────

describe('AC-1 — Renderer + ChannelRenderer exports', () => {
  it('exports the Renderer class', () => {
    expect(typeof Renderer).toBe('function');
  });

  it('createRenderer factory builds an instance', () => {
    const r = createRenderer();
    expect(r).toBeInstanceOf(Renderer);
  });

  it('Renderer instance exposes the documented contract methods', () => {
    const r = createRenderer();
    expect(typeof r.applyCmgt).toBe('function');
    expect(typeof r.applyTurnPacket).toBe('function');
    expect(typeof r.registerRenderer).toBe('function');
    expect(typeof r.onCommand).toBe('function');
    expect(typeof r.emitCommand).toBe('function');
    expect(typeof r.registerSlot).toBe('function');
    expect(typeof r.getSlot).toBe('function');
    expect(typeof r.getStateSnapshot).toBe('function');
  });
});

// ────────────────────────────────────────────────────────────────────
//  AC-2 — last-write-wins registration
// ────────────────────────────────────────────────────────────────────

describe('AC-2 — registerRenderer last-write-wins', () => {
  it('the most recent registration is the only one invoked', () => {
    const r = createRenderer();
    const platform = makeRecorderRenderer();
    const story = makeRecorderRenderer();
    r.registerRenderer('main', platform.renderer);
    r.registerRenderer('main', story.renderer);
    r.applyCmgt(makeManifest({ id: 'main', contentType: 'json', mode: 'append' }));
    r.applyTurnPacket(makeTurn({ main: ['hello'] }));

    expect(story.calls.some((c) => c.method === 'onValue')).toBe(true);
    expect(platform.calls.some((c) => c.method === 'onValue')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────
//  AC-3 — JSON-tree fallback + one-time warning
// ────────────────────────────────────────────────────────────────────

describe('AC-3 — JSON-tree fallback', () => {
  it('renders a value for an unrendered channel with a one-time warning', () => {
    const warnings: string[] = [];
    const outputs: Array<{ id: string; json: string }> = [];
    const r = createRenderer({
      fallbackWarn: (m) => warnings.push(m),
      fallbackOutput: (id, json) => outputs.push({ id, json }),
    });

    r.applyCmgt(
      makeManifest({ id: 'story.unknown', contentType: 'json', mode: 'replace' }),
    );
    r.applyTurnPacket(makeTurn({ 'story.unknown': { foo: 1 } }));
    r.applyTurnPacket(makeTurn({ 'story.unknown': { foo: 2 } }, 2));

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('story.unknown');
    expect(outputs).toEqual([
      { id: 'story.unknown', json: '{"foo":1}' },
      { id: 'story.unknown', json: '{"foo":2}' },
    ]);
  });

  it('does not warn when a renderer is registered later', () => {
    const warnings: string[] = [];
    const r = createRenderer({ fallbackWarn: (m) => warnings.push(m) });
    const recorder = makeRecorderRenderer();
    r.registerRenderer('story.known', recorder.renderer);
    r.applyCmgt(
      makeManifest({ id: 'story.known', contentType: 'text', mode: 'replace' }),
    );
    r.applyTurnPacket(makeTurn({ 'story.known': 'hello' }));
    expect(warnings).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
//  AC-4 — dispatch correctness
// ────────────────────────────────────────────────────────────────────

describe('AC-4 — dispatch correctness', () => {
  it('a payload of {main, location} invokes exactly two onValue calls', () => {
    const r = createRenderer();
    const main = makeRecorderRenderer();
    const location = makeRecorderRenderer();
    const score = makeRecorderRenderer();
    r.registerRenderer('main', main.renderer);
    r.registerRenderer('location', location.renderer);
    r.registerRenderer('score', score.renderer);
    r.applyCmgt(
      makeManifest(
        { id: 'main', contentType: 'json', mode: 'append' },
        { id: 'location', contentType: 'text', mode: 'replace' },
        { id: 'score', contentType: 'json', mode: 'replace' },
      ),
    );
    r.applyTurnPacket(makeTurn({ main: ['hello'], location: 'foyer' }));

    const mainOnValue = main.calls.filter((c) => c.method === 'onValue');
    const locationOnValue = location.calls.filter((c) => c.method === 'onValue');
    const scoreOnValue = score.calls.filter((c) => c.method === 'onValue');
    expect(mainOnValue).toHaveLength(1);
    expect(mainOnValue[0].args[0]).toEqual(['hello']);
    expect(locationOnValue).toHaveLength(1);
    expect(locationOnValue[0].args[0]).toBe('foyer');
    expect(scoreOnValue).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────
//  AC-5 — manifest-order dispatch
// ────────────────────────────────────────────────────────────────────

describe('AC-5 — manifest-order dispatch', () => {
  it('renderers fire in registration (manifest) order even when payload keys are reversed', () => {
    const r = createRenderer();
    const order: string[] = [];
    const recorderFor = (id: string): ChannelRenderer => ({
      onValue() {
        order.push(id);
      },
    });
    r.registerRenderer('a', recorderFor('a'));
    r.registerRenderer('b', recorderFor('b'));
    r.registerRenderer('c', recorderFor('c'));
    r.applyCmgt(
      makeManifest(
        { id: 'a', contentType: 'text', mode: 'replace' },
        { id: 'b', contentType: 'text', mode: 'replace' },
        { id: 'c', contentType: 'text', mode: 'replace' },
      ),
    );
    // Payload keys are inserted out-of-order; expect manifest order.
    r.applyTurnPacket(makeTurn({ c: '3', a: '1', b: '2' }));
    expect(order).toEqual(['a', 'b', 'c']);
  });
});

// ────────────────────────────────────────────────────────────────────
//  AC-6 — clear truncation with onClear
// ────────────────────────────────────────────────────────────────────

describe('AC-6 — clear truncation', () => {
  it('clear empties the state store and fires onClear on append channels', () => {
    const r = createRenderer();
    const main = makeRecorderRenderer();
    r.registerRenderer('main', main.renderer);
    r.applyCmgt(
      makeManifest(
        { id: 'main', contentType: 'json', mode: 'append' },
        { id: 'clear', contentType: 'json', mode: 'event' },
      ),
    );
    // Accumulate 5 entries
    r.applyTurnPacket(makeTurn({ main: ['a', 'b'] }));
    r.applyTurnPacket(makeTurn({ main: ['c', 'd', 'e'] }, 2));
    expect(r.getStateSnapshot()).toEqual({ main: ['a', 'b', 'c', 'd', 'e'] });

    // Fire clear
    r.applyTurnPacket(makeTurn({ clear: { target: 'main' } }, 3));
    expect(r.getStateSnapshot()).toEqual({});
    const onClear = main.calls.filter((c) => c.method === 'onClear');
    expect(onClear).toHaveLength(1);
    expect(onClear[0].args[0]).toBe('main');

    // New appends start fresh
    r.applyTurnPacket(makeTurn({ main: ['fresh'] }, 4));
    expect(r.getStateSnapshot()).toEqual({ main: ['fresh'] });
  });

  it('clear with no target clears every append-mode channel', () => {
    const r = createRenderer();
    r.applyCmgt(
      makeManifest(
        { id: 'main', contentType: 'json', mode: 'append' },
        { id: 'log', contentType: 'json', mode: 'append' },
        { id: 'score', contentType: 'json', mode: 'replace' },
        { id: 'clear', contentType: 'json', mode: 'event' },
      ),
    );
    r.applyTurnPacket(makeTurn({ main: ['x'], log: ['y'], score: 5 }));
    expect(r.getStateSnapshot()).toEqual({ main: ['x'], log: ['y'], score: 5 });

    r.applyTurnPacket(makeTurn({ clear: {} }, 2));
    expect(r.getStateSnapshot()).toEqual({ score: 5 });
  });
});

// ────────────────────────────────────────────────────────────────────
//  AC-7 — state store lifecycle
// ────────────────────────────────────────────────────────────────────

describe('AC-7 — state store lifecycle', () => {
  it('reset on applyCmgt; replaying captured packets restores the snapshot', () => {
    const r = createRenderer();
    const manifest = makeManifest(
      { id: 'main', contentType: 'json', mode: 'append' },
      { id: 'score', contentType: 'json', mode: 'replace' },
    );
    r.applyCmgt(manifest);
    const captured: TurnPacket[] = [
      makeTurn({ main: ['first'] }, 1),
      makeTurn({ score: { current: 5, max: 100 }, main: ['second'] }, 2),
      makeTurn({ main: ['third'] }, 3),
    ];
    for (const packet of captured) r.applyTurnPacket(packet);
    const snapshot = r.getStateSnapshot();
    expect(snapshot).toEqual({
      main: ['first', 'second', 'third'],
      score: { current: 5, max: 100 },
    });

    // Reset via fresh CMGT
    r.applyCmgt(manifest);
    expect(r.getStateSnapshot()).toEqual({});

    // Replay
    for (const packet of captured) r.applyTurnPacket(packet);
    expect(r.getStateSnapshot()).toEqual(snapshot);
  });

  it('snapshot is a deep clone — caller mutation does not leak back', () => {
    const r = createRenderer();
    r.applyCmgt(
      makeManifest({ id: 'main', contentType: 'json', mode: 'append' }),
    );
    r.applyTurnPacket(makeTurn({ main: [{ val: 1 }] }));
    const s1 = r.getStateSnapshot();
    (s1.main as Array<{ val: number }>)[0].val = 999;
    const s2 = r.getStateSnapshot();
    expect((s2.main as Array<{ val: number }>)[0].val).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────────────
//  AC-8 — renderer-local state isolation
// ────────────────────────────────────────────────────────────────────

describe('AC-8 — renderer-local state stays out of snapshot', () => {
  it('a renderer with a private flag does not leak it into getStateSnapshot', () => {
    class StatefulRenderer implements ChannelRenderer {
      // Renderer-local UI state — must not appear in the snapshot.
      private dossierClosed = false;
      onValue(_value: unknown): void {
        this.dossierClosed = true;
      }
      isClosed(): boolean {
        return this.dossierClosed;
      }
    }
    const r = createRenderer();
    const stateful = new StatefulRenderer();
    r.registerRenderer('view_state', stateful);
    r.applyCmgt(
      makeManifest({ id: 'view_state', contentType: 'json', mode: 'replace' }),
    );
    r.applyTurnPacket(makeTurn({ view_state: { panel: 'dossier', open: true } }));
    expect(stateful.isClosed()).toBe(true);
    const snapshot = r.getStateSnapshot();
    // Channel-driven state survives in the snapshot
    expect(snapshot['view_state']).toEqual({ panel: 'dossier', open: true });
    // Renderer-local state does not
    expect(JSON.stringify(snapshot)).not.toContain('dossierClosed');

    // Replay-after-reset does not restore renderer-local state
    r.applyCmgt(
      makeManifest({ id: 'view_state', contentType: 'json', mode: 'replace' }),
    );
    expect(stateful.isClosed()).toBe(true); // closed remains until next onValue
  });
});

// ────────────────────────────────────────────────────────────────────
//  AC-9 — slot system
// ────────────────────────────────────────────────────────────────────

describe('AC-9 — slot system', () => {
  it('getSlot returns null for unregistered names', () => {
    const r = createRenderer();
    expect(r.getSlot('main')).toBeNull();
  });

  it('registerSlot stores the handle; getSlot returns it', () => {
    const r = createRenderer();
    const handle = { id: 'dom-element' };
    r.registerSlot('main', handle);
    expect(r.getSlot('main')).toBe(handle);
  });

  it('story can register a custom slot name and replace the layout', () => {
    const r = createRenderer();
    r.registerSlot('main', { id: 'platform-default' });
    r.registerSlot('notebook', { id: 'story-notebook' });
    expect(r.getSlot('notebook')).toEqual({ id: 'story-notebook' });
    expect(r.getSlot('main')).toEqual({ id: 'platform-default' });
    expect(r.getSlot('nonexistent')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────
//  Lifecycle hooks (onCmgt / onDestroy) — beyond AC, supports §4
// ────────────────────────────────────────────────────────────────────

describe('Renderer lifecycle hooks (ADR-165 §4)', () => {
  it('first applyCmgt fires onCmgt; no onDestroy before any teardown', () => {
    const r = createRenderer();
    const recorder = makeRecorderRenderer();
    r.registerRenderer('main', recorder.renderer);
    r.applyCmgt(makeManifest({ id: 'main', contentType: 'json', mode: 'append' }));
    expect(recorder.calls.map((c) => c.method)).toEqual(['onCmgt']);
  });

  it('second applyCmgt fires onDestroy → state reset → onCmgt', () => {
    const r = createRenderer();
    const recorder = makeRecorderRenderer();
    r.registerRenderer('main', recorder.renderer);
    const m = makeManifest({ id: 'main', contentType: 'json', mode: 'append' });
    r.applyCmgt(m);
    r.applyTurnPacket(makeTurn({ main: ['x'] }));
    expect(r.getStateSnapshot()).toEqual({ main: ['x'] });

    r.applyCmgt(m);
    const methods = recorder.calls.map((c) => c.method);
    expect(methods).toEqual(['onCmgt', 'onValue', 'onDestroy', 'onCmgt']);
    expect(r.getStateSnapshot()).toEqual({});
  });

  it('applyTurnPacket before applyCmgt is a no-op with a warning', () => {
    const warnings: string[] = [];
    const r = createRenderer({ warn: (m) => warnings.push(m) });
    const recorder = makeRecorderRenderer();
    r.registerRenderer('main', recorder.renderer);
    r.applyTurnPacket(makeTurn({ main: ['x'] }));
    expect(recorder.calls).toEqual([]);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]).toContain('cmgt before turn');
  });
});

// ────────────────────────────────────────────────────────────────────
//  Command pump
// ────────────────────────────────────────────────────────────────────

describe('Renderer command pump', () => {
  it('emitCommand delivers to every registered handler', () => {
    const r = createRenderer();
    const a = vi.fn();
    const b = vi.fn();
    r.onCommand(a);
    r.onCommand(b);
    r.emitCommand('look');
    expect(a).toHaveBeenCalledWith({ kind: 'command', text: 'look' });
    expect(b).toHaveBeenCalledWith({ kind: 'command', text: 'look' });
  });
});

// ────────────────────────────────────────────────────────────────────
//  replayState — a saved store put back on screen after a restore
// ────────────────────────────────────────────────────────────────────

describe('replayState', () => {
  const location: ChannelDefinition = { id: 'location', contentType: 'json', mode: 'replace' };
  const picture: ChannelDefinition = { id: 'picture', contentType: 'text', mode: 'replace' };
  const workings: ChannelDefinition = { id: 'workings', contentType: 'text', mode: 'append' };
  const main: ChannelDefinition = { id: 'main', contentType: 'json', mode: 'append' };
  const cue: ChannelDefinition = { id: 'cue', contentType: 'json', mode: 'event' };

  /** A renderer host with one recorder per channel of the manifest. */
  function mount(...channels: ChannelDefinition[]) {
    const r = createRenderer();
    const recorders = new Map<string, ReturnType<typeof makeRecorderRenderer>>();
    for (const channel of channels) {
      const recorder = makeRecorderRenderer();
      recorders.set(channel.id, recorder);
      r.registerRenderer(channel.id, recorder.renderer);
    }
    r.applyCmgt(makeManifest(...channels));
    const valuesOf = (id: string) =>
      recorders
        .get(id)!
        .calls.filter((c) => c.method === 'onValue')
        .map((c) => c.args[0]);
    const clearsOf = (id: string) =>
      recorders.get(id)!.calls.filter((c) => c.method === 'onClear').length;
    /** The value and clear calls a channel's renderer received, in order. */
    const deliveriesOf = (id: string) =>
      recorders
        .get(id)!
        .calls.filter((c) => c.method === 'onValue' || c.method === 'onClear')
        .map((c) => c.method);
    return { r, valuesOf, clearsOf, deliveriesOf };
  }

  it('a fresh host shows a saved replace value and a saved append list', () => {
    // The boot path: a page reload, a new host, an empty store.
    const saved = {
      location: { text: 'Library' },
      workings: ['spark: wakes a flame', 'hush: stills a sound'],
    };
    const { r, valuesOf } = mount(location, workings);
    expect(r.getStateSnapshot()).toEqual({});

    r.replayState(saved);

    expect(r.getStateSnapshot()).toEqual(saved);
    expect(valuesOf('location')).toEqual([{ text: 'Library' }]);
    // One delivery carrying the whole list, in its saved order.
    expect(valuesOf('workings')).toEqual([['spark: wakes a flame', 'hush: stills a sound']]);
  });

  it('a snapshot taken from one host round-trips into another', () => {
    const first = mount(location, workings);
    first.r.applyTurnPacket(makeTurn({ location: { text: 'Lodge' }, workings: ['spark'] }));
    first.r.applyTurnPacket(makeTurn({ location: { text: 'Library' }, workings: ['hush'] }, 2));
    const saved = first.r.getStateSnapshot();

    const second = mount(location, workings);
    second.r.replayState(saved);

    expect(second.r.getStateSnapshot()).toEqual(first.r.getStateSnapshot());
  });

  it('an append channel is cleared before its saved entries are delivered', () => {
    // The menu path: the session has gone on past the save.
    const { r, valuesOf, clearsOf, deliveriesOf } = mount(workings);
    r.applyTurnPacket(makeTurn({ workings: ['spark', 'hush', 'mend'] }));
    expect(r.getStateSnapshot()).toEqual({ workings: ['spark', 'hush', 'mend'] });

    r.replayState({ workings: ['spark'] });

    // Not ['spark', 'hush', 'mend', 'spark']: the later entries are gone.
    expect(r.getStateSnapshot()).toEqual({ workings: ['spark'] });
    expect(clearsOf('workings')).toBe(1);
    expect(valuesOf('workings')).toEqual([['spark', 'hush', 'mend'], ['spark']]);
    // The clear comes between the two deliveries: a renderer that appends
    // would otherwise wipe the saved entries it had just been given.
    expect(deliveriesOf('workings')).toEqual(['onValue', 'onClear', 'onValue']);
  });

  it('an append channel the snapshot does not hold is emptied', () => {
    const { r, valuesOf, clearsOf } = mount(workings);
    r.applyTurnPacket(makeTurn({ workings: ['spark'] }));

    r.replayState({});

    expect(r.getStateSnapshot()).toEqual({});
    expect(clearsOf('workings')).toBe(1);
    // Cleared, and nothing delivered after the clear.
    expect(valuesOf('workings')).toEqual([['spark']]);
  });

  it('a replace channel showing a value the snapshot does not hold is told null', () => {
    const { r, valuesOf } = mount(location, picture);
    r.applyTurnPacket(makeTurn({ location: { text: 'Roof' }, picture: 'lantern-lit.png' }));

    r.replayState({ location: { text: 'Lodge' } });

    expect(r.getStateSnapshot()).toEqual({ location: { text: 'Lodge' }, picture: null });
    expect(valuesOf('picture')).toEqual(['lantern-lit.png', null]);
    expect(valuesOf('location')).toEqual([{ text: 'Roof' }, { text: 'Lodge' }]);
  });

  it('a replace channel that never had a value is left alone', () => {
    const { r, valuesOf } = mount(location, picture);

    r.replayState({ location: { text: 'Lodge' } });

    expect(r.getStateSnapshot()).toEqual({ location: { text: 'Lodge' } });
    expect(valuesOf('picture')).toEqual([]);
  });

  it('a skipped channel keeps its store entry and hears nothing', () => {
    const { r, valuesOf, clearsOf } = mount(main, workings);
    r.applyTurnPacket(makeTurn({ main: ['You are in the Lodge.'], workings: ['spark'] }));

    r.replayState({ main: ['saved prose'], workings: ['spark', 'hush'] }, { skip: new Set(['main']) });

    expect(r.getStateSnapshot()).toEqual({
      main: ['You are in the Lodge.'],
      workings: ['spark', 'hush'],
    });
    expect(clearsOf('main')).toBe(0);
    expect(valuesOf('main')).toEqual([['You are in the Lodge.']]);
  });

  it('a skipped replace channel the snapshot does not hold keeps its value', () => {
    // The browser's case: the host strips the channels it restores itself
    // from the save, so at replay they are absent. Skipped, they must not
    // be taken for values to blank.
    const { r, valuesOf } = mount(location, picture);
    r.applyTurnPacket(makeTurn({ location: { text: 'Roof' }, picture: 'lantern-lit.png' }));

    r.replayState({ location: { text: 'Lodge' } }, { skip: new Set(['picture']) });

    expect(r.getStateSnapshot()).toEqual({ location: { text: 'Lodge' }, picture: 'lantern-lit.png' });
    expect(valuesOf('picture')).toEqual(['lantern-lit.png']);
  });

  it('an event channel is never delivered, whatever the snapshot says', () => {
    const { r, valuesOf } = mount(cue);

    r.replayState({ cue: { sound: 'toll' } });

    expect(r.getStateSnapshot()).toEqual({});
    expect(valuesOf('cue')).toEqual([]);
  });

  it('the store does not share structure with the snapshot it was given', () => {
    const { r } = mount(workings);
    const saved = { workings: ['spark'] };

    r.replayState(saved);
    saved.workings.push('tampered');

    expect(r.getStateSnapshot()).toEqual({ workings: ['spark'] });
  });

  it('before any manifest it warns and changes nothing', () => {
    const warnings: string[] = [];
    const r = createRenderer({ warn: (m) => warnings.push(m) });
    const recorder = makeRecorderRenderer();
    r.registerRenderer('location', recorder.renderer);

    r.replayState({ location: { text: 'Lodge' } });

    expect(recorder.calls).toEqual([]);
    expect(r.getStateSnapshot()).toEqual({});
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('replayState called before applyCmgt');
  });
});
