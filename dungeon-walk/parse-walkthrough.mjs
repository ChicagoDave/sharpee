/**
 * Walkthrough trace parser.
 *
 * Reads the verbose walkthrough output and writes structured data to SQLite.
 *
 * Public interface: CLI — `node parse-walkthrough.mjs <input.txt> [output.db]`
 * Owner context: dungeon-walk dev tool
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node parse-walkthrough.mjs <walkthrough.txt> [output.db]');
  process.exit(1);
}

const dbFile = process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname), 'walkthrough.db');

// Remove existing DB to start fresh
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
}

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

// --- Schema ---

db.exec(`
  CREATE TABLE transcripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    title TEXT,
    test_count INTEGER,
    duration_ms REAL,
    sequence INTEGER NOT NULL
  );

  CREATE TABLE turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transcript_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    command TEXT NOT NULL,
    result TEXT NOT NULL,
    assertion TEXT,
    output_text TEXT,
    game_turn INTEGER,
    FOREIGN KEY (transcript_id) REFERENCES transcripts(id)
  );

  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turn_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    action_id TEXT,
    game_turn INTEGER,
    data_json TEXT NOT NULL,
    traits_json TEXT,
    FOREIGN KEY (turn_id) REFERENCES events(id)
  );

  CREATE INDEX idx_events_type ON events(event_type);
  CREATE INDEX idx_events_game_turn ON events(game_turn);
  CREATE INDEX idx_events_action_id ON events(action_id);
  CREATE INDEX idx_turns_transcript ON turns(transcript_id);
`);

// --- Prepared statements ---

const insertTranscript = db.prepare(
  'INSERT INTO transcripts (filename, title, test_count, duration_ms, sequence) VALUES (?, ?, ?, ?, ?)'
);
const insertTurn = db.prepare(
  'INSERT INTO turns (transcript_id, sequence, command, result, assertion, output_text, game_turn) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const insertEvent = db.prepare(
  'INSERT INTO events (turn_id, sequence, event_type, action_id, game_turn, data_json, traits_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

// --- Parse ---

const lines = fs.readFileSync(inputFile, 'utf-8').split('\n');
let lineIdx = 0;

let transcriptSeq = 0;
let currentTranscriptId = null;
let turnSeq = 0;

/**
 * Advance to the next line.
 * @returns {string | undefined} The current line, or undefined if EOF.
 */
function nextLine() {
  if (lineIdx >= lines.length) return undefined;
  return lines[lineIdx++];
}

/** Peek at the current line without advancing. */
function peekLine() {
  if (lineIdx >= lines.length) return undefined;
  return lines[lineIdx];
}

const TRANSCRIPT_RE = /^Running:\s+(.+\.transcript)$/;
const TITLE_RE = /^\s+"(.+)"$/;
const TURN_RE = /^\s+>\s+(.+?)\s+(PASS|FAIL)\s*$/;
const ASSERTION_RE = /^\s+[✓✗]\s+(.+)$/;
const OUTPUT_START_RE = /^\s+─── Output ───$/;
const EVENTS_START_RE = /^\s+─── Events \((\d+)\) ───$/;
const BLOCK_END_RE = /^\s+─────────────$/;
const EVENT_LINE_RE = /^\s+•\s+(\S+)\s+(\{.+\})$/;
const EVENT_LINE_NO_DATA_RE = /^\s+•\s+(\S+)\s*$/;
const TRAIT_ENTITY_START_RE = /^\s+┌\s+(.+)$/;
const TRAIT_ENTITY_START_PROSE_RE = /^\s+┌\s+(.+?)\s+\(([^)]+)\)/;  // ┌ Name (id) — ...
const TRAIT_LINE_RE = /^\s+│\s+(.+)$/;
const TRAIT_ENTITY_END_RE = /^\s+└$/;
const PASSED_RE = /^\s+(\d+) passed \((\d+(?:\.\d+)?)ms\)$/;

function parse() {
  const txn = db.transaction(() => {
    while (lineIdx < lines.length) {
      const line = nextLine();
      if (line === undefined) break;

      // Start of a transcript
      const transcriptMatch = line.match(TRANSCRIPT_RE);
      if (transcriptMatch) {
        const filename = path.basename(transcriptMatch[1]);
        let title = null;

        // Next non-empty line should be the title
        while (peekLine() !== undefined) {
          const peek = peekLine().trim();
          if (peek === '') { nextLine(); continue; }
          const titleMatch = peekLine().match(TITLE_RE);
          if (titleMatch) {
            title = titleMatch[1];
            nextLine();
          }
          break;
        }

        transcriptSeq++;
        const info = insertTranscript.run(filename, title, null, null, transcriptSeq);
        currentTranscriptId = info.lastInsertRowid;
        turnSeq = 0;
        continue;
      }

      // A turn (command + result)
      const turnMatch = line.match(TURN_RE);
      if (turnMatch && currentTranscriptId) {
        turnSeq++;
        const command = turnMatch[1];
        const result = turnMatch[2];
        let assertion = null;
        let outputText = null;
        let gameTurn = null;
        const events = [];

        // Parse assertion line(s)
        while (peekLine() !== undefined && peekLine().match(ASSERTION_RE)) {
          const m = nextLine().match(ASSERTION_RE);
          assertion = assertion ? assertion + '; ' + m[1] : m[1];
        }

        // Parse output block (if present)
        if (peekLine() !== undefined && peekLine().match(OUTPUT_START_RE)) {
          nextLine(); // consume start marker
          const outputLines = [];
          while (peekLine() !== undefined && !peekLine().match(BLOCK_END_RE)) {
            outputLines.push(nextLine().replace(/^\s{4}/, ''));
          }
          if (peekLine() !== undefined) nextLine(); // consume end marker
          outputText = outputLines.join('\n');
        }

        // Parse events block (if present)
        if (peekLine() !== undefined && peekLine().match(EVENTS_START_RE)) {
          nextLine(); // consume start marker
          let eventSeq = 0;
          while (peekLine() !== undefined && !peekLine().match(BLOCK_END_RE)) {
            const evLine = nextLine();
            const evMatch = evLine.match(EVENT_LINE_RE) || evLine.match(EVENT_LINE_NO_DATA_RE);
            if (evMatch) {
              eventSeq++;
              const eventType = evMatch[1];
              const dataStr = evMatch[2] || '{}';
              let actionId = null;
              let evTurn = null;
              try {
                const parsed = JSON.parse(dataStr);
                actionId = parsed.actionId || null;
                evTurn = parsed.turn ?? null;
                if (gameTurn === null && evTurn !== null) gameTurn = evTurn;
              } catch { /* keep raw */ }

              // Parse trait blocks that follow this event line (prose or JSON format)
              const entityTraits = [];
              while (peekLine() !== undefined && peekLine().match(TRAIT_ENTITY_START_RE)) {
                const startLine = nextLine();

                // Extract entity ID: try prose "┌ Name (id) — ..." first, fall back to raw "┌ id"
                const proseMatch = startLine.match(TRAIT_ENTITY_START_PROSE_RE);
                const rawMatch = startLine.match(TRAIT_ENTITY_START_RE);
                let entityId, entityName;
                if (proseMatch) {
                  entityName = proseMatch[1].trim();
                  entityId = proseMatch[2].trim();
                } else {
                  entityId = rawMatch[1].trim();
                  entityName = null;
                }

                const traits = {};
                const traitLines = [];
                while (peekLine() !== undefined && peekLine().match(TRAIT_LINE_RE)) {
                  const traitMatch = nextLine().match(TRAIT_LINE_RE);
                  const content = traitMatch[1];

                  // Try JSON format: "traitType {json}" or "traitType: {json}"
                  const jsonMatch = content.match(/^(\S+)\s+(\{.+\})$/);
                  if (jsonMatch) {
                    try {
                      traits[jsonMatch[1]] = JSON.parse(jsonMatch[2]);
                    } catch {
                      traits[jsonMatch[1]] = { _prose: jsonMatch[2] };
                    }
                  } else {
                    // Prose format: "traitType: prose text" or just "keyword"
                    const colonMatch = content.match(/^([^:]+):\s+(.+)$/);
                    if (colonMatch) {
                      traits[colonMatch[1].trim()] = { _prose: colonMatch[2].trim() };
                    } else {
                      // Simple keyword like "player", "scenery", "open", "closed", "off", "on"
                      traits[content.trim()] = {};
                    }
                  }
                }
                // Consume the └ line
                if (peekLine() !== undefined && peekLine().match(TRAIT_ENTITY_END_RE)) {
                  nextLine();
                }
                const entry = { entityId, traits };
                if (entityName) entry.name = entityName;
                entityTraits.push(entry);
              }

              const traitsJson = entityTraits.length > 0 ? JSON.stringify(entityTraits) : null;
              events.push({ seq: eventSeq, eventType, actionId, gameTurn: evTurn, dataJson: dataStr, traitsJson });
            }
          }
          if (peekLine() !== undefined) nextLine(); // consume end marker
        }

        // Insert turn
        const turnInfo = insertTurn.run(
          currentTranscriptId, turnSeq, command, result, assertion, outputText, gameTurn
        );
        const turnId = turnInfo.lastInsertRowid;

        // Insert events
        for (const ev of events) {
          insertEvent.run(turnId, ev.seq, ev.eventType, ev.actionId, ev.gameTurn, ev.dataJson, ev.traitsJson);
        }
        continue;
      }

      // End of transcript stats
      const passedMatch = line.match(PASSED_RE);
      if (passedMatch && currentTranscriptId) {
        const testCount = parseInt(passedMatch[1], 10);
        const durationMs = parseFloat(passedMatch[2]);
        db.prepare('UPDATE transcripts SET test_count = ?, duration_ms = ? WHERE id = ?')
          .run(testCount, durationMs, currentTranscriptId);
        continue;
      }
    }
  });

  txn();
}

parse();

// --- Summary ---

const stats = db.prepare('SELECT COUNT(*) as n FROM transcripts').get();
const turnStats = db.prepare('SELECT COUNT(*) as n FROM turns').get();
const eventStats = db.prepare('SELECT COUNT(*) as n FROM events').get();
const eventTypes = db.prepare('SELECT event_type, COUNT(*) as n FROM events GROUP BY event_type ORDER BY n DESC').all();

console.log(`Parsed ${stats.n} transcripts, ${turnStats.n} turns, ${eventStats.n} events`);
console.log(`Database: ${dbFile}`);
console.log(`\nEvent types (${eventTypes.length}):`);
for (const et of eventTypes) {
  console.log(`  ${et.event_type}: ${et.n}`);
}

db.close();
