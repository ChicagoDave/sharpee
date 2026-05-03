/**
 * @sharpee/platform-browser/channels/layout — default layout helper.
 *
 * Owner context: browser default. Constructs the platform-default DOM
 * scaffold per ADR-165 §7's slot table:
 *
 *   | Slot       | Channels rendered into it                    |
 *   | status     | location, score, turn                        |
 *   | main       | main (prose)                                 |
 *   | sidebar    | (multi-user — chat, presence)                |
 *   | input      | prompt + user input field                    |
 *   | media      | image:*, animation, transition               |
 *   | notify     | death, endgame, score_notify (toasts)        |
 *   | meta       | info, ifid (typically hidden)                |
 *
 * The helper either constructs the DOM fresh inside a host root, or
 * adopts existing elements when the host page already provides them
 * (the `BrowserClient` integration path used by the Sharpee web
 * client). Stories that replace the layout entirely skip this helper
 * and call `Renderer.registerSlot(name, handle)` directly.
 *
 * Returns a `BrowserDefaultLayout` handle the caller passes to
 * `registerDefaultBrowserRenderers`.
 */

export interface BrowserDefaultLayout {
  /** Root container — typically the page body or a dedicated mount point. */
  readonly root: HTMLElement;
  readonly status: HTMLElement;
  readonly statusLocation: HTMLElement;
  readonly statusScore: HTMLElement;
  readonly statusTurn: HTMLElement;
  readonly main: HTMLElement;
  readonly sidebar: HTMLElement;
  readonly input: HTMLInputElement;
  readonly inputPromptLabel: HTMLElement;
  readonly media: HTMLElement;
  readonly notify: HTMLElement;
  readonly meta: HTMLElement;
}

export interface MountDefaultLayoutOptions {
  /**
   * Optional document for testing (defaults to the host's
   * `globalThis.document`).
   */
  doc?: Document;
}

/**
 * Mount the platform-default layout under `root`. Constructs the
 * slot DOM if not already present. Idempotent — calling twice on
 * the same root reuses existing slots rather than creating duplicates.
 */
export function mountDefaultLayout(
  root: HTMLElement,
  opts: MountDefaultLayoutOptions = {},
): BrowserDefaultLayout {
  const doc = opts.doc ?? root.ownerDocument;

  const status = ensureChild(doc, root, 'div', 'sharpee-status', { role: 'status' });
  const statusLocation = ensureChild(doc, status, 'span', 'sharpee-status-location');
  const statusScore = ensureChild(doc, status, 'span', 'sharpee-status-score');
  const statusTurn = ensureChild(doc, status, 'span', 'sharpee-status-turn');

  const media = ensureChild(doc, root, 'div', 'sharpee-media');
  // Position media so layered images stack via z-index.
  if (!media.style.position) media.style.position = 'relative';

  const main = ensureChild(doc, root, 'div', 'sharpee-main', { role: 'log' });
  const sidebar = ensureChild(doc, root, 'aside', 'sharpee-sidebar');

  const inputContainer = ensureChild(doc, root, 'div', 'sharpee-input');
  const inputPromptLabel = ensureChild(doc, inputContainer, 'span', 'sharpee-input-prompt');
  // Ensure the prompt label has at least the default '> ' before the
  // first prompt-channel emission lands.
  if (!inputPromptLabel.textContent) inputPromptLabel.textContent = '> ';

  let input = doc.getElementById('sharpee-input-field') as HTMLInputElement | null;
  if (!input) {
    input = doc.createElement('input');
    input.id = 'sharpee-input-field';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    inputContainer.appendChild(input);
  }

  const notify = ensureChild(doc, root, 'div', 'sharpee-notify', {
    'aria-live': 'polite',
  });
  const meta = ensureChild(doc, root, 'div', 'sharpee-meta', { hidden: '' });

  return {
    root,
    status,
    statusLocation,
    statusScore,
    statusTurn,
    main,
    sidebar,
    input,
    inputPromptLabel,
    media,
    notify,
    meta,
  };
}

function ensureChild(
  doc: Document,
  parent: HTMLElement,
  tag: string,
  id: string,
  attrs: Record<string, string> = {},
): HTMLElement {
  let el = doc.getElementById(id);
  if (!el) {
    el = doc.createElement(tag);
    el.id = id;
    for (const [k, v] of Object.entries(attrs)) {
      if (v === '') el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    parent.appendChild(el);
  }
  return el;
}
