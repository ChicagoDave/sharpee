/**
 * @module zifmia/web/views/room
 * @purpose Page-level DOM for a single room — the 4-pane layout
 *   prescribed by ADR-170/176: presence (left), prose (center),
 *   chat (right), input (bottom). The view owns the static
 *   structure; the `RoomManager` populates it with channel content,
 *   transcript replay, and per-user updates.
 * @owner Zifmia web client.
 *
 * Per ADR-176 every region uses the canonical multi-user vocabulary:
 * `.sharpee-presence-panel`, `.sharpee-prose-pane`,
 * `.sharpee-chat-panel`, `.sharpee-input-bar`. Internal decoration
 * (`.sharpee-room-frame`, `.sharpee-room-status-*`, etc.) lives under
 * the view's owned namespace per the IdentityManager / LobbyManager
 * precedent — themes target the contract classes, not the decorations.
 */

export interface RoomViewSlots {
  /** Frame container — the outer `section.sharpee-window`. */
  readonly root: HTMLElement;
  /** Status strip — receives `status:*` channel renderers. */
  readonly status: HTMLElement;
  readonly statusLocation: HTMLElement;
  readonly statusScore: HTMLElement;
  readonly statusTurn: HTMLElement;
  /** Prose pane — main channel slot. */
  readonly main: HTMLElement;
  /** Sidebar — unused by `RoomManager` (presence/chat are explicit
   * panels) but required by `registerDefaultBrowserRenderers`. */
  readonly sidebar: HTMLElement;
  /** Input row — `.sharpee-input-bar`. The `CommandInputManager`
   * builds its `<input>` inside this container. */
  readonly inputContainer: HTMLElement;
  /** Hidden field used to satisfy the platform-browser layout shape
   * during channel-renderer wiring. The real, user-facing input is
   * owned by `CommandInputManager`. */
  readonly input: HTMLInputElement;
  /** Empty span — the platform `prompt` channel writes the `> `
   * prefix here. We render our own prompt inside the input bar; the
   * channel-driven one is left orphaned but harmless. */
  readonly inputPromptLabel: HTMLElement;
  /** Media region (image/animation channels). Hidden by default for
   * text-first rooms. */
  readonly media: HTMLElement;
  /** Notification region (death/endgame/score_notify channels). */
  readonly notify: HTMLElement;
  /** Meta region (info/ifid channels). Always hidden. */
  readonly meta: HTMLElement;
  /** Presence panel — `PresenceManager` populates this in Phase 6d. */
  readonly presencePanel: HTMLElement;
  /** Chat panel — `ChatManager` populates this in Phase 6d. */
  readonly chatPanel: HTMLElement;
  /** Saves panel — `SavesManager` populates this in Phase 6f. */
  readonly savesPanel: HTMLElement;
  /** Lock banner element — `LockManager` toggles `--hidden` in 6e. */
  readonly lockBanner: HTMLElement;
}

export interface RoomViewOptions {
  /** Mount target — the view appends its frame here. */
  root: HTMLElement;
  /** Room id rendered in the title bar. */
  roomId: string;
  /** Optional title displayed in the title bar. */
  title?: string;
}

/**
 * RoomView — builds and exposes the room page's layout.
 *
 * Public surface:
 * - `mount()` — build the DOM. Returns the slot table.
 * - `unmount()` — remove the DOM.
 */
export class RoomView {
  private readonly options: RoomViewOptions;
  private container: HTMLElement | null = null;
  private slots: RoomViewSlots | null = null;

  constructor(options: RoomViewOptions) {
    this.options = options;
  }

  mount(): RoomViewSlots {
    if (this.slots) return this.slots;
    const doc = this.options.root.ownerDocument;
    const root = doc.createElement('section');
    root.className = 'sharpee-window';
    root.setAttribute('data-role', 'room-view');
    root.setAttribute('data-room-id', this.options.roomId);

    const titleBar = doc.createElement('div');
    titleBar.className = 'sharpee-window-title-bar';
    const title = doc.createElement('span');
    title.className = 'sharpee-window-title';
    title.textContent = this.options.title ?? `Room ${this.options.roomId}`;
    titleBar.appendChild(title);
    root.appendChild(titleBar);

    // Status strip (location / score / turn).
    const status = doc.createElement('div');
    status.className = 'sharpee-status-bar';
    const statusLocation = doc.createElement('span');
    statusLocation.className = 'sharpee-status-bar-location';
    const statusScore = doc.createElement('span');
    statusScore.className = 'sharpee-status-bar-score';
    const statusTurn = doc.createElement('span');
    statusTurn.className = 'sharpee-status-bar-turn';
    status.append(statusLocation, statusScore, statusTurn);
    root.appendChild(status);

    // Main frame: presence | prose | chat.
    const frame = doc.createElement('div');
    frame.className = 'sharpee-room-frame';

    const presencePanel = doc.createElement('aside');
    presencePanel.className = 'sharpee-presence-panel';
    presencePanel.setAttribute('data-role', 'presence-panel');

    const main = doc.createElement('div');
    main.className = 'sharpee-prose-pane';
    main.setAttribute('role', 'log');

    const chatPanel = doc.createElement('aside');
    chatPanel.className = 'sharpee-chat-panel';
    chatPanel.setAttribute('data-role', 'chat-panel');

    frame.append(presencePanel, main, chatPanel);
    root.appendChild(frame);

    // Saves panel — placed below the main frame. `SavesManager` mounts
    // its list + create button inside; it's visually optional so themes
    // can move or hide it without affecting the room layout.
    const savesPanel = doc.createElement('section');
    savesPanel.className = 'sharpee-saves-panel';
    savesPanel.setAttribute('data-role', 'saves-panel');
    root.appendChild(savesPanel);

    // Hidden sidebar — satisfies the platform layout shape without
    // colliding with the multi-user presence/chat panels above.
    const sidebar = doc.createElement('aside');
    sidebar.className = 'sharpee-room-hidden-sidebar';
    sidebar.hidden = true;
    root.appendChild(sidebar);

    // Lock banner — `--hidden` by default per ADR-170/176.
    const lockBanner = doc.createElement('div');
    lockBanner.className = 'sharpee-lock-banner sharpee-lock-banner--hidden';
    lockBanner.setAttribute('data-role', 'lock-banner');
    root.appendChild(lockBanner);

    // Input container — the `CommandInputManager` mounts its bar
    // inside this on RoomManager.enter(). The `inputPromptLabel`
    // + `input` are placeholders for the channel-renderer wiring;
    // the user types into the manager's input, not these.
    const inputContainer = doc.createElement('div');
    inputContainer.className = 'sharpee-room-input';
    const inputPromptLabel = doc.createElement('span');
    inputPromptLabel.className = 'sharpee-room-input-prompt-stub';
    inputPromptLabel.hidden = true;
    const input = doc.createElement('input');
    input.type = 'text';
    input.className = 'sharpee-room-input-stub';
    input.hidden = true;
    inputContainer.append(inputPromptLabel, input);
    root.appendChild(inputContainer);

    // Hidden regions for channels we don't surface in 6c.
    const media = doc.createElement('div');
    media.className = 'sharpee-room-media';
    media.hidden = true;
    root.appendChild(media);

    const notify = doc.createElement('div');
    notify.className = 'sharpee-room-notify';
    notify.hidden = true;
    root.appendChild(notify);

    const meta = doc.createElement('div');
    meta.className = 'sharpee-room-meta';
    meta.hidden = true;
    root.appendChild(meta);

    this.options.root.appendChild(root);
    this.container = root;
    this.slots = {
      root,
      status,
      statusLocation,
      statusScore,
      statusTurn,
      main,
      sidebar,
      inputContainer,
      input,
      inputPromptLabel,
      media,
      notify,
      meta,
      presencePanel,
      chatPanel,
      savesPanel,
      lockBanner
    };
    return this.slots;
  }

  unmount(): void {
    if (!this.container) return;
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.slots = null;
  }

  /** Returns the slot table if mounted; null otherwise. */
  getSlots(): RoomViewSlots | null {
    return this.slots;
  }
}
