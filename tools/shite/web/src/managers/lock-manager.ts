/**
 * @module zifmia/web/managers/lock-manager
 * @purpose Applies ADR-176 lock state (`--locked` / `--locked-by-me`
 *   modifiers + `.sharpee-lock-banner`) in response to WS `lock:state`
 *   frames. Exposes `acquire()` / `release()` so the
 *   `CommandInputManager` can drive lock transitions on focus, blur,
 *   and successful submit.
 * @owner Zifmia web client.
 *
 * Server contract (ADR-175 §4, AC-10):
 *  - Server emits `lock:state {holder}` whenever the room's typing
 *    lock changes. `holder === null` ⇒ free. `holder.identityId ===
 *    me` ⇒ this client holds it.
 *  - Server force-releases after every command (success or engine
 *    throw), so the post-submit `--locked-by-me → free` transition
 *    arrives over WS without an explicit client release.
 *
 * Resilience: the lock banner element comes from `RoomView` (a
 * stable DOM region present from `enter()`). The input-bar element
 * is owned by `CommandInputManager` and may not exist yet when the
 * very first `lock:state` arrives during room entry. In that case
 * `--locked`/`--locked-by-me` toggling is a no-op for the current
 * frame; the next frame after the input bar mounts catches up.
 */

import type { LockStateFrame, WsClient } from '../ws-client';

export interface LockManagerOptions {
  /** RoomView root — used to locate `.sharpee-input-bar` lazily. */
  root: HTMLElement;
  /** Lock banner element — owned by RoomView, toggled here. */
  lockBanner: HTMLElement;
  /** WS client (already opened by the RoomManager). */
  ws: WsClient;
  /** Active room id. */
  roomId: string;
  /** Caller's identity id — drives self vs. other discrimination. */
  selfIdentityId: string;
}

const INPUT_BAR_LOCKED = 'sharpee-input-bar--locked';
const INPUT_BAR_LOCKED_BY_ME = 'sharpee-input-bar--locked-by-me';
const BANNER_HIDDEN = 'sharpee-lock-banner--hidden';

/**
 * LockManager — `.sharpee-lock-banner` owner + `.sharpee-input-bar`
 * modifier toggler.
 *
 * Public surface:
 *  - `mount()` — subscribe to `lock:state`.
 *  - `acquire()` — emit WS `lock:acquire`. CommandInputManager's
 *    `onFirstKey` seam calls this.
 *  - `release()` — emit WS `lock:release`. CommandInputManager's
 *    `onBlur` seam calls this (with empty input).
 *  - `unmount()` — detach + clear state.
 */
export class LockManager {
  private readonly options: LockManagerOptions;
  private unsubLockState: (() => void) | null = null;

  constructor(options: LockManagerOptions) {
    this.options = options;
  }

  mount(): void {
    if (this.unsubLockState) return;
    this.unsubLockState = this.options.ws.on('lock:state', (frame) =>
      this.onLockState(frame)
    );
  }

  /** Emit `lock:acquire`. Idempotent at the wire — server treats
   * duplicate acquires from the same connection as no-ops. */
  acquire(): void {
    this.options.ws.send({
      type: 'lock:acquire',
      roomId: this.options.roomId
    });
  }

  /** Emit `lock:release`. Idempotent at the wire. */
  release(): void {
    this.options.ws.send({
      type: 'lock:release',
      roomId: this.options.roomId
    });
  }

  /** Public seam for tests. */
  onLockState(frame: LockStateFrame): void {
    if (frame.roomId !== this.options.roomId) return;
    const inputBar = this.options.root.querySelector<HTMLElement>(
      '.sharpee-input-bar'
    );

    if (frame.holder === null) {
      // Free — clear both modifiers, hide banner.
      inputBar?.classList.remove(INPUT_BAR_LOCKED);
      inputBar?.classList.remove(INPUT_BAR_LOCKED_BY_ME);
      this.options.lockBanner.classList.add(BANNER_HIDDEN);
      this.options.lockBanner.textContent = '';
      return;
    }

    if (frame.holder.identityId === this.options.selfIdentityId) {
      // Self holds — locked-by-me, banner stays hidden.
      inputBar?.classList.add(INPUT_BAR_LOCKED_BY_ME);
      inputBar?.classList.remove(INPUT_BAR_LOCKED);
      this.options.lockBanner.classList.add(BANNER_HIDDEN);
      this.options.lockBanner.textContent = '';
      return;
    }

    // Another participant holds the lock.
    inputBar?.classList.add(INPUT_BAR_LOCKED);
    inputBar?.classList.remove(INPUT_BAR_LOCKED_BY_ME);
    this.options.lockBanner.classList.remove(BANNER_HIDDEN);
    this.options.lockBanner.textContent = `${frame.holder.handle} is typing…`;
  }

  unmount(): void {
    this.unsubLockState?.();
    this.unsubLockState = null;
    // Restore the banner to its default hidden state in case the
    // RoomManager remounts later.
    this.options.lockBanner.classList.add(BANNER_HIDDEN);
    this.options.lockBanner.textContent = '';
  }
}
