/**
 * TextDisplay - handles text output to the main window
 */

import type { DisplayElements } from '../types.js';

export class TextDisplay {
  private textContent: HTMLElement | null;
  private mainWindow: HTMLElement | null;

  constructor(elements: DisplayElements) {
    this.textContent = elements.textContent;
    this.mainWindow = elements.mainWindow;
  }

  /**
   * Display text in the main window.
   *
   * `\n\n+` separates paragraphs (each gets a normal `<p>`); single
   * `\n` within a paragraph creates continuation lines, each rendered
   * as a `<p class="main-entry main-entry--tight">` so the inter-line
   * margin collapses to match the legacy `pre-line` visual. This is
   * the platform-browser counterpart of `engine`'s `createBlocks`.
   */
  displayText(text: string): void {
    if (!this.textContent) return;

    const trimmed = text.trim();
    if (!trimmed) {
      this.scrollToBottom();
      return;
    }

    const paragraphs = trimmed.split(/\n\n+/).filter((p) => p.length > 0);
    for (const para of paragraphs) {
      const lines = para.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const p = document.createElement('p');
        p.classList.add('main-entry');
        if (i > 0) p.classList.add('main-entry--tight');
        p.textContent = lines[i];
        this.textContent.appendChild(p);
      }
    }

    this.scrollToBottom();
  }

  /**
   * Display command echo (user input)
   */
  displayCommand(command: string): void {
    if (!this.textContent) return;

    const div = document.createElement('div');
    div.className = 'command-echo';
    div.textContent = `> ${command}`;
    this.textContent.appendChild(div);

    this.scrollToBottom();
  }

  /**
   * Clear the screen
   */
  clearScreen(): void {
    if (this.textContent) {
      this.textContent.innerHTML = '';
    }
  }

  /**
   * Scroll main window to bottom
   */
  scrollToBottom(): void {
    if (this.mainWindow) {
      this.mainWindow.scrollTop = this.mainWindow.scrollHeight;
    }
  }

  /**
   * Get the current transcript HTML (for save)
   */
  getHTML(): string {
    return this.textContent?.innerHTML || '';
  }

  /**
   * Set the transcript HTML (for restore)
   */
  setHTML(html: string): void {
    if (this.textContent) {
      this.textContent.innerHTML = html;
      this.scrollToBottom();
    }
  }
}
