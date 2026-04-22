/**
 * Boot-time story validator.
 *
 * Public interface: {@link StoryHealth}, {@link StoryHealthStatus},
 * {@link createStoryHealth}.
 * Bounded context: story loading (ADR-153 Decision 3; N-6 negative path).
 *
 * Each story file the scanner surfaces is validated once at server start by
 * spawning a throwaway sandbox, waiting for the READY frame, then tearing it
 * down. The result is cached in an in-memory map — `POST /api/rooms` consults
 * the map and rejects immediately if the requested story is unhealthy, so
 * broken story files never produce half-created rooms.
 *
 * Re-running {@link StoryHealth.validateAll} is supported but not required;
 * the server bootstraps it once at startup. Operators who hot-reload stories
 * can re-invoke it from a future admin endpoint.
 */

import type { StoryScanner } from './scanner.js';
import type { SandboxRegistry } from '../sandbox/sandbox-registry.js';

/** Recorded result of a single story validation attempt. */
export interface StoryHealthStatus {
  healthy: boolean;
  /** Populated only when `healthy` is false; a human-readable failure reason. */
  error?: string;
  /** ISO timestamp when the result was recorded. */
  checked_at: string;
}

export interface StoryHealth {
  /**
   * Return the most recent validation result for `slug`. Returns `null` if the
   * story was never validated (either {@link validateAll} has not been called
   * or the slug was not present on disk at validation time).
   */
  check(slug: string): StoryHealthStatus | null;

  /**
   * Spawn and validate every story returned by the scanner, recording each
   * result. Always resolves; individual failures are captured in the map
   * rather than thrown.
   */
  validateAll(): Promise<void>;

  /** Snapshot of the current map — used by tests and diagnostics. */
  snapshot(): Record<string, StoryHealthStatus>;
}

export interface StoryHealthDeps {
  stories: StoryScanner;
  sandboxes: SandboxRegistry;
  /** Override sandbox binary/args — tests pass a Node stub. */
  sandboxOverride?: { binary?: string; args?: string[] };
  /** Max time to wait for READY before declaring the story unhealthy. Default 10 s. */
  readyTimeoutMs?: number;
}

/** Prefix applied to synthetic room_ids used during validation. */
const VALIDATE_ROOM_PREFIX = '__validate-';

export function createStoryHealth(deps: StoryHealthDeps): StoryHealth {
  const readyTimeoutMs = deps.readyTimeoutMs ?? 10_000;
  const status = new Map<string, StoryHealthStatus>();

  async function validateOne(slug: string, path: string): Promise<void> {
    const validateRoomId = VALIDATE_ROOM_PREFIX + slug;
    try {
      const entry = deps.sandboxes.getOrSpawn({
        room_id: validateRoomId,
        story_file: path,
        binary: deps.sandboxOverride?.binary,
        args: deps.sandboxOverride?.args,
      });

      // Race the READY-or-crash promise against a timeout. If READY arrives
      // first, the story loaded and the engine responded to INIT — a strong
      // enough signal of health for boot validation.
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`ready timeout after ${readyTimeoutMs} ms`));
        }, readyTimeoutMs);
        entry.ready.then(
          () => {
            clearTimeout(timer);
            resolve();
          },
          (err) => {
            clearTimeout(timer);
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        );
      });

      status.set(slug, { healthy: true, checked_at: new Date().toISOString() });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      status.set(slug, {
        healthy: false,
        error: detail,
        checked_at: new Date().toISOString(),
      });
    } finally {
      deps.sandboxes.tearDown(validateRoomId);
    }
  }

  return {
    check(slug) {
      return status.get(slug) ?? null;
    },

    async validateAll() {
      const entries = deps.stories.list();
      // Sequential — spawning 20 Deno processes in parallel at startup is a
      // memory/CPU spike we do not need. Each validation is ~ready timeout
      // worst case; typical boot cost scales linearly with story count.
      for (const entry of entries) {
        await validateOne(entry.slug, entry.path);
      }
    },

    snapshot() {
      return Object.fromEntries(status.entries());
    },
  };
}
