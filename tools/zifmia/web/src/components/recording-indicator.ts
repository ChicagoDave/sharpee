/**
 * Persistent recording indicator per ADR-177 §8.
 *
 * Mounted once in the root container; visible while inside a room
 * and rendered with the operator-configured notice. Hidden in the
 * lobby/identity views.
 */

export function mountRecordingIndicator(parent: HTMLElement): {
  show(notice: string): void;
  hide(): void;
} {
  let node: HTMLElement | null = null;

  function ensure(): HTMLElement {
    if (node) return node;
    node = document.createElement('div');
    node.className = 'sharpee-window-rec-indicator sharpee-window-rec-indicator-hidden';
    node.setAttribute('aria-live', 'polite');
    parent.appendChild(node);
    return node;
  }

  return {
    show(notice) {
      const el = ensure();
      el.textContent = `● REC — ${notice}`;
      el.title = notice;
      el.classList.remove('sharpee-window-rec-indicator-hidden');
    },
    hide() {
      if (node) node.classList.add('sharpee-window-rec-indicator-hidden');
    }
  };
}
