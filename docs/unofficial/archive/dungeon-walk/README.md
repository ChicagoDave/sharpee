# Dungeon Walkthrough Viewer

A web-based viewer for exploring Sharpee domain events generated during a full Dungeon walkthrough. Parses verbose transcript test output into a SQLite database, then serves an interactive UI for browsing transcripts, turns, and events.

## Quick Start

```bash
cd dungeon-walk
npm install
npm run dev      # parse + start server
```

Then open http://localhost:3737.

## How It Works

1. **Generate trace data** — Run the walkthrough chain with `--verbose` from the project root:

   ```bash
   node dist/cli/sharpee.js --test --chain --verbose stories/dungeo/walkthroughs/wt-*.transcript > dungeon-walk/dungeon-walkthrough.txt
   ```

2. **Parse into SQLite** — The parser reads the verbose output and writes structured data (transcripts, turns, events) to `walkthrough.db`:

   ```bash
   npm run parse   # node parse-walkthrough.mjs dungeon-walkthrough.txt
   ```

3. **Browse** — The Express server serves a single-page viewer at port 3737:

   ```bash
   npm start       # node server.mjs
   ```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run parse` | Parse `dungeon-walkthrough.txt` into `walkthrough.db` |
| `npm start` | Start the viewer server on port 3737 |
| `npm run dev` | Parse + start (both steps) |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats` | Overview counts (transcripts, turns, events, pass/fail) |
| `GET /api/transcripts` | List all transcripts |
| `GET /api/transcripts/:id/turns` | All turns for a transcript |
| `GET /api/turns/:id/events` | All events for a turn |
| `GET /api/event-types` | Distinct event types with counts |
| `GET /api/events?type=&action=&turn=` | Search/filter events |

## UI Features

- Sidebar lists all walkthrough transcripts with test counts and timing
- Each turn shows the command, pass/fail status, game output, and expandable domain events
- Events are color-coded by category (action, movement, death, score, NPC, state)
- JSON payloads have syntax highlighting
- Filter by event type or pass/fail result

## Schema

The SQLite database has three tables:

- **transcripts** — one row per `.transcript` file (filename, title, test count, duration)
- **turns** — one row per command (command text, result, assertion, output, game turn number)
- **events** — one row per domain event (event type, action ID, game turn, JSON payload)

## Dependencies

- [express](https://expressjs.com/) — HTTP server
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite driver
