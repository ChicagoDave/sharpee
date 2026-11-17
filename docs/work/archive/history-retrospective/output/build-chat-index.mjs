/**
 * build-chat-index.mjs — Phase 1 index of the conversation archive: 230 Claude
 * JSON exports across three directories plus 5 undated ChatGPT text dumps.
 *
 * Each Claude export carries its own title and ISO timestamps, so this index is
 * mechanical for them. The ChatGPT files carry neither; they are recorded with
 * their size and opening line only, and dating them is left to Phase 2.
 *
 * Emits index-chats.json and index-chats.md. Owner: retrospective tooling.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CHATS = '/Volumes/Backup/surface-archive/sharpee-archive/chat-history';
const OUT = '/Volumes/Workspace/sharpee-corpus/retrospective';

/** The first thing the human said — the conversation's actual subject. */
function firstUserMessage(messages) {
  for (const m of messages ?? []) {
    if (m.sender === 'human' || m.role === 'user') {
      const t = (m.text ?? m.content?.[0]?.text ?? '').replace(/\s+/g, ' ').trim();
      if (t) return t;
    }
  }
  const t = (messages?.[0]?.text ?? '').replace(/\s+/g, ' ').trim();
  return t || null;
}

const records = [];
for (const dir of ['reviewed', 'platform', 'claude']) {
  for (const name of readdirSync(join(CHATS, dir)).sort()) {
    if (!name.endsWith('.json')) continue;
    const full = join(CHATS, dir, name);
    let j;
    try {
      j = JSON.parse(readFileSync(full, 'utf8'));
    } catch {
      records.push({ dir, name, parseError: true, bytes: statSync(full).size });
      continue;
    }
    const msgs = j.chat_messages ?? [];
    records.push({
      dir,
      name,
      bytes: statSync(full).size,
      title: j.name ?? null,
      created: j.created_at?.slice(0, 10) ?? null,
      updated: j.updated_at?.slice(0, 10) ?? null,
      messages: msgs.length,
      chars: msgs.reduce((n, m) => n + (m.text?.length ?? 0), 0),
      opening: firstUserMessage(msgs)?.slice(0, 300) ?? null,
    });
  }
}

// The ChatGPT dumps: plain text, no metadata at all.
for (const name of readdirSync(join(CHATS, 'chatgpt')).sort()) {
  const full = join(CHATS, 'chatgpt', name);
  const text = readFileSync(full, 'utf8');
  records.push({
    dir: 'chatgpt',
    name,
    bytes: statSync(full).size,
    title: null,
    created: null,
    updated: null,
    messages: null,
    chars: text.length,
    opening: text.split('\n').filter(Boolean)[0]?.slice(0, 300) ?? null,
    note: 'undated — plain-text dump, no metadata; dating deferred to Phase 2',
  });
}

writeFileSync(join(OUT, 'index-chats.json'), JSON.stringify(records, null, 1));

const claude = records.filter((r) => r.dir !== 'chatgpt' && r.created);
const byMonth = {};
for (const r of claude) {
  const m = r.created.slice(0, 7);
  byMonth[m] ??= { n: 0, chars: 0 };
  byMonth[m].n++;
  byMonth[m].chars += r.chars ?? 0;
}

const lines = ['# Conversation index', ''];
lines.push(`${records.length} conversations: ${claude.length} dated Claude exports (\`reviewed/\`,`);
lines.push('`platform/`, `claude/`) and 5 undated ChatGPT text dumps. Titles and timestamps come');
lines.push("from each export's own metadata; nothing here is inferred.", '');
lines.push('## Claude exports by month', '', '| Month | Conversations | Chars | Bar |', '| --- | --- | --- | --- |');
for (const m of Object.keys(byMonth).sort()) {
  const { n, chars } = byMonth[m];
  lines.push(`| ${m} | ${n} | ${(chars / 1000).toFixed(0)}k | ${'█'.repeat(Math.min(60, n))} |`);
}
lines.push('', '## ChatGPT dumps (undated)', '', '| File | Bytes | Opening line |', '| --- | --- | --- |');
for (const r of records.filter((r) => r.dir === 'chatgpt')) {
  lines.push(`| \`${r.name}\` | ${r.bytes} | ${(r.opening ?? '').replace(/\|/g, '\\|').slice(0, 160)} |`);
}
lines.push('', '## Every Claude conversation, oldest first', '', '| Created | Dir | Title | Msgs | Chars |', '| --- | --- | --- | --- | --- |');
for (const r of claude.sort((a, b) => a.created.localeCompare(b.created))) {
  lines.push(`| ${r.created} | ${r.dir} | ${(r.title ?? '(untitled)').replace(/\|/g, '\\|')} | ${r.messages} | ${((r.chars ?? 0) / 1000).toFixed(0)}k |`);
}
writeFileSync(join(OUT, 'index-chats.md'), lines.join('\n') + '\n');

console.log(`indexed ${records.length} conversations (${claude.length} dated)`);
console.log('months:', Object.keys(byMonth).sort().join(' '));
