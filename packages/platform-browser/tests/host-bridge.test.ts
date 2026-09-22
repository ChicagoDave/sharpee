/**
 * host-bridge.test.ts — how a page addresses the host that embedded it
 * (GH #464).
 *
 * Pins the three things the rename is only safe because of: the neutral
 * `window.sharpeeHost` is preferred, the WKWebView address still works
 * untouched (which is why the shipping macOS app needs no change), and the
 * body reaches the host EXACTLY as the caller passed it — an object stays an
 * object, because the Swift docs receiver reads `[String: Any]` and a
 * stringified body would silently stop matching its guard.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { hostChannel, hostChannelActive, postToHost } from '../src/host-bridge';

type Posted = { channel: string; body: unknown };

/** Installs the neutral host, returning the log it appends to. */
function installNeutralHost(): Posted[] {
  const posted: Posted[] = [];
  (window as any).sharpeeHost = {
    postMessage: (channel: string, body: unknown) => posted.push({ channel, body }),
  };
  return posted;
}

/** Installs a WKWebView-shaped host for one channel, as the macOS app does. */
function installWebKitHost(channel: string): unknown[] {
  const posted: unknown[] = [];
  (window as any).webkit = {
    messageHandlers: { [channel]: { postMessage: (body: unknown) => posted.push(body) } },
  };
  return posted;
}

afterEach(() => {
  delete (window as any).sharpeeHost;
  delete (window as any).webkit;
});

describe('hostChannel', () => {
  it('resolves the neutral host and names the channel on every post', () => {
    const posted = installNeutralHost();

    hostChannel('turnEvents')!.postMessage('one');
    hostChannel('docsTab')!.postMessage('two');

    expect(posted).toEqual([
      { channel: 'turnEvents', body: 'one' },
      { channel: 'docsTab', body: 'two' },
    ]);
  });

  it('falls back to the WKWebView address, so the shipping macOS app is unaffected', () => {
    const posted = installWebKitHost('testingSurface');

    hostChannel('testingSurface')!.postMessage('from the page');

    expect(posted).toEqual(['from the page']);
  });

  it('prefers the neutral host when a page somehow has both', () => {
    const neutral = installNeutralHost();
    const webkit = installWebKitHost('turnEvents');

    hostChannel('turnEvents')!.postMessage('x');

    expect(neutral).toEqual([{ channel: 'turnEvents', body: 'x' }]);
    expect(webkit).toEqual([]);
  });

  it('returns null for a channel no host offers, and for no host at all', () => {
    expect(hostChannel('turnEvents')).toBeNull();

    installWebKitHost('docsTab');
    expect(hostChannel('turnEvents')).toBeNull();
    expect(hostChannel('docsTab')).not.toBeNull();
  });

  it('returns null when the address exists but holds no callable postMessage', () => {
    (window as any).sharpeeHost = { postMessage: 'not a function' };
    expect(hostChannel('turnEvents')).toBeNull();

    delete (window as any).sharpeeHost;
    (window as any).webkit = { messageHandlers: { turnEvents: {} } };
    expect(hostChannel('turnEvents')).toBeNull();
  });

  it('reads the window on every call, so a host installed late is still found', () => {
    expect(hostChannel('turnEvents')).toBeNull();

    const posted = installNeutralHost();
    hostChannel('turnEvents')!.postMessage('late');

    expect(posted).toEqual([{ channel: 'turnEvents', body: 'late' }]);
  });
});

describe('hostChannelActive', () => {
  it('is true only for a channel some host is listening on', () => {
    expect(hostChannelActive('turnEvents')).toBe(false);

    installWebKitHost('turnEvents');
    expect(hostChannelActive('turnEvents')).toBe(true);
    expect(hostChannelActive('docsTab')).toBe(false);
  });
});

describe('postToHost', () => {
  it('delivers an object body unserialized — the Swift docs receiver reads a dictionary', () => {
    const posted = installNeutralHost();
    const body = { type: 'openExternal', url: 'https://example.com' };

    postToHost('docsTab', body);

    expect(posted).toHaveLength(1);
    expect(posted[0].body).toBe(body);
    expect(typeof posted[0].body).toBe('object');
  });

  it('delivers a string body unchanged', () => {
    const posted = installWebKitHost('testingConsole');

    postToHost('testingConsole', 'driver: replaying');

    expect(posted).toEqual(['driver: replaying']);
  });

  it('is a true no-op with no host — a published player has none', () => {
    expect(() => postToHost('turnEvents', '{"turn":1}')).not.toThrow();
  });

  it('swallows a host that throws, because observation must never break play', () => {
    let reached = false;
    (window as any).sharpeeHost = {
      postMessage: () => {
        reached = true;
        throw new Error('bridge is gone');
      },
    };

    expect(() => postToHost('turnEvents', 'x')).not.toThrow();
    expect(reached).toBe(true);
  });
});
