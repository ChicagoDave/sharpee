/**
 * Newline-delimited JSON framing over a byte stream.
 *
 * Public interface: {@link LineFramer}, {@link frameMessage}.
 * Bounded context: sandbox ↔ server stdio plumbing (ADR-153 Decision 1 —
 * message-passing boundary).
 *
 * Both sides of the Runtime Host Interface exchange one JSON object per line.
 * Binary save blobs are base64-encoded inside the JSON envelope so the
 * framing never has to reason about binary payloads.
 */

export interface FramingCallbacks<T> {
  /** Invoked once per complete JSON object. */
  onMessage: (msg: T) => void;
  /** Invoked when a line is not valid JSON. Framing continues on subsequent lines. */
  onError?: (err: Error, raw: string) => void;
}

export interface LineFramer<T> {
  /** Feed a chunk of bytes (or a string); any complete lines fire onMessage. */
  push(chunk: Buffer | string): void;
  /** Return the current buffered (incomplete) line — diagnostic only. */
  readonly buffered: string;
}

/**
 * Build a framer that buffers partial reads and surfaces one parsed JSON
 * object per newline-terminated line. Blank lines are ignored.
 *
 * @param cb   callbacks for parsed messages and parse errors
 * @param max  max buffered size (defaults to 16 MiB — larger than any sane save blob)
 */
export function createLineFramer<T>(cb: FramingCallbacks<T>, max = 16 * 1024 * 1024): LineFramer<T> {
  let buf = '';

  return {
    get buffered() {
      return buf;
    },
    push(chunk) {
      buf += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (buf.length > max) {
        const err = new Error(`LineFramer: buffer exceeded ${max} bytes`);
        buf = '';
        cb.onError?.(err, '');
        return;
      }
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        try {
          cb.onMessage(JSON.parse(line) as T);
        } catch (err) {
          cb.onError?.(err as Error, line);
        }
      }
    },
  };
}

/** Serialize a message as a newline-terminated JSON line. */
export function frameMessage(msg: unknown): string {
  return JSON.stringify(msg) + '\n';
}
