/**
 * ActionSidebarManager - Renders context-driven action buttons (ADR-136)
 *
 * Receives ContextAction[] from the engine each turn and renders them
 * as clickable buttons grouped by category. Clicking a button submits
 * the action's command text as player input.
 *
 * In editor mode, each action gains suppress/label controls and the
 * author can export editorial decisions as actions.yaml content.
 *
 * @public ActionSidebarManager, ActionSidebarConfig
 * @context platform-browser
 */

import type { ContextAction, ContextActionCategory } from '@sharpee/if-domain';

/** Category display labels. */
const CATEGORY_LABELS: Record<ContextActionCategory, string> = {
  movement: 'Movement',
  interaction: 'Actions',
  inventory: 'Inventory',
  communication: 'Talk',
  combat: 'Combat',
  meta: 'Other',
  story: 'Story',
};

const ALL_CATEGORIES: ContextActionCategory[] = [
  'movement', 'interaction', 'inventory', 'communication',
  'combat', 'meta', 'story',
];

/** Tracks an author's pick for a single action. */
interface ActionPick {
  included: boolean;
  label?: string;
  category?: ContextActionCategory;
  priority?: number;
}

/**
 * Configuration for ActionSidebarManager.
 */
export interface ActionSidebarConfig {
  /** The sidebar container element. */
  sidebarEl: HTMLElement | null;
  /** Callback to execute a command when an action button is clicked. */
  onCommand: (command: string) => Promise<void>;
}

/**
 * Manages the action sidebar panel in the browser client.
 */
export class ActionSidebarManager {
  private sidebarEl: HTMLElement | null;
  private onCommand: (command: string) => Promise<void>;
  private visible = true;
  private editing = false;
  private lastMenu: ContextAction[] = [];
  private lastPalette: ContextAction[] = [];

  /** Author picks keyed by `actionId::targetId`. */
  private picks = new Map<string, ActionPick>();

  constructor(config: ActionSidebarConfig) {
    this.sidebarEl = config.sidebarEl;
    this.onCommand = config.onCommand;
  }

  /**
   * Update with the player-facing menu (baseline + author hints).
   */
  updateMenu(actions: ContextAction[]): void {
    this.lastMenu = actions;
    if (!this.editing) this.renderCurrent();
  }

  /**
   * Update with the full grammar palette (for editor mode).
   */
  updatePalette(actions: ContextAction[]): void {
    this.lastPalette = actions;
    // Show sidebar on first palette update
    if (actions.length > 0 && this.sidebarEl) {
      this.sidebarEl.classList.remove('sidebar-hidden');
      this.sidebarEl.classList.remove('sidebar-empty');
    }
    if (this.editing) this.renderCurrent();
  }

  private renderCurrent(): void {
    if (!this.sidebarEl) return;
    this.render(this.editing ? this.lastPalette : this.lastMenu);
  }

  /** Toggle sidebar visibility. */
  toggle(): void {
    if (!this.sidebarEl) return;
    this.visible = !this.visible;
    this.sidebarEl.classList.toggle('sidebar-hidden', !this.visible);
  }

  /** Show the sidebar. */
  show(): void {
    if (!this.sidebarEl) return;
    this.visible = true;
    this.sidebarEl.classList.remove('sidebar-hidden');
  }

  /** Hide the sidebar. */
  hide(): void {
    if (!this.sidebarEl) return;
    this.visible = false;
    this.sidebarEl.classList.add('sidebar-hidden');
  }

  // ─── Rendering ──────────────────────────────────────────────

  private render(actions: ContextAction[]): void {
    if (!this.sidebarEl) return;
    this.sidebarEl.innerHTML = '';

    if (actions.length === 0) {
      this.sidebarEl.classList.add('sidebar-empty');
      return;
    }
    this.sidebarEl.classList.remove('sidebar-empty');

    // Toolbar
    this.sidebarEl.appendChild(this.renderToolbar());

    // Group by category
    const groups = new Map<ContextActionCategory, ContextAction[]>();
    for (const action of actions) {
      const list = groups.get(action.category) || [];
      list.push(action);
      groups.set(action.category, list);
    }

    // Render each category group
    for (const [category, categoryActions] of groups) {
      this.sidebarEl.appendChild(this.renderGroup(category, categoryActions));
    }
  }

  private renderToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'sidebar-toolbar';

    const editBtn = document.createElement('button');
    editBtn.className = `sidebar-tool-btn${this.editing ? ' active' : ''}`;
    editBtn.textContent = this.editing ? 'Done' : 'Edit';
    editBtn.title = 'Toggle editor mode';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editing = !this.editing;
      this.renderCurrent();
    });
    toolbar.appendChild(editBtn);

    if (this.editing) {
      const exportBtn = document.createElement('button');
      exportBtn.className = 'sidebar-tool-btn';
      exportBtn.textContent = 'Export';
      exportBtn.title = 'Copy actions.yaml to clipboard';
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exportYaml();
      });
      toolbar.appendChild(exportBtn);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'sidebar-tool-btn';
      clearBtn.textContent = 'Clear';
      clearBtn.title = 'Clear all picks';
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.picks.clear();
        this.renderCurrent();
      });
      toolbar.appendChild(clearBtn);

      const countEl = document.createElement('span');
      countEl.className = 'sidebar-pick-count';
      const pickCount = [...this.picks.values()].filter(p => p.included).length;
      if (pickCount > 0) countEl.textContent = `${pickCount}`;
      toolbar.appendChild(countEl);
    }

    return toolbar;
  }

  private renderGroup(
    category: ContextActionCategory,
    actions: ContextAction[],
  ): HTMLElement {
    const groupEl = document.createElement('div');
    groupEl.className = 'action-group';

    const headerEl = document.createElement('div');
    headerEl.className = 'action-group-header';
    headerEl.textContent = CATEGORY_LABELS[category] || category;
    groupEl.appendChild(headerEl);

    for (const action of actions) {
      groupEl.appendChild(this.renderAction(action));
    }

    return groupEl;
  }

  private renderAction(action: ContextAction): HTMLElement {
    const key = this.actionKey(action);
    const pick = this.picks.get(key);

    if (this.editing) {
      return this.renderEditableAction(action, key, pick);
    }

    // Play mode: clickable button
    const buttonEl = document.createElement('button');
    buttonEl.className = 'action-button';

    const label = pick?.label || action.label ||
      `${action.verb}${action.targetName ? ' ' + action.targetName : ''}`;
    buttonEl.textContent = label;
    buttonEl.title = action.command;

    if (!action.auto) buttonEl.classList.add('action-author');
    if (action.scope === 'carried') buttonEl.classList.add('action-carried');

    buttonEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onCommand(action.command);
    });

    return buttonEl;
  }

  private renderEditableAction(
    action: ContextAction,
    key: string,
    pick: ActionPick | undefined,
  ): HTMLElement {
    const isIncluded = pick?.included === true;

    const row = document.createElement('div');
    row.className = `action-edit-row${isIncluded ? ' action-included' : ''}`;

    // Include toggle (checkbox-style)
    const addBtn = document.createElement('button');
    addBtn.className = `action-add-btn${isIncluded ? ' active' : ''}`;
    addBtn.textContent = isIncluded ? '\u2713' : '+';
    addBtn.title = isIncluded ? 'Remove from menu' : 'Add to menu';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = this.picks.get(key) || { included: false };
      current.included = !current.included;
      if (!current.included && !current.label && !current.category && !current.priority) {
        this.picks.delete(key);
      } else {
        this.picks.set(key, current);
      }
      this.renderCurrent();
    });
    row.appendChild(addBtn);

    // Label (click to edit when included)
    const label = pick?.label || action.label ||
      `${action.verb}${action.targetName ? ' ' + action.targetName : ''}`;
    const labelEl = document.createElement('span');
    labelEl.className = 'action-edit-label';
    labelEl.textContent = label;
    labelEl.title = action.command;

    if (isIncluded) {
      labelEl.title += ' (click to set custom label)';
      labelEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const newLabel = prompt('Custom label (empty to reset):', pick?.label || '');
        if (newLabel === null) return;
        const current = this.picks.get(key) || { included: true };
        if (newLabel.trim()) {
          current.label = newLabel.trim();
        } else {
          delete current.label;
        }
        this.picks.set(key, current);
        this.renderCurrent();
      });
    }
    row.appendChild(labelEl);

    return row;
  }

  // ─── Edit Tracking ────────────────────────────────────────────

  private actionKey(action: ContextAction): string {
    return `${action.actionId}::${action.targetId || action.command}`;
  }

  // ─── YAML Export ──────────────────────────────────────────────

  private exportYaml(): void {
    const lines: string[] = [
      '# actions.yaml - Generated by Action Editor (ADR-136)',
      '# Only checked actions appear in the player menu.',
      '',
      'defaults:',
      '  maxActions: 40',
      '  maxPerEntity: 8',
      '',
    ];

    // Collect picked actions, grouped by target entity
    const byEntity = new Map<string, Array<{
      command: string; actionId: string; label?: string;
      category?: string; priority?: number;
    }>>();

    for (const action of this.lastPalette) {
      const key = this.actionKey(action);
      const pick = this.picks.get(key);
      if (!pick?.included) continue;

      const entityKey = action.targetName || action.targetId || '_global';
      if (!byEntity.has(entityKey)) byEntity.set(entityKey, []);
      byEntity.get(entityKey)!.push({
        command: action.command,
        actionId: action.actionId,
        label: pick.label,
        category: pick.category,
        priority: pick.priority,
      });
    }

    if (byEntity.size === 0) {
      lines.push('entities: {}');
      lines.push('');
      lines.push('# No actions selected. Use the editor to check actions you want in the menu.');
    } else {
      lines.push('entities:');
      for (const [entityKey, hints] of byEntity) {
        lines.push(`  ${entityKey}:`);
        lines.push('    hints:');
        for (const h of hints) {
          lines.push(`      - command: "${h.command}"`);
          lines.push(`        actionId: ${h.actionId}`);
          if (h.label) lines.push(`        label: "${h.label}"`);
          if (h.category) lines.push(`        category: ${h.category}`);
          if (h.priority) lines.push(`        priority: ${h.priority}`);
        }
      }
    }

    const yamlText = lines.join('\n') + '\n';

    // Copy to clipboard
    navigator.clipboard.writeText(yamlText).then(() => {
      this.showToast('actions.yaml copied to clipboard');
    }).catch(() => {
      // Fallback: show in a prompt for manual copy
      prompt('Copy this YAML:', yamlText);
    });
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'sidebar-toast';
    toast.textContent = message;
    this.sidebarEl?.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
}
