#!/usr/bin/env node
/**
 * generate-appendix-d.cjs — regenerate the book's Appendix D (Message-ID Reference)
 * from the live @sharpee/lang-en-us catalog.
 *
 * Usage: node scripts/generate-appendix-d.cjs
 * (requires packages/lang-en-us/dist to be built; run from anywhere)
 *
 * Enumerates every message the English language provider registers at
 * construction (getAllMessages()), groups ids by everything before the last
 * dot segment, and emits one pandoc table per group. Group headings carry
 * `{.unnumbered .unlisted}` so the book TOC is not flooded (see commit
 * 566580fe). Regenerate whenever the message catalog drifts — do not hand-edit
 * the appendix.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/book/v2.0.0/backmatter/appendix-d-message-reference.md');

const { EnglishLanguageProvider } = require(path.join(ROOT, 'packages/lang-en-us/dist/index.js'));

const all = new EnglishLanguageProvider().getAllMessages();

/** Table-cell form of a template: newlines flattened, pipes escaped. */
const cell = (text) =>
  text.replace(/\n/g, ' ').replace(/\|/g, '\\|').trim();

const groupOf = (id) => (id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : id);

const groups = new Map();
for (const [id, text] of all) {
  const g = groupOf(id);
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push([id, text]);
}

const groupNames = [...groups.keys()].sort();
let md = `# Appendix D — Message-ID Reference {.unnumbered}

Every message ID registered by \`@sharpee/lang-en-us\`, with its default English text.
Override any of these from a story with \`extendLanguage\` (Volume V). Generated from the
language provider by \`scripts/generate-appendix-d.cjs\`; ${all.size} messages in ${groups.size} groups.
`;

for (const g of groupNames) {
  md += `\n## \`${g}\` {.unnumbered .unlisted}\n\n| Message ID | Default text |\n|---|---|\n`;
  for (const [id, text] of groups.get(g).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    md += `| \`${id}\` | ${cell(text)} |\n`;
  }
}

fs.writeFileSync(OUT, md);
console.log(`Wrote ${all.size} messages in ${groups.size} groups to ${path.relative(ROOT, OUT)}`);
