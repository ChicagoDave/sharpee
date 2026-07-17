#!/usr/bin/env node
/**
 * render-site.mjs — render docs/reference/stdlib-phrasebook.md into
 * site/stdlib-phrasebook.html, in the site's hand-written HTML conventions.
 *
 * Adapted from docs/work/stdlib-reference/render-site.mjs (the proven
 * stdlib-reference renderer): same pipeline — blockquotes render as real
 * content with only the internal `> **Status:` banner stripped; HTML
 * comments (the fixture/transcript traceability markers) are dropped.
 *
 * Public interface: `node render-site.mjs` — writes site/stdlib-phrasebook.html
 * and prints the byte count. Owner context: docs tooling (stdlib-phrasebook
 * work target); the site page is regenerated, never hand-edited.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const docPath = path.join(repoRoot, 'docs', 'reference', 'stdlib-phrasebook.md');
const outPath = path.join(repoRoot, 'site', 'stdlib-phrasebook.html');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Inline formatting on prose. Code spans are protected as placeholders so
 * that bold/em can wrap an inline-code span without the backtick split
 * breaking the `**` pair. Order: extract code → escape → bold/link/em →
 * restore code.
 */
function inline(text) {
  const codes = [];
  let out = text.replace(/`([^`]*)`/g, (_, c) => {
    codes.push(`<code>${esc(c)}</code>`);
    return `\x00${codes.length - 1}\x00`;
  });
  out = esc(out);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\x00(\d+)\x00/g, (_, n) => codes[Number(n)]);
  return out;
}

const lines = readFileSync(docPath, 'utf-8').split('\n');
const body = [];
let i = 0;
let para = [];
let inList = false;

function flushPara() {
  if (para.length) {
    body.push(`    <p>${inline(para.join(' '))}</p>`);
    para = [];
  }
}
function closeList() {
  if (inList) {
    body.push('    </li>');
    body.push('    </ul>');
    inList = false;
  }
}
/** Emit a fenced code block, capturing from the opening fence at `i`. Returns new cursor. */
function emitFence(indent) {
  const code = [];
  i++;
  while (i < lines.length && lines[i].trim() !== '```') {
    code.push(indent ? lines[i].replace(new RegExp(`^ {0,${indent}}`), '') : lines[i]);
    i++;
  }
  i++; // consume closing fence
  const pre = `    <pre><code>${esc(code.join('\n'))}</code></pre>`;
  if (inList) body.push(`      ${pre.trim()}`);
  else body.push(pre);
}

for (i = 0; i < lines.length; ) {
  const line = lines[i];
  const trimmed = line.trim();

  if (trimmed.startsWith('<!-- ')) { i++; continue; }

  // blockquotes: the internal Status banner is stripped; platform-note
  // callouts are real content and render as <blockquote>
  if (trimmed.startsWith('>')) {
    flushPara();
    const quote = [];
    while (i < lines.length && lines[i].trim().startsWith('>')) {
      quote.push(lines[i].trim().replace(/^>\s?/, ''));
      i++;
    }
    if (!quote[0].startsWith('**Status:')) {
      body.push(`    <blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
    }
    continue;
  }

  if (trimmed === '') { flushPara(); i++; continue; }

  const fenceIndent = line.match(/^( *)```/);
  if (fenceIndent) {
    flushPara();
    emitFence(fenceIndent[1].length);
    continue;
  }

  const h = line.match(/^(#{1,3}) (.*)$/);
  if (h) {
    flushPara(); closeList();
    const level = h[1].length;
    body.push(`    <h${level}>${inline(h[2])}</h${level}>`);
    i++; continue;
  }

  if (trimmed.startsWith('|') && i + 1 < lines.length && /^\|[ :|-]+\|$/.test(lines[i + 1].trim())) {
    flushPara(); closeList();
    const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const header = cells(lines[i]);
    i += 2;
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i++; }
    body.push('    <table>');
    body.push('      <thead><tr>' + header.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>');
    body.push('      <tbody>');
    for (const r of rows) body.push('        <tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
    body.push('      </tbody>');
    body.push('    </table>');
    continue;
  }

  const li = line.match(/^- (.*)$/);
  if (li) {
    flushPara();
    if (!inList) { body.push('    <ul>'); inList = true; }
    else { body.push('    </li>'); }
    body.push(`      <li>${inline(li[1])}`);
    i++;
    while (i < lines.length && /^  \S/.test(lines[i]) && !/^  - /.test(lines[i]) && !/^ *```/.test(lines[i])) {
      body[body.length - 1] += ' ' + inline(lines[i].trim());
      i++;
    }
    continue;
  }

  closeList();
  para.push(trimmed);
  i++;
}
flushPara();
closeList();

const page = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Standard Library Phrasebook — Sharpee</title>
  <meta name="description" content="The phrasebook companion to Sharpee's standard library reference: every action's phrasings, traits, and refusal keys, with fixture-verified worked examples in story context.">
  <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="page">
  <main class="content">
${body.join('\n')}
  </main>

  <aside id="sidebar" class="sidebar"></aside>
  <footer id="footer" class="footer"></footer>
</div>

<script src="components.js"></script>
<script src="theme.js"></script>
</body>
</html>
`;

writeFileSync(outPath, page);
console.log(`wrote ${outPath} (${page.length} bytes)`);
