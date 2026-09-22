/**
 * How a page reaches the native host that embedded it (GH #464).
 *
 * A host hands the page one or more named one-way channels — `turnEvents`,
 * `testingSurface`, `testingConsole`, `docsTab` — and the page posts messages
 * down them. The shape of that traffic is host-neutral; only its ADDRESS was
 * ever WebKit-specific, and every non-WebKit host has paid for that by
 * installing an object called `window.webkit.messageHandlers` that is not
 * WebKit's.
 *
 * So the address is now a name of ours. A host installs `window.sharpeeHost`
 * and the page finds it there. A host that has not been taught the name yet is
 * still served by the WKWebView fallback below, which is why the macOS app
 * needs no change to keep working.
 *
 * Public interface: `hostChannel`, `hostChannelActive`, `postToHost`, and the
 * `SharpeeHost` shape a host installs.
 *
 * Owner context: `@sharpee/platform-browser` — browser client infrastructure.
 * Dependency-free on purpose: the IDE's pane bundles alias this file directly
 * from source, so anything it imported would be pulled into three bundles.
 *
 * INVARIANT — every export is a true no-op when no host is present. This ships
 * in the same client bundle authors' players use, where there is no host at
 * all, so a missing bridge must never throw and must never change behavior.
 *
 * INVARIANT — the body passes through UNTOUCHED. This module never serializes.
 * The channels do not agree on a payload type and must not be made to: the
 * three testing channels carry strings the host parses, while `docsTab` carries
 * an object WKWebView bridges to an `[String: Any]` the Swift side reads as a
 * dictionary. Stringifying on the way past would break that receiver silently —
 * its `guard` would simply stop matching and the tab would go quiet. A host
 * that needs a string makes one on its own side, where it knows its transport.
 */

/** One named, one-way channel to the host. The body is whatever that channel
 *  and its receiver agree on — see the pass-through invariant above. */
export interface HostChannel {
  postMessage(body: unknown): void;
}

/**
 * What a host installs at `window.sharpeeHost`.
 *
 * One object with the channel named per call, rather than an object of
 * per-channel handlers: a host bridges a single native transport and routes by
 * name on its own side, which is what all three of them already do internally.
 */
export interface SharpeeHost {
  postMessage(channel: string, body: unknown): void;
}

declare global {
  interface Window {
    sharpeeHost?: SharpeeHost;
    webkit?: { messageHandlers?: Record<string, HostChannel | undefined> };
  }
}

/**
 * Resolves the named channel, preferring the neutral host over the WKWebView
 * fallback.
 *
 * @param channel the host's own name for the channel (`turnEvents`, …)
 * @returns a channel to post on, or `null` when no host offers that name
 */
export function hostChannel(channel: string): HostChannel | null {
  try {
    const host = window.sharpeeHost;
    if (host && typeof host.postMessage === 'function') {
      return { postMessage: (body: unknown) => host.postMessage(channel, body) };
    }
  } catch {
    // A page with no window, or a host that threw on property access.
  }
  try {
    const handler = window.webkit?.messageHandlers?.[channel];
    if (handler && typeof handler.postMessage === 'function') return handler;
  } catch {
    // Same.
  }
  return null;
}

/**
 * Whether a host is listening on the named channel.
 *
 * Callers use this to skip work that only feeds the host — building a world
 * digest nobody reads — not to decide whether posting is safe. Posting is
 * always safe.
 *
 * @param channel the host's own name for the channel
 * @returns true when some host would receive a post on it
 */
export function hostChannelActive(channel: string): boolean {
  return hostChannel(channel) !== null;
}

/**
 * Posts to the named channel, best effort.
 *
 * @param channel the host's own name for the channel
 * @param body the message, passed to the host untouched
 * @returns nothing — a missing host, or a host that throws, is silently fine
 */
export function postToHost(channel: string, body: unknown): void {
  const handler = hostChannel(channel);
  if (!handler) return;
  try {
    handler.postMessage(body);
  } catch {
    // The bridge is best-effort observation — the page must never break on it.
  }
}
