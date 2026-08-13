/**
 * @module zifmia/web/managers/command-input-manager
 * @purpose Owns the `.sharpee-input-bar` (ADR-170) and the
 *   command-submission flow. On submit, POSTs to
 *   `/rooms/:id/command`; on 200 hands the returned `TurnPacket` to
 *   an upstream callback (the RoomManager dispatches it through the
 *   channel `Renderer`). On non-2xx, surfaces an inline error pip
 *   on the input row.
 * @owner Zifmia web client.
 *
 * Phase 6c-client scope: focus / blur / submit. Phase 6e wires the
 * `lock:acquire` / `lock:release` WS frames on the same focus and
 * keystroke events — the manager exposes seams (`onFirstKey`,
 * `onBlur`) so 6e can hook in without restructuring this module.
 */

import { postCommand } from '../api/rooms';
import type { HttpClientOptions } from '../api/http';
import type { ApiResult, TurnPacketResponse } from '../api/types';

export interface CommandInputManagerOptions {
  /** Mount target — the manager appends its `.sharpee-input-bar`. */
  root: HTMLElement;
  /** Active room id; included in the POST URL. */
  roomId: string;
  /** HTTP options forwarded to `postCommand`. */
  httpOptions: HttpClientOptions;
  /**
   * Fired after a successful `POST /rooms/:id/command`. The packet
   * mirrors the engine wire — `channelPacket` is the canonical
   * channel-typed payload; `blocks` is kept for legacy/fallback use.
   * The RoomManager hooks this up to its `Renderer.applyTurnPacket`.
   */
  onTurn: (packet: TurnPacketResponse, command: string) => void;
  /** Optional API override for tests. */
  api?: { postCommand: typeof postCommand };
  /**
   * Optional hook fired the first time a key event reaches the input
   * field after focus. Phase 6e uses this seam to emit
   * `lock:acquire` over WS without waiting for the input to actually
   * change.
   */
  onFirstKey?: () => void;
  /** Optional hook fired on input blur. Phase 6e uses it to release. */
  onBlur?: () => void;
}

/**
 * CommandInputManager — `.sharpee-input-bar` owner.
 *
 * Public surface:
 * - `mount()` — build and attach the input DOM.
 * - `focus()` — programmatic focus (RoomManager calls this on entry).
 * - `setDisabled(disabled)` — Phase 6e calls this from `--locked` /
 *   `--locked-by-me` modifier handling. Public so the lock manager
 *   doesn't have to dig into private DOM.
 * - `unmount()` — detach and remove.
 */
export class CommandInputManager {
  private readonly options: CommandInputManagerOptions;
  private readonly api: { postCommand: typeof postCommand };
  private container: HTMLElement | null = null;
  private form: HTMLFormElement | null = null;
  private field: HTMLInputElement | null = null;
  private errorElement: HTMLElement | null = null;
  private hasEmittedFirstKey = false;
  private submitting = false;

  constructor(options: CommandInputManagerOptions) {
    this.options = options;
    this.api = options.api ?? { postCommand };
  }

  mount(): void {
    if (this.container) return;
    const doc = this.options.root.ownerDocument;
    const container = doc.createElement('div');
    container.className = 'sharpee-input-bar';
    container.innerHTML = renderInputHtml();
    this.options.root.appendChild(container);
    this.container = container;
    this.form = container.querySelector('form');
    this.field = container.querySelector(
      'input.sharpee-input-field'
    ) as HTMLInputElement | null;
    this.errorElement = container.querySelector(
      '[data-role="input-error"]'
    );

    this.form?.addEventListener('submit', this.handleSubmit);
    this.field?.addEventListener('focus', this.handleFocus);
    this.field?.addEventListener('blur', this.handleBlur);
    this.field?.addEventListener('keydown', this.handleKeyDown);
  }

  focus(): void {
    this.field?.focus();
  }

  setDisabled(disabled: boolean): void {
    if (!this.field) return;
    this.field.disabled = disabled;
    this.field.readOnly = disabled;
  }

  unmount(): void {
    if (!this.container) return;
    this.form?.removeEventListener('submit', this.handleSubmit);
    this.field?.removeEventListener('focus', this.handleFocus);
    this.field?.removeEventListener('blur', this.handleBlur);
    this.field?.removeEventListener('keydown', this.handleKeyDown);
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.form = null;
    this.field = null;
    this.errorElement = null;
    this.hasEmittedFirstKey = false;
    this.submitting = false;
  }

  private readonly handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    if (this.submitting) return;
    const field = this.field;
    if (!field) return;
    const command = field.value.trim();
    if (command.length === 0) return;

    this.submitting = true;
    this.clearError();
    const result: ApiResult<TurnPacketResponse> = await this.api.postCommand(
      this.options.roomId,
      command,
      this.options.httpOptions
    );
    this.submitting = false;

    if (!result.ok) {
      this.showError(messageForCommandError(result.error, result.detail));
      return;
    }
    field.value = '';
    this.hasEmittedFirstKey = false;
    this.options.onTurn(result.value, command);
  };

  private readonly handleFocus = (): void => {
    this.hasEmittedFirstKey = false;
  };

  private readonly handleBlur = (): void => {
    this.hasEmittedFirstKey = false;
    this.options.onBlur?.();
  };

  private readonly handleKeyDown = (): void => {
    if (this.hasEmittedFirstKey) return;
    this.hasEmittedFirstKey = true;
    this.options.onFirstKey?.();
  };

  private showError(message: string): void {
    if (!this.errorElement) return;
    this.errorElement.textContent = message;
    this.errorElement.hidden = false;
  }

  private clearError(): void {
    if (!this.errorElement) return;
    this.errorElement.textContent = '';
    this.errorElement.hidden = true;
  }
}

function renderInputHtml(): string {
  return `
    <form novalidate>
      <span class="sharpee-input-prompt">&gt;</span>
      <input
        class="sharpee-input-field"
        name="command"
        type="text"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        maxlength="1000"
        aria-label="Command"
      />
    </form>
    <p data-role="input-error" class="sharpee-input-bar-error" hidden></p>
  `;
}

function messageForCommandError(error: string, detail?: string): string {
  if (error === 'room_not_found') return 'This room no longer exists.';
  if (error === 'room_closed') return 'This room is closed.';
  if (error === 'lock_held' || error === 'lock_contended') {
    return 'Another player is currently typing.';
  }
  if (error === 'turn_failed') return 'The engine could not finish that turn.';
  if (error === 'invalid_body') return 'That command is malformed.';
  if (detail) return `${error}: ${detail}`;
  return error;
}
