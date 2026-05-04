/**
 * AC-17 — BrowserClient registers exactly two engine listeners.
 *
 * Phase 4 of the channel-io-event-retirement plan deletes the legacy
 * `engine.on('event', ...)` listener entirely. The only remaining
 * subscriptions on the engine event source from `BrowserClient` are
 * the channel-driven pair:
 *
 *   1. engine.on('channel:manifest', ...)
 *   2. engine.on('channel:packet', ...)
 *
 * Any new `engine.on(...)` registration in `BrowserClient.ts` is a
 * regression — channels are the universal UI surface (ADR-163), and
 * the browser must not consume raw events. This static gate makes
 * that policy mechanical.
 *
 * The test is a string match over the source file (not the dist
 * bundle, which inlines third-party code that may legitimately
 * register engine listeners). Comments mentioning `engine.on(...)`
 * are filtered out — only actual call sites count.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../..');
const BROWSER_CLIENT_PATH = resolve(
  REPO_ROOT,
  'packages/platform-browser/src/BrowserClient.ts',
);

interface ListenerCall {
  line: number;
  channelArg: string;
}

function findEngineOnCalls(source: string): ListenerCall[] {
  const calls: ListenerCall[] = [];
  const lines = source.split('\n');
  // Walk the file; skip lines that are pure comments. The pattern is
  // anchored to the literal `this.engine.on('` to avoid matching
  // `engineSomething.on(` or `engine.once(`.
  const callPattern = /this\.engine\.on\('([^']+)'/;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    const m = callPattern.exec(line);
    if (!m) continue;
    calls.push({ line: i + 1, channelArg: m[1] });
  }
  return calls;
}

describe('AC-17 — BrowserClient engine listener inventory', () => {
  const source = readFileSync(BROWSER_CLIENT_PATH, 'utf-8');
  const calls = findEngineOnCalls(source);

  it('registers exactly two engine.on() calls', () => {
    if (calls.length !== 2) {
      const formatted = calls
        .map((c) => `  line ${c.line}: this.engine.on('${c.channelArg}', ...)`)
        .join('\n');
      throw new Error(
        `AC-17 expected exactly 2 engine.on() calls in BrowserClient.ts, found ${calls.length}:\n${formatted}\n\n` +
          'Per ADR-163 (channels are the universal UI surface), BrowserClient must subscribe ' +
          'only to channel:manifest and channel:packet. Any other engine.on(...) listener bypasses ' +
          'the channel surface and reintroduces the legacy raw-event coupling that Phase 4 ' +
          'of the channel-io-event-retirement plan deleted. Migrate the new signal to a ' +
          'story-defined or platform-defined IOChannel instead.',
      );
    }
    expect(calls).toHaveLength(2);
  });

  it('subscribes to channel:manifest and channel:packet (no other channels)', () => {
    const channels = new Set(calls.map((c) => c.channelArg));
    expect(channels).toEqual(new Set(['channel:manifest', 'channel:packet']));
  });

  it('does not register a legacy engine.on(\'event\', ...) listener', () => {
    const eventListenerCalls = calls.filter((c) => c.channelArg === 'event');
    if (eventListenerCalls.length > 0) {
      const formatted = eventListenerCalls
        .map((c) => `  line ${c.line}`)
        .join('\n');
      throw new Error(
        `AC-17 found a legacy engine.on('event', ...) listener at:\n${formatted}\n\n` +
          'Phase 4 of channel-io-event-retirement deleted this listener. Any signal that ' +
          'previously flowed through it must now go through an IOChannel.',
      );
    }
    expect(eventListenerCalls).toEqual([]);
  });
});
