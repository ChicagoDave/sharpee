/**
 * Express server for the walkthrough event viewer.
 *
 * Public interface: HTTP API + static file serving
 * Owner context: dungeon-walk dev tool
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'walkthrough.db');

const db = new Database(dbPath, { readonly: true });
db.pragma('journal_mode = WAL');

const app = express();
const PORT = 3737;

app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---

/** List all transcripts. */
app.get('/api/transcripts', (_req, res) => {
  const rows = db.prepare(
    'SELECT id, filename, title, test_count, duration_ms, sequence FROM transcripts ORDER BY sequence'
  ).all();
  res.json(rows);
});

/** Get all turns for a transcript. */
app.get('/api/transcripts/:id/turns', (req, res) => {
  const rows = db.prepare(
    'SELECT id, sequence, command, result, assertion, output_text, game_turn FROM turns WHERE transcript_id = ? ORDER BY sequence'
  ).all(req.params.id);
  res.json(rows);
});

/** Get all events for a turn. */
app.get('/api/turns/:id/events', (req, res) => {
  const rows = db.prepare(
    'SELECT id, sequence, event_type, action_id, game_turn, data_json FROM events WHERE turn_id = ? ORDER BY sequence'
  ).all(req.params.id);
  // Parse data_json for the client
  const parsed = rows.map(r => ({
    ...r,
    data: JSON.parse(r.data_json),
    data_json: undefined
  }));
  res.json(parsed);
});

/** Get distinct event types with counts. */
app.get('/api/event-types', (_req, res) => {
  const rows = db.prepare(
    'SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type ORDER BY count DESC'
  ).all();
  res.json(rows);
});

/** Search events by type. */
app.get('/api/events', (req, res) => {
  const { type, action, turn, limit = 100, offset = 0 } = req.query;
  let sql = 'SELECT e.id, e.turn_id, e.sequence, e.event_type, e.action_id, e.game_turn, e.data_json, t.command, t.output_text, tr.filename FROM events e JOIN turns t ON e.turn_id = t.id JOIN transcripts tr ON t.transcript_id = tr.id WHERE 1=1';
  const params = [];

  if (type) {
    sql += ' AND e.event_type = ?';
    params.push(type);
  }
  if (action) {
    sql += ' AND e.action_id = ?';
    params.push(action);
  }
  if (turn) {
    sql += ' AND e.game_turn = ?';
    params.push(parseInt(turn, 10));
  }

  sql += ' ORDER BY e.game_turn, e.id LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const rows = db.prepare(sql).all(...params);
  const parsed = rows.map(r => ({
    ...r,
    data: JSON.parse(r.data_json),
    data_json: undefined
  }));
  res.json(parsed);
});

/** Stats overview. */
app.get('/api/stats', (_req, res) => {
  const transcripts = db.prepare('SELECT COUNT(*) as n FROM transcripts').get().n;
  const turns = db.prepare('SELECT COUNT(*) as n FROM turns').get().n;
  const events = db.prepare('SELECT COUNT(*) as n FROM events').get().n;
  const passed = db.prepare("SELECT COUNT(*) as n FROM turns WHERE result = 'PASS'").get().n;
  const failed = db.prepare("SELECT COUNT(*) as n FROM turns WHERE result = 'FAIL'").get().n;
  res.json({ transcripts, turns, events, passed, failed });
});

app.listen(PORT, () => {
  console.log(`Dungeon walkthrough viewer: http://localhost:${PORT}`);
});
