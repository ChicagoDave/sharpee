/**
 * TextDisplay - handles text output to the main window
 */

import type { DisplayElements } from '../types';

export class TextDisplay {
  private textContent: HTMLElement | null;
  private mainWindow: HTMLElement | null;

  constructor(elements: DisplayElements) {
    this.textContent = elements.textContent;
    this.mainWindow = elements.mainWindow;
  }

  /**
   * Display text in the main window.
   * Double newlines create paragraph breaks, single newlines preserved with pre-line.
   */
  displayText(text: string): void {
    if (!this.textContent) return;

    // Split on double newlines to get paragraphs
    const paragraphs = text.split(/\n\n+/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed) {
        const p = document.createElement('p');
        // Use pre-line to preserve single newlines within paragraph
        p.style.whiteSpace = 'pre-line';
        p.textContent = trimmed;
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
