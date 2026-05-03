/**
 * @sharpee/platform-browser/channels/image — `image:*` channel
 * renderers + preload.
 *
 * Owner context: browser default. Implements ADR-165 §8 image
 * behavior:
 *  - `image:<layer>` (replace, json) — mount/unmount an `<img>` at
 *    the layer's z-index in the media slot.
 *  - `image:preload` (event, json) — trigger asset prefetch via a
 *    detached `<img>` element; no visible output.
 *
 * Layer z-ordering convention (ADR-163 §11): `background < main <
 * overlay`. Custom layers above `overlay` use `data-layer` attribute
 * indices; the renderer sorts on insertion.
 *
 * Hide signal: `null` value clears the `<img>` for that layer
 * (ADR-163 §6).
 */

import type { ChannelRenderer } from '@sharpee/channel-service';

const LAYER_Z_INDEX: Record<string, number> = {
  background: 10,
  main: 20,
  overlay: 30,
};

interface ImagePayload {
  src?: string;
  alt?: string;
  layer?: string;
  hotspots?: ReadonlyArray<{
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    command?: string;
  }>;
}

export interface ImageChannelRendererOptions {
  /**
   * Hotspot click handler. Called with the hotspot's `command` field
   * when the user clicks an `<area>` element synthesized for an image
   * with hotspots. Per ADR-163 §10, the handler routes to the
   * `Renderer.emitCommand(text)` so the engine sees a typed command.
   */
  onHotspotCommand?(command: string): void;
}

/**
 * Construct the renderer for a single `image:<layer>` channel.
 *
 * @param slot — the media slot HTMLElement (typically a positioned
 *   container so layered images stack correctly via z-index).
 * @param layer — the layer name (`background`, `main`, `overlay`,
 *   or a story-defined custom layer). Used to address the
 *   `<img>` element this renderer manages.
 */
export function createImageChannelRenderer(
  slot: HTMLElement,
  layer: string,
  opts: ImageChannelRendererOptions = {},
): ChannelRenderer {
  const doc = slot.ownerDocument;
  const elementId = `img-layer-${layer}`;
  const z = LAYER_Z_INDEX[layer] ?? 40;

  return {
    onValue(value: unknown): void {
      const existing = doc.getElementById(elementId);
      if (value === null) {
        if (existing) existing.parentNode?.removeChild(existing);
        return;
      }
      if (!value || typeof value !== 'object') return;
      const payload = value as ImagePayload;
      if (typeof payload.src !== 'string') return;

      let wrapper = existing as HTMLElement | null;
      if (!wrapper) {
        wrapper = doc.createElement('div');
        wrapper.id = elementId;
        wrapper.classList.add('image-layer', `image-layer-${layer}`);
        wrapper.setAttribute('data-layer', layer);
        wrapper.style.position = 'absolute';
        wrapper.style.inset = '0';
        wrapper.style.zIndex = String(z);
        slot.appendChild(wrapper);
      } else {
        // Reset wrapper for new content
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
      }

      const img = doc.createElement('img');
      img.src = payload.src;
      if (typeof payload.alt === 'string') img.alt = payload.alt;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      wrapper.appendChild(img);

      if (Array.isArray(payload.hotspots) && payload.hotspots.length > 0) {
        attachHotspots(doc, wrapper, payload.hotspots, opts.onHotspotCommand);
      }
    },
  };
}

function attachHotspots(
  doc: Document,
  wrapper: HTMLElement,
  hotspots: ReadonlyArray<{
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    command?: string;
  }>,
  onCommand?: (command: string) => void,
): void {
  for (const h of hotspots) {
    if (typeof h.command !== 'string') continue;
    const btn = doc.createElement('button');
    btn.classList.add('image-hotspot');
    btn.setAttribute('data-command', h.command);
    btn.style.position = 'absolute';
    if (typeof h.x === 'number') btn.style.left = `${h.x}px`;
    if (typeof h.y === 'number') btn.style.top = `${h.y}px`;
    if (typeof h.width === 'number') btn.style.width = `${h.width}px`;
    if (typeof h.height === 'number') btn.style.height = `${h.height}px`;
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    const command = h.command;
    btn.addEventListener('click', () => onCommand?.(command));
    wrapper.appendChild(btn);
  }
}

/**
 * `image:preload` channel renderer — event-mode. Triggers an asset
 * prefetch via a detached `<img>` element; no visible DOM output.
 */
export function createImagePreloadChannelRenderer(
  slot: HTMLElement,
): ChannelRenderer {
  const doc = slot.ownerDocument;
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const payload = value as { src?: string };
      if (typeof payload.src !== 'string') return;
      const img = doc.createElement('img');
      img.src = payload.src;
      // Detached — let the browser fetch and cache it.
    },
  };
}
