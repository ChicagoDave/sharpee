/**
 * Build a self-contained walkthrough HTML file.
 *
 * Reads public/index.html, injects the walkthrough JSON as embedded data,
 * and patches fetchJson() to route to the local data instead of /api/*.
 * The rest of the HTML/CSS/JS stays untouched.
 *
 * Usage: node build-standalone.mjs [output.html]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = process.argv[2] || path.join(__dirname, 'dungeon-walkthrough.html');

// Load the exported JSON
const jsonPath = path.join(__dirname, 'walkthrough-export.json');
if (!fs.existsSync(jsonPath)) {
  console.error('Missing walkthrough-export.json — run: node export-json.mjs ./walkthrough-export.json');
  process.exit(1);
}
const jsonData = fs.readFileSync(jsonPath, 'utf-8');

// Read the original HTML
let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');

// Inject the embedded data and a local fetchJson shim right before the existing <script>
const shim = `<script>
  // --- Embedded walkthrough data (no server required) ---
  const __DB = ${jsonData};

  // Shim: route /api/* calls to embedded data
  const _originalFetchJson = null;
  async function fetchJson(url) {
    if (url === '/api/stats') return __DB.stats;
    if (url === '/api/event-types') return __DB.eventTypes;
    if (url === '/api/transcripts') return __DB.transcripts;

    var m;
    m = url.match(/\\/api\\/transcripts\\/(\\d+)\\/turns/);
    if (m) return __DB.turnsByTranscript[m[1]] || [];

    m = url.match(/\\/api\\/turns\\/(\\d+)\\/events/);
    if (m) return __DB.eventsByTurn[m[1]] || [];

    console.warn('fetchJson: unhandled URL', url);
    return [];
  }
</script>
`;

// Insert the shim before the existing <script> tag
// The existing script defines fetchJson too, but our shim comes first and
// we need to remove the original fetchJson definition to avoid conflicts.
const scriptTag = '<script>';
const firstScriptIdx = html.indexOf(scriptTag, html.indexOf('<body'));
html = html.slice(0, firstScriptIdx) + shim + html.slice(firstScriptIdx);

// Remove the original fetchJson definition from the existing script
html = html.replace(
  /\s*\/\/ --- Fetch helpers ---\s*\n\s*async function fetchJson\(url\) \{\s*\n\s*const res = await fetch\(url\);\s*\n\s*return res\.json\(\);\s*\n\s*\}/,
  ''
);

fs.writeFileSync(outputPath, html);

const sizeMB = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`Built: ${outputPath} (${sizeMB} MB)`);
