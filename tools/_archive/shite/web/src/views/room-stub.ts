/**
 * @module zifmia/web/views/room-stub
 * @purpose Minimal placeholder rendered for `#room/:id` hashes in
 *   Phase 6b. Replaced by the full `RoomManager` view (transcript,
 *   channels, command input, presence, chat) in Phase 6c.
 * @owner Zifmia web client.
 *
 * Mounts only ADR-170/176 contract classes: `.sharpee-window` for
 * the page frame and `.sharpee-prose-pane` for the placeholder copy.
 * Provides a "Back to lobby" button that clears the hash so the
 * shell drops back to the LobbyManager via `hashchange`.
 */

export interface RoomStubOptions {
  root: HTMLElement;
  roomId: string;
  onLeave: () => void;
}

export class RoomStub {
  private readonly options: RoomStubOptions;
  private container: HTMLElement | null = null;
  private leaveButton: HTMLButtonElement | null = null;

  constructor(options: RoomStubOptions) {
    this.options = options;
  }

  mount(): void {
    if (this.container) return;
    const doc = this.options.root.ownerDocument;
    const section = doc.createElement('section');
    section.className = 'sharpee-window';
    section.setAttribute('data-role', 'room-stub');
    section.setAttribute('data-room-id', this.options.roomId);
    section.innerHTML = `
      <div class="sharpee-window-title-bar">
        <span class="sharpee-window-title">Room ${escapeHtml(this.options.roomId)}</span>
        <div class="sharpee-window-title-bar-controls">
          <button data-role="leave" type="button">Back to lobby</button>
        </div>
      </div>
      <div class="sharpee-prose-pane">
        <p>Room view ships in Phase 6c. (You entered <code>${escapeHtml(this.options.roomId)}</code>.)</p>
      </div>
    `;
    this.options.root.appendChild(section);
    this.container = section;
    this.leaveButton = section.querySelector('[data-role="leave"]');
    this.leaveButton?.addEventListener('click', this.handleLeave);
  }

  unmount(): void {
    if (!this.container) return;
    this.leaveButton?.removeEventListener('click', this.handleLeave);
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.leaveButton = null;
  }

  private readonly handleLeave = (event: Event): void => {
    event.preventDefault();
    this.options.onLeave();
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
