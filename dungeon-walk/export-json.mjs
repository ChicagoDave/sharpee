/**
 * Export walkthrough.db to a static JSON file for the website.
 *
 * Public interface: CLI — `node export-json.mjs [output.json]`
 * Owner context: dungeon-walk build tool
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'walkthrough.db');
const outputPath = process.argv[2] || path.join(__dirname, '..', 'website', 'public', 'data', 'walkthrough.json');

const db = new Database(dbPath, { readonly: true });

const transcripts = db.prepare('SELECT * FROM transcripts ORDER BY sequence').all();
const turns = db.prepare('SELECT * FROM turns ORDER BY transcript_id, sequence').all();
const events = db.prepare('SELECT * FROM events ORDER BY turn_id, sequence').all();
const eventTypes = db.prepare(
  'SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type ORDER BY count DESC'
).all();

const stats = {
  transcripts: transcripts.length,
  turns: turns.length,
  events: events.length,
  passed: turns.filter(t => t.result === 'PASS').length,
  failed: turns.filter(t => t.result === 'FAIL').length,
};

const turnsByTranscript = {};
for (const t of turns) {
  (turnsByTranscript[t.transcript_id] ??= []).push(t);
}

const eventsByTurn = {};
for (const e of events) {
  (eventsByTurn[e.turn_id] ??= []).push({
    id: e.id,
    sequence: e.sequence,
    event_type: e.event_type,
    action_id: e.action_id,
    game_turn: e.game_turn,
    data: JSON.parse(e.data_json),
  });
}

const data = { stats, transcripts, turnsByTranscript, eventsByTurn, eventTypes };
const json = JSON.stringify(data);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, json);

db.close();

console.log(`Exported ${stats.transcripts} transcripts, ${stats.turns} turns, ${stats.events} events`);
console.log(`Output: ${outputPath} (${(json.length / 1024 / 1024).toFixed(2)} MB)`);
