/**
 * @sharpee/platform-browser/channels — public surface.
 *
 * Owner context: browser default. Exposes per-channel renderer
 * builders, the default layout helper, and the
 * `registerDefaultBrowserRenderers` convenience that wires all
 * platform-default `ChannelRenderer`s onto a `Renderer` instance in
 * one call.
 *
 * Stories that override individual renderers re-register against the
 * same channel id after this helper runs (last-write-wins per ADR-165
 * §3). Stories that replace the entire layout skip
 * `mountDefaultLayout` and `registerDefaultBrowserRenderers` and
 * instead call `Renderer.registerSlot(name, handle)` + their own
 * channel-renderer registrations.
 *
 * @see ADR-165 — Renderer Architecture — §7, §8
 */

import type { IRenderer } from '@sharpee/channel-service';
import { createMainChannelRenderer } from './main';
import { createPromptChannelRenderer } from './prompt';
import {
  createLocationChannelRenderer,
  createScoreChannelRenderer,
  createTurnChannelRenderer,
} from './status';
import { createInfoChannelRenderer, createIfidChannelRenderer } from './info';
import {
  createDeathChannelRenderer,
  createEndgameChannelRenderer,
  createScoreNotifyChannelRenderer,
} from './notify';
import {
  createImageChannelRenderer,
  createImagePreloadChannelRenderer,
} from './image';
import {
  createSoundChannelRenderer,
  createMusicChannelRenderer,
  createAmbientChannelRenderer,
  type AudioManagerLike,
} from './audio';
import { createGenericPanelRenderer } from './panel';
import {
  createAnimationChannelRenderer,
  createAnimateChannelRenderer,
  createTransitionChannelRenderer,
  createLayoutChannelRenderer,
  createClearChannelRenderer,
} from './animation';
import {
  createLifecycleChannelRenderer,
  type LifecycleChannelRendererOptions,
} from './lifecycle';
import { mountDefaultLayout, type BrowserDefaultLayout } from './layout';

export {
  createMainChannelRenderer,
  createPromptChannelRenderer,
  createLocationChannelRenderer,
  createScoreChannelRenderer,
  createTurnChannelRenderer,
  createInfoChannelRenderer,
  createIfidChannelRenderer,
  createDeathChannelRenderer,
  createEndgameChannelRenderer,
  createScoreNotifyChannelRenderer,
  createImageChannelRenderer,
  createImagePreloadChannelRenderer,
  createSoundChannelRenderer,
  createMusicChannelRenderer,
  createAnimationChannelRenderer,
  createAnimateChannelRenderer,
  createTransitionChannelRenderer,
  createLayoutChannelRenderer,
  createClearChannelRenderer,
  createLifecycleChannelRenderer,
  mountDefaultLayout,
};
export type { BrowserDefaultLayout, AudioManagerLike, LifecycleChannelRendererOptions };
export { createAmbientChannelRenderer } from './audio';
export { createGenericPanelRenderer } from './panel';
export { renderTextContent, flattenTextContent } from './text-content';

/**
 * Options for {@link registerDefaultBrowserRenderers}.
 */
export interface RegisterDefaultBrowserRenderersOptions {
  /**
   * `AudioManager`-shaped instance the audio renderers delegate to.
   * Pass the same instance the rest of the browser client uses so
   * legacy `audio.*` events and channel-driven sound/music share
   * one playback context.
   */
  audio: AudioManagerLike;
  /**
   * Optional callback invoked after every entry the main channel
   * renderer appends. The browser client uses it to scroll the prose
   * window to the bottom.
   */
  onMainAfterAppend?(slot: HTMLElement): void;
  /**
   * Optional hotspot-click handler for image channels. When a
   * hotspot is clicked the renderer calls this with the hotspot's
   * `command` field — the browser client routes it through
   * `Renderer.emitCommand` so the engine sees a typed command.
   */
  onHotspotCommand?(command: string): void;
  /**
   * Wiring for the `lifecycle` channel renderer. Pass the browser
   * client's `appendSystemMessage` and a refresh callback (typically
   * `renderCombinedStatus`) so save/restore signals project to the
   * same DOM regions the legacy raw-event path used. Omit to skip
   * registering a lifecycle renderer (CLI / test scenarios).
   */
  lifecycle?: LifecycleChannelRendererOptions;
}

/**
 * Register every platform-default browser channel renderer against
 * the supplied `Renderer`. Slots from `layout` are also registered
 * via `Renderer.registerSlot(name, handle)` so stories can resolve
 * platform-default slot names by `getSlot`.
 *
 * Standard channels: `main`, `prompt`, `location`, `score`, `turn`,
 * `info`, `ifid`, `death`, `endgame`, `score_notify`.
 *
 * Media channels: `image:background`, `image:main`, `image:overlay`,
 * `image:preload`, `sound`, `music`, `animation`, `animate`,
 * `transition`, `layout`, `clear`.
 *
 * Stories override any of these by calling
 * `renderer.registerRenderer(channelId, ...)` AFTER this helper
 * (last-write-wins per ADR-165 §3).
 */
export function registerDefaultBrowserRenderers(
  renderer: IRenderer,
  layout: BrowserDefaultLayout,
  opts: RegisterDefaultBrowserRenderersOptions,
): void {
  // ── Slots ────────────────────────────────────────────────────────
  renderer.registerSlot('status', layout.status);
  renderer.registerSlot('main', layout.main);
  renderer.registerSlot('sidebar', layout.sidebar);
  renderer.registerSlot('input', layout.input);
  renderer.registerSlot('media', layout.media);
  renderer.registerSlot('notify', layout.notify);
  renderer.registerSlot('meta', layout.meta);

  // ── Standard channels ────────────────────────────────────────────
  renderer.registerRenderer(
    'main',
    createMainChannelRenderer(layout.main, {
      onAfterAppend: opts.onMainAfterAppend,
    }),
  );
  renderer.registerRenderer(
    'prompt',
    createPromptChannelRenderer(layout.input, {
      promptLabel: layout.inputPromptLabel,
    }),
  );
  renderer.registerRenderer('location', createLocationChannelRenderer(layout.statusLocation));
  renderer.registerRenderer('score', createScoreChannelRenderer(layout.statusScore));
  renderer.registerRenderer('turn', createTurnChannelRenderer(layout.statusTurn));
  renderer.registerRenderer('info', createInfoChannelRenderer(layout.meta));
  renderer.registerRenderer('ifid', createIfidChannelRenderer(layout.meta));
  renderer.registerRenderer('death', createDeathChannelRenderer(layout.notify));
  renderer.registerRenderer('endgame', createEndgameChannelRenderer(layout.notify));
  renderer.registerRenderer('score_notify', createScoreNotifyChannelRenderer(layout.notify));

  // ── Image channels ───────────────────────────────────────────────
  for (const layer of ['background', 'main', 'overlay']) {
    renderer.registerRenderer(
      `image:${layer}`,
      createImageChannelRenderer(layout.media, layer, {
        onHotspotCommand: opts.onHotspotCommand,
      }),
    );
  }
  renderer.registerRenderer(
    'image:preload',
    createImagePreloadChannelRenderer(layout.media),
  );

  // ── Audio channels ───────────────────────────────────────────────
  renderer.registerRenderer('sound', createSoundChannelRenderer(opts.audio));
  renderer.registerRenderer('music', createMusicChannelRenderer(opts.audio));

  // ── Dynamic channels (ADR-241 D4): family binding + generic panel ─
  // Any manifest channel with no exact-id renderer binds by family —
  // `ambient:<id>` → the AudioManager ambient renderer, `image:<layer>`
  // → the image-layer renderer — and everything else lands in the
  // generic panel (one labelled box per channel id, in the sidebar).
  // Exact-id story registrations run AFTER this helper and win
  // (last-write-wins, ADR-165 §3); the console JSON tree stays as the
  // debug view for consumers that register no factories.
  renderer.registerRendererFactory('ambient:', (id) =>
    createAmbientChannelRenderer(opts.audio, id.slice('ambient:'.length)),
  );
  renderer.registerRendererFactory('image:', (id) =>
    createImageChannelRenderer(layout.media, id.slice('image:'.length), {
      onHotspotCommand: opts.onHotspotCommand,
    }),
  );
  renderer.registerRendererFactory('', (id) => createGenericPanelRenderer(layout.sidebar, id));

  // ── Animation / transition / layout / clear ──────────────────────
  renderer.registerRenderer('animation', createAnimationChannelRenderer(layout.media));
  renderer.registerRenderer('animate', createAnimateChannelRenderer(layout.media));
  renderer.registerRenderer('transition', createTransitionChannelRenderer(layout.root));
  renderer.registerRenderer('layout', createLayoutChannelRenderer(layout.root));
  renderer.registerRenderer('clear', createClearChannelRenderer(layout.root));

  // ── Lifecycle (save/restore signals) ─────────────────────────────
  if (opts.lifecycle) {
    renderer.registerRenderer('lifecycle', createLifecycleChannelRenderer(opts.lifecycle));
  }
}
