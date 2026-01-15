#!/usr/bin/env node
// Decoder for Dungeon dtext.dat and dindx.dat
// Based on FORTRAN source analysis

const fs = require('fs');
const path = require('path');

// Constants from DPARAM.FOR
const RECORD_SIZE = 80;  // 20 longwords × 4 bytes
const TEXT_LENGTH = 76;  // Text portion of each record

// Load files
const dtextPath = path.join(__dirname, 'dtext.dat');
const dindxPath = path.join(__dirname, 'dindx.dat');

const dtextData = fs.readFileSync(dtextPath);
const dindxLines = fs.readFileSync(dindxPath, 'utf-8').trim().split('\n').map(l => parseInt(l.trim(), 10));

// Parse dindx.dat structure
// Lines 1-3: Version (major, minor, edit)
// Line 4-6: MXSCOR, STRBIT, EGMXSC
// Then room/exit/object arrays...
// Lines 6423-6424: MBASE, MLNT
// Lines 6425+: RTEXT array

const MBASE = dindxLines[6422];  // 0-indexed: line 6423 = index 6422
const MLNT = dindxLines[6423];   // Number of messages

console.log(`MBASE: ${MBASE}, MLNT: ${MLNT}`);
console.log(`Total records in dtext.dat: ${dtextData.length / RECORD_SIZE}`);

// RTEXT array: maps message number -> record number
// RTEXT[1] is at line 6425 = index 6424
const RTEXT_START = 6424;
const rtext = [0];  // Index 0 unused (FORTRAN 1-indexed)
for (let i = 0; i < MLNT; i++) {
  rtext.push(dindxLines[RTEXT_START + i]);
}

console.log(`Loaded ${rtext.length - 1} message mappings\n`);

// Decrypt a record from dtext.dat
function decryptRecord(recordNum) {
  const offset = (recordNum - 1) * RECORD_SIZE;
  if (offset < 0 || offset + RECORD_SIZE > dtextData.length) return null;

  const group = dtextData.readUInt32LE(offset);
  const text = Buffer.alloc(TEXT_LENGTH);

  for (let i = 0; i < TEXT_LENGTH; i++) {
    const x = (recordNum & 31) + (i + 1);
    text[i] = dtextData[offset + 4 + i] ^ x;
  }

  // Replace control chars with spaces, trim trailing whitespace
  return {
    group,
    text: text.toString('latin1').replace(/[\x00-\x1f]/g, ' ').trimEnd()
  };
}

// Get a complete message by message number
function getMessage(msgNum) {
  if (msgNum < 1 || msgNum >= rtext.length) return null;

  let recNum = rtext[msgNum];
  if (recNum === 0) return null;

  // Absolute value - negative just indicates something internal
  recNum = Math.abs(recNum);

  const lines = [];
  const firstRec = decryptRecord(recNum);
  if (!firstRec) return null;

  lines.push(firstRec.text);
  const firstGroup = firstRec.group;

  // Check for continuation records (same group number)
  let nextRecNum = recNum + 1;
  while (true) {
    const nextRec = decryptRecord(nextRecNum);
    if (!nextRec || nextRec.group !== firstGroup) break;
    lines.push(nextRec.text);
    nextRecNum++;
  }

  return lines.join('\n');
}

// Export all messages to a file
function exportAllMessages(outputPath) {
  const output = [];

  for (let msg = 1; msg <= MLNT; msg++) {
    const text = getMessage(msg);
    if (text && text.trim()) {
      output.push(`[${msg}]`);
      output.push(text);
      output.push('');
    }
  }

  fs.writeFileSync(outputPath, output.join('\n'), 'utf-8');
  console.log(`Exported ${MLNT} messages to ${outputPath}`);
}

// Define endgame message ranges based on FORTRAN analysis
const messageRanges = [
  { name: 'Welcome/System', start: 1, end: 10 },
  { name: 'Death messages', start: 7, end: 9 },
  { name: 'Room descriptions (sample)', start: 430, end: 435 },
  { name: 'Inside Mirror', start: 688, end: 702 },
  { name: 'Corridor rooms', start: 705, end: 722 },
  { name: 'Panel messages', start: 730, end: 744 },
  { name: 'Pole messages', start: 749, end: 758 },
  { name: 'Trivia intro', start: 768, end: 769 },
  { name: 'Trivia questions', start: 770, end: 778 },
  { name: 'Endgame ranks', start: 787, end: 791 },
  { name: 'Answer responses', start: 799, end: 810 },
  { name: 'Dial/Parapet', start: 809, end: 820 },
  { name: 'Quiz end', start: 826, end: 827 },
];

// Command line handling
const args = process.argv.slice(2);

if (args.includes('--export')) {
  exportAllMessages(path.join(__dirname, 'dungeon-messages.txt'));
} else if (args.includes('--endgame')) {
  // Print endgame-related messages
  for (const range of messageRanges) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== ${range.name} (${range.start}-${range.end}) ===`);
    console.log('='.repeat(60));
    for (let msg = range.start; msg <= range.end; msg++) {
      const text = getMessage(msg);
      if (text && text.trim()) {
        console.log(`\n[${msg}]:`);
        console.log(text);
      }
    }
  }
} else if (args.length > 0 && !isNaN(parseInt(args[0]))) {
  // Print specific message(s)
  for (const arg of args) {
    const msgNum = parseInt(arg);
    const text = getMessage(msgNum);
    console.log(`[${msgNum}]: ${text || '(no message)'}`);
  }
} else {
  console.log('Usage:');
  console.log('  node decode-text.js --export     Export all messages to dungeon-messages.txt');
  console.log('  node decode-text.js --endgame    Print endgame-related messages');
  console.log('  node decode-text.js <num> [...]  Print specific message number(s)');
  console.log('');
  console.log('Sample messages:');

  // Show a few sample messages
  const samples = [1, 2, 8, 341, 625, 688, 770];
  for (const n of samples) {
    const text = getMessage(n);
    if (text) {
      console.log(`\n[${n}]: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    }
  }
}
