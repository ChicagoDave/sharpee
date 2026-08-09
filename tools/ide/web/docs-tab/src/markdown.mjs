/**
 * markdown.mjs — the Documentation tab's markdown-to-HTML renderer.
 *
 * Purpose: the IDE bundles sharpee.net's own author documentation
 *   (`website/src/app/chord/**\/content.mdx`) and renders it offline. The
 *   website renders that corpus through Next + MDX; the IDE will not, because
 *   putting a Next build inside the Xcode pre-build phase would replace a
 *   tens-of-milliseconds esbuild pass with a full `npm install` + `next build`
 *   — the exact cost profile project.yml deliberately made OPT-IN for the
 *   vendored toolchain. So this renders the same source with a small,
 *   dependency-free renderer instead.
 *
 *   The consequence is honest and worth naming: this is a SECOND renderer, so
 *   the tab can drift from sharpee.net's presentation. It covers exactly the
 *   constructs the corpus uses — measured, not guessed — and `build.mjs`
 *   fails the bundle if a page contains something it would silently drop.
 *
 * Public interface: renderMarkdown(source) -> HTML string.
 * Owner context: tools/ide — the Documentation tab's web bundle.
 */

/** HTML-escape text destined for a text node or an attribute value. */
export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Inline formatting: code spans, bold, italic, links.
 *
 * Code spans are lifted out FIRST — their contents must never be re-scanned, and
 * the corpus is full of backticked `*not italic*` and `[not a link]`. They are
 * replaced by a placeholder rather than rendered in place, because the corpus is
 * also full of `**`code`**`: splitting the string at the code span would leave
 * the two `**` markers in different fragments, and neither would find its pair.
 */
export function renderInline(text) {
  const spans = [];
  // U+0000 cannot appear in the source, so the placeholder can never collide
  // with content, and it survives escapeHtml untouched.
  const withPlaceholders = text.replace(/`([^`]+)`/g, (_all, code) => {
    spans.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${spans.length - 1}\u0000`;
  });
  const rendered = renderInlineNoCode(withPlaceholders);
  return rendered.replace(/\u0000(\d+)\u0000/g, (_all, n) => spans[Number(n)]);
}

/** Everything inline except code spans, which the caller has lifted out. */
function renderInlineNoCode(text) {
  let out = escapeHtml(text);
  // Links before emphasis: a URL can hold underscores that would otherwise
  // read as italics.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_all, label, href) => {
    const external = /^https?:/.test(href);
    const rel = external ? ' target="_blank" rel="noreferrer"' : '';
    return `<a href="${escapeHtml(href)}"${rel}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Single `*` only when it hugs the word — `2 * 3` must stay arithmetic.
  out = out.replace(/(^|[\s(])\*(\S(?:[^*]*\S)?)\*(?=$|[\s.,;:)])/g, '$1<em>$2</em>');
  return out;
}

/** One GFM table row's cells, honouring escaped pipes. */
function splitRow(line) {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());
}

const TABLE_DIVIDER = /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/;

/**
 * Render a markdown document to an HTML fragment.
 *
 * Supports exactly what the corpus uses: ATX headings, fenced code blocks with
 * an optional language, GFM tables, blockquotes, unordered lists, thematic
 * breaks, paragraphs, and the inline set above. Ordered lists are deliberately
 * absent — the corpus has none (`grep -c '^[0-9]\+\. '` is 0 across it), and a
 * renderer that claims support it has never exercised is worse than one that
 * declares its edges.
 *
 * @param {string} source markdown (MDX already reduced by mdx.mjs)
 * @returns {string} an HTML fragment, no wrapper element
 */
export function renderMarkdown(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const flushParagraph = (buffer) => {
    if (buffer.length === 0) return;
    out.push(`<p>${renderInline(buffer.join(' ').trim())}</p>`);
    buffer.length = 0;
  };

  const paragraph = [];

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code — taken before anything else, so markdown inside a fence is
    // never interpreted.
    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      flushParagraph(paragraph);
      const language = fence[1];
      const body = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++; // the closing fence
      const cls = language ? ` class="language-${escapeHtml(language)}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushParagraph(paragraph);
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      flushParagraph(paragraph);
      out.push('<hr>');
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph(paragraph);
      const level = heading[1].length;
      const text = heading[2].trim();
      out.push(`<h${level} id="${slug(text)}">${renderInline(text)}</h${level}>`);
      i++;
      continue;
    }

    // Table: a header row followed by a divider row.
    if (line.includes('|') && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      flushParagraph(paragraph);
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i++]));
      }
      const th = head.map((c) => `<th>${renderInline(c)}</th>`).join('');
      const body = rows
        .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph(paragraph);
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        body.push(lines[i++].replace(/^>\s?/, ''));
      }
      out.push(`<blockquote>${renderMarkdown(body.join('\n'))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph(paragraph);
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const item = [lines[i++].replace(/^\s*[-*]\s+/, '')];
        // Continuation lines: indented, and not the start of the next item.
        while (i < lines.length && /^\s+\S/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) {
          item.push(lines[i++].trim());
        }
        items.push(item.join(' '));
      }
      out.push(`<ul>${items.map((t) => `<li>${renderInline(t)}</li>`).join('')}</ul>`);
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }

  flushParagraph(paragraph);
  return out.join('\n');
}

/** A heading's anchor id: lowercase, non-alphanumerics to dashes. */
export function slug(text) {
  return text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
