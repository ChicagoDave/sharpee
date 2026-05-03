/**
 * @sharpee/channel-service/renderer — generic JSON-tree fallback.
 *
 * Owner context: consumer-side dispatcher. Per ADR-165 §3, a channel
 * id that appears in the CMGT manifest but has no registered
 * `ChannelRenderer` falls back to a generic JSON-tree view. This
 * keeps unknown story channels visible-and-debuggable rather than
 * silently dropped.
 *
 * The fallback this module ships logs a one-time warning per channel
 * id and writes a JSON-stringified line to the console. Concrete
 * platform consumers (browser, CLI) override the warning sink and
 * the rendering surface — for now the default is enough to satisfy
 * AC-3.
 *
 * @see ADR-165 — Renderer Architecture — §3, AC-3
 */

import type { ChannelDefinition } from '@sharpee/if-domain';
import type { ChannelRenderer } from './types';

/**
 * Sink for warnings emitted by the fallback. Defaults to
 * `console.warn`. Tests inject a recording sink; concrete platform
 * consumers can route to a logger.
 */
export type FallbackWarningSink = (message: string) => void;

/**
 * Sink for the rendered JSON-tree output. Defaults to `console.log`.
 * Concrete consumers redirect to a debug pane or stdout.
 */
export type FallbackOutputSink = (channelId: string, json: string) => void;

/**
 * Construct a JSON-tree fallback renderer factory.
 *
 * The returned function builds a `ChannelRenderer` for a specific
 * channel id; the dispatcher caches one per unrendered id so the
 * "one-time warning" behavior is preserved across emissions.
 *
 * @param warn — sink for the one-time warning. Default `console.warn`.
 * @param output — sink for the rendered JSON line. Default
 *   `console.log`.
 */
export function createJsonTreeFallbackFactory(opts?: {
  warn?: FallbackWarningSink;
  output?: FallbackOutputSink;
}): (channelId: string) => ChannelRenderer {
  const warn = opts?.warn ?? defaultWarn;
  const output = opts?.output ?? defaultOutput;
  const warned = new Set<string>();

  return (channelId: string): ChannelRenderer => ({
    onValue(value: unknown, channel: ChannelDefinition): void {
      if (!warned.has(channelId)) {
        warned.add(channelId);
        warn(
          `[channel-service] No renderer registered for channel '${channelId}' ` +
            `(contentType=${channel.contentType}, mode=${channel.mode}). ` +
            `Falling back to JSON-tree view; values will be JSON-stringified.`,
        );
      }
      output(channelId, safeStringify(value));
    },
  });
}

function defaultWarn(message: string): void {
  // Console only — no alerting, no throwing. The dispatcher routes
  // the JSON-tree output separately.
  // eslint-disable-next-line no-console
  console.warn(message);
}

function defaultOutput(channelId: string, json: string): void {
  // eslint-disable-next-line no-console
  console.log(`[${channelId}] ${json}`);
}

/**
 * `JSON.stringify` with a circular-reference fallback. Renderer
 * fallback should never throw — bad data is debuggable, but a
 * thrown stringifier breaks dispatch.
 */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
