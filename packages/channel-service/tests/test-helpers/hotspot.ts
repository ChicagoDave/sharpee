/**
 * Hotspot click → CommandPacket synthesis (ADR-163 §9, AC-7).
 *
 * Reference helper for AC-7's "renderer that receives an image:main
 * payload with hotspots and simulates a click on a hotspot emits a
 * { kind: 'command', text: ... } packet".
 *
 * The platform does not ship a renderer; this helper stands in for the
 * gesture→command mapping a real renderer would perform. It owns the
 * boundary rule from §9: any UI gesture that affects game state
 * synthesizes a `CommandPacket` indistinguishable from a typed command.
 */

import type { CommandPacket } from '../../src/wire';

export interface HotspotBounds {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Hotspot {
  readonly id: string;
  readonly bounds: HotspotBounds;
  /** ADR-163 §7 / AC-7 — the field is `command`, not `action`. */
  readonly command: string;
}

export interface ImagePayloadWithHotspots {
  readonly src: string;
  readonly layer?: string;
  readonly hotspots?: ReadonlyArray<Hotspot>;
}

/**
 * Locate the first hotspot whose bounds contain the click point.
 * Returns `null` when no hotspot matches — the renderer should
 * suppress the gesture (no `CommandPacket` reaches the wire per §9's
 * "renderer-local UI state stays off the wire" rule).
 */
export function hitTest(
  payload: ImagePayloadWithHotspots,
  click: { x: number; y: number },
): Hotspot | null {
  const hotspots = payload.hotspots ?? [];
  for (const h of hotspots) {
    const { x, y, w, h: height } = h.bounds;
    if (
      click.x >= x &&
      click.x <= x + w &&
      click.y >= y &&
      click.y <= y + height
    ) {
      return h;
    }
  }
  return null;
}

/**
 * Synthesize a `CommandPacket` from a hotspot click. Returns `null`
 * when the click misses every hotspot (no command, no wire packet).
 *
 * The returned packet is structurally identical to one a typed command
 * would produce — the engine's parser cannot distinguish the source.
 */
export function synthesizeHotspotCommand(
  payload: ImagePayloadWithHotspots,
  click: { x: number; y: number },
): CommandPacket | null {
  const hotspot = hitTest(payload, click);
  if (!hotspot) return null;
  return { kind: 'command', text: hotspot.command };
}
