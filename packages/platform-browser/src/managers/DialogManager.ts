/**
 * DialogManager - handles modal dialogs (save, restore, startup).
 *
 * Per ADR-170, dialogs are native HTML <dialog> elements. Visibility
 * is controlled by `showModal()` / `close()`; ESC and backdrop-click
 * are handled by the browser. The manager attaches a `close` event
 * listener on each dialog so that any close (button, ESC, backdrop)
 * resolves the pending promise consistently. Buttons set the dialog's
 * `returnValue` before closing to communicate intent.
 */

import type { DialogElements, SaveSlotMeta } from '../types.js';
import { AUTOSAVE_SLOT } from '../types.js';
import type { SaveManager } from './SaveManager.js';

const RESULT_CONFIRM = 'confirm';
const RESULT_CANCEL = 'cancel';

export interface DialogManagerConfig {
  elements: DialogElements;
  saveManager: SaveManager;
  onDialogOpen?: () => void;
  onDialogClose?: () => void;
  generateSaveName: () => string;
  sanitizeSaveName: (name: string) => string;
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

  private _isDialogOpen = false;
  private selectedSaveSlot: string | null = null;

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

  isDialogOpen(): boolean {
    return this._isDialogOpen;
  }

  showSaveDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      const { saveDialog, saveNameInput, saveSlotsListEl } = this.elements;
      if (!saveDialog) {
        console.error('[save-dialog] saveDialog element not found');
        resolve(false);
        return;
      }

      this.pendingSaveResolve = resolve;
      this._isDialogOpen = true;
      this.selectedSaveSlot = null;
      this.onDialogOpen?.();

      this.populateSaveSlotsList(saveSlotsListEl, true);

      if (saveNameInput) {
        saveNameInput.value = this.generateSaveName();
        saveNameInput.select();
      }

      saveDialog.returnValue = '';
      saveDialog.showModal();
      saveNameInput?.focus();
    });
  }

  showRestoreDialog(): Promise<string | null> {
    return new Promise((resolve) => {
      const { restoreDialog, restoreSlotsListEl, noSavesMessage } = this.elements;
      if (!restoreDialog) {
        console.error('[restore-dialog] restoreDialog element not found');
        resolve(null);
        return;
      }

      this.pendingRestoreResolve = resolve;
      this._isDialogOpen = true;
      this.selectedSaveSlot = null;
      this.onDialogOpen?.();

      const userSaves = this.saveManager.getUserSaves();
      this.populateSaveSlotsList(restoreSlotsListEl, false);

      if (noSavesMessage && restoreSlotsListEl) {
        const empty = userSaves.length === 0;
        noSavesMessage.hidden = !empty;
        restoreSlotsListEl.hidden = empty;
      }

      const restoreBtn = document.getElementById('restore-confirm-btn') as HTMLButtonElement | null;
      if (restoreBtn) restoreBtn.disabled = true;

      restoreDialog.returnValue = '';
      restoreDialog.showModal();

      if (userSaves.length > 0) {
        const firstSlot = restoreSlotsListEl?.querySelector('.save-slot') as HTMLElement | null;
        firstSlot?.focus();
      }
    });
  }

  showStartupDialog(meta: SaveSlotMeta): Promise<boolean> {
    return new Promise((resolve) => {
      const { startupDialog, startupSaveInfo } = this.elements;
      if (!startupDialog) {
        resolve(false);
        return;
      }

      this.pendingStartupResolve = resolve;
      this._isDialogOpen = true;

      if (startupSaveInfo) {
        const date = new Date(meta.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        startupSaveInfo.textContent = `Found "${meta.name}" from ${dateStr} ${timeStr} (Turn ${meta.turnCount}, ${meta.location})`;
      }

      startupDialog.returnValue = '';
      startupDialog.showModal();

      const continueBtn = document.getElementById('startup-continue-btn');
      continueBtn?.focus();
    });
  }

  /**
   * Build a save-slot row element with click and keyboard wiring.
   */
  private populateSaveSlotsList(listEl: HTMLElement | null, forSave: boolean): void {
    if (!listEl) return;

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

      slot.addEventListener('click', () => {
        this.selectSaveSlot(listEl, save.name, forSave);
      });

      if (!forSave) {
        slot.addEventListener('dblclick', () => {
          this.elements.restoreDialog?.close(RESULT_CONFIRM);
        });
      }

      slot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectSaveSlot(listEl, save.name, forSave);
          if (!forSave && this.selectedSaveSlot === save.name) {
            this.elements.restoreDialog?.close(RESULT_CONFIRM);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          (slot.nextElementSibling as HTMLElement | null)?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          (slot.previousElementSibling as HTMLElement | null)?.focus();
        }
      });

      listEl.appendChild(slot);
    }
  }

  private selectSaveSlot(listEl: HTMLElement, slotName: string, forSave: boolean): void {
    listEl.querySelectorAll('.save-slot').forEach(el => el.classList.remove('selected'));
    listEl.querySelector(`[data-slot-name="${slotName}"]`)?.classList.add('selected');

    this.selectedSaveSlot = slotName;

    if (forSave && this.elements.saveNameInput) {
      this.elements.saveNameInput.value = slotName;
    }

    if (!forSave) {
      const restoreBtn = document.getElementById('restore-confirm-btn') as HTMLButtonElement | null;
      if (restoreBtn) restoreBtn.disabled = false;
    }
  }

  setupHandlers(): void {
    const { saveNameInput, saveDialog, restoreDialog, startupDialog } = this.elements;

    // ----- Save dialog -----
    document.getElementById('save-confirm-btn')?.addEventListener('click', () => {
      const name = this.sanitizeSaveName(saveNameInput?.value || this.generateSaveName());
      if (name) {
        this.performSave(name);
        saveDialog?.close(RESULT_CONFIRM);
      }
    });

    document.getElementById('save-cancel-btn')?.addEventListener('click', () => {
      saveDialog?.close(RESULT_CANCEL);
    });

    saveNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const name = this.sanitizeSaveName(saveNameInput.value || this.generateSaveName());
        if (name) {
          this.performSave(name);
          saveDialog?.close(RESULT_CONFIRM);
        }
      }
    });

    saveDialog?.addEventListener('click', (e) => {
      if (e.target === saveDialog) saveDialog.close(RESULT_CANCEL);
    });

    saveDialog?.addEventListener('close', () => {
      const saved = saveDialog.returnValue === RESULT_CONFIRM;
      this._isDialogOpen = false;
      this.onDialogClose?.();
      if (this.pendingSaveResolve) {
        this.pendingSaveResolve(saved);
        this.pendingSaveResolve = null;
      }
    });

    // ----- Restore dialog -----
    document.getElementById('restore-confirm-btn')?.addEventListener('click', () => {
      if (this.selectedSaveSlot) restoreDialog?.close(RESULT_CONFIRM);
    });

    document.getElementById('restore-cancel-btn')?.addEventListener('click', () => {
      restoreDialog?.close(RESULT_CANCEL);
    });

    restoreDialog?.addEventListener('click', (e) => {
      if (e.target === restoreDialog) restoreDialog.close(RESULT_CANCEL);
    });

    restoreDialog?.addEventListener('close', () => {
      const slotName = restoreDialog.returnValue === RESULT_CONFIRM ? this.selectedSaveSlot : null;
      this._isDialogOpen = false;
      this.onDialogClose?.();
      if (this.pendingRestoreResolve) {
        this.pendingRestoreResolve(slotName);
        this.pendingRestoreResolve = null;
      }
    });

    // ----- Startup dialog -----
    document.getElementById('startup-continue-btn')?.addEventListener('click', () => {
      startupDialog?.close(RESULT_CONFIRM);
    });

    document.getElementById('startup-new-btn')?.addEventListener('click', () => {
      startupDialog?.close(RESULT_CANCEL);
    });

    startupDialog?.addEventListener('click', (e) => {
      if (e.target === startupDialog) startupDialog.close(RESULT_CANCEL);
    });

    startupDialog?.addEventListener('close', () => {
      const shouldContinue = startupDialog.returnValue === RESULT_CONFIRM;
      this._isDialogOpen = false;
      // Startup dialog doesn't toggle input enable/disable — game hasn't started yet.
      if (this.pendingStartupResolve) {
        this.pendingStartupResolve(shouldContinue);
        this.pendingStartupResolve = null;
      }
    });
  }
}
