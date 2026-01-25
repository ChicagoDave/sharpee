/**
 * DialogManager - handles modal dialogs (save, restore, startup)
 */

import type { DialogElements, SaveSlotMeta } from '../types';
import { AUTOSAVE_SLOT } from '../types';
import type { SaveManager } from './SaveManager';

export interface DialogManagerConfig {
  /** DOM element references for dialogs */
  elements: DialogElements;
  /** SaveManager reference for save operations */
  saveManager: SaveManager;
  /** Callback when dialog opens (to disable game input) */
  onDialogOpen?: () => void;
  /** Callback when dialog closes (to re-enable game input) */
  onDialogClose?: () => void;
  /** Generate suggested save name */
  generateSaveName: () => string;
  /** Sanitize save name */
  sanitizeSaveName: (name: string) => string;
  /** Perform save operation */
  performSave: (slotName: string) => void;
}

export class DialogManager {
  private elements: DialogElements;
  private saveManager: SaveManager;
  private onDialogOpen?: () => void;
  private onDialogClose?: () => void;
  private generateSaveName: () => string;
  private sanitizeSaveName: (name: string) => string;
  private performSave: (slotName: string) => void;

  // Dialog state
  private _isDialogOpen = false;
  private selectedSaveSlot: string | null = null;

  // Pending promise resolvers
  private pendingSaveResolve: ((saved: boolean) => void) | null = null;
  private pendingRestoreResolve: ((slotName: string | null) => void) | null = null;
  private pendingStartupResolve: ((shouldContinue: boolean) => void) | null = null;

  constructor(config: DialogManagerConfig) {
    this.elements = config.elements;
    this.saveManager = config.saveManager;
    this.onDialogOpen = config.onDialogOpen;
    this.onDialogClose = config.onDialogClose;
    this.generateSaveName = config.generateSaveName;
    this.sanitizeSaveName = config.sanitizeSaveName;
    this.performSave = config.performSave;
  }

  /**
   * Check if any dialog is currently open
   */
  isDialogOpen(): boolean {
    return this._isDialogOpen;
  }

  /**
   * Show the save dialog
   */
  showSaveDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('[save-dialog] Opening save dialog...');

      const { modalOverlay, saveDialog, saveNameInput, saveSlotsListEl } = this.elements;

      if (!modalOverlay || !saveDialog) {
        console.error('[save-dialog] Modal elements not found!');
        resolve(false);
        return;
      }

      this.pendingSaveResolve = resolve;
      this._isDialogOpen = true;
      this.selectedSaveSlot = null;
      this.onDialogOpen?.();

      // Populate save slots list
      this.populateSaveSlotsList(saveSlotsListEl, true);

      // Set suggested save name
      if (saveNameInput) {
        saveNameInput.value = this.generateSaveName();
        saveNameInput.select();
      }

      // Show dialog
      modalOverlay.classList.remove('modal-hidden');
      saveDialog.classList.remove('modal-hidden');

      // Focus name input
      saveNameInput?.focus();
    });
  }

  /**
   * Hide the save dialog
   */
  hideSaveDialog(saved: boolean): void {
    const { modalOverlay, saveDialog } = this.elements;

    modalOverlay?.classList.add('modal-hidden');
    saveDialog?.classList.add('modal-hidden');
    this._isDialogOpen = false;
    this.onDialogClose?.();

    if (this.pendingSaveResolve) {
      this.pendingSaveResolve(saved);
      this.pendingSaveResolve = null;
    }
  }

  /**
   * Show the restore dialog
   */
  showRestoreDialog(): Promise<string | null> {
    return new Promise((resolve) => {
      console.log('[restore-dialog] Opening restore dialog...');

      const { modalOverlay, restoreDialog, restoreSlotsListEl, noSavesMessage } = this.elements;

      if (!modalOverlay || !restoreDialog) {
        console.error('[restore-dialog] Modal elements not found!');
        resolve(null);
        return;
      }

      this.pendingRestoreResolve = resolve;
      this._isDialogOpen = true;
      this.selectedSaveSlot = null;
      this.onDialogOpen?.();

      // Get user saves (excluding autosave)
      const userSaves = this.saveManager.getUserSaves();
      console.log('[restore-dialog] Available saves:', userSaves);

      // Populate restore slots list
      this.populateSaveSlotsList(restoreSlotsListEl, false);

      // Show/hide no saves message
      if (noSavesMessage) {
        if (userSaves.length === 0) {
          noSavesMessage.classList.remove('modal-hidden');
          restoreSlotsListEl?.classList.add('modal-hidden');
        } else {
          noSavesMessage.classList.add('modal-hidden');
          restoreSlotsListEl?.classList.remove('modal-hidden');
        }
      }

      // Restore button disabled until a slot is selected
      const restoreBtn = document.getElementById('restore-confirm-btn') as HTMLButtonElement;
      if (restoreBtn) {
        restoreBtn.disabled = true;
      }

      // Show dialog
      modalOverlay.classList.remove('modal-hidden');
      restoreDialog.classList.remove('modal-hidden');

      // Focus first save slot or cancel button
      if (userSaves.length > 0) {
        const firstSlot = restoreSlotsListEl?.querySelector('.save-slot') as HTMLElement;
        firstSlot?.focus();
      }
    });
  }

  /**
   * Hide the restore dialog
   */
  hideRestoreDialog(slotName: string | null): void {
    const { modalOverlay, restoreDialog } = this.elements;

    modalOverlay?.classList.add('modal-hidden');
    restoreDialog?.classList.add('modal-hidden');
    this._isDialogOpen = false;
    this.onDialogClose?.();

    if (this.pendingRestoreResolve) {
      this.pendingRestoreResolve(slotName);
      this.pendingRestoreResolve = null;
    }
  }

  /**
   * Show the startup dialog (continue saved game or start new?)
   */
  showStartupDialog(meta: SaveSlotMeta): Promise<boolean> {
    return new Promise((resolve) => {
      const { modalOverlay, startupDialog, startupSaveInfo } = this.elements;

      if (!modalOverlay || !startupDialog) {
        // Fall back to starting new game if dialog not available
        resolve(false);
        return;
      }

      this.pendingStartupResolve = resolve;
      this._isDialogOpen = true;

      // Populate save info
      if (startupSaveInfo) {
        const date = new Date(meta.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        startupSaveInfo.textContent = `Found "${meta.name}" from ${dateStr} ${timeStr} (Turn ${meta.turnCount}, ${meta.location})`;
      }

      // Show dialog
      modalOverlay.classList.remove('modal-hidden');
      startupDialog.classList.remove('modal-hidden');

      // Focus continue button
      const continueBtn = document.getElementById('startup-continue-btn');
      continueBtn?.focus();
    });
  }

  /**
   * Hide the startup dialog
   */
  hideStartupDialog(shouldContinue: boolean): void {
    const { modalOverlay, startupDialog } = this.elements;

    modalOverlay?.classList.add('modal-hidden');
    startupDialog?.classList.add('modal-hidden');
    this._isDialogOpen = false;

    if (this.pendingStartupResolve) {
      this.pendingStartupResolve(shouldContinue);
      this.pendingStartupResolve = null;
    }
  }

  /**
   * Populate a save slots list element
   */
  private populateSaveSlotsList(listEl: HTMLElement | null, forSave: boolean): void {
    if (!listEl) return;

    // Get saves, filtering out autosave for restore dialog
    const allSaves = this.saveManager.getSaveIndex();
    const saves = forSave ? allSaves : allSaves.filter(s => s.name !== AUTOSAVE_SLOT);
    listEl.innerHTML = '';

    if (saves.length === 0 && forSave) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'no-saves-message';
      emptyMsg.textContent = 'No existing saves';
      listEl.appendChild(emptyMsg);
      return;
    }

    for (const save of saves) {
      const slot = document.createElement('div');
      slot.className = 'save-slot';
      slot.tabIndex = 0;
      slot.dataset.slotName = save.name;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'save-slot-name';
      nameSpan.textContent = save.name;

      const infoSpan = document.createElement('span');
      infoSpan.className = 'save-slot-info';
      const date = new Date(save.timestamp);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      infoSpan.textContent = `Turn ${save.turnCount} | ${save.location} | ${dateStr} ${timeStr}`;

      slot.appendChild(nameSpan);
      slot.appendChild(infoSpan);

      // Click handler
      slot.addEventListener('click', () => {
        this.selectSaveSlot(listEl, save.name, forSave);
      });

      // Double-click for quick restore
      if (!forSave) {
        slot.addEventListener('dblclick', () => {
          this.hideRestoreDialog(save.name);
        });
      }

      // Keyboard handler
      slot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectSaveSlot(listEl, save.name, forSave);
          if (!forSave) {
            // For restore, Enter on selected slot confirms
            if (this.selectedSaveSlot === save.name) {
              this.hideRestoreDialog(save.name);
            }
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = slot.nextElementSibling as HTMLElement;
          next?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = slot.previousElementSibling as HTMLElement;
          prev?.focus();
        }
      });

      listEl.appendChild(slot);
    }
  }

  /**
   * Select a save slot
   */
  private selectSaveSlot(listEl: HTMLElement, slotName: string, forSave: boolean): void {
    // Remove selection from all slots
    listEl.querySelectorAll('.save-slot').forEach(el => el.classList.remove('selected'));

    // Select clicked slot
    const slot = listEl.querySelector(`[data-slot-name="${slotName}"]`);
    slot?.classList.add('selected');

    this.selectedSaveSlot = slotName;

    // For save dialog, also update the name input
    if (forSave && this.elements.saveNameInput) {
      this.elements.saveNameInput.value = slotName;
    }

    // For restore dialog, enable the restore button
    if (!forSave) {
      const restoreBtn = document.getElementById('restore-confirm-btn') as HTMLButtonElement;
      if (restoreBtn) {
        restoreBtn.disabled = false;
      }
    }
  }

  /**
   * Set up modal dialog event handlers
   */
  setupHandlers(): void {
    const { saveNameInput, saveDialog, restoreDialog, startupDialog, modalOverlay } = this.elements;

    // Save dialog buttons
    const saveConfirmBtn = document.getElementById('save-confirm-btn');
    const saveCancelBtn = document.getElementById('save-cancel-btn');

    saveConfirmBtn?.addEventListener('click', () => {
      const name = this.sanitizeSaveName(saveNameInput?.value || this.generateSaveName());
      if (name) {
        this.performSave(name);
        this.hideSaveDialog(true);
      }
    });

    saveCancelBtn?.addEventListener('click', () => {
      this.hideSaveDialog(false);
    });

    // Restore dialog buttons
    const restoreConfirmBtn = document.getElementById('restore-confirm-btn');
    const restoreCancelBtn = document.getElementById('restore-cancel-btn');

    restoreConfirmBtn?.addEventListener('click', () => {
      if (this.selectedSaveSlot) {
        this.hideRestoreDialog(this.selectedSaveSlot);
      }
    });

    restoreCancelBtn?.addEventListener('click', () => {
      this.hideRestoreDialog(null);
    });

    // Startup dialog buttons
    const startupContinueBtn = document.getElementById('startup-continue-btn');
    const startupNewBtn = document.getElementById('startup-new-btn');

    startupContinueBtn?.addEventListener('click', () => {
      this.hideStartupDialog(true);
    });

    startupNewBtn?.addEventListener('click', () => {
      this.hideStartupDialog(false);
    });

    // Enter key in save name input
    saveNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const name = this.sanitizeSaveName(saveNameInput?.value || this.generateSaveName());
        if (name) {
          this.performSave(name);
          this.hideSaveDialog(true);
        }
      } else if (e.key === 'Escape') {
        this.hideSaveDialog(false);
      }
    });

    // Escape key closes dialogs
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isDialogOpen) {
        if (saveDialog && !saveDialog.classList.contains('modal-hidden')) {
          this.hideSaveDialog(false);
        } else if (restoreDialog && !restoreDialog.classList.contains('modal-hidden')) {
          this.hideRestoreDialog(null);
        } else if (startupDialog && !startupDialog.classList.contains('modal-hidden')) {
          this.hideStartupDialog(false);
        }
      }
    });

    // Click overlay to close
    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        if (saveDialog && !saveDialog.classList.contains('modal-hidden')) {
          this.hideSaveDialog(false);
        } else if (restoreDialog && !restoreDialog.classList.contains('modal-hidden')) {
          this.hideRestoreDialog(null);
        } else if (startupDialog && !startupDialog.classList.contains('modal-hidden')) {
          this.hideStartupDialog(false);
        }
      }
    });
  }
}
