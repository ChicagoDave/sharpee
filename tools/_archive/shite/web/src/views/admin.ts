/**
 * @module zifmia/web/views/admin
 * @purpose Page-level admin dashboard shell. Builds the
 *   `.sharpee-window` frame + `.sharpee-menu-bar` tab nav and exposes
 *   a content slot the `AdminManager` populates with the active tab.
 * @owner Zifmia web client.
 *
 * ADR-170 vocabulary: window + title-bar + menu-bar. Decoration
 * classes (`.sharpee-admin-content`, `.sharpee-admin-error`) live in
 * the view's owned namespace per the IdentityManager / LobbyManager
 * precedent.
 */

export type AdminTabId = 'stories' | 'rooms' | 'identities' | 'audit';

export const ADMIN_TABS: Array<{ id: AdminTabId; label: string }> = [
  { id: 'stories', label: 'Stories' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'identities', label: 'Identities' },
  { id: 'audit', label: 'Audit' }
];

export interface AdminViewSlots {
  readonly root: HTMLElement;
  readonly menuBar: HTMLElement;
  /** Where the active tab's manager mounts its DOM. */
  readonly content: HTMLElement;
  /** Persistent error pip slot (auth failures, network errors). */
  readonly errorElement: HTMLElement;
}

export interface AdminViewOptions {
  root: HTMLElement;
  onTabChange: (id: AdminTabId) => void;
  onLeave: () => void;
}

export class AdminView {
  private readonly options: AdminViewOptions;
  private container: HTMLElement | null = null;
  private slots: AdminViewSlots | null = null;
  private currentTab: AdminTabId = 'stories';

  constructor(options: AdminViewOptions) {
    this.options = options;
  }

  mount(): AdminViewSlots {
    if (this.slots) return this.slots;
    const doc = this.options.root.ownerDocument;
    const root = doc.createElement('section');
    root.className = 'sharpee-window';
    root.setAttribute('data-role', 'admin-view');

    const titleBar = doc.createElement('div');
    titleBar.className = 'sharpee-window-title-bar';
    const title = doc.createElement('span');
    title.className = 'sharpee-window-title';
    title.textContent = 'Zifmia admin';
    const controls = doc.createElement('div');
    controls.className = 'sharpee-window-title-bar-controls';
    const leaveBtn = doc.createElement('button');
    leaveBtn.type = 'button';
    leaveBtn.setAttribute('data-role', 'admin-leave');
    leaveBtn.textContent = 'Back to lobby';
    leaveBtn.addEventListener('click', () => this.options.onLeave());
    controls.appendChild(leaveBtn);
    titleBar.append(title, controls);
    root.appendChild(titleBar);

    const menuBar = doc.createElement('div');
    menuBar.className = 'sharpee-menu-bar';
    for (const tab of ADMIN_TABS) {
      const item = doc.createElement('button');
      item.type = 'button';
      item.className = 'sharpee-menu-bar-item';
      item.setAttribute('data-tab', tab.id);
      item.textContent = tab.label;
      item.addEventListener('click', () => this.selectTab(tab.id));
      menuBar.appendChild(item);
    }
    root.appendChild(menuBar);

    const errorElement = doc.createElement('p');
    errorElement.className = 'sharpee-admin-error';
    errorElement.setAttribute('data-role', 'admin-error');
    errorElement.hidden = true;
    root.appendChild(errorElement);

    const content = doc.createElement('section');
    content.className = 'sharpee-admin-content';
    content.setAttribute('data-role', 'admin-content');
    root.appendChild(content);

    this.options.root.appendChild(root);
    this.container = root;
    this.slots = { root, menuBar, content, errorElement };
    this.applyActiveTab();
    return this.slots;
  }

  selectTab(id: AdminTabId): void {
    if (this.currentTab === id) return;
    this.currentTab = id;
    this.applyActiveTab();
    this.options.onTabChange(id);
  }

  /** Returns the currently active tab id. */
  getActiveTab(): AdminTabId {
    return this.currentTab;
  }

  unmount(): void {
    if (!this.container) return;
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.slots = null;
  }

  private applyActiveTab(): void {
    const menu = this.slots?.menuBar;
    if (!menu) return;
    for (const item of menu.querySelectorAll<HTMLElement>('[data-tab]')) {
      const isActive = item.getAttribute('data-tab') === this.currentTab;
      item.classList.toggle('sharpee-menu-bar-item--open', isActive);
    }
  }
}
