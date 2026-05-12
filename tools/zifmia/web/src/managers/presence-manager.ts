/**
 * @module zifmia/web/managers/presence-manager
 * @purpose Renders the per-room participant roster inside
 *   `.sharpee-presence-panel`. Subscribes to the WS frames
 *   `presence:roster` (initial snapshot on subscribe),
 *   `presence:joined` (deltas), and `presence:left` (deltas).
 *   Applies ADR-176 modifiers — `--self` on the row matching the
 *   caller's identity; `--admin` on rows flagged by the server.
 * @owner Zifmia web client.
 *
 * Idempotency:
 *  - `onJoin` for an identityId already in the roster is a no-op
 *    (server may double-emit on edge cases like restart-recovery).
 *  - `onLeave` for an unknown identityId is a no-op.
 *  - `applyRoster` replaces the full list — used on initial subscribe
 *    and on Phase 6e WS reconnect.
 *
 * The manager wires its own WsClient subscriptions on `mount()` and
 * detaches them on `unmount()`.
 */

import type {
  InboundFrame,
  PresenceJoinedFrame,
  PresenceLeftFrame,
  PresenceRosterFrame,
  WsClient
} from '../ws-client';

export interface PresenceManagerOptions {
  /** Mount target — typically `.sharpee-presence-panel` from RoomView. */
  root: HTMLElement;
  /** WS client (already opened by the RoomManager). */
  ws: WsClient;
  /** Caller's identity id — drives the `--self` modifier. */
  selfIdentityId: string;
}

interface Participant {
  identityId: string;
  handle: string;
  isAdmin: boolean;
}

const ROW_DATA_ATTR = 'data-identity-id';

/**
 * PresenceManager — `.sharpee-presence-panel` owner.
 *
 * Public surface:
 *  - `mount()` — build the list scaffold and subscribe to WS frames.
 *  - `applyRoster(participants)` — public seam so tests and Phase 6e
 *    reconnect can reset the list without going through WS.
 *  - `unmount()` — detach and remove DOM.
 */
export class PresenceManager {
  private readonly options: PresenceManagerOptions;
  private list: HTMLUListElement | null = null;
  private unsubRoster: (() => void) | null = null;
  private unsubJoined: (() => void) | null = null;
  private unsubLeft: (() => void) | null = null;

  constructor(options: PresenceManagerOptions) {
    this.options = options;
  }

  mount(): void {
    if (this.list) return;
    const doc = this.options.root.ownerDocument;
    const list = doc.createElement('ul');
    list.className = 'sharpee-presence-list';
    this.options.root.appendChild(list);
    this.list = list;

    this.unsubRoster = this.options.ws.on('presence:roster', (frame) =>
      this.applyRoster(frame.participants)
    );
    this.unsubJoined = this.options.ws.on('presence:joined', (frame) =>
      this.onJoin(frame)
    );
    this.unsubLeft = this.options.ws.on('presence:left', (frame) =>
      this.onLeave(frame)
    );
  }

  /**
   * Replace the rendered list with `participants`. Idempotent: stable
   * input produces stable DOM (no flicker if the same roster arrives
   * twice).
   */
  applyRoster(participants: ReadonlyArray<Participant>): void {
    const list = this.list;
    if (!list) return;
    list.replaceChildren();
    for (const p of participants) {
      list.appendChild(this.makeRow(p));
    }
  }

  /** Public seam for tests and (Phase 6e) WS reconnect flows. */
  onJoin(frame: PresenceJoinedFrame): void {
    if (!this.list) return;
    if (this.findRow(frame.identityId)) return;
    this.list.appendChild(
      this.makeRow({
        identityId: frame.identityId,
        handle: frame.handle,
        isAdmin: frame.isAdmin
      })
    );
  }

  /** Public seam for tests. */
  onLeave(frame: PresenceLeftFrame): void {
    const row = this.findRow(frame.identityId);
    row?.remove();
  }

  unmount(): void {
    this.unsubRoster?.();
    this.unsubJoined?.();
    this.unsubLeft?.();
    this.unsubRoster = null;
    this.unsubJoined = null;
    this.unsubLeft = null;
    this.list?.parentNode?.removeChild(this.list);
    this.list = null;
  }

  private makeRow(p: Participant): HTMLLIElement {
    const doc = this.options.root.ownerDocument;
    const li = doc.createElement('li');
    li.className = 'sharpee-presence-item';
    li.setAttribute(ROW_DATA_ATTR, p.identityId);
    if (p.identityId === this.options.selfIdentityId) {
      li.classList.add('sharpee-presence-item--self');
    }
    if (p.isAdmin) {
      li.classList.add('sharpee-presence-item--admin');
    }
    // Avatar slot (ADR-176 decoration slot) — exists but empty in v1.
    const avatar = doc.createElement('span');
    avatar.className = 'sharpee-presence-avatar';
    li.appendChild(avatar);
    const handle = doc.createTextNode(p.handle);
    li.appendChild(handle);
    return li;
  }

  private findRow(identityId: string): HTMLLIElement | null {
    return (
      this.list?.querySelector<HTMLLIElement>(
        `li[${ROW_DATA_ATTR}="${cssEscape(identityId)}"]`
      ) ?? null
    );
  }
}

/**
 * Minimal CSS attribute-value escaper — sufficient for the
 * server-generated identity ids (UUID-style, hex+dash). Avoids pulling
 * in a polyfill and dodges environments where `CSS.escape` is missing.
 */
function cssEscape(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, (ch) => `\\${ch}`);
}
