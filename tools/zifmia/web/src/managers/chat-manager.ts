/**
 * @module zifmia/web/managers/chat-manager
 * @purpose Renders the per-room chat panel inside
 *   `.sharpee-chat-panel`. Owns `.sharpee-chat-history` (scrollable
 *   `<ol>` of `<li class="sharpee-chat-message">` rows) and a
 *   `.sharpee-chat-input` (text field). Sends user-typed messages
 *   via WS `chat:send`; renders incoming `chat:message` frames as
 *   message rows.
 * @owner Zifmia web client.
 *
 * Server-side contract: the canonical render is the server echo. The
 * sender does NOT locally render their own outgoing text; instead the
 * server persists, assigns an id + ts, and broadcasts `chat:message`
 * back to every subscriber (the sender included). This eliminates the
 * "optimistic local + server-canonical" reconcile path.
 *
 * Scroll-pin: when the user is at-or-near the bottom of
 * `.sharpee-chat-history`, new messages auto-scroll. When the user
 * has scrolled up, new messages append without disturbing the view.
 */

import type { ChatMessageFrame, WsClient } from '../ws-client';

export interface ChatManagerOptions {
  /** Mount target — typically `.sharpee-chat-panel` from RoomView. */
  root: HTMLElement;
  /** Active room id; included in every `chat:send` frame. */
  roomId: string;
  /** WS client (already opened by the RoomManager). */
  ws: WsClient;
  /** Caller's identity id — drives the `--self` modifier. */
  selfIdentityId: string;
}

/**
 * Pixels of slack at the bottom of `.sharpee-chat-history` that still
 * count as "pinned." Browsers sometimes round scrollTop fractionally;
 * a tight check breaks scroll-pin under load. 4px is a balance between
 * "user nudged up" and "browser rounded."
 */
const SCROLL_PIN_SLACK_PX = 4;

/**
 * ChatManager — `.sharpee-chat-panel` owner.
 *
 * Public surface:
 *  - `mount()` — build the panel scaffold and subscribe to WS frames.
 *  - `send(text)` — public seam used by tests; the bound submit
 *    handler calls this when the user presses Enter.
 *  - `unmount()` — detach and remove DOM.
 */
export class ChatManager {
  private readonly options: ChatManagerOptions;
  private history: HTMLOListElement | null = null;
  private form: HTMLFormElement | null = null;
  private field: HTMLInputElement | null = null;
  private unsubMessage: (() => void) | null = null;

  constructor(options: ChatManagerOptions) {
    this.options = options;
  }

  mount(): void {
    if (this.history) return;
    const doc = this.options.root.ownerDocument;

    const history = doc.createElement('ol');
    history.className = 'sharpee-chat-history';
    this.options.root.appendChild(history);
    this.history = history;

    const form = doc.createElement('form');
    form.setAttribute('novalidate', '');
    const field = doc.createElement('input');
    field.className = 'sharpee-chat-input';
    field.type = 'text';
    field.setAttribute('autocomplete', 'off');
    field.setAttribute('maxlength', '2000');
    field.setAttribute('aria-label', 'Chat message');
    form.appendChild(field);
    this.options.root.appendChild(form);
    this.form = form;
    this.field = field;

    form.addEventListener('submit', this.handleSubmit);
    this.unsubMessage = this.options.ws.on('chat:message', (frame) =>
      this.onMessage(frame)
    );
  }

  /**
   * Send a chat message via WS. Public so tests can drive it without
   * synthesizing a form submit.
   */
  send(text: string): void {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    this.options.ws.send({
      type: 'chat:send',
      roomId: this.options.roomId,
      text: trimmed
    });
    if (this.field) this.field.value = '';
  }

  /** Public seam for tests. */
  onMessage(frame: ChatMessageFrame): void {
    const history = this.history;
    if (!history) return;
    const wasPinned = this.isScrollPinned(history);
    const doc = this.options.root.ownerDocument;
    const li = doc.createElement('li');
    li.className = 'sharpee-chat-message';
    if (frame.fromId === this.options.selfIdentityId) {
      li.classList.add('sharpee-chat-message--self');
    }
    const author = doc.createElement('span');
    author.className = 'sharpee-chat-message-author';
    author.textContent = frame.fromHandle;
    const text = doc.createElement('span');
    text.className = 'sharpee-chat-message-text';
    text.textContent = frame.text;
    li.append(author, text);
    history.appendChild(li);
    if (wasPinned) {
      // Re-pin to the new bottom. Reading after append flushes layout
      // first so the new scrollHeight reflects the appended row.
      history.scrollTop = history.scrollHeight;
    }
  }

  unmount(): void {
    this.unsubMessage?.();
    this.unsubMessage = null;
    this.form?.removeEventListener('submit', this.handleSubmit);
    this.history?.parentNode?.removeChild(this.history);
    this.form?.parentNode?.removeChild(this.form);
    this.history = null;
    this.form = null;
    this.field = null;
  }

  private readonly handleSubmit = (event: Event): void => {
    event.preventDefault();
    if (!this.field) return;
    this.send(this.field.value);
  };

  private isScrollPinned(history: HTMLElement): boolean {
    const max = history.scrollHeight - history.clientHeight;
    // Initial empty history (no overflow) is treated as pinned so the
    // first batch of messages locks the view to the bottom.
    if (max <= 0) return true;
    return history.scrollTop >= max - SCROLL_PIN_SLACK_PX;
  }
}
