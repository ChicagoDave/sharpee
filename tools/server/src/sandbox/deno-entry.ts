/**
 * Deno sandbox entry point — production host for one room's story engine.
 *
 * Public interface: exports {@link main}, invoked by the shim the
 *   install-time story bundler generates (see story-bundler.ts). This file
 *   is never executed directly as a script — the compiled bundle wraps it.
 * Bounded context: isolated story execution (ADR-153 Decisions 1 & 2).
 *
 * Runtime contract:
 *   - Hosted by Deno under `--allow-read=<bundle>,<story>`; no other perms.
 *   - All I/O is JSON newline-delimited frames over stdio, matching the wire
 *     protocol in `../wire/server-sandbox.ts`.
 *   - Save storage is the server's responsibility: save blobs go out via
 *     SAVED frames to the parent process, which persists them. The engine's
 *     save/restore pipeline is driven through the platform-events path —
 *     `engine.executeTurn('save')` emits `platform.save_requested`, which
 *     routes through the registered {@link ISaveRestoreHooks}.
 *
 * Typechecking note: this file is excluded from tsc (see tsconfig) because
 * it uses the Deno global directly. Validation happens via:
 *   - esbuild resolving the imports when the bundler builds each story,
 *   - the story-bundler integration test (bundling exercises type shapes),
 *   - the deno-engine-integration acceptance gate running it under real Deno.
 */

import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import type { ISaveData } from '@sharpee/core';

// The Deno runtime global. Declared locally because this file is excluded
// from tsc (see module header) — Deno itself typechecks via deno.json.
declare const Deno: {
  stdin: { readable: ReadableStream<Uint8Array> };
  stdout: { writable: WritableStream<Uint8Array> };
  exit(code?: number): never;
};

/** Subset of meta.json the host emits in READY. Rest is pass-through. */
interface HostMeta {
  title: string;
  author?: string | string[];
  version?: string;
  [key: string]: unknown;
}

/** Input to {@link main}: the imported story module + the parsed meta. */
export interface HostInput {
  story: unknown;
  meta: HostMeta;
}

/** Chunked base64 encoder safe for arbitrarily large Uint8Arrays. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Inverse of {@link bytesToBase64}. */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Bootstrap engine + run the stdio frame loop. Called by the bundler-generated
 * shim with the already-imported story module and the meta constant.
 */
export async function main({ story: storyModule, meta }: HostInput): Promise<void> {
  const enc = new TextEncoder();
  const writer = Deno.stdout.writable.getWriter();

  const emit = async (msg: unknown): Promise<void> => {
    await writer.write(enc.encode(JSON.stringify(msg) + '\n'));
  };

  // --- Extract the story object from the imported module ----------
  // .sharpee builds export in one of three historical shapes; match zifmia.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = storyModule as any;
  const story = mod?.story ?? mod?.default?.story ?? mod?.default;
  if (!story || !story.config) {
    await emit({
      kind: 'ERROR',
      phase: 'init',
      detail: 'bundle exports no valid story object',
    });
    Deno.exit(1);
  }

  // --- Engine bootstrap --- modeled on packages/zifmia/src/runner/index.tsx:95-121
  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  const language = new LanguageProvider();
  const parser = new Parser(language);

  if (typeof story.extendParser === 'function') story.extendParser(parser);
  if (typeof story.extendLanguage === 'function') story.extendLanguage(language);

  const perceptionService = new PerceptionService();
  const engine = new GameEngine({ world, player, parser, language, perceptionService });
  engine.setStory(story);

  // --- Save/restore hook bridge -----------------------------------
  // Save: engine.executeTurn('save') → `platform.save_requested` platform
  // event → engine's handler calls onSaveRequested(saveData) → we capture the
  // payload here → emit SAVED upward over the wire.
  // Restore: wire RESTORE → we decode + stash in `pendingRestoreData` →
  // engine.executeTurn('restore') → handler calls onRestoreRequested() →
  // we return the stashed data → engine's SaveRestoreService loads it plus
  // re-syncs context/parser/vocab via the PlatformOperationHandler's engine
  // callbacks.
  let capturedSaveData: ISaveData | null = null;
  let pendingRestoreData: ISaveData | null = null;
  engine.registerSaveRestoreHooks({
    onSaveRequested: async (data) => {
      capturedSaveData = data;
    },
    onRestoreRequested: async () => pendingRestoreData,
    onRestartRequested: async () => true, // sandbox auto-confirms restart
  });

  // engine.executeTurn() refuses to run until the engine is started
  // (GameEngine throws 'Engine is not running'). Zifmia's runner does the
  // same dance after setStory + hooks. We do NOT call executeTurn('look')
  // here — the server drives the opening scene via its post-READY COMMAND.
  engine.start();

  // --- READY -------------------------------------------------------
  // Opening-scene text is NOT emitted here; server follows up with an initial
  // COMMAND 'look' to produce the first OUTPUT. meta.json is the source of
  // truth for story_metadata — the operator filled it in at build time.
  const author = Array.isArray(meta.author) ? meta.author.join(', ') : meta.author;
  await emit({
    kind: 'READY',
    story_metadata: {
      title: meta.title,
      ...(typeof author === 'string' ? { author } : {}),
      ...(typeof meta.version === 'string' ? { version: meta.version } : {}),
    },
  });

  // --- Frame loop --------------------------------------------------
  const reader = Deno.stdin.readable
    .pipeThrough(new TextDecoderStream())
    .getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += value;
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let frame: any;
      try {
        frame = JSON.parse(line);
      } catch {
        await emit({ kind: 'ERROR', phase: 'init', detail: 'malformed JSON frame' });
        continue;
      }
      try {
        await handleFrame(frame, engine, emit, {
          getSaveData: () => capturedSaveData,
          clearSaveData: () => {
            capturedSaveData = null;
          },
          setPendingRestore: (d) => {
            pendingRestoreData = d;
          },
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        const turn_id = typeof frame?.turn_id === 'string' ? frame.turn_id : undefined;
        const phase =
          frame?.kind === 'COMMAND' ? 'turn'
            : frame?.kind === 'SAVE' ? 'save'
            : frame?.kind === 'RESTORE' ? 'restore'
            : 'init';
        await emit({ kind: 'ERROR', phase, ...(turn_id ? { turn_id } : {}), detail });
      }
    }
  }
}

interface HookAccess {
  getSaveData(): ISaveData | null;
  clearSaveData(): void;
  setPendingRestore(data: ISaveData | null): void;
}

/** Dispatch a single inbound frame. Errors here bubble up to main's try/catch. */
async function handleFrame(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frame: any,
  engine: GameEngine,
  emit: (msg: unknown) => Promise<void>,
  hooks: HookAccess,
): Promise<void> {
  switch (frame.kind) {
    case 'INIT':
      // Bundled host ignores INIT — READY was already emitted at startup.
      // Accepting a redundant INIT avoids races with the parent process.
      return;

    case 'COMMAND': {
      if (typeof frame.turn_id !== 'string' || typeof frame.input !== 'string') {
        throw new Error('COMMAND missing turn_id/input');
      }
      const result = await engine.executeTurn(frame.input);
      await emit({
        kind: 'OUTPUT',
        turn_id: frame.turn_id,
        text_blocks: result.blocks ?? [],
        events: result.events ?? [],
      });
      return;
    }

    case 'SAVE': {
      if (typeof frame.save_id !== 'string') throw new Error('SAVE missing save_id');
      hooks.clearSaveData();
      await engine.executeTurn('save');
      const saveData = hooks.getSaveData();
      if (!saveData) {
        throw new Error('save hook never received data — save meta-command may have failed');
      }
      const json = JSON.stringify(saveData);
      const blob_b64 = bytesToBase64(new TextEncoder().encode(json));
      await emit({ kind: 'SAVED', save_id: frame.save_id, blob_b64 });
      return;
    }

    case 'RESTORE': {
      if (typeof frame.save_id !== 'string') throw new Error('RESTORE missing save_id');
      if (typeof frame.blob_b64 !== 'string') throw new Error('RESTORE missing blob_b64');
      const json = new TextDecoder().decode(base64ToBytes(frame.blob_b64));
      const saveData = JSON.parse(json) as ISaveData;
      hooks.setPendingRestore(saveData);
      try {
        await engine.executeTurn('restore');
      } finally {
        hooks.setPendingRestore(null);
      }
      // text_blocks intentionally empty — the server's next COMMAND 'look'
      // produces the post-restore room description. The wire type requires
      // the field; [] satisfies it without running an extra in-process turn.
      await emit({ kind: 'RESTORED', save_id: frame.save_id, text_blocks: [] });
      return;
    }

    case 'CANCEL':
      // Mid-turn cancellation is out of v1 scope; treat as no-op.
      return;

    case 'SHUTDOWN':
      await emit({ kind: 'EXITED', reason: 'shutdown' });
      Deno.exit(0);
      return;

    default:
      await emit({
        kind: 'ERROR',
        phase: 'init',
        detail: `unknown frame kind: ${String(frame.kind)}`,
      });
  }
}
