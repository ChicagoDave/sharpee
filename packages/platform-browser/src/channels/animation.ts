/**
 * @sharpee/platform-browser/channels/animation — `animation`,
 * `animate`, `transition`, `layout`, `clear` channel renderers.
 *
 * Owner context: browser default. Lightweight defaults that emit
 * CSS animation classes / data-attributes on the relevant slots so
 * stories can hook styles. Concrete production renderers (specific
 * keyframes, scene-transition presets) override these.
 *
 * Per ADR-165 §8, the platform-default `animation`/`animate`/
 * `transition` renderers run named CSS animations against the media
 * slot. `layout` applies a configuration payload to a `data-layout`
 * attribute. `clear` runs no visual effect by default — the
 * dispatcher handles append-channel truncation.
 */

import type { ChannelRenderer } from '@sharpee/channel-service';

/**
 * `animation` channel — event, json. Adds a CSS class
 * `animation-${name}` to the slot for one animation frame, then
 * removes it. The story's CSS provides the keyframe definition.
 */
export function createAnimationChannelRenderer(slot: HTMLElement): ChannelRenderer {
  const doc = slot.ownerDocument;
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const data = value as { name?: string; target?: string };
      if (typeof data.name !== 'string') return;
      const className = `animation-${data.name}`;
      const targetEl = data.target
        ? (doc.getElementById(data.target) ?? slot)
        : slot;
      targetEl.classList.add(className);
      // Remove on next frame so re-firing the same animation re-adds
      // the class (CSS animations re-trigger only on class transition).
      const w = doc.defaultView;
      if (w) {
        w.requestAnimationFrame(() => {
          targetEl.classList.remove(className);
        });
      }
    },
  };
}

/**
 * `animate` channel — event, json. Generic CSS-property animation
 * directive. Applies the payload's properties as inline styles.
 */
export function createAnimateChannelRenderer(slot: HTMLElement): ChannelRenderer {
  const doc = slot.ownerDocument;
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const data = value as {
        target?: string;
        properties?: Record<string, string>;
        duration?: number;
      };
      const targetEl = data.target
        ? (doc.getElementById(data.target) ?? slot)
        : slot;
      if (typeof data.duration === 'number') {
        targetEl.style.transitionDuration = `${data.duration}ms`;
      }
      if (data.properties && typeof data.properties === 'object') {
        for (const [prop, val] of Object.entries(data.properties)) {
          targetEl.style.setProperty(prop, val);
        }
      }
    },
  };
}

/**
 * `transition` channel — event, json. Adds a CSS class
 * `transition-${kind}` to the body / root for the configured
 * duration, then removes it.
 */
export function createTransitionChannelRenderer(root: HTMLElement): ChannelRenderer {
  const doc = root.ownerDocument;
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const data = value as { kind?: string; durationMs?: number };
      if (typeof data.kind !== 'string') return;
      const className = `transition-${data.kind}`;
      root.classList.add(className);
      const ms = typeof data.durationMs === 'number' ? data.durationMs : 250;
      const w = doc.defaultView;
      if (w) {
        w.setTimeout(() => {
          root.classList.remove(className);
        }, ms);
      }
    },
  };
}

/**
 * `layout` channel — replace, json. Writes the configuration to a
 * `data-layout` attribute on the root element so CSS / story scripts
 * can react. Stories that need richer layout swapping replace this
 * renderer with one that performs the actual DOM rewrite.
 */
export function createLayoutChannelRenderer(root: HTMLElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (value === null) {
        root.removeAttribute('data-layout');
        return;
      }
      if (!value || typeof value !== 'object') return;
      try {
        root.setAttribute('data-layout', JSON.stringify(value));
      } catch {
        // Unserializable — drop silently; renderer must not throw.
      }
    },
  };
}

/**
 * `clear` channel — event, json. The dispatcher handles append-mode
 * truncation; this renderer adds a visual side-effect (class
 * `clear-active`) for one frame so stories can fade. Default: no
 * effect.
 */
export function createClearChannelRenderer(root: HTMLElement): ChannelRenderer {
  const doc = root.ownerDocument;
  return {
    onValue(_value: unknown): void {
      root.classList.add('clear-active');
      const w = doc.defaultView;
      if (w) {
        w.requestAnimationFrame(() => {
          root.classList.remove('clear-active');
        });
      }
    },
  };
}
